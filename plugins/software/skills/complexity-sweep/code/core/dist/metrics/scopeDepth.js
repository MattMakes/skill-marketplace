"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scopeDepthRatioDefinition = exports.scopeDepthWeightedLocDefinition = void 0;
exports.computeScopeDepthStats = computeScopeDepthStats;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
/**
 * Nested function boundary for scope-depth only:
 *
 *   FunctionDeclaration, FunctionExpression, MethodDeclaration are excluded
 *   (their lines are added to `excludedLines` and they are analyzed as their
 *   own units). ArrowFunction is intentionally NOT a boundary — arrow
 *   callbacks add depth, which is the whole point of the metric.
 */
function isNestedFunctionBoundary(child, root) {
    if (child === root)
        return false;
    return (child.isKind(ts_morph_1.SyntaxKind.FunctionDeclaration) ||
        child.isKind(ts_morph_1.SyntaxKind.FunctionExpression) ||
        child.isKind(ts_morph_1.SyntaxKind.MethodDeclaration));
}
function isBlankOrCommentLine(lineText) {
    const trimmed = lineText.trim();
    if (trimmed === "")
        return true;
    if (trimmed.startsWith("//"))
        return true;
    if (trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("*/")) {
        return true;
    }
    return false;
}
function getBody(node) {
    if (node.isKind(ts_morph_1.SyntaxKind.FunctionDeclaration) ||
        node.isKind(ts_morph_1.SyntaxKind.MethodDeclaration) ||
        node.isKind(ts_morph_1.SyntaxKind.FunctionExpression)) {
        return node.getBody();
    }
    if (node.isKind(ts_morph_1.SyntaxKind.ArrowFunction)) {
        return node.getBody();
    }
    return undefined;
}
/**
 * Compute nesting depth for each line in a function body.
 *
 * Strategy: each control-flow statement paints its full span at the CURRENT
 * depth (so header + braces stay at the outer depth); then its body is
 * recursed at depth+1 which overrides inner lines (max wins in
 * `setLineDepth`). Nested functions are excluded by line range.
 */
