// Python def-use analysis and name resolution (design section 5.6).
//
// Port of `utils/defUseAnalysis.ts` for Python function scope: one entry per
// name per unit, at the first binding of the name. Every later identifier
// occurrence that resolves to the entry raises its `lastUseLine`, including
// occurrences inside nested units (closures), unless the nested `def` binds
// the same name (shadowing).
//
// Choices where the design is silent (TypeScript behavior ported where it
// applies):
// - `match` case captures (`case x`, `*rest`, `case P() as p`, `P(k=v)`) are
//   bindings, like the Rust `match_arm` pattern bindings.
// - `x += 1` is a binding (Python makes `x` local), like a plain assignment.
// - A nested `def` or `class` name is a local binding but NOT an entry (the
//   TypeScript util does not record function declarations either).
// - Bindings inside a class body in the unit are class-scoped: they are not
//   entries. Occurrences in the class body still resolve to the unit.
// - A binding in the header of a nested `def` or `class` (a walrus in a default,
//   an annotation or a class argument) belongs to the enclosing unit. The nested
//   body is the only part that the binding scan skips.
// - The unit's own name is not an occurrence (it binds in the enclosing scope).

import type { DefUseEntry } from "../../utils/defUseAnalysis";
import { createNodeCache, lineOf, sameNode, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import { isPythonFunction } from "./nodeTypes";

export type { DefUseEntry };

/** The first binding of one name in a unit. */
interface Binding {
  name: string;
  line: number;
}

/** The scope facts of one `function_definition`. */
export interface PythonScope {
  /** First binding per name, parameters first, then body bindings in source order. */
  bindings: Binding[];
  /** Every name the unit binds locally: parameters (also `self`/`cls`), bindings, nested def/class names. */
  localNames: Set<string>;
  /** Names in a `global` statement of the unit. */
  declaredGlobal: Set<string>;
  /** Names in a `nonlocal` statement of the unit. */
  declaredNonlocal: Set<string>;
}

const METHOD_RECEIVERS = new Set(["self", "cls"]);

/** Target node types whose named children are target leaves or nested patterns. */
const TARGET_CONTAINER_TYPES = new Set([
  "pattern_list",
  "tuple_pattern",
  "list_pattern",
  "tuple",
  "list",
  "expression_list",
  "parenthesized_expression",
  "list_splat_pattern",
  "list_splat",
  "as_pattern_target",
]);

/** Parent types of a single-name `dotted_name` that is a case capture. */
const CASE_CAPTURE_PARENT_TYPES = new Set(["case_pattern", "keyword_pattern"]);


const IMPORT_TYPES = new Set(["import_statement", "import_from_statement"]);

const scopeCache = createNodeCache<PythonScope>();
const defUseCache = createNodeCache<DefUseEntry[]>();

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

/** The name `identifier` nodes of a `parameters` or `lambda_parameters` node, in order. */
export function parameterNameNodes(params: SyntaxNode | null): SyntaxNode[] {
  if (params === null) return [];
  const names: SyntaxNode[] = [];
  for (const param of params.namedChildren) {
    const name = parameterName(param);
    if (name !== null) names.push(name);
  }
  return names;
}

function parameterName(param: SyntaxNode): SyntaxNode | null {
  switch (param.type) {
    case "identifier":
      return param;
    case "default_parameter":
    case "typed_default_parameter":
      return param.childForFieldName("name");
    case "typed_parameter":
    case "list_splat_pattern":
    case "dictionary_splat_pattern": {
      const first = param.firstNamedChild;
      return first === null ? null : parameterName(first);
    }
    default:
      return null;
  }
}

/** True when `fn` is a `function_definition` directly in a class body (decorators allowed). */
function isMethod(fn: SyntaxNode): boolean {
  let parent = fn.parent;
  if (parent?.type === "decorated_definition") parent = parent.parent;
  return parent?.type === "block" && parent.parent?.type === "class_definition";
}

/**
 * The parameter names of a unit that count as entries (sections 5.5, 5.6):
 * every parameter, except a first `self`/`cls` parameter of a method.
 */
export function unitParameterNodes(fn: SyntaxNode): SyntaxNode[] {
  const names = parameterNameNodes(fn.childForFieldName("parameters"));
  const first = names[0];
  if (first !== undefined && isMethod(fn) && METHOD_RECEIVERS.has(first.text)) {
    return names.slice(1);
  }
  return names;
}

// ---------------------------------------------------------------------------
// Occurrences
// ---------------------------------------------------------------------------

/**
 * True for an `identifier` that names a variable. False for the attribute part
 * of `obj.name`, a keyword-argument name, a keyword in a class pattern, the
 * tail of a dotted name, and an import module path.
 */
export function isNameOccurrence(node: SyntaxNode): boolean {
  if (node.type !== "identifier") return false;
  const parent = node.parent;
  if (parent === null) return true;
  switch (parent.type) {
    case "attribute":
      return !sameNode(parent.childForFieldName("attribute"), node);
    case "keyword_argument":
      return !sameNode(parent.childForFieldName("name"), node);
    case "keyword_pattern":
      return !sameNode(parent.firstNamedChild, node);
    case "dotted_name":
      return sameNode(parent.firstNamedChild, node) && !isImportModulePath(parent);
    default:
      return true;
  }
}

function isImportModulePath(dotted: SyntaxNode): boolean {
  const parent = dotted.parent;
  if (parent === null) return false;
  if (parent.type === "relative_import") return true;
  return parent.type === "import_from_statement" && sameNode(parent.childForFieldName("module_name"), dotted);
}

// ---------------------------------------------------------------------------
// Scope collection
// ---------------------------------------------------------------------------

/** Scope facts of a `function_definition`. Cached per node. */
export function pythonScope(fn: SyntaxNode): PythonScope {
  const cached = scopeCache.get(fn);
  if (cached !== undefined) return cached;

  const scope: PythonScope = {
    bindings: [],
    localNames: new Set(),
    declaredGlobal: new Set(),
    declaredNonlocal: new Set(),
  };
  collectDeclarations(fn, scope);

  const params = parameterNameNodes(fn.childForFieldName("parameters"));
  for (const param of params) scope.localNames.add(param.text);
  const bound = new Set<string>();
  for (const param of unitParameterNodes(fn)) bind(scope, bound, param);

  collectBindings(fn, scope, bound);
  scopeCache.set(fn, scope);
  return scope;
}

/** Records `global` and `nonlocal` names of the unit (nested units skipped). */
function collectDeclarations(fn: SyntaxNode, scope: PythonScope): void {
  walkDescendants(fn, (node) => {
    if (isPythonFunction(node) || node.type === "class_definition") return false;
    const target =
      node.type === "global_statement"
        ? scope.declaredGlobal
        : node.type === "nonlocal_statement"
          ? scope.declaredNonlocal
          : null;
    if (target === null) return;
    for (const name of node.namedChildren) {
      if (name.type === "identifier") target.add(name.text);
    }
    return false;
  });
}

function collectBindings(fn: SyntaxNode, scope: PythonScope, bound: Set<string>): void {
  const body = fn.childForFieldName("body");
  if (body === null) return;
  const visit = (node: SyntaxNode): boolean | void => {
    if (isPythonFunction(node) || node.type === "class_definition") {
      const name = node.childForFieldName("name");
      if (name !== null && !isDeclaredOutside(scope, name.text)) scope.localNames.add(name.text);
      collectHeaderBindings(node, visit);
      return false;
    }
    for (const target of bindingTargets(node)) bind(scope, bound, target);
  };
  walkDescendants(body, visit);
}

/**
 * Everything of a nested `def` or `class` except its body runs in the outer
 * scope: defaults, annotations and class arguments. Bindings there (a walrus)
 * belong to the outer unit, so the nested body is the only part skipped.
 */
function collectHeaderBindings(
  nested: SyntaxNode,
  visit: (node: SyntaxNode) => boolean | void,
): void {
  const body = nested.childForFieldName("body");
  for (const child of nested.namedChildren) {
    if (sameNode(child, body)) continue;
    visit(child);
    walkDescendants(child, visit);
  }
}

/** The name nodes that `node` binds in the current function scope. */
function bindingTargets(node: SyntaxNode): SyntaxNode[] {
  switch (node.type) {
    case "assignment":
    case "for_statement":
    case "for_in_clause":
      return targetLeaves(node.childForFieldName("left"));
    case "augmented_assignment": {
      const left = node.childForFieldName("left");
      return left?.type === "identifier" ? [left] : [];
    }
    case "as_pattern_target":
      return targetLeaves(node);
    case "named_expression":
      return nonNull([node.childForFieldName("name")]);
    case "import_statement":
    case "import_from_statement":
      return importedNames(node);
    case "lambda":
      return parameterNameNodes(node.childForFieldName("parameters"));
    case "dotted_name":
      return isCaseCapture(node) ? nonNull([node.firstNamedChild]) : [];
    case "identifier":
      return isCaseIdentifierCapture(node) ? [node] : [];
    default:
      return [];
  }
}

/** Identifier leaves of an assignment, `for` or `as` target. Attribute and subscript targets bind nothing. */
function targetLeaves(target: SyntaxNode | null): SyntaxNode[] {
  if (target === null) return [];
  if (target.type === "identifier") return [target];
  if (!TARGET_CONTAINER_TYPES.has(target.type)) return [];
  return target.namedChildren.flatMap((child) => targetLeaves(child));
}

/** `import a.b` binds `a`; `import a as b` and `from m import a as b` bind `b`; `from m import a` binds `a`. */
function importedNames(node: SyntaxNode): SyntaxNode[] {
  const names: SyntaxNode[] = [];
  for (const name of node.childrenForFieldName("name")) {
    const bound =
      name.type === "aliased_import" ? name.childForFieldName("alias") : name.firstNamedChild;
    if (bound !== null) names.push(bound);
  }
  return names;
}

/** A capture pattern: a single-name `dotted_name` as a case pattern or a keyword-pattern value. */
function isCaseCapture(dotted: SyntaxNode): boolean {
  return dotted.namedChildCount === 1 && CASE_CAPTURE_PARENT_TYPES.has(dotted.parent?.type ?? "");
}

/**
 * `*rest` in a sequence or mapping pattern, or the alias of `case P() as name`.
 * An `except E as name` alias is an `as_pattern_target`, so it does not match here.
 */
function isCaseIdentifierCapture(id: SyntaxNode): boolean {
  const parent = id.parent;
  if (parent?.type === "splat_pattern") return true;
  return (
    parent?.type === "as_pattern" &&
    parent.parent?.type === "case_pattern" &&
    sameNode(parent.lastNamedChild, id)
  );
}

function isDeclaredOutside(scope: PythonScope, name: string): boolean {
  return scope.declaredGlobal.has(name) || scope.declaredNonlocal.has(name);
}

/** Records the first binding of a name. `bound` holds the names that have an entry. */
function bind(scope: PythonScope, bound: Set<string>, nameNode: SyntaxNode): void {
  const name = nameNode.text;
  if (isDeclaredOutside(scope, name) || bound.has(name)) return;
  bound.add(name);
  scope.localNames.add(name);
  scope.bindings.push({ name, line: lineOf(nameNode) });
}

function nonNull(nodes: (SyntaxNode | null)[]): SyntaxNode[] {
  return nodes.filter((node): node is SyntaxNode => node !== null);
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Visits every name occurrence in the unit `fn` that resolves to the scope of
 * `fn`. It descends into nested units (closures) and skips the names that a
 * nested unit binds itself or declares `global`.
 */
export function forEachResolvedName(fn: SyntaxNode, visit: (id: SyntaxNode) => void): void {
  const name = fn.childForFieldName("name");
  scanNode(fn, new Set(), (id) => {
    if (!sameNode(id, name)) visit(id);
  });
}

function scanNode(
  root: SyntaxNode,
  shadowed: ReadonlySet<string>,
  visit: (id: SyntaxNode) => void,
): void {
  walkDescendants(root, (node) => {
    if (isPythonFunction(node)) {
      scanNestedFunction(node, shadowed, visit);
      return false;
    }
    if (isNameOccurrence(node) && !shadowed.has(node.text)) visit(node);
  });
}

/**
 * A nested `def`: its name, defaults, annotations and return type resolve in
 * the outer scope. Its parameter names and body resolve in its own scope.
 */
function scanNestedFunction(
  fn: SyntaxNode,
  shadowed: ReadonlySet<string>,
  visit: (id: SyntaxNode) => void,
): void {
  const inner = pythonScope(fn);
  const innerShadowed = new Set(shadowed);
  for (const name of inner.localNames) innerShadowed.add(name);
  for (const name of inner.declaredGlobal) innerShadowed.add(name);

  const params = fn.childForFieldName("parameters");
  const paramIds = new Set(parameterNameNodes(params).map((p) => p.id));
  for (const child of fn.namedChildren) {
    if (sameNode(child, fn.childForFieldName("body"))) {
      scanNode(child, innerShadowed, visit);
    } else if (sameNode(child, params)) {
      walkDescendants(child, (node) => {
        if (paramIds.has(node.id)) return false;
        if (isNameOccurrence(node) && !shadowed.has(node.text)) visit(node);
      });
    } else if (isNameOccurrence(child)) {
      if (!shadowed.has(child.text)) visit(child);
    } else {
      scanNode(child, shadowed, visit);
    }
  }
}

// ---------------------------------------------------------------------------
// Def-use
// ---------------------------------------------------------------------------

/**
 * Def-use entries `{ name, defLine, lastUseLine }` of a Python unit, in
 * declaration order. Cached per function node (peakLiveVariables and
 * variableSpan both read it).
 */
export function buildPythonDefUse(fn: SyntaxNode): DefUseEntry[] {
  const cached = defUseCache.get(fn);
  if (cached !== undefined) return cached;

  const { bindings } = pythonScope(fn);
  const indexByName = new Map<string, number>();
  const entries: DefUseEntry[] = bindings.map((b, i) => {
    indexByName.set(b.name, i);
    return { name: b.name, defLine: b.line, lastUseLine: b.line };
  });

  forEachResolvedName(fn, (id) => {
    const entry = entries[indexByName.get(id.text) ?? -1];
    if (entry === undefined) return;
    const line = lineOf(id);
    if (line > entry.lastUseLine) entry.lastUseLine = line;
  });

  defUseCache.set(fn, entries);
  return entries;
}
