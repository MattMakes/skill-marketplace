import type { SyntaxNode } from "../types";
export interface GdscriptHalsteadCounts {
    operators: Map<string, number>;
    operands: Map<string, number>;
}
export interface GdscriptHalsteadDetail {
    n1: number;
    n2: number;
    N1: number;
    N2: number;
}
/**
 * Operator and operand multisets of a unit node. One walk per node; the 3
 * Halstead metrics share the cached result.
 *
 * Port notes (the design is silent):
 * - A declared `name` (`var x`, `const X`, a named lambda) is an operand, as a
 *   TypeScript declared identifier is. Without it, `var` parity with `let`
 *   fails.
 * - The type of `x as T` is skipped, as TypeScript skips the type of `as`.
 *   The `as` operator itself counts (design 9.5).
 * - A `get_node` gives `$` and 1 operand: its full text (`$Node`, `%Name`).
 * - A `pattern_binding` (`var z` in a match pattern) adds no operator; its
 *   identifier is an operand.
 */
export declare function collectGdscriptHalsteadCounts(fn: SyntaxNode): GdscriptHalsteadCounts;
export declare function gdscriptHalsteadDetail(fn: SyntaxNode): GdscriptHalsteadDetail;
export declare function halsteadVolumeOf(d: GdscriptHalsteadDetail): number;
export declare function halsteadDifficultyOf(d: GdscriptHalsteadDetail): number;
//# sourceMappingURL=operations.halstead.d.ts.map