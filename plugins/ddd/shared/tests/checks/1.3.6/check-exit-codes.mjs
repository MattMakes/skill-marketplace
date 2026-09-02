#!/usr/bin/env node
// G4 for leaf 1.3.6: the exit-code contract of `ddd contracts prefill|check|render`.
//
// The mapping is contracts.py's, not a generic taxonomy: a green run is 0; `check` with
// findings is 1, and so is `check` when contracts.json is missing or corrupt (the gate ran
// and found the deliverable absent), and `check --strict` with only warnings; usage errors,
// a missing workspace, missing upstream inputs, a corrupt upstream artifact, and `render`
// without contracts.json are 2. prefill and render never exit 1. Each probe runs on a
// throwaway copy of the meal-kit example.
//
// Usage: node plugins/ddd/shared/tests/checks/1.3.6/check-exit-codes.mjs 1.3.6
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "exit-codes verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const BIN = path.join(PLUGIN, "shared", "bin", "ddd.mjs");
const MEALKIT = path.join(PLUGIN, "shared", "examples", "mealkit");

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== "1.3.6") {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.3.6/check-exit-codes.mjs 1.3.6");
  process.exit(2);
}
for (const f of [BIN, MEALKIT]) {
  if (!fs.existsSync(f)) { console.error(`error: ${f} not found`); process.exit(2); }
}

const failures = [];
const rj = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const wj = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");

