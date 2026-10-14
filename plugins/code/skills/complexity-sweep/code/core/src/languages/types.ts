// Contract shared by the tree-sitter language backends (Python, Rust).
//
// TypeScript/JavaScript keep the ts-morph path (`MetricDefinition.compute`).
// Every other language is parsed with web-tree-sitter and analyzed through a
// `LanguageBackend`, which supplies function extraction and one
// `SyntaxMetricCompute` per built-in metric key.
//
// web-tree-sitter gotcha: every node access returns a NEW JS object, so
// `a === b` is false for the same node. Compare nodes with `sameNode` from
// `./syntaxHelpers` (`a.id === b.id`), and cache per node with
// `createNodeCache` (keyed on the Tree object, then on `node.id`).

import type { Node as SyntaxNode, Tree } from "web-tree-sitter";

import type { AnalysisOptions, MetricKey, MetricResult } from "../registry";

export type { SyntaxNode, Tree };

/** Languages parsed with tree-sitter. */
export type SyntaxLanguageId = "python" | "rust";

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

export type SyntaxMetricCompute<TDetail = unknown> = (
  ctx: SyntaxMetricContext,
) => number | MetricResult<TDetail>;

export interface LanguageBackend {
  id: SyntaxLanguageId;
  /** Lower-case file extensions with the leading dot, for example ".py". */
  extensions: readonly string[];
  extractFunctions(file: SyntaxSourceFile): SyntaxFunction[];
  /** One compute per built-in metric key. */
  metrics: Partial<Record<MetricKey, SyntaxMetricCompute>>;
}
