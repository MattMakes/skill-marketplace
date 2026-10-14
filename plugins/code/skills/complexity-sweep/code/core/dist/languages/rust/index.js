"use strict";
// Rust backend wiring. Contract file: do not rename the imported symbols.
Object.defineProperty(exports, "__esModule", { value: true });
exports.rustBackend = void 0;
const registry_1 = require("../../registry");
const extract_1 = require("./extract");
const controlFlow_1 = require("./controlFlow");
const dataFlow_1 = require("./dataFlow");
const operations_1 = require("./operations");
exports.rustBackend = {
    id: "rust",
    extensions: [".rs"],
    extractFunctions: extract_1.extractRustFunctions,
    metrics: {
        [registry_1.MetricKeys.cyclomaticComplexity]: controlFlow_1.rustCyclomaticComplexity,
        [registry_1.MetricKeys.essentialComplexity]: controlFlow_1.rustEssentialComplexity,
        [registry_1.MetricKeys.moduleDesignComplexity]: controlFlow_1.rustModuleDesignComplexity,
        [registry_1.MetricKeys.globalDataComplexity]: dataFlow_1.rustGlobalDataComplexity,
        [registry_1.MetricKeys.specifiedDataComplexity]: dataFlow_1.rustSpecifiedDataComplexity,
        [registry_1.MetricKeys.peakLiveVariables]: dataFlow_1.rustPeakLiveVariables,
        [registry_1.MetricKeys.variableSpan]: dataFlow_1.rustVariableSpan,
        [registry_1.MetricKeys.abcScore]: operations_1.rustAbcScore,
        [registry_1.MetricKeys.scopeDepthWeightedLoc]: operations_1.rustScopeDepthWeightedLoc,
        [registry_1.MetricKeys.scopeDepthRatio]: operations_1.rustScopeDepthRatio,
        [registry_1.MetricKeys.halsteadVolume]: operations_1.rustHalsteadVolume,
        [registry_1.MetricKeys.halsteadDifficulty]: operations_1.rustHalsteadDifficulty,
        [registry_1.MetricKeys.halsteadEffort]: operations_1.rustHalsteadEffort,
        [registry_1.MetricKeys.maintainabilityIndex]: operations_1.rustMaintainabilityIndex,
    },
};
//# sourceMappingURL=index.js.map