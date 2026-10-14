// Rust function extraction and qualified display names.

import { lineOf, walkDescendants } from "../syntaxHelpers";
import type { SyntaxNode } from "../types";
import type { SyntaxFunction, SyntaxSourceFile } from "../types";
import { isRustFunction } from "./nodeTypes";

const COMMENT_TYPES = new Set(["line_comment", "block_comment"]);

export function extractRustFunctions(file: SyntaxSourceFile): SyntaxFunction[] {
  const functions: SyntaxFunction[] = [];

  walkDescendants(file.tree.rootNode, (node) => {
    if (node.type === "mod_item" && isCfgTestItem(node)) return false;
    if (!isRustFunction(node)) return;
    if (hasTestAttribute(node)) return false;

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
      : removeGenericArguments(implementedType);
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

function hasTestAttribute(node: SyntaxNode): boolean {
  return precedingAttributes(node).some((attribute) => {
    const path = attributePath(attribute);
    return path.split("::").at(-1) === "test";
  });
}

function isCfgTestItem(node: SyntaxNode): boolean {
  return precedingAttributes(node).some((attribute) => {
    const compact = attribute.text.replace(/\s+/g, "");
    return compact === "#[cfg(test)]";
  });
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
