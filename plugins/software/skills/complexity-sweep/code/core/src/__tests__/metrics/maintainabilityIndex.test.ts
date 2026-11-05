import { describe, expect, it } from "vitest";

import cyclomaticComplexity from "../../metrics/cyclomaticComplexity";
import {
  halsteadVolumeDefinition,
} from "../../metrics/halstead";
import {
  computeMaintainabilityIndex,
  countLoc,
  maintainabilityIndexDefinition,
} from "../../metrics/maintainabilityIndex";
import {
  type MetricComputeContext,
  type MetricResult,
  MetricKeys,
} from "../../registry";
import type { FunctionLike } from "../../types";
import { createHarness } from "./testUtils";

// ---------------------------------------------------------------------------
// Real dependency wiring — NO MOCKS. We invoke the actual cyclomaticComplexity
// and halsteadVolume definitions to populate ctx.dependencyValues, exactly how
// the registry would orchestrate them in production.
// ---------------------------------------------------------------------------

function computeValue(value: number | MetricResult<unknown>): number {
  return typeof value === "number" ? value : value.value;
}

/**
 * Build a fully-populated MI compute context for `fnName` in `source`.
 * Runs CC and HV from the real metric definitions, threads their values into
 * `dependencyValues`, then returns the ctx ready for MI to consume.
 */
function buildMIContext(source: string, fnName: string): MetricComputeContext {
  const { getCtx } = createHarness(source);
  const baseCtx = getCtx(fnName);

  const cc = computeValue(cyclomaticComplexity.compute(baseCtx));
  const hv = computeValue(halsteadVolumeDefinition.compute(baseCtx));

  return {
    ...baseCtx,
    dependencyValues: {
      [MetricKeys.cyclomaticComplexity]: cc,
      [MetricKeys.halsteadVolume]: hv,
    },
  };
}

function miFor(source: string, fnName: string): number {
  return computeMaintainabilityIndex(buildMIContext(source, fnName));
}

