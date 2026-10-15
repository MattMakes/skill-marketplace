"use strict";
// GDScript line metrics: the shared LOC rule (design 9.3, 5.10 row) and
// scope-depth line painting (design 9.3, 5.8 row). Port of
// `metrics/maintainabilityIndex.ts` (`countLoc`) and `metrics/scopeDepth.ts`
// (`computeLineDepths`).
//
// LOC rule: a line of the unit body counts when a code token starts on it or
// spans it. Blank lines, comment lines (`#` and `##`), `#region` and
// `#endregion` lines, brace-only lines and lines of nested units do not count.
// scopeDepthRatio and maintainabilityIndex use the same rule, so a line counts
// the same in both.
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdscriptCodeLines = gdscriptCodeLines;
exports.gdscriptScopeDepthStats = gdscriptScopeDepthStats;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
/** Statements whose `body` and clause bodies add 1 level each. */
const BLOCK_STATEMENT_TYPES = new Set([
    "if_statement",
    "for_statement",
    "while_statement",
]);
/** Clauses of an `if_statement`. Each clause body adds 1 level. */
const CLAUSE_TYPES = new Set(["elif_clause", "else_clause"]);
const MATCH_TYPE = "match_statement";
const LAMBDA_TYPE = "lambda";
/** Subtrees that hold no code line. */
const NON_CODE_TYPES = new Set(["comment", "region_start", "region_end"]);
/**
 * Whole tokens: the walk does not descend into them. A string is 1 token, so
 * each line of a multi-line string is a code line. `get_node` has anonymous
 * children (`$`, the path) but is 1 token in the source.
 */
const TOKEN_TYPES = new Set(["string", "string_name", "node_path", "get_node"]);
/** Token types whose lines are string content, never brace-only. */
const STRING_TYPES = new Set(["string", "string_name", "node_path"]);
const statsCache = (0, syntaxHelpers_1.createNodeCache)();
function addRange(lines, start, end) {
    for (let line = start; line <= end; line++)
        lines.add(line);
}
/** Blank text. A multi-line string can span a blank line. */
function isBlankLine(lineText) {
    return (lineText?.trim() ?? "") === "";
}
/** Brace-only text: a syntax line such as the `}` that closes a dictionary. */
function isBraceOnlyLine(lineText) {
    const trimmed = lineText?.trim() ?? "";
    return trimmed === "{" || trimmed === "}";
}
/**
 * 1-based code lines of a GDScript unit body, in ascending order. MI and
 * scopeDepthRatio share this helper.
 *
 * Port note: as in the Python port, the TypeScript text rule drops lines whose
 * trimmed text is `{` or `}`. A line inside a string node is string content,
 * so a `}` line there counts. A blank line there does not count.
 */
function gdscriptCodeLines(fn, sourceText) {
    const body = fn.childForFieldName("body");
    if (body === null)
        return [];
    const codeLines = new Set();
    const nestedLines = new Set();
    const stringLines = new Set();
    const visit = (node) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node)) {
            addRange(nestedLines, (0, syntaxHelpers_1.lineOf)(node), (0, syntaxHelpers_1.endLineOf)(node));
            return false;
        }
        if (NON_CODE_TYPES.has(node.type))
            return false;
        if (node.childCount === 0 || TOKEN_TYPES.has(node.type)) {
            if (node.startIndex !== node.endIndex) {
                addRange(codeLines, (0, syntaxHelpers_1.lineOf)(node), (0, syntaxHelpers_1.endLineOf)(node));
                if (STRING_TYPES.has(node.type))
                    addRange(stringLines, (0, syntaxHelpers_1.lineOf)(node), (0, syntaxHelpers_1.endLineOf)(node));
            }
            return false;
        }
        return true;
    };
    (0, syntaxHelpers_1.walkDescendants)(body, visit);
    const sourceLines = sourceText.split("\n");
    return [...codeLines]
        .filter((line) => !nestedLines.has(line))
        .filter((line) => !isBlankLine(sourceLines[line - 1]))
        .filter((line) => stringLines.has(line) || !isBraceOnlyLine(sourceLines[line - 1]))
        .sort((a, b) => a - b);
}
/**
 * Nesting depth for each line of a unit body. Each block statement paints its
 * full span at the current depth, then its bodies at depth + 1 (max wins, not
 * sum). Nested units need no painting: `gdscriptCodeLines` drops their lines.
 */
