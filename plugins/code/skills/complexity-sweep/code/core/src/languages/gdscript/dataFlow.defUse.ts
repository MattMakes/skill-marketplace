// GDScript def-use analysis (design 5.6 and 9.4). Shared by peakLiveVariables,
// variableSpan and globalDataComplexity.
//
// GDScript locals have block scope, so this follows the Rust model: 1 entry
// per declaration, and each identifier occurrence resolves to the nearest
// earlier declaration with the same name whose scope holds it. A `lambda` is
// not a unit (D1): its parameters are entries and its body is scanned.

import { createNodeCache, lineOf, sameNode, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import { isGdscriptFunction } from "./nodeTypes";

export interface GdscriptDefUseEntry {
  name: string;
  defLine: number;
  lastUseLine: number;
}

interface GdscriptVariableInfo {
  name: string;
  defLine: number;
  /** An occurrence must start at or after this offset (after the declared name). */
  visibleFrom: number;
  scopeBoundary: SyntaxNode;
  /** The initializer of the declaration. Its occurrences resolve to an outer entry. */
  initializer: SyntaxNode | null;
}

const PARAMETER_WRAPPER_TYPES = new Set([
  "typed_parameter",
  "default_parameter",
  "typed_default_parameter",
  "variadic_parameter",
]);

const LOCAL_DECLARATION_TYPES = new Set(["variable_statement", "const_statement"]);

// `self` and `super` are identifiers, but they never name a local (9.4).
const NON_VARIABLE_NAMES = new Set(["self", "super"]);

const defUseCache = createNodeCache<GdscriptDefUseEntry[]>();

/** Build GDScript binding ranges in declaration order. */
export function buildGdscriptDefUse(node: SyntaxNode): GdscriptDefUseEntry[] {
  const cached = defUseCache.get(node);
  if (cached !== undefined) return cached;

  const infos: GdscriptVariableInfo[] = [];
  const declarationIds = new Set<number>();
  for (const name of unitParameterNames(node)) {
    addInfo(name, node, null, infos, declarationIds);
  }
  collectLocalDeclarations(node, infos, declarationIds);

  const lastUseLines = infos.map((info) => info.defLine);
  scanOccurrences(node, infos, declarationIds, lastUseLines);

  const entries = infos.map((info, index) => ({
    name: info.name,
    defLine: info.defLine,
    lastUseLine: lastUseLines[index] ?? info.defLine,
  }));
  defUseCache.set(node, entries);
  return entries;
}

/**
 * The `parameters` node of a unit or a lambda. A `function_definition`,
 * `constructor_definition` and `lambda` have a `parameters` field. A `set_body`
 * holds an unnamed `parameters` child. A `get_body` has none.
 */
function parametersOf(node: SyntaxNode): SyntaxNode | null {
  const field = node.childForFieldName("parameters");
  if (field !== null) return field;
  return node.namedChildren.find((child) => child.type === "parameters") ?? null;
}

/** The name `identifier` of each parameter in the unit's `parameters` (5.5). */
export function unitParameterNames(node: SyntaxNode): SyntaxNode[] {
  const parameters = parametersOf(node);
  if (parameters === null) return [];
  const names: SyntaxNode[] = [];
  for (const parameter of parameters.namedChildren) {
    const name = parameterName(parameter);
    if (name !== null) names.push(name);
  }
  return names;
}

// `a`, `a: int`, `a = 1`, `a: int = 1` and `...rest: Array`. The name is the
// first `identifier` child; a `variadic_parameter` wraps 1 of the other forms.
function parameterName(parameter: SyntaxNode): SyntaxNode | null {
  if (parameter.type === "identifier") return parameter;
  if (!PARAMETER_WRAPPER_TYPES.has(parameter.type)) return null;
  const first = parameter.namedChildren[0];
  if (first === undefined) return null;
  return parameterName(first);
}

function collectLocalDeclarations(
  root: SyntaxNode,
  infos: GdscriptVariableInfo[],
  declarationIds: Set<number>,
): void {
  walkDescendants(root, (node) => {
    if (isGdscriptFunction(node)) return false;

    if (LOCAL_DECLARATION_TYPES.has(node.type)) {
      const name = node.childForFieldName("name");
      if (name === null) return;
      const scope = nearestAncestorOfType(node, "body", root) ?? root;
      addInfo(name, scope, node.childForFieldName("value"), infos, declarationIds);
      return;
    }

    if (node.type === "for_statement") {
      const left = node.childForFieldName("left");
      if (left?.type !== "identifier") return;
      addInfo(left, node, node.childForFieldName("right"), infos, declarationIds);
      return;
    }

    if (node.type === "pattern_binding") {
      // The scope is the `pattern_section`, so its `pattern_guard` and body
      // resolve to the binding (Rust review F4).
      const section = nearestAncestorOfType(node, "pattern_section", root);
      const name = node.namedChildren.find((child) => child.type === "identifier");
      if (section === null || name === undefined) return;
      addInfo(name, section, null, infos, declarationIds);
      return;
    }

    if (node.type === "lambda") {
      for (const name of unitParameterNames(node)) {
        addInfo(name, node, null, infos, declarationIds);
      }
    }
  });
}

function addInfo(
  nameNode: SyntaxNode,
  scopeBoundary: SyntaxNode,
  initializer: SyntaxNode | null,
  infos: GdscriptVariableInfo[],
  declarationIds: Set<number>,
): void {
  declarationIds.add(nameNode.id);
  infos.push({
    name: nameNode.text,
    defLine: lineOf(nameNode),
    visibleFrom: nameNode.endIndex,
    scopeBoundary,
    initializer,
  });
}

function scanOccurrences(
  root: SyntaxNode,
  infos: readonly GdscriptVariableInfo[],
  declarationIds: ReadonlySet<number>,
  lastUseLines: number[],
): void {
  forEachOccurrence(root, (node) => {
    if (declarationIds.has(node.id)) return;
    const index = resolveOccurrence(node, infos);
    if (index === -1) return;
    const useLine = lineOf(node);
    const previous = lastUseLines[index] ?? useLine;
    if (useLine > previous) lastUseLines[index] = useLine;
  });
}

/** Index of the nearest earlier in-scope declaration of `node.text`, or -1. */
function resolveOccurrence(
  node: SyntaxNode,
  infos: readonly GdscriptVariableInfo[],
): number {
  for (let index = infos.length - 1; index >= 0; index--) {
    const info = infos[index];
    if (info === undefined || info.name !== node.text) continue;
    if (node.startIndex < info.visibleFrom) continue;
    if (!containsNode(info.scopeBoundary, node)) continue;
    if (info.initializer !== null && containsNode(info.initializer, node)) continue;
    return index;
  }
  return -1;
}

/**
 * Visit each `identifier` in `root` that can name a variable (9.4). Skips
 * nested units, `type` nodes, member names, `self` and `super`. Strings,
 * `string_name`, `node_path` and `get_node` are leaves, so they hold none.
 * Declared parameter, `for` and binding names are still visited: the caller
 * filters them.
 */
export function forEachOccurrence(
  root: SyntaxNode,
  visit: (node: SyntaxNode) => void,
): void {
  const check = (node: SyntaxNode): boolean | void => {
    if (isGdscriptFunction(node) && !sameNode(node, root)) return false;
    if (node.type === "type") return false;
    if (node.type !== "identifier") return;
    if (NON_VARIABLE_NAMES.has(node.text) || isNonVariableName(node)) return;
    visit(node);
  };
  if (check(root) === false) return;
  walkDescendants(root, check);
}

function isNonVariableName(node: SyntaxNode): boolean {
  const parent = node.parent;
  if (parent === null) return false;
  switch (parent.type) {
    // `a.b.c` is 1 flat `attribute`: every child after the first is a member.
    case "attribute":
      return !sameNode(parent.namedChildren[0] ?? null, node);
    // The method or member name of `a.f(x)` and `a.b[i]`. Arguments sit
    // inside an `arguments` node, so they are not direct children.
    case "attribute_call":
    case "attribute_subscript":
      return true;
    // The name of an annotation (`@warning_ignore(...)`) is not a variable.
    // The design is silent; this matches the Halstead rule that annotations
    // are structural.
    case "annotation":
      return true;
    // A Lua-style key `{key = value}` is a string key, as a TypeScript
    // property-assignment key. A `{key: value}` key is an expression.
    case "pair":
      return (
        sameNode(parent.childForFieldName("left"), node) &&
        parent.children.some((child) => child.type === "=")
      );
    default:
      return false;
  }
}

function nearestAncestorOfType(
  node: SyntaxNode,
  type: string,
  boundary: SyntaxNode,
): SyntaxNode | null {
  let current = node.parent;
  while (current !== null && !sameNode(current, boundary)) {
    if (current.type === type) return current;
    current = current.parent;
  }
  return null;
}

export function containsNode(ancestor: SyntaxNode, node: SyntaxNode): boolean {
  let current: SyntaxNode | null = node;
  while (current !== null) {
    if (sameNode(current, ancestor)) return true;
    current = current.parent;
  }
  return false;
}
