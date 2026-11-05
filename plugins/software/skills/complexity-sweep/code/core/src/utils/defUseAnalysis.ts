import {
  type ArrayBindingPattern,
  type BindingElement,
  type Identifier,
  type Node,
  type ObjectBindingPattern,
  type ParameterDeclaration,
  type SourceFile,
  SyntaxKind,
  type VariableDeclaration,
} from "ts-morph";

/**
 * One def-use record per binding-name-per-scope. Destructured patterns produce
 * separate entries per leaf; shadowing produces separate entries with the same
 * `name` (outer first, inner second — see spec §2.5).
 */
export interface DefUseEntry {
  name: string;
  defLine: number;
  lastUseLine: number;
}

/**
 * Internal working record kept alongside the public entry while the algorithm
 * executes. Exposed so peer tests can reason about scope boundaries if needed.
 */
export interface VariableInfo {
  name: string;
  defLine: number;
  declNode: Node;
  scopeBoundary: Node;
}

// Keyed on the function/method Node so that repeated calls (e.g. by both
// peakLiveVariables and variableSpan) share a single computation.
const cache = new WeakMap<Node, DefUseEntry[]>();

/**
 * Three-pass (+ init + materialize) algorithm:
 *  1. Collect parameters (with destructuring).
 *  2. Collect `var`/`let`/`const` declarations inside the function, skipping
 *     descendants that are themselves nested functions.
 *  3. Initialize every entry's `lastUseLine` to its `defLine`.
 *  4. Scan ALL identifiers (including inside nested functions, for closure
 *     handling) and, for each, find the nearest in-scope declaration with the
 *     same name (reverse search handles shadowing).
 *  5. Materialize entries in declaration order, cache, return.
 *
 * `_sourceFile` is unused — retained in the signature for future use and to
 * match the shipped API contract (spec §2.1).
 */
export function buildDefUseMap(node: Node, _sourceFile: SourceFile): DefUseEntry[] {
  const cached = cache.get(node);
  if (cached) return cached;

  const varInfos: VariableInfo[] = [];

  // Pass 1: parameters
  collectParameters(node, varInfos);

  // Pass 2: variable declarations inside the function (excluding nested fns)
  collectLocalDeclarations(node, varInfos);

  // Pass 3: initialize lastUse to defLine (so unused vars report a 0-span)
  const lastUseLines = varInfos.map((v) => v.defLine);

  // Pass 4: identifier scan — closure refs count at their lexical position
  scanIdentifiers(node, varInfos, lastUseLines);

  // Pass 5: materialize
  const entries: DefUseEntry[] = varInfos.map((v, i) => ({
    name: v.name,
    defLine: v.defLine,
    lastUseLine: lastUseLines[i] ?? v.defLine,
  }));

  cache.set(node, entries);
  return entries;
}

// ---------------------------------------------------------------------------
// Pass 1: parameters
// ---------------------------------------------------------------------------

