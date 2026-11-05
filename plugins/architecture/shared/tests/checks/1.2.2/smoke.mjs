#!/usr/bin/env node
// Smoke render for leaf 1.2.2: renderAll for a workspace into <outDir>,
// a light PNG of each SVG (Chrome permitting), the synthetic 15-context
// workspace's context map and 44-event storm, and the decision comparison
// from a temp copy with a synthetic decision, so a reviewer can look at
// every picture.
//
//   node smoke.mjs <ddd-dir> <outDir>
//
// Exit 2 on misuse, 1 on a render error, 0 otherwise (no Chrome is a note).

import fs from 'node:fs';
import path from 'node:path';
import { LIB, syntheticWorkspace, decisionCopy } from './_fixtures.mjs';

const [dddDir, outDir] = process.argv.slice(2);
if (!dddDir || !outDir || process.argv.length > 4) {
  process.stderr.write('usage: smoke.mjs <ddd-dir> <outDir>\n');
  process.exit(2);
}
if (!fs.existsSync(path.join(dddDir, 'manifest.json'))) {
  process.stderr.write(`smoke: ${dddDir} has no manifest.json\n`);
  process.exit(2);
}

const { loadWorkspace } = await import(path.join(LIB, 'workspace.mjs'));
const diagrams = await import(path.join(LIB, 'render/diagrams/index.mjs'));
const decision = await import(path.join(LIB, 'render/diagrams/decision.mjs'));
const { svgToPng, findChrome } = await import(path.join(LIB, 'render/core/chrome.mjs'));

fs.mkdirSync(outDir, { recursive: true });
const chrome = findChrome();
const pngs = [];
async function png(svgPath) {
  if (!chrome) return;
  const target = svgPath.replace(/\.svg$/, '.png');
  const r = await svgToPng(svgPath, target, { chrome, scale: 2 });
  if (r.ok) pngs.push(target); else console.error(`note: ${r.note}`);
}

try {
  const ws = loadWorkspace(dddDir);
  const res = await diagrams.renderAll(ws, { outDir });
  for (const w of res.written) { console.log(`${w.id.padEnd(26)} ${w.svg}`); await png(w.svg); }
  for (const s of res.skipped) console.log(`skipped ${s.id}: ${s.reason}`);
  for (const w of res.warnings) console.log(`warning: ${w}`);

  const synth = syntheticWorkspace(15);
  const synthDir = path.join(outDir, 'synthetic');
  const sres = await diagrams.renderAll(synth, { outDir: synthDir });
  for (const w of sres.written) { console.log(`synthetic/${w.id.padEnd(16)} ${w.svg}`); await png(w.svg); }
  for (const s of sres.skipped) console.log(`synthetic skipped ${s.id}: ${s.reason}`);

  const { dddDir: decDir, Did } = await decisionCopy(dddDir);
  const d = await decision.renderDecision(loadWorkspace(decDir), Did, { outDir: path.join(outDir, 'decisions'), png: Boolean(chrome) });
  console.log(`decision ${Did}`.padEnd(26), d.svg);
  if (d.png) pngs.push(d.png);
  for (const w of d.warnings) console.log(`decision warning: ${w}`);
  fs.rmSync(path.dirname(decDir), { recursive: true, force: true });

  for (const p of pngs) console.log(p);
  if (!chrome) console.log('no Chrome found: SVGs only');
} catch (error) {
  console.error(`FAIL ${error.stack || error}`);
  process.exit(1);
}
