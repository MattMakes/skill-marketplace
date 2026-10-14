#!/usr/bin/env node
// G6 for leaf 1.3.1: the ported step scripts neither import nor spawn Python.
//
// The four ports (and their helper) under skills/ddd-understand/scripts and
// skills/ddd-discover/scripts must be self-contained Node: no `child_process`
// (static import, dynamic import(), require, or `process.binding`), no module
// specifier ending in `.py`, no `python`/`python3` spawn. The string `python3` may
// still appear inside a printed message (the Python-era hints the goldens pin until
// leaf 1.4.1 rewords), so unlike the 1.1.4 scanner this one looks at code shape, not
// at prose.
//
// A positive control runs the same scanner on a temp tree that does spawn python3 and
// import a .py, so a clean pass proves detection rather than blindness.
//
// Usage: node plugins/code/shared/tests/checks/1.3.1/check-no-python.mjs --leaf 1.3.1
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "no-python verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const FOLDERS = [
  path.join(PLUGIN, "skills", "ddd-understand", "scripts"),
  path.join(PLUGIN, "skills", "ddd-discover", "scripts"),
];
const EXPECTED = ["ddd-understand/scripts/lint.mjs", "ddd-discover/scripts/lint.mjs", "ddd-discover/scripts/render.mjs", "ddd-discover/scripts/glossary.mjs"];

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--leaf" || args[1] !== "1.3.1") {
  console.error("usage: node plugins/code/shared/tests/checks/1.3.1/check-no-python.mjs --leaf 1.3.1");
  process.exit(2);
}
for (const f of FOLDERS) {
  if (!fs.existsSync(f)) { console.error(`error: ${f} not found`); process.exit(2); }
}

// Patterns that mean "this file reaches for Python". Comments are stripped first so
// a comment that merely explains the rule cannot trip it.
const RULES = [
  [/\bfrom\s+["'](?:node:)?child_process["']/, "imports child_process"],
  [/\bimport\s*\(\s*["'](?:node:)?child_process["']\s*\)/, "dynamically imports child_process"],
  [/\brequire\s*\(\s*["'](?:node:)?child_process["']\s*\)/, "requires child_process"],
  [/\bprocess\.binding\s*\(/, "uses process.binding"],
  [/\b(?:from|import)\s*\(?\s*["'][^"']*\.py["']/, "imports a .py module"],
  [/\brequire\s*\(\s*["'][^"']*\.py["']/, "requires a .py module"],
  [/\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(\s*["'`]python3?\b/, "spawns python"],
  [/["'`]python3?["'`]\s*,\s*\[/, "passes python as a command"],
];

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\"'`])\/\/[^\n]*/g, "$1");
}

// Returns [{ file, rule }] for every .mjs/.js/.cjs file under the folders.
function scan(folders) {
  const hits = [];
  const files = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && /\.(mjs|cjs|js)$/.test(ent.name)) files.push(p);
    }
  };
  for (const f of folders) walk(f);
  for (const file of files) {
    const code = stripComments(fs.readFileSync(file, "utf8"));
    for (const [re, rule] of RULES) if (re.test(code)) hits.push({ file, rule });
  }
  return { files, hits };
}

const failures = [];

// 1. Positive control: the scanner sees what it is meant to see.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-no-python-1.3.1-"));
try {
  const dirty = path.join(tmp, "dirty");
  fs.mkdirSync(dirty);
  fs.writeFileSync(path.join(dirty, "a.mjs"), 'import { spawnSync } from "node:child_process";\nspawnSync("python3", ["x.py"]);\n');
  fs.writeFileSync(path.join(dirty, "b.mjs"), 'const m = await import("./lint_discover.py");\n');
  fs.writeFileSync(path.join(dirty, "c.mjs"), '// import "node:child_process" in a comment only\nexport const ok = 1;\n');
  const ctl = scan([dirty]);
  const byFile = (name) => ctl.hits.filter((h) => path.basename(h.file) === name).map((h) => h.rule);
  if (!byFile("a.mjs").includes("imports child_process") || !byFile("a.mjs").includes("spawns python")) failures.push(`control: a.mjs not detected (${byFile("a.mjs").join("; ") || "nothing"})`);
  if (!byFile("b.mjs").includes("imports a .py module")) failures.push(`control: b.mjs not detected (${byFile("b.mjs").join("; ") || "nothing"})`);
  if (byFile("c.mjs").length) failures.push(`control: comment-only c.mjs flagged (${byFile("c.mjs").join("; ")})`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 2. The real tree.
const res = scan(FOLDERS);
for (const rel of EXPECTED) {
  if (!res.files.some((f) => f.endsWith(path.join("skills", rel)))) failures.push(`expected port missing: skills/${rel}`);
}
for (const h of res.hits) failures.push(`${path.relative(PLUGIN, h.file)}: ${h.rule}`);

if (failures.length) {
  console.log(`no-python verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${res.files.length} module(s) scanned under ddd-understand/scripts and ddd-discover/scripts: ${res.files.map((f) => path.relative(PLUGIN, f)).join(", ")}`);
console.log(MARKER);
