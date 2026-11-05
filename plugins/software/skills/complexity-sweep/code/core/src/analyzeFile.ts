import type { SourceFile } from "ts-morph";

import { getSyntaxBackend } from "./languages";
import { parseSyntaxSource } from "./languages/treeSitter";
import type {
  LanguageBackend,
  SyntaxFunction,
  SyntaxMetricCompute,
  SyntaxSourceFile,
  SyntaxSourceInput,
} from "./languages/types";
import type {
  AnalysisOptions,
  MetricDefinition,
  MetricRegistry,
  MetricResult,
} from "./registry";
import type {
  FileMetrics,
  FunctionMetrics,
  MetricsSummary,
} from "./types";
import { extractFunctions, type ExtractedFunction } from "./utils/astHelpers";

/**
 * Run every registered metric against every function-like in `sourceFile`.
 *
 * Preconditions:
 *  - `registry.validate()` must have been called; `getExecutionOrder()` throws
 *    otherwise.
 *  - `sourceFile` is a ts-morph SourceFile; its parent project is caller-owned.
 *
 * Behavior:
 *  - A metric that throws or returns an invalid value (non-finite, negative)
 *    is recorded as NaN for the current function; its dependents are skipped
 *    (also NaN). The pipeline continues — no single metric can poison the
 *    whole file. This is the documented "circuit breaker".
 *  - `details` is omitted from FunctionMetrics when no metric produced any.
 *  - `filePath` is the raw path reported by ts-morph (no leading-slash strip;
 *    the original's strip was a bug that corrupted absolute paths).
 *  - `summary.max` flips Math.max/Math.min based on each metric's direction.
 *  - `summary.avg` divides by total function count, not the non-NaN count —
 *    failures contribute 0 to the numerator but 1 to the denominator.
 */
export function analyzeFile(
  sourceFile: SourceFile,
  registry: MetricRegistry,
  options?: AnalysisOptions,
): FileMetrics {
  const extracted = extractFunctions(sourceFile);
  const filePath = sourceFile.getFilePath();
  const effectiveOptions: AnalysisOptions = options ?? {};

  const active = resolveActiveMetrics<ExtractedFunction>(
    registry.getExecutionOrder(),
    (def) => (fn, dependencyValues) =>
      def.compute({
        node: fn.node,
        sourceFile,
        options: effectiveOptions,
        dependencyValues,
      }),
  );

  const functions = extracted.map((fn) => runMetrics(fn, filePath, active));
  const summary = buildFileSummary(functions, active);

  return { filePath, language: "typescript", functions, summary };
}

/**
 * Run every registered metric against every function in a Python or Rust
 * file parsed with tree-sitter.
 *
 * Same preconditions, circuit breaker and summary rules as `analyzeFile`,
 * plus:
 *  - The compute for a metric is `def.syntaxCompute[language]` when set,
 *    else `backend.metrics[def.key]`.
 *  - A metric with no compute is absent from `metrics` (not NaN), and every
 *    metric that depends on it is absent too. The file summary leaves out
 *    the absent keys.
 *  - A file with syntax errors gets 1 warning and is analyzed anyway (ts-morph
 *    also analyzes files with syntax errors).
 *  - When parsing or extraction throws, the file gets 1 warning and 0
 *    functions. One bad file does not stop a run.
 *  - `initSyntaxParsers()` must have resolved before the call.
 */
