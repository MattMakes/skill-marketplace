// Shared Rust logical-LOC and line-depth helpers.

import { endLineOf, lineOf, walkDescendants } from "../syntaxHelpers";
import type { SyntaxMetricContext, SyntaxNode } from "../types";
import { isRustFunction } from "./nodeTypes";

interface LineRange {
  start: number;
  end: number;
}

/** A depth range with the nesting level of its owner node (1 is outermost). */
interface LeveledRange extends LineRange {
  level: number;
}

interface ScopeDepthStats {
  weightedLoc: number;
  rawLoc: number;
  ratio: number;
}

function functionBody(root: SyntaxNode): SyntaxNode | null {
  return root.childForFieldName("body");
}

function blockLines(node: SyntaxNode): LineRange | null {
  let start = lineOf(node);
  let end = endLineOf(node);
  if (node.type === "block" && start < end) {
    start += 1;
    end -= 1;
  }
  return start <= end ? { start, end } : null;
}

function isBodyBlock(node: SyntaxNode, parent: SyntaxNode): boolean {
  return parent.childForFieldName("body")?.id === node.id
    || parent.childForFieldName("consequence")?.id === node.id
    || (parent.type === "else_clause" && parent.namedChildren[0]?.id === node.id);
}

const DEPTH_OWNER_TYPES: ReadonlySet<string> = new Set([
  "if_expression", "while_expression", "for_expression", "loop_expression",
  "unsafe_block", "async_block", "closure_expression",
]);

/** The line range that `node` adds 1 depth level to, or null. */
function depthRangeOf(node: SyntaxNode, parent: SyntaxNode): LineRange | null {
  if (node.type === "block") {
    if (DEPTH_OWNER_TYPES.has(parent.type) && isBodyBlock(node, parent)) {
      return blockLines(node);
    }
    if (parent.type === "else_clause") return blockLines(node);
    if (parent.type === "match_arm") {
      // The value of an arm is a block; it adds a level inside the arm.
      return parent.childForFieldName("value")?.id === node.id
        ? blockLines(node)
        : null;
    }
    if (
      parent.type !== "function_item"
      && parent.type !== "try_block"
      && parent.type !== "const_block"
      && parent.type !== "gen_block"
    ) {
      // A block not owned by another listed construct is a bare nested block.
      return blockLines(node);
    }
    return null;
  }
  if (node.type === "match_arm") {
    // Rust match mirrors TypeScript switch: arm headers are one level in.
    return { start: lineOf(node), end: endLineOf(node) };
  }
  if (parent.type === "match_arm" && parent.childForFieldName("value")?.id === node.id) {
    return blockLines(node);
  }
  if (parent.type === "closure_expression" && parent.childForFieldName("body")?.id === node.id) {
    return blockLines(node);
  }
  return null;
}

/**
 * Depth ranges of a unit. Each range has the nesting level of its owner: the
 * number of owner nodes above it, itself included. 2 sibling blocks on 1 line
 * both get level 1, so `setLineDepth` can take the maximum per line (F2).
 */
function collectDepthRanges(root: SyntaxNode): LeveledRange[] {
  const ranges: LeveledRange[] = [];
  const visit = (node: SyntaxNode, parent: SyntaxNode, level: number): void => {
    if (isRustFunction(node)) return;
    const range = depthRangeOf(node, parent);
    let childLevel = level;
    if (range !== null) {
      childLevel = level + 1;
      ranges.push({ ...range, level: childLevel });
    }
    for (const child of node.namedChildren) visit(child, node, childLevel);
  };
  for (const child of root.namedChildren) visit(child, root, 0);
  return ranges;
}

interface ColumnRange {
  start: number;
  end: number;
}

/** String nodes whose lines hold string content, never syntax (F13). */
const STRING_TYPES: ReadonlySet<string> = new Set([
  "string_literal",
  "raw_string_literal",
]);

/**
 * The `attribute_item` lines above a nested `fn` belong to the nested unit
 * (F10). Comments can sit between the attributes and the `fn`.
 */
function excludeLeadingAttributes(fn: SyntaxNode, excluded: Set<number>): void {
  let sibling = fn.previousNamedSibling;
  while (sibling !== null) {
    if (sibling.type === "attribute_item") {
      for (let line = lineOf(sibling); line <= endLineOf(sibling); line++) {
        excluded.add(line);
      }
    } else if (sibling.type !== "line_comment" && sibling.type !== "block_comment") {
      break;
    }
    sibling = sibling.previousNamedSibling;
  }
}

function collectExcludedAndCommentLines(
  root: SyntaxNode,
  sourceLines: readonly string[],
): {
  excluded: Set<number>;
  comments: Set<number>;
  stringLines: Set<number>;
} {
  const excluded = new Set<number>();
  const comments = new Set<number>();
  const stringLines = new Set<number>();
  const commentColumns = new Map<number, ColumnRange[]>();
  walkDescendants(root, (node) => {
    if (isRustFunction(node)) {
      for (let line = lineOf(node); line <= endLineOf(node); line++) excluded.add(line);
      excludeLeadingAttributes(node, excluded);
      return false;
    }
    if (STRING_TYPES.has(node.type)) {
      if (lineOf(node) < endLineOf(node)) {
        for (let line = lineOf(node); line <= endLineOf(node); line++) stringLines.add(line);
      }
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
  return { excluded, comments, stringLines };
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

/** Brace-only text such as `}`, `};` or `},`. */
function isBraceOnly(line: string): boolean {
  return /^[{}]+[;,]?$/.test(line.trim());
}

function executableLines(ctx: SyntaxMetricContext): number[] {
  const body = functionBody(ctx.node);
  if (body === null) return [];
  const bounds = bodyLineBounds(body);
  if (bounds === null) return [];
  const sourceLines = ctx.file.text.split("\n");
  const { excluded, comments, stringLines } = collectExcludedAndCommentLines(
    body,
    sourceLines,
  );
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
    if (text === "" || excluded.has(line) || comments.has(line)) continue;
    if (isBraceOnly(text) && !stringLines.has(line)) continue;
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
    // A line has the depth of the deepest range that holds it (F2).
    let depth = 0;
    for (const range of ranges) {
      if (line >= range.start && line <= range.end && range.level > depth) {
        depth = range.level;
      }
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