function computeLineDepths(fn) {
    const lineDepths = new Map();
    const paint = (node, depth) => {
        for (let line = (0, syntaxHelpers_1.lineOf)(node); line <= (0, syntaxHelpers_1.endLineOf)(node); line++) {
            const existing = lineDepths.get(line);
            if (existing === undefined || depth > existing)
                lineDepths.set(line, depth);
        }
    };
    const walkBody = (body, depth) => {
        for (const stmt of body.namedChildren) {
            if (stmt !== null && !NON_CODE_TYPES.has(stmt.type))
                walkStatement(stmt, depth);
        }
    };
    const walkFieldBody = (node, depth) => {
        const body = node.childForFieldName("body");
        if (body !== null)
            walkBody(body, depth);
    };
    // The TypeScript `switch` rule: the match spans the current depth, each
    // `pattern_section` (with its guard) spans depth + 1, and the section body
    // is at depth + 2. The match value stays at the current depth; a lambda in
    // it still adds its own level, as in an `if` condition.
    const walkMatch = (node, depth) => {
        paint(node, depth);
        scanForNestedStructures(node.childForFieldName("value"), depth);
        const matchBody = node.childForFieldName("body");
        for (const section of matchBody?.namedChildren ?? []) {
            if (section === null || section.type !== "pattern_section")
                continue;
            paint(section, depth + 1);
            walkFieldBody(section, depth + 2);
        }
    };
    // The `if` condition, the `for` iterable and the `while` condition stay at
    // the current depth; a lambda in them still adds its own level.
    const walkBlockStatement = (node, depth) => {
        paint(node, depth);
        for (const child of node.namedChildren) {
            if (child === null)
                continue;
            if (child.type === "body") {
                walkBody(child, depth + 1);
            }
            else if (CLAUSE_TYPES.has(child.type)) {
                scanForNestedStructures(child.childForFieldName("condition"), depth);
                walkFieldBody(child, depth + 1);
            }
            else {
                scanForNestedStructures(child, depth);
            }
        }
    };
    // As for a TypeScript arrow with a block body, the lambda body is walked at
    // depth + 1, so a lambda inside it adds 1 more level.
    const walkLambda = (node, depth) => {
        walkFieldBody(node, depth + 1);
    };
    const scanForNestedStructures = (node, depth) => {
        if (node === null)
            return;
        if (node.type === LAMBDA_TYPE)
            return walkLambda(node, depth);
        for (const child of node.namedChildren) {
            if (child === null || (0, nodeTypes_1.isGdscriptFunction)(child))
                continue;
            if (child.type === LAMBDA_TYPE || child.type === MATCH_TYPE || BLOCK_STATEMENT_TYPES.has(child.type)) {
                walkStatement(child, depth);
            }
            else {
                scanForNestedStructures(child, depth);
            }
        }
    };
    const walkStatement = (node, depth) => {
        if ((0, nodeTypes_1.isGdscriptFunction)(node))
            return;
        if (node.type === LAMBDA_TYPE)
            return walkLambda(node, depth);
        if (node.type === MATCH_TYPE)
            return walkMatch(node, depth);
        if (BLOCK_STATEMENT_TYPES.has(node.type))
            return walkBlockStatement(node, depth);
        paint(node, depth);
        scanForNestedStructures(node, depth);
    };
    walkFieldBody(fn, 0);
    return lineDepths;
}
/** Weighted LOC, raw LOC and their ratio. Cached: 2 metrics share it. */
function gdscriptScopeDepthStats(fn, sourceText) {
    const cached = statsCache.get(fn);
    if (cached !== undefined)
        return cached;
    const lineDepths = computeLineDepths(fn);
    let weightedLoc = 0;
    let rawLoc = 0;
    for (const line of gdscriptCodeLines(fn, sourceText)) {
        rawLoc += 1;
        weightedLoc += (lineDepths.get(line) ?? 0) + 1;
    }
    const stats = { weightedLoc, rawLoc, ratio: rawLoc > 0 ? weightedLoc / rawLoc : 0 };
    statsCache.set(fn, stats);
    return stats;
}
//# sourceMappingURL=operations.scopeDepth.js.map