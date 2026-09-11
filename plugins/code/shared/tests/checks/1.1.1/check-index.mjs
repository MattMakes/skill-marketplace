#!/usr/bin/env node
// G2 for leaf 1.1.1: loadWorkspace indexes every id in every collection of every step
// JSON, and every referencedBy path, when followed through the step JSON, lands on
// that entry's id.
//
// The walk here is written out independently of workspace.mjs (same rules, separate
// code), so an id the index silently drops is caught rather than agreed with.
//
// Usage: node plugins/code/shared/tests/checks/1.1.1/check-index.mjs <ddd-dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { STEPS, FOLDER, collectionOf, followPath, loadWorkspace, parsePath, resolveId, usesOf } from "../../../lib/workspace.mjs";

const MARKER = "index verification passed";

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/code/shared/tests/checks/1.1.1/check-index.mjs <ddd-dir>");
  process.exit(2);
}
const dddDir = path.resolve(args[0]);
if (!fs.existsSync(path.join(dddDir, "manifest.json"))) {
  console.error(`error: ${dddDir} has no manifest.json`);
  process.exit(2);
}

const failures = [];
const fail = (m) => failures.push(m);
const CONTEXT_KEYED = new Set(["define.canvases", "code.contexts"]);

const ws = loadWorkspace(dddDir);
const { index, steps } = ws;

// 1. Every step JSON on disk was loaded.
for (const s of STEPS) {
  const file = path.join(dddDir, FOLDER[s], `${s}.json`);
  if (fs.existsSync(file) && !steps[s] && !ws.problems.some((p) => p.step === s)) fail(`${s}: ${file} exists but was neither loaded nor reported as a problem`);
}
for (const p of ws.problems) fail(`${p.step}: ${p.path} could not be parsed: ${p.error}`);

// 2. Independent walk: every identified object in every array is indexed under its
//    unique key, its `<step>:<id>` alias and its bare id (directly or via `also`).
let objects = 0;
let refsChecked = 0;
const expectedKeys = new Set();
function walk(value, step, p, parentIsArray, collection) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, step, `${p}[${i}]`, true, collection));
    return;
  }
  if (value === null || typeof value !== "object") return;
  // Decision options are checked from their decision below, as `<Did>.<opt>`.
  if (parentIsArray && collection !== "decisions.options") {
    let idKey = null;
    if (isId(value.id)) idKey = "id";
    else if (CONTEXT_KEYED.has(`${step}.${collection}`) && isId(value.context)) idKey = "context";
    if (idKey) {
      objects++;
      const id = String(value[idKey]);
      const key = `${step}:${collection}:${id}`;
      expectedKeys.add(key);
      const entry = index.get(key);
      if (!entry) fail(`${step}: ${p} (${idKey}=${id}) is not indexed under ${key}`);
      else {
        if (entry.object !== value) fail(`${key}: index.object is not the object at ${p}`);
        if (entry.path !== p) fail(`${key}: index.path is ${entry.path}, expected ${p}`);
        if (entry.idKey !== idKey) fail(`${key}: idKey is ${entry.idKey}, expected ${idKey}`);
      }
      for (const alias of [`${step}:${id}`, id]) {
        const a = index.get(alias);
        if (!a) { fail(`${key}: alias ${alias} is missing`); continue; }
        if (a !== entry && !a.also.includes(key)) fail(`${key}: alias ${alias} goes to ${a.key} and its also[] does not list ${key}`);
        if (a.id !== id) fail(`${alias}: resolves to an entry with id ${a.id}`);
      }
      if (collection === "decisions" && Array.isArray(value.options)) {
        value.options.forEach((opt, i) => {
          if (!opt || !isId(opt.id)) return;
          objects++;
          const okey = `${step}:decisions.options:${id}.${opt.id}`;
          expectedKeys.add(okey);
          const oe = index.get(okey);
          if (!oe) fail(`${step}: decision option ${id}.${opt.id} is not indexed under ${okey}`);
          else if (oe.object !== opt || oe.path !== `${p}.options[${i}]`) fail(`${okey}: object or path mismatch`);
          if (!index.get(`${id}.${opt.id}`)) fail(`${okey}: bare alias ${id}.${opt.id} is missing`);
        });
      }
    }
  }
  for (const k of Object.keys(value)) {
    const sub = value[k];
    if (Array.isArray(sub)) walk(sub, step, p + seg(k), false, collection ? `${collection}.${k}` : k);
    else if (sub && typeof sub === "object") walk(sub, step, p + seg(k), false, collection);
  }
}
for (const s of STEPS) if (steps[s]) walk(steps[s], s, s, false, "");

