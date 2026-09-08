import { type Node, SyntaxKind } from "ts-morph";
import {
  type CyclomaticWeights,
  type MetricComputeContext,
  type MetricDefinition,
  MetricKeys,
} from "../registry";

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
};

const FUNCTION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
]);

export function computeCyclomaticComplexity(
  node: Node,
  weights?: CyclomaticWeights,
): number {
  const w: RequiredWeights = { ...DEFAULT_WEIGHTS, ...weights };
  let complexity = 1;

  node.forEachDescendant((child, traversal) => {
    if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
      traversal.skip();
      return;
    }
    complexity += contributionFor(child, w);
  });

  return complexity;
}

function contributionFor(child: Node, w: RequiredWeights): number {
  if (child.isKind(SyntaxKind.IfStatement)) {
    return isElseIf(child) ? w.elseIf : w.if;
  }
  if (child.isKind(SyntaxKind.ForStatement)) return w.for;
  if (child.isKind(SyntaxKind.ForInStatement)) return w.forIn;
  if (child.isKind(SyntaxKind.ForOfStatement)) return w.forOf;
  if (child.isKind(SyntaxKind.WhileStatement)) return w.while;
  if (child.isKind(SyntaxKind.DoStatement)) return w.doWhile;
  if (child.isKind(SyntaxKind.CaseClause)) return w.case;
  if (child.isKind(SyntaxKind.CatchClause)) return w.catch;
  if (child.isKind(SyntaxKind.ConditionalExpression)) return w.ternary;
  if (child.isKind(SyntaxKind.BinaryExpression)) {
    const op = child.getOperatorToken().getKind();
    if (op === SyntaxKind.AmpersandAmpersandToken) return w.logicalAnd;
    if (op === SyntaxKind.BarBarToken) return w.logicalOr;
    if (op === SyntaxKind.QuestionQuestionToken) return w.nullishCoalescing;
  }
  return 0;
}

function isElseIf(ifNode: Node): boolean {
  const parent = ifNode.getParent();
  if (!parent?.isKind(SyntaxKind.IfStatement)) return false;
  return parent.getElseStatement() === ifNode;
}

const cyclomaticComplexity: MetricDefinition = {
  key: MetricKeys.cyclomaticComplexity,
  name: "Cyclomatic Complexity",
  shortCode: "v(G)",
  description:
    "Number of linearly independent paths through a function's control-flow graph.",
  defaultThresholds: { warn: 10, error: 20 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext) =>
    computeCyclomaticComplexity(
      ctx.node,
      ctx.options?.weights?.cyclomaticComplexity,
    ),
};

export default cyclomaticComplexity;
