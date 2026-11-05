import type { CyclomaticWeights } from "../../registry";
import type { SyntaxMetricCompute, SyntaxNode } from "../types";
export declare function computeGdscriptCyclomaticComplexity(node: SyntaxNode, weights?: CyclomaticWeights): number;
export declare function computeGdscriptEssentialComplexity(node: SyntaxNode): number;
export declare function computeGdscriptModuleDesignComplexity(node: SyntaxNode): number;
export declare const gdscriptCyclomaticComplexity: SyntaxMetricCompute;
export declare const gdscriptEssentialComplexity: SyntaxMetricCompute;
export declare const gdscriptModuleDesignComplexity: SyntaxMetricCompute;
//# sourceMappingURL=controlFlow.d.ts.map