#!/usr/bin/env node
// G5 for leaf 1.3.6: the Node port of ddd-contracts neither imports nor shells out to
// Python or any `.py` file.
//
// Scope is the new code, `skills/ddd-contracts/scripts/*.mjs`. The Python twin still sits
// beside it until leaf 1.4.1 deletes it, and the ported messages quote Python-era hints
// (`run contracts.py prefill first`) on purpose, so the scan looks at code rather than at
// text: no `child_process` (or `worker_threads`) import, no import specifier ending in
// `.py`, no `python` outside a string literal or comment. Each .mjs must also import
// cleanly and export main().
//
// Usage: node plugins/ddd/shared/tests/checks/1.3.6/check-no-python.mjs --leaf 1.3.6
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKER = "no-python verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const SCRIPTS = path.join(PLUGIN, "skills", "ddd-contracts", "scripts");
const VERBS = ["prefill", "check", "render"];

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--leaf" || args[1] !== "1.3.6") {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.3.6/check-no-python.mjs --leaf 1.3.6");
  process.exit(2);
}
if (!fs.existsSync(SCRIPTS)) { console.error(`error: ${SCRIPTS} not found`); process.exit(2); }

const failures = [];
const files = fs.readdirSync(SCRIPTS).filter((f) => f.endsWith(".mjs")).sort();
for (const v of VERBS) if (!files.includes(`${v}.mjs`)) failures.push(`${v}.mjs is missing from ${SCRIPTS}`);

// Strip comments and string literals so a quoted `contracts.py` cannot trip the scan while
// a real `python3` token in code does. Template literals lose their text too (their `${}`
// holes are code, but nothing in these files spawns from inside one).
function codeOnly(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const two = src.slice(i, i + 2);
    if (two === "//") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (two === "/*") { const j = src.indexOf("*/", i + 2); i = j < 0 ? src.length : j + 2; out += " "; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === "\\") j++; j++; }
      out += c + c; // keep the quotes so import specifiers stay recognisable as strings
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

for (const f of files) {
  const p = path.join(SCRIPTS, f);
  const src = fs.readFileSync(p, "utf8");
  // 1. Import specifiers: static and dynamic.
  const specs = [];
  for (const m of src.matchAll(/\bimport\s*(?:[^"'`;]*?\bfrom\s*)?["']([^"']+)["']/g)) specs.push(m[1]);
  for (const m of src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.push(m[1]);
  for (const m of src.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.push(m[1]);
  for (const s of specs) {
    if (/\.py$/i.test(s)) failures.push(`${f}: imports a Python file: ${s}`);
    if (/^(node:)?(child_process|worker_threads)$/.test(s)) failures.push(`${f}: imports ${s}, which is how a port would shell out`);
    if (/python/i.test(s)) failures.push(`${f}: import specifier mentions python: ${s}`);
  }
  // 2. Tokens in code (strings and comments removed).
  const code = codeOnly(src);
  if (/\bpython\d?\b/i.test(code)) failures.push(`${f}: 'python' appears in code outside a string or comment`);
  // Bare calls only: `re.exec(s)` is a regex method, while `cp.exec(...)` needs the
  // child_process import that rule 1 already refuses.
  if (/(?<![.\w$])(spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(/.test(code)) failures.push(`${f}: calls a process-spawning function`);
  if (/process\.binding|\bchild_process\b/.test(code)) failures.push(`${f}: references child_process in code`);
  // 3. Strings that would name a Python interpreter (a hint that quotes `contracts.py` is fine).
  for (const m of src.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
    if (/^\s*python3?\s*$/i.test(m[1]) || /^(\/usr\/bin\/|\/usr\/local\/bin\/)?python3?(\s|$)/i.test(m[1])) failures.push(`${f}: string literal names a Python interpreter: ${JSON.stringify(m[1])}`);
  }
}

// 4. The verbs import cleanly and export main().
for (const v of VERBS) {
  const p = path.join(SCRIPTS, `${v}.mjs`);
  if (!fs.existsSync(p)) continue;
  try {
    const mod = await import(pathToFileURL(p).href);
    if (typeof mod.main !== "function") failures.push(`${v}.mjs exports no main()`);
  } catch (e) {
    failures.push(`${v}.mjs failed to import: ${e.message}`);
  }
}

if (failures.length) {
  console.error(`no-python verification FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`${files.length} file(s) scanned: ${files.join(", ")}`);
console.log(MARKER);
