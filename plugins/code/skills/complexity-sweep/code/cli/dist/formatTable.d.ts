import type { ProjectMetrics } from "static-analysis-core";
import type { Violation } from "./thresholds";
export interface TableMetricMeta {
    key: string;
    shortCode: string;
    direction: "higher-is-worse" | "lower-is-worse";
}
export interface FormatOptions {
    sort?: string;
    top?: number;
    showSummary?: boolean;
    displayMetrics?: string[];
}
export declare function formatTable(metrics: ProjectMetrics, violations: readonly Violation[], options: FormatOptions, metricMetas?: readonly TableMetricMeta[]): string;
//# sourceMappingURL=formatTable.d.ts.map