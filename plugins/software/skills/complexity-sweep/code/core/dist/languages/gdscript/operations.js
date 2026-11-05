"use strict";
// GDScript operation and information-density metrics (design 9.3 and 9.5):
// abcScore, scopeDepthWeightedLoc, scopeDepthRatio, the 3 Halstead metrics
// and maintainabilityIndex. Each compute ports the TypeScript metric in
// `metrics/`. Nested units are skipped; lambdas stay part of the unit.
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdscriptMaintainabilityIndex = exports.gdscriptHalsteadEffort = exports.gdscriptHalsteadDifficulty = exports.gdscriptHalsteadVolume = exports.gdscriptScopeDepthRatio = exports.gdscriptScopeDepthWeightedLoc = exports.gdscriptAbcScore = void 0;
exports.computeGdscriptAbcCounts = computeGdscriptAbcCounts;
const registry_1 = require("../../registry");
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const operations_halstead_1 = require("./operations.halstead");
const operations_scopeDepth_1 = require("./operations.scopeDepth");
/** Array and Dictionary methods that add 1 to A in addition to the B of the call. */
const MUTATING_METHODS = new Set([
    "append",
    "append_array",
    "assign",
    "clear",
    "erase",
    "fill",
    "insert",
    "merge",
    "pop_at",
    "pop_back",
    "pop_front",
    "push_back",
    "push_front",
    "remove_at",
    "resize",
    "reverse",
    "shuffle",
    "sort",
    "sort_custom",
]);
/** Nodes that add 1 to A each. A declaration counts only with a value. */
const ASSIGNMENT_TYPES = new Set(["assignment", "augmented_assignment"]);
const DECLARATION_TYPES = new Set(["variable_statement", "const_statement"]);
/** Nodes that add 1 to B each. `get_node` is a call (D5). */
const CALL_TYPES = new Set(["call", "attribute_call", "base_call", "get_node"]);
/** Nodes that add 1 to C each. `pattern_section` is handled apart. */
const CONDITION_TYPES = new Set([
    "if_statement",
    "elif_clause",
    "for_statement",
    "while_statement",
    "conditional_expression",
    "pattern_guard",
]);
/** `binary_operator` texts that add 1 to C: logical and comparison operators. */
const CONDITION_OPERATORS = new Set([
    "and",
    "or",
    "&&",
    "||",
    "==",
    "!=",
    "<",
    ">",
    "<=",
    ">=",
    "is",
    "is not",
    "in",
    "not in",
]);
/** Anonymous tokens of a node joined by a space: `not in`, `is not`. */
function operatorText(node) {
    const tokens = [];
    for (const child of node.children) {
        if (child !== null && !child.isNamed)
            tokens.push(child.type);
    }
    return tokens.join(" ");
}
function isMutatingMethodCall(call) {
    const method = call.namedChildren[0];
    return method?.type === "identifier" && MUTATING_METHODS.has(method.text);
}
/**
 * The 5.1 wildcard rule (D3): a guard-free section whose only pattern is the
 * `identifier` `_` adds nothing, like a TypeScript `default`.
 */
function isWildcardSection(section) {
    const patterns = section.namedChildren.filter((child) => child !== null && child.type !== "body" && child.type !== "comment");
    if (patterns.some((child) => child?.type === "pattern_guard"))
        return false;
    const only = patterns[0];
    return patterns.length === 1 && only?.type === "identifier" && only.text === "_";
}
/**
 * Raw ABC counts for a GDScript unit node. 1 walk; nested units are skipped.
 *
 * Port note: as in TypeScript, a `for` variable and a `pattern_binding` add
 * nothing to A. A `var` without a value adds nothing to A.
 */
