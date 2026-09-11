#!/usr/bin/env node
// Applies the Python-era -> `ddd <cmd>` rewording table in REWORDING.md to the recorded
// goldens (stdout.txt, stderr.txt, files.json; never meta.json), or checks that no old
// phrase is left in a set of files.
//
//   node reword.mjs                       apply to goldens/ (idempotent; prints what changed)
//   node reword.mjs --check [path ...]    exit 1 if any `old` phrase remains (default: goldens/)
//   node reword.mjs --table               print the parsed table as JSON
//
// Rows are plain substrings applied in table order (split/join, no regex), so a row can
// contain `$`, `{`, backticks or parentheses safely. Exit 0 ok, 1 leftover found, 2 misuse.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TABLE_FILE = path.join(HERE, "REWORDING.md");
const SNAPSHOT_FILES = new Set(["stdout.txt", "stderr.txt", "files.json"]);

export function loadTable(file = TABLE_FILE) {
  const md = fs.readFileSync(file, "utf8");
  const m = /```json\n([\s\S]*?)\n```/.exec(md);
  if (!m) throw new Error(`${file}: no \`\`\`json block with the table`);
  const rows = JSON.parse(m[1]);
  for (const r of rows) {
    if (typeof r.old !== "string" || typeof r.new !== "string" || !r.old) throw new Error(`bad row ${JSON.stringify(r)}`);
    if (/["\\]/.test(r.new) || /[^\x20-\x7e]/.test(r.new)) throw new Error(`replacement must be printable ASCII without quotes or backslashes: ${r.new}`);
  }
  return rows;
}

export function reword(text, rows = loadTable()) {
  let out = text;
  for (const r of rows) if (out.includes(r.old)) out = out.split(r.old).join(r.new);
  return out;
}

// Returns [{ row, count }] for every old phrase still present in `text`.
export function leftovers(text, rows = loadTable()) {
  const hits = [];
  for (const r of rows) {
    const n = text.split(r.old).length - 1;
    if (n) hits.push({ row: r, count: n });
  }
  return hits;
}

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.isFile()) yield p;
  }
}

function isText(buf) {
  if (buf.includes(0)) return false;
  try { new TextDecoder("utf-8", { fatal: true }).decode(buf); return true; } catch { return false; }
}

export function applyToGoldens(root = HERE, rows = loadTable()) {
  const changed = [];
  for (const file of walk(root)) {
    if (!SNAPSHOT_FILES.has(path.basename(file))) continue;
    const before = fs.readFileSync(file, "utf8");
    const after = reword(before, rows);
    if (after !== before) { fs.writeFileSync(file, after); changed.push(path.relative(root, file)); }
  }
  return changed;
}

export function checkPaths(paths, rows = loadTable()) {
  const found = [];
  for (const p of paths) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) throw new Error(`${abs} does not exist`);
    const files = fs.statSync(abs).isDirectory() ? [...walk(abs)] : [abs];
    for (const file of files) {
      if (path.basename(file) === "meta.json") continue;
      if (path.basename(file) === "REWORDING.md" || path.basename(file) === "reword.mjs") continue;
      const buf = fs.readFileSync(file);
      if (!isText(buf)) continue;
      for (const h of leftovers(buf.toString("utf8"), rows)) found.push({ file, ...h });
    }
  }
  return found;
}

const invokedDirectly = process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  let code = 0;
  try {
    if (args[0] === "--table" && args.length === 1) {
      process.stdout.write(JSON.stringify(loadTable(), null, 2) + "\n");
    } else if (args[0] === "--check") {
      const paths = args.slice(1).length ? args.slice(1) : [HERE];
      const found = checkPaths(paths);
      for (const f of found) process.stdout.write(`${f.file}: ${f.count}x ${JSON.stringify(f.row.old)}\n`);
      process.stdout.write(found.length ? `reword check FAILED: ${found.length} leftover(s)\n` : `reword check passed: no Python-era phrase in ${paths.join(", ")}\n`);
      code = found.length ? 1 : 0;
    } else if (args.length === 0) {
      const changed = applyToGoldens();
      for (const f of changed) process.stdout.write(`reworded ${f}\n`);
      process.stdout.write(`${changed.length} file(s) changed\n`);
    } else {
      process.stderr.write("usage: node reword.mjs | node reword.mjs --check [path ...] | node reword.mjs --table\n");
      code = 2;
    }
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`);
    code = 2;
  }
  process.exitCode = code;
}
