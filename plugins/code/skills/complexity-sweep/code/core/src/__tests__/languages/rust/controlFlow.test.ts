import { beforeAll, describe, expect, it } from "vitest";

import {
  computeRustCyclomaticComplexity,
  computeRustEssentialComplexity,
  computeRustModuleDesignComplexity,
} from "../../../languages/rust/controlFlow";
import { rustBackend } from "../../../languages/rust";
import { MetricKeys } from "../../../registry";
import {
  functionNodes,
  initSyntaxParsers,
  parseFixture,
  syntaxCtx,
} from "../syntaxTestUtils";

beforeAll(async () => initSyntaxParsers());

function firstFunction(source: string) {
  const node = functionNodes(parseFixture("rust", source))[0];
  if (node === undefined) throw new Error("fixture has no Rust function");
  return node;
}

function cc(source: string): number {
  return computeRustCyclomaticComplexity(firstFunction(source));
}

function ev(source: string): number {
  return computeRustEssentialComplexity(firstFunction(source));
}

function iv(source: string): number {
  return computeRustModuleDesignComplexity(firstFunction(source));
}

describe("computeRustCyclomaticComplexity", () => {
  it("starts at one", () => {
    // 1 baseline.
    expect(cc("fn empty() {}")).toBe(1);
  });

  it("counts if, if let, else-if, and not a final else", () => {
    const source = `fn f(value: Option<i32>, flag: bool) {
      if flag {} else if flag {} else {}
      if let Some(_) = value {}
    }`;
    // 1 baseline + 1 if + 1 else-if + 1 if-let.
    expect(cc(source)).toBe(4);
  });

  it("counts for, while, and while-let", () => {
    const source = `fn f(values: Vec<i32>, mut iter: Iter) {
      for value in values {}
      while iter.ready() {}
      while let Some(value) = iter.next() {}
    }`;
    // 1 baseline + 1 for + 2 while constructs.
    expect(cc(source)).toBe(4);
  });

  it("counts match arms except a guard-free wildcard and counts guards", () => {
    const source = `fn f(value: i32) {
      match value {
        0 => zero(),
        n if n > 0 => positive(),
        _ if fallback() => guarded_fallback(),
        _ => other(),
      }
    }`;
    // 1 baseline + 3 non-default arms + 2 guards.
    expect(cc(source)).toBe(6);
  });

  it("counts let-else", () => {
    // 1 baseline + 1 let-else.
    expect(cc("fn f(value: Option<i32>) { let Some(x) = value else { return; }; }"))
      .toBe(2);
  });

  it("counts logical operators and each conjunction in a let-chain", () => {
    const source = `fn f(a: bool, b: bool, c: bool, value: Option<i32>) {
      let _ = (a && b) || c;
      if let Some(x) = value && x > 0 && a {}
    }`;
    // 1 baseline + 1 if + 3 logical-and + 1 logical-or.
    expect(cc(source)).toBe(6);
  });

  it("counts the try operator", () => {
    // 1 baseline + 2 try operators.
    expect(cc("fn f() -> Result<i32, E> { let x = one()?; two(x)? }"))
      .toBe(3);
  });

  it("does not count excluded constructs", () => {
    const source = `fn f() {
      loop { break; }
      assert!(true);
      continue;
      return;
    }`;
    // 1 baseline; loop, macros, break, continue, and return add 0.
    expect(cc(source)).toBe(1);
  });

  it("supports weight overrides while unspecified weights stay at one", () => {
    const node = firstFunction("fn f(a: bool) { if a { for x in 0..1 {} } }");
    // 1 baseline + weighted if 3 + default for 1.
    expect(computeRustCyclomaticComplexity(node, { if: 3 })).toBe(5);
  });

  it("skips nested units", () => {
    const source = `fn outer() {
      fn inner() { if true {} }
    }`;
    // 1 baseline; the nested function's if is excluded.
    expect(cc(source)).toBe(1);
  });

  it("includes closures", () => {
    const source = "fn outer() { let closure = || { if true {} }; }";
    // 1 baseline + 1 if inside the closure.
    expect(cc(source)).toBe(2);
  });
});

