#!/usr/bin/env node
// Gate check for leaf 1.2.6 G1.
//
//   node check-export.mjs <ddd-dir>
//
// For the given workspace and for the toolshare fixture (fixtures/toolshare/ddd,
// a realistic 4-context, 20-message workspace), runs `ddd export blueprint <ddd-dir>
// --out <temp>` and verifies: final.architecture.json and one
// final-<flow>.sequence.json per connect flow exist; every deployable is a boundary,
// every bounded context a `backend` component, every deployable that owns its data
// a `database` component, every cross-party (message, consumer) pair a connection
// (labelled: a dropped label is a degradation and must not happen on these
// workspaces); every sequence has the flow's participants and one message per step;
// and every spec validates against the skill's schemas (skills/blueprint/schemas)
// with our own jsonschema.mjs (common's $defs inlined by the exporter's loader). Expected counts
// come straight from the step JSON, not from the exporter.
//
// Exit 2 on misuse, 1 on failure, 0 when it prints "export verification passed".
import fs from 'node:fs';
import path from 'node:path';
import { LIB, tmpDir, runExport, readJson, expectedCounts, fileList, workspacesFor } from './_lib.mjs';

const argv = process.argv.slice(2);
if (argv.length !== 1 || argv[0].startsWith('-')) usage('exactly one <ddd-dir> is required');
if (!fs.existsSync(path.join(path.resolve(argv[0]), 'manifest.json'))) usage(`${argv[0]} has no manifest.json`);

function usage(msg) {
  process.stderr.write(`check-export: ${msg}\nusage: check-export.mjs <ddd-dir>\n`);
  process.exit(2);
}

const failures = [];
const fail = (m) => { failures.push(m); process.stderr.write(`FAIL ${m}\n`); };
const ok = (m) => process.stdout.write(`ok   ${m}\n`);

const { checkSchema } = await import(path.join(LIB, 'jsonschema.mjs'));
const { loadBlueprintSchema } = await import(path.join(LIB, 'render', 'export', 'blueprint.mjs'));

