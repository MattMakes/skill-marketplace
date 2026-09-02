// Message flows: one sequence diagram per connect flow. Lifelines are the
// participants in order of first appearance (a reader meets them as the
// story does), one arrow per step in `seq` order, the message name above
// the arrow, the transport (`via`) as a quiet mono caption under it, the
// step number in a small disc at the arrow's tail. Sync commands are solid
// with a filled head, async events dashed with an open head, queries
// dotted, so the difference survives monochrome print.
//
// No ELK: a sequence diagram is a grid of columns (lifelines) and rows
// (steps). Column spacing grows to fit the widest label that has to sit
// between two neighbouring lifelines, so labels never run over a lifeline.

import {
  makeSpec, fixedLayout, compose, composeParts, titleCase, text, rect, group, MARGIN, textWidth,
} from './_compose.mjs';

export const FAMILY = 'flow';

const HEAD_W_MIN = 128;
const HEAD_H = 48;
const COL_GAP_MIN = 176;
const ROW_H = 44;
const FIRST_ROW = 36;
const TAIL = 28;
const LABEL_FONT = 10;
const VIA_FONT = 8.5;

export function flowId(id) {
  return String(id).startsWith('flow-') ? String(id).slice(5) : String(id);
}

export function available(workspace) {
  const c = workspace.steps?.connect;
  if (!c) return { ok: false, reason: 'needs 05-connect/connect.json', ids: [] };
  const flows = (c.flows || []).filter((f) => f && f.id && Array.isArray(f.steps) && f.steps.length);
  if (!flows.length) return { ok: false, reason: 'connect.json has no flows with steps', ids: [] };
  return { ok: true, reason: '', ids: flows.map((f) => `flow-${f.id}`) };
}

// Who a participant is, so the header box takes the right colour: a bounded
// context keeps its palette slot, an actor is drawn as a person, anything
// else that discover/understand calls an external system is external.
function classify(id, workspace) {
  const s = workspace.steps || {};
  const contexts = new Map(((s.decompose || {}).bounded_contexts || []).map((c) => [c.id, c]));
  if (contexts.has(id)) return { kind: 'context', label: contexts.get(id).name || titleCase(id), context: id };
  const actor = ((s.discover || {}).actors || []).find((a) => a.id === id) || ((s.understand || {}).actors || []).find((a) => a.id === id);
  if (actor) return { kind: 'actor', label: actor.name || titleCase(id), context: '' };
  const ext = ((s.discover || {}).external_systems || []).find((x) => x.id === id);
  if (ext) return { kind: 'external', label: ext.name || titleCase(id), context: '' };
  return { kind: 'external', label: titleCase(id), context: '' };
}

export function spec(workspace, { id } = {}) {
  const c = workspace.steps.connect;
  const fid = flowId(id || `flow-${(c.flows || [])[0]?.id}`);
  const flow = (c.flows || []).find((f) => f.id === fid);
  if (!flow) throw new Error(`flow ${fid} not found in connect.json`);
  const messages = new Map((c.messages || []).map((m) => [m.id, m]));
  const steps = [...(flow.steps || [])].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const order = [];
  for (const st of steps) for (const p of [st.from, st.to]) if (p && !order.includes(p)) order.push(p);
  const nodes = order.map((p) => {
    const who = classify(p, workspace);
    return { id: p, label: who.label, kind: who.kind, context: who.context, sublabel: who.kind === 'context' ? 'bounded context' : who.kind, searchText: p };
  });
  const edges = steps.map((st) => {
    const m = messages.get(st.message);
    const kind = st.kind || m?.kind || 'command';
    const sync = st.sync ?? (m?.delivery ? m.delivery === 'sync' : kind !== 'event');
    return {
      id: `${fid}-s${st.seq}`,
      from: st.from,
      to: st.to,
      kind,
      label: m?.name || titleCase(st.message || ''),
      message: st.message,
      seq: st.seq,
      sync: Boolean(sync),
      via: st.via || m?.delivery || '',
      title: m?.description,
    };
  });
  const scenario = ((workspace.steps.discover || {}).scenarios || []).find((s) => s.id === flow.scenario);
  const notes = [];
  if (scenario) notes.push(`Scenario ${scenario.id}: ${scenario.name}.`);
  return makeSpec({
    id: `flow-${fid}`,
    kind: 'sequence',
    title: `Message flow · ${flow.name || titleCase(fid)}`,
    step: 'connect',
    graph: { nodes, edges, groups: [] },
    notes,
  });
}

