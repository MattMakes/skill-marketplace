import { describe, expect, it } from "vitest";
import { createHarness } from "./testUtils";
import variableSpanDefinition, {
  computeVariableSpan,
} from "../../metrics/variableSpan";

function vspan(source: string, name: string): number {
  const { getCtx } = createHarness(source);
  return computeVariableSpan(getCtx(name));
}

describe("variableSpan", () => {
  it("returns 0 for a function with no variables", () => {
    expect(vspan("function f() { return 1; }", "f")).toBe(0);
  });

  it("returns 0 for unused variables", () => {
    expect(vspan("function f() {\n  const x = 1;\n}", "f")).toBe(0);
  });

  it("computes span for a single variable", () => {
    const src = `function f() {
  const a = 1;


  use(a);
}`;
    // a: defLine 2, lastUseLine 5 → span 3.
    expect(vspan(src, "f")).toBe(3);
  });

  it("returns the max span across all variables", () => {
    const src = `function f() {
  const a = 1;
  const b = 2;
  use(b);


  use(a);
}`;
    // a: 2→7 (span 5); b: 3→4 (span 1).
    expect(vspan(src, "f")).toBe(5);
  });

  it("handles parameters", () => {
    const src = `function f(x: number) {


  return use(x);
}`;
    // x: defLine 1 (param at function signature), lastUse on line 4 → span 3.
    expect(vspan(src, "f")).toBe(3);
  });

  it("handles destructured bindings with different last-use lines", () => {
    const src = `function f(obj: any) {
  const { a, b, c } = obj;
  use(a);



  use(c);
}`;
    // a/b/c all def 2. a used line 3 (span 1); c used line 7 (span 5); b unused (0).
    expect(vspan(src, "f")).toBe(5);
  });

  it("handles variables used on the same line as their definition", () => {
    const src = `function f() {
  const x = getValue();
  use(x);
}`;
    // x: def 2, last-use 3 → span 1.
    expect(vspan(src, "f")).toBe(1);
  });

  it("handles closures (lexical position of reference)", () => {
    const src = `function f() {
  const x = 1;
  const fn = () => x;


  fn();
}`;
    // x: def 2, lastUse 3 inside arrow → span 1. fn: def 3, last-use 6 → span 3.
    expect(vspan(src, "f")).toBe(3);
  });

  it("does not count nested function variables in the parent span", () => {
    const src = `function outer() {
  const x = 1;







  use(x);
}`;
    // x: def 2, last-use 10 → span 8 (nested fn would contribute less).
    expect(vspan(src, "outer")).toBe(8);
  });

  it("handles multiple variables all with span 0", () => {
    const src = `function f() {
  const a = 1;
  const b = 2;
  const c = 3;
}`;
    expect(vspan(src, "f")).toBe(0);
  });

  it("exposes metric metadata", () => {
    expect(variableSpanDefinition.key).toBe("variableSpan");
    expect(variableSpanDefinition.shortCode).toBe("VSpan");
    expect(variableSpanDefinition.direction).toBe("higher-is-worse");
    expect(variableSpanDefinition.defaultThresholds).toEqual({
      warn: 20,
      error: 35,
    });
    expect(variableSpanDefinition.dependencies).toEqual([]);
  });

  it("compute() returns a plain number", () => {
    const { getCtx } = createHarness("function f() { return 1; }");
    const result = variableSpanDefinition.compute(getCtx("f"));
    expect(typeof result).toBe("number");
  });
});
