import type { SyntaxNode } from "../types";
export interface GdscriptDefUseEntry {
    name: string;
    defLine: number;
    lastUseLine: number;
}
/** Build GDScript binding ranges in declaration order. */
export declare function buildGdscriptDefUse(node: SyntaxNode): GdscriptDefUseEntry[];
/** The name `identifier` of each parameter in the unit's `parameters` (5.5). */
export declare function unitParameterNames(node: SyntaxNode): SyntaxNode[];
/**
 * Visit each `identifier` in `root` that can name a variable (9.4). Skips
 * nested units, `type` nodes, member names, `self` and `super`. Strings,
 * `string_name`, `node_path` and `get_node` are leaves, so they hold none.
 * Declared parameter, `for` and binding names are still visited: the caller
 * filters them.
 */
export declare function forEachOccurrence(root: SyntaxNode, visit: (node: SyntaxNode) => void): void;
export declare function containsNode(ancestor: SyntaxNode, node: SyntaxNode): boolean;
//# sourceMappingURL=dataFlow.defUse.d.ts.map