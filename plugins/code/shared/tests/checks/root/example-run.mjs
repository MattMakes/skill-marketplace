#!/usr/bin/env node
// Root G4 / G7: a finished workspace passes both gates and has a review page that passes the
// page checker. On a temp copy (never the workspace itself): `ddd validate --json` exits 0 with
// ok:true, `ddd contracts check --json` exits 0 with ok:true, `review.html` exists and
// checks/1.2.4/check-review.mjs accepts it (with --require-open-decision when given, and always
// --require-diagrams since the page inlines its SVGs without needing Chrome).
//
// <dir> may be the project root (holding ddd/) or the ddd folder itself.
//
// Usage: node plugins/code/shared/tests/checks/root/example-run.mjs <dir> [--require-open-decision]
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "example-run verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..", "..", "..");
const BIN = path.join(SHARED, "bin", "ddd.mjs");
const REVIEW_CHECK = path.resolve(HERE, "..", "1.2.4", "check-review.mjs");

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const dirs = args.filter((a) => !a.startsWith("--"));
if (dirs.length !== 1 || flags.some((f) => f !== "--require-open-decision")) {
  console.error("usage: node plugins/code/shared/tests/checks/root/example-run.mjs <dir> [--require-open-decision]");
  process.exit(2);
}
let src = path.resolve(dirs[0]);
if (!fs.existsSync(path.join(src, "manifest.json")) && fs.existsSync(path.join(src, "ddd", "manifest.json"))) src = path.join(src, "ddd");
if (!fs.existsSync(path.join(src, "manifest.json"))) { console.error(`usage: ${dirs[0]} is not a ddd workspace (no manifest.json, no ddd/manifest.json)`); process.exit(2); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-example-run-"));
const root = path.join(tmp, "project");
fs.mkdirSync(root);
fs.cpSync(src, path.join(root, "ddd"), { recursive: true });
const failures = [];
function ddd(argv) {
  const r = spawnSync(process.execPath, [BIN, ...argv], { cwd: root, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" }, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: r.stdout || "", err: r.stderr || "" };
}
function gate(label, argv) {
  const r = ddd(argv);
  let doc = null;
  try { doc = JSON.parse(r.out); } catch { /* handled below */ }
  if (r.code !== 0) failures.push(`${label}: exit ${r.code}\n      ${(r.out + r.err).trim().split("\n").slice(-4).join("\n      ")}`);
  else if (!doc || doc.ok !== true) failures.push(`${label}: stdout is not {ok: true} JSON`);
  return doc;
}
try {
  const v = gate("ddd validate --json", ["validate", "ddd", "--json"]);
  const c = gate("ddd contracts check --json", ["contracts", "check", "ddd", "--json"]);
  const page = path.join(root, "ddd", "review.html");
  if (!fs.existsSync(page)) failures.push("ddd/review.html missing (every `ddd mark` writes it; `ddd review <dir>` rebuilds it)");
  else {
    const r = spawnSync(process.execPath, [REVIEW_CHECK, page, "--require-diagrams", ...flags], { encoding: "utf8" });
    if (r.status !== 0) failures.push(`check-review.mjs exited ${r.status}:\n      ${(r.stdout + r.stderr).trim().split("\n").slice(-6).join("\n      ")}`);
  }
  if (failures.length) {
    console.log(`example-run verification FAILED (${failures.length}):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log(`${path.relative(process.cwd(), src) || "."}: validate ok (${v?.errors?.length ?? 0} errors, ${v?.warnings?.length ?? 0} warnings), contracts check ok (${c?.errors?.length ?? 0} errors), review.html passes check-review${flags.length ? " " + flags.join(" ") : ""} --require-diagrams`);
  console.log(MARKER);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
