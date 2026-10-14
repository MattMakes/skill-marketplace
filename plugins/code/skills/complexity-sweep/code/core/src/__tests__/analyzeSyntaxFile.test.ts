import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { analyzeSyntaxFile } from "../analyzeFile";
import { languageForPath } from "../languages";
import { lineOf, walkDescendants } from "../languages/syntaxHelpers";
import { initSyntaxParsers } from "../languages/treeSitter";
import type {
  LanguageBackend,
  SyntaxFunction,
  SyntaxMetricCompute,
  SyntaxNode,
  SyntaxSourceFile,
  SyntaxSourceInput,
} from "../languages/types";
import {
  MetricKeys,
  MetricRegistry,
  type MetricDefinition,
  type MetricKey,
} from "../registry";

// The fake backend does not depend on the real Python backend, which other
// units implement in parallel.

function countDescendants(root: SyntaxNode, type: string): number {
  let count = 0;
  walkDescendants(root, (node) => {
    if (node.type === type) count++;
  });
  return count;
}

function fakeExtract(file: SyntaxSourceFile): SyntaxFunction[] {
  const found: SyntaxFunction[] = [];
  walkDescendants(file.tree.rootNode, (node) => {
    if (node.type !== "function_definition") return;
    found.push({
      name: node.childForFieldName("name")?.text ?? "<anonymous>",
      line: lineOf(node),
      node,
    });
  });
  return found;
}

const countReturns: SyntaxMetricCompute = (ctx) =>
  countDescendants(ctx.node, "return_statement");

function fakeBackend(
  metrics: LanguageBackend["metrics"],
  extractFunctions: LanguageBackend["extractFunctions"] = fakeExtract,
): LanguageBackend {
  return { id: "python", extensions: [".py"], extractFunctions, metrics };
}

function definition(
  key: MetricKey,
  dependencies: string[] = [],
  syntaxCompute?: MetricDefinition["syntaxCompute"],
): MetricDefinition {
  const def: MetricDefinition = {
    key,
    name: key,
    shortCode: key.slice(0, 3).toUpperCase(),
    description: key,
    defaultThresholds: { warn: 1, error: 2 },
    direction: "higher-is-worse",
    dependencies,
    compute: () => {
      throw new Error("TypeScript compute must not run for Python.");
    },
  };
  if (syntaxCompute !== undefined) def.syntaxCompute = syntaxCompute;
  return def;
}

function createRegistry(defs: MetricDefinition[]): MetricRegistry {
  const registry = new MetricRegistry();
  for (const def of defs) registry.register(def);
  registry.validate();
  return registry;
}

function pythonInput(text: string, filePath = "src/sample.py"): SyntaxSourceInput {
  return { language: "python", filePath, text };
}

const SAMPLE = `def simple():
    return 1


def branchy(x):
    if x > 0:
        return 1
    return 0
`;

const CC = MetricKeys.cyclomaticComplexity;
const EC = MetricKeys.essentialComplexity;
const MDC = MetricKeys.moduleDesignComplexity;
const ABC = MetricKeys.abcScore;

