import { Project, type SourceFile } from "ts-morph";
import { describe, expect, it } from "vitest";

import {
  collectHalsteadCounts,
  halsteadVolumeDefinition,
  halsteadDifficultyDefinition,
  halsteadEffortDefinition,
  type HalsteadCounts,
} from "../../metrics/halstead";
import type { MetricComputeContext, MetricResult } from "../../registry";
import type { FunctionLike } from "../../types";
import { extractFunctions } from "../../utils/astHelpers";

// --- Test harness ----------------------------------------------------------

function createSourceFile(code: string): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile("test.ts", code);
}

function getFn(sf: SourceFile, name: string): FunctionLike {
  const fn = extractFunctions(sf).find((f) => f.name === name);
  if (!fn) throw new Error(`Function "${name}" not found in source`);
  return fn.node;
}

function countsFor(code: string, name: string): HalsteadCounts {
  const fn = getFn(createSourceFile(code), name);
  return collectHalsteadCounts(fn);
}

function ctxFor(code: string, name: string): MetricComputeContext {
  const sf = createSourceFile(code);
  return {
    node: getFn(sf, name),
    sourceFile: sf,
    options: {},
    dependencyValues: {},
  };
}

function asMetricResult(
  value: number | MetricResult<unknown>,
): MetricResult<{ n1: number; n2: number; N1: number; N2: number }> {
  if (typeof value === "number") {
    throw new Error("expected MetricResult with detail, got number");
  }
  return value as MetricResult<{ n1: number; n2: number; N1: number; N2: number }>;
}

// ===========================================================================
// collectHalsteadCounts
// ===========================================================================

