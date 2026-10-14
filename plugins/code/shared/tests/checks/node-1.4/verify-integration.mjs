#!/usr/bin/env node
// Branch 1.4 N3: the closing command sequence the step SKILL.md files prescribe actually runs, on
// a temp copy of the example, with the mark hook live (no DDD_NO_RENDER): define and contracts
// render -> stamp -> validate --step -> mark, then the page and diagrams exist and the gates say OK.
// Commands are parsed from the SKILL.md files themselves so a doc/CLI drift fails here.
// Usage: node verify-integration.mjs 1.4
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
if (process.argv.length !== 3 || process.argv[2] !== "1.4") { console.error("usage: node verify-integration.mjs 1.4"); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const fails = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-node-1.4-"));
try {
  fs.cpSync(path.join(PLUGIN, "shared/examples/mealkit"), tmp, { recursive: true });
  const ddd = path.join(tmp, "ddd");
  fs.rmSync(path.join(ddd, "diagrams"), { recursive: true, force: true });
  fs.rmSync(path.join(ddd, "review.html"), { force: true });
  let ran = 0;
  for (const step of ["define", "contracts"]) {
    const doc = fs.readFileSync(path.join(PLUGIN, "skills", `ddd-${step}`, "SKILL.md"), "utf8");
    // The closing sequence: render, stamp, validate --step, mark - in the order the doc lists them.
    const lines = [...doc.matchAll(/^\s*node \$\{CLAUDE_PLUGIN_ROOT\}\/shared\/bin\/ddd\.mjs ([^\n#]+)/gm)].map((m) => m[1].trim());
    const want = [new RegExp(`^${step} render`), /^stamp /, new RegExp(`^validate .*--step ${step}`), new RegExp(`^mark .*${step} done`)];
    for (const re of want) {
      const line = lines.find((l) => re.test(l));
      if (!line) { fails.push(`${step} SKILL.md: no closing command matching ${re}`); continue; }
      const args = line.replace(/<ddd-dir>/g, ddd).replace(/<mode>/g, "auto").replace(/<depth>/g, "light").replace(/\s+#.*$/, "").split(/\s+/);
      const r = spawnSync(process.execPath, [path.join(PLUGIN, "shared/bin/ddd.mjs"), ...args], { cwd: tmp, encoding: "utf8", timeout: 600000 });
      ran++;
      if (r.status !== 0) fails.push(`${step}: \`ddd ${args.join(" ")}\` exit ${r.status}: ${(r.stderr + r.stdout).slice(0, 300)}`);
    }
  }
  if (!fs.existsSync(path.join(ddd, "review.html"))) fails.push("mark did not rebuild review.html");
  const svgs = fs.existsSync(path.join(ddd, "diagrams")) ? fs.readdirSync(path.join(ddd, "diagrams")).filter((f) => f.endsWith(".svg")).length : 0;
  if (svgs < 7) fails.push(`expected >= 7 diagram SVGs after mark, got ${svgs}`);
  const v = spawnSync(process.execPath, [path.join(PLUGIN, "shared/bin/ddd.mjs"), "validate", ddd, "--status"], { encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" } });
  if (v.status !== 0 || !v.stdout.includes("RESULT: OK")) fails.push(`validate after the documented sequence: exit ${v.status}`);
  if (fails.length === 0) console.log(`${ran} documented closing commands ran on one workspace; page + ${svgs} SVGs rebuilt by mark; validate OK`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log("integration verification passed");