// 3. Nothing in the index that the walk did not find, and every alias points at a
//    real entry.
for (const [key, entry] of index) {
  if (key === entry.key && !expectedKeys.has(key)) fail(`${key}: indexed but no such identified object exists in ${entry.step}`);
  if (key !== entry.key && !index.has(entry.key)) fail(`${key}: alias of ${entry.key}, which is not in the index`);
  for (const other of entry.also) if (!index.has(other)) fail(`${key}: also[] lists ${other}, which is not in the index`);
}

// 4. Every referencedBy path follows to that entry's id and is never the object's own
//    identity field, and resolves (from its step) back to the same entry.
for (const [key, entry] of index) {
  if (key !== entry.key) continue;
  for (const r of entry.referencedBy) {
    refsChecked++;
    let segs;
    try { segs = parsePath(r.path); } catch (e) { fail(`${key}: cannot parse path ${r.path}: ${e.message}`); continue; }
    if (!STEPS.includes(r.step) || segs[0] !== r.step) { fail(`${key}: reference ${r.path} is not under step ${r.step}`); continue; }
    const value = followPath(steps, r.path);
    const last = segs[segs.length - 1];
    const parent = followPath(steps, joinPath(segs.slice(0, -1)));
    const owner = parent && typeof parent === "object" ? index.get(`${r.step}:${collectionOf(joinPath(segs.slice(0, -1)))}:${parent.id ?? parent.context}`) : null;
    // `chosen` on a decision names an option by its short id, so the value there is
    // the tail of `<Did>.<opt>`; everything else must hold the id itself.
    const chosenOf = last === "chosen" && owner && owner.collection === "decisions" ? `${owner.id}.${value}` : null;
    if (value !== entry.id && value !== `${entry.step}:${entry.id}` && chosenOf !== entry.id) { fail(`${key}: ${r.path} holds ${JSON.stringify(value)}, not ${entry.id}`); continue; }
    if (parent === entry.object && last === entry.idKey) fail(`${key}: ${r.path} is the object's own ${entry.idKey}, recorded as a reference`);
    if (!chosenOf && resolveId(index, value, r.step) !== entry) fail(`${key}: ${r.path} resolves to ${resolveId(index, value, r.step)?.key}, not back to ${key}`);
  }
}

// 5. Cross-links the explorers rely on: an id used in more than one step resolves
//    the same way from each, and usesOf unions the group without duplicates.
for (const [key, entry] of index) {
  if (key !== entry.id) continue;
  const uses = usesOf(index, entry.id);
  const seen = new Set(uses.map((u) => `${u.step} ${u.path}`));
  if (seen.size !== uses.length) fail(`${key}: usesOf returns duplicates`);
}

function isId(v) {
  return (typeof v === "string" && v.length > 0) || (typeof v === "number" && Number.isFinite(v));
}

// The path grammar of workspace.mjs, written out again on purpose.
function seg(k) {
  if (typeof k === "number") return `[${k}]`;
  return /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`;
}

function joinPath(segs) {
  return segs.map((s, i) => (i === 0 ? s : seg(s))).join("");
}

const bare = [...index.keys()].filter((k) => index.get(k).id === k).length;
console.log(`${dddDir}: ${Object.keys(steps).length} step(s), ${objects} identified object(s), ${bare} distinct id(s), ${index.size} index key(s), ${refsChecked} reference(s) followed`);
if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  console.log(`${failures.length} failure(s)`);
  process.exit(1);
}
console.log(MARKER);
