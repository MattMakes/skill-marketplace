// Public API for static-analysis-core.

// Orchestration
export { analyzeFile, analyzeSyntaxFile } from "./analyzeFile";
export { analyzeProject, isSyntaxSourceInput } from "./analyzeProject";
export type { ProjectSource } from "./analyzeProject";

// Languages (Python, Rust and GDScript through web-tree-sitter)
export {
  getSyntaxBackend,
  languageForPath,
  SYNTAX_BACKENDS,
  TYPESCRIPT_EXTENSIONS,
} from "./languages";
export { initSyntaxParsers, parseSyntaxSource } from "./languages/treeSitter";
export { pythonBackend } from "./languages/python";
export { rustBackend } from "./languages/rust";
export { gdscriptBackend } from "./languages/gdscript";
export {
  walkDescendants,
  sameNode,
  lineOf,
  endLineOf,
  createNodeCache,
} from "./languages/syntaxHelpers";
export type {
  LanguageId,
  SyntaxLanguageId,
  SyntaxSourceInput,
  SyntaxSourceFile,
  SyntaxFunction,
  SyntaxMetricContext,
  SyntaxMetricCompute,
  LanguageBackend,
  SyntaxNode,
} from "./languages/types";

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
