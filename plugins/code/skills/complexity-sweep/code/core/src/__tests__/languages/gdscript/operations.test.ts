import { beforeAll, describe, expect, it } from "vitest";

import { MetricKeys, type MetricResult } from "../../../registry";
import {
  gdscriptAbcScore,
  gdscriptHalsteadDifficulty,
  gdscriptHalsteadEffort,
  gdscriptHalsteadVolume,
  gdscriptMaintainabilityIndex,
  gdscriptScopeDepthRatio,
  gdscriptScopeDepthWeightedLoc,
} from "../../../languages/gdscript/operations";
import { gdscriptCodeLines } from "../../../languages/gdscript/operations.scopeDepth";
import { initSyntaxParsers, parseFixture, syntaxCtx } from "../syntaxTestUtils";

// Fixtures use 4 spaces for 1 indent level.

beforeAll(async () => {
  await initSyntaxParsers();
});

function codeLines(src: string, index = 0): number[] {
  const ctx = syntaxCtx("gdscript", src, index);
  return gdscriptCodeLines(ctx.node, ctx.file.text);
}

function abc(src: string, index = 0): MetricResult {
  return gdscriptAbcScore(syntaxCtx("gdscript", src, index)) as MetricResult;
}

function weightedLoc(src: string, index = 0): number {
  return gdscriptScopeDepthWeightedLoc(syntaxCtx("gdscript", src, index)) as number;
}

function ratio(src: string, index = 0): number {
  return gdscriptScopeDepthRatio(syntaxCtx("gdscript", src, index)) as number;
}

function halstead(src: string, index = 0): MetricResult {
  return gdscriptHalsteadVolume(syntaxCtx("gdscript", src, index)) as MetricResult;
}

function mi(src: string, deps: Record<string, number>): number {
  return gdscriptMaintainabilityIndex(syntaxCtx("gdscript", src, 0, {}, deps)) as number;
}

/** Every fixture in this file must parse without error. */
function expectClean(src: string): void {
  expect(parseFixture("gdscript", src).tree.rootNode.hasError).toBe(false);
}

// ---------------------------------------------------------------------------
// Shared LOC helper (design 9.3, 5.10 row)
// ---------------------------------------------------------------------------

