// Composes a laid-out graph into one SVG document: group frames under the
// edges, edges under the nodes, group titles over everything, a legend of
// the kinds actually used, and an optional caption. Generators that want
// something unusual call svg.mjs directly; the common case is one call:
//
//   const laid = await layout(graph, { direction: 'RIGHT' });
//   const doc = renderScene(graph, laid, { id: 'context-map', title: 'Context map' });
//
// Node colour: `node.context` names the bounded context whose palette slot
// the node takes; a node with kind 'context' is its own context; otherwise
// the enclosing group's `context` (or id, when the group kind is 'context')
// applies. `node.sticky: true` draws an EventStorming sticky instead.

import { svgDocument, boxed, boundary, edge, text, group, domId } from './svg.mjs';
import { roundedPath } from './route.mjs';
import { legend as drawLegend, legendHeight, usedKinds } from './legend.mjs';
import { STICKY_KINDS } from './palette.mjs';

const CAPTION_H = 44;

function contextFor(node, groupsById) {
  if (node.context !== undefined && node.context !== null) return node.context || undefined;
  if (node.kind === 'context') return node.id;
  const g = node.group !== undefined ? groupsById.get(String(node.group)) : undefined;
  if (g) {
    if (g.context !== undefined && g.context !== null) return g.context || undefined;
    if (g.kind === 'context') return g.id;
  }
  return undefined;
}

// Sticky kinds from the palette and their legend labels, merged with the
// legend's own catalogue so an EventStorming diagram explains its colours.
function legendCatalog(graph) {
  const nodes = {};
  for (const n of graph.nodes || []) if (n.sticky && STICKY_KINDS[n.kind]) nodes[n.kind] = STICKY_KINDS[n.kind].label;
  return { nodes };
}

export function renderScene(graph, laid, {
  id = 'diagram', title, subtitle, kind, caption = false, legend = true, standalone = true, margin = 24,
} = {}) {
  const groupsById = new Map((graph.groups || []).map((g) => [String(g.id), g]));
  // Copies: a node named only in a group's member list still needs the
  // group's colour, and the caller's spec objects are left untouched.
  const nodesById = new Map((graph.nodes || []).map((n) => [String(n.id), { ...n }]));
  for (const g of graph.groups || []) for (const m of g.members || []) { const n = nodesById.get(String(m)); if (n && n.group === undefined) n.group = g.id; }

  const top = caption && title ? CAPTION_H : 0;
  const shift = (v) => v + top;
  const frames = [];
  const titles = [];
  for (const [gid, box] of laid.groups) {
    const g = groupsById.get(gid) || { id: gid };
    const spec = { id: gid, x: box.x, y: shift(box.y), width: box.w, height: box.h, label: g.label ?? gid, sublabel: g.sublabel, kind: g.kind || 'boundary' };
    const context = g.context ?? (g.kind === 'context' ? gid : undefined);
    frames.push(boundary(spec, { diagramId: id, part: 'frame', context }));
    titles.push(boundary(spec, { diagramId: id, part: 'title', context }));
  }

  const edges = [];
  // Same synthetic id rule as layout.mjs normalise(): position in the
  // caller's list, before any filtering.
  const edgeSpecs = new Map((graph.edges || []).map((e, i) => [e ? String(e.id ?? `${e.from}->${e.to}#${i}`) : `#${i}`, e]));
  laid.edges.forEach((laidEdge, eid) => {
    const spec = edgeSpecs.get(eid) || {};
    if (!laidEdge.points || laidEdge.points.length < 2) return;
    const pts = laidEdge.points.map((p) => [p.x, shift(p.y)]);
    const at = laidEdge.labelAt ? [laidEdge.labelAt.x, shift(laidEdge.labelAt.y) + 3.5] : undefined;
    edges.push(edge(id, {
      id: eid,
      d: roundedPath(pts, 8),
      kind: spec.kind || 'command',
      from: spec.from,
      to: spec.to,
      label: spec.label,
      labelAt: spec.label ? at : undefined,
      fromLabel: nodesById.get(String(spec.from))?.label,
      toLabel: nodesById.get(String(spec.to))?.label,
    }));
  });

  const nodes = [];
  for (const [nid, box] of laid.nodes) {
    const n = nodesById.get(nid) || { id: nid };
    nodes.push(boxed(n.label ?? nid, n.sublabel, n.tag, { id: nid, x: box.x, y: shift(box.y), width: box.w, height: box.h }, {
      kind: n.kind || 'default',
      diagramId: id,
      href: n.href,
      searchText: n.searchText,
      context: contextFor(n, groupsById),
      sticky: Boolean(n.sticky),
    }));
  }

  let width = Math.max(laid.width, 320);
  let height = laid.height + top;
  const parts = [];
  if (caption && title) {
    parts.push(group([
      text(margin, 26, title, { cls: 't-caption', size: 18, anchor: 'start', weight: 600 }),
      subtitle ? text(margin, 40, subtitle, { cls: 't-caption-sub', size: 10.5, anchor: 'start' }) : '',
    ], { class: 'caption' }));
  }
  parts.push(group(frames, { class: 'layer-frames' }));
  parts.push(group(edges, { class: 'layer-edges' }));
  parts.push(group(nodes, { class: 'layer-nodes' }));
  parts.push(group(titles, { class: 'layer-titles' }));
  if (legend) {
    const used = usedKinds(graph.nodes || [], graph.edges || [], graph.groups || []);
    const catalog = legendCatalog(graph);
    const lh = legendHeight(used, { width: width - margin * 2, catalog });
    if (lh) {
      parts.push(drawLegend(used, { x: margin, y: height, width: width - margin * 2, diagramId: id, catalog }));
      height += lh + 8;
    }
  }
  return svgDocument({ id: domId(id), width, height, title, body: parts.join(''), standalone, kind });
}
