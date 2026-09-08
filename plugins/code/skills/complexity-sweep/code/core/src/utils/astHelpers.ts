import {
  type ArrowFunction,
  type FunctionDeclaration,
  type FunctionExpression,
  type MethodDeclaration,
  type Node,
  type SourceFile,
  SyntaxKind,
} from "ts-morph";

import type { FunctionLike } from "../types";

/**
 * Canonical unit-of-analysis shape emitted by `extractFunctions` and consumed
 * by every metric (and by `buildDefUseMap` in tests).
 */
export interface ExtractedFunction {
  name: string;
  node: FunctionLike;
  line: number;
}

const ANONYMOUS = "<anonymous>";

/**
 * Walks a SourceFile and returns an entry for every function-like node:
 * FunctionDeclaration, MethodDeclaration, ArrowFunction, FunctionExpression.
 *
 * Traversal is a full recursive descent (no skip), so nested functions are
 * emitted as their own entries in source order. Class `constructor` methods
 * are NOT emitted — `MethodDeclaration` covers named methods only; ts-morph
 * classifies constructors as a distinct `ConstructorDeclaration` kind.
 */
export function extractFunctions(sourceFile: SourceFile): ExtractedFunction[] {
  const results: ExtractedFunction[] = [];

  sourceFile.forEachDescendant((node) => {
    const extracted = toExtractedFunction(node);
    if (extracted) results.push(extracted);
  });

  return results;
}

function toExtractedFunction(node: Node): ExtractedFunction | undefined {
  if (node.isKind(SyntaxKind.FunctionDeclaration)) {
    return {
      name: node.getName() ?? ANONYMOUS,
      node,
      line: node.getStartLineNumber(),
    };
  }
  if (node.isKind(SyntaxKind.MethodDeclaration)) {
    return {
      name: node.getName(),
      node,
      line: node.getStartLineNumber(),
    };
  }
  if (node.isKind(SyntaxKind.ArrowFunction)) {
    return {
      name: getAssignedName(node) ?? ANONYMOUS,
      node,
      line: node.getStartLineNumber(),
    };
  }
  if (node.isKind(SyntaxKind.FunctionExpression)) {
    return {
      name: getAssignedName(node) ?? node.getName() ?? ANONYMOUS,
      node,
      line: node.getStartLineNumber(),
    };
  }
  return undefined;
}

/**
 * Looks at the parent of an anonymous function expression to derive a name:
 * - `const foo = () => ...` → "foo"
 * - `{ foo: () => ... }` → "foo"
 * Intentionally shallow: does not unwrap parenthesized/as-expressions.
 */
function getAssignedName(
  node: ArrowFunction | FunctionExpression,
): string | undefined {
  const parent = node.getParent();
  if (parent?.isKind(SyntaxKind.VariableDeclaration)) {
    return parent.getName();
  }
  if (parent?.isKind(SyntaxKind.PropertyAssignment)) {
    return parent.getName();
  }
  return undefined;
}

// Re-export the concrete union for callers that want to narrow results.
export type { ArrowFunction, FunctionDeclaration, FunctionExpression, MethodDeclaration };
