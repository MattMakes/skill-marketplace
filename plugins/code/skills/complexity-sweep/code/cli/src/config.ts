// Config module: defaults, file-config merge, and CLI override resolution.
//
// Precedence (low → high) for the resolved CliConfig:
//   DEFAULT_CONFIG → registry-derived thresholds → file config → CLI overrides.
// The registry-derived thresholds are merged in by `index.ts` (it calls
// `buildDefaultThresholds(registry)` and spreads the result under the file
// config's thresholds before invoking `resolveConfig`).

import type {
  CyclomaticWeights,
  MetricRegistry,
} from "static-analysis-core";

export interface ThresholdPair {
  warn: number;
  error: number;
  /** When true, a value ≤ threshold violates (used by metrics like MI). */
  lowerIsBad?: boolean;
}

export type ThresholdsConfig = Record<string, ThresholdPair>;

export type FormatName = "table" | "json" | "pretty";
export type ThresholdAction = "warn" | "error" | "none";

export interface CliConfig {
  thresholds: ThresholdsConfig;
  weights: { cyclomaticComplexity: CyclomaticWeights & Record<string, number> };
  include: string[];
  exclude: string[];
  format: FormatName;
  thresholdAction: ThresholdAction;
  sort: string;
  top: number | undefined;
  showSummary: boolean;
  plugins: string[];
}

/** CLI overrides accepted by `resolveConfig`. Not every override is applied
 *  there — `config` and `metrics` are used by `index.ts` directly.            */
export interface CliOverrides {
  format?: FormatName | "__help__";
  thresholdAction?: ThresholdAction;
  sort?: string;
  top?: number;
  showSummary?: boolean;
  config?: string;
  metrics?: string[];
}

const DEFAULT_THRESHOLDS: ThresholdsConfig = {
  cyclomaticComplexity: { warn: 10, error: 20 },
  essentialComplexity: { warn: 4, error: 8 },
  moduleDesignComplexity: { warn: 10, error: 20 },
  globalDataComplexity: { warn: 3, error: 6 },
  specifiedDataComplexity: { warn: 4, error: 8 },
};

const DEFAULT_CONFIG: CliConfig = {
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
export function buildDefaultThresholds(
  registry: MetricRegistry,
): ThresholdsConfig {
  const thresholds: ThresholdsConfig = {};
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
export function resolveConfig(
  fileConfig: Partial<CliConfig>,
  cliOverrides: CliOverrides = {},
): CliConfig {
  const merged: CliConfig = {
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
  if (cliOverrides.format) merged.format = cliOverrides.format as FormatName;
  if (cliOverrides.thresholdAction) {
    merged.thresholdAction = cliOverrides.thresholdAction;
  }
  if (cliOverrides.sort) merged.sort = cliOverrides.sort;

  // Strict-undefined checks for nullable / boolean overrides.
  if (cliOverrides.top !== undefined) merged.top = cliOverrides.top;
  if (cliOverrides.showSummary !== undefined) {
    merged.showSummary = cliOverrides.showSummary;
  }

  return merged;
}

export const __DEFAULT_CONFIG_FOR_TESTS = DEFAULT_CONFIG;
