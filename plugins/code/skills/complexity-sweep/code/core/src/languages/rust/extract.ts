// Rust function extraction and qualified display names.

import { lineOf, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import type { SyntaxFunction, SyntaxSourceFile } from "../types";
import { isRustFunction } from "./nodeTypes";

const COMMENT_TYPES = new Set(["line_comment", "block_comment"]);
// Last path segments of an attribute that mark test-only code (decision 7).
const TEST_ATTRIBUTE_NAMES = new Set(["test", "rstest", "test_case", "bench"]);

export function extractRustFunctions(file: SyntaxSourceFile): SyntaxFunction[] {
  const functions: SyntaxFunction[] = [];

  walkDescendants(file.tree.rootNode, (node) => {
    if (node.type === "mod_item" && isTestOnlyItem(node)) return false;
    if (!isRustFunction(node)) return;
    if (isTestOnlyItem(node)) return false;

    functions.push({
      name: qualifiedName(node),
      line: lineOf(node),
      node,
    });
  });

  return functions;
}

function qualifiedName(node: SyntaxNode): string {
  const parts: string[] = [];
  let current = node.parent;

  while (current !== null) {
    const part = enclosingName(current);
    if (part !== undefined) parts.unshift(part);
    current = current.parent;
  }

  parts.push(node.childForFieldName("name")?.text ?? "<anonymous>");
  return parts.join("::");
}

function enclosingName(node: SyntaxNode): string | undefined {
  if (node.type === "function_item" || node.type === "trait_item") {
    return node.childForFieldName("name")?.text;
  }
  if (node.type === "mod_item" && node.childForFieldName("body") !== null) {
    return node.childForFieldName("name")?.text;
  }
  if (node.type === "impl_item") {
    const implementedType = node.childForFieldName("type")?.text;
    return implementedType === undefined
      ? undefined
      : removeReferencePrefix(removeGenericArguments(implementedType));
  }
  return undefined;
}

function removeGenericArguments(text: string): string {
  let depth = 0;
  let result = "";
  for (const character of text) {
    if (character === "<") {
      depth += 1;
    } else if (character === ">") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0) {
      result += character;
    }
  }
  return result.trim();
}

/**
 * Decision 7: skip an item with a test attribute (`#[test]`,
 * `#[tokio::test]`, `#[rstest]`, `#[test_case(..)]`, `#[bench]`) or a
 * `#[cfg(P)]` whose predicate P requires `test`.
 */
function isTestOnlyItem(node: SyntaxNode): boolean {
  return precedingAttributes(node).some((attribute) => {
    const path = attributePath(attribute);
    if (TEST_ATTRIBUTE_NAMES.has(path.split("::").at(-1) ?? "")) return true;
    return path === "cfg" && cfgRequiresTest(attributeText(attribute));
  });
}

/** Leading `&`, `&mut`, lifetimes, `dyn` and `mut` are not part of a name (F11). */
function removeReferencePrefix(text: string): string {
  return text.replace(/^(?:(?:&|'[A-Za-z_]\w*|mut\b|dyn\b)\s*)+/, "").trim();
}

function attributeText(attribute: SyntaxNode): string {
  return attribute.namedChild(0)?.text ?? "";
}

const CFG_TOKEN = /\s+|"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z0-9_]*|./gs;

function cfgTokens(text: string): string[] {
  return (text.match(CFG_TOKEN) ?? []).filter((token) => token.trim() !== "");
}

/**
 * True when the `cfg(P)` predicate requires `test`: P is the bare token
 * `test`, or `all(...)` with a member that requires `test`. `not(...)` and
 * `any(...)` never require it. `text` is the attribute body, `cfg(P)`.
 */
function cfgRequiresTest(text: string): boolean {
  const tokens = cfgTokens(text);
  // tokens[0] is `cfg` and tokens[1] is `(`.
  if (tokens[0] !== "cfg" || tokens[1] !== "(") return false;
  let position = 2;

  // Returns whether the predicate at `position` requires `test`.
  const predicate = (): boolean => {
    const name = tokens[position];
    position += 1;
    const next = tokens[position];
    if (next === "(") {
      position += 1;
      const members: boolean[] = [];
      while (position < tokens.length && tokens[position] !== ")") {
        members.push(predicate());
        if (tokens[position] === ",") position += 1;
      }
      position += 1;
      return name === "all" && members.some(Boolean);
    }
    if (next === "=") {
      position += 2;
      return false;
    }
    return name === "test";
  };

  return predicate();
}

/** Rust permits comments between an outer attribute and its item. */
function precedingAttributes(node: SyntaxNode): SyntaxNode[] {
  const attributes: SyntaxNode[] = [];
  let sibling = node.previousNamedSibling;
  while (sibling !== null) {
    if (sibling.type === "attribute_item") {
      attributes.push(sibling);
    } else if (!COMMENT_TYPES.has(sibling.type)) {
      break;
    }
    sibling = sibling.previousNamedSibling;
  }
  return attributes;
}

function attributePath(attribute: SyntaxNode): string {
  const body = attribute.namedChild(0);
  const path = body?.namedChild(0);
  return path?.text ?? "";
}
