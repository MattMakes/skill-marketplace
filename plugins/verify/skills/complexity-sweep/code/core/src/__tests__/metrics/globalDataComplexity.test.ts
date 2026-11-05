import { describe, expect, it } from "vitest";
import globalDataComplexity from "../../metrics/globalDataComplexity";
import { createHarness } from "./testUtils";

function gdv(source: string, name: string): number {
  const { getCtx } = createHarness(source);
  const value = globalDataComplexity.compute(getCtx(name));
  if (typeof value !== "number") throw new Error("expected number");
  return value;
}

describe("globalDataComplexity", () => {
  it("metadata", () => {
    expect(globalDataComplexity.key).toBe("globalDataComplexity");
    expect(globalDataComplexity.shortCode).toBe("gdv(G)");
    expect(globalDataComplexity.defaultThresholds).toEqual({ warn: 3, error: 6 });
  });

  it("returns 0 when there are no global refs", () => {
    expect(gdv("function foo(x: number){ return x+1; }", "foo")).toBe(0);
  });

  it("counts let variables referenced in the function", () => {
    const src = `
      let counter = 0;
      let label = "hello";
      function foo(){ counter++; return label; }
    `;
    expect(gdv(src, "foo")).toBe(2);
  });

  it("counts var variables", () => {
    const src = `
      var state = "init";
      function foo(){ state = "running"; }
    `;
    expect(gdv(src, "foo")).toBe(1);
  });

  it("excludes const primitives", () => {
    const src = `
      const MAX = 100;
      function foo(){ return MAX; }
    `;
    expect(gdv(src, "foo")).toBe(0);
  });

  it("includes const objects and arrays (via initializer or type text)", () => {
    const src = `
      const config = { debug: true };
      const items: number[] = [];
      function foo(){ config.debug = false; items.push(1); }
    `;
    expect(gdv(src, "foo")).toBe(2);
  });

  it("counts distinct variables only once even when referenced many times", () => {
    const src = `
      let x = 0;
      function foo(){ x++; x++; x = x + 1; }
    `;
    expect(gdv(src, "foo")).toBe(1);
  });

  it("does not count nested-function references", () => {
    const src = `
      let x = 0;
      function outer(){ const inner = () => { x++; }; return inner; }
    `;
    expect(gdv(src, "outer")).toBe(0);
  });

  it("includes const typed with Record<...>", () => {
    const src = `
      const cache: Record<string, number> = {} as Record<string, number>;
      function foo(){ return cache; }
    `;
    expect(gdv(src, "foo")).toBe(1);
  });
});
