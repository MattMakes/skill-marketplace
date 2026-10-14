"use strict";
// Python backend wiring. Contract file: do not rename the imported symbols.
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonBackend = void 0;
const registry_1 = require("../../registry");
const extract_1 = require("./extract");
const controlFlow_1 = require("./controlFlow");
const dataFlow_1 = require("./dataFlow");
const operations_1 = require("./operations");
exports.pythonBackend = {
    id: "python",
    extensions: [".py"],
    extractFunctions: extract_1.extractPythonFunctions,
    metrics: {
        [registry_1.MetricKeys.cyclomaticComplexity]: controlFlow_1.pythonCyclomaticComplexity,
        [registry_1.MetricKeys.essentialComplexity]: controlFlow_1.pythonEssentialComplexity,
        [registry_1.MetricKeys.moduleDesignComplexity]: controlFlow_1.pythonModuleDesignComplexity,
        [registry_1.MetricKeys.globalDataComplexity]: dataFlow_1.pythonGlobalDataComplexity,
        [registry_1.MetricKeys.specifiedDataComplexity]: dataFlow_1.pythonSpecifiedDataComplexity,
        [registry_1.MetricKeys.peakLiveVariables]: dataFlow_1.pythonPeakLiveVariables,
        [registry_1.MetricKeys.variableSpan]: dataFlow_1.pythonVariableSpan,
        [registry_1.MetricKeys.abcScore]: operations_1.pythonAbcScore,
        [registry_1.MetricKeys.scopeDepthWeightedLoc]: operations_1.pythonScopeDepthWeightedLoc,
        [registry_1.MetricKeys.scopeDepthRatio]: operations_1.pythonScopeDepthRatio,
        [registry_1.MetricKeys.halsteadVolume]: operations_1.pythonHalsteadVolume,
        [registry_1.MetricKeys.halsteadDifficulty]: operations_1.pythonHalsteadDifficulty,
        [registry_1.MetricKeys.halsteadEffort]: operations_1.pythonHalsteadEffort,
        [registry_1.MetricKeys.maintainabilityIndex]: operations_1.pythonMaintainabilityIndex,
    },
};
//# sourceMappingURL=index.js.map