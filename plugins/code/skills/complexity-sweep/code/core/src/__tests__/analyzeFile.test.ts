import { Project, type SourceFile } from "ts-morph";
import { describe, expect, it, vi } from "vitest";

import { analyzeFile } from "../analyzeFile";
import { registerBuiltinMetrics } from "../builtinMetrics";
import { MetricRegistry, type MetricDefinition } from "../registry";

function createSourceFile(code: string, filePath = "test.ts"): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile(filePath, code);
}

function createRegistry(): MetricRegistry {
  const registry = new MetricRegistry();
  registerBuiltinMetrics(registry);
  registry.validate();
  return registry;
}

describe("analyzeFile", () => {
  it("returns metrics for all functions in a file", () => {
    const sf = createSourceFile(`
      function simple() { return 1; }
      function complex(x: number) {
        if (x > 0) return 1;
        if (x < 0) return -1;
        return 0;
      }
    `);
    const result = analyzeFile(sf, createRegistry());

    expect(result.filePath).toBe("/test.ts");
    expect(result.functions).toHaveLength(2);
    expect(result.summary.totalFunctions).toBe(2);

    const byName = Object.fromEntries(result.functions.map((f) => [f.name, f]));
    expect(byName.simple?.metrics.cyclomaticComplexity).toBe(1);
    expect(byName.complex?.metrics.cyclomaticComplexity).toBe(3);
  });

  it("computes max and avg summaries", () => {
    const sf = createSourceFile(`
      function a() {}
      function b(x: number) { if (x > 0) return 1; return 0; }
    `);
    const result = analyzeFile(sf, createRegistry());

    expect(result.summary.max.cyclomaticComplexity).toBe(2);
    expect(result.summary.avg.cyclomaticComplexity).toBe(1.5);
  });

  it("handles files with no functions", () => {
    const sf = createSourceFile(`const x = 1;`);
    const result = analyzeFile(sf, createRegistry());

    expect(result.functions).toHaveLength(0);
    expect(result.summary.totalFunctions).toBe(0);
    expect(result.summary.max.cyclomaticComplexity).toBe(0);
    expect(result.summary.avg.cyclomaticComplexity).toBe(0);
    // lower-is-worse metrics must also clamp to 0 on empty.
    expect(result.summary.max.maintainabilityIndex).toBe(0);
  });

  it("passes weights to cyclomatic complexity via options", () => {
    const sf = createSourceFile(`
      function withIf(x: number) { if (x > 0) return 1; return 0; }
    `);
    const result = analyzeFile(sf, createRegistry(), {
      weights: { cyclomaticComplexity: { if: 5 } },
    });
    // base 1 + weight 5 = 6
    expect(result.functions[0]?.metrics.cyclomaticComplexity).toBe(6);
  });

  it("handles metric compute errors with circuit breaker", () => {
    const registry = new MetricRegistry();
    const broken: MetricDefinition = {
      key: "broken",
      name: "Broken",
      shortCode: "BRK",
      description: "always throws",
      defaultThresholds: { warn: 1, error: 2 },
      direction: "higher-is-worse",
      dependencies: [],
      compute: () => {
        throw new Error("boom");
      },
    };
    registry.register(broken);
    registry.validate();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const sf = createSourceFile(`function foo() {}`);
      const result = analyzeFile(sf, registry);
      expect(Number.isNaN(result.functions[0]?.metrics.broken)).toBe(true);
      // summary.max falls back to 0 when every value was NaN
      expect(result.summary.max.broken).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("skips dependent metrics when a dependency fails", () => {
    const registry = new MetricRegistry();
    const base: MetricDefinition = {
      key: "base",
      name: "Base",
      shortCode: "BAS",
      description: "throws",
      defaultThresholds: { warn: 1, error: 2 },
      direction: "higher-is-worse",
      dependencies: [],
      compute: () => {
        throw new Error("nope");
      },
    };
    const dependent: MetricDefinition = {
      key: "dependent",
      name: "Dependent",
      shortCode: "DEP",
      description: "depends on base",
      defaultThresholds: { warn: 1, error: 2 },
      direction: "higher-is-worse",
      dependencies: ["base"],
      compute: () => 42,
    };
    registry.register(base);
    registry.register(dependent);
    registry.validate();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const sf = createSourceFile(`function foo() {}`);
      const result = analyzeFile(sf, registry);
      const fn = result.functions[0];
      expect(Number.isNaN(fn?.metrics.base)).toBe(true);
      expect(Number.isNaN(fn?.metrics.dependent)).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("coerces invalid numeric return values to NaN and warns", () => {
    const registry = new MetricRegistry();
    const bad: MetricDefinition = {
      key: "bad",
      name: "Bad",
      shortCode: "BAD",
      description: "returns -1",
      defaultThresholds: { warn: 1, error: 2 },
      direction: "higher-is-worse",
      dependencies: [],
      compute: () => -1,
    };
    registry.register(bad);
    registry.validate();

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const sf = createSourceFile(`function foo() {}`);
      const result = analyzeFile(sf, registry);
      expect(Number.isNaN(result.functions[0]?.metrics.bad)).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("unpacks MetricResult objects into metrics + details", () => {
    const registry = new MetricRegistry();
    const rich: MetricDefinition = {
      key: "rich",
      name: "Rich",
      shortCode: "RIC",
      description: "returns { value, detail }",
      defaultThresholds: { warn: 1, error: 2 },
      direction: "higher-is-worse",
      dependencies: [],
      compute: () => ({ value: 7, detail: { note: "hello" } }),
    };
    registry.register(rich);
    registry.validate();

    const sf = createSourceFile(`function foo() {}`);
    const result = analyzeFile(sf, registry);
    const fn = result.functions[0];
    expect(fn?.metrics.rich).toBe(7);
    expect(fn?.details).toEqual({ rich: { note: "hello" } });
  });

  it("omits details when no metric produced any", () => {
    const sf = createSourceFile(`function foo() {}`);
    const registry = new MetricRegistry();
    const plain: MetricDefinition = {
      key: "plain",
      name: "Plain",
      shortCode: "PLN",
      description: "bare number",
      defaultThresholds: { warn: 1, error: 2 },
      direction: "higher-is-worse",
      dependencies: [],
      compute: () => 3,
    };
    registry.register(plain);
    registry.validate();

    const result = analyzeFile(sf, registry);
    expect(result.functions[0]?.details).toBeUndefined();
  });

  it("preserves the absolute filePath returned by ts-morph", () => {
    const sf = createSourceFile(`function foo() {}`, "nested/dir/a.ts");
    const result = analyzeFile(sf, createRegistry());
    // ts-morph in-memory FS prefixes with /; we no longer strip it (the strip
    // was a bug in the original that corrupted absolute paths).
    expect(result.filePath).toBe("/nested/dir/a.ts");
  });
});
