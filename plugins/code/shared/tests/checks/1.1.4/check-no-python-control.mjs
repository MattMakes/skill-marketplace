#!/usr/bin/env node
// G3 for leaf 1.1.4: the no-python scanner is a real detector.
//
// A gate that says "no Python left" is only worth something if the same scanner
// finds Python where it is. So this control runs scanForPython on a synthetic tree
// shaped like the plugin before leaf 1.4.1 deleted the scripts (the real tree is
// clean now) and insists it reports the known script paths and a `python3` line
// from a SKILL.md (not merely from this checks directory, which mentions the word
// itself), then runs it on a directory holding one .mjs file and insists it reports
// nothing. A third directory proves node_modules and
// .git are skipped rather than the scanner never looking.
//
// Usage: node check-no-python-control.mjs        (no arguments)
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanForPython } from "./no-python-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const MARKER = "no-python-control verification passed";

if (process.argv.length > 2) {
  console.error("usage: node plugins/code/shared/tests/checks/1.1.4/check-no-python-control.mjs");
  process.exit(2);
}

const failures = [];
const assert = (cond, msg) => { if (!cond) failures.push(msg); };

// 1. Positive control: a tree shaped like the plugin was before leaf 1.4.1 deleted the
//    Python (the real tree is clean now, so the control is synthetic; it holds the same
//    script paths and a SKILL.md line that invokes python3).
const todayTmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-no-python-today-"));
let today;
try {
  const expectedPy = ["shared/scripts/validate.py", "shared/scripts/mark_step.py", "skills/ddd-contracts/scripts/contracts.py"];
  for (const rel of expectedPy) {
    fs.mkdirSync(path.join(todayTmp, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(todayTmp, rel), "#!/usr/bin/env python3\nimport json\n");
  }
  fs.mkdirSync(path.join(todayTmp, "skills", "ddd-code"), { recursive: true });
  fs.writeFileSync(path.join(todayTmp, "skills", "ddd-code", "SKILL.md"), "# ddd-code\n\nRun `python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate.py ddd`.\n");
  fs.mkdirSync(path.join(todayTmp, "shared", "tests", "checks", "1.1.4"), { recursive: true });
  fs.writeFileSync(path.join(todayTmp, "shared", "tests", "checks", "1.1.4", "twin.mjs"), "// spawns python3\n");
  today = scanForPython(todayTmp);
  for (const f of expectedPy) assert(today.pyFiles.includes(f), `expected ${f} among pyFiles, got ${today.pyFiles.length} entries`);
  const skillMentions = today.python3Mentions.filter((m) => /(^|\/)SKILL\.md$/.test(m.file));
  assert(skillMentions.length > 0, "expected at least one python3 mention in a SKILL.md");
  const ownDir = "shared/tests/checks/1.1.4/";
  const outsideChecks = today.python3Mentions.filter((m) => !m.file.startsWith(ownDir));
  assert(outsideChecks.length > 0, "expected python3 mentions outside the 1.1.4 checks directory");
  console.log(`synthetic pre-cut-over tree: ${today.pyFiles.length} .py/.pyc file(s), ${today.python3Mentions.length} python3 mention(s) in ${new Set(today.python3Mentions.map((m) => m.file)).size} file(s)`);
  console.log(`  e.g. ${today.pyFiles[0]}; ${skillMentions[0] ? `${skillMentions[0].file}:${skillMentions[0].line}` : "(no SKILL.md mention)"}`);
} finally {
  fs.rmSync(todayTmp, { recursive: true, force: true });
}

// 2. Negative control: a clean tree.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-no-python-"));
try {
  const clean = path.join(tmp, "clean");
  fs.mkdirSync(clean);
  fs.writeFileSync(path.join(clean, "ddd.mjs"), "export const answer = 42;\n");
  const none = scanForPython(clean);
  assert(none.pyFiles.length === 0, `clean dir: expected no pyFiles, got ${JSON.stringify(none.pyFiles)}`);
  assert(none.python3Mentions.length === 0, `clean dir: expected no mentions, got ${JSON.stringify(none.python3Mentions)}`);

  // 3. Skips are skips, not blindness: Python inside node_modules or .git is
  //    ignored, Python next to them is found, and `skip` masks a named path.
  const mixed = path.join(tmp, "mixed");
  fs.mkdirSync(path.join(mixed, "node_modules", "dep"), { recursive: true });
  fs.mkdirSync(path.join(mixed, ".git"), { recursive: true });
  fs.mkdirSync(path.join(mixed, "goldens"), { recursive: true });
  fs.writeFileSync(path.join(mixed, "node_modules", "dep", "setup.py"), "print('python3')\n");
  fs.writeFileSync(path.join(mixed, ".git", "hook.py"), "#!/usr/bin/env python3\n");
  fs.writeFileSync(path.join(mixed, "goldens", "stdout.txt"), "run python3 stamp.py first\n");
  fs.writeFileSync(path.join(mixed, "tool.py"), "import sys\n");
  fs.writeFileSync(path.join(mixed, "README.md"), "# tool\n\nrun `python3 tool.py`\n");
  fs.writeFileSync(path.join(mixed, "blob.bin"), Buffer.from([0, 112, 121, 116, 104, 111, 110, 51, 0]));
  const found = scanForPython(mixed);
  assert(JSON.stringify(found.pyFiles) === JSON.stringify(["tool.py"]), `mixed dir: expected pyFiles [tool.py], got ${JSON.stringify(found.pyFiles)}`);
  assert(sameMentions(found.python3Mentions, [{ file: "README.md", line: 3 }, { file: "goldens/stdout.txt", line: 1 }]),
    `mixed dir: unexpected mentions ${JSON.stringify(found.python3Mentions)}`);
  const masked = scanForPython(mixed, { skip: ["goldens"] });
  assert(sameMentions(masked.python3Mentions, [{ file: "README.md", line: 3 }]),
    `mixed dir with skip: unexpected mentions ${JSON.stringify(masked.python3Mentions)}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Order of the walk is not part of the contract; the set of hits is.
function sameMentions(a, b) {
  const key = (list) => list.map((m) => `${m.file}:${m.line}`).sort().join(",");
  return key(a) === key(b);
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(MARKER);
