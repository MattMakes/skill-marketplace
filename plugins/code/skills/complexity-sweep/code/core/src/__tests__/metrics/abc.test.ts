import { describe, expect, it } from "vitest";
import { createHarness } from "./testUtils";
import abcDefinition, {
  type AbcCounts,
  computeAbcCounts,
  computeAbcScore,
} from "../../metrics/abc";
import type { MetricResult } from "../../registry";

function counts(source: string, name: string): AbcCounts {
  const { getCtx } = createHarness(source);
  return computeAbcCounts(getCtx(name).node);
}

function score(source: string, name: string): MetricResult<AbcCounts> {
  const { getCtx } = createHarness(source);
  return computeAbcScore(getCtx(name).node);
}

describe("ABC – empty/trivial", () => {
  it("returns all zeros for an empty function", () => {
    expect(counts("function empty() {}", "empty")).toEqual({ a: 0, b: 0, c: 0 });
  });

  it("returns zeros for `return 42;`", () => {
    expect(counts("function ret() { return 42; }", "ret")).toEqual({
      a: 0,
      b: 0,
      c: 0,
    });
  });
});

describe("ABC – assignments", () => {
  it("counts a declaration with an initializer", () => {
    expect(counts("function f() { const x = 1; }", "f").a).toBe(1);
  });

  it("does not count a declaration without an initializer", () => {
    expect(counts("function f() { let x: number; }", "f").a).toBe(0);
  });

  it("counts a bare assignment expression", () => {
    expect(counts("function f() { let x; x = 1; }", "f").a).toBe(1);
  });

  it("counts compound assignment operators", () => {
    const src =
      "function f() { let x = 0; x += 1; x -= 1; x *= 2; x /= 2; x %= 3; }";
    expect(counts(src, "f").a).toBe(6);
  });

  it("counts prefix ++/--", () => {
    expect(counts("function f() { let x = 0; ++x; --x; }", "f").a).toBe(3);
  });

  it("counts postfix ++/--", () => {
    expect(counts("function f() { let x = 0; x++; x--; }", "f").a).toBe(3);
  });

  it("counts each binding in object destructuring", () => {
    expect(
      counts("function f(obj: any) { const { a, b, c } = obj; }", "f").a,
    ).toBe(3);
  });

  it("counts each binding in array destructuring", () => {
    expect(
      counts("function f(arr: any[]) { const [a, b, c] = arr; }", "f").a,
    ).toBe(3);
  });

  it("handles nested destructuring", () => {
    expect(
      counts("function f(obj: any) { const { a, nested: { b, c } } = obj; }", "f").a,
    ).toBe(3);
  });

  it("skips array destructuring elisions", () => {
    expect(
      counts("function f(arr: any[]) { const [, x, , y] = arr; }", "f").a,
    ).toBe(2);
  });

  it("counts arr.push as A=2 (decl + mutation) and B=1 (the call)", () => {
    const { a, b } = counts(
      "function f() { const arr: number[] = []; arr.push(1); }",
      "f",
    );
    expect(a).toBe(2);
    expect(b).toBe(1);
  });

  it("counts the full mutating-method set", () => {
    const src = `function f() {
  const arr: any[] = [];
  arr.push(1);
  arr.pop();
  arr.shift();
  arr.unshift(1);
  arr.splice(0);
  arr.sort();
  arr.reverse();
  arr.fill(0);
  arr.copyWithin(0, 1);
}`;
    const result = counts(src, "f");
    // 1 decl + 9 mutations = 10; 9 calls.
    expect(result.a).toBe(10);
    expect(result.b).toBe(9);
  });

  it("counts Map mutations", () => {
    const src = `function f() {
  const m = new Map();
  m.set('k', 'v');
  m.delete('k');
  m.clear();
}`;
    const result = counts(src, "f");
    // 1 decl + 3 mutating calls = 4; 1 new + 3 calls = 4.
    expect(result.a).toBe(4);
    expect(result.b).toBe(4);
  });
});

describe("ABC – branches", () => {
  it("single call", () => {
    expect(counts("function f() { bar(); }", "f").b).toBe(1);
  });

  it("multiple calls", () => {
    expect(counts("function f() { bar(); baz(); qux(); }", "f").b).toBe(3);
  });

  it("new expression", () => {
    expect(counts("function f() { const x = new Date(); }", "f").b).toBe(1);
  });

  it("await + call counts B once, not twice", () => {
    expect(
      counts("async function foo() { await bar(); }", "foo").b,
    ).toBe(1);
  });

  it("property access chain `a.b.c.d()` = B=1", () => {
    expect(counts("function f(a: any) { a.b.c.d(); }", "f").b).toBe(1);
  });

  it("method call counts once", () => {
    expect(counts("function f(obj: any) { obj.method(); }", "f").b).toBe(1);
  });
});

