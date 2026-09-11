#!/usr/bin/env node
// Branch 1.1 (shared core) N2: the modules the children delivered expose exactly the interfaces the
// PLAN contract promises to every later leaf. A leaf that imports a missing name fails at dispatch
// time, so we check the surface here, once, before anything is built on it.
// Usage: node plugins/code/shared/tests/checks/node-1.1/verify-interfaces.mjs <branch-id>
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.argv.length !== 3 || process.argv[2] !== "1.1") {
  console.error("usage: node verify-interfaces.mjs 1.1");
  process.exit(2);
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..", "..", "..");
const fails = [];
const want = {
  "lib/workspace.mjs": ["loadWorkspace", "STEPS", "FOLDER", "STEP_NO", "projectRoot", "resolvePath", "loadJson"],
  "lib/jsonschema.mjs": ["checkSchema", "checkSchemaCore", "typeOk", "vocabProblems", "hasConditional", "resolveRef", "loadSchema"],
  "lib/manifest.mjs": ["now", "initWorkspace", "markStep", "stamp", "readManifest", "writeManifest"],
  "lib/validate.mjs": ["main", "validate"],
};
for (const [rel, names] of Object.entries(want)) {
  const abs = path.join(SHARED, rel);
  if (!existsSync(abs)) { fails.push(`${rel}: missing`); continue; }
  const mod = await import(pathToFileURL(abs).href);
  for (const n of names) if (typeof mod[n] === "undefined") fails.push(`${rel}: no export ${n}`);
}
// The workspace index shape the explorers and the validator build on.
try {
  const { loadWorkspace } = await import(pathToFileURL(path.join(SHARED, "lib/workspace.mjs")).href);
  const W = loadWorkspace(path.join(SHARED, "examples/mealkit/ddd"));
  for (const k of ["dddDir", "manifest", "steps", "schemas", "glossary", "index"]) if (!(k in W)) fails.push(`workspace: no ${k}`);
  if (!(W.index instanceof Map) || W.index.size === 0) fails.push("workspace.index is not a populated Map");
  const hit = W.index.get("billing");
  if (!hit || !("referencedBy" in hit)) fails.push("index entry lacks referencedBy");
} catch (e) { fails.push(`workspace load threw: ${e.message}`); }
// The CLI lists every subcommand and the golden harness is where the ledgers say.
const help = spawnSync(process.execPath, [path.join(SHARED, "bin/ddd.mjs"), "--help"], { encoding: "utf8" });
if (help.status !== 0) fails.push(`ddd --help exit ${help.status}`);
for (const cmd of ["validate", "review", "mark", "stamp", "init", "export blueprint", "decision render"]) if (!help.stdout.includes(cmd)) fails.push(`--help lacks ${cmd}`);
if (!existsSync(path.join(SHARED, "tests/golden.mjs"))) fails.push("tests/golden.mjs missing");
if (!existsSync(path.join(SHARED, "tests/goldens/mealkit"))) fails.push("goldens/mealkit missing");
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log("checked 4 modules, workspace index, CLI help, golden harness");
console.log("interface verification passed");
