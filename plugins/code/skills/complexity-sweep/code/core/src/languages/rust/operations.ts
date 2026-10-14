// Rust operation and information-density metrics over web-tree-sitter nodes.

import { walkDescendants } from "../syntaxHelpers";
import type { SyntaxMetricCompute, SyntaxNode } from "../types";
import { isRustFunction } from "./nodeTypes";
import {
  computeRustHalstead,
  type RustHalsteadDetail,
} from "./operations.halstead";
import {
  countRustLoc,
  computeRustScopeDepthStats,
} from "./operations.scopeDepth";

interface AbcDetail {
  a: number;
  b: number;
  c: number;
}

const MUTATING_METHODS: ReadonlySet<string> = new Set([
  "push", "push_str", "push_back", "push_front", "pop", "pop_back",
  "pop_front", "insert", "remove", "clear", "extend", "append",
  "truncate", "drain", "retain", "sort", "sort_by", "sort_by_key",
  "sort_unstable", "dedup", "reverse", "swap",
]);

const CONDITION_OPERATORS: ReadonlySet<string> = new Set([
  "&&", "||", "==", "!=", "<", ">", "<=", ">=",
]);

function countPatternLeaves(node: SyntaxNode | null): number {
  if (node === null) return 0;
  // `Point { x, y }` binds `x` and `y` through shorthand field identifiers.
  if (node.type === "identifier" || node.type === "shorthand_field_identifier") return 1;
  let count = 0;
  const patternType = node.childForFieldName("type");
  for (const child of node.namedChildren) {
    if (patternType !== null && child.id === patternType.id) continue;
    count += countPatternLeaves(child);
  }
  return count;
}

function isMutatingMethodCall(node: SyntaxNode): boolean {
  if (node.type !== "call_expression") return false;
  let fn = node.childForFieldName("function");
  // `v.push::<T>(x)` wraps the method access in a `generic_function`.
  if (fn?.type === "generic_function") fn = fn.childForFieldName("function");
  if (fn?.type !== "field_expression") return false;
  const field = fn.childForFieldName("field");
  return field !== null && MUTATING_METHODS.has(field.text);
}

function isWildcardArm(node: SyntaxNode): boolean {
  const pattern = node.childForFieldName("pattern");
  const condition = pattern?.childForFieldName("condition") ?? null;
  return pattern?.text.trim() === "_" && condition === null;
}

function hasMatchGuard(node: SyntaxNode): boolean {
  const pattern = node.childForFieldName("pattern");
  return (pattern?.childForFieldName("condition") ?? null) !== null;
}

function countDirectConditionOperators(node: SyntaxNode): number {
  let count = 0;
  for (const child of node.children) {
    if (!child.isNamed && CONDITION_OPERATORS.has(child.text)) count += 1;
  }
  return count;
}

function computeAbcDetail(root: SyntaxNode): AbcDetail {
  let a = 0;
  let b = 0;
  let c = 0;

  walkDescendants(root, (node) => {
    if (isRustFunction(node)) return false;

    switch (node.type) {
      case "let_declaration":
        if (node.childForFieldName("value") !== null) {
          a += countPatternLeaves(node.childForFieldName("pattern"));
        }
        if (node.childForFieldName("alternative") !== null) c += 1;
        break;
      case "assignment_expression":
      case "compound_assignment_expr":
        a += 1;
        break;
      case "call_expression":
        b += 1;
        if (isMutatingMethodCall(node)) a += 1;
        break;
      case "macro_invocation":
      case "struct_expression":
        b += 1;
        break;
      case "binary_expression":
      case "let_chain":
        c += countDirectConditionOperators(node);
        break;
      case "if_expression":
      case "for_expression":
      case "while_expression":
      case "loop_expression":
      case "try_expression":
        c += 1;
        break;
      case "match_arm":
        if (!isWildcardArm(node)) c += 1;
        if (hasMatchGuard(node)) c += 1;
        break;
    }
  });

  return { a, b, c };
}

export const rustAbcScore: SyntaxMetricCompute<AbcDetail> = (ctx) => {
  const detail = computeAbcDetail(ctx.node);
  const value = Math.sqrt(
    detail.a * detail.a + detail.b * detail.b + detail.c * detail.c,
  );
  return { value, detail };
};

export const rustScopeDepthWeightedLoc: SyntaxMetricCompute = (ctx) =>
  computeRustScopeDepthStats(ctx).weightedLoc;

export const rustScopeDepthRatio: SyntaxMetricCompute = (ctx) =>
  computeRustScopeDepthStats(ctx).ratio;

export const rustHalsteadVolume: SyntaxMetricCompute<RustHalsteadDetail> = (ctx) =>
  computeRustHalstead(ctx.node, "volume");

export const rustHalsteadDifficulty: SyntaxMetricCompute<RustHalsteadDetail> = (ctx) =>
  computeRustHalstead(ctx.node, "difficulty");

export const rustHalsteadEffort: SyntaxMetricCompute<RustHalsteadDetail> = (ctx) =>
  computeRustHalstead(ctx.node, "effort");

export const rustMaintainabilityIndex: SyntaxMetricCompute = (ctx) => {
  const volume = ctx.dependencyValues.halsteadVolume ?? 0;
  const complexity = ctx.dependencyValues.cyclomaticComplexity ?? 1;
  const loc = countRustLoc(ctx);
  if (volume <= 0 || loc <= 0) return 100;

  const raw = 171
    - 5.2 * Math.log(volume)
    - 0.23 * complexity
    - 16.2 * Math.log(loc);
  return Math.max(0, (raw * 100) / 171);
};
