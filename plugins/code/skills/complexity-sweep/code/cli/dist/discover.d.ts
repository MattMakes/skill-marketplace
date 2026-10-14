import type { LanguageId, SyntaxSourceInput } from "static-analysis-core";
export interface RoutedPath {
    /** Absolute path. */
    filePath: string;
    language: LanguageId;
}
export interface DiscoveredSources {
    /** Absolute TypeScript/JavaScript paths, sorted. */
    typescriptPaths: string[];
    /** Python and Rust files with their text, sorted by path. */
    syntaxInputs: SyntaxSourceInput[];
    /** Every routed path, sorted. Output order of the analysis. */
    routed: RoutedPath[];
}
/**
 * Expand `patterns` relative to `cwd`, drop excluded paths, and route the
 * rest by extension. The result is sorted by path, so output order is stable.
 */
export declare function routeSources(patterns: readonly string[], exclude: readonly string[], cwd?: string): RoutedPath[];
/** `routeSources`, then read the Python and Rust files as UTF-8 text. */
export declare function discoverSources(patterns: readonly string[], exclude: readonly string[], cwd?: string): DiscoveredSources;
/**
 * Absolute, de-duplicated, sorted file paths for `patterns`. A plain file
 * path is kept as is; a glob is expanded without entering `node_modules`.
 */
export declare function expandPatterns(patterns: readonly string[], cwd: string): string[];
export declare function createExcludeMatcher(exclude: readonly string[], cwd: string): (filePath: string) => boolean;
//# sourceMappingURL=discover.d.ts.map