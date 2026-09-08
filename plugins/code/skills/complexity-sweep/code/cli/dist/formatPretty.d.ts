import type { ProjectMetrics } from "static-analysis-core";
import type { Violation } from "./thresholds";
export interface PrettyMetricMeta {
    key: string;
    shortCode: string;
    name: string;
    description: string;
    direction: "higher-is-worse" | "lower-is-worse";
}
export interface PrettyFormatOptions {
    sort?: string;
    top?: number;
    showSummary?: boolean;
    displayMetrics?: string[];
}
export declare function formatPretty(metrics: ProjectMetrics, violations: readonly Violation[], options: PrettyFormatOptions, metricMetas: readonly PrettyMetricMeta[]): string;
//# sourceMappingURL=formatPretty.d.ts.map