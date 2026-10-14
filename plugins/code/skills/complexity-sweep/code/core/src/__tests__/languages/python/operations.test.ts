import { beforeAll, describe, expect, it } from "vitest";

import { MetricKeys, type MetricResult } from "../../../registry";
import {
  pythonAbcScore,
  pythonHalsteadDifficulty,
  pythonHalsteadEffort,
  pythonHalsteadVolume,
  pythonMaintainabilityIndex,
  pythonScopeDepthRatio,
  pythonScopeDepthWeightedLoc,
} from "../../../languages/python/operations";
import { collectPythonHalsteadCounts } from "../../../languages/python/operations.halstead";
import { pythonCodeLines } from "../../../languages/python/operations.scopeDepth";
import { initSyntaxParsers, syntaxCtx } from "../syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

function codeLines(src: string, index = 0): number[] {
  const ctx = syntaxCtx("python", src, index);
  return pythonCodeLines(ctx.node, ctx.file.text);
}

function abc(src: string, index = 0): MetricResult {
  return pythonAbcScore(syntaxCtx("python", src, index)) as MetricResult;
}

function abcDetail(src: string, index = 0): unknown {
  return abc(src, index).detail;
}

function weightedLoc(src: string, index = 0): number {
  return pythonScopeDepthWeightedLoc(syntaxCtx("python", src, index)) as number;
}

function ratio(src: string, index = 0): number {
  return pythonScopeDepthRatio(syntaxCtx("python", src, index)) as number;
}

function halstead(src: string, index = 0): MetricResult {
  return pythonHalsteadVolume(syntaxCtx("python", src, index)) as MetricResult;
}

function mi(src: string, deps: Record<string, number>): number {
  return pythonMaintainabilityIndex(syntaxCtx("python", src, 0, {}, deps)) as number;
}

// ---------------------------------------------------------------------------
// Shared LOC helper (design 5.10)
// ---------------------------------------------------------------------------

describe("pythonCodeLines", () => {
  it("skips blank lines and comment lines, keeps a line with a trailing comment", () => {
    const src = `def f():
    x = 1

    # note
    y = 2  # trailing
    return x + y
`;
    // Hand count: lines 2, 5, 6 hold code. Line 3 is blank, line 4 is a comment.
    expect(codeLines(src)).toEqual([2, 5, 6]);
  });

  it("treats the docstring as comment lines", () => {
    const src = `def f():
    """Line one.

    Line two.
    """
    return 1
`;
    // Hand count: lines 2-5 are the docstring. Only line 6 holds code.
    expect(codeLines(src)).toEqual([6]);
  });

  it("counts a string that is not the first statement", () => {
    const src = `def f():
    x = 1
    "not a docstring"
`;
    // Hand count: lines 2 and 3.
    expect(codeLines(src)).toEqual([2, 3]);
  });

  it("counts a one-line function as 1 line", () => {
    // Hand count: the body shares line 1 with the header.
    expect(codeLines("def f(): return 1\n")).toEqual([1]);
  });

  it("excludes the lines of nested units, keeps the decorator line", () => {
    const src = `def outer():
    a = 1
    def inner():
        return 2
    @deco
    def inner2():
        pass
    return a
`;
    // Hand count: lines 2, 5 (decorator, evaluated in outer), 8.
    // Lines 3-4 and 6-7 belong to nested units.
    expect(codeLines(src)).toEqual([2, 5, 8]);
  });

  it("skips brace-only lines and blank lines inside a multi-line string", () => {
    const src = `def f():
    d = {
        "k": 1,
    }
    s = """a

b"""
    return d, s
`;
    // Hand count: lines 2, 3, 5, 7, 8. Line 4 is "}" only. Line 6 is blank.
    expect(codeLines(src)).toEqual([2, 3, 5, 7, 8]);
  });
});

// ---------------------------------------------------------------------------
// abcScore (design 5.7)
// ---------------------------------------------------------------------------

