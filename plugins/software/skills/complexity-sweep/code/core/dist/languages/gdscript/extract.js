"use strict";
// GDScript unit extraction (design section 9.2). A unit is a `function_definition`
// with a body, the script-level `constructor_definition`, a `set_body` or a `get_body`.
//
// Name: enclosing `class_definition` names, outer first, then the unit name, joined
// with `.`. `class_name` adds nothing. A `constructor_definition` is `_init`.
// An accessor is `<var>.set` or `<var>.get`, where `<var>` is the name of the
// `variable_statement` that holds it (`Inner.hp.get`).
// Order: pre-order (source order; outer before nested).
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractGdscriptFunctions = extractGdscriptFunctions;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const CLASS_TYPE = "class_definition";
function declaredName(node) {
    return node.childForFieldName("name")?.text ?? "";
}
/** The variable that holds a `set_body` or `get_body`, or null. */
function accessorOwner(node) {
    let current = node.parent;
    while (current !== null) {
        if (current.type === "variable_statement")
            return current;
        current = current.parent;
    }
    return null;
}
function unitName(unit) {
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
function qualifiedName(unit) {
    const parts = [unitName(unit)];
    let current = unit.parent;
    while (current !== null) {
        if (current.type === CLASS_TYPE)
            parts.push(declaredName(current));
        current = current.parent;
    }
    return parts.reverse().join(".");
}
function extractGdscriptFunctions(file) {
    const functions = [];
    (0, syntaxHelpers_1.walkDescendants)(file.tree.rootNode, (node) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node)) {
            functions.push({ name: qualifiedName(node), line: (0, syntaxHelpers_1.lineOf)(node), node });
        }
    });
    return functions;
}
//# sourceMappingURL=extract.js.map