#!/usr/bin/env node
// The code manifest and marketplace entry advertise the integrated DDD runtime,
// review artifacts, and Blueprint. Other code skills may use other runtimes.
//
// Usage: node plugins/code/shared/tests/checks/1.4.1/check-plugin-manifest.mjs
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "plugin-manifest verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const REPO = path.resolve(PLUGIN, "..", "..");

if (process.argv.length > 2) {
  console.error("usage: node plugins/code/shared/tests/checks/1.4.1/check-plugin-manifest.mjs");
  process.exit(2);
}

const failures = [];
function judge(label, entry) {
  const text = `${entry.description || ""} ${(entry.keywords || []).join(" ")}`;
  if (!/Node(?:\.js)?\s*(?:18|≥\s*18|>=\s*18)/.test(text)) failures.push(`${label}: does not say Node 18 (or newer)`);
  for (const word of [/review page/i, /diagram/i, /decision/i, /blueprint/i]) {
    if (!word.test(text)) failures.push(`${label}: does not mention ${word.source.replace(/\\/g, "")}`);
  }
  if (!Array.isArray(entry.keywords) || !entry.keywords.length) failures.push(`${label}: no keywords`);
}
try {
  const plugin = JSON.parse(fs.readFileSync(path.join(PLUGIN, ".claude-plugin", "plugin.json"), "utf8"));
  if (plugin.name !== "code") failures.push(`plugin.json: name is ${plugin.name}`);
  judge("plugin.json", plugin);
  const market = JSON.parse(fs.readFileSync(path.join(REPO, ".claude-plugin", "marketplace.json"), "utf8"));
  const entry = (market.plugins || []).find((p) => p.name === "code");
  if (!entry) failures.push("marketplace.json: no code entry");
  else judge("marketplace.json (code)", entry);
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(2);
}
if (failures.length) {
  console.log(`plugin-manifest verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("plugin.json and the marketplace code entry: Node 18, review page, diagrams, decisions, blueprint");
console.log(MARKER);
