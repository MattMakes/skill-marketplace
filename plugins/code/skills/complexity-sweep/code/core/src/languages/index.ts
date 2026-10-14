// Language registry: maps a file path to a `LanguageId`, and a tree-sitter
// language to its backend. TypeScript/JavaScript files go to ts-morph
// (`analyzeFile`); Python, Rust and GDScript files go to `analyzeSyntaxFile`.

import { extname } from "node:path";

import { pythonBackend } from "./python";
import { rustBackend } from "./rust";
import { gdscriptBackend } from "./gdscript";
import type { LanguageBackend, LanguageId, SyntaxLanguageId } from "./types";

export const SYNTAX_BACKENDS: Record<SyntaxLanguageId, LanguageBackend> = {
  python: pythonBackend,
  rust: rustBackend,
  gdscript: gdscriptBackend,
};

/** Lower-case extensions (with the leading dot) that ts-morph analyzes. */
export const TYPESCRIPT_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

export function getSyntaxBackend(id: SyntaxLanguageId): LanguageBackend {
  return SYNTAX_BACKENDS[id];
}

/**
 * The language of a file, from its lower-case extension. Returns `undefined`
 * for a file the analyzer does not read (for example `.txt` or `.pyi`).
 */
export function languageForPath(filePath: string): LanguageId | undefined {
  const ext = extname(filePath).toLowerCase();
  if (ext === "") return undefined;
  if (TYPESCRIPT_EXTENSIONS.includes(ext)) return "typescript";
  for (const backend of Object.values(SYNTAX_BACKENDS)) {
    if (backend.extensions.includes(ext)) return backend.id;
  }
  return undefined;
}
