import type { SyntaxMetricCompute, SyntaxNode } from "../types";
import { type PythonHalsteadDetail } from "./operations.halstead";
export interface PythonAbcCounts {
    a: number;
    b: number;
    c: number;
}
/**
 * Raw ABC counts for a Python function node. 1 walk; nested units are skipped.
 *
 * Port note: as in TypeScript, loop targets (`for x in`), `with ... as`
 * targets, `import` and `global` add nothing to A.
 */
export declare function computePythonAbcCounts(fn: SyntaxNode): PythonAbcCounts;
export declare const pythonAbcScore: SyntaxMetricCompute<PythonAbcCounts>;
export declare const pythonScopeDepthWeightedLoc: SyntaxMetricCompute;
export declare const pythonScopeDepthRatio: SyntaxMetricCompute;
export declare const pythonHalsteadVolume: SyntaxMetricCompute<PythonHalsteadDetail>;
export declare const pythonHalsteadDifficulty: SyntaxMetricCompute<PythonHalsteadDetail>;
export declare const pythonHalsteadEffort: SyntaxMetricCompute<PythonHalsteadDetail>;
/**
 * MI = max(0, (171 - 5.2 ln V - 0.23 CC - 16.2 ln LOC) * 100 / 171).
 * Same fallbacks and guard as the TypeScript metric: V defaults to 0, CC to
 * 1, and V <= 0 or LOC <= 0 gives 100.
 */
export declare const pythonMaintainabilityIndex: SyntaxMetricCompute;
//# sourceMappingURL=operations.d.ts.map