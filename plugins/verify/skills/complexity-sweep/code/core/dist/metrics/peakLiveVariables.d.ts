import type { MetricComputeContext, MetricDefinition } from "../registry";
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
export declare function computePeakLiveVariables(ctx: MetricComputeContext): number;
declare const peakLiveVariablesDefinition: MetricDefinition;
export default peakLiveVariablesDefinition;
//# sourceMappingURL=peakLiveVariables.d.ts.map