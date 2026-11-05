// Shared machinery for the diagram generators: the spec shape, layout with
// memory, edge-label placement, and a composer that turns a laid-out graph
// into one SVG document (or a body fragment for the decision comparison).
//
// Why not scene.mjs? renderScene() is the common case for a plain graph;
// the generators need five things it cannot give: overriding where an edge
// label sits, extra drawing over the nodes (chips, glyphs, evolution marks),
// edges between group frames (team interactions), a legend that speaks the
// diagram's own vocabulary, and a body without a second <svg> root so a
// decision can show several option diagrams in one document. So this file
// composes from the svg.mjs primitives directly and keeps scene.mjs's layer
// order and DOM contract.
//
// Spec (plain JSON, written to disk as the option-diagram format):
//   { format: 'ddd-diagram-spec', version: 1,
//     id, kind: 'architecture' | 'scatter' | 'sequence' | 'timeline',
//     title, subtitle, source: { step, file },
//     graph: { nodes: [{ id, label, sublabel?, kind, tag?, group?, context?,
//                        sticky?, w?, h?, searchText?, ...kind-specific }],
//              edges: [{ id, from, to, label?, kind, ...kind-specific }],
//              groups: [{ id, label, sublabel?, kind, members: [] , context? }] },
//     layoutOptions: { direction?, spacing? },      (architecture only)
//     notes: [string] }
// Everything svg() needs is inside the spec, so a spec read back from disk
// renders the identical bytes (gate G3).

import { layout, serializeLayout, GRID_UNIT } from '../core/layout.mjs';
import {
  svgDocument, boxed, boundary, edge, text, rect, group, domId, esc, markerDefs,
} from '../core/svg.mjs';
import { roundedPath, rectsOverlap, segmentIntersectsRect } from '../core/route.mjs';
import { legend as drawLegend, legendHeight, usedKinds } from '../core/legend.mjs';
import { STICKY_KINDS, hashId, contextColor } from '../core/palette.mjs';
import { textWidth } from '../core/textfit.mjs';

export const SPEC_FORMAT = 'ddd-diagram-spec';
export const SPEC_VERSION = 1;

export const CAPTION_H = 48;
export const MARGIN = 24;
export const EDGE_LABEL_FONT = 10;

const r1 = (v) => Math.round(v * 10) / 10;
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// ---- Spec helpers ------------------------------------------------------------------------------

export function makeSpec({ id, kind, title, subtitle, step, graph, layoutOptions = {}, notes = [], extra = {} }) {
  const source = step ? { step, file: `${step}.json` } : undefined;
  return {
    format: SPEC_FORMAT,
    version: SPEC_VERSION,
    id,
    kind,
    title,
    subtitle: subtitle ?? captionLine(id, step),
    ...(source ? { source } : {}),
    graph: { nodes: graph.nodes || [], edges: graph.edges || [], groups: graph.groups || [] },
    layoutOptions,
    notes,
    ...extra,
  };
}

// The caption every SVG carries so a reader knows which file it came from.
export function captionLine(id, step) {
  return step ? `${id} · generated from ${step}.json` : id;
}

