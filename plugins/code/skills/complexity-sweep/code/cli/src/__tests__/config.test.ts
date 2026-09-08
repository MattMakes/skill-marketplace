import { describe, expect, it } from "vitest";

import { resolveConfig } from "../config";

describe("resolveConfig", () => {
  it("returns defaults when no config provided", () => {
    const config = resolveConfig({});
    expect(config.thresholds.cyclomaticComplexity?.warn).toBe(10);
    expect(config.thresholds.cyclomaticComplexity?.error).toBe(20);
    expect(config.format).toBe("table");
    expect(config.thresholdAction).toBe("error");
  });

  it("merges partial config over defaults", () => {
    const config = resolveConfig({
      thresholds: { cyclomaticComplexity: { warn: 5, error: 15 } },
    });
    expect(config.thresholds.cyclomaticComplexity?.warn).toBe(5);
    // Non-overridden metric retains default (confirms per-metric replace).
    expect(config.thresholds.essentialComplexity?.warn).toBe(4);
  });

  it("respects CLI overrides", () => {
    const config = resolveConfig({}, { format: "json", thresholdAction: "warn" });
    expect(config.format).toBe("json");
    expect(config.thresholdAction).toBe("warn");
  });
});
