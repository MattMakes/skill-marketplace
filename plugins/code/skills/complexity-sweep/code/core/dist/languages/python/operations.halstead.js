"use strict";
// Python Halstead counts (design 5.9). Port of the semantic classification
// scheme of `metrics/halstead.ts`.
//
// - Operators: named nodes, keyed by the 5.9 table (a call is 1 `()`, an
//   attribute is 1 `.`, an `if_statement` is `if`, ...). Anonymous leaves are
//   never counted on their own, so parentheses, brackets, braces, commas and
//   colons stay structural.
// - Operands: identifiers and literals. A whole string (f-strings included)
//   is 1 operand; the walk does not descend into it.
// - Skipped: type-only syntax, comments, decorators, nested units, the
//   docstring and the unit name. Lambdas count.
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectPythonHalsteadCounts = collectPythonHalsteadCounts;
exports.pythonHalsteadDetail = pythonHalsteadDetail;
exports.halsteadVolumeOf = halsteadVolumeOf;
exports.halsteadDifficultyOf = halsteadDifficultyOf;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const operations_scopeDepth_1 = require("./operations.scopeDepth");
const OPERAND_TYPES = new Set([
    "identifier",
    "integer",
    "float",
    "true",
    "false",
    "none",
    "ellipsis",
    "string",
]);
/** Type-only subtrees, like the TypeScript TYPE_ONLY_KINDS. */
const TYPE_ONLY_TYPES = new Set([
    "type",
    "type_parameter",
    "type_alias_statement",
]);
/** Subtrees that hold no operator or operand of the unit. */
const SKIPPED_TYPES = new Set([
    "comment",
    "line_continuation",
    "decorator",
]);
/** Named nodes that give exactly 1 operator with a fixed key. */
const FIXED_OPERATORS = new Map([
    ["named_expression", "="],
    ["not_operator", "not"],
    ["attribute", "."],
    ["subscript", "[]"],
    ["call", "()"],
    ["list_splat", "..."],
    ["dictionary_splat", "..."],
    ["if_statement", "if"],
    // Port choice: a comprehension filter and a case guard are conditionals,
    // so they map to the `if` row of 5.9.
    ["if_clause", "if"],
    ["else_clause", "else"],
    ["conditional_expression", "?:"],
    ["while_statement", "while"],
    ["match_statement", "match"],
    ["case_clause", "case"],
    ["try_statement", "try"],
    ["except_clause", "except"],
    ["finally_clause", "finally"],
    ["raise_statement", "raise"],
    ["return_statement", "return"],
    ["await", "await"],
    ["yield", "yield"],
    ["lambda", "lambda"],
    ["with_statement", "with"],
    ["assert_statement", "assert"],
    ["delete_statement", "del"],
]);
/** Named nodes that give a fixed list of operators. */
const MULTI_OPERATORS = new Map([
    ["elif_clause", ["else", "if"]],
    ["for_statement", ["for", "in"]],
    ["for_in_clause", ["for", "in"]],
]);
const UNARY_KEYS = new Map([
    ["-", "unary-"],
    ["+", "unary+"],
    ["~", "~"],
]);
const countsCache = (0, syntaxHelpers_1.createNodeCache)();
function increment(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}
/**
 * True for type-only syntax: an annotation `type` node, a generic parameter
 * list and a `type X = ...` statement. The anonymous `type` keyword is not a
 * type node.
 */
function isTypeSyntax(node) {
    return node.isNamed && TYPE_ONLY_TYPES.has(node.type);
}
/** Text of the `operator` field, or null when the node has none. */
function operatorText(node) {
    return node.childForFieldName("operator")?.type ?? null;
}
/** `=` per `=` token: 1 for `a = 1` and for `a: int = 1`, 0 for `a: int`. */
function countAssignment(node, operators) {
    for (const child of node.children) {
        if (child !== null && !child.isNamed && child.type === "=")
            increment(operators, "=");
    }
}
/**
 * 1 operator per operator token of a comparison chain. The grammar builds
 * `not in` and `is not` as 1 anonymous node each.
 */
function countComparison(node, operators) {
    for (const child of node.children) {
        if (child !== null && !child.isNamed)
            increment(operators, child.type);
    }
}
/** Operators of a named node by the 5.9 table. A structural node adds none. */
function classifyOperator(node, operators) {
    const fixed = FIXED_OPERATORS.get(node.type);
    if (fixed !== undefined) {
        increment(operators, fixed);
        return;
    }
    const multi = MULTI_OPERATORS.get(node.type);
    if (multi !== undefined) {
        for (const key of multi)
            increment(operators, key);
        return;
    }
    switch (node.type) {
        case "assignment":
            countAssignment(node, operators);
            return;
        case "comparison_operator":
            countComparison(node, operators);
            return;
        case "augmented_assignment":
        case "binary_operator":
        case "boolean_operator": {
            const text = operatorText(node);
            if (text !== null)
                increment(operators, text);
            return;
        }
        case "unary_operator": {
            const key = UNARY_KEYS.get(operatorText(node) ?? "");
            if (key !== undefined)
                increment(operators, key);
            return;
        }
    }
}
/**
 * Operator and operand multisets of a function node. One walk per node; the
 * 3 Halstead metrics share the cached result.
 *
 * Port note: the design is silent on the docstring. It is skipped here, like
 * a TypeScript JSDoc comment, because design 5.10 treats it as a comment.
 */
function collectPythonHalsteadCounts(fn) {
    const cached = countsCache.get(fn);
    if (cached !== undefined)
        return cached;
    const operators = new Map();
    const operands = new Map();
    const body = fn.childForFieldName("body");
    const docstring = body === null ? null : (0, operations_scopeDepth_1.pythonDocstring)(body);
    const name = fn.childForFieldName("name");
    (0, syntaxHelpers_1.walkDescendants)(fn, (node) => {
        if ((0, nodeTypes_1.isPythonFunction)(node))
            return false;
        if (isTypeSyntax(node))
            return false;
        if (SKIPPED_TYPES.has(node.type))
            return false;
        if (docstring !== null && (0, syntaxHelpers_1.sameNode)(node, docstring))
            return false;
        if (!node.isNamed)
            return false;
        if ((0, syntaxHelpers_1.sameNode)(node, name))
            return false;
        if (OPERAND_TYPES.has(node.type)) {
            increment(operands, node.text);
            return false;
        }
        classifyOperator(node, operators);
        return true;
    });
    const counts = { operators, operands };
    countsCache.set(fn, counts);
    return counts;
}
function sum(map) {
    let total = 0;
    for (const count of map.values())
        total += count;
    return total;
}
function pythonHalsteadDetail(fn) {
    const { operators, operands } = collectPythonHalsteadCounts(fn);
    return { n1: operators.size, n2: operands.size, N1: sum(operators), N2: sum(operands) };
}
function halsteadVolumeOf(d) {
    const n = d.n1 + d.n2;
    return n === 0 ? 0 : (d.N1 + d.N2) * Math.log2(n);
}
function halsteadDifficultyOf(d) {
    return d.n2 === 0 ? 0 : (d.n1 / 2) * (d.N2 / d.n2);
}
//# sourceMappingURL=operations.halstead.js.map