describe("collectHalsteadCounts", () => {
  it("empty function → empty maps", () => {
    const c = countsFor("function empty() {}", "empty");
    expect(c.operators.size).toBe(0);
    expect(c.operands.size).toBe(0);
  });

  it("add(a,b) { return a + b; } → return=1, +=1; a=2, b=2", () => {
    const c = countsFor("function add(a, b) { return a + b; }", "add");
    expect(c.operators.get("return")).toBe(1);
    expect(c.operators.get("+")).toBe(1);
    expect(c.operands.get("a")).toBe(2);
    expect(c.operands.get("b")).toBe(2);
  });

  it("assignment operators: let, =, +=, -= and numeric operands", () => {
    const c = countsFor(
      `function f() {
        let x = 1;
        x += 2;
        x -= 3;
      }`,
      "f",
    );
    expect(c.operators.get("let")).toBe(1);
    expect(c.operators.get("=")).toBe(1);
    expect(c.operators.get("+=")).toBe(1);
    expect(c.operators.get("-=")).toBe(1);
    expect(c.operands.get("x")).toBe(3);
    expect(c.operands.get("1")).toBe(1);
    expect(c.operands.get("2")).toBe(1);
    expect(c.operands.get("3")).toBe(1);
  });

  it("comparison + logical: if, >, &&, !==, ===", () => {
    const c = countsFor(
      `function g(a: number, b: number) {
        if (a > 0 && b !== null) { return true; }
        if (a === b) { return false; }
      }`,
      "g",
    );
    expect(c.operators.get("if")).toBe(2);
    expect(c.operators.get(">")).toBe(1);
    expect(c.operators.get("&&")).toBe(1);
    expect(c.operators.get("!==")).toBe(1);
    expect(c.operators.get("===")).toBe(1);
    expect(c.operators.get("return")).toBe(2);
  });

  it("control flow — for/if/while/switch/case/default", () => {
    const c = countsFor(
      `function flow() {
        for (let i = 0; i < 10; i++) {
          if (i === 1) { continue; }
        }
        let n = 10;
        while (n > 0) { n--; }
        switch (n) {
          case 1: break;
          default: break;
        }
      }`,
      "flow",
    );
    expect(c.operators.get("for")).toBe(1);
    expect(c.operators.get("if")).toBe(1);
    expect(c.operators.get("while")).toBe(1);
    expect(c.operators.get("switch")).toBe(1);
    expect(c.operators.get("case")).toBe(1);
    expect(c.operators.get("default")).toBe(1);
    expect(c.operators.get("<")).toBe(1);
    expect(c.operators.get("++")).toBe(1);
    expect(c.operators.get("--")).toBe(1);
  });

  it("function calls: foo(); bar(1,2); → ()=2; operands include foo, bar", () => {
    const c = countsFor(
      `function callStuff() { foo(); bar(1, 2); }`,
      "callStuff",
    );
    expect(c.operators.get("()")).toBe(2);
    expect(c.operands.get("foo")).toBe(1);
    expect(c.operands.get("bar")).toBe(1);
  });

  it("property access chain a.b.c.d() → .=3, ()=1; operands a,b,c,d", () => {
    const c = countsFor(`function pa() { return a.b.c.d(); }`, "pa");
    expect(c.operators.get(".")).toBe(3);
    expect(c.operators.get("()")).toBe(1);
    for (const id of ["a", "b", "c", "d"]) {
      expect(c.operands.get(id)).toBe(1);
    }
  });

  it("optional chaining obj?.foo?.bar → ?.=2; operands obj,foo,bar", () => {
    const c = countsFor(`function oc() { return obj?.foo?.bar; }`, "oc");
    expect(c.operators.get("?.")).toBe(2);
    for (const id of ["obj", "foo", "bar"]) {
      expect(c.operands.get(id)).toBe(1);
    }
  });

  it("await someFunction() → await=1, ()=1; operand someFunction", () => {
    const c = countsFor(
      `async function a() { await someFunction(); }`,
      "a",
    );
    expect(c.operators.get("await")).toBe(1);
    expect(c.operators.get("()")).toBe(1);
    expect(c.operands.get("someFunction")).toBe(1);
  });

  it("new Foo(1) → new, (), const, =; operands x, Foo, 1", () => {
    const c = countsFor(
      `function n() { const x = new Foo(1); }`,
      "n",
    );
    expect(c.operators.get("new")).toBe(1);
    expect(c.operators.get("()")).toBe(1);
    expect(c.operators.get("const")).toBe(1);
    expect(c.operators.get("=")).toBe(1);
    expect(c.operands.get("x")).toBe(1);
    expect(c.operands.get("Foo")).toBe(1);
    expect(c.operands.get("1")).toBe(1);
  });

  it("ternary: x > 0 ? 'pos' : 'neg' → ?:=1, >=1", () => {
    const c = countsFor(
      `function t(x: number) { return x > 0 ? "pos" : "neg"; }`,
      "t",
    );
    expect(c.operators.get("?:")).toBe(1);
    expect(c.operators.get(">")).toBe(1);
  });

  it("spread [...items] → '...'", () => {
    const c = countsFor(
      `function sp(items: number[]) { return [...items]; }`,
      "sp",
    );
    expect(c.operators.get("...")).toBeGreaterThanOrEqual(1);
  });

  it("arrow (x) => x + 1 → '=>', '+'; operands x, 1", () => {
    const sf = createSourceFile("const inc = (x: number) => x + 1;");
    const fn = extractFunctions(sf).find((f) => f.name === "inc");
    expect(fn).toBeDefined();
    const c = collectHalsteadCounts(fn!.node);
    expect(c.operators.get("=>")).toBe(1);
    expect(c.operators.get("+")).toBe(1);
    expect(c.operands.get("x")).toBe(2);
    expect(c.operands.get("1")).toBe(1);
  });

  it("string literal counted WITH quotes", () => {
    const c = countsFor(
      `function s() { return "hello"; }`,
      "s",
    );
    expect(c.operands.has('"hello"')).toBe(true);
  });

  it("boolean + null literals counted as operands", () => {
    const c = countsFor(
      `function b() { return true || false || null; }`,
      "b",
    );
    expect(c.operands.get("true")).toBe(1);
    expect(c.operands.get("false")).toBe(1);
    expect(c.operands.get("null")).toBe(1);
  });

  it("template literal — name operand, return operator", () => {
    const c = countsFor(
      "function tl(name: string) { return `hi ${name}`; }",
      "tl",
    );
    expect(c.operators.get("return")).toBe(1);
    expect(c.operands.get("name")).toBeGreaterThanOrEqual(1);
  });

  it("type annotations excluded: number/string/boolean not counted", () => {
    const c = countsFor(
      `function typed(x: number): boolean { return x > 0; }`,
      "typed",
    );
    expect(c.operands.has("number")).toBe(false);
    expect(c.operands.has("boolean")).toBe(false);
    expect(c.operators.get("return")).toBe(1);
    expect(c.operators.get(">")).toBe(1);
    // `x` counted twice: once as parameter binding, once as in-body reference.
    // The `: number` annotation is excluded (TYPE_ONLY_KINDS skip), so the
    // identifier `x` inside the annotation does NOT leak. See spec 05 §3.6.
    expect(c.operands.get("x")).toBe(2);
    expect(c.operands.get("0")).toBe(1);
  });

  it("type alias / interface inside body excluded", () => {
    const c = countsFor(
      `function ti() {
        type Local = number;
        interface Other { a: number; }
        const x = 1;
      }`,
      "ti",
    );
    expect(c.operands.has("Local")).toBe(false);
    expect(c.operands.has("Other")).toBe(false);
    expect(c.operators.get("const")).toBe(1);
    expect(c.operands.get("x")).toBe(1);
    expect(c.operands.get("1")).toBe(1);
  });

  it("as number excluded; operands x, y counted", () => {
    const c = countsFor(
      `function castIt(y: unknown) { const x = y as number; }`,
      "castIt",
    );
    expect(c.operands.has("number")).toBe(false);
    expect(c.operands.get("x")).toBe(1);
    expect(c.operands.get("y")).toBeGreaterThanOrEqual(1);
  });

  it("nested function body skipped from outer classification", () => {
    const c = countsFor(
      `function outer() {
        const val = 1;
        function inner() { const y = 2; return y + 3; }
        return inner();
      }`,
      "outer",
    );
    // Outer does NOT see inner's body.
    expect(c.operands.has("y")).toBe(false);
    expect(c.operands.has("2")).toBe(false);
    expect(c.operands.has("3")).toBe(false);
    // But outer DOES see the call to inner().
    expect(c.operands.get("inner")).toBeGreaterThanOrEqual(1);
    expect(c.operators.get("()")).toBeGreaterThanOrEqual(1);
  });

  it("nested arrow body skipped similarly", () => {
    const c = countsFor(
      `function outer() {
        const f = () => 42;
        return f();
      }`,
      "outer",
    );
    expect(c.operands.has("42")).toBe(false);
    expect(c.operators.get("()")).toBeGreaterThanOrEqual(1);
  });

  it("try / catch / finally all three counted", () => {
    const c = countsFor(
      `function tc() {
        try { x(); } catch (e) { y(); } finally { z(); }
      }`,
      "tc",
    );
    expect(c.operators.get("try")).toBe(1);
    expect(c.operators.get("catch")).toBe(1);
    expect(c.operators.get("finally")).toBe(1);
  });

  it("arr[0] → '[]'; operands arr, 0", () => {
    const c = countsFor(`function ea() { return arr[0]; }`, "ea");
    expect(c.operators.get("[]")).toBe(1);
    expect(c.operands.get("arr")).toBe(1);
    expect(c.operands.get("0")).toBe(1);
  });

  it("typeof x === 'string' → typeof + ===", () => {
    const c = countsFor(
      `function to(x: unknown) { return typeof x === "string"; }`,
      "to",
    );
    expect(c.operators.get("typeof")).toBe(1);
    expect(c.operators.get("===")).toBe(1);
  });

  it("delete obj.key; void 0 → delete + void", () => {
    const c = countsFor(
      `function dv(obj: any) { delete obj.key; void 0; }`,
      "dv",
    );
    expect(c.operators.get("delete")).toBe(1);
    expect(c.operators.get("void")).toBe(1);
  });

  it("yield counted per yield", () => {
    const c = countsFor(
      `function* y() { yield 1; yield 2; }`,
      "y",
    );
    expect(c.operators.get("yield")).toBe(2);
  });

  it("for-in + for-of → for=2, in=1, of=1", () => {
    const c = countsFor(
      `function fi(obj: any, xs: any[]) {
        for (const k in obj) {}
        for (const v of xs) {}
      }`,
      "fi",
    );
    expect(c.operators.get("for")).toBe(2);
    expect(c.operators.get("in")).toBe(1);
    expect(c.operators.get("of")).toBe(1);
  });

  it("do-while → do + while", () => {
    const c = countsFor(
      `function dw() { do { break; } while (true); }`,
      "dw",
    );
    expect(c.operators.get("do")).toBe(1);
    expect(c.operators.get("while")).toBe(1);
  });

  it("else keyword counted when IfStatement has an else branch", () => {
    const c = countsFor(
      `function e(x: number) { if (x) { return 1; } else { return 2; } }`,
      "e",
    );
    expect(c.operators.get("if")).toBe(1);
    expect(c.operators.get("else")).toBe(1);
  });

  it("unary minus / logical not: -x and !flag", () => {
    const c = countsFor(
      `function u(x: number, flag: boolean) { return -x + (!flag ? 1 : 0); }`,
      "u",
    );
    expect(c.operators.get("unary-")).toBe(1);
    expect(c.operators.get("!")).toBe(1);
  });

  it("nullish coalescing ?? counted as binary operator", () => {
    const c = countsFor(
      `function nc(x: unknown) { return x ?? 0; }`,
      "nc",
    );
    expect(c.operators.get("??")).toBe(1);
  });

  it("caches per-node — same reference on repeated calls", () => {
    const fn = getFn(createSourceFile("function f() { return 1; }"), "f");
    const first = collectHalsteadCounts(fn);
    const second = collectHalsteadCounts(fn);
    expect(first).toBe(second);
  });
});

