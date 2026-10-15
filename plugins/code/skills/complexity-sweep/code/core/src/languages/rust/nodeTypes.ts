// Rust unit boundaries. Shared by every Rust metric module.
//
// A nested `fn` item (also inside a nested `impl` or `mod`) is its own unit. `closure_expression` is NOT a boundary: it stays part of the enclosing unit.

import type { SyntaxNode } from "../types";

export const RUST_FUNCTION_TYPE = "function_item";

/** True for a node that starts its own analysis unit. */
export function isRustFunction(node: SyntaxNode): boolean {
  return node.type === RUST_FUNCTION_TYPE;
}
