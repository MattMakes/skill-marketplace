import { beforeAll, describe, expect, it } from "vitest";

import {
  buildGdscriptDefUse,
  gdscriptGlobalDataComplexity,
  gdscriptPeakLiveVariables,
  gdscriptSpecifiedDataComplexity,
  gdscriptVariableSpan,
} from "../../../languages/gdscript/dataFlow";
import type { SyntaxMetricCompute } from "../../../languages/types";
import { initSyntaxParsers, parseFixture, syntaxCtx } from "../syntaxTestUtils";

beforeAll(async () => initSyntaxParsers());

function metric(compute: SyntaxMetricCompute, source: string, index = 0): number {
  const result = compute(syntaxCtx("gdscript", source, index));
  if (typeof result !== "number") throw new Error("expected numeric metric");
  return result;
}

function expectClean(source: string): void {
  expect(parseFixture("gdscript", source).tree.rootNode.hasError).toBe(false);
}

function entries(source: string, index = 0) {
  return buildGdscriptDefUse(syntaxCtx("gdscript", source, index).node);
}

describe("fixtures", () => {
  it("parse without error", () => {
    for (const source of [BLOCK_SCOPE, MATCH_GUARD, CLOSURE, GLOBALS]) {
      expect(parseFixture("gdscript", source).tree.rootNode.hasError).toBe(false);
    }
  });
});

