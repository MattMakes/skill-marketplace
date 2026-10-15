"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyntaxSourceInput = isSyntaxSourceInput;
exports.analyzeProject = analyzeProject;
const analyzeFile_1 = require("./analyzeFile");
/**
 * True for a Python or Rust input. Structural on purpose: the CLI and core
 * can load different copies of ts-morph, so `instanceof SourceFile` is not
 * reliable.
 */
function isSyntaxSourceInput(item) {
    return "language" in item && "text" in item && typeof item.text === "string";
}
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
function analyzeProject(sources, registry, options, backends = {}) {
    const files = sources.map((source) => isSyntaxSourceInput(source)
        ? (0, analyzeFile_1.analyzeSyntaxFile)(source, registry, options, backends[source.language])
        : (0, analyzeFile_1.analyzeFile)(source, registry, options));
    const executionOrder = reportedMetrics(files, registry.getExecutionOrder());
    const max = {};
    const avg = {};
    const counts = new Map();
    for (const def of executionOrder) {
        max[def.key] = def.direction === "lower-is-worse"
            ? Number.POSITIVE_INFINITY
            : 0;
        avg[def.key] = 0;
    }
    let totalFunctions = 0;
    for (const file of files) {
        totalFunctions += file.summary.totalFunctions;
        for (const fn of file.functions) {
            accumulate(fn.metrics, executionOrder, max, avg, counts);
        }
    }
    for (const def of executionOrder) {
        const count = counts.get(def.key) ?? 0;
        if (count > 0)
            avg[def.key] = (avg[def.key] ?? 0) / count;
    }
    for (const def of executionOrder) {
        const m = max[def.key];
        if (m === undefined || !Number.isFinite(m))
            max[def.key] = 0;
    }
    return {
        files,
        summary: {
            totalFiles: files.length,
            totalFunctions,
            max,
            avg,
        },
    };
}
/**
 * The metrics that 1 or more files report, in execution order. Every file
 * summary lists each metric that ran for its language, so the union covers
 * files with 0 functions too. An empty project reports every metric.
 */
function reportedMetrics(files, executionOrder) {
    if (files.length === 0)
        return [...executionOrder];
    const reported = new Set();
    for (const file of files) {
        for (const key of Object.keys(file.summary.max))
            reported.add(key);
    }
    return executionOrder.filter((def) => reported.has(def.key));
}
function accumulate(metrics, executionOrder, max, avg, counts) {
    for (const def of executionOrder) {
        const val = metrics[def.key];
        if (val === undefined)
            continue;
        // NaN counts in the denominator (TypeScript parity), not the numerator.
        counts.set(def.key, (counts.get(def.key) ?? 0) + 1);
        if (Number.isNaN(val))
            continue;
        const current = max[def.key] ?? 0;
        max[def.key] = def.direction === "lower-is-worse"
            ? Math.min(current, val)
            : Math.max(current, val);
        avg[def.key] = (avg[def.key] ?? 0) + val;
    }
}
//# sourceMappingURL=analyzeProject.js.map