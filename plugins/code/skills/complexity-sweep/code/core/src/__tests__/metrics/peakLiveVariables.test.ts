import { describe, expect, it } from "vitest";
import { createHarness } from "./testUtils";
import peakLiveVariablesDefinition, {
  computePeakLiveVariables,
} from "../../metrics/peakLiveVariables";

function plv(source: string, name: string): number {
  const { getCtx } = createHarness(source);
  return computePeakLiveVariables(getCtx(name));
}

describe("peakLiveVariables", () => {
  it("returns 0 for a function with no variables", () => {
    expect(plv("function f() { return 1; }", "f")).toBe(0);
  });

  it("counts 2 live variables for a simple sequential case", () => {
    const src = `function f() {
  const a = 1;
  const b = 2;
  use(a);
  use(b);
}`;
    // a: defLine 2, lastUse 4; b: defLine 3, lastUse 5 → lines 3-4 overlap.
    expect(plv(src, "f")).toBe(2);
  });

  it("handles overlapping live ranges of three variables", () => {
    const src = `function f() {
  const a = 1;
  const b = 2;
  const c = 3;
  use(a, b, c);
}`;
    expect(plv(src, "f")).toBe(3);
  });

  it("handles non-overlapping (sequential) variables", () => {
    const src = `function f() {
  const a = 1;
  use(a);
  const b = 2;
  use(b);
}`;
    // a: 2-3, b: 4-5 — never simultaneous.
    expect(plv(src, "f")).toBe(1);
  });

  it("handles parameters as live variables", () => {
    const src = `function f(x: number, y: string) {
  use(x);
  use(y);
}`;
    // Both params live at line 1; x used line 2, y used line 3.
    expect(plv(src, "f")).toBe(2);
  });

  it("handles destructured bindings as separate live variables", () => {
    const src = `function f(obj: any) {
  const { a, b, c } = obj;
  use(a);
  use(b);
  use(c);
}`;
    // obj param live 1..5, {a,b,c} all defined line 2. Peak on line 2 = 4.
    expect(plv(src, "f")).toBe(4);
  });

  it("handles unused variables (only live on def line)", () => {
    const src = `function f() {
  const x = 1;
  const y = 2;
}`;
    // x def line 2 (lastUse=2), y def line 3 (lastUse=3) → no overlap.
    expect(plv(src, "f")).toBe(1);
  });

  it("handles five overlapping variables (high peak)", () => {
    const src = `function f() {
  const a = 1;
  const b = 2;
  const c = 3;
  const d = 4;
  const e = 5;
  use(a, b, c, d, e);
}`;
    expect(plv(src, "f")).toBe(5);
  });

  it("does not count variables from nested functions", () => {
    const src = `function outer() {
  const x = 1;
  function inner() {
    const y = 2;
    use(y);
  }
  use(x);
}`;
    // x is the only declared binding in `outer`; y belongs to `inner`.
    expect(plv(src, "outer")).toBe(1);
  });

  it("handles loop variables scoped to loop body", () => {
    const src = `function f() {
  const items = [1, 2, 3];
  for (const item of items) {
    use(item);
  }
}`;
    // items live lines 2-3 (used in for header); item live line 3.
    expect(plv(src, "f")).toBeGreaterThanOrEqual(2);
  });

  it("extends outer-variable life via closure reference", () => {
    const src = `function outer() {
  const x = 1;
  const cb = () => use(x);
  cb();
  cb();
}`;
    // x last-use extended into arrow on line 3; cb live 3..5 → peak includes x & cb overlap.
    const value = plv(src, "outer");
    expect(value).toBeGreaterThanOrEqual(2);
  });

  it("exposes metric metadata", () => {
    expect(peakLiveVariablesDefinition.key).toBe("peakLiveVariables");
    expect(peakLiveVariablesDefinition.shortCode).toBe("PLV");
    expect(peakLiveVariablesDefinition.direction).toBe("higher-is-worse");
    expect(peakLiveVariablesDefinition.defaultThresholds).toEqual({
      warn: 7,
      error: 10,
    });
    expect(peakLiveVariablesDefinition.dependencies).toEqual([]);
  });

  it("invokes via compute()", () => {
    const { getCtx } = createHarness("function f() { const a=1; use(a); }");
    const result = peakLiveVariablesDefinition.compute(getCtx("f"));
    expect(typeof result).toBe("number");
  });
});