// Words a human uses for an id when the step JSON gives no name.
export function titleCase(id) {
  return String(id ?? '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

// Wraps a sentence into lines of at most `width` px at `size`; a single
// word longer than the width is kept on its own line (text() truncates it).
export function wrapText(str, width, size) {
  const words = String(str ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && textWidth(next, size) > width) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// ---- Layout with memory ----------------------------------------------------------------------

// What the layout depends on: the graph as ELK sees it plus the options.
// Same fingerprint, same picture, so a stored layout can be reused verbatim
// and a second run on unchanged input is byte-identical to the first
// (a re-run through the incremental path would size group frames
// differently from a fresh ELK run).
export function fingerprint(spec) {
  const g = spec.graph || {};
  const nodes = [...(g.nodes || [])].sort(byId).map((n) => [n.id, n.label ?? '', n.sublabel ?? '', n.w ?? null, n.h ?? null, n.group ?? null]);
  const edges = [...(g.edges || [])].sort(byId).map((e) => [e.id, e.from, e.to, e.label ?? '']);
  const groups = [...(g.groups || [])].sort(byId).map((x) => [x.id, x.label ?? '', [...(x.members || [])].sort()]);
  const str = JSON.stringify({ nodes, edges, groups, opts: spec.layoutOptions || {} });
  return `${hashId(str).toString(16)}-${hashId([...str].reverse().join('')).toString(16)}`;
}

function parsePrevious(previous) {
  if (!previous) return null;
  try {
    const obj = typeof previous === 'string' ? JSON.parse(previous) : previous;
    if (!obj || typeof obj !== 'object' || !obj.nodes) return null;
    return obj;
  } catch {
    return null;
  }
}

function rehydrate(stored) {
  const toMap = (o) => new Map(Object.entries(o || {}));
  return {
    engine: stored.engine, width: stored.width, height: stored.height,
    nodes: toMap(stored.nodes), groups: toMap(stored.groups), edges: toMap(stored.edges), warnings: [],
  };
}

// ELK layout for an architecture spec. `previous` is the stored
// <id>.layout.json (string or object): reused as-is when the fingerprint
// matches, passed to layout() as memory when the graph changed.
export async function layoutGraph(spec, { previous = null } = {}) {
  const fp = fingerprint(spec);
  const stored = parsePrevious(previous);
  const opts = { direction: 'RIGHT', spacing: 'comfortable', ...(spec.layoutOptions || {}) };
  const optionsKey = JSON.stringify(opts);
  let laid;
  if (stored && stored.fingerprint === fp && stored.nodes && Object.keys(stored.nodes).length) {
    // Reuse is the steady state, not a warning; say so only when asked.
    laid = rehydrate(stored);
    laid.warnings = process.env.DDD_DEBUG ? ['layout reused from memory (unchanged graph)'] : [];
  } else {
    // Memory keeps nodes where they were, which is wrong when the layout
    // options changed (a map that grew past eight contexts turns DOWN):
    // then a fresh layout is the honest answer.
    if (stored && (stored.optionsKey === undefined || stored.optionsKey === optionsKey)) opts.previous = stored;
    laid = await layout(spec.graph, opts);
  }
  laid.fingerprint = fp;
  laid.optionsKey = optionsKey;
  return laid;
}

// The <id>.layout.json text: serializeLayout() plus the fingerprint.
export function layoutJson(laid) {
  const obj = JSON.parse(serializeLayout(laid));
  obj.fingerprint = laid.fingerprint;
  if (laid.optionsKey) obj.optionsKey = laid.optionsKey;
  return `${JSON.stringify(obj, null, 2)}\n`;
}

// A layout result for a diagram whose positions the generator computed
// itself. `boxes`: Map id -> {x, y, w, h}; `edges`: Map id -> {points}.
export function fixedLayout({ nodes, edges = new Map(), groups = new Map(), width, height, warnings = [] }) {
  return { engine: 'fixed', nodes, edges, groups, width, height, warnings };
}

// ---- Edge labels ------------------------------------------------------------------------------

// The rect svg.edge() draws for a label whose visual centre is (cx, cy).
export function labelRect(label, cx, cy, size = EDGE_LABEL_FONT) {
  const w = textWidth(label, size) + 8;
  return { x: cx - w / 2, y: cy - 6.5, width: w, height: size + 5 };
}

// Places every labelled edge's label on a straight segment of its own
// route: near the source end when the segment is long, in the middle when
// short, horizontal segments before vertical ones. A candidate is rejected
// when it covers a node, a group title, an earlier label, and (softly) when
// it crosses another edge's line. Mutates laid.edges[*].labelAt.
export function placeEdgeLabels(graph, laid, { obstacles = [], size = EDGE_LABEL_FONT } = {}) {
  const nodeBoxes = [...laid.nodes.values()].map((b) => ({ x: b.x, y: b.y, width: b.w, height: b.h }));
  const titleBoxes = [...laid.groups.entries()].map(([gid, b]) => {
    const g = (graph.groups || []).find((x) => String(x.id) === gid) || {};
    const w = Math.min(b.w - 12, textWidth(g.label ?? gid, 12) + 12);
    return { x: b.x + 8, y: b.y + 2, width: w, height: g.sublabel ? 34 : 18 };
  });
  const hard = [...nodeBoxes, ...titleBoxes, ...obstacles];
  const edgesById = new Map((graph.edges || []).map((e) => [String(e.id), e]));
  const segmentsOf = (pts) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i += 1) out.push([[pts[i].x, pts[i].y], [pts[i + 1].x, pts[i + 1].y]]);
    return out;
  };
  const allSegs = new Map();
  for (const [id, le] of laid.edges) allSegs.set(id, segmentsOf(le.points || []));
  const placed = [];
  const ids = [...laid.edges.keys()].sort();
  for (const id of ids) {
    const spec = edgesById.get(id);
    const le = laid.edges.get(id);
    if (!spec || !spec.label || !le.points || le.points.length < 2) continue;
    const label = String(spec.label);
    const w = textWidth(label, size) + 8;
    const h = size + 5;
    const candidates = [];
    const segs = segmentsOf(le.points);
    segs.forEach(([a, b], i) => {
      const horizontal = Math.abs(a[1] - b[1]) < 0.01;
      const vertical = Math.abs(a[0] - b[0]) < 0.01;
      if (!horizontal && !vertical) return;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const need = horizontal ? w + 12 : h + 12;
      if (len < need) return;
      const along = horizontal ? w / 2 + 8 : h / 2 + 8;
      const at = (t) => {
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        return horizontal ? [x, y - 10] : [x, y];
      };
      const spots = [];
      if (len >= need * 2) spots.push(along / len);
      spots.push(0.5);
      if (len >= need * 2) spots.push(1 - along / len);
      for (const t of spots) candidates.push({ at: at(t), horizontal, order: i });
    });
    if (!candidates.length) {
      // Route too short for its label anywhere: sit it on the longest segment
      // and let the mask do what it can.
      const longest = segs.map(([a, b], i) => ({ i, len: Math.hypot(b[0] - a[0], b[1] - a[1]) })).sort((p, q) => q.len - p.len)[0];
      const [a, b] = segs[longest.i];
      const horizontal = Math.abs(a[1] - b[1]) < 0.01;
      candidates.push({ at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - (horizontal ? 10 : 0)], horizontal, order: longest.i });
    }
    candidates.sort((p, q) => (p.horizontal === q.horizontal ? 0 : p.horizontal ? -1 : 1));
    let best = null;
    candidates.forEach((c, index) => {
      const box = { x: c.at[0] - w / 2, y: c.at[1] - 6.5, width: w, height: h };
      let score = 0;
      if (hard.some((o) => rectsOverlap(box, o, 2))) score += 100;
      if (placed.some((o) => rectsOverlap(box, o, 2))) score += 100;
      for (const [other, osegs] of allSegs) {
        if (other === id) continue;
        if (osegs.some(([s, e]) => segmentIntersectsRect({ start: s, end: e }, box, 0))) { score += 1; break; }
      }
      if (!best || score < best.score) best = { score, at: c.at, box, index };
    });
    le.labelAt = { x: r1(best.at[0]), y: r1(best.at[1]) };
    placed.push(best.box);
  }
  return laid;
}