describe("buildGdscriptDefUse", () => {
  it("collects every parameter form in declaration order", () => {
    const result = entries(`func run(a, b: int, c = 1, d: int = 2, ...rest: Array):
\tprint(a, b)
\tprint(c, d, rest)
`);
    // a, b: 1..2; c, d, rest: 1..3.
    expect(result).toEqual([
      { name: "a", defLine: 1, lastUseLine: 2 },
      { name: "b", defLine: 1, lastUseLine: 2 },
      { name: "c", defLine: 1, lastUseLine: 3 },
      { name: "d", defLine: 1, lastUseLine: 3 },
      { name: "rest", defLine: 1, lastUseLine: 3 },
    ]);
  });

  it("collects the setter parameter and gives a getter none", () => {
    const source = `var hp: int = 3:
\tset(value):
\t\thp = value
\tget:
\t\treturn hp
`;
    // set_body: value 2..3. get_body: no parameter, no local.
    expect(entries(source, 0)).toEqual([{ name: "value", defLine: 2, lastUseLine: 3 }]);
    expect(entries(source, 1)).toEqual([]);
  });

  it("collects local var and const names", () => {
    const result = entries(`func run():
\tvar x: int = 1
\tconst K := 2

\treturn x + K
`);
    // x: 2..5; K: 3..5.
    expect(result).toEqual([
      { name: "x", defLine: 2, lastUseLine: 5 },
      { name: "K", defLine: 3, lastUseLine: 5 },
    ]);
  });

  it("gives a block var the scope of its body", () => {
    const result = entries(BLOCK_SCOPE);
    // flag: 1..3. Outer x: 2..7 (line 7 is after the if body, so it
    // resolves to the outer x). Inner x: 4..5 (line 5 is inside the if body).
    expect(result).toEqual([
      { name: "flag", defLine: 1, lastUseLine: 3 },
      { name: "x", defLine: 2, lastUseLine: 7 },
      { name: "x", defLine: 4, lastUseLine: 5 },
    ]);
  });

  it("resolves the initializer of a shadowing var to the outer entry", () => {
    const result = entries(`func run(n):
\tif n:
\t\tvar n = n + 1
\t\tprint(n)
`);
    // Parameter n: 1..3 (the initializer on line 3 reads it).
    // Local n: 3..4.
    expect(result).toEqual([
      { name: "n", defLine: 1, lastUseLine: 3 },
      { name: "n", defLine: 3, lastUseLine: 4 },
    ]);
  });

  it("gives a for variable the scope of the for statement", () => {
    const result = entries(`func run(items):
\tfor item: int in items:
\t\tprint(item)

\tprint(item)
`);
    // items: 1..2. item: 2..3 (line 5 is outside the for, so it resolves to nothing).
    expect(result).toEqual([
      { name: "items", defLine: 1, lastUseLine: 2 },
      { name: "item", defLine: 2, lastUseLine: 3 },
    ]);
  });

  it("puts a pattern guard inside the scope of its pattern bindings", () => {
    const result = entries(MATCH_GUARD);
    // value: 1..2 (match subject). limit: 1..3 (guard).
    // p: 3..6 (guard on 3, body on 6). q: 7..8.
    expect(result).toEqual([
      { name: "value", defLine: 1, lastUseLine: 2 },
      { name: "limit", defLine: 1, lastUseLine: 3 },
      { name: "p", defLine: 3, lastUseLine: 6 },
      { name: "q", defLine: 7, lastUseLine: 8 },
    ]);
  });

  it("collects lambda parameters and scans the lambda body", () => {
    const result = entries(CLOSURE);
    // total: 2..5 (the lambda body reads it on line 5).
    // f: 3..7. y: 3..4 (lambda parameter). m: 3..3 (unused).
    expect(result).toEqual([
      { name: "total", defLine: 2, lastUseLine: 5 },
      { name: "f", defLine: 3, lastUseLine: 7 },
      { name: "y", defLine: 3, lastUseLine: 4 },
      { name: "m", defLine: 3, lastUseLine: 3 },
    ]);
  });

  it("does not count member names, self, super or type names as occurrences", () => {
    const result = entries(`func run(name, size, items, Node):
\tvar a = 1

\tself.name = obj.size
\tobj.items(1)
\tobj.items[0] = 2
\tvar b: Node = super.name
\tprint(self, a)
`);
    // name, size, items: 1..1 (only member names on lines 4 to 7).
    // Node: 1..1 (line 7 holds it in a type). a: 2..8. b: 7..7.
    expect(result).toEqual([
      { name: "name", defLine: 1, lastUseLine: 1 },
      { name: "size", defLine: 1, lastUseLine: 1 },
      { name: "items", defLine: 1, lastUseLine: 1 },
      { name: "Node", defLine: 1, lastUseLine: 1 },
      { name: "a", defLine: 2, lastUseLine: 8 },
      { name: "b", defLine: 7, lastUseLine: 7 },
    ]);
  });

  it("counts the receiver of an attribute and a dictionary key expression", () => {
    const result = entries(`func run(obj, key, k):
\tprint(obj.size)
\tvar d = {key: 1}
\tvar e = {k = 2}
\treturn [d, e]
`);
    // obj: 1..2. key: 1..3 (a `:` key is an expression).
    // k: 1..1 (a Lua-style `k =` key is a name). d: 3..5. e: 4..5.
    expect(result).toEqual([
      { name: "obj", defLine: 1, lastUseLine: 2 },
      { name: "key", defLine: 1, lastUseLine: 3 },
      { name: "k", defLine: 1, lastUseLine: 1 },
      { name: "d", defLine: 3, lastUseLine: 5 },
      { name: "e", defLine: 4, lastUseLine: 5 },
    ]);
  });

  it("finds no occurrence in strings, node paths and get_node", () => {
    const result = entries(`func run(x):
\tprint("x", &"x", ^"x", $x, %x)
`);
    // x: 1..1.
    expect(result).toEqual([{ name: "x", defLine: 1, lastUseLine: 1 }]);
  });

  it("does not descend into a nested unit", () => {
    const source = `func outer(v):
\treturn v

class Inner:
\tfunc inner(v):
\t\tvar w = v

\t\treturn w
`;
    // outer: v 1..2. inner (unit 1): v 5..6, w 6..8.
    expect(entries(source, 0)).toEqual([{ name: "v", defLine: 1, lastUseLine: 2 }]);
    expect(entries(source, 1)).toEqual([
      { name: "v", defLine: 5, lastUseLine: 6 },
      { name: "w", defLine: 6, lastUseLine: 8 },
    ]);
  });

  it("returns the cached array for the same node", () => {
    const ctx = syntaxCtx("gdscript", "func run(a):\n\treturn a\n");
    expect(buildGdscriptDefUse(ctx.node)).toBe(buildGdscriptDefUse(ctx.node));
  });
});

