"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAbcCounts = computeAbcCounts;
exports.computeAbcScore = computeAbcScore;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
/**
 * Mutating methods that bump A in addition to the B bump every call receives.
 */
const MUTATING_METHODS = new Set([
    "push",
    "set",
    "splice",
    "pop",
    "shift",
    "unshift",
    "delete",
    "clear",
    "fill",
    "sort",
    "reverse",
    "copyWithin",
]);
const ASSIGNMENT_OPERATORS = new Set([
    ts_morph_1.SyntaxKind.EqualsToken,
    ts_morph_1.SyntaxKind.PlusEqualsToken,
    ts_morph_1.SyntaxKind.MinusEqualsToken,
    ts_morph_1.SyntaxKind.AsteriskEqualsToken,
    ts_morph_1.SyntaxKind.SlashEqualsToken,
    ts_morph_1.SyntaxKind.PercentEqualsToken,
    ts_morph_1.SyntaxKind.AsteriskAsteriskEqualsToken,
    ts_morph_1.SyntaxKind.AmpersandEqualsToken,
    ts_morph_1.SyntaxKind.BarEqualsToken,
    ts_morph_1.SyntaxKind.CaretEqualsToken,
    ts_morph_1.SyntaxKind.LessThanLessThanEqualsToken,
    ts_morph_1.SyntaxKind.GreaterThanGreaterThanEqualsToken,
    ts_morph_1.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    ts_morph_1.SyntaxKind.BarBarEqualsToken,
    ts_morph_1.SyntaxKind.AmpersandAmpersandEqualsToken,
    ts_morph_1.SyntaxKind.QuestionQuestionEqualsToken,
]);
const LOGICAL_OPERATORS = new Set([
    ts_morph_1.SyntaxKind.AmpersandAmpersandToken,
    ts_morph_1.SyntaxKind.BarBarToken,
    ts_morph_1.SyntaxKind.QuestionQuestionToken,
]);
const COMPARISON_OPERATORS = new Set([
    ts_morph_1.SyntaxKind.EqualsEqualsToken,
    ts_morph_1.SyntaxKind.ExclamationEqualsToken,
    ts_morph_1.SyntaxKind.EqualsEqualsEqualsToken,
    ts_morph_1.SyntaxKind.ExclamationEqualsEqualsToken,
    ts_morph_1.SyntaxKind.LessThanToken,
    ts_morph_1.SyntaxKind.GreaterThanToken,
    ts_morph_1.SyntaxKind.LessThanEqualsToken,
    ts_morph_1.SyntaxKind.GreaterThanEqualsToken,
]);
function isNestedFunctionBoundary(child, root) {
    if (child === root)
        return false;
    return (child.isKind(ts_morph_1.SyntaxKind.FunctionDeclaration) ||
        child.isKind(ts_morph_1.SyntaxKind.FunctionExpression) ||
        child.isKind(ts_morph_1.SyntaxKind.ArrowFunction) ||
        child.isKind(ts_morph_1.SyntaxKind.MethodDeclaration));
}
function isMutatingMethodCall(node) {
    if (!node.isKind(ts_morph_1.SyntaxKind.CallExpression))
        return false;
    const expr = node.getExpression();
    if (!expr.isKind(ts_morph_1.SyntaxKind.PropertyAccessExpression))
        return false;
    return MUTATING_METHODS.has(expr.getName());
}
/**
 * Count leaf bindings in a destructuring pattern. Array pattern elisions
 * (`[, x]`) are skipped; nested patterns recurse.
 */
function countBindings(node) {
    let count = 0;
    for (const element of node.getElements()) {
        if (element.isKind(ts_morph_1.SyntaxKind.OmittedExpression))
            continue;
        const nameNode = element.getNameNode();
        if (nameNode.isKind(ts_morph_1.SyntaxKind.ObjectBindingPattern) ||
            nameNode.isKind(ts_morph_1.SyntaxKind.ArrayBindingPattern)) {
            count += countBindings(nameNode);
        }
        else {
            count += 1;
        }
    }
    return count;
}
/**
 * Compute the raw ABC counts for a function node. Single `forEachDescendant`
 * pass; nested function/method/arrow bodies are boundary-skipped.
 */
function computeAbcCounts(node) {
    let a = 0;
    let b = 0;
    let c = 0;
    node.forEachDescendant((child, traversal) => {
        if (isNestedFunctionBoundary(child, node)) {
            traversal.skip();
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.VariableDeclaration)) {
            if (child.getInitializer()) {
                const name = child.getNameNode();
                if (name.isKind(ts_morph_1.SyntaxKind.ObjectBindingPattern) ||
                    name.isKind(ts_morph_1.SyntaxKind.ArrayBindingPattern)) {
                    a += countBindings(name);
                }
                else {
                    a += 1;
                }
            }
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.BinaryExpression)) {
            const op = child.getOperatorToken().getKind();
            if (ASSIGNMENT_OPERATORS.has(op))
                a += 1;
            if (LOGICAL_OPERATORS.has(op))
                c += 1;
            if (COMPARISON_OPERATORS.has(op))
                c += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.PrefixUnaryExpression) ||
            child.isKind(ts_morph_1.SyntaxKind.PostfixUnaryExpression)) {
            const op = child.getOperatorToken();
            if (op === ts_morph_1.SyntaxKind.PlusPlusToken || op === ts_morph_1.SyntaxKind.MinusMinusToken) {
                a += 1;
            }
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.CallExpression)) {
            b += 1;
            if (isMutatingMethodCall(child))
                a += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.NewExpression)) {
            b += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.IfStatement)) {
            c += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.ForStatement) ||
            child.isKind(ts_morph_1.SyntaxKind.ForInStatement) ||
            child.isKind(ts_morph_1.SyntaxKind.ForOfStatement) ||
            child.isKind(ts_morph_1.SyntaxKind.WhileStatement) ||
            child.isKind(ts_morph_1.SyntaxKind.DoStatement)) {
            c += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.CaseClause)) {
            c += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.ConditionalExpression)) {
            c += 1;
            return;
        }
    });
    return { a, b, c };
}
function computeAbcScore(node) {
    const counts = computeAbcCounts(node);
    const value = Math.sqrt(counts.a * counts.a + counts.b * counts.b + counts.c * counts.c);
    return { value, detail: counts };
}
const abcDefinition = {
    key: registry_1.MetricKeys.abcScore,
    name: "ABC Score",
    shortCode: "ABC",
    description: "ABC  Assignments, Branches, Conditions vector magnitude",
    defaultThresholds: { warn: 20, error: 30 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeAbcScore(ctx.node),
    detailKeys: ["a", "b", "c"],
};
exports.default = abcDefinition;
//# sourceMappingURL=abc.js.map