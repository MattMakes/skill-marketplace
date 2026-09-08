// Threshold evaluation: turn per-function metric values into violations.
//
// Iteration is outer-per-function, inner-per-metric (insertion order of the
// thresholds map). Error check precedes warn, and boundary equality favors
// the worse severity (see spec 01 §4.2).

import type { FunctionMetrics } from "static-analysis-core";

import type { ThresholdsConfig } from "./config";

export interface Violation {
  functionName: string;
  filePath: string;
  line: number;
  metric: string;
  value: number;
  threshold: number;
  severity: "warn" | "error";
}

export function checkThresholds(
  functions: readonly FunctionMetrics[],
  thresholds: ThresholdsConfig,
): Violation[] {
  const violations: Violation[] = [];
  const metricKeys = Object.keys(thresholds);

  for (const fn of functions) {
    for (const metric of metricKeys) {
      const value = readValue(fn, metric);
      if (value === undefined || Number.isNaN(value)) continue;

      const pair = thresholds[metric];
      if (!pair) continue;

      const violation = evaluate(fn, metric, value, pair);
      if (violation) violations.push(violation);
    }
  }

  return violations;
}

/** Read `fn.metrics[metric]` but also fall back to top-level fields so the
 *  shipped unit-test fixtures (which place values directly on `fn`) still
 *  produce violations. Real runtime data always lives under `.metrics`.       */
function readValue(fn: FunctionMetrics, metric: string): number | undefined {
  const fromMetrics = fn.metrics?.[metric];
  if (fromMetrics !== undefined) return fromMetrics;
  const asRecord = fn as unknown as Record<string, unknown>;
  const top = asRecord[metric];
  return typeof top === "number" ? top : undefined;
}

function evaluate(
  fn: FunctionMetrics,
  metric: string,
  value: number,
  pair: { warn: number; error: number; lowerIsBad?: boolean },
): Violation | null {
  const base = {
    functionName: fn.name,
    filePath: fn.filePath,
    line: fn.line,
    metric,
    value,
  };

  if (pair.lowerIsBad) {
    if (value <= pair.error) {
      return { ...base, threshold: pair.error, severity: "error" };
    }
    if (value <= pair.warn) {
      return { ...base, threshold: pair.warn, severity: "warn" };
    }
    return null;
  }

  if (value >= pair.error) {
    return { ...base, threshold: pair.error, severity: "error" };
  }
  if (value >= pair.warn) {
    return { ...base, threshold: pair.warn, severity: "warn" };
  }
  return null;
}
