"use strict";
// GDScript def-use analysis (design 5.6 and 9.4). Shared by peakLiveVariables,
// variableSpan and globalDataComplexity.
//
// GDScript locals have block scope, so this follows the Rust model: 1 entry
// per declaration, and each identifier occurrence resolves to the nearest
// earlier declaration with the same name whose scope holds it. A `lambda` is
// not a unit (D1): its parameters are entries and its body is scanned.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGdscriptDefUse = buildGdscriptDefUse;
exports.unitParameterNames = unitParameterNames;
exports.forEachOccurrence = forEachOccurrence;
exports.containsNode = containsNode;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const PARAMETER_WRAPPER_TYPES = new Set([
    "typed_parameter",
    "default_parameter",
    "typed_default_parameter",
    "variadic_parameter",
]);
const LOCAL_DECLARATION_TYPES = new Set(["variable_statement", "const_statement"]);
// `self` and `super` are identifiers, but they never name a local (9.4).
const NON_VARIABLE_NAMES = new Set(["self", "super"]);
const defUseCache = (0, syntaxHelpers_1.createNodeCache)();
/** Build GDScript binding ranges in declaration order. */
function buildGdscriptDefUse(node) {
    const cached = defUseCache.get(node);
    if (cached !== undefined)
        return cached;
    const infos = [];
    const declarationIds = new Set();
    for (const name of unitParameterNames(node)) {
        addInfo(name, node, null, infos, declarationIds);
    }
    collectLocalDeclarations(node, infos, declarationIds);
    const lastUseLines = infos.map((info) => info.defLine);
    scanOccurrences(node, infos, declarationIds, lastUseLines);
    const entries = infos.map((info, index) => ({
        name: info.name,
        defLine: info.defLine,
        lastUseLine: lastUseLines[index] ?? info.defLine,
    }));
    defUseCache.set(node, entries);
    return entries;
}
/**
 * The `parameters` node of a unit or a lambda. A `function_definition`,
 * `constructor_definition` and `lambda` have a `parameters` field. A `set_body`
 * holds an unnamed `parameters` child. A `get_body` has none.
 */