describe("ABC – conditions", () => {
  it("`if (true)` = 1", () => {
    expect(counts("function f() { if (true) {} }", "f").c).toBe(1);
  });

  it("`if (x > 0)` = 2 (if + comparison)", () => {
    expect(counts("function f(x: number) { if (x > 0) {} }", "f").c).toBe(2);
  });

  it("`if/else-if` = 4", () => {
    expect(
      counts(
        "function f(x: number) { if (x > 0) {} else if (x < 0) {} }",
        "f",
      ).c,
    ).toBe(4);
  });

  it("for loop: c=2, a=2", () => {
    const r = counts("function f() { for (let i = 0; i < 10; i++) {} }", "f");
    expect(r.c).toBe(2);
    expect(r.a).toBe(2);
  });

  it("for-of = 1", () => {
    expect(
      counts(
        "function f(items: number[]) { for (const item of items) {} }",
        "f",
      ).c,
    ).toBe(1);
  });

  it("for-in = 1", () => {
    expect(
      counts("function f(obj: any) { for (const key in obj) {} }", "f").c,
    ).toBe(1);
  });

  it("while = 1", () => {
    expect(counts("function f() { while (true) {} }", "f").c).toBe(1);
  });

  it("do-while = 1", () => {
    expect(counts("function f() { do {} while (true); }", "f").c).toBe(1);
  });

  it("switch: case counts, default excluded", () => {
    const src =
      "function f(x: number) { switch (x) { case 1: break; case 2: break; default: break; } }";
    expect(counts(src, "f").c).toBe(2);
  });

  it("ternary = 1", () => {
    expect(
      counts("function f(x: number) { const y = x ? 1 : 0; }", "f").c,
    ).toBe(1);
  });

  it("&&, ||, ?? each count once", () => {
    expect(counts("function f(a: any, b: any) { const x = a && b; }", "f").c).toBe(1);
    expect(counts("function f(a: any, b: any) { const x = a || b; }", "f").c).toBe(1);
    expect(counts("function f(a: any, b: any) { const x = a ?? b; }", "f").c).toBe(1);
  });

  it("8 comparison operators", () => {
    const src = `function f(a: any, b: any) {
  const r1 = a == b;
  const r2 = a != b;
  const r3 = a === b;
  const r4 = a !== b;
  const r5 = a < b;
  const r6 = a > b;
  const r7 = a <= b;
  const r8 = a >= b;
}`;
    expect(counts(src, "f").c).toBe(8);
  });
});

describe("ABC – combined", () => {
  it("does not descend into nested functions (outer)", () => {
    const src = `function outer() {
  const a = 1;
  const inner = () => {
    const y = 1;
    bar();
    if (true) {}
  };
}`;
    // outer: const a + const inner → a=2; inner arrow is boundary.
    const outer = counts(src, "outer");
    expect(outer).toEqual({ a: 2, b: 0, c: 0 });
  });

  it("analyzes the arrow in isolation", () => {
    const src = `function outer() {
  const inner = () => {
    const y = 1;
    bar();
    if (true) {}
  };
}`;
    const inner = counts(src, "inner");
    expect(inner).toEqual({ a: 1, b: 1, c: 1 });
  });
});

describe("ABC – score", () => {
  it("computes sqrt(A^2 + B^2 + C^2)", () => {
    const src =
      "function f() { const a = 1; const b = 2; const c = 3; bar(); baz(); qux(); quux(); }";
    const result = score(src, "f");
    expect(result.detail).toEqual({ a: 3, b: 4, c: 0 });
    expect(result.value).toBe(5);
  });

  it("detail includes a, b, c keys", () => {
    const result = score("function f() {}", "f");
    expect(result.detail).toHaveProperty("a");
    expect(result.detail).toHaveProperty("b");
    expect(result.detail).toHaveProperty("c");
  });
});

describe("ABC – await edge cases", () => {
  it("bare await foo()", () => {
    expect(counts("async function f() { await bar(); }", "f").b).toBe(1);
  });

  it("const r = await fetchData()", () => {
    const r = counts(
      "async function f() { const r = await fetchData(); }",
      "f",
    );
    expect(r.a).toBe(1);
    expect(r.b).toBe(1);
  });

  it("two awaits", () => {
    const r = counts(
      "async function f() { const a = await foo(); const b = await bar(); }",
      "f",
    );
    expect(r.a).toBe(2);
    expect(r.b).toBe(2);
  });
});

describe("ABC – metric definition", () => {
  it("exposes the documented metadata", () => {
    expect(abcDefinition.key).toBe("abcScore");
    expect(abcDefinition.shortCode).toBe("ABC");
    expect(abcDefinition.direction).toBe("higher-is-worse");
    expect(abcDefinition.defaultThresholds).toEqual({ warn: 20, error: 30 });
    expect(abcDefinition.dependencies).toEqual([]);
    expect(abcDefinition.detailKeys).toEqual(["a", "b", "c"]);
  });

  it("compute() returns { value, detail }", () => {
    const { getCtx } = createHarness("function f() { bar(); }");
    const result = abcDefinition.compute(getCtx("f"));
    expect(typeof result).toBe("object");
    if (typeof result === "object") {
      expect(result.value).toBe(1);
      expect(result.detail).toEqual({ a: 0, b: 1, c: 0 });
    }
  });
});