beforeAll(async () => {
  await initSyntaxParsers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("analyzeSyntaxFile", () => {
  it("reports the language, names, lines and values", () => {
    const registry = createRegistry([definition(CC)]);
    const result = analyzeSyntaxFile(
      pythonInput(SAMPLE),
      registry,
      {},
      fakeBackend({ [CC]: countReturns }),
    );

    expect(result.filePath).toBe("src/sample.py");
    expect(result.language).toBe("python");
    expect(result.functions.map((f) => [f.name, f.line, f.filePath])).toEqual([
      ["simple", 1, "src/sample.py"],
      ["branchy", 5, "src/sample.py"],
    ]);
    // simple has 1 return; branchy has 2.
    expect(result.functions.map((f) => f.metrics[CC])).toEqual([1, 2]);
    expect(result.summary.totalFunctions).toBe(2);
    expect(result.summary.max[CC]).toBe(2);
    expect(result.summary.avg[CC]).toBe(1.5);
  });

  it("passes dependency values and keeps MetricResult details", () => {
    const registry = createRegistry([definition(CC), definition(EC, [CC])]);
    const backend = fakeBackend({
      [CC]: countReturns,
      [EC]: (ctx) => ({ value: (ctx.dependencyValues[CC] ?? 0) * 10, detail: { x: 1 } }),
    });
    const result = analyzeSyntaxFile(pythonInput(SAMPLE), registry, {}, backend);

    expect(result.functions[1]?.metrics[EC]).toBe(20);
    expect(result.functions[1]?.details).toEqual({ [EC]: { x: 1 } });
  });

  it("uses the backend of the input language by default", () => {
    // The stub or the real Python backend: either way the call must not throw.
    const registry = createRegistry([definition(CC)]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = analyzeSyntaxFile(pythonInput(SAMPLE), registry);
    expect(result.language).toBe("python");
  });

  it("prefers syntaxCompute on the definition over the backend compute", () => {
    const registry = createRegistry([
      definition(CC, [], { python: () => 99 }),
    ]);
    const result = analyzeSyntaxFile(
      pythonInput(SAMPLE),
      registry,
      {},
      fakeBackend({ [CC]: countReturns }),
    );
    expect(result.functions.map((f) => f.metrics[CC])).toEqual([99, 99]);
  });

  it("leaves out a metric with no compute and its dependents", () => {
    const registry = createRegistry([
      definition(CC),
      definition(MDC),
      definition(ABC, [MDC]),
    ]);
    // ABC has a compute, but its dependency MDC has none.
    const backend = fakeBackend({ [CC]: countReturns, [ABC]: () => 5 });
    const result = analyzeSyntaxFile(pythonInput(SAMPLE), registry, {}, backend);

    for (const fn of result.functions) {
      expect(Object.keys(fn.metrics)).toEqual([CC]);
    }
    expect(Object.keys(result.summary.max)).toEqual([CC]);
    expect(Object.keys(result.summary.avg)).toEqual([CC]);
  });

  it("leaves out absent metrics from the summary of a file with no functions", () => {
    const registry = createRegistry([definition(CC), definition(MDC)]);
    const result = analyzeSyntaxFile(
      pythonInput("x = 1\n"),
      registry,
      {},
      fakeBackend({ [CC]: countReturns }),
    );
    expect(result.functions).toEqual([]);
    expect(result.summary).toEqual({ totalFunctions: 0, max: { [CC]: 0 }, avg: { [CC]: 0 } });
  });

  it("records NaN and a warning when a compute throws, and NaN for its dependent", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const registry = createRegistry([definition(CC), definition(EC, [CC])]);
    const backend = fakeBackend({
      [CC]: () => {
        throw new Error("boom");
      },
      [EC]: () => 1,
    });
    const result = analyzeSyntaxFile(pythonInput(SAMPLE), registry, {}, backend);

    for (const fn of result.functions) {
      expect(Number.isNaN(fn.metrics[CC])).toBe(true);
      expect(Number.isNaN(fn.metrics[EC])).toBe(true);
    }
    expect(result.summary.max[CC]).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("boom");
  });

  it("warns on a file with syntax errors and still reports results", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const registry = createRegistry([definition(CC)]);
    const text = `def ok():\n    return 1\n\nx = = 2\n`;
    const result = analyzeSyntaxFile(
      pythonInput(text, "broken.py"),
      registry,
      {},
      fakeBackend({ [CC]: countReturns }),
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("broken.py");
    expect(result.functions.map((f) => [f.name, f.metrics[CC]])).toEqual([["ok", 1]]);
  });

  it("warns and reports 0 functions when extraction throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const registry = createRegistry([definition(CC)]);
    const backend = fakeBackend({ [CC]: countReturns }, () => {
      throw new Error("extract failed");
    });
    const result = analyzeSyntaxFile(pythonInput(SAMPLE, "bad.py"), registry, {}, backend);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("bad.py");
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("extract failed");
    expect(result.language).toBe("python");
    expect(result.functions).toEqual([]);
    expect(result.summary.totalFunctions).toBe(0);
  });
});

describe("languageForPath", () => {
  it.each([
    ["a.ts", "typescript"],
    ["a.tsx", "typescript"],
    ["a.mts", "typescript"],
    ["a.cts", "typescript"],
    ["a.js", "typescript"],
    ["a.jsx", "typescript"],
    ["a.mjs", "typescript"],
    ["a.cjs", "typescript"],
    ["dir/a.py", "python"],
    ["dir/a.rs", "rust"],
    ["/abs/UPPER.PY", "python"],
    ["/abs/Main.RS", "rust"],
  ])("routes %s to %s", (path, language) => {
    expect(languageForPath(path)).toBe(language);
  });

  it.each(["notes.txt", "stubs.pyi", "Makefile", "dir.py/README"])(
    "returns undefined for %s",
    (path) => {
      expect(languageForPath(path)).toBeUndefined();
    },
  );
});
