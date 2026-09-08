"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
const astHelpers_1 = require("./utils/astHelpers");
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
function analyzeFile(sourceFile, registry, options) {
    const extracted = (0, astHelpers_1.extractFunctions)(sourceFile);
    const filePath = sourceFile.getFilePath();
    const executionOrder = registry.getExecutionOrder();
    const effectiveOptions = options ?? {};
    const functions = extracted.map((fn) => computeFunctionMetrics(fn, sourceFile, filePath, executionOrder, effectiveOptions));
    const summary = buildFileSummary(functions, executionOrder);
    return { filePath, functions, summary };
}
function computeFunctionMetrics(fn, sourceFile, filePath, executionOrder, options) {
    const metrics = {};
    const details = {};
    const failed = new Set();
    for (const def of executionOrder) {
        if (def.dependencies.some((dep) => failed.has(dep))) {
            metrics[def.key] = Number.NaN;
            failed.add(def.key);
            continue;
        }
        try {
            const result = def.compute({
                node: fn.node,
                sourceFile,
                options,
                dependencyValues: metrics,
            });
            applyResult(def, result, fn.name, filePath, metrics, details, failed);
        }
        catch (err) {
            metrics[def.key] = Number.NaN;
            failed.add(def.key);
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`Warning: Metric "${def.key}" threw for ${fn.name} in ${filePath}: ${message}`);
        }
    }
    const base = {
        name: fn.name,
        filePath,
        line: fn.line,
        metrics,
    };
    if (Object.keys(details).length > 0)
        base.details = details;
    return base;
}
function applyResult(def, result, fnName, filePath, metrics, details, failed) {
    if (typeof result === "number") {
        if (!isValid(result)) {
            warnInvalid(def.key, result, fnName, filePath);
            metrics[def.key] = Number.NaN;
            failed.add(def.key);
            return;
        }
        metrics[def.key] = result;
        return;
    }
    const value = result.value;
    if (!isValid(value)) {
        warnInvalid(def.key, value, fnName, filePath);
        metrics[def.key] = Number.NaN;
        failed.add(def.key);
        return;
    }
    metrics[def.key] = value;
    details[def.key] = result.detail;
}
function isValid(n) {
    return Number.isFinite(n) && n >= 0;
}
function warnInvalid(key, value, fnName, filePath) {
    console.warn(`Warning: Metric "${key}" returned invalid value (${value}) for ${fnName} in ${filePath}`);
}
function buildFileSummary(functions, executionOrder) {
    const max = {};
    const avg = {};
    for (const def of executionOrder) {
        max[def.key] = def.direction === "lower-is-worse"
            ? Number.POSITIVE_INFINITY
            : 0;
        avg[def.key] = 0;
    }
    if (functions.length === 0) {
        for (const def of executionOrder)
            max[def.key] = 0;
        return { totalFunctions: 0, max, avg };
    }
    for (const fn of functions) {
        for (const def of executionOrder) {
            const val = fn.metrics[def.key];
            if (val === undefined || Number.isNaN(val))
                continue;
            const current = max[def.key] ?? 0;
            max[def.key] = def.direction === "lower-is-worse"
                ? Math.min(current, val)
                : Math.max(current, val);
            avg[def.key] = (avg[def.key] ?? 0) + val;
        }
    }
    for (const def of executionOrder) {
        avg[def.key] = (avg[def.key] ?? 0) / functions.length;
        const m = max[def.key];
        if (m === undefined || !Number.isFinite(m))
            max[def.key] = 0;
    }
    return { totalFunctions: functions.length, max, avg };
}
//# sourceMappingURL=analyzeFile.js.map