// C4 system context: the system as one box with its bounded contexts as
// chips, the people who use it on the left, the external systems it talks
// to on the right, one arrow per direction labelled with the messages that
// cross it. Collaborators come from the define canvases (inbound/outbound
// entries whose collaborator is not a bounded context); connect flow steps
// that leave the system (billing -> stripe) add the externals a canvas
// forgot, because a practitioner expects to see every third party here.

import {
  makeSpec, layoutGraph, placeEdgeLabels, compose, composeParts, titleCase, chip, chipWidth, GRID_UNIT,
} from './_compose.mjs';

export const ID = 'c4-context';
export const SYSTEM = 'system';

const CHIP_ROW = 26;

export function available(workspace) {
  const s = workspace.steps?.define;
  if (!s) return { ok: false, reason: 'needs 07-define/define.json', ids: [] };
  if (!Array.isArray(s.canvases) || !s.canvases.length) return { ok: false, reason: 'define.json has no canvases', ids: [] };
  return { ok: true, reason: '', ids: [ID] };
}

// Person or external system? Understand and discover both name actors;
// anything else that talks to us is a system.
function classify(id, workspace) {
  const s = workspace.steps || {};
  const actor = ((s.discover || {}).actors || []).find((a) => a.id === id) || ((s.understand || {}).actors || []).find((a) => a.id === id);
  if (actor) return { kind: 'actor', label: actor.name || titleCase(id), sublabel: actor.kind === 'system' ? 'system' : 'person', description: actor.description };
  const ext = ((s.discover || {}).external_systems || []).find((x) => x.id === id);
  if (ext) return { kind: 'external', label: ext.name || titleCase(id), sublabel: ext.description || 'external system', description: ext.description };
  const known = ((s.understand || {}).existing_systems || []).find((x) => (x.id || String(x.name || '').toLowerCase()) === id);
  if (known) return { kind: 'external', label: known.name || titleCase(id), sublabel: known.role || 'external system' };
  return { kind: 'external', label: titleCase(id), sublabel: 'external system' };
}

export function spec(workspace) {
  const def = workspace.steps.define;
  const d = workspace.steps.decompose || {};
  const c = workspace.steps.connect || {};
  const contexts = new Map((d.bounded_contexts || []).map((x) => [x.id, x]));
  for (const cv of def.canvases || []) if (cv.context && !contexts.has(cv.context)) contexts.set(cv.context, { id: cv.context, name: titleCase(cv.context) });
  const messages = new Map((c.messages || []).map((m) => [m.id, m]));
  // flows: Map `${from}->${to}` -> { kinds: Map kind -> count, ids: Set }
  const flows = new Map();
  const add = (from, to, msgId, kind) => {
    const key = `${from}->${to}`;
    if (!flows.has(key)) flows.set(key, { from, to, ids: [], kinds: {} });
    const f = flows.get(key);
    if (msgId && !f.ids.includes(msgId)) f.ids.push(msgId);
    const k = kind || messages.get(msgId)?.kind || 'command';
    f.kinds[k] = (f.kinds[k] || 0) + 1;
  };
  for (const cv of def.canvases || []) {
    for (const entry of cv.inbound || []) {
      if (!entry.collaborator || contexts.has(entry.collaborator)) continue;
      for (const m of entry.messages || [{}]) add(entry.collaborator, SYSTEM, m.id, m.kind);
    }
    for (const entry of cv.outbound || []) {
      if (!entry.collaborator || contexts.has(entry.collaborator)) continue;
      for (const m of entry.messages || [{}]) add(SYSTEM, entry.collaborator, m.id, m.kind);
    }
  }
  for (const flow of c.flows || []) {
    for (const st of flow.steps || []) {
      const fromIn = contexts.has(st.from);
      const toIn = contexts.has(st.to);
      if (fromIn && !toIn && st.to) add(SYSTEM, st.to, st.message, st.kind);
      if (!fromIn && toIn && st.from) add(st.from, SYSTEM, st.message, st.kind);
    }
  }
  const others = [...new Set([...flows.values()].flatMap((f) => [f.from, f.to]).filter((x) => x !== SYSTEM))].sort();
  const ctxList = [...contexts.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const chips = ctxList.reduce((w, x) => w + chipWidth(x.name || titleCase(x.id)) + 6, 0) + 24;
  const systemName = workspace.steps.understand?.system?.name || workspace.manifest?.title || titleCase(workspace.manifest?.project || 'system');
  const nodes = [
    {
      id: SYSTEM,
      label: systemName,
      sublabel: workspace.steps.understand?.system?.one_liner || `${ctxList.length} bounded contexts`,
      kind: 'system',
      tag: 'our system',
      w: Math.ceil(Math.max(224, chips) / GRID_UNIT) * GRID_UNIT,
      h: 72 + (ctxList.length ? CHIP_ROW : 0),
      contexts: ctxList.map((x) => ({ id: x.id, label: x.name || titleCase(x.id) })),
      context: '',
      searchText: [SYSTEM, ...ctxList.map((x) => x.id)].join(' '),
    },
    ...others.map((id) => ({ id, ...classify(id, workspace), context: '', searchText: id })),
  ];
  const edges = [...flows.values()].sort((a, b) => (`${a.from}->${a.to}` < `${b.from}->${b.to}` ? -1 : 1)).map((f) => {
    const kind = Object.entries(f.kinds).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
    const names = f.ids.map((id) => messages.get(id)?.name || titleCase(id));
    const label = names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
    return { id: `${f.from}->${f.to}`, from: f.from, to: f.to, kind, label: label || undefined, messages: f.ids };
  });
  const notes = [];
  if (!others.length) notes.push('No people or external systems collaborate with the contexts yet; the canvases list only context-to-context messages.');
  if (!c.flows) notes.push('Collaborators come from the canvases only; 05-connect flows add the systems the contexts call.');
  return makeSpec({
    id: ID,
    kind: 'architecture',
    title: `System context · ${systemName}`,
    step: 'define',
    graph: { nodes, edges, groups: [] },
    layoutOptions: { direction: 'RIGHT', spacing: 'comfortable' },
    notes,
  });
}

export async function build(spec, { previous = null } = {}) {
  const laid = await layoutGraph(spec, { previous });
  placeEdgeLabels(spec.graph, laid);
  const extras = [];
  const sys = spec.graph.nodes.find((n) => n.id === SYSTEM);
  const b = sys ? laid.nodes.get(SYSTEM) : null;
  if (sys && b && (sys.contexts || []).length) {
    const widths = sys.contexts.map((c) => chipWidth(c.label));
    const total = widths.reduce((s, w) => s + w, 0) + (widths.length - 1) * 6;
    let x = b.x + (b.w - total) / 2;
    const y = b.y + b.h - CHIP_ROW + 3;
    sys.contexts.forEach((c, i) => { extras.push(chip(x, y, c.label, { context: c.id, id: c.id })); x += widths[i] + 6; });
  }
  const catalog = { nodes: { system: 'The system', actor: 'Person', external: 'External system' }, edges: { command: 'Command', event: 'Domain event', query: 'Query' } };
  return { laid, opts: { extras, catalog }, warnings: [...laid.warnings] };
}

export async function parts(spec, opts) {
  const b = await build(spec, opts);
  return { ...composeParts(spec, b.laid, b.opts), laid: b.laid, warnings: b.warnings };
}

export async function svg(spec, { previous = null, standalone = true } = {}) {
  const b = await build(spec, { previous });
  return { svg: compose(spec, b.laid, { standalone, ...b.opts }), layout: b.laid, warnings: b.warnings };
}
