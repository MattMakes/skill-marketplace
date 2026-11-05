"use strict";
// GDScript control-flow metrics: cyclomatic, essential and module design complexity.
// Ports core/src/metrics/{cyclomaticComplexity,essentialComplexity,moduleDesignComplexity}.ts
// using ai_docs/designs/complexity-sweep-multilang.md section 9.3.
//
// A unit node (`func`, `_init`, accessor body) is its own unit and is skipped when
// nested. A `lambda` is NOT skipped (D1).
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdscriptModuleDesignComplexity = exports.gdscriptEssentialComplexity = exports.gdscriptCyclomaticComplexity = void 0;
exports.computeGdscriptCyclomaticComplexity = computeGdscriptCyclomaticComplexity;
exports.computeGdscriptEssentialComplexity = computeGdscriptEssentialComplexity;
exports.computeGdscriptModuleDesignComplexity = computeGdscriptModuleDesignComplexity;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const DEFAULT_WEIGHTS = {
    if: 1,
    elseIf: 1,
    for: 1,
    forIn: 1,
    forOf: 1,
    while: 1,
    doWhile: 1,
    case: 1,
    catch: 1,
    logicalAnd: 1,
    logicalOr: 1,
    nullishCoalescing: 1,
    ternary: 1,
    tryOperator: 1,
};
/** Visit each descendant of `unit`, skipping the subtrees of nested units. */
function walkUnit(unit, visit) {
    (0, syntaxHelpers_1.walkDescendants)(unit, (n) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(n))
            return false;
        return visit(n);
    });
}
// A guard-free section whose only pattern is `_` is the default arm (D3). A lone
// `var x:` binding is NOT a default: it counts, like a Python `case x:`.
function isGuardFreeWildcard(section) {
    if (section.namedChildren.some((c) => c.type === "pattern_guard"))
        return false;
    const patterns = section.namedChildren.filter((c) => c.type !== "body" && c.type !== "comment");
    const only = patterns[0];
    return patterns.length === 1 && only?.type === "identifier" && only.text === "_";
}
/** Text of the operator token of a `binary_operator` (`and`, `&&`, `or`, `||`, `+`...). */
function operatorText(node) {
    const op = node.childForFieldName("op") ?? node.childForFieldName("operator");
    if (op !== null)
        return op.text;
    const left = node.childForFieldName("left");
    const right = node.childForFieldName("right");
    for (const child of node.children) {
        if (child.isNamed)
            continue;
        if (left !== null && child.id === left.id)
            continue;
        if (right !== null && child.id === right.id)
            continue;
        return child.text;
    }
    return "";
}
function contributionFor(node, w) {
    switch (node.type) {
        // A `pattern_guard` is a decision of its own, like a `when` clause.
        case "if_statement":
        case "pattern_guard":
            return w.if;
        case "elif_clause":
            return w.elseIf;
        case "for_statement":
            return w.for;
        case "while_statement":
            return w.while;
        case "pattern_section":
            return isGuardFreeWildcard(node) ? 0 : w.case;
        case "conditional_expression":
            return w.ternary;
        case "binary_operator": {
            const op = operatorText(node);
            if (op === "and" || op === "&&")
                return w.logicalAnd;
            if (op === "or" || op === "||")
                return w.logicalOr;
            return 0;
        }
        default:
            return 0;
    }
}
function computeGdscriptCyclomaticComplexity(node, weights) {
    const w = { ...DEFAULT_WEIGHTS, ...weights };
    let complexity = 1;
    walkUnit(node, (n) => {
        complexity += contributionFor(n, w);
    });
    return complexity;
}
// Early returns follow the TypeScript rule over the returns outside every lambda
// (D4): with 2 or more returns, each one that does not end last counts.
function computeGdscriptEssentialComplexity(node) {
    let complexity = 1;
    const returnEnds = [];
    walkUnit(node, (n) => {
        switch (n.type) {
            case "lambda":
                // Count `continue` inside the lambda body, but not its `return`.
                walkUnit(n, (inner) => {
                    if (inner.type === "continue_statement")
                        complexity += 1;
                });
                return false;
            case "return_statement":
                returnEnds.push(n.endIndex);
                break;
            case "continue_statement":
                complexity += 1;
                break;
        }
        return true;
    });
    if (returnEnds.length > 1) {
        const lastEnd = Math.max(...returnEnds);
        complexity += returnEnds.filter((end) => end !== lastEnd).length;
    }
    return complexity;
}
const BRANCH_TYPES = new Set([
    "if_statement",
    "for_statement",
    "while_statement",
    "match_statement",
    "conditional_expression",
]);
const CALL_TYPES = new Set(["call", "attribute_call", "base_call", "get_node"]);
function containsCall(branch) {
    let found = false;
    walkUnit(branch, (n) => {
        if (found)
            return false;
        if (CALL_TYPES.has(n.type)) {
            found = true;
            return false;
        }
        return true;
    });
    return found;
}
function computeGdscriptModuleDesignComplexity(node) {
    let complexity = 1;
    walkUnit(node, (n) => {
        if (BRANCH_TYPES.has(n.type) && containsCall(n))
            complexity += 1;
    });
    return complexity;
}
const gdscriptCyclomaticComplexity = (ctx) => computeGdscriptCyclomaticComplexity(ctx.node, ctx.options.weights?.cyclomaticComplexity);
exports.gdscriptCyclomaticComplexity = gdscriptCyclomaticComplexity;
const gdscriptEssentialComplexity = (ctx) => computeGdscriptEssentialComplexity(ctx.node);
exports.gdscriptEssentialComplexity = gdscriptEssentialComplexity;
const gdscriptModuleDesignComplexity = (ctx) => computeGdscriptModuleDesignComplexity(ctx.node);
exports.gdscriptModuleDesignComplexity = gdscriptModuleDesignComplexity;
//# sourceMappingURL=controlFlow.js.map