// ===========================================================================
// halsteadVolumeDefinition
// ===========================================================================

describe("halsteadVolumeDefinition", () => {
  it("has the expected metadata", () => {
    expect(halsteadVolumeDefinition.key).toBe("halsteadVolume");
    expect(halsteadVolumeDefinition.shortCode).toBe("HVol");
    expect(halsteadVolumeDefinition.direction).toBe("higher-is-worse");
    expect(halsteadVolumeDefinition.defaultThresholds).toEqual({
      warn: 1000,
      error: 2000,
    });
    expect(halsteadVolumeDefinition.dependencies).toEqual([]);
  });

  it("empty function → V=0, all detail zero", () => {
    const r = asMetricResult(
      halsteadVolumeDefinition.compute(ctxFor("function e() {}", "e")),
    );
    expect(r.value).toBe(0);
    expect(r.detail).toEqual({ n1: 0, n2: 0, N1: 0, N2: 0 });
  });

  it("add(a,b) → n1=2, n2=2, N1=2, N2=4, V=12", () => {
    const r = asMetricResult(
      halsteadVolumeDefinition.compute(
        ctxFor("function add(a, b) { return a + b; }", "add"),
      ),
    );
    expect(r.detail).toEqual({ n1: 2, n2: 2, N1: 2, N2: 4 });
    expect(r.value).toBeCloseTo(6 * Math.log2(4), 10);
    expect(r.value).toBeCloseTo(12, 10);
  });

  it("guards finite result when vocabulary is zero", () => {
    const r = asMetricResult(
      halsteadVolumeDefinition.compute(ctxFor("function e() {}", "e")),
    );
    expect(Number.isFinite(r.value)).toBe(true);
  });
});

