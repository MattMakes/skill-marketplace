import { beforeAll, describe, expect, it } from "vitest";

import {
  computePythonCyclomaticComplexity,
  computePythonEssentialComplexity,
  computePythonModuleDesignComplexity,
} from "../../../languages/python/controlFlow";
import { pythonBackend } from "../../../languages/python/index";
import { MetricKeys } from "../../../registry";
import {
  initSyntaxParsers,
  parseFixture,
  syntaxCtx,
} from "../syntaxTestUtils";
import type { CyclomaticWeights } from "../../../registry";

beforeAll(async () => {
  await initSyntaxParsers();
});

const body = (lines: string) =>
  "def f(a, b, c):\n" + lines.split("\n").map((l) => "    " + l).join("\n") + "\n";

function cc(src: string, weights?: CyclomaticWeights, index = 0): number {
  return computePythonCyclomaticComplexity(syntaxCtx("python", src, index).node, weights);
}
function ev(src: string, index = 0): number {
  return computePythonEssentialComplexity(syntaxCtx("python", src, index).node);
}
function iv(src: string, index = 0): number {
  return computePythonModuleDesignComplexity(syntaxCtx("python", src, index).node);
}

describe("computePythonCyclomaticComplexity", () => {
  it("is 1 for a straight-line function", () => {
    expect(cc(body("return a"))).toBe(1);
  });

  it("counts if, elif and ignores else", () => {
    // 1 + if + elif + elif = 4
    expect(cc(body("if a:\n    pass\nelif b:\n    pass\nelif c:\n    pass\nelse:\n    pass"))).toBe(4);
  });

  it("counts for, async for and while", () => {
    // 1 + for + async for + while = 4
    const src =
      "async def f(a):\n    for x in a:\n        pass\n    async for y in a:\n        pass\n    while a:\n        pass\n";
    expect(cc(src)).toBe(4);
  });

  it("counts a comprehension for_in_clause and if_clause", () => {
    // 1 + for + if = 3
    expect(cc(body("return [x for x in a if x]"))).toBe(3);
  });

  it("counts each clause of a nested comprehension", () => {
    // 1 + for + for + if = 4
    expect(cc(body("return {x: y for x in a for y in b if y}"))).toBe(4);
  });

  it("counts case clauses but not a guard-free wildcard", () => {
    // 1 + case 1 + case 2 = 3 ; `case _:` adds 0
    expect(cc(body("match a:\n    case 1:\n        pass\n    case 2:\n        pass\n    case _:\n        pass"))).toBe(3);
  });

  it("counts a case guard as an if and a guarded wildcard as a case", () => {
    // 1 + case(x) + guard if + case(_ if) + guard if = 5
    expect(cc(body("match a:\n    case x if b:\n        pass\n    case _ if c:\n        pass"))).toBe(5);
  });

  it("counts except and except*", () => {
    // 1 + except + except* = 3
    expect(
      cc(body("try:\n    pass\nexcept A:\n    pass\nexcept* B:\n    pass")),
    ).toBe(3);
  });

  it("counts and, or and not-free boolean operators", () => {
    // 1 + and + or + and = 4
    expect(cc(body("return a and b or c and not a"))).toBe(4);
  });

  it("counts a conditional expression", () => {
    // 1 + ternary = 2
    expect(cc(body("return a if b else c"))).toBe(2);
  });

  it("does not count with, assert, try, finally, return, break, continue, raise", () => {
    const src = body(
      "with a:\n    pass\nassert b\ntry:\n    pass\nfinally:\n    pass\nwhile 1:\n    break\nraise c",
    );
    // 1 + while = 2
    expect(cc(src)).toBe(2);
  });

  it("applies a weight override", () => {
    // 1 + if*5 + logicalAnd*2 = 8
    expect(cc(body("if a and b:\n    pass"), { if: 5, logicalAnd: 2 })).toBe(8);
  });

  it("skips a nested def", () => {
    const src = "def f(a):\n    def g(b):\n        if b:\n            pass\n    return a\n";
    // outer: 1 ; inner: 1 + if = 2
    expect(cc(src, undefined, 0)).toBe(1);
    expect(cc(src, undefined, 1)).toBe(2);
  });

  it("counts decisions inside a lambda", () => {
    // 1 + conditional_expression in lambda = 2
    expect(cc(body("return lambda x: 1 if x else 2"))).toBe(2);
  });
});

