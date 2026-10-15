"use strict";
// Source discovery: expand the CLI patterns to file paths, drop excluded
// paths, and route each remaining path to a language by its extension.
//
// TypeScript/JavaScript paths go to ts-morph; Python and Rust paths are read
// as UTF-8 text for tree-sitter. Every other path is ignored.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeSources = routeSources;
exports.discoverSources = discoverSources;
exports.expandPatterns = expandPatterns;
exports.createExcludeMatcher = createExcludeMatcher;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const picomatch_1 = __importDefault(require("picomatch"));
const static_analysis_core_1 = require("static-analysis-core");
const tinyglobby_1 = require("tinyglobby");
const NODE_MODULES_GLOB = "**/node_modules/**";
/**
 * Expand `patterns` relative to `cwd`, drop excluded paths, and route the
 * rest by extension. The result is sorted by path, so output order is stable.
 */
function routeSources(patterns, exclude, cwd = process.cwd()) {
    const isExcluded = createExcludeMatcher(exclude, cwd);
    const routed = [];
    for (const filePath of expandPatterns(patterns, cwd)) {
        if (isExcluded(filePath))
            continue;
        const language = (0, static_analysis_core_1.languageForPath)(filePath);
        if (language !== undefined)
            routed.push({ filePath, language });
    }
    return routed;
}
/** `routeSources`, then read the Python and Rust files as UTF-8 text. */
function discoverSources(patterns, exclude, cwd = process.cwd()) {
    const routed = routeSources(patterns, exclude, cwd);
    const typescriptPaths = [];
    const syntaxInputs = [];
    for (const { filePath, language } of routed) {
        if (language === "typescript") {
            typescriptPaths.push(filePath);
        }
        else {
            syntaxInputs.push(readSyntaxInput(filePath, language));
        }
    }
    return { typescriptPaths, syntaxInputs, routed };
}
function readSyntaxInput(filePath, language) {
    return { language, filePath, text: (0, node_fs_1.readFileSync)(filePath, "utf8") };
}
/**
 * Absolute, de-duplicated, sorted file paths for `patterns`. A plain file
 * path is kept as is; a glob is expanded without entering `node_modules`.
 */
function expandPatterns(patterns, cwd) {
    const found = new Set();
    for (const pattern of patterns) {
        for (const filePath of expandPattern(pattern, cwd))
            found.add(filePath);
    }
    return [...found].sort();
}
function expandPattern(pattern, cwd) {
    if (!(0, tinyglobby_1.isDynamicPattern)(pattern)) {
        const filePath = (0, node_path_1.resolve)(cwd, pattern);
        return isFile(filePath) ? [filePath] : [];
    }
    // Glob from the static base directory, so that the `node_modules` ignore
    // also applies to absolute patterns (tinyglobby ignores are cwd-relative).
    const { base, rest } = splitStaticBase(pattern);
    const baseDir = (0, node_path_1.resolve)(cwd, base);
    return (0, tinyglobby_1.globSync)(rest, {
        cwd: baseDir,
        absolute: true,
        expandDirectories: false,
        ignore: [NODE_MODULES_GLOB],
    }).map((p) => (0, node_path_1.resolve)(p));
}
/** Split `pattern` into its leading non-glob directories and the glob rest. */
function splitStaticBase(pattern) {
    const segments = pattern.split("/");
    let i = 0;
    while (i < segments.length - 1 && !(0, tinyglobby_1.isDynamicPattern)(segments[i] ?? ""))
        i++;
    const baseSegments = segments.slice(0, i);
    const base = baseSegments.join("/") || ((0, node_path_1.isAbsolute)(pattern) ? "/" : ".");
    return { base, rest: segments.slice(i).join("/") };
}
function isFile(filePath) {
    try {
        return (0, node_fs_1.statSync)(filePath).isFile();
    }
    catch {
        return false;
    }
}
// True for a path that is in `node_modules` or that matches an exclude glob.
// A glob matches the absolute path or the path relative to `cwd`, so both
// `**/target/**` and `src/generated/**` forms work. `dot: true` lets `*` and
// `**` match dot directories such as `.venv`.
function createExcludeMatcher(exclude, cwd) {
    const matches = (0, picomatch_1.default)([NODE_MODULES_GLOB, ...exclude], { dot: true });
    return (filePath) => {
        if (matches(filePath))
            return true;
        const rel = (0, node_path_1.relative)(cwd, filePath);
        return !rel.startsWith("..") && !(0, node_path_1.isAbsolute)(rel) && matches(rel);
    };
}
//# sourceMappingURL=discover.js.map