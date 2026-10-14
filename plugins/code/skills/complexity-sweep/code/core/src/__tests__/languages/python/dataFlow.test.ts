import { beforeAll, describe, expect, it } from "vitest";

import {
  buildPythonDefUse,
  pythonGlobalDataComplexity,
  pythonPeakLiveVariables,
  pythonSpecifiedDataComplexity,
  pythonVariableSpan,
} from "../../../languages/python/dataFlow";
import type { SyntaxMetricCompute } from "../../../languages/types";
import { initSyntaxParsers, syntaxCtx } from "../syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

/** Joins source lines. Line 1 is the first argument. */
function src(...lines: string[]): string {
  return lines.join("\n") + "\n";
}

function defUse(text: string, index = 0) {
  return buildPythonDefUse(syntaxCtx("python", text, index).node);
}

function names(text: string, index = 0): string[] {
  return defUse(text, index).map((e) => e.name);
}

function run(compute: SyntaxMetricCompute, text: string, index = 0): number {
  const result = compute(syntaxCtx("python", text, index));
  return typeof result === "number" ? result : result.value;
}

describe("buildPythonDefUse: entry kinds", () => {
  it("records every parameter form and assignment target leaf", () => {
    const text = src(
      "def f(a, b=1, *args, c: int, d: int = 2, **kw):",
      "    x = 1",
      "    p, (q, *r) = t",
      "    [s, u] = t",
      "    n: int",
      "    m: int = 2",
      "    o.attr = 3",
      "    z += 1",
    );
    // Hand count: 6 parameters on line 1; x(2); p, q, r(3); s, u(4); n(5); m(6); z(8).
    // `o.attr = 3` binds nothing; `t` and `o` are free names.
    expect(defUse(text)).toEqual([
      { name: "a", defLine: 1, lastUseLine: 1 },
      { name: "b", defLine: 1, lastUseLine: 1 },
      { name: "args", defLine: 1, lastUseLine: 1 },
      { name: "c", defLine: 1, lastUseLine: 1 },
      { name: "d", defLine: 1, lastUseLine: 1 },
      { name: "kw", defLine: 1, lastUseLine: 1 },
      { name: "x", defLine: 2, lastUseLine: 2 },
      { name: "p", defLine: 3, lastUseLine: 3 },
      { name: "q", defLine: 3, lastUseLine: 3 },
      { name: "r", defLine: 3, lastUseLine: 3 },
      { name: "s", defLine: 4, lastUseLine: 4 },
      { name: "u", defLine: 4, lastUseLine: 4 },
      { name: "n", defLine: 5, lastUseLine: 5 },
      { name: "m", defLine: 6, lastUseLine: 6 },
      { name: "z", defLine: 8, lastUseLine: 8 },
    ]);
  });

  it("records for, with, except, walrus, comprehension, import and lambda bindings", () => {
    const text = src(
      "def f():",
      "    for i, j in items:",
      "        pass",
      "    with open(p) as fh, g() as (k, l):",
      "        pass",
      "    try:",
      "        pass",
      "    except E as err:",
      "        pass",
      "    if (w := 1) > 0:",
      "        pass",
      "    r = [v for v in xs]",
      "    import os.path, sys as system",
      "    from m import a, b as bb",
      "    from n import *",
      "    h = lambda lp, lq=1, *lr, **lk: lp",
    );
    // Hand count, in source order: i, j(2); fh, k, l(4); err(8); w(10); r, v(12);
    // os, system(13); a, bb(14); nothing for `import *`(15); h, lp, lq, lr, lk(16).
    expect(names(text)).toEqual([
      "i", "j", "fh", "k", "l", "err", "w", "r", "v",
      "os", "system", "a", "bb", "h", "lp", "lq", "lr", "lk",
    ]);
    const lines = Object.fromEntries(defUse(text).map((e) => [e.name, e.defLine]));
    expect(lines).toMatchObject({ i: 2, fh: 4, err: 8, w: 10, v: 12, os: 13, bb: 14, lk: 16 });
  });

  it("records match case captures, but not class names, keywords or value patterns", () => {
    const text = src(
      "def f(cmd):",
      "    match cmd:",
      "        case [x, *rest]:",
      "            pass",
      "        case Point(y=yy) as pt:",
      "            pass",
      "        case Color.RED | _:",
      "            pass",
    );
    // Hand count: cmd(1); x, rest(3); yy, pt(5). Not: Point, y, Color, RED, _.
    expect(names(text)).toEqual(["cmd", "x", "rest", "yy", "pt"]);
  });

  it("keeps the first binding of a name and extends it with later writes and reads", () => {
    const text = src(
      "def f():",
      "    x = 1",
      "    x = 2",
      "    print(x)",
    );
    // Hand count: 1 entry x, defLine 2; the read on line 4 gives lastUseLine 4.
    expect(defUse(text)).toEqual([{ name: "x", defLine: 2, lastUseLine: 4 }]);
  });

  it("does not record global or nonlocal names; nonlocal uses extend the outer entry", () => {
    const text = src(
      "def outer():",
      "    total = 0",
      "    def inner():",
      "        nonlocal total",
      "        global G",
      "        total = 1",
      "        G = 2",
      "        local = 3",
      "    return inner",
    );
    // Hand count, inner: only `local`(8). `total` and `G` are declared outside.
    expect(defUse(text, 1)).toEqual([{ name: "local", defLine: 8, lastUseLine: 8 }]);
    // Hand count, outer: total(2); inner does not bind it, so lines 4 and 6 resolve
    // to outer: lastUseLine 6. `inner` is a def name, not an entry.
    expect(defUse(text, 0)).toEqual([{ name: "total", defLine: 2, lastUseLine: 6 }]);
  });

  it("excludes self and cls of a method, and skips attribute and keyword names", () => {
    const text = src(
      "class C:",
      "    def m(self, a):",
      "        x = self.a",
      "        return f(a=1)",
      "    @classmethod",
      "    def k(cls, b):",
      "        return b",
      "def free(self):",
      "    return self",
    );
    // Hand count, m: a(2) and x(3). `self.a` and `a=1` are not uses of a: lastUseLine 2.
    expect(defUse(text, 0)).toEqual([
      { name: "a", defLine: 2, lastUseLine: 2 },
      { name: "x", defLine: 3, lastUseLine: 3 },
    ]);
    // Hand count, k (decorated method): b(6), used on line 7. cls is excluded.
    expect(defUse(text, 1)).toEqual([{ name: "b", defLine: 6, lastUseLine: 7 }]);
    // Hand count, free (not a method): self(8), used on line 9.
    expect(defUse(text, 2)).toEqual([{ name: "self", defLine: 8, lastUseLine: 9 }]);
  });

  it("lets a nested def shadow a name it binds, but not its default values", () => {
    const text = src(
      "def outer(x):",
      "    y = 1",
      "    def inner(x):",
      "        return x + y",
      "    def other():",
      "        x = 2",
      "        return x",
      "    def third(z=x):",
      "        return z",
      "    return inner",
    );
    // Hand count: x(1): lines 3-4 belong to inner's parameter x, lines 6-7 to other's
    // local x, line 8 `z=x` is evaluated in outer: lastUseLine 8.
    // y(2): the closure read on line 4: lastUseLine 4.
    expect(defUse(text)).toEqual([
      { name: "x", defLine: 1, lastUseLine: 8 },
      { name: "y", defLine: 2, lastUseLine: 4 },
    ]);
  });

  it("does not record bindings in a class body inside the unit", () => {
    const text = src(
      "def f():",
      "    class K:",
      "        attr = 1",
      "    return K",
    );
    // Hand count: `attr` is class-scoped and `K` is a class name: 0 entries.
    expect(defUse(text)).toEqual([]);
  });

  it("caches the entries per function node", () => {
    const ctx = syntaxCtx("python", src("def f(a):", "    return a"));
    expect(buildPythonDefUse(ctx.node)).toBe(buildPythonDefUse(ctx.node));
  });
});

