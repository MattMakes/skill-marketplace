#!/usr/bin/env node
// G1 for leaf 1.1.3: all nine step schemas carry an identical, optional `decisions` definition that
// matches design section 5 (ai_docs/designs/2026-09-01-ddd-node-visual-design.md).
//
// Usage: node plugins/ddd/shared/tests/checks/1.1.3/check-decisions-schema.mjs
// Exit 0 on pass, 1 on a failed assertion, 2 on misuse.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.argv.length > 2) {
  console.error("usage: node check-decisions-schema.mjs   (no arguments)");
  process.exit(2);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMAS = join(HERE, "..", "..", "..", "schemas");
const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];

const failures = [];
const fail = (msg) => failures.push(msg);

// 1. Load every step schema, collect its decisions definition, both as an object and as canonical
//    JSON text so byte-identity is checked, not just structural equality.
const defs = {};
for (const step of STEPS) {
  const path = join(SCHEMAS, `${step}.schema.json`);
  let schema;
  try {
    schema = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`${step}: cannot read or parse ${path}: ${e.message}`);
    continue;
  }
  const def = schema.properties?.decisions;
  if (!def) {
    fail(`${step}: schema has no properties.decisions`);
    continue;
  }
  if ((schema.required || []).includes("decisions")) {
    fail(`${step}: decisions must be optional, but it is in required[]`);
  }
  defs[step] = { def, text: JSON.stringify(def, null, 2) };
}

// 2. Byte-identical across all nine.
const texts = new Set(Object.values(defs).map((d) => d.text));
if (Object.keys(defs).length === STEPS.length && texts.size !== 1) {
  const groups = {};
  for (const [step, d] of Object.entries(defs)) (groups[d.text] ||= []).push(step);
  fail(`decisions definitions differ between schemas: ${Object.values(groups).map((g) => g.join(",")).join(" | ")}`);
}

// 3. The definition matches the field list from design section 5.
const ref = defs[STEPS[0]]?.def;
if (ref) {
  const at = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const expect = (path, want, what) => {
    const got = at(ref, path);
    if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${what}: expected ${JSON.stringify(want)} at ${path}, got ${JSON.stringify(got)}`);
  };
  const sameSet = (path, want, what) => {
    const got = at(ref, path);
    const a = Array.isArray(got) ? [...got].sort() : got;
    if (JSON.stringify(a) !== JSON.stringify([...want].sort())) fail(`${what}: expected ${JSON.stringify(want)} at ${path}, got ${JSON.stringify(got)}`);
  };
  const isString = (path, what) => expect(`${path}.type`, "string", what);
  const isStringArray = (path, what) => {
    expect(`${path}.type`, "array", what);
    expect(`${path}.items.type`, "string", what);
  };

  expect("type", "array", "decisions");
  if (typeof ref.description !== "string" || !ref.description) fail("decisions: missing description");
  const item = "items";
  expect(`${item}.type`, "object", "decisions[]");
  sameSet(`${item}.required`, ["id", "question", "kind", "options"], "decisions[] required");
  const props = Object.keys(at(ref, `${item}.properties`) || {});
  const wantProps = ["id", "question", "kind", "options", "chosen", "confidence", "rationale", "would_flip_if", "made_by", "records", "supersedes"];
  for (const p of wantProps) if (!props.includes(p)) fail(`decisions[]: missing property ${p}`);
  for (const p of props) if (!wantProps.includes(p)) fail(`decisions[]: unexpected property ${p}`);

  isString(`${item}.properties.id`, "id");
  expect(`${item}.properties.id.pattern`, "^D\\d+$", "id pattern");
  isString(`${item}.properties.question`, "question");
  isString(`${item}.properties.kind`, "kind");
  expect(`${item}.properties.kind.enum`, ["boundary", "ownership", "classification", "sourcing", "topology", "integration", "foundation"], "kind enum");

  const opt = `${item}.properties.options`;
  expect(`${opt}.type`, "array", "options");
  expect(`${opt}.minItems`, 2, "options minItems");
  expect(`${opt}.items.type`, "object", "options[]");
  sameSet(`${opt}.items.required`, ["id", "summary"], "options[] required");
  const optProps = Object.keys(at(ref, `${opt}.items.properties`) || {});
  const wantOpt = ["id", "summary", "pros", "cons", "risks", "diagram"];
  for (const p of wantOpt) if (!optProps.includes(p)) fail(`options[]: missing property ${p}`);
  for (const p of optProps) if (!wantOpt.includes(p)) fail(`options[]: unexpected property ${p}`);
  isString(`${opt}.items.properties.id`, "options[].id");
  isString(`${opt}.items.properties.summary`, "options[].summary");
  isStringArray(`${opt}.items.properties.pros`, "options[].pros");
  isStringArray(`${opt}.items.properties.cons`, "options[].cons");
  isStringArray(`${opt}.items.properties.risks`, "options[].risks");
  isString(`${opt}.items.properties.diagram`, "options[].diagram");

  isString(`${item}.properties.chosen`, "chosen");
  isString(`${item}.properties.confidence`, "confidence");
  expect(`${item}.properties.confidence.enum`, ["low", "medium", "high"], "confidence enum");
  isString(`${item}.properties.rationale`, "rationale");
  isStringArray(`${item}.properties.would_flip_if`, "would_flip_if");
  isString(`${item}.properties.made_by`, "made_by");
  expect(`${item}.properties.made_by.enum`, ["strategist", "user", "step"], "made_by enum");
  expect(`${item}.properties.records.type`, "object", "records");
  const recProps = Object.keys(at(ref, `${item}.properties.records.properties`) || {});
  for (const p of ["assumption", "open_question"]) if (!recProps.includes(p)) fail(`records: missing property ${p}`);
  for (const p of recProps) if (!["assumption", "open_question"].includes(p)) fail(`records: unexpected property ${p}`);
  if (at(ref, `${item}.properties.records.required`) !== undefined) fail("records: assumption and open_question must both be optional");
  isString(`${item}.properties.records.properties.assumption`, "records.assumption");
  isString(`${item}.properties.records.properties.open_question`, "records.open_question");
  isString(`${item}.properties.supersedes`, "supersedes");

  // Every leaf field explains itself.
  const walk = (node, path) => {
    if (!node || typeof node !== "object") return;
    // An items wrapper carries no description of its own; the array above it does.
    if (node.type && !node.description && !path.endsWith(".items")) fail(`${path}: missing description`);
    for (const [k, v] of Object.entries(node.properties || {})) walk(v, `${path}.${k}`);
    if (node.items && node.items.type === "object") walk(node.items, `${path}.items`);
  };
  walk(ref, "decisions");
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`decisions-schema verification failed (${failures.length})`);
  process.exit(1);
}
console.log(`checked ${STEPS.length} schemas: identical optional decisions definition`);
console.log("decisions-schema verification passed");
