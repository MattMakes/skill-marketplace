"use strict";
// Shared Rust logical-LOC and line-depth helpers.
Object.defineProperty(exports, "__esModule", { value: true });
exports.countRustLoc = countRustLoc;
exports.computeRustScopeDepthStats = computeRustScopeDepthStats;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
function functionBody(root) {
    return root.childForFieldName("body");
}
function addRange(ranges, node) {
    let start = (0, syntaxHelpers_1.lineOf)(node);
    let end = (0, syntaxHelpers_1.endLineOf)(node);
    if (node.type === "block" && start < end) {
        start += 1;
        end -= 1;
    }
    if (start <= end)
        ranges.push({ start, end });
}
function isBodyBlock(node, parent) {
    return parent.childForFieldName("body")?.id === node.id
        || parent.childForFieldName("consequence")?.id === node.id
        || (parent.type === "else_clause" && parent.namedChildren[0]?.id === node.id);
}
function collectDepthRanges(root) {
    const ranges = [];
    const ownerTypes = new Set([
        "if_expression", "while_expression", "for_expression", "loop_expression",
        "unsafe_block", "async_block", "closure_expression",
    ]);
    (0, syntaxHelpers_1.walkDescendants)(root, (node) => {
        if ((0, nodeTypes_1.isRustFunction)(node))
            return false;
        const parent = node.parent;
        if (parent === null)
            return;
        if (node.type === "block") {
            if (ownerTypes.has(parent.type) && isBodyBlock(node, parent)) {
                addRange(ranges, node);
            }
            else if (parent.type === "else_clause") {
                addRange(ranges, node);
            }
            else if (parent.type !== "function_item"
                && parent.type !== "match_arm"
                && parent.type !== "try_block"
                && parent.type !== "const_block"
                && parent.type !== "gen_block") {
                // A block not owned by another listed construct is a bare nested block.
                addRange(ranges, node);
            }
        }
        else if (node.type === "closure_expression") {
            const body = node.childForFieldName("body");
            if (body !== null && body.type !== "block")
                addRange(ranges, body);
        }
        else if (node.type === "match_arm") {
            // Rust match mirrors TypeScript switch: arm headers are one level in.
            ranges.push({ start: (0, syntaxHelpers_1.lineOf)(node), end: (0, syntaxHelpers_1.endLineOf)(node) });
            const value = node.childForFieldName("value");
            if (value !== null)
                addRange(ranges, value);
        }
    });
    return ranges;
}
function collectExcludedAndCommentLines(root, sourceLines) {
    const excluded = new Set();
    const comments = new Set();
    const commentColumns = new Map();
    (0, syntaxHelpers_1.walkDescendants)(root, (node) => {
        if ((0, nodeTypes_1.isRustFunction)(node)) {
            for (let line = (0, syntaxHelpers_1.lineOf)(node); line <= (0, syntaxHelpers_1.endLineOf)(node); line++)
                excluded.add(line);
            return false;
        }
        if (node.type === "line_comment" || node.type === "block_comment") {
            for (let line = (0, syntaxHelpers_1.lineOf)(node); line <= (0, syntaxHelpers_1.endLineOf)(node); line++) {
                const ranges = commentColumns.get(line) ?? [];
                ranges.push({
                    start: line === (0, syntaxHelpers_1.lineOf)(node) ? node.startPosition.column : 0,
                    end: line === (0, syntaxHelpers_1.endLineOf)(node)
                        ? node.endPosition.column
                        : (sourceLines[line - 1]?.length ?? 0),
                });
                commentColumns.set(line, ranges);
            }
            return false;
        }
    });
    for (const [line, ranges] of commentColumns) {
        let text = sourceLines[line - 1] ?? "";
        ranges.sort((left, right) => right.start - left.start);
        for (const range of ranges) {
            text = text.slice(0, range.start) + text.slice(range.end);
        }
        if (text.trim() === "")
            comments.add(line);
    }
    return { excluded, comments };
}
function bodyLineBounds(body) {
    let start = (0, syntaxHelpers_1.lineOf)(body);
    let end = (0, syntaxHelpers_1.endLineOf)(body);
    if (start < end) {
        start += 1;
        end -= 1;
    }
    return start <= end ? { start, end } : null;
}
function isBraceOnly(line) {
    return /^[{}]+;?$/.test(line.trim());
}
function executableLines(ctx) {
    const body = functionBody(ctx.node);
    if (body === null)
        return [];
    const bounds = bodyLineBounds(body);
    if (bounds === null)
        return [];
    const sourceLines = ctx.file.text.split("\n");
    const { excluded, comments } = collectExcludedAndCommentLines(body, sourceLines);
    if ((0, syntaxHelpers_1.lineOf)(body) === (0, syntaxHelpers_1.endLineOf)(body)) {
        const inner = body.text.startsWith("{") && body.text.endsWith("}")
            ? body.text.slice(1, -1).trim()
            : body.text.trim();
        const hasCodeChild = body.namedChildren.some((node) => node.type !== "line_comment" && node.type !== "block_comment");
        if (inner === "" || !hasCodeChild || excluded.has(bounds.start))
            return [];
        return [bounds.start];
    }
    const result = [];
    for (let line = bounds.start; line <= bounds.end; line++) {
        const text = sourceLines[line - 1]?.trim() ?? "";
        if (text === "" || isBraceOnly(text) || excluded.has(line) || comments.has(line))
            continue;
        result.push(line);
    }
    return result;
}
function countRustLoc(ctx) {
    return executableLines(ctx).length;
}
function computeRustScopeDepthStats(ctx) {
    const lines = executableLines(ctx);
    const ranges = collectDepthRanges(ctx.node);
    let weightedLoc = 0;
    for (const line of lines) {
        let depth = 0;
        for (const range of ranges) {
            if (line >= range.start && line <= range.end)
                depth += 1;
        }
        weightedLoc += depth + 1;
    }
    const rawLoc = lines.length;
    return {
        weightedLoc,
        rawLoc,
        ratio: rawLoc === 0 ? 0 : weightedLoc / rawLoc,
    };
}
//# sourceMappingURL=operations.scopeDepth.js.map