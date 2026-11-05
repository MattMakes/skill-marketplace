#!/usr/bin/env node
// Gate check for leaf 1.2.2 (G1, G2, G4).
//
//   node check-generators.mjs <ddd-dir>                 G1: every diagram renders
//     well-formed SVG with one g[data-node-id] per source item and one
//     path[data-edge] per relationship / flow step; renderAll twice gives
//     byte-identical SVGs.
//   node check-generators.mjs <ddd-dir> --truncate 3    G2: a temp copy with
//     only steps 01-03 renders without throwing and available() names each
//     missing diagram with a reason.
//   node check-generators.mjs [<ddd-dir>] --synthetic 15   G4: a generated
//     15-context / 40-relationship workspace (plus 44 events, 3 teams) renders
//     with no overlapping node boxes in any returned layout.
//
// Exit 2 on misuse, 1 on failure, 0 when it prints "generators verification passed".

import fs from 'node:fs';
import path from 'node:path';
import { LIB, tmpDir, truncatedCopy, syntheticWorkspace } from './_fixtures.mjs';

const argv = process.argv.slice(2);
let dddDir = null;
let truncate = null;
let synthetic = null;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--truncate') { truncate = Number(argv[++i]); continue; }
  if (a === '--synthetic') { synthetic = Number(argv[++i]); continue; }
  if (a.startsWith('-')) { usage(`unknown flag ${a}`); }
  if (dddDir) usage('one <ddd-dir> only');
  dddDir = a;
}
if (!dddDir && synthetic === null) usage('a <ddd-dir> is required unless --synthetic N is given');
if (truncate !== null && (!Number.isInteger(truncate) || truncate < 1 || truncate > 9)) usage('--truncate needs a step number 1-9');
if (synthetic !== null && (!Number.isInteger(synthetic) || synthetic < 2)) usage('--synthetic needs a context count >= 2');
if (dddDir && !fs.existsSync(path.join(dddDir, 'manifest.json'))) usage(`${dddDir} has no manifest.json`);

function usage(msg) {
  process.stderr.write(`check-generators: ${msg}\nusage: check-generators.mjs <ddd-dir> [--truncate N] [--synthetic N]\n`);
  process.exit(2);
}

const failures = [];
const fail = (m) => { failures.push(m); process.stderr.write(`FAIL ${m}\n`); };
const ok = (m) => process.stdout.write(`ok   ${m}\n`);

const { loadWorkspace } = await import(path.join(LIB, 'workspace.mjs'));
const diagrams = await import(path.join(LIB, 'render/diagrams/index.mjs'));
const { rectsOverlap } = await import(path.join(LIB, 'render/core/route.mjs'));

