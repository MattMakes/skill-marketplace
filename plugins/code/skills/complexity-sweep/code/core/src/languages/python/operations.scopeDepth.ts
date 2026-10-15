// Python line metrics: the shared LOC rule (design 5.10) and scope-depth
// line painting (design 5.8). Port of `metrics/maintainabilityIndex.ts`
// (`countLoc`) and `metrics/scopeDepth.ts` (`computeLineDepths`).
//
// LOC rule: a line of the function body counts when a code token starts on
// it or spans it. Blank lines, comment lines, docstring lines, brace-only
// lines and lines of nested units do not count. scopeDepthRatio and
// maintainabilityIndex use the same rule, so a line counts the same in both.

import { createNodeCache, endLineOf, lineOf, sameNode, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import { isPythonFunction } from "./nodeTypes";

export interface PythonScopeDepthStats {
  weightedLoc: number;
  rawLoc: number;
  ratio: number;
}

/** Statements whose `block` children and clause blocks add 1 level each. */
const BLOCK_STATEMENT_TYPES: ReadonlySet<string> = new Set([
  "if_statement",
  "for_statement",
  "while_statement",
  "try_statement",
  "with_statement",
  "class_definition",
]);

/** Clauses of a block statement. Each clause body adds 1 level. */
const CLAUSE_TYPES: ReadonlySet<string> = new Set([
  "elif_clause",
  "else_clause",
  "except_clause",
  "finally_clause",
]);

const MATCH_TYPE = "match_statement";
const LAMBDA_TYPE = "lambda";

/** A whole string is 1 token: its content lines are code lines. */
const STRING_TYPES: ReadonlySet<string> = new Set(["string", "concatenated_string"]);

const statsCache = createNodeCache<PythonScopeDepthStats>();

/**
 * The docstring of a body: an `expression_statement` that holds only a string
 * and is the first statement. Returns null when the body has no docstring.
 */
export function pythonDocstring(body: SyntaxNode): SyntaxNode | null {
  const first = body.namedChildren.find((child) => child?.type !== "comment") ?? null;
  if (first === null || first.type !== "expression_statement") return null;
  const only = first.namedChildren.filter((child) => child?.type !== "comment");
  if (only.length !== 1 || !STRING_TYPES.has(only[0]?.type ?? "")) return null;
  return first;
}

function addRange(lines: Set<number>, start: number, end: number): void {
  for (let line = start; line <= end; line++) lines.add(line);
}

/** Blank text. A multi-line string can span a blank line. */
function isBlankLine(lineText: string | undefined): boolean {
  return (lineText?.trim() ?? "") === "";
}

/** Brace-only text: a syntax line such as the `}` that closes a dict literal. */
function isBraceOnlyLine(lineText: string | undefined): boolean {
  const trimmed = lineText?.trim() ?? "";
  return trimmed === "{" || trimmed === "}";
}

/**
 * 1-based code lines of a Python function body, in ascending order.
 *
 * Port note: the TypeScript rule drops lines whose trimmed text is `{` or
 * `}`. This port keeps that text rule for syntax lines, so a line with only
 * `}` that closes a dict literal does not count. A line with only `)` or `]`
 * counts, as in TypeScript. A line inside a string node is string content,
 * not syntax, so a `}` line there counts. A blank line there does not count.
 */
export function pythonCodeLines(fn: SyntaxNode, sourceText: string): number[] {
  const body = fn.childForFieldName("body");
  if (body === null) return [];

  const docstring = pythonDocstring(body);
  const codeLines = new Set<number>();
  const nestedLines = new Set<number>();
  const stringLines = new Set<number>();

  walkDescendants(body, (node) => {
    if (isPythonFunction(node)) {
      addRange(nestedLines, lineOf(node), endLineOf(node));
      return false;
    }
    if (node.type === "comment") return false;
    if (docstring !== null && sameNode(node, docstring)) return false;
    if (node.childCount === 0 || STRING_TYPES.has(node.type)) {
      if (node.startIndex !== node.endIndex) {
        addRange(codeLines, lineOf(node), endLineOf(node));
        if (STRING_TYPES.has(node.type)) addRange(stringLines, lineOf(node), endLineOf(node));
      }
      return false;
    }
    return true;
  });

  const sourceLines = sourceText.split("\n");
  return [...codeLines]
    .filter((line) => !nestedLines.has(line))
    .filter((line) => !isBlankLine(sourceLines[line - 1]))
    .filter((line) => stringLines.has(line) || !isBraceOnlyLine(sourceLines[line - 1]))
    .sort((a, b) => a - b);
}

/**
 * Nesting depth for each line of a function body. Each block statement paints
 * its full span at the current depth, then its bodies at depth + 1 (max wins).
 * Nested units need no painting: `pythonCodeLines` drops their lines.
 */
function computeLineDepths(fn: SyntaxNode): Map<number, number> {
  const lineDepths = new Map<number, number>();

  const paint = (node: SyntaxNode, depth: number): void => {
    for (let line = lineOf(node); line <= endLineOf(node); line++) {
      const existing = lineDepths.get(line);
      if (existing === undefined || depth > existing) lineDepths.set(line, depth);
    }
  };

  const walkBlock = (block: SyntaxNode, depth: number): void => {
    for (const stmt of block.namedChildren) {
      if (stmt !== null && stmt.type !== "comment") walkStatement(stmt, depth);
    }
  };

  // The TypeScript `switch` rule: the match spans the current depth, each
  // `case` spans depth + 1, and the case body is at depth + 2.
  const walkMatch = (node: SyntaxNode, depth: number): void => {
    paint(node, depth);
    const body = node.childForFieldName("body");
    for (const clause of body?.namedChildren ?? []) {
      if (clause === null || clause.type !== "case_clause") continue;
      paint(clause, depth + 1);
      const consequence = clause.childForFieldName("consequence");
      if (consequence !== null) walkBlock(consequence, depth + 2);
    }
  };

  const walkBlockStatement = (node: SyntaxNode, depth: number): void => {
    paint(node, depth);
    for (const child of node.namedChildren) {
      if (child === null) continue;
      if (child.type === "block") {
        walkBlock(child, depth + 1);
      } else if (CLAUSE_TYPES.has(child.type)) {
        for (const clauseChild of child.namedChildren) {
          if (clauseChild?.type === "block") walkBlock(clauseChild, depth + 1);
        }
      }
    }
  };

  // As for a TypeScript arrow with an expression body, the lambda body is
  // painted at depth + 1. The body is then walked at that depth, so a lambda
  // inside it adds 1 more level.
  const walkLambda = (node: SyntaxNode, depth: number): void => {
    const body = node.childForFieldName("body");
    if (body !== null) walkStatement(body, depth + 1);
  };

  const scanForNestedStructures = (node: SyntaxNode, depth: number): void => {
    for (const child of node.namedChildren) {
      if (child === null || isPythonFunction(child)) continue;
      if (child.type === LAMBDA_TYPE || child.type === MATCH_TYPE || BLOCK_STATEMENT_TYPES.has(child.type)) {
        walkStatement(child, depth);
      } else {
        scanForNestedStructures(child, depth);
      }
    }
  };

  const walkStatement = (node: SyntaxNode, depth: number): void => {
    if (isPythonFunction(node)) return;
    if (node.type === LAMBDA_TYPE) return walkLambda(node, depth);
    if (node.type === MATCH_TYPE) return walkMatch(node, depth);
    if (BLOCK_STATEMENT_TYPES.has(node.type)) return walkBlockStatement(node, depth);
    paint(node, depth);
    scanForNestedStructures(node, depth);
  };

  const body = fn.childForFieldName("body");
  if (body !== null) walkBlock(body, 0);
  return lineDepths;
}

/** Weighted LOC, raw LOC and their ratio. Cached: 2 metrics share it. */
export function pythonScopeDepthStats(fn: SyntaxNode, sourceText: string): PythonScopeDepthStats {
  const cached = statsCache.get(fn);
  if (cached !== undefined) return cached;

  const lineDepths = computeLineDepths(fn);
  let weightedLoc = 0;
  let rawLoc = 0;
  for (const line of pythonCodeLines(fn, sourceText)) {
    rawLoc += 1;
    weightedLoc += (lineDepths.get(line) ?? 0) + 1;
  }
  const stats = { weightedLoc, rawLoc, ratio: rawLoc > 0 ? weightedLoc / rawLoc : 0 };
  statsCache.set(fn, stats);
  return stats;
}
