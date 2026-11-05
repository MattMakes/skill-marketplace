import { beforeAll, describe, expect, it } from "vitest";

import { pythonScopeDepthWeightedLoc } from "../../../languages/python/operations";
import { pythonCodeLines } from "../../../languages/python/operations.scopeDepth";
import { initSyntaxParsers, syntaxCtx } from "../syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

/** Joins source lines. Line 1 is the first argument. */
function src(...lines: string[]): string {
  return lines.join("\n") + "\n";
}

function weightedLoc(text: string, index = 0): number {
  return pythonScopeDepthWeightedLoc(syntaxCtx("python", text, index)) as number;
}

function codeLines(text: string, index = 0): number[] {
  const ctx = syntaxCtx("python", text, index);
  return pythonCodeLines(ctx.node, ctx.file.text);
}

describe("pythonScopeDepth: nested lambdas (review F3)", () => {
  it("adds 1 level for each lambda body", () => {
    const text = src("def f(): return lambda: (lambda: 1)");
    // Hand count: the only code line is in the inner lambda body at depth 2 = 2 + 1.
    expect(weightedLoc(text)).toBe(3);
  });

  it("keeps depth 1 for a single lambda body", () => {
    const text = src("def f(): return lambda: 1");
    // Hand count: the only code line is at depth 1 = 1 + 1.
    expect(weightedLoc(text)).toBe(2);
  });

  it("adds a block level on top of nested lambda levels", () => {
    const text = src(
      "def f(x):",
      "    if x:",
      "        return lambda: (lambda: 1)",
    );
    // Hand count: line 2 depth 0 = 1; line 3 is in the `if` block (1) and 2 lambda levels = 3 + 1.
    expect(weightedLoc(text)).toBe(5);
  });
});

describe("pythonCodeLines: brace-only lines in strings (review F4)", () => {
  it("keeps a brace-only line inside a multi-line string", () => {
    const text = src(
      "def f():",
      '    s = """a',
      "}",
      'b"""',
      "    return s",
    );
    // Hand count: lines 2 to 5 hold code, so the function is flat = 4 lines at depth 0.
    expect(codeLines(text)).toEqual([2, 3, 4, 5]);
    expect(weightedLoc(text)).toBe(4);
  });

  it("still drops a blank line inside a multi-line string", () => {
    const text = src(
      "def f():",
      '    s = """a',
      "",
      'b"""',
      "    return s",
    );
    // Hand count: the blank line 3 does not count, so lines 2, 4 and 5 count.
    expect(codeLines(text)).toEqual([2, 4, 5]);
  });

  it("still drops a brace-only syntax line that closes a dict literal", () => {
    const text = src(
      "def f():",
      "    d = {",
      "        1: 2,",
      "    }",
      "    return d",
    );
    // Hand count: the `}` on line 4 is syntax, so lines 2, 3 and 5 count.
    expect(codeLines(text)).toEqual([2, 3, 5]);
  });
});
