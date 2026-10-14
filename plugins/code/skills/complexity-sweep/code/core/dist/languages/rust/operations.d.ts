import type { SyntaxMetricCompute } from "../types";
import { type RustHalsteadDetail } from "./operations.halstead";
interface AbcDetail {
    a: number;
    b: number;
    c: number;
}
export declare const rustAbcScore: SyntaxMetricCompute<AbcDetail>;
export declare const rustScopeDepthWeightedLoc: SyntaxMetricCompute;
export declare const rustScopeDepthRatio: SyntaxMetricCompute;
export declare const rustHalsteadVolume: SyntaxMetricCompute<RustHalsteadDetail>;
export declare const rustHalsteadDifficulty: SyntaxMetricCompute<RustHalsteadDetail>;
export declare const rustHalsteadEffort: SyntaxMetricCompute<RustHalsteadDetail>;
export declare const rustMaintainabilityIndex: SyntaxMetricCompute;
export {};
//# sourceMappingURL=operations.d.ts.map