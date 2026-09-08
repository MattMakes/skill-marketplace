// Plain-text table formatter. Shares sort + top-N semantics with
// formatPretty but renders with space padding (no box drawing).

import type {
  FunctionMetrics,
  ProjectMetrics,
} from "static-analysis-core";

import type { Violation } from "./thresholds";

export interface TableMetricMeta {
  key: string;
  shortCode: string;
  direction: "higher-is-worse" | "lower-is-worse";
}

export interface FormatOptions {
  sort?: string;
  top?: number;
  showSummary?: boolean;
  displayMetrics?: string[];
}

const DEFAULT_WIDTH = 6;

export function formatTable(
  metrics: ProjectMetrics,
  violations: readonly Violation[],
  options: FormatOptions,
  metricMetas: readonly TableMetricMeta[] = [],
): string {
  const activeMetas = filterMetas(metricMetas, options.displayMetrics);
  const sorted = sortFunctions(metrics, metricMetas, options.sort);
  const displayed = applyTop(sorted, options.top);

  const headerCols = ["Function", "File", "Line", ...activeMetas.map((m) => m.shortCode)];
  const dataRows = displayed.map((fn) => [
    fn.name,
    fn.filePath,
    String(fn.line),
    ...activeMetas.map((m) => String(readMetric(fn, m.key))),
  ]);

  const colWidths = computeWidths(headerCols, dataRows);
  const lines: string[] = [];

  const header = padRow(headerCols, colWidths);
  lines.push(header);
  lines.push("-".repeat(header.length));
  for (const r of dataRows) lines.push(padRow(r, colWidths));

  if (options.showSummary !== false && metrics.summary.totalFunctions > 0) {
    lines.push("");
    lines.push(
      `Files: ${metrics.summary.totalFiles}  Functions: ${metrics.summary.totalFunctions}`,
    );
    lines.push(
      `Max:  ${activeMetas
        .map((m) => `${m.shortCode}=${metrics.summary.max[m.key] ?? 0}`)
        .join("  ")}`,
    );
    lines.push(
      `Avg:  ${activeMetas
        .map((m) => `${m.shortCode}=${(metrics.summary.avg[m.key] ?? 0).toFixed(1)}`)
        .join("  ")}`,
    );
  }

  if (violations.length > 0) {
    lines.push("");
    for (const v of violations) {
      const icon = v.severity === "error" ? "ERROR" : "WARN";
      lines.push(
        `${icon}: ${v.filePath}:${v.line} ${v.functionName} -- ${v.metric}=${v.value} (threshold: ${v.threshold})`,
      );
    }
  }

  return lines.join("\n");
}

function filterMetas(
  metas: readonly TableMetricMeta[],
  displayMetrics: string[] | undefined,
): readonly TableMetricMeta[] {
  if (!displayMetrics || displayMetrics.length === 0) return metas;
  return metas.filter((m) => displayMetrics.includes(m.key));
}

function sortFunctions(
  metrics: ProjectMetrics,
  metas: readonly TableMetricMeta[],
  sort: string | undefined,
): FunctionMetrics[] {
  const all = metrics.files.flatMap((f) => f.functions);
  const sortKey = sort ?? "cyclomaticComplexity";
  const sortMeta = metas.find((m) => m.key === sortKey);
  const ascending = sortMeta?.direction === "lower-is-worse";
  return [...all].sort((a, b) => compare(a, b, sortKey, ascending));
}

function compare(
  a: FunctionMetrics,
  b: FunctionMetrics,
  sortKey: string,
  ascending: boolean,
): number {
  const aVal = readMetric(a, sortKey);
  const bVal = readMetric(b, sortKey);
  const diff = ascending ? aVal - bVal : bVal - aVal;
  if (diff !== 0) return diff;
  const ccDiff =
    readMetric(b, "cyclomaticComplexity") - readMetric(a, "cyclomaticComplexity");
  if (ccDiff !== 0) return ccDiff;
  return a.name.localeCompare(b.name);
}

function applyTop<T>(items: readonly T[], top: number | undefined): T[] {
  return top !== undefined ? items.slice(0, top) : [...items];
}

/** Reads a metric value, falling back to top-level fields for test fixtures
 *  that put values directly on the function object.                           */
function readMetric(fn: FunctionMetrics, key: string): number {
  const fromMetrics = fn.metrics?.[key];
  if (fromMetrics !== undefined) return fromMetrics;
  const asRecord = fn as unknown as Record<string, unknown>;
  const top = asRecord[key];
  return typeof top === "number" ? top : 0;
}

function computeWidths(header: string[], rows: string[][]): number[] {
  return header.map((h, i) => {
    const dataMax = rows.reduce(
      (max, row) => Math.max(max, (row[i] ?? "").length),
      0,
    );
    return Math.max(h.length, dataMax);
  });
}

function padRow(cols: readonly string[], widths: readonly number[]): string {
  return cols.map((c, i) => c.padEnd(widths[i] ?? DEFAULT_WIDTH)).join(" ");
}
