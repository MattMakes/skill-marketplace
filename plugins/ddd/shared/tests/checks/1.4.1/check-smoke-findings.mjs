#!/usr/bin/env node
// G7 for leaf 1.4.1: the defects an end-to-end smoke run found in the docs stay fixed.
//   (a) no step-count wording says eight / N/8 / "of 8" in any SKILL.md, skills/*/references/*.md
//       or shared/references/*.md (the chain has nine steps; "eight context-mapping patterns" and
//       the like are counts of something else and are left alone);
//   (b) no `_ddd-shared` path anywhere under the plugin docs (the folder is `shared/`);
//   (c) each of the nine step SKILL.md files runs `mark --dir <ddd-dir> <step> draft` (so the
//       step's PNG exists before the checkpoint that needs it) above its closing
//       `ddd.mjs mark --dir … <step> done` line;
//   (d) artifact-contract.md §4.5 defines query direction with the pinned phrase
//       "producer is the context that answers";
//   (e) modes.md §3b and ddd-workflow "Hard decisions" name the plain `"ddd-decision-strategist"`
//       subagent before the namespaced `"ddd:ddd-decision-strategist"`;
//   (f) shared/README.md has a "Known rough edges" heading.
//
// Usage: node plugins/ddd/shared/tests/checks/1.4.1/check-smoke-findings.mjs <plugin-dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";

const MARKER = "smoke-findings verification passed";
const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];
const QUERY_PHRASE = "producer is the context that answers";

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.4.1/check-smoke-findings.mjs <plugin-dir>");
  process.exit(2);
}
const plugin = path.resolve(args[0]);
const skillsDir = path.join(plugin, "skills");
const sharedRefs = path.join(plugin, "shared", "references");
if (!fs.existsSync(skillsDir) || !fs.existsSync(sharedRefs)) {
  console.error(`usage: ${args[0]} has no skills/ or shared/references/ directory`);
  process.exit(2);
}
const read = (p) => fs.readFileSync(p, "utf8");
const rel = (p) => path.relative(plugin, p);
const failures = [];

// (a) step-count wording — every SKILL.md, skills/*/references/*.md, shared/references/*.md
const STEP_COUNT = [
  ["N/8", /\b[1-9]\/8\b/],
  ["of 8", /\bof 8\b/],
  ["eight steps/skills", /\beight\b[^.\n]{0,30}\b(steps?|skills?|ddd-|modelling)/i],
];
const countDocs = [];
for (const skill of fs.readdirSync(skillsDir).sort()) {
  const s = path.join(skillsDir, skill, "SKILL.md");
  if (fs.existsSync(s)) countDocs.push(s);
  const refs = path.join(skillsDir, skill, "references");
  if (fs.existsSync(refs)) {
    for (const f of fs.readdirSync(refs).sort()) if (f.endsWith(".md")) countDocs.push(path.join(refs, f));
  }
}
for (const f of fs.readdirSync(sharedRefs).sort()) if (f.endsWith(".md")) countDocs.push(path.join(sharedRefs, f));
for (const doc of countDocs) {
  const lines = read(doc).split("\n");
  lines.forEach((line, i) => {
    for (const [label, re] of STEP_COUNT) if (re.test(line)) failures.push(`(a) ${rel(doc)}:${i + 1}: ${label} step-count wording: ${line.trim().slice(0, 90)}`);
  });
}

// (b) no `_ddd-shared` under the plugin docs (README, skills, agents, references, manifests)
function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((x, y) => (x.name < y.name ? -1 : 1))) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (!["node_modules", ".git", "goldens", "fixtures", "vendor", "examples"].includes(ent.name)) yield* walk(p); }
    else if (ent.isFile() && /\.(md|json)$/.test(ent.name)) yield p;
  }
}
const pathDocs = [];
for (const root of ["skills", "agents", "shared/references", ".claude-plugin"]) {
  const d = path.join(plugin, root);
  if (fs.existsSync(d)) pathDocs.push(...walk(d));
}
for (const f of ["README.md", "shared/README.md"]) if (fs.existsSync(path.join(plugin, f))) pathDocs.push(path.join(plugin, f));
for (const doc of pathDocs) {
  const lines = read(doc).split("\n");
  lines.forEach((line, i) => { if (line.includes("_ddd-shared")) failures.push(`(b) ${rel(doc)}:${i + 1}: stale \`_ddd-shared\` path`); });
}

