import type { MetricComputeContext, MetricDefinition } from "../registry";
export interface ScopeDepthStats {
    weightedLoc: number;
    rawLoc: number;
    ratio: number;
}
export declare function computeScopeDepthStats(ctx: MetricComputeContext): ScopeDepthStats;
export declare const scopeDepthWeightedLocDefinition: MetricDefinition;
export declare const scopeDepthRatioDefinition: MetricDefinition;
export default scopeDepthWeightedLocDefinition;
//# sourceMappingURL=scopeDepth.d.ts.map