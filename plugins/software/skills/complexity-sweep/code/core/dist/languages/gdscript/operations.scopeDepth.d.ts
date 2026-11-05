import type { SyntaxNode } from "../types";
export interface GdscriptScopeDepthStats {
    weightedLoc: number;
    rawLoc: number;
    ratio: number;
}
/**
 * 1-based code lines of a GDScript unit body, in ascending order. MI and
 * scopeDepthRatio share this helper.
 *
 * Port note: as in the Python port, the TypeScript text rule drops lines whose
 * trimmed text is `{` or `}`. A line inside a string node is string content,
 * so a `}` line there counts. A blank line there does not count.
 */
export declare function gdscriptCodeLines(fn: SyntaxNode, sourceText: string): number[];
/** Weighted LOC, raw LOC and their ratio. Cached: 2 metrics share it. */
export declare function gdscriptScopeDepthStats(fn: SyntaxNode, sourceText: string): GdscriptScopeDepthStats;
//# sourceMappingURL=operations.scopeDepth.d.ts.map