import { beforeAll, describe, expect, it } from "vitest";

import { extractGdscriptFunctions } from "../../../languages/gdscript/extract";
import { initSyntaxParsers, parseFixture } from "../syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

function extract(src: string) {
  const file = parseFixture("gdscript", src);
  expect(file.tree.rootNode.hasError).toBe(false);
  return extractGdscriptFunctions(file).map((f) => ({ name: f.name, line: f.line }));
}

describe("extractGdscriptFunctions", () => {
  it("names plain functions with their 1-based lines in source order", () => {
    const src = "extends Node\n\nfunc _ready():\n\tpass\n\nfunc attack(a):\n\treturn a\n";
    expect(extract(src)).toEqual([
      { name: "_ready", line: 3 },
      { name: "attack", line: 6 },
    ]);
  });

  it("names a static func by its plain name", () => {
    expect(extract("static func make():\n\tpass\n")).toEqual([{ name: "make", line: 1 }]);
  });

  it("gives the script-level _init the name _init", () => {
    expect(extract("func _init():\n\tpass\n")).toEqual([{ name: "_init", line: 1 }]);
  });

  it("prefixes a method with the inner class name", () => {
    const src = "class Inner:\n\tfunc bump():\n\t\tpass\n";
    expect(extract(src)).toEqual([{ name: "Inner.bump", line: 2 }]);
  });

  it("names an inner-class _init Inner._init", () => {
    const src = "class Inner:\n\tfunc _init():\n\t\tpass\n";
    expect(extract(src)).toEqual([{ name: "Inner._init", line: 2 }]);
  });

  it("joins nested inner classes with dots, outer first", () => {
    const src = "class A:\n\tclass B:\n\t\tfunc go():\n\t\t\tpass\n";
    expect(extract(src)).toEqual([{ name: "A.B.go", line: 3 }]);
  });

  it("does not add class_name to the name", () => {
    const src = "class_name Player\nextends Node\n\nfunc hit():\n\tpass\n";
    expect(extract(src)).toEqual([{ name: "hit", line: 4 }]);
  });

  it("makes property accessors units named <var>.set and <var>.get", () => {
    const src =
      "var health: int = 10:\n\tset(value):\n\t\thealth = value\n\tget:\n\t\treturn health\n";
    expect(extract(src)).toEqual([
      { name: "health.set", line: 2 },
      { name: "health.get", line: 4 },
    ]);
  });

  it("names an accessor in an inner class Inner.hp.get", () => {
    const src = "class Inner:\n\tvar hp = 1:\n\t\tget:\n\t\t\treturn hp\n";
    expect(extract(src)).toEqual([{ name: "Inner.hp.get", line: 3 }]);
  });

  it("gives no unit to an @abstract func without a body", () => {
    expect(extract("@abstract func area() -> float\n\nfunc other():\n\tpass\n")).toEqual([
      { name: "other", line: 3 },
    ]);
  });

  it("gives no unit to a named lambda", () => {
    const src = "func run():\n\tvar f = func helper(x):\n\t\treturn x\n\treturn f\n";
    expect(extract(src)).toEqual([{ name: "run", line: 1 }]);
  });

  it("returns no unit for a file without a function", () => {
    expect(extract("extends Node\nvar a = 1\nconst B = 2\n")).toEqual([]);
  });

  it("keeps pre-order with accessors, _init and inner classes mixed", () => {
    const src =
      "var a = 1:\n\tget:\n\t\treturn a\n\nfunc _init():\n\tpass\n\nclass K:\n\tfunc m():\n\t\tpass\n\nfunc last():\n\tpass\n";
    expect(extract(src).map((f) => f.name)).toEqual(["a.get", "_init", "K.m", "last"]);
  });
});
