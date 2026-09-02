#!/usr/bin/env node
// Branch 1.3 (step ports) N3: the ports compose as a chain the way the SKILL.md files drive them.
// On a temp copy of mealkit: every step's lint/check runs; each renderer regenerates its markdown
// and the result differs from the committed example only in the generated-timestamp line; then
// validate --status still says RESULT: OK and contracts check is ok. Usage: node verify-integration.mjs 1.3
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
if (process.argv.length !== 3 || process.argv[2] !== "1.3") { console.error("usage: node verify-integration.mjs 1.3"); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const BIN = path.join(PLUGIN, "shared/bin/ddd.mjs");
const EX = path.join(PLUGIN, "shared/examples/mealkit");
const fails = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-node-1.3-"));
const run = (args) => spawnSync(process.execPath, [BIN, ...args], { cwd: tmp, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" } });
const norm = (s) => s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g, "<TS>").replace(/on <TS>\./g, "on <TS>.");
try {
  fs.cpSync(EX, tmp, { recursive: true });
  const ddd = path.join(tmp, "ddd");
  const steps = [
    ["understand", "lint", ddd], ["discover", "lint", path.join(ddd, "02-discover/discover.json")],
    ["discover", "render", path.join(ddd, "02-discover/discover.json")],
    ["decompose", "check", ddd], ["strategize", "lint", ddd], ["strategize", "render", ddd],
    ["connect", "render", ddd, "--check"], ["connect", "render", ddd, "--write-md"],
    ["organise", "check", ddd], ["define", "render", ddd], ["code", "check", ddd, "--keep-prefill"],
    ["contracts", "render", ddd], ["contracts", "check", ddd],
  ];
  for (const s of steps) {
    const r = run(s);
    if (r.status !== 0) fails.push(`${s.slice(0, 2).join(" ")}: exit ${r.status}\n${(r.stdout + r.stderr).slice(0, 400)}`);
  }
  // regenerated markdown equals the committed example apart from timestamp lines
  const mds = ["03-decompose/subdomains.md", "04-strategize/core-domain-chart.md", "05-connect/message-flows.md", "07-define/system-context.md", "07-define/billing/bounded-context-canvas.md", "09-contracts/contracts.md", "02-discover/event-storm.md"];
  for (const m of mds) {
    const a = fs.existsSync(path.join(EX, "ddd", m)) ? norm(fs.readFileSync(path.join(EX, "ddd", m), "utf8")) : null;
    const b = fs.existsSync(path.join(ddd, m)) ? norm(fs.readFileSync(path.join(ddd, m), "utf8")) : null;
    if (a === null || b === null) { fails.push(`${m}: missing (${a === null ? "example" : "regenerated"})`); continue; }
    if (a !== b) fails.push(`${m}: regenerated markdown drifts from the committed example`);
  }
  const v = run(["validate", ddd, "--status"]);
  if (v.status !== 0 || !v.stdout.includes("RESULT: OK")) fails.push(`validate after chain: exit ${v.status}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log("13 step commands ran on one workspace; 7 regenerated markdown files match the example; validate OK");
console.log("integration verification passed");
