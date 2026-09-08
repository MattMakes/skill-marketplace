import type { MetricComputeContext, MetricDefinition } from "../registry";
import { MetricKeys } from "../registry";
import { buildDefUseMap } from "../utils/defUseAnalysis";

/**
 * Variable Span (VSpan).
 *
 * Maximum distance (in lines) between a variable's definition and its last
 * use, across all locals and parameters of the function. Unused variables
 * have `lastUseLine === defLine` (initialized in the def-use util), so they
 * contribute a span of 0.
 *
 * Returns a plain number per spec (no detail payload). Closure reads DO
 * extend the outer variable's span, inherited from `buildDefUseMap`.
 */
export function computeVariableSpan(ctx: MetricComputeContext): number {
  const entries = buildDefUseMap(ctx.node, ctx.sourceFile);
  if (entries.length === 0) return 0;

  let maxSpan = 0;
  for (const entry of entries) {
    const span = entry.lastUseLine - entry.defLine;
    if (span > maxSpan) maxSpan = span;
  }
  return maxSpan;
}

const variableSpanDefinition: MetricDefinition = {
  key: MetricKeys.variableSpan,
  name: "Variable Span",
  shortCode: "VSpan",
  description: "VSpan  Maximum lines between variable definition and last use",
  defaultThresholds: { warn: 20, error: 35 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx) => computeVariableSpan(ctx),
};

export default variableSpanDefinition;