describe("computePythonEssentialComplexity", () => {
  it("is 1 for a function with no unstructured flow", () => {
    expect(ev(body("return a"))).toBe(1);
  });

  it("counts each continue", () => {
    // 1 + continue + continue = 3
    expect(ev(body("for x in a:\n    if x:\n        continue\n    continue"))).toBe(3);
  });

  it("does not count break (Python has no labels)", () => {
    expect(ev(body("while a:\n    break"))).toBe(1);
  });

  it("counts a raise under an if", () => {
    // 1 + raise = 2
    expect(ev(body("if a:\n    raise ValueError()"))).toBe(2);
  });

  it("counts a raise under a match", () => {
    // 1 + raise = 2
    expect(ev(body("match a:\n    case 1:\n        raise ValueError()"))).toBe(2);
  });

  it("does not count a raise outside a conditional", () => {
    expect(ev(body("raise ValueError()"))).toBe(1);
    // a raise in a plain try/except is not under a conditional either
    expect(ev(body("try:\n    pass\nexcept A:\n    raise"))).toBe(1);
  });

  it("counts early returns but not the textually last", () => {
    // 1 + 2 early = 3
    expect(ev(body("if a:\n    return 1\nif b:\n    return 2\nreturn 3"))).toBe(3);
  });

  it("does not count a single return", () => {
    expect(ev(body("if a:\n    x = 1\nreturn 2"))).toBe(1);
  });

  it("ignores returns and continues of a nested def", () => {
    const src =
      "def f(a):\n    def g(b):\n        if b:\n            return 1\n        return 2\n    return g\n";
    // outer: only 1 return -> 1 ; inner: 1 + 1 early = 2
    expect(ev(src, 0)).toBe(1);
    expect(ev(src, 1)).toBe(2);
  });
});

describe("computePythonModuleDesignComplexity", () => {
  it("is 1 when no branch holds a call", () => {
    // if / for / while / ternary / comprehension without calls
    const src = body(
      "if a:\n    pass\nfor x in b:\n    pass\nwhile c:\n    pass\ny = 1 if a else 2\nz = [i for i in b]",
    );
    expect(iv(src)).toBe(1);
  });

  it("counts an if with a call", () => {
    expect(iv(body("if a:\n    g()"))).toBe(2);
  });

  it("counts a call in the condition", () => {
    expect(iv(body("if g(a):\n    pass"))).toBe(2);
  });

  it("counts for and while with a call", () => {
    // 1 + for + while = 3
    expect(iv(body("for x in a:\n    g(x)\nwhile b:\n    h()"))).toBe(3);
  });

  it("counts match with a call", () => {
    // 1 + match = 2
    expect(iv(body("match a:\n    case 1:\n        g()"))).toBe(2);
  });

  it("counts a ternary with a call", () => {
    expect(iv(body("return g() if a else 1"))).toBe(2);
  });

  it("counts each comprehension kind with a call", () => {
    // 1 + list + set + dict + generator = 5
    const src = body(
      "w = [g(x) for x in a]\nx = {g(x) for x in a}\ny = {x: g(x) for x in a}\nz = (g(x) for x in a)",
    );
    expect(iv(src)).toBe(5);
  });

  it("counts nested branches separately", () => {
    // 1 + if + for = 3
    expect(iv(body("if a:\n    for x in b:\n        g(x)"))).toBe(3);
  });

  it("skips a nested def in both walks", () => {
    const src = "def f(a):\n    def g():\n        if a:\n            h()\n    if a:\n        pass\n";
    // outer: if without call (the call is in the nested def) = 1
    expect(iv(src, 0)).toBe(1);
    expect(iv(src, 1)).toBe(2);
  });
});

describe("pythonBackend", () => {
  const SRC = [
    "def simple(a):",
    "    return a",
    "",
    "class K:",
    "    def busy(self, a, b):",
    "        for x in a:",
    "            if x and b:",
    "                continue",
    "            g(x)",
    "        return b",
    "",
    "async def risky(a):",
    "    if a:",
    "        raise ValueError()",
    "    return [g(i) for i in a if i]",
    "",
  ].join("\n");

  it("extracts functions and computes the control-flow metrics", () => {
    const file = parseFixture("python", SRC);
    const fns = pythonBackend.extractFunctions(file);
    expect(fns.map((f) => f.name)).toEqual(["simple", "K.busy", "risky"]);

    const run = (key: string, i: number) => {
      const compute = pythonBackend.metrics[key as keyof typeof pythonBackend.metrics];
      const r = compute!({
        language: "python",
        node: fns[i].node,
        file,
        options: {},
        dependencyValues: {},
      });
      return typeof r === "number" ? r : r.value;
    };

    // simple: cc 1, ev 1, iv 1
    expect(run(MetricKeys.cyclomaticComplexity, 0)).toBe(1);
    expect(run(MetricKeys.essentialComplexity, 0)).toBe(1);
    expect(run(MetricKeys.moduleDesignComplexity, 0)).toBe(1);

    // busy: cc 1 + for + if + and = 4 ; ev 1 + continue + early return? only 1 return -> 2
    // iv: for holds call g -> 2 ; if holds no call -> 2
    expect(run(MetricKeys.cyclomaticComplexity, 1)).toBe(4);
    expect(run(MetricKeys.essentialComplexity, 1)).toBe(2);
    expect(run(MetricKeys.moduleDesignComplexity, 1)).toBe(2);

    // risky: cc 1 + if + comp for + comp if = 4 ; ev 1 + raise under if = 2 (1 return, no early return)
    // iv: 1 + if (holds the call ValueError()) + list_comprehension (holds g) = 3
    expect(run(MetricKeys.cyclomaticComplexity, 2)).toBe(4);
    expect(run(MetricKeys.essentialComplexity, 2)).toBe(2);
    expect(run(MetricKeys.moduleDesignComplexity, 2)).toBe(3);
  });
});
