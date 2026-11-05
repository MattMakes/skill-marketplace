import { describe, expect, it } from "vitest";
import moduleDesignComplexity from "../../metrics/moduleDesignComplexity";
import { createHarness } from "./testUtils";

function iv(source: string, name: string): number {
  const { getCtx } = createHarness(source);
  const value = moduleDesignComplexity.compute(getCtx(name));
  if (typeof value !== "number") throw new Error("expected number");
  return value;
}

describe("moduleDesignComplexity", () => {
  it("metadata", () => {
    expect(moduleDesignComplexity.key).toBe("moduleDesignComplexity");
    expect(moduleDesignComplexity.shortCode).toBe("iv(G)");
    expect(moduleDesignComplexity.direction).toBe("higher-is-worse");
  });

  it("returns 1 for empty function", () => {
    expect(iv("function foo(){}", "foo")).toBe(1);
  });

  it("returns 1 for branches without calls", () => {
    const src = `function foo(x: number){ if(x>0){ return 1; } return 0; }`;
    expect(iv(src, "foo")).toBe(1);
  });

  it("counts if with call in condition", () => {
    const src = `
      declare function isValid(x: number): boolean;
      function foo(x: number){ if(isValid(x)){ return 1; } return 0; }
    `;
    expect(iv(src, "foo")).toBe(2);
  });

  it("counts if with call in body", () => {
    const src = `
      declare function doSomething(): void;
      function foo(x: number){ if(x>0){ doSomething(); } }
    `;
    expect(iv(src, "foo")).toBe(2);
  });

  it("counts loop with call", () => {
    const src = `
      declare function process(n: number): void;
      function foo(items: number[]){ for(const item of items){ process(item); } }
    `;
    expect(iv(src, "foo")).toBe(2);
  });

  it("ignores nested functions", () => {
    const src = `
      declare function isValid(n: number): boolean;
      function outer(){
        const inner = () => { if(isValid(1)) return 1; return 0; };
        return inner;
      }
    `;
    expect(iv(src, "outer")).toBe(1);
  });

  it("counts branch whose body calls through an arrow (map is the CallExpression)", () => {
    const src = `
      function foo(arr: number[], x: number){
        if (x > 0) { arr.map(n => n + 1); }
      }
    `;
    expect(iv(src, "foo")).toBe(2);
  });
});
