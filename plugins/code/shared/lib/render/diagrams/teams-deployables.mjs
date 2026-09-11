// Teams and deployables: organise teams as frames, each deployable a node
// inside its team's frame with a glyph for its kind (monolith, service,
// function, ...) and the bounded contexts it hosts as coloured chips
// along its foot. Decompose relationships that cross deployables become
// dependency edges between the deployables (the coupling the topology has
// to carry), and organise team interactions are drawn between the team
// frames, labelled by Team Topologies interaction mode.
//
// ELK lays out the deployables (it cannot route frame-to-frame edges), so
// the team interactions are routed here from the laid-out frames after
// layout and stored under their own edge ids; on a run that reuses the
// stored layout they are overwritten from the frames again, never
// appended.

import {
  makeSpec, layoutGraph, placeEdgeLabels, compose, composeParts, titleCase, chip, chipWidth, group, text, GRID_UNIT,
} from './_compose.mjs';
import { NODE_MIN_W } from '../core/layout.mjs';
import { PATTERN_KIND, PATTERN_SHORT } from './context-map.mjs';

export const ID = 'teams-deployables';

const CHIP_ROW = 24;
const BASE_H = 64;

const MODE_LABEL = {
  collaboration: 'collaboration',
  'x-as-a-service': 'X-as-a-service',
  'xaas': 'X-as-a-service',
  facilitating: 'facilitating',
};

export function available(workspace) {
  const o = workspace.steps?.organise;
  if (!o) return { ok: false, reason: 'needs 06-organise/organise.json', ids: [] };
  if (!Array.isArray(o.deployables) || !o.deployables.length) return { ok: false, reason: 'organise.json has no deployables', ids: [] };
  return { ok: true, reason: '', ids: [ID] };
}

export function spec(workspace) {
  const o = workspace.steps.organise;
  const d = workspace.steps.decompose || {};
  const contexts = new Map((d.bounded_contexts || []).map((c) => [c.id, c]));
  const teams = [...(o.teams || [])].sort((a, b) => (a.id < b.id ? -1 : 1));
  const deployables = [...(o.deployables || [])].sort((a, b) => (a.id < b.id ? -1 : 1));
  const teamIds = new Set(teams.map((t) => t.id));
  const nodes = deployables.map((dep) => {
    const ctxs = (dep.contexts || []).map((c) => ({ id: c, label: contexts.get(c)?.name || titleCase(c) }));
    const chips = ctxs.reduce((w, c) => w + chipWidth(c.label) + 6, 0) + 18;
    return {
      id: dep.id,
      label: dep.name || titleCase(dep.id),
      sublabel: [dep.kind, dep.data_store ? `${dep.data_store} data store` : null].filter(Boolean).join(' · '),
      kind: 'deployable',
      deployKind: dep.kind,
      contexts: ctxs,
      w: Math.ceil(Math.max(NODE_MIN_W, chips) / GRID_UNIT) * GRID_UNIT,
      h: BASE_H + (ctxs.length ? CHIP_ROW : 0),
      group: teamIds.has(dep.team) ? dep.team : undefined,
      context: '',
      searchText: [dep.id, dep.kind, ...(dep.contexts || [])].join(' '),
      title: dep.rationale,
    };
  });
  const groups = teams.map((t) => ({
    id: t.id,
    label: t.name || titleCase(t.id),
    sublabel: [t.type, t.size ? `${t.size} ${t.size === 1 ? 'person' : 'people'}` : null, t.cognitive_load ? `load ${t.cognitive_load}` : null].filter(Boolean).join(' · '),
    kind: 'team',
    members: deployables.filter((dep) => dep.team === t.id).map((dep) => dep.id),
  })).filter((g) => g.members.length);
  // Coupling between deployables: one edge per ordered pair, labelled with
  // the relationships that cross it.
  const host = new Map();
  for (const dep of deployables) for (const c of dep.contexts || []) if (!host.has(c)) host.set(c, dep.id);
  const pairs = new Map();
  for (const r of d.relationships || []) {
    const a = host.get(r.upstream);
    const b = host.get(r.downstream);
    if (!a || !b || a === b) continue;
    const key = `${a}->${b}`;
    if (!pairs.has(key)) pairs.set(key, { id: key, from: a, to: b, kind: PATTERN_KIND[r.pattern] || 'dependency', rels: [] });
    pairs.get(key).rels.push(`${r.id} ${PATTERN_SHORT[r.pattern] || r.pattern || ''}`.trim());
  }
  const edges = [...pairs.values()].sort((a, b) => (a.id < b.id ? -1 : 1)).map((p) => ({ ...p, label: p.rels.length > 3 ? `${p.rels.slice(0, 3).join(', ')} +${p.rels.length - 3}` : p.rels.join(', '), kind: 'dependency' }));
  // Team interactions: from/to are team ids (frames), routed after layout.
  const interactions = [...(o.interactions || [])].filter((i) => teamIds.has(i.from) && teamIds.has(i.to) && i.from !== i.to);
  interactions.sort((a, b) => (`${a.from}${a.to}` < `${b.from}${b.to}` ? -1 : 1));
  for (const i of interactions) {
    edges.push({ id: `team:${i.from}->${i.to}`, from: i.from, to: i.to, kind: 'command', label: MODE_LABEL[i.mode] || i.mode || 'interaction', frameEdge: true, title: i.rationale || i.notes });
  }
  const notes = [];
  const homeless = [...contexts.keys()].filter((c) => !host.has(c));
  if (homeless.length) notes.push(`Not deployed anywhere: ${homeless.join(', ')}.`);
  const unowned = deployables.filter((dep) => !teamIds.has(dep.team)).map((dep) => dep.id);
  if (unowned.length) notes.push(`No owning team: ${unowned.join(', ')}.`);
  if (o.scale_check?.note) notes.push(o.scale_check.note);
  return makeSpec({
    id: ID,
    kind: 'architecture',
    title: `Teams and deployables${o.topology_style ? ` · ${titleCase(o.topology_style)}` : ''}`,
    step: 'organise',
    graph: { nodes, edges, groups },
    layoutOptions: { direction: 'RIGHT', spacing: 'comfortable' },
    notes,
  });
}

