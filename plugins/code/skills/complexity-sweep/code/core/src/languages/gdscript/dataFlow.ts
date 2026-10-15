// GDScript implementations of the 4 data-flow metrics (design 5.4 to 5.6 and
// 9.3, 9.4). The def-use analysis is in dataFlow.defUse.ts. Tree-sitter nodes
// are compared by id through the shared helpers because each access creates
// a new JavaScript wrapper.

import { createNodeCache, walkDescendants } from "../syntaxHelpers";
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

// Member declarations whose `name` field names a member of the scope. An
// `enum` also declares its enumerators; a `func` and a `signal` name a member
// that is never a `static var`.
const NAMED_MEMBER_TYPES = new Set([
  "variable_statement",
  "const_statement",
  "function_definition",
  "signal_statement",
  "enum_definition",
  "class_definition",
]);

// ---------------------------------------------------------------------------
// globalDataComplexity (5.4, 9.3)
// ---------------------------------------------------------------------------

export const gdscriptGlobalDataComplexity: SyntaxMetricCompute = (ctx) => {
  const scopes = enclosingScopes(ctx.node).map(scopeMembers);
  if (!scopes.some((members) => [...members.values()].some(Boolean))) return 0;

  const localNames = new Set(buildGdscriptDefUse(ctx.node).map((entry) => entry.name));
  const referenced = new Set<string>();
  // The whole unit is scanned, so a default parameter value that reads a
  // `static var` counts. Declared names are `name` nodes or local entries.
  forEachOccurrence(ctx.node, (node) => {
    if (localNames.has(node.text)) return;
    if (resolvesToStaticVar(node.text, scopes)) referenced.add(node.text);
  });
  return referenced.size;
};

/** The `source` and each `class_body` that holds the unit, nearest first. */
function enclosingScopes(unit: SyntaxNode): SyntaxNode[] {
  const scopes: SyntaxNode[] = [];
  for (let current = unit.parent; current !== null; current = current.parent) {
    if (SCRIPT_SCOPE_TYPES.has(current.type)) scopes.push(current);
  }
  return scopes;
}

/**
 * The first scope that declares `name` owns it (9.3, 5.4 "Static scope"). The
 * reference counts only when that member is a `static var`.
 */
function resolvesToStaticVar(name: string, scopes: readonly Map<string, boolean>[]): boolean {
  for (const members of scopes) {
    const isStaticVar = members.get(name);
    if (isStaticVar !== undefined) return isStaticVar;
  }
  return false;
}

const scopeMembersCache = createNodeCache<Map<string, boolean>>();

/**
 * Member names declared directly in a `source` or `class_body`, each mapped
 * to whether the member is a `static var` (D6). A member `var`, a `const`, an
 * `enum`, a `func`, a `signal` and an inner `class` are never mutable global
 * data, but they still own their name. Accessor bodies inside a
 * `variable_statement` are units; nothing else there declares a member.
 */
function scopeMembers(scope: SyntaxNode): Map<string, boolean> {
  const cached = scopeMembersCache.get(scope);
  if (cached !== undefined) return cached;

  const members = new Map<string, boolean>();
  const declare = (name: string, isStaticVar: boolean): void => {
    if (!members.has(name)) members.set(name, isStaticVar);
  };
  for (const member of scope.namedChildren) {
    if (member === null || !NAMED_MEMBER_TYPES.has(member.type)) continue;
    const name = member.childForFieldName("name");
    if (name !== null) {
      const isStaticVar =
        member.type === "variable_statement" && member.childForFieldName("static") !== null;
      declare(name.text, isStaticVar);
    }
    if (member.type === "enum_definition") {
      walkDescendants(member, (node) => {
        if (node.type !== "enumerator") return;
        const left = node.childForFieldName("left");
        if (left !== null) declare(left.text, false);
      });
    }
  }
  scopeMembersCache.set(scope, members);
  return members;
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
