#!/usr/bin/env node
// Root G9: every check script a ledger under <scope-dir> references exists and exits 2 with a
// usage message when misused. Scripts are the `plugins/ddd/shared/tests/**/*.mjs` paths on
// `CHECK:` lines (gate-check.mjs itself and `node --test` lines are not check scripts); each is
// run once with one bogus flag and must exit 2 without printing its pass marker.
//
// Usage: node plugins/ddd/shared/tests/checks/root/check-check-scripts.mjs <scope-dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "check-scripts verification passed";
const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/ddd/shared/tests/checks/root/check-check-scripts.mjs <scope-dir>");
  process.exit(2);
}
const scope = path.resolve(args[0]);
if (!fs.existsSync(scope) || !fs.statSync(scope).isDirectory()) { console.error(`usage: ${args[0]} is not a directory`); process.exit(2); }

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.isFile() && ent.name.endsWith(".md")) yield p;
  }
}
const scripts = new Map(); // rel path -> [ledgers]
for (const md of walk(scope)) {
  for (const line of fs.readFileSync(md, "utf8").split("\n")) {
    const m = /^\s*CHECK:\s*(.*)$/.exec(line);
    if (!m || /^node --test\b/.test(m[1])) continue;               // test suites are not check scripts
    for (const tok of m[1].match(/plugins\/ddd\/shared\/tests\/[^\s"']+\.mjs/g) || []) {
      if (tok.endsWith(".test.mjs")) continue;
      if (!scripts.has(tok)) scripts.set(tok, []);
      scripts.get(tok).push(path.relative(scope, md));
    }
  }
}
if (!scripts.size) { console.error(`usage: no CHECK: lines naming plugins/ddd/shared/tests/**/*.mjs under ${args[0]}`); process.exit(2); }

const failures = [];
let ok = 0;
for (const [rel, ledgers] of [...scripts.entries()].sort()) {
  const abs = path.resolve(rel);
  if (!fs.existsSync(abs)) { failures.push(`${rel}: missing (referenced by ${[...new Set(ledgers)].join(", ")})`); continue; }
  const r = spawnSync(process.execPath, [abs, "--bogus-flag-from-check-check-scripts"], { encoding: "utf8", timeout: 120000, env: { ...process.env, DDD_NO_RENDER: "1" } });
  const out = (r.stdout || "") + (r.stderr || "");
  if (r.status !== 2) failures.push(`${rel}: exit ${r.status === null ? `signal ${r.signal}` : r.status} on a bogus flag, expected 2\n      ${out.trim().split("\n").slice(-2).join("\n      ")}`);
  else if (/verification passed|golden verification passed/.test(out)) failures.push(`${rel}: printed a pass marker on a bogus flag`);
  else ok++;
}
if (failures.length) {
  console.log(`check-scripts verification FAILED (${failures.length} of ${scripts.size}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${ok} check script(s) referenced under ${path.relative(process.cwd(), scope) || "."} exist and exit 2 when misused`);
console.log(MARKER);
