"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintainabilityIndexDefinition = exports.halsteadEffortDefinition = exports.halsteadDifficultyDefinition = exports.halsteadVolumeDefinition = exports.scopeDepthRatioDefinition = exports.scopeDepthWeightedLocDefinition = exports.abcScoreDefinition = exports.variableSpanDefinition = exports.peakLiveVariablesDefinition = exports.specifiedDataComplexityDefinition = exports.globalDataComplexityDefinition = exports.moduleDesignComplexityDefinition = exports.essentialComplexityDefinition = exports.cyclomaticComplexityDefinition = void 0;
exports.registerBuiltinMetrics = registerBuiltinMetrics;
exports.createDefaultRegistry = createDefaultRegistry;
const cyclomaticComplexity_1 = __importDefault(require("./metrics/cyclomaticComplexity"));
exports.cyclomaticComplexityDefinition = cyclomaticComplexity_1.default;
const essentialComplexity_1 = __importDefault(require("./metrics/essentialComplexity"));
exports.essentialComplexityDefinition = essentialComplexity_1.default;
const moduleDesignComplexity_1 = __importDefault(require("./metrics/moduleDesignComplexity"));
exports.moduleDesignComplexityDefinition = moduleDesignComplexity_1.default;
const globalDataComplexity_1 = __importDefault(require("./metrics/globalDataComplexity"));
exports.globalDataComplexityDefinition = globalDataComplexity_1.default;
const specifiedDataComplexity_1 = __importDefault(require("./metrics/specifiedDataComplexity"));
exports.specifiedDataComplexityDefinition = specifiedDataComplexity_1.default;
const peakLiveVariables_1 = __importDefault(require("./metrics/peakLiveVariables"));
exports.peakLiveVariablesDefinition = peakLiveVariables_1.default;
const variableSpan_1 = __importDefault(require("./metrics/variableSpan"));
exports.variableSpanDefinition = variableSpan_1.default;
const abc_1 = __importDefault(require("./metrics/abc"));
exports.abcScoreDefinition = abc_1.default;
const scopeDepth_1 = require("./metrics/scopeDepth");
Object.defineProperty(exports, "scopeDepthWeightedLocDefinition", { enumerable: true, get: function () { return scopeDepth_1.scopeDepthWeightedLocDefinition; } });
Object.defineProperty(exports, "scopeDepthRatioDefinition", { enumerable: true, get: function () { return scopeDepth_1.scopeDepthRatioDefinition; } });
const halstead_1 = require("./metrics/halstead");
Object.defineProperty(exports, "halsteadVolumeDefinition", { enumerable: true, get: function () { return halstead_1.halsteadVolumeDefinition; } });
Object.defineProperty(exports, "halsteadDifficultyDefinition", { enumerable: true, get: function () { return halstead_1.halsteadDifficultyDefinition; } });
Object.defineProperty(exports, "halsteadEffortDefinition", { enumerable: true, get: function () { return halstead_1.halsteadEffortDefinition; } });
const maintainabilityIndex_1 = require("./metrics/maintainabilityIndex");
Object.defineProperty(exports, "maintainabilityIndexDefinition", { enumerable: true, get: function () { return maintainabilityIndex_1.maintainabilityIndexDefinition; } });
const registry_1 = require("./registry");
/**
 * Registers all 14 built-in metric definitions on the given registry in the
 * canonical registration order. Does NOT call `validate()` — callers mix in
 * their own plugins first, then validate once.
 *
 * The registration order matches the original package's observable behavior.
 * Topological sort ensures Maintainability Index runs after its deps
 * (Halstead Volume, Cyclomatic Complexity).
 */
function registerBuiltinMetrics(registry) {
    registry.register(cyclomaticComplexity_1.default);
    registry.register(essentialComplexity_1.default);
    registry.register(moduleDesignComplexity_1.default);
    registry.register(globalDataComplexity_1.default);
    registry.register(specifiedDataComplexity_1.default);
    registry.register(peakLiveVariables_1.default);
    registry.register(variableSpan_1.default);
    registry.register(abc_1.default);
    registry.register(scopeDepth_1.scopeDepthWeightedLocDefinition);
    registry.register(scopeDepth_1.scopeDepthRatioDefinition);
    registry.register(halstead_1.halsteadVolumeDefinition);
    registry.register(halstead_1.halsteadDifficultyDefinition);
    registry.register(halstead_1.halsteadEffortDefinition);
    registry.register(maintainabilityIndex_1.maintainabilityIndexDefinition);
}
/**
 * Convenience: fresh registry with all builtins registered and validated.
 */
function createDefaultRegistry() {
    const registry = new registry_1.MetricRegistry();
    registerBuiltinMetrics(registry);
    registry.validate();
    return registry;
}
//# sourceMappingURL=builtinMetrics.js.map