describe("computeRustEssentialComplexity", () => {
  it("starts at one for structured flow", () => {
    // 1 baseline.
    expect(ev("fn f(flag: bool) { if flag { work(); } }")).toBe(1);
  });

  it("counts continue expressions", () => {
    // 1 baseline + 1 continue.
    expect(ev("fn f() { loop { continue; } }")) .toBe(2);
  });

  it("counts labeled breaks but not unlabeled breaks", () => {
    const source = "fn f() { 'outer: loop { loop { break 'outer; } break; } }";
    // 1 baseline + 1 labeled break.
    expect(ev(source)).toBe(2);
  });

  it("counts designated panic macros inside if and match", () => {
    const source = `fn f(value: i32) {
      if value < 0 { panic!("negative"); }
      match value { 0 => unreachable!(), _ => value }
      if value > 10 { todo!(); unimplemented!(); }
    }`;
    // 1 baseline + 4 designated panic macros inside conditionals.
    expect(ev(source)).toBe(5);
  });

  it("does not count an unconditional panic macro", () => {
    // 1 baseline; the panic has no conditional ancestor.
    expect(ev("fn f() { panic!(\"always\"); }")).toBe(1);
  });

  it("applies the textual-last rule when the body has no non-return tail", () => {
    const source = `fn f(value: i32) -> i32 {
      if value < 0 { return -1; }
      if value == 0 { return 0; }
      return 1
    }`;
    // 1 baseline + 2 returns before the textually last return.
    expect(ev(source)).toBe(3);
  });

  it("counts every return before a non-return tail expression", () => {
    const source = `fn f(value: i32) -> i32 {
      if value < 0 { return -1; }
      value
    }`;
    // 1 baseline + 1 return before the non-return tail expression.
    expect(ev(source)).toBe(2);
  });

  it("treats a final match without a semicolon as a tail expression", () => {
    const source = "fn f(x: i32) -> i32 { if x < 0 { return 0; } match x { 1 => 2, _ => 3 } }";
    // 1 baseline + 1 early return before the block-like match tail.
    expect(ev(source)).toBe(2);
  });

  it("treats a final if-else without a semicolon as a tail expression", () => {
    const source = "fn f(x: i32) -> i32 { if x < 0 { return 0; } if x > 9 { 9 } else { x } }";
    // 1 baseline + 1 early return before the block-like if tail.
    expect(ev(source)).toBe(2);
  });

  it("treats a final loop and a final bare block as tail expressions", () => {
    // 1 baseline + 1 early return before the loop tail.
    expect(ev("fn f(x: i32) -> i32 { if x < 0 { return 0; } loop { break 5; } }")).toBe(2);
    // 1 baseline + 1 early return before the block tail.
    expect(ev("fn f(x: i32) -> i32 { if x < 0 { return 0; } { x + 1 } }")).toBe(2);
  });

  it("keeps a plain value tail expression", () => {
    // 1 baseline + 1 early return before the value tail.
    expect(ev("fn f(x: i32) -> i32 { if x < 0 { return 0; } x + 1 }")).toBe(2);
  });

  it("does not use the tail rule without a return type", () => {
    // 1 baseline; the for loop is a statement in a unit with no return type,
    // and the sole return is not early under the textual-last rule.
    expect(ev("fn f() { if a { return; } for x in y { g(x); } }")).toBe(1);
  });

  it("does not treat a final block-like statement with a semicolon as a tail", () => {
    // 1 baseline; the final `;` ends the expression statement, so there is no
    // tail. The sole return is textually last.
    expect(ev("fn f(x: i32) -> i32 { if x < 0 { return 0; } match x { _ => 3 }; }")).toBe(1);
  });

  it("does not count a sole return when there is no non-return tail", () => {
    // 1 baseline; one return is not early under the textual-last rule.
    expect(ev("fn f() -> i32 { return 1; }")) .toBe(1);
  });

  it("does not count the try operator", () => {
    // 1 baseline; ? does not contribute to essential complexity.
    expect(ev("fn f() -> Result<i32, E> { one()? }")) .toBe(1);
  });

  it("skips nested units and includes closures", () => {
    const source = `fn outer() {
      fn inner() { continue; }
      let closure = || { continue; };
    }`;
    // 1 baseline + 1 continue inside the closure.
    expect(ev(source)).toBe(2);
  });
});

