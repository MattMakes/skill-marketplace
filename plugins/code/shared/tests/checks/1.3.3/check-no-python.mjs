#!/usr/bin/env node
// G7 for leaf 1.3.3: the Node ports of connect_inputs.py, render_connect.py and
// organise_tools.py neither import nor spawn Python.
//
// What counts: an import (static or dynamic) whose specifier ends in `.py`, any
// import of child_process, a call to a process-spawning function, or the token
// `python`/`python3` in code. What does not count: the `.py` names inside the
// Python-era message strings the ports print verbatim (design §6 ruling; leaf
// 1.4.1 rewords them together with the goldens). The scanner is proven on two
// positive controls (a spawn and a `.py` import in temp files must be flagged)
// and the ports are then run with an empty PATH on a fixture copy, so a hidden
// shell-out to python3 could not have succeeded.
//
// Usage: node plugins/code/shared/tests/checks/1.3.3/check-no-python.mjs --leaf 1.3.3
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { materialise } from "../../fixtures/build.mjs";

const MARKER = "no-python verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const BIN = path.join(PLUGIN, "shared", "bin", "ddd.mjs");

const argv = process.argv.slice(2);
if (argv.length !== 2 || argv[0] !== "--leaf" || argv[1] !== "1.3.3") {
  console.error("usage: node plugins/code/shared/tests/checks/1.3.3/check-no-python.mjs --leaf 1.3.3");
  process.exit(2);
}

const OWNED = ["skills/ddd-connect/scripts", "skills/ddd-organise/scripts"];
const files = OWNED.flatMap((dir) => {
  const abs = path.join(PLUGIN, dir);
  if (!fs.existsSync(abs)) { console.error(`error: ${abs} not found`); process.exit(2); }
  return fs.readdirSync(abs).filter((n) => n.endsWith(".mjs")).sort().map((n) => path.join(abs, n));
});
const EXPECTED = ["inputs.mjs", "render.mjs", "brief.mjs", "check.mjs", "mermaid.mjs"];
const missing = EXPECTED.filter((n) => !files.some((f) => path.basename(f) === n));
if (missing.length) { console.error(`error: port(s) not found: ${missing.join(", ")}`); process.exit(2); }

// The rules, each with a line-level regex. A single regex per rule keeps the scan
// honest: no attempt to parse JS, so a rule that fires on a string literal is a
// finding to look at, not something the scanner explains away.
const RULES = [
  { name: "import of a .py file", re: /\b(?:from|import)\s*\(?\s*["'`][^"'`]*\.py["'`]/ },
  { name: "child_process import", re: /["'`](?:node:)?child_process["'`]/ },
  // Bare calls only: `re.exec(t)` is RegExp, and a namespaced `cp.execSync(` is
  // already caught by the import rule above.
  { name: "process-spawning call", re: /(?<![.\w])(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(/ },
  { name: "python token in code", re: /\bpython3?\b/ },
];

export function scan(text) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const rule of RULES) if (rule.re.test(line)) hits.push({ line: i + 1, rule: rule.name, text: line.trim() });
  });
  return hits;
}

const failures = [];

// 1. Positive controls: the scanner must flag what it claims to flag.
const controls = [
  ['import { spawnSync } from "node:child_process";\nspawnSync("python3", ["x.py"]);\n', ["child_process import", "process-spawning call", "python token in code"]],
  ['const m = await import("./organise_tools.py");\n', ["import of a .py file"]],
  ['import tools from "../scripts/connect_inputs.py";\n', ["import of a .py file"]],
  ['execSync(`python ${script}`);\n', ["process-spawning call", "python token in code"]],
];
for (const [text, wanted] of controls) {
  const got = new Set(scan(text).map((h) => h.rule));
  for (const w of wanted) if (!got.has(w)) failures.push(`control not flagged as '${w}': ${JSON.stringify(text)}`);
}
// A negative control: Python-era wording in a string is not a hit.
const wording = 'out("Rendered by `ddd-connect/scripts/render_connect.py` (validate.py warns)");\n';
if (scan(wording).length) failures.push(`negative control flagged: ${JSON.stringify(wording)}`);

// 2. The ports themselves.
let scanned = 0;
for (const f of files) {
  scanned++;
  for (const h of scan(fs.readFileSync(f, "utf8"))) {
    failures.push(`${path.relative(PLUGIN, f)}:${h.line}: ${h.rule}: ${h.text}`);
  }
}

// 3. Runtime proof: every port runs to completion with an empty PATH.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-no-python-"));
try {
  const root = materialise("mealkit", tmp);
  const runs = [
    ["connect", "inputs", "ddd"], ["connect", "inputs", "--smoke"],
    ["connect", "render", "ddd", "--check", "--write-md", "--write-mermaid"],
    ["organise", "brief", "ddd"], ["organise", "check", "ddd"], ["organise", "mermaid", "ddd"],
  ];
  for (const args of runs) {
    const r = spawnSync(process.execPath, [BIN, ...args], { cwd: root, encoding: "utf8", env: { PATH: "", DDD_NO_RENDER: "1", TZ: "UTC", HOME: os.homedir() } });
    if (r.error || r.status !== 0 || r.stderr !== "") {
      failures.push(`with PATH empty, ddd ${args.join(" ")} exited ${r.status}${r.error ? ` (${r.error.message})` : ""}: ${r.stderr.trim().split("\n")[0]}`);
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  console.log(`no-python verification FAILED: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`${scanned} .mjs file(s) under ${OWNED.join(", ")}: no Python import, no spawn, and every port runs with an empty PATH`);
console.log(MARKER);
