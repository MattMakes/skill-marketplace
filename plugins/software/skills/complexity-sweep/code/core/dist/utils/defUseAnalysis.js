"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDefUseMap = buildDefUseMap;
const ts_morph_1 = require("ts-morph");
// Keyed on the function/method Node so that repeated calls (e.g. by both
// peakLiveVariables and variableSpan) share a single computation.
const cache = new WeakMap();
/**
 * Three-pass (+ init + materialize) algorithm:
 *  1. Collect parameters (with destructuring).
 *  2. Collect `var`/`let`/`const` declarations inside the function, skipping
 *     descendants that are themselves nested functions.
 *  3. Initialize every entry's `lastUseLine` to its `defLine`.
 *  4. Scan ALL identifiers (including inside nested functions, for closure
 *     handling) and, for each, find the nearest in-scope declaration with the
 *     same name (reverse search handles shadowing).
 *  5. Materialize entries in declaration order, cache, return.
 *
 * `_sourceFile` is unused — retained in the signature for future use and to
 * match the shipped API contract (spec §2.1).
 */
function buildDefUseMap(node, _sourceFile) {
    const cached = cache.get(node);
    if (cached)
        return cached;
    const varInfos = [];
    // Pass 1: parameters
    collectParameters(node, varInfos);
    // Pass 2: variable declarations inside the function (excluding nested fns)
    collectLocalDeclarations(node, varInfos);
    // Pass 3: initialize lastUse to defLine (so unused vars report a 0-span)
    const lastUseLines = varInfos.map((v) => v.defLine);
    // Pass 4: identifier scan — closure refs count at their lexical position
    scanIdentifiers(node, varInfos, lastUseLines);
    // Pass 5: materialize
    const entries = varInfos.map((v, i) => ({
        name: v.name,
        defLine: v.defLine,
        lastUseLine: lastUseLines[i] ?? v.defLine,
    }));
    cache.set(node, entries);
    return entries;
}
// ---------------------------------------------------------------------------
// Pass 1: parameters
// ---------------------------------------------------------------------------
function collectParameters(node, varInfos) {
    if (!isFunctionLike(node))
        return;
    // All four function-like kinds expose `.getParameters()` with the same shape.
    const params = node.getParameters();
    for (const param of params) {
        const bindings = extractBindingNames(param, param.getStartLineNumber());
        for (const b of bindings) {
            varInfos.push({
                name: b.name,
                defLine: b.defLine,
                declNode: param,
                scopeBoundary: findScopeBoundary(param, node),
            });
        }
    }
}
// ---------------------------------------------------------------------------
// Pass 2: local variable declarations
// ---------------------------------------------------------------------------
function collectLocalDeclarations(root, varInfos) {
    root.forEachDescendant((child, traversal) => {
        if (isNestedFunctionBoundary(child, root)) {
            traversal.skip();
            return;
        }
        if (!child.isKind(ts_morph_1.SyntaxKind.VariableDeclaration))
            return;
        const bindings = extractBindingNames(child, child.getStartLineNumber());
        for (const b of bindings) {
            varInfos.push({
                name: b.name,
                defLine: b.defLine,
                declNode: child,
                scopeBoundary: findScopeBoundary(child, root),
            });
        }
    });
}
// ---------------------------------------------------------------------------
// Pass 4: identifier scan
// ---------------------------------------------------------------------------
function scanIdentifiers(root, varInfos, lastUseLines) {
    root.forEachDescendant((child) => {
        if (!child.isKind(ts_morph_1.SyntaxKind.Identifier))
            return;
        if (isDeclarationName(child))
            return;
        if (isPropertyAccessName(child))
            return;
        if (isPropertyAssignmentKey(child))
            return;
        // ShorthandPropertyAssignment (`{ a }`) is intentionally treated as a use.
        const identName = child.getText();
        const identLine = child.getStartLineNumber();
        // Reverse-scan handles shadowing: the nearest enclosing declaration wins.
        for (let i = varInfos.length - 1; i >= 0; i--) {
            const info = varInfos[i];
            if (!info)
                continue;
            if (info.name !== identName)
                continue;
            if (!isWithinScope(child, info.scopeBoundary))
                continue;
            const current = lastUseLines[i] ?? info.defLine;
            if (identLine > current)
                lastUseLines[i] = identLine;
            break;
        }
    });
}
function extractBindingNames(node, defLine) {
    const results = [];
    const nameNode = node.getNameNode();
    if (nameNode.isKind(ts_morph_1.SyntaxKind.Identifier)) {
        results.push({ name: nameNode.getText(), defLine });
    }
    else if (nameNode.isKind(ts_morph_1.SyntaxKind.ObjectBindingPattern) ||
        nameNode.isKind(ts_morph_1.SyntaxKind.ArrayBindingPattern)) {
        collectBindingElementNames(nameNode, defLine, results);
    }
    return results;
}
function collectBindingElementNames(pattern, defLine, results) {
    for (const element of pattern.getChildrenOfKind(ts_morph_1.SyntaxKind.BindingElement)) {
        const nameNode = element.getNameNode();
        if (nameNode.isKind(ts_morph_1.SyntaxKind.Identifier)) {
            results.push({ name: nameNode.getText(), defLine });
        }
        else if (nameNode.isKind(ts_morph_1.SyntaxKind.ObjectBindingPattern) ||
            nameNode.isKind(ts_morph_1.SyntaxKind.ArrayBindingPattern)) {
            collectBindingElementNames(nameNode, defLine, results);
        }
    }
}
// ---------------------------------------------------------------------------
// Scope boundary resolution
// ---------------------------------------------------------------------------
function findScopeBoundary(declNode, rootNode) {
    if (declNode.isKind(ts_morph_1.SyntaxKind.Parameter))
        return rootNode;
    if (declNode.isKind(ts_morph_1.SyntaxKind.VariableDeclaration)) {
        if (isVarDeclaration(declNode))
            return rootNode;
        const declList = declNode.getParent();
        if (declList?.isKind(ts_morph_1.SyntaxKind.VariableDeclarationList)) {
            const varStmt = declList.getParent();
            if (varStmt?.isKind(ts_morph_1.SyntaxKind.ForOfStatement) ||
                varStmt?.isKind(ts_morph_1.SyntaxKind.ForInStatement) ||
                varStmt?.isKind(ts_morph_1.SyntaxKind.ForStatement)) {
                return varStmt;
            }
        }
        // let/const: walk up to the nearest enclosing Block or CaseClause.
        let current = declNode.getParent();
        while (current && current !== rootNode) {
            if (current.isKind(ts_morph_1.SyntaxKind.Block) ||
                current.isKind(ts_morph_1.SyntaxKind.CaseClause)) {
                return current;
            }
            current = current.getParent();
        }
        return rootNode;
    }
    return rootNode;
}
function isVarDeclaration(node) {
    const declList = node.getParent();
    if (!declList?.isKind(ts_morph_1.SyntaxKind.VariableDeclarationList))
        return false;
    // NodeFlags.Let = 1, NodeFlags.Const = 2. `var` has neither bit set.
    return (declList.getFlags() & 3) === 0;
}
// ---------------------------------------------------------------------------
// Misc predicates
// ---------------------------------------------------------------------------
function isNestedFunctionBoundary(child, root) {
    if (child === root)
        return false;
    return (child.isKind(ts_morph_1.SyntaxKind.FunctionDeclaration) ||
        child.isKind(ts_morph_1.SyntaxKind.FunctionExpression) ||
        child.isKind(ts_morph_1.SyntaxKind.ArrowFunction) ||
        child.isKind(ts_morph_1.SyntaxKind.MethodDeclaration));
}
function isFunctionLike(node) {
    return (node.isKind(ts_morph_1.SyntaxKind.FunctionDeclaration) ||
        node.isKind(ts_morph_1.SyntaxKind.FunctionExpression) ||
        node.isKind(ts_morph_1.SyntaxKind.MethodDeclaration) ||
        node.isKind(ts_morph_1.SyntaxKind.ArrowFunction));
}
function isWithinScope(identNode, scopeBoundary) {
    let current = identNode;
    while (current) {
        if (current === scopeBoundary)
            return true;
        current = current.getParent();
    }
    return false;
}
function isDeclarationName(ident) {
    const parent = ident.getParent();
    if (!parent)
        return false;
    if (parent.isKind(ts_morph_1.SyntaxKind.VariableDeclaration) &&
        parent.getNameNode() === ident) {
        return true;
    }
    if (parent.isKind(ts_morph_1.SyntaxKind.Parameter) &&
        parent.getNameNode() === ident) {
        return true;
    }
    if (parent.isKind(ts_morph_1.SyntaxKind.BindingElement) &&
        parent.getNameNode() === ident) {
        return true;
    }
    return false;
}
function isPropertyAccessName(ident) {
    const parent = ident.getParent();
    if (!parent?.isKind(ts_morph_1.SyntaxKind.PropertyAccessExpression))
        return false;
    // Skip only the right-hand `.b` — keep the left-hand receiver `a`.
    return (parent.getLastChild() === ident && parent.getFirstChild() !== ident);
}
function isPropertyAssignmentKey(ident) {
    const parent = ident.getParent();
    if (!parent?.isKind(ts_morph_1.SyntaxKind.PropertyAssignment))
        return false;
    return parent.getNameNode() === ident;
}
//# sourceMappingURL=defUseAnalysis.js.map