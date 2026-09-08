import type { Node, SourceFile } from "ts-morph";

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
}

export interface AnalysisOptions {
  weights?: { cyclomaticComplexity?: CyclomaticWeights };
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
  defaultThresholds: { warn: number; error: number };
  direction: MetricDirection;
  dependencies: string[];
  compute: (ctx: MetricComputeContext) => number | MetricResult<TDetail>;
  detailKeys?: string[];
}

export const MetricKeys = {
  cyclomaticComplexity: "cyclomaticComplexity",
  essentialComplexity: "essentialComplexity",
  moduleDesignComplexity: "moduleDesignComplexity",
  globalDataComplexity: "globalDataComplexity",
  specifiedDataComplexity: "specifiedDataComplexity",
  peakLiveVariables: "peakLiveVariables",
  variableSpan: "variableSpan",
  abcScore: "abcScore",
  scopeDepthWeightedLoc: "scopeDepthWeightedLoc",
  scopeDepthRatio: "scopeDepthRatio",
  halsteadVolume: "halsteadVolume",
  halsteadDifficulty: "halsteadDifficulty",
  halsteadEffort: "halsteadEffort",
  maintainabilityIndex: "maintainabilityIndex",
} as const;

export type MetricKey = (typeof MetricKeys)[keyof typeof MetricKeys];

export class MetricRegistry {
  private readonly metrics = new Map<string, MetricDefinition>();
  private executionOrder: MetricDefinition[] | null = null;

  register(definition: MetricDefinition): void {
    if (this.metrics.has(definition.key)) {
      throw new Error(`Metric "${definition.key}" is already registered.`);
    }
    this.metrics.set(definition.key, definition);
    this.executionOrder = null;
  }

  get(key: string): MetricDefinition | undefined {
    return this.metrics.get(key);
  }

  getAll(): MetricDefinition[] {
    return Array.from(this.metrics.values());
  }

  validate(): void {
    for (const metric of this.metrics.values()) {
      assertThresholdConsistency(metric);
      assertDependenciesExist(metric, this.metrics);
    }
    this.executionOrder = this.topologicalSort();
  }

  getExecutionOrder(): MetricDefinition[] {
    if (this.executionOrder === null) {
      throw new Error("Registry has not been validated. Call validate() first.");
    }
    return this.executionOrder;
  }

  private topologicalSort(): MetricDefinition[] {
    const sorted: MetricDefinition[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (key: string): void => {
      if (visited.has(key)) return;
      if (visiting.has(key)) {
        throw new Error(`Circular dependency detected involving "${key}".`);
      }
      visiting.add(key);
      const metric = this.metrics.get(key);
      // Guarded by assertDependenciesExist before sort is called.
      if (metric === undefined) {
        throw new Error(`Metric "${key}" is not registered.`);
      }
      for (const dep of metric.dependencies) {
        visit(dep);
      }
      visiting.delete(key);
      visited.add(key);
      sorted.push(metric);
    };

    for (const key of this.metrics.keys()) {
      visit(key);
    }
    return sorted;
  }
}

function assertThresholdConsistency(metric: MetricDefinition): void {
  const { warn, error } = metric.defaultThresholds;
  if (metric.direction === "higher-is-worse" && warn >= error) {
    throw new Error(
      `Threshold error for "${metric.key}": higher-is-worse metrics must have warn < error (got warn=${warn}, error=${error}).`,
    );
  }
  if (metric.direction === "lower-is-worse" && warn <= error) {
    throw new Error(
      `Threshold error for "${metric.key}": lower-is-worse metrics must have warn > error (got warn=${warn}, error=${error}).`,
    );
  }
}

function assertDependenciesExist(
  metric: MetricDefinition,
  metrics: Map<string, MetricDefinition>,
): void {
  for (const dep of metric.dependencies) {
    if (!metrics.has(dep)) {
      throw new Error(
        `Metric "${metric.key}" depends on "${dep}" which is not registered.`,
      );
    }
  }
}
