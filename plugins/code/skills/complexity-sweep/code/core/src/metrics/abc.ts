import {
  type ArrayBindingPattern,
  type Node,
  type ObjectBindingPattern,
  SyntaxKind,
} from "ts-morph";

import type {
  MetricComputeContext,
  MetricDefinition,
  MetricResult,
} from "../registry";
import { MetricKeys } from "../registry";

export interface AbcCounts {
  a: number;
  b: number;
  c: number;
}

/**
 * Mutating methods that bump A in addition to the B bump every call receives.
 */
const MUTATING_METHODS: ReadonlySet<string> = new Set([
  "push",
  "set",
  "splice",
  "pop",
  "shift",
  "unshift",
  "delete",
  "clear",
  "fill",
  "sort",
  "reverse",
  "copyWithin",
]);

const ASSIGNMENT_OPERATORS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.EqualsToken,
  SyntaxKind.PlusEqualsToken,
  SyntaxKind.MinusEqualsToken,
  SyntaxKind.AsteriskEqualsToken,
  SyntaxKind.SlashEqualsToken,
  SyntaxKind.PercentEqualsToken,
  SyntaxKind.AsteriskAsteriskEqualsToken,
  SyntaxKind.AmpersandEqualsToken,
  SyntaxKind.BarEqualsToken,
  SyntaxKind.CaretEqualsToken,
  SyntaxKind.LessThanLessThanEqualsToken,
  SyntaxKind.GreaterThanGreaterThanEqualsToken,
  SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  SyntaxKind.BarBarEqualsToken,
  SyntaxKind.AmpersandAmpersandEqualsToken,
  SyntaxKind.QuestionQuestionEqualsToken,
]);

const LOGICAL_OPERATORS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.AmpersandAmpersandToken,
  SyntaxKind.BarBarToken,
  SyntaxKind.QuestionQuestionToken,
]);

const COMPARISON_OPERATORS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.EqualsEqualsToken,
  SyntaxKind.ExclamationEqualsToken,
  SyntaxKind.EqualsEqualsEqualsToken,
  SyntaxKind.ExclamationEqualsEqualsToken,
  SyntaxKind.LessThanToken,
  SyntaxKind.GreaterThanToken,
  SyntaxKind.LessThanEqualsToken,
  SyntaxKind.GreaterThanEqualsToken,
]);

function isNestedFunctionBoundary(child: Node, root: Node): boolean {
  if (child === root) return false;
  return (
    child.isKind(SyntaxKind.FunctionDeclaration) ||
    child.isKind(SyntaxKind.FunctionExpression) ||
    child.isKind(SyntaxKind.ArrowFunction) ||
    child.isKind(SyntaxKind.MethodDeclaration)
  );
}

function isMutatingMethodCall(node: Node): boolean {
  if (!node.isKind(SyntaxKind.CallExpression)) return false;
  const expr = node.getExpression();
  if (!expr.isKind(SyntaxKind.PropertyAccessExpression)) return false;
  return MUTATING_METHODS.has(expr.getName());
}

/**
 * Count leaf bindings in a destructuring pattern. Array pattern elisions
 * (`[, x]`) are skipped; nested patterns recurse.
 */
function countBindings(
  node: ObjectBindingPattern | ArrayBindingPattern,
): number {
  let count = 0;
  for (const element of node.getElements()) {
    if (element.isKind(SyntaxKind.OmittedExpression)) continue;
    const nameNode = element.getNameNode();
    if (
      nameNode.isKind(SyntaxKind.ObjectBindingPattern) ||
      nameNode.isKind(SyntaxKind.ArrayBindingPattern)
    ) {
      count += countBindings(nameNode);
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Compute the raw ABC counts for a function node. Single `forEachDescendant`
 * pass; nested function/method/arrow bodies are boundary-skipped.
 */
export function computeAbcCounts(node: Node): AbcCounts {
  let a = 0;
  let b = 0;
  let c = 0;

  node.forEachDescendant((child, traversal) => {
    if (isNestedFunctionBoundary(child, node)) {
      traversal.skip();
      return;
    }

    if (child.isKind(SyntaxKind.VariableDeclaration)) {
      if (child.getInitializer()) {
        const name = child.getNameNode();
        if (
          name.isKind(SyntaxKind.ObjectBindingPattern) ||
          name.isKind(SyntaxKind.ArrayBindingPattern)
        ) {
          a += countBindings(name);
        } else {
          a += 1;
        }
      }
      return;
    }

    if (child.isKind(SyntaxKind.BinaryExpression)) {
      const op = child.getOperatorToken().getKind();
      if (ASSIGNMENT_OPERATORS.has(op)) a += 1;
      if (LOGICAL_OPERATORS.has(op)) c += 1;
      if (COMPARISON_OPERATORS.has(op)) c += 1;
      return;
    }

    if (
      child.isKind(SyntaxKind.PrefixUnaryExpression) ||
      child.isKind(SyntaxKind.PostfixUnaryExpression)
    ) {
      const op = child.getOperatorToken();
      if (op === SyntaxKind.PlusPlusToken || op === SyntaxKind.MinusMinusToken) {
        a += 1;
      }
      return;
    }

    if (child.isKind(SyntaxKind.CallExpression)) {
      b += 1;
      if (isMutatingMethodCall(child)) a += 1;
      return;
    }

    if (child.isKind(SyntaxKind.NewExpression)) {
      b += 1;
      return;
    }

    if (child.isKind(SyntaxKind.IfStatement)) {
      c += 1;
      return;
    }

    if (
      child.isKind(SyntaxKind.ForStatement) ||
      child.isKind(SyntaxKind.ForInStatement) ||
      child.isKind(SyntaxKind.ForOfStatement) ||
      child.isKind(SyntaxKind.WhileStatement) ||
      child.isKind(SyntaxKind.DoStatement)
    ) {
      c += 1;
      return;
    }

    if (child.isKind(SyntaxKind.CaseClause)) {
      c += 1;
      return;
    }

    if (child.isKind(SyntaxKind.ConditionalExpression)) {
      c += 1;
      return;
    }
  });

  return { a, b, c };
}

export function computeAbcScore(node: Node): MetricResult<AbcCounts> {
  const counts = computeAbcCounts(node);
  const value = Math.sqrt(
    counts.a * counts.a + counts.b * counts.b + counts.c * counts.c,
  );
  return { value, detail: counts };
}

const abcDefinition: MetricDefinition<AbcCounts> = {
  key: MetricKeys.abcScore,
  name: "ABC Score",
  shortCode: "ABC",
  description: "ABC  Assignments, Branches, Conditions vector magnitude",
  defaultThresholds: { warn: 20, error: 30 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext) => computeAbcScore(ctx.node),
  detailKeys: ["a", "b", "c"],
};

export default abcDefinition;
