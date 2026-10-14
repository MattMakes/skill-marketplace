// End-to-end test of the built CLI. Build core and cli first (`npm run build`
// in each); this test runs `dist/index.js`, not the TypeScript source.

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI = resolve(__dirname, "..", "..", "dist", "index.js");
const CORE_SRC = resolve(__dirname, "..", "..", "..", "core", "src");

// The built CLI must write all of stdout when stdout is a pipe. The pipe
// buffer holds 65,536 bytes; a `process.exit` right after the write cut the
// output at that size.
const PIPE_BUFFER_BYTES = 65_536;

interface CliRun {
  stdout: Buffer;
  code: number | null;
}

/** Run the built CLI with stdout as a pipe and collect every byte. */
function runCli(args: readonly string[], cwd: string): Promise<CliRun> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("node", [CLI, ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) => {
      resolvePromise({ stdout: Buffer.concat(chunks), code });
    });
  });
}

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

  it("writes complete JSON to a pipe when the output exceeds 65,536 bytes", async () => {
    const { stdout, code } = await runCli(
      ["--format", "json", "--threshold-action", "none", `${CORE_SRC}/**/*.ts`],
      dir,
    );

    expect(stdout.length).toBeGreaterThan(PIPE_BUFFER_BYTES);
    const output = JSON.parse(stdout.toString("utf8")) as { files: CliFile[] };
    expect(output.files.length).toBeGreaterThan(0);
    expect(code).toBe(0);
  });

  it("exits 1 with --threshold-action error when a function breaks an error threshold", async () => {
    const branches = Array.from(
      { length: 30 },
      (_, i) => `  if (x === ${i}) return ${i};\n`,
    ).join("");
    writeFileSync(
      join(dir, "complex.ts"),
      `export function complex(x: number): number {\n${branches}  return -1;\n}\n`,
    );

    const { stdout, code } = await runCli(
      ["--format", "json", "--threshold-action", "error", join(dir, "complex.ts")],
      dir,
    );

    expect(code).toBe(1);
    expect(() => JSON.parse(stdout.toString("utf8"))).not.toThrow();
  });
});
