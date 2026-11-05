import type { SyntaxNode } from "../types";
export interface PythonScopeDepthStats {
    weightedLoc: number;
    rawLoc: number;
    ratio: number;
}
/**
 * The docstring of a body: an `expression_statement` that holds only a string
 * and is the first statement. Returns null when the body has no docstring.
 */
export declare function pythonDocstring(body: SyntaxNode): SyntaxNode | null;
/**
 * 1-based code lines of a Python function body, in ascending order.
 *
 * Port note: the TypeScript rule drops lines whose trimmed text is `{` or
 * `}`. This port keeps that text rule for syntax lines, so a line with only
 * `}` that closes a dict literal does not count. A line with only `)` or `]`
 * counts, as in TypeScript. A line inside a string node is string content,
 * not syntax, so a `}` line there counts. A blank line there does not count.
 */
export declare function pythonCodeLines(fn: SyntaxNode, sourceText: string): number[];
/** Weighted LOC, raw LOC and their ratio. Cached: 2 metrics share it. */
export declare function pythonScopeDepthStats(fn: SyntaxNode, sourceText: string): PythonScopeDepthStats;
//# sourceMappingURL=operations.scopeDepth.d.ts.map