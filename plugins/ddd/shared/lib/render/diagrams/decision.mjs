// Decision comparison: `ddd decision render <dir> <Did>` draws one
// decision's options side by side, a card per option (summary, pros, cons,
// risks) in one row and each option's diagram beneath its card on one
// shared grid, the chosen option highlighted, the rationale and the
// would-flip-if list under the row. Written to
// ddd/diagrams/decisions/<Did>.svg and, Chrome permitting, .png.
//
// An option's `diagram` may point at one of three JSON shapes: our own
// spec (format 'ddd-diagram-spec', what every generator's spec() returns),
// a blueprint architecture spec (components/connections/boundaries) or an
// blueprint sequence spec (participants/messages). The two blueprint shapes are
// converted to our graph shape here; the picture is then ours, so the
// option diagrams share one visual language with the rest of the page.
//
// Every option is composed under its own diagram id (decision-<Did>-<opt>)
// so node DOM ids and arrow markers do not collide when two options show
// the same workspace ids; the document itself is decision-<Did>.

import fs from 'node:fs';
import path from 'node:path';

import { loadWorkspace, resolvePath, STEPS } from '../../workspace.mjs';
import {
  composeParts, makeSpec, layoutGraph, placeEdgeLabels, wrapText, titleCase, text, rect, group,
  svgDocument, markerDefs, esc, GRID_UNIT, MARGIN, CAPTION_H, textWidth,
} from './_compose.mjs';
import * as coreDomainChart from './core-domain-chart.mjs';
import * as flows from './flows.mjs';
import * as eventStorm from './event-storm.mjs';
import * as aggregates from './aggregates.mjs';
import * as teamsDeployables from './teams-deployables.mjs';
import * as c4Context from './c4-context.mjs';
import * as contextMap from './context-map.mjs';

const CARD_W_MIN = 320;
const CARD_PAD = 14;
const COL_GAP = 32;
const USAGE = 'usage: ddd decision render <dir> <Did|step:Did> [--out FILE] [--no-png]';

// ---- Finding the decision ---------------------------------------------------------------------

// A decision id is unique within a step, not across the run (two steps may each have a D1), so
// `<step>:<Did>` names one exactly; a bare id resolves to the first step that holds it.
export function findDecision(workspace, Did) {
  const colon = String(Did).indexOf(':');
  const only = colon > 0 ? Did.slice(0, colon) : null;
  const id = colon > 0 ? Did.slice(colon + 1) : Did;
  for (const step of STEPS) {
    if (only && step !== only) continue;
    const s = workspace.steps?.[step];
    if (!s || !Array.isArray(s.decisions)) continue;
    const d = s.decisions.find((x) => x && x.id === id);
    if (d) return { step, decision: d, qualified: Boolean(only) };
  }
  return null;
}

// ---- Option diagram formats --------------------------------------------------------------------

const BLUEPRINT_NODE_KIND = {
  external: 'external', database: 'store', storage: 'store', cache: 'store', messagebus: 'port', queue: 'port',
  user: 'actor', person: 'actor', actor: 'actor',
};

function blueprintEdgeKind(c) {
  const v = String(c.variant || c.kind || c.style || '').toLowerCase();
  if (v.includes('async') || v.includes('event') || v.includes('dashed')) return 'event';
  if (v.includes('return') || v.includes('query') || v.includes('dotted')) return 'query';
  if (v.includes('depend')) return 'dependency';
  return 'command';
}

