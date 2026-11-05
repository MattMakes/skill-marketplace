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
    // Operators: return + = 2 distinct, 2 total. `fn` and `add` are header.
    // Punctuation ( , ) { ; } is structural (design 5.9).
    // Operands: a and b, each twice.
    expect(actual.detail).toEqual({ n1: 2, n2: 2, N1: 2, N2: 4 });
    // V = N log2(n) = 6 * log2(4) = 12.
    expect(actual.value).toBeCloseTo(12, 10);
  });

  it("has exact counts for let and macro tokens", () => {
    const source = "fn assign() { let x: i32 = 1; use_it!(x); }";
    const volume = result<HalsteadDetail>(rustHalsteadVolume(syntaxCtx("rust", source)));
    const difficulty = result<HalsteadDetail>(rustHalsteadDifficulty(syntaxCtx("rust", source)));
    const effort = result<HalsteadDetail>(rustHalsteadEffort(syntaxCtx("rust", source)));
    // Operators: let = !() = 3 distinct, 3 total (`:` is type syntax).
    // Operands: x, 1, use_it = 3 distinct; x, 1, use_it, x = 4 uses.
    const detail = { n1: 3, n2: 3, N1: 3, N2: 4 };
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

  it("counts a node with only anonymous children once (D2)", () => {
    const actual = halstead("fn f() { loop { break; } }");
    // Operators: loop = 1 distinct, 1 total. No operands.
    // `break` and the punctuation are structural (design 5.9), like the
    // TypeScript metric, which has no tokens for blocks or `break`.
    expect(actual.detail).toEqual({ n1: 1, n2: 0, N1: 1, N2: 0 });
  });

  it("skips the fn keyword and the function name (D3)", () => {
    // No operators: ( ) { } are structural. The name `solo` and `fn` are skipped.
    expect(halstead("fn solo() {}").detail).toEqual({ n1: 0, n2: 0, N1: 0, N2: 0 });
  });

  it("skips visibility and function modifiers (D3)", () => {
    // `pub(crate)`, `const` and `unsafe` are header syntax.
    // No operators and no operands: ( ) { } are structural.
    const actual = halstead("pub(crate) const unsafe fn solo() {}");
    expect(actual.detail).toEqual({ n1: 0, n2: 0, N1: 0, N2: 0 });
    // `async` is a function modifier too.
    expect(halstead("pub async fn solo() {}").detail)
      .toEqual({ n1: 0, n2: 0, N1: 0, N2: 0 });
  });

  it("keeps parameters and body tokens after the header (D3)", () => {
    const actual = halstead("pub fn id(x: i32) -> i32 { x }");
    // No operators: ( ) { } : -> are structural.
    // Operands: x twice (parameter pattern and body).
    expect(actual.detail).toEqual({ n1: 0, n2: 1, N1: 0, N2: 2 });
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

describe("Rust ABC score rule rows (design 5.7)", () => {
  it("computes the value as sqrt(a^2 + b^2 + c^2)", () => {
    const actual = abc(`fn f() {
  let a = 1;
  let b = 2;
  let c = 3;
  g();
  g();
  g();
  g();
}`);
    // A = 3 initialized lets. B = 4 calls. C = 0. sqrt(9 + 16) = 5.
    expect(actual.detail).toEqual({ a: 3, b: 4, c: 0 });
    expect(actual.value).toBe(5);
  });

  it("counts one assignment per leaf of a struct pattern with a value", () => {
    const actual = abc(`fn f(p: Point) {
  let Point { x, y } = p;
}`);
    // A = 2 leaves (x and y). No call, no condition.
    expect(actual.detail).toEqual({ a: 2, b: 0, c: 0 });
  });

  it("counts a leaf under mut and a leaf inside a tuple-struct pattern", () => {
    const actual = abc(`fn f(o: Option<i32>) {
  let mut count = 0;
  let Some(v) = o else { return; };
}`);
    // A = count + v. C = let-else.
    expect(actual.detail).toEqual({ a: 2, b: 0, c: 1 });
  });

  it("counts a mutating method that has a turbofish as assignment and call", () => {
    const actual = abc("fn f(mut v: Vec<i32>) { v.push::<i32>(1); }");
    // A = 1 mutating call. B = 1 call.
    expect(actual.detail).toEqual({ a: 1, b: 1, c: 0 });
  });

  it("does not count a non-mutating method as an assignment", () => {
    // A = 0. B = 1 call.
    expect(abc("fn f(v: Vec<i32>) { v.len(); }").detail).toEqual({ a: 0, b: 1, c: 0 });
  });

  it("counts each of the six comparison operators once", () => {
    const actual = abc(`fn f(a: i32, b: i32) -> bool {
  a == b; a != b; a < b; a > b; a <= b; a >= b;
  true
}`);
    // C = 6 comparisons.
    expect(actual.detail).toEqual({ a: 0, b: 0, c: 6 });
  });

  it("counts && and || once each and does not count else", () => {
    const actual = abc(`fn f(a: bool, b: bool) {
  if a && b { } else { }
  let _ = a || b;
}`);
    // C = if + && + ||. The `else` adds 0. A = 1 for the let with a value.
    expect(actual.detail).toEqual({ a: 0, b: 0, c: 3 });
  });

  it("counts an else-if as an if and a guarded wildcard as arm plus guard", () => {
    const actual = abc(`fn f(a: bool, x: i32) {
  if a { } else if a { }
  match x {
    _ if a => {}
    _ => {}
  }
}`);
    // C = if + else-if + guarded wildcard arm + guard = 4; the plain wildcard adds 0.
    expect(actual.detail).toEqual({ a: 0, b: 0, c: 4 });
  });

  it("counts while let and for loops as conditions", () => {
    const actual = abc(`fn f(mut it: Iter) {
  while let Some(x) = it.next() { for y in 0..x { } }
}`);
    // C = while + for. B = 1 call. A = 0.
    expect(actual.detail).toEqual({ a: 0, b: 1, c: 2 });
  });
});

describe("Rust scope depth block kinds (design 5.8)", () => {
  function stats(source: string): { weighted: number; raw: number } {
    const ctx = syntaxCtx("rust", source);
    return { weighted: rustScopeDepthWeightedLoc(ctx), raw: countRustLoc(ctx) };
  }

  it("paints if and else bodies one level in and keeps the else header out", () => {
    const actual = stats(`fn f() {
  if true {
    a();
  } else {
    b();
  }
  done();
}`);
    // Counted lines: if header w1, a() w2, "} else {" w1, b() w2, done w1.
    // The lone "}" is brace-only. LOC = 5. Weighted = 1+2+1+2+1 = 7.
    expect(actual).toEqual({ weighted: 7, raw: 5 });
  });

  it("keeps an else-if header at the outer depth", () => {
    const actual = stats(`fn f() {
  if a {
    x();
  } else if b {
    y();
  } else {
    z();
  }
}`);
    // Lines: if w1, x w2, else-if w1, y w2, else w1, z w2. LOC = 6. Weighted = 9.
    expect(actual).toEqual({ weighted: 9, raw: 6 });
  });

  const loops: Array<{ name: string; header: string; footer: string }> = [
    { name: "while", header: "while ready() {", footer: "}" },
    { name: "for", header: "for x in xs {", footer: "}" },
    { name: "loop", header: "loop {", footer: "}" },
    { name: "labeled loop", header: "'a: loop {", footer: "}" },
    { name: "unsafe", header: "unsafe {", footer: "}" },
    { name: "async", header: "async {", footer: "};" },
    { name: "closure", header: "let g = || {", footer: "};" },
  ];

  for (const { name, header, footer } of loops) {
    it(`adds exactly one level inside a ${name} block`, () => {
      const actual = stats(`fn f() {
  ${header}
    a();
  ${footer}
  done();
}`);
      // Lines: header w1, a() w2, done w1. The footer is brace-only. LOC = 3. Weighted = 4.
      expect(actual).toEqual({ weighted: 4, raw: 3 });
    });
  }

  it("adds one level inside a bare nested block", () => {
    const actual = stats(`fn f() {
  {
    a();
  }
  done();
}`);
    // The "{" and "}" lines are brace-only. Lines: a() w2, done w1. LOC = 2. Weighted = 3.
    expect(actual).toEqual({ weighted: 3, raw: 2 });
  });

  it("adds a level for each nesting step", () => {
    const actual = stats(`fn f() {
  if a {
    for x in y {
      g();
    }
  }
}`);
    // Lines: if w1, for w2, g() w3. LOC = 3. Weighted = 6.
    expect(actual).toEqual({ weighted: 6, raw: 3 });
  });

  it("paints match like switch: arm lines one level in and arm block bodies two", () => {
    const actual = stats(`fn f(x: i32) {
  match x {
    1 => {
      one();
    }
    _ => zero(),
  }
}`);
    // Lines: match w1, "1 => {" w2, one() w3, "_ => zero()," w3 (arm + value).
    // The two "}" lines are brace-only. LOC = 4. Weighted = 1+2+3+3 = 9.
    expect(actual).toEqual({ weighted: 9, raw: 4 });
  });

  it("adds one level for each closure that is nested in a closure", () => {
    const actual = stats(`fn f() {
  let g = || {
    let h = || {
      a();
    };
  };
}`);
    // Lines: g w1, h w2, a() w3. LOC = 3. Weighted = 6.
    expect(actual).toEqual({ weighted: 6, raw: 3 });
  });

  it("excludes the lines of a nested unit from depth and from LOC", () => {
    const actual = stats(`fn outer() {
  fn inner() {
    if x {
      hidden();
    }
  }
  shown();
}`);
    // Only shown() counts: w1. LOC = 1. Weighted = 1.
    expect(actual).toEqual({ weighted: 1, raw: 1 });
  });
});

describe("Rust Halstead rule rows (design 5.9)", () => {
  it("counts a string literal as one operand", () => {
    const actual = halstead('fn f() { let s = "a b + c"; }');
    // Operators: let = = 2 distinct, 2 total.
    // Operands: s and the whole string = 2 distinct, 2 total.
    expect(actual.detail).toEqual({ n1: 2, n2: 2, N1: 2, N2: 2 });
  });

  it("counts a raw string and a char literal as one operand each", () => {
    const actual = halstead("fn f() { g(r#\"x\"#, 'c'); }");
    // Operators: () = 1 distinct, 1 total.
    // Operands: g, the raw string, the char = 3 distinct, 3 total.
    expect(actual.detail).toEqual({ n1: 1, n2: 3, N1: 1, N2: 3 });
  });

  it("classifies the tokens of a macro token tree", () => {
    const actual = halstead('fn f() { println!("{}", x); }');
    // Operators: !() = 1 distinct, 1 total. The `,` in the token tree is structural.
    // Operands: println, the string, x = 3 distinct, 3 total.
    expect(actual.detail).toEqual({ n1: 1, n2: 3, N1: 1, N2: 3 });
  });

  it("counts closure tokens in the enclosing unit", () => {
    const actual = halstead("fn f() { let g = |x| x + 1; }");
    // Operators: let = closure + = 4 distinct, 4 total. The `|` tokens are structural.
    // Operands: g, x, x, 1 = 3 distinct, 4 total.
    expect(actual.detail).toEqual({ n1: 4, n2: 3, N1: 4, N2: 4 });
  });

  it("counts self and a field name as operands", () => {
    const actual = halstead("fn m(&self) -> i32 { self.x }");
    // Operators: . = 1 distinct, 1 total. The `&` of `&self` is parameter syntax,
    // not a reference expression. The `->` and the type are skipped.
    // Operands: self twice and x = 2 distinct, 3 total.
    expect(actual.detail).toEqual({ n1: 1, n2: 2, N1: 1, N2: 3 });
  });

  it("skips an attribute on a statement", () => {
    const plain = halstead("fn f() { let y = 1; }");
    const attributed = halstead("fn f() { #[allow(unused)] let y = 1; }");
    // The attribute item is skipped, so both vocabularies match.
    expect(attributed.detail).toEqual(plain.detail);
  });

  it("excludes every token of a nested unit", () => {
    // No operators: ( ) { } are structural. The nested unit adds no operator and no operand.
    expect(halstead("fn outer() { fn inner() { hidden(); } }").detail)
      .toEqual({ n1: 0, n2: 0, N1: 0, N2: 0 });
  });

  it("counts let, let-else, assignment and compound assignment", () => {
    const actual = halstead(
      "fn f(o: Option<i32>) { let Some(v) = o else { return; }; let mut x = v; x = 1; x += v; }",
    );
    // Operators: let x2, = x3 (2 let values, 1 assignment), else, return, += -> n1 = 5, N1 = 8.
    // `mut` is structural.
    // Operands: o Some v o x v x 1 x v -> n2 = 5, N2 = 10.
    expect(actual.detail).toEqual({ n1: 5, n2: 5, N1: 8, N2: 10 });
  });

  it("counts unary, dereference and reference operators", () => {
    const actual = halstead("fn f(x: i32) -> i32 { let p = &mut x; let q = &x; -*p + !*q }");
    // Operators: let x2, = x2, &mut, &, unary-, unary* x2, !, + -> n1 = 8, N1 = 11.
    // Operands: x p x q x p q -> n2 = 3, N2 = 7.
    expect(actual.detail).toEqual({ n1: 8, n2: 3, N1: 11, N2: 7 });
  });

  it("counts paths, ranges, struct expressions, ? and as", () => {
    const actual = halstead(
      "fn f() { let r = a::b::c(0..=9, ..n)?; let s = P { x: 1, y }; let k = g() as u8; }",
    );
    // Operators: let x3, = x3, :: x2, () x2, ..=, .., ?, struct{}, as -> n1 = 9, N1 = 15.
    // The struct name `P` and `u8` are type syntax.
    // Operands: r a b c 0 9 n s x 1 y k g -> n2 = 13, N2 = 13.
    expect(actual.detail).toEqual({ n1: 9, n2: 13, N1: 15, N2: 13 });
  });

  it("counts if let, match arms, a match guard, loops, closures and await", () => {
    const actual = halstead(`fn f(o: Option<i32>) {
  if let Some(v) = o { }
  match o { Some(1) if v => 2, _ => 3 };
  while x { }
  loop { break; }
  for i in xs { }
  let c = move |a| a;
  h.await;
}`);
    // Operators: if x2 (1 is the guard), let x2 (let_condition, let_declaration), match,
    // => x2, while, loop, for, in, =, closure, await -> n1 = 11, N1 = 14.
    // `move`, `break` and the `_` pattern are structural.
    // Operands: o Some v o o Some 1 v 2 3 x i xs c a a h -> n2 = 12, N2 = 17.
    expect(actual.detail).toEqual({ n1: 11, n2: 12, N1: 14, N2: 17 });
  });

  it("counts the && of a let chain", () => {
    const actual = halstead("fn f() { if let Some(v) = o && v > 1 { } }");
    // Operators: if let && > -> n1 = 4, N1 = 4.
    // Operands: Some v o v 1 -> n2 = 4, N2 = 5.
    expect(actual.detail).toEqual({ n1: 4, n2: 4, N1: 4, N2: 5 });
  });

  it("classifies operator tokens of a macro token tree by text", () => {
    const actual = halstead('fn f() { println!("{}", a.b + c::d && !e); }');
    // Operators: !() and the tokens . + :: && ! -> n1 = 6, N1 = 6. The `,` is structural.
    // Operands: println "{}" a b c d e -> n2 = 7, N2 = 7.
    expect(actual.detail).toEqual({ n1: 6, n2: 7, N1: 6, N2: 7 });
  });
});
