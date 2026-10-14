// GDScript implementations of the 4 data-flow metrics (design 5.4 to 5.6 and
// 9.3, 9.4). The def-use analysis is in dataFlow.defUse.ts. Tree-sitter nodes
// are compared by id through the shared helpers because each access creates
// a new JavaScript wrapper.

import { walkDescendants } from "../syntaxHelpers";
import type { SyntaxMetricCompute, SyntaxNode } from "../types";
import {
  buildGdscriptDefUse,
  forEachOccurrence,
  type GdscriptDefUseEntry,
  unitParameterNames,
} from "./dataFlow.defUse";
import { isGdscriptFunction } from "./nodeTypes";

export { buildGdscriptDefUse, type GdscriptDefUseEntry } from "./dataFlow.defUse";

// Statement and expression nodes whose `condition:` field is a branch condition.
const CONDITION_FIELD_TYPES = new Set([
  "if_statement",
  "elif_clause",
  "while_statement",
  "conditional_expression",
]);

// Containers that hold script-scope declarations. A `class_body` belongs to
// an inner `class`.
const SCRIPT_SCOPE_TYPES = new Set(["source", "class_body"]);

// ---------------------------------------------------------------------------
// globalDataComplexity (5.4, 9.3)
// ---------------------------------------------------------------------------

export const gdscriptGlobalDataComplexity: SyntaxMetricCompute = (ctx) => {
  const mutableGlobals = collectMutableGlobals(ctx.file.tree.rootNode);
  if (mutableGlobals.size === 0) return 0;

  const localNames = new Set(buildGdscriptDefUse(ctx.node).map((entry) => entry.name));
  const referenced = new Set<string>();
  // The whole unit is scanned, so a default parameter value that reads a
  // `static var` counts. Declared names are `name` nodes or local entries.
  forEachOccurrence(ctx.node, (node) => {
    if (mutableGlobals.has(node.text) && !localNames.has(node.text)) {
      referenced.add(node.text);
    }
  });
  return referenced.size;
};

/**
 * Names of `static var` declarations directly in `source` or in a
 * `class_body`, outside every unit (D6). A member `var`, a `const` and an
 * `enum` are never mutable global data. Names are collected per file, as for
 * Rust `static` items.
 */
function collectMutableGlobals(root: SyntaxNode): Set<string> {
  const names = new Set<string>();
  walkDescendants(root, (node) => {
    if (isGdscriptFunction(node)) return false;
    if (node.type !== "variable_statement") return;
    if (!SCRIPT_SCOPE_TYPES.has(node.parent?.type ?? "")) return false;
    const name = node.childForFieldName("name");
    if (node.childForFieldName("static") !== null && name !== null) {
      names.add(name.text);
    }
    // Accessor bodies inside the statement are units; nothing else here
    // declares script-scope names.
    return false;
  });
  return names;
}

// ---------------------------------------------------------------------------
// specifiedDataComplexity (5.5, 9.3)
// ---------------------------------------------------------------------------

export const gdscriptSpecifiedDataComplexity: SyntaxMetricCompute = (ctx) => {
  const parameterNames = new Set(unitParameterNames(ctx.node).map((name) => name.text));
  if (parameterNames.size === 0) return 0;

  const influencing = new Set<string>();
  // Lambdas are part of the unit (D1), so their conditions count. A name is
  // matched by text, as in TypeScript: a lambda parameter with the same name
  // as a unit parameter is not told apart.
  walkDescendants(ctx.node, (node) => {
    if (isGdscriptFunction(node)) return false;
    const condition = conditionOf(node);
    if (condition === null) return;
    forEachOccurrence(condition, (identifier) => {
      if (parameterNames.has(identifier.text)) influencing.add(identifier.text);
    });
  });
  return influencing.size;
};

/** The branch condition of `node`, or null when `node` is not a branch. */
function conditionOf(node: SyntaxNode): SyntaxNode | null {
  if (CONDITION_FIELD_TYPES.has(node.type)) {
    return node.childForFieldName("condition");
  }
  if (node.type === "match_statement") return node.childForFieldName("value");
  // `when <expression>`: the whole guard is the condition.
  if (node.type === "pattern_guard") return node;
  return null;
}

// ---------------------------------------------------------------------------
// peakLiveVariables and variableSpan (5.6, 9.4)
// ---------------------------------------------------------------------------

export const gdscriptPeakLiveVariables: SyntaxMetricCompute = (ctx) => {
  const entries = buildGdscriptDefUse(ctx.node);
  if (entries.length === 0) return 0;

  const { minLine, maxLine } = spanBounds(entries);
  let peak = 0;
  for (let line = minLine; line <= maxLine; line++) {
    let count = 0;
    for (const entry of entries) {
      if (entry.defLine <= line && line <= entry.lastUseLine) count++;
    }
    if (count > peak) peak = count;
  }
  return peak;
};

export const gdscriptVariableSpan: SyntaxMetricCompute = (ctx) => {
  let maximum = 0;
  for (const entry of buildGdscriptDefUse(ctx.node)) {
    maximum = Math.max(maximum, entry.lastUseLine - entry.defLine);
  }
  return maximum;
};

function spanBounds(entries: readonly GdscriptDefUseEntry[]): {
  minLine: number;
  maxLine: number;
} {
  let minLine = Infinity;
  let maxLine = 0;
  for (const entry of entries) {
    if (entry.defLine < minLine) minLine = entry.defLine;
    if (entry.lastUseLine > maxLine) maxLine = entry.lastUseLine;
  }
  return { minLine, maxLine };
}
