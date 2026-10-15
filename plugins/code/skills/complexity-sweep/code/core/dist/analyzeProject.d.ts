import type { SourceFile } from "ts-morph";
import type { LanguageBackend, SyntaxLanguageId, SyntaxSourceInput } from "./languages/types";
import type { AnalysisOptions, MetricRegistry } from "./registry";
import type { ProjectMetrics } from "./types";
/** One file to analyze: a ts-morph SourceFile or a Python/Rust input. */
export type ProjectSource = SourceFile | SyntaxSourceInput;
/**
 * True for a Python or Rust input. Structural on purpose: the CLI and core
 * can load different copies of ts-morph, so `instanceof SourceFile` is not
 * reliable.
 */
export declare function isSyntaxSourceInput(item: ProjectSource): item is SyntaxSourceInput;
/**
 * Run `analyzeFile` (TypeScript/JavaScript) or `analyzeSyntaxFile` (Python,
 * Rust) across each source and produce a flat aggregation over every
 * function in every file.
 *
 * Aggregation is over raw per-function values (not per-file summaries), so
 * `avg` is the flat mean across all functions; `max` is the true extreme.
 * A metric that is absent for a language (no compute) is not counted: its
 * `avg` divides by the functions that have the key, and a key that no file
 * reports is left out. For TypeScript-only input this is the flat mean over
 * all functions, as before.
 * Caller owns the ts-morph Project and reads the Python/Rust text — this
 * function performs no I/O. `initSyntaxParsers()` must have resolved when
 * the input holds a Python or Rust file. `backends` replaces the built-in
 * backend for a language (tests use it).
 */
export declare function analyzeProject(sources: ReadonlyArray<ProjectSource>, registry: MetricRegistry, options?: AnalysisOptions, backends?: Partial<Record<SyntaxLanguageId, LanguageBackend>>): ProjectMetrics;
//# sourceMappingURL=analyzeProject.d.ts.map