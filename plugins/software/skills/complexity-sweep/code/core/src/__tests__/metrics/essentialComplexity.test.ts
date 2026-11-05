import { describe, expect, it } from "vitest";
import essentialComplexity from "../../metrics/essentialComplexity";
import { createHarness } from "./testUtils";

function ev(source: string, name: string): number {
  const { getCtx } = createHarness(source);
  const value = essentialComplexity.compute(getCtx(name));
  if (typeof value !== "number") throw new Error("expected number");
  return value;
}

describe("essentialComplexity", () => {
  it("metadata", () => {
    expect(essentialComplexity.key).toBe("essentialComplexity");
    expect(essentialComplexity.shortCode).toBe("ev(G)");
    expect(essentialComplexity.defaultThresholds).toEqual({ warn: 4, error: 8 });
    expect(essentialComplexity.direction).toBe("higher-is-worse");
  });

  it("returns 1 for empty function", () => {
    expect(ev("function foo(){}", "foo")).toBe(1);
  });

  it("returns 1 for structured if/else with single exit", () => {
    const src = `function foo(x: number){ let r = 0; if(x>0){r=1;} else {r=0;} return r; }`;
    expect(ev(src, "foo")).toBe(1);
  });

  it("counts early returns", () => {
    const src = `function foo(x: number){ if(x<0) return -1; if(x===0) return 0; return 1; }`;
    expect(ev(src, "foo")).toBe(3);
  });

  it("counts continue statements", () => {
    const src = `function foo(arr: number[]){ for(const x of arr){ if(x<0) continue; process(x); } }`;
    expect(ev(src, "foo")).toBe(2);
  });

  it("counts labeled break", () => {
    const src = `
      function foo(){
        outer: for(let i=0;i<10;i++){
          for(let j=0;j<10;j++){
            if(i===j) break outer;
          }
        }
      }
    `;
    expect(ev(src, "foo")).toBe(2);
  });

  it("does not count unlabeled break in switch (only early return counts)", () => {
    const src = `function foo(x: number){ switch(x){ case 1: return "one"; default: return "other"; } }`;
    expect(ev(src, "foo")).toBe(2);
  });

  it("counts throw inside conditional", () => {
    const src = `function foo(x: number){ if(x<0) throw new Error("neg"); return x; }`;
    expect(ev(src, "foo")).toBe(2);
  });

  it("does not count throw at top level of function", () => {
    const src = `function foo(){ throw new Error("oops"); }`;
    expect(ev(src, "foo")).toBe(1);
  });

  it("does not count nested function internals", () => {
    const src = `
      function outer(){
        const inner = () => { if(true) return 1; return 0; };
        return inner();
      }
    `;
    expect(ev(src, "outer")).toBe(1);
  });
});
