// Language-neutral helpers over web-tree-sitter nodes. Shared by the Python
// and Rust backends; language rules live in each backend's nodeTypes.ts.

import type { SyntaxNode, Tree } from "./types";

/** 1-based first line of a node. */
export function lineOf(node: SyntaxNode): number {
  return node.startPosition.row + 1;
}

/** 1-based last line of a node. */
export function endLineOf(node: SyntaxNode): number {
  return node.endPosition.row + 1;
}

/** Node identity. Never use `===` on tree-sitter nodes. */
export function sameNode(a: SyntaxNode | null, b: SyntaxNode | null): boolean {
  return a !== null && b !== null && a.id === b.id;
}

/**
 * Pre-order walk over every descendant of `root` (named and anonymous),
 * excluding `root` itself (the same contract as ts-morph `forEachDescendant`).
 * Return `false` from `visit` to skip the children of that node.
 */
export function walkDescendants(
  root: SyntaxNode,
  visit: (node: SyntaxNode) => boolean | void,
): void {
  const cursor = root.walk();
  try {
    if (!cursor.gotoFirstChild()) return;
    for (;;) {
      const descend = visit(cursor.currentNode) !== false;
      if (descend && cursor.gotoFirstChild()) continue;
      while (!cursor.gotoNextSibling()) {
        if (!cursor.gotoParent()) return;
        if (cursor.currentNode.id === root.id) return;
      }
    }
  } finally {
    cursor.delete();
  }
}

/** Ancestors of `node`, nearest first, stopping before `boundary` (exclusive). */
export function* ancestorsUntil(
  node: SyntaxNode,
  boundary: SyntaxNode,
): Generator<SyntaxNode> {
  let current = node.parent;
  while (current !== null && current.id !== boundary.id) {
    yield current;
    current = current.parent;
  }
}

export interface NodeCache<T> {
  get(node: SyntaxNode): T | undefined;
  set(node: SyntaxNode, value: T): void;
}

/**
 * Per-node cache keyed on the Tree object, then on `node.id`. Entries die
 * with the tree, and an id that WASM memory reuses in a later tree cannot
 * return a stale value.
 */
export function createNodeCache<T>(): NodeCache<T> {
  const byTree = new WeakMap<Tree, Map<number, T>>();
  return {
    get(node) {
      return byTree.get(node.tree)?.get(node.id);
    },
    set(node, value) {
      let map = byTree.get(node.tree);
      if (map === undefined) {
        map = new Map<number, T>();
        byTree.set(node.tree, map);
      }
      map.set(node.id, value);
    },
  };
}