// Column x for each lifeline and the rows for each step.
function place(spec) {
  const nodes = spec.graph.nodes;
  const edges = spec.graph.edges;
  const col = new Map(nodes.map((n, i) => [n.id, i]));
  const headW = new Map(nodes.map((n) => [n.id, Math.max(HEAD_W_MIN, textWidth(n.label, 13) + 32)]));
  // Gap i is between lifeline i and i+1. A label spanning several gaps
  // shares its width across them.
  const gaps = new Array(Math.max(0, nodes.length - 1)).fill(COL_GAP_MIN);
  for (const e of edges) {
    const a = col.get(e.from);
    const b = col.get(e.to);
    if (a === undefined || b === undefined || a === b) continue;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const need = (Math.max(textWidth(e.label, LABEL_FONT), textWidth(e.via, VIA_FONT)) + 48) / (hi - lo);
    for (let i = lo; i < hi; i += 1) gaps[i] = Math.max(gaps[i], need);
  }
  // A gap must also clear the two header boxes on either side of it.
  nodes.forEach((n, i) => {
    if (i < gaps.length) gaps[i] = Math.max(gaps[i], headW.get(n.id) / 2 + headW.get(nodes[i + 1].id) / 2 + 24);
  });
  const xs = [];
  let x = MARGIN + (nodes.length ? headW.get(nodes[0].id) / 2 : 0);
  nodes.forEach((n, i) => { xs.push(x); if (i < gaps.length) x += gaps[i]; });
  const lastW = nodes.length ? headW.get(nodes[nodes.length - 1].id) / 2 : 0;
  const width = Math.max(320, x + lastW + MARGIN + (edges.some((e) => e.from === e.to && col.get(e.from) === nodes.length - 1) ? 80 : 0));
  const top = MARGIN;
  const boxes = new Map();
  nodes.forEach((n, i) => boxes.set(n.id, { x: xs[i] - headW.get(n.id) / 2, y: top, w: headW.get(n.id), h: HEAD_H }));
  const rows = new Map();
  edges.forEach((e, i) => rows.set(e.id, top + HEAD_H + FIRST_ROW + i * ROW_H));
  const bottom = top + HEAD_H + FIRST_ROW + edges.length * ROW_H + TAIL;
  return { boxes, xs, col, rows, width, height: bottom + MARGIN, top, bottom };
}

function routes(spec, geo) {
  const out = new Map();
  for (const e of spec.graph.edges) {
    const a = geo.col.get(e.from);
    const b = geo.col.get(e.to);
    const y = geo.rows.get(e.id);
    if (a === undefined || b === undefined || y === undefined) continue;
    const xa = geo.xs[a];
    const xb = geo.xs[b];
    let points;
    let labelAt;
    if (a === b) {
      // A self message loops out to the right and back.
      points = [{ x: xa, y: y - 10 }, { x: xa + 48, y: y - 10 }, { x: xa + 48, y: y + 10 }, { x: xa + 6, y: y + 10 }];
      labelAt = { x: xa + 56 + textWidth(e.label, LABEL_FONT) / 2, y: y - 2 };
    } else {
      const dir = xb > xa ? 1 : -1;
      points = [{ x: xa, y }, { x: xb - dir * 4, y }];
      labelAt = { x: (xa + xb) / 2, y: y - 9 };
    }
    out.set(e.id, { points, labelAt });
  }
  return out;
}

// Everything but the <svg> wrapper: the layout plus the underlay (lifelines)
// and extras (step discs, via captions) compose() needs.
export function build(spec) {
  const geo = place(spec);
  const laid = fixedLayout({ nodes: geo.boxes, edges: routes(spec, geo), width: geo.width, height: geo.height });
  const underlay = [];
  const extras = [];
  for (const n of spec.graph.nodes) {
    const b = geo.boxes.get(n.id);
    const cx = b.x + b.w / 2;
    underlay.push(`<path d="M ${cx} ${b.y + b.h} V ${geo.bottom}" class="lifeline" stroke="var(--node-stroke)" stroke-width="1" stroke-dasharray="4 4" fill="none" data-lifeline="${n.id}"/>`);
  }
  for (const e of spec.graph.edges) {
    const le = laid.edges.get(e.id);
    if (!le) continue;
    const y = geo.rows.get(e.id);
    const a = geo.col.get(e.from);
    const b = geo.col.get(e.to);
    const xa = geo.xs[a];
    const xb = geo.xs[b];
    const dir = xb >= xa ? 1 : -1;
    const tail = a === b ? { x: xa - 12, y: y - 10 } : { x: xa + dir * 11, y };
    // Step number: a disc at the tail so the eye can follow 1, 2, 3 down
    // the page even when arrows change direction.
    extras.push(group([
      `<circle cx="${tail.x}" cy="${tail.y}" r="7.5" fill="var(--fg)" stroke="var(--bg)" stroke-width="1"/>`,
      text(tail.x, tail.y + 3, String(e.seq), { cls: 't-seq', size: 8.5, weight: 700, fill: 'var(--bg)' }),
    ], { class: 'step-no', 'data-step': e.seq }));
    if (e.via) {
      const lx = a === b ? xa + 56 + textWidth(e.via, VIA_FONT) / 2 + 12 : (xa + xb) / 2;
      extras.push(text(lx, a === b ? y + 22 : y + 11, `${e.sync ? 'sync' : 'async'} · ${e.via}`, { cls: 't-muted t-mono', size: VIA_FONT }));
    }
  }
  const catalog = { edges: { command: 'Command (sync)', event: 'Domain event (async)', query: 'Query' }, nodes: { context: 'Bounded context', actor: 'Actor', external: 'External system' } };
  return { laid, opts: { extras, underlay, catalog }, warnings: [] };
}

export function parts(spec) {
  const b = build(spec);
  return { ...composeParts(spec, b.laid, b.opts), laid: b.laid, warnings: b.warnings };
}

export async function svg(spec, { standalone = true } = {}) {
  const b = build(spec);
  return { svg: compose(spec, b.laid, { standalone, ...b.opts }), layout: b.laid, warnings: b.warnings };
}
