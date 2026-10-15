import { beforeAll, describe, expect, it } from "vitest";

import { extractPythonFunctions } from "../../../languages/python/extract";
import { initSyntaxParsers, parseFixture } from "../syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

function extract(src: string) {
  return extractPythonFunctions(parseFixture("python", src)).map((f) => [f.name, f.line]);
}

describe("extractPythonFunctions", () => {
  it("returns names and 1-based lines for top-level functions", () => {
    expect(extract("def a():\n    pass\n\ndef b():\n    pass\n")).toEqual([
      ["a", 1],
      ["b", 4],
    ]);
  });

  it("returns an empty list for a file with no function", () => {
    expect(extract("x = 1\nclass A:\n    y = 2\n")).toEqual([]);
  });

  it("names a method with its class", () => {
    expect(extract("class Order:\n    def total(self):\n        pass\n")).toEqual([
      ["Order.total", 2],
    ]);
  });

  it("names a nested function with the outer function", () => {
    expect(extract("def outer():\n    def inner():\n        pass\n")).toEqual([
      ["outer", 1],
      ["outer.inner", 2],
    ]);
  });

  it("names a function nested in a method", () => {
    const src = "class Order:\n    def total(self):\n        def helper():\n            pass\n";
    expect(extract(src).map(([n]) => n)).toEqual(["Order.total", "Order.total.helper"]);
  });

  it("names a function in a nested class", () => {
    const src = "class A:\n    class B:\n        def m(self):\n            pass\n";
    expect(extract(src)).toEqual([["A.B.m", 3]]);
  });

  it("names a class declared inside a function", () => {
    const src = "def f():\n    class K:\n        def m(self):\n            pass\n";
    expect(extract(src).map(([n]) => n)).toEqual(["f", "f.K.m"]);
  });

  it("uses the def line for a decorated function", () => {
    expect(extract("@deco\n@other(1)\ndef f():\n    pass\n")).toEqual([["f", 3]]);
  });

  it("extracts async def", () => {
    expect(extract("async def fetch():\n    pass\n")).toEqual([["fetch", 1]]);
  });

  it("keeps pre-order: outer before nested, source order after", () => {
    const src = "def a():\n    def b():\n        pass\n    def c():\n        pass\ndef d():\n    pass\n";
    expect(extract(src).map(([n]) => n)).toEqual(["a", "a.b", "a.c", "d"]);
  });

  it("does not treat a lambda as a unit", () => {
    expect(extract("f = lambda x: x\n")).toEqual([]);
  });
});
