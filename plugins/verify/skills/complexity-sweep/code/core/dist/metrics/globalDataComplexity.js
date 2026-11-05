"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGlobalDataComplexity = computeGlobalDataComplexity;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
const FUNCTION_KINDS = new Set([
    ts_morph_1.SyntaxKind.FunctionDeclaration,
    ts_morph_1.SyntaxKind.FunctionExpression,
    ts_morph_1.SyntaxKind.ArrowFunction,
    ts_morph_1.SyntaxKind.MethodDeclaration,
]);
const MUTABLE_INITIALIZER_KINDS = new Set([
    ts_morph_1.SyntaxKind.ObjectLiteralExpression,
    ts_morph_1.SyntaxKind.ArrayLiteralExpression,
    ts_morph_1.SyntaxKind.NewExpression,
    ts_morph_1.SyntaxKind.AsExpression,
]);
const MUTABLE_TYPE_SUBSTRINGS = ["[]", "Record", "{"];
function computeGlobalDataComplexity(node, sourceFile) {
    const mutableGlobals = getMutableModuleScopeVars(sourceFile);
    if (mutableGlobals.size === 0)
        return 0;
    const referenced = new Set();
    node.forEachDescendant((child, traversal) => {
        if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
            traversal.skip();
            return;
        }
        if (child.isKind(ts_morph_1.SyntaxKind.Identifier)) {
            const name = child.getText();
            if (mutableGlobals.has(name))
                referenced.add(name);
        }
    });
    return referenced.size;
}
function getMutableModuleScopeVars(sourceFile) {
    const names = new Set();
    for (const stmt of sourceFile.getStatements()) {
        if (!stmt.isKind(ts_morph_1.SyntaxKind.VariableStatement))
            continue;
        const declList = stmt.getDeclarationList();
        const isConst = declList.getText().trimStart().startsWith("const");
        for (const decl of declList.getDeclarations()) {
            const name = decl.getName();
            if (!isConst) {
                names.add(name);
                continue;
            }
            if (hasMutableConstInitializer(decl) || hasMutableTypeAnnotation(decl)) {
                names.add(name);
            }
        }
    }
    return names;
}
function hasMutableConstInitializer(decl) {
    const init = decl.getInitializer();
    if (!init)
        return false;
    return MUTABLE_INITIALIZER_KINDS.has(init.getKind());
}
function hasMutableTypeAnnotation(decl) {
    const typeNode = decl.getTypeNode();
    if (!typeNode)
        return false;
    const text = typeNode.getText();
    return MUTABLE_TYPE_SUBSTRINGS.some((sub) => text.includes(sub));
}
const globalDataComplexity = {
    key: registry_1.MetricKeys.globalDataComplexity,
    name: "Global Data Complexity",
    shortCode: "gdv(G)",
    description: "Number of distinct mutable module-scope variables referenced by the function.",
    defaultThresholds: { warn: 3, error: 6 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeGlobalDataComplexity(ctx.node, ctx.sourceFile),
};
exports.default = globalDataComplexity;
//# sourceMappingURL=globalDataComplexity.js.map