// Rust implementations of the 4 data-flow metrics. Tree-sitter nodes are
// compared by id through the shared helpers because each access creates a new
// JavaScript wrapper.

import {
  createNodeCache,
  lineOf,
  sameNode,
  walkDescendants,
} from "../syntaxHelpers";
import type { SyntaxMetricCompute, SyntaxNode } from "../types";
import { isRustFunction } from "./nodeTypes";

export interface RustDefUseEntry {
  name: string;
  defLine: number;
  lastUseLine: number;
}

interface RustVariableInfo {
  name: string;
  defLine: number;
  pattern: SyntaxNode;
  /** End offset of the pattern part. A match guard lies after it. */
  patternEnd: number;
  scopeBoundary: SyntaxNode;
  initializer: SyntaxNode | null;
  excludedScope: SyntaxNode | null;
}

const INTERIOR_MUTABILITY_TYPES = [
  "Mutex",
  "RwLock",
  "RefCell",
  "Cell",
  "Atomic",
  "OnceCell",
  "OnceLock",
  "LazyLock",
  "Lazy",
] as const;

const defUseCache = createNodeCache<RustDefUseEntry[]>();

/** Build Rust binding ranges in declaration order. */
export function buildRustDefUse(node: SyntaxNode): RustDefUseEntry[] {
  const cached = defUseCache.get(node);
  if (cached !== undefined) return cached;

  const infos: RustVariableInfo[] = [];
  const patternSyntax = new Set<number>();
  collectFunctionParameters(node, node, infos, patternSyntax);
  collectLocalDeclarations(node, infos, patternSyntax);

  const lastUseLines = infos.map((info) => info.defLine);
  scanIdentifierUses(node, infos, patternSyntax, lastUseLines);

  const entries = infos.map((info, index) => ({
    name: info.name,
    defLine: info.defLine,
    lastUseLine: lastUseLines[index] ?? info.defLine,
  }));
  defUseCache.set(node, entries);
  return entries;
}

function collectFunctionParameters(
  functionNode: SyntaxNode,
  scopeBoundary: SyntaxNode,
  infos: RustVariableInfo[],
  patternSyntax: Set<number>,
): void {
  const parameters = functionNode.childForFieldName("parameters");
  if (parameters === null) return;

  for (const parameter of parameters.namedChildren) {
    if (parameter.type !== "parameter") continue;
    const pattern = parameter.childForFieldName("pattern");
    if (pattern === null) continue;
    addPatternBindings(
      pattern,
      scopeBoundary,
      null,
      null,
      infos,
      patternSyntax,
    );
  }
}

function collectLocalDeclarations(
  root: SyntaxNode,
  infos: RustVariableInfo[],
  patternSyntax: Set<number>,
): void {
  walkDescendants(root, (node) => {
    if (isRustFunction(node)) return false;

    if (node.type === "let_declaration") {
      const pattern = node.childForFieldName("pattern");
      const block = nearestAncestorOfType(node, "block", root);
      if (pattern !== null && block !== null) {
        addPatternBindings(
          pattern,
          block,
          node.childForFieldName("value"),
          null,
          infos,
          patternSyntax,
        );
      }
      return;
    }

    if (node.type === "for_expression") {
      const pattern = node.childForFieldName("pattern");
      const body = node.childForFieldName("body");
      if (pattern !== null && body !== null) {
        addPatternBindings(
          pattern,
          body,
          node.childForFieldName("value"),
          null,
          infos,
          patternSyntax,
        );
      }
      return;
    }

    if (node.type === "closure_expression") {
      collectClosureParameters(node, infos, patternSyntax);
      return;
    }

    if (node.type === "match_arm") {
      const pattern = node.childForFieldName("pattern");
      if (pattern !== null) {
        addPatternBindings(
          pattern,
          node,
          null,
          null,
          infos,
          patternSyntax,
        );
      }
      return;
    }

    if (node.type === "let_condition") {
      collectLetCondition(node, root, infos, patternSyntax);
    }
  });
}