function collectParameters(node: Node, varInfos: VariableInfo[]): void {
  if (!isFunctionLike(node)) return;

  // All four function-like kinds expose `.getParameters()` with the same shape.
  const params = (
    node as unknown as { getParameters(): ParameterDeclaration[] }
  ).getParameters();

  for (const param of params) {
    const bindings = extractBindingNames(param, param.getStartLineNumber());
    for (const b of bindings) {
      varInfos.push({
        name: b.name,
        defLine: b.defLine,
        declNode: param,
        scopeBoundary: findScopeBoundary(param, node),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Pass 2: local variable declarations
// ---------------------------------------------------------------------------

function collectLocalDeclarations(
  root: Node,
  varInfos: VariableInfo[],
): void {
  root.forEachDescendant((child, traversal) => {
    if (isNestedFunctionBoundary(child, root)) {
      traversal.skip();
      return;
    }
    if (!child.isKind(SyntaxKind.VariableDeclaration)) return;

    const bindings = extractBindingNames(child, child.getStartLineNumber());
    for (const b of bindings) {
      varInfos.push({
        name: b.name,
        defLine: b.defLine,
        declNode: child,
        scopeBoundary: findScopeBoundary(child, root),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Pass 4: identifier scan
// ---------------------------------------------------------------------------

function scanIdentifiers(
  root: Node,
  varInfos: VariableInfo[],
  lastUseLines: number[],
): void {
  root.forEachDescendant((child) => {
    if (!child.isKind(SyntaxKind.Identifier)) return;
    if (isDeclarationName(child)) return;
    if (isPropertyAccessName(child)) return;
    if (isPropertyAssignmentKey(child)) return;
    // ShorthandPropertyAssignment (`{ a }`) is intentionally treated as a use.

    const identName = child.getText();
    const identLine = child.getStartLineNumber();

    // Reverse-scan handles shadowing: the nearest enclosing declaration wins.
    for (let i = varInfos.length - 1; i >= 0; i--) {
      const info = varInfos[i];
      if (!info) continue;
      if (info.name !== identName) continue;
      if (!isWithinScope(child, info.scopeBoundary)) continue;

      const current = lastUseLines[i] ?? info.defLine;
      if (identLine > current) lastUseLines[i] = identLine;
      break;
    }
  });
}

// ---------------------------------------------------------------------------
// Binding-name extraction
// ---------------------------------------------------------------------------

interface BindingResult {
  name: string;
  defLine: number;
}

function extractBindingNames(
  node: VariableDeclaration | ParameterDeclaration | BindingElement,
  defLine: number,
): BindingResult[] {
  const results: BindingResult[] = [];
  const nameNode = node.getNameNode();

  if (nameNode.isKind(SyntaxKind.Identifier)) {
    results.push({ name: nameNode.getText(), defLine });
  } else if (
    nameNode.isKind(SyntaxKind.ObjectBindingPattern) ||
    nameNode.isKind(SyntaxKind.ArrayBindingPattern)
  ) {
    collectBindingElementNames(nameNode, defLine, results);
  }

  return results;
}

function collectBindingElementNames(
  pattern: ObjectBindingPattern | ArrayBindingPattern,
  defLine: number,
  results: BindingResult[],
): void {
  for (const element of pattern.getChildrenOfKind(SyntaxKind.BindingElement)) {
    const nameNode = element.getNameNode();
    if (nameNode.isKind(SyntaxKind.Identifier)) {
      results.push({ name: nameNode.getText(), defLine });
    } else if (
      nameNode.isKind(SyntaxKind.ObjectBindingPattern) ||
      nameNode.isKind(SyntaxKind.ArrayBindingPattern)
    ) {
      collectBindingElementNames(nameNode, defLine, results);
    }
  }
}

// ---------------------------------------------------------------------------
// Scope boundary resolution
// ---------------------------------------------------------------------------

function findScopeBoundary(declNode: Node, rootNode: Node): Node {
  if (declNode.isKind(SyntaxKind.Parameter)) return rootNode;

  if (declNode.isKind(SyntaxKind.VariableDeclaration)) {
    if (isVarDeclaration(declNode)) return rootNode;

    const declList = declNode.getParent();
    if (declList?.isKind(SyntaxKind.VariableDeclarationList)) {
      const varStmt = declList.getParent();
      if (
        varStmt?.isKind(SyntaxKind.ForOfStatement) ||
        varStmt?.isKind(SyntaxKind.ForInStatement) ||
        varStmt?.isKind(SyntaxKind.ForStatement)
      ) {
        return varStmt;
      }
    }

    // let/const: walk up to the nearest enclosing Block or CaseClause.
    let current: Node | undefined = declNode.getParent();
    while (current && current !== rootNode) {
      if (
        current.isKind(SyntaxKind.Block) ||
        current.isKind(SyntaxKind.CaseClause)
      ) {
        return current;
      }
      current = current.getParent();
    }
    return rootNode;
  }

  return rootNode;
}

function isVarDeclaration(node: VariableDeclaration): boolean {
  const declList = node.getParent();
  if (!declList?.isKind(SyntaxKind.VariableDeclarationList)) return false;
  // NodeFlags.Let = 1, NodeFlags.Const = 2. `var` has neither bit set.
  return (declList.getFlags() & 3) === 0;
}

// ---------------------------------------------------------------------------
// Misc predicates
// ---------------------------------------------------------------------------

function isNestedFunctionBoundary(child: Node, root: Node): boolean {
  if (child === root) return false;
  return (
    child.isKind(SyntaxKind.FunctionDeclaration) ||
    child.isKind(SyntaxKind.FunctionExpression) ||
    child.isKind(SyntaxKind.ArrowFunction) ||
    child.isKind(SyntaxKind.MethodDeclaration)
  );
}

function isFunctionLike(node: Node): boolean {
  return (
    node.isKind(SyntaxKind.FunctionDeclaration) ||
    node.isKind(SyntaxKind.FunctionExpression) ||
    node.isKind(SyntaxKind.MethodDeclaration) ||
    node.isKind(SyntaxKind.ArrowFunction)
  );
}

function isWithinScope(identNode: Node, scopeBoundary: Node): boolean {
  let current: Node | undefined = identNode;
  while (current) {
    if (current === scopeBoundary) return true;
    current = current.getParent();
  }
  return false;
}

function isDeclarationName(ident: Identifier): boolean {
  const parent = ident.getParent();
  if (!parent) return false;
  if (
    parent.isKind(SyntaxKind.VariableDeclaration) &&
    parent.getNameNode() === ident
  ) {
    return true;
  }
  if (
    parent.isKind(SyntaxKind.Parameter) &&
    parent.getNameNode() === ident
  ) {
    return true;
  }
  if (
    parent.isKind(SyntaxKind.BindingElement) &&
    parent.getNameNode() === ident
  ) {
    return true;
  }
  return false;
}

function isPropertyAccessName(ident: Identifier): boolean {
  const parent = ident.getParent();
  if (!parent?.isKind(SyntaxKind.PropertyAccessExpression)) return false;
  // Skip only the right-hand `.b` — keep the left-hand receiver `a`.
  return (
    parent.getLastChild() === ident && parent.getFirstChild() !== ident
  );
}

function isPropertyAssignmentKey(ident: Identifier): boolean {
  const parent = ident.getParent();
  if (!parent?.isKind(SyntaxKind.PropertyAssignment)) return false;
  return parent.getNameNode() === ident;
}
