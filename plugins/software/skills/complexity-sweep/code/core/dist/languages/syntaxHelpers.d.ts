import type { SyntaxNode } from "./types";
/** 1-based first line of a node. */
export declare function lineOf(node: SyntaxNode): number;
/** 1-based last line of a node. */
export declare function endLineOf(node: SyntaxNode): number;
/** Node identity. Never use `===` on tree-sitter nodes. */
export declare function sameNode(a: SyntaxNode | null, b: SyntaxNode | null): boolean;
/**
 * Pre-order walk over every descendant of `root` (named and anonymous),
 * excluding `root` itself (the same contract as ts-morph `forEachDescendant`).
 * Return `false` from `visit` to skip the children of that node.
 */
export declare function walkDescendants(root: SyntaxNode, visit: (node: SyntaxNode) => boolean | void): void;
/** Ancestors of `node`, nearest first, stopping before `boundary` (exclusive). */
export declare function ancestorsUntil(node: SyntaxNode, boundary: SyntaxNode): Generator<SyntaxNode>;
export interface NodeCache<T> {
    get(node: SyntaxNode): T | undefined;
    set(node: SyntaxNode, value: T): void;
}
/**
 * Per-node cache keyed on the Tree object, then on `node.id`. Entries die
 * with the tree, and an id that WASM memory reuses in a later tree cannot
 * return a stale value.
 */
export declare function createNodeCache<T>(): NodeCache<T>;
//# sourceMappingURL=syntaxHelpers.d.ts.map