import type { CyclomaticWeights } from "../../registry";
import type { SyntaxMetricCompute, SyntaxNode } from "../types";
export declare function computePythonCyclomaticComplexity(node: SyntaxNode, weights?: CyclomaticWeights): number;
export declare function computePythonEssentialComplexity(node: SyntaxNode): number;
export declare function computePythonModuleDesignComplexity(node: SyntaxNode): number;
export declare const pythonCyclomaticComplexity: SyntaxMetricCompute;
export declare const pythonEssentialComplexity: SyntaxMetricCompute;
export declare const pythonModuleDesignComplexity: SyntaxMetricCompute;
//# sourceMappingURL=controlFlow.d.ts.map