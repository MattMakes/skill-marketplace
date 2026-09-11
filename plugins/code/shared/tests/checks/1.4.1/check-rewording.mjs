#!/usr/bin/env node
// G6 for leaf 1.4.1: no Node command prints a Python-era script name any more, and every
// golden still replays after the recorded substitutions (goldens/REWORDING.md).
//
//   1. Every subcommand's --help, and every recorded command variant on a fresh copy of each of
//      the three fixtures, is run; stdout + stderr must not contain a Python-era script name
//      (prefill.py, contracts.py, stamp.py, mark_step.py, validate.py, init.py, review.py, the
//      step scripts) nor the old `render_chart:` prefix.
//   2. `reword.mjs --check` finds no old phrase left in the goldens.
//   3. `golden.mjs` (full replay, all fixtures, all commands) ends with its pass marker.
//
// Usage: node plugins/code/shared/tests/checks/1.4.1/check-rewording.mjs
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { COMMANDS, RUN_ENV, DEFAULT_TWIN, PASS_MARKER, variantsOf, slugOf } from "../../golden.mjs";
import { FIXTURE_NAMES, materialise } from "../../fixtures/build.mjs";

const MARKER = "rewording verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TESTS = path.resolve(HERE, "..", "..");
const PY_ERA = /\b(?:prefill|contracts|stamp|mark_step|validate|init|review|render|check_code|render_chart|render_connect|connect_inputs|boundary_worksheet|decompose_check|lint_[a-z]+|render_event_storm|seed_glossary|organise_tools|worksheet)\.py\b|(?:^|\n)render_chart: /;

if (process.argv.length > 2) {
  console.error("usage: node plugins/code/shared/tests/checks/1.4.1/check-rewording.mjs");
  process.exit(2);
}
if (!fs.existsSync(DEFAULT_TWIN)) { console.error(`error: ${DEFAULT_TWIN} not found`); process.exit(2); }

const failures = [];
function ddd(argv, cwd) {
  const r = spawnSync(process.execPath, [DEFAULT_TWIN, ...argv], { cwd, encoding: "utf8", env: { ...process.env, ...RUN_ENV }, maxBuffer: 64 * 1024 * 1024 });
  return `${r.stdout || ""}${r.stderr || ""}`;
}
function scan(label, text) {
  const m = PY_ERA.exec(text);
  if (m) failures.push(`${label}: prints ${JSON.stringify(m[0].trim())}`);
}

// Control: the pattern catches what it is meant to catch.
for (const s of ["run prefill.py --write first", "render_chart: x not found", "usage: boundary_worksheet.py"]) if (!PY_ERA.test(s)) failures.push(`control: pattern misses ${JSON.stringify(s)}`);
if (PY_ERA.test("copy setup.py and pyproject.toml")) failures.push("control: pattern flags setup.py (a project file, not a script)");

// 1a. --help of every subcommand.
const help = ddd(["--help"], process.cwd());
scan("ddd --help", help);
const names = [...help.matchAll(/^  ([a-z]+(?: [a-z]+)?)\s{2,}\S/gm)].map((m) => m[1]);
for (const n of names) scan(`ddd ${n} --help`, ddd([...n.split(" "), "--help"], process.cwd()));

// 1b. Every recorded variant on every fixture.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-rewording-"));
let runs = 0;
try {
  for (const cmd of COMMANDS) {
    for (const fixture of FIXTURE_NAMES) {
      for (const [variant, args, seed] of variantsOf(cmd)) {
        const root = materialise(fixture, fs.mkdtempSync(path.join(tmp, `${slugOf(cmd)}-${variant}-`)));
        for (const [rel, value] of Object.entries(seed)) {
          const p = path.join(root, rel);
          fs.mkdirSync(path.dirname(p), { recursive: true });
          if (typeof value === "string") fs.writeFileSync(p, value);
          else fs.writeFileSync(p, JSON.stringify({ ...JSON.parse(fs.readFileSync(p, "utf8")), ...value }, null, 2) + "\n");
        }
        scan(`${fixture} ${slugOf(cmd)} ${variant}`, ddd([...cmd.words, ...args], root));
        runs++;
      }
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 2. Nothing old left in the goldens.
const rw = spawnSync(process.execPath, [path.join(TESTS, "goldens", "reword.mjs"), "--check"], { encoding: "utf8" });
if (rw.status !== 0) failures.push(`reword.mjs --check exited ${rw.status}:\n${(rw.stdout + rw.stderr).trim().split("\n").slice(-5).join("\n")}`);

// 3. Full replay.
const replay = spawnSync(process.execPath, [path.join(TESTS, "golden.mjs")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const last = (replay.stdout || "").trim().split("\n").pop();
if (replay.status !== 0 || last !== PASS_MARKER) failures.push(`golden.mjs replay exited ${replay.status}, last line ${JSON.stringify(last)}`);
const matched = /(\d+) variant\(s\) matched/.exec(replay.stdout || "");

if (failures.length) {
  console.log(`rewording verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${names.length} help texts and ${runs} command runs print no Python-era script name; goldens hold no old phrase; replay: ${matched ? matched[1] : "?"} variant(s) matched`);
console.log(MARKER);
