import type { SourceFile } from "ts-morph";

import type {
  LanguageBackend,
  SyntaxLanguageId,
  SyntaxSourceInput,
} from "./languages/types";
import type {
  AnalysisOptions,
  MetricDefinition,
  MetricRegistry,
} from "./registry";
import type {
  FileMetrics,
  MetricsSummary,
  ProjectMetrics,
} from "./types";
import { analyzeFile, analyzeSyntaxFile } from "./analyzeFile";

/** One file to analyze: a ts-morph SourceFile or a Python/Rust input. */
export type ProjectSource = SourceFile | SyntaxSourceInput;

/**
 * True for a Python or Rust input. Structural on purpose: the CLI and core
 * can load different copies of ts-morph, so `instanceof SourceFile` is not
 * reliable.
 */
export function isSyntaxSourceInput(item: ProjectSource): item is SyntaxSourceInput {
  return "language" in item && "text" in item && typeof item.text === "string";
}

/**
 * Run `analyzeFile` (TypeScript/JavaScript) or `analyzeSyntaxFile` (Python,
 * Rust) across each source and produce a flat aggregation over every
 * function in every file.
 *
 * Aggregation is over raw per-function values (not per-file summaries), so
 * `avg` is the flat mean across all functions; `max` is the true extreme.
 * A metric that is absent for a language (no compute) is not counted: its
 * `avg` divides by the functions that have the key, and a key that no file
 * reports is left out. For TypeScript-only input this is the flat mean over
 * all functions, as before.
 * Caller owns the ts-morph Project and reads the Python/Rust text — this
 * function performs no I/O. `initSyntaxParsers()` must have resolved when
 * the input holds a Python or Rust file. `backends` replaces the built-in
 * backend for a language (tests use it).
 */
export function analyzeProject(
  sources: ReadonlyArray<ProjectSource>,
  registry: MetricRegistry,
  options?: AnalysisOptions,
  backends: Partial<Record<SyntaxLanguageId, LanguageBackend>> = {},
): ProjectMetrics {
  const files: FileMetrics[] = sources.map((source) =>
    isSyntaxSourceInput(source)
      ? analyzeSyntaxFile(source, registry, options, backends[source.language])
      : analyzeFile(source, registry, options),
  );

  const executionOrder = reportedMetrics(files, registry.getExecutionOrder());
  const max: MetricsSummary = {};
  const avg: MetricsSummary = {};
  const counts = new Map<string, number>();

  for (const def of executionOrder) {
    max[def.key] = def.direction === "lower-is-worse"
      ? Number.POSITIVE_INFINITY
      : 0;
    avg[def.key] = 0;
  }

  let totalFunctions = 0;
  for (const file of files) {
    totalFunctions += file.summary.totalFunctions;
    for (const fn of file.functions) {
      accumulate(fn.metrics, executionOrder, max, avg, counts);
    }
  }

  for (const def of executionOrder) {
    const count = counts.get(def.key) ?? 0;
    if (count > 0) avg[def.key] = (avg[def.key] ?? 0) / count;
  }

  for (const def of executionOrder) {
    const m = max[def.key];
    if (m === undefined || !Number.isFinite(m)) max[def.key] = 0;
  }

  return {
    files,
    summary: {
      totalFiles: files.length,
      totalFunctions,
      max,
      avg,
    },
  };
}

/**
 * The metrics that 1 or more files report, in execution order. Every file
 * summary lists each metric that ran for its language, so the union covers
 * files with 0 functions too. An empty project reports every metric.
 */
function reportedMetrics(
  files: readonly FileMetrics[],
  executionOrder: readonly MetricDefinition[],
): MetricDefinition[] {
  if (files.length === 0) return [...executionOrder];
  const reported = new Set<string>();
  for (const file of files) {
    for (const key of Object.keys(file.summary.max)) reported.add(key);
  }
  return executionOrder.filter((def) => reported.has(def.key));
}

function accumulate(
  metrics: Record<string, number>,
  executionOrder: readonly MetricDefinition[],
  max: MetricsSummary,
  avg: MetricsSummary,
  counts: Map<string, number>,
): void {
  for (const def of executionOrder) {
    const val = metrics[def.key];
    if (val === undefined) continue;
    // NaN counts in the denominator (TypeScript parity), not the numerator.
    counts.set(def.key, (counts.get(def.key) ?? 0) + 1);
    if (Number.isNaN(val)) continue;
    const current = max[def.key] ?? 0;
    max[def.key] = def.direction === "lower-is-worse"
      ? Math.min(current, val)
      : Math.max(current, val);
    avg[def.key] = (avg[def.key] ?? 0) + val;
  }
}
