// Python unit extraction. Every `function_definition` is a unit: `def`, `async def`,
// methods, nested functions. A decorated function sits inside `decorated_definition`;
// the unit node stays the `function_definition`.
//
// Name: names of the enclosing `class_definition` and `function_definition` nodes,
// outer first, then the function name, joined with `.` (`Order.total.helper`).
// Order: pre-order (source order; outer before nested).

import { lineOf, walkDescendants } from "../syntaxHelpers";
import type { SyntaxFunction, SyntaxNode, SyntaxSourceFile } from "../types";
import { isPythonFunction } from "./nodeTypes";

const CLASS_TYPE = "class_definition";

function declaredName(node: SyntaxNode): string {
  return node.childForFieldName("name")?.text ?? "";
}

function qualifiedName(fn: SyntaxNode): string {
  const parts: string[] = [declaredName(fn)];
  let current = fn.parent;
  while (current !== null) {
    if (current.type === CLASS_TYPE || isPythonFunction(current)) {
      parts.push(declaredName(current));
    }
    current = current.parent;
  }
  return parts.reverse().join(".");
}

export function extractPythonFunctions(file: SyntaxSourceFile): SyntaxFunction[] {
  const functions: SyntaxFunction[] = [];
  walkDescendants(file.tree.rootNode, (node) => {
    if (isPythonFunction(node)) {
      functions.push({ name: qualifiedName(node), line: lineOf(node), node });
    }
  });
  return functions;
}
