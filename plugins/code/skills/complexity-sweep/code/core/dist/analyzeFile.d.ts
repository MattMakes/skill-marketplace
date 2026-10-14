import type { SourceFile } from "ts-morph";
import type { LanguageBackend, SyntaxSourceInput } from "./languages/types";
import type { AnalysisOptions, MetricRegistry } from "./registry";
import type { FileMetrics } from "./types";
/**
 * Run every registered metric against every function-like in `sourceFile`.
 *
 * Preconditions:
 *  - `registry.validate()` must have been called; `getExecutionOrder()` throws
 *    otherwise.
 *  - `sourceFile` is a ts-morph SourceFile; its parent project is caller-owned.
 *
 * Behavior:
 *  - A metric that throws or returns an invalid value (non-finite, negative)
 *    is recorded as NaN for the current function; its dependents are skipped
 *    (also NaN). The pipeline continues — no single metric can poison the
 *    whole file. This is the documented "circuit breaker".
 *  - `details` is omitted from FunctionMetrics when no metric produced any.
 *  - `filePath` is the raw path reported by ts-morph (no leading-slash strip;
 *    the original's strip was a bug that corrupted absolute paths).
 *  - `summary.max` flips Math.max/Math.min based on each metric's direction.
 *  - `summary.avg` divides by total function count, not the non-NaN count —
 *    failures contribute 0 to the numerator but 1 to the denominator.
 */
export declare function analyzeFile(sourceFile: SourceFile, registry: MetricRegistry, options?: AnalysisOptions): FileMetrics;
/**
 * Run every registered metric against every function in a Python or Rust
 * file parsed with tree-sitter.
 *
 * Same preconditions, circuit breaker and summary rules as `analyzeFile`,
 * plus:
 *  - The compute for a metric is `def.syntaxCompute[language]` when set,
 *    else `backend.metrics[def.key]`.
 *  - A metric with no compute is absent from `metrics` (not NaN), and every
 *    metric that depends on it is absent too. The file summary leaves out
 *    the absent keys.
 *  - A file with syntax errors gets 1 warning and is analyzed anyway (ts-morph
 *    also analyzes files with syntax errors).
 *  - When parsing or extraction throws, the file gets 1 warning and 0
 *    functions. One bad file does not stop a run.
 *  - `initSyntaxParsers()` must have resolved before the call.
 */
export declare function analyzeSyntaxFile(input: SyntaxSourceInput, registry: MetricRegistry, options?: AnalysisOptions, backend?: LanguageBackend): FileMetrics;
//# sourceMappingURL=analyzeFile.d.ts.map