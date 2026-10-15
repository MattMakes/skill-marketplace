// GDScript backend wiring. Contract file: do not rename the imported symbols.

import { MetricKeys } from "../../registry";
import type { LanguageBackend } from "../types";
import { extractGdscriptFunctions } from "./extract";
import {
  gdscriptCyclomaticComplexity,
  gdscriptEssentialComplexity,
  gdscriptModuleDesignComplexity,
} from "./controlFlow";
import {
  gdscriptGlobalDataComplexity,
  gdscriptSpecifiedDataComplexity,
  gdscriptPeakLiveVariables,
  gdscriptVariableSpan,
} from "./dataFlow";
import {
  gdscriptAbcScore,
  gdscriptScopeDepthWeightedLoc,
  gdscriptScopeDepthRatio,
  gdscriptHalsteadVolume,
  gdscriptHalsteadDifficulty,
  gdscriptHalsteadEffort,
  gdscriptMaintainabilityIndex,
} from "./operations";

export const gdscriptBackend: LanguageBackend = {
  id: "gdscript",
  extensions: [".gd"],
  extractFunctions: extractGdscriptFunctions,
  metrics: {
    [MetricKeys.cyclomaticComplexity]: gdscriptCyclomaticComplexity,
    [MetricKeys.essentialComplexity]: gdscriptEssentialComplexity,
    [MetricKeys.moduleDesignComplexity]: gdscriptModuleDesignComplexity,
    [MetricKeys.globalDataComplexity]: gdscriptGlobalDataComplexity,
    [MetricKeys.specifiedDataComplexity]: gdscriptSpecifiedDataComplexity,
    [MetricKeys.peakLiveVariables]: gdscriptPeakLiveVariables,
    [MetricKeys.variableSpan]: gdscriptVariableSpan,
    [MetricKeys.abcScore]: gdscriptAbcScore,
    [MetricKeys.scopeDepthWeightedLoc]: gdscriptScopeDepthWeightedLoc,
    [MetricKeys.scopeDepthRatio]: gdscriptScopeDepthRatio,
    [MetricKeys.halsteadVolume]: gdscriptHalsteadVolume,
    [MetricKeys.halsteadDifficulty]: gdscriptHalsteadDifficulty,
    [MetricKeys.halsteadEffort]: gdscriptHalsteadEffort,
    [MetricKeys.maintainabilityIndex]: gdscriptMaintainabilityIndex,
  },
};
