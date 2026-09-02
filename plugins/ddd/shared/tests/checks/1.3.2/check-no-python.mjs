#!/usr/bin/env node
// G7 for leaf 1.3.2: the five Node ports neither import nor spawn Python or any .py file.
//
// What counts as a violation in a port:
//   - an import or require of child_process (the only way to spawn anything), or a call to
//     spawn/spawnSync/exec/execSync/execFile/execFileSync/fork
//   - an import or dynamic import whose specifier ends in .py
//   - the token `python` / `python3` anywhere in code, comments and string literals removed
// String literals are excluded on purpose: until leaf 1.4.1 rewords code and goldens together
// the ports must print Python-era hints such as `run render_chart.py <ddd-dir> --update-json`
// and `validate.py will mark decompose stale` verbatim. A message is not an invocation.
//
// The scanner is exercised on a positive control (a temp file that spawns python3 and imports
// a .py) before the ports are judged, so a clean pass means the detector works.
//
// Usage: node plugins/ddd/shared/tests/checks/1.3.2/check-no-python.mjs --leaf 1.3.2
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const MARKER = "no-python verification passed";

const PORTS = [
  "skills/ddd-decompose/scripts/worksheet.mjs",
  "skills/ddd-decompose/scripts/check.mjs",
  "skills/ddd-strategize/scripts/worksheet.mjs",
  "skills/ddd-strategize/scripts/lint.mjs",
  "skills/ddd-strategize/scripts/render.mjs",
];

const argv = process.argv.slice(2);
if (argv.length !== 2 || argv[0] !== "--leaf" || argv[1] !== "1.3.2") {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.3.2/check-no-python.mjs --leaf 1.3.2");
  process.exit(2);
}

// Strip comments, string literals and regex literals, keeping newlines so line numbers
// survive. Import specifiers are collected before their strings are blanked. A regex literal
// such as /\n([ \t]+)"/ would otherwise open a phantom string and invert the code/string state
// for the rest of the file, so a `/` in an operand position is skipped to its closing `/`.
// Good enough for the ports' ESM: no nested template expressions containing strings.
export function stripForScan(src) {
  const specifiers = [];
  let code = "";
  let i = 0;
  const n = src.length;
  const keepNewlines = (s) => s.replace(/[^\n]/g, " ");
  // A `/` is a regex literal (not division) when what precedes it cannot end an operand.
  const regexAllowed = () => {
    const prev = code.replace(/\s+$/, "");
    if (!prev) return true;
    if (/(^|[^\w$])(return|typeof|case|in|of|do|else)$/.test(prev)) return true;
    return /[(,=:[!&|?{};+\-*%<>~^]$/.test(prev);
  };
  while (i < n) {
    const ch = src[i];
    const two = src.slice(i, i + 2);
    if (ch === "/" && two !== "//" && two !== "/*" && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== "\n" && (inClass || src[j] !== "/")) {
        if (src[j] === "\\") j++;
        else if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        j++;
      }
      code += "/" + keepNewlines(src.slice(i + 1, j)) + "/";
      i = j + 1;
      continue;
    }
    if (two === "//") {
      const end = src.indexOf("\n", i);
      const stop = end < 0 ? n : end;
      code += keepNewlines(src.slice(i, stop));
      i = stop;
      continue;
    }
    if (two === "/*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end + 2;
      code += keepNewlines(src.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && src[j] !== ch) {
        if (src[j] === "\\") j++;
        j++;
      }
      const literal = src.slice(i + 1, j);
      // `from "x"`, `import "x"`, `import("x")`, `require("x")`
      const before = code.slice(-12);
      if (/(from|import|require\()\s*$|import\(\s*$/.test(before)) specifiers.push(literal);
      code += ch + keepNewlines(literal) + ch;
      i = j + 1;
      continue;
    }
    code += ch;
    i++;
  }
  return { code, specifiers };
}

export function scanSource(src) {
  const { code, specifiers } = stripForScan(src);
  const problems = [];
  for (const s of specifiers) {
    if (/\.py$/.test(s)) problems.push(`imports a Python file: ${s}`);
    if (/(^|\/|:)child_process$/.test(s)) problems.push(`imports child_process: ${s}`);
  }
  const lines = code.split("\n");
  lines.forEach((line, idx) => {
    // Bare calls only: `re.exec(...)` is a RegExp method, and a member call such as
    // `cp.spawn(...)` cannot exist without the child_process import flagged above.
    if (/(?<![.\w$])(spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(/.test(line)) problems.push(`line ${idx + 1}: spawns a process`);
    if (/\bpython3?\b/i.test(line)) problems.push(`line ${idx + 1}: mentions python in code`);
    if (/\brequire\s*\(/.test(line)) problems.push(`line ${idx + 1}: uses require()`);
  });
  return problems;
}

const failures = [];

// 1. Positive control: the scanner must catch a file that does what the ports must not.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-no-python-1.3.2-"));
try {
  const dirty = [
    'import { spawnSync } from "node:child_process";',
    'import twin from "./boundary_worksheet.py";',
    '// a comment that says python3 is fine',
    'const hint = "run render_chart.py first";',
    'const r = spawnSync("python3", [twin]);',
    'const p = python3;',
    // A regex literal with a quote must not hide what follows it.
    'const m = /\\n([ \\t]+)"/.exec(s);',
    'const q = execSync("python3 x.py");',
  ].join("\n");
  const found = scanSource(dirty);
  const want = ["imports a Python file", "imports child_process", "spawns a process", "mentions python in code", "line 8: spawns a process"];
  for (const w of want) {
    if (!found.some((f) => f.includes(w))) failures.push(`positive control: scanner missed '${w}' (found: ${JSON.stringify(found)})`);
  }
  if (found.some((f) => f.includes("line 3"))) failures.push("positive control: flagged a comment");
  if (found.some((f) => f.includes("line 4"))) failures.push("positive control: flagged a string literal");
  if (found.some((f) => f.includes("line 7"))) failures.push("positive control: flagged a regex literal");
  const cleanFile = 'import fs from "node:fs";\nconst msg = `validate.py will mark decompose stale`;\nexport function main() { return 0; }\n';
  const none = scanSource(cleanFile);
  if (none.length) failures.push(`negative control: clean source flagged: ${JSON.stringify(none)}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// 2. The ports themselves.
let scanned = 0;
for (const rel of PORTS) {
  const file = path.join(PLUGIN, rel);
  if (!fs.existsSync(file)) { failures.push(`${rel}: missing`); continue; }
  const src = fs.readFileSync(file, "utf8");
  scanned++;
  for (const p of scanSource(src)) failures.push(`${rel}: ${p}`);
}

// 3. They must also be loadable modules exporting main().
for (const rel of PORTS) {
  const file = path.join(PLUGIN, rel);
  if (!fs.existsSync(file)) continue;
  try {
    const mod = await import(pathToFileURL(file).href);
    if (typeof mod.main !== "function") failures.push(`${rel}: exports no main()`);
  } catch (e) {
    failures.push(`${rel}: cannot import: ${e.message}`);
  }
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`${scanned} port(s) scanned: no Python import, spawn or mention in code`);
console.log(MARKER);
