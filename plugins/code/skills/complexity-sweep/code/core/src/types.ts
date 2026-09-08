import type {
  ArrowFunction,
  FunctionDeclaration,
  FunctionExpression,
  MethodDeclaration,
} from "ts-morph";

// Constructors are intentionally excluded: the extraction helper never emits
// them, so they are not part of the analyzable function universe.
export type FunctionLike =
  | FunctionDeclaration
  | MethodDeclaration
  | ArrowFunction
  | FunctionExpression;

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