// ---- Composition ------------------------------------------------------------------------------

function contextFor(node, groupsById) {
  if (node.context !== undefined && node.context !== null) return node.context || undefined;
  if (node.kind === 'context') return node.id;
  const g = node.group !== undefined && node.group !== null ? groupsById.get(String(node.group)) : undefined;
  if (g) {
    if (g.context !== undefined && g.context !== null) return g.context || undefined;
    if (g.kind === 'context') return g.id;
  }
  return undefined;
}

function stickyCatalog(graph) {
  const nodes = {};
  for (const n of graph.nodes || []) if (n.sticky && STICKY_KINDS[n.kind]) nodes[n.kind] = STICKY_KINDS[n.kind].label;
  return nodes;
}

// Draws the graph layers at an offset. `extras` are SVG strings drawn over
// the nodes (chips, glyphs, markers); `underlay` strings go under the
// frames (axes, lanes). Returns { body, width, height } with the legend
// included when asked for.
export function composeBody(spec, laid, {
  dx = 0, dy = 0, extras = [], underlay = [], catalog = {}, legend = true, width: forceW, edgeLabels = true,
} = {}) {
  const graph = spec.graph || {};
  const id = spec.id;
  const groupsById = new Map((graph.groups || []).map((g) => [String(g.id), g]));
  const nodesById = new Map((graph.nodes || []).map((n) => [String(n.id), { ...n }]));
  for (const g of graph.groups || []) for (const m of g.members || []) { const n = nodesById.get(String(m)); if (n && (n.group === undefined || n.group === null)) n.group = g.id; }

  const frames = [];
  const titles = [];
  for (const [gid, box] of laid.groups) {
    const g = groupsById.get(gid) || { id: gid };
    const b = { id: gid, x: box.x + dx, y: box.y + dy, width: box.w, height: box.h, label: g.label ?? gid, sublabel: g.sublabel, kind: g.kind || 'boundary' };
    const context = g.context ?? (g.kind === 'context' ? gid : undefined);
    frames.push(boundary(b, { diagramId: id, part: 'frame', context }));
    titles.push(boundary(b, { diagramId: id, part: 'title', context }));
  }

  const edges = [];
  const edgeSpecs = new Map((graph.edges || []).map((e) => [String(e.id), e]));
  for (const eid of [...laid.edges.keys()].sort()) {
    const le = laid.edges.get(eid);
    const e = edgeSpecs.get(eid) || {};
    if (!le.points || le.points.length < 2) continue;
    const pts = le.points.map((p) => [p.x + dx, p.y + dy]);
    const at = le.labelAt ? [le.labelAt.x + dx, le.labelAt.y + dy + 3.5] : undefined;
    edges.push(edge(id, {
      id: eid,
      d: e.path ? e.path : roundedPath(pts, e.radius ?? 8),
      kind: e.kind || 'command',
      from: e.from,
      to: e.to,
      label: e.label,
      labelAt: edgeLabels && e.label ? at : undefined,
      fromLabel: nodesById.get(String(e.from))?.label,
      toLabel: nodesById.get(String(e.to))?.label,
    }));
  }

  const nodes = [];
  for (const nid of [...laid.nodes.keys()].sort()) {
    const box = laid.nodes.get(nid);
    const n = nodesById.get(nid) || { id: nid };
    nodes.push(boxed(n.label ?? nid, n.sublabel, n.tag, { id: nid, x: box.x + dx, y: box.y + dy, width: box.w, height: box.h }, {
      kind: n.kind || 'default',
      diagramId: id,
      href: n.href,
      searchText: n.searchText,
      context: contextFor(n, groupsById),
      sticky: Boolean(n.sticky),
    }));
  }

  let width = forceW ?? Math.max(laid.width, 320);
  let height = laid.height;
  const parts = [];
  // Extras and underlay are drawn in layout coordinates; shift them with
  // the rest instead of asking every generator to know the caption height.
  const shift = dx || dy ? { transform: `translate(${dx} ${dy})` } : {};
  if (underlay.length) parts.push(group(underlay, { class: 'layer-underlay', ...shift }));
  parts.push(group(frames, { class: 'layer-frames' }));
  parts.push(group(edges, { class: 'layer-edges' }));
  parts.push(group(nodes, { class: 'layer-nodes' }));
  if (extras.length) parts.push(group(extras, { class: 'layer-extras', ...shift }));
  parts.push(group(titles, { class: 'layer-titles' }));
  if (legend) {
    const used = usedKinds(graph.nodes || [], graph.edges || [], graph.groups || []);
    const cat = { nodes: { ...stickyCatalog(graph), ...(catalog.nodes || {}) }, edges: catalog.edges || {}, boundaries: catalog.boundaries || {} };
    const lh = legendHeight(used, { width: width - MARGIN * 2, catalog: cat });
    if (lh) {
      // legend.mjs draws node swatches as n-<kind>; a sticky kind's colour
      // lives on .sticky-<kind>, so swap the class for the kinds drawn as
      // stickies in this diagram.
      const stickyKinds = new Set(Object.keys(stickyCatalog(graph)));
      if (catalog.stickyKinds) for (const k of catalog.stickyKinds) stickyKinds.add(k);
      let lg = drawLegend(used, { x: MARGIN, y: height + dy, width: width - MARGIN * 2, diagramId: id, catalog: cat });
      if (stickyKinds.size) lg = lg.replace(/class="node n-([a-z-]+)"/g, (m, k) => (stickyKinds.has(k) ? `class="node sticky-${k}"` : m));
      parts.push(lg);
      height += lh + 8;
    }
  }
  return { body: parts.join(''), width, height };
}

