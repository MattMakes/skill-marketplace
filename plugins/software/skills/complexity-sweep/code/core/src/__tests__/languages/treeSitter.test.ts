// Regression tests for parseSyntaxSource: large files that hold characters
// outside the Basic Multilingual Plane (UTF-16 surrogate pairs) must parse
// without ERROR nodes. See review finding F8.

import { beforeAll, describe, expect, it } from "vitest";

import { functionNodes, initSyntaxParsers, parseFixture } from "./syntaxTestUtils";

const LINE_COUNT = 3000;

interface Fixture {
  text: string;
  /** 0-based row of the `after` function. */
  afterRow: number;
}

function rustSource(first: string, second: string): Fixture {
  const lines = ["pub const T: &[(char, &[char])] = &["];
  for (let i = 0; i < LINE_COUNT; i += 1) lines.push(`    ('${first}', &['${second}']),`);
  lines.push("];", "fn after() -> i32 { 1 }");
  return { text: lines.join("\n") + "\n", afterRow: lines.length - 1 };
}

function pythonSource(first: string, second: string): Fixture {
  const lines = ["T = ["];
  for (let i = 0; i < LINE_COUNT; i += 1) {
    lines.push(`    "${first}${second}${first}${second}",`);
  }
  lines.push("]", "def after():", "    return 1");
  return { text: lines.join("\n") + "\n", afterRow: lines.length - 2 };
}

const CASES = [
  { language: "rust", build: rustSource },
  { language: "python", build: pythonSource },
] as const;

describe("parseSyntaxSource", () => {
  beforeAll(async () => {
    await initSyntaxParsers();
  });

  for (const { language, build } of CASES) {
    describe(language, () => {
      it("parses a large file with surrogate pairs without errors", () => {
        const { text, afterRow } = build("\u{102DD}", "\u{10CDD}");
        expect(text.length).toBeGreaterThan(40_000);
        const file = parseFixture(language, text);
        expect(file.tree.rootNode.hasError).toBe(false);
        const rows = functionNodes(file).map((node) => node.startPosition.row);
        expect(rows).toEqual([afterRow]);
      });

      it("parses the same file clean with ASCII characters", () => {
        const { text, afterRow } = build("a", "b");
        const file = parseFixture(language, text);
        expect(file.tree.rootNode.hasError).toBe(false);
        const rows = functionNodes(file).map((node) => node.startPosition.row);
        expect(rows).toEqual([afterRow]);
      });

      it("returns the text unchanged when it has no surrogate", () => {
        const { text } = build("a", "b");
        expect(parseFixture(language, text).text).toBe(text);
      });
    });
  }

  it("does not throw on a lone surrogate", () => {
    const rust = `fn f() -> i32 { 1 } // \uD800\nfn g() -> i32 { 2 } // \uDC00 x\n`;
    const python = `x = "\uD800"\ny = "\uDC00"\n`;
    expect(() => parseFixture("rust", rust)).not.toThrow();
    expect(() => parseFixture("python", python)).not.toThrow();
  });
});
