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

const BRANCH_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.SwitchStatement,
  SyntaxKind.ConditionalExpression,
]);

export function computeSpecifiedDataComplexity(node: Node): number {
  const paramNames = getParameterNames(node);
  if (paramNames.size === 0) return 0;

  const influencing = new Set<string>();

  node.forEachDescendant((child, traversal) => {
    // Latent bug fix: the original used `return false` (no-op under ts-morph);
    // `traversal.skip()` correctly prunes nested-function descendants so
    // parameters used only inside nested functions are not counted.
    if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
      traversal.skip();
      return;
    }
    if (!BRANCH_KINDS.has(child.getKind())) return;
    const condition = getConditionNode(child);
    if (!condition) return;
    for (const name of paramNames) {
      if (influencing.has(name)) continue;
      if (conditionContainsIdentifier(condition, name)) {
        influencing.add(name);
      }
    }
  });

  return influencing.size;
}

function getParameterNames(node: Node): Set<string> {
  const names = new Set<string>();
  if (!("getParameters" in node)) return names;
  const params = (node as Node & {
    getParameters: () => import("ts-morph").ParameterDeclaration[];
  }).getParameters();

  for (const param of params) {
    const nameNode = param.getNameNode();
    if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
      for (const element of nameNode.getElements()) {
        names.add(element.getName());
      }
    } else if (nameNode.isKind(SyntaxKind.ArrayBindingPattern)) {
      for (const element of nameNode.getElements()) {
        if (element.isKind(SyntaxKind.BindingElement)) {
          names.add(element.getName());
        }
      }
    } else {
      names.add(param.getName());
    }
  }
  return names;
}

function getConditionNode(branch: Node): Node | undefined {
  if (
    branch.isKind(SyntaxKind.IfStatement) ||
    branch.isKind(SyntaxKind.WhileStatement) ||
    branch.isKind(SyntaxKind.DoStatement) ||
    branch.isKind(SyntaxKind.SwitchStatement)
  ) {
    return branch.getExpression();
  }
  if (branch.isKind(SyntaxKind.ForStatement)) {
    return branch.getCondition();
  }
  if (branch.isKind(SyntaxKind.ConditionalExpression)) {
    return branch.getCondition();
  }
  return undefined;
}

function conditionContainsIdentifier(condition: Node, name: string): boolean {
  if (condition.isKind(SyntaxKind.Identifier) && condition.getText() === name) {
    return true;
  }
  let found = false;
  condition.forEachDescendant((child, traversal) => {
    if (found) {
      traversal.stop();
      return;
    }
    if (child.isKind(SyntaxKind.Identifier) && child.getText() === name) {
      found = true;
      traversal.stop();
    }
  });
  return found;
}

const specifiedDataComplexity: MetricDefinition = {
  key: MetricKeys.specifiedDataComplexity,
  name: "Specified Data Complexity",
  shortCode: "sdv(G)",
  description:
    "Number of distinct parameters that influence the function's control flow.",
  defaultThresholds: { warn: 4, error: 8 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext) =>
    computeSpecifiedDataComplexity(ctx.node),
};

export default specifiedDataComplexity;
