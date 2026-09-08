"use strict";
// Public API for static-analysis-core.
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintainabilityIndexDefinition = exports.halsteadEffortDefinition = exports.halsteadDifficultyDefinition = exports.halsteadVolumeDefinition = exports.scopeDepthRatioDefinition = exports.scopeDepthWeightedLocDefinition = exports.abcScoreDefinition = exports.variableSpanDefinition = exports.peakLiveVariablesDefinition = exports.specifiedDataComplexityDefinition = exports.globalDataComplexityDefinition = exports.moduleDesignComplexityDefinition = exports.essentialComplexityDefinition = exports.cyclomaticComplexityDefinition = exports.createDefaultRegistry = exports.registerBuiltinMetrics = exports.MetricKeys = exports.MetricRegistry = exports.analyzeProject = exports.analyzeFile = void 0;
// Orchestration
var analyzeFile_1 = require("./analyzeFile");
Object.defineProperty(exports, "analyzeFile", { enumerable: true, get: function () { return analyzeFile_1.analyzeFile; } });
var analyzeProject_1 = require("./analyzeProject");
Object.defineProperty(exports, "analyzeProject", { enumerable: true, get: function () { return analyzeProject_1.analyzeProject; } });
// Registry + keys
var registry_1 = require("./registry");
Object.defineProperty(exports, "MetricRegistry", { enumerable: true, get: function () { return registry_1.MetricRegistry; } });
Object.defineProperty(exports, "MetricKeys", { enumerable: true, get: function () { return registry_1.MetricKeys; } });
// Builtin wiring + individual metric definitions (for cherry-picking)
var builtinMetrics_1 = require("./builtinMetrics");
Object.defineProperty(exports, "registerBuiltinMetrics", { enumerable: true, get: function () { return builtinMetrics_1.registerBuiltinMetrics; } });
Object.defineProperty(exports, "createDefaultRegistry", { enumerable: true, get: function () { return builtinMetrics_1.createDefaultRegistry; } });
Object.defineProperty(exports, "cyclomaticComplexityDefinition", { enumerable: true, get: function () { return builtinMetrics_1.cyclomaticComplexityDefinition; } });
Object.defineProperty(exports, "essentialComplexityDefinition", { enumerable: true, get: function () { return builtinMetrics_1.essentialComplexityDefinition; } });
Object.defineProperty(exports, "moduleDesignComplexityDefinition", { enumerable: true, get: function () { return builtinMetrics_1.moduleDesignComplexityDefinition; } });
Object.defineProperty(exports, "globalDataComplexityDefinition", { enumerable: true, get: function () { return builtinMetrics_1.globalDataComplexityDefinition; } });
Object.defineProperty(exports, "specifiedDataComplexityDefinition", { enumerable: true, get: function () { return builtinMetrics_1.specifiedDataComplexityDefinition; } });
Object.defineProperty(exports, "peakLiveVariablesDefinition", { enumerable: true, get: function () { return builtinMetrics_1.peakLiveVariablesDefinition; } });
Object.defineProperty(exports, "variableSpanDefinition", { enumerable: true, get: function () { return builtinMetrics_1.variableSpanDefinition; } });
Object.defineProperty(exports, "abcScoreDefinition", { enumerable: true, get: function () { return builtinMetrics_1.abcScoreDefinition; } });
Object.defineProperty(exports, "scopeDepthWeightedLocDefinition", { enumerable: true, get: function () { return builtinMetrics_1.scopeDepthWeightedLocDefinition; } });
Object.defineProperty(exports, "scopeDepthRatioDefinition", { enumerable: true, get: function () { return builtinMetrics_1.scopeDepthRatioDefinition; } });
Object.defineProperty(exports, "halsteadVolumeDefinition", { enumerable: true, get: function () { return builtinMetrics_1.halsteadVolumeDefinition; } });
Object.defineProperty(exports, "halsteadDifficultyDefinition", { enumerable: true, get: function () { return builtinMetrics_1.halsteadDifficultyDefinition; } });
Object.defineProperty(exports, "halsteadEffortDefinition", { enumerable: true, get: function () { return builtinMetrics_1.halsteadEffortDefinition; } });
Object.defineProperty(exports, "maintainabilityIndexDefinition", { enumerable: true, get: function () { return builtinMetrics_1.maintainabilityIndexDefinition; } });
//# sourceMappingURL=index.js.map