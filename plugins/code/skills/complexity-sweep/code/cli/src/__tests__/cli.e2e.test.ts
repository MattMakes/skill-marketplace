// End-to-end test of the built CLI. Build core and cli first (`npm run build`
// in each); this test runs `dist/index.js`, not the TypeScript source.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI = resolve(__dirname, "..", "..", "dist", "index.js");

const FILES: Record<string, string> = {
  "a.ts": "export function a(x: number): number { if (x > 0) return 1; return 0; }\n",
  "b.py": "def b(x):\n    if x:\n        return 1\n    return 0\n",
  "c.rs": "fn c(x: i32) -> i32 { if x > 0 { 1 } else { 0 } }\n",
  "d.txt": "not code\n",
  "node_modules/x.py": "def x():\n    return 1\n",
  ".venv/y.py": "def y():\n    return 1\n",
  "target/z.rs": "fn z() {}\n",
  "test_a.py": "def test_a():\n    assert True\n",
};

interface CliFile {
  filePath: string;
  language?: string;
}

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "cli-e2e-"));
  for (const [rel, text] of Object.entries(FILES)) {
    const full = join(dir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, text);
  }
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("built CLI", () => {
  it("analyzes .ts, .py and .rs files in 1 run and reports the language", () => {
    // execFileSync throws on a non-zero exit code, so a return means exit 0.
    const stdout = execFileSync(
      "node",
      [CLI, "--format", "json", "--threshold-action", "none", `${dir}/**/*`],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const output = JSON.parse(stdout) as { files: CliFile[] };

    expect(output.files.map((f) => [f.filePath, f.language])).toEqual([
      [join(dir, "a.ts"), "typescript"],
      [join(dir, "b.py"), "python"],
      [join(dir, "c.rs"), "rust"],
    ]);
  });

  it("exits 2 when no file matches", () => {
    let status: number | null = null;
    try {
      execFileSync("node", [CLI, "--format", "json", `${dir}/**/*.go`], {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      status = (err as { status: number | null }).status;
    }
    expect(status).toBe(2);
  });
});
