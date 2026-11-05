import { Project, type SourceFile } from "ts-morph";
import { describe, expect, it } from "vitest";

import { extractFunctions } from "../../utils/astHelpers";

function createSourceFile(code: string): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile("test.ts", code);
}

describe("extractFunctions", () => {
  it("extracts a named function declaration", () => {
    const sf = createSourceFile("function foo() { return 1; }");
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe("foo");
  });

  it("extracts arrow functions assigned to const", () => {
    const sf = createSourceFile("const bar = () => 1;");
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe("bar");
  });

  it("extracts class methods (instance and static)", () => {
    const sf = createSourceFile(`
      class MyClass {
        myMethod() { return 1; }
        static staticMethod() { return 2; }
      }
    `);
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(2);
    expect(fns.map((f) => f.name)).toContain("myMethod");
    expect(fns.map((f) => f.name)).toContain("staticMethod");
  });

  it("extracts function expressions assigned to variables (variable name wins)", () => {
    const sf = createSourceFile(
      "const baz = function namedExpr() { return 1; };",
    );
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe("baz");
  });

  it("treats nested arrow functions as separate units", () => {
    const sf = createSourceFile(`
      function outer() {
        const inner = () => 1;
        return inner;
      }
    `);
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(2);
    expect(fns.map((f) => f.name)).toContain("outer");
    expect(fns.map((f) => f.name)).toContain("inner");
  });

  it("extracts exported default function as <anonymous>", () => {
    const sf = createSourceFile("export default function() { return 1; }");
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe("<anonymous>");
  });

  // --- extra coverage from behavior-appendix / spec gotchas ------------------

  it("excludes class constructors", () => {
    const sf = createSourceFile(`
      class Widget {
        constructor() { this.x = 1; }
        render() { return this.x; }
      }
    `);
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe("render");
  });

  it("returns [] for an empty source file", () => {
    const sf = createSourceFile("");
    expect(extractFunctions(sf)).toEqual([]);
  });

  it("extracts arrow functions passed as callbacks (anonymous)", () => {
    const sf = createSourceFile("[1,2].map(() => 1);");
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe("<anonymous>");
  });

  it("extracts arrow function from object-literal property assignment", () => {
    const sf = createSourceFile("const o = { foo: () => 1 };");
    const fns = extractFunctions(sf);
    expect(fns).toHaveLength(1);
    expect(fns[0]?.name).toBe("foo");
  });

  it("reports line numbers (1-based start line)", () => {
    const sf = createSourceFile(`
function a() {}
function b() {}
`);
    const fns = extractFunctions(sf);
    expect(fns.map((f) => f.line)).toEqual([2, 3]);
  });

  it("preserves source order across mixed kinds", () => {
    const sf = createSourceFile(`
function a() {}
const b = () => 1;
class C { m() {} }
const d = function () { return 1; };
`);
    const fns = extractFunctions(sf);
    expect(fns.map((f) => f.name)).toEqual(["a", "b", "m", "d"]);
  });
});
