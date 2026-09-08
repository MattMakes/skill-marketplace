"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeModuleDesignComplexity = computeModuleDesignComplexity;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
const BRANCH_KINDS = new Set([
    ts_morph_1.SyntaxKind.IfStatement,
    ts_morph_1.SyntaxKind.ForStatement,
    ts_morph_1.SyntaxKind.ForInStatement,
    ts_morph_1.SyntaxKind.ForOfStatement,
    ts_morph_1.SyntaxKind.WhileStatement,
    ts_morph_1.SyntaxKind.DoStatement,
    ts_morph_1.SyntaxKind.SwitchStatement,
    ts_morph_1.SyntaxKind.ConditionalExpression,
]);
const FUNCTION_KINDS = new Set([
    ts_morph_1.SyntaxKind.FunctionDeclaration,
    ts_morph_1.SyntaxKind.FunctionExpression,
    ts_morph_1.SyntaxKind.ArrowFunction,
    ts_morph_1.SyntaxKind.MethodDeclaration,
]);
function computeModuleDesignComplexity(node) {
    let complexity = 1;
    node.forEachDescendant((child, traversal) => {
        if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
            traversal.skip();
            return;
        }
        if (BRANCH_KINDS.has(child.getKind()) && containsCallExpression(child)) {
            complexity += 1;
        }
    });
    return complexity;
}
function containsCallExpression(branch) {
    let found = false;
    branch.forEachDescendant((descendant, traversal) => {
        if (descendant !== branch && FUNCTION_KINDS.has(descendant.getKind())) {
            traversal.skip();
            return;
        }
        if (descendant.isKind(ts_morph_1.SyntaxKind.CallExpression)) {
            found = true;
            traversal.stop();
        }
    });
    return found;
}
const moduleDesignComplexity = {
    key: registry_1.MetricKeys.moduleDesignComplexity,
    name: "Module Design Complexity",
    shortCode: "iv(G)",
    description: "Counts control-flow branches that contain a function call, measuring inter-module coupling.",
    defaultThresholds: { warn: 10, error: 20 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeModuleDesignComplexity(ctx.node),
};
exports.default = moduleDesignComplexity;
//# sourceMappingURL=moduleDesignComplexity.js.map