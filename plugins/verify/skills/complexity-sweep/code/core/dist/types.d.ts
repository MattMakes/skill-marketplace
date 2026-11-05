import type { ArrowFunction, FunctionDeclaration, FunctionExpression, MethodDeclaration } from "ts-morph";
import type { LanguageId } from "./languages/types";
export type FunctionLike = FunctionDeclaration | MethodDeclaration | ArrowFunction | FunctionExpression;
export type MetricsSummary = Record<string, number>;
export interface FunctionMetrics {
    name: string;
    filePath: string;
    line: number;
    metrics: Record<string, number>;
    details?: Record<string, unknown>;
}
export interface FileMetrics {
    filePath: string;
    /** Language the file was analyzed as. Set by `analyzeFile` and `analyzeSyntaxFile`. */
    language?: LanguageId;
    functions: FunctionMetrics[];
    summary: {
        totalFunctions: number;
        max: MetricsSummary;
        avg: MetricsSummary;
    };
}
export interface ProjectMetrics {
    files: FileMetrics[];
    summary: {
        totalFiles: number;
        totalFunctions: number;
        max: MetricsSummary;
        avg: MetricsSummary;
    };
}
//# sourceMappingURL=types.d.ts.map