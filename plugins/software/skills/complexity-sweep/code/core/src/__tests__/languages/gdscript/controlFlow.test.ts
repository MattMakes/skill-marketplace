import { beforeAll, describe, expect, it } from "vitest";

import {
  computeGdscriptCyclomaticComplexity,
  computeGdscriptEssentialComplexity,
  computeGdscriptModuleDesignComplexity,
} from "../../../languages/gdscript/controlFlow";
import { gdscriptBackend } from "../../../languages/gdscript/index";
import { MetricKeys } from "../../../registry";
import type { CyclomaticWeights } from "../../../registry";
import { initSyntaxParsers, parseFixture, syntaxCtx } from "../syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

// Wrap statements in `func f(a, b, c):` with tab indentation.
const body = (lines: string) =>
  "func f(a, b, c):\n" +
  lines
    .split("\n")
    .map((l) => "\t" + l)
    .join("\n") +
  "\n";

function check(src: string): string {
  expect(parseFixture("gdscript", src).tree.rootNode.hasError).toBe(false);
  return src;
}
function cc(src: string, weights?: CyclomaticWeights, index = 0): number {
  return computeGdscriptCyclomaticComplexity(
    syntaxCtx("gdscript", check(src), index).node,
    weights,
  );
}
function ev(src: string, index = 0): number {
  return computeGdscriptEssentialComplexity(syntaxCtx("gdscript", check(src), index).node);
}
function mdc(src: string, index = 0): number {
  return computeGdscriptModuleDesignComplexity(syntaxCtx("gdscript", check(src), index).node);
}

describe("computeGdscriptCyclomaticComplexity", () => {
  it("is 1 for a straight-line function", () => {
    expect(cc(body("return a"))).toBe(1);
  });

  it("counts if and elif, and ignores else", () => {
    // 1 + if + elif + elif = 4
    expect(
      cc(body("if a:\n\tpass\nelif b:\n\tpass\nelif c:\n\tpass\nelse:\n\tpass")),
    ).toBe(4);
  });

  it("counts for and while", () => {
    // 1 + for + while = 3
    expect(cc(body("for x in a:\n\tpass\nwhile b:\n\tpass"))).toBe(3);
  });

  it("counts a match section per pattern section", () => {
    // 1 + 2 sections (1, 2 counts once; 3) = 3; the `_` default does not count
    expect(
      cc(body("match a:\n\t1, 2:\n\t\tpass\n\t3:\n\t\tpass\n\t_:\n\t\tpass")),
    ).toBe(3);
  });

  it("counts a lone binding section as a case (D3)", () => {
    // 1 + `var x:` = 2
    expect(cc(body("match a:\n\tvar x:\n\t\tpass"))).toBe(2);
  });

  it("counts a guarded wildcard section and its guard", () => {
    // 1 + section + guard (if) = 3
    expect(cc(body("match a:\n\tvar k when k > 1:\n\t\tpass"))).toBe(3);
  });

  it("counts and, or, && and ||", () => {
    // 1 + and + or + && + or + || = 6
    expect(cc(body("return (a and b) or (b && c) or a || c"))).toBe(6);
  });

  it("counts and and && as logicalAnd, or and || as logicalOr", () => {
    // 1 + and + && = 3 with and-weight 1
    expect(cc(body("return a and b && c"))).toBe(3);
    // 1 + or + || = 3
    expect(cc(body("return a or b || c"))).toBe(3);
  });

  it("counts a conditional expression as ternary", () => {
    // 1 + ternary = 2
    expect(cc(body("return 1 if a else 2"))).toBe(2);
  });

  it("does not count not, assert, await, return, break, continue, pass", () => {
    // 1 (nothing counts)
    expect(
      cc(body("assert(a)\nvar x = not b\nawait c\nbreakpoint\nreturn x")),
    ).toBe(1);
  });

  it("does not count break and continue", () => {
    // 1 + for + for = 3 (continue and break add nothing)
    expect(cc(body("for x in a:\n\tcontinue\nfor y in b:\n\tbreak"))).toBe(3);
  });

  it("applies weight overrides", () => {
    // 1 + if*5 + and*3 = 9
    expect(cc(body("if a and b:\n\tpass"), { if: 5, logicalAnd: 3 })).toBe(9);
  });

  it("skips a nested unit (an inner-class method)", () => {
    // outer unit: class holds a method with `if`; the walk of an accessor-owning
    // variable skips the accessor body. Unit 0 is the accessor-free `outer`.
    const src =
      "func outer(a):\n\tif a:\n\t\tpass\n\nclass K:\n\tfunc inner(a):\n\t\tif a:\n\t\t\tpass\n\t\tif a:\n\t\t\tpass\n";
    // outer: 1 + if = 2; inner: 1 + 2 = 3
    expect(cc(src, undefined, 0)).toBe(2);
    expect(cc(src, undefined, 1)).toBe(3);
  });

  it("counts decisions in a lambda as part of the unit", () => {
    // 1 + lambda's `if` = 2
    expect(cc(body("var f = func(x):\n\tif x:\n\t\treturn 1\n\treturn 0\nreturn f"))).toBe(2);
  });
});

