import { beforeAll, describe, expect, it } from "vitest";

import {
  rustScopeDepthRatio,
  rustScopeDepthWeightedLoc,
} from "../../../languages/rust/operations";
import { countRustLoc } from "../../../languages/rust/operations.scopeDepth";
import { initSyntaxParsers, syntaxCtx } from "../syntaxTestUtils";

beforeAll(async () => initSyntaxParsers());

function stats(source: string): { weighted: number; raw: number } {
  const ctx = syntaxCtx("rust", source);
  return { weighted: rustScopeDepthWeightedLoc(ctx), raw: countRustLoc(ctx) };
}

describe("Rust line depth is the maximum, not the sum (F2)", () => {
  it("gives sibling one-line blocks depth 1", () => {
    const source = `fn s1(a: bool) -> i32 {
    let y = if a { 1 } else { 2 };
    y
}`;
    // Lines: let y w2 (2 sibling blocks, depth 1), y w1. LOC = 2. Weighted = 3.
    expect(stats(source)).toEqual({ weighted: 3, raw: 2 });
    expect(rustScopeDepthRatio(syntaxCtx("rust", source))).toBe(1.5);
  });

  it("gives a one-line closure with an if-else depth 2", () => {
    const source = `fn f(v: Vec<i32>) -> bool {
    v.iter().any(|x| if *x > 0 { true } else { false })
}`;
    // 1 counted line. The closure body is level 1 and its blocks are level 2.
    // Depth 2, so weighted = 3. LOC = 1.
    expect(stats(source)).toEqual({ weighted: 3, raw: 1 });
  });

  it("gives a one-line if / else if / else chain depth 1", () => {
    const source = `fn f(a: bool, b: bool) -> i32 {
    if a { 1 } else if b { 2 } else { 3 }
}`;
    // 1 counted line with 3 sibling blocks. Depth 1, so weighted = 2. LOC = 1.
    expect(stats(source)).toEqual({ weighted: 2, raw: 1 });
  });

  it("still adds a level for a block that is nested in a block on one line", () => {
    const source = `fn f(a: bool, b: bool) {
    if a { if b { g(); } }
}`;
    // 1 counted line. The inner block is level 2, so weighted = 3. LOC = 1.
    expect(stats(source)).toEqual({ weighted: 3, raw: 1 });
  });
});

describe("Rust brace-only lines include a trailing comma (F6)", () => {
  it("does not count `},` after a match arm block", () => {
    const source = `fn l1(x: i32) -> i32 {
    match x {
        1 => {
            foo();
        },
        _ => 0,
    }
}`;
    // Counted: match x { w1, 1 => { w2, foo(); w3, _ => 0, w3.
    // The `},` and `}` lines are brace-only. LOC = 4. Weighted = 1+2+3+3 = 9.
    expect(stats(source)).toEqual({ weighted: 9, raw: 4 });
  });

  it("does not count `};` or `},` that closes a struct literal", () => {
    const source = `fn f() {
    let a = A {
        x: 1,
    };
    let b = [
        B {
            y: 2,
        },
    ];
}`;
    // Counted: let a, x: 1, let b, B {, y: 2, `];`. LOC = 6.
    // The `};` and `},` lines are brace-only. The `];` line is not.
    expect(countRustLoc(syntaxCtx("rust", source))).toBe(6);
  });
});

describe("Rust nested unit attributes are not outer lines (F10)", () => {
  it("excludes the attribute line of a nested fn", () => {
    const source = `fn n1() {
    let a = 1;
    #[inline]
    fn inner() {
        let b = 2;
    }
    let c = 3;
}`;
    // Counted: let a, let c. The attribute and the nested fn are excluded.
    expect(stats(source)).toEqual({ weighted: 2, raw: 2 });
  });

  it("excludes several attributes with a comment between them", () => {
    const source = `fn n2() {
    let a = 1;
    #[inline]
    // note
    #[allow(dead_code)]
    fn inner() {}
    let c = 3;
}`;
    // Counted: let a, let c. LOC = 2.
    expect(countRustLoc(syntaxCtx("rust", source))).toBe(2);
  });

  it("keeps the attribute of a statement that is not a nested fn", () => {
    const source = `fn n3() {
    #[allow(unused)]
    let a = 1;
}`;
    // Counted: the attribute line and let a. LOC = 2.
    expect(countRustLoc(syntaxCtx("rust", source))).toBe(2);
  });
});

describe("Rust multi-line string literals hold no brace-only lines (F13)", () => {
  it("counts a `}` line inside a string literal", () => {
    const source = `fn s6() -> &'static str {
    let s = "
}
";
    s
}`;
    // Counted: let s = ", the `}` string line, the closing `";` line, s. LOC = 4.
    expect(stats(source)).toEqual({ weighted: 4, raw: 4 });
  });

  it("counts brace lines inside a raw string literal", () => {
    const source = `fn s7() -> &'static str {
    let s = r#"
{
}
"#;
    s
}`;
    // Counted: let s = r#", `{`, `}`, `"#;`, s. LOC = 5.
    expect(countRustLoc(syntaxCtx("rust", source))).toBe(5);
  });

  it("counts a brace line inside a string literal in a macro call", () => {
    const source = `fn s9() {
    println!("
}
");
}`;
    // Counted: println!(", the `}` string line, the closing `");` line. LOC = 3.
    expect(countRustLoc(syntaxCtx("rust", source))).toBe(3);
  });

  it("still drops a brace-only line outside a string literal", () => {
    const source = `fn s8() {
    let s = "a";
    if s.is_empty() {
        g();
    }
}`;
    // Counted: let s, if header, g(). The `}` line is brace-only. LOC = 3.
    expect(countRustLoc(syntaxCtx("rust", source))).toBe(3);
  });
});
