import type { AnalysisOptions } from "../../registry";
import type { SyntaxLanguageId, SyntaxMetricContext, SyntaxNode, SyntaxSourceFile } from "../../languages/types";
export { initSyntaxParsers } from "../../languages/treeSitter";
export declare function parseFixture(language: SyntaxLanguageId, text: string, filePath?: string): SyntaxSourceFile;
/** Every function node in the file, in pre-order (outer before nested). */
export declare function functionNodes(file: SyntaxSourceFile): SyntaxNode[];
/**
 * Metric context for the `index`-th function node (pre-order) in `text`.
 * Does not depend on a backend's extractFunctions, so every unit can use it.
 */
export declare function syntaxCtx(language: SyntaxLanguageId, text: string, index?: number, options?: AnalysisOptions, dependencyValues?: Record<string, number>): SyntaxMetricContext;
//# sourceMappingURL=syntaxTestUtils.d.ts.map