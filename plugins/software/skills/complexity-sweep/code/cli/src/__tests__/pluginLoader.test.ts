import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MetricRegistry } from "static-analysis-core";
import { describe, expect, it } from "vitest";

import { loadPlugins } from "../pluginLoader";

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("loadPlugins (smoke)", () => {
  it("loads a valid plugin exported via CommonJS default", async () => {
    const dir = makeTempDir("esa-plugin-ok-");
    writeFileSync(
      join(dir, "my-plugin.cjs"),
      `const def = {
  key: "lineOfFunction",
  name: "Line Of Function",
  shortCode: "LoF",
  description: "Line number where the function is declared.",
  defaultThresholds: { warn: 50, error: 100 },
  direction: "higher-is-worse",
  dependencies: [],
  compute: () => 1,
};
module.exports = def;
module.exports.default = def;
`,
    );

    const registry = new MetricRegistry();
    await loadPlugins(["./my-plugin.cjs"], registry, dir);

    const loaded = registry.get("lineOfFunction");
    expect(loaded?.key).toBe("lineOfFunction");
    expect(loaded?.shortCode).toBe("LoF");
    expect(loaded?.direction).toBe("higher-is-worse");
  });

  it("loads an array of definitions from default export (ESM)", async () => {
    const dir = makeTempDir("esa-plugin-arr-");
    writeFileSync(
      join(dir, "arr.mjs"),
      `const a = {
  key: "alpha", name: "Alpha", shortCode: "A",
  description: "", defaultThresholds: { warn: 1, error: 2 },
  direction: "higher-is-worse", dependencies: [], compute: () => 0,
};
const b = {
  key: "beta", name: "Beta", shortCode: "B",
  description: "", defaultThresholds: { warn: 1, error: 2 },
  direction: "higher-is-worse", dependencies: [], compute: () => 0,
};
export default [a, b];
`,
    );
    const registry = new MetricRegistry();
    await loadPlugins(["./arr.mjs"], registry, dir);
    expect(registry.get("alpha")?.key).toBe("alpha");
    expect(registry.get("beta")?.key).toBe("beta");
  });

  it("skips invalid definitions without registering them", async () => {
    const dir = makeTempDir("esa-plugin-bad-");
    writeFileSync(
      join(dir, "bad.cjs"),
      `module.exports = { default: { /* no key, no compute */ } };\n`,
    );

    const registry = new MetricRegistry();
    // Swallow the warning so the test output stays clean.
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      await loadPlugins(["./bad.cjs"], registry, dir);
    } finally {
      console.warn = originalWarn;
    }
    expect(registry.getAll()).toHaveLength(0);
  });
});
