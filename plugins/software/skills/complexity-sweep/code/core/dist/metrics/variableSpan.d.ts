import type { MetricComputeContext, MetricDefinition } from "../registry";
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
export declare function computeVariableSpan(ctx: MetricComputeContext): number;
declare const variableSpanDefinition: MetricDefinition;
export default variableSpanDefinition;
//# sourceMappingURL=variableSpan.d.ts.map