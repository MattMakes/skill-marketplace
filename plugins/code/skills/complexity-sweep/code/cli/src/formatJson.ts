// JSON formatter: produces pretty-printed output with 2-space indent.
//
// Top-level shape:
//   { ...metrics, files: [...rewritten], violations }
// Each function is a whitelist of (name, filePath, line, metrics, details?).
// `details` is omitted when absent or empty.

import type { ProjectMetrics } from "static-analysis-core";

import type { Violation } from "./thresholds";

interface JsonFunction {
  name: string;
  filePath: string;
  line: number;
  metrics: Record<string, number>;
  details?: Record<string, unknown>;
}

export function formatJson(
  metrics: ProjectMetrics,
  violations: readonly Violation[],
): string {
  const output = {
    ...metrics,
    files: metrics.files.map((file) => ({
      ...file,
      functions: file.functions.map(toJsonFunction),
    })),
    violations,
  };
  return JSON.stringify(output, null, 2);
}

function toJsonFunction(
  fn: ProjectMetrics["files"][number]["functions"][number],
): JsonFunction {
  const base: JsonFunction = {
    name: fn.name,
    filePath: fn.filePath,
    line: fn.line,
    metrics: fn.metrics,
  };
  if (fn.details && Object.keys(fn.details).length > 0) {
    base.details = fn.details;
  }
  return base;
}
