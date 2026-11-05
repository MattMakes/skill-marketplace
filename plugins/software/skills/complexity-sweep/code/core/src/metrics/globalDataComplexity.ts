import {
  type Node,
  type SourceFile,
  type VariableDeclaration,
  SyntaxKind,
} from "ts-morph";
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

const MUTABLE_INITIALIZER_KINDS = new Set<SyntaxKind>([
  SyntaxKind.ObjectLiteralExpression,
  SyntaxKind.ArrayLiteralExpression,
  SyntaxKind.NewExpression,
  SyntaxKind.AsExpression,
]);

const MUTABLE_TYPE_SUBSTRINGS = ["[]", "Record", "{"];

export function computeGlobalDataComplexity(
  node: Node,
  sourceFile: SourceFile,
): number {
  const mutableGlobals = getMutableModuleScopeVars(sourceFile);
  if (mutableGlobals.size === 0) return 0;

  const referenced = new Set<string>();
  node.forEachDescendant((child, traversal) => {
    if (child !== node && FUNCTION_KINDS.has(child.getKind())) {
      traversal.skip();
      return;
    }
    if (child.isKind(SyntaxKind.Identifier)) {
      const name = child.getText();
      if (mutableGlobals.has(name)) referenced.add(name);
    }
  });
  return referenced.size;
}

function getMutableModuleScopeVars(sourceFile: SourceFile): Set<string> {
  const names = new Set<string>();
  for (const stmt of sourceFile.getStatements()) {
    if (!stmt.isKind(SyntaxKind.VariableStatement)) continue;
    const declList = stmt.getDeclarationList();
    const isConst = declList.getText().trimStart().startsWith("const");

    for (const decl of declList.getDeclarations()) {
      const name = decl.getName();
      if (!isConst) {
        names.add(name);
        continue;
      }
      if (hasMutableConstInitializer(decl) || hasMutableTypeAnnotation(decl)) {
        names.add(name);
      }
    }
  }
  return names;
}

function hasMutableConstInitializer(decl: VariableDeclaration): boolean {
  const init = decl.getInitializer();
  if (!init) return false;
  return MUTABLE_INITIALIZER_KINDS.has(init.getKind());
}

function hasMutableTypeAnnotation(decl: VariableDeclaration): boolean {
  const typeNode = decl.getTypeNode();
  if (!typeNode) return false;
  const text = typeNode.getText();
  return MUTABLE_TYPE_SUBSTRINGS.some((sub) => text.includes(sub));
}

const globalDataComplexity: MetricDefinition = {
  key: MetricKeys.globalDataComplexity,
  name: "Global Data Complexity",
  shortCode: "gdv(G)",
  description:
    "Number of distinct mutable module-scope variables referenced by the function.",
  defaultThresholds: { warn: 3, error: 6 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext) =>
    computeGlobalDataComplexity(ctx.node, ctx.sourceFile),
};

export default globalDataComplexity;
