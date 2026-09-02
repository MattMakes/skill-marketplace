#!/usr/bin/env node
// Branch 1.3 (step ports) N2: every subcommand in design §3.3 that belongs to a step resolves to a
// module the CLI can dispatch, exporting main(), and the CLI no longer reports "not implemented yet"
// for any of them. Usage: node verify-interfaces.mjs 1.3
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
if (process.argv.length !== 3 || process.argv[2] !== "1.3") { console.error("usage: node verify-interfaces.mjs 1.3"); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const verbs = {
  understand: ["lint"], discover: ["lint", "render", "glossary"], decompose: ["worksheet", "check"],
  strategize: ["worksheet", "lint", "render"], connect: ["inputs", "render"], organise: ["brief", "check", "mermaid"],
  define: ["prefill", "render"], code: ["prefill", "check"], contracts: ["prefill", "check", "render"],
};
const fails = [];
let n = 0;
for (const [step, vs] of Object.entries(verbs)) for (const v of vs) {
  const abs = path.join(PLUGIN, "skills", `ddd-${step}`, "scripts", `${v}.mjs`);
  n++;
  if (!existsSync(abs)) { fails.push(`${step} ${v}: module missing`); continue; }
  const mod = await import(pathToFileURL(abs).href);
  if (typeof (mod.main ?? mod.default) !== "function") fails.push(`${step} ${v}: no main() export`);
  const r = spawnSync(process.execPath, [path.join(PLUGIN, "shared/bin/ddd.mjs"), step, v, "/nonexistent-ddd-dir"], { encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" } });
  if (/not implemented yet/.test(r.stderr)) fails.push(`${step} ${v}: CLI still says not implemented`);
}
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log(`checked ${n} step subcommands: module present, main() exported, dispatched by the CLI`);
console.log("interface verification passed");
