// Aggregate map, one per bounded context that has aggregates in code.json:
// the context as a frame, each aggregate a pale-yellow sticky naming its
// root entity and invariant count, the commands it handles as blue
// stickies flowing in from the left, the events it emits as orange
// stickies flowing out to the right, and the context's ports as small
// tabs on the frame edge (driving on the left, driven on the right), which
// is where a hexagonal reader looks for them. Entities and value objects
// are listed under the aggregate; invariants go in the notes.

import {
  makeSpec, layoutGraph, placeEdgeLabels, compose, composeParts, titleCase, text, rect, group, GRID_UNIT, textWidth,
} from './_compose.mjs';
import { stickyText } from './event-storm.mjs';

export const FAMILY = 'aggregates';

const PORT_H = 18;
const PORT_PAD = 40;

export function contextId(id) {
  return String(id).startsWith('aggregates-') ? String(id).slice('aggregates-'.length) : String(id);
}

function withAggregates(code) {
  return (code.contexts || []).filter((c) => c && c.context && Array.isArray(c.aggregates) && c.aggregates.length);
}

export function available(workspace) {
  const code = workspace.steps?.code;
  if (!code) return { ok: false, reason: 'needs 08-code/code.json', ids: [] };
  const ctxs = withAggregates(code);
  if (!ctxs.length) return { ok: false, reason: 'code.json has no context with aggregates', ids: [] };
  return { ok: true, reason: '', ids: ctxs.map((c) => `aggregates-${c.context}`) };
}

export function spec(workspace, { id } = {}) {
  const code = workspace.steps.code;
  const cid = contextId(id || `aggregates-${withAggregates(code)[0]?.context}`);
  const cc = (code.contexts || []).find((c) => c.context === cid);
  if (!cc) throw new Error(`context ${cid} not found in code.json`);
  const disc = workspace.steps.discover || {};
  const bc = ((workspace.steps.decompose || {}).bounded_contexts || []).find((c) => c.id === cid);
  const cmdNames = new Map((disc.commands || []).map((c) => [c.id, c.name]));
  const evtNames = new Map((disc.events || []).map((e) => [e.id, e.name]));
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const aggregates = [...(cc.aggregates || [])].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const ag of aggregates) {
    const inv = (ag.invariants || []).length;
    nodes.push({
      id: ag.id,
      label: ag.name || titleCase(ag.id),
      sublabel: `root ${ag.root_entity || ag.name || titleCase(ag.id)} · ${inv} invariant${inv === 1 ? '' : 's'}`,
      kind: 'aggregate',
      sticky: true,
      w: 240,
      h: 80,
      entities: ag.entities || [],
      valueObjects: ag.value_objects || [],
      invariants: ag.invariants || [],
      searchText: [ag.id, ag.root_entity, ...(ag.entities || []), ...(ag.value_objects || [])].filter(Boolean).join(' '),
    });
    for (const c of ag.commands || []) {
      const nid = `cmd:${c}`;
      if (!seen.has(nid)) { seen.add(nid); nodes.push({ id: nid, ...stickyText(cmdNames.get(c) || titleCase(c)), kind: 'command', sticky: true, w: 128, h: 56, searchText: c }); }
      edges.push({ id: `${c}->${ag.id}`, from: nid, to: ag.id, kind: 'command' });
    }
    for (const e of ag.events || []) {
      const nid = `evt:${e}`;
      if (!seen.has(nid)) { seen.add(nid); nodes.push({ id: nid, ...stickyText(evtNames.get(e) || titleCase(e)), kind: 'event', sticky: true, w: 128, h: 56, searchText: e }); }
      edges.push({ id: `${ag.id}->${e}`, from: ag.id, to: nid, kind: 'event' });
    }
  }
  const ports = [...(cc.ports || [])].map((p) => ({ name: p.name, kind: p.kind === 'driven' ? 'driven' : 'driving', description: p.description, adapter: (cc.adapters || []).find((a) => a.port === p.name)?.implementation }));
  const groups = [{
    id: cid,
    label: bc?.name || titleCase(cid),
    sublabel: [cc.implementation_pattern, cc.module_path].filter(Boolean).join(' · '),
    kind: 'context',
    members: nodes.map((n) => n.id),
  }];
  const notes = [];
  for (const ag of aggregates) for (const inv of ag.invariants || []) notes.push(`${ag.name || titleCase(ag.id)} invariant: ${inv}.`);
  for (const p of ports) notes.push(`Port ${p.name} (${p.kind})${p.adapter ? ` via ${p.adapter}` : ''}${p.description ? `: ${p.description}` : ''}.`);
  return makeSpec({
    id: `aggregates-${cid}`,
    kind: 'architecture',
    title: `Aggregates · ${bc?.name || titleCase(cid)}`,
    step: 'code',
    graph: { nodes, edges, groups },
    layoutOptions: { direction: 'RIGHT', spacing: 'comfortable' },
    notes,
    extra: { ports },
  });
}