describe("pythonAbcScore: A", () => {
  it("counts 1 per target leaf of an assignment, chained and destructured", () => {
    const src = `def f(t):
    x = y = 1
    p, (q, *r) = t
`;
    // Hand count: A = 2 (x, y) + 3 (p, q, r) = 5.
    expect(abcDetail(src)).toEqual({ a: 5, b: 0, c: 0 });
  });

  it("counts an annotated assignment with a value, not a bare annotation", () => {
    const src = `def f():
    z: int = 3
    w: int
`;
    // Hand count: A = 1 (z). The bare annotation w adds 0.
    expect(abcDetail(src)).toEqual({ a: 1, b: 0, c: 0 });
  });

  it("counts augmented assignment and walrus", () => {
    const src = `def f(x):
    x += 1
    return (n := 3)
`;
    // Hand count: A = 1 (+=) + 1 (:=) = 2.
    expect(abcDetail(src)).toEqual({ a: 2, b: 0, c: 0 });
  });

  it("counts each del target", () => {
    const src = `def f(a, b, c):
    del a, b[0]
    del c
`;
    // Hand count: A = 2 (a, b[0]) + 1 (c) = 3.
    expect(abcDetail(src)).toEqual({ a: 3, b: 0, c: 0 });
  });

  it("counts a mutating method call in A and in B", () => {
    const src = `def f(obj, s):
    obj.items.append(1)
    s.add(2)
    obj.get(3)
`;
    // Hand count: A = 2 (append, add). B = 3 (3 calls). get is not mutating.
    expect(abcDetail(src)).toEqual({ a: 2, b: 3, c: 0 });
  });

  it("does not count loop targets, with targets or imports", () => {
    const src = `def f(xs, p):
    import os
    for x in xs:
        pass
    with p as fh:
        pass
`;
    // Hand count: A = 0. C = 1 (for).
    expect(abcDetail(src)).toEqual({ a: 0, b: 0, c: 1 });
  });
});

describe("pythonAbcScore: B", () => {
  it("counts every call, nested calls too", () => {
    const src = `def f():
    g(h())
    obj.m()
`;
    // Hand count: B = 3 (g, h, m).
    expect(abcDetail(src)).toEqual({ a: 0, b: 3, c: 0 });
  });
});

describe("pythonAbcScore: C", () => {
  it("counts each boolean_operator", () => {
    // Hand count: C = 2 (and, or).
    expect(abcDetail("def f(a, b, c):\n    return a and b or c\n")).toEqual({ a: 0, b: 0, c: 2 });
  });

  it("counts each operator of a comparison chain, including in, not in, is, is not", () => {
    const src = `def f(a, b, c):
    return [a < b <= c, a in b, a not in b, a is b, a is not b, a == b]
`;
    // Hand count: C = 2 (< <=) + 1 + 1 + 1 + 1 + 1 = 7.
    expect(abcDetail(src)).toEqual({ a: 0, b: 0, c: 7 });
  });

  it("counts if and elif, not else", () => {
    const src = `def f(x):
    if x:
        pass
    elif x:
        pass
    else:
        pass
`;
    // Hand count: C = 1 (if) + 1 (elif) = 2.
    expect(abcDetail(src)).toEqual({ a: 0, b: 0, c: 2 });
  });

  it("counts for and while, not the loop else", () => {
    const src = `def f(xs):
    for x in xs:
        pass
    else:
        pass
    while xs:
        break
`;
    // Hand count: C = 1 (for) + 1 (while) = 2.
    expect(abcDetail(src)).toEqual({ a: 0, b: 0, c: 2 });
  });

  it("counts comprehension for_in_clause and if_clause", () => {
    // Hand count: C = 1 (for_in_clause) + 1 (if_clause) = 2. A = 1 (l).
    expect(abcDetail("def f(x):\n    l = [i for i in x if i]\n")).toEqual({ a: 1, b: 0, c: 2 });
  });

  it("counts case_clause except a guard-free case _, and a guard adds no extra C", () => {
    const src = `def f(x, y):
    match x:
        case 1:
            pass
        case _ if y:
            pass
        case [a, *_]:
            pass
        case _:
            pass
`;
    // Hand count: C = 1 (case 1) + 1 (guarded _) + 1 (list pattern) = 3.
    // The guard-free case _ adds 0.
    expect(abcDetail(src)).toEqual({ a: 0, b: 0, c: 3 });
  });

  it("counts conditional_expression", () => {
    // Hand count: C = 1.
    expect(abcDetail("def f(a, b, c):\n    return a if b else c\n")).toEqual({ a: 0, b: 0, c: 1 });
  });

  it("does not count except_clause", () => {
    const src = `def f():
    try:
        pass
    except E:
        pass
`;
    // Hand count: A = 0, B = 0, C = 0.
    expect(abcDetail(src)).toEqual({ a: 0, b: 0, c: 0 });
  });
});