describe("pythonPeakLiveVariables and pythonVariableSpan", () => {
  it("return 0 for a function with no bindings", () => {
    const text = src("def f():", "    pass");
    // Hand count: 0 entries.
    expect(run(pythonPeakLiveVariables, text)).toBe(0);
    expect(run(pythonVariableSpan, text)).toBe(0);
  });

  it("count overlapping live ranges and the longest span", () => {
    const text = src(
      "def f(a):",
      "    b = a + 1",
      "    c = 2",
      "    return b + c",
    );
    // Hand count: a [1,2], b [2,4], c [3,4].
    // Live per line: 1→1, 2→2 (a, b), 3→2 (b, c), 4→2 (b, c). PLV = 2.
    expect(run(pythonPeakLiveVariables, text)).toBe(2);
    // Spans: a 1, b 2, c 1. VSpan = 2.
    expect(run(pythonVariableSpan, text)).toBe(2);
  });

  it("extend a variable through a closure read (lambda and nested def)", () => {
    const text = src(
      "def f():",
      "    n = 0",
      "    g = lambda: n",
      "    def h():",
      "        return n",
      "    return 1",
    );
    // Hand count: n [2,5] (lambda read on 3, closure read on 5), g [3,3].
    // Live per line: 2→1, 3→2, 4→1, 5→1. PLV = 2. Spans: n 3, g 0. VSpan = 3.
    expect(run(pythonPeakLiveVariables, text)).toBe(2);
    expect(run(pythonVariableSpan, text)).toBe(3);
  });

  it("do not extend a variable through a nested def that shadows it", () => {
    const text = src(
      "def f(x):",
      "    def g(x):",
      "        return x",
      "",
      "",
      "    return 0",
    );
    // Hand count: x [1,1]; line 3 resolves to g's parameter. PLV = 1, VSpan = 0.
    expect(run(pythonPeakLiveVariables, text)).toBe(1);
    expect(run(pythonVariableSpan, text)).toBe(0);
  });
});

