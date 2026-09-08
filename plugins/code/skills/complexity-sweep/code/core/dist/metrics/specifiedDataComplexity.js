"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSpecifiedDataComplexity = computeSpecifiedDataComplexity;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
const FUNCTION_KINDS = new Set([
    ts_morph_1.SyntaxKind.FunctionDeclaration,
    ts_morph_1.SyntaxKind.FunctionExpression,
    ts_morph_1.SyntaxKind.ArrowFunction,
    ts_morph_1.SyntaxKind.MethodDeclaration,
]);
const BRANCH_KINDS = new Set([
    ts_morph_1.SyntaxKind.IfStatement,
    ts_morph_1.SyntaxKind.ForStatement,
    ts_morph_1.SyntaxKind.WhileStatement,
    ts_morph_1.SyntaxKind.DoStatement,
    ts_morph_1.SyntaxKind.SwitchStatement,
    ts_morph_1.SyntaxKind.ConditionalExpression,
]);
function computeSpecifiedDataComplexity(node) {
    const paramNames = getParameterNames(node);
    if (paramNames.size === 0)
        return 0;
    const influencing = new Set();
    node.forEachDescendant((child, traversal) => {
        // Latent bug fix: the original used `return false` (no-op under ts-morph);
        // `traversal.skip()` correctly prunes nested-function descendants so
        // parameters used only inside nested functions are not counted.
        if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
            traversal.skip();
            return;
        }
        if (!BRANCH_KINDS.has(child.getKind()))
            return;
        const condition = getConditionNode(child);
        if (!condition)
            return;
        for (const name of paramNames) {
            if (influencing.has(name))
                continue;
            if (conditionContainsIdentifier(condition, name)) {
                influencing.add(name);
            }
        }
    });
    return influencing.size;
}
function getParameterNames(node) {
    const names = new Set();
    if (!("getParameters" in node))
        return names;
    const params = node.getParameters();
    for (const param of params) {
        const nameNode = param.getNameNode();
        if (nameNode.isKind(ts_morph_1.SyntaxKind.ObjectBindingPattern)) {
            for (const element of nameNode.getElements()) {
                names.add(element.getName());
            }
        }
        else if (nameNode.isKind(ts_morph_1.SyntaxKind.ArrayBindingPattern)) {
            for (const element of nameNode.getElements()) {
                if (element.isKind(ts_morph_1.SyntaxKind.BindingElement)) {
                    names.add(element.getName());
                }
            }
        }
        else {
            names.add(param.getName());
        }
    }
    return names;
}
function getConditionNode(branch) {
    if (branch.isKind(ts_morph_1.SyntaxKind.IfStatement) ||
        branch.isKind(ts_morph_1.SyntaxKind.WhileStatement) ||
        branch.isKind(ts_morph_1.SyntaxKind.DoStatement) ||
        branch.isKind(ts_morph_1.SyntaxKind.SwitchStatement)) {
        return branch.getExpression();
    }
    if (branch.isKind(ts_morph_1.SyntaxKind.ForStatement)) {
        return branch.getCondition();
    }
    if (branch.isKind(ts_morph_1.SyntaxKind.ConditionalExpression)) {
        return branch.getCondition();
    }
    return undefined;
}
function conditionContainsIdentifier(condition, name) {
    if (condition.isKind(ts_morph_1.SyntaxKind.Identifier) && condition.getText() === name) {
        return true;
    }
    let found = false;
    condition.forEachDescendant((child, traversal) => {
        if (found) {
            traversal.stop();
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.Identifier) && child.getText() === name) {
            found = true;
            traversal.stop();
        }
    });
    return found;
}
const specifiedDataComplexity = {
    key: registry_1.MetricKeys.specifiedDataComplexity,
    name: "Specified Data Complexity",
    shortCode: "sdv(G)",
    description: "Number of distinct parameters that influence the function's control flow.",
    defaultThresholds: { warn: 4, error: 8 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeSpecifiedDataComplexity(ctx.node),
};
exports.default = specifiedDataComplexity;
//# sourceMappingURL=specifiedDataComplexity.js.map