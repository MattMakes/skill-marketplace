"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProject = analyzeProject;
const analyzeFile_1 = require("./analyzeFile");
/**
 * Run `analyzeFile` across each source file and produce a flat aggregation
 * over every function in every file.
 *
 * Aggregation is over raw per-function values (not per-file summaries), so
 * `avg` is the flat mean across all functions; `max` is the true extreme.
 * Caller owns the ts-morph Project — this function performs no I/O.
 */
function analyzeProject(sourceFiles, registry, options) {
    const files = sourceFiles.map((sf) => (0, analyzeFile_1.analyzeFile)(sf, registry, options));
    const executionOrder = registry.getExecutionOrder();
    const max = {};
    const avg = {};
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
            accumulate(fn.metrics, executionOrder, max, avg);
        }
    }
    if (totalFunctions > 0) {
        for (const def of executionOrder) {
            avg[def.key] = (avg[def.key] ?? 0) / totalFunctions;
        }
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
function accumulate(metrics, executionOrder, max, avg) {
    for (const def of executionOrder) {
        const val = metrics[def.key];
        if (val === undefined || Number.isNaN(val))
            continue;
        const current = max[def.key] ?? 0;
        max[def.key] = def.direction === "lower-is-worse"
            ? Math.min(current, val)
            : Math.max(current, val);
        avg[def.key] = (avg[def.key] ?? 0) + val;
    }
}
//# sourceMappingURL=analyzeProject.js.map