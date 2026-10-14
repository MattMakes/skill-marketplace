#!/usr/bin/env node
// Branch 1.1 (shared core) N3: the four children compose. One temp workspace goes through the real
// CLI: validate (clean) -> stamp an upstream file -> validate marks downstream stale on disk ->
// in-process validate with persist:false does not -> mark with DDD_NO_RENDER=1 keeps exit 0 and
// the manifest sane -> mark with a throwing review.mjs shim still exits 0.
// Usage: node plugins/code/shared/tests/checks/node-1.1/verify-integration.mjs <branch-id>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.argv.length !== 3 || process.argv[2] !== "1.1") {
  console.error("usage: node verify-integration.mjs 1.1");
  process.exit(2);
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..", "..", "..");
const BIN = path.join(SHARED, "bin/ddd.mjs");
const fails = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-node-1.1-"));
const run = (args, env = {}) => spawnSync(process.execPath, [BIN, ...args], { cwd: tmp, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1", ...env } });
try {
  fs.cpSync(path.join(SHARED, "examples/mealkit"), tmp, { recursive: true });
  const ddd = path.join(tmp, "ddd");
  let r = run(["validate", ddd, "--status"]);
  if (r.status !== 0 || !r.stdout.includes("RESULT: OK")) fails.push(`clean validate: exit ${r.status}`);
  r = run(["stamp", path.join(ddd, "02-discover/discover.json")]);
  if (r.status !== 0) fails.push(`stamp: exit ${r.status} ${r.stderr}`);
  const before = fs.readFileSync(path.join(ddd, "manifest.json"), "utf8");
  const { validate } = await import(pathToFileURL(path.join(SHARED, "lib/validate.mjs")).href);
  const rep = validate(ddd, { persist: false });
  const after = fs.readFileSync(path.join(ddd, "manifest.json"), "utf8");
  if (before !== after) fails.push("validate(persist:false) changed manifest.json");
  const staleInReport = Object.values(rep.steps || {}).filter((s) => s.status === "stale").length;
  if (staleInReport < 1) fails.push("persist:false report shows no stale steps after an upstream stamp");
  r = run(["validate", ddd, "--json"]);
  const m = JSON.parse(fs.readFileSync(path.join(ddd, "manifest.json"), "utf8"));
  const staleOnDisk = Object.values(m.steps).filter((s) => s.status === "stale").length;
  if (staleOnDisk < 1) fails.push("CLI validate did not persist stale");
  r = run(["mark", "--dir", ddd, "decompose", "done", "--mode", "auto"]);
  if (r.status !== 0) fails.push(`mark: exit ${r.status} ${r.stderr}`);
  const m2 = JSON.parse(fs.readFileSync(path.join(ddd, "manifest.json"), "utf8"));
  if (m2.steps.decompose.status !== "done") fails.push("mark did not set decompose done");
  // hook seam: a review.mjs that throws must not change mark's exit code
  const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-shim-"));
  fs.cpSync(path.join(SHARED, "bin"), path.join(shimDir, "bin"), { recursive: true });
  fs.cpSync(path.join(SHARED, "lib"), path.join(shimDir, "lib"), { recursive: true });
  fs.cpSync(path.join(SHARED, "schemas"), path.join(shimDir, "schemas"), { recursive: true });
  fs.writeFileSync(path.join(shimDir, "lib/review.mjs"), "export function buildPage(){ throw new Error('boom'); }\nexport function renderDiagrams(){ throw new Error('boom'); }\n");
  r = spawnSync(process.execPath, [path.join(shimDir, "bin/ddd.mjs"), "mark", "--dir", ddd, "decompose", "done"], { cwd: tmp, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "" } });
  if (r.status !== 0) fails.push(`mark with throwing review.mjs: exit ${r.status}`);
  if (!/review:/.test(r.stderr)) fails.push("mark hook failure not reported on stderr with review: prefix");
  fs.rmSync(shimDir, { recursive: true, force: true });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log("validate -> stamp -> stale on disk / not in-process -> mark -> hook seam: all composed");
console.log("integration verification passed");
