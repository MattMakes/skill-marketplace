#!/usr/bin/env node
// G4 for leaf 1.4.1: every skills/*/SKILL.md stays under 500 lines and its YAML frontmatter
// still parses with a `name` (equal to the folder) and a non-empty `description`.
//
// Usage: node plugins/ddd/shared/tests/checks/1.4.1/check-skill-frontmatter.mjs <plugin-dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";

const MARKER = "skill-frontmatter verification passed";
const LIMIT = 500;

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.4.1/check-skill-frontmatter.mjs <plugin-dir>");
  process.exit(2);
}
const plugin = path.resolve(args[0]);
const skillsDir = path.join(plugin, "skills");
if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
  console.error(`usage: ${args[0]} has no skills/ directory`);
  process.exit(2);
}

// Minimal YAML: `key: value` at column 0, continuation lines indented, `key: |` / `>` blocks.
export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { error: "does not start with ---" };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { error: "frontmatter never closes" };
  const block = text.slice(4, end);
  const fm = {};
  let key = null;
  for (const raw of block.split("\n")) {
    const m = /^([A-Za-z_][A-Za-z0-9_-]*):(?:\s+(.*))?$/.exec(raw);
    if (m && !/^\s/.test(raw)) {
      key = m[1];
      fm[key] = (m[2] ?? "").replace(/^[|>]-?$/, "").trim();
    } else if (key !== null && /^\s+\S/.test(raw)) {
      fm[key] = (fm[key] ? fm[key] + " " : "") + raw.trim();
    } else if (raw.trim() === "") {
      continue;
    } else {
      return { error: `unparseable frontmatter line: ${raw}` };
    }
  }
  return { fm };
}

const failures = [];
let count = 0;
for (const ent of fs.readdirSync(skillsDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
  if (!ent.isDirectory()) continue;
  const file = path.join(skillsDir, ent.name, "SKILL.md");
  if (!fs.existsSync(file)) { failures.push(`${ent.name}: no SKILL.md`); continue; }
  count++;
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  if (lines >= LIMIT) failures.push(`${ent.name}/SKILL.md: ${lines} lines (limit ${LIMIT})`);
  const r = parseFrontmatter(text);
  if (r.error) { failures.push(`${ent.name}/SKILL.md: ${r.error}`); continue; }
  if (r.fm.name !== ent.name) failures.push(`${ent.name}/SKILL.md: frontmatter name is ${JSON.stringify(r.fm.name)}`);
  if (!r.fm.description || r.fm.description.length < 40) failures.push(`${ent.name}/SKILL.md: description missing or too short`);
}
if (count === 0) failures.push("no skills found");

// Positive control: the parser rejects a broken block.
if (!parseFrontmatter("---\nname: x\ndescription y\n---\n").error) failures.push("control: a malformed frontmatter line was accepted");
if (parseFrontmatter("---\nname: x\ndescription: a\n  b\n---\n").fm?.description !== "a b") failures.push("control: continuation lines are not joined");

if (failures.length) {
  console.log(`skill-frontmatter verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${count} SKILL.md file(s) under ${LIMIT} lines with a valid frontmatter`);
console.log(MARKER);
