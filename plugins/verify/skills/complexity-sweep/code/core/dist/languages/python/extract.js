"use strict";
// Python unit extraction. Every `function_definition` is a unit: `def`, `async def`,
// methods, nested functions. A decorated function sits inside `decorated_definition`;
// the unit node stays the `function_definition`.
//
// Name: names of the enclosing `class_definition` and `function_definition` nodes,
// outer first, then the function name, joined with `.` (`Order.total.helper`).
// Order: pre-order (source order; outer before nested).
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPythonFunctions = extractPythonFunctions;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const CLASS_TYPE = "class_definition";
function declaredName(node) {
    return node.childForFieldName("name")?.text ?? "";
}
function qualifiedName(fn) {
    const parts = [declaredName(fn)];
    let current = fn.parent;
    while (current !== null) {
        if (current.type === CLASS_TYPE || (0, nodeTypes_1.isPythonFunction)(current)) {
            parts.push(declaredName(current));
        }
        current = current.parent;
    }
    return parts.reverse().join(".");
}
function extractPythonFunctions(file) {
    const functions = [];
    (0, syntaxHelpers_1.walkDescendants)(file.tree.rootNode, (node) => {
        if ((0, nodeTypes_1.isPythonFunction)(node)) {
            functions.push({ name: qualifiedName(node), line: (0, syntaxHelpers_1.lineOf)(node), node });
        }
    });
    return functions;
}
//# sourceMappingURL=extract.js.map