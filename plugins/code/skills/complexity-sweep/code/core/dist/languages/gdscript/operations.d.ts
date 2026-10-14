import type { SyntaxMetricCompute, SyntaxNode } from "../types";
import { type GdscriptHalsteadDetail } from "./operations.halstead";
export interface GdscriptAbcCounts {
    a: number;
    b: number;
    c: number;
}
/**
 * Raw ABC counts for a GDScript unit node. 1 walk; nested units are skipped.
 *
 * Port note: as in TypeScript, a `for` variable and a `pattern_binding` add
 * nothing to A. A `var` without a value adds nothing to A.
 */
export declare function computeGdscriptAbcCounts(fn: SyntaxNode): GdscriptAbcCounts;
export declare const gdscriptAbcScore: SyntaxMetricCompute<GdscriptAbcCounts>;
export declare const gdscriptScopeDepthWeightedLoc: SyntaxMetricCompute;
export declare const gdscriptScopeDepthRatio: SyntaxMetricCompute;
export declare const gdscriptHalsteadVolume: SyntaxMetricCompute<GdscriptHalsteadDetail>;
export declare const gdscriptHalsteadDifficulty: SyntaxMetricCompute<GdscriptHalsteadDetail>;
export declare const gdscriptHalsteadEffort: SyntaxMetricCompute<GdscriptHalsteadDetail>;
/**
 * MI = max(0, (171 - 5.2 ln V - 0.23 CC - 16.2 ln LOC) * 100 / 171).
 * Same fallbacks and guard as the TypeScript metric: V defaults to 0, CC to
 * 1, and V <= 0 or LOC <= 0 gives 100.
 */
export declare const gdscriptMaintainabilityIndex: SyntaxMetricCompute;
//# sourceMappingURL=operations.d.ts.map