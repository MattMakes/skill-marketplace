"use strict";
// Language-neutral helpers over web-tree-sitter nodes. Shared by the Python
// and Rust backends; language rules live in each backend's nodeTypes.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineOf = lineOf;
exports.endLineOf = endLineOf;
exports.sameNode = sameNode;
exports.walkDescendants = walkDescendants;
exports.ancestorsUntil = ancestorsUntil;
exports.createNodeCache = createNodeCache;
/** 1-based first line of a node. */
function lineOf(node) {
    return node.startPosition.row + 1;
}
/** 1-based last line of a node. */
function endLineOf(node) {
    return node.endPosition.row + 1;
}
/** Node identity. Never use `===` on tree-sitter nodes. */
function sameNode(a, b) {
    return a !== null && b !== null && a.id === b.id;
}
/**
 * Pre-order walk over every descendant of `root` (named and anonymous),
 * excluding `root` itself (the same contract as ts-morph `forEachDescendant`).
 * Return `false` from `visit` to skip the children of that node.
 */
function walkDescendants(root, visit) {
    const cursor = root.walk();
    try {
        if (!cursor.gotoFirstChild())
            return;
        for (;;) {
            const descend = visit(cursor.currentNode) !== false;
            if (descend && cursor.gotoFirstChild())
                continue;
            while (!cursor.gotoNextSibling()) {
                if (!cursor.gotoParent())
                    return;
                if (cursor.currentNode.id === root.id)
                    return;
            }
        }
    }
    finally {
        cursor.delete();
    }
}
/** Ancestors of `node`, nearest first, stopping before `boundary` (exclusive). */
function* ancestorsUntil(node, boundary) {
    let current = node.parent;
    while (current !== null && current.id !== boundary.id) {
        yield current;
        current = current.parent;
    }
}
/**
 * Per-node cache keyed on the Tree object, then on `node.id`. Entries die
 * with the tree, and an id that WASM memory reuses in a later tree cannot
 * return a stale value.
 */
function createNodeCache() {
    const byTree = new WeakMap();
    return {
        get(node) {
            return byTree.get(node.tree)?.get(node.id);
        },
        set(node, value) {
            let map = byTree.get(node.tree);
            if (map === undefined) {
                map = new Map();
                byTree.set(node.tree, map);
            }
            map.set(node.id, value);
        },
    };
}
//# sourceMappingURL=syntaxHelpers.js.map