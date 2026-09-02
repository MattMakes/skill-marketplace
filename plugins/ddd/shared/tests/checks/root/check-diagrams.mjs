#!/usr/bin/env node
// Root G6: for every diagram the generators report available for the steps present in a
// workspace, `diagrams/<id>.svg` exists, and either `diagrams/<id>.png` exists or the review page
// carries the no-Chrome note that explains why not. The decision composites are covered too:
// every decision with option diagrams has `diagrams/decisions/<Did>.svg` (bare id for the first
// step holding it, `<step>-<Did>` otherwise) with the same PNG-or-note rule.
//
// Usage: node plugins/ddd/shared/tests/checks/root/check-diagrams.mjs <ddd-dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "diagrams verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(HERE, "..", "..", "..", "lib");

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/ddd/shared/tests/checks/root/check-diagrams.mjs <ddd-dir>");
  process.exit(2);
}
let dddDir = path.resolve(args[0]);
if (!fs.existsSync(path.join(dddDir, "manifest.json")) && fs.existsSync(path.join(dddDir, "ddd", "manifest.json"))) dddDir = path.join(dddDir, "ddd");
if (!fs.existsSync(path.join(dddDir, "manifest.json"))) { console.error(`usage: ${args[0]} is not a ddd workspace (no manifest.json)`); process.exit(2); }

const { loadWorkspace, STEPS } = await import(path.join(LIB, "workspace.mjs"));
const { available } = await import(path.join(LIB, "render", "diagrams", "index.mjs"));
const { NO_CHROME_NOTE } = await import(path.join(LIB, "render", "core", "chrome.mjs"));

const ws = loadWorkspace(dddDir);
const diagrams = path.join(dddDir, "diagrams");
const page = fs.existsSync(path.join(dddDir, "review.html")) ? fs.readFileSync(path.join(dddDir, "review.html"), "utf8") : "";
const noChrome = page.includes(NO_CHROME_NOTE);
const failures = [];
let svgs = 0;
let pngs = 0;
function expect(id, base) {
  const svg = path.join(base, `${id}.svg`);
  const png = path.join(base, `${id}.png`);
  if (!fs.existsSync(svg)) { failures.push(`${path.relative(dddDir, svg)} missing`); return; }
  svgs++;
  if (fs.existsSync(png)) pngs++;
  else if (!noChrome) failures.push(`${path.relative(dddDir, png)} missing and review.html carries no "${NO_CHROME_NOTE}" note`);
}
const avail = available(ws);
if (!avail.available.length) failures.push("the generators report no diagram available for this workspace");
for (const d of avail.available) expect(d.id, diagrams);
// Decision composites.
const seen = new Set();
for (const step of STEPS) {
  for (const d of ws.steps?.[step]?.decisions || []) {
    if (!(d.options || []).some((o) => o.diagram)) continue;
    const id = seen.has(d.id) ? `${step}-${d.id}` : d.id;
    seen.add(d.id);
    expect(id, path.join(diagrams, "decisions"));
  }
}
if (failures.length) {
  console.log(`diagrams verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${svgs} SVG present (${avail.available.length} step diagrams + ${svgs - avail.available.length} decision composites); ${pngs} PNG${noChrome ? `; no-Chrome note on the page covers the rest` : ""}`);
console.log(MARKER);
