import { describe, expect, it } from "vitest";
import specifiedDataComplexity from "../../metrics/specifiedDataComplexity";
import { createHarness } from "./testUtils";

function sdv(source: string, name: string): number {
  const { getCtx } = createHarness(source);
  const value = specifiedDataComplexity.compute(getCtx(name));
  if (typeof value !== "number") throw new Error("expected number");
  return value;
}

describe("specifiedDataComplexity", () => {
  it("metadata", () => {
    expect(specifiedDataComplexity.key).toBe("specifiedDataComplexity");
    expect(specifiedDataComplexity.shortCode).toBe("sdv(G)");
    expect(specifiedDataComplexity.direction).toBe("higher-is-worse");
  });

  it("returns 0 when function has no parameters", () => {
    expect(sdv("function foo(){ return 1; }", "foo")).toBe(0);
  });

  it("returns 0 when params do not influence control flow", () => {
    expect(sdv("function foo(x: number){ return x+1; }", "foo")).toBe(0);
  });

  it("counts a param used in an if condition", () => {
    expect(
      sdv("function foo(x: number){ if(x>0) return 1; return 0; }", "foo"),
    ).toBe(1);
  });

  it("counts multiple influencing params, ignores unused ones", () => {
    const src = `
      function foo(x: number, y: number, z: number){
        if(x>0){}
        while(z){ break; }
        return y;
      }
    `;
    expect(sdv(src, "foo")).toBe(2);
  });

  it("counts param used in a ternary", () => {
    expect(
      sdv("function foo(flag: boolean){ return flag ? 1 : 0; }", "foo"),
    ).toBe(1);
  });

  it("counts param used as switch discriminant", () => {
    const src = `
      function foo(action: string){
        switch(action){ case "start": return 1; default: return 0; }
      }
    `;
    expect(sdv(src, "foo")).toBe(1);
  });

  it("counts param used in a for-loop condition", () => {
    const src = `function foo(limit: number){ for(let i=0;i<limit;i++){} }`;
    expect(sdv(src, "foo")).toBe(1);
  });

  it("handles destructured params", () => {
    const src = `function foo({ enabled }: { enabled: boolean }){ if(enabled) return 1; return 0; }`;
    expect(sdv(src, "foo")).toBe(1);
  });

  // LATENT BUG FIX — the original metric used `return false` from the
  // forEachDescendant callback to (not) skip nested function descendants.
  // `return false` does not prune traversal in ts-morph, so params used
  // only inside a nested function would incorrectly count. The fix uses
  // `traversal.skip()` — this test proves nested-function references
  // are not counted.
  it("does NOT count a param used only inside a nested function (bug fix)", () => {
    const src = `
      function outer(x: number){
        const inner = () => { if(x > 0) return 1; return 0; };
        return inner;
      }
    `;
    expect(sdv(src, "outer")).toBe(0);
  });

  it("counts param used in outer condition even when also used in nested fn", () => {
    const src = `
      function outer(x: number){
        if (x > 0) {
          const inner = (y: number) => { if(x > y) return 1; return 0; };
          return inner(0);
        }
        return 0;
      }
    `;
    expect(sdv(src, "outer")).toBe(1);
  });
});
