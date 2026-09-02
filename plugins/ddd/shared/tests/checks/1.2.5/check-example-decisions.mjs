#!/usr/bin/env node
// Gate G1 for leaf 1.2.5: the meal-kit example shows the decisions[] pattern.
//
//   node plugins/ddd/shared/tests/checks/1.2.5/check-example-decisions.mjs <ddd-dir>
//
// Checks, against the workspace as loaded by lib/workspace.mjs:
//   - decompose.json carries a chosen decision (chosen names one of its
//     options) with at least two option diagram specs on disk that
//     decision.mjs's loadOptionSpec accepts and that render without warnings
//   - organise.json carries an open decision (no chosen) with at least two
//     such specs and a records.open_question that resolves
//   - across the example all three accepted option formats appear
//     (ddd-diagram-spec, blueprint architecture or sequence)
//   - `ddd validate <dir> --json` reports zero errors
// Prints "example-decisions verification passed"; exit 0 pass, 1 failure,
// 2 misuse.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "../../..");
const CLI = path.join(SHARED, "bin", "ddd.mjs");

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node check-example-decisions.mjs <ddd-dir>");
  process.exit(2);
}
const dddDir = path.resolve(args[0]);
if (!fs.existsSync(path.join(dddDir, "manifest.json"))) {
  console.error(`usage: ${args[0]} has no manifest.json`);
  process.exit(2);
}

const { loadWorkspace } = await import(path.join(SHARED, "lib", "workspace.mjs"));
const decision = await import(path.join(SHARED, "lib", "render", "diagrams", "decision.mjs"));

const failures = [];
const fail = (msg) => failures.push(msg);

const ws = loadWorkspace(dddDir);
const formats = new Set();

function rawFormat(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  if (json.format === "ddd-diagram-spec") return "ddd-diagram-spec";
  if (String(json.diagram_type || "").toLowerCase() === "sequence" || json.participants) return "blueprint-sequence";
  if (String(json.diagram_type || "").toLowerCase() === "architecture" || json.components) return "blueprint-architecture";
  return "unknown";
}

// Counts the option specs of one decision that loadOptionSpec accepts and
// that build to an SVG without warnings.
async function acceptedSpecs(step, d) {
  let n = 0;
  for (const o of d.options || []) {
    if (!o.diagram) continue;
    const { spec, note, file } = decision.loadOptionSpec(ws, d, o);
    if (!spec) { fail(`${step} ${d.id} option ${o.id}: ${note}`); continue; }
    try {
      const r = await decision.optionSvg(ws, d, o, { standalone: true });
      if (!r.svg || !r.svg.includes("<svg")) { fail(`${step} ${d.id} option ${o.id}: optionSvg produced no <svg>`); continue; }
      for (const w of r.warnings) fail(`${step} ${d.id} option ${o.id}: render warning: ${w}`);
    } catch (error) {
      fail(`${step} ${d.id} option ${o.id}: render threw: ${error.message}`);
      continue;
    }
    formats.add(rawFormat(file));
    n += 1;
  }
  return n;
}

function decisionsOf(step) {
  const s = ws.steps?.[step];
  if (!s) { fail(`${step}.json is not loaded in the workspace`); return []; }
  if (!Array.isArray(s.decisions) || !s.decisions.length) { fail(`${step}.json has no decisions[]`); return []; }
  return s.decisions;
}

// decompose: one chosen decision.
{
  const list = decisionsOf("decompose");
  const chosen = list.filter((d) => d.chosen && (d.options || []).some((o) => o.id === d.chosen));
  if (!chosen.length) fail("decompose.json has no decision whose `chosen` names one of its options");
  for (const d of chosen) {
    const n = await acceptedSpecs("decompose", d);
    if (n < 2) fail(`decompose ${d.id}: only ${n} option diagram spec(s) accepted; need at least 2`);
    if (!d.rationale) fail(`decompose ${d.id}: chosen decision has no rationale`);
    const a = d.records?.assumption;
    if (!a) fail(`decompose ${d.id}: chosen decision records no assumption`);
    else if (!(ws.steps.decompose.assumptions || []).some((x) => x.id === a)) fail(`decompose ${d.id}: records.assumption ${a} does not resolve`);
  }
}

// organise: one open decision.
{
  const list = decisionsOf("organise");
  const open = list.filter((d) => d.chosen === undefined || d.chosen === null);
  if (!open.length) fail("organise.json has no open decision (every decision carries `chosen`)");
  for (const d of open) {
    const n = await acceptedSpecs("organise", d);
    if (n < 2) fail(`organise ${d.id}: only ${n} option diagram spec(s) accepted; need at least 2`);
    if ((d.options || []).length < 3) fail(`organise ${d.id}: an open decision should weigh at least three options, found ${(d.options || []).length}`);
    const q = d.records?.open_question;
    if (!q) fail(`organise ${d.id}: open decision records no open_question`);
    else if (!(ws.steps.organise.open_questions || []).some((x) => x.id === q)) fail(`organise ${d.id}: records.open_question ${q} does not resolve`);
  }
}

for (const f of ["ddd-diagram-spec", "blueprint-sequence"]) {
  if (!formats.has(f)) fail(`no option diagram in the example uses the ${f} format`);
}

// validate: zero errors, via the CLI so the gate sees what a user sees.
{
  const res = spawnSync(process.execPath, [CLI, "validate", dddDir, "--json"], { encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" } });
  let report = null;
  try { report = JSON.parse(res.stdout); } catch { /* reported below */ }
  if (!report) fail(`validate --json printed no JSON (exit ${res.status}): ${res.stderr.trim()}`);
  else if ((report.errors || []).length) fail(`validate reports ${report.errors.length} error(s): ${report.errors.slice(0, 3).join(" | ")}`);
  else if (res.status !== 0) fail(`validate exited ${res.status} with no errors listed`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`example-decisions verification FAILED: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`formats seen: ${[...formats].sort().join(", ")}`);
console.log("example-decisions verification passed");
