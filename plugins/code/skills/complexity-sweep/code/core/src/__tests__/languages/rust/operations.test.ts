import { beforeAll, describe, expect, it } from "vitest";

import {
  rustAbcScore,
  rustHalsteadDifficulty,
  rustHalsteadEffort,
  rustHalsteadVolume,
  rustMaintainabilityIndex,
  rustScopeDepthRatio,
  rustScopeDepthWeightedLoc,
} from "../../../languages/rust/operations";
import { countRustLoc } from "../../../languages/rust/operations.scopeDepth";
import type { SyntaxMetricContext } from "../../../languages/types";
import { initSyntaxParsers, syntaxCtx } from "../syntaxTestUtils";

interface DetailResult<T> {
  value: number;
  detail: T;
}

interface AbcDetail {
  a: number;
  b: number;
  c: number;
}

interface HalsteadDetail {
  n1: number;
  n2: number;
  N1: number;
  N2: number;
}

beforeAll(async () => {
  await initSyntaxParsers();
});

function result<T>(value: number | { value: number; detail?: T }): DetailResult<T> {
  if (typeof value === "number" || value.detail === undefined) {
    throw new Error("Expected a metric result with detail");
  }
  return { value: value.value, detail: value.detail };
}

function abc(source: string, index = 0): DetailResult<AbcDetail> {
  return result(rustAbcScore(syntaxCtx("rust", source, index)));
}

function halstead(source: string, index = 0): DetailResult<HalsteadDetail> {
  return result(rustHalsteadVolume(syntaxCtx("rust", source, index)));
}

describe("Rust ABC score", () => {
  it("counts initialized pattern leaves and assignment expressions", () => {
    const actual = abc(`fn f() {
  let (a, b) = (1, 2);
  let unused: i32;
  a = b;
  b += 1;
}`);
    // A = 2 initialized pattern leaves + 1 assignment + 1 compound assignment.
    expect(actual.detail).toEqual({ a: 4, b: 0, c: 0 });
    expect(actual.value).toBe(4);
  });

  it("counts every mutating method as both an assignment and a call", () => {
    const methods = [
      "push", "push_str", "push_back", "push_front", "pop", "pop_back",
      "pop_front", "insert", "remove", "clear", "extend", "append",
      "truncate", "drain", "retain", "sort", "sort_by", "sort_by_key",
      "sort_unstable", "dedup", "reverse", "swap",
    ];
    const source = `fn f(mut value: Vec<i32>) {\n${methods
      .map((method) => `  value.${method}();`)
      .join("\n")}\n}`;
    // Each of the 22 methods adds A=1 and B=1.
    expect(abc(source).detail).toEqual({ a: 22, b: 22, c: 0 });
  });

  it("counts calls, macros, and struct expressions as branches", () => {
    const actual = abc(`fn f() {
  call();
  println!("ok");
  let point = Point { x: 1 };
}`);
    // A = initialized point; B = call + macro + struct expression.
    expect(actual.detail).toEqual({ a: 1, b: 3, c: 0 });
  });

  it("counts logical, comparison, branch, loop, and try conditions", () => {
    const actual = abc(`fn f(a: bool, b: bool, x: i32) -> Result<(), ()> {
  if a && b || x >= 1 { call()?; }
  for i in 0..x { while i != x {} }
  loop { break; }
  Ok(())
}`);
    // C = if + && + || + >= + try + for + while + != + loop = 9.
    expect(actual.detail.c).toBe(9);
  });

  it("counts match arms and guards but excludes an unguarded wildcard", () => {
    const actual = abc(`fn f(x: i32) {
  match x {
    n if n > 0 => positive(),
    0 => zero(),
    _ => other(),
  };
}`);
    // C = guarded arm + guard + comparison + zero arm; wildcard adds 0.
    expect(actual.detail.c).toBe(4);
  });

  it("counts let-chain conjunctions and let-else", () => {
    const source = `fn f(a: Option<i32>, b: Option<i32>) {
  if let Some(x) = a && let Some(y) = b { use_pair(x, y); }
  let Some(z) = a else { return; };
}`;
    const actual = abc(source);
    // C = if + one let-chain && + one let-else.
    expect(actual.detail.c).toBe(3);
  });

  it("skips nested functions but keeps closures in the enclosing unit", () => {
    const source = `fn outer() {
  let closure = || { call(); };
  fn inner() { nested(); }
}`;
    // Outer: initialized closure A=1 and closure call B=1; nested fn is excluded.
    expect(abc(source).detail).toEqual({ a: 1, b: 1, c: 0 });
  });
});

