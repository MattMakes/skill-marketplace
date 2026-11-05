// Python operation and information-density metrics (design 5.7 to 5.10):
// abcScore, scopeDepthWeightedLoc, scopeDepthRatio, the 3 Halstead metrics
// and maintainabilityIndex. Each compute ports the TypeScript metric in
// `metrics/`. Nested units are skipped; lambdas stay part of the unit.

import { MetricKeys } from "../../registry";
import { walkDescendants } from "../syntaxHelpers";
import type { SyntaxMetricCompute, SyntaxNode } from "../types";
import { isPythonFunction } from "./nodeTypes";
import {
  halsteadDifficultyOf,
  halsteadVolumeOf,
  pythonHalsteadDetail,
  type PythonHalsteadDetail,
} from "./operations.halstead";
import { pythonCodeLines, pythonScopeDepthStats } from "./operations.scopeDepth";

// ---------------------------------------------------------------------------
// abcScore (design 5.7)
// ---------------------------------------------------------------------------

export interface PythonAbcCounts {
  a: number;
  b: number;
  c: number;
}

/** Mutating methods that add 1 to A in addition to the B of the call. */
const MUTATING_METHODS: ReadonlySet<string> = new Set([
  "append",
  "extend",
  "insert",
  "pop",
  "remove",
  "clear",
  "sort",
  "reverse",
  "update",
  "setdefault",
  "popitem",
  "add",
  "discard",
]);

/** Nodes that add 1 to C each. `if_clause` is handled apart (see below). */
const CONDITION_TYPES: ReadonlySet<string> = new Set([
  "boolean_operator",
  "if_statement",
  "elif_clause",
  "for_statement",
  "while_statement",
  "for_in_clause",
  "conditional_expression",
]);

/** Target containers: each leaf target inside adds 1 to A. */
const TARGET_CONTAINER_TYPES: ReadonlySet<string> = new Set([
  "pattern_list",
  "tuple_pattern",
  "list_pattern",
  "expression_list",
  "tuple",
  "list",
  "list_splat_pattern",
  "list_splat",
  "parenthesized_expression",
]);

/** Count leaf targets: `x` is 1, `p, (q, *r)` is 3. */
function countTargets(node: SyntaxNode): number {
  if (!TARGET_CONTAINER_TYPES.has(node.type)) return 1;
  let count = 0;
  for (const child of node.namedChildren) {
    if (child !== null && child.type !== "comment") count += countTargets(child);
  }
  return count;
}

function isMutatingMethodCall(call: SyntaxNode): boolean {
  const callee = call.childForFieldName("function");
  if (callee?.type !== "attribute") return false;
  const method = callee.childForFieldName("attribute");
  return method !== null && MUTATING_METHODS.has(method.text);
}

/**
 * A `case _:` without a guard adds nothing (the 5.1 wildcard rule, like a
 * TypeScript `default`). A guard adds no extra C: the design 5.7 Python row
 * does not list it.
 */
function isWildcardCase(clause: SyntaxNode): boolean {
  if (clause.childForFieldName("guard") !== null) return false;
  const patterns = clause.namedChildren.filter((child) => child?.type === "case_pattern");
  if (patterns.length !== 1) return false;
  const pattern = patterns[0];
  return pattern !== null && pattern !== undefined && pattern.namedChildCount === 0 && pattern.text === "_";
}

function assignmentCount(node: SyntaxNode): number {
  // A bare annotation `x: int` has no value and assigns nothing.
  if (node.childForFieldName("right") === null) return 0;
  const left = node.childForFieldName("left");
  return left === null ? 0 : countTargets(left);
}

function deleteCount(node: SyntaxNode): number {
  let count = 0;
  for (const child of node.namedChildren) {
    if (child !== null && child.type !== "comment") count += countTargets(child);
  }
  return count;
}