// ===========================================================================
// halsteadDifficultyDefinition
// ===========================================================================

describe("halsteadDifficultyDefinition", () => {
  it("has the expected metadata", () => {
    expect(halsteadDifficultyDefinition.key).toBe("halsteadDifficulty");
    expect(halsteadDifficultyDefinition.shortCode).toBe("HDiff");
    expect(halsteadDifficultyDefinition.direction).toBe("higher-is-worse");
    expect(halsteadDifficultyDefinition.defaultThresholds).toEqual({
      warn: 30,
      error: 50,
    });
    expect(halsteadDifficultyDefinition.dependencies).toEqual([]);
  });

  it("empty function → D=0 (n2=0 guard)", () => {
    const r = asMetricResult(
      halsteadDifficultyDefinition.compute(ctxFor("function e() {}", "e")),
    );
    expect(r.value).toBe(0);
  });

  it("add(a,b) → D = (2/2) * (4/2) = 2", () => {
    const r = asMetricResult(
      halsteadDifficultyDefinition.compute(
        ctxFor("function add(a, b) { return a + b; }", "add"),
      ),
    );
    expect(r.value).toBe(2);
    expect(r.detail).toEqual({ n1: 2, n2: 2, N1: 2, N2: 4 });
  });
});

// ===========================================================================
// halsteadEffortDefinition
// ===========================================================================

