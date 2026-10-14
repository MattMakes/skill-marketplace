#!/usr/bin/env node
// Branch 1.4 (docs cut-over) N2: the documents and the CLI agree. Every command the docs name
// exists (1.4.1's doc-commands check), every subcommand `--help` lists has a module the dispatcher
// can load, and the DDD-owned payload has no Python runtime dependency.
// Usage: node verify-interfaces.mjs 1.4
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
if (process.argv.length !== 3 || process.argv[2] !== "1.4") { console.error("usage: node verify-interfaces.mjs 1.4"); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const ROOT = path.resolve(PLUGIN, "..", "..");
const fails = [];
const run = (file, args) => spawnSync(process.execPath, [file, ...args], { encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" } });
for (const [script, args, marker] of [
  [path.join(PLUGIN, "shared/tests/checks/1.4.1/check-doc-commands.mjs"), [PLUGIN], "doc-commands verification passed"],
  [path.join(PLUGIN, "shared/tests/checks/1.4.1/no-python.mjs"), [PLUGIN], "no-python verification passed"],
  [path.join(PLUGIN, "shared/tests/checks/1.4.1/check-plugin-manifest.mjs"), [], "plugin-manifest verification passed"],
]) {
  const r = run(script, args);
  if (r.status !== 0 || !r.stdout.includes(marker)) fails.push(`${path.basename(script)}: exit ${r.status} ${(r.stderr + r.stdout).slice(0, 200)}`);
}
// every subcommand --help lists is dispatchable (no "not implemented yet" left)
const help = run(path.join(PLUGIN, "shared/bin/ddd.mjs"), ["--help"]);
const cmds = [...help.stdout.matchAll(/^\s{2}(ddd )?([a-z]+(?: [a-z-]+)?)\b/gm)].map((m) => m[2]).filter((c) => !/^(usage|commands|options)$/.test(c));
let n = 0;
for (const c of new Set(cmds)) {
  const r = run(path.join(PLUGIN, "shared/bin/ddd.mjs"), [...c.split(" "), "--help"]);
  n++;
  if (/not implemented yet/.test(r.stderr)) fails.push(`${c}: not implemented`);
}
if (n < 20) fails.push(`only ${n} subcommands parsed from --help; expected the full table`);
// DDD is advertised by the containing code plugin.
const mk = JSON.parse(readFileSync(path.join(ROOT, ".claude-plugin/marketplace.json"), "utf8"));
const entry = (mk.plugins || []).find((p) => p.name === "code");
if (!entry) fails.push("marketplace.json has no code entry");
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log(`docs resolve to real commands; ${n} subcommands dispatchable; no Python in the DDD payload`);
console.log("interface verification passed");
