#!/usr/bin/env node
// G6 for leaf 1.3.2: the exit-code contract of the five ported commands.
//
//   advisory (worksheets)   0 on a readable workspace, 2 when the input is missing
//   gates (decompose check) 0 clean, 1 with errors, 2 when the input is missing
//   strategize lint         0 clean or warnings only, 1 with errors (its Python twin exits 1
//                           on errors and on a missing file, and the goldens pin that; the
//                           plan's "lint always 0" yields to parity until leaf 1.4.1)
//   strategize render       0 rendered, 2 when strategize.json is missing
//   usage                   2 for an unknown flag or a missing positional, 0 for --help
//
// Every run happens on a fresh temporary copy of a fixture (see ../../fixtures/build.mjs), so
// the shipped example is never touched; the runs that write (stamp, update-json) write there.
//
// Usage: node plugins/code/shared/tests/checks/1.3.2/check-exit-codes.mjs 1.3.2
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { materialise } from "../../fixtures/build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const DDD = path.join(PLUGIN, "shared", "bin", "ddd.mjs");
const MARKER = "exit-codes verification passed";

if (process.argv.length !== 3 || process.argv[2] !== "1.3.2") {
  console.error("usage: node plugins/code/shared/tests/checks/1.3.2/check-exit-codes.mjs 1.3.2");
  process.exit(2);
}
if (!fs.existsSync(DDD)) {
  console.error(`cannot find the CLI at ${DDD}`);
  process.exit(2);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-exit-codes-"));
const failures = [];
let count = 0;

// Run `ddd <words...>` in `cwd`; return { code, stdout, stderr }.
function run(cwd, ...words) {
  const res = spawnSync(process.execPath, [DDD, ...words], {
    cwd,
    env: { ...process.env, DDD_NO_RENDER: "1", TZ: "UTC" },
    encoding: "utf8",
  });
  if (res.error) return { code: -1, stdout: "", stderr: res.error.message };
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

function expect(label, cwd, words, code, check = () => true) {
  count++;
  const r = run(cwd, ...words);
  if (r.code !== code) {
    failures.push(`${label}: expected exit ${code}, got ${r.code}\n    stdout: ${r.stdout.trim().split("\n").slice(-2).join(" | ")}\n    stderr: ${r.stderr.trim()}`);
    return;
  }
  const why = check(r);
  if (why !== true) failures.push(`${label}: exit ${code} but ${why}`);
}

// Mutate a JSON file in place.
function patchJson(file, fn) {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  fn(doc);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
}

try {
  const clean = materialise("mealkit", path.join(tmp, "a"));
  const broken = materialise("broken-refs", path.join(tmp, "b"));
  const truncated = materialise("truncated-3", path.join(tmp, "c"));
  const empty = path.join(tmp, "empty");
  fs.mkdirSync(path.join(empty, "ddd"), { recursive: true });

  // --- advisory: worksheets ---
  expect("decompose worksheet clean", clean, ["decompose", "worksheet", "ddd"], 0, (r) => r.stdout.startsWith("BOUNDARY WORKSHEET") || "stdout lacks the header");
  expect("decompose worksheet --json clean", clean, ["decompose", "worksheet", "ddd", "--json"], 0, (r) => (JSON.parse(r.stdout).coverage_checklist ? true : "no coverage_checklist in JSON"));
  expect("decompose worksheet broken-refs (advisory, still 0)", broken, ["decompose", "worksheet", "ddd"], 0);
  expect("decompose worksheet missing discover.json", empty, ["decompose", "worksheet", "ddd"], 2, (r) => r.stderr.includes("not found") || "stderr lacks 'not found'");
  expect("strategize worksheet clean", clean, ["strategize", "worksheet", "ddd"], 0, (r) => r.stdout.startsWith("DDD workspace:") || "stdout lacks the header");
  expect("strategize worksheet --json clean", clean, ["strategize", "worksheet", "ddd", "--json"], 0, (r) => (Array.isArray(JSON.parse(r.stdout).subdomains) ? true : "no subdomains in JSON"));
  expect("strategize worksheet missing decompose.json", empty, ["strategize", "worksheet", "ddd"], 2, (r) => r.stderr.includes("not found") || "stderr lacks 'not found'");

  // --- gate: decompose check ---
  expect("decompose check clean", clean, ["decompose", "check", "ddd"], 0, (r) => r.stdout.trimEnd().endsWith("RESULT: OK") || "stdout lacks RESULT: OK");
  expect("decompose check broken-refs", broken, ["decompose", "check", "ddd"], 1, (r) => r.stdout.trimEnd().endsWith("RESULT: FAIL") || "stdout lacks RESULT: FAIL");
  expect("decompose check --json broken-refs", broken, ["decompose", "check", "ddd", "--json"], 1, (r) => (JSON.parse(r.stdout).ok === false ? true : "JSON ok is not false"));
  expect("decompose check --stamp --write-map --sync-glossary clean", clean, ["decompose", "check", "ddd", "--stamp", "--write-map", "--sync-glossary"], 0);
  expect("decompose check missing decompose.json", empty, ["decompose", "check", "ddd"], 2, (r) => r.stderr.includes("not found") || "stderr lacks 'not found'");
  const badJson = materialise("mealkit", path.join(tmp, "d"));
  fs.writeFileSync(path.join(badJson, "ddd", "03-decompose", "decompose.json"), "{ not json");
  expect("decompose check invalid JSON", badJson, ["decompose", "check", "ddd"], 2, (r) => r.stderr.includes("invalid JSON") || "stderr lacks 'invalid JSON'");

  // --- strategize lint: 0 with warnings only, 1 with errors ---
  expect("strategize lint clean (warnings only)", clean, ["strategize", "lint", "ddd"], 0, (r) => /^lint: 0 error\(s\)/m.test(r.stdout) || "summary line does not report 0 errors");
  const scored = materialise("mealkit", path.join(tmp, "e"));
  patchJson(path.join(scored, "ddd", "04-strategize", "strategize.json"), (st) => { st.classifications[0].business_differentiation = 11; });
  expect("strategize lint score out of range", scored, ["strategize", "lint", "ddd"], 1, (r) => r.stdout.includes("must be a number 0-10") || "stdout lacks the range error");
  expect("strategize lint missing strategize.json", truncated, ["strategize", "lint", "ddd"], 1, (r) => r.stdout.includes("not found") || "stdout lacks 'not found'");

  // --- strategize render ---
  expect("strategize render clean", clean, ["strategize", "render", "ddd"], 0, (r) => r.stdout.startsWith("wrote ") || "stdout lacks 'wrote'");
  expect("strategize render --stdout clean", clean, ["strategize", "render", "ddd", "--stdout"], 0, (r) => r.stdout.startsWith("# Core domain chart") || "stdout lacks the title");
  expect("strategize render --update-json --styled clean", clean, ["strategize", "render", "ddd", "--update-json", "--styled"], 0, (r) => r.stdout.startsWith("updated chart_mermaid") || "stdout lacks 'updated chart_mermaid'");
  expect("strategize render missing strategize.json", truncated, ["strategize", "render", "ddd"], 2, (r) => r.stderr.startsWith("ddd strategize render: ") || "stderr lacks the ddd strategize render: prefix");
  fs.writeFileSync(path.join(badJson, "ddd", "04-strategize", "strategize.json"), "{ not json");
  expect("strategize render invalid JSON", badJson, ["strategize", "render", "ddd"], 2);

  // --- usage ---
  expect("decompose worksheet unknown flag", clean, ["decompose", "worksheet", "ddd", "--nope"], 2);
  expect("decompose worksheet missing positional", clean, ["decompose", "worksheet"], 2);
  expect("decompose check unknown flag", clean, ["decompose", "check", "ddd", "--nope"], 2);
  expect("decompose check extra positional", clean, ["decompose", "check", "ddd", "extra"], 2);
  expect("strategize worksheet unknown flag", clean, ["strategize", "worksheet", "ddd", "--nope"], 2);
  expect("decompose worksheet --help", clean, ["decompose", "worksheet", "--help"], 0);
  expect("decompose check -h", clean, ["decompose", "check", "-h"], 0);
  expect("strategize worksheet --help", clean, ["strategize", "worksheet", "--help"], 0);
  expect("strategize lint --help", clean, ["strategize", "lint", "--help"], 0);
  expect("strategize render -h", clean, ["strategize", "render", "-h"], 0);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  console.log(`${failures.length} of ${count} exit-code checks failed`);
  process.exit(1);
}
console.log(`${count} exit-code checks passed`);
console.log(MARKER);
