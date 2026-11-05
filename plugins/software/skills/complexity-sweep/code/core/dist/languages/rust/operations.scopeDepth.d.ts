import type { SyntaxMetricContext } from "../types";
interface ScopeDepthStats {
    weightedLoc: number;
    rawLoc: number;
    ratio: number;
}
export declare function countRustLoc(ctx: SyntaxMetricContext): number;
export declare function computeRustScopeDepthStats(ctx: SyntaxMetricContext): ScopeDepthStats;
export {};
//# sourceMappingURL=operations.scopeDepth.d.ts.map