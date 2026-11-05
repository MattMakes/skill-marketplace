"use strict";
// Python data-flow metrics: globalDataComplexity (design 5.4),
// specifiedDataComplexity (5.5), peakLiveVariables and variableSpan (5.6).
//
// The def-use analysis and the name-resolution rules are in
// `dataFlow.defUse.ts`. PLV and VSpan use the TypeScript formulas without change.
//
// Choices where the design is silent:
// - globalDataComplexity: an assignment inside a module-level compound
//   statement (`if`, `try`, `with`, `for`, `while`, `match`) binds a module-scope
//   name, at any depth. A function or class body does not. Each such statement
//   counts toward the "2 or more top-level statements" rule.
// - globalDataComplexity: an annotation without a value (`X: int`) does not
//   bind, so it does not count toward the "2 or more top-level statements" rule.
// - globalDataComplexity: `a, b = [], 1` pairs targets with values by position;
//   when the shapes do not pair, no target is mutable by its value.
// - globalDataComplexity: a factory call through an attribute
//   (`collections.deque()`) counts like the bare call (`deque()`).
// - specifiedDataComplexity: the attribute part of `obj.name` and keyword-argument
//   names in a condition do not count, the same occurrence rule as 5.4 and 5.6.
//   (The TypeScript metric matches every identifier text.)
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonVariableSpan = exports.pythonPeakLiveVariables = exports.pythonSpecifiedDataComplexity = exports.pythonGlobalDataComplexity = exports.buildPythonDefUse = void 0;
const syntaxHelpers_1 = require("../syntaxHelpers");
const dataFlow_defUse_1 = require("./dataFlow.defUse");
const nodeTypes_1 = require("./nodeTypes");
var dataFlow_defUse_2 = require("./dataFlow.defUse");
Object.defineProperty(exports, "buildPythonDefUse", { enumerable: true, get: function () { return dataFlow_defUse_2.buildPythonDefUse; } });
// ---------------------------------------------------------------------------
// globalDataComplexity (5.4)
// ---------------------------------------------------------------------------
const MUTABLE_VALUE_TYPES = new Set([
    "list",
    "dictionary",
    "set",
    "list_comprehension",
    "dictionary_comprehension",
    "set_comprehension",
]);
const MUTABLE_FACTORY_NAMES = new Set([
    "list",
    "dict",
    "set",
    "defaultdict",
    "deque",
    "OrderedDict",
    "Counter",
    "bytearray",
]);
const PATTERN_TARGET_TYPES = new Set(["pattern_list", "tuple_pattern", "list_pattern", "tuple", "list"]);
const SEQUENCE_VALUE_TYPES = new Set(["expression_list", "tuple", "list"]);
const SPLAT_TYPES = new Set(["list_splat_pattern", "list_splat"]);
const moduleGlobalsCache = (0, syntaxHelpers_1.createNodeCache)();
const pythonGlobalDataComplexity = (ctx) => {
    const mutableGlobals = mutableModuleNames(ctx.file.tree.rootNode);
    if (mutableGlobals.size === 0)
        return 0;
    const scope = (0, dataFlow_defUse_1.pythonScope)(ctx.node);
    const ownName = ctx.node.childForFieldName("name");
    const referenced = new Set();
    (0, syntaxHelpers_1.walkDescendants)(ctx.node, (node) => {
        if ((0, nodeTypes_1.isPythonFunction)(node))
            return false;
        if (!(0, dataFlow_defUse_1.isNameOccurrence)(node) || (0, syntaxHelpers_1.sameNode)(node, ownName))
            return;
        const name = node.text;
        if (!mutableGlobals.has(name))
            return;
        if (scope.localNames.has(name) || scope.declaredNonlocal.has(name))
            return;
        referenced.add(name);
    });
    return referenced.size;
};
exports.pythonGlobalDataComplexity = pythonGlobalDataComplexity;
/** Mutable module-scope names of a Python module. Cached per module node. */
function mutableModuleNames(module) {
    const cached = moduleGlobalsCache.get(module);
    if (cached !== undefined)
        return cached;
    const statementCounts = new Map();
    const mutableByValue = new Set();
    // Module scope includes the statements inside a module-level `if`, `try`,
    // `with`, `for`, `while` or `match` at any depth, but not a function or class body.
    (0, syntaxHelpers_1.walkDescendants)(module, (node) => {
        if ((0, nodeTypes_1.isPythonFunction)(node) || node.type === "class_definition")
            return false;
        if (node.type !== "expression_statement")
            return;
        for (const expr of node.namedChildren) {
            const names = topLevelBinding(expr, mutableByValue);
            for (const name of names)
                statementCounts.set(name, (statementCounts.get(name) ?? 0) + 1);
        }
        return false;
    });
    const declaredGlobal = globalStatementNames(module);
    const result = new Set();
    for (const [name, count] of statementCounts) {
        if (count >= 2 || mutableByValue.has(name) || declaredGlobal.has(name))
            result.add(name);
    }
    moduleGlobalsCache.set(module, result);
    return result;
}
/**
 * The distinct names that one top-level `assignment` or `augmented_assignment`
 * binds. Adds to `mutableByValue` each name bound to a mutable value.
 */