describe("pythonSpecifiedDataComplexity", () => {
  it("counts a parameter in an if condition", () => {
    // Hand count: a in `if a` = 1; b is not in a condition.
    expect(run(pythonSpecifiedDataComplexity, src("def f(a, b):", "    if a:", "        return b"))).toBe(1);
  });

  it("counts a parameter in an elif condition", () => {
    const text = src("def f(a, b):", "    if x:", "        pass", "    elif b:", "        pass");
    // Hand count: b in the elif condition = 1; x is not a parameter.
    expect(run(pythonSpecifiedDataComplexity, text)).toBe(1);
  });

  it("counts a parameter in a while condition", () => {
    // Hand count: a in `while a > 0` = 1.
    expect(run(pythonSpecifiedDataComplexity, src("def f(a):", "    while a > 0:", "        a -= 1"))).toBe(1);
  });

  it("counts only the middle operand of a conditional expression", () => {
    // Hand count: `b if a else c`: the condition is a = 1.
    expect(run(pythonSpecifiedDataComplexity, src("def f(a, b, c):", "    return b if a else c"))).toBe(1);
  });

  it("counts every match subject", () => {
    const text = src("def f(a, b):", "    match a, b:", "        case _:", "            pass");
    // Hand count: subjects a and b = 2.
    expect(run(pythonSpecifiedDataComplexity, text)).toBe(2);
  });

  it("counts a parameter in a case guard", () => {
    const text = src("def f(b):", "    match x:", "        case 1 if b:", "            pass");
    // Hand count: b in the guard = 1; the subject x is not a parameter.
    expect(run(pythonSpecifiedDataComplexity, text)).toBe(1);
  });

  it("counts a parameter in a comprehension if, not in the for clause", () => {
    // Hand count: a in `if v > a` = 1; xs in the for clause is not a condition.
    expect(run(pythonSpecifiedDataComplexity, src("def f(a, xs):", "    return [v for v in xs if v > a]"))).toBe(1);
  });

  it("counts every parameter form and each parameter once", () => {
    const text = src(
      "def f(a: int, b=1, c: int = 2, *args, **kw):",
      "    if a or b or c or args or kw:",
      "        pass",
      "    if a:",
      "        pass",
    );
    // Hand count: a, b, c, args, kw = 5 distinct; the second `if a` adds nothing.
    expect(run(pythonSpecifiedDataComplexity, text)).toBe(5);
  });

  it("excludes self and cls of a method, and the attribute part of obj.name", () => {
    const text = src(
      "class C:",
      "    def m(self, a, b):",
      "        if self.x and a:",
      "            pass",
      "        if obj.b:",
      "            pass",
      "    @classmethod",
      "    def k(cls):",
      "        if cls:",
      "            pass",
      "def free(self):",
      "    if self:",
      "        pass",
    );
    // Hand count, m: self is excluded, a = 1, `obj.b` is not b. Total 1.
    expect(run(pythonSpecifiedDataComplexity, text, 0)).toBe(1);
    // Hand count, k: cls is excluded. Total 0.
    expect(run(pythonSpecifiedDataComplexity, text, 1)).toBe(0);
    // Hand count, free: not a method, so self counts. Total 1.
    expect(run(pythonSpecifiedDataComplexity, text, 2)).toBe(1);
  });

  it("skips nested defs but not lambdas", () => {
    const nested = src("def f(a):", "    def g():", "        if a:", "            pass");
    // Hand count: the condition is in nested unit g. Total 0.
    expect(run(pythonSpecifiedDataComplexity, nested)).toBe(0);
    const lambda = src("def f(a):", "    return lambda: 1 if a else 2");
    // Hand count: the lambda stays in the unit; a in the condition = 1.
    expect(run(pythonSpecifiedDataComplexity, lambda)).toBe(1);
  });
});

