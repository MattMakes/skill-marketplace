// Python backend wiring. Contract file: do not rename the imported symbols.

import { MetricKeys } from "../../registry";
import type { LanguageBackend } from "../types";
import { extractPythonFunctions } from "./extract";
import {
  pythonCyclomaticComplexity,
  pythonEssentialComplexity,
  pythonModuleDesignComplexity,
} from "./controlFlow";
import {
  pythonGlobalDataComplexity,
  pythonSpecifiedDataComplexity,
  pythonPeakLiveVariables,
  pythonVariableSpan,
} from "./dataFlow";
import {
  pythonAbcScore,
  pythonScopeDepthWeightedLoc,
  pythonScopeDepthRatio,
  pythonHalsteadVolume,
  pythonHalsteadDifficulty,
  pythonHalsteadEffort,
  pythonMaintainabilityIndex,
} from "./operations";

export const pythonBackend: LanguageBackend = {
  id: "python",
  extensions: [".py"],
  extractFunctions: extractPythonFunctions,
  metrics: {
    [MetricKeys.cyclomaticComplexity]: pythonCyclomaticComplexity,
    [MetricKeys.essentialComplexity]: pythonEssentialComplexity,
    [MetricKeys.moduleDesignComplexity]: pythonModuleDesignComplexity,
    [MetricKeys.globalDataComplexity]: pythonGlobalDataComplexity,
    [MetricKeys.specifiedDataComplexity]: pythonSpecifiedDataComplexity,
    [MetricKeys.peakLiveVariables]: pythonPeakLiveVariables,
    [MetricKeys.variableSpan]: pythonVariableSpan,
    [MetricKeys.abcScore]: pythonAbcScore,
    [MetricKeys.scopeDepthWeightedLoc]: pythonScopeDepthWeightedLoc,
    [MetricKeys.scopeDepthRatio]: pythonScopeDepthRatio,
    [MetricKeys.halsteadVolume]: pythonHalsteadVolume,
    [MetricKeys.halsteadDifficulty]: pythonHalsteadDifficulty,
    [MetricKeys.halsteadEffort]: pythonHalsteadEffort,
    [MetricKeys.maintainabilityIndex]: pythonMaintainabilityIndex,
  },
};
