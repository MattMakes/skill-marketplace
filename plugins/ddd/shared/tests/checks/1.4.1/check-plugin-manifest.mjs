#!/usr/bin/env node
// G5 for leaf 1.4.1: plugin.json and the ddd entry of the marketplace both say Node 18 (or
// newer) and describe the review page, diagrams, decisions and the blueprint final render; neither
// mentions Python any more. The `code` plugin's entry legitimately says Python, so only the ddd
// entry of the marketplace is judged.
//
// Usage: node plugins/ddd/shared/tests/checks/1.4.1/check-plugin-manifest.mjs
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "plugin-manifest verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const REPO = path.resolve(PLUGIN, "..", "..");

if (process.argv.length > 2) {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.4.1/check-plugin-manifest.mjs");
  process.exit(2);
}

const failures = [];
function judge(label, entry) {
  const text = `${entry.description || ""} ${(entry.keywords || []).join(" ")}`;
  if (!/Node(?:\.js)?\s*(?:18|≥\s*18|>=\s*18)/.test(text)) failures.push(`${label}: does not say Node 18 (or newer)`);
  if (/python/i.test(text)) failures.push(`${label}: still mentions python`);
  for (const word of [/review page/i, /diagram/i, /decision/i, /blueprint/i]) {
    if (!word.test(text)) failures.push(`${label}: does not mention ${word.source.replace(/\\/g, "")}`);
  }
  if (!Array.isArray(entry.keywords) || !entry.keywords.length) failures.push(`${label}: no keywords`);
}
try {
  const plugin = JSON.parse(fs.readFileSync(path.join(PLUGIN, ".claude-plugin", "plugin.json"), "utf8"));
  if (plugin.name !== "ddd") failures.push(`plugin.json: name is ${plugin.name}`);
  judge("plugin.json", plugin);
  const market = JSON.parse(fs.readFileSync(path.join(REPO, ".claude-plugin", "marketplace.json"), "utf8"));
  const entry = (market.plugins || []).find((p) => p.name === "ddd");
  if (!entry) failures.push("marketplace.json: no ddd entry");
  else judge("marketplace.json (ddd)", entry);
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(2);
}
if (failures.length) {
  console.log(`plugin-manifest verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("plugin.json and the marketplace ddd entry: Node 18, review page, diagrams, decisions, blueprint, no python");
console.log(MARKER);
