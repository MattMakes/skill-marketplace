import type { SourceFile } from "ts-morph";
import type { AnalysisOptions, MetricRegistry } from "./registry";
import type { ProjectMetrics } from "./types";
/**
 * Run `analyzeFile` across each source file and produce a flat aggregation
 * over every function in every file.
 *
 * Aggregation is over raw per-function values (not per-file summaries), so
 * `avg` is the flat mean across all functions; `max` is the true extreme.
 * Caller owns the ts-morph Project — this function performs no I/O.
 */
export declare function analyzeProject(sourceFiles: SourceFile[], registry: MetricRegistry, options?: AnalysisOptions): ProjectMetrics;
//# sourceMappingURL=analyzeProject.d.ts.map