// A port tab straddling the frame edge: label inside, its adapter under
// it in the muted face, an accent line on the outer edge.
function portTab(p, x, y, side) {
  const w = Math.max(96, textWidth(p.name, 9) + 16);
  const bx = side === 'left' ? x - w + 10 : x - 10;
  const inner = [
    rect({ x: bx, y, width: w, height: PORT_H, rx: 4, cls: 'node n-port' }),
    text(bx + w / 2, y + 12.5, p.name, { cls: 't-node', size: 9, weight: 600, width: w - 10, title: p.description }),
  ];
  if (p.adapter) inner.push(text(side === 'left' ? bx + w - 12 : bx + 12, y + PORT_H + 11, p.adapter, { cls: 't-muted t-mono', size: 7.5, anchor: side === 'left' ? 'end' : 'start', width: w + 40 }));
  return group(inner, { class: 'port-tab', 'data-port': p.name, 'data-port-kind': p.kind });
}

export async function build(spec, { previous = null } = {}) {
  const laid = await layoutGraph(spec, { previous });
  placeEdgeLabels(spec.graph, laid);
  const extras = [];
  // Entities and value objects under the aggregate's sublabel.
  for (const n of spec.graph.nodes) {
    if (n.kind !== 'aggregate') continue;
    const b = laid.nodes.get(String(n.id));
    if (!b) continue;
    const line = [n.entities?.length ? `entities ${n.entities.join(', ')}` : '', n.valueObjects?.length ? `values ${n.valueObjects.join(', ')}` : ''].filter(Boolean).join(' · ');
    if (line) extras.push(text(b.x + b.w / 2, b.y + b.h - 9, line, { cls: 't-sub', size: 8.5, width: b.w - 12, fill: 'var(--sticky-aggregate-ink)', opacity: 0.85 }));
  }
  const frame = laid.groups.get(String(spec.graph.groups[0]?.id));
  const ports = spec.ports || [];
  if (frame) {
    for (const side of ['driving', 'driven']) {
      const list = ports.filter((p) => p.kind === side);
      const usable = frame.h - 44;
      const step = list.length > 1 ? Math.min(44, usable / (list.length - 1)) : 0;
      const start = frame.y + 40 + (usable - step * Math.max(0, list.length - 1)) / 2 - PORT_H / 2;
      list.forEach((p, i) => extras.push(portTab(p, side === 'driving' ? frame.x : frame.x + frame.w, Math.round(start + i * step), side === 'driving' ? 'left' : 'right')));
    }
  }
  const catalog = { nodes: { aggregate: 'Aggregate', command: 'Command handled', event: 'Event emitted', port: 'Port (driving left, driven right)' }, edges: { command: 'handles', event: 'emits' }, boundaries: { context: 'Bounded context' } };
  // Room outside the frame for the widest tab and adapter name on each side.
  const padFor = (side) => Math.max(0, ...ports.filter((p) => p.kind === side).map((p) => Math.max(Math.max(96, textWidth(p.name, 9) + 16), textWidth(p.adapter || '', 7.5) + 12))) + 8;
  const pad = { left: Math.max(PORT_PAD, padFor('driving')), right: Math.max(PORT_PAD, padFor('driven')) };
  const legendSpec = ports.length ? { ...spec, graph: { ...spec.graph, nodes: [...spec.graph.nodes, { id: '_port-legend', kind: 'port' }] } } : spec;
  return { laid, opts: { extras, catalog, pad }, legendSpec, warnings: [...laid.warnings] };
}

export async function parts(spec, opts) {
  const b = await build(spec, opts);
  return { ...composeParts(b.legendSpec, b.laid, b.opts), laid: b.laid, warnings: b.warnings };
}

export async function svg(spec, { previous = null, standalone = true } = {}) {
  const b = await build(spec, { previous });
  return { svg: compose(b.legendSpec, b.laid, { standalone, ...b.opts }), layout: b.laid, warnings: b.warnings };
}


