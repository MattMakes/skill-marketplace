#!/usr/bin/env node
// Branch 1.2 (visual layer) N3: one `ddd mark` on a temp copy of mealkit produces the whole
// visual output (page, every diagram SVG, layout memory, decision composites for BOTH decisions,
// PNGs when Chrome is present), the page passes the review checker with the strict flags, a
// second mark gives byte-identical SVGs, and the blueprint export validates. Usage: node verify-integration.mjs 1.2
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
if (process.argv.length !== 3 || process.argv[2] !== "1.2") { console.error("usage: node verify-integration.mjs 1.2"); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..", "..", "..");
const BIN = path.join(SHARED, "bin/ddd.mjs");
const fails = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-node-1.2-"));
const run = (args, env = {}) => spawnSync(process.execPath, [BIN, ...args], { cwd: tmp, encoding: "utf8", env: { ...process.env, ...env }, timeout: 300000 });
const sha = (p) => fs.existsSync(p) ? fs.readFileSync(p) : null;
try {
  fs.cpSync(path.join(SHARED, "examples/mealkit"), tmp, { recursive: true });
  const ddd = path.join(tmp, "ddd");
  fs.rmSync(path.join(ddd, "diagrams"), { recursive: true, force: true });
  fs.rmSync(path.join(ddd, "review.html"), { force: true });
  let r = run(["mark", "--dir", ddd, "contracts", "done", "--mode", "auto"]);
  if (r.status !== 0) fails.push(`mark: exit ${r.status} ${r.stderr.slice(0, 300)}`);
  const page = path.join(ddd, "review.html");
  if (!fs.existsSync(page)) fails.push("mark did not write review.html");
  const svgs = fs.existsSync(path.join(ddd, "diagrams")) ? fs.readdirSync(path.join(ddd, "diagrams")).filter((f) => f.endsWith(".svg")) : [];
  if (svgs.length < 7) fails.push(`expected >= 7 diagram SVGs after mark, got ${svgs.length}`);
  const layouts = fs.readdirSync(path.join(ddd, "diagrams")).filter((f) => f.endsWith(".layout.json"));
  if (layouts.length < 1) fails.push("no layout memory files written");
  // both decisions reachable through the CLI (decompose D1 and organise D1)
  r = run(["decision", "render", ddd, "D1", "--no-png"]);
  if (r.status !== 0) fails.push(`decision render D1: exit ${r.status} ${r.stderr.slice(0, 200)}`);
  r = run(["decision", "render", ddd, "organise:D1", "--no-png"]);
  if (r.status !== 0) fails.push(`decision render organise:D1: exit ${r.status} ${r.stderr.slice(0, 200)}`);
  const decDir = path.join(ddd, "diagrams/decisions");
  const decSvgs = fs.existsSync(decDir) ? fs.readdirSync(decDir).filter((f) => f.endsWith(".svg")) : [];
  if (decSvgs.length < 2) fails.push(`expected 2 decision composites, got ${decSvgs.join(", ")}`);
  // review checker with the strict flags
  r = spawnSync(process.execPath, [path.join(SHARED, "tests/checks/1.2.4/check-review.mjs"), page, "--require-open-decision", "--require-diagrams"], { encoding: "utf8" });
  if (r.status !== 0 || !/review verification passed/.test(r.stdout)) fails.push(`check-review strict: exit ${r.status} ${(r.stderr + r.stdout).slice(0, 300)}`);
  // run-to-run consistency: a second mark leaves every SVG byte-identical
  const before = Object.fromEntries(svgs.map((f) => [f, sha(path.join(ddd, "diagrams", f))]));
  r = run(["mark", "--dir", ddd, "contracts", "done", "--mode", "auto"]);
  for (const f of svgs) if (!before[f].equals(sha(path.join(ddd, "diagrams", f)))) fails.push(`${f} changed between two marks`);
  // blueprint export validates against the vendored skill's schemas (deliver is optional and covered by 1.2.6)
  r = run(["export", "blueprint", ddd, "--out", path.join(tmp, "arch")]);
  if (r.status !== 0) fails.push(`export blueprint: exit ${r.status} ${r.stderr.slice(0, 200)}`);
  if (!fs.existsSync(path.join(tmp, "arch/final.architecture.json"))) fails.push("final.architecture.json missing");
  // PNG branch honest on this machine
  const pngs = fs.readdirSync(path.join(ddd, "diagrams")).filter((f) => f.endsWith(".png"));
  const html = fs.readFileSync(page, "utf8");
  if (pngs.length === 0 && !/No Chrome/.test(html)) fails.push("no PNGs and no note in the page");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log("mark -> page + diagrams + layouts; both decisions rendered via CLI; strict review check; second mark byte-identical; blueprint export written");
console.log("integration verification passed");
