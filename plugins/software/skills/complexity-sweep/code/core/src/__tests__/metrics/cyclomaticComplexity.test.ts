import { describe, expect, it } from "vitest";
import cyclomaticComplexity from "../../metrics/cyclomaticComplexity";
import { createHarness } from "./testUtils";

function cc(source: string, name: string, weights?: Parameters<
  typeof cyclomaticComplexity.compute
>[0]["options"]["weights"]): number {
  const { getCtx } = createHarness(source);
  const ctx = getCtx(name, weights ? { weights } : undefined);
  const value = cyclomaticComplexity.compute(ctx);
  if (typeof value !== "number") throw new Error("expected number");
  return value;
}

describe("cyclomaticComplexity", () => {
  it("metadata", () => {
    expect(cyclomaticComplexity.key).toBe("cyclomaticComplexity");
    expect(cyclomaticComplexity.shortCode).toBe("v(G)");
    expect(cyclomaticComplexity.defaultThresholds).toEqual({
      warn: 10,
      error: 20,
    });
    expect(cyclomaticComplexity.direction).toBe("higher-is-worse");
    expect(cyclomaticComplexity.dependencies).toEqual([]);
  });

  it("returns 1 for an empty function", () => {
    expect(cc("function empty() {}", "empty")).toBe(1);
  });

  it("counts if statements", () => {
    expect(
      cc("function foo(x: number){ if(x>0){return 1;} return 0; }", "foo"),
    ).toBe(2);
  });

  it("counts else-if as separate branch", () => {
    expect(
      cc(
        "function foo(x: number){ if(x>0){return 1;} else if(x<0){return -1;} else {return 0;} }",
        "foo",
      ),
    ).toBe(3);
  });

  it("counts loops (for, for-of, for-in, while, do-while)", () => {
    const src = `
      function foo(arr: any[], obj: any){
        for (let i=0;i<1;i++) {}
        for (const x of arr) {}
        for (const k in obj) {}
        while (false) {}
        do {} while (false);
      }
    `;
    expect(cc(src, "foo")).toBe(6);
  });

  it("counts switch cases but not default", () => {
    const src = `
      function foo(x: number){
        switch(x){
          case 1: return "one";
          case 2: return "two";
          default: return "other";
        }
      }
    `;
    expect(cc(src, "foo")).toBe(3);
  });

  it("counts catch", () => {
    const src = `function foo(){ try { doIt(); } catch(e) { log(e); } }`;
    expect(cc(src, "foo")).toBe(2);
  });

  it("counts logical operators", () => {
    const src = `function foo(a: any, b: any, c: any){ if (a && b || c ?? false) { doIt(); } }`;
    expect(cc(src, "foo")).toBe(5);
  });

  it("counts ternary", () => {
    expect(cc("function foo(x: number){ return x > 0 ? 1 : 0; }", "foo")).toBe(
      2,
    );
  });

  it("does not count nested arrow functions toward outer", () => {
    const src = `
      function outer(arr: number[]){
        const inner = (x: number) => { if(x>0) return x; return 0; };
        return arr.map(inner);
      }
    `;
    expect(cc(src, "outer")).toBe(1);
    expect(cc(src, "inner")).toBe(2);
  });

  it("supports custom weights", () => {
    const src = `function foo(x: number){ if(x>0) return 1; return 0; }`;
    expect(
      cc(src, "foo", { cyclomaticComplexity: { if: 3 } }),
    ).toBe(4);
  });
});