/** Reference MI formula, per spec §4.5. */
function expectedMI(V: number, CC: number, LOC: number): number {
  if (V <= 0 || LOC <= 0) return 100;
  const raw = 171 - 5.2 * Math.log(V) - 0.23 * CC - 16.2 * Math.log(LOC);
  return Math.max(0, (raw * 100) / 171);
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe("maintainabilityIndexDefinition metadata", () => {
  it("has correct key / name / shortCode", () => {
    expect(maintainabilityIndexDefinition.key).toBe(
      MetricKeys.maintainabilityIndex,
    );
    expect(maintainabilityIndexDefinition.name).toBe("Maintainability Index");
    expect(maintainabilityIndexDefinition.shortCode).toBe("MI");
  });

  it("direction is lower-is-worse", () => {
    expect(maintainabilityIndexDefinition.direction).toBe("lower-is-worse");
  });

  it("lower-is-worse thresholds: warn > error", () => {
    const { warn, error } = maintainabilityIndexDefinition.defaultThresholds;
    expect(warn).toBeGreaterThan(error);
    expect(warn).toBe(60);
    expect(error).toBe(40);
  });

  it("declares halsteadVolume and cyclomaticComplexity as dependencies", () => {
    expect(maintainabilityIndexDefinition.dependencies).toEqual([
      MetricKeys.halsteadVolume,
      MetricKeys.cyclomaticComplexity,
    ]);
  });

  it("description mentions the composite nature", () => {
    expect(maintainabilityIndexDefinition.description.toLowerCase()).toContain(
      "halstead",
    );
    expect(maintainabilityIndexDefinition.description).toContain("LOC");
  });
});

// ---------------------------------------------------------------------------
// countLoc
// ---------------------------------------------------------------------------

describe("countLoc", () => {
  function locFor(source: string, name: string): number {
    const { getCtx } = createHarness(source);
    const ctx = getCtx(name);
    return countLoc(ctx.node as FunctionLike, ctx.sourceFile);
  }

  it("counts non-blank, non-comment lines in a simple body", () => {
    const src = `
function f() {
  const a = 1;
  const b = 2;
  return a + b;
}`;
    expect(locFor(src, "f")).toBe(3);
  });

  it("returns 0 for an empty function body", () => {
    expect(locFor("function empty() {}", "empty")).toBe(0);
  });

  it("skips blank lines", () => {
    const src = `
function f() {
  const a = 1;

  const b = 2;

  return a + b;
}`;
    expect(locFor(src, "f")).toBe(3);
  });

  it("skips single-line comments", () => {
    const src = `
function f() {
  // setup
  const a = 1;
  // compute
  return a;
}`;
    expect(locFor(src, "f")).toBe(2);
  });

  it("skips block comment lines", () => {
    const src = `
function f() {
  /*
   * a banner comment
   */
  const a = 1;
  return a;
}`;
    expect(locFor(src, "f")).toBe(2);
  });

  it("excludes standalone brace lines", () => {
    const src = `
function f() {
  if (true) {
    return 1;
  }
}`;
    // `if (true) {` counts, `return 1;` counts, lone `}` excluded.
    expect(locFor(src, "f")).toBe(2);
  });

  it("excludes nested function bodies from outer LOC", () => {
    const src = `
function outer() {
  const x = 1;
  function inner() {
    const y = 2;
    return y + 1;
  }
  return inner();
}`;
    // Outer: `const x = 1;` and `return inner();` — inner's body skipped.
    expect(locFor(src, "outer")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// computeMaintainabilityIndex — real CC + HV dependencies
// ---------------------------------------------------------------------------

describe("computeMaintainabilityIndex (real dependencies)", () => {
  it("trivial one-liner body yields MI near the upper bound", () => {
    const src = `function trivial() { return 1; }`;
    const mi = miFor(src, "trivial");
    expect(mi).toBeLessThanOrEqual(100);
    expect(mi).toBeGreaterThan(80);
  });

  it("matches the exact formula for a known input", () => {
    const src = `
function f(a: number, b: number) {
  const x = a + b;
  const y = x * 2;
  return y;
}`;
    const ctx = buildMIContext(src, "f");
    const V = ctx.dependencyValues[MetricKeys.halsteadVolume];
    const CC = ctx.dependencyValues[MetricKeys.cyclomaticComplexity];
    if (V === undefined || CC === undefined) {
      throw new Error("dependency values missing");
    }
    const LOC = countLoc(ctx.node as FunctionLike, ctx.sourceFile);

    const actual = computeMaintainabilityIndex(ctx);
    expect(actual).toBeCloseTo(expectedMI(V, CC, LOC), 5);
    expect(Number.isFinite(actual)).toBe(true);
  });

  it("complex function with high CC + HV yields a lower MI", () => {
    const simpleSrc = `
function simple(x: number) {
  return x + 1;
}`;
    const complexSrc = `
function complex(a: number, b: number, c: number, d: number, e: number) {
  let result = 0;
  for (let i = 0; i < a; i++) {
    if (i % 2 === 0 && i > b) {
      result += i * c;
    } else if (i < d || i === e) {
      result -= i;
    } else {
      result += 1;
    }
    while (result > 100) {
      result = result / 2;
    }
  }
  switch (result % 3) {
    case 0: return result;
    case 1: return result + a;
    case 2: return result - b;
    default: return 0;
  }
}`;
    const simpleMI = miFor(simpleSrc, "simple");
    const complexMI = miFor(complexSrc, "complex");
    expect(complexMI).toBeLessThan(simpleMI);
    expect(complexMI).toBeGreaterThanOrEqual(0);
  });

  it("returns 100 and never NaN/Infinity for an empty function (LOC=0, V=0 fallback)", () => {
    const src = `function empty() {}`;
    const mi = miFor(src, "empty");
    expect(mi).toBe(100);
    expect(Number.isFinite(mi)).toBe(true);
  });

  it("V=0 guard: missing halsteadVolume dependency still yields finite 100", () => {
    // A function with tokens but we stub V=0 via ??-fallback by omitting the key.
    const { getCtx } = createHarness(`function f() { return 1; }`);
    const baseCtx = getCtx("f");
    const cc = computeValue(cyclomaticComplexity.compute(baseCtx));
    const ctx: MetricComputeContext = {
      ...baseCtx,
      // Intentionally do not set halsteadVolume — ?? 0 fallback kicks in.
      dependencyValues: { [MetricKeys.cyclomaticComplexity]: cc },
    };
    const mi = computeMaintainabilityIndex(ctx);
    expect(mi).toBe(100);
    expect(Number.isFinite(mi)).toBe(true);
  });

  it("clamps at 0 for pathologically large V / CC", () => {
    // Craft a ctx by hand with artificial huge V & CC, real node/LOC.
    const { getCtx } = createHarness(`
function f() {
  const a = 1;
  const b = 2;
  const c = 3;
  return a + b + c;
}`);
    const baseCtx = getCtx("f");
    const ctx: MetricComputeContext = {
      ...baseCtx,
      dependencyValues: {
        [MetricKeys.halsteadVolume]: 1e30,
        [MetricKeys.cyclomaticComplexity]: 1000,
      },
    };
    const mi = computeMaintainabilityIndex(ctx);
    expect(mi).toBe(0);
    expect(Number.isFinite(mi)).toBe(true);
  });

  it("stays within [0, 100] across a grid of realistic inputs", () => {
    const src = `
function g(n: number) {
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) s += i;
    else s -= i;
  }
  return s;
}`;
    const { getCtx } = createHarness(src);
    const baseCtx = getCtx("g");

    const cases: Array<{ V: number; CC: number }> = [
      { V: 10, CC: 1 },
      { V: 100, CC: 5 },
      { V: 500, CC: 10 },
      { V: 2000, CC: 20 },
      { V: 5000, CC: 50 },
    ];
    for (const { V, CC } of cases) {
      const ctx: MetricComputeContext = {
        ...baseCtx,
        dependencyValues: {
          [MetricKeys.halsteadVolume]: V,
          [MetricKeys.cyclomaticComplexity]: CC,
        },
      };
      const mi = computeMaintainabilityIndex(ctx);
      expect(mi).toBeGreaterThanOrEqual(0);
      expect(mi).toBeLessThanOrEqual(100);
      expect(Number.isFinite(mi)).toBe(true);
    }
  });
});
