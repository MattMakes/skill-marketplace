// web-tree-sitter loader. The grammar .wasm files are vendored in
// `core/grammars/` (see grammars/NOTICE.md). `__dirname` is `src/languages`
// under vitest and `dist/languages` at runtime; both resolve to `core/grammars`.

import { join } from "node:path";

import { Language, Parser } from "web-tree-sitter";

import type {
  SyntaxLanguageId,
  SyntaxSourceFile,
  SyntaxSourceInput,
} from "./types";

const GRAMMAR_DIR = join(__dirname, "..", "..", "grammars");

const GRAMMAR_FILES: Record<SyntaxLanguageId, string> = {
  python: "tree-sitter-python.wasm",
  rust: "tree-sitter-rust.wasm",
};

const parsers = new Map<SyntaxLanguageId, Parser>();
let initPromise: Promise<void> | null = null;

/**
 * Load the tree-sitter runtime and every grammar. Idempotent. Call it once
 * before `parseSyntaxSource` (the CLI does this in `main`; tests do it in
 * `beforeAll`).
 */
export function initSyntaxParsers(): Promise<void> {
  if (initPromise === null) initPromise = loadAll();
  return initPromise;
}

async function loadAll(): Promise<void> {
  await Parser.init();
  for (const id of Object.keys(GRAMMAR_FILES) as SyntaxLanguageId[]) {
    const language = await Language.load(join(GRAMMAR_DIR, GRAMMAR_FILES[id]));
    const parser = new Parser();
    parser.setLanguage(language);
    parsers.set(id, parser);
  }
}

/**
 * Parse one file synchronously. Throws when `initSyntaxParsers` has not
 * resolved. The caller owns the tree and must call `tree.delete()` when done.
 */
export function parseSyntaxSource(input: SyntaxSourceInput): SyntaxSourceFile {
  const parser = parsers.get(input.language);
  if (parser === undefined) {
    throw new Error(
      `No tree-sitter parser for "${input.language}". Await initSyntaxParsers() first.`,
    );
  }
  const tree = parser.parse(input.text);
  if (tree === null) {
    throw new Error(`tree-sitter returned no tree for ${input.filePath}.`);
  }
  return { ...input, tree };
}