describe("Rust logical LOC", () => {
  it("returns zero for an empty single-line body", () => {
    // The body has no code after its outer braces are removed.
    expect(countRustLoc(syntaxCtx("rust", "fn empty() {}"))).toBe(0);
    expect(countRustLoc(syntaxCtx("rust", "fn comment() { /* only */ }"))).toBe(0);
  });

  it("skips blanks, comments, brace-only lines, and nested-unit lines", () => {
    const ctx = syntaxCtx("rust", `fn outer() {
  // line comment

  if true {
    work();
  }
  /* block
     comment */
  fn inner() {
    hidden();
  }
  done();
}`);
    // LOC = if header + work + done. Both comments, both braces, and inner are excluded.
    expect(countRustLoc(ctx)).toBe(3);
  });

  it("keeps code on lines that also contain comments", () => {
    const ctx = syntaxCtx("rust", `fn f() {
  work(); // trailing comment
  let x = 1; /* trailing block comment */
}`);
    // Both lines hold executable code before their comments.
    expect(countRustLoc(ctx)).toBe(2);
  });
});

describe("Rust scope depth", () => {
  const cases: Array<{ name: string; source: string }> = [
    { name: "if and else", source: "if true {\n    a();\n  } else {\n    b();\n  }" },
    { name: "while", source: "while ready() {\n    a();\n  }" },
    { name: "for", source: "for x in xs {\n    a(x);\n  }" },
    { name: "loop", source: "loop {\n    a();\n  }" },
    { name: "unsafe", source: "unsafe {\n    a();\n  }" },
    { name: "async", source: "async {\n    a();\n  };" },
    { name: "bare block", source: "{\n    a();\n  }" },
    { name: "closure", source: "let f = || {\n    a();\n  };" },
  ];

  for (const testCase of cases) {
    it(`adds depth for ${testCase.name} blocks`, () => {
      const source = `fn f() {\n  ${testCase.source}\n  done();\n}`;
      const ctx = syntaxCtx("rust", source);
      const weighted = rustScopeDepthWeightedLoc(ctx);
      const raw = countRustLoc(ctx);
      // Each fixture has at least one body line one level below its header.
      expect(weighted).toBeGreaterThan(raw);
    });
  }

  it("paints match arms like switch clauses", () => {
    const ctx = syntaxCtx("rust", `fn f(x: i32) {
  match x {
    1 => {
      one();
    }
    _ => zero(),
  }
}`);
    const weighted = rustScopeDepthWeightedLoc(ctx);
    const raw = countRustLoc(ctx);
    // Arm headers add 1 level and the block arm body adds a second level.
    expect(weighted).toBeGreaterThan(raw);
  });

  it("adds depth to a concise closure body", () => {
    const ctx = syntaxCtx("rust", `fn f() {
  let closure = |x|
    x + 1;
}`);
    // LOC = 2; weights = 1 for let and 2 for the closure expression.
    expect(rustScopeDepthWeightedLoc(ctx)).toBe(3);
    expect(rustScopeDepthRatio(ctx)).toBe(1.5);
  });

  it("returns the weighted-to-raw ratio and excludes nested units", () => {
    const source = `fn outer() {
  if true {
    work();
  }
  fn inner() {
    hidden();
  }
}`;
    const ctx = syntaxCtx("rust", source);
    // LOC = 2; weights = 1 for the if header and 2 for work, so ratio = 3/2.
    expect(rustScopeDepthWeightedLoc(ctx)).toBe(3);
    expect(rustScopeDepthRatio(ctx)).toBe(1.5);
  });
});

