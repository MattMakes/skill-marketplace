// Public API for static-analysis-core.

// Orchestration
export { analyzeFile } from "./analyzeFile";
export { analyzeProject } from "./analyzeProject";

// Registry + keys
export { MetricRegistry, MetricKeys } from "./registry";
export type {
  MetricDefinition,
  MetricComputeContext,
  MetricResult,
  MetricKey,
  MetricDirection,
  AnalysisOptions,
  CyclomaticWeights,
} from "./registry";

// Result types
export type {
  FunctionLike,
  FunctionMetrics,
  FileMetrics,
  ProjectMetrics,
  MetricsSummary,
} from "./types";

// Builtin wiring + individual metric definitions (for cherry-picking)
export {
  registerBuiltinMetrics,
  createDefaultRegistry,
  cyclomaticComplexityDefinition,
  essentialComplexityDefinition,
  moduleDesignComplexityDefinition,
  globalDataComplexityDefinition,
  specifiedDataComplexityDefinition,
  peakLiveVariablesDefinition,
  variableSpanDefinition,
  abcScoreDefinition,
  scopeDepthWeightedLocDefinition,
  scopeDepthRatioDefinition,
  halsteadVolumeDefinition,
  halsteadDifficultyDefinition,
  halsteadEffortDefinition,
  maintainabilityIndexDefinition,
} from "./builtinMetrics";
