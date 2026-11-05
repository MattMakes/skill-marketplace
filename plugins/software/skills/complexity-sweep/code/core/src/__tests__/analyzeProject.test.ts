import { Project } from "ts-morph";
import { beforeAll, describe, expect, it } from "vitest";

import { analyzeProject, isSyntaxSourceInput } from "../analyzeProject";
import { registerBuiltinMetrics } from "../builtinMetrics";
import { lineOf, walkDescendants } from "../languages/syntaxHelpers";
import { initSyntaxParsers } from "../languages/treeSitter";
import type {
  LanguageBackend,
  SyntaxFunction,
  SyntaxSourceInput,
} from "../languages/types";
import { MetricKeys, MetricRegistry } from "../registry";

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

describe("analyzeProject with Python input", () => {
  beforeAll(async () => {
    await initSyntaxParsers();
  });

  // A fake backend, so this test does not depend on the real Python backend.
  // It reports cyclomaticComplexity only: 1 + the count of `if` statements.
  const fakePython: LanguageBackend = {
    id: "python",
    extensions: [".py"],
    extractFunctions(file) {
      const found: SyntaxFunction[] = [];
      walkDescendants(file.tree.rootNode, (node) => {
        if (node.type !== "function_definition") return;
        found.push({ name: node.childForFieldName("name")?.text ?? "?", line: lineOf(node), node });
      });
      return found;
    },
    metrics: {
      [MetricKeys.cyclomaticComplexity]: (ctx) =>
        1 + ctx.node.descendantsOfType("if_statement").length,
    },
  };

  const pythonInput: SyntaxSourceInput = {
    language: "python",
    filePath: "b.py",
    text: "def f(x):\n    if x:\n        return 1\n    return 0\n",
  };

  it("routes a TypeScript SourceFile and a Python input in 1 call", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const ts = project.createSourceFile(
      "a.ts",
      `function a(x: number) { if (x > 0) { if (x > 1) return 2; } return 0; }`,
    );

    const result = analyzeProject([ts, pythonInput], createRegistry(), {}, {
      python: fakePython,
    });

    expect(result.files.map((f) => [f.filePath, f.language])).toEqual([
      ["/a.ts", "typescript"],
      ["b.py", "python"],
    ]);
    expect(result.summary.totalFiles).toBe(2);
    expect(result.summary.totalFunctions).toBe(2);
    // TypeScript CC = 3, Python CC = 2 (1 + 1 if).
    expect(result.files[1]?.functions[0]?.metrics).toEqual({ cyclomaticComplexity: 2 });
    expect(result.summary.max.cyclomaticComplexity).toBe(3);
    expect(result.summary.avg.cyclomaticComplexity).toBe(2.5);
    // A metric that only the TypeScript function has: the avg divides by 1
    // function, not 2.
    const tsMi = result.files[0]?.functions[0]?.metrics.maintainabilityIndex;
    expect(result.summary.avg.maintainabilityIndex).toBe(tsMi);
  });

  it("leaves out a metric that no file reports", () => {
    const result = analyzeProject([pythonInput], createRegistry(), {}, {
      python: fakePython,
    });
    expect(Object.keys(result.summary.max)).toEqual(["cyclomaticComplexity"]);
    expect(Object.keys(result.summary.avg)).toEqual(["cyclomaticComplexity"]);
  });

  it("tells a Python input apart from a SourceFile", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const ts = project.createSourceFile("a.ts", `function a() {}`);
    expect(isSyntaxSourceInput(pythonInput)).toBe(true);
    expect(isSyntaxSourceInput(ts)).toBe(false);
  });
});
