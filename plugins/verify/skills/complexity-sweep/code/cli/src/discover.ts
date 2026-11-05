// Source discovery: expand the CLI patterns to file paths, drop excluded
// paths, and route each remaining path to a language by its extension.
//
// TypeScript/JavaScript paths go to ts-morph; Python and Rust paths are read
// as UTF-8 text for tree-sitter. Every other path is ignored.

import { readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import picomatch from "picomatch";
import { languageForPath } from "static-analysis-core";
import type {
  LanguageId,
  SyntaxLanguageId,
  SyntaxSourceInput,
} from "static-analysis-core";
import { globSync, isDynamicPattern } from "tinyglobby";

const NODE_MODULES_GLOB = "**/node_modules/**";

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
export function routeSources(
  patterns: readonly string[],
  exclude: readonly string[],
  cwd: string = process.cwd(),
): RoutedPath[] {
  const isExcluded = createExcludeMatcher(exclude, cwd);
  const routed: RoutedPath[] = [];
  for (const filePath of expandPatterns(patterns, cwd)) {
    if (isExcluded(filePath)) continue;
    const language = languageForPath(filePath);
    if (language !== undefined) routed.push({ filePath, language });
  }
  return routed;
}

/** `routeSources`, then read the Python and Rust files as UTF-8 text. */
export function discoverSources(
  patterns: readonly string[],
  exclude: readonly string[],
  cwd: string = process.cwd(),
): DiscoveredSources {
  const routed = routeSources(patterns, exclude, cwd);
  const typescriptPaths: string[] = [];
  const syntaxInputs: SyntaxSourceInput[] = [];
  for (const { filePath, language } of routed) {
    if (language === "typescript") {
      typescriptPaths.push(filePath);
    } else {
      syntaxInputs.push(readSyntaxInput(filePath, language));
    }
  }
  return { typescriptPaths, syntaxInputs, routed };
}

function readSyntaxInput(filePath: string, language: SyntaxLanguageId): SyntaxSourceInput {
  return { language, filePath, text: readFileSync(filePath, "utf8") };
}

/**
 * Absolute, de-duplicated, sorted file paths for `patterns`. A plain file
 * path is kept as is; a glob is expanded without entering `node_modules`.
 */
export function expandPatterns(patterns: readonly string[], cwd: string): string[] {
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const filePath of expandPattern(pattern, cwd)) found.add(filePath);
  }
  return [...found].sort();
}

function expandPattern(pattern: string, cwd: string): string[] {
  if (!isDynamicPattern(pattern)) {
    const filePath = resolve(cwd, pattern);
    return isFile(filePath) ? [filePath] : [];
  }
  // Glob from the static base directory, so that the `node_modules` ignore
  // also applies to absolute patterns (tinyglobby ignores are cwd-relative).
  const { base, rest } = splitStaticBase(pattern);
  const baseDir = resolve(cwd, base);
  return globSync(rest, {
    cwd: baseDir,
    absolute: true,
    expandDirectories: false,
    ignore: [NODE_MODULES_GLOB],
  }).map((p) => resolve(p));
}

/** Split `pattern` into its leading non-glob directories and the glob rest. */
function splitStaticBase(pattern: string): { base: string; rest: string } {
  const segments = pattern.split("/");
  let i = 0;
  while (i < segments.length - 1 && !isDynamicPattern(segments[i] ?? "")) i++;
  const baseSegments = segments.slice(0, i);
  const base = baseSegments.join("/") || (isAbsolute(pattern) ? "/" : ".");
  return { base, rest: segments.slice(i).join("/") };
}

function isFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

// True for a path that is in `node_modules` or that matches an exclude glob.
// A glob matches the absolute path or the path relative to `cwd`, so both
// `**/target/**` and `src/generated/**` forms work. `dot: true` lets `*` and
// `**` match dot directories such as `.venv`.
export function createExcludeMatcher(
  exclude: readonly string[],
  cwd: string,
): (filePath: string) => boolean {
  const matches = picomatch([NODE_MODULES_GLOB, ...exclude], { dot: true });
  return (filePath) => {
    if (matches(filePath)) return true;
    const rel = relative(cwd, filePath);
    return !rel.startsWith("..") && !isAbsolute(rel) && matches(rel);
  };
}
