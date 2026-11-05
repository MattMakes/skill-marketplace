import {
  type Node,
  type BinaryExpression,
  type IfStatement,
  type PrefixUnaryExpression,
  type PostfixUnaryExpression,
  type TryStatement,
  type VariableDeclaration,
  type VariableDeclarationList,
  SyntaxKind,
} from "ts-morph";

import {
  type MetricComputeContext,
  type MetricDefinition,
  type MetricResult,
  MetricKeys,
} from "../registry";
import type { FunctionLike } from "../types";

/**
 * Halstead counts — two multisets of tokens, one for operators, one for
 * operands. Exposed so other metrics (and tests) can introspect raw token
 * classification without reducing to the V/D/E formulas.
 */
export interface HalsteadCounts {
  operators: Map<string, number>;
  operands: Map<string, number>;
}

/**
 * Detail payload attached to each of the three Halstead MetricResults.
 *
 * Per behavior-spec 06, the three metrics emit the verbatim-identical detail
 * block — we do NOT dedupe it across V/D/E. Tests assert the same `{n1, n2,
 * N1, N2}` fields on all three results.
 */
export interface HalsteadDetail {
  n1: number;
  n2: number;
  N1: number;
  N2: number;
}

// ---------------------------------------------------------------------------
// Cache: one HalsteadCounts per function node, shared across V/D/E metrics.
// ---------------------------------------------------------------------------
const halsteadCache = new WeakMap<Node, HalsteadCounts>();

// ---------------------------------------------------------------------------
// Classification sets
// ---------------------------------------------------------------------------

/**
 * TypeScript type-only node kinds. Descent is fully skipped — nothing inside a
 * type annotation counts as operator or operand.
 */
const TYPE_ONLY_KINDS = new Set<SyntaxKind>([
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeReference,
  SyntaxKind.TypeLiteral,
  SyntaxKind.TypeParameter,
  SyntaxKind.TypeQuery,
  SyntaxKind.MappedType,
  SyntaxKind.ConditionalType,
  SyntaxKind.UnionType,
  SyntaxKind.IntersectionType,
  SyntaxKind.TupleType,
  SyntaxKind.ArrayType,
  SyntaxKind.FunctionType,
  SyntaxKind.ConstructorType,
  SyntaxKind.IndexedAccessType,
  SyntaxKind.LiteralType,
  SyntaxKind.TemplateLiteralType,
  SyntaxKind.TypeOperator,
  SyntaxKind.RestType,
  SyntaxKind.OptionalType,
  SyntaxKind.ParenthesizedType,
  SyntaxKind.InferType,
  SyntaxKind.ThisType,
  SyntaxKind.TypePredicate,
  SyntaxKind.ImportType,
]);

/** Nested function boundaries — descent stops so inner fns aren't double-counted. */
const FUNCTION_BOUNDARY_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
]);

/** Binary operator tokens (middle-child of BinaryExpression) → operator text. */
const BINARY_OPERATOR_MAP = new Map<SyntaxKind, string>([
  // Arithmetic
  [SyntaxKind.PlusToken, "+"],
  [SyntaxKind.MinusToken, "-"],
  [SyntaxKind.AsteriskToken, "*"],
  [SyntaxKind.SlashToken, "/"],
  [SyntaxKind.PercentToken, "%"],
  [SyntaxKind.AsteriskAsteriskToken, "**"],
  // Comparison
  [SyntaxKind.EqualsEqualsToken, "=="],
  [SyntaxKind.ExclamationEqualsToken, "!="],
  [SyntaxKind.EqualsEqualsEqualsToken, "==="],
  [SyntaxKind.ExclamationEqualsEqualsToken, "!=="],
  [SyntaxKind.LessThanToken, "<"],
  [SyntaxKind.GreaterThanToken, ">"],
  [SyntaxKind.LessThanEqualsToken, "<="],
  [SyntaxKind.GreaterThanEqualsToken, ">="],
  // Logical
  [SyntaxKind.AmpersandAmpersandToken, "&&"],
  [SyntaxKind.BarBarToken, "||"],
  [SyntaxKind.QuestionQuestionToken, "??"],
  // Bitwise
  [SyntaxKind.AmpersandToken, "&"],
  [SyntaxKind.BarToken, "|"],
  [SyntaxKind.CaretToken, "^"],
  [SyntaxKind.LessThanLessThanToken, "<<"],
  [SyntaxKind.GreaterThanGreaterThanToken, ">>"],
  [SyntaxKind.GreaterThanGreaterThanGreaterThanToken, ">>>"],
  // Binary keyword operators
  [SyntaxKind.InKeyword, "in"],
  [SyntaxKind.InstanceOfKeyword, "instanceof"],
]);

