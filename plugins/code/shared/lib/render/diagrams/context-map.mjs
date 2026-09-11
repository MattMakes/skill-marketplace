// Context map: decompose bounded_contexts as nodes, relationships as edges
// labelled with their pattern, deployables (organise) as frames, external
// systems (discover) as nodes when a relationship names them. Strategic
// type on each context comes from strategize when present.
//
// Edge direction is upstream -> downstream, the DDD reading of a context
// map: the arrow points at the context that has to adapt. Pattern -> arrow
// vocabulary (edgeStyle has no pattern aliases, so the map lives here):
//   customer-supplier, open-host-service      command  (solid, filled head: a
//                                              negotiated or served API)
//   published-language                         event    (dashed, open head: a
//                                              language you subscribe to)
//   conformist, anticorruption-layer,          dependency (thin, hollow
//   shared-kernel, partnership, separate-ways  diamond: a coupling, not a
//                                              message)

import {
  makeSpec, layoutGraph, placeEdgeLabels, compose, composeParts, titleCase,
} from './_compose.mjs';

export const ID = 'context-map';

export const PATTERN_KIND = {
  'customer-supplier': 'command',
  'open-host-service': 'command',
  'published-language': 'event',
  conformist: 'dependency',
  'anticorruption-layer': 'dependency',
  'shared-kernel': 'dependency',
  partnership: 'dependency',
  'separate-ways': 'dependency',
  'big-ball-of-mud': 'dependency',
};

export const PATTERN_SHORT = {
  'customer-supplier': 'customer-supplier',
  'open-host-service': 'open host service',
  'published-language': 'published language',
  conformist: 'conformist',
  'anticorruption-layer': 'ACL',
  'shared-kernel': 'shared kernel',
  partnership: 'partnership',
  'separate-ways': 'separate ways',
};

const LEGEND = {
  edges: {
    command: 'Customer-supplier / open host service',
    event: 'Published language',
    dependency: 'Conformist / ACL / shared kernel / partnership',
  },
  nodes: { context: 'Bounded context', external: 'External system' },
};

const RANK = { core: 3, supporting: 2, generic: 1 };

export function available(workspace) {
  const d = workspace.steps?.decompose;
  if (!d) return { ok: false, reason: 'needs 03-decompose/decompose.json', ids: [] };
  if (!Array.isArray(d.bounded_contexts) || !d.bounded_contexts.length) return { ok: false, reason: 'decompose.json has no bounded_contexts', ids: [] };
  return { ok: true, reason: '', ids: [ID] };
}

// The strongest classification among a context's subdomains; a context
// that owns a core subdomain is drawn as core.
export function strategicType(contextId, workspace) {
  const s = workspace.steps?.strategize;
  const d = workspace.steps?.decompose;
  if (!s || !Array.isArray(s.classifications)) return null;
  const bc = (d?.bounded_contexts || []).find((c) => c.id === contextId);
  const subs = new Set([...(bc?.subdomains || []), contextId]);
  let best = null;
  for (const c of s.classifications) {
    if (!subs.has(c.subdomain)) continue;
    if (!best || (RANK[c.type] || 0) > (RANK[best.type] || 0)) best = c;
  }
  return best ? best.type : null;
}

export function spec(workspace) {
  const d = workspace.steps.decompose;
  const o = workspace.steps.organise;
  const disc = workspace.steps.discover;
  const contexts = d.bounded_contexts || [];
  const ids = new Set(contexts.map((c) => c.id));
  const nodes = contexts.map((c) => {
    const type = strategicType(c.id, workspace);
    return {
      id: c.id,
      label: c.name || titleCase(c.id),
      sublabel: type ? `${type} domain` : (c.subdomains || []).length > 1 ? `${c.subdomains.length} subdomains` : undefined,
      kind: 'context',
      ...(type === 'core' ? { tag: 'core' } : {}),
      searchText: [c.id, ...(c.subdomains || []), ...(c.terms || []).map((t) => t.term)].join(' '),
    };
  });
  // External systems become nodes only when a relationship names them;
  // otherwise they belong on the C4 diagram, not here.
  const externals = new Map((disc?.external_systems || []).map((x) => [x.id, x]));
  const rels = d.relationships || [];
  for (const r of rels) {
    for (const end of [r.upstream, r.downstream]) {
      if (ids.has(end)) continue;
      const x = externals.get(end);
      nodes.push({ id: end, label: x ? x.name || titleCase(end) : titleCase(end), sublabel: 'external', kind: 'external', context: '' });
      ids.add(end);
    }
  }
  const edges = rels.filter((r) => ids.has(r.upstream) && ids.has(r.downstream)).map((r) => ({
    id: r.id,
    from: r.upstream,
    to: r.downstream,
    kind: PATTERN_KIND[r.pattern] || 'dependency',
    label: PATTERN_SHORT[r.pattern] || r.pattern || r.id,
    pattern: r.pattern,
    title: r.description,
  }));
  const groups = [];
  if (o && Array.isArray(o.deployables)) {
    const teams = new Map((o.teams || []).map((t) => [t.id, t]));
    for (const dep of o.deployables) {
      const members = (dep.contexts || []).filter((c) => ids.has(c));
      if (!members.length) continue;
      const team = teams.get(dep.team);
      groups.push({ id: dep.id, label: dep.name || titleCase(dep.id), sublabel: [dep.kind, team ? `team ${team.name}` : null].filter(Boolean).join(' · '), kind: 'deployable', members });
    }
  }
  const notes = [];
  if (!workspace.steps.strategize) notes.push('Strategic types appear once 04-strategize is done.');
  if (!o) notes.push('Deployable frames appear once 06-organise is done.');
  const system = workspace.steps.understand?.system?.name || workspace.manifest?.title || workspace.manifest?.project;
  return makeSpec({
    id: ID,
    kind: 'architecture',
    title: `Context map${system ? ` · ${system}` : ''}`,
    step: 'decompose',
    graph: { nodes, edges, groups },
    // A wide map reads better top-down: a strip of fifteen contexts in a
    // row is a scroll, a layered column fits a page.
    layoutOptions: { direction: nodes.length > 8 ? 'DOWN' : 'RIGHT', spacing: 'comfortable' },
    notes,
  });
}

export async function build(spec, { previous = null } = {}) {
  const laid = await layoutGraph(spec, { previous });
  placeEdgeLabels(spec.graph, laid);
  return { laid, opts: { catalog: LEGEND }, warnings: [...laid.warnings] };
}

export async function parts(spec, opts) {
  const b = await build(spec, opts);
  return { ...composeParts(spec, b.laid, b.opts), laid: b.laid, warnings: b.warnings };
}

export async function svg(spec, { previous = null, standalone = true } = {}) {
  const b = await build(spec, { previous });
  return { svg: compose(spec, b.laid, { standalone, ...b.opts }), layout: b.laid, warnings: b.warnings };
}