// The blueprint architecture shape: components with a type, connections
// with a label, optional boundaries (or groups) naming their members.
function fromBlueprintArchitecture(json, { id, title }) {
  const nodes = (json.components || []).filter((c) => c && c.id).map((c) => ({
    id: String(c.id),
    label: c.label || titleCase(c.id),
    sublabel: c.sublabel,
    kind: BLUEPRINT_NODE_KIND[String(c.type || '').toLowerCase()] || 'context',
    tag: c.brand,
    searchText: [c.id, c.type].filter(Boolean).join(' '),
  }));
  const edges = (json.connections || []).filter((c) => c && c.from && c.to).map((c, i) => ({
    id: String(c.id || `${c.from}->${c.to}#${i}`),
    from: String(c.from),
    to: String(c.to),
    label: c.label,
    kind: blueprintEdgeKind(c),
  }));
  const groups = (json.boundaries || json.groups || []).filter((g) => g && g.id).map((g) => ({
    id: String(g.id),
    label: g.label || titleCase(g.id),
    kind: g.type === 'team' ? 'team' : g.type === 'deployable' ? 'deployable' : 'boundary',
    members: (g.members || g.components || []).map(String),
  }));
  return makeSpec({ id, kind: 'architecture', title: title || json.meta?.title || id, graph: { nodes, edges, groups }, layoutOptions: { direction: 'RIGHT', spacing: 'comfortable' }, notes: [] });
}

// The blueprint sequence shape: participants and messages in order.
function fromBlueprintSequence(json, { id, title }) {
  const parts = (json.participants || []).filter((p) => p && p.id);
  const nodes = parts.map((p) => ({
    id: String(p.id),
    label: p.label || titleCase(p.id),
    sublabel: p.sublabel || p.type,
    kind: BLUEPRINT_NODE_KIND[String(p.type || '').toLowerCase()] || 'context',
    context: '',
  }));
  const messages = [...(json.messages || [])].filter((m) => m && m.from && m.to);
  messages.sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
  const edges = messages.map((m, i) => ({
    id: String(m.id || `s${i + 1}`),
    from: String(m.from),
    to: String(m.to),
    label: m.label || '',
    kind: blueprintEdgeKind(m),
    seq: i + 1,
    sync: blueprintEdgeKind(m) !== 'event',
    via: m.via || '',
  }));
  return makeSpec({ id, kind: 'sequence', title: title || json.meta?.title || id, graph: { nodes, edges, groups: [] }, notes: [] });
}

// Any of the three shapes -> our spec, re-identified as `id`.
export function toSpec(json, { id, title } = {}) {
  if (!json || typeof json !== 'object') throw new Error('option diagram is not a JSON object');
  if (json.format === 'ddd-diagram-spec' || (json.graph && json.graph.nodes)) {
    return { ...json, id: id || json.id, title: title || json.title || json.id, subtitle: json.subtitle ?? (json.source?.step ? `${json.id} · generated from ${json.source.step}.json` : json.id), graph: { nodes: [], edges: [], groups: [], ...json.graph } , origin: json.id };
  }
  const type = String(json.diagram_type || '').toLowerCase();
  if (type === 'architecture' || json.components) return fromBlueprintArchitecture(json, { id, title });
  if (type === 'sequence' || json.participants) return fromBlueprintSequence(json, { id, title });
  throw new Error(`unrecognised option diagram format (expected ddd-diagram-spec, blueprint architecture or blueprint sequence)`);
}

// Reads and converts one option's diagram file; null when the option has
// none. A missing or unreadable file is reported, not thrown: the decision
// still renders with a card that says so.
// Which step holds this decision object (by identity, then by id): ids repeat across steps.
export function stepOf(workspace, decision) {
  for (const step of STEPS) {
    const list = workspace.steps?.[step]?.decisions;
    if (Array.isArray(list) && list.includes(decision)) return step;
  }
  const f = decision && decision.id ? findDecision(workspace, decision.id) : null;
  return f ? f.step : 'unknown';
}

export function loadOptionSpec(workspace, decision, option, step = stepOf(workspace, decision)) {
  if (!option || !option.diagram) return { spec: null, note: 'no diagram' };
  const file = resolvePath(option.diagram, workspace.dddDir, workspace.manifest);
  if (!fs.existsSync(file)) return { spec: null, note: `diagram file missing: ${option.diagram}` };
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Step-qualified: a decision id is unique per step only, and two composites may share a page.
    const id = `decision-${step}-${decision.id}-${option.id}`;
    return { spec: toSpec(json, { id, title: `Option ${option.id}` }), note: '', file };
  } catch (error) {
    return { spec: null, note: `diagram unreadable: ${error.message}` };
  }
}

