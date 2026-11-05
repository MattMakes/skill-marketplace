"use strict";
// GDScript implementations of the 4 data-flow metrics (design 5.4 to 5.6 and
// 9.3, 9.4). The def-use analysis is in dataFlow.defUse.ts. Tree-sitter nodes
// are compared by id through the shared helpers because each access creates
// a new JavaScript wrapper.
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdscriptVariableSpan = exports.gdscriptPeakLiveVariables = exports.gdscriptSpecifiedDataComplexity = exports.gdscriptGlobalDataComplexity = exports.buildGdscriptDefUse = void 0;
const syntaxHelpers_1 = require("../syntaxHelpers");
const dataFlow_defUse_1 = require("./dataFlow.defUse");
const nodeTypes_1 = require("./nodeTypes");
var dataFlow_defUse_2 = require("./dataFlow.defUse");
Object.defineProperty(exports, "buildGdscriptDefUse", { enumerable: true, get: function () { return dataFlow_defUse_2.buildGdscriptDefUse; } });
// Statement and expression nodes whose `condition:` field is a branch condition.
const CONDITION_FIELD_TYPES = new Set([
    "if_statement",
    "elif_clause",
    "while_statement",
    "conditional_expression",
]);
// Containers that hold script-scope declarations. A `class_body` belongs to
// an inner `class`.
const SCRIPT_SCOPE_TYPES = new Set(["source", "class_body"]);
// Member declarations whose `name` field names a member of the scope. An
// `enum` also declares its enumerators; a `func` and a `signal` name a member
// that is never a `static var`.
const NAMED_MEMBER_TYPES = new Set([
    "variable_statement",
    "const_statement",
    "function_definition",
    "signal_statement",
    "enum_definition",
    "class_definition",
]);
// ---------------------------------------------------------------------------
// globalDataComplexity (5.4, 9.3)
// ---------------------------------------------------------------------------
const gdscriptGlobalDataComplexity = (ctx) => {
    const scopes = enclosingScopes(ctx.node).map(scopeMembers);
    if (!scopes.some((members) => [...members.values()].some(Boolean)))
        return 0;
    const localNames = new Set((0, dataFlow_defUse_1.buildGdscriptDefUse)(ctx.node).map((entry) => entry.name));
    const referenced = new Set();
    // The whole unit is scanned, so a default parameter value that reads a
    // `static var` counts. Declared names are `name` nodes or local entries.
    (0, dataFlow_defUse_1.forEachOccurrence)(ctx.node, (node) => {
        if (localNames.has(node.text))
            return;
        if (resolvesToStaticVar(node.text, scopes))
            referenced.add(node.text);
    });
    return referenced.size;
};
exports.gdscriptGlobalDataComplexity = gdscriptGlobalDataComplexity;
/** The `source` and each `class_body` that holds the unit, nearest first. */
function enclosingScopes(unit) {
    const scopes = [];
    for (let current = unit.parent; current !== null; current = current.parent) {
        if (SCRIPT_SCOPE_TYPES.has(current.type))
            scopes.push(current);
    }
    return scopes;
}
/**
 * The first scope that declares `name` owns it (9.3, 5.4 "Static scope"). The
 * reference counts only when that member is a `static var`.
 */
function resolvesToStaticVar(name, scopes) {
    for (const members of scopes) {
        const isStaticVar = members.get(name);
        if (isStaticVar !== undefined)
            return isStaticVar;
    }
    return false;
}
const scopeMembersCache = (0, syntaxHelpers_1.createNodeCache)();
/**
 * Member names declared directly in a `source` or `class_body`, each mapped
 * to whether the member is a `static var` (D6). A member `var`, a `const`, an
 * `enum`, a `func`, a `signal` and an inner `class` are never mutable global
 * data, but they still own their name. Accessor bodies inside a
 * `variable_statement` are units; nothing else there declares a member.
 */
