import { type Node, SyntaxKind } from "ts-morph";
import {
  type MetricComputeContext,
  type MetricDefinition,
  MetricKeys,
} from "../registry";

const BRANCH_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.SwitchStatement,
  SyntaxKind.ConditionalExpression,
]);

const FUNCTION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
]);

export function computeModuleDesignComplexity(node: Node): number {
  let complexity = 1;

  node.forEachDescendant((child, traversal) => {
    if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
      traversal.skip();
      return;
    }
    if (BRANCH_KINDS.has(child.getKind()) && containsCallExpression(child)) {
      complexity += 1;
    }
  });

  return complexity;
}

function containsCallExpression(branch: Node): boolean {
  let found = false;
  branch.forEachDescendant((descendant, traversal) => {
    if (descendant !== branch && FUNCTION_KINDS.has(descendant.getKind())) {
      traversal.skip();
      return;
    }
    if (descendant.isKind(SyntaxKind.CallExpression)) {
      found = true;
      traversal.stop();
    }
  });
  return found;
}

const moduleDesignComplexity: MetricDefinition = {
  key: MetricKeys.moduleDesignComplexity,
  name: "Module Design Complexity",
  shortCode: "iv(G)",
  description:
    "Counts control-flow branches that contain a function call, measuring inter-module coupling.",
  defaultThresholds: { warn: 10, error: 20 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext) =>
    computeModuleDesignComplexity(ctx.node),
};

export default moduleDesignComplexity;
