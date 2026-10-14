// Python Halstead counts (design 5.9). Port of the classification scheme of
// `metrics/halstead.ts` onto tree-sitter leaf tokens.
//
// - Operands: identifiers and literals. A whole string (f-strings included)
//   is 1 operand; the walk does not descend into it.
// - Operators: every other leaf token (keywords, operators, punctuation),
//   keyed by its token text. `not in` and `is not` are 1 operator each.
// - Skipped: type-only syntax, comments, nested units, and the unit header
//   tokens `async`, `def` and the function name (the TypeScript metric skips
//   the `function` keyword and the function name). Lambdas count.

import { createNodeCache, sameNode, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import { isPythonFunction } from "./nodeTypes";
import { pythonDocstring } from "./operations.scopeDepth";

export interface PythonHalsteadCounts {
  operators: Map<string, number>;
  operands: Map<string, number>;
}

export interface PythonHalsteadDetail {
  n1: number;
  n2: number;
  N1: number;
  N2: number;
}

const OPERAND_TYPES: ReadonlySet<string> = new Set([
  "identifier",
  "integer",
  "float",
  "true",
  "false",
  "none",
  "ellipsis",
  "string",
]);

/** Operator tokens that the grammar builds from 2 keyword leaves. */
const COMPOUND_OPERATOR_TYPES: ReadonlySet<string> = new Set(["not in", "is not"]);

/** Type-only subtrees, like the TypeScript TYPE_ONLY_KINDS. */
const TYPE_ONLY_TYPES: ReadonlySet<string> = new Set([
  "type",
  "type_parameter",
  "type_alias_statement",
]);

/** Leaves that are layout, not tokens of the program. */
const LAYOUT_TYPES: ReadonlySet<string> = new Set(["comment", "line_continuation"]);

const UNIT_HEADER_KEYWORDS: ReadonlySet<string> = new Set(["async", "def"]);

const countsCache = createNodeCache<PythonHalsteadCounts>();

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/**
 * True for type-only syntax: an annotation `type` node, a generic parameter
 * list, a `type X = ...` statement, the `->` token, and the `:` before an
 * annotation. The anonymous `type` keyword is not a type node.
 */
function isTypeSyntax(node: SyntaxNode): boolean {
  if (node.isNamed && TYPE_ONLY_TYPES.has(node.type)) return true;
  if (node.type === "->") return true;
  if (node.type === ":") {
    const next = node.nextSibling;
    return next !== null && next.isNamed && next.type === "type";
  }
  return false;
}

/** `async`, `def` and the name of the unit itself. */
function isUnitHeaderToken(node: SyntaxNode, fn: SyntaxNode): boolean {
  if (!sameNode(node.parent, fn)) return false;
  if (UNIT_HEADER_KEYWORDS.has(node.type)) return true;
  return sameNode(node, fn.childForFieldName("name"));
}

/**
 * Operator and operand multisets of a function node. One walk per node; the
 * 3 Halstead metrics share the cached result.
 *
 * Port note: the design is silent on the docstring. It is skipped here, like
 * a TypeScript JSDoc comment, because design 5.10 treats it as a comment.
 */
export function collectPythonHalsteadCounts(fn: SyntaxNode): PythonHalsteadCounts {
  const cached = countsCache.get(fn);
  if (cached !== undefined) return cached;

  const operators = new Map<string, number>();
  const operands = new Map<string, number>();
  const body = fn.childForFieldName("body");
  const docstring = body === null ? null : pythonDocstring(body);

  walkDescendants(fn, (node) => {
    if (isPythonFunction(node)) return false;
    if (isTypeSyntax(node)) return false;
    if (LAYOUT_TYPES.has(node.type)) return false;
    if (docstring !== null && sameNode(node, docstring)) return false;
    if (isUnitHeaderToken(node, fn)) return false;

    if (OPERAND_TYPES.has(node.type)) {
      increment(operands, node.text);
      return false;
    }
    if (COMPOUND_OPERATOR_TYPES.has(node.type)) {
      increment(operators, node.type);
      return false;
    }
    if (node.childCount === 0 && node.startIndex !== node.endIndex) {
      increment(operators, node.text);
    }
    return true;
  });

  const counts = { operators, operands };
  countsCache.set(fn, counts);
  return counts;
}

function sum(map: Map<string, number>): number {
  let total = 0;
  for (const count of map.values()) total += count;
  return total;
}

export function pythonHalsteadDetail(fn: SyntaxNode): PythonHalsteadDetail {
  const { operators, operands } = collectPythonHalsteadCounts(fn);
  return { n1: operators.size, n2: operands.size, N1: sum(operators), N2: sum(operands) };
}

export function halsteadVolumeOf(d: PythonHalsteadDetail): number {
  const n = d.n1 + d.n2;
  return n === 0 ? 0 : (d.N1 + d.N2) * Math.log2(n);
}

export function halsteadDifficultyOf(d: PythonHalsteadDetail): number {
  return d.n2 === 0 ? 0 : (d.n1 / 2) * (d.N2 / d.n2);
}
