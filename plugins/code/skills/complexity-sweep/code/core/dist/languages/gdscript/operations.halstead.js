"use strict";
// GDScript Halstead counts (design 9.5). Port of the semantic classification
// scheme of `metrics/halstead.ts`.
//
// - Operators: named nodes, keyed by the 9.5 table (a call is 1 `()`, an
//   attribute gives 1 `.` per member, an `if_statement` is `if`, ...).
//   Anonymous leaves are never counted on their own, so parentheses,
//   brackets, braces, commas and colons stay structural.
// - Operands: identifiers, declared names and literals. A whole string,
//   `string_name`, `node_path` or `get_node` path is 1 operand; the walk does
//   not descend into it.
// - Skipped: type-only syntax, comments, annotations, nested units and the
//   unit name. Lambdas count.
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectGdscriptHalsteadCounts = collectGdscriptHalsteadCounts;
exports.gdscriptHalsteadDetail = gdscriptHalsteadDetail;
exports.halsteadVolumeOf = halsteadVolumeOf;
exports.halsteadDifficultyOf = halsteadDifficultyOf;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
/**
 * Operand node types. `name` is the declared name of a `var`, a `const` and a
 * named lambda (the unit name is skipped apart).
 */
const OPERAND_TYPES = new Set([
    "identifier",
    "name",
    "string",
    "string_name",
    "node_path",
    "integer",
    "float",
    "true",
    "false",
    "null",
]);
/** Subtrees that hold no operator or operand of the unit. */
const SKIPPED_TYPES = new Set([
    "type",
    "inferred_type",
    "comment",
    "line_continuation",
    "annotation",
    "annotations",
    "region_start",
    "region_end",
]);
/** Named nodes that give exactly 1 operator with a fixed key. */
const FIXED_OPERATORS = new Map([
    ["assignment", "="],
    ["subscript", "[]"],
    ["attribute_subscript", "[]"],
    ["attribute_call", "()"],
    ["base_call", "()"],
    ["if_statement", "if"],
    ["else_clause", "else"],
    ["conditional_expression", "?:"],
    ["while_statement", "while"],
    ["match_statement", "match"],
    ["pattern_section", "case"],
    ["pattern_guard", "when"],
    ["return_statement", "return"],
    ["await_expression", "await"],
    ["lambda", "lambda"],
]);
/** Named nodes that give a fixed list of operators. */
const MULTI_OPERATORS = new Map([
    ["elif_clause", ["else", "if"]],
    ["for_statement", ["for", "in"]],
]);
/** D8: `&&`, `||` and `!` are aliases of `and`, `or` and `not`. */
const OPERATOR_ALIASES = new Map([
    ["&&", "and"],
    ["||", "or"],
    ["!", "not"],
]);
const UNARY_KEYS = new Map([
    ["-", "unary-"],
    ["+", "unary+"],
    ["~", "~"],
    ["not", "not"],
    ["!", "not"],
]);
const countsCache = (0, syntaxHelpers_1.createNodeCache)();
function increment(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}
/** Anonymous tokens of a node joined by a space: `not in`, `is not`, `+=`. */
function anonymousText(node) {
    const tokens = [];
    for (const child of node.children) {
        if (child !== null && !child.isNamed)
            tokens.push(child.type);
    }
    return tokens.join(" ");
}
/** Member children of an `attribute`: every named child after the first. */
function memberCount(node) {
    const parts = node.namedChildren.filter((child) => child !== null && !SKIPPED_TYPES.has(child.type));
    return Math.max(0, parts.length - 1);
}
/** True for a `call` of `assert`: it gives `assert`, not `()`. */
function isAssertCall(node) {
    const callee = node.namedChildren[0];
    return callee?.type === "identifier" && callee.text === "assert";
}
/** True for the type operand of `x as T`: TypeScript skips the cast type. */
function isCastType(node) {
    const parent = node.parent;
    if (parent?.type !== "binary_operator")
        return false;
    if (anonymousText(parent) !== "as")
        return false;
    return (0, syntaxHelpers_1.sameNode)(parent.childForFieldName("right"), node);
}
/** The callee identifier of an `assert` call is the keyword, not an operand. */
function isAssertKeyword(node) {
    const parent = node.parent;
    return parent?.type === "call" && isAssertCall(parent) && (0, syntaxHelpers_1.sameNode)(parent.namedChildren[0] ?? null, node);
}
/** `var` or `const`, plus `=` when the declaration has a value (`:=` too). */
function countDeclaration(node, keyword, operators) {
    increment(operators, keyword);
    if (node.childForFieldName("value") !== null)
        increment(operators, "=");
}
/** Operators of a named node by the 9.5 table. A structural node adds none. */
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
        case "variable_statement":
            countDeclaration(node, "var", operators);
            return;
        case "const_statement":
            countDeclaration(node, "const", operators);
            return;
        case "call":
            increment(operators, isAssertCall(node) ? "assert" : "()");
            return;
        case "attribute":
            for (let i = memberCount(node); i > 0; i--)
                increment(operators, ".");
            return;
        case "augmented_assignment":
        case "binary_operator": {
            const text = anonymousText(node);
            if (text !== "")
                increment(operators, OPERATOR_ALIASES.get(text) ?? text);
            return;
        }
        case "unary_operator": {
            const key = UNARY_KEYS.get(anonymousText(node));
            if (key !== undefined)
                increment(operators, key);
            return;
        }
    }
}
/**
 * Operator and operand multisets of a unit node. One walk per node; the 3
 * Halstead metrics share the cached result.
 *
 * Port notes (the design is silent):
 * - A declared `name` (`var x`, `const X`, a named lambda) is an operand, as a
 *   TypeScript declared identifier is. Without it, `var` parity with `let`
 *   fails.
 * - The type of `x as T` is skipped, as TypeScript skips the type of `as`.
 *   The `as` operator itself counts (design 9.5).
 * - A `get_node` gives `$` and 1 operand: its full text (`$Node`, `%Name`).
 * - A `pattern_binding` (`var z` in a match pattern) adds no operator; its
 *   identifier is an operand.
 */
function collectGdscriptHalsteadCounts(fn) {
    const cached = countsCache.get(fn);
    if (cached !== undefined)
        return cached;
    const operators = new Map();
    const operands = new Map();
    const unitName = fn.childForFieldName("name");
    (0, syntaxHelpers_1.walkDescendants)(fn, (node) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node))
            return false;
        if (!node.isNamed)
            return false;
        if (SKIPPED_TYPES.has(node.type))
            return false;
        if ((0, syntaxHelpers_1.sameNode)(node, unitName))
            return false;
        if (isCastType(node) || isAssertKeyword(node))
            return false;
        if (node.type === "get_node") {
            increment(operators, "$");
            increment(operands, node.text);
            return false;
        }
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
function gdscriptHalsteadDetail(fn) {
    const { operators, operands } = collectGdscriptHalsteadCounts(fn);
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