describe("computeRustModuleDesignComplexity", () => {
  const branches = [
    ["if", "if flag { call(); }", "if flag { 1; }"],
    ["for", "for x in values { call(); }", "for x in values { x; }"],
    ["while", "while flag { call(); }", "while flag { flag = false; }"],
    ["loop", "loop { call(); break; }", "loop { break; }"],
    ["match", "match value { _ => call() }", "match value { _ => 0 }"],
  ] as const;

  it.each(branches)("counts a %s branch with a call", (_name, withCall) => {
    // 1 baseline + 1 branch whose subtree contains a call.
    expect(iv(`fn f() { ${withCall} }`)).toBe(2);
  });

  it.each(branches)(
    "does not count a %s branch without a call",
    (_name, _withCall, withoutCall) => {
      // 1 baseline; the branch subtree has no call.
      expect(iv(`fn f() { ${withoutCall} }`)).toBe(1);
    },
  );

  it("counts method calls and macro invocations", () => {
    const source = `fn f(flag: bool) {
      if flag { value.method(); }
      while flag { println!("work"); }
    }`;
    // 1 baseline + 2 branches with calls.
    expect(iv(source)).toBe(3);
  });

  it("skips nested units and includes closures", () => {
    const source = `fn outer(flag: bool) {
      if flag { fn inner() { call(); } }
      loop { let closure = || call(); break; }
    }`;
    // 1 baseline + 1 loop whose closure contains a call.
    expect(iv(source)).toBe(2);
  });
});

describe("rustBackend control-flow integration", () => {
  it("extracts three functions and computes the three control-flow metrics", () => {
    const file = parseFixture(
      "rust",
      `
fn plain() {}
fn branch(flag: bool) { if flag { call(); } }
fn early(flag: bool) -> i32 { if flag { return 1; } 0 }
`,
    );
    const functions = rustBackend.extractFunctions(file);
    expect(functions.map(({ name }) => name)).toEqual(["plain", "branch", "early"]);

    const metrics = [
      rustBackend.metrics[MetricKeys.cyclomaticComplexity],
      rustBackend.metrics[MetricKeys.essentialComplexity],
      rustBackend.metrics[MetricKeys.moduleDesignComplexity],
    ];
    const values = functions.map((fn) => metrics.map((compute) => {
      if (compute === undefined) throw new Error("Rust metric is not registered");
      return compute({
        language: "rust",
        node: fn.node,
        file,
        options: {},
        dependencyValues: {},
      });
    }));

    // plain: three baselines. branch: if adds CC and its call adds MDC.
    // early: if adds CC and the return before a tail expression adds EV.
    expect(values).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [2, 2, 1],
    ]);
  });

  it("reads cyclomatic weights from the metric context", () => {
    const compute = rustBackend.metrics[MetricKeys.cyclomaticComplexity];
    if (compute === undefined) throw new Error("Rust cyclomatic metric is not registered");
    // 1 baseline + weighted if 4.
    expect(compute(syntaxCtx("rust", "fn f(flag: bool) { if flag {} }", 0, {
      weights: { cyclomaticComplexity: { if: 4 } },
    }))).toBe(5);
  });
});
