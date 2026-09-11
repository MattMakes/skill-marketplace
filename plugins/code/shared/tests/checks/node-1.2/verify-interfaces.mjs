#!/usr/bin/env node
// Branch 1.2 (visual layer) N2: the modules the six children delivered expose the interfaces the
// PLAN contract names, so the page, the mark hook and the CLI are wired to real exports.
// Usage: node verify-interfaces.mjs 1.2
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
if (process.argv.length !== 3 || process.argv[2] !== "1.2") { console.error("usage: node verify-interfaces.mjs 1.2"); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..", "..", "..");
const fails = [];
const want = {
  "lib/render/core/layout.mjs": ["layout", "serializeLayout"],
  "lib/render/core/palette.mjs": ["contextColor", "stickyColor", "edgeStyle", "paletteCss", "FONTS"],
  "lib/render/core/chrome.mjs": ["findChrome", "svgToPng"],
  "lib/render/diagrams/index.mjs": ["GENERATORS", "available", "renderAll"],
  "lib/render/diagrams/decision.mjs": ["main", "renderDecision", "optionSvg"],
  "lib/render/explorers/index.mjs": ["sections", "explorersCss", "decisionRows", "openDecisions"],
  "lib/review.mjs": ["main", "buildPage", "renderDiagrams"],
  "lib/render/export/blueprint.mjs": ["main", "exportBlueprint"],
};
for (const [rel, names] of Object.entries(want)) {
  const abs = path.join(SHARED, rel);
  if (!existsSync(abs)) { fails.push(`${rel}: missing`); continue; }
  const mod = await import(pathToFileURL(abs).href);
  for (const n of names) if (typeof mod[n] === "undefined") fails.push(`${rel}: no export ${n}`);
}
for (const f of ["vendor/elkjs/elk.bundled.js", "vendor/elkjs/LICENSE", "THIRD_PARTY_NOTICES.md", "../skills/blueprint/bin/blueprint.mjs", "../skills/blueprint/schemas/architecture.schema.json", "lib/render/core/runtime.js", "lib/render/page/DIRECTION.md"]) {
  if (!existsSync(path.join(SHARED, f))) fails.push(`${f}: missing`);
}
// the CLI dispatches every visual-layer command
for (const args of [["review", "/nonexistent"], ["decision", "render", "/nonexistent", "D1"], ["export", "blueprint", "/nonexistent"]]) {
  const r = spawnSync(process.execPath, [path.join(SHARED, "bin/ddd.mjs"), ...args], { encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" } });
  if (/not implemented yet/.test(r.stderr)) fails.push(`${args.join(" ")}: CLI says not implemented`);
}
if (fails.length) { for (const f of fails) console.error("FAIL " + f); process.exit(1); }
console.log("checked 8 modules, vendored elkjs, notices, blueprint skill, runtime, direction; CLI dispatches review/decision/export");
console.log("interface verification passed");
