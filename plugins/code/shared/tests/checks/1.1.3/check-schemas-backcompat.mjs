#!/usr/bin/env node
// G2 for leaf 1.1.3: every step JSON in a workspace still validates against its updated schema
// (decisions[] is optional), and an invalid decisions entry is rejected (negative control, so a
// validator that accepts everything cannot pass this gate).
//
// Usage: node plugins/code/shared/tests/checks/1.1.3/check-schemas-backcompat.mjs <ddd-dir>
// Exit 0 on pass, 1 on failure, 2 on misuse.
//
// Uses plugins/code/shared/lib/jsonschema.mjs when leaf 1.1.1 has delivered it; until then a minimal
// inline validator with the same subset (type, required, enum, properties, items,
// additionalProperties) stands in.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node check-schemas-backcompat.mjs <ddd-dir>");
  process.exit(2);
}
const dddDir = resolve(args[0]);
if (!existsSync(dddDir)) {
  console.error(`usage: <ddd-dir> does not exist: ${dddDir}`);
  process.exit(2);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = join(HERE, "..", "..", "..");
const SCHEMAS = join(SHARED, "schemas");
const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];

// ---- validator: shared lib when present, inline subset otherwise ----
function inlineCheck(value, schema, path, out) {
  const t = schema.type;
  const typeOk = (v, ty) =>
    ty === "array" ? Array.isArray(v)
    : ty === "object" ? (v !== null && typeof v === "object" && !Array.isArray(v))
    : ty === "integer" ? Number.isInteger(v)
    : ty === "number" ? typeof v === "number"
    : ty === "null" ? v === null
    : typeof v === ty;
  if (t) {
    const types = Array.isArray(t) ? t : [t];
    if (!types.some((ty) => typeOk(value, ty))) {
      out.push(`${path}: expected ${types.join("|")}, got ${Array.isArray(value) ? "array" : value === null ? "null" : typeof value}`);
      return;
    }
  }
  if ("enum" in schema && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    out.push(`${path}: ${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`);
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const r of schema.required || []) if (!(r in value)) out.push(`${path}: missing required '${r}'`);
    const props = schema.properties || {};
    for (const [k, sub] of Object.entries(props)) if (k in value) inlineCheck(value[k], sub, `${path}.${k}`, out);
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(value)) if (!(k in props)) out.push(`${path}: unexpected property '${k}'`);
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      for (const k of Object.keys(value)) if (!(k in props)) inlineCheck(value[k], schema.additionalProperties, `${path}.${k}`, out);
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => inlineCheck(item, schema.items, `${path}[${i}]`, out));
  }
}

let check = (value, schema, path, out) => inlineCheck(value, schema, path, out);
let validatorName = "inline subset validator";
const libPath = join(SHARED, "lib", "jsonschema.mjs");
if (existsSync(libPath)) {
  const lib = await import(pathToFileURL(libPath).href);
  if (typeof lib.checkSchema === "function") {
    check = (value, schema, path, out) => lib.checkSchema(value, schema, path, out, schema);
    validatorName = "shared/lib/jsonschema.mjs";
  }
}

// ---- positive: every present step JSON validates ----
const failures = [];
let checked = 0;
const loaded = {};
for (let i = 0; i < STEPS.length; i++) {
  const step = STEPS[i];
  const folder = `${String(i + 1).padStart(2, "0")}-${step}`;
  const artifact = join(dddDir, folder, `${step}.json`);
  if (!existsSync(artifact)) continue;
  const schema = JSON.parse(readFileSync(join(SCHEMAS, `${step}.schema.json`), "utf8"));
  const doc = JSON.parse(readFileSync(artifact, "utf8"));
  const out = [];
  check(doc, schema, step, out);
  if (out.length) failures.push(`${folder}/${step}.json: ${out.join("; ")}`);
  else checked++;
  loaded[step] = { schema, doc };
}
if (checked === 0 && failures.length === 0) {
  console.error(`no step JSON found under ${dddDir}`);
  process.exit(1);
}

// ---- positive: a well-formed decisions[] entry is accepted ----
const anyStep = Object.keys(loaded)[0];
if (anyStep) {
  const { schema, doc } = loaded[anyStep];
  const good = structuredClone(doc);
  good.decisions = [{
    id: "D1",
    question: "Which context owns the subscription week?",
    kind: "ownership",
    options: [
      { id: "A", summary: "Ordering owns it", pros: ["one writer"], cons: ["ordering grows"], risks: ["blast radius: 3 steps"] },
      { id: "B", summary: "Subscription owns it", pros: ["matches the language"], cons: [], risks: [], diagram: "ddd/03-decompose/decisions/D1-B.architecture.json" },
    ],
    chosen: "B",
    confidence: "medium",
    rationale: "Subscription is where the word is used.",
    would_flip_if: ["ordering needs to change the week on its own"],
    made_by: "strategist",
    records: { assumption: "A1" },
  }];
  const out = [];
  check(good, schema, anyStep, out);
  if (out.length) failures.push(`well-formed decisions[] entry was rejected: ${out.join("; ")}`);
}

// ---- negative control: an invalid decisions[] entry is rejected ----
// Broken in ways every subset validator catches: missing required 'question', 'kind' outside the
// enum, an option without 'summary', 'made_by' outside the enum, 'would_flip_if' not an array.
if (anyStep) {
  const { schema, doc } = loaded[anyStep];
  const bad = structuredClone(doc);
  bad.decisions = [{
    id: "D1",
    kind: "vibes",
    options: [{ id: "A" }, { id: "B", summary: "ok" }],
    made_by: "nobody",
    would_flip_if: "a string, not an array",
  }];
  const out = [];
  check(bad, schema, anyStep, out);
  // Match on field names, not message wording, so the shared validator can phrase errors its own way.
  const expectHits = ["question", "kind", "summary", "made_by", "would_flip_if"];
  const text = out.join("\n");
  const missed = expectHits.filter((h) => !text.includes(h));
  if (out.length === 0) failures.push("negative control: an invalid decisions[] entry was accepted");
  else if (missed.length) failures.push(`negative control: validator did not report ${missed.join(", ")} (got: ${text})`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`backcompat verification failed (${failures.length})`);
  process.exit(1);
}
console.log(`validated ${checked} step artifact(s) under ${dddDir} with ${validatorName}; negative control rejected`);
console.log("backcompat verification passed");