describe("gdscriptPeakLiveVariables and gdscriptVariableSpan", () => {
  it("count overlapping live ranges", () => {
    const source = `func run(a):
\tvar b = a
\tvar c = 1
\tprint(b)

\treturn c
`;
    // a: 1..2; b: 2..4; c: 3..6. Line 3 and 4 hold b and c; line 2 holds a and b.
    // PLV = 2. VSpan = max(1, 2, 3) = 3.
    expect(metric(gdscriptPeakLiveVariables, source)).toBe(2);
    expect(metric(gdscriptVariableSpan, source)).toBe(3);
  });

  it("extend an outer variable through a lambda (closure)", () => {
    // Entries from the def-use test: total 2..5, f 3..7, y 3..4, m 3..3.
    // Line 3 holds total, f, y, m: PLV = 4. VSpan = f: 7 - 3 = 4.
    expect(metric(gdscriptPeakLiveVariables, CLOSURE)).toBe(4);
    expect(metric(gdscriptVariableSpan, CLOSURE)).toBe(4);
  });

  it("keep a shadowing var separate from the outer var", () => {
    // Entries: flag 1..3, outer x 2..7, inner x 4..5.
    // Lines 2 to 5 hold 2 entries each: PLV = 2.
    // VSpan = outer x: 7 - 2 = 5.
    expect(metric(gdscriptPeakLiveVariables, BLOCK_SCOPE)).toBe(2);
    expect(metric(gdscriptVariableSpan, BLOCK_SCOPE)).toBe(5);
  });

  it("return 0 for a unit with no entries", () => {
    // get_body has no parameter and no local.
    const source = "var hp:\n\tget:\n\t\treturn 1\n";
    expect(metric(gdscriptPeakLiveVariables, source)).toBe(0);
    expect(metric(gdscriptVariableSpan, source)).toBe(0);
  });
});

describe("gdscriptSpecifiedDataComplexity", () => {
  it("counts parameters in if and elif conditions", () => {
    const source = `func run(a, b, c):
\tif a > 0:
\t\tpass
\telif b:
\t\tpass
\tprint(c)
`;
    // a (if), b (elif). c is not in a condition. SDV = 2.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(2);
  });

  it("counts a while condition", () => {
    const source = "func run(n: int, m):\n\twhile n > 0:\n\t\tn -= m\n";
    // n (while). m is only in the body. SDV = 1.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(1);
  });

  it("counts the condition of a conditional expression only", () => {
    const source = "func run(a, b, c):\n\treturn a if b else c\n";
    // b is the condition; a and c are the operands. SDV = 1.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(1);
  });

  it("counts the match value and a pattern guard", () => {
    // value (match value), limit (guard). SDV = 2.
    expect(metric(gdscriptSpecifiedDataComplexity, MATCH_GUARD)).toBe(2);
  });

  it("counts a condition inside a lambda", () => {
    const source = "func run(flag, other):\n\tvar f = func(): return 1 if flag else 2\n";
    // flag (lambda body condition). SDV = 1.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(1);
  });

  it("counts typed, default, typed default and variadic parameters", () => {
    const source = `func run(a: int, b = 1, c: int = 2, ...d: Array):
\tif a and b and c and d:
\t\tpass
`;
    // a, b, c, d. SDV = 4.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(4);
  });

  it("counts the setter parameter", () => {
    const source = "var hp:\n\tset(value):\n\t\tif value < 0:\n\t\t\thp = 0\n";
    // value. SDV = 1.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(1);
  });

  it("excludes member names, self, locals and lambda parameters from parameters", () => {
    const source = `func run(size, x):
\tvar local = 1
\tvar f = func(y): return y
\tif self.size or obj.size() or local or y:
\t\tpass
`;
    // self.size and obj.size() are member names; local and y are not unit parameters.
    // x is never in a condition. SDV = 0.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(0);
  });

  it("returns 0 for a unit without parameters", () => {
    const source = "func run():\n\tif x:\n\t\tpass\n";
    // No parameters. SDV = 0.
    expect(metric(gdscriptSpecifiedDataComplexity, source)).toBe(0);
  });
});

