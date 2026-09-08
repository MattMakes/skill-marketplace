"use strict";
// JSON formatter: produces pretty-printed output with 2-space indent.
//
// Top-level shape:
//   { ...metrics, files: [...rewritten], violations }
// Each function is a whitelist of (name, filePath, line, metrics, details?).
// `details` is omitted when absent or empty.
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatJson = formatJson;
function formatJson(metrics, violations) {
    const output = {
        ...metrics,
        files: metrics.files.map((file) => ({
            ...file,
            functions: file.functions.map(toJsonFunction),
        })),
        violations,
    };
    return JSON.stringify(output, null, 2);
}
function toJsonFunction(fn) {
    const base = {
        name: fn.name,
        filePath: fn.filePath,
        line: fn.line,
        metrics: fn.metrics,
    };
    if (fn.details && Object.keys(fn.details).length > 0) {
        base.details = fn.details;
    }
    return base;
}
//# sourceMappingURL=formatJson.js.map