// A small glyph for the deployable kind, drawn in the node's top-left.
function glyph(kind, x, y) {
  const k = String(kind || '');
  const s = 12;
  if (k.includes('monolith')) {
    return `<g class="glyph" fill="none" stroke="var(--deployable)" stroke-width="1.3"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="1.5"/><path d="M ${x} ${y + s / 2} H ${x + s} M ${x + s / 2} ${y} V ${y + s}"/></g>`;
  }
  if (k.includes('function') || k.includes('lambda') || k.includes('serverless')) {
    return `<g class="glyph" fill="none" stroke="var(--deployable)" stroke-width="1.3"><path d="M ${x + 1} ${y + s} L ${x + s / 2} ${y + 1} L ${x + s - 1} ${y + s} Z"/></g>`;
  }
  if (k.includes('job') || k.includes('worker') || k.includes('batch')) {
    return `<g class="glyph" fill="none" stroke="var(--deployable)" stroke-width="1.3"><circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s / 2 - 0.5}"/><path d="M ${x + s / 2} ${y + 3} V ${y + s / 2} H ${x + s - 3}"/></g>`;
  }
  // service (and anything else): a hexagon.
  const cx = x + s / 2;
  const cy = y + s / 2;
  const r = s / 2;
  const pts = [0, 1, 2, 3, 4, 5].map((i) => { const a = Math.PI / 3 * i; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; });
  return `<g class="glyph" fill="none" stroke="var(--deployable)" stroke-width="1.3"><path d="M ${pts.join(' L ')} Z"/></g>`;
}

// Route a frame-to-frame edge over the top of the frames: leave the top
// of the source, run along a corridor above both frames, drop into the
// top of the target. Deployable-to-deployable edges run between frame
// centres, so the team corridor never shares a line with them.
function frameRoute(a, b, lane = 0) {
  const corridor = Math.min(a.y, b.y) - 24 - lane * 16;
  const x1 = a.x + a.w / 2 + (b.x > a.x ? 24 : -24);
  const x2 = b.x + b.w / 2 + (b.x > a.x ? -24 : 24);
  return [{ x: x1, y: a.y }, { x: x1, y: corridor }, { x: x2, y: corridor }, { x: x2, y: b.y }];
}

export async function build(spec, { previous = null } = {}) {
  const laid = await layoutGraph(spec, { previous });
  let lane = 0;
  for (const e of spec.graph.edges) {
    if (!e.frameEdge) continue;
    const a = laid.groups.get(String(e.from));
    const b = laid.groups.get(String(e.to));
    if (!a || !b) { laid.edges.delete(e.id); continue; }
    laid.edges.set(e.id, { points: frameRoute(a, b, lane), labelAt: null });
    lane += 1;
  }
  placeEdgeLabels(spec.graph, laid);
  const extras = [];
  for (const n of spec.graph.nodes) {
    const b = laid.nodes.get(String(n.id));
    if (!b) continue;
    extras.push(group([glyph(n.deployKind, b.x + 8, b.y + 7)], { class: 'deploy-glyph', 'data-glyph': n.deployKind || 'service' }));
    if (!(n.contexts || []).length) continue;
    // Context chips along the foot of the node, centred.
    const widths = n.contexts.map((c) => chipWidth(c.label));
    const total = widths.reduce((s, w) => s + w, 0) + (widths.length - 1) * 6;
    let x = b.x + (b.w - total) / 2;
    const y = b.y + b.h - CHIP_ROW + 2;
    n.contexts.forEach((c, i) => {
      extras.push(chip(x, y, c.label, { context: c.id, id: c.id }));
      x += widths[i] + 6;
    });
  }
  const catalog = {
    nodes: { deployable: 'Deployable unit' },
    edges: { dependency: 'Context relationship crossing deployables', command: 'Team interaction' },
    boundaries: { team: 'Team' },
  };
  // The interaction corridors run above the frames; leave room for them.
  return { laid, opts: { extras, catalog, pad: { top: lane ? 16 + lane * 16 : 0 } }, warnings: [...laid.warnings] };
}

export async function parts(spec, opts) {
  const b = await build(spec, opts);
  return { ...composeParts(spec, b.laid, b.opts), laid: b.laid, warnings: b.warnings };
}

export async function svg(spec, { previous = null, standalone = true } = {}) {
  const b = await build(spec, { previous });
  return { svg: compose(spec, b.laid, { standalone, ...b.opts }), layout: b.laid, warnings: b.warnings };
}


