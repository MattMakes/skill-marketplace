import type { SyntaxSourceFile, SyntaxSourceInput } from "./types";
/**
 * Load the tree-sitter runtime and every grammar. Idempotent. Call it once
 * before `parseSyntaxSource` (the CLI does this in `main`; tests do it in
 * `beforeAll`).
 */
export declare function initSyntaxParsers(): Promise<void>;
/**
 * Parse one file synchronously. Throws when `initSyntaxParsers` has not
 * resolved. The caller owns the tree and must call `tree.delete()` when done.
 */
export declare function parseSyntaxSource(input: SyntaxSourceInput): SyntaxSourceFile;
//# sourceMappingURL=treeSitter.d.ts.map