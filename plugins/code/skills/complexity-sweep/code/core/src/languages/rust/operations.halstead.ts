// Rust Halstead token classification and shared per-function cache (design 5.9).
//
// Port of the semantic scheme of `metrics/halstead.ts`: named nodes give
// operators by the 5.9 table (a call is 1 `()`, a field access is 1 `.`,
// a `let_declaration` is `let`, ...). Anonymous leaves are not counted on
// their own, so braces, parentheses, brackets, commas, semicolons, colons
// and `->` stay structural. Macro token trees are the exception: their raw
// tokens are classified by text.

import { createNodeCache, sameNode, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import { isRustFunction } from "./nodeTypes";

export interface RustHalsteadDetail {
  n1: number;
  n2: number;
  N1: number;
  N2: number;
}

interface HalsteadCounts {
  operators: Map<string, number>;
  operands: Map<string, number>;
}

const countsCache = createNodeCache<HalsteadCounts>();

const TYPE_ONLY_TYPES: ReadonlySet<string> = new Set([
  "abstract_type", "array_type", "associated_type", "bounded_type", "bracketed_type",
  "dynamic_type", "empty_type", "function_type", "generic_type",
  "generic_type_with_turbofish", "higher_ranked_trait_bound", "impl_type",
  "macro_type", "never_type",
  "pointer_type", "primitive_type", "qualified_type", "reference_type",
  "removed_trait_bound", "scoped_type_identifier", "slice_type",
  "trait_bounds", "tuple_type", "type_arguments", "type_binding",
  "type_identifier", "type_parameter", "type_parameters", "unit_type",
  "where_clause", "where_predicate",
]);

/** Subtrees that hold no operator or operand of the unit. */
const SKIPPED_TYPES: ReadonlySet<string> = new Set([
  "lifetime", "lifetime_parameter", "attribute_item", "inner_attribute_item",
  "line_comment", "block_comment", "visibility_modifier",
]);

const LITERAL_TYPES: ReadonlySet<string> = new Set([
  "boolean_literal", "char_literal", "float_literal", "integer_literal",
  "raw_string_literal", "string_literal",
]);

const IDENTIFIER_TYPES: ReadonlySet<string> = new Set([
  "identifier", "field_identifier", "shorthand_field_identifier", "self",
]);

/** Named nodes that give exactly 1 operator with a fixed key. */
const FIXED_OPERATORS: ReadonlyMap<string, string> = new Map([
  ["assignment_expression", "="],
  ["field_expression", "."],
  ["scoped_identifier", "::"],
  ["index_expression", "[]"],
  ["call_expression", "()"],
  ["macro_invocation", "!()"],
  ["struct_expression", "struct{}"],
  ["let_condition", "let"],
  ["while_expression", "while"],
  ["loop_expression", "loop"],
  ["match_expression", "match"],
  ["match_arm", "=>"],
  ["try_expression", "?"],
  ["return_expression", "return"],
  ["await_expression", "await"],
  ["type_cast_expression", "as"],
  ["closure_expression", "closure"],
]);

const UNARY_KEYS: ReadonlyMap<string, string> = new Map([
  ["-", "unary-"],
  ["!", "!"],
  ["*", "unary*"],
]);

/**
 * Tokens of a macro token tree that are operators by text. They are the
 * operator and keyword tokens of the 5.9 table. Other punctuation is
 * structural.
 */
const MACRO_OPERATOR_TOKENS: ReadonlySet<string> = new Set([
  "=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=",
  "+", "-", "*", "/", "%", "==", "!=", "<", ">", "<=", ">=",
  "&&", "||", "!", "&", "|", "^", "<<", ">>",
  ".", "::", "..", "..=", "?", "=>",
  "as", "await", "else", "for", "if", "in", "let", "loop", "match", "return", "while",
]);

function increment(values: Map<string, number>, key: string): void {
  values.set(key, (values.get(key) ?? 0) + 1);
}

function isSkipped(node: SyntaxNode): boolean {
  return TYPE_ONLY_TYPES.has(node.type) || SKIPPED_TYPES.has(node.type);
}

function isLiteral(node: SyntaxNode): boolean {
  return LITERAL_TYPES.has(node.type) || node.type.endsWith("_literal");
}

/** True when `node` has an anonymous child with the text `token`. */
function hasToken(node: SyntaxNode, token: string): boolean {
  return node.children.some((child) => child !== null && !child.isNamed && child.type === token);
}

/** The first anonymous child whose text is in `tokens`, or null. */
function firstToken(node: SyntaxNode, tokens: ReadonlySet<string>): string | null {
  for (const child of node.children) {
    if (child !== null && !child.isNamed && tokens.has(child.type)) return child.type;
  }
  return null;
}

const RANGE_TOKENS: ReadonlySet<string> = new Set(["..", "..=", "..."]);

/** `let`, plus `=` with a value, plus `else` for let-else. */
function countLet(node: SyntaxNode, operators: Map<string, number>): void {
  increment(operators, "let");
  if (node.childForFieldName("value") !== null) increment(operators, "=");
  if (node.childForFieldName("alternative") !== null) increment(operators, "else");
}

/** Operators of a named node by the 5.9 table. A structural node adds none. */
function classifyOperator(node: SyntaxNode, operators: Map<string, number>): void {
  const fixed = FIXED_OPERATORS.get(node.type);
  if (fixed !== undefined) {
    increment(operators, fixed);
    return;
  }
  switch (node.type) {
    case "let_declaration":
      countLet(node, operators);
      return;
    case "compound_assignment_expr":
    case "binary_expression": {
      const operator = node.childForFieldName("operator");
      if (operator !== null) increment(operators, operator.type);
      return;
    }
    case "unary_expression": {
      const key = UNARY_KEYS.get(node.child(0)?.type ?? "");
      if (key !== undefined) increment(operators, key);
      return;
    }
    case "reference_expression":
      increment(operators, node.children.some((c) => c?.type === "mutable_specifier") ? "&mut" : "&");
      return;
    case "range_expression": {
      const token = firstToken(node, RANGE_TOKENS);
      if (token !== null) increment(operators, token);
      return;
    }
    case "if_expression":
      increment(operators, "if");
      if (node.childForFieldName("alternative") !== null) increment(operators, "else");
      return;
    case "for_expression":
      increment(operators, "for");
      increment(operators, "in");
      return;
    case "let_chain":
      // The `&&` tokens of `if let A = a && b` are anonymous children of the chain.
      for (const child of node.children) {
        if (child !== null && !child.isNamed && child.type === "&&") increment(operators, "&&");
      }
      return;
    case "match_pattern":
      // Port choice: a match guard is a conditional, so it maps to the `if` row of 5.9.
      if (hasToken(node, "if")) increment(operators, "if");
      return;
  }
}

/** Raw macro tokens: identifiers and literals are operands, operator tokens count by text. */
function classifyMacroToken(
  node: SyntaxNode,
  operators: Map<string, number>,
  operands: Map<string, number>,
): void {
  if (IDENTIFIER_TYPES.has(node.type) || isLiteral(node)) increment(operands, node.text);
  else if (!node.isNamed && MACRO_OPERATOR_TOKENS.has(node.type)) increment(operators, node.type);
}

function collectCounts(root: SyntaxNode): HalsteadCounts {
  const cached = countsCache.get(root);
  if (cached !== undefined) return cached;

  const operators = new Map<string, number>();
  const operands = new Map<string, number>();
  const name = root.childForFieldName("name");

  walkDescendants(root, (node) => {
    if (isRustFunction(node) || isSkipped(node)) return false;
    // The unit name is header syntax, like the TypeScript function name.
    if (sameNode(node, name)) return false;

    if (node.parent?.type === "token_tree" && node.type !== "token_tree") {
      classifyMacroToken(node, operators, operands);
      return false;
    }
    // Strings are one operand. Their quotes and contents do not become tokens.
    if (isLiteral(node)) {
      increment(operands, node.text);
      return false;
    }
    if (!node.isNamed) return false;
    if (IDENTIFIER_TYPES.has(node.type)) {
      increment(operands, node.text);
      return false;
    }
    classifyOperator(node, operators);
    return true;
  });

  const result = { operators, operands };
  countsCache.set(root, result);
  return result;
}

function detailFor(counts: HalsteadCounts): RustHalsteadDetail {
  let N1 = 0;
  let N2 = 0;
  for (const count of counts.operators.values()) N1 += count;
  for (const count of counts.operands.values()) N2 += count;
  return { n1: counts.operators.size, n2: counts.operands.size, N1, N2 };
}

export function computeRustHalstead(
  root: SyntaxNode,
  metric: "volume" | "difficulty" | "effort",
): { value: number; detail: RustHalsteadDetail } {
  const detail = detailFor(collectCounts(root));
  const vocabulary = detail.n1 + detail.n2;
  const length = detail.N1 + detail.N2;
  const volume = vocabulary === 0 ? 0 : length * Math.log2(vocabulary);
  const difficulty = detail.n2 === 0
    ? 0
    : (detail.n1 / 2) * (detail.N2 / detail.n2);
  const value = metric === "volume"
    ? volume
    : metric === "difficulty"
      ? difficulty
      : difficulty * volume;
  return { value, detail };
}