function ddd(argv, cwd) {
  const r = spawnSync(process.execPath, [BIN, ...argv], { cwd, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1", TZ: "UTC" } });
  if (r.error) throw r.error;
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const base = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-exit-codes-"));
let n = 0;
// A fresh copy of the example per probe, mutated by `prepare(ddd)`; `expect` is the exit code.
function probe(label, argv, expect, prepare = () => {}, { stderr = null, stdout = null } = {}) {
  const root = path.join(base, String(n++));
  fs.cpSync(MEALKIT, root, { recursive: true });
  prepare(path.join(root, "ddd"));
  const r = ddd(argv, root);
  if (r.code !== expect) failures.push(`${label}: exit ${r.code}, expected ${expect}\n    stdout: ${r.out.trim().split("\n").slice(-2).join(" | ")}\n    stderr: ${r.err.trim()}`);
  if (stderr && !stderr.test(r.err)) failures.push(`${label}: stderr ${JSON.stringify(r.err)} does not match ${stderr}`);
  if (stdout && !stdout.test(r.out)) failures.push(`${label}: stdout does not match ${stdout}`);
  if (expect === 2 && r.out) failures.push(`${label}: exit 2 but wrote to stdout`);
}

try {
  // ---- 0: success ----
  probe("prefill on a finished workspace", ["contracts", "prefill", "ddd"], 0, () => {}, { stdout: /^prefill: / });
  probe("prefill from scratch", ["contracts", "prefill", "ddd"], 0, (d) => fs.rmSync(path.join(d, "09-contracts"), { recursive: true }), { stdout: /3 new/ });
  probe("render", ["contracts", "render", "ddd"], 0, () => {}, { stdout: /^render: wrote / });
  probe("check green", ["contracts", "check", "ddd"], 0, () => {}, { stdout: /RESULT: OK/ });
  probe("check green --json", ["contracts", "check", "ddd", "--json"], 0, () => {}, { stdout: /"ok": true/ });
  probe("check green --strict", ["contracts", "check", "ddd", "--strict"], 0);
  probe("--help", ["contracts", "check", "--help"], 0, () => {}, { stdout: /^usage: ddd contracts check/ });

  // ---- 1: the gate found something ----
  const bareChannel = (d) => {
    const p = path.join(d, "09-contracts", "contracts.json");
    const doc = rj(p);
    doc.entries.find((e) => e.id === "week-charged").channels = ["file"];
    wj(p, doc);
  };
  probe("check with an error", ["contracts", "check", "ddd"], 1, bareChannel, { stdout: /RESULT: FAIL/ });
  probe("check with an error --json", ["contracts", "check", "ddd", "--json"], 1, bareChannel, { stdout: /"ok": false/ });
  const onlyWarning = (d) => {
    const p = path.join(d, "09-contracts", "contracts.json");
    const doc = rj(p);
    doc.entries.find((e) => e.id === "week-charged").version = "1";
    wj(p, doc);
    ddd(["contracts", "render", "ddd"], path.dirname(d)); // keep the marker fresh so the warning is the only finding
  };
  probe("check warning without --strict", ["contracts", "check", "ddd"], 0, onlyWarning, { stdout: /1 warning\(s\)\nRESULT: OK/ });
  probe("check warning with --strict", ["contracts", "check", "ddd", "--strict"], 1, onlyWarning, { stdout: /RESULT: FAIL/ });
  probe("check with a fresh prefill (TODOs)", ["contracts", "check", "ddd"], 1, (d) => {
    fs.rmSync(path.join(d, "09-contracts"), { recursive: true });
    ddd(["contracts", "prefill", "ddd"], path.dirname(d));
  });
  probe("check without contracts.json", ["contracts", "check", "ddd"], 1, (d) => fs.rmSync(path.join(d, "09-contracts", "contracts.json")),
    { stdout: /contracts\.json missing/ });
  probe("check with corrupt contracts.json", ["contracts", "check", "ddd"], 1, (d) => fs.writeFileSync(path.join(d, "09-contracts", "contracts.json"), "{oops"),
    { stdout: /invalid JSON/ });
  probe("check with contracts.md missing", ["contracts", "check", "ddd"], 1, (d) => fs.rmSync(path.join(d, "09-contracts", "contracts.md")));

  // ---- 2: usage / IO ----
  for (const verb of ["prefill", "check", "render"]) {
    probe(`${verb} on a missing directory`, ["contracts", verb, "nowhere"], 2, () => {}, { stderr: /does not exist/ });
    probe(`${verb} with an unknown flag`, ["contracts", verb, "ddd", "--bogus"], 2, () => {}, { stderr: /usage:/ });
    probe(`${verb} with two positionals`, ["contracts", verb, "ddd", "extra"], 2, () => {}, { stderr: /usage:/ });
    probe(`${verb} with a corrupt connect.json`, ["contracts", verb, "ddd"], 2, (d) => fs.writeFileSync(path.join(d, "05-connect", "connect.json"), "[1,"),
      { stderr: /invalid JSON/ });
  }
  probe("prefill with a bad --mode", ["contracts", "prefill", "ddd", "--mode", "loud"], 2, () => {}, { stderr: /invalid choice/ });
  probe("prefill without connect/define", ["contracts", "prefill", "ddd"], 2, (d) => {
    fs.rmSync(path.join(d, "05-connect"), { recursive: true });
    fs.rmSync(path.join(d, "07-define"), { recursive: true });
  }, { stderr: /missing required input/ });
  probe("prefill with corrupt contracts.json", ["contracts", "prefill", "ddd"], 2, (d) => fs.writeFileSync(path.join(d, "09-contracts", "contracts.json"), "{oops"),
    { stderr: /invalid JSON/ });
  probe("check without connect.json", ["contracts", "check", "ddd"], 2, (d) => fs.rmSync(path.join(d, "05-connect"), { recursive: true }),
    { stderr: /connect\.json not found/ });
  probe("render without contracts.json", ["contracts", "render", "ddd"], 2, (d) => fs.rmSync(path.join(d, "09-contracts", "contracts.json")),
    { stderr: /run ddd contracts prefill first/ });
  probe("render with corrupt contracts.json", ["contracts", "render", "ddd"], 2, (d) => fs.writeFileSync(path.join(d, "09-contracts", "contracts.json"), "{oops"),
    { stderr: /invalid JSON/ });
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`exit-codes verification FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`${n} probe(s) held`);
console.log(MARKER);
