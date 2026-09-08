import type { CyclomaticWeights, MetricRegistry } from "static-analysis-core";
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
    weights: {
        cyclomaticComplexity: CyclomaticWeights & Record<string, number>;
    };
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
/** Build a thresholds map seeded from every registered metric's defaults. */
export declare function buildDefaultThresholds(registry: MetricRegistry): ThresholdsConfig;
/** Merge file config over defaults, then apply CLI overrides. */
export declare function resolveConfig(fileConfig: Partial<CliConfig>, cliOverrides?: CliOverrides): CliConfig;
export declare const __DEFAULT_CONFIG_FOR_TESTS: CliConfig;
//# sourceMappingURL=config.d.ts.map