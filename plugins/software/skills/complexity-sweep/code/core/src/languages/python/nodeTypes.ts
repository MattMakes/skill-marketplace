// Python unit boundaries. Shared by every Python metric module.
//
// A nested `def` (sync or async) is its own unit. `lambda` is NOT a boundary: it stays part of the enclosing unit.

import type { SyntaxNode } from "../types";

export const PYTHON_FUNCTION_TYPE = "function_definition";

/** True for a node that starts its own analysis unit. */
export function isPythonFunction(node: SyntaxNode): boolean {
  return node.type === PYTHON_FUNCTION_TYPE;
}
