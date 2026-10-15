import type { Node as SyntaxNode, Tree } from "web-tree-sitter";
import type { AnalysisOptions, MetricKey, MetricResult } from "../registry";
export type { SyntaxNode, Tree };
/** Languages parsed with tree-sitter. */
export type SyntaxLanguageId = "python" | "rust" | "gdscript";
/** Every language the analyzer reads. "typescript" covers TS and JS files. */
export type LanguageId = "typescript" | SyntaxLanguageId;
/** Unparsed input for one Python or Rust file. */
export interface SyntaxSourceInput {
    language: SyntaxLanguageId;
    filePath: string;
    text: string;
}
/** A parsed Python or Rust file. The tree stays valid until analysis of the file ends. */
export interface SyntaxSourceFile extends SyntaxSourceInput {
    tree: Tree;
}
/** One analyzable function in a Python or Rust file. */
export interface SyntaxFunction {
    /** Qualified display name, for example `Order.total` or `Order::total`. */
    name: string;
    /** 1-based line of the `def` / `fn` node start (decorators and attributes excluded). */
    line: number;
    /** `function_definition` (Python) or `function_item` (Rust). */
    node: SyntaxNode;
}
export interface SyntaxMetricContext {
    language: SyntaxLanguageId;
    /** The function node of the unit under analysis. */
    node: SyntaxNode;
    file: SyntaxSourceFile;
    options: AnalysisOptions;
    /** Values of metrics that ran earlier in registry execution order. */
    dependencyValues: Record<string, number>;
}
export type SyntaxMetricCompute<TDetail = unknown> = (ctx: SyntaxMetricContext) => number | MetricResult<TDetail>;
export interface LanguageBackend {
    id: SyntaxLanguageId;
    /** Lower-case file extensions with the leading dot, for example ".py". */
    extensions: readonly string[];
    extractFunctions(file: SyntaxSourceFile): SyntaxFunction[];
    /** One compute per built-in metric key. */
    metrics: Partial<Record<MetricKey, SyntaxMetricCompute>>;
}
//# sourceMappingURL=types.d.ts.map