// (c) draft mark above the closing done mark, per step
for (const step of STEPS) {
  const file = path.join(skillsDir, `ddd-${step}`, "SKILL.md");
  if (!fs.existsSync(file)) { failures.push(`(c) ddd-${step}/SKILL.md missing`); continue; }
  const lines = read(file).split("\n");
  const draftRe = new RegExp(`mark --dir <ddd-dir> ${step} draft`);
  const doneRe = new RegExp(`ddd\\.mjs mark --dir \\S+ ${step} done`);
  const draftAt = lines.findIndex((l) => draftRe.test(l));
  const doneAt = lines.findIndex((l) => doneRe.test(l));
  if (doneAt < 0) failures.push(`(c) ddd-${step}/SKILL.md: no closing \`ddd.mjs mark --dir … ${step} done\` line`);
  if (draftAt < 0) failures.push(`(c) ddd-${step}/SKILL.md: no \`mark --dir <ddd-dir> ${step} draft\` command`);
  else if (doneAt >= 0 && draftAt > doneAt) failures.push(`(c) ddd-${step}/SKILL.md: the draft mark (line ${draftAt + 1}) comes after the done mark (line ${doneAt + 1})`);
}

// (d) §4.5 defines query direction
const contract = path.join(sharedRefs, "artifact-contract.md");
if (!fs.existsSync(contract)) failures.push("(d) shared/references/artifact-contract.md missing");
else {
  const text = read(contract);
  const sec = /^### 4\.5[\s\S]*?(?=^### 4\.6|^## )/m.exec(text);
  if (!sec) failures.push("(d) artifact-contract.md: no §4.5 section");
  else if (!sec[0].includes(QUERY_PHRASE)) failures.push(`(d) artifact-contract.md §4.5 does not say "${QUERY_PHRASE}"`);
}

// (e) plain subagent name first, namespaced second — in the subagent_type clause, not just as a substring
function plainFirst(text, label) {
  const plain = /(?<!ddd:)"ddd-decision-strategist"/.exec(text);
  const namespaced = /"ddd:ddd-decision-strategist"/.exec(text);
  if (!plain) failures.push(`(e) ${label}: no quoted plain "ddd-decision-strategist" subagent name`);
  if (!namespaced) failures.push(`(e) ${label}: no quoted "ddd:ddd-decision-strategist" namespaced form`);
  if (plain && namespaced && plain.index > namespaced.index) failures.push(`(e) ${label}: the namespaced form comes before the plain name`);
}
const modes = path.join(sharedRefs, "modes.md");
if (!fs.existsSync(modes)) failures.push("(e) shared/references/modes.md missing");
else {
  const sec = /^## 3b\.[\s\S]*?(?=^## )/m.exec(read(modes));
  if (!sec) failures.push("(e) modes.md: no §3b section");
  else plainFirst(sec[0], "modes.md §3b");
}
const wf = path.join(skillsDir, "ddd-workflow", "SKILL.md");
if (!fs.existsSync(wf)) failures.push("(e) ddd-workflow/SKILL.md missing");
else {
  const sec = /^## Hard decisions[\s\S]*?(?=^## )/m.exec(read(wf));
  if (!sec) failures.push("(e) ddd-workflow/SKILL.md: no \"Hard decisions\" section");
  else plainFirst(sec[0], "ddd-workflow Hard decisions");
}

// (f) Known rough edges
const readme = path.join(plugin, "shared", "README.md");
if (!fs.existsSync(readme)) failures.push("(f) shared/README.md missing");
else if (!/^##+ Known rough edges\b/m.test(read(readme))) failures.push("(f) shared/README.md has no \"Known rough edges\" heading");

if (failures.length) {
  console.log(`smoke-findings verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${countDocs.length} doc(s) say nine steps; ${pathDocs.length} doc(s) free of _ddd-shared; ${STEPS.length} step skills mark draft before done; §4.5 query direction, strategist name order and rough edges present`);
console.log(MARKER);