function computeGdscriptAbcCounts(fn) {
    let a = 0;
    let b = 0;
    let c = 0;
    (0, syntaxHelpers_1.walkDescendants)(fn, (node) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node))
            return false;
        if (!node.isNamed)
            return false;
        if (ASSIGNMENT_TYPES.has(node.type)) {
            a += 1;
        }
        else if (DECLARATION_TYPES.has(node.type)) {
            if (node.childForFieldName("value") !== null)
                a += 1;
        }
        else if (CALL_TYPES.has(node.type)) {
            b += 1;
            if (node.type === "attribute_call" && isMutatingMethodCall(node))
                a += 1;
        }
        else if (node.type === "binary_operator") {
            if (CONDITION_OPERATORS.has(operatorText(node)))
                c += 1;
        }
        else if (node.type === "pattern_section") {
            if (!isWildcardSection(node))
                c += 1;
        }
        else if (CONDITION_TYPES.has(node.type)) {
            c += 1;
        }
        return true;
    });
    return { a, b, c };
}
const gdscriptAbcScore = (ctx) => {
    const counts = computeGdscriptAbcCounts(ctx.node);
    const value = Math.sqrt(counts.a * counts.a + counts.b * counts.b + counts.c * counts.c);
    return { value, detail: counts };
};
exports.gdscriptAbcScore = gdscriptAbcScore;
// ---------------------------------------------------------------------------
// scopeDepthWeightedLoc and scopeDepthRatio (design 9.3, 5.8 row)
// ---------------------------------------------------------------------------
const gdscriptScopeDepthWeightedLoc = (ctx) => (0, operations_scopeDepth_1.gdscriptScopeDepthStats)(ctx.node, ctx.file.text).weightedLoc;
exports.gdscriptScopeDepthWeightedLoc = gdscriptScopeDepthWeightedLoc;
const gdscriptScopeDepthRatio = (ctx) => (0, operations_scopeDepth_1.gdscriptScopeDepthStats)(ctx.node, ctx.file.text).ratio;
exports.gdscriptScopeDepthRatio = gdscriptScopeDepthRatio;
// ---------------------------------------------------------------------------
// Halstead (design 9.5): all 3 results carry the same detail.
// ---------------------------------------------------------------------------
const gdscriptHalsteadVolume = (ctx) => {
    const detail = (0, operations_halstead_1.gdscriptHalsteadDetail)(ctx.node);
    return { value: (0, operations_halstead_1.halsteadVolumeOf)(detail), detail };
};
exports.gdscriptHalsteadVolume = gdscriptHalsteadVolume;
const gdscriptHalsteadDifficulty = (ctx) => {
    const detail = (0, operations_halstead_1.gdscriptHalsteadDetail)(ctx.node);
    return { value: (0, operations_halstead_1.halsteadDifficultyOf)(detail), detail };
};
exports.gdscriptHalsteadDifficulty = gdscriptHalsteadDifficulty;
const gdscriptHalsteadEffort = (ctx) => {
    const detail = (0, operations_halstead_1.gdscriptHalsteadDetail)(ctx.node);
    return { value: (0, operations_halstead_1.halsteadDifficultyOf)(detail) * (0, operations_halstead_1.halsteadVolumeOf)(detail), detail };
};
exports.gdscriptHalsteadEffort = gdscriptHalsteadEffort;
// ---------------------------------------------------------------------------
// maintainabilityIndex (design 9.3, 5.10 row)
// ---------------------------------------------------------------------------
/**
 * MI = max(0, (171 - 5.2 ln V - 0.23 CC - 16.2 ln LOC) * 100 / 171).
 * Same fallbacks and guard as the TypeScript metric: V defaults to 0, CC to
 * 1, and V <= 0 or LOC <= 0 gives 100.
 */
const gdscriptMaintainabilityIndex = (ctx) => {
    const V = ctx.dependencyValues[registry_1.MetricKeys.halsteadVolume] ?? 0;
    const CC = ctx.dependencyValues[registry_1.MetricKeys.cyclomaticComplexity] ?? 1;
    const LOC = (0, operations_scopeDepth_1.gdscriptCodeLines)(ctx.node, ctx.file.text).length;
    if (V <= 0 || LOC <= 0)
        return 100;
    const raw = 171 - 5.2 * Math.log(V) - 0.23 * CC - 16.2 * Math.log(LOC);
    return Math.max(0, (raw * 100) / 171);
};
exports.gdscriptMaintainabilityIndex = gdscriptMaintainabilityIndex;
//# sourceMappingURL=operations.js.map