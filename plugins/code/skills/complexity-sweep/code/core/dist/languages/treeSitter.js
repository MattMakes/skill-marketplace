"use strict";
// web-tree-sitter loader. The grammar .wasm files are vendored in
// `core/grammars/` (see grammars/NOTICE.md). `__dirname` is `src/languages`
// under vitest and `dist/languages` at runtime; both resolve to `core/grammars`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSyntaxParsers = initSyntaxParsers;
exports.parseSyntaxSource = parseSyntaxSource;
const node_path_1 = require("node:path");
const web_tree_sitter_1 = require("web-tree-sitter");
const GRAMMAR_DIR = (0, node_path_1.join)(__dirname, "..", "..", "grammars");
const GRAMMAR_FILES = {
    python: "tree-sitter-python.wasm",
    rust: "tree-sitter-rust.wasm",
    gdscript: "tree-sitter-gdscript.wasm",
};
const parsers = new Map();
let initPromise = null;
/**
 * Load the tree-sitter runtime and every grammar. Idempotent. Call it once
 * before `parseSyntaxSource` (the CLI does this in `main`; tests do it in
 * `beforeAll`).
 */
function initSyntaxParsers() {
    if (initPromise === null)
        initPromise = loadAll();
    return initPromise;
}
async function loadAll() {
    await web_tree_sitter_1.Parser.init();
    for (const id of Object.keys(GRAMMAR_FILES)) {
        const language = await web_tree_sitter_1.Language.load((0, node_path_1.join)(GRAMMAR_DIR, GRAMMAR_FILES[id]));
        const parser = new web_tree_sitter_1.Parser();
        parser.setLanguage(language);
        parsers.set(id, parser);
    }
}
/**
 * Parse one file synchronously. Throws when `initSyntaxParsers` has not
 * resolved. The caller owns the tree and must call `tree.delete()` when done.
 */
function parseSyntaxSource(input) {
    const parser = parsers.get(input.language);
    if (parser === undefined) {
        throw new Error(`No tree-sitter parser for "${input.language}". Await initSyntaxParsers() first.`);
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
function replaceSurrogatePairs(text) {
    if (!SURROGATE.test(text))
        return text;
    return text.replace(SURROGATE_PAIR, REPLACEMENT_CHARACTER);
}
//# sourceMappingURL=treeSitter.js.map