function collectClosureParameters(
  closure: SyntaxNode,
  infos: RustVariableInfo[],
  patternSyntax: Set<number>,
): void {
  const parameters = closure.childForFieldName("parameters");
  const body = closure.childForFieldName("body");
  if (parameters === null || body === null) return;

  for (const parameter of parameters.namedChildren) {
    const pattern =
      parameter.type === "parameter"
        ? parameter.childForFieldName("pattern")
        : parameter;
    if (pattern === null) continue;
    addPatternBindings(
      pattern,
      body,
      null,
      null,
      infos,
      patternSyntax,
    );
  }
}

function collectLetCondition(
  condition: SyntaxNode,
  root: SyntaxNode,
  infos: RustVariableInfo[],
  patternSyntax: Set<number>,
): void {
  const pattern = condition.childForFieldName("pattern");
  if (pattern === null) return;

  const owner = nearestAncestorWithTypes(
    condition,
    new Set(["if_expression", "while_expression"]),
    root,
  );
  if (owner === null) return;

  const excludedScope =
    owner.type === "if_expression"
      ? owner.childForFieldName("alternative")
      : null;
  addPatternBindings(
    pattern,
    owner,
    condition.childForFieldName("value"),
    excludedScope,
    infos,
    patternSyntax,
  );
}

function addPatternBindings(
  pattern: SyntaxNode,
  scopeBoundary: SyntaxNode,
  initializer: SyntaxNode | null,
  excludedScope: SyntaxNode | null,
  infos: RustVariableInfo[],
  patternSyntax: Set<number>,
): void {
  const bindings = bindingLeaves(pattern, patternSyntax);
  const patternEnd = patternPartEnd(pattern);
  for (const binding of bindings) {
    infos.push({
      name: binding.name,
      defLine: lineOf(binding.node),
      pattern,
      patternEnd,
      scopeBoundary,
      initializer,
      excludedScope,
    });
  }
}

/** End offset of a pattern without the `condition` field of a `match_pattern`. */
function patternPartEnd(pattern: SyntaxNode): number {
  if (pattern.type !== "match_pattern") return pattern.endIndex;
  const guard = pattern.childForFieldName("condition");
  if (guard === null) return pattern.endIndex;

  let end = pattern.startIndex;
  for (const child of pattern.namedChildren) {
    if (sameNode(child, guard)) continue;
    end = Math.max(end, child.endIndex);
  }
  return end;
}

interface PatternBinding {
  name: string;
  node: SyntaxNode;
}

function bindingLeaves(
  pattern: SyntaxNode,
  patternSyntax?: Set<number>,
): PatternBinding[] {
  const bindings: PatternBinding[] = [];
  const names = new Set<string>();
  const guard =
    pattern.type === "match_pattern"
      ? pattern.childForFieldName("condition")
      : null;

  visitPatternNode(pattern, pattern, bindings, names, patternSyntax);
  walkDescendants(pattern, (node) => {
    if (guard !== null && sameNode(node, guard)) return false;
    visitPatternNode(node, pattern, bindings, names, patternSyntax);
  });
  return bindings;
}

function visitPatternNode(
  node: SyntaxNode,
  pattern: SyntaxNode,
  bindings: PatternBinding[],
  names: Set<string>,
  patternSyntax?: Set<number>,
): void {
  if (node.type !== "identifier" && node.type !== "shorthand_field_identifier") {
    return;
  }
  patternSyntax?.add(node.id);

  // Rust constructors and type paths use identifier nodes in some patterns.
  // Treat only value-position leaves as bindings; this is the closest Rust
  // equivalent to TypeScript destructured binding leaves.
  if (node.type === "identifier" && isInsidePatternType(node, pattern)) return;
  if (node.type === "identifier" && !isBindingIdentifier(node, pattern)) return;

  const name = node.text.replace(/^(?:ref|mut)\s+/, "");
  if (name.length === 0 || names.has(name)) return;
  names.add(name);
  bindings.push({ name, node });
}

