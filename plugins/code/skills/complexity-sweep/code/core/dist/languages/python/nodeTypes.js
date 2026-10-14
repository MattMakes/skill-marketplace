"use strict";
// Python unit boundaries. Shared by every Python metric module.
//
// A nested `def` (sync or async) is its own unit. `lambda` is NOT a boundary: it stays part of the enclosing unit.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PYTHON_FUNCTION_TYPE = void 0;
exports.isPythonFunction = isPythonFunction;
exports.PYTHON_FUNCTION_TYPE = "function_definition";
/** True for a node that starts its own analysis unit. */
function isPythonFunction(node) {
    return node.type === exports.PYTHON_FUNCTION_TYPE;
}
//# sourceMappingURL=nodeTypes.js.map