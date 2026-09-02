// The diagram registry: which generators exist, which of them the present
// steps allow, and one call that renders every possible diagram to disk
// with layout memory.
//
//   const { available, missing } = available(workspace)
//   const { written, skipped, warnings } = await renderAll(workspace, { outDir })
//
// A generator module exports `available(workspace)` -> { ok, reason, ids },
// `spec(workspace, opts)` -> spec and `svg(spec, { previous, standalone })`
// -> { svg, layout, warnings }. Families (flow-<id>, aggregates-<ctx>) take
// `{ id }` in opts and list every concrete id from available(); the others
// take no opts and list their one id.
//
// Layout memory: every diagram's layout is written beside it as
// <id>.layout.json and read back from `previousDir` (default: outDir) on
// the next run unless `relayout` is set, so an unchanged diagram is
// byte-identical to the last run and a changed one moves only what changed.

import fs from 'node:fs';
import path from 'node:path';

import * as contextMap from './context-map.mjs';
import * as coreDomainChart from './core-domain-chart.mjs';
import * as flows from './flows.mjs';
import * as teamsDeployables from './teams-deployables.mjs';
import * as c4Context from './c4-context.mjs';
import * as aggregates from './aggregates.mjs';
import * as eventStorm from './event-storm.mjs';
import { layoutJson } from './_compose.mjs';

// Order is presentation order: strategy first, then structure, then detail.
export const GENERATORS = [
  { family: 'context-map', step: 'decompose', module: contextMap },
  { family: 'core-domain-chart', step: 'strategize', module: coreDomainChart },
  { family: 'flow', step: 'connect', module: flows },
  { family: 'teams-deployables', step: 'organise', module: teamsDeployables },
  { family: 'c4-context', step: 'define', module: c4Context },
  { family: 'aggregates', step: 'code', module: aggregates },
  { family: 'event-storm', step: 'discover', module: eventStorm },
];

// The id a family renders under when its step is missing: the family name
// with the wildcard the PLAN vocabulary uses, so a reader sees what would
// appear (flow-<flowId>) rather than nothing.
function placeholderId(g) {
  return g.family === 'flow' ? 'flow-<flowId>' : g.family === 'aggregates' ? 'aggregates-<contextId>' : g.family;
}

export function available(workspace) {
  const out = { available: [], missing: [] };
  for (const g of GENERATORS) {
    let a;
    try {
      a = g.module.available(workspace);
    } catch (error) {
      a = { ok: false, reason: `${g.step}.json could not be read: ${error.message}`, ids: [] };
    }
    if (a.ok && a.ids.length) for (const id of a.ids) out.available.push({ id, family: g.family, step: g.step });
    else out.missing.push({ id: placeholderId(g), family: g.family, step: g.step, reason: a.reason || `nothing to draw from ${g.step}.json` });
  }
  return out;
}

// Every spec the workspace allows, in presentation order.
export function specs(workspace) {
  const out = [];
  for (const { id, family } of available(workspace).available) {
    const g = GENERATORS.find((x) => x.family === family);
    out.push(g.module.spec(workspace, { id }));
  }
  return out;
}

export function generatorFor(id) {
  return GENERATORS.find((g) => g.family === id || (g.family === 'flow' && id.startsWith('flow-')) || (g.family === 'aggregates' && id.startsWith('aggregates-')));
}

function readPrevious(dir, id) {
  if (!dir) return null;
  const file = path.join(dir, `${id}.layout.json`);
  try {
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  } catch {
    return null;
  }
}

export async function renderAll(workspace, { outDir, previousDir, standalone = true, relayout = false } = {}) {
  if (!outDir) throw new Error('renderAll: outDir is required');
  fs.mkdirSync(outDir, { recursive: true });
  const memoryDir = relayout ? null : (previousDir || outDir);
  const written = [];
  const skipped = [];
  const warnings = [];
  const { available: ok, missing } = available(workspace);
  for (const m of missing) skipped.push({ id: m.id, reason: m.reason });
  for (const { id, family } of ok) {
    const g = GENERATORS.find((x) => x.family === family);
    try {
      const spec = g.module.spec(workspace, { id });
      const previous = readPrevious(memoryDir, spec.id);
      const result = await g.module.svg(spec, { previous, standalone });
      const svgPath = path.join(outDir, `${spec.id}.svg`);
      const layoutPath = path.join(outDir, `${spec.id}.layout.json`);
      fs.writeFileSync(svgPath, result.svg);
      fs.writeFileSync(layoutPath, layoutJson(result.layout));
      written.push({ id: spec.id, svg: svgPath, layout: layoutPath, kind: spec.kind });
      for (const w of result.warnings || []) warnings.push(`${spec.id}: ${w}`);
    } catch (error) {
      // One broken diagram must not take the others down: report and go on.
      skipped.push({ id, reason: `render failed: ${error && error.message ? error.message : error}` });
      warnings.push(`${id}: ${error && error.stack ? error.stack : error}`);
    }
  }
  return { written, skipped, warnings };
}
