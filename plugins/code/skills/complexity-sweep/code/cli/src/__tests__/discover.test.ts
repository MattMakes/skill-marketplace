import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveConfig } from "../config";
import {
  createExcludeMatcher,
  discoverSources,
  expandPatterns,
  routeSources,
} from "../discover";

const FILES: Record<string, string> = {
  "a.ts": "export function a(): number { return 1; }\n",
  "b.py": "def b():\n    return 1\n",
  "c.rs": "fn c() -> i32 { 1 }\n",
  "d.txt": "not code\n",
  "node_modules/x.py": "def x():\n    return 1\n",
  ".venv/y.py": "def y():\n    return 1\n",
  "target/z.rs": "fn z() {}\n",
  "test_a.py": "def test_a():\n    assert True\n",
};

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "discover-"));
  for (const [rel, text] of Object.entries(FILES)) {
    const full = join(dir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, text);
  }
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const defaultExclude = (): string[] => resolveConfig({}).exclude;

describe("routeSources", () => {
  it("routes only a.ts, b.py and c.rs, each to its language", () => {
    const routed = routeSources([`${dir}/**/*`], defaultExclude(), dir);
    expect(routed).toEqual([
      { filePath: join(dir, "a.ts"), language: "typescript" },
      { filePath: join(dir, "b.py"), language: "python" },
      { filePath: join(dir, "c.rs"), language: "rust" },
    ]);
  });

  it("uses the default include globs relative to cwd", () => {
    const routed = routeSources(resolveConfig({}).include, defaultExclude(), dir);
    expect(routed.map((r) => r.language)).toEqual(["typescript", "python", "rust"]);
  });

  it("accepts plain file paths and several patterns in 1 run", () => {
    const routed = routeSources(["c.rs", `${dir}/a.ts`, "*.py"], defaultExclude(), dir);
    expect(routed.map((r) => r.filePath)).toEqual([
      join(dir, "a.ts"),
      join(dir, "b.py"),
      join(dir, "c.rs"),
    ]);
  });

  it("returns nothing when no file matches", () => {
    expect(routeSources([`${dir}/**/*.go`, "missing.ts"], [], dir)).toEqual([]);
  });
});

describe("expandPatterns", () => {
  it("does not expand into node_modules", () => {
    const paths = expandPatterns([`${dir}/**/*.py`], dir);
    expect(paths.some((p) => p.includes("node_modules"))).toBe(false);
    expect(paths).toContain(join(dir, "b.py"));
  });
});

describe("discoverSources", () => {
  it("reads Python and Rust files as UTF-8 text", () => {
    const found = discoverSources([`${dir}/**/*`], defaultExclude(), dir);
    expect(found.typescriptPaths).toEqual([join(dir, "a.ts")]);
    expect(found.syntaxInputs).toEqual([
      { language: "python", filePath: join(dir, "b.py"), text: FILES["b.py"] },
      { language: "rust", filePath: join(dir, "c.rs"), text: FILES["c.rs"] },
    ]);
  });
});

describe("createExcludeMatcher", () => {
  const isExcluded = createExcludeMatcher(
    ["**/*.test.ts", "**/target/**", "src/generated/**"],
    "/work",
  );

  it("excludes /tmp/abc/a.test.ts with **/*.test.ts", () => {
    expect(isExcluded("/tmp/abc/a.test.ts")).toBe(true);
  });

  it("excludes /tmp/abc/target/z.rs with **/target/**", () => {
    expect(isExcluded("/tmp/abc/target/z.rs")).toBe(true);
  });

  it("excludes a nested node_modules path", () => {
    expect(isExcluded("/tmp/abc/pkg/node_modules/dep/lib/index.js")).toBe(true);
  });

  it("excludes a .venv path with the default exclude list", () => {
    const matcher = createExcludeMatcher(defaultExclude(), "/work");
    expect(matcher("/tmp/abc/.venv/lib/y.py")).toBe(true);
    expect(matcher("/tmp/abc/pkg/test_mod.py")).toBe(true);
    expect(matcher("/tmp/abc/a.spec.ts")).toBe(true);
  });

  it("matches a relative glob against the path relative to cwd", () => {
    expect(isExcluded("/work/src/generated/api.ts")).toBe(true);
    expect(isExcluded("/other/src/generated/api.ts")).toBe(false);
  });

  it("keeps an ordinary source path", () => {
    expect(isExcluded("/tmp/abc/a.ts")).toBe(false);
    expect(isExcluded("/tmp/abc/targets.rs")).toBe(false);
  });
});
