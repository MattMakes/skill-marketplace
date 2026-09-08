"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintainabilityIndexDefinition = void 0;
exports.countLoc = countLoc;
exports.computeMaintainabilityIndex = computeMaintainabilityIndex;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
// ---------------------------------------------------------------------------
// Maintainability Index
// ---------------------------------------------------------------------------
//
// Composite metric combining Halstead Volume (V), Cyclomatic Complexity (CC),
// and logical lines of code (LOC) into a single 0-100 score. Originally
// Oman & Hagemeister (1991), normalized by SEI.
//
// Formula:
//   MI_raw = 171 - 5.2·ln(V) - 0.23·CC - 16.2·ln(LOC)
//   MI     = max(0, MI_raw · 100 / 171)
//
// Direction: lower-is-worse (100 = perfectly maintainable, 0 = unmaintainable).
// ---------------------------------------------------------------------------
const FUNCTION_BOUNDARY_KINDS = new Set([
    ts_morph_1.SyntaxKind.FunctionDeclaration,
    ts_morph_1.SyntaxKind.FunctionExpression,
    ts_morph_1.SyntaxKind.ArrowFunction,
    ts_morph_1.SyntaxKind.MethodDeclaration,
]);
/**
 * Count non-blank, non-comment, non-brace-only lines in a function body,
 * excluding any lines that fall inside nested functions.
 *
 * Per spec 05 §4.2 this belongs with Maintainability Index (NOT in
 * `utils/astHelpers`, which is shared library code).
 *
 * Behavior notes:
 * - Single-line body (`{}` or `{ x }` on one line): 0 or 1 based on content.
 * - Multi-line body: counts lines strictly interior to the body braces
 *   (`bodyStart+1 ... bodyEnd-1`), so the lines holding `{` and `}`
 *   themselves are intrinsically excluded.
 * - Block comments are tracked via a simple `inBlockComment` flag. This is a
 *   deliberately naive line-level classifier — mixed comment/code lines like
 *   `const x = 1; /* stuff *​/` are NOT specially handled; the current tests
 *   do not exercise that case.
 *
 * The `sourceFile` parameter is accepted for call-site symmetry with
 * other metric helpers; the implementation uses `node.getSourceFile()`
 * (which returns the same SourceFile in all tested configurations).
 */
function countLoc(fn, _sourceFile) {
    const body = getBody(fn);
    if (!body)
        return 0;
    const bodyStart = body.getStartLineNumber();
    const bodyEnd = body.getEndLineNumber();
    if (bodyStart === bodyEnd) {
        return countSingleLineBody(body);
    }
    const nestedRanges = collectNestedFunctionRanges(body);
    const allLines = fn.getSourceFile().getFullText().split("\n");
    let loc = 0;
    let inBlockComment = false;
    for (let lineNum = bodyStart + 1; lineNum < bodyEnd; lineNum++) {
        if (isInsideNested(lineNum, nestedRanges))
            continue;
        const lineText = allLines[lineNum - 1]; // 1-based → 0-based
        if (lineText === undefined)
            continue;
        const trimmed = lineText.trim();
        if (trimmed === "")
            continue;
        if (inBlockComment) {
            if (trimmed.includes("*/"))
                inBlockComment = false;
            continue;
        }
        if (trimmed.startsWith("/*")) {
            if (!trimmed.includes("*/"))
                inBlockComment = true;
            continue;
        }
        if (trimmed.startsWith("//"))
            continue;
        if (trimmed === "{" || trimmed === "}")
            continue;
        loc++;
    }
    return loc;
}
/** Walk the body collecting line ranges of nested functions; skip into them. */
function collectNestedFunctionRanges(body) {
    const ranges = [];
    body.forEachDescendant((child, traversal) => {
        if (FUNCTION_BOUNDARY_KINDS.has(child.getKind())) {
            ranges.push({
                start: child.getStartLineNumber(),
                end: child.getEndLineNumber(),
            });
            traversal.skip();
        }
    });
    return ranges;
}
function isInsideNested(lineNum, ranges) {
    for (const r of ranges) {
        if (lineNum >= r.start && lineNum <= r.end)
            return true;
    }
    return false;
}
/** Single-line body like `() => 1` or `function f() {}`. */
function countSingleLineBody(body) {
    const text = body.getText();
    // Block body: strip outer `{...}` to look at the interior.
    // Expression body (arrow `x => x + 1`): no braces to strip — the whole text
    // IS the expression; it counts as 1 LOC unless it's a comment (not possible
    // since a lone comment isn't a valid expression).
    const inner = text.startsWith("{") && text.endsWith("}")
        ? text.slice(1, -1).trim()
        : text.trim();
    if (inner === "")
        return 0;
    if (isCommentOnlyLine(inner))
        return 0;
    return 1;
}
function isCommentOnlyLine(trimmed) {
    if (trimmed.startsWith("//"))
        return true;
    if (trimmed.startsWith("/*") && trimmed.endsWith("*/"))
        return true;
    return false;
}
function getBody(node) {
    if (node.isKind(ts_morph_1.SyntaxKind.FunctionDeclaration))
        return node.getBody();
    if (node.isKind(ts_morph_1.SyntaxKind.MethodDeclaration))
        return node.getBody();
    if (node.isKind(ts_morph_1.SyntaxKind.FunctionExpression))
        return node.getBody();
    if (node.isKind(ts_morph_1.SyntaxKind.ArrowFunction))
        return node.getBody();
    return undefined;
}
// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------
/**
 * Guard choice: when `V <= 0` (empty function, no tokens) OR `LOC <= 0`
 * (empty body), we return 100 — i.e. "maximally maintainable". This is the
 * behavior of the reference implementation. Alternatives like NaN or 0 would
 * collide with the lower-is-worse threshold semantics; 100 keeps trivial
 * functions safely above any reasonable threshold.
 */
function computeMaintainabilityIndex(ctx) {
    const V = ctx.dependencyValues[registry_1.MetricKeys.halsteadVolume] ?? 0;
    const CC = ctx.dependencyValues[registry_1.MetricKeys.cyclomaticComplexity] ?? 1;
    const LOC = countLoc(ctx.node, ctx.sourceFile);
    if (V <= 0 || LOC <= 0)
        return 100;
    const raw = 171 - 5.2 * Math.log(V) - 0.23 * CC - 16.2 * Math.log(LOC);
    return Math.max(0, (raw * 100) / 171);
}
exports.maintainabilityIndexDefinition = {
    key: registry_1.MetricKeys.maintainabilityIndex,
    name: "Maintainability Index",
    shortCode: "MI",
    description: "Composite of Halstead Volume, cyclomatic complexity, and LOC (0-100, higher = more maintainable)",
    defaultThresholds: { warn: 60, error: 40 },
    direction: "lower-is-worse",
    dependencies: [registry_1.MetricKeys.halsteadVolume, registry_1.MetricKeys.cyclomaticComplexity],
    compute: (ctx) => computeMaintainabilityIndex(ctx),
};
//# sourceMappingURL=maintainabilityIndex.js.map