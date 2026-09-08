#!/usr/bin/env node
"use strict";
// CLI entry for `static-analysis-cli`.
//
// Flow: parse argv → load cosmiconfig → build registry + load plugins →
// merge defaults/file/CLI → discover source files via ts-morph → analyze →
// evaluate thresholds → format → stdout → exit.
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const static_analysis_core_1 = require("static-analysis-core");
const cosmiconfig_1 = require("cosmiconfig");
const ts_morph_1 = require("ts-morph");
const config_1 = require("./config");
const formatJson_1 = require("./formatJson");
const formatPretty_1 = require("./formatPretty");
const formatTable_1 = require("./formatTable");
const pluginLoader_1 = require("./pluginLoader");
const thresholds_1 = require("./thresholds");
const COSMICONFIG_MODULE = "static-analysis";
const HELP_SENTINEL = "__help__";
async function main() {
    const { cliOverrides, globs } = parseArgs(process.argv.slice(2));
    const registry = new static_analysis_core_1.MetricRegistry();
    (0, static_analysis_core_1.registerBuiltinMetrics)(registry);
    const { fileConfig, configDir } = await loadFileConfig(cliOverrides.config);
    const pluginSpecs = fileConfig.plugins ?? [];
    if (pluginSpecs.length > 0) {
        await (0, pluginLoader_1.loadPlugins)(pluginSpecs, registry, configDir);
    }
    registry.validate();
    const registryThresholds = (0, config_1.buildDefaultThresholds)(registry);
    const config = (0, config_1.resolveConfig)({
        ...fileConfig,
        thresholds: {
            ...registryThresholds,
            ...(fileConfig.thresholds ?? {}),
        },
    }, cliOverrides);
    if (cliOverrides.format === HELP_SENTINEL) {
        printHelp(registry);
        process.exit(0);
    }
    // TTY override — config-declared `format` is overridden when stdout is piped.
    if (!cliOverrides.format) {
        config.format = process.stdout.isTTY ? "table" : "json";
    }
    const allMetricKeys = registry.getAll().map((m) => m.key);
    validateMetricKey("sort metric", config.sort, allMetricKeys);
    if (cliOverrides.metrics) {
        for (const key of cliOverrides.metrics) {
            validateMetricKey("metric", key, allMetricKeys);
        }
    }
    const sourceFiles = discoverSources(globs, config);
    if (sourceFiles.length === 0) {
        console.error("No source files found matching the provided patterns.");
        process.exit(2);
    }
    const metrics = (0, static_analysis_core_1.analyzeProject)(sourceFiles, registry, {
        weights: { cyclomaticComplexity: config.weights.cyclomaticComplexity },
    });
    const allFunctions = metrics.files.flatMap((f) => f.functions);
    const violations = (0, thresholds_1.checkThresholds)(allFunctions, config.thresholds);
    const output = renderOutput(config.format, metrics, violations, config, cliOverrides, registry.getAll());
    console.log(output);
    process.exit(computeExitCode(config.thresholdAction, violations));
}
function parseArgs(args) {
    const cliOverrides = {};
    const globs = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === undefined)
            continue;
        switch (arg) {
            case "--format":
                cliOverrides.format = args[++i];
                break;
            case "--config":
                cliOverrides.config = args[++i];
                break;
            case "--threshold-action":
                cliOverrides.thresholdAction = args[++i];
                break;
            case "--sort":
                cliOverrides.sort = args[++i];
                break;
            case "--top": {
                const raw = args[++i];
                cliOverrides.top = Number.parseInt(raw ?? "", 10);
                break;
            }
            case "--metrics": {
                const raw = args[++i] ?? "";
                cliOverrides.metrics = raw.split(",").map((s) => s.trim());
                break;
            }
            case "--no-summary":
                cliOverrides.showSummary = false;
                break;
            case "--help":
                cliOverrides.format = HELP_SENTINEL;
                break;
            default:
                if (arg.startsWith("-")) {
                    console.error(`Unknown option: ${arg}`);
                    process.exit(2);
                }
                globs.push(arg);
        }
    }
    return { cliOverrides, globs };
}
async function loadFileConfig(configPath) {
    const explorer = (0, cosmiconfig_1.cosmiconfig)(COSMICONFIG_MODULE);
    try {
        const result = configPath
            ? await explorer.load(configPath)
            : await explorer.search();
        if (result && !result.isEmpty) {
            return {
                fileConfig: result.config,
                configDir: (0, node_path_1.dirname)(result.filepath),
            };
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Config error: ${message}`);
        process.exit(2);
    }
    return { fileConfig: {}, configDir: process.cwd() };
}
// ---------- source discovery ----------
function discoverSources(globs, config) {
    const project = new ts_morph_1.Project({
        skipAddingFilesFromTsConfig: true,
        compilerOptions: { allowJs: true },
    });
    const patterns = globs.length > 0 ? globs : config.include;
    for (const pattern of patterns) {
        project.addSourceFilesAtPaths(pattern);
    }
    return project.getSourceFiles().filter((sf) => {
        const path = sf.getFilePath();
        if (path.includes("/node_modules/"))
            return false;
        return !config.exclude.some((ex) => globToRegex(ex).test(path));
    });
}
/** Replicates the shipped glob→regex transform verbatim (order-sensitive). */
function globToRegex(glob) {
    return new RegExp(glob
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\./g, "\\."));
}
// ---------- validation + help ----------
function validateMetricKey(label, key, allKeys) {
    if (key && !allKeys.includes(key)) {
        console.error(`Invalid ${label}: "${key}". Available metrics: ${allKeys.join(", ")}`);
        process.exit(2);
    }
}
function printHelp(registry) {
    const metricsHelp = registry
        .getAll()
        .map((m) => `                                           ${m.key} (${m.shortCode})`)
        .join(",\n");
    console.log(`
static-analysis [options] [glob patterns...]

Options:
  --format <table|json|pretty>    Output format (default: table for TTY, json for piped)
                                  pretty = bordered table with metric legend
  --config <path>                 Explicit config file path
  --threshold-action <warn|error|none>
                                  Action when thresholds exceeded (default: error)
  --sort <metric>                 Sort by metric (default: cyclomaticComplexity)
                                  Available metrics:
${metricsHelp}
  --metrics <key1,key2,...>       Display only the specified metrics
  --top <n>                       Show only top N functions
  --no-summary                    Skip summaries
  --help                          Show this help
`);
}
// ---------- output + exit ----------
function renderOutput(format, metrics, violations, config, cliOverrides, allMetrics) {
    const formatOptions = {
        sort: config.sort,
        top: config.top,
        showSummary: config.showSummary,
        displayMetrics: cliOverrides.metrics,
    };
    if (format === "json")
        return (0, formatJson_1.formatJson)(metrics, violations);
    if (format === "pretty") {
        const metas = allMetrics.map((m) => ({
            key: m.key,
            shortCode: m.shortCode,
            name: m.name,
            description: m.description,
            direction: m.direction,
        }));
        return (0, formatPretty_1.formatPretty)(metrics, violations, formatOptions, metas);
    }
    // table (default) — covers any unrecognized format value.
    const metas = allMetrics.map((m) => ({
        key: m.key,
        shortCode: m.shortCode,
        direction: m.direction,
    }));
    return (0, formatTable_1.formatTable)(metrics, violations, formatOptions, metas);
}
function computeExitCode(action, violations) {
    if (action === "none")
        return 0;
    const hasErrors = violations.some((v) => v.severity === "error");
    if (hasErrors && action === "error")
        return 1;
    return 0;
}
main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Fatal: ${message}`);
    process.exit(2);
});
//# sourceMappingURL=index.js.map