export function analyzeSyntaxFile(
  input: SyntaxSourceInput,
  registry: MetricRegistry,
  options?: AnalysisOptions,
  backend: LanguageBackend = getSyntaxBackend(input.language),
): FileMetrics {
  const { filePath, language } = input;
  const effectiveOptions: AnalysisOptions = options ?? {};
  const backendComputes: Partial<Record<string, SyntaxMetricCompute>> =
    backend.metrics;

  let file: SyntaxSourceFile | undefined;
  const active = resolveActiveMetrics<SyntaxFunction>(
    registry.getExecutionOrder(),
    (def) => {
      const compute = def.syntaxCompute?.[language] ?? backendComputes[def.key];
      if (compute === undefined) return undefined;
      return (fn, dependencyValues) => {
        if (file === undefined) throw new Error("File is not parsed.");
        return compute({
          language,
          node: fn.node,
          file,
          options: effectiveOptions,
          dependencyValues,
        });
      };
    },
  );

  let extracted: SyntaxFunction[] = [];
  try {
    file = parseSyntaxSource(input);
    if (file.tree.rootNode.hasError) {
      console.warn(
        `Warning: Syntax errors in ${filePath}; the results can be incomplete.`,
      );
    }
    extracted = backend.extractFunctions(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Warning: Could not analyze ${filePath}: ${message}`);
    file?.tree.delete();
    return {
      filePath,
      language,
      functions: [],
      summary: buildFileSummary([], active),
    };
  }

  try {
    const functions = extracted.map((fn) => runMetrics(fn, filePath, active));
    const summary = buildFileSummary(functions, active);
    return { filePath, language, functions, summary };
  } finally {
    file.tree.delete();
  }
}

/** One function unit as the metric runner sees it. */
interface MetricUnit {
  name: string;
  line: number;
}

type UnitCompute<TUnit> = (
  unit: TUnit,
  dependencyValues: Record<string, number>,
) => number | MetricResult<unknown>;

interface ActiveMetric<TUnit> {
  def: MetricDefinition;
  compute: UnitCompute<TUnit>;
}

/**
 * The metrics that run for one language, in execution order. A metric with
 * no compute (`resolveCompute` returns undefined) is left out, and so is
 * every metric that depends on a left-out metric.
 */
function resolveActiveMetrics<TUnit>(
  executionOrder: readonly MetricDefinition[],
  resolveCompute: (def: MetricDefinition) => UnitCompute<TUnit> | undefined,
): ActiveMetric<TUnit>[] {
  const active: ActiveMetric<TUnit>[] = [];
  const absent = new Set<string>();
  for (const def of executionOrder) {
    const compute = def.dependencies.some((dep) => absent.has(dep))
      ? undefined
      : resolveCompute(def);
    if (compute === undefined) {
      absent.add(def.key);
      continue;
    }
    active.push({ def, compute });
  }
  return active;
}

function runMetrics<TUnit extends MetricUnit>(
  fn: TUnit,
  filePath: string,
  active: readonly ActiveMetric<TUnit>[],
): FunctionMetrics {
  const metrics: Record<string, number> = {};
  const details: Record<string, unknown> = {};
  const failed = new Set<string>();

  for (const { def, compute } of active) {
    if (def.dependencies.some((dep) => failed.has(dep))) {
      metrics[def.key] = Number.NaN;
      failed.add(def.key);
      continue;
    }

    try {
      const result = compute(fn, metrics);
      applyResult(def, result, fn.name, filePath, metrics, details, failed);
    } catch (err) {
      metrics[def.key] = Number.NaN;
      failed.add(def.key);
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `Warning: Metric "${def.key}" threw for ${fn.name} in ${filePath}: ${message}`,
      );
    }
  }

  const base: FunctionMetrics = {
    name: fn.name,
    filePath,
    line: fn.line,
    metrics,
  };
  if (Object.keys(details).length > 0) base.details = details;
  return base;
}

function applyResult(
  def: MetricDefinition,
  result: number | MetricResult<unknown>,
  fnName: string,
  filePath: string,
  metrics: Record<string, number>,
  details: Record<string, unknown>,
  failed: Set<string>,
): void {
  if (typeof result === "number") {
    if (!isValid(result)) {
      warnInvalid(def.key, result, fnName, filePath);
      metrics[def.key] = Number.NaN;
      failed.add(def.key);
      return;
    }
    metrics[def.key] = result;
    return;
  }

  const value = result.value;
  if (!isValid(value)) {
    warnInvalid(def.key, value, fnName, filePath);
    metrics[def.key] = Number.NaN;
    failed.add(def.key);
    return;
  }
  metrics[def.key] = value;
  details[def.key] = result.detail;
}

function isValid(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

function warnInvalid(
  key: string,
  value: number,
  fnName: string,
  filePath: string,
): void {
  console.warn(
    `Warning: Metric "${key}" returned invalid value (${value}) for ${fnName} in ${filePath}`,
  );
}

function buildFileSummary<TUnit>(
  functions: FunctionMetrics[],
  active: readonly ActiveMetric<TUnit>[],
): { totalFunctions: number; max: MetricsSummary; avg: MetricsSummary } {
  const executionOrder = active.map((m) => m.def);
  const max: MetricsSummary = {};
  const avg: MetricsSummary = {};

  for (const def of executionOrder) {
    max[def.key] = def.direction === "lower-is-worse"
      ? Number.POSITIVE_INFINITY
      : 0;
    avg[def.key] = 0;
  }

  if (functions.length === 0) {
    for (const def of executionOrder) max[def.key] = 0;
    return { totalFunctions: 0, max, avg };
  }

  for (const fn of functions) {
    for (const def of executionOrder) {
      const val = fn.metrics[def.key];
      if (val === undefined || Number.isNaN(val)) continue;
      const current = max[def.key] ?? 0;
      max[def.key] = def.direction === "lower-is-worse"
        ? Math.min(current, val)
        : Math.max(current, val);
      avg[def.key] = (avg[def.key] ?? 0) + val;
    }
  }

  for (const def of executionOrder) {
    avg[def.key] = (avg[def.key] ?? 0) / functions.length;
    const m = max[def.key];
    if (m === undefined || !Number.isFinite(m)) max[def.key] = 0;
  }

  return { totalFunctions: functions.length, max, avg };
}