describe("Rust Halstead metrics", () => {
  it("has exact counts for an addition function", () => {
    const actual = halstead("fn add(a: i32, b: i32) -> i32 { return a + b; }");
    // Operators: 9 distinct/total. Operands: a and b, each twice.
    expect(actual.detail).toEqual({ n1: 9, n2: 2, N1: 9, N2: 4 });
    expect(actual.value).toBeCloseTo(13 * Math.log2(11), 10);
  });

  it("has exact counts for let and macro tokens", () => {
    const source = "fn assign() { let x: i32 = 1; use_it!(x); }";
    const volume = result<HalsteadDetail>(rustHalsteadVolume(syntaxCtx("rust", source)));
    const difficulty = result<HalsteadDetail>(rustHalsteadDifficulty(syntaxCtx("rust", source)));
    const effort = result<HalsteadDetail>(rustHalsteadEffort(syntaxCtx("rust", source)));
    // 10 distinct operators, 3 distinct operands, 13 operator and 4 operand uses.
    const detail = { n1: 10, n2: 3, N1: 13, N2: 4 };
    expect(volume.detail).toEqual(detail);
    expect(difficulty.detail).toEqual(detail);
    expect(effort.detail).toEqual(detail);
    expect(effort.value).toBeCloseTo(volume.value * difficulty.value, 10);
  });

  it("skips generic, parameter, return, let, lifetime, and where types", () => {
    const simple = halstead("fn typed(x: i32) { let y: i32 = x; y; }");
    const typed = halstead(`fn typed<'a, T: Copy>(x: &'a Vec<T>) -> Option<T>
where T: Clone { let y: Vec<T> = x; y; }`);
    // All changed tokens are type-only; the value-level vocabulary is identical.
    expect(typed.detail).toEqual(simple.detail);
  });

  it("skips nested functions and counts closure and macro token-tree leaves", () => {
    const outer = halstead(`fn outer() {
  let f = |x| x + 1;
  println!("{}", f(2));
  fn inner() { hidden(); }
}`);
    // Nested-only operand `hidden` must not enter the outer vocabulary.
    expect(outer.detail.n2).toBeGreaterThan(0);
    expect(halstead("fn outer() { fn inner() { hidden(); } }").detail.n2).toBe(0);
  });

  it("does not classify comment text as Halstead tokens", () => {
    const plain = halstead("fn f() { work(); }");
    const commented = halstead(`fn f() {
  // work(fake);
  /* hidden + tokens */
  work();
}`);
    // Comments do not change the operator or operand vocabulary.
    expect(commented.detail).toEqual(plain.detail);
  });
});

describe("Rust maintainability index", () => {
  function mi(ctx: SyntaxMetricContext): number {
    const value = rustMaintainabilityIndex(ctx);
    if (typeof value !== "number") throw new Error("Expected numeric MI");
    return value;
  }

  it("uses dependency values and the shared LOC helper", () => {
    const source = `fn f() {
  let x = 1;
  x + 1;
}`;
    const ctx = syntaxCtx("rust", source, 0, {}, {
      halsteadVolume: 100,
      cyclomaticComplexity: 3,
    });
    const expected = Math.max(
      0,
      (171 - 5.2 * Math.log(100) - 0.23 * 3 - 16.2 * Math.log(2)) * 100 / 171,
    );
    // V=100, CC=3, LOC=2 use the unchanged MI formula.
    expect(mi(ctx)).toBeCloseTo(expected, 10);
  });

  it("uses V=0 and CC=1 fallbacks and clamps pathological input", () => {
    const source = "fn f() {\n  work();\n}";
    // Missing V falls back to 0 and returns the guarded maximum.
    expect(mi(syntaxCtx("rust", source))).toBe(100);
    // A very large volume and complexity clamp the result to 0.
    expect(mi(syntaxCtx("rust", source, 0, {}, {
      halsteadVolume: 1e30,
      cyclomaticComplexity: 1000,
    }))).toBe(0);
  });
});
