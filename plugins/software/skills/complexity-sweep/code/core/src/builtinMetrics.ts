import type { MetricRegistry } from "./registry";

import cyclomaticComplexityDefinition from "./metrics/cyclomaticComplexity";
import essentialComplexityDefinition from "./metrics/essentialComplexity";
import moduleDesignComplexityDefinition from "./metrics/moduleDesignComplexity";
import globalDataComplexityDefinition from "./metrics/globalDataComplexity";
import specifiedDataComplexityDefinition from "./metrics/specifiedDataComplexity";
import peakLiveVariablesDefinition from "./metrics/peakLiveVariables";
import variableSpanDefinition from "./metrics/variableSpan";
import abcScoreDefinition from "./metrics/abc";
import {
  scopeDepthWeightedLocDefinition,
  scopeDepthRatioDefinition,
} from "./metrics/scopeDepth";
import {
  halsteadVolumeDefinition,
  halsteadDifficultyDefinition,
  halsteadEffortDefinition,
} from "./metrics/halstead";
import { maintainabilityIndexDefinition } from "./metrics/maintainabilityIndex";

import { MetricRegistry as MetricRegistryImpl } from "./registry";

/**
 * Registers all 14 built-in metric definitions on the given registry in the
 * canonical registration order. Does NOT call `validate()` — callers mix in
 * their own plugins first, then validate once.
 *
 * The registration order matches the original package's observable behavior.
 * Topological sort ensures Maintainability Index runs after its deps
 * (Halstead Volume, Cyclomatic Complexity).
 */
export function registerBuiltinMetrics(registry: MetricRegistry): void {
  registry.register(cyclomaticComplexityDefinition);
  registry.register(essentialComplexityDefinition);
  registry.register(moduleDesignComplexityDefinition);
  registry.register(globalDataComplexityDefinition);
  registry.register(specifiedDataComplexityDefinition);
  registry.register(peakLiveVariablesDefinition);
  registry.register(variableSpanDefinition);
  registry.register(abcScoreDefinition);
  registry.register(scopeDepthWeightedLocDefinition);
  registry.register(scopeDepthRatioDefinition);
  registry.register(halsteadVolumeDefinition);
  registry.register(halsteadDifficultyDefinition);
  registry.register(halsteadEffortDefinition);
  registry.register(maintainabilityIndexDefinition);
}

/**
 * Convenience: fresh registry with all builtins registered and validated.
 */
export function createDefaultRegistry(): MetricRegistry {
  const registry = new MetricRegistryImpl();
  registerBuiltinMetrics(registry);
  registry.validate();
  return registry;
}

export {
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
};