function parametersOf(node) {
    const field = node.childForFieldName("parameters");
    if (field !== null)
        return field;
    return node.namedChildren.find((child) => child.type === "parameters") ?? null;
}
/** The name `identifier` of each parameter in the unit's `parameters` (5.5). */
function unitParameterNames(node) {
    const parameters = parametersOf(node);
    if (parameters === null)
        return [];
    const names = [];
    for (const parameter of parameters.namedChildren) {
        const name = parameterName(parameter);
        if (name !== null)
            names.push(name);
    }
    return names;
}
// `a`, `a: int`, `a = 1`, `a: int = 1` and `...rest: Array`. The name is the
// first `identifier` child; a `variadic_parameter` wraps 1 of the other forms.
function parameterName(parameter) {
    if (parameter.type === "identifier")
        return parameter;
    if (!PARAMETER_WRAPPER_TYPES.has(parameter.type))
        return null;
    const first = parameter.namedChildren[0];
    if (first === undefined)
        return null;
    return parameterName(first);
}
function collectLocalDeclarations(root, infos, declarationIds) {
    (0, syntaxHelpers_1.walkDescendants)(root, (node) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node))
            return false;
        if (LOCAL_DECLARATION_TYPES.has(node.type)) {
            const name = node.childForFieldName("name");
            if (name === null)
                return;
            const scope = nearestAncestorOfType(node, "body", root) ?? root;
            addInfo(name, scope, node.childForFieldName("value"), infos, declarationIds);
            return;
        }
        if (node.type === "for_statement") {
            const left = node.childForFieldName("left");
            if (left?.type !== "identifier")
                return;
            addInfo(left, node, node.childForFieldName("right"), infos, declarationIds);
            return;
        }
        if (node.type === "pattern_binding") {
            // The scope is the `pattern_section`, so its `pattern_guard` and body
            // resolve to the binding (Rust review F4).
            const section = nearestAncestorOfType(node, "pattern_section", root);
            const name = node.namedChildren.find((child) => child.type === "identifier");
            if (section === null || name === undefined)
                return;
            addInfo(name, section, null, infos, declarationIds);
            return;
        }
        if (node.type === "lambda") {
            for (const name of unitParameterNames(node)) {
                addInfo(name, node, null, infos, declarationIds);
            }
        }
    });
}
function addInfo(nameNode, scopeBoundary, initializer, infos, declarationIds) {
    declarationIds.add(nameNode.id);
    infos.push({
        name: nameNode.text,
        defLine: (0, syntaxHelpers_1.lineOf)(nameNode),
        visibleFrom: nameNode.endIndex,
        scopeBoundary,
        initializer,
    });
}
function scanOccurrences(root, infos, declarationIds, lastUseLines) {
    forEachOccurrence(root, (node) => {
        if (declarationIds.has(node.id))
            return;
        const index = resolveOccurrence(node, infos);
        if (index === -1)
            return;
        const useLine = (0, syntaxHelpers_1.lineOf)(node);
        const previous = lastUseLines[index] ?? useLine;
        if (useLine > previous)
            lastUseLines[index] = useLine;
    });
}
/** Index of the nearest earlier in-scope declaration of `node.text`, or -1. */
function resolveOccurrence(node, infos) {
    for (let index = infos.length - 1; index >= 0; index--) {
        const info = infos[index];
        if (info === undefined || info.name !== node.text)
            continue;
        if (node.startIndex < info.visibleFrom)
            continue;
        if (!containsNode(info.scopeBoundary, node))
            continue;
        if (info.initializer !== null && containsNode(info.initializer, node))
            continue;
        return index;
    }
    return -1;
}
/**
 * Visit each `identifier` in `root` that can name a variable (9.4). Skips
 * nested units, `type` nodes, member names, `self` and `super`. Strings,
 * `string_name`, `node_path` and `get_node` are leaves, so they hold none.
 * Declared parameter, `for` and binding names are still visited: the caller
 * filters them.
 */
function forEachOccurrence(root, visit) {
    const check = (node) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node) && !(0, syntaxHelpers_1.sameNode)(node, root))
            return false;
        if (node.type === "type")
            return false;
        if (node.type !== "identifier")
            return;
        if (NON_VARIABLE_NAMES.has(node.text) || isNonVariableName(node))
            return;
        visit(node);
    };
    if (check(root) === false)
        return;
    (0, syntaxHelpers_1.walkDescendants)(root, check);
}
function isNonVariableName(node) {
    const parent = node.parent;
    if (parent === null)
        return false;
    switch (parent.type) {
        // `a.b.c` is 1 flat `attribute`: every child after the first is a member.
        case "attribute":
            return !(0, syntaxHelpers_1.sameNode)(parent.namedChildren[0] ?? null, node);
        // The method or member name of `a.f(x)` and `a.b[i]`. Arguments sit
        // inside an `arguments` node, so they are not direct children.
        case "attribute_call":
        case "attribute_subscript":
            return true;
        // The name of an annotation (`@warning_ignore(...)`) is not a variable.
        // The design is silent; this matches the Halstead rule that annotations
        // are structural.
        case "annotation":
            return true;
        // A Lua-style key `{key = value}` is a string key, as a TypeScript
        // property-assignment key. A `{key: value}` key is an expression.
        case "pair":
            return ((0, syntaxHelpers_1.sameNode)(parent.childForFieldName("left"), node) &&
                parent.children.some((child) => child.type === "="));
        default:
            return false;
    }
}
function nearestAncestorOfType(node, type, boundary) {
    let current = node.parent;
    while (current !== null && !(0, syntaxHelpers_1.sameNode)(current, boundary)) {
        if (current.type === type)
            return current;
        current = current.parent;
    }
    return null;
}
function containsNode(ancestor, node) {
    let current = node;
    while (current !== null) {
        if ((0, syntaxHelpers_1.sameNode)(current, ancestor))
            return true;
        current = current.parent;
    }
    return false;
}
//# sourceMappingURL=dataFlow.defUse.js.map