import { type Node, SyntaxKind } from "ts-morph";
import {
  type MetricComputeContext,
  type MetricDefinition,
  MetricKeys,
} from "../registry";

const FUNCTION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
]);

const CONDITIONAL_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.SwitchStatement,
  SyntaxKind.ConditionalExpression,
]);

export function computeEssentialComplexity(node: Node): number {
  let complexity = 1;
  const returnStatements: Node[] = [];

  node.forEachDescendant((child) => {
    if (isNestedFunction(child, node)) return;

    if (child.isKind(SyntaxKind.ReturnStatement)) {
      returnStatements.push(child);
      return;
    }
    if (child.isKind(SyntaxKind.ContinueStatement)) {
      complexity += 1;
      return;
    }
    if (child.isKind(SyntaxKind.BreakStatement) && child.getLabel()) {
      complexity += 1;
      return;
    }
    if (
      child.isKind(SyntaxKind.ThrowStatement) &&
      isInsideConditional(child, node)
    ) {
      complexity += 1;
    }
  });

  complexity += countEarlyReturns(returnStatements);
  return complexity;
}

function countEarlyReturns(returns: Node[]): number {
  if (returns.length <= 1) return 0;
  let lastEnd = -1;
  for (const ret of returns) {
    const end = ret.getEnd();
    if (end > lastEnd) lastEnd = end;
  }
  let count = 0;
  for (const ret of returns) {
    if (ret.getEnd() !== lastEnd) count += 1;
  }
  return count;
}

function isNestedFunction(child: Node, boundary: Node): boolean {
  let parent = child.getParent();
  while (parent && parent !== boundary) {
    if (FUNCTION_KINDS.has(parent.getKind())) return true;
    parent = parent.getParent();
  }
  return false;
}

function isInsideConditional(child: Node, boundary: Node): boolean {
  let parent = child.getParent();
  while (parent && parent !== boundary) {
    if (FUNCTION_KINDS.has(parent.getKind())) return false;
    if (CONDITIONAL_KINDS.has(parent.getKind())) return true;
    parent = parent.getParent();
  }
  return false;
}

const essentialComplexity: MetricDefinition = {
  key: MetricKeys.essentialComplexity,
  name: "Essential Complexity",
  shortCode: "ev(G)",
  description:
    "Amount of unstructured control flow that cannot be reduced by structured transformations.",
  defaultThresholds: { warn: 4, error: 8 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext) => computeEssentialComplexity(ctx.node),
};

export default essentialComplexity;
