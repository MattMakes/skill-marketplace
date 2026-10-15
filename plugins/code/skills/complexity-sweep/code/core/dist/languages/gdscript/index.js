"use strict";
// GDScript backend wiring. Contract file: do not rename the imported symbols.
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdscriptBackend = void 0;
const registry_1 = require("../../registry");
const extract_1 = require("./extract");
const controlFlow_1 = require("./controlFlow");
const dataFlow_1 = require("./dataFlow");
const operations_1 = require("./operations");
exports.gdscriptBackend = {
    id: "gdscript",
    extensions: [".gd"],
    extractFunctions: extract_1.extractGdscriptFunctions,
    metrics: {
        [registry_1.MetricKeys.cyclomaticComplexity]: controlFlow_1.gdscriptCyclomaticComplexity,
        [registry_1.MetricKeys.essentialComplexity]: controlFlow_1.gdscriptEssentialComplexity,
        [registry_1.MetricKeys.moduleDesignComplexity]: controlFlow_1.gdscriptModuleDesignComplexity,
        [registry_1.MetricKeys.globalDataComplexity]: dataFlow_1.gdscriptGlobalDataComplexity,
        [registry_1.MetricKeys.specifiedDataComplexity]: dataFlow_1.gdscriptSpecifiedDataComplexity,
        [registry_1.MetricKeys.peakLiveVariables]: dataFlow_1.gdscriptPeakLiveVariables,
        [registry_1.MetricKeys.variableSpan]: dataFlow_1.gdscriptVariableSpan,
        [registry_1.MetricKeys.abcScore]: operations_1.gdscriptAbcScore,
        [registry_1.MetricKeys.scopeDepthWeightedLoc]: operations_1.gdscriptScopeDepthWeightedLoc,
        [registry_1.MetricKeys.scopeDepthRatio]: operations_1.gdscriptScopeDepthRatio,
        [registry_1.MetricKeys.halsteadVolume]: operations_1.gdscriptHalsteadVolume,
        [registry_1.MetricKeys.halsteadDifficulty]: operations_1.gdscriptHalsteadDifficulty,
        [registry_1.MetricKeys.halsteadEffort]: operations_1.gdscriptHalsteadEffort,
        [registry_1.MetricKeys.maintainabilityIndex]: operations_1.gdscriptMaintainabilityIndex,
    },
};
//# sourceMappingURL=index.js.map