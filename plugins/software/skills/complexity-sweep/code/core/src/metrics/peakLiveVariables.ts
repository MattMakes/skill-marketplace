import type { MetricComputeContext, MetricDefinition } from "../registry";
import { MetricKeys } from "../registry";
import { buildDefUseMap, type DefUseEntry } from "../utils/defUseAnalysis";

/**
 * Peak Live Variables (PLV).
 *
 * Maximum number of local variables simultaneously "live" (between their def
 * line and last-use line, inclusive) at any line in the function. Measures
 * register-pressure-style cognitive load.
 *
 * Algorithm: sweep each line in `[minDefLine, maxLastUseLine]` and count the
 * entries whose live range covers it. Returns the maximum. Returns 0 when the
 * function has no bindings. Nested-function boundaries are handled inside
 * `buildDefUseMap`: declarations are not descended into, but closure reads
 * DO extend the outer variable's last-use line — that falls out of the util.
 */
export function computePeakLiveVariables(ctx: MetricComputeContext): number {
  const entries = buildDefUseMap(ctx.node, ctx.sourceFile);
  if (entries.length === 0) return 0;

  const { minLine, maxLine } = spanBounds(entries);

  let peak = 0;
  for (let line = minLine; line <= maxLine; line++) {
    let count = 0;
    for (const entry of entries) {
      if (entry.defLine <= line && line <= entry.lastUseLine) count++;
    }
    if (count > peak) peak = count;
  }
  return peak;
}

function spanBounds(entries: readonly DefUseEntry[]): {
  minLine: number;
  maxLine: number;
} {
  let minLine = Infinity;
  let maxLine = 0;
  for (const entry of entries) {
    if (entry.defLine < minLine) minLine = entry.defLine;
    if (entry.lastUseLine > maxLine) maxLine = entry.lastUseLine;
  }
  return { minLine, maxLine };
}

const peakLiveVariablesDefinition: MetricDefinition = {
  key: MetricKeys.peakLiveVariables,
  name: "Peak Live Variables",
  shortCode: "PLV",
  description: "PLV  Maximum simultaneously live variables at any point",
  defaultThresholds: { warn: 7, error: 10 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx) => computePeakLiveVariables(ctx),
};

export default peakLiveVariablesDefinition;