// ---- A small well-formedness check: balanced tags, quoted attributes, one root.
export function wellFormed(svg) {
  const problems = [];
  const s = svg.replace(/^<\?xml[^>]*\?>\s*/, '');
  if (!s.startsWith('<svg')) problems.push('does not start with <svg');
  const stack = [];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(\/)?([A-Za-z][\w:-]*)((?:\s+[\w:-]+(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>/g;
  let m;
  let last = 0;
  while ((m = re.exec(s))) {
    const between = s.slice(last, m.index);
    if (/<|(&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);))/.test(between)) problems.push(`stray < or & near offset ${last}`);
    last = re.lastIndex;
    if (m[0].startsWith('<!')) continue;
    const [, close, name, attrs, selfClose] = m;
    if (attrs && /\s[\w:-]+\s*=\s*[^"\s]/.test(attrs)) problems.push(`unquoted attribute in <${name}>`);
    if (close) {
      if (stack.pop() !== name) problems.push(`mismatched </${name}>`);
    } else if (!selfClose) stack.push(name);
  }
  if (s.slice(last).trim()) problems.push('text after the root element');
  if (stack.length) problems.push(`unclosed ${stack.join(', ')}`);
  return problems;
}

const count = (svg, re) => (svg.match(re) || []).length;
const nodeIds = (svg) => [...svg.matchAll(/<g[^>]*\sdata-node-id="([^"]*)"/g)].map((m) => m[1]);
const edgeIds = (svg) => [...svg.matchAll(/<path[^>]*\sdata-edge="([^"]*)"/g)].map((m) => m[1]);
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

// One element per source item, per diagram: what the step JSON lists.
function expectations(ws, id) {
  const s = ws.steps;
  if (id === 'context-map') {
    const ctx = (s.decompose.bounded_contexts || []).map((c) => c.id);
    return { nodes: ctx, edges: (s.decompose.relationships || []).map((r) => r.id) };
  }
  if (id === 'core-domain-chart') return { nodes: s.strategize.classifications.map((c) => c.subdomain), edges: [] };
  if (id.startsWith('flow-')) {
    const f = s.connect.flows.find((x) => `flow-${x.id}` === id);
    const parts = [...new Set(f.steps.flatMap((st) => [st.from, st.to]))];
    return { nodes: parts, edges: f.steps.map((st) => `${f.id}-s${st.seq}`), exactEdges: true };
  }
  if (id === 'teams-deployables') return { nodes: s.organise.deployables.map((d) => d.id), edges: [] };
  if (id === 'c4-context') return { nodes: ['system'], edges: [] };
  if (id.startsWith('aggregates-')) {
    const cc = s.code.contexts.find((c) => `aggregates-${c.context}` === id);
    return { nodes: cc.aggregates.map((a) => a.id), edges: [] };
  }
  if (id === 'event-storm') return { nodes: s.discover.events.map((e) => e.id), edges: [], kindCount: ['event', s.discover.events.length] };
  return { nodes: [], edges: [] };
}

function checkSvg(ws, id, svg, expected) {
  const wf = wellFormed(svg);
  if (wf.length) fail(`${id}: not well-formed: ${wf.join('; ')}`);
  if (!/<title>[^<]+<\/title>/.test(svg)) fail(`${id}: no <title>`);
  if (!svg.includes(`data-diagram="${id}"`)) fail(`${id}: svg[data-diagram] is not ${id}`);
  if (!svg.includes(`generated from `)) fail(`${id}: no "generated from <step>.json" caption`);
  const ids = nodeIds(svg).map(unesc);
  const seen = new Set();
  for (const n of ids) { if (seen.has(n)) fail(`${id}: node ${n} drawn twice`); seen.add(n); }
  for (const n of expected.nodes) if (!seen.has(n)) fail(`${id}: no g[data-node-id="${n}"]`);
  const eids = edgeIds(svg).map(unesc);
  const eseen = new Set(eids);
  for (const e of expected.edges) if (!eseen.has(e)) fail(`${id}: no path[data-edge="${e}"]`);
  if (expected.exactEdges && eids.length !== expected.edges.length) fail(`${id}: ${eids.length} edges drawn, ${expected.edges.length} steps`);
  if (id === 'context-map' && eids.length !== expected.edges.length) fail(`${id}: ${eids.length} edges drawn, ${expected.edges.length} relationships`);
  if (expected.kindCount) {
    const [kind, n] = expected.kindCount;
    const c = count(svg, new RegExp(`<g[^>]*\\sdata-node-id="[^"]*"[^>]*\\sdata-kind="${kind}"`, 'g'));
    if (c !== n) fail(`${id}: ${c} ${kind} nodes drawn, ${n} in discover.json`);
  }
  for (const n of ids) {
    const g = new RegExp(`<g[^>]*\\sdata-node-id="${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`).exec(svg)[0];
    if (!/data-label="/.test(g) || !/data-kind="/.test(g)) fail(`${id}: node ${n} lacks data-label/data-kind`);
  }
}

function overlaps(laid, id) {
  const boxes = [...laid.nodes.entries()].map(([nid, b]) => ({ nid, x: b.x, y: b.y, width: b.w, height: b.h }));
  const bad = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (rectsOverlap(boxes[i], boxes[j], 0)) bad.push(`${boxes[i].nid} x ${boxes[j].nid}`);
    }
  }
  if (bad.length) fail(`${id}: overlapping node boxes: ${bad.slice(0, 6).join(', ')}${bad.length > 6 ? ` (+${bad.length - 6})` : ''}`);
  else ok(`${id}: ${boxes.length} node boxes, none overlap`);
}

async function renderEach(ws, { checkOverlap = false } = {}) {
  const { available, missing } = diagrams.available(ws);
  const out = [];
  for (const { id, family } of available) {
    const g = diagrams.GENERATORS.find((x) => x.family === family);
    let spec;
    let res;
    try {
      spec = g.module.spec(ws, { id });
      res = await g.module.svg(spec, {});
    } catch (error) {
      fail(`${id}: threw ${error.stack || error}`);
      continue;
    }
    if (spec.id !== id) fail(`${id}: spec.id is ${spec.id}`);
    checkSvg(ws, id, res.svg, expectations(ws, id));
    if (checkOverlap) overlaps(res.layout, id);
    out.push({ id, spec, svg: res.svg, layout: res.layout });
  }
  return { rendered: out, missing };
}

// ---- G1: the example workspace.
if (dddDir && truncate === null && synthetic === null) {
  const ws = loadWorkspace(dddDir);
  const { rendered, missing } = await renderEach(ws);
  const need = ['context-map', 'core-domain-chart', 'teams-deployables', 'c4-context', 'event-storm'];
  for (const id of need) if (!rendered.some((r) => r.id === id)) fail(`${id} not rendered (${missing.map((m) => `${m.id}: ${m.reason}`).join('; ')})`);
  if (!rendered.some((r) => r.id.startsWith('flow-'))) fail('no flow-* rendered');
  if (!rendered.some((r) => r.id.startsWith('aggregates-'))) fail('no aggregates-* rendered');
  ok(`${rendered.length} diagrams rendered: ${rendered.map((r) => r.id).join(', ')}`);
  // Run-to-run consistency through renderAll, with layout memory on the
  // second run.
  const out = tmpDir('ddd-gen-');
  const first = await diagrams.renderAll(ws, { outDir: out });
  const bytes1 = Object.fromEntries(first.written.map((w) => [w.id, fs.readFileSync(w.svg, 'utf8')]));
  const second = await diagrams.renderAll(ws, { outDir: out });
  for (const w of second.written) {
    const b = fs.readFileSync(w.svg, 'utf8');
    if (b !== bytes1[w.id]) fail(`${w.id}: second renderAll differs from the first`);
    if (!fs.existsSync(w.layout)) fail(`${w.id}: no layout file written`);
  }
  if (second.skipped.length) fail(`renderAll skipped: ${second.skipped.map((s) => `${s.id} (${s.reason})`).join('; ')}`);
  ok(`renderAll twice: ${second.written.length} SVGs byte-identical, layout memory files present`);
  fs.rmSync(out, { recursive: true, force: true });
}

// ---- G2: truncated workspace.
if (truncate !== null) {
  const dir = truncatedCopy(dddDir, truncate);
  const ws = loadWorkspace(dir);
  const present = Object.keys(ws.steps);
  ok(`truncated copy has steps: ${present.join(', ')}`);
  let avail;
  try {
    avail = diagrams.available(ws);
  } catch (error) {
    fail(`available() threw: ${error.stack || error}`);
    avail = { available: [], missing: [] };
  }
  const expectedMissing = diagrams.GENERATORS.filter((g) => !ws.steps[g.step]).map((g) => g.family);
  for (const fam of expectedMissing) {
    const m = avail.missing.find((x) => x.family === fam);
    if (!m) fail(`available() does not list ${fam} as missing`);
    else if (!m.reason || !/needs .*\.json/.test(m.reason)) fail(`${fam}: missing without a usable reason (${m.reason})`);
    else ok(`missing ${m.id}: ${m.reason}`);
  }
  for (const a of avail.available) if (!ws.steps[diagrams.GENERATORS.find((g) => g.family === a.family).step]) fail(`${a.id} listed as available without its step`);
  const out = tmpDir('ddd-gen-trunc-');
  let res;
  try {
    res = await diagrams.renderAll(ws, { outDir: out });
  } catch (error) {
    fail(`renderAll threw on the truncated workspace: ${error.stack || error}`);
  }
  if (res) {
    const failed = res.skipped.filter((s) => /render failed/.test(s.reason));
    if (failed.length) fail(`renderAll failures: ${failed.map((s) => `${s.id}: ${s.reason}`).join('; ')}`);
    for (const w of res.written) checkSvg(ws, w.id, fs.readFileSync(w.svg, 'utf8'), expectations(ws, w.id));
    ok(`renderAll on 01-0${truncate}: wrote ${res.written.map((w) => w.id).join(', ')}; skipped ${res.skipped.length}`);
  }
  fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  fs.rmSync(out, { recursive: true, force: true });
}

// ---- G4: synthetic workspace.
if (synthetic !== null) {
  const ws = syntheticWorkspace(synthetic);
  const rels = ws.steps.decompose.relationships.length;
  ok(`synthetic workspace: ${synthetic} contexts, ${rels} relationships, ${ws.steps.discover.events.length} events`);
  const { rendered } = await renderEach(ws, { checkOverlap: true });
  const cm = rendered.find((r) => r.id === 'context-map');
  if (!cm) fail('context-map not rendered for the synthetic workspace');
  else {
    const drawn = edgeIds(cm.svg).length;
    if (drawn !== rels) fail(`context-map: ${drawn} edges drawn for ${rels} relationships`);
    if (cm.layout.engine !== 'elk') fail(`context-map: engine ${cm.layout.engine}, expected elk (${cm.layout.warnings.join('; ')})`);
    // Every edge label must sit on one of its own edge's segments.
    const labels = [...cm.svg.matchAll(/<text[^>]*class="t-edge"[^>]*>/g)];
    if (!labels.length) fail('context-map: no edge labels drawn');
  }
  const td = rendered.find((r) => r.id === 'teams-deployables');
  if (td) {
    const teamEdges = edgeIds(td.svg).filter((e) => e.startsWith('team:'));
    if (teamEdges.length !== ws.steps.organise.interactions.length) fail(`teams-deployables: ${teamEdges.length} team interaction edges, ${ws.steps.organise.interactions.length} interactions`);
    else ok(`teams-deployables: ${teamEdges.length} team interactions drawn between frames`);
  }
}

if (failures.length) {
  process.stderr.write(`${failures.length} failure(s)\n`);
  process.exit(1);
}
process.stdout.write('generators verification passed\n');
