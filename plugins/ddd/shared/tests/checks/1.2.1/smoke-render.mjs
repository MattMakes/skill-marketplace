#!/usr/bin/env node
// Smoke render for leaf 1.2.1: lays out the 12-node fixture with elkjs and
// writes SVG and PNG (light and dark, RIGHT and DOWN) plus the incremental
// "one leaf added" picture to /tmp so a reviewer can look at them.
//
// Usage: node plugins/ddd/shared/tests/checks/1.2.1/smoke-render.mjs [outDir]
// Exit 0 when the SVGs were written (PNGs need Chrome; without it the note
// is printed and the exit is still 0), 1 on a layout or render error.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] || '/tmp';
const { layout, serializeLayout } = await import(path.resolve(here, '../../../lib/render/core/layout.mjs'));
const { renderScene } = await import(path.resolve(here, '../../../lib/render/core/scene.mjs'));
const { svgToPng, findChrome } = await import(path.resolve(here, '../../../lib/render/core/chrome.mjs'));
const { fixture, withLeaf } = await import(path.resolve(here, './fixture.mjs'));

fs.mkdirSync(outDir, { recursive: true });
const written = [];
const chrome = findChrome();

async function emit(name, graph, laid, opts) {
  const svg = renderScene(graph, laid, { id: name, caption: true, ...opts });
  const svgPath = path.join(outDir, `${name}.svg`);
  fs.writeFileSync(svgPath, svg);
  written.push(svgPath);
  for (const theme of ['light', 'dark']) {
    const pngPath = path.join(outDir, `${name}-${theme}.png`);
    const result = await svgToPng(svgPath, pngPath, { theme, scale: 2, chrome });
    if (result.ok) written.push(pngPath); else console.error(`note: ${result.note}`);
  }
}

try {
  const base = fixture();
  const right = await layout(base, { direction: 'RIGHT' });
  const down = await layout(base, { direction: 'DOWN' });
  if (right.engine !== 'elk' || down.engine !== 'elk') throw new Error(`expected elk, got ${right.engine}/${down.engine}: ${right.warnings.join('; ')}`);
  await emit('ddd-core-smoke', base, right, { title: 'Context map', subtitle: `mealkit fixture, 12 contexts, 3 deployables, elkjs layered RIGHT, ${right.width}x${right.height}` });
  await emit('ddd-core-smoke-down', base, down, { title: 'Context map', subtitle: `same fixture, elkjs layered DOWN, ${down.width}x${down.height}` });
  const added = withLeaf(fixture());
  const incremental = await layout(added, { direction: 'RIGHT', previous: serializeLayout(right) });
  await emit('ddd-core-smoke-incremental', added, incremental, { title: 'Context map, one node added', subtitle: `analytics placed with layout memory; ${incremental.warnings.join('; ') || 'no warnings'}` });
  const fallback = await layout(base, { direction: 'RIGHT', engine: 'grid' });
  await emit('ddd-core-smoke-fallback', base, fallback, { title: 'Context map, grid fallback', subtitle: fallback.warnings[0] });
  for (const [name, laid] of [['RIGHT', right], ['DOWN', down], ['incremental', incremental], ['fallback', fallback]]) {
    console.log(`${name.padEnd(12)} engine=${laid.engine} ${laid.width}x${laid.height} warnings=${laid.warnings.length ? laid.warnings.join(' | ') : 'none'}`);
  }
  for (const file of written) console.log(file);
  if (!chrome) console.log('no Chrome found: SVGs only');
} catch (error) {
  console.error(`FAIL ${error.stack || error}`);
  process.exit(1);
}
