// Rust backend wiring. Contract file: do not rename the imported symbols.

import { MetricKeys } from "../../registry";
import type { LanguageBackend } from "../types";
import { extractRustFunctions } from "./extract";
import {
  rustCyclomaticComplexity,
  rustEssentialComplexity,
  rustModuleDesignComplexity,
} from "./controlFlow";
import {
  rustGlobalDataComplexity,
  rustSpecifiedDataComplexity,
  rustPeakLiveVariables,
  rustVariableSpan,
} from "./dataFlow";
import {
  rustAbcScore,
  rustScopeDepthWeightedLoc,
  rustScopeDepthRatio,
  rustHalsteadVolume,
  rustHalsteadDifficulty,
  rustHalsteadEffort,
  rustMaintainabilityIndex,
} from "./operations";

export const rustBackend: LanguageBackend = {
  id: "rust",
  extensions: [".rs"],
  extractFunctions: extractRustFunctions,
  metrics: {
    [MetricKeys.cyclomaticComplexity]: rustCyclomaticComplexity,
    [MetricKeys.essentialComplexity]: rustEssentialComplexity,
    [MetricKeys.moduleDesignComplexity]: rustModuleDesignComplexity,
    [MetricKeys.globalDataComplexity]: rustGlobalDataComplexity,
    [MetricKeys.specifiedDataComplexity]: rustSpecifiedDataComplexity,
    [MetricKeys.peakLiveVariables]: rustPeakLiveVariables,
    [MetricKeys.variableSpan]: rustVariableSpan,
    [MetricKeys.abcScore]: rustAbcScore,
    [MetricKeys.scopeDepthWeightedLoc]: rustScopeDepthWeightedLoc,
    [MetricKeys.scopeDepthRatio]: rustScopeDepthRatio,
    [MetricKeys.halsteadVolume]: rustHalsteadVolume,
    [MetricKeys.halsteadDifficulty]: rustHalsteadDifficulty,
    [MetricKeys.halsteadEffort]: rustHalsteadEffort,
    [MetricKeys.maintainabilityIndex]: rustMaintainabilityIndex,
  },
};