// The caption band: title in the serif face, the generated-from line under it.
export function captionBand(spec, { width, dx = 0, dy = 0 } = {}) {
  const parts = [
    text(MARGIN + dx, 26 + dy, spec.title || spec.id, { cls: 't-caption', size: 18, anchor: 'start', weight: 600, width: width - MARGIN * 2 }),
  ];
  if (spec.subtitle) parts.push(text(MARGIN + dx, 41 + dy, spec.subtitle, { cls: 't-caption-sub t-mono', size: 9.5, anchor: 'start', width: width - MARGIN * 2 }));
  return group(parts, { class: 'caption', 'data-caption': spec.id });
}

// Caption, body, legend and notes as one fragment in document coordinates
// (caption at the top-left, graph below it). compose() wraps this in an
// <svg>; decision.mjs translates several of them into one document.
// `pad` adds room around the graph for things a generator draws outside
// the laid-out boxes (ports straddling a frame edge).
export function composeParts(spec, laid, {
  extras = [], underlay = [], catalog = {}, legend = true, notes = true, pad = {}, minWidth = 0,
} = {}) {
  const left = pad.left || 0;
  const right = pad.right || 0;
  const top = pad.top || 0;
  const bottom = pad.bottom || 0;
  const width = Math.max(minWidth, Math.max(laid.width, 320) + left + right);
  const content = composeBody(spec, laid, { dx: left, dy: CAPTION_H + top, extras, underlay, catalog, legend, width });
  let height = content.height + CAPTION_H + top + bottom;
  const parts = [captionBand(spec, { width: content.width }), content.body];
  const noteLines = notes ? (spec.notes || []).filter(Boolean) : [];
  if (noteLines.length) {
    const lines = noteLines.flatMap((n) => wrapText(n, content.width - MARGIN * 2, 10));
    lines.forEach((line, i) => parts.push(text(MARGIN, height + 14 + i * 14, line, { cls: 't-muted', size: 10, anchor: 'start' })));
    height += lines.length * 14 + 12;
  }
  return { body: parts.join(''), width: content.width, height };
}