describe("gdscriptGlobalDataComplexity", () => {
  it("counts a script static var and not a bare name of an inner-class static var", () => {
    // counter (script static var, written) counts. The bare `shared` is
    // declared only in Inner, so a script-level unit does not see it
    // (design 9.3, 5.4 "Static scope", GDScript review F2). GDV = 1.
    expect(metric(gdscriptGlobalDataComplexity, GLOBALS, 0)).toBe(1);
  });

  it("does not count a member var, a const or an enum", () => {
    const source = `${GLOBALS_HEADER}
func run():
\tprint(member, LIMIT, Mode, Mode.A)
`;
    // member is an instance field, LIMIT a const, Mode an enum. GDV = 0.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(0);
  });

  it("does not count member names and type names", () => {
    const source = `${GLOBALS_HEADER}
func run(obj):
\tobj.counter = 1
\tobj.counter(1)
\tobj.shared[0] = 2
\tvar t: counter = null
`;
    // counter and shared appear only as member names and in a type. GDV = 0.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(0);
  });

  it("does not count a name that a local binding hides", () => {
    const source = `${GLOBALS_HEADER}
func run(counter):
\tvar shared = 1
\tfor other in counter:
\t\tprint(other, shared)
\tvar f = func(stat): return stat
`;
    // counter is a parameter, shared a local var. stat is a lambda parameter
    // that hides the static var stat. GDV = 0.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(0);
  });

  it("does not count names hidden by a for variable or a pattern binding", () => {
    const source = `${GLOBALS_HEADER}
func run(items):
\tfor counter in items:
\t\tprint(counter)
\tmatch items:
\t\t[var shared]:
\t\t\tprint(shared)
\tprint(stat)
`;
    // counter is a for variable, shared a pattern binding. stat counts. GDV = 1.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(1);
  });

  it("counts a read in a lambda and in a default parameter value", () => {
    const source = `${GLOBALS_HEADER}
func run(limit = stat):
\tvar f = func(): return counter
`;
    // stat (default value), counter (lambda body). GDV = 2.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(2);
  });

  it("counts a static var in an accessor unit", () => {
    const source = `${GLOBALS_HEADER}
var hp:
\tset(value):
\t\tcounter += value
`;
    // counter. GDV = 1.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(1);
  });

  it("does not count a static var of a sibling class that a member var shadows (review F2)", () => {
    const source = `class A:
\tstatic var shared := 1

class B:
\tvar shared := 2
\tfunc read():
\t\treturn shared
`;
    expectClean(source);
    // B.shared is an instance field. The static var of A is not visible in B. GDV = 0.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(0);
  });

  it("counts a script static var read from a method of an inner class", () => {
    const source = `static var counter := 0
class Inner:
\tfunc read():
\t\treturn counter
`;
    expectClean(source);
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(1);
  });

  it("counts a static var of class A read from a method of class A", () => {
    const source = `class A:
\tstatic var shared := 1
\tfunc read():
\t\treturn shared
`;
    expectClean(source);
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(1);
  });

  it("counts a static var of class A read from a method of class A.Inner", () => {
    const source = `class A:
\tstatic var shared := 1
\tclass Inner:
\t\tfunc read():
\t\t\treturn shared
`;
    expectClean(source);
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(1);
  });

  it("does not count a script static var that an inner-class member var hides", () => {
    const source = `static var x := 0
class Inner:
\tvar x := 1
\tfunc read():
\t\treturn x
`;
    expectClean(source);
    // Inner declares x, so Inner owns the name and it is an instance field. GDV = 0.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(0);
  });

  it("returns 0 for a file without static vars", () => {
    const source = "var x = 1\nfunc run():\n\tx += 1\n";
    // A member var is not global data. GDV = 0.
    expect(metric(gdscriptGlobalDataComplexity, source)).toBe(0);
  });
});

const BLOCK_SCOPE = `func run(flag):
\tvar x = 1
\tif flag:
\t\tvar x = 2
\t\tprint(x)

\tprint(x)
`;

const MATCH_GUARD = `func run(value, limit):
\tmatch value:
\t\t[var p, 2] when p > limit:
\t\t\tpass

\t\t\tprint(p)
\t\tvar q:
\t\t\tprint(q)
`;

const CLOSURE = `func run():
\tvar total = 0
\tvar f = func(y, m):
\t\tprint(y)
\t\treturn total

\tf.call(1, 2)
`;

const GLOBALS_HEADER = `static var counter := 0
static var stat = []
var member = 1
const LIMIT = 3
enum Mode { A, B }
class Inner:
\tstatic var shared = {}
`;

const GLOBALS = `${GLOBALS_HEADER}
func run():
\tcounter += 1
\treturn Inner.shared if shared else null
`;
