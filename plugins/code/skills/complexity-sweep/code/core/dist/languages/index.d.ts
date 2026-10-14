import type { LanguageBackend, LanguageId, SyntaxLanguageId } from "./types";
export declare const SYNTAX_BACKENDS: Record<SyntaxLanguageId, LanguageBackend>;
/** Lower-case extensions (with the leading dot) that ts-morph analyzes. */
export declare const TYPESCRIPT_EXTENSIONS: readonly string[];
export declare function getSyntaxBackend(id: SyntaxLanguageId): LanguageBackend;
/**
 * The language of a file, from its lower-case extension. Returns `undefined`
 * for a file the analyzer does not read (for example `.txt` or `.pyi`).
 */
export declare function languageForPath(filePath: string): LanguageId | undefined;
//# sourceMappingURL=index.d.ts.map