import { describe, expect, it } from "vitest";
import { createHarness } from "./testUtils";
import {
  computeScopeDepthStats,
  scopeDepthRatioDefinition,
  scopeDepthWeightedLocDefinition,
} from "../../metrics/scopeDepth";

function stats(source: string, name: string) {
  const { getCtx } = createHarness(source);
  return computeScopeDepthStats(getCtx(name));
}

describe("computeScopeDepthStats", () => {
  it("empty function → all zeros", () => {
    expect(stats("function empty() {}", "empty")).toEqual({
      weightedLoc: 0,
      rawLoc: 0,
      ratio: 0,
    });
  });

  it("flat function, no nesting → ratio == 1", () => {
    const src = `function f() {
  const a = 1;
  const b = 2;
  return a + b;
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(3);
    expect(r.weightedLoc).toBe(3);
    expect(r.ratio).toBeCloseTo(1, 5);
  });

  it("single if block adds a depth level", () => {
    const src = `function f(x: number) {
  if (x > 0) {
    const a = 1;
    return a;
  }
  return 0;
}`;
    const r = stats(src, "f");
    // Body lines after stripping outer braces: 5 executable lines.
    // L2 `if(...)` depth 0 → 1; L3 const depth 1 → 2; L4 return depth 1 → 2;
    // L5 `}` depth 0 → 1; L6 return depth 0 → 1. Total weighted = 7.
    expect(r.rawLoc).toBe(5);
    expect(r.weightedLoc).toBe(7);
  });

  it("nested for-inside-if accumulates depth", () => {
    const src = `function f(n: number) {
  if (n > 0) {
    for (let i = 0; i < n; i++) {
      doWork(i);
    }
  }
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(5);
    expect(r.weightedLoc).toBe(9);
  });

  it("else shares outer depth with if", () => {
    const src = `function f(x: number) {
  if (x > 0) {
    return 1;
  } else {
    return 0;
  }
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(5);
    expect(r.weightedLoc).toBe(7);
  });

  it("try/catch/finally: each branch adds one inner line at depth 1", () => {
    const src = `function f() {
  try {
    doA();
  } catch (err) {
    doB();
  } finally {
    doC();
  }
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(7);
    expect(r.weightedLoc).toBe(10);
  });

  it("arrow function in .map() body adds depth", () => {
    const src = `function f(arr: number[]) {
  return arr.map((x) => {
    return x * 2;
  });
}`;
    const r = stats(src, "f");
    expect(r.weightedLoc).toBeGreaterThan(r.rawLoc);
  });

  it("multi-line object literal keys stay at depth 0", () => {
    const src = `function f() {
  const cfg = {
    a: 1,
    b: 2,
    c: 3,
  };
  return cfg;
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(6);
    expect(r.weightedLoc).toBe(6);
    expect(r.ratio).toBeCloseTo(1, 5);
  });

  it("while loop", () => {
    const src = `function f() {
  let i = 0;
  while (i < 10) {
    i++;
  }
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(4);
    expect(r.weightedLoc).toBe(5);
  });

  it("do-while", () => {
    const src = `function f() {
  let i = 0;
  do {
    i++;
  } while (i < 10);
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(4);
    expect(r.weightedLoc).toBe(5);
  });

  it("switch: case header at +1, body at +2", () => {
    const src = `function f(x: number) {
  switch (x) {
    case 1:
      doA();
      return 1;
    case 2:
      doB();
      return 2;
    default:
      return 0;
  }
}`;
    const r = stats(src, "f");
    expect(r.weightedLoc).toBeGreaterThan(r.rawLoc);
  });

  it("for-in", () => {
    const src = `function f(obj: any) {
  for (const key in obj) {
    use(key);
  }
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(3);
    expect(r.weightedLoc).toBe(4);
  });

  it("for-of", () => {
    const src = `function f(items: number[]) {
  for (const it of items) {
    use(it);
  }
}`;
    const r = stats(src, "f");
    expect(r.rawLoc).toBe(3);
    expect(r.weightedLoc).toBe(4);
  });

  it("skips blanks and line/block-comment openers", () => {
    // `isBlankOrCommentLine` skips lines whose trim starts with //, /*, *, or */.
    // A block-comment's inner continuation `     comment */` trims to
    // `comment */` which does NOT start with any of those — so it is not
    // skipped. That is spec-consistent (matches the shipped heuristic).
    const src = `function f() {
  // a comment
  const a = 1;

  /* block
   * middle
   */
  const b = 2;

  return a + b;
}`;
    const r = stats(src, "f");
    // Executable lines: const a (L3), const b (L8), return (L10) = 3.
    expect(r.rawLoc).toBe(3);
    expect(r.weightedLoc).toBe(3);
  });

  it("excludes nested function declarations from the parent", () => {
    const src = `function outer() {
  const x = 1;
  function inner() {
    const y = 2;
    return y;
  }
  return x;
}`;
    const outer = stats(src, "outer");
    // outer keeps: const x = 1; return x; → 2 lines at depth 0.
    expect(outer.rawLoc).toBe(2);
    expect(outer.weightedLoc).toBe(2);

    const inner = stats(src, "inner");
    expect(inner.rawLoc).toBeGreaterThan(0);
  });

  it("deeply nested produces weighted > raw", () => {
    const src = `function f() {
  if (true) {
    if (true) {
      if (true) {
        doIt();
      }
    }
  }
}`;
    const r = stats(src, "f");
    expect(r.weightedLoc).toBeGreaterThan(r.rawLoc);
  });
});

describe("scopeDepth – arrow handling", () => {
  it("concise arrow `const add = (a,b) => a+b;`", () => {
    const { getCtx } = createHarness("const add = (a: number, b: number) => a + b;");
    // Just ensure the harness can resolve and compute does not throw.
    const result = computeScopeDepthStats(getCtx("add"));
    expect(result).toBeTruthy();
  });

  it("block-body arrow callback: weighted > raw", () => {
    const src = `function f(arr: number[]) {
  return arr.filter((x) => {
    return x > 0;
  });
}`;
    const r = stats(src, "f");
    expect(r.weightedLoc).toBeGreaterThan(r.rawLoc);
  });

  it("nested arrows accumulate depth", () => {
    const src = `function f(arr: number[][]) {
  return arr.map((row) => {
    return row.map((x) => {
      return x * 2;
    });
  });
}`;
    const r = stats(src, "f");
    expect(r.weightedLoc).toBeGreaterThan(r.rawLoc);
  });
});

describe("scopeDepthWeightedLocDefinition", () => {
  it("exposes the documented metadata", () => {
    expect(scopeDepthWeightedLocDefinition.key).toBe("scopeDepthWeightedLoc");
    expect(scopeDepthWeightedLocDefinition.shortCode).toBe("SDWL");
    expect(scopeDepthWeightedLocDefinition.direction).toBe("higher-is-worse");
    expect(scopeDepthWeightedLocDefinition.defaultThresholds).toEqual({
      warn: 45,
      error: 70,
    });
    expect(scopeDepthWeightedLocDefinition.dependencies).toEqual([]);
  });

  it("compute() returns weightedLoc for a flat body", () => {
    const { getCtx } = createHarness("function f() {\n  const a = 1;\n  return a;\n}");
    expect(scopeDepthWeightedLocDefinition.compute(getCtx("f"))).toBe(2);
  });
});

describe("scopeDepthRatioDefinition", () => {
  it("exposes the documented metadata with test-asserted thresholds", () => {
    expect(scopeDepthRatioDefinition.key).toBe("scopeDepthRatio");
    expect(scopeDepthRatioDefinition.shortCode).toBe("SDR");
    expect(scopeDepthRatioDefinition.direction).toBe("higher-is-worse");
    expect(scopeDepthRatioDefinition.defaultThresholds).toEqual({
      warn: 1.3,
      error: 1.5,
    });
    expect(scopeDepthRatioDefinition.dependencies).toEqual([]);
  });

  it("compute() returns ratio for a flat body (1.0)", () => {
    const { getCtx } = createHarness("function f() {\n  const a = 1;\n  return a;\n}");
    expect(scopeDepthRatioDefinition.compute(getCtx("f"))).toBeCloseTo(1, 5);
  });

  it("compute() returns a >1 ratio for a nested body", () => {
    const src = `function f(x: number) {
  if (x > 0) {
    const a = 1;
    return a;
  }
}`;
    const { getCtx } = createHarness(src);
    const ratio = scopeDepthRatioDefinition.compute(getCtx("f"));
    expect(typeof ratio).toBe("number");
    if (typeof ratio === "number") expect(ratio).toBeGreaterThan(1);
  });

  it("compute() returns 0 for an empty function (no NaN/Infinity)", () => {
    const { getCtx } = createHarness("function empty() {}");
    expect(scopeDepthRatioDefinition.compute(getCtx("empty"))).toBe(0);
  });
});
