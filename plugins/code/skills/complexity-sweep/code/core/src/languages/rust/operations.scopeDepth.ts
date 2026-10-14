// Shared Rust logical-LOC and line-depth helpers.

import { endLineOf, lineOf, walkDescendants } from "../syntaxHelpers";
import type { SyntaxMetricContext, SyntaxNode } from "../types";
import { isRustFunction } from "./nodeTypes";

interface LineRange {
  start: number;
  end: number;
}

interface ScopeDepthStats {
  weightedLoc: number;
  rawLoc: number;
  ratio: number;
}

function functionBody(root: SyntaxNode): SyntaxNode | null {
  return root.childForFieldName("body");
}

function addRange(ranges: LineRange[], node: SyntaxNode): void {
  let start = lineOf(node);
  let end = endLineOf(node);
  if (node.type === "block" && start < end) {
    start += 1;
    end -= 1;
  }
  if (start <= end) ranges.push({ start, end });
}

function isBodyBlock(node: SyntaxNode, parent: SyntaxNode): boolean {
  return parent.childForFieldName("body")?.id === node.id
    || parent.childForFieldName("consequence")?.id === node.id
    || (parent.type === "else_clause" && parent.namedChildren[0]?.id === node.id);
}

function collectDepthRanges(root: SyntaxNode): LineRange[] {
  const ranges: LineRange[] = [];
  const ownerTypes = new Set([
    "if_expression", "while_expression", "for_expression", "loop_expression",
    "unsafe_block", "async_block", "closure_expression",
  ]);
  walkDescendants(root, (node) => {
    if (isRustFunction(node)) return false;
    const parent = node.parent;
    if (parent === null) return;

    if (node.type === "block") {
      if (ownerTypes.has(parent.type) && isBodyBlock(node, parent)) {
        addRange(ranges, node);
      } else if (parent.type === "else_clause") {
        addRange(ranges, node);
      } else if (
        parent.type !== "function_item"
        && parent.type !== "match_arm"
        && parent.type !== "try_block"
        && parent.type !== "const_block"
        && parent.type !== "gen_block"
      ) {
        // A block not owned by another listed construct is a bare nested block.
        addRange(ranges, node);
      }
    } else if (node.type === "closure_expression") {
      const body = node.childForFieldName("body");
      if (body !== null && body.type !== "block") addRange(ranges, body);
    } else if (node.type === "match_arm") {
      // Rust match mirrors TypeScript switch: arm headers are one level in.
      ranges.push({ start: lineOf(node), end: endLineOf(node) });
      const value = node.childForFieldName("value");
      if (value !== null) addRange(ranges, value);
    }
  });
  return ranges;
}

interface ColumnRange {
  start: number;
  end: number;
}

function collectExcludedAndCommentLines(
  root: SyntaxNode,
  sourceLines: readonly string[],
): {
  excluded: Set<number>;
  comments: Set<number>;
} {
  const excluded = new Set<number>();
  const comments = new Set<number>();
  const commentColumns = new Map<number, ColumnRange[]>();
  walkDescendants(root, (node) => {
    if (isRustFunction(node)) {
      for (let line = lineOf(node); line <= endLineOf(node); line++) excluded.add(line);
      return false;
    }
    if (node.type === "line_comment" || node.type === "block_comment") {
      for (let line = lineOf(node); line <= endLineOf(node); line++) {
        const ranges = commentColumns.get(line) ?? [];
        ranges.push({
          start: line === lineOf(node) ? node.startPosition.column : 0,
          end: line === endLineOf(node)
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
    if (text.trim() === "") comments.add(line);
  }
  return { excluded, comments };
}

function bodyLineBounds(body: SyntaxNode): LineRange | null {
  let start = lineOf(body);
  let end = endLineOf(body);
  if (start < end) {
    start += 1;
    end -= 1;
  }
  return start <= end ? { start, end } : null;
}

function isBraceOnly(line: string): boolean {
  return /^[{}]+;?$/.test(line.trim());
}

function executableLines(ctx: SyntaxMetricContext): number[] {
  const body = functionBody(ctx.node);
  if (body === null) return [];
  const bounds = bodyLineBounds(body);
  if (bounds === null) return [];
  const sourceLines = ctx.file.text.split("\n");
  const { excluded, comments } = collectExcludedAndCommentLines(body, sourceLines);
  if (lineOf(body) === endLineOf(body)) {
    const inner = body.text.startsWith("{") && body.text.endsWith("}")
      ? body.text.slice(1, -1).trim()
      : body.text.trim();
    const hasCodeChild = body.namedChildren.some((node) =>
      node.type !== "line_comment" && node.type !== "block_comment"
    );
    if (inner === "" || !hasCodeChild || excluded.has(bounds.start)) return [];
    return [bounds.start];
  }
  const result: number[] = [];
  for (let line = bounds.start; line <= bounds.end; line++) {
    const text = sourceLines[line - 1]?.trim() ?? "";
    if (text === "" || isBraceOnly(text) || excluded.has(line) || comments.has(line)) continue;
    result.push(line);
  }
  return result;
}

export function countRustLoc(ctx: SyntaxMetricContext): number {
  return executableLines(ctx).length;
}

export function computeRustScopeDepthStats(ctx: SyntaxMetricContext): ScopeDepthStats {
  const lines = executableLines(ctx);
  const ranges = collectDepthRanges(ctx.node);
  let weightedLoc = 0;
  for (const line of lines) {
    let depth = 0;
    for (const range of ranges) {
      if (line >= range.start && line <= range.end) depth += 1;
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
