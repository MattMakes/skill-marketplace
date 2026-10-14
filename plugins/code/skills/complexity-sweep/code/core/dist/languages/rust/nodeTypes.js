"use strict";
// Rust unit boundaries. Shared by every Rust metric module.
//
// A nested `fn` item (also inside a nested `impl` or `mod`) is its own unit. `closure_expression` is NOT a boundary: it stays part of the enclosing unit.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUST_FUNCTION_TYPE = void 0;
exports.isRustFunction = isRustFunction;
exports.RUST_FUNCTION_TYPE = "function_item";
/** True for a node that starts its own analysis unit. */
function isRustFunction(node) {
    return node.type === exports.RUST_FUNCTION_TYPE;
}
//# sourceMappingURL=nodeTypes.js.map