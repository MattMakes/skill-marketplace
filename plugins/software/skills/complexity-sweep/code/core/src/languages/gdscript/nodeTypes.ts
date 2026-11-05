// GDScript unit boundaries. Shared by every GDScript metric module.
//
// Units: a `func` with a body (`function_definition` with a `body` field; an
// `@abstract func` has none), the script-level `_init` (`constructor_definition`),
// and a property setter or getter body (`set_body`, `get_body`). An inner-class
// `_init` is a `function_definition`. A `lambda` is NOT a boundary: it stays part
// of the enclosing unit (design decision 6).

import type { SyntaxNode } from "../types";

export const GDSCRIPT_UNIT_TYPES: readonly string[] = [
  "function_definition",
  "constructor_definition",
  "set_body",
  "get_body",
];

/** True for a node that starts its own analysis unit. */
export function isGdscriptFunction(node: SyntaxNode): boolean {
  if (node.type === "function_definition") {
    return node.childForFieldName("body") !== null;
  }
  return GDSCRIPT_UNIT_TYPES.includes(node.type);
}