describe("computeGdscriptEssentialComplexity", () => {
  it("is 1 for a function with a single return", () => {
    expect(ev(body("return a"))).toBe(1);
  });

  it("counts each continue", () => {
    // 1 + 2 continue = 3
    expect(ev(body("for x in a:\n\tcontinue\nfor y in b:\n\tcontinue"))).toBe(3);
  });

  it("does not count break", () => {
    // 1
    expect(ev(body("for x in a:\n\tbreak"))).toBe(1);
  });

  it("counts every return except the last one that ends", () => {
    // 3 returns: 1 + 2 early = 3
    expect(
      ev(body("if a:\n\treturn 1\nif b:\n\treturn 2\nreturn 3")),
    ).toBe(3);
  });

  it("does not count a return inside a lambda (D4)", () => {
    // outer has 1 return (the lambda's is ignored): 1
    expect(ev(body("var f = func(x):\n\treturn x\nreturn f"))).toBe(1);
  });

  it("counts a continue inside a lambda", () => {
    // 1 + continue = 2
    expect(ev(body("var f = func(xs):\n\tfor x in xs:\n\t\tcontinue\nreturn f"))).toBe(2);
  });

  it("combines continue and early returns", () => {
    // 1 + continue + 1 early return = 3
    expect(
      ev(body("for x in a:\n\tif x:\n\t\tcontinue\n\treturn 1\nreturn 2")),
    ).toBe(3);
  });
});

describe("computeGdscriptModuleDesignComplexity", () => {
  it("is 1 with no branch", () => {
    expect(mdc(body("return foo()"))).toBe(1);
  });

  it("counts an if that holds a call", () => {
    // 1 + if = 2
    expect(mdc(body("if a:\n\tfoo()"))).toBe(2);
  });

  it("does not count an if without a call", () => {
    // 1
    expect(mdc(body("if a:\n\tvar x = 1"))).toBe(1);
  });

  it("counts for and while that hold a call", () => {
    // 1 + for + while = 3
    expect(mdc(body("for x in a:\n\tfoo()\nwhile b:\n\tbar()"))).toBe(3);
  });

  it("does not count for and while without a call", () => {
    // 1
    expect(mdc(body("for x in a:\n\tpass\nwhile b:\n\tpass"))).toBe(1);
  });

  it("counts a match with a method call and not one without", () => {
    // 1 + match(with call) = 2
    expect(mdc(body("match a:\n\t1:\n\t\tb.go()"))).toBe(2);
    // 1
    expect(mdc(body("match a:\n\t1:\n\t\tpass"))).toBe(1);
  });

  it("counts a conditional expression with a call and not one without", () => {
    // 1 + ternary = 2
    expect(mdc(body("return foo() if a else 1"))).toBe(2);
    // 1
    expect(mdc(body("return 2 if a else 1"))).toBe(1);
  });

  it("treats base_call and get_node as calls (D5)", () => {
    // 1 + if(base_call) + if(get_node) = 3
    expect(mdc(body("if a:\n\t.foo()\nif b:\n\tvar n = $Node"))).toBe(3);
  });

  it("counts nested branches separately", () => {
    // 1 + outer if + inner if = 3
    expect(mdc(body("if a:\n\tif b:\n\t\tfoo()"))).toBe(3);
  });
});

describe("gdscriptBackend control-flow metrics", () => {
  it("extracts 3 functions and computes the 3 metrics", () => {
    const src = [
      "var hp = 1:",
      "\tget:",
      "\t\treturn hp",
      "",
      "func run(a, b):",
      "\tfor x in a:",
      "\t\tif x and b:",
      "\t\t\tcontinue",
      "\t\tprint(x)",
      "\treturn 1",
      "",
      "class K:",
      "\tfunc go(a):",
      "\t\tif a:",
      "\t\t\treturn 1",
      "\t\treturn 2",
      "",
    ].join("\n");
    const file = parseFixture("gdscript", src);
    const fns = gdscriptBackend.extractFunctions(file);
    expect(fns.map((f) => f.name)).toEqual(["hp.get", "run", "K.go"]);
    const run = (index: number, key: (typeof MetricKeys)[keyof typeof MetricKeys]) => {
      const compute = gdscriptBackend.metrics[key];
      const ctx = syntaxCtx("gdscript", src, index);
      const result = compute?.(ctx);
      return typeof result === "number" ? result : result?.value;
    };
    const cyclomatic = MetricKeys.cyclomaticComplexity;
    const essential = MetricKeys.essentialComplexity;
    const design = MetricKeys.moduleDesignComplexity;
    // hp.get: CC 1, EV 1, MDC 1
    expect([cyclomatic, essential, design].map((k) => run(0, k))).toEqual([1, 1, 1]);
    // run: CC 1 + for + if + and = 4; EV 1 + continue = 2 (1 return); MDC 1 + for (holds print) = 2
    expect([cyclomatic, essential, design].map((k) => run(1, k))).toEqual([4, 2, 2]);
    // K.go: CC 1 + if = 2; EV 1 + 1 early return = 2; MDC 1 (no call)
    expect([cyclomatic, essential, design].map((k) => run(2, k))).toEqual([2, 2, 1]);
  });
});
