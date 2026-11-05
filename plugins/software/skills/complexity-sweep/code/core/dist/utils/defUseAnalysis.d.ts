import { type Node, type SourceFile } from "ts-morph";
/**
 * One def-use record per binding-name-per-scope. Destructured patterns produce
 * separate entries per leaf; shadowing produces separate entries with the same
 * `name` (outer first, inner second — see spec §2.5).
 */
export interface DefUseEntry {
    name: string;
    defLine: number;
    lastUseLine: number;
}
/**
 * Internal working record kept alongside the public entry while the algorithm
 * executes. Exposed so peer tests can reason about scope boundaries if needed.
 */
export interface VariableInfo {
    name: string;
    defLine: number;
    declNode: Node;
    scopeBoundary: Node;
}
/**
 * Three-pass (+ init + materialize) algorithm:
 *  1. Collect parameters (with destructuring).
 *  2. Collect `var`/`let`/`const` declarations inside the function, skipping
 *     descendants that are themselves nested functions.
 *  3. Initialize every entry's `lastUseLine` to its `defLine`.
 *  4. Scan ALL identifiers (including inside nested functions, for closure
 *     handling) and, for each, find the nearest in-scope declaration with the
 *     same name (reverse search handles shadowing).
 *  5. Materialize entries in declaration order, cache, return.
 *
 * `_sourceFile` is unused — retained in the signature for future use and to
 * match the shipped API contract (spec §2.1).
 */
export declare function buildDefUseMap(node: Node, _sourceFile: SourceFile): DefUseEntry[];
//# sourceMappingURL=defUseAnalysis.d.ts.map