/**
 * Raw ABC counts for a Python function node. 1 walk; nested units are skipped.
 *
 * Port note: as in TypeScript, loop targets (`for x in`), `with ... as`
 * targets, `import` and `global` add nothing to A.
 */
export function computePythonAbcCounts(fn: SyntaxNode): PythonAbcCounts {
  let a = 0;
  let b = 0;
  let c = 0;

  walkDescendants(fn, (node) => {
    if (isPythonFunction(node)) return false;

    switch (node.type) {
      case "assignment":
        a += assignmentCount(node);
        break;
      case "augmented_assignment":
      case "named_expression":
        a += 1;
        break;
      case "delete_statement":
        a += deleteCount(node);
        break;
      case "call":
        b += 1;
        if (isMutatingMethodCall(node)) a += 1;
        break;
      case "comparison_operator":
        c += node.childrenForFieldName("operators").length;
        break;
      case "if_clause":
        // A comprehension filter. A `case` guard is also an `if_clause`.
        if (node.parent?.type !== "case_clause") c += 1;
        break;
      case "case_clause":
        if (!isWildcardCase(node)) c += 1;
        break;
      default:
        if (CONDITION_TYPES.has(node.type)) c += 1;
    }
    return true;
  });

  return { a, b, c };
}

export const pythonAbcScore: SyntaxMetricCompute<PythonAbcCounts> = (ctx) => {
  const counts = computePythonAbcCounts(ctx.node);
  const value = Math.sqrt(counts.a * counts.a + counts.b * counts.b + counts.c * counts.c);
  return { value, detail: counts };
};

// ---------------------------------------------------------------------------
// scopeDepthWeightedLoc and scopeDepthRatio (design 5.8)
// ---------------------------------------------------------------------------

export const pythonScopeDepthWeightedLoc: SyntaxMetricCompute = (ctx) =>
  pythonScopeDepthStats(ctx.node, ctx.file.text).weightedLoc;

export const pythonScopeDepthRatio: SyntaxMetricCompute = (ctx) =>
  pythonScopeDepthStats(ctx.node, ctx.file.text).ratio;

// ---------------------------------------------------------------------------
// Halstead (design 5.9): all 3 results carry the same detail.
// ---------------------------------------------------------------------------

export const pythonHalsteadVolume: SyntaxMetricCompute<PythonHalsteadDetail> = (ctx) => {
  const detail = pythonHalsteadDetail(ctx.node);
  return { value: halsteadVolumeOf(detail), detail };
};

export const pythonHalsteadDifficulty: SyntaxMetricCompute<PythonHalsteadDetail> = (ctx) => {
  const detail = pythonHalsteadDetail(ctx.node);
  return { value: halsteadDifficultyOf(detail), detail };
};

export const pythonHalsteadEffort: SyntaxMetricCompute<PythonHalsteadDetail> = (ctx) => {
  const detail = pythonHalsteadDetail(ctx.node);
  return { value: halsteadDifficultyOf(detail) * halsteadVolumeOf(detail), detail };
};

// ---------------------------------------------------------------------------
// maintainabilityIndex (design 5.10)
// ---------------------------------------------------------------------------

/**
 * MI = max(0, (171 - 5.2 ln V - 0.23 CC - 16.2 ln LOC) * 100 / 171).
 * Same fallbacks and guard as the TypeScript metric: V defaults to 0, CC to
 * 1, and V <= 0 or LOC <= 0 gives 100.
 */
export const pythonMaintainabilityIndex: SyntaxMetricCompute = (ctx) => {
  const V = ctx.dependencyValues[MetricKeys.halsteadVolume] ?? 0;
  const CC = ctx.dependencyValues[MetricKeys.cyclomaticComplexity] ?? 1;
  const LOC = pythonCodeLines(ctx.node, ctx.file.text).length;

  if (V <= 0 || LOC <= 0) return 100;

  const raw = 171 - 5.2 * Math.log(V) - 0.23 * CC - 16.2 * Math.log(LOC);
  return Math.max(0, (raw * 100) / 171);
};
