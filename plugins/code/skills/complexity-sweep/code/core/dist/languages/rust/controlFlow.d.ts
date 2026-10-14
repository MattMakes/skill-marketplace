import type { CyclomaticWeights } from "../../registry";
import type { SyntaxNode } from "../types";
import type { SyntaxMetricCompute } from "../types";
export declare function computeRustCyclomaticComplexity(node: SyntaxNode, weights?: CyclomaticWeights): number;
export declare const rustCyclomaticComplexity: SyntaxMetricCompute;
export declare function computeRustEssentialComplexity(node: SyntaxNode): number;
export declare const rustEssentialComplexity: SyntaxMetricCompute;
export declare function computeRustModuleDesignComplexity(node: SyntaxNode): number;
export declare const rustModuleDesignComplexity: SyntaxMetricCompute;
//# sourceMappingURL=controlFlow.d.ts.map