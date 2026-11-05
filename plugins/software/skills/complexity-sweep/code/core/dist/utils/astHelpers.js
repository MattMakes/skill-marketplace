"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFunctions = extractFunctions;
const ts_morph_1 = require("ts-morph");
const ANONYMOUS = "<anonymous>";
/**
 * Walks a SourceFile and returns an entry for every function-like node:
 * FunctionDeclaration, MethodDeclaration, ArrowFunction, FunctionExpression.
 *
 * Traversal is a full recursive descent (no skip), so nested functions are
 * emitted as their own entries in source order. Class `constructor` methods
 * are NOT emitted — `MethodDeclaration` covers named methods only; ts-morph
 * classifies constructors as a distinct `ConstructorDeclaration` kind.
 */
function extractFunctions(sourceFile) {
    const results = [];
    sourceFile.forEachDescendant((node) => {
        const extracted = toExtractedFunction(node);
        if (extracted)
            results.push(extracted);
    });
    return results;
}
function toExtractedFunction(node) {
    if (node.isKind(ts_morph_1.SyntaxKind.FunctionDeclaration)) {
        return {
            name: node.getName() ?? ANONYMOUS,
            node,
            line: node.getStartLineNumber(),
        };
    }
    if (node.isKind(ts_morph_1.SyntaxKind.MethodDeclaration)) {
        return {
            name: node.getName(),
            node,
            line: node.getStartLineNumber(),
        };
    }
    if (node.isKind(ts_morph_1.SyntaxKind.ArrowFunction)) {
        return {
            name: getAssignedName(node) ?? ANONYMOUS,
            node,
            line: node.getStartLineNumber(),
        };
    }
    if (node.isKind(ts_morph_1.SyntaxKind.FunctionExpression)) {
        return {
            name: getAssignedName(node) ?? node.getName() ?? ANONYMOUS,
            node,
            line: node.getStartLineNumber(),
        };
    }
    return undefined;
}
/**
 * Looks at the parent of an anonymous function expression to derive a name:
 * - `const foo = () => ...` → "foo"
 * - `{ foo: () => ... }` → "foo"
 * Intentionally shallow: does not unwrap parenthesized/as-expressions.
 */
function getAssignedName(node) {
    const parent = node.getParent();
    if (parent?.isKind(ts_morph_1.SyntaxKind.VariableDeclaration)) {
        return parent.getName();
    }
    if (parent?.isKind(ts_morph_1.SyntaxKind.PropertyAssignment)) {
        return parent.getName();
    }
    return undefined;
}
//# sourceMappingURL=astHelpers.js.map