/** Assignment operator tokens → operator text. Checked before BINARY_OPERATOR_MAP. */
const ASSIGNMENT_OPERATOR_MAP = new Map<SyntaxKind, string>([
  [SyntaxKind.EqualsToken, "="],
  [SyntaxKind.PlusEqualsToken, "+="],
  [SyntaxKind.MinusEqualsToken, "-="],
  [SyntaxKind.AsteriskEqualsToken, "*="],
  [SyntaxKind.SlashEqualsToken, "/="],
  [SyntaxKind.PercentEqualsToken, "%="],
  [SyntaxKind.AsteriskAsteriskEqualsToken, "**="],
  [SyntaxKind.AmpersandAmpersandEqualsToken, "&&="],
  [SyntaxKind.BarBarEqualsToken, "||="],
  [SyntaxKind.QuestionQuestionEqualsToken, "??="],
  [SyntaxKind.LessThanLessThanEqualsToken, "<<="],
  [SyntaxKind.GreaterThanGreaterThanEqualsToken, ">>="],
  [SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, ">>>="],
  [SyntaxKind.AmpersandEqualsToken, "&="],
  [SyntaxKind.BarEqualsToken, "|="],
  [SyntaxKind.CaretEqualsToken, "^="],
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/**
 * Walks ancestors of `node` up to (but not including) `boundary`. Returns true
 * if any ancestor is a type-only kind. Guards identifiers/literals that slip
 * past the top-level TYPE_ONLY_KINDS skip (e.g. inside mapped-type bodies).
 */
function isInTypeContext(node: Node, boundary: Node): boolean {
  let current: Node | undefined = node.getParent();
  while (current && current !== boundary) {
    if (TYPE_ONLY_KINDS.has(current.getKind())) return true;
    current = current.getParent();
  }
  return false;
}

/**
 * Main classifier. Single descent over the function's AST, classifying each
 * encountered node as operator, operand, or structural. Skips nested function
 * bodies and type-only subtrees.
 *
 * Result is cached per-node so V/D/E share one walk.
 */
export function collectHalsteadCounts(node: FunctionLike): HalsteadCounts {
  const cached = halsteadCache.get(node);
  if (cached) return cached;

  const operators = new Map<string, number>();
  const operands = new Map<string, number>();

  node.forEachDescendant((child, traversal) => {
    const kind = child.getKind();

    // Skip nested function bodies — they are separate analysis units.
    if (child !== node && FUNCTION_BOUNDARY_KINDS.has(kind)) {
      traversal.skip();
      return;
    }

    // Skip entire type-only subtrees.
    if (TYPE_ONLY_KINDS.has(kind)) {
      traversal.skip();
      return;
    }

    // `as` cast: don't count `as` itself; the type child is filtered by
    // TYPE_ONLY_KINDS, the expression child continues to be traversed.
    if (kind === SyntaxKind.AsExpression) return;

    // Non-null `!`: purely a type assertion. Not counted.
    if (kind === SyntaxKind.NonNullExpression) return;

    // `function` keyword token: structural, not an operator in the body.
    if (kind === SyntaxKind.FunctionKeyword) return;

    classify(child, kind, node, operators, operands);
  });

  const result: HalsteadCounts = { operators, operands };
  halsteadCache.set(node, result);
  return result;
}

/**
 * Classify a single child into the operator or operand maps. Extracted from
 * the main traversal so the walker stays readable.
 *
 * Returns nothing — mutates the maps directly. Nodes that don't match any
 * branch are structural (Block, ExpressionStatement, ParenthesizedExpression,
 * SourceFile, etc.) and traversal continues into their children naturally.
 */
function classify(
  child: Node,
  kind: SyntaxKind,
  root: Node,
  operators: Map<string, number>,
  operands: Map<string, number>,
): void {
  // ---- OPERATORS ---------------------------------------------------------

  if (kind === SyntaxKind.BinaryExpression) {
    const opToken = (child as BinaryExpression).getOperatorToken();
    const opKind = opToken.getKind();
    const assign = ASSIGNMENT_OPERATOR_MAP.get(opKind);
    if (assign !== undefined) {
      increment(operators, assign);
    } else {
      const binary = BINARY_OPERATOR_MAP.get(opKind);
      if (binary !== undefined) increment(operators, binary);
    }
    return;
  }

  if (kind === SyntaxKind.PrefixUnaryExpression) {
    const opKind = (child as PrefixUnaryExpression).getOperatorToken();
    if (opKind === SyntaxKind.ExclamationToken) increment(operators, "!");
    else if (opKind === SyntaxKind.PlusPlusToken) increment(operators, "++");
    else if (opKind === SyntaxKind.MinusMinusToken) increment(operators, "--");
    else if (opKind === SyntaxKind.TildeToken) increment(operators, "~");
    else if (opKind === SyntaxKind.MinusToken) increment(operators, "unary-");
    else if (opKind === SyntaxKind.PlusToken) increment(operators, "unary+");
    return;
  }

  if (kind === SyntaxKind.PostfixUnaryExpression) {
    const opKind = (child as PostfixUnaryExpression).getOperatorToken();
    if (opKind === SyntaxKind.PlusPlusToken) increment(operators, "++");
    else if (opKind === SyntaxKind.MinusMinusToken) increment(operators, "--");
    return;
  }

  if (kind === SyntaxKind.PropertyAccessExpression) {
    increment(operators, ".");
    return;
  }
  if (kind === SyntaxKind.QuestionDotToken) {
    increment(operators, "?.");
    return;
  }
  if (kind === SyntaxKind.ElementAccessExpression) {
    increment(operators, "[]");
    return;
  }
  if (kind === SyntaxKind.CallExpression) {
    increment(operators, "()");
    return;
  }
  if (kind === SyntaxKind.NewExpression) {
    increment(operators, "new");
    increment(operators, "()");
    return;
  }
  if (kind === SyntaxKind.TypeOfExpression) {
    increment(operators, "typeof");
    return;
  }
  if (kind === SyntaxKind.DeleteExpression) {
    increment(operators, "delete");
    return;
  }
  if (kind === SyntaxKind.VoidExpression) {
    increment(operators, "void");
    return;
  }
  if (kind === SyntaxKind.AwaitExpression) {
    increment(operators, "await");
    return;
  }
  if (kind === SyntaxKind.YieldExpression) {
    increment(operators, "yield");
    return;
  }

  // Control-flow keyword operators
  if (kind === SyntaxKind.IfStatement) {
    increment(operators, "if");
    if ((child as IfStatement).getElseStatement()) increment(operators, "else");
    return;
  }
  if (kind === SyntaxKind.ForStatement) {
    increment(operators, "for");
    return;
  }
  if (kind === SyntaxKind.ForInStatement) {
    increment(operators, "for");
    increment(operators, "in");
    return;
  }
  if (kind === SyntaxKind.ForOfStatement) {
    increment(operators, "for");
    increment(operators, "of");
    return;
  }
  if (kind === SyntaxKind.WhileStatement) {
    increment(operators, "while");
    return;
  }
  if (kind === SyntaxKind.DoStatement) {
    increment(operators, "do");
    increment(operators, "while");
    return;
  }
  if (kind === SyntaxKind.SwitchStatement) {
    increment(operators, "switch");
    return;
  }
  if (kind === SyntaxKind.CaseClause) {
    increment(operators, "case");
    return;
  }
  if (kind === SyntaxKind.DefaultClause) {
    increment(operators, "default");
    return;
  }
  if (kind === SyntaxKind.ReturnStatement) {
    increment(operators, "return");
    return;
  }
  if (kind === SyntaxKind.ThrowStatement) {
    increment(operators, "throw");
    return;
  }
  if (kind === SyntaxKind.TryStatement) {
    increment(operators, "try");
    return;
  }
  if (kind === SyntaxKind.CatchClause) {
    increment(operators, "catch");
    return;
  }
  if (kind === SyntaxKind.Block) {
    // A Block is structural — except the TryStatement's `finally` block,
    // which counts as one "finally" operator.
    const parent = child.getParent();
    if (parent?.isKind(SyntaxKind.TryStatement)) {
      if ((parent as TryStatement).getFinallyBlock() === child) {
        increment(operators, "finally");
      }
    }
    return;
  }

  if (kind === SyntaxKind.VariableDeclarationList) {
    increment(operators, (child as VariableDeclarationList).getDeclarationKind());
    return;
  }

  if (kind === SyntaxKind.VariableDeclaration) {
    // The `=` in `const x = 1` is part of the VariableDeclaration syntax —
    // NOT a BinaryExpression — so we count it here instead.
    if ((child as VariableDeclaration).getInitializer()) increment(operators, "=");
    return;
  }

  if (kind === SyntaxKind.EqualsGreaterThanToken) {
    increment(operators, "=>");
    return;
  }
  if (kind === SyntaxKind.SpreadElement || kind === SyntaxKind.DotDotDotToken) {
    // `...items` (spread) and `...rest` (rest parameter) share the key.
    increment(operators, "...");
    return;
  }
  if (kind === SyntaxKind.ConditionalExpression) {
    increment(operators, "?:");
    return;
  }

  // ---- OPERANDS ----------------------------------------------------------

  if (kind === SyntaxKind.Identifier) {
    if (isInTypeContext(child, root)) return;
    const parent = child.getParent();
    if (parent) {
      const parentKind = parent.getKind();
      // The function's own name identifier is not an operand inside its body.
      if (parent === root && FUNCTION_BOUNDARY_KINDS.has(parentKind)) return;
      // Type-member names inside interfaces / type literals.
      if (
        parentKind === SyntaxKind.PropertySignature ||
        parentKind === SyntaxKind.MethodSignature ||
        parentKind === SyntaxKind.IndexSignature
      ) {
        return;
      }
      // Type argument identifier (redundant with TYPE_ONLY_KINDS skip; kept
      // defensively for cases where the walker reaches the identifier
      // before the TypeReference sweep.)
      if (parentKind === SyntaxKind.TypeReference) return;
    }
    increment(operands, child.getText());
    return;
  }

  if (
    kind === SyntaxKind.NumericLiteral ||
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.NoSubstitutionTemplateLiteral
  ) {
    if (isInTypeContext(child, root)) return;
    increment(operands, child.getText());
    return;
  }

  if (
    kind === SyntaxKind.TemplateHead ||
    kind === SyntaxKind.TemplateMiddle ||
    kind === SyntaxKind.TemplateTail
  ) {
    increment(operands, child.getText());
    return;
  }

  if (kind === SyntaxKind.TrueKeyword) {
    if (isInTypeContext(child, root)) return;
    increment(operands, "true");
    return;
  }
  if (kind === SyntaxKind.FalseKeyword) {
    if (isInTypeContext(child, root)) return;
    increment(operands, "false");
    return;
  }
  if (kind === SyntaxKind.NullKeyword) {
    if (isInTypeContext(child, root)) return;
    increment(operands, "null");
    return;
  }

  if (
    kind === SyntaxKind.RegularExpressionLiteral ||
    kind === SyntaxKind.BigIntLiteral
  ) {
    increment(operands, child.getText());
    return;
  }

  // Anything else is structural; traversal continues into its children.
}

// ---------------------------------------------------------------------------
// Derived reduction
// ---------------------------------------------------------------------------

interface DerivedHalstead {
  n1: number;
  n2: number;
  N1: number;
  N2: number;
  n: number;
  N: number;
}

function computeDerivedValues(counts: HalsteadCounts): DerivedHalstead {
  const n1 = counts.operators.size;
  const n2 = counts.operands.size;
  let N1 = 0;
  for (const count of counts.operators.values()) N1 += count;
  let N2 = 0;
  for (const count of counts.operands.values()) N2 += count;
  return { n1, n2, N1, N2, n: n1 + n2, N: N1 + N2 };
}

function halsteadVolume(n: number, N: number): number {
  return n === 0 ? 0 : N * Math.log2(n);
}

function halsteadDifficulty(n1: number, n2: number, N2: number): number {
  return n2 === 0 ? 0 : (n1 / 2) * (N2 / n2);
}

// ---------------------------------------------------------------------------
// Metric definitions — V / D / E share the verbatim HalsteadDetail payload.
// ---------------------------------------------------------------------------

export const halsteadVolumeDefinition: MetricDefinition<HalsteadDetail> = {
  key: MetricKeys.halsteadVolume,
  name: "Halstead Volume",
  shortCode: "HVol",
  description: "HVol  Information content in bits (N * log2(n))",
  defaultThresholds: { warn: 1000, error: 2000 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext): MetricResult<HalsteadDetail> => {
    const counts = collectHalsteadCounts(ctx.node as FunctionLike);
    const { n1, n2, N1, N2, n, N } = computeDerivedValues(counts);
    return { value: halsteadVolume(n, N), detail: { n1, n2, N1, N2 } };
  },
};

export const halsteadDifficultyDefinition: MetricDefinition<HalsteadDetail> = {
  key: MetricKeys.halsteadDifficulty,
  name: "Halstead Difficulty",
  shortCode: "HDiff",
  description: "HDiff  Error-proneness estimate ((n1/2) * (N2/n2))",
  defaultThresholds: { warn: 30, error: 50 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext): MetricResult<HalsteadDetail> => {
    const counts = collectHalsteadCounts(ctx.node as FunctionLike);
    const { n1, n2, N1, N2 } = computeDerivedValues(counts);
    return {
      value: halsteadDifficulty(n1, n2, N2),
      detail: { n1, n2, N1, N2 },
    };
  },
};

// Thresholds resolve the source/test drift (index.md gotcha): compiled JS has
// `{warn:4000, error:8000}` but the upstream tests assert `{warn:5000,
// error:10000}`. Tests are authoritative per the rebuild policy.
export const halsteadEffortDefinition: MetricDefinition<HalsteadDetail> = {
  key: MetricKeys.halsteadEffort,
  name: "Halstead Effort",
  shortCode: "HEff",
  description: "HEff  Total cognitive effort (D * V)",
  defaultThresholds: { warn: 5000, error: 10000 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: (ctx: MetricComputeContext): MetricResult<HalsteadDetail> => {
    const counts = collectHalsteadCounts(ctx.node as FunctionLike);
    const { n1, n2, N1, N2, n, N } = computeDerivedValues(counts);
    const V = halsteadVolume(n, N);
    const D = halsteadDifficulty(n1, n2, N2);
    return { value: D * V, detail: { n1, n2, N1, N2 } };
  },
};