// An identifier in a `scoped_identifier` is a path (`Ordering::Less`). In a
// refutable pattern (`match` arm, `if let`, `while let`) a bare upper-case
// identifier is a variant or a constant (`None`, `MAX_LEN`). An irrefutable
// pattern (`let`, parameter, `for`, closure) binds any name, so `let STATE = 1`
// still shadows a global.
function isBindingIdentifier(node: SyntaxNode, pattern: SyntaxNode): boolean {
  if (node.parent?.type === "scoped_identifier") return false;
  const refutable =
    pattern.type === "match_pattern" || pattern.parent?.type === "let_condition";
  return !refutable || /^[a-z_]/.test(node.text);
}

function isInsidePatternType(node: SyntaxNode, pattern: SyntaxNode): boolean {
  let current: SyntaxNode | null = node;
  while (current !== null) {
    const parent: SyntaxNode | null = current.parent;
    if (parent === null) return false;
    const typeNode = parent.childForFieldName("type");
    if (typeNode !== null && containsNode(typeNode, node)) return true;
    if (sameNode(parent, pattern)) return false;
    current = parent;
  }
  return false;
}

function scanIdentifierUses(
  root: SyntaxNode,
  infos: readonly RustVariableInfo[],
  patternSyntax: ReadonlySet<number>,
  lastUseLines: number[],
): void {
  const recordUse = (name: string, node: SyntaxNode, useLine: number): void => {
    for (let index = infos.length - 1; index >= 0; index--) {
      const info = infos[index];
      if (info === undefined || info.name !== name) continue;
      if (node.startIndex <= info.patternEnd) continue;
      if (!containsNode(info.scopeBoundary, node)) continue;
      if (info.initializer !== null && containsNode(info.initializer, node)) {
        continue;
      }
      if (info.excludedScope !== null && containsNode(info.excludedScope, node)) {
        continue;
      }

      const previous = lastUseLines[index] ?? info.defLine;
      if (useLine > previous) lastUseLines[index] = useLine;
      break;
    }
  };

  walkDescendants(root, (node) => {
    if (isRustFunction(node)) return false;
    // A `use` declaration names items, not locals.
    if (node.type === "use_declaration") return false;

    if (node.type === "string_content" && isInsideMacroCall(node)) {
      for (const argument of inlineFormatArguments(node.text)) {
        recordUse(argument.name, node, lineOf(node) + argument.lineOffset);
      }
      return;
    }

    if (node.type !== "identifier" || patternSyntax.has(node.id)) return;
    if (isMacroName(node) || isNonVariableName(node)) return;
    recordUse(node.text, node, lineOf(node));
  });
}

// A path segment (`std::cmp::max`), a label (`'a: loop`, `break 'a`) and a
// lifetime hold an `identifier` node, but none of them names a local variable.
function isNonVariableName(node: SyntaxNode): boolean {
  const parentType = node.parent?.type;
  if (parentType === "scoped_identifier") return true;
  if (parentType === "label" || parentType === "lifetime") return true;
  return isTokenPathSegment(node);
}

// Inside a macro token tree a path is a flat run `std :: cmp :: max`.
function isTokenPathSegment(node: SyntaxNode): boolean {
  if (node.parent?.type !== "token_tree") return false;
  return (
    node.previousSibling?.type === "::" || node.nextSibling?.type === "::"
  );
}

function isInsideMacroCall(node: SyntaxNode): boolean {
  let current: SyntaxNode | null = node.parent;
  while (current !== null) {
    if (current.type === "macro_invocation") return true;
    if (isRustFunction(current)) return false;
    current = current.parent;
  }
  return false;
}

