"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEssentialComplexity = computeEssentialComplexity;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
const FUNCTION_KINDS = new Set([
    ts_morph_1.SyntaxKind.FunctionDeclaration,
    ts_morph_1.SyntaxKind.FunctionExpression,
    ts_morph_1.SyntaxKind.ArrowFunction,
    ts_morph_1.SyntaxKind.MethodDeclaration,
]);
const CONDITIONAL_KINDS = new Set([
    ts_morph_1.SyntaxKind.IfStatement,
    ts_morph_1.SyntaxKind.SwitchStatement,
    ts_morph_1.SyntaxKind.ConditionalExpression,
]);
function computeEssentialComplexity(node) {
    let complexity = 1;
    const returnStatements = [];
    node.forEachDescendant((child) => {
        if (isNestedFunction(child, node))
            return;
        if (child.isKind(ts_morph_1.SyntaxKind.ReturnStatement)) {
            returnStatements.push(child);
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.ContinueStatement)) {
            complexity += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.BreakStatement) && child.getLabel()) {
            complexity += 1;
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.ThrowStatement) &&
            isInsideConditional(child, node)) {
            complexity += 1;
        }
    });
    complexity += countEarlyReturns(returnStatements);
    return complexity;
}
function countEarlyReturns(returns) {
    if (returns.length <= 1)
        return 0;
    let lastEnd = -1;
    for (const ret of returns) {
        const end = ret.getEnd();
        if (end > lastEnd)
            lastEnd = end;
    }
    let count = 0;
    for (const ret of returns) {
        if (ret.getEnd() !== lastEnd)
            count += 1;
    }
    return count;
}
function isNestedFunction(child, boundary) {
    let parent = child.getParent();
    while (parent && parent !== boundary) {
        if (FUNCTION_KINDS.has(parent.getKind()))
            return true;
        parent = parent.getParent();
    }
    return false;
}
function isInsideConditional(child, boundary) {
    let parent = child.getParent();
    while (parent && parent !== boundary) {
        if (FUNCTION_KINDS.has(parent.getKind()))
            return false;
        if (CONDITIONAL_KINDS.has(parent.getKind()))
            return true;
        parent = parent.getParent();
    }
    return false;
}
const essentialComplexity = {
    key: registry_1.MetricKeys.essentialComplexity,
    name: "Essential Complexity",
    shortCode: "ev(G)",
    description: "Amount of unstructured control flow that cannot be reduced by structured transformations.",
    defaultThresholds: { warn: 4, error: 8 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeEssentialComplexity(ctx.node),
};
exports.default = essentialComplexity;
//# sourceMappingURL=essentialComplexity.js.map