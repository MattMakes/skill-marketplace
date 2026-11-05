// GDScript unit extraction (design section 9.2). A unit is a `function_definition`
// with a body, the script-level `constructor_definition`, a `set_body` or a `get_body`.
//
// Name: enclosing `class_definition` names, outer first, then the unit name, joined
// with `.`. `class_name` adds nothing. A `constructor_definition` is `_init`.
// An accessor is `<var>.set` or `<var>.get`, where `<var>` is the name of the
// `variable_statement` that holds it (`Inner.hp.get`).
// Order: pre-order (source order; outer before nested).

import { lineOf, walkDescendants } from "../syntaxHelpers";
import type { SyntaxFunction, SyntaxNode, SyntaxSourceFile } from "../types";
import { isGdscriptFunction } from "./nodeTypes";

const CLASS_TYPE = "class_definition";

function declaredName(node: SyntaxNode): string {
  return node.childForFieldName("name")?.text ?? "";
}

/** The variable that holds a `set_body` or `get_body`, or null. */
function accessorOwner(node: SyntaxNode): SyntaxNode | null {
  let current = node.parent;
  while (current !== null) {
    if (current.type === "variable_statement") return current;
    current = current.parent;
  }
  return null;
}

function unitName(unit: SyntaxNode): string {
  switch (unit.type) {
    case "constructor_definition":
      return "_init";
    case "set_body":
    case "get_body": {
      const suffix = unit.type === "set_body" ? "set" : "get";
      const owner = accessorOwner(unit);
      return `${owner === null ? "" : declaredName(owner)}.${suffix}`;
    }
    default:
      return declaredName(unit);
  }
}

function qualifiedName(unit: SyntaxNode): string {
  const parts: string[] = [unitName(unit)];
  let current = unit.parent;
  while (current !== null) {
    if (current.type === CLASS_TYPE) parts.push(declaredName(current));
    current = current.parent;
  }
  return parts.reverse().join(".");
}

export function extractGdscriptFunctions(file: SyntaxSourceFile): SyntaxFunction[] {
  const functions: SyntaxFunction[] = [];
  walkDescendants(file.tree.rootNode, (node) => {
    if (isGdscriptFunction(node)) {
      functions.push({ name: qualifiedName(node), line: lineOf(node), node });
    }
  });
  return functions;
}
