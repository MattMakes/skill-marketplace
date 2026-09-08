import type { FunctionMetrics } from "static-analysis-core";
import type { ThresholdsConfig } from "./config";
export interface Violation {
    functionName: string;
    filePath: string;
    line: number;
    metric: string;
    value: number;
    threshold: number;
    severity: "warn" | "error";
}
export declare function checkThresholds(functions: readonly FunctionMetrics[], thresholds: ThresholdsConfig): Violation[];
//# sourceMappingURL=thresholds.d.ts.map