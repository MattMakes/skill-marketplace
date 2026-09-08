"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.halsteadEffortDefinition = exports.halsteadDifficultyDefinition = exports.halsteadVolumeDefinition = void 0;
exports.collectHalsteadCounts = collectHalsteadCounts;
const ts_morph_1 = require("ts-morph");
const registry_1 = require("../registry");
// ---------------------------------------------------------------------------
// Cache: one HalsteadCounts per function node, shared across V/D/E metrics.
// ---------------------------------------------------------------------------
const halsteadCache = new WeakMap();
// ---------------------------------------------------------------------------
// Classification sets
// ---------------------------------------------------------------------------
/**
 * TypeScript type-only node kinds. Descent is fully skipped — nothing inside a
 * type annotation counts as operator or operand.
 */
const TYPE_ONLY_KINDS = new Set([
    ts_morph_1.SyntaxKind.TypeAliasDeclaration,
    ts_morph_1.SyntaxKind.InterfaceDeclaration,
    ts_morph_1.SyntaxKind.TypeReference,
    ts_morph_1.SyntaxKind.TypeLiteral,
    ts_morph_1.SyntaxKind.TypeParameter,
    ts_morph_1.SyntaxKind.TypeQuery,
    ts_morph_1.SyntaxKind.MappedType,
    ts_morph_1.SyntaxKind.ConditionalType,
    ts_morph_1.SyntaxKind.UnionType,
    ts_morph_1.SyntaxKind.IntersectionType,
    ts_morph_1.SyntaxKind.TupleType,
    ts_morph_1.SyntaxKind.ArrayType,
    ts_morph_1.SyntaxKind.FunctionType,
    ts_morph_1.SyntaxKind.ConstructorType,
    ts_morph_1.SyntaxKind.IndexedAccessType,
    ts_morph_1.SyntaxKind.LiteralType,
    ts_morph_1.SyntaxKind.TemplateLiteralType,
    ts_morph_1.SyntaxKind.TypeOperator,
    ts_morph_1.SyntaxKind.RestType,
    ts_morph_1.SyntaxKind.OptionalType,
    ts_morph_1.SyntaxKind.ParenthesizedType,
    ts_morph_1.SyntaxKind.InferType,
    ts_morph_1.SyntaxKind.ThisType,
    ts_morph_1.SyntaxKind.TypePredicate,
    ts_morph_1.SyntaxKind.ImportType,
]);
/** Nested function boundaries — descent stops so inner fns aren't double-counted. */
const FUNCTION_BOUNDARY_KINDS = new Set([
    ts_morph_1.SyntaxKind.FunctionDeclaration,
    ts_morph_1.SyntaxKind.FunctionExpression,
    ts_morph_1.SyntaxKind.ArrowFunction,
    ts_morph_1.SyntaxKind.MethodDeclaration,
]);
/** Binary operator tokens (middle-child of BinaryExpression) → operator text. */
const BINARY_OPERATOR_MAP = new Map([
    // Arithmetic
    [ts_morph_1.SyntaxKind.PlusToken, "+"],
    [ts_morph_1.SyntaxKind.MinusToken, "-"],
    [ts_morph_1.SyntaxKind.AsteriskToken, "*"],
    [ts_morph_1.SyntaxKind.SlashToken, "/"],
    [ts_morph_1.SyntaxKind.PercentToken, "%"],
    [ts_morph_1.SyntaxKind.AsteriskAsteriskToken, "**"],
    // Comparison
    [ts_morph_1.SyntaxKind.EqualsEqualsToken, "=="],
    [ts_morph_1.SyntaxKind.ExclamationEqualsToken, "!="],
    [ts_morph_1.SyntaxKind.EqualsEqualsEqualsToken, "==="],
    [ts_morph_1.SyntaxKind.ExclamationEqualsEqualsToken, "!=="],
    [ts_morph_1.SyntaxKind.LessThanToken, "<"],
    [ts_morph_1.SyntaxKind.GreaterThanToken, ">"],
    [ts_morph_1.SyntaxKind.LessThanEqualsToken, "<="],
    [ts_morph_1.SyntaxKind.GreaterThanEqualsToken, ">="],
    // Logical
    [ts_morph_1.SyntaxKind.AmpersandAmpersandToken, "&&"],
    [ts_morph_1.SyntaxKind.BarBarToken, "||"],
    [ts_morph_1.SyntaxKind.QuestionQuestionToken, "??"],
    // Bitwise
    [ts_morph_1.SyntaxKind.AmpersandToken, "&"],
    [ts_morph_1.SyntaxKind.BarToken, "|"],
    [ts_morph_1.SyntaxKind.CaretToken, "^"],
    [ts_morph_1.SyntaxKind.LessThanLessThanToken, "<<"],
    [ts_morph_1.SyntaxKind.GreaterThanGreaterThanToken, ">>"],
    [ts_morph_1.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, ">>>"],
    // Binary keyword operators
    [ts_morph_1.SyntaxKind.InKeyword, "in"],
    [ts_morph_1.SyntaxKind.InstanceOfKeyword, "instanceof"],
]);
/** Assignment operator tokens → operator text. Checked before BINARY_OPERATOR_MAP. */
const ASSIGNMENT_OPERATOR_MAP = new Map([
    [ts_morph_1.SyntaxKind.EqualsToken, "="],
    [ts_morph_1.SyntaxKind.PlusEqualsToken, "+="],
    [ts_morph_1.SyntaxKind.MinusEqualsToken, "-="],
    [ts_morph_1.SyntaxKind.AsteriskEqualsToken, "*="],
    [ts_morph_1.SyntaxKind.SlashEqualsToken, "/="],
    [ts_morph_1.SyntaxKind.PercentEqualsToken, "%="],
    [ts_morph_1.SyntaxKind.AsteriskAsteriskEqualsToken, "**="],
    [ts_morph_1.SyntaxKind.AmpersandAmpersandEqualsToken, "&&="],
    [ts_morph_1.SyntaxKind.BarBarEqualsToken, "||="],
    [ts_morph_1.SyntaxKind.QuestionQuestionEqualsToken, "??="],
    [ts_morph_1.SyntaxKind.LessThanLessThanEqualsToken, "<<="],
    [ts_morph_1.SyntaxKind.GreaterThanGreaterThanEqualsToken, ">>="],
    [ts_morph_1.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, ">>>="],
    [ts_morph_1.SyntaxKind.AmpersandEqualsToken, "&="],
    [ts_morph_1.SyntaxKind.BarEqualsToken, "|="],
    [ts_morph_1.SyntaxKind.CaretEqualsToken, "^="],
]);
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function increment(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}
/**
 * Walks ancestors of `node` up to (but not including) `boundary`. Returns true
 * if any ancestor is a type-only kind. Guards identifiers/literals that slip
 * past the top-level TYPE_ONLY_KINDS skip (e.g. inside mapped-type bodies).
 */
