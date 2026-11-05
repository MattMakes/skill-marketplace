// Rust control-flow metrics over tree-sitter syntax nodes.

import type { CyclomaticWeights } from "../../registry";
import { ancestorsUntil, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import type { SyntaxMetricCompute } from "../types";
import { isRustFunction } from "./nodeTypes";

type RequiredWeights = Required<CyclomaticWeights>;

const DEFAULT_WEIGHTS: RequiredWeights = {
  if: 1,
  elseIf: 1,
  for: 1,
  forIn: 1,
  forOf: 1,
  while: 1,
  doWhile: 1,
  case: 1,
  catch: 1,
  logicalAnd: 1,
  logicalOr: 1,
  nullishCoalescing: 1,
  ternary: 1,
  tryOperator: 1,
};

const CONDITIONAL_TYPES = new Set(["if_expression", "match_expression"]);
const PANIC_MACROS = new Set([
  "panic",
  "unreachable",
  "todo",
  "unimplemented",
]);
const BRANCH_TYPES = new Set([
  "if_expression",
  "for_expression",
  "while_expression",
  "loop_expression",
  "match_expression",
]);
const CALL_TYPES = new Set(["call_expression", "macro_invocation"]);
const BLOCK_LIKE_TAIL_TYPES = new Set([
  "if_expression",
  "match_expression",
  "loop_expression",
  "while_expression",
  "for_expression",
  "block",
  "unsafe_block",
]);
// Statement-like children that can end a block but are never a tail (F9).
const NON_TAIL_TYPES = new Set([
  "empty_statement",
  "let_declaration",
  "macro_definition",
  "use_declaration",
  "extern_crate_declaration",
  "inner_attribute_item",
]);

/** `none` has no tail, `value` is a plain expression, `blockLike` is `if`, `match`, ... */
type TailKind = "none" | "value" | "blockLike";

export function computeRustCyclomaticComplexity(
  node: SyntaxNode,
  weights?: CyclomaticWeights,
): number {
  const resolvedWeights: RequiredWeights = { ...DEFAULT_WEIGHTS, ...weights };
  let complexity = 1;

  walkDescendants(node, (child) => {
    if (isRustFunction(child)) return false;
    complexity += cyclomaticContribution(child, resolvedWeights);
  });

  return complexity;
}

function cyclomaticContribution(
  node: SyntaxNode,
  weights: RequiredWeights,
): number {
  if (node.type === "if_expression") {
    return node.parent?.type === "else_clause" ? weights.elseIf : weights.if;
  }
  if (node.type === "for_expression") return weights.for;
  if (node.type === "while_expression") return weights.while;
  if (
    node.type === "let_declaration" &&
    node.childForFieldName("alternative") !== null
  ) {
    return weights.if;
  }
  if (node.type === "match_arm") {
    const pattern = node.childForFieldName("pattern");
    const guard = pattern?.childForFieldName("condition") ?? null;
    const arm =
      pattern?.text.trim() === "_" && guard === null ? 0 : weights.case;
    return arm + (guard === null ? 0 : weights.if);
  }
  if (node.type === "binary_expression") {
    const operator = node.childForFieldName("operator")?.type;
    if (operator === "&&") return weights.logicalAnd;
    if (operator === "||") return weights.logicalOr;
  }
  if (node.type === "&&" && node.parent?.type === "let_chain") {
    return weights.logicalAnd;
  }
  if (node.type === "try_expression") return weights.tryOperator;
  return 0;
}

export const rustCyclomaticComplexity: SyntaxMetricCompute = (ctx) => {
  return computeRustCyclomaticComplexity(
    ctx.node,
    ctx.options.weights?.cyclomaticComplexity,
  );
};

export function computeRustEssentialComplexity(node: SyntaxNode): number {
  let complexity = 1;
  const returns: SyntaxNode[] = [];

  walkDescendants(node, (child) => {
    if (isRustFunction(child)) return false;
    if (child.type === "return_expression") {
      returns.push(child);
    } else if (child.type === "continue_expression") {
      complexity += 1;
    } else if (
      child.type === "break_expression" &&
      child.namedChildren.some((nested) => nested.type === "label")
    ) {
      complexity += 1;
    } else if (isConditionalPanic(child, node)) {
      complexity += 1;
    }
  });

  complexity += countEarlyReturns(node, returns);
  return complexity;
}

/**
 * Early returns (design 5.2). A value tail makes every return early. A
 * block-like tail makes every return before it early and applies the
 * TypeScript textual-last rule to the returns inside it (F7). Without a tail
 * the textual-last rule applies to all returns.
 */
function countEarlyReturns(node: SyntaxNode, returns: SyntaxNode[]): number {
  const { kind, tail } = classifyTail(node);
  if (kind === "value") return returns.length;
  if (kind === "none" || tail === null) {
    return countReturnsBeforeTextuallyLast(returns);
  }
  const inside = returns.filter(
    (candidate) =>
      candidate.startIndex >= tail.startIndex &&
      candidate.endIndex <= tail.endIndex,
  );
  return (
    returns.length - inside.length + countReturnsBeforeTextuallyLast(inside)
  );
}

function isConditionalPanic(node: SyntaxNode, boundary: SyntaxNode): boolean {
  if (node.type !== "macro_invocation") return false;
  const macro = node.childForFieldName("macro")?.text.split("::").at(-1);
  if (macro === undefined || !PANIC_MACROS.has(macro)) return false;

  for (const ancestor of ancestorsUntil(node, boundary)) {
    if (CONDITIONAL_TYPES.has(ancestor.type)) return true;
  }
  return false;
}

function countReturnsBeforeTextuallyLast(returns: SyntaxNode[]): number {
  if (returns.length <= 1) return 0;
  let lastEnd = -1;
  for (const node of returns) lastEnd = Math.max(lastEnd, node.endIndex);
  return returns.filter((node) => node.endIndex !== lastEnd).length;
}

/**
 * Tail expression rule (design 5.2). The function must have a `return_type`
 * field. The last non-comment named child of the body block must be either an
 * expression node, or an `expression_statement` whose last child is not the
 * `;` token. tree-sitter-rust wraps a final block-like expression (`if`,
 * `match`, `loop`, a block) in an `expression_statement` with no `;`.
 * `tail` is the tail expression node when `kind` is not `none`.
 */
function classifyTail(node: SyntaxNode): {
  kind: TailKind;
  tail: SyntaxNode | null;
} {
  const none = { kind: "none" as const, tail: null };
  if (node.childForFieldName("return_type") === null) return none;
  const body = node.childForFieldName("body");
  if (body === null) return none;
  let last: SyntaxNode | undefined;
  for (let index = body.namedChildren.length - 1; index >= 0; index -= 1) {
    const child = body.namedChildren[index];
    if (
      child !== undefined &&
      child.type !== "line_comment" &&
      child.type !== "block_comment"
    ) {
      last = child;
      break;
    }
  }
  if (last === undefined || last.type === "return_expression") return none;
  let tail: SyntaxNode = last;
  if (last.type === "expression_statement") {
    const final = last.child(last.childCount - 1);
    if (final === null || final.type === ";") return none;
    // A final `return x` without `;` is wrapped the same way. It is no tail.
    const inner = last.namedChildren.at(-1);
    if (inner === undefined || inner.type === "return_expression") return none;
    tail = inner;
  }
  // Item declarations can omit semicolons, but they are not tail expressions.
  if (NON_TAIL_TYPES.has(tail.type) || tail.type.endsWith("_item")) {
    return none;
  }
  return {
    kind: BLOCK_LIKE_TAIL_TYPES.has(tail.type) ? "blockLike" : "value",
    tail,
  };
}

export const rustEssentialComplexity: SyntaxMetricCompute = (ctx) => {
  return computeRustEssentialComplexity(ctx.node);
};

export function computeRustModuleDesignComplexity(node: SyntaxNode): number {
  let complexity = 1;

  walkDescendants(node, (child) => {
    if (isRustFunction(child)) return false;
    if (BRANCH_TYPES.has(child.type) && containsCall(child)) complexity += 1;
  });

  return complexity;
}

function containsCall(branch: SyntaxNode): boolean {
  let found = false;
  walkDescendants(branch, (child) => {
    if (isRustFunction(child)) return false;
    if (CALL_TYPES.has(child.type)) found = true;
  });
  return found;
}

export const rustModuleDesignComplexity: SyntaxMetricCompute = (ctx) => {
  return computeRustModuleDesignComplexity(ctx.node);
};
