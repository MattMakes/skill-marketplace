"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCyclomaticComplexity = computeCyclomaticComplexity;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
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
};
const FUNCTION_KINDS = new Set([
    ts_morph_1.SyntaxKind.FunctionDeclaration,
    ts_morph_1.SyntaxKind.FunctionExpression,
    ts_morph_1.SyntaxKind.ArrowFunction,
    ts_morph_1.SyntaxKind.MethodDeclaration,
]);
function computeCyclomaticComplexity(node, weights) {
    const w = { ...DEFAULT_WEIGHTS, ...weights };
    let complexity = 1;
    node.forEachDescendant((child, traversal) => {
        if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
            traversal.skip();
            return;
        }
        complexity += contributionFor(child, w);
    });
    return complexity;
}
function contributionFor(child, w) {
    if (child.isKind(ts_morph_1.SyntaxKind.IfStatement)) {
        return isElseIf(child) ? w.elseIf : w.if;
    }
    if (child.isKind(ts_morph_1.SyntaxKind.ForStatement))
        return w.for;
    if (child.isKind(ts_morph_1.SyntaxKind.ForInStatement))
        return w.forIn;
    if (child.isKind(ts_morph_1.SyntaxKind.ForOfStatement))
        return w.forOf;
    if (child.isKind(ts_morph_1.SyntaxKind.WhileStatement))
        return w.while;
    if (child.isKind(ts_morph_1.SyntaxKind.DoStatement))
        return w.doWhile;
    if (child.isKind(ts_morph_1.SyntaxKind.CaseClause))
        return w.case;
    if (child.isKind(ts_morph_1.SyntaxKind.CatchClause))
        return w.catch;
    if (child.isKind(ts_morph_1.SyntaxKind.ConditionalExpression))
        return w.ternary;
    if (child.isKind(ts_morph_1.SyntaxKind.BinaryExpression)) {
        const op = child.getOperatorToken().getKind();
        if (op === ts_morph_1.SyntaxKind.AmpersandAmpersandToken)
            return w.logicalAnd;
        if (op === ts_morph_1.SyntaxKind.BarBarToken)
            return w.logicalOr;
        if (op === ts_morph_1.SyntaxKind.QuestionQuestionToken)
            return w.nullishCoalescing;
    }
    return 0;
}
function isElseIf(ifNode) {
    const parent = ifNode.getParent();
    if (!parent?.isKind(ts_morph_1.SyntaxKind.IfStatement))
        return false;
    return parent.getElseStatement() === ifNode;
}
const cyclomaticComplexity = {
    key: registry_1.MetricKeys.cyclomaticComplexity,
    name: "Cyclomatic Complexity",
    shortCode: "v(G)",
    description: "Number of linearly independent paths through a function's control-flow graph.",
    defaultThresholds: { warn: 10, error: 20 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeCyclomaticComplexity(ctx.node, ctx.options?.weights?.cyclomaticComplexity),
};
exports.default = cyclomaticComplexity;
//# sourceMappingURL=cyclomaticComplexity.js.map