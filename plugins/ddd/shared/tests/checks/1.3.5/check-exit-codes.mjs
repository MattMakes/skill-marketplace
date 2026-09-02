#!/usr/bin/env node
// G3 for leaf 1.3.5: the exit-code contract of `ddd code prefill` and `ddd code check`
// (design §6 invariant 8): advisory commands exit 0, gates 0/1, usage/IO 2.
//
// Every case runs on a throwaway copy of a fixture (shared/tests/fixtures/build.mjs),
// so nothing here touches the shipped example or a real workspace. prefill is the
// advisory command: it exits 0 whenever it can read the workspace and 2 when it
// cannot (missing dir, missing discover/decompose, unknown context, bad flag).
// check is the gate: 0 on a clean deliverable, 1 on errors (or on warnings under
// --strict), 2 when the workspace or code.json is unusable or a flag is wrong.
// The .prefill/ lifecycle (invariant 7) is asserted alongside: briefs survive a
// failing check and --keep-prefill, and go only after a pass.
//
// Usage: node plugins/ddd/shared/tests/checks/1.3.5/check-exit-codes.mjs 1.3.5
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { materialise } from "../../fixtures/build.mjs";

const MARKER = "exit-codes verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const BIN = path.join(PLUGIN, "shared", "bin", "ddd.mjs");

if (process.argv.length !== 3 || process.argv[2] !== "1.3.5") {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.3.5/check-exit-codes.mjs 1.3.5");
  process.exit(2);
}
if (!fs.existsSync(BIN)) {
  console.error(`error: ${BIN} not found`);
  process.exit(2);
}

const failures = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-exit-codes-"));
let n = 0;