describe("gdscriptCodeLines", () => {
  it("skips blank lines, `#` and `##` comment lines, keeps a line with a trailing comment", () => {
    const src = `func f():
    var x = 1

    # note
    ## doc
    var y = 2  # trailing
`;
    expectClean(src);
    // Code: lines 2 and 6. Line 3 is blank; lines 4 and 5 are comments.
    expect(codeLines(src)).toEqual([2, 6]);
  });

  it("skips `#region` and `#endregion` lines", () => {
    const src = `func f():
    #region Setup
    var x = 1
    #endregion
    return x
`;
    expectClean(src);
    // Code: lines 3 and 5. Lines 2 and 4 are region markers.
    expect(codeLines(src)).toEqual([3, 5]);
  });

  it("keeps a `}` line inside a multi-line string and drops a brace-only line outside it", () => {
    const src = `func f():
    var s = """a
}

end"""
    var d = {
        "k": 1,
    }
    return s
`;
    expectClean(src);
    // Code: 2, 3 (`}` in the string), 5, 6, 7, 9.
    // Line 4 is blank inside the string. Line 8 is a brace-only line.
    expect(codeLines(src)).toEqual([2, 3, 5, 6, 7, 9]);
  });

  it("drops the lines of a nested unit (a setter of a local var)", () => {
    const src = `func f():
    var hp = 1:
        set(v):
            hp = v
    return hp
`;
    expectClean(src);
    // The set_body spans lines 3 and 4. Code of f: lines 2 and 5.
    expect(codeLines(src, 0)).toEqual([2, 5]);
    // The set_body itself (unit 1): line 4.
    expect(codeLines(src, 1)).toEqual([4]);
  });

  it("counts a body on the header line", () => {
    const src = `func f(): return 1
`;
    expectClean(src);
    // 1 code line: the body `return 1` is on line 1.
    expect(codeLines(src)).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// abcScore (design 9.3, 5.7 rows)
// ---------------------------------------------------------------------------

describe("gdscriptAbcScore: A", () => {
  it("counts assignment, augmented assignment, declarations with a value and mutating calls", () => {
    const src = `func f(arr):
    var x = 1
    var y
    const K = 2
    x = 3
    x += 1
    arr.append(x)
    arr.size()
`;
    expectClean(src);
    // A: var x = 1, const K = 2, x = 3, x += 1, append -> 5. `var y` has no value.
    // B: append, size -> 2. C: 0.
    const result = abc(src);
    expect(result.detail).toEqual({ a: 5, b: 2, c: 0 });
    expect(result.value).toBeCloseTo(Math.sqrt(25 + 4), 10);
  });

  it("counts each mutating method of the list", () => {
    const src = `func f(a, d):
    a.append_array([1])
    a.push_back(1)
    a.push_front(1)
    a.pop_back()
    a.pop_front()
    a.pop_at(0)
    a.remove_at(0)
    a.insert(0, 1)
    a.erase(1)
    a.fill(0)
    a.resize(3)
    a.reverse()
    a.shuffle()
    a.sort()
    a.sort_custom(cmp)
    a.assign(d)
    d.merge(d)
    d.clear()
`;
    expectClean(src);
    // 18 mutating attribute calls: A 18, B 18. C 0.
    expect(abc(src).detail).toEqual({ a: 18, b: 18, c: 0 });
  });
});

describe("gdscriptAbcScore: B", () => {
  it("counts call, attribute_call (also X.new()), get_node and assert", () => {
    const src = `func f():
    var n = Foo.new()
    print(n)
    super.f()
    var m = $Node
    var u = %Uniq
    assert(n != null)
`;
    expectClean(src);
    // A: var n, var m, var u -> 3.
    // B: new, print, super.f, $Node, %Uniq, assert -> 6.
    // C: != -> 1.
    const result = abc(src);
    expect(result.detail).toEqual({ a: 3, b: 6, c: 1 });
    expect(result.value).toBeCloseTo(Math.sqrt(9 + 36 + 1), 10);
  });

  it("counts a Godot 3 base_call", () => {
    const src = `func f():
    .f()
`;
    // The grammar accepts the Godot 3 `.f()` form as a `base_call`.
    expectClean(src);
    // B: base_call -> 1.
    expect(abc(src).detail).toEqual({ a: 0, b: 1, c: 0 });
  });
});

describe("gdscriptAbcScore: C", () => {
  it("counts branches, loops, the ternary and logical and comparison operators", () => {
    const src = `func f(a, b, xs):
    if a and b:
        pass
    elif a == b:
        pass
    else:
        pass
    for x in xs:
        while x < 3 || a:
            break
    var r = a if b else 0
    if a is not int and b not in xs:
        pass
`;
    expectClean(src);
    // C: if, and (2); elif, == (2); for (1); while, <, || (3); ternary (1);
    //    if, is not, not in, and (4) -> 13. `else` adds nothing.
    // A: var r -> 1. B: 0.
    expect(abc(src).detail).toEqual({ a: 1, b: 0, c: 13 });
  });

  it("counts `in`, `is`, `>=`, `<=`, `>`, `&&` once each", () => {
    const src = `func f(a, b):
    return a in b or a is Node or a >= 1 or a <= 2 or a > 3 && b
`;
    expectClean(src);
    // C: in, is, >=, <=, >, && -> 6; or x4 -> 4. Total 10.
    expect(abc(src).detail).toEqual({ a: 0, b: 0, c: 10 });
  });

  it("counts pattern sections and guards; a guard-free `_` section adds nothing", () => {
    const src = `func f(x):
    match x:
        1, 2:
            pass
        var z when z > 3:
            pass
        _ when x < 0:
            pass
        _:
            pass
`;
    expectClean(src);
    // C: section `1, 2` (1); section `var z` + guard + > (3);
    //    guarded `_` section + guard + < (3); bare `_` (0) -> 7.
    expect(abc(src).detail).toEqual({ a: 0, b: 0, c: 7 });
  });

  it("counts a section whose only pattern is a binding (D3)", () => {
    const src = `func f(x):
    match x:
        var y:
            pass
`;
    expectClean(src);
    // C: section `var y` -> 1.
    expect(abc(src).detail).toEqual({ a: 0, b: 0, c: 1 });
  });
});

describe("gdscriptAbcScore: lambdas and nested units", () => {
  it("counts a lambda body and skips a nested accessor unit", () => {
    const src = `func f():
    var l = func(q): return q.size()
    var hp = 1:
        set(v):
            hp = v
    return l.call(2)
`;
    expectClean(src);
    // A: var l, var hp -> 2. `hp = v` is in the nested set_body.
    // B: size (in the lambda), call -> 2. C: 0.
    expect(abc(src).detail).toEqual({ a: 2, b: 2, c: 0 });
  });
});

// ---------------------------------------------------------------------------
// scopeDepthWeightedLoc and scopeDepthRatio (design 9.3, 5.8 row)
// ---------------------------------------------------------------------------

describe("gdscript scope depth", () => {
  it("adds 1 level for the bodies of if, elif and else", () => {
    const src = `func f(a, b):
    if a:
        x()
    elif b:
        y()
    else:
        z()
    return 1
`;
    expectClean(src);
    // Depths, lines 2 to 8: 0 1 0 1 0 1 0. Weighted = 7 + 3 = 10. Raw = 7.
    expect(weightedLoc(src)).toBe(10);
    expect(ratio(src)).toBeCloseTo(10 / 7, 10);
  });

  it("adds 1 level for for and while bodies", () => {
    const src = `func f(xs):
    for x in xs:
        while x:
            x -= 1
    return 0
`;
    expectClean(src);
    // Depths: 0 1 2 0. Weighted = 1 + 2 + 3 + 1 = 7. Raw = 4.
    expect(weightedLoc(src)).toBe(7);
    expect(ratio(src)).toBeCloseTo(7 / 4, 10);
  });

  it("mirrors the TypeScript switch rule for match", () => {
    const src = `func f(x):
    match x:
        1:
            a()
        var z when z:
            b()
`;
    expectClean(src);
    // match line 0, section lines 1, section bodies 2.
    // Depths: 0 1 2 1 2. Weighted = 1 + 2 + 3 + 2 + 3 = 11. Raw = 5.
    expect(weightedLoc(src)).toBe(11);
  });

  it("adds 1 level for a lambda in a match value (GDScript review F1)", () => {
    const src = `func f(value):
    match [value].map(func(x):
        return x + 1
    ):
        _:
            pass
`;
    expectClean(src);
    // Depths: 0 (match line), 1 (lambda body), 0 (`):`), 1 (section), 2 (pass).
    // Weighted = 1 + 2 + 1 + 2 + 3 = 9. Raw = 5.
    expect(weightedLoc(src)).toBe(9);
    expect(ratio(src)).toBeCloseTo(9 / 5, 10);
  });

  it("keeps the depths of a match value that holds no lambda", () => {
    const src = `func f(value):
    match [value].size():
        _:
            pass
`;
    expectClean(src);
    // Depths: 0 1 2. Weighted = 1 + 2 + 3 = 6. Raw = 3.
    expect(weightedLoc(src)).toBe(6);
    expect(ratio(src)).toBe(2);
  });

  it("adds 1 level for a multi-line lambda body", () => {
    const src = `func f():
    var l = func(q):
        if q:
            return 1
    return l
`;
    expectClean(src);
    // Depths: 0 (header line), 1 (if), 2 (return 1), 0. Weighted = 1 + 2 + 3 + 1 = 7.
    expect(weightedLoc(src)).toBe(7);
  });

  it("gives a 1-line lambda depth 1 and a lambda in a lambda depth 2", () => {
    const single = `func f():
    var l = func(q): return q
`;
    const nested = `func f():
    var l = func(q): return func(r): return r
`;
    expectClean(single);
    expectClean(nested);
    // 1 line at depth 1 -> weighted 2.
    expect(weightedLoc(single)).toBe(2);
    // 1 line at depth 2 -> weighted 3.
    expect(weightedLoc(nested)).toBe(3);
  });

  it("takes the maximum depth, not the sum, for 2 sibling lambdas on 1 line", () => {
    const src = `func f():
    var t = [func(): return 1, func(): return 2]
`;
    expectClean(src);
    // Both lambda bodies are at depth 1 -> line depth 1 -> weighted 2.
    expect(weightedLoc(src)).toBe(2);
  });

  it("excludes the lines of a nested unit", () => {
    const src = `func f():
    var hp = 1:
        set(v):
            if v:
                hp = v
    return hp
`;
    expectClean(src);
    // Lines 3 to 5 belong to the set_body. Lines 2 and 6 at depth 0: weighted 2, raw 2.
    expect(weightedLoc(src)).toBe(2);
    expect(ratio(src)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Halstead (design 9.5)
// ---------------------------------------------------------------------------

describe("gdscript Halstead", () => {
  it("counts a small function and gives the same detail on all 3 metrics", () => {
    const src = `func add(a, b):
    var s = a + b
    return s
`;
    expectClean(src);
    // Operators: var = + return -> n1 = 4, N1 = 4.
    // Operands: a b s a b s -> n2 = 3, N2 = 6. The unit name `add` is not an operand.
    const detail = { n1: 4, n2: 3, N1: 4, N2: 6 };
    const ctx = syntaxCtx("gdscript", src);
    const volume = gdscriptHalsteadVolume(ctx) as MetricResult;
    const difficulty = gdscriptHalsteadDifficulty(ctx) as MetricResult;
    const effort = gdscriptHalsteadEffort(ctx) as MetricResult;
    expect(volume.detail).toEqual(detail);
    expect(difficulty.detail).toEqual(detail);
    expect(effort.detail).toEqual(detail);
    // V = N log2 n = 10 log2 7. D = (n1 / 2)(N2 / n2) = 2 * 2 = 4. E = D V.
    expect(volume.value).toBeCloseTo(10 * Math.log2(7), 10);
    expect(difficulty.value).toBeCloseTo(4, 10);
    expect(effort.value).toBeCloseTo(40 * Math.log2(7), 10);
  });

  it("counts a function with a loop, branches, member access, calls and get_node", () => {
    const src = `func g(node, xs: Array[int]) -> int:
    var total: int = 0
    for x: int in xs:
        if x > 0 and not node.skip:
            total += x
        elif x == -1:
            node.call("f", $Label)
        else:
            break
    return total if total else null
`;
    expectClean(src);
    // Operators: var, =, for, in, if x2, else x2, >, and, not, . x2, +=, ==, unary-,
    //   (), $, return, ?: -> n1 = 17, N1 = 20. `break` is structural.
    // Operands: node xs total 0 x xs x 0 node skip total x x 1 node call "f" $Label
    //   total total null -> N2 = 21.
    //   Distinct: node xs total 0 x skip 1 call "f" $Label null -> n2 = 11.
    expect(halstead(src).detail).toEqual({ n1: 17, n2: 11, N1: 20, N2: 21 });
  });

  it("skips type syntax: parameter, return, declaration and cast types", () => {
    const src = `func t(a: int, b: Array[String] = []) -> Dictionary:
    var c: float = a as float
    return c
`;
    expectClean(src);
    // Operators: var = as return -> n1 = 4, N1 = 4. The default `=` is structural.
    // Operands: a b c a c -> n2 = 3, N2 = 5. int, Array, String, Dictionary, float are skipped.
    expect(halstead(src).detail).toEqual({ n1: 4, n2: 3, N1: 4, N2: 5 });
  });

  it("skips an inferred type (`:=`) and counts `=` for it", () => {
    const src = `func t():
    var c := 1
`;
    expectClean(src);
    // Operators: var = -> n1 = 2, N1 = 2. Operands: c 1 -> n2 = 2, N2 = 2.
    expect(halstead(src).detail).toEqual({ n1: 2, n2: 2, N1: 2, N2: 2 });
  });

  it("counts `&&`, `||` and `!` as `and`, `or` and `not` (D8)", () => {
    const symbols = `func f(a, b, c):
    return !a || b && c
`;
    const words = `func f(a, b, c):
    return not a or b and c
`;
    expectClean(symbols);
    expectClean(words);
    // Operators: return not or and -> n1 = 4, N1 = 4.
    // Operands: a b c a b c -> n2 = 3, N2 = 6.
    const detail = { n1: 4, n2: 3, N1: 4, N2: 6 };
    expect(halstead(symbols).detail).toEqual(detail);
    expect(halstead(words).detail).toEqual(detail);
  });

  it("joins 2-token operators and keys unary operators", () => {
    const src = `func f(a, b):
    return a not in b or a is not b or -a == +b or ~a
`;
    expectClean(src);
    // Operators: return, not in, is not, ==, unary-, unary+, ~, or -> n1 = 8.
    //   or x3 -> N1 = 10.
    // Operands: a b a b a b a b a -> n2 = 2, N2 = 9.
    expect(halstead(src).detail).toEqual({ n1: 8, n2: 2, N1: 10, N2: 9 });
  });

  it("counts `assert` for an assert call, and `[]` for subscripts", () => {
    const src = `func f(x, d):
    assert(x[0] > d.items[1])
`;
    expectClean(src);
    // Operators: assert, [] x2, >, . -> n1 = 4, N1 = 5.
    // Operands: x d x 0 d items 1 -> n2 = 5 (x d 0 items 1), N2 = 7.
    expect(halstead(src).detail).toEqual({ n1: 4, n2: 5, N1: 5, N2: 7 });
  });

  it("counts match, case and when", () => {
    const src = `func m(x):
    match x:
        1:
            return 1
        var z when z > 2:
            return z
`;
    expectClean(src);
    // Operators: match, case x2, when, >, return x2 -> n1 = 5, N1 = 7.
    // Operands: x x 1 1 z z 2 z -> n2 = 4, N2 = 8.
    expect(halstead(src).detail).toEqual({ n1: 5, n2: 4, N1: 7, N2: 8 });
  });

  it("counts a lambda and string literals as whole operands", () => {
    const src = `func f():
    var l = func(q): return q + "a\\nb"
    return await l.call(&"n", ^"p")
`;
    expectClean(src);
    // Operators: var, =, lambda, return x2, +, await, ., () -> n1 = 8, N1 = 9.
    // Operands: l q q "a\\nb" l call &"n" ^"p" -> n2 = 6, N2 = 8.
    expect(halstead(src).detail).toEqual({ n1: 8, n2: 6, N1: 9, N2: 8 });
  });

  it("skips a nested accessor unit", () => {
    const src = `func f():
    var hp = 1:
        set(v):
            hp = v
    return hp
`;
    expectClean(src);
    // Operators: var = return -> n1 = 3, N1 = 3. The set_body is skipped.
    // Operands: hp 1 hp -> n2 = 2, N2 = 3.
    expect(halstead(src).detail).toEqual({ n1: 3, n2: 2, N1: 3, N2: 3 });
  });

  it("gives zero counts and zero values for a body with only `pass`", () => {
    const src = `func f():
    pass
`;
    expectClean(src);
    const ctx = syntaxCtx("gdscript", src);
    expect(halstead(src).detail).toEqual({ n1: 0, n2: 0, N1: 0, N2: 0 });
    expect((gdscriptHalsteadVolume(ctx) as MetricResult).value).toBe(0);
    expect((gdscriptHalsteadDifficulty(ctx) as MetricResult).value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// maintainabilityIndex (design 9.3, 5.10 row)
// ---------------------------------------------------------------------------

describe("gdscriptMaintainabilityIndex", () => {
  const src = `func f(a):
    # note
    var x = a + 1

    return x
`;

  it("applies the formula with V and CC from the dependency values", () => {
    expectClean(src);
    // LOC = 2 (lines 3 and 5). V = 100, CC = 3.
    const expected = ((171 - 5.2 * Math.log(100) - 0.23 * 3 - 16.2 * Math.log(2)) * 100) / 171;
    expect(mi(src, { [MetricKeys.halsteadVolume]: 100, [MetricKeys.cyclomaticComplexity]: 3 })).toBeCloseTo(
      expected,
      10,
    );
  });

  it("uses CC = 1 when cyclomaticComplexity is absent", () => {
    // LOC = 2. V = 50, CC = 1 (fallback).
    const expected = ((171 - 5.2 * Math.log(50) - 0.23 * 1 - 16.2 * Math.log(2)) * 100) / 171;
    expect(mi(src, { [MetricKeys.halsteadVolume]: 50 })).toBeCloseTo(expected, 10);
  });

  it("gives 100 when V is absent (V = 0)", () => {
    expect(mi(src, {})).toBe(100);
  });

  it("clamps at 0", () => {
    // A huge V and CC give a negative raw value.
    expect(mi(src, { [MetricKeys.halsteadVolume]: 1e30, [MetricKeys.cyclomaticComplexity]: 500 })).toBe(0);
  });
});