function scopeMembers(scope) {
    const cached = scopeMembersCache.get(scope);
    if (cached !== undefined)
        return cached;
    const members = new Map();
    const declare = (name, isStaticVar) => {
        if (!members.has(name))
            members.set(name, isStaticVar);
    };
    for (const member of scope.namedChildren) {
        if (member === null || !NAMED_MEMBER_TYPES.has(member.type))
            continue;
        const name = member.childForFieldName("name");
        if (name !== null) {
            const isStaticVar = member.type === "variable_statement" && member.childForFieldName("static") !== null;
            declare(name.text, isStaticVar);
        }
        if (member.type === "enum_definition") {
            (0, syntaxHelpers_1.walkDescendants)(member, (node) => {
                if (node.type !== "enumerator")
                    return;
                const left = node.childForFieldName("left");
                if (left !== null)
                    declare(left.text, false);
            });
        }
    }
    scopeMembersCache.set(scope, members);
    return members;
}
// ---------------------------------------------------------------------------
// specifiedDataComplexity (5.5, 9.3)
// ---------------------------------------------------------------------------
const gdscriptSpecifiedDataComplexity = (ctx) => {
    const parameterNames = new Set((0, dataFlow_defUse_1.unitParameterNames)(ctx.node).map((name) => name.text));
    if (parameterNames.size === 0)
        return 0;
    const influencing = new Set();
    // Lambdas are part of the unit (D1), so their conditions count. A name is
    // matched by text, as in TypeScript: a lambda parameter with the same name
    // as a unit parameter is not told apart.
    (0, syntaxHelpers_1.walkDescendants)(ctx.node, (node) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node))
            return false;
        const condition = conditionOf(node);
        if (condition === null)
            return;
        (0, dataFlow_defUse_1.forEachOccurrence)(condition, (identifier) => {
            if (parameterNames.has(identifier.text))
                influencing.add(identifier.text);
        });
    });
    return influencing.size;
};
exports.gdscriptSpecifiedDataComplexity = gdscriptSpecifiedDataComplexity;
/** The branch condition of `node`, or null when `node` is not a branch. */
function conditionOf(node) {
    if (CONDITION_FIELD_TYPES.has(node.type)) {
        return node.childForFieldName("condition");
    }
    if (node.type === "match_statement")
        return node.childForFieldName("value");
    // `when <expression>`: the whole guard is the condition.
    if (node.type === "pattern_guard")
        return node;
    return null;
}
// ---------------------------------------------------------------------------
// peakLiveVariables and variableSpan (5.6, 9.4)
// ---------------------------------------------------------------------------
const gdscriptPeakLiveVariables = (ctx) => {
    const entries = (0, dataFlow_defUse_1.buildGdscriptDefUse)(ctx.node);
    if (entries.length === 0)
        return 0;
    const { minLine, maxLine } = spanBounds(entries);
    let peak = 0;
    for (let line = minLine; line <= maxLine; line++) {
        let count = 0;
        for (const entry of entries) {
            if (entry.defLine <= line && line <= entry.lastUseLine)
                count++;
        }
        if (count > peak)
            peak = count;
    }
    return peak;
};
exports.gdscriptPeakLiveVariables = gdscriptPeakLiveVariables;
const gdscriptVariableSpan = (ctx) => {
    let maximum = 0;
    for (const entry of (0, dataFlow_defUse_1.buildGdscriptDefUse)(ctx.node)) {
        maximum = Math.max(maximum, entry.lastUseLine - entry.defLine);
    }
    return maximum;
};
exports.gdscriptVariableSpan = gdscriptVariableSpan;
function spanBounds(entries) {
    let minLine = Infinity;
    let maxLine = 0;
    for (const entry of entries) {
        if (entry.defLine < minLine)
            minLine = entry.defLine;
        if (entry.lastUseLine > maxLine)
            maxLine = entry.lastUseLine;
    }
    return { minLine, maxLine };
}
//# sourceMappingURL=dataFlow.js.map