// Rust Halstead token classification and shared per-function cache.

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

const LITERAL_TYPES: ReadonlySet<string> = new Set([
  "boolean_literal", "char_literal", "float_literal", "integer_literal",
  "raw_string_literal", "string_literal",
]);

function increment(values: Map<string, number>, key: string): void {
  values.set(key, (values.get(key) ?? 0) + 1);
}

function isTypeOnly(node: SyntaxNode): boolean {
  return TYPE_ONLY_TYPES.has(node.type)
    || node.type === "lifetime"
    || node.type === "lifetime_parameter"
    || node.type === "attribute_item"
    || node.type === "line_comment"
    || node.type === "block_comment";
}

function isOperand(node: SyntaxNode): boolean {
  return node.type === "identifier"
    || node.type === "field_identifier"
    || node.type === "self"
    || LITERAL_TYPES.has(node.type)
    || node.type.endsWith("_literal");
}

/**
 * True for the direct children of the unit that form its header: the `fn`
 * token, the name, a `visibility_modifier` and a `function_modifiers`. The
 * TypeScript metric skips the `function` keyword and the name, and the Python
 * metric skips `async`, `def` and the name.
 */
function isUnitHeader(node: SyntaxNode, unit: SyntaxNode): boolean {
  if (!sameNode(node.parent, unit)) return false;
  if (node.type === "fn" || node.type === "visibility_modifier") return true;
  if (node.type === "function_modifiers") return true;
  return sameNode(node, unit.childForFieldName("name"));
}

function collectCounts(root: SyntaxNode): HalsteadCounts {
  const cached = countsCache.get(root);
  if (cached !== undefined) return cached;

  const operators = new Map<string, number>();
  const operands = new Map<string, number>();

  walkDescendants(root, (node) => {
    if (isRustFunction(node) || isTypeOnly(node)) return false;
    if (isUnitHeader(node, root)) return false;

    // Strings are one operand. Their quotes and contents do not become tokens.
    if (LITERAL_TYPES.has(node.type) || node.type.endsWith("_literal")) {
      increment(operands, node.text);
      return false;
    }
    // Only true leaves are tokens. An inner node with only anonymous children
    // is structure; its children are counted on their own.
    if (node.childCount > 0) return;
    if (node.startIndex === node.endIndex) return;

    // Exclude separators that only introduce skipped type syntax.
    if ((node.text === ":" &&
        (node.parent?.type === "parameter" || node.parent?.type === "let_declaration"))
      || (node.text === "->" &&
        (node.parent?.type === "function_item" || node.parent?.type === "closure_expression"))) {
      return;
    }

    if (isOperand(node)) increment(operands, node.text);
    else increment(operators, node.text);
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
