"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricRegistry = exports.MetricKeys = void 0;
exports.MetricKeys = {
    cyclomaticComplexity: "cyclomaticComplexity",
    essentialComplexity: "essentialComplexity",
    moduleDesignComplexity: "moduleDesignComplexity",
    globalDataComplexity: "globalDataComplexity",
    specifiedDataComplexity: "specifiedDataComplexity",
    peakLiveVariables: "peakLiveVariables",
    variableSpan: "variableSpan",
    abcScore: "abcScore",
    scopeDepthWeightedLoc: "scopeDepthWeightedLoc",
    scopeDepthRatio: "scopeDepthRatio",
    halsteadVolume: "halsteadVolume",
    halsteadDifficulty: "halsteadDifficulty",
    halsteadEffort: "halsteadEffort",
    maintainabilityIndex: "maintainabilityIndex",
};
class MetricRegistry {
    metrics = new Map();
    executionOrder = null;
    register(definition) {
        if (this.metrics.has(definition.key)) {
            throw new Error(`Metric "${definition.key}" is already registered.`);
        }
        this.metrics.set(definition.key, definition);
        this.executionOrder = null;
    }
    get(key) {
        return this.metrics.get(key);
    }
    getAll() {
        return Array.from(this.metrics.values());
    }
    validate() {
        for (const metric of this.metrics.values()) {
            assertThresholdConsistency(metric);
            assertDependenciesExist(metric, this.metrics);
        }
        this.executionOrder = this.topologicalSort();
    }
    getExecutionOrder() {
        if (this.executionOrder === null) {
            throw new Error("Registry has not been validated. Call validate() first.");
        }
        return this.executionOrder;
    }
    topologicalSort() {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (key) => {
            if (visited.has(key))
                return;
            if (visiting.has(key)) {
                throw new Error(`Circular dependency detected involving "${key}".`);
            }
            visiting.add(key);
            const metric = this.metrics.get(key);
            // Guarded by assertDependenciesExist before sort is called.
            if (metric === undefined) {
                throw new Error(`Metric "${key}" is not registered.`);
            }
            for (const dep of metric.dependencies) {
                visit(dep);
            }
            visiting.delete(key);
            visited.add(key);
            sorted.push(metric);
        };
        for (const key of this.metrics.keys()) {
            visit(key);
        }
        return sorted;
    }
}
exports.MetricRegistry = MetricRegistry;
function assertThresholdConsistency(metric) {
    const { warn, error } = metric.defaultThresholds;
    if (metric.direction === "higher-is-worse" && warn >= error) {
        throw new Error(`Threshold error for "${metric.key}": higher-is-worse metrics must have warn < error (got warn=${warn}, error=${error}).`);
    }
    if (metric.direction === "lower-is-worse" && warn <= error) {
        throw new Error(`Threshold error for "${metric.key}": lower-is-worse metrics must have warn > error (got warn=${warn}, error=${error}).`);
    }
}
function assertDependenciesExist(metric, metrics) {
    for (const dep of metric.dependencies) {
        if (!metrics.has(dep)) {
            throw new Error(`Metric "${metric.key}" depends on "${dep}" which is not registered.`);
        }
    }
}
//# sourceMappingURL=registry.js.map