import { describe, expect, it } from "vitest";
import { MetricRegistry, type MetricDefinition } from "../registry";

type StubOverrides = Partial<MetricDefinition> & { key: string };

function stubMetric(overrides: StubOverrides): MetricDefinition {
  return {
    name: overrides.key,
    shortCode: overrides.key.slice(0, 3),
    description: "test metric",
    defaultThresholds: { warn: 5, error: 10 },
    direction: "higher-is-worse",
    dependencies: [],
    compute: () => 0,
    ...overrides,
  };
}

describe("MetricRegistry", () => {
  it("registers and retrieves a metric", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "testMetric" }));
    registry.validate();
    const metrics = registry.getExecutionOrder();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.key).toBe("testMetric");
  });

  it("rejects duplicate keys", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "dup" }));
    expect(() => registry.register(stubMetric({ key: "dup" }))).toThrow(
      /already registered/,
    );
  });

  it("topologically sorts metrics by dependencies", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "dependent", dependencies: ["base"] }));
    registry.register(stubMetric({ key: "base" }));
    registry.validate();
    const order = registry.getExecutionOrder();
    expect(order[0]?.key).toBe("base");
    expect(order[1]?.key).toBe("dependent");
  });

  it("detects circular dependencies", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "a", dependencies: ["b"] }));
    registry.register(stubMetric({ key: "b", dependencies: ["a"] }));
    expect(() => registry.validate()).toThrow(/[Cc]ircular/);
  });

  it("detects missing dependencies", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "child", dependencies: ["missing"] }));
    expect(() => registry.validate()).toThrow(
      /missing.*not registered|not registered.*missing/i,
    );
  });

  it("validates threshold consistency for higher-is-worse", () => {
    const registry = new MetricRegistry();
    registry.register(
      stubMetric({
        key: "bad",
        direction: "higher-is-worse",
        defaultThresholds: { warn: 10, error: 5 },
      }),
    );
    expect(() => registry.validate()).toThrow(/[Tt]hreshold/);
  });

  it("validates threshold consistency for lower-is-worse", () => {
    const registry = new MetricRegistry();
    registry.register(
      stubMetric({
        key: "bad",
        direction: "lower-is-worse",
        defaultThresholds: { warn: 5, error: 10 },
      }),
    );
    expect(() => registry.validate()).toThrow(/[Tt]hreshold/);
  });

  it("rejects equal warn and error for higher-is-worse", () => {
    const registry = new MetricRegistry();
    registry.register(
      stubMetric({
        key: "eq",
        direction: "higher-is-worse",
        defaultThresholds: { warn: 5, error: 5 },
      }),
    );
    expect(() => registry.validate()).toThrow(/[Tt]hreshold/);
  });

  it("rejects equal warn and error for lower-is-worse", () => {
    const registry = new MetricRegistry();
    registry.register(
      stubMetric({
        key: "eq",
        direction: "lower-is-worse",
        defaultThresholds: { warn: 5, error: 5 },
      }),
    );
    expect(() => registry.validate()).toThrow(/[Tt]hreshold/);
  });

  it("accepts valid lower-is-worse thresholds", () => {
    const registry = new MetricRegistry();
    registry.register(
      stubMetric({
        key: "mi",
        direction: "lower-is-worse",
        defaultThresholds: { warn: 60, error: 40 },
      }),
    );
    registry.validate();
    expect(registry.getExecutionOrder()).toHaveLength(1);
  });

  it("getAll returns all registered metrics", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "a" }));
    registry.register(stubMetric({ key: "b" }));
    expect(registry.getAll()).toHaveLength(2);
  });

  it("get returns a specific metric by key", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "target" }));
    registry.validate();
    expect(registry.get("target")?.key).toBe("target");
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("throws if getExecutionOrder called before validate", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "a" }));
    expect(() => registry.getExecutionOrder()).toThrow(/validate/i);
  });

  it("invalidates execution order cache when new metric is registered", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "a" }));
    registry.validate();
    expect(registry.getExecutionOrder()).toHaveLength(1);
    registry.register(stubMetric({ key: "b" }));
    expect(() => registry.getExecutionOrder()).toThrow(/validate/i);
    registry.validate();
    expect(registry.getExecutionOrder()).toHaveLength(2);
  });

  it("handles a diamond dependency graph", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "d", dependencies: ["b", "c"] }));
    registry.register(stubMetric({ key: "b", dependencies: ["a"] }));
    registry.register(stubMetric({ key: "c", dependencies: ["a"] }));
    registry.register(stubMetric({ key: "a" }));
    registry.validate();
    const order = registry.getExecutionOrder().map((m) => m.key);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
  });

  it("preserves registration order for independent metrics", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "first" }));
    registry.register(stubMetric({ key: "second" }));
    registry.register(stubMetric({ key: "third" }));
    registry.validate();
    const order = registry.getExecutionOrder().map((m) => m.key);
    expect(order).toEqual(["first", "second", "third"]);
  });

  it("detects self-referential cycles", () => {
    const registry = new MetricRegistry();
    registry.register(stubMetric({ key: "loop", dependencies: ["loop"] }));
    expect(() => registry.validate()).toThrow(/[Cc]ircular/);
  });
});
