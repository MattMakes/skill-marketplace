import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";

import { analyzeProject } from "../analyzeProject";
import { registerBuiltinMetrics } from "../builtinMetrics";
import { MetricRegistry } from "../registry";

function createRegistry(): MetricRegistry {
  const registry = new MetricRegistry();
  registerBuiltinMetrics(registry);
  registry.validate();
  return registry;
}

describe("analyzeProject", () => {
  it("aggregates metrics across files", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const a = project.createSourceFile("a.ts", `function a() {}`);
    const b = project.createSourceFile(
      "b.ts",
      `function b(x: number) { if (x > 0) return 1; return 0; }`,
    );

    const result = analyzeProject([a, b], createRegistry());

    expect(result.files).toHaveLength(2);
    expect(result.summary.totalFiles).toBe(2);
    expect(result.summary.totalFunctions).toBe(2);
    expect(result.summary.max.cyclomaticComplexity).toBe(2);
    expect(result.summary.avg.cyclomaticComplexity).toBe(1.5);
  });

  it("handles empty project input", () => {
    const result = analyzeProject([], createRegistry());
    expect(result.files).toHaveLength(0);
    expect(result.summary.totalFiles).toBe(0);
    expect(result.summary.totalFunctions).toBe(0);
    expect(result.summary.max.cyclomaticComplexity).toBe(0);
    expect(result.summary.avg.cyclomaticComplexity).toBe(0);
    // lower-is-worse clamped too
    expect(result.summary.max.maintainabilityIndex).toBe(0);
  });

  it("preserves input file order in output", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const z = project.createSourceFile("z.ts", `function z() {}`);
    const m = project.createSourceFile("m.ts", `function m() {}`);
    const a = project.createSourceFile("a.ts", `function a() {}`);

    const result = analyzeProject([z, m, a], createRegistry());
    expect(result.files.map((f) => f.filePath)).toEqual(["/z.ts", "/m.ts", "/a.ts"]);
  });

  it("counts files with zero functions in totalFiles but not totalFunctions", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const empty = project.createSourceFile("empty.ts", `const x = 1;`);
    const one = project.createSourceFile("one.ts", `function f() {}`);

    const result = analyzeProject([empty, one], createRegistry());
    expect(result.summary.totalFiles).toBe(2);
    expect(result.summary.totalFunctions).toBe(1);
    expect(result.summary.avg.cyclomaticComplexity).toBe(1);
  });

  it("computes flat mean across all functions, not a mean of per-file means", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    // a.ts has one function with CC=1.
    const a = project.createSourceFile("a.ts", `function a() {}`);
    // b.ts has three functions: CC=1, CC=2, CC=3.
    const b = project.createSourceFile(
      "b.ts",
      `
        function one() {}
        function two(x: number) { if (x > 0) return 1; return 0; }
        function three(x: number) {
          if (x > 0) return 1;
          if (x < 0) return -1;
          return 0;
        }
      `,
    );

    const result = analyzeProject([a, b], createRegistry());
    expect(result.summary.totalFunctions).toBe(4);
    // Flat mean: (1 + 1 + 2 + 3) / 4 = 1.75
    // Mean-of-means would be (1 + 2) / 2 = 1.5 — explicitly NOT this.
    expect(result.summary.avg.cyclomaticComplexity).toBe(1.75);
    expect(result.summary.max.cyclomaticComplexity).toBe(3);
  });
});
