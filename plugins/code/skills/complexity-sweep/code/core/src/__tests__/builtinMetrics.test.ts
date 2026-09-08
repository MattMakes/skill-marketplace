import { describe, expect, it } from "vitest";

import {
  createDefaultRegistry,
  registerBuiltinMetrics,
} from "../builtinMetrics";
import { MetricKeys, MetricRegistry } from "../registry";

const ALL_KEYS = Object.values(MetricKeys);

describe("registerBuiltinMetrics", () => {
  it("registers all 14 built-in metric keys", () => {
    const registry = new MetricRegistry();
    registerBuiltinMetrics(registry);

    const registered = registry.getAll().map((m) => m.key);
    expect(registered).toHaveLength(14);
    for (const key of ALL_KEYS) {
      expect(registered).toContain(key);
    }
  });

  it("preserves the documented registration order", () => {
    const registry = new MetricRegistry();
    registerBuiltinMetrics(registry);
    const keys = registry.getAll().map((m) => m.key);
    expect(keys).toEqual([
      MetricKeys.cyclomaticComplexity,
      MetricKeys.essentialComplexity,
      MetricKeys.moduleDesignComplexity,
      MetricKeys.globalDataComplexity,
      MetricKeys.specifiedDataComplexity,
      MetricKeys.peakLiveVariables,
      MetricKeys.variableSpan,
      MetricKeys.abcScore,
      MetricKeys.scopeDepthWeightedLoc,
      MetricKeys.scopeDepthRatio,
      MetricKeys.halsteadVolume,
      MetricKeys.halsteadDifficulty,
      MetricKeys.halsteadEffort,
      MetricKeys.maintainabilityIndex,
    ]);
  });

  it("does not call validate on its own", () => {
    const registry = new MetricRegistry();
    registerBuiltinMetrics(registry);
    // getExecutionOrder throws if validate() was not called.
    expect(() => registry.getExecutionOrder()).toThrow(/validate/i);
  });

  it("validates cleanly and topologically sorts MI after its dependencies", () => {
    const registry = new MetricRegistry();
    registerBuiltinMetrics(registry);
    expect(() => registry.validate()).not.toThrow();

    const order = registry.getExecutionOrder();
    const indexOf = (key: string) =>
      order.findIndex((m) => m.key === key);

    const miIndex = indexOf(MetricKeys.maintainabilityIndex);
    const hvIndex = indexOf(MetricKeys.halsteadVolume);
    const ccIndex = indexOf(MetricKeys.cyclomaticComplexity);

    expect(miIndex).toBeGreaterThan(hvIndex);
    expect(miIndex).toBeGreaterThan(ccIndex);
    // MI is last among builtins — no other builtin depends on it.
    expect(miIndex).toBe(order.length - 1);
  });
});

describe("createDefaultRegistry", () => {
  it("returns a validated registry with all 14 builtins", () => {
    const registry = createDefaultRegistry();
    expect(registry.getAll()).toHaveLength(14);
    const order = registry.getExecutionOrder();
    expect(order).toHaveLength(14);
  });

  it("is independent across calls", () => {
    const a = createDefaultRegistry();
    const b = createDefaultRegistry();
    expect(a).not.toBe(b);
    expect(a.getAll()).toHaveLength(14);
    expect(b.getAll()).toHaveLength(14);
  });
});
