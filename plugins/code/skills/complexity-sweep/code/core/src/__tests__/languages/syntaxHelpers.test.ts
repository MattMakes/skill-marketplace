import { beforeAll, describe, expect, it } from "vitest";

import {
  ancestorsUntil,
  createNodeCache,
  sameNode,
  walkDescendants,
} from "../../languages/syntaxHelpers";
import { functionNodes, initSyntaxParsers, parseFixture, syntaxCtx } from "./syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

describe("tree-sitter contract", () => {
  it("parses Python and Rust", () => {
    expect(parseFixture("python", "def f():\n    pass\n").tree.rootNode.type).toBe("module");
    expect(parseFixture("rust", "fn f() {}\n").tree.rootNode.type).toBe("source_file");
  });

  it("finds function nodes in pre-order", () => {
    const file = parseFixture("python", "def a():\n    def b():\n        pass\n\ndef c():\n    pass\n");
    expect(functionNodes(file).map((n) => n.childForFieldName("name")?.text)).toEqual(["a", "b", "c"]);
  });

  it("walkDescendants excludes the root and honors a skip", () => {
    const { node } = syntaxCtx("rust", "fn f() { let x = || { 1 }; }\n");
    const all: string[] = [];
    walkDescendants(node, (n) => {
      all.push(n.type);
    });
    expect(all).not.toContain("function_item");
    expect(all).toContain("closure_expression");
    const pruned: string[] = [];
    walkDescendants(node, (n) => {
      pruned.push(n.type);
      return n.type !== "closure_expression";
    });
    expect(pruned).toContain("closure_expression");
    expect(pruned.length).toBeLessThan(all.length);
  });

  it("compares nodes by id, not by object identity", () => {
    const file = parseFixture("python", "def f():\n    pass\n");
    const a = file.tree.rootNode.child(0);
    const b = file.tree.rootNode.child(0);
    expect(a === b).toBe(false);
    expect(sameNode(a, b)).toBe(true);
  });

  it("caches per node across fresh node objects", () => {
    const file = parseFixture("python", "def f():\n    return 1\n");
    const cache = createNodeCache<number>();
    const first = functionNodes(file)[0]!;
    cache.set(first, 7);
    expect(cache.get(functionNodes(file)[0]!)).toBe(7);
    const ret = first.descendantsOfType("return_statement")[0]!;
    expect([...ancestorsUntil(ret, first)].map((n) => n.type)).toEqual(["block"]);
  });
});
