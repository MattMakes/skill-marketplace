// Pretty formatter: Unicode-bordered table + summary sub-table + violation
// block + trailing metric legend. Shares sort / top-N / filter semantics
// with formatTable.

import type {
  FunctionMetrics,
  ProjectMetrics,
} from "static-analysis-core";

import type { Violation } from "./thresholds";

export interface PrettyMetricMeta {
  key: string;
  shortCode: string;
  name: string;
  description: string;
  direction: "higher-is-worse" | "lower-is-worse";
}

export interface PrettyFormatOptions {
  sort?: string;
  top?: number;
  showSummary?: boolean;
  displayMetrics?: string[];
}

type BorderPos = "top" | "mid" | "bot";

export function formatPretty(
  metrics: ProjectMetrics,
  violations: readonly Violation[],
  options: PrettyFormatOptions,
  metricMetas: readonly PrettyMetricMeta[],
): string {
  const activeMetas = filterMetas(metricMetas, options.displayMetrics);
  const sorted = sortFunctions(metrics, metricMetas, options.sort);
  const displayed = options.top !== undefined ? sorted.slice(0, options.top) : sorted;

  const lines: string[] = [];
  renderMainTable(lines, activeMetas, displayed);
  renderSummary(lines, metrics, activeMetas, options.showSummary !== false);
  renderViolations(lines, violations, metricMetas);
  renderLegend(lines, activeMetas, options.showSummary !== false);
  return lines.join("\n");
}

// ---------- rendering sub-steps ----------

function renderMainTable(
  lines: string[],
  activeMetas: readonly PrettyMetricMeta[],
  displayed: readonly FunctionMetrics[],
): void {
  const headerRow = ["Function", "File", "Line", ...activeMetas.map((m) => m.name)];
  const dataRows = displayed.map((fn) => [
    fn.name,
    fn.filePath,
    String(fn.line),
    ...activeMetas.map((m) => String(readMetric(fn, m.key))),
  ]);
  const widths = computeWidths(headerRow, dataRows);

  lines.push(border(widths, "top"));
  lines.push(row(headerRow, widths));
  lines.push(border(widths, "mid"));
  for (const r of dataRows) lines.push(row(r, widths));
  lines.push(border(widths, "bot"));
}

function renderSummary(
  lines: string[],
  metrics: ProjectMetrics,
  activeMetas: readonly PrettyMetricMeta[],
  enabled: boolean,
): void {
  if (!enabled || metrics.summary.totalFunctions === 0) return;

  lines.push("");
  lines.push(
    `  ${metrics.summary.totalFiles} files, ${metrics.summary.totalFunctions} functions`,
  );

  const header = ["", ...activeMetas.map((m) => m.name)];
  const maxRow = ["Max", ...activeMetas.map((m) => String(metrics.summary.max[m.key] ?? 0))];
  const avgRow = [
    "Avg",
    ...activeMetas.map((m) => (metrics.summary.avg[m.key] ?? 0).toFixed(1)),
  ];
  const widths = header.map((h, i) =>
    Math.max(h.length, (maxRow[i] ?? "").length, (avgRow[i] ?? "").length),
  );

  lines.push("");
  lines.push(border(widths, "top"));
  lines.push(row(header, widths));
  lines.push(border(widths, "mid"));
  lines.push(row(maxRow, widths));
  lines.push(row(avgRow, widths));
  lines.push(border(widths, "bot"));
}

function renderViolations(
  lines: string[],
  violations: readonly Violation[],
  metricMetas: readonly PrettyMetricMeta[],
): void {
  if (violations.length === 0) return;

  const errors = violations.filter((v) => v.severity === "error");
  const warns = violations.filter((v) => v.severity === "warn");

  lines.push("");
  lines.push(
    `  Threshold Violations: ${errors.length} errors, ${warns.length} warnings`,
  );
  lines.push("");

  const metricNames: Record<string, string> = {};
  for (const m of metricMetas) metricNames[m.key] = m.name;

  for (const v of violations) {
    const icon = v.severity === "error" ? "  ERROR" : "  WARN ";
    const displayName = metricNames[v.metric] ?? v.metric;
    lines.push(`${icon}  ${v.functionName} (${v.filePath}:${v.line})`);
    lines.push(`          ${displayName} = ${v.value} (threshold: ${v.threshold})`);
  }
}

function renderLegend(
  lines: string[],
  activeMetas: readonly PrettyMetricMeta[],
  enabled: boolean,
): void {
  if (!enabled) return;
  lines.push("");
  lines.push("  Metrics:");
  for (const m of activeMetas) {
    lines.push(`    ${m.name.padEnd(12)} ${m.description}`);
  }
}

// ---------- shared primitives ----------

function filterMetas(
  metas: readonly PrettyMetricMeta[],
  displayMetrics: string[] | undefined,
): readonly PrettyMetricMeta[] {
  if (!displayMetrics || displayMetrics.length === 0) return metas;
  return metas.filter((m) => displayMetrics.includes(m.key));
}

function sortFunctions(
  metrics: ProjectMetrics,
  metas: readonly PrettyMetricMeta[],
  sort: string | undefined,
): FunctionMetrics[] {
  const all = metrics.files.flatMap((f) => f.functions);
  const sortKey = sort ?? "cyclomaticComplexity";
  const sortMeta = metas.find((m) => m.key === sortKey);
  const ascending = sortMeta?.direction === "lower-is-worse";
  return [...all].sort((a, b) => {
    const diff = ascending
      ? readMetric(a, sortKey) - readMetric(b, sortKey)
      : readMetric(b, sortKey) - readMetric(a, sortKey);
    if (diff !== 0) return diff;
    const ccDiff =
      readMetric(b, "cyclomaticComplexity") - readMetric(a, "cyclomaticComplexity");
    if (ccDiff !== 0) return ccDiff;
    return a.name.localeCompare(b.name);
  });
}

function readMetric(fn: FunctionMetrics, key: string): number {
  const fromMetrics = fn.metrics?.[key];
  if (fromMetrics !== undefined) return fromMetrics;
  const asRecord = fn as unknown as Record<string, unknown>;
  const top = asRecord[key];
  return typeof top === "number" ? top : 0;
}

function computeWidths(header: readonly string[], rows: readonly string[][]): number[] {
  return header.map((h, i) => {
    const dataMax = rows.reduce(
      (max, r) => Math.max(max, (r[i] ?? "").length),
      0,
    );
    return Math.max(h.length, dataMax);
  });
}

const BORDER_CHARS: Record<BorderPos, { left: string; mid: string; right: string; fill: string }> = {
  top: { left: "\u250c", mid: "\u252c", right: "\u2510", fill: "\u2500" },
  mid: { left: "\u251c", mid: "\u253c", right: "\u2524", fill: "\u2500" },
  bot: { left: "\u2514", mid: "\u2534", right: "\u2518", fill: "\u2500" },
};

function border(widths: readonly number[], position: BorderPos): string {
  const chars = BORDER_CHARS[position];
  const segments = widths.map((w) => chars.fill.repeat(w + 2));
  return chars.left + segments.join(chars.mid) + chars.right;
}

function row(cells: readonly string[], widths: readonly number[]): string {
  const padded = cells.map((cell, i) => {
    const w = widths[i] ?? cell.length;
    // Right-align numeric columns (Line + metric columns, i >= 2).
    return i >= 2 ? ` ${cell.padStart(w)} ` : ` ${cell.padEnd(w)} `;
  });
  return `\u2502${padded.join("\u2502")}\u2502`;
}
