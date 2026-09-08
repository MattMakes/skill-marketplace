"use strict";
// Config module: defaults, file-config merge, and CLI override resolution.
//
// Precedence (low → high) for the resolved CliConfig:
//   DEFAULT_CONFIG → registry-derived thresholds → file config → CLI overrides.
// The registry-derived thresholds are merged in by `index.ts` (it calls
// `buildDefaultThresholds(registry)` and spreads the result under the file
// config's thresholds before invoking `resolveConfig`).
Object.defineProperty(exports, "__esModule", { value: true });
exports.__DEFAULT_CONFIG_FOR_TESTS = void 0;
exports.buildDefaultThresholds = buildDefaultThresholds;
exports.resolveConfig = resolveConfig;
const DEFAULT_THRESHOLDS = {
    cyclomaticComplexity: { warn: 10, error: 20 },
    essentialComplexity: { warn: 4, error: 8 },
    moduleDesignComplexity: { warn: 10, error: 20 },
    globalDataComplexity: { warn: 3, error: 6 },
    specifiedDataComplexity: { warn: 4, error: 8 },
};
const DEFAULT_CONFIG = {
    thresholds: DEFAULT_THRESHOLDS,
    weights: { cyclomaticComplexity: {} },
    include: ["**/*.ts", "**/*.js"],
    exclude: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
    format: "table",
    thresholdAction: "error",
    sort: "cyclomaticComplexity",
    top: undefined,
    showSummary: true,
    plugins: [],
};
/** Build a thresholds map seeded from every registered metric's defaults. */
function buildDefaultThresholds(registry) {
    const thresholds = {};
    for (const metric of registry.getAll()) {
        thresholds[metric.key] = {
            warn: metric.defaultThresholds.warn,
            error: metric.defaultThresholds.error,
            lowerIsBad: metric.direction === "lower-is-worse",
        };
    }
    return thresholds;
}
/** Merge file config over defaults, then apply CLI overrides. */
function resolveConfig(fileConfig, cliOverrides = {}) {
    const merged = {
        ...DEFAULT_CONFIG,
        ...fileConfig,
        thresholds: {
            ...DEFAULT_CONFIG.thresholds,
            ...(fileConfig.thresholds ?? {}),
        },
        weights: {
            cyclomaticComplexity: {
                ...DEFAULT_CONFIG.weights.cyclomaticComplexity,
                ...(fileConfig.weights?.cyclomaticComplexity ?? {}),
            },
        },
        plugins: fileConfig.plugins ?? DEFAULT_CONFIG.plugins,
    };
    // Truthy-check overrides for string enums (preserves spec behavior:
    // `--format ""` must NOT override).
    if (cliOverrides.format)
        merged.format = cliOverrides.format;
    if (cliOverrides.thresholdAction) {
        merged.thresholdAction = cliOverrides.thresholdAction;
    }
    if (cliOverrides.sort)
        merged.sort = cliOverrides.sort;
    // Strict-undefined checks for nullable / boolean overrides.
    if (cliOverrides.top !== undefined)
        merged.top = cliOverrides.top;
    if (cliOverrides.showSummary !== undefined) {
        merged.showSummary = cliOverrides.showSummary;
    }
    return merged;
}
exports.__DEFAULT_CONFIG_FOR_TESTS = DEFAULT_CONFIG;
//# sourceMappingURL=config.js.map