describe("pythonGlobalDataComplexity", () => {
  it("counts names bound to a mutable literal or comprehension, not constants", () => {
    const text = src(
      "CACHE = []",
      "TABLE = {}",
      "TAGS = {1}",
      "SQ = [i * i for i in range(3)]",
      "IDX = {k: 1 for k in 'ab'}",
      "LIMIT = 10",
      "NAME = 'x'",
      "def f():",
      "    return CACHE, TABLE, TAGS, SQ, IDX, LIMIT, NAME",
    );
    // Hand count: CACHE, TABLE, TAGS, SQ, IDX = 5; LIMIT and NAME are constants.
    expect(run(pythonGlobalDataComplexity, text)).toBe(5);
  });

  it("counts names bound to a mutable factory call", () => {
    const text = src(
      "import collections",
      "A = list()",
      "B = dict()",
      "C = set()",
      "D = collections.defaultdict(int)",
      "E = deque()",
      "F = OrderedDict()",
      "G = Counter()",
      "H = bytearray()",
      "T = tuple()",
      "def f():",
      "    return A, B, C, D, E, F, G, H, T",
    );
    // Hand count: A to H = 8; tuple() is not a mutable factory.
    expect(run(pythonGlobalDataComplexity, text)).toBe(8);
  });

  it("counts a name that a global statement in a function names", () => {
    const text = src(
      "COUNT = 0",
      "def bump():",
      "    global COUNT",
      "    COUNT += 1",
      "def read():",
      "    return COUNT",
    );
    // Hand count, bump: COUNT is declared global, so not local = 1.
    expect(run(pythonGlobalDataComplexity, text, 0)).toBe(1);
    // Hand count, read: COUNT = 1.
    expect(run(pythonGlobalDataComplexity, text, 1)).toBe(1);
  });

  it("counts a name that 2 or more top-level statements bind", () => {
    const text = src(
      "MODE = 'a'",
      "MODE = 'b'",
      "RATE = 1",
      "RATE += 1",
      "FIXED = 1",
      "def f():",
      "    return MODE, RATE, FIXED",
    );
    // Hand count: MODE (2 assignments), RATE (assignment + augmented) = 2; FIXED is constant.
    expect(run(pythonGlobalDataComplexity, text)).toBe(2);
  });

  it("handles annotated, chained and tuple top-level assignments", () => {
    const text = src(
      "X: list",
      "X = 1",
      "Y: list = []",
      "P = Q = []",
      "A, B = [], 1",
      "def f():",
      "    return X, Y, P, Q, A, B",
    );
    // Hand count: X has 1 binding statement and an immutable value: no.
    // Y (annotated with []), P and Q (chained []), A (paired with []) = 4. B pairs with 1: no.
    expect(run(pythonGlobalDataComplexity, text)).toBe(4);
  });

  it("ignores bindings that are not top-level statements", () => {
    const text = src("if True:", "    Z = []", "def f():", "    return Z");
    // Hand count: Z is bound inside an if, not by a top-level statement = 0.
    expect(run(pythonGlobalDataComplexity, text)).toBe(0);
  });

  it("does not count attribute parts or keyword-argument names", () => {
    const text = src("CACHE = []", "def f(obj):", "    return obj.CACHE, g(CACHE=1)");
    // Hand count: neither identifier is a reference to CACHE = 0.
    expect(run(pythonGlobalDataComplexity, text)).toBe(0);
  });

  it("skips nested defs but not lambdas", () => {
    const text = src(
      "CACHE = []",
      "STORE = {}",
      "def f():",
      "    def g():",
      "        return CACHE",
      "    return lambda: STORE",
    );
    // Hand count, f: CACHE is only in nested unit g; STORE is in the lambda = 1.
    expect(run(pythonGlobalDataComplexity, text, 0)).toBe(1);
    // Hand count, g: CACHE = 1.
    expect(run(pythonGlobalDataComplexity, text, 1)).toBe(1);
  });

  it("does not count a global that a local binding hides", () => {
    const text = src(
      "CACHE = []",
      "def f():",
      "    CACHE = {}",
      "    return CACHE",
      "def g(CACHE):",
      "    return CACHE",
    );
    // Hand count, f: the assignment makes CACHE local = 0.
    expect(run(pythonGlobalDataComplexity, text, 0)).toBe(0);
    // Hand count, g: the parameter makes CACHE local = 0.
    expect(run(pythonGlobalDataComplexity, text, 1)).toBe(0);
  });
});
