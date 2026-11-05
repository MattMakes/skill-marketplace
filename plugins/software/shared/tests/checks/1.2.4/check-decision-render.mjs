#!/usr/bin/env node
// G5: `ddd decision render <dir> D1` writes ddd/diagrams/decisions/D1.svg (and .png when
// Chrome is found) with every option side by side. Runs on a temp copy of the example;
// when the example has no decision D1 with option diagrams yet (leaf 1.2.5 adds them),
// the ready-made decision fixture from checks/1.2.2 is used and said so.
//
// Usage: node check-decision-render.mjs
// Exit 0 and print `decision-render verification passed`; 1 on a failed assertion; 2 on misuse.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.argv.length > 2) { console.error("usage: node check-decision-render.mjs"); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(here, "../../..");
const BIN = path.join(SHARED, "bin", "ddd.mjs");
const FIXTURE = path.join(SHARED, "examples", "mealkit");
const { findChrome } = await import(pathToFileURL(path.join(SHARED, "lib", "render", "core", "chrome.mjs")).href);
const { loadWorkspace } = await import(pathToFileURL(path.join(SHARED, "lib", "workspace.mjs")).href);
const { decisionRows } = await import(pathToFileURL(path.join(SHARED, "lib", "render", "explorers", "index.mjs")).href);

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

let tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-decision-check-"));
let ddd = path.join(tmp, "mealkit", "ddd");
fs.cpSync(FIXTURE, path.join(tmp, "mealkit"), { recursive: true });
fs.rmSync(path.join(ddd, "diagrams"), { recursive: true, force: true });
let source = "the example's own D1";
const hasD1 = decisionRows(loadWorkspace(ddd)).some((r) => r.id === "D1" && r.options.some((o) => o.specExists));
if (!hasD1) {
  fs.rmSync(tmp, { recursive: true, force: true });
  const { decisionCopy } = await import(pathToFileURL(path.join(SHARED, "tests", "checks", "1.2.2", "_fixtures.mjs")).href);
  const c = await decisionCopy(FIXTURE.endsWith("ddd") ? FIXTURE : path.join(FIXTURE, "ddd"));
  ddd = c.dddDir;
  tmp = path.dirname(ddd);
  source = "the 1.2.2 decision fixture (the example has no D1 with option diagrams yet)";
}
console.log(`using ${source}`);
try {
  const r = spawnSync(process.execPath, [BIN, "decision", "render", ddd, "D1"], { encoding: "utf8", env: { ...process.env }, timeout: 300000 });
  check(r.status === 0, `ddd decision render exited ${r.status}: ${r.stderr}`);
  const svg = path.join(ddd, "diagrams", "decisions", "D1.svg");
  check(fs.existsSync(svg), "diagrams/decisions/D1.svg not written");
  check(r.stdout.includes(svg), `stdout does not name the SVG: ${r.stdout}`);
  if (fs.existsSync(svg)) {
    const body = fs.readFileSync(svg, "utf8");
    check(/data-diagram="decision-[a-z]+-D1"/.test(body), "the SVG is not the decision-D1 diagram");
    const ws = loadWorkspace(ddd);
    const row = decisionRows(ws).find((x) => x.id === "D1");
    for (const o of row.options) check(body.includes(`Option ${o.id}`), `option ${o.id} is not drawn in the composite`);
  }
  const chrome = findChrome();
  if (chrome) check(fs.existsSync(svg.replace(/\.svg$/, ".png")), "Chrome is present but diagrams/decisions/D1.png was not written");
  else console.log("note: no Chrome; the PNG assertion is skipped");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log("decision-render verification passed");