function computeLineDepths(root) {
    const lineDepths = new Map();
    const excludedLines = new Set();
    const setLineDepth = (line, depth) => {
        const existing = lineDepths.get(line);
        if (existing === undefined || depth > existing) {
            lineDepths.set(line, depth);
        }
    };
    const setLineRange = (start, end, depth) => {
        for (let l = start; l <= end; l++)
            setLineDepth(l, depth);
    };
    const excludeRange = (start, end) => {
        for (let l = start; l <= end; l++)
            excludedLines.add(l);
    };
    const walkBlockStatements = (block, depth) => {
        if (block.isKind(ts_morph_1.SyntaxKind.Block)) {
            for (const stmt of block.getStatements()) {
                walkStatement(stmt, depth);
            }
        }
    };
    const walkStatement = (node, currentDepth) => {
        if (isNestedFunctionBoundary(node, root)) {
            excludeRange(node.getStartLineNumber(), node.getEndLineNumber());
            return;
        }
        if (node.isKind(ts_morph_1.SyntaxKind.ArrowFunction) && node !== root) {
            const arrowBody = node.getBody();
            if (arrowBody.isKind(ts_morph_1.SyntaxKind.Block)) {
                walkBlockStatements(arrowBody, currentDepth + 1);
            }
            else {
                setLineRange(arrowBody.getStartLineNumber(), arrowBody.getEndLineNumber(), currentDepth + 1);
            }
            return;
        }
        if (node.isKind(ts_morph_1.SyntaxKind.IfStatement)) {
            setLineRange(node.getStartLineNumber(), node.getEndLineNumber(), currentDepth);
            const thenStmt = node.getThenStatement();
            if (thenStmt.isKind(ts_morph_1.SyntaxKind.Block)) {
                walkBlockStatements(thenStmt, currentDepth + 1);
            }
            else {
                walkStatement(thenStmt, currentDepth + 1);
            }
            const elseStmt = node.getElseStatement();
            if (elseStmt) {
                if (elseStmt.isKind(ts_morph_1.SyntaxKind.IfStatement)) {
                    walkStatement(elseStmt, currentDepth);
                }
                else if (elseStmt.isKind(ts_morph_1.SyntaxKind.Block)) {
                    walkBlockStatements(elseStmt, currentDepth + 1);
                }
                else {
                    walkStatement(elseStmt, currentDepth + 1);
                }
            }
            return;
        }
        if (node.isKind(ts_morph_1.SyntaxKind.ForStatement) ||
            node.isKind(ts_morph_1.SyntaxKind.ForInStatement) ||
            node.isKind(ts_morph_1.SyntaxKind.ForOfStatement) ||
            node.isKind(ts_morph_1.SyntaxKind.WhileStatement)) {
            setLineRange(node.getStartLineNumber(), node.getEndLineNumber(), currentDepth);
            const stmt = node.getStatement();
            if (stmt.isKind(ts_morph_1.SyntaxKind.Block)) {
                walkBlockStatements(stmt, currentDepth + 1);
            }
            else {
                walkStatement(stmt, currentDepth + 1);
            }
            return;
        }
        if (node.isKind(ts_morph_1.SyntaxKind.DoStatement)) {
            setLineRange(node.getStartLineNumber(), node.getEndLineNumber(), currentDepth);
            const stmt = node.getStatement();
            if (stmt.isKind(ts_morph_1.SyntaxKind.Block)) {
                walkBlockStatements(stmt, currentDepth + 1);
            }
            else {
                walkStatement(stmt, currentDepth + 1);
            }
            return;
        }
        if (node.isKind(ts_morph_1.SyntaxKind.SwitchStatement)) {
            setLineRange(node.getStartLineNumber(), node.getEndLineNumber(), currentDepth);
            for (const clause of node.getClauses()) {
                setLineRange(clause.getStartLineNumber(), clause.getEndLineNumber(), currentDepth + 1);
                for (const stmt of clause.getStatements()) {
                    walkStatement(stmt, currentDepth + 2);
                }
            }
            return;
        }
        if (node.isKind(ts_morph_1.SyntaxKind.TryStatement)) {
            setLineRange(node.getStartLineNumber(), node.getEndLineNumber(), currentDepth);
            const tryBlock = node.getTryBlock();
            walkBlockStatements(tryBlock, currentDepth + 1);
            const catchClause = node.getCatchClause();
            if (catchClause) {
                walkBlockStatements(catchClause.getBlock(), currentDepth + 1);
            }
            const finallyBlock = node.getFinallyBlock();
            if (finallyBlock) {
                walkBlockStatements(finallyBlock, currentDepth + 1);
            }
            return;
        }
        // Fallthrough: paint at currentDepth, then scan for nested structures.
        setLineRange(node.getStartLineNumber(), node.getEndLineNumber(), currentDepth);
        scanForNestedStructures(node, currentDepth);
    };
    const scanForNestedStructures = (node, currentDepth) => {
        node.forEachChild((child) => {
            if (isNestedFunctionBoundary(child, root)) {
                excludeRange(child.getStartLineNumber(), child.getEndLineNumber());
                return;
            }
            if (child.isKind(ts_morph_1.SyntaxKind.ArrowFunction) && child !== root) {
                walkStatement(child, currentDepth);
                return;
            }
            if (child.isKind(ts_morph_1.SyntaxKind.IfStatement) ||
                child.isKind(ts_morph_1.SyntaxKind.ForStatement) ||
                child.isKind(ts_morph_1.SyntaxKind.ForInStatement) ||
                child.isKind(ts_morph_1.SyntaxKind.ForOfStatement) ||
                child.isKind(ts_morph_1.SyntaxKind.WhileStatement) ||
                child.isKind(ts_morph_1.SyntaxKind.DoStatement) ||
                child.isKind(ts_morph_1.SyntaxKind.SwitchStatement) ||
                child.isKind(ts_morph_1.SyntaxKind.TryStatement)) {
                walkStatement(child, currentDepth);
                return;
            }
            scanForNestedStructures(child, currentDepth);
        });
    };
    const body = getBody(root);
    if (!body)
        return { lineDepths, excludedLines };
    if (body.isKind(ts_morph_1.SyntaxKind.Block)) {
        for (const stmt of body.getStatements()) {
            walkStatement(stmt, 0);
        }
    }
    else {
        setLineRange(body.getStartLineNumber(), body.getEndLineNumber(), 0);
    }
    return { lineDepths, excludedLines };
}
function computeScopeDepthStats(ctx) {
    const body = getBody(ctx.node);
    if (!body)
        return { weightedLoc: 0, rawLoc: 0, ratio: 0 };
    const { lineDepths, excludedLines } = computeLineDepths(ctx.node);
    const bodyStart = body.getStartLineNumber();
    const bodyEnd = body.getEndLineNumber();
    // Block bodies exclude the function's own opening `{` and closing `}` lines.
    let startLine = bodyStart;
    let endLine = bodyEnd;
    if (body.isKind(ts_morph_1.SyntaxKind.Block)) {
        startLine = bodyStart + 1;
        endLine = bodyEnd - 1;
    }
    if (startLine > endLine)
        return { weightedLoc: 0, rawLoc: 0, ratio: 0 };
    const lines = ctx.sourceFile.getFullText().split("\n");
    let weightedLoc = 0;
    let rawLoc = 0;
    for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
        if (excludedLines.has(lineNum))
            continue;
        const lineIndex = lineNum - 1;
        if (lineIndex < 0 || lineIndex >= lines.length)
            continue;
        const lineText = lines[lineIndex];
        if (lineText === undefined)
            continue;
        if (isBlankOrCommentLine(lineText))
            continue;
        rawLoc += 1;
        const depth = lineDepths.get(lineNum) ?? 0;
        weightedLoc += depth + 1;
    }
    const ratio = rawLoc > 0 ? weightedLoc / rawLoc : 0;
    return { weightedLoc, rawLoc, ratio };
}
exports.scopeDepthWeightedLocDefinition = {
    key: registry_1.MetricKeys.scopeDepthWeightedLoc,
    name: "Scope-Depth Weighted LOC",
    shortCode: "SDWL",
    description: "Sum of (nesting depth + 1) for each non-blank, non-comment line",
    defaultThresholds: { warn: 45, error: 70 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeScopeDepthStats(ctx).weightedLoc,
};
// NOTE: test-asserted thresholds win over source per task policy.
// Compiled source had { warn: 1.7, error: 2.0 }; we honor tests' 1.3 / 1.5.
exports.scopeDepthRatioDefinition = {
    key: registry_1.MetricKeys.scopeDepthRatio,
    name: "Scope-Depth Ratio",
    shortCode: "SDR",
    description: "Ratio of weighted LOC to raw LOC (higher = more nesting)",
    defaultThresholds: { warn: 1.3, error: 1.5 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => computeScopeDepthStats(ctx).ratio,
};
exports.default = exports.scopeDepthWeightedLocDefinition;
//# sourceMappingURL=scopeDepth.js.map