import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";

import { extractFunctions } from "../../utils/astHelpers";
import { buildDefUseMap, type DefUseEntry } from "../../utils/defUseAnalysis";

interface FnResult {
  name: string;
  entries: DefUseEntry[];
}

function analyzeDefUse(code: string): FnResult[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile("test.ts", code);
  const fns = extractFunctions(sf);
  return fns.map((f) => ({
    name: f.name,
    entries: buildDefUseMap(f.node, sf),
  }));
}

describe("buildDefUseMap", () => {
  it("tracks simple sequential variables", () => {
    const results = analyzeDefUse(`
function f() {
  const a = 1;
  const b = 2;
  use(a);
  use(b);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    const a = entries.find((e) => e.name === "a");
    const b = entries.find((e) => e.name === "b");
    expect(a?.defLine).toBe(3);
    expect(a?.lastUseLine).toBe(5);
    expect(b?.defLine).toBe(4);
    expect(b?.lastUseLine).toBe(6);
  });

  it("tracks overlapping live ranges", () => {
    const results = analyzeDefUse(`
function f() {
  const a = 1;
  const b = 2;
  const c = 3;
  use(a, b);
  use(b, c);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(3);
    expect(entries.find((e) => e.name === "a")?.lastUseLine).toBe(6);
    expect(entries.find((e) => e.name === "b")?.lastUseLine).toBe(7);
    expect(entries.find((e) => e.name === "c")?.lastUseLine).toBe(7);
  });

  it("handles block-scoped variables (let/const inside if)", () => {
    const results = analyzeDefUse(`
function f() {
  const x = 1;
  if (true) {
    const y = 2;
    use(y);
  }
  use(x);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    const x = entries.find((e) => e.name === "x");
    const y = entries.find((e) => e.name === "y");
    expect(x?.defLine).toBe(3);
    expect(x?.lastUseLine).toBe(8);
    expect(y?.defLine).toBe(5);
    expect(y?.lastUseLine).toBe(6);
  });

  it("handles shadowed variables (same name, different scopes)", () => {
    const results = analyzeDefUse(`
function f() {
  const x = 1;
  if (true) {
    const x = 2;
    use(x);
  }
  use(x);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    expect(entries[0]?.name).toBe("x");
    expect(entries[1]?.name).toBe("x");
    expect(entries[0]?.defLine).toBe(3);
    expect(entries[0]?.lastUseLine).toBe(8);
    expect(entries[1]?.defLine).toBe(5);
    expect(entries[1]?.lastUseLine).toBe(6);
  });

  it("handles destructured bindings as separate entries", () => {
    const results = analyzeDefUse(`
function f() {
  const { a, b, c } = obj;
  use(a);
  use(c);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(3);
    const a = entries.find((e) => e.name === "a");
    const b = entries.find((e) => e.name === "b");
    const c = entries.find((e) => e.name === "c");
    expect(a?.defLine).toBe(3);
    expect(a?.lastUseLine).toBe(4);
    expect(b?.defLine).toBe(3);
    expect(b?.lastUseLine).toBe(3);
    expect(c?.defLine).toBe(3);
    expect(c?.lastUseLine).toBe(5);
  });

  it("handles loop iteration variables (scoped to loop body)", () => {
    const results = analyzeDefUse(`
function f() {
  const items = [1, 2, 3];
  for (const item of items) {
    use(item);
  }
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    const items = entries.find((e) => e.name === "items");
    const item = entries.find((e) => e.name === "item");
    expect(items?.defLine).toBe(3);
    expect(item?.lastUseLine).toBe(5);
  });

  it("handles parameters (defLine = signature line)", () => {
    const results = analyzeDefUse(`
function f(x: number, y: string) {
  use(x);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    const x = entries.find((e) => e.name === "x");
    const y = entries.find((e) => e.name === "y");
    expect(x?.defLine).toBe(2);
    expect(x?.lastUseLine).toBe(3);
    expect(y?.defLine).toBe(2);
    expect(y?.lastUseLine).toBe(2);
  });

  it("handles unused variables (span = 0)", () => {
    const results = analyzeDefUse(`
function f() {
  const x = 1;
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe("x");
    expect(entries[0]?.defLine).toBe(entries[0]?.lastUseLine);
  });

  it("handles closures (last use = lexical position of reference)", () => {
    const results = analyzeDefUse(`
function f() {
  const x = 1;
  const fn = () => {
    return x;
  };
  use(fn);
}
`);
    const outer = results.find((r) => r.name === "f");
    expect(outer).toBeDefined();
    const x = outer!.entries.find((e) => e.name === "x");
    const fn = outer!.entries.find((e) => e.name === "fn");
    expect(x?.defLine).toBe(3);
    expect(x?.lastUseLine).toBe(5);
    expect(fn).toBeDefined();
  });

  it("handles var declarations (function-scoped even inside blocks)", () => {
    const results = analyzeDefUse(`
function f() {
  if (true) {
    var x = 1;
  }
  use(x);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(1);
    const x = entries.find((e) => e.name === "x");
    expect(x?.defLine).toBe(4);
    expect(x?.lastUseLine).toBe(6);
  });

  it("handles rest parameters in destructuring", () => {
    const results = analyzeDefUse(`
function f() {
  const { a, ...rest } = obj;
  use(a);
  use(rest);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.name === "a")).toBeDefined();
    expect(entries.find((e) => e.name === "rest")).toBeDefined();
  });

  it("handles array destructuring", () => {
    const results = analyzeDefUse(`
function f() {
  const [a, b] = arr;
  use(a);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    const a = entries.find((e) => e.name === "a");
    const b = entries.find((e) => e.name === "b");
    expect(a?.lastUseLine).toBe(4);
    expect(b?.lastUseLine).toBe(3);
  });

  it("does not traverse into nested functions for variable declarations", () => {
    const results = analyzeDefUse(`
function outer() {
  const x = 1;
  function inner() {
    const y = 2;
    use(y);
  }
  use(x);
}
`);
    const outer = results.find((r) => r.name === "outer");
    const inner = results.find((r) => r.name === "inner");
    expect(outer?.entries).toHaveLength(1);
    expect(outer?.entries[0]?.name).toBe("x");
    expect(inner?.entries).toHaveLength(1);
    expect(inner?.entries[0]?.name).toBe("y");
  });

  it("handles for-in loop variables", () => {
    const results = analyzeDefUse(`
function f() {
  const obj = {};
  for (const key in obj) {
    use(key);
  }
}
`);
    const entries = results[0]!.entries;
    expect(entries.find((e) => e.name === "key")?.lastUseLine).toBe(5);
  });

  it("handles multiple uses of the same variable (last one wins)", () => {
    const results = analyzeDefUse(`
function f() {
  const x = 1;
  use(x);
  use(x);
  use(x);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.lastUseLine).toBe(6);
  });

  it("is cached across calls for the same node", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sf = project.createSourceFile(
      "test.ts",
      "function f() { const x = 1; use(x); }",
    );
    const fns = extractFunctions(sf);
    const fn = fns[0]!;
    const r1 = buildDefUseMap(fn.node, sf);
    const r2 = buildDefUseMap(fn.node, sf);
    expect(r1).toBe(r2);
  });

  // --- extra coverage ---------------------------------------------------------

  it("tracks for-statement init declarations (`for (let i = 0; ...)`)", () => {
    const results = analyzeDefUse(`
function f() {
  for (let i = 0; i < 10; i++) {
    use(i);
  }
}
`);
    const entries = results[0]!.entries;
    const i = entries.find((e) => e.name === "i");
    expect(i?.defLine).toBe(3);
    expect(i?.lastUseLine).toBe(4);
  });

  it("destructured parameters produce one entry per leaf name", () => {
    const results = analyzeDefUse(`
function f({ a, b }: { a: number; b: number }) {
  use(a);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.name).sort()).toEqual(["a", "b"]);
  });

  it("does not include free references to variables declared outside the function", () => {
    const results = analyzeDefUse(`
const outside = 1;
function f() {
  use(outside);
}
`);
    const entries = results[0]!.entries;
    expect(entries).toEqual([]);
  });

  it("keeps the receiver of a property access as a use (a.b counts `a`)", () => {
    const results = analyzeDefUse(`
function f() {
  const a = { b: 1 };
  return a.b;
}
`);
    const entries = results[0]!.entries;
    const a = entries.find((e) => e.name === "a");
    expect(a?.lastUseLine).toBe(4);
  });

  it("counts shorthand property assignments as uses", () => {
    const results = analyzeDefUse(`
function f() {
  const a = 1;
  return { a };
}
`);
    const entries = results[0]!.entries;
    expect(entries.find((e) => e.name === "a")?.lastUseLine).toBe(4);
  });
});
