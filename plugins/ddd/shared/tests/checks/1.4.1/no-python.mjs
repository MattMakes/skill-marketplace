#!/usr/bin/env node
// G1 for leaf 1.4.1 (and root G3): nothing of the Python toolchain is left under a directory.
//
//   - no `.py` or `.pyc` file and no `__pycache__` directory anywhere, with no skip at all;
//   - no line that says `python3` anywhere except in the places that record the Python twin
//     as history: the golden snapshots (their meta.json names the recorded script), the 1.1.4
//     harness checks (whose python-twin control self-skips now), tests/README.md (which explains
//     how to re-record), golden.mjs's own historical `record` mode and the sibling gate checks
//     that probe for or scan for Python (their positive controls must spell the word).
//
// A positive control first runs the same scanner on a synthetic tree that does hold a `.py`
// file and a `python3` line, so a clean pass proves detection rather than blindness.
//
// Usage: node plugins/ddd/shared/tests/checks/1.4.1/no-python.mjs <dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanForPython } from "../1.1.4/no-python-lib.mjs";

const MARKER = "no-python verification passed";
const SKIP = [
  "shared/tests/goldens",
  "shared/tests/checks/1.1.4",
  "shared/tests/README.md",
  // Test scaffolding that names python3 on purpose: the historical record mode and the
  // gate checks whose positive controls or python-leg probes spell the word.
  "shared/tests/golden.mjs",
  "shared/tests/checks/1.1.1/check-jsonschema.mjs",
  "shared/tests/checks/1.1.2/check-staleness.mjs",
  "shared/tests/checks/1.3.1/check-no-python.mjs",
  "shared/tests/checks/1.3.2/check-no-python.mjs",
  "shared/tests/checks/1.3.3/check-no-python.mjs",
  "shared/tests/checks/1.3.4/check-no-python.mjs",
  "shared/tests/checks/1.3.5/check-no-python.mjs",
  "shared/tests/checks/1.3.6/check-no-python.mjs",
  "shared/tests/checks/1.4.1/no-python.mjs",
];

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.4.1/no-python.mjs <dir>");
  process.exit(2);
}
const dir = path.resolve(args[0]);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error(`usage: ${args[0]} is not a directory`);
  process.exit(2);
}

const failures = [];

// 1. Positive control on a synthetic tree.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-no-python-1.4.1-"));
try {
  fs.mkdirSync(path.join(tmp, "skills", "x", "scripts"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "skills", "x", "scripts", "lint.py"), "print('hi')\n");
  fs.writeFileSync(path.join(tmp, "skills", "x", "SKILL.md"), "run python3 lint.py first\n");
  fs.writeFileSync(path.join(tmp, "clean.mjs"), "export const ok = 1;\n");
  const ctl = scanForPython(tmp);
  if (!ctl.pyFiles.includes("skills/x/scripts/lint.py")) failures.push("control: the .py file was not reported");
  if (!ctl.python3Mentions.some((m) => m.file === "skills/x/SKILL.md" && m.line === 1)) failures.push("control: the python3 line was not reported");
  const skipped = scanForPython(tmp, { skip: ["skills/x/SKILL.md"] });
  if (skipped.python3Mentions.length) failures.push("control: a skipped file was still reported");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 2. No .py/.pyc anywhere, no skip.
const all = scanForPython(dir);
for (const f of all.pyFiles) failures.push(`python file: ${f}`);
const pycache = [];
(function walk(abs) {
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(abs, ent.name);
    if (ent.name === "__pycache__") pycache.push(path.relative(dir, p));
    else walk(p);
  }
})(dir);
for (const p of pycache) failures.push(`__pycache__ directory: ${p}`);

// 3. No python3 mention outside the recorded history.
const scoped = scanForPython(dir, { skip: SKIP });
for (const m of scoped.python3Mentions) failures.push(`python3 mentioned: ${m.file}:${m.line}`);

if (failures.length) {
  console.log(`no-python verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
const skippedMentions = all.python3Mentions.length;
console.log(`${path.relative(process.cwd(), dir) || "."}: 0 .py/.pyc files, 0 __pycache__, 0 python3 mentions outside ${SKIP.length} recorded-history path(s) (${skippedMentions} mention(s) inside them)`);
console.log(MARKER);
