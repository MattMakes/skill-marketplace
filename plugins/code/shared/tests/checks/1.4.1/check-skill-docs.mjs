#!/usr/bin/env node
// G3 for leaf 1.4.1: every step SKILL.md carries the PNG rule ("if <ddd-dir>/diagrams/<x>.png
// exists for your step, Read it before deciding") and the decisions[] recording rule (record
// every option, draw the ones that differ in shape, `ddd decision render`), and ddd
// describes the page rebuild on every `ddd mark`, `ddd review` on demand with `--relayout`,
// and the `ddd export blueprint --deliver` hand-off to final.html.
//
// The rules are anchored on stable tokens rather than exact sentences. A positive control
// strips each token from a copy of a real SKILL.md and insists the check then fails.
//
// Usage: node plugins/code/shared/tests/checks/1.4.1/check-skill-docs.mjs <plugin-dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";

const MARKER = "skill-docs verification passed";
const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];

// [label, test] pairs; a test is a regex the SKILL.md text must match.
const STEP_RULES = [
  ["PNG rule: names <ddd-dir>/diagrams/…png", /<ddd-dir>\/diagrams\/[^\n`]*\.png/],
  ["PNG rule: says to Read it before deciding", /Read it\s+before/],
  ["PNG rule: says the Read tool renders PNG, not SVG", /renders PNG, not SVG/],
  ["PNG rule: says the page and diagrams are rebuilt by ddd mark", /`ddd mark`[^\n]*rebuilds[^\n]*review\.html/],
  ["decisions rule: names decisions[]", /`decisions\[\]`/],
  ["decisions rule: every option with pros, cons, risks", /`pros`, `cons`, `risks`/],
  ["decisions rule: chosen / confidence / rationale / would_flip_if / made_by / records", /`chosen`[\s\S]{0,200}`confidence`[\s\S]{0,200}`rationale`[\s\S]{0,200}`would_flip_if`[\s\S]{0,200}`made_by`[\s\S]{0,300}`records`/],
  ["decisions rule: option diagram specs under <NN-step>/decisions/<Did>-<opt>.json", /\/decisions\/<Did>-<opt>\.json/],
  ["decisions rule: format ddd-diagram-spec", /ddd-diagram-spec/],
  ["decisions rule: ddd decision render", /ddd\.mjs decision render <ddd-dir> <Did>/],
  ["decisions rule: Read diagrams/decisions/<Did>.png", /diagrams\/decisions\/<Did>\.png/],
  ["links modes.md §3b", /modes\.md §3b/],
  ["self-review mentions decisions[] and the PNG", /^- [^\n]*PNG[^\n]*`decisions\[\]`/m],
];
const WORKFLOW_RULES = [
  ["page rebuilt by every ddd mark", /rebuilt by every `ddd mark`/],
  ["ddd review <ddd-dir> on demand", /ddd\.mjs review <ddd-dir>/],
  ["--relayout drops layout memory", /--relayout/],
  ["layout memory explained (<name>.layout.json)", /\.layout\.json/],
  ["ddd export blueprint --deliver", /ddd\.mjs export blueprint <ddd-dir> --deliver/],
  ["final.html named as the blueprint final render", /diagrams\/final\.html/],
  ["specs written without blueprint (final.architecture.json)", /final\.architecture\.json/],
  ["PNG rule between steps", /diagrams\/<diagram>\.png[\s\S]{0,600}Read it/],
  ["open decisions in the recap", /open decision/],
  ["coverage summary lists review.html, diagrams/ and final.html", /review\.html`, `diagrams\/` and `final\.html`/],
];

export function problems(text, rules) {
  return rules.filter(([, re]) => !re.test(text)).map(([label]) => label);
}

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/code/shared/tests/checks/1.4.1/check-skill-docs.mjs <plugin-dir>");
  process.exit(2);
}
const plugin = path.resolve(args[0]);
const skillsDir = path.join(plugin, "skills");
if (!fs.existsSync(skillsDir)) { console.error(`usage: ${args[0]} has no skills/ directory`); process.exit(2); }

const failures = [];
let checked = 0;
for (const step of STEPS) {
  const file = path.join(skillsDir, `ddd-${step}`, "SKILL.md");
  if (!fs.existsSync(file)) { failures.push(`ddd-${step}/SKILL.md missing`); continue; }
  const text = fs.readFileSync(file, "utf8");
  checked++;
  for (const p of problems(text, STEP_RULES)) failures.push(`ddd-${step}/SKILL.md: ${p}`);
}
const wf = path.join(skillsDir, "ddd", "SKILL.md");
if (!fs.existsSync(wf)) failures.push("ddd/SKILL.md missing");
else {
  checked++;
  for (const p of problems(fs.readFileSync(wf, "utf8"), WORKFLOW_RULES)) failures.push(`ddd/SKILL.md: ${p}`);
}

// Positive control: removing the rule paragraphs from a real file must fail the rules.
const sample = path.join(skillsDir, "ddd-decompose", "SKILL.md");
if (fs.existsSync(sample)) {
  const text = fs.readFileSync(sample, "utf8");
  const stripped = text.replace(/## Pictures and hard decisions[\s\S]*?(?=\n## )/, "").replace(/^- [^\n]*`decisions\[\]`[^\n]*\n/gm, "");
  const missing = problems(stripped, STEP_RULES);
  // The workflow section legitimately repeats two tokens (the step's PNG path and "Read it before")
  // where it tells Claude to `ddd mark … draft` early, so stripping the Pictures section leaves those two.
  if (missing.length < STEP_RULES.length - 3) failures.push(`control: stripping the section from ddd-decompose only failed ${missing.length} of ${STEP_RULES.length} rules`);
}
if (fs.existsSync(wf)) {
  const stripped = fs.readFileSync(wf, "utf8").replace(/## Step 5[\s\S]*?(?=\n## )/, "");
  if (problems(stripped, WORKFLOW_RULES).length < 5) failures.push("control: stripping Step 5 from ddd did not fail enough rules");
}

if (failures.length) {
  console.log(`skill-docs verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${checked} SKILL.md file(s): PNG rule and decisions[] rule in every step skill, page rebuild and blueprint hand-off in ddd`);
console.log(MARKER);
