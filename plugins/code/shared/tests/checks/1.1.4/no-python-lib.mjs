// Finds what is left of the Python toolchain under a directory: `.py` (and stale
// `.pyc`) files, and every line that still says `python3`.
//
// Leaf 1.4.1 imports this for its "no python left" gate; leaf 1.1.4's
// check-no-python-control.mjs proves the scanner finds things today so a later
// clean pass means something. Zero dependencies, Node >= 18.
//
//   scanForPython(dir, { skip: ["shared/tests/goldens"] })
//     -> { pyFiles: ["shared/scripts/validate.py", ...],
//          python3Mentions: [{ file: "skills/ddd-code/SKILL.md", line: 42 }, ...] }
//
// Paths are relative to `dir` with forward slashes. `node_modules` and `.git` are
// always skipped; `skip` adds directories or files (relative to `dir`) that are
// allowed to mention Python, such as recorded goldens whose stdout quotes a
// Python-era hint. Binary files are ignored for the mention scan.
import fs from "node:fs";
import path from "node:path";

const ALWAYS_SKIP = new Set(["node_modules", ".git"]);
const PY_EXT = new Set([".py", ".pyc"]);
const MENTION = /python3/;

export function scanForPython(dir, { skip = [] } = {}) {
  const root = path.resolve(dir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`scanForPython: ${root} is not a directory`);
  }
  const skipped = new Set(skip.map((s) => s.split(path.sep).join("/").replace(/\/+$/, "")));
  const pyFiles = [];
  const python3Mentions = [];

  const walk = (abs) => {
    const entries = fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const ent of entries) {
      const p = path.join(abs, ent.name);
      const rel = path.relative(root, p).split(path.sep).join("/");
      if (ALWAYS_SKIP.has(ent.name) || skipped.has(rel)) continue;
      if (ent.isDirectory()) { walk(p); continue; }
      if (!ent.isFile()) continue;
      if (PY_EXT.has(path.extname(ent.name))) pyFiles.push(rel);
      const buf = fs.readFileSync(p);
      if (!isText(buf)) continue;
      const lines = buf.toString("utf8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (MENTION.test(lines[i])) python3Mentions.push({ file: rel, line: i + 1 });
      }
    }
  };
  walk(root);
  return { pyFiles, python3Mentions };
}

function isText(buf) {
  if (buf.includes(0)) return false;
  try { new TextDecoder("utf-8", { fatal: true }).decode(buf); return true; } catch { return false; }
}