// One SVG document for a spec and its layout.
export function compose(spec, laid, { standalone = true, ...opts } = {}) {
  const parts = composeParts(spec, laid, opts);
  return svgDocument({ id: spec.id, width: parts.width, height: parts.height, title: spec.title || spec.id, body: parts.body, standalone, kind: spec.kind });
}

// ---- Small drawing helpers used by several generators ---------------------------------------

// A chip: a small rounded label in a context's colour (or a sticky kind's).
export function chip(x, y, label, { context, sticky, size = 9, minW = 0, id } = {}) {
  const w = Math.max(minW, textWidth(label, size) + 14);
  const h = 16;
  const cls = context ? `ctx-${contextSlot(context)}` : sticky ? `sticky-${domId(sticky)}` : '';
  return group([
    rect({ x, y, width: w, height: h, rx: sticky ? 2 : 8, cls: 'node chip' }),
    text(x + w / 2, y + 11.5, label, { cls: 't-node', size, width: w - 8, weight: 500, title: label }),
  ], { class: `chip-group ${cls}`.trim(), 'data-chip': id || label });
}

// Width a chip() would take, for laying chips out before drawing them.
export function chipWidth(label, size = 9, minW = 0) {
  return Math.max(minW, textWidth(label, size) + 14);
}

export function contextSlot(id) {
  return contextColor(id).slot;
}

export { GRID_UNIT, esc, domId, text, rect, group, boxed, boundary, edge, roundedPath, textWidth, svgDocument, rectsOverlap, markerDefs };
