import type { FunctionMetrics } from "static-analysis-core";
import { describe, expect, it } from "vitest";

import type { ThresholdsConfig } from "../config";
import { checkThresholds } from "../thresholds";

const thresholds: ThresholdsConfig = {
  cyclomaticComplexity: { warn: 5, error: 10 },
  essentialComplexity: { warn: 3, error: 6 },
  moduleDesignComplexity: { warn: 5, error: 10 },
  globalDataComplexity: { warn: 2, error: 4 },
  specifiedDataComplexity: { warn: 3, error: 6 },
};

/** Build a function fixture where metric values live directly on the object
 *  (matches the shipped test-fixture shape). `checkThresholds` falls back to
 *  top-level fields when `fn.metrics[key]` is undefined.                      */
function fn(values: Record<string, number>): FunctionMetrics {
  return {
    name: "foo",
    filePath: "test.ts",
    line: 1,
    metrics: {},
    ...values,
  } as unknown as FunctionMetrics;
}

describe("checkThresholds", () => {
  it("returns no violations for low-complexity function", () => {
    const f = fn({
      cyclomaticComplexity: 2,
      essentialComplexity: 1,
      moduleDesignComplexity: 1,
      globalDataComplexity: 0,
      specifiedDataComplexity: 0,
    });
    expect(checkThresholds([f], thresholds)).toHaveLength(0);
  });

  it("returns warning when warn threshold exceeded", () => {
    const f = fn({
      cyclomaticComplexity: 7,
      essentialComplexity: 1,
      moduleDesignComplexity: 1,
      globalDataComplexity: 0,
      specifiedDataComplexity: 0,
    });
    const violations = checkThresholds([f], thresholds);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.severity).toBe("warn");
    expect(violations[0]?.metric).toBe("cyclomaticComplexity");
  });

  it("returns error when error threshold exceeded", () => {
    const f = fn({
      cyclomaticComplexity: 15,
      essentialComplexity: 1,
      moduleDesignComplexity: 1,
      globalDataComplexity: 0,
      specifiedDataComplexity: 0,
    });
    const violations = checkThresholds([f], thresholds);
    const cc = violations.find((v) => v.metric === "cyclomaticComplexity");
    expect(cc?.severity).toBe("error");
  });

  it("reports multiple metrics violated", () => {
    const f = fn({
      cyclomaticComplexity: 7,
      essentialComplexity: 4,
      moduleDesignComplexity: 1,
      globalDataComplexity: 0,
      specifiedDataComplexity: 0,
    });
    const violations = checkThresholds([f], thresholds);
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });

  it("applies lower-is-worse comparison when lowerIsBad set", () => {
    const lowerThresholds: ThresholdsConfig = {
      maintainabilityIndex: { warn: 60, error: 40, lowerIsBad: true },
    };
    const warn = fn({ maintainabilityIndex: 55 });
    const err = fn({ maintainabilityIndex: 30 });
    const safe = fn({ maintainabilityIndex: 80 });
    expect(checkThresholds([warn], lowerThresholds)[0]?.severity).toBe("warn");
    expect(checkThresholds([err], lowerThresholds)[0]?.severity).toBe("error");
    expect(checkThresholds([safe], lowerThresholds)).toHaveLength(0);
  });

  it("reads values from fn.metrics when populated", () => {
    const f: FunctionMetrics = {
      name: "g",
      filePath: "x.ts",
      line: 3,
      metrics: { cyclomaticComplexity: 12 },
    };
    const violations = checkThresholds([f], thresholds);
    const cc = violations.find((v) => v.metric === "cyclomaticComplexity");
    expect(cc?.severity).toBe("error");
    expect(cc?.value).toBe(12);
    expect(cc?.functionName).toBe("g");
    expect(cc?.line).toBe(3);
  });
});