function isInTypeContext(node, boundary) {
    let current = node.getParent();
    while (current && current !== boundary) {
        if (TYPE_ONLY_KINDS.has(current.getKind()))
            return true;
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
function collectHalsteadCounts(node) {
    const cached = halsteadCache.get(node);
    if (cached)
        return cached;
    const operators = new Map();
    const operands = new Map();
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
        if (kind === ts_morph_1.SyntaxKind.AsExpression)
            return;
        // Non-null `!`: purely a type assertion. Not counted.
        if (kind === ts_morph_1.SyntaxKind.NonNullExpression)
            return;
        // `function` keyword token: structural, not an operator in the body.
        if (kind === ts_morph_1.SyntaxKind.FunctionKeyword)
            return;
        classify(child, kind, node, operators, operands);
    });
    const result = { operators, operands };
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
function classify(child, kind, root, operators, operands) {
    // ---- OPERATORS ---------------------------------------------------------
    if (kind === ts_morph_1.SyntaxKind.BinaryExpression) {
        const opToken = child.getOperatorToken();
        const opKind = opToken.getKind();
        const assign = ASSIGNMENT_OPERATOR_MAP.get(opKind);
        if (assign !== undefined) {
            increment(operators, assign);
        }
        else {
            const binary = BINARY_OPERATOR_MAP.get(opKind);
            if (binary !== undefined)
                increment(operators, binary);
        }
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.PrefixUnaryExpression) {
        const opKind = child.getOperatorToken();
        if (opKind === ts_morph_1.SyntaxKind.ExclamationToken)
            increment(operators, "!");
        else if (opKind === ts_morph_1.SyntaxKind.PlusPlusToken)
            increment(operators, "++");
        else if (opKind === ts_morph_1.SyntaxKind.MinusMinusToken)
            increment(operators, "--");
        else if (opKind === ts_morph_1.SyntaxKind.TildeToken)
            increment(operators, "~");
        else if (opKind === ts_morph_1.SyntaxKind.MinusToken)
            increment(operators, "unary-");
        else if (opKind === ts_morph_1.SyntaxKind.PlusToken)
            increment(operators, "unary+");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.PostfixUnaryExpression) {
        const opKind = child.getOperatorToken();
        if (opKind === ts_morph_1.SyntaxKind.PlusPlusToken)
            increment(operators, "++");
        else if (opKind === ts_morph_1.SyntaxKind.MinusMinusToken)
            increment(operators, "--");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.PropertyAccessExpression) {
        increment(operators, ".");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.QuestionDotToken) {
        increment(operators, "?.");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.ElementAccessExpression) {
        increment(operators, "[]");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.CallExpression) {
        increment(operators, "()");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.NewExpression) {
        increment(operators, "new");
        increment(operators, "()");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.TypeOfExpression) {
        increment(operators, "typeof");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.DeleteExpression) {
        increment(operators, "delete");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.VoidExpression) {
        increment(operators, "void");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.AwaitExpression) {
        increment(operators, "await");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.YieldExpression) {
        increment(operators, "yield");
        return;
    }
    // Control-flow keyword operators
    if (kind === ts_morph_1.SyntaxKind.IfStatement) {
        increment(operators, "if");
        if (child.getElseStatement())
            increment(operators, "else");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.ForStatement) {
        increment(operators, "for");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.ForInStatement) {
        increment(operators, "for");
        increment(operators, "in");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.ForOfStatement) {
        increment(operators, "for");
        increment(operators, "of");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.WhileStatement) {
        increment(operators, "while");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.DoStatement) {
        increment(operators, "do");
        increment(operators, "while");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.SwitchStatement) {
        increment(operators, "switch");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.CaseClause) {
        increment(operators, "case");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.DefaultClause) {
        increment(operators, "default");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.ReturnStatement) {
        increment(operators, "return");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.ThrowStatement) {
        increment(operators, "throw");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.TryStatement) {
        increment(operators, "try");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.CatchClause) {
        increment(operators, "catch");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.Block) {
        // A Block is structural — except the TryStatement's `finally` block,
        // which counts as one "finally" operator.
        const parent = child.getParent();
        if (parent?.isKind(ts_morph_1.SyntaxKind.TryStatement)) {
            if (parent.getFinallyBlock() === child) {
                increment(operators, "finally");
            }
        }
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.VariableDeclarationList) {
        increment(operators, child.getDeclarationKind());
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.VariableDeclaration) {
        // The `=` in `const x = 1` is part of the VariableDeclaration syntax —
        // NOT a BinaryExpression — so we count it here instead.
        if (child.getInitializer())
            increment(operators, "=");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.EqualsGreaterThanToken) {
        increment(operators, "=>");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.SpreadElement || kind === ts_morph_1.SyntaxKind.DotDotDotToken) {
        // `...items` (spread) and `...rest` (rest parameter) share the key.
        increment(operators, "...");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.ConditionalExpression) {
        increment(operators, "?:");
        return;
    }
    // ---- OPERANDS ----------------------------------------------------------
    if (kind === ts_morph_1.SyntaxKind.Identifier) {
        if (isInTypeContext(child, root))
            return;
        const parent = child.getParent();
        if (parent) {
            const parentKind = parent.getKind();
            // The function's own name identifier is not an operand inside its body.
            if (parent === root && FUNCTION_BOUNDARY_KINDS.has(parentKind))
                return;
            // Type-member names inside interfaces / type literals.
            if (parentKind === ts_morph_1.SyntaxKind.PropertySignature ||
                parentKind === ts_morph_1.SyntaxKind.MethodSignature ||
                parentKind === ts_morph_1.SyntaxKind.IndexSignature) {
                return;
            }
            // Type argument identifier (redundant with TYPE_ONLY_KINDS skip; kept
            // defensively for cases where the walker reaches the identifier
            // before the TypeReference sweep.)
            if (parentKind === ts_morph_1.SyntaxKind.TypeReference)
                return;
        }
        increment(operands, child.getText());
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.NumericLiteral ||
        kind === ts_morph_1.SyntaxKind.StringLiteral ||
        kind === ts_morph_1.SyntaxKind.NoSubstitutionTemplateLiteral) {
        if (isInTypeContext(child, root))
            return;
        increment(operands, child.getText());
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.TemplateHead ||
        kind === ts_morph_1.SyntaxKind.TemplateMiddle ||
        kind === ts_morph_1.SyntaxKind.TemplateTail) {
        increment(operands, child.getText());
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.TrueKeyword) {
        if (isInTypeContext(child, root))
            return;
        increment(operands, "true");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.FalseKeyword) {
        if (isInTypeContext(child, root))
            return;
        increment(operands, "false");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.NullKeyword) {
        if (isInTypeContext(child, root))
            return;
        increment(operands, "null");
        return;
    }
    if (kind === ts_morph_1.SyntaxKind.RegularExpressionLiteral ||
        kind === ts_morph_1.SyntaxKind.BigIntLiteral) {
        increment(operands, child.getText());
        return;
    }
    // Anything else is structural; traversal continues into its children.
}
function computeDerivedValues(counts) {
    const n1 = counts.operators.size;
    const n2 = counts.operands.size;
    let N1 = 0;
    for (const count of counts.operators.values())
        N1 += count;
    let N2 = 0;
    for (const count of counts.operands.values())
        N2 += count;
    return { n1, n2, N1, N2, n: n1 + n2, N: N1 + N2 };
}
function halsteadVolume(n, N) {
    return n === 0 ? 0 : N * Math.log2(n);
}
function halsteadDifficulty(n1, n2, N2) {
    return n2 === 0 ? 0 : (n1 / 2) * (N2 / n2);
}
// ---------------------------------------------------------------------------
// Metric definitions — V / D / E share the verbatim HalsteadDetail payload.
// ---------------------------------------------------------------------------
exports.halsteadVolumeDefinition = {
    key: registry_1.MetricKeys.halsteadVolume,
    name: "Halstead Volume",
    shortCode: "HVol",
    description: "HVol  Information content in bits (N * log2(n))",
    defaultThresholds: { warn: 1000, error: 2000 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => {
        const counts = collectHalsteadCounts(ctx.node);
        const { n1, n2, N1, N2, n, N } = computeDerivedValues(counts);
        return { value: halsteadVolume(n, N), detail: { n1, n2, N1, N2 } };
    },
};
exports.halsteadDifficultyDefinition = {
    key: registry_1.MetricKeys.halsteadDifficulty,
    name: "Halstead Difficulty",
    shortCode: "HDiff",
    description: "HDiff  Error-proneness estimate ((n1/2) * (N2/n2))",
    defaultThresholds: { warn: 30, error: 50 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => {
        const counts = collectHalsteadCounts(ctx.node);
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
exports.halsteadEffortDefinition = {
    key: registry_1.MetricKeys.halsteadEffort,
    name: "Halstead Effort",
    shortCode: "HEff",
    description: "HEff  Total cognitive effort (D * V)",
    defaultThresholds: { warn: 5000, error: 10000 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: (ctx) => {
        const counts = collectHalsteadCounts(ctx.node);
        const { n1, n2, N1, N2, n, N } = computeDerivedValues(counts);
        const V = halsteadVolume(n, N);
        const D = halsteadDifficulty(n1, n2, N2);
        return { value: D * V, detail: { n1, n2, N1, N2 } };
    },
};
//# sourceMappingURL=halstead.js.map