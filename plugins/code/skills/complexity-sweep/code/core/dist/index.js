"use strict";
// Public API for static-analysis-core.
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintainabilityIndexDefinition = exports.halsteadEffortDefinition = exports.halsteadDifficultyDefinition = exports.halsteadVolumeDefinition = exports.scopeDepthRatioDefinition = exports.scopeDepthWeightedLocDefinition = exports.abcScoreDefinition = exports.variableSpanDefinition = exports.peakLiveVariablesDefinition = exports.specifiedDataComplexityDefinition = exports.globalDataComplexityDefinition = exports.moduleDesignComplexityDefinition = exports.essentialComplexityDefinition = exports.cyclomaticComplexityDefinition = exports.createDefaultRegistry = exports.registerBuiltinMetrics = exports.MetricKeys = exports.MetricRegistry = exports.createNodeCache = exports.endLineOf = exports.lineOf = exports.sameNode = exports.walkDescendants = exports.rustBackend = exports.pythonBackend = exports.parseSyntaxSource = exports.initSyntaxParsers = exports.TYPESCRIPT_EXTENSIONS = exports.SYNTAX_BACKENDS = exports.languageForPath = exports.getSyntaxBackend = exports.isSyntaxSourceInput = exports.analyzeProject = exports.analyzeSyntaxFile = exports.analyzeFile = void 0;
// Orchestration
var analyzeFile_1 = require("./analyzeFile");
Object.defineProperty(exports, "analyzeFile", { enumerable: true, get: function () { return analyzeFile_1.analyzeFile; } });
Object.defineProperty(exports, "analyzeSyntaxFile", { enumerable: true, get: function () { return analyzeFile_1.analyzeSyntaxFile; } });
var analyzeProject_1 = require("./analyzeProject");
Object.defineProperty(exports, "analyzeProject", { enumerable: true, get: function () { return analyzeProject_1.analyzeProject; } });
Object.defineProperty(exports, "isSyntaxSourceInput", { enumerable: true, get: function () { return analyzeProject_1.isSyntaxSourceInput; } });
// Languages (Python and Rust through web-tree-sitter)
var languages_1 = require("./languages");
Object.defineProperty(exports, "getSyntaxBackend", { enumerable: true, get: function () { return languages_1.getSyntaxBackend; } });
Object.defineProperty(exports, "languageForPath", { enumerable: true, get: function () { return languages_1.languageForPath; } });
Object.defineProperty(exports, "SYNTAX_BACKENDS", { enumerable: true, get: function () { return languages_1.SYNTAX_BACKENDS; } });
Object.defineProperty(exports, "TYPESCRIPT_EXTENSIONS", { enumerable: true, get: function () { return languages_1.TYPESCRIPT_EXTENSIONS; } });
var treeSitter_1 = require("./languages/treeSitter");
Object.defineProperty(exports, "initSyntaxParsers", { enumerable: true, get: function () { return treeSitter_1.initSyntaxParsers; } });
Object.defineProperty(exports, "parseSyntaxSource", { enumerable: true, get: function () { return treeSitter_1.parseSyntaxSource; } });
var python_1 = require("./languages/python");
Object.defineProperty(exports, "pythonBackend", { enumerable: true, get: function () { return python_1.pythonBackend; } });
var rust_1 = require("./languages/rust");
Object.defineProperty(exports, "rustBackend", { enumerable: true, get: function () { return rust_1.rustBackend; } });
var syntaxHelpers_1 = require("./languages/syntaxHelpers");
Object.defineProperty(exports, "walkDescendants", { enumerable: true, get: function () { return syntaxHelpers_1.walkDescendants; } });
Object.defineProperty(exports, "sameNode", { enumerable: true, get: function () { return syntaxHelpers_1.sameNode; } });
Object.defineProperty(exports, "lineOf", { enumerable: true, get: function () { return syntaxHelpers_1.lineOf; } });
Object.defineProperty(exports, "endLineOf", { enumerable: true, get: function () { return syntaxHelpers_1.endLineOf; } });
Object.defineProperty(exports, "createNodeCache", { enumerable: true, get: function () { return syntaxHelpers_1.createNodeCache; } });
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