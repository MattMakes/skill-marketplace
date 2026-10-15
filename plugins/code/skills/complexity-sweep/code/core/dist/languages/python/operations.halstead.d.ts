import type { SyntaxNode } from "../types";
export interface PythonHalsteadCounts {
    operators: Map<string, number>;
    operands: Map<string, number>;
}
export interface PythonHalsteadDetail {
    n1: number;
    n2: number;
    N1: number;
    N2: number;
}
/**
 * Operator and operand multisets of a function node. One walk per node; the
 * 3 Halstead metrics share the cached result.
 *
 * Port note: the design is silent on the docstring. It is skipped here, like
 * a TypeScript JSDoc comment, because design 5.10 treats it as a comment.
 */
export declare function collectPythonHalsteadCounts(fn: SyntaxNode): PythonHalsteadCounts;
export declare function pythonHalsteadDetail(fn: SyntaxNode): PythonHalsteadDetail;
export declare function halsteadVolumeOf(d: PythonHalsteadDetail): number;
export declare function halsteadDifficultyOf(d: PythonHalsteadDetail): number;
//# sourceMappingURL=operations.halstead.d.ts.map