// Test helpers for the Python and Rust backends. Contract file.
//
// Call `await initSyntaxParsers()` in `beforeAll` before any helper here.
// Trees are not deleted: a test process is short-lived.

import type { AnalysisOptions } from "../../registry";
import { walkDescendants } from "../../languages/syntaxHelpers";
import { parseSyntaxSource } from "../../languages/treeSitter";
import type {
  SyntaxLanguageId,
  SyntaxMetricContext,
  SyntaxNode,
  SyntaxSourceFile,
} from "../../languages/types";

export { initSyntaxParsers } from "../../languages/treeSitter";

const FUNCTION_TYPE: Record<SyntaxLanguageId, string> = {
  python: "function_definition",
  rust: "function_item",
};

export function parseFixture(
  language: SyntaxLanguageId,
  text: string,
  filePath = language === "python" ? "test.py" : "test.rs",
): SyntaxSourceFile {
  return parseSyntaxSource({ language, filePath, text });
}

/** Every function node in the file, in pre-order (outer before nested). */
export function functionNodes(file: SyntaxSourceFile): SyntaxNode[] {
  const found: SyntaxNode[] = [];
  walkDescendants(file.tree.rootNode, (node) => {
    if (node.type === FUNCTION_TYPE[file.language]) found.push(node);
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