describe("pythonAbcScore: units and value", () => {
  it("skips a nested def and counts a lambda", () => {
    const src = `def f(xs):
    def inner():
        return g(1)
    h = lambda q: q.append(1)
`;
    // Hand count: A = 1 (h) + 1 (append) = 2. B = 1 (append). inner is skipped.
    expect(abcDetail(src)).toEqual({ a: 2, b: 1, c: 0 });
  });

  it("returns sqrt(A^2 + B^2 + C^2)", () => {
    const src = `def f(x):
    y = g(x)
    if x:
        h()
`;
    // Hand count: A = 1, B = 2, C = 1. Value = sqrt(1 + 4 + 1) = sqrt(6).
    const result = abc(src);
    expect(result.detail).toEqual({ a: 1, b: 2, c: 1 });
    expect(result.value).toBeCloseTo(Math.sqrt(6), 10);
  });
});

// ---------------------------------------------------------------------------
// scopeDepthWeightedLoc and scopeDepthRatio (design 5.8)
// ---------------------------------------------------------------------------

describe("pythonScopeDepth", () => {
  it("flat function gives ratio 1", () => {
    const src = `def f():
    a = 1
    return a
`;
    // Hand count: 2 lines at depth 0. Weighted = 1 + 1 = 2. Ratio = 2 / 2.
    expect(weightedLoc(src)).toBe(2);
    expect(ratio(src)).toBe(1);
  });

  it("if, elif and else bodies add 1 level", () => {
    const src = `def f(x):
    if x:
        a = 1
    elif x > 1:
        a = 2
    else:
        a = 3
    return a
`;
    // Hand count: weights 1, 2, 1, 2, 1, 2, 1 = 10 over 7 lines.
    expect(weightedLoc(src)).toBe(10);
    expect(ratio(src)).toBeCloseTo(10 / 7, 10);
  });

  it("for, while and the loop else add 1 level", () => {
    const src = `def f(xs):
    for x in xs:
        while x:
            x -= 1
    else:
        pass
`;
    // Hand count: weights 1, 2, 3, 1, 2 = 9.
    expect(weightedLoc(src)).toBe(9);
  });

  it("try, except, else and finally add 1 level", () => {
    const src = `def f():
    try:
        a()
    except E:
        b()
    else:
        c()
    finally:
        d()
`;
    // Hand count: weights 1, 2, 1, 2, 1, 2, 1, 2 = 12.
    expect(weightedLoc(src)).toBe(12);
  });

  it("with adds 1 level", () => {
    const src = `def f(p):
    with open(p) as fh:
        fh.read()
`;
    // Hand count: weights 1, 2 = 3.
    expect(weightedLoc(src)).toBe(3);
  });

  it("match adds 1 level and case adds 1 more, like a TypeScript switch", () => {
    const src = `def f(x):
    match x:
        case 1:
            return 1
        case _:
            return 0
`;
    // Hand count: weights 1 (match), 2 (case), 3, 2 (case), 3 = 11.
    expect(weightedLoc(src)).toBe(11);
  });

  it("a class body adds 1 level, its methods are excluded", () => {
    const src = `def f():
    class A:
        x = 1
        def m(self):
            return 1
    return A
`;
    // Hand count: weights 1 (class), 2 (x = 1), 1 (return) = 4. Lines 4-5 are a nested unit.
    expect(weightedLoc(src)).toBe(4);
  });

  it("a lambda body adds 1 level on its own line", () => {
    const src = `def f(xs):
    return sorted(xs, key=lambda x: x)
`;
    // Hand count: the lambda body is on line 2, so line 2 is at depth 1. Weight 2.
    expect(weightedLoc(src)).toBe(2);
    expect(ratio(src)).toBe(2);
  });

  it("a multi-line lambda body adds 1 level to its lines only", () => {
    const src = `def f(xs):
    return map(
        lambda x:
            x + 1,
        xs)
`;
    // Hand count: lines 2, 3, 5 at depth 0 (1 each), line 4 at depth 1 (2). Total 5.
    expect(weightedLoc(src)).toBe(5);
  });

  it("excludes a nested unit by line range", () => {
    const src = `def outer(a):
    if a:
        def inner(b):
            if b:
                pass
        return inner
`;
    // Hand count: weights 1 (if a), 2 (return inner) = 3. Lines 3-5 are a nested unit.
    expect(weightedLoc(src)).toBe(3);
  });

  it("returns 0 for a docstring-only function", () => {
    // Hand count: no code lines. Weighted 0 and ratio 0.
    expect(weightedLoc('def f():\n    """Doc."""\n')).toBe(0);
    expect(ratio('def f():\n    """Doc."""\n')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Halstead (design 5.9)
// ---------------------------------------------------------------------------

describe("pythonHalstead", () => {
  it("counts a 2-line function exactly", () => {
    const src = `def add(a, b):
    return a + b
`;
    // Hand count. def and add are skipped.
    // Operators: ( ) , : return + -> n1 = 6, N1 = 6.
    // Operands: a b a b -> n2 = 2, N2 = 4.
    const result = halstead(src);
    expect(result.detail).toEqual({ n1: 6, n2: 2, N1: 6, N2: 4 });
    // V = N log2(n) = 10 * log2(8) = 30.
    expect(result.value).toBeCloseTo(30, 10);
    // D = (n1 / 2) * (N2 / n2) = 3 * 2 = 6. E = D * V = 180.
    const difficulty = pythonHalsteadDifficulty(syntaxCtx("python", src)) as MetricResult;
    const effort = pythonHalsteadEffort(syntaxCtx("python", src)) as MetricResult;
    expect(difficulty.value).toBeCloseTo(6, 10);
    expect(effort.value).toBeCloseTo(180, 10);
    expect(difficulty.detail).toEqual(result.detail);
    expect(effort.detail).toEqual(result.detail);
  });

  it("counts an if/else function exactly", () => {
    const src = `def f(x):
    if x > 0:
        y = "pos"
    else:
        y = -1
    return y
`;
    // Hand count.
    // Operators: ( ) :x3 if > =x2 else - return -> n1 = 9, N1 = 12.
    // Operands: x x 0 y "pos" y 1 y -> distinct x 0 y "pos" 1, n2 = 5, N2 = 8.
    expect(halstead(src).detail).toEqual({ n1: 9, n2: 5, N1: 12, N2: 8 });
  });

  it("skips the docstring, comments and nested units; a string and not in count once", () => {
    const src = `def h(xs):
    """Doc."""
    # comment
    def inner():
        return 99
    return [v for v in xs if v not in f"a{xs}"]
`;
    // Hand count.
    // Operators: ( ) : return [ for in if "not in" ] -> n1 = 10, N1 = 10.
    // Operands: xs v v xs v f"a{xs}" -> n2 = 3, N2 = 6.
    const { operators, operands } = collectPythonHalsteadCounts(syntaxCtx("python", src).node);
    expect(operators.get("not in")).toBe(1);
    expect(operands.get('f"a{xs}"')).toBe(1);
    expect(halstead(src).detail).toEqual({ n1: 10, n2: 3, N1: 10, N2: 6 });
  });

  it("counts a lambda", () => {
    const src = `def k():
    return lambda q: q
`;
    // Hand count.
    // Operators: ( ) :x2 return lambda -> n1 = 5, N1 = 6.
    // Operands: q q -> n2 = 1, N2 = 2.
    expect(halstead(src).detail).toEqual({ n1: 5, n2: 1, N1: 6, N2: 2 });
  });

  it("skips parameter, return and assignment annotations", () => {
    const typed = `def g(a: int, b: list[str] = None) -> dict[str, int]:
    c: int = a
    return c
`;
    const plain = `def g(a, b = None):
    c = a
    return c
`;
    // Hand count for both:
    // Operators: ( , = ) : = return -> n1 = 6, N1 = 7.
    // Operands: a b None c a c -> n2 = 4, N2 = 6.
    expect(halstead(typed).detail).toEqual({ n1: 6, n2: 4, N1: 7, N2: 6 });
    expect(halstead(plain).detail).toEqual(halstead(typed).detail);
  });

  it("skips generic type parameters", () => {
    // Hand count for both: operators ( ) : return (n1 = 4, N1 = 4); operands x x (n2 = 1, N2 = 2).
    const generic = halstead("def g[T](x: T) -> T:\n    return x\n").detail;
    expect(generic).toEqual({ n1: 4, n2: 1, N1: 4, N2: 2 });
    expect(halstead("def g(x):\n    return x\n").detail).toEqual(generic);
  });
});

// ---------------------------------------------------------------------------
// maintainabilityIndex (design 5.10)
// ---------------------------------------------------------------------------

describe("pythonMaintainabilityIndex", () => {
  const src = `def f():
    """Doc."""
    a = 1
    return a
`;

  it("applies the formula with LOC from the shared helper", () => {
    // Hand count: LOC = 2 (the docstring is a comment). V = 30, CC = 3.
    const expected = ((171 - 5.2 * Math.log(30) - 0.23 * 3 - 16.2 * Math.log(2)) * 100) / 171;
    expect(mi(src, { [MetricKeys.halsteadVolume]: 30, [MetricKeys.cyclomaticComplexity]: 3 })).toBeCloseTo(
      expected,
      10,
    );
  });

  it("uses CC = 1 when cyclomaticComplexity is absent", () => {
    // Hand count: LOC = 2, V = 30, CC fallback 1.
    const expected = ((171 - 5.2 * Math.log(30) - 0.23 * 1 - 16.2 * Math.log(2)) * 100) / 171;
    expect(mi(src, { [MetricKeys.halsteadVolume]: 30 })).toBeCloseTo(expected, 10);
  });

  it("returns 100 when V is absent or 0", () => {
    // Hand count: V fallback 0, so the guard gives 100.
    expect(mi(src, {})).toBe(100);
    expect(mi(src, { [MetricKeys.halsteadVolume]: 0, [MetricKeys.cyclomaticComplexity]: 5 })).toBe(100);
  });

  it("returns 100 when LOC is 0", () => {
    // Hand count: the body is only a docstring, so LOC = 0.
    expect(mi('def f():\n    """Doc."""\n', { [MetricKeys.halsteadVolume]: 30 })).toBe(100);
  });

  it("clamps at 0", () => {
    // Hand count: 171 - 5.2 ln(1e30) - 0.23 * 1000 - 16.2 ln 2 < 0, so MI = 0.
    expect(
      mi(src, { [MetricKeys.halsteadVolume]: 1e30, [MetricKeys.cyclomaticComplexity]: 1000 }),
    ).toBe(0);
  });
});

describe("robustness", () => {
  it("does not throw on a function with many constructs", () => {
    const src = `class C:
    @staticmethod
    async def f[T](a: int, /, b=2, *c: str, d, **e) -> T:
        global g
        nonlocal_ = [x async for x in a]
        async with a as (p, q), b:
            await a
        try:
            raise E from None
        except* F:
            pass
        yield from {k: v for k, v in e.items()}
        assert a, "m"
        type Alias = list[int]
        print(f"{a!r:>{b}}", *c, **e)
        return not a or (lambda *z, **w: z)()
`;
    const ctx = syntaxCtx("python", src, 0, {}, {
      [MetricKeys.halsteadVolume]: 100,
      [MetricKeys.cyclomaticComplexity]: 4,
    });
    for (const compute of [
      pythonAbcScore,
      pythonScopeDepthWeightedLoc,
      pythonScopeDepthRatio,
      pythonHalsteadVolume,
      pythonHalsteadDifficulty,
      pythonHalsteadEffort,
      pythonMaintainabilityIndex,
    ]) {
      expect(() => compute(ctx)).not.toThrow();
    }
  });
});