function checkWorkspace(dddDir) {
  process.stdout.write(`--- ${dddDir}\n`);
  const out = tmpDir();
  const r = runExport(dddDir, ['--out', out]);
  if (r.status !== 0) fail(`ddd export blueprint exited ${r.status}: ${r.stderr.trim()}`);
  else ok(`ddd export blueprint exit 0`);
  if (r.stdout.includes(out)) ok('stdout names the written files');
  else fail(`stdout does not name the out dir: ${r.stdout.trim()}`);
  if (/dropped the label/.test(r.stderr)) fail(`a connection label was dropped:\n${r.stderr}`);
  else ok('no connection label dropped');

  const want = expectedCounts(dddDir);
  const files = fs.existsSync(out) ? fileList(out) : [];
  const archFile = path.join(out, 'final.architecture.json');
  if (!fs.existsSync(archFile)) fail('final.architecture.json missing');
  else {
    const a = readJson(archFile);
    ok('final.architecture.json exists');
    const comps = a.components || [];
    const byType = (t) => comps.filter((c) => c.type === t).length;
    if (byType('backend') === want.contexts) ok(`${want.contexts} bounded context(s) as backend components`);
    else fail(`backend components ${byType('backend')} != contexts ${want.contexts}`);
    if (byType('database') === want.stores) ok(`${want.stores} own data store(s) as database components`);
    else fail(`database components ${byType('database')} != own stores ${want.stores}`);
    if (byType('external') === want.outsiders) ok(`${want.outsiders} actor/external party(ies) as external components`);
    else fail(`external components ${byType('external')} != outsiders ${want.outsiders}`);
    if (comps.length === want.components) ok(`${comps.length} components in total`);
    else fail(`components ${comps.length} != expected ${want.components}`);
    const bounds = a.boundaries || [];
    if (bounds.length === want.deployables) ok(`${bounds.length} deployable(s) as boundaries`);
    else fail(`boundaries ${bounds.length} != deployables ${want.deployables}`);
    const ids = new Set(comps.map((c) => c.id));
    for (const b of bounds) for (const w of b.wraps) if (!ids.has(w)) fail(`boundary ${b.label} wraps unknown component ${w}`);
    // A boundary is the bounding box of its members: no non-member may sit inside it.
    const cellOf = new Map(comps.map((c) => [c.id, c]));
    for (const b of bounds) {
      const ms = b.wraps.map((w) => cellOf.get(w)).filter(Boolean);
      const r0 = Math.min(...ms.map((c) => c.row)); const r1 = Math.max(...ms.map((c) => c.row));
      const c0 = Math.min(...ms.map((c) => c.col)); const c1 = Math.max(...ms.map((c) => c.col));
      const inside = comps.filter((c) => !b.wraps.includes(c.id) && c.row >= r0 && c.row <= r1 && c.col >= c0 && c.col <= c1).map((c) => c.id);
      if (inside.length) fail(`boundary ${b.label} would enclose non-member(s) ${inside.join(', ')}`);
      else ok(`boundary ${b.label} wraps only its ${ms.length} member(s)`);
    }
    const conns = a.connections || [];
    if (conns.length === want.connections) ok(`${conns.length} cross-party message connection(s)`);
    else fail(`connections ${conns.length} != cross-party (message, consumer) pairs ${want.connections}`);
    for (const c of conns) {
      if (!ids.has(c.from) || !ids.has(c.to)) fail(`connection ${c.id} dangles: ${c.from} -> ${c.to}`);
      if (!c.label) fail(`connection ${c.id} has no label`);
    }
    if (a.meta?.subtitle && /^generated by ddd from \d+ steps?$/.test(a.meta.subtitle)) ok(`subtitle "${a.meta.subtitle}"`);
    else fail(`meta.subtitle unexpected: ${a.meta?.subtitle}`);
    if (a.meta?.quality_profile === 'standard') ok('quality_profile standard');
    else fail('meta.quality_profile is not standard');
    if (a.layout?.mode === 'grid' && comps.every((c) => Number.isInteger(c.row) && Number.isInteger(c.col))) ok('grid layout with row/col on every component');
    else fail('layout.mode grid with row/col on every component expected');
    const cells = new Set(comps.map((c) => `${c.row},${c.col}`));
    if (cells.size === comps.length) ok('no two components share a cell');
    else fail('two components share a grid cell');
    if (comps.every((c) => c.col < (a.layout?.cols ?? 0))) ok(`every col below layout.cols ${a.layout?.cols}`);
    else fail(`a component's col reaches layout.cols ${a.layout?.cols}`);
    if (JSON.stringify(a).includes('produced_at') || /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(JSON.stringify(a))) fail('architecture spec carries a timestamp');
  }

  for (const f of want.flows) {
    const file = path.join(out, `final-${f.id}.sequence.json`);
    if (!fs.existsSync(file)) { fail(`final-${f.id}.sequence.json missing`); continue; }
    const sq = readJson(file);
    const pids = new Set((sq.participants || []).map((p) => p.id));
    if ((sq.messages || []).length === f.steps) ok(`flow ${f.id}: ${f.steps} message(s)`);
    else fail(`flow ${f.id}: messages ${(sq.messages || []).length} != steps ${f.steps}`);
    for (const m of sq.messages || []) {
      if (!pids.has(m.from) || !pids.has(m.to)) fail(`flow ${f.id}: message ${m.id} names an unknown participant`);
      if (!m.label) fail(`flow ${f.id}: message ${m.id} has no label`);
    }
    const ys = (sq.messages || []).map((m) => m.y);
    if (ys.every((y, i) => i === 0 || y > ys[i - 1])) ok(`flow ${f.id}: messages in step order`);
    else fail(`flow ${f.id}: message y values are not increasing`);
  }
  const seqFiles = files.filter((f) => f.endsWith('.sequence.json'));
  if (seqFiles.length === want.flows.length) ok(`${seqFiles.length} sequence spec(s), one per flow`);
  else fail(`sequence specs ${seqFiles.length} != flows ${want.flows.length}`);

  // Every written spec validates against the skill's schemas.
  for (const f of files) {
    const spec = readJson(path.join(out, f));
    const type = spec.diagram_type;
    const problems = [];
    checkSchema(spec, loadBlueprintSchema(type), '', problems);
    if (problems.length) fail(`${f} fails the blueprint ${type} schema:\n  ${problems.join('\n  ')}`);
    else ok(`${f} validates against skills/blueprint/schemas/${type}.schema.json`);
  }
}

for (const dddDir of workspacesFor(argv)) checkWorkspace(dddDir);

// The inlined loader really enforces common's defs: a bad id must be caught.
{
  const problems = [];
  checkSchema({ schema_version: 1, diagram_type: 'architecture', meta: { title: 'x' }, components: [{ id: '1bad', type: 'backend', label: 'x' }] }, loadBlueprintSchema('architecture'), '', problems);
  if (problems.some((p) => p.includes('pattern'))) ok('schema loader enforces common $defs (bad id rejected)');
  else fail('schema loader does not enforce common $defs: a bad id passed');
}

if (failures.length) {
  process.stderr.write(`export verification failed: ${failures.length} problem(s)\n`);
  process.exit(1);
}
process.stdout.write('export verification passed\n');