interface InlineFormatArgument {
  name: string;
  /** Number of line breaks in the string before the argument. */
  lineOffset: number;
}

const FORMAT_PLACEHOLDER = /\{\{|\{([^{}]*)\}?/g;
const FORMAT_ARGUMENT = /^\s*([A-Za-z_][A-Za-z0-9_]*)/;
const FORMAT_WIDTH_ARGUMENT = /([A-Za-z_][A-Za-z0-9_]*)\$/g;

/**
 * Names that a format string reads inline: `{name}`, `{name:?}` and the
 * `width$` or `.precision$` parameters in `{:>width$}`. `{{` is an escape.
 */
function inlineFormatArguments(text: string): InlineFormatArgument[] {
  const found: InlineFormatArgument[] = [];
  const lineOffsetAt = (offset: number): number => {
    let count = 0;
    for (let index = text.indexOf("\n"); index !== -1 && index < offset; ) {
      count++;
      index = text.indexOf("\n", index + 1);
    }
    return count;
  };

  for (const match of text.matchAll(FORMAT_PLACEHOLDER)) {
    const inner = match[1];
    if (inner === undefined) continue;

    const lineOffset = lineOffsetAt(match.index);
    const colon = inner.indexOf(":");
    const argument = colon === -1 ? inner : inner.slice(0, colon);
    const name = FORMAT_ARGUMENT.exec(argument)?.[1];
    if (name !== undefined && argument.trim() === name) {
      found.push({ name, lineOffset });
    }
    if (colon === -1) continue;
    for (const width of inner.slice(colon + 1).matchAll(FORMAT_WIDTH_ARGUMENT)) {
      const widthName = width[1];
      if (widthName !== undefined) found.push({ name: widthName, lineOffset });
    }
  }
  return found;
}

function isMacroName(node: SyntaxNode): boolean {
  // The design calls out identifiers inside token trees. The macro path is
  // callable syntax, so it does not resolve as a variable use.
  let current: SyntaxNode | null = node.parent;
  while (current !== null && current.type === "scoped_identifier") {
    current = current.parent;
  }
  if (current?.type !== "macro_invocation") return false;
  const macro = current.childForFieldName("macro");
  return macro !== null && containsNode(macro, node);
}

export const rustPeakLiveVariables: SyntaxMetricCompute = (ctx) => {
  const entries = buildRustDefUse(ctx.node);
  if (entries.length === 0) return 0;

  let minLine = Infinity;
  let maxLine = 0;
  for (const entry of entries) {
    minLine = Math.min(minLine, entry.defLine);
    maxLine = Math.max(maxLine, entry.lastUseLine);
  }

  let peak = 0;
  for (let line = minLine; line <= maxLine; line++) {
    let live = 0;
    for (const entry of entries) {
      if (entry.defLine <= line && line <= entry.lastUseLine) live++;
    }
    peak = Math.max(peak, live);
  }
  return peak;
};

export const rustVariableSpan: SyntaxMetricCompute = (ctx) => {
  let maximum = 0;
  for (const entry of buildRustDefUse(ctx.node)) {
    maximum = Math.max(maximum, entry.lastUseLine - entry.defLine);
  }
  return maximum;
};

export const rustSpecifiedDataComplexity: SyntaxMetricCompute = (ctx) => {
  const parameterNames = new Set<string>();
  const parameters = ctx.node.childForFieldName("parameters");
  if (parameters !== null) {
    for (const parameter of parameters.namedChildren) {
      if (parameter.type !== "parameter") continue;
      const pattern = parameter.childForFieldName("pattern");
      if (pattern === null) continue;
      for (const binding of bindingLeaves(pattern)) {
        parameterNames.add(binding.name);
      }
    }
  }
  if (parameterNames.size === 0) return 0;

  const influencing = new Set<string>();
  walkDescendants(ctx.node, (node) => {
    if (isRustFunction(node)) return false;

    if (node.type === "if_expression" || node.type === "while_expression") {
      addConditionParameters(
        node.childForFieldName("condition"),
        parameterNames,
        influencing,
      );
    } else if (node.type === "match_expression") {
      addConditionParameters(
        node.childForFieldName("value"),
        parameterNames,
        influencing,
      );
    } else if (node.type === "match_arm") {
      const pattern = node.childForFieldName("pattern");
      addConditionParameters(
        pattern?.childForFieldName("condition") ?? null,
        parameterNames,
        influencing,
      );
    }
  });
  return influencing.size;
};

function addConditionParameters(
  condition: SyntaxNode | null,
  parameterNames: ReadonlySet<string>,
  influencing: Set<string>,
): void {
  if (condition === null) return;

  const patternSyntax = new Set<number>();
  if (condition.type === "let_condition") {
    const pattern = condition.childForFieldName("pattern");
    if (pattern !== null) bindingLeaves(pattern, patternSyntax);
  }
  walkDescendants(condition, (node) => {
    if (node.type === "let_condition") {
      const pattern = node.childForFieldName("pattern");
      if (pattern !== null) bindingLeaves(pattern, patternSyntax);
    }
  });

  visitConditionIdentifier(condition, patternSyntax, parameterNames, influencing);
  walkDescendants(condition, (node) => {
    visitConditionIdentifier(node, patternSyntax, parameterNames, influencing);
  });
}

function visitConditionIdentifier(
  node: SyntaxNode,
  patternSyntax: ReadonlySet<number>,
  parameterNames: ReadonlySet<string>,
  influencing: Set<string>,
): void {
  if (
    node.type === "identifier" &&
    !patternSyntax.has(node.id) &&
    parameterNames.has(node.text)
  ) {
    influencing.add(node.text);
  }
}

export const rustGlobalDataComplexity: SyntaxMetricCompute = (ctx) => {
  const mutableGlobals = collectMutableGlobals(ctx.file.tree.rootNode);
  if (mutableGlobals.size === 0) return 0;

  const localNames = new Set(buildRustDefUse(ctx.node).map((entry) => entry.name));
  const referenced = new Set<string>();
  const body = ctx.node.childForFieldName("body");
  if (body === null) return 0;

  walkDescendants(body, (node) => {
    if (isRustFunction(node)) return false;
    if (
      node.type === "identifier" &&
      mutableGlobals.has(node.text) &&
      !localNames.has(node.text)
    ) {
      referenced.add(node.text);
    }
  });
  return referenced.size;
};

function collectMutableGlobals(root: SyntaxNode): Set<string> {
  const names = new Set<string>();
  walkDescendants(root, (node) => {
    if (isRustFunction(node)) return false;
    if (node.type !== "static_item") return;

    const name = node.childForFieldName("name")?.text;
    if (name === undefined) return false;
    const isStaticMut = node.namedChildren.some(
      (child) => child.type === "mutable_specifier",
    );
    const typeText = node.childForFieldName("type")?.text ?? "";
    const hasInteriorMutability = INTERIOR_MUTABILITY_TYPES.some((marker) =>
      typeText.includes(marker),
    );
    if (isStaticMut || hasInteriorMutability) names.add(name);
    return false;
  });
  return names;
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
  return boundary.type === type ? boundary : null;
}

function nearestAncestorWithTypes(
  node: SyntaxNode,
  types: ReadonlySet<string>,
  boundary: SyntaxNode,
): SyntaxNode | null {
  let current = node.parent;
  while (current !== null && !sameNode(current, boundary)) {
    if (types.has(current.type)) return current;
    current = current.parent;
  }
  return types.has(boundary.type) ? boundary : null;
}

function containsNode(ancestor: SyntaxNode, node: SyntaxNode): boolean {
  let current: SyntaxNode | null = node;
  while (current !== null) {
    if (sameNode(current, ancestor)) return true;
    current = current.parent;
  }
  return false;
}