function ddd(root, args) {
  const r = spawnSync(process.execPath, [BIN, "code", ...args], {
    cwd: root, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1", TZ: "UTC", NO_COLOR: "1" },
  });
  if (r.error) throw r.error;
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// Fresh copy per case: a previous run's briefs or removals must not leak in.
function copy(fixture = "mealkit", mutate = () => {}) {
  const root = materialise(fixture, path.join(tmp, `case-${++n}`));
  mutate(root);
  return root;
}

function expect(name, r, code, { stdout, stderr } = {}) {
  if (r.code !== code) failures.push(`${name}: exit ${r.code}, expected ${code}\n    stdout: ${r.out.trim().split("\n").slice(-2).join(" | ")}\n    stderr: ${r.err.trim()}`);
  if (stdout && !stdout.test(r.out)) failures.push(`${name}: stdout does not match ${stdout}`);
  if (stderr && !stderr.test(r.err)) failures.push(`${name}: stderr does not match ${stderr}`);
}

const rj = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const wj = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const editCode = (fn) => (root) => { const p = path.join(root, "ddd", "08-code", "code.json"); const c = rj(p); fn(c, root); wj(p, c); };
const seedPrefill = (root) => {
  const pre = path.join(root, "ddd", "08-code", ".prefill");
  fs.mkdirSync(pre, { recursive: true });
  fs.writeFileSync(path.join(pre, "billing.md"), "# billing brief (seed)\n");
};
const prefillDir = (root) => path.join(root, "ddd", "08-code", ".prefill");

try {
  // ---- prefill: advisory, 0 or 2 ----
  {
    const root = copy();
    expect("prefill default", ddd(root, ["prefill", "ddd"]), 0, { stdout: /^# ddd-code pre-fill/ });
    expect("prefill --context", ddd(root, ["prefill", "ddd", "--context", "billing", "--print"]), 0, { stdout: /^wrote .*billing\.md/ });
    expect("prefill --format json", ddd(root, ["prefill", "ddd", "--format", "json"]), 0, { stdout: /^\{/ });
    expect("prefill --detect", ddd(root, ["prefill", "ddd", "--detect"]), 0, { stdout: /"language": null/ });
    expect("prefill --skeleton", ddd(root, ["prefill", "ddd", "--skeleton", "--mode", "auto"]), 0, { stdout: /"step": "code"/ });
    expect("prefill --out", ddd(root, ["prefill", "ddd", "--skeleton", "--out", "out/skel.json"]), 0, { stdout: /^wrote / });
    if (!fs.existsSync(path.join(root, "out", "skel.json"))) failures.push("prefill --out: file not written");
    expect("prefill --help", ddd(root, ["prefill", "--help"]), 0, { stdout: /usage:/ });
  }
  expect("prefill on truncated-3 (no strategize etc.)", ddd(copy("truncated-3"), ["prefill", "ddd"]), 0, { stdout: /Missing upstream artifacts/ });
  expect("prefill on broken-refs", ddd(copy("broken-refs"), ["prefill", "ddd"]), 0);
  expect("prefill missing dir", ddd(copy(), ["prefill", "nope"]), 2, { stderr: /not a directory/ });
  expect("prefill without discover.json", ddd(copy("mealkit", (r) => fs.rmSync(path.join(r, "ddd", "02-discover"), { recursive: true })), ["prefill", "ddd"]), 2, { stderr: /cannot pre-fill without discover/ });
  expect("prefill unknown context", ddd(copy(), ["prefill", "ddd", "--context", "bogus"]), 2, { stderr: /no bounded context 'bogus'/ });
  expect("prefill bad flag", ddd(copy(), ["prefill", "ddd", "--bogus"]), 2, { stderr: /usage/ });
  expect("prefill bad --format", ddd(copy(), ["prefill", "ddd", "--format", "xml"]), 2, { stderr: /invalid choice/ });
  expect("prefill bad --mode", ddd(copy(), ["prefill", "ddd", "--mode", "fast"]), 2, { stderr: /invalid choice/ });
  expect("prefill extra positional", ddd(copy(), ["prefill", "ddd", "extra"]), 2, { stderr: /unrecognized/ });

  // ---- check: gate, 0 / 1 / 2 ----
  {
    const root = copy("mealkit", seedPrefill);
    expect("check clean", ddd(root, ["check", "ddd"]), 0, { stdout: /RESULT: OK/ });
    if (fs.existsSync(prefillDir(root))) failures.push("check clean: .prefill/ survived a passing check");
  }
  {
    const root = copy("mealkit", seedPrefill);
    expect("check clean --keep-prefill", ddd(root, ["check", "ddd", "--keep-prefill"]), 0, { stdout: /RESULT: OK/ });
    if (!fs.existsSync(prefillDir(root))) failures.push("check --keep-prefill: .prefill/ was removed");
    expect("check clean --json", ddd(root, ["check", "ddd", "--json", "--keep-prefill"]), 0, { stdout: /"ok": true/ });
    expect("check clean --strict", ddd(root, ["check", "ddd", "--strict"]), 0, { stdout: /RESULT: OK/ });
    if (fs.existsSync(prefillDir(root))) failures.push("check --strict pass: .prefill/ survived");
  }
  expect("check on broken-refs", ddd(copy("broken-refs"), ["check", "ddd"]), 0, { stdout: /RESULT: OK/ });
  {
    // errors: a context missing from code.json and the plan gone
    const root = copy("mealkit", (r) => { seedPrefill(r); editCode((c) => { c.contexts.pop(); })(r); fs.rmSync(path.join(r, "ddd", "08-code", "implementation-plan.md")); });
    expect("check errors", ddd(root, ["check", "ddd"]), 1, { stdout: /error\(s\):[\s\S]*RESULT: FAIL/ });
    if (!fs.existsSync(prefillDir(root))) failures.push("check errors: .prefill/ was removed although the check failed (invariant 7)");
    expect("check errors --json", ddd(root, ["check", "ddd", "--json"]), 1, { stdout: /"ok": false/ });
    expect("check errors --strict", ddd(root, ["check", "ddd", "--strict"]), 1);
    if (!fs.existsSync(prefillDir(root))) failures.push("check errors --json/--strict: .prefill/ was removed although the check failed");
  }
  {
    // warnings only: scaffold.files listed while generated is false
    const root = copy("mealkit", (r) => { seedPrefill(r); editCode((c) => { c.scaffold = { generated: false, root: "", files: ["src/nowhere.ts"] }; })(r); });
    expect("check warnings --strict", ddd(root, ["check", "ddd", "--strict"]), 1, { stdout: /warning\(s\):[\s\S]*RESULT: FAIL/ });
    if (!fs.existsSync(prefillDir(root))) failures.push("check warnings --strict: .prefill/ was removed although the gate failed");
    expect("check warnings plain", ddd(root, ["check", "ddd"]), 0, { stdout: /warning\(s\):[\s\S]*RESULT: OK/ });
    if (fs.existsSync(prefillDir(root))) failures.push("check warnings plain: .prefill/ survived a passing check");
  }
  expect("check missing dir", ddd(copy(), ["check", "nope"]), 2, { stderr: /does not exist/ });
  expect("check on truncated-3 (no code.json)", ddd(copy("truncated-3"), ["check", "ddd"]), 2, { stderr: /code\.json missing or invalid JSON/ });
  expect("check invalid code.json", ddd(copy("mealkit", (r) => fs.writeFileSync(path.join(r, "ddd", "08-code", "code.json"), "{nope")), ["check", "ddd"]), 2, { stderr: /missing or invalid JSON/ });
  expect("check invalid code.json --json", ddd(copy("mealkit", (r) => fs.writeFileSync(path.join(r, "ddd", "08-code", "code.json"), "{nope")), ["check", "ddd", "--json"]), 2);
  expect("check bad flag", ddd(copy(), ["check", "ddd", "--bogus"]), 2, { stderr: /usage/ });
  expect("check extra positional", ddd(copy(), ["check", "ddd", "extra"]), 2, { stderr: /unrecognized/ });
  expect("check --help", ddd(copy(), ["check", "--help"]), 0, { stdout: /usage:/ });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`${n} fixture copies exercised; prefill 0/2 and check 0/1/2 hold; .prefill/ removed only after a pass without --keep-prefill`);
console.log(MARKER);
