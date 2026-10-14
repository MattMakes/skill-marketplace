"use strict";
// Python control-flow metrics: cyclomatic, essential and module design complexity.
// Ports core/src/metrics/{cyclomaticComplexity,essentialComplexity,moduleDesignComplexity}.ts
// using the mapping in ai_docs/designs/complexity-sweep-multilang.md section 5.
//
// A nested `def` is its own unit and is skipped. A `lambda` is NOT skipped.
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonModuleDesignComplexity = exports.pythonEssentialComplexity = exports.pythonCyclomaticComplexity = void 0;
exports.computePythonCyclomaticComplexity = computePythonCyclomaticComplexity;
exports.computePythonEssentialComplexity = computePythonEssentialComplexity;
exports.computePythonModuleDesignComplexity = computePythonModuleDesignComplexity;
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
/** Visit each descendant of `unit`, skipping the subtrees of nested functions. */
function walkUnit(unit, visit) {
    (0, syntaxHelpers_1.walkDescendants)(unit, (n) => {
        if ((0, nodeTypes_1.isPythonFunction)(n))
            return false;
        visit(n);
        return true;
    });
}
// `case _:` without a guard is the default arm: not counted, like TypeScript `default`.
function isGuardFreeWildcard(caseClause) {
    if (caseClause.childForFieldName("guard") !== null)
        return false;
    const patterns = caseClause.namedChildren.filter((c) => c.type === "case_pattern");
    return patterns.length === 1 && patterns[0]?.text.trim() === "_";
}
function booleanOperator(node) {
    const op = node.childForFieldName("operator");
    if (op !== null)
        return op.text;
    // Fall back to the anonymous operator token between the operands.
    return node.children.find((c) => c.text === "and" || c.text === "or")?.text ?? "";
}
function contributionFor(node, w) {
    switch (node.type) {
        // `if_clause` is both a comprehension filter and a `case` guard: 1 decision each.
        case "if_statement":
        case "if_clause":
            return w.if;
        case "elif_clause":
            return w.elseIf;
        case "for_statement": // also `async for`
        case "for_in_clause":
            return w.for;
        case "while_statement":
            return w.while;
        case "case_clause":
            return isGuardFreeWildcard(node) ? 0 : w.case;
        case "except_clause":
        case "except_group_clause": // the `except*` form, when the grammar emits it
            return w.catch;
        case "conditional_expression":
            return w.ternary;
        case "boolean_operator": {
            const op = booleanOperator(node);
            if (op === "and")
                return w.logicalAnd;
            if (op === "or")
                return w.logicalOr;
            return 0;
        }
        default:
            return 0;
    }
}
function computePythonCyclomaticComplexity(node, weights) {
    const w = { ...DEFAULT_WEIGHTS, ...weights };
    let complexity = 1;
    walkUnit(node, (n) => {
        complexity += contributionFor(n, w);
    });
    return complexity;
}
// `raise` counts only under an `if` or `match` inside the unit (TypeScript also
// counted `?:`; a Python `conditional_expression` cannot hold a statement).
const CONDITIONAL_TYPES = new Set(["if_statement", "match_statement"]);
function isInsideConditional(node, unit) {
    for (const ancestor of (0, syntaxHelpers_1.ancestorsUntil)(node, unit)) {
        if ((0, nodeTypes_1.isPythonFunction)(ancestor))
            return false;
        if (CONDITIONAL_TYPES.has(ancestor.type))
            return true;
    }
    return false;
}
function computePythonEssentialComplexity(node) {
    let complexity = 1;
    const returnEnds = [];
    walkUnit(node, (n) => {
        switch (n.type) {
            case "return_statement":
                returnEnds.push(n.endIndex);
                break;
            case "continue_statement":
                complexity += 1;
                break;
            case "raise_statement":
                if (isInsideConditional(n, node))
                    complexity += 1;
                break;
        }
    });
    // Early returns: with 2 or more returns, each one that is not the textually last counts.
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
    "list_comprehension",
    "set_comprehension",
    "dictionary_comprehension",
    "generator_expression",
]);
function containsCall(branch) {
    let found = false;
    (0, syntaxHelpers_1.walkDescendants)(branch, (n) => {
        if (found || (0, nodeTypes_1.isPythonFunction)(n))
            return false;
        if (n.type === "call") {
            found = true;
            return false;
        }
        return true;
    });
    return found;
}
function computePythonModuleDesignComplexity(node) {
    let complexity = 1;
    walkUnit(node, (n) => {
        if (BRANCH_TYPES.has(n.type) && containsCall(n))
            complexity += 1;
    });
    return complexity;
}
const pythonCyclomaticComplexity = (ctx) => computePythonCyclomaticComplexity(ctx.node, ctx.options.weights?.cyclomaticComplexity);
exports.pythonCyclomaticComplexity = pythonCyclomaticComplexity;
const pythonEssentialComplexity = (ctx) => computePythonEssentialComplexity(ctx.node);
exports.pythonEssentialComplexity = pythonEssentialComplexity;
const pythonModuleDesignComplexity = (ctx) => computePythonModuleDesignComplexity(ctx.node);
exports.pythonModuleDesignComplexity = pythonModuleDesignComplexity;
//# sourceMappingURL=controlFlow.js.map