import type { Node, SourceFile } from "ts-morph";
import type { SyntaxLanguageId, SyntaxMetricCompute } from "./languages/types";
export interface CyclomaticWeights {
    if?: number;
    elseIf?: number;
    for?: number;
    forIn?: number;
    forOf?: number;
    while?: number;
    doWhile?: number;
    case?: number;
    catch?: number;
    logicalAnd?: number;
    logicalOr?: number;
    nullishCoalescing?: number;
    ternary?: number;
    /** Rust `?` operator (an early-return path). No TypeScript construct uses it. */
    tryOperator?: number;
}
export interface AnalysisOptions {
    weights?: {
        cyclomaticComplexity?: CyclomaticWeights;
    };
}
export interface MetricComputeContext {
    node: Node;
    sourceFile: SourceFile;
    options: AnalysisOptions;
    dependencyValues: Record<string, number>;
}
export interface MetricResult<TDetail = unknown> {
    value: number;
    detail: TDetail;
}
export type MetricDirection = "higher-is-worse" | "lower-is-worse";
export interface MetricDefinition<TDetail = unknown> {
    key: string;
    name: string;
    shortCode: string;
    description: string;
    defaultThresholds: {
        warn: number;
        error: number;
    };
    direction: MetricDirection;
    dependencies: string[];
    compute: (ctx: MetricComputeContext) => number | MetricResult<TDetail>;
    /**
     * Compute for files parsed with tree-sitter (Python, Rust). `compute` stays
     * the TypeScript/JavaScript path. For a built-in metric, the language
     * backend supplies the compute when this field is absent. A metric with no
     * compute for a language is left out of that language's results.
     */
    syntaxCompute?: Partial<Record<SyntaxLanguageId, SyntaxMetricCompute<TDetail>>>;
    detailKeys?: string[];
}
export declare const MetricKeys: {
    readonly cyclomaticComplexity: "cyclomaticComplexity";
    readonly essentialComplexity: "essentialComplexity";
    readonly moduleDesignComplexity: "moduleDesignComplexity";
    readonly globalDataComplexity: "globalDataComplexity";
    readonly specifiedDataComplexity: "specifiedDataComplexity";
    readonly peakLiveVariables: "peakLiveVariables";
    readonly variableSpan: "variableSpan";
    readonly abcScore: "abcScore";
    readonly scopeDepthWeightedLoc: "scopeDepthWeightedLoc";
    readonly scopeDepthRatio: "scopeDepthRatio";
    readonly halsteadVolume: "halsteadVolume";
    readonly halsteadDifficulty: "halsteadDifficulty";
    readonly halsteadEffort: "halsteadEffort";
    readonly maintainabilityIndex: "maintainabilityIndex";
};
export type MetricKey = (typeof MetricKeys)[keyof typeof MetricKeys];
export declare class MetricRegistry {
    private readonly metrics;
    private executionOrder;
    register(definition: MetricDefinition): void;
    get(key: string): MetricDefinition | undefined;
    getAll(): MetricDefinition[];
    validate(): void;
    getExecutionOrder(): MetricDefinition[];
    private topologicalSort;
}
//# sourceMappingURL=registry.d.ts.map