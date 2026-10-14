"use strict";
// Rust function extraction and qualified display names.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRustFunctions = extractRustFunctions;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const COMMENT_TYPES = new Set(["line_comment", "block_comment"]);
function extractRustFunctions(file) {
    const functions = [];
    (0, syntaxHelpers_1.walkDescendants)(file.tree.rootNode, (node) => {
        if (node.type === "mod_item" && isCfgTestItem(node))
            return false;
        if (!(0, nodeTypes_1.isRustFunction)(node))
            return;
        if (hasTestAttribute(node))
            return false;
        functions.push({
            name: qualifiedName(node),
            line: (0, syntaxHelpers_1.lineOf)(node),
            node,
        });
    });
    return functions;
}
function qualifiedName(node) {
    const parts = [];
    let current = node.parent;
    while (current !== null) {
        const part = enclosingName(current);
        if (part !== undefined)
            parts.unshift(part);
        current = current.parent;
    }
    parts.push(node.childForFieldName("name")?.text ?? "<anonymous>");
    return parts.join("::");
}
function enclosingName(node) {
    if (node.type === "function_item" || node.type === "trait_item") {
        return node.childForFieldName("name")?.text;
    }
    if (node.type === "mod_item" && node.childForFieldName("body") !== null) {
        return node.childForFieldName("name")?.text;
    }
    if (node.type === "impl_item") {
        const implementedType = node.childForFieldName("type")?.text;
        return implementedType === undefined
            ? undefined
            : removeGenericArguments(implementedType);
    }
    return undefined;
}
function removeGenericArguments(text) {
    let depth = 0;
    let result = "";
    for (const character of text) {
        if (character === "<") {
            depth += 1;
        }
        else if (character === ">") {
            depth = Math.max(0, depth - 1);
        }
        else if (depth === 0) {
            result += character;
        }
    }
    return result.trim();
}
function hasTestAttribute(node) {
    return precedingAttributes(node).some((attribute) => {
        const path = attributePath(attribute);
        return path.split("::").at(-1) === "test";
    });
}
function isCfgTestItem(node) {
    return precedingAttributes(node).some((attribute) => {
        const compact = attribute.text.replace(/\s+/g, "");
        return compact === "#[cfg(test)]";
    });
}
/** Rust permits comments between an outer attribute and its item. */
function precedingAttributes(node) {
    const attributes = [];
    let sibling = node.previousNamedSibling;
    while (sibling !== null) {
        if (sibling.type === "attribute_item") {
            attributes.push(sibling);
        }
        else if (!COMMENT_TYPES.has(sibling.type)) {
            break;
        }
        sibling = sibling.previousNamedSibling;
    }
    return attributes;
}
function attributePath(attribute) {
    const body = attribute.namedChild(0);
    const path = body?.namedChild(0);
    return path?.text ?? "";
}
//# sourceMappingURL=extract.js.map