function topLevelBinding(expr, mutableByValue) {
    const names = new Set();
    if (expr.type === "augmented_assignment") {
        const left = expr.childForFieldName("left");
        if (left?.type === "identifier")
            names.add(left.text);
        return names;
    }
    if (expr.type !== "assignment")
        return names;
    // Chained `a = b = value`: the right side of each link is the next assignment.
    const targets = [];
    let value = expr;
    while (value?.type === "assignment") {
        const left = value.childForFieldName("left");
        if (left !== null)
            targets.push(left);
        value = value.childForFieldName("right");
    }
    if (value === null)
        return names;
    for (const target of targets)
        bindTarget(target, value, names, mutableByValue);
    return names;
}
function bindTarget(target, value, names, mutableByValue) {
    if (target.type === "identifier") {
        names.add(target.text);
        if (value !== null && isMutableValue(value))
            mutableByValue.add(target.text);
        return;
    }
    if (SPLAT_TYPES.has(target.type) || target.type === "parenthesized_expression") {
        for (const child of target.namedChildren)
            bindTarget(child, null, names, mutableByValue);
        return;
    }
    if (!PATTERN_TARGET_TYPES.has(target.type))
        return;
    const parts = target.namedChildren;
    const values = pairedValues(parts, value);
    parts.forEach((part, i) => bindTarget(part, values?.[i] ?? null, names, mutableByValue));
}
/** The value elements that pair 1:1 with `parts`, or null when the shapes differ. */
function pairedValues(parts, value) {
    if (value === null || !SEQUENCE_VALUE_TYPES.has(value.type))
        return null;
    const elements = value.namedChildren;
    if (elements.length !== parts.length)
        return null;
    const hasSplat = [...parts, ...elements].some((n) => SPLAT_TYPES.has(n.type));
    return hasSplat ? null : elements;
}
function isMutableValue(value) {
    if (MUTABLE_VALUE_TYPES.has(value.type))
        return true;
    if (value.type !== "call")
        return false;
    const callee = value.childForFieldName("function");
    if (callee === null)
        return false;
    const name = callee.type === "attribute" ? callee.childForFieldName("attribute") : callee;
    return name?.type === "identifier" && MUTABLE_FACTORY_NAMES.has(name.text);
}
/** Names in every `global` statement of the file. */
function globalStatementNames(module) {
    const names = new Set();
    (0, syntaxHelpers_1.walkDescendants)(module, (node) => {
        if (node.type !== "global_statement")
            return;
        for (const name of node.namedChildren) {
            if (name.type === "identifier")
                names.add(name.text);
        }
        return false;
    });
    return names;
}
// ---------------------------------------------------------------------------
// specifiedDataComplexity (5.5)
// ---------------------------------------------------------------------------
const pythonSpecifiedDataComplexity = (ctx) => {
    const paramNames = new Set((0, dataFlow_defUse_1.unitParameterNodes)(ctx.node).map((p) => p.text));
    if (paramNames.size === 0)
        return 0;
    const influencing = new Set();
    (0, syntaxHelpers_1.walkDescendants)(ctx.node, (node) => {
        if ((0, nodeTypes_1.isPythonFunction)(node))
            return false;
        for (const condition of conditionsOf(node)) {
            collectParameterNames(condition, paramNames, influencing);
        }
    });
    return influencing.size;
};
exports.pythonSpecifiedDataComplexity = pythonSpecifiedDataComplexity;
/** The condition expressions of a branch construct (empty for other nodes). */
function conditionsOf(node) {
    switch (node.type) {
        case "if_statement":
        case "elif_clause":
        case "while_statement": {
            const condition = node.childForFieldName("condition");
            return condition === null ? [] : [condition];
        }
        case "conditional_expression": {
            // `body if condition else alternative`: the condition is the middle operand.
            const condition = node.namedChild(1);
            return condition === null ? [] : [condition];
        }
        case "match_statement":
            return node.childrenForFieldName("subject");
        case "if_clause": {
            // A `case_clause` guard and a comprehension `if` are both `if_clause`.
            const condition = node.firstNamedChild;
            return condition === null ? [] : [condition];
        }
        default:
            return [];
    }
}
function collectParameterNames(condition, paramNames, found) {
    const check = (node) => {
        if ((0, dataFlow_defUse_1.isNameOccurrence)(node) && paramNames.has(node.text))
            found.add(node.text);
    };
    check(condition);
    (0, syntaxHelpers_1.walkDescendants)(condition, check);
}
// ---------------------------------------------------------------------------
// peakLiveVariables and variableSpan (5.6)
// ---------------------------------------------------------------------------
const pythonPeakLiveVariables = (ctx) => {
    const entries = (0, dataFlow_defUse_1.buildPythonDefUse)(ctx.node);
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
exports.pythonPeakLiveVariables = pythonPeakLiveVariables;
const pythonVariableSpan = (ctx) => {
    let maxSpan = 0;
    for (const entry of (0, dataFlow_defUse_1.buildPythonDefUse)(ctx.node)) {
        const span = entry.lastUseLine - entry.defLine;
        if (span > maxSpan)
            maxSpan = span;
    }
    return maxSpan;
};
exports.pythonVariableSpan = pythonVariableSpan;
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