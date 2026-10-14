#!/usr/bin/env node
// G4 for leaf 1.3.5: the Node ports of ddd-code neither import nor spawn Python.
//
// The scripts under skills/ddd-code/scripts/*.mjs must be self-sufficient: no
// `child_process` (the only way to shell out), no `import`/`require`/`import()`
// of a `.py` path, no `python`/`python3` as a spawned command. Message strings
// that merely name `check_code.py` or `prefill.py` are expected, because the
// plan keeps Python-era wording verbatim until leaf 1.4.1, so this is a scan
// for the mechanisms rather than for the substring `.py`. The Python twins
// still sit in the same directory until 1.4.1 deletes them; they are not
// scanned, only the .mjs files are. The scan is proven live against a
// synthetic offender before the real files are judged.
//
// Usage: node plugins/code/shared/tests/checks/1.3.5/check-no-python.mjs --leaf 1.3.5
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "no-python verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const SCRIPTS = path.join(PLUGIN, "skills", "ddd-code", "scripts");
const EXPECTED = ["prefill.mjs", "check.mjs"];

const argv = process.argv.slice(2);
if (argv.length !== 2 || argv[0] !== "--leaf" || argv[1] !== "1.3.5") {
  console.error("usage: node plugins/code/shared/tests/checks/1.3.5/check-no-python.mjs --leaf 1.3.5");
  process.exit(2);
}
if (!fs.existsSync(SCRIPTS)) {
  console.error(`error: ${SCRIPTS} not found`);
  process.exit(2);
}

// Each rule names the mechanism it catches; a hit reports file:line.
const RULES = [
  { name: "child_process import", re: /\b(?:from|require\s*\(|import\s*\()\s*["'`](?:node:)?child_process["'`]/ },
  { name: "process.binding / worker spawning python", re: /\bspawn(?:Sync)?\s*\(\s*["'`]python/ },
  { name: "python as a command", re: /["'`]python3?["'`]\s*,\s*\[/ },
  { name: ".py module import", re: /\b(?:from|import|require\s*\()\s*["'`][^"'`]*\.py["'`]/ },
  { name: "dynamic import of a .py path", re: /\bimport\s*\(\s*[^)]*\.py\b/ },
  { name: "shebang python", re: /^#!.*python/ },
];

function scan(file) {
  const hits = [];
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const rule of RULES) {
      if (rule.re.test(lines[i])) hits.push({ line: i + 1, rule: rule.name, text: lines[i].trim() });
    }
  }
  return hits;
}

const failures = [];

// 1. Control: the scanner sees what it is meant to see.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-no-python-135-"));
try {
  const bad = path.join(tmp, "bad.mjs");
  fs.writeFileSync(bad, [
    "#!/usr/bin/env python3",
    'import { spawnSync } from "node:child_process";',
    'const r = spawnSync("python3", ["prefill.py", "ddd"]);',
    'const m = await import("./prefill.py");',
    'const x = require("./check_code.py");',
    "",
  ].join("\n"));
  const hits = scan(bad);
  const rulesHit = new Set(hits.map((h) => h.rule));
  for (const r of ["shebang python", "child_process import", "python as a command", "dynamic import of a .py path", ".py module import"]) {
    if (!rulesHit.has(r)) failures.push(`control: rule '${r}' did not fire on the synthetic offender`);
  }
  const good = path.join(tmp, "good.mjs");
  fs.writeFileSync(good, 'const hint = "check_code.py removes the folder once the deliverable passes";\nimport fs from "node:fs";\n');
  if (scan(good).length) failures.push("control: a message that names check_code.py was flagged; the scan must target mechanisms, not the substring");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 2. The real files: every .mjs in the scripts directory, and the two ports must exist.
const files = fs.readdirSync(SCRIPTS).filter((f) => f.endsWith(".mjs")).sort();
for (const f of EXPECTED) if (!files.includes(f)) failures.push(`missing port: ${path.join(SCRIPTS, f)}`);
for (const f of files) {
  for (const h of scan(path.join(SCRIPTS, f))) failures.push(`${f}:${h.line}: ${h.rule}: ${h.text}`);
}

// 3. Static import graph: nothing the ports import (transitively, within the plugin)
//    pulls in child_process either, so a helper cannot smuggle a spawn in.
const seen = new Set();
const queue = files.map((f) => path.join(SCRIPTS, f));
while (queue.length) {
  const file = queue.pop();
  if (seen.has(file) || !fs.existsSync(file)) continue;
  seen.add(file);
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/^\s*(?:import|export)[^"'`\n]*from\s*["'`]([^"'`]+)["'`]/gm)) {
    const spec = m[1];
    if (spec === "node:child_process" || spec === "child_process") failures.push(`${path.relative(PLUGIN, file)}: imports ${spec}`);
    if (spec.startsWith(".")) queue.push(path.resolve(path.dirname(file), spec));
  }
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`${files.length} script(s) scanned (${files.join(", ")}), ${seen.size} module(s) in the import graph; no child_process, no python, no .py import`);
console.log(MARKER);
