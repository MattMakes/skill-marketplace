import type { SyntaxMetricCompute, SyntaxNode } from "../types";
export interface RustDefUseEntry {
    name: string;
    defLine: number;
    lastUseLine: number;
}
/** Build Rust binding ranges in declaration order. */
export declare function buildRustDefUse(node: SyntaxNode): RustDefUseEntry[];
export declare const rustPeakLiveVariables: SyntaxMetricCompute;
export declare const rustVariableSpan: SyntaxMetricCompute;
export declare const rustSpecifiedDataComplexity: SyntaxMetricCompute;
export declare const rustGlobalDataComplexity: SyntaxMetricCompute;
//# sourceMappingURL=dataFlow.d.ts.map