// ---- Rendering one option ----------------------------------------------------------------------

// The generator whose drawing rules fit a spec: by the id it came from
// when it is one of ours, else by kind. Architecture specs from anywhere
// go through the plain context-map build (layout, labels, legend).
function builderFor(spec) {
  const origin = String(spec.origin || spec.id || '');
  if (origin === 'core-domain-chart' || spec.kind === 'scatter') return coreDomainChart;
  if (origin.startsWith('flow-') || spec.kind === 'sequence') return flows;
  if (origin === 'event-storm' || spec.kind === 'timeline') return eventStorm;
  if (origin.startsWith('aggregates-') && spec.ports) return aggregates;
  if (origin === 'teams-deployables' && spec.graph.edges.some((e) => e.frameEdge)) return teamsDeployables;
  if (origin === 'c4-context' && spec.graph.nodes.some((n) => n.id === c4Context.SYSTEM)) return c4Context;
  return contextMap;
}

async function buildParts(spec, { notes = false } = {}) {
  const mod = builderFor(spec);
  const b = await mod.build(spec, {});
  const parts = composeParts(b.legendSpec || spec, b.laid, { ...b.opts, notes });
  return { ...parts, laid: b.laid, warnings: b.warnings || [] };
}

// One option's diagram as an <svg> of its own (the explorers embed these
// with standalone:false). Resolves { svg, spec, note, warnings }.
export async function optionSvg(workspace, decision, option, { standalone = false } = {}) {
  const { spec, note } = loadOptionSpec(workspace, decision, option);
  if (!spec) return { svg: '', spec: null, note, warnings: [] };
  const parts = await buildParts(spec, { notes: true });
  const svg = svgDocument({ id: spec.id, width: parts.width, height: parts.height, title: spec.title, body: parts.body, standalone, kind: spec.kind });
  return { svg, spec, note: '', warnings: parts.warnings };
}

// ---- The comparison document --------------------------------------------------------------------

function optionCard(decision, option, x, y, w, note) {
  const chosen = decision.chosen === option.id;
  const lines = [];
  const inner = MARGIN * 0 + w - CARD_PAD * 2;
  const push = (str, cls, size, weight, fill) => { for (const l of wrapText(str, inner, size)) lines.push({ l, cls, size, weight, fill }); };
  push(option.summary || '(no summary)', 't-node', 12, 600);
  for (const p of option.pros || []) push(`+ ${p}`, 't-sub', 10, undefined, 'var(--team)');
  for (const c of option.cons || []) push(`− ${c}`, 't-sub', 10, undefined, 'var(--event)');
  for (const r of option.risks || []) push(`! ${r}`, 't-sub', 10, undefined, 'var(--external)');
  if (note) push(note, 't-muted', 9.5);
  const lineH = 15;
  const h = 34 + lines.length * lineH + CARD_PAD;
  const parts = [
    rect({ x, y, width: w, height: h, rx: 10, cls: `node ${chosen ? 'n-core' : 'n-default'} option-card`, 'stroke-width': chosen ? 2.5 : 1.2 }),
    text(x + CARD_PAD, y + 22, `Option ${option.id}`, { cls: 't-boundary t-title', size: 15, weight: 700, anchor: 'start' }),
  ];
  if (chosen) {
    const tw = textWidth('chosen', 9) + 14;
    parts.push(rect({ x: x + w - tw - 10, y: y + 9, width: tw, height: 16, rx: 8, fill: 'var(--core)', stroke: 'none' }));
    parts.push(text(x + w - 10 - tw / 2, y + 20.5, 'chosen', { cls: 't-tag', size: 9, weight: 700, fill: '#fff' }));
  }
  lines.forEach((ln, i) => parts.push(text(x + CARD_PAD, y + 40 + i * lineH, ln.l, { cls: ln.cls, size: ln.size, weight: ln.weight, anchor: 'start', fill: ln.fill })));
  return { svg: group(parts, { class: `option${chosen ? ' is-chosen' : ''}`, 'data-option': option.id, 'data-chosen': chosen ? 'true' : undefined }), height: h };
}

