#!/usr/bin/env node
// G3: on a temp copy of the example, `ddd mark` rebuilds review.html and
// ddd/diagrams/*.svg after writing the manifest; with the renderer forced to throw
// (DDD_RENDER_FAIL=1) it prints a `review:` warning on stderr, still exits 0 and the
// manifest is updated.
//
// Usage: node check-mark-hook.mjs   (CWD = repository root or anywhere; paths are absolute)
// Exit 0 and print `mark-hook verification passed`; 1 on a failed assertion; 2 on misuse.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.argv.length > 2) { console.error("usage: node check-mark-hook.mjs"); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(here, "../../..");
const BIN = path.join(SHARED, "bin", "ddd.mjs");
const FIXTURE = path.join(SHARED, "examples", "mealkit");

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-markhook-"));
try {
  const root = path.join(tmp, "mealkit");
  fs.cpSync(FIXTURE, root, { recursive: true });
  const ddd = path.join(root, "ddd");
  fs.rmSync(path.join(ddd, "diagrams"), { recursive: true, force: true });
  fs.rmSync(path.join(ddd, "review.html"), { force: true });
  // Chrome is switched off: the hook's PNG branch is G4's business and slow.
  const env = { ...process.env, DDD_NO_CHROME: "1" };
  delete env.DDD_NO_RENDER;
  delete env.DDD_RENDER_FAIL;

  // 1. A normal mark rebuilds page and diagrams.
  let r = spawnSync(process.execPath, [BIN, "mark", "--dir", ddd, "code", "done"], { encoding: "utf8", env });
  check(r.status === 0, `mark exited ${r.status}: ${r.stderr}`);
  check(fs.existsSync(path.join(ddd, "review.html")), "mark did not write review.html");
  const svgs = fs.existsSync(path.join(ddd, "diagrams")) ? fs.readdirSync(path.join(ddd, "diagrams")).filter((f) => f.endsWith(".svg")) : [];
  check(svgs.length > 0, "mark did not write ddd/diagrams/*.svg");
  check(/review: wrote /.test(r.stderr), `mark's stderr has no 'review: wrote' line: ${r.stderr}`);
  check(/review: \d+ svg/.test(r.stderr), `mark's stderr has no 'review: N svg' line: ${r.stderr}`);
  let manifest = JSON.parse(fs.readFileSync(path.join(ddd, "manifest.json"), "utf8"));
  check(manifest.steps && manifest.steps.code && manifest.steps.code.status === "done", "manifest not updated by the first mark");
  const pageBefore = fs.readFileSync(path.join(ddd, "review.html"), "utf8");

  // 2. With the renderer forced to throw: a warning, exit 0, manifest still updated.
  fs.rmSync(path.join(ddd, "diagrams"), { recursive: true, force: true });
  r = spawnSync(process.execPath, [BIN, "mark", "--dir", ddd, "code", "draft"], { encoding: "utf8", env: { ...env, DDD_RENDER_FAIL: "1" } });
  check(r.status === 0, `mark with DDD_RENDER_FAIL=1 exited ${r.status}`);
  check(/^review: .*DDD_RENDER_FAIL/m.test(r.stderr) || /^review: .*forced to fail/m.test(r.stderr), `no 'review:' warning on stderr: ${r.stderr}`);
  check(!/review:/.test(r.stdout), "the review warning leaked to stdout");
  manifest = JSON.parse(fs.readFileSync(path.join(ddd, "manifest.json"), "utf8"));
  check(manifest.steps.code.status === "draft", "manifest not updated when the renderer failed");
  // The page is still rebuilt (buildPage runs before renderDiagrams and is independent).
  const pageAfter = fs.readFileSync(path.join(ddd, "review.html"), "utf8");
  check(pageAfter !== pageBefore, "review.html was not rebuilt by the second mark");
  check(!fs.existsSync(path.join(ddd, "diagrams")) || !fs.readdirSync(path.join(ddd, "diagrams")).some((f) => f.endsWith(".svg")), "diagrams were written although the renderer was forced to fail");

  // 3. DDD_NO_RENDER=1 skips the hook entirely.
  r = spawnSync(process.execPath, [BIN, "mark", "--dir", ddd, "code", "done"], { encoding: "utf8", env: { ...env, DDD_NO_RENDER: "1" } });
  check(r.status === 0, `mark with DDD_NO_RENDER=1 exited ${r.status}`);
  check(!/review:/.test(r.stderr), `DDD_NO_RENDER=1 still ran the hook: ${r.stderr}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log("mark-hook verification passed");
