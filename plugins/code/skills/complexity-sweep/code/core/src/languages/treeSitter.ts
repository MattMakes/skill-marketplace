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
  const text = replaceSurrogatePairs(input.text);
  const tree = parser.parse(text);
  if (tree === null) {
    throw new Error(`tree-sitter returned no tree for ${input.filePath}.`);
  }
  return { ...input, text, tree };
}

const SURROGATE_PAIR = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
const SURROGATE = /[\uD800-\uDFFF]/;
const REPLACEMENT_CHARACTER = "�";

/**
 * web-tree-sitter 0.27.1 reports ERROR nodes about every 32 KiB in a large
 * file that holds UTF-16 surrogate pairs (review finding F8). Replace each
 * pair with 1 BMP character before parsing. Line numbers stay correct. Columns
 * on a line with a pair shift by 1 per pair. The caller must read
 * `SyntaxSourceFile.text` (the replaced text) so node offsets and text agree.
 */
function replaceSurrogatePairs(text: string): string {
  if (!SURROGATE.test(text)) return text;
  return text.replace(SURROGATE_PAIR, REPLACEMENT_CHARACTER);
}