// Builds the whole decision picture. Resolves { svg, spec, warnings }.
export async function decisionSvg(workspace, step, decision, { standalone = true } = {}) {
  const options = [...(decision.options || [])];
  const warnings = [];
  const built = [];
  for (const opt of options) {
    const { spec, note } = loadOptionSpec(workspace, decision, opt);
    let parts = null;
    if (spec) {
      try {
        parts = await buildParts(spec);
        warnings.push(...parts.warnings.map((w) => `${opt.id}: ${w}`));
      } catch (error) {
        warnings.push(`${opt.id}: diagram failed: ${error.message}`);
      }
    }
    built.push({ opt, spec, parts, note: parts ? '' : note || 'diagram failed to render' });
  }
  const snap = (v) => Math.ceil(v / GRID_UNIT) * GRID_UNIT;
  const colW = built.map((b) => snap(Math.max(CARD_W_MIN, b.parts ? b.parts.width : 0)));
  const xs = [];
  let x = MARGIN;
  colW.forEach((w) => { xs.push(x); x += w + COL_GAP; });
  const width = Math.max(480, x - COL_GAP + MARGIN);
  const id = `decision-${step}-${decision.id}`;
  const body = [];
  // Caption.
  const title = `Decision ${decision.id} · ${decision.question || titleCase(decision.kind || 'decision')}`;
  body.push(group([
    text(MARGIN, 26, title, { cls: 't-caption', size: 18, anchor: 'start', weight: 600, width: width - MARGIN * 2 }),
    text(MARGIN, 41, `${id} · generated from ${step}.json${decision.confidence ? ` · confidence ${decision.confidence}` : ''}${decision.chosen ? '' : ' · open'}`, { cls: 't-caption-sub t-mono', size: 9.5, anchor: 'start' }),
  ], { class: 'caption', 'data-caption': id }));
  // The shared grid: one dot lattice under everything so the options read
  // as sitting on the same sheet.
  const cardsTop = CAPTION_H + 16;
  const cards = built.map((b, i) => optionCard(decision, b.opt, xs[i], cardsTop, colW[i], b.note));
  const cardH = snap(Math.max(0, ...cards.map((c) => c.height)));
  const diagramsTop = cardsTop + cardH + 24;
  let bottom = diagramsTop;
  const columns = [];
  built.forEach((b, i) => {
    const parts = [cards[i].svg];
    if (b.parts) {
      parts.push(markerDefs(b.spec.id));
      parts.push(group(b.parts.body, { transform: `translate(${xs[i]} ${diagramsTop})`, class: 'option-diagram', 'data-option-diagram': b.opt.id }));
      bottom = Math.max(bottom, diagramsTop + b.parts.height);
    }
    columns.push(group(parts, { class: 'option-column', 'data-option-column': b.opt.id }));
  });
  let height = bottom + 16;
  const foot = [];
  if (decision.rationale) for (const l of wrapText(`Rationale: ${decision.rationale}`, width - MARGIN * 2, 10.5)) foot.push(l);
  for (const f of decision.would_flip_if || []) for (const l of wrapText(`Would flip if: ${f}`, width - MARGIN * 2, 10.5)) foot.push(l);
  foot.forEach((l, i) => body.push(text(MARGIN, height + 14 + i * 15, l, { cls: 't-muted', size: 10.5, anchor: 'start' })));
  if (foot.length) height += foot.length * 15 + 12;
  height += MARGIN / 2;
  const grid = `<pattern id="${esc(id)}-grid" width="${GRID_UNIT * 4}" height="${GRID_UNIT * 4}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="var(--node-stroke)" opacity=".35"/></pattern>`
    + `<rect x="0" y="${cardsTop - 8}" width="${width}" height="${Math.max(0, bottom - cardsTop + 24)}" fill="url(#${esc(id)}-grid)"/>`;
  body.splice(1, 0, `<defs>${grid.split('<rect')[0]}</defs><rect${grid.split('<rect')[1]}`);
  body.push(...columns);
  const spec = { id, kind: 'decision', title, options: built.map((b) => ({ id: b.opt.id, spec: b.spec, note: b.note })) };
  const svg = svgDocument({ id, width, height, title, body: body.join(''), standalone, kind: 'decision' });
  return { svg, spec, warnings };
}

