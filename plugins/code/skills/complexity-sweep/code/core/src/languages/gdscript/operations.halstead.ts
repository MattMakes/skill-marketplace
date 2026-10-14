// GDScript Halstead counts (design 9.5). Port of the semantic classification
// scheme of `metrics/halstead.ts`.
//
// - Operators: named nodes, keyed by the 9.5 table (a call is 1 `()`, an
//   attribute gives 1 `.` per member, an `if_statement` is `if`, ...).
//   Anonymous leaves are never counted on their own, so parentheses,
//   brackets, braces, commas and colons stay structural.
// - Operands: identifiers, declared names and literals. A whole string,
//   `string_name`, `node_path` or `get_node` path is 1 operand; the walk does
//   not descend into it.
// - Skipped: type-only syntax, comments, annotations, nested units and the
//   unit name. Lambdas count.

import { createNodeCache, sameNode, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import { isGdscriptFunction } from "./nodeTypes";

export interface GdscriptHalsteadCounts {
  operators: Map<string, number>;
  operands: Map<string, number>;
}

export interface GdscriptHalsteadDetail {
  n1: number;
  n2: number;
  N1: number;
  N2: number;
}

/**
 * Operand node types. `name` is the declared name of a `var`, a `const` and a
 * named lambda (the unit name is skipped apart).
 */
const OPERAND_TYPES: ReadonlySet<string> = new Set([
  "identifier",
  "name",
  "string",
  "string_name",
  "node_path",
  "integer",
  "float",
  "true",
  "false",
  "null",
]);

/** Subtrees that hold no operator or operand of the unit. */
const SKIPPED_TYPES: ReadonlySet<string> = new Set([
  "type",
  "inferred_type",
  "comment",
  "line_continuation",
  "annotation",
  "annotations",
  "region_start",
  "region_end",
]);

/** Named nodes that give exactly 1 operator with a fixed key. */
const FIXED_OPERATORS: ReadonlyMap<string, string> = new Map([
  ["assignment", "="],
  ["subscript", "[]"],
  ["attribute_subscript", "[]"],
  ["attribute_call", "()"],
  ["base_call", "()"],
  ["if_statement", "if"],
  ["else_clause", "else"],
  ["conditional_expression", "?:"],
  ["while_statement", "while"],
  ["match_statement", "match"],
  ["pattern_section", "case"],
  ["pattern_guard", "when"],
  ["return_statement", "return"],
  ["await_expression", "await"],
  ["lambda", "lambda"],
]);

/** Named nodes that give a fixed list of operators. */
const MULTI_OPERATORS: ReadonlyMap<string, readonly string[]> = new Map([
  ["elif_clause", ["else", "if"]],
  ["for_statement", ["for", "in"]],
]);

/** D8: `&&`, `||` and `!` are aliases of `and`, `or` and `not`. */
const OPERATOR_ALIASES: ReadonlyMap<string, string> = new Map([
  ["&&", "and"],
  ["||", "or"],
  ["!", "not"],
]);

const UNARY_KEYS: ReadonlyMap<string, string> = new Map([
  ["-", "unary-"],
  ["+", "unary+"],
  ["~", "~"],
  ["not", "not"],
  ["!", "not"],
]);

const countsCache = createNodeCache<GdscriptHalsteadCounts>();

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Anonymous tokens of a node joined by a space: `not in`, `is not`, `+=`. */
function anonymousText(node: SyntaxNode): string {
  const tokens: string[] = [];
  for (const child of node.children) {
    if (child !== null && !child.isNamed) tokens.push(child.type);
  }
  return tokens.join(" ");
}

/** Member children of an `attribute`: every named child after the first. */
function memberCount(node: SyntaxNode): number {
  const parts = node.namedChildren.filter(
    (child) => child !== null && !SKIPPED_TYPES.has(child.type),
  );
  return Math.max(0, parts.length - 1);
}

/** True for a `call` of `assert`: it gives `assert`, not `()`. */
function isAssertCall(node: SyntaxNode): boolean {
  const callee = node.namedChildren[0];
  return callee?.type === "identifier" && callee.text === "assert";
}

/** True for the type operand of `x as T`: TypeScript skips the cast type. */
function isCastType(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (parent?.type !== "binary_operator") return false;
  if (anonymousText(parent) !== "as") return false;
  return sameNode(parent.childForFieldName("right"), node);
}

/** The callee identifier of an `assert` call is the keyword, not an operand. */
function isAssertKeyword(node: SyntaxNode): boolean {
  const parent = node.parent;
  return parent?.type === "call" && isAssertCall(parent) && sameNode(parent.namedChildren[0] ?? null, node);
}

/** `var` or `const`, plus `=` when the declaration has a value (`:=` too). */
function countDeclaration(node: SyntaxNode, keyword: string, operators: Map<string, number>): void {
  increment(operators, keyword);
  if (node.childForFieldName("value") !== null) increment(operators, "=");
}

/** Operators of a named node by the 9.5 table. A structural node adds none. */
function classifyOperator(node: SyntaxNode, operators: Map<string, number>): void {
  const fixed = FIXED_OPERATORS.get(node.type);
  if (fixed !== undefined) {
    increment(operators, fixed);
    return;
  }
  const multi = MULTI_OPERATORS.get(node.type);
  if (multi !== undefined) {
    for (const key of multi) increment(operators, key);
    return;
  }
  switch (node.type) {
    case "variable_statement":
      countDeclaration(node, "var", operators);
      return;
    case "const_statement":
      countDeclaration(node, "const", operators);
      return;
    case "call":
      increment(operators, isAssertCall(node) ? "assert" : "()");
      return;
    case "attribute":
      for (let i = memberCount(node); i > 0; i--) increment(operators, ".");
      return;
    case "augmented_assignment":
    case "binary_operator": {
      const text = anonymousText(node);
      if (text !== "") increment(operators, OPERATOR_ALIASES.get(text) ?? text);
      return;
    }
    case "unary_operator": {
      const key = UNARY_KEYS.get(anonymousText(node));
      if (key !== undefined) increment(operators, key);
      return;
    }
  }
}

/**
 * Operator and operand multisets of a unit node. One walk per node; the 3
 * Halstead metrics share the cached result.
 *
 * Port notes (the design is silent):
 * - A declared `name` (`var x`, `const X`, a named lambda) is an operand, as a
 *   TypeScript declared identifier is. Without it, `var` parity with `let`
 *   fails.
 * - The type of `x as T` is skipped, as TypeScript skips the type of `as`.
 *   The `as` operator itself counts (design 9.5).
 * - A `get_node` gives `$` and 1 operand: its full text (`$Node`, `%Name`).
 * - A `pattern_binding` (`var z` in a match pattern) adds no operator; its
 *   identifier is an operand.
 */
export function collectGdscriptHalsteadCounts(fn: SyntaxNode): GdscriptHalsteadCounts {
  const cached = countsCache.get(fn);
  if (cached !== undefined) return cached;

  const operators = new Map<string, number>();
  const operands = new Map<string, number>();
  const unitName = fn.childForFieldName("name");

  walkDescendants(fn, (node) => {
    if (isGdscriptFunction(node)) return false;
    if (!node.isNamed) return false;
    if (SKIPPED_TYPES.has(node.type)) return false;
    if (sameNode(node, unitName)) return false;
    if (isCastType(node) || isAssertKeyword(node)) return false;

    if (node.type === "get_node") {
      increment(operators, "$");
      increment(operands, node.text);
      return false;
    }
    if (OPERAND_TYPES.has(node.type)) {
      increment(operands, node.text);
      return false;
    }
    classifyOperator(node, operators);
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

export function gdscriptHalsteadDetail(fn: SyntaxNode): GdscriptHalsteadDetail {
  const { operators, operands } = collectGdscriptHalsteadCounts(fn);
  return { n1: operators.size, n2: operands.size, N1: sum(operators), N2: sum(operands) };
}

export function halsteadVolumeOf(d: GdscriptHalsteadDetail): number {
  const n = d.n1 + d.n2;
  return n === 0 ? 0 : (d.N1 + d.N2) * Math.log2(n);
}

export function halsteadDifficultyOf(d: GdscriptHalsteadDetail): number {
  return d.n2 === 0 ? 0 : (d.n1 / 2) * (d.N2 / d.n2);
}
