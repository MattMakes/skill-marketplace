"use strict";
// Language registry: maps a file path to a `LanguageId`, and a tree-sitter
// language to its backend. TypeScript/JavaScript files go to ts-morph
// (`analyzeFile`); Python and Rust files go to `analyzeSyntaxFile`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPESCRIPT_EXTENSIONS = exports.SYNTAX_BACKENDS = void 0;
exports.getSyntaxBackend = getSyntaxBackend;
exports.languageForPath = languageForPath;
const node_path_1 = require("node:path");
const python_1 = require("./python");
const rust_1 = require("./rust");
exports.SYNTAX_BACKENDS = {
    python: python_1.pythonBackend,
    rust: rust_1.rustBackend,
};
/** Lower-case extensions (with the leading dot) that ts-morph analyzes. */
exports.TYPESCRIPT_EXTENSIONS = [
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
];
function getSyntaxBackend(id) {
    return exports.SYNTAX_BACKENDS[id];
}
/**
 * The language of a file, from its lower-case extension. Returns `undefined`
 * for a file the analyzer does not read (for example `.txt` or `.pyi`).
 */
function languageForPath(filePath) {
    const ext = (0, node_path_1.extname)(filePath).toLowerCase();
    if (ext === "")
        return undefined;
    if (exports.TYPESCRIPT_EXTENSIONS.includes(ext))
        return "typescript";
    for (const backend of Object.values(exports.SYNTAX_BACKENDS)) {
        if (backend.extensions.includes(ext))
            return backend.id;
    }
    return undefined;
}
//# sourceMappingURL=index.js.map