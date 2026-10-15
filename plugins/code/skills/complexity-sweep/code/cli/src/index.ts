#!/usr/bin/env node
// CLI entry for `static-analysis-cli`.
//
// Flow: parse argv → load cosmiconfig → build registry + load plugins →
// merge defaults/file/CLI → discover source files (TypeScript/JavaScript via
// ts-morph, Python/Rust via tree-sitter) → analyze → evaluate thresholds →
// format → stdout → exit.

import { dirname } from "node:path";

import {
  MetricRegistry,
  analyzeProject,
  initSyntaxParsers,
  registerBuiltinMetrics,
} from "static-analysis-core";
import type { MetricDefinition, ProjectSource } from "static-analysis-core";
import { cosmiconfig } from "cosmiconfig";
import { Project } from "ts-morph";

import {
  buildDefaultThresholds,
  resolveConfig,
  type CliConfig,
  type CliOverrides,
  type FormatName,
} from "./config";
import { discoverSources } from "./discover";
import { formatJson } from "./formatJson";
import { formatPretty, type PrettyMetricMeta } from "./formatPretty";
import { formatTable, type TableMetricMeta } from "./formatTable";
import { loadPlugins } from "./pluginLoader";
import { checkThresholds } from "./thresholds";

const COSMICONFIG_MODULE = "static-analysis";
const HELP_SENTINEL = "__help__";

async function main(): Promise<void> {
  const { cliOverrides, globs } = parseArgs(process.argv.slice(2));

  const registry = new MetricRegistry();
  registerBuiltinMetrics(registry);

  const { fileConfig, configDir } = await loadFileConfig(cliOverrides.config);

  const pluginSpecs = fileConfig.plugins ?? [];
  if (pluginSpecs.length > 0) {
    await loadPlugins(pluginSpecs, registry, configDir);
  }
  registry.validate();

  const registryThresholds = buildDefaultThresholds(registry);
  const config = resolveConfig(
    {
      ...fileConfig,
      thresholds: {
        ...registryThresholds,
        ...(fileConfig.thresholds ?? {}),
      },
    },
    cliOverrides,
  );

  if (cliOverrides.format === HELP_SENTINEL) {
    printHelp(registry);
    process.exitCode = 0;
    return;
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

  const sources = await loadSources(globs, config);
  if (sources.length === 0) {
    console.error("No source files found matching the provided patterns.");
    process.exitCode = 2;
    return;
  }

  const metrics = analyzeProject(sources, registry, {
    weights: { cyclomaticComplexity: config.weights.cyclomaticComplexity },
  });

  const allFunctions = metrics.files.flatMap((f) => f.functions);
  const violations = checkThresholds(allFunctions, config.thresholds);

  const output = renderOutput(config.format, metrics, violations, config, cliOverrides, registry.getAll());
  console.log(output);

  // Set the exit code and return instead of calling `process.exit`: when stdout
  // is a pipe, Node writes asynchronously and `process.exit` would cut the
  // output at the pipe buffer size (64 KiB).
  process.exitCode = computeExitCode(config.thresholdAction, violations);
}

// ---------- argv parsing ----------

interface ParsedArgs {
  cliOverrides: CliOverrides;
  globs: string[];
}

function parseArgs(args: readonly string[]): ParsedArgs {
  const cliOverrides: CliOverrides = {};
  const globs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    switch (arg) {
      case "--format":
        cliOverrides.format = args[++i] as FormatName;
        break;
      case "--config":
        cliOverrides.config = args[++i];
        break;
      case "--threshold-action":
        cliOverrides.thresholdAction = args[++i] as CliOverrides["thresholdAction"];
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

// ---------- cosmiconfig wiring ----------

interface LoadedConfig {
  fileConfig: Partial<CliConfig>;
  configDir: string;
}

async function loadFileConfig(configPath: string | undefined): Promise<LoadedConfig> {
  const explorer = cosmiconfig(COSMICONFIG_MODULE);
  try {
    const result = configPath
      ? await explorer.load(configPath)
      : await explorer.search();
    if (result && !result.isEmpty) {
      return {
        fileConfig: result.config as Partial<CliConfig>,
        configDir: dirname(result.filepath),
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Config error: ${message}`);
    process.exit(2);
  }
  return { fileConfig: {}, configDir: process.cwd() };
}

// ---------- source discovery ----------

/**
 * Expand the patterns, route each file by extension, and load it: ts-morph
 * SourceFiles for TypeScript/JavaScript, UTF-8 text for Python and Rust.
 * The tree-sitter parsers load only when a Python or Rust file matches.
 * The result is sorted by path.
 */
async function loadSources(
  globs: readonly string[],
  config: CliConfig,
): Promise<ProjectSource[]> {
  const patterns = globs.length > 0 ? globs : config.include;
  const discovered = discoverSources(patterns, config.exclude);

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true },
  });
  const sources = new Map<string, ProjectSource>();
  for (const filePath of discovered.typescriptPaths) {
    sources.set(filePath, project.addSourceFileAtPath(filePath));
  }
  for (const input of discovered.syntaxInputs) {
    sources.set(input.filePath, input);
  }
  if (discovered.syntaxInputs.length > 0) await initSyntaxParsers();

  return discovered.routed.flatMap(({ filePath }) => {
    const source = sources.get(filePath);
    return source === undefined ? [] : [source];
  });
}

// ---------- validation + help ----------

function validateMetricKey(
  label: string,
  key: string | undefined,
  allKeys: readonly string[],
): void {
  if (key && !allKeys.includes(key)) {
    console.error(
      `Invalid ${label}: "${key}". Available metrics: ${allKeys.join(", ")}`,
    );
    process.exit(2);
  }
}

function printHelp(registry: MetricRegistry): void {
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

function renderOutput(
  format: FormatName,
  metrics: ReturnType<typeof analyzeProject>,
  violations: ReturnType<typeof checkThresholds>,
  config: CliConfig,
  cliOverrides: CliOverrides,
  allMetrics: readonly MetricDefinition[],
): string {
  const formatOptions = {
    sort: config.sort,
    top: config.top,
    showSummary: config.showSummary,
    displayMetrics: cliOverrides.metrics,
  };

  if (format === "json") return formatJson(metrics, violations);

  if (format === "pretty") {
    const metas: PrettyMetricMeta[] = allMetrics.map((m) => ({
      key: m.key,
      shortCode: m.shortCode,
      name: m.name,
      description: m.description,
      direction: m.direction,
    }));
    return formatPretty(metrics, violations, formatOptions, metas);
  }

  // table (default) — covers any unrecognized format value.
  const metas: TableMetricMeta[] = allMetrics.map((m) => ({
    key: m.key,
    shortCode: m.shortCode,
    direction: m.direction,
  }));
  return formatTable(metrics, violations, formatOptions, metas);
}

function computeExitCode(
  action: CliConfig["thresholdAction"],
  violations: ReturnType<typeof checkThresholds>,
): 0 | 1 {
  if (action === "none") return 0;
  const hasErrors = violations.some((v) => v.severity === "error");
  if (hasErrors && action === "error") return 1;
  return 0;
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Fatal: ${message}`);
  process.exit(2);
});