// Renders and writes diagrams/decisions/<Did>.svg (+ .png when Chrome is
// found). Resolves { svg, png, warnings, decision, step }; throws when the
// decision does not exist.
export async function renderDecision(workspace, Did, { outDir, png = true } = {}) {
  const found = findDecision(workspace, Did);
  if (!found) throw new Error(`decision ${Did} not found in any step's decisions[]`);
  const dir = outDir || path.join(workspace.dddDir, 'diagrams', 'decisions');
  fs.mkdirSync(dir, { recursive: true });
  const { svg, warnings } = await decisionSvg(workspace, found.step, found.decision);
  // A qualified id writes <step>-<Did>.svg, the same name review.mjs uses for the later of two
  // same-id decisions, so the page and the CLI agree on the file.
  const stem = found.qualified ? `${found.step}-${found.decision.id}` : found.decision.id;
  const svgPath = path.join(dir, `${stem}.svg`);
  fs.writeFileSync(svgPath, svg);
  let pngPath = null;
  if (png) {
    const { svgToPng, findChrome } = await import('../core/chrome.mjs');
    const chrome = findChrome();
    if (chrome) {
      const out = path.join(dir, `${stem}.png`);
      const r = await svgToPng(svgPath, out, { chrome, scale: 2 });
      if (r.ok) pngPath = out; else warnings.push(r.note);
    } else {
      warnings.push('No Chrome/Chromium found; PNG skipped.');
    }
  }
  return { svg: svgPath, png: pngPath, warnings, decision: found.decision, step: found.step };
}

// ---- CLI ---------------------------------------------------------------------------------------------

export async function main(argv, ctx = {}) {
  void ctx;
  const args = [];
  let out = null;
  let png = true;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { process.stdout.write(`${USAGE}\n`); return 0; }
    if (a === '--no-png') { png = false; continue; }
    if (a === '--out') { out = argv[i + 1]; i += 1; continue; }
    if (a.startsWith('--out=')) { out = a.slice(6); continue; }
    if (a.startsWith('-')) { process.stderr.write(`${USAGE}\nddd decision render: error: unrecognized arguments: ${a}\n`); return 2; }
    args.push(a);
  }
  if (args.length !== 2) { process.stderr.write(`${USAGE}\nddd decision render: error: expected <dir> and <Did>\n`); return 2; }
  const [dir, Did] = args;
  let workspace;
  try {
    workspace = loadWorkspace(dir);
  } catch (error) {
    process.stderr.write(`ddd decision render: cannot load workspace ${dir}: ${error.message}\n`);
    return 2;
  }
  if (!findDecision(workspace, Did)) {
    process.stderr.write(`ddd decision render: decision ${Did} not found in ${workspace.dddDir}\n`);
    return 1;
  }
  const result = await renderDecision(workspace, Did, { outDir: out ? path.dirname(path.resolve(out)) : undefined, png });
  if (out && path.resolve(out) !== result.svg) { fs.renameSync(result.svg, path.resolve(out)); result.svg = path.resolve(out); }
  process.stdout.write(`${result.svg}\n`);
  if (result.png) process.stdout.write(`${result.png}\n`);
  for (const w of result.warnings) process.stderr.write(`note: ${w}\n`);
  return 0;
}
