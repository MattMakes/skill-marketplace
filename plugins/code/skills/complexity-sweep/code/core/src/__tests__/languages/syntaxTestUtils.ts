// Test helpers for the Python, Rust and GDScript backends. Contract file.
//
// Call `await initSyntaxParsers()` in `beforeAll` before any helper here.
// Trees are not deleted: a test process is short-lived.

import type { AnalysisOptions } from "../../registry";
import { isGdscriptFunction } from "../../languages/gdscript/nodeTypes";
import { walkDescendants } from "../../languages/syntaxHelpers";
import { parseSyntaxSource } from "../../languages/treeSitter";
import type {
  SyntaxLanguageId,
  SyntaxMetricContext,
  SyntaxNode,
  SyntaxSourceFile,
} from "../../languages/types";

export { initSyntaxParsers } from "../../languages/treeSitter";

// A GDScript unit is 1 of 4 node types (see languages/gdscript/nodeTypes.ts).
const IS_FUNCTION: Record<SyntaxLanguageId, (node: SyntaxNode) => boolean> = {
  python: (node) => node.type === "function_definition",
  rust: (node) => node.type === "function_item",
  gdscript: isGdscriptFunction,
};

const FIXTURE_PATH: Record<SyntaxLanguageId, string> = {
  python: "test.py",
  rust: "test.rs",
  gdscript: "test.gd",
};

export function parseFixture(
  language: SyntaxLanguageId,
  text: string,
  filePath = FIXTURE_PATH[language],
): SyntaxSourceFile {
  return parseSyntaxSource({ language, filePath, text });
}

/** Every function node in the file, in pre-order (outer before nested). */
export function functionNodes(file: SyntaxSourceFile): SyntaxNode[] {
  const found: SyntaxNode[] = [];
  walkDescendants(file.tree.rootNode, (node) => {
    if (IS_FUNCTION[file.language](node)) found.push(node);
  });
  return found;
}

/**
 * Metric context for the `index`-th function node (pre-order) in `text`.
 * Does not depend on a backend's extractFunctions, so every unit can use it.
 */
export function syntaxCtx(
  language: SyntaxLanguageId,
  text: string,
  index = 0,
  options: AnalysisOptions = {},
  dependencyValues: Record<string, number> = {},
): SyntaxMetricContext {
  const file = parseFixture(language, text);
  const nodes = functionNodes(file);
  const node = nodes[index];
  if (node === undefined) {
    throw new Error(`Function node #${index} not found; the file has ${nodes.length}.`);
  }
  return { language, node, file, options, dependencyValues };
}
