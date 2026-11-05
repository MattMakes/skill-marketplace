import { type SourceFile } from "ts-morph";
import type { AnalysisOptions, MetricComputeContext } from "../../registry";
export interface TestHarness {
    sourceFile: SourceFile;
    getCtx: (name: string, options?: AnalysisOptions) => MetricComputeContext;
}
export declare function createHarness(source: string, filePath?: string): TestHarness;
//# sourceMappingURL=testUtils.d.ts.map