describe("halsteadEffortDefinition", () => {
  it("has the expected metadata — thresholds per test-authoritative policy", () => {
    expect(halsteadEffortDefinition.key).toBe("halsteadEffort");
    expect(halsteadEffortDefinition.shortCode).toBe("HEff");
    expect(halsteadEffortDefinition.direction).toBe("higher-is-worse");
    expect(halsteadEffortDefinition.defaultThresholds).toEqual({
      warn: 5000,
      error: 10000,
    });
    expect(halsteadEffortDefinition.dependencies).toEqual([]);
  });

  it("empty function → E=0", () => {
    const r = asMetricResult(
      halsteadEffortDefinition.compute(ctxFor("function e() {}", "e")),
    );
    expect(r.value).toBe(0);
  });

  it("add(a,b) → E = D * V = 2 * 12 = 24", () => {
    const r = asMetricResult(
      halsteadEffortDefinition.compute(
        ctxFor("function add(a, b) { return a + b; }", "add"),
      ),
    );
    expect(r.value).toBeCloseTo(24, 10);
  });

  it("a complex function has greater effort than a simple one", () => {
    const simple = asMetricResult(
      halsteadEffortDefinition.compute(
        ctxFor("function s(a, b) { return a + b; }", "s"),
      ),
    );
    const complex = asMetricResult(
      halsteadEffortDefinition.compute(
        ctxFor(
          `function c(a: number, b: number, c: number) {
            let x = a + b * c;
            if (x > 10 && x < 100) { x = x - 1; } else { x = x + 1; }
            for (let i = 0; i < x; i++) { x = x + i; }
            return x;
          }`,
          "c",
        ),
      ),
    );
    expect(complex.value).toBeGreaterThan(simple.value);
  });
});

// ===========================================================================
// TypeScript type exclusion
// ===========================================================================

describe("TypeScript type exclusion", () => {
  it("generic type parameters excluded from operands", () => {
    const c = countsFor(
      `function g<T>(value: T): T { return value; }`,
      "g",
    );
    expect(c.operands.has("T")).toBe(false);
    expect(c.operands.get("value")).toBeGreaterThanOrEqual(1);
  });

  it("function with only type-level tokens → V=0", () => {
    const r = asMetricResult(
      halsteadVolumeDefinition.compute(
        ctxFor(`function typesOnly(): void {}`, "typesOnly"),
      ),
    );
    expect(r.value).toBe(0);
  });

  it("new Array<number>(10) → 'number' excluded; arr, Array, 10 operands", () => {
    const c = countsFor(
      `function na() { const arr = new Array<number>(10); }`,
      "na",
    );
    expect(c.operands.has("number")).toBe(false);
    expect(c.operands.get("arr")).toBe(1);
    expect(c.operands.get("Array")).toBe(1);
    expect(c.operands.get("10")).toBe(1);
  });
});
