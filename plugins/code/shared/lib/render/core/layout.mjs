// One layout API over vendored elkjs (Eclipse Layout Kernel, layered
// algorithm, orthogonal edges), with grid.mjs as the fallback when the vendor
// file cannot load. Nothing else in the plugin talks to ELK.
//
//   const laid = await layout(graph, { direction: 'RIGHT', spacing: 'comfortable' });
//
//   graph  = { nodes: [{ id, label, sublabel?, kind, w?, h?, group? }],
//              edges: [{ id, from, to, label?, kind }],   (give edges stable ids)
//              groups: [{ id, label, kind, members: [ids] }] }
//   laid   = { engine: 'elk' | 'grid',
//              nodes:  Map id -> { x, y, w, h },
//              edges:  Map id -> { points: [{x, y}...], labelAt: {x, y} | null },
//              groups: Map id -> { x, y, w, h },
//              width, height, warnings: [string] }
//
// Determinism. Nodes, edges and groups are sorted by id before the ELK graph
// is built, every ELK option that influences tie-breaking is pinned
// (randomSeed, thoroughness, placement and routing strategies) and the input
// object is rebuilt on every call (ELK annotates what it is given). Identical
// input therefore gives byte-identical output, in any process.
//
// Stability, measured honestly on the 12-node fixture in
// checks/1.2.1/fixture.mjs (2026-09-01, elkjs 0.12.0). A fresh ELK layout is
// a global optimisation: adding one leaf node re-ran crossing minimisation
// and moved every other node, 26 to 569 px depending on where the leaf
// attached and on the direction, and the finance and operations groups
// swapped places. Every option set was tried: model-order preservation
// (considerModelOrder NODES_AND_EDGES, forceNodeModelOrder, greedy model
// order cycle breaking: 53 to 370 px), the interactive modes fed with the
// previous positions through elk.position (semiInteractive: 43 to 585 px;
// INTERACTIVE crossing minimisation: unsupported with compound nodes), and
// the placement strategies (LINEAR_SEGMENTS, SIMPLE, NETWORK_SIMPLEX, BK
// alignments). None keeps a small edit local on a compound graph.
//
// So locality is provided here, not by ELK: pass the previous result as
// `previous` (the object or its serializeLayout() JSON) and layout() keeps
// every surviving node exactly where it was, sizes it afresh, places only
// the new nodes beside their neighbours in free space on the grid, keeps the
// routes of edges whose endpoints did not move, routes new or changed edges
// with route.mjs around every node, and regrows group frames from their
// members. A one-node addition then moves no pre-existing node at all (the
// gate allows one GRID_UNIT). Without `previous`, same input gives the same
// picture, and that is all that is claimed. The review page persists the
// serialised layout beside each diagram and passes it back on the next run;
// a full fresh layout is one deliberate call without `previous`.
//
// Ports. ELK's fixed-side ports were tried and add nothing for these graphs
// (layered RIGHT already leaves east and enters west), so `ports` is accepted
// and ignored; sequence-like rows get their own generator.

import { createRequire } from 'node:module';
import { textWidth, widthFor } from './textfit.mjs';
import { autoGrid } from './grid.mjs';
import { routeEdges, crossesUnrelatedNode, connectionPath, placeLabels, rectsOverlap } from './route.mjs';

// The design grid every coordinate lands on. Node sizes, spacings and
// snapped positions are multiples of it, so the picture has a rhythm and a
// one-unit move is the smallest change a reader can notice.
export const GRID_UNIT = 8;

export const NODE_MIN_W = 144;
export const NODE_H = 64;
export const GROUP_PAD = { top: 40, left: 16, right: 16, bottom: 16 };

// Spacing presets, all multiples of GRID_UNIT.
export const SPACING = {
  compact: { nodeNode: 24, betweenLayers: 48, edgeNode: 16, edgeEdge: 12, component: 32, margin: 16 },
  comfortable: { nodeNode: 32, betweenLayers: 72, edgeNode: 24, edgeEdge: 16, component: 48, margin: 24 },
  airy: { nodeNode: 48, betweenLayers: 104, edgeNode: 32, edgeEdge: 24, component: 64, margin: 32 },
};

const LABEL_FONT = 13;
const EDGE_LABEL_FONT = 10;

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const snap = (v) => Math.round(v / GRID_UNIT) * GRID_UNIT;
const snapUp = (v) => Math.ceil(v / GRID_UNIT) * GRID_UNIT;
const r1 = (v) => Math.round(v * 10) / 10;

// ---- ELK loading -----------------------------------------------------------------------

let elkModule; // undefined: not tried; null: unavailable; otherwise the constructor
let elkError = '';

function loadElk() {
  if (elkModule !== undefined) return elkModule;
  try {
    const require = createRequire(import.meta.url);
    const ELK = require('../../../vendor/elkjs/elk.bundled.js');
    elkModule = typeof ELK === 'function' ? ELK : (ELK && typeof ELK.default === 'function' ? ELK.default : null);
    if (!elkModule) elkError = 'vendor/elkjs/elk.bundled.js did not export a constructor';
  } catch (error) {
    elkModule = null;
    elkError = error && error.message ? error.message : String(error);
  }
  return elkModule;
}

// True when ELK is available on this machine (and not disabled by env).
export function elkAvailable({ env = process.env } = {}) {
  if (String(env.DDD_NO_ELK || '') === '1') return false;
  return Boolean(loadElk());
}

// ---- Sizing ---------------------------------------------------------------------------------

// Width from the longest line the node shows; height from whether there is a
// sublabel. Explicit w/h win. Everything is rounded up to the grid.
export function nodeSize(node) {
  const label = String(node.label ?? node.id ?? '');
  const sub = node.sublabel === undefined || node.sublabel === null ? '' : String(node.sublabel);
  const w = node.w ?? Math.max(NODE_MIN_W, widthFor(label, LABEL_FONT) + 32, sub ? widthFor(sub, 10) + 32 : 0);
  const h = node.h ?? NODE_H;
  return { w: snapUp(Math.min(w, 320)), h: snapUp(h) };
}

function normalise(graph) {
  const nodes = [...(graph.nodes || [])].filter((n) => n && n.id !== undefined).map((n) => ({ ...n, id: String(n.id) })).sort(byId);
  const known = new Set(nodes.map((n) => n.id));
  const groups = [...(graph.groups || [])].filter((g) => g && g.id !== undefined)
    .map((g) => ({ ...g, id: String(g.id), members: [...new Set((g.members || []).map(String).filter((m) => known.has(m)))].sort() }))
    .sort(byId);
  // A node names its group either way; the group list wins on conflict, and
  // a node can only be in one group.
  const groupOf = new Map();
  for (const g of groups) for (const m of g.members) if (!groupOf.has(m)) groupOf.set(m, g.id);
  for (const n of nodes) {
    if (n.group !== undefined && n.group !== null && !groupOf.has(n.id)) {
      const g = groups.find((x) => x.id === String(n.group));
      if (g) { g.members.push(n.id); g.members.sort(); groupOf.set(n.id, g.id); }
    }
  }
  // An edge without an id gets one from its position in the caller's list,
  // before filtering, so scene.mjs computes the same string. Stable ids are
  // what lets layout memory keep an unchanged edge's route across runs; an
  // index-based id still draws correctly but is rerouted whenever the list
  // shifts.
  const edges = [...(graph.edges || [])]
    .map((e, i) => (e ? { ...e, from: String(e.from), to: String(e.to), id: String(e.id ?? `${e.from}->${e.to}#${i}`) } : null))
    .filter((e) => e && known.has(e.from) && known.has(e.to))
    .sort(byId);
  return { nodes, edges, groups, groupOf };
}

// ---- ELK path --------------------------------------------------------------------------------

function elkOptions(direction, sp) {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': direction,
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.randomSeed': '1',
    'elk.layered.thoroughness': '7',
    'elk.layered.cycleBreaking.strategy': 'GREEDY',
    'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.nodePlacement.bk.fixedAlignment': 'NONE',
    'elk.layered.mergeEdges': 'false',
    'elk.layered.unnecessaryBendpoints': 'false',
    'elk.separateConnectedComponents': 'true',
    'elk.edgeLabels.placement': 'CENTER',
    'elk.spacing.nodeNode': String(sp.nodeNode),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(sp.betweenLayers),
    'elk.spacing.edgeNode': String(sp.edgeNode),
    'elk.layered.spacing.edgeNodeBetweenLayers': String(sp.edgeNode),
    'elk.spacing.edgeEdge': String(sp.edgeEdge),
    'elk.layered.spacing.edgeEdgeBetweenLayers': String(sp.edgeEdge),
    'elk.spacing.edgeLabel': '6',
    'elk.spacing.componentComponent': String(sp.component),
    'elk.padding': `[top=${sp.margin},left=${sp.margin},bottom=${sp.margin},right=${sp.margin}]`,
  };
}

function elkGraph(norm, direction, sp) {
  const { nodes, edges, groups, groupOf } = norm;
  const child = (n) => { const s = nodeSize(n); return { id: n.id, width: s.w, height: s.h }; };
  const children = [];
  for (const g of groups) {
    const titleW = snapUp(textWidth(g.label ?? g.id, 11) + 48);
    children.push({
      id: g.id,
      layoutOptions: {
        'elk.padding': `[top=${GROUP_PAD.top},left=${GROUP_PAD.left},bottom=${GROUP_PAD.bottom},right=${GROUP_PAD.right}]`,
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': `(${titleW},${NODE_H + GROUP_PAD.top + GROUP_PAD.bottom})`,
        'elk.spacing.nodeNode': String(sp.nodeNode),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(sp.betweenLayers),
      },
      children: nodes.filter((n) => groupOf.get(n.id) === g.id).map(child),
    });
  }
  for (const n of nodes) if (!groupOf.has(n.id)) children.push(child(n));
  children.sort(byId);
  return {
    id: 'root',
    layoutOptions: elkOptions(direction, sp),
    children,
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.from],
      targets: [e.to],
      ...(e.label ? { labels: [{ text: String(e.label), width: Math.ceil(textWidth(String(e.label), EDGE_LABEL_FONT) + 8), height: EDGE_LABEL_FONT + 5, layoutOptions: { 'elk.edgeLabels.inline': 'true' } }] } : {}),
    })),
  };
}

// Absolute top-left of every node and container; ELK reports children
// relative to their parent and edges relative to `container`.
function absolutePositions(root) {
  const abs = new Map([['root', { x: 0, y: 0 }]]);
  const walk = (node, ox, oy) => {
    for (const c of node.children || []) {
      const x = ox + (c.x || 0);
      const y = oy + (c.y || 0);
      abs.set(c.id, { x, y, w: c.width || 0, h: c.height || 0, hasChildren: Boolean(c.children && c.children.length) });
      walk(c, x, y);
    }
  };
  walk(root, 0, 0);
  return abs;
}

function collectEdges(root, abs) {
  const out = new Map();
  const walk = (node) => {
    for (const e of node.edges || []) {
      const off = abs.get(e.container || 'root') || { x: 0, y: 0 };
      const points = [];
      for (const s of e.sections || []) {
        const pts = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
        for (const p of pts) points.push({ x: p.x + off.x, y: p.y + off.y });
      }
      let labelAt = null;
      const l = e.labels && e.labels[0];
      if (l && Number.isFinite(l.x) && Number.isFinite(l.y)) labelAt = { x: l.x + off.x + (l.width || 0) / 2, y: l.y + off.y + (l.height || 0) / 2 };
      out.set(e.id, { points, labelAt, from: e.sources[0], to: e.targets[0] });
    }
    for (const c of node.children || []) walk(c);
  };
  walk(root);
  return out;
}

// Snap every node to the grid and carry each edge end along with its node,
// keeping the path orthogonal: the end point moves with the node, and the
// bend next to it slides on the perpendicular axis. A straight two-point
// edge whose ends drift apart is squared up by sliding both ends along the
// node borders they sit on.
function snapAll(norm, abs, rawEdges) {
  const nodes = new Map();
  const delta = new Map();
  for (const n of norm.nodes) {
    const p = abs.get(n.id);
    const x = snap(p.x); const y = snap(p.y);
    delta.set(n.id, { dx: x - p.x, dy: y - p.y });
    nodes.set(n.id, { x, y, w: p.w, h: p.h });
  }
  const edges = new Map();
  for (const e of norm.edges) {
    const raw = rawEdges.get(e.id);
    if (!raw || raw.points.length < 2) { edges.set(e.id, { points: [], labelAt: null }); continue; }
    const pts = raw.points.map((p) => ({ ...p }));
    const moveEnd = (index, next, d) => {
      const p = pts[index]; const q = pts[next];
      const horizontal = Math.abs(p.y - q.y) < 0.01;
      p.x += d.dx; p.y += d.dy;
      if (q) { if (horizontal) q.y += d.dy; else q.x += d.dx; }
    };
    if (pts.length === 2) {
      const a = delta.get(e.from); const b = delta.get(e.to);
      const horizontal = Math.abs(pts[0].y - pts[1].y) < 0.01;
      pts[0].x += a.dx; pts[0].y += a.dy; pts[1].x += b.dx; pts[1].y += b.dy;
      if (horizontal) { const y = (pts[0].y + pts[1].y) / 2; pts[0].y = y; pts[1].y = y; } else { const x = (pts[0].x + pts[1].x) / 2; pts[0].x = x; pts[1].x = x; }
    } else {
      moveEnd(0, 1, delta.get(e.from));
      moveEnd(pts.length - 1, pts.length - 2, delta.get(e.to));
    }
    const points = dedupe(pts.map((p) => ({ x: r1(p.x), y: r1(p.y) })));
    const labelAt = raw.labelAt ? { x: r1(raw.labelAt.x), y: r1(raw.labelAt.y) } : midpoint(points);
    edges.set(e.id, { points, labelAt });
  }
  // Groups are rebuilt from their snapped members so no member ever pokes out.
  const groups = new Map();
  for (const g of norm.groups) {
    const members = g.members.map((m) => nodes.get(m)).filter(Boolean);
    const p = abs.get(g.id);
    if (!members.length) { groups.set(g.id, { x: snap(p.x), y: snap(p.y), w: snapUp(p.w), h: snapUp(p.h) }); continue; }
    const minX = Math.min(...members.map((m) => m.x)) - GROUP_PAD.left;
    const minY = Math.min(...members.map((m) => m.y)) - GROUP_PAD.top;
    const maxX = Math.max(...members.map((m) => m.x + m.w)) + GROUP_PAD.right;
    const maxY = Math.max(...members.map((m) => m.y + m.h)) + GROUP_PAD.bottom;
    const x = Math.min(snap(p.x), snap(minX));
    const y = Math.min(snap(p.y), snap(minY));
    groups.set(g.id, { x, y, w: Math.max(snapUp(p.x + p.w), snapUp(maxX)) - x, h: Math.max(snapUp(p.y + p.h), snapUp(maxY)) - y });
  }
  return { nodes, edges, groups };
}

function dedupe(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.05 && Math.abs(last.y - p.y) < 0.05) continue;
    out.push(p);
  }
  return out;
}

// Centre of the longest segment, preferring horizontal ones (a label beside
// a vertical run covers the neighbouring column).
function midpoint(points) {
  if (!points.length) return null;
  let best = null;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]; const b = points[i + 1];
    const horizontal = Math.abs(a.y - b.y) < 0.01;
    const len = Math.hypot(b.x - a.x, b.y - a.y) * (horizontal ? 1.5 : 1);
    if (!best || len > best.len) best = { len, at: { x: r1((a.x + b.x) / 2), y: r1((a.y + b.y) / 2) } };
  }
  return best ? best.at : { ...points[0] };
}

// Canvas size from nodes, groups, edge points and edge label boxes (a label
// on an outer loop would otherwise be clipped at the border).
function extent(norm, nodes, groups, edges, margin) {
  let maxX = 0; let maxY = 0;
  for (const b of [...nodes.values(), ...groups.values()]) { maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
  for (const e of norm.edges) {
    const laid = edges.get(e.id);
    if (!laid) continue;
    for (const p of laid.points) { maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
    if (laid.labelAt && e.label) {
      maxX = Math.max(maxX, laid.labelAt.x + textWidth(String(e.label), EDGE_LABEL_FONT) / 2 + 4);
      maxY = Math.max(maxY, laid.labelAt.y + EDGE_LABEL_FONT);
    }
  }
  return { width: snapUp(maxX + margin), height: snapUp(maxY + margin) };
}

function crossingWarnings(norm, nodes, edges) {
  const boxes = new Map();
  for (const [id, b] of nodes) boxes.set(id, { id, x: b.x, y: b.y, width: b.w, height: b.h });
  const warnings = [];
  for (const e of norm.edges) {
    const laid = edges.get(e.id);
    if (!laid || laid.points.length < 2) { warnings.push(`edge ${e.id} has no route`); continue; }
    const hit = crossesUnrelatedNode(laid.points.map((p) => [p.x, p.y]), boxes, [e.from, e.to], { gap: 0 });
    if (hit) warnings.push(`edge ${e.id} crosses node ${hit.id}`);
  }
  return warnings;
}

async function layoutWithElk(ELK, norm, direction, sp) {
  const elk = new ELK();
  const root = await elk.layout(elkGraph(norm, direction, sp));
  const abs = absolutePositions(root);
  const rawEdges = collectEdges(root, abs);
  const { nodes, edges, groups } = snapAll(norm, abs, rawEdges);
  const { width, height } = extent(norm, nodes, groups, edges, sp.margin);
  return { engine: 'elk', nodes, edges, groups, width, height, warnings: crossingWarnings(norm, nodes, edges) };
}

// ---- Fallback path -------------------------------------------------------------------------

// autoGrid layers by longest path; RIGHT turns layers into columns. Groups
// are drawn as the bounding box of their members and may enclose a stranger,
// which the warning says.
function layoutWithGrid(norm, direction, sp, why) {
  const sizes = new Map(norm.nodes.map((n) => [n.id, nodeSize(n)]));
  const cellW = Math.max(NODE_MIN_W, ...[...sizes.values()].map((s) => s.w));
  const cellH = Math.max(NODE_H, ...[...sizes.values()].map((s) => s.h));
  // Members of a group are fed to autoGrid together so they land in
  // neighbouring columns and the bounding-box frames overlap less.
  const clustered = [...norm.nodes].sort((a, b) => {
    const ga = norm.groupOf.get(a.id) || '~'; const gb = norm.groupOf.get(b.id) || '~';
    return ga < gb ? -1 : ga > gb ? 1 : byId(a, b);
  });
  const cells = autoGrid(clustered, norm.edges);
  const nodes = new Map();
  const boxes = new Map();
  for (const n of norm.nodes) {
    const cell = cells.get(n.id);
    const { w, h } = sizes.get(n.id);
    let px; let py;
    if (direction === 'DOWN') {
      px = sp.margin + cell.col * (cellW + sp.nodeNode);
      py = sp.margin + GROUP_PAD.top + cell.row * (cellH + sp.betweenLayers);
    } else {
      px = sp.margin + cell.row * (cellW + sp.betweenLayers);
      py = sp.margin + GROUP_PAD.top + cell.col * (cellH + sp.nodeNode);
    }
    const box = { x: snap(px), y: snap(py), w, h };
    nodes.set(n.id, box);
    boxes.set(n.id, { id: n.id, x: box.x, y: box.y, width: w, height: h, cx: box.x + w / 2, cy: box.y + h / 2 });
  }
  const routed = routeEdges(norm.edges, boxes);
  const edges = new Map();
  norm.edges.forEach((e, i) => {
    const rt = routed[i];
    if (!rt) { edges.set(e.id, { points: [], labelAt: null }); return; }
    const points = rt.points.map(([x, y]) => ({ x, y }));
    const at = Array.isArray(rt.labelAt) ? rt.labelAt : null;
    edges.set(e.id, { points, labelAt: at ? { x: at[0], y: at[1] + 4 } : midpoint(points) });
  });
  const groups = groupFrames(norm, nodes);
  const { width, height } = extent(norm, nodes, groups, edges, sp.margin);
  const warnings = [`elk unavailable (${why}); used grid fallback: groups are bounding boxes and may enclose non-members`];
  return { engine: 'grid', nodes, edges, groups, width, height, warnings: warnings.concat(crossingWarnings(norm, nodes, edges)) };
}

// ---- Incremental path ---------------------------------------------------------------------

function readPrevious(previous) {
  if (!previous) return null;
  const src = typeof previous === 'string' ? JSON.parse(previous) : previous;
  const toMap = (v) => (v instanceof Map ? new Map(v) : new Map(Object.entries(v || {})));
  const nodes = toMap(src.nodes);
  if (!nodes.size) return null;
  return { nodes, edges: toMap(src.edges), groups: toMap(src.groups) };
}

function toBox(id, b) {
  return { id, x: b.x, y: b.y, width: b.w, height: b.h, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
}

function groupFrames(norm, nodes) {
  const groups = new Map();
  for (const g of norm.groups) {
    const members = g.members.map((m) => nodes.get(m)).filter(Boolean);
    if (!members.length) continue;
    const x = snap(Math.min(...members.map((m) => m.x)) - GROUP_PAD.left);
    const y = snap(Math.min(...members.map((m) => m.y)) - GROUP_PAD.top);
    groups.set(g.id, { x, y, w: snapUp(Math.max(...members.map((m) => m.x + m.w)) + GROUP_PAD.right) - x, h: snapUp(Math.max(...members.map((m) => m.y + m.h)) + GROUP_PAD.bottom) - y });
  }
  return groups;
}

// A free spot for a new node: beside its first neighbour on the flow axis
// (after a source, before a target), then slid along the other axis in grid
// steps until it overlaps nothing; with no neighbour, below (or right of)
// everything.
function placeNew(id, size, norm, nodes, direction, sp) {
  const flowX = direction !== 'DOWN';
  const neighbours = [];
  for (const e of norm.edges) {
    if (e.from === id && nodes.has(e.to)) neighbours.push({ box: nodes.get(e.to), before: true });
    if (e.to === id && nodes.has(e.from)) neighbours.push({ box: nodes.get(e.from), before: false });
  }
  const occupied = [...nodes.values()].map((b) => ({ x: b.x, y: b.y, width: b.w, height: b.h }));
  const free = (x, y) => x >= sp.margin && y >= sp.margin && !occupied.some((o) => rectsOverlap({ x, y, width: size.w, height: size.h }, o, sp.nodeNode));
  const n = neighbours[0];
  let x; let y;
  if (n) {
    if (flowX) {
      x = n.before ? n.box.x - sp.betweenLayers - size.w : n.box.x + n.box.w + sp.betweenLayers;
      if (x < sp.margin) x = n.box.x + n.box.w + sp.betweenLayers;
      y = n.box.y;
    } else {
      y = n.before ? n.box.y - sp.betweenLayers - size.h : n.box.y + n.box.h + sp.betweenLayers;
      if (y < sp.margin) y = n.box.y + n.box.h + sp.betweenLayers;
      x = n.box.x;
    }
    x = snap(x); y = snap(y);
    for (let step = 0; step < 400; step += 1) {
      const k = Math.ceil(step / 2) * GRID_UNIT * (step % 2 ? 1 : -1);
      const cx = flowX ? x : x + k;
      const cy = flowX ? y + k : y;
      if (free(cx, cy)) return { x: cx, y: cy };
    }
  }
  const maxX = Math.max(sp.margin, ...occupied.map((o) => o.x + o.width));
  const maxY = Math.max(sp.margin, ...occupied.map((o) => o.y + o.height));
  return flowX ? { x: sp.margin, y: snapUp(maxY + sp.nodeNode) } : { x: snapUp(maxX + sp.nodeNode), y: sp.margin };
}

function layoutIncremental(norm, prev, direction, sp) {
  const nodes = new Map();
  const warnings = [];
  const changed = new Set();
  const kept = [];
  for (const n of norm.nodes) {
    const p = prev.nodes.get(n.id);
    const size = nodeSize(n);
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      nodes.set(n.id, { x: p.x, y: p.y, w: size.w, h: size.h });
      if (p.w !== size.w || p.h !== size.h) changed.add(n.id);
      kept.push(n.id);
    }
  }
  const added = [];
  for (const n of norm.nodes) {
    if (nodes.has(n.id)) continue;
    const size = nodeSize(n);
    const at = placeNew(n.id, size, norm, nodes, direction, sp);
    nodes.set(n.id, { ...at, w: size.w, h: size.h });
    changed.add(n.id);
    added.push(n.id);
  }
  const boxes = new Map([...nodes].map(([id, b]) => [id, toBox(id, b)]));
  const edges = new Map();
  const rerouted = [];
  const keptLabels = [];
  for (const e of norm.edges) {
    const p = prev.edges.get(e.id);
    if (p && p.points && p.points.length >= 2 && !changed.has(e.from) && !changed.has(e.to)) {
      const labelAt = p.labelAt ? { x: p.labelAt.x, y: p.labelAt.y } : midpoint(p.points);
      edges.set(e.id, { points: p.points.map((q) => ({ x: q.x, y: q.y })), labelAt });
      if (e.label && labelAt) {
        const w = textWidth(String(e.label), EDGE_LABEL_FONT) + 8;
        keptLabels.push({ x: labelAt.x - w / 2, y: labelAt.y - EDGE_LABEL_FONT / 2, width: w, height: EDGE_LABEL_FONT + 5 });
      }
      continue;
    }
    rerouted.push(e);
  }
  // New and changed edges are routed around every node, then their labels
  // are placed clear of nodes and of the labels that stayed.
  const routes = rerouted.map((e) => connectionPath(boxes.get(e.from), boxes.get(e.to), { obstacles: boxes }));
  placeLabels(routes, rerouted, boxes, { fontSize: EDGE_LABEL_FONT, labelObstacles: keptLabels });
  rerouted.forEach((e, i) => {
    const rt = routes[i];
    const points = rt.points.map(([x, y]) => ({ x, y }));
    edges.set(e.id, { points, labelAt: rt.labelAt ? { x: rt.labelAt[0], y: rt.labelAt[1] + 4 } : midpoint(points) });
  });
  const groups = groupFrames(norm, nodes);
  for (const g of norm.groups) {
    const frame = groups.get(g.id);
    if (!frame) continue;
    for (const [id, b] of nodes) {
      if (g.members.includes(id)) continue;
      if (rectsOverlap({ x: frame.x, y: frame.y, width: frame.w, height: frame.h }, { x: b.x, y: b.y, width: b.w, height: b.h })) warnings.push(`group ${g.id} now encloses non-member ${id}; a fresh layout (no previous) will untangle it`);
    }
  }
  const { width, height } = extent(norm, nodes, groups, edges, sp.margin);
  if (added.length || rerouted.length) warnings.push(`incremental: placed ${added.length} new node(s)${added.length ? ` (${added.join(', ')})` : ''}, kept ${kept.length}, rerouted ${rerouted.length} edge(s)`);
  return { engine: 'elk+incremental', nodes, edges, groups, width, height, warnings: warnings.concat(crossingWarnings(norm, nodes, edges)) };
}

// ---- API ------------------------------------------------------------------------------------

// Options: direction 'RIGHT' | 'DOWN'; spacing preset name or object;
// engine 'auto' | 'grid' (force the fallback); previous (see above); ports
// (accepted, unused); env (for DDD_NO_ELK).
export async function layout(graph, {
  direction = 'RIGHT', spacing = 'comfortable', engine = 'auto', env = process.env, previous = null,
} = {}) {
  const norm = normalise(graph || {});
  const dir = direction === 'DOWN' ? 'DOWN' : 'RIGHT';
  const sp = typeof spacing === 'object' && spacing ? { ...SPACING.comfortable, ...spacing } : (SPACING[spacing] || SPACING.comfortable);
  if (!norm.nodes.length) return { engine: 'none', nodes: new Map(), edges: new Map(), groups: new Map(), width: snapUp(sp.margin * 2), height: snapUp(sp.margin * 2), warnings: [] };
  let memory = null;
  try { memory = readPrevious(previous); } catch (error) { memory = null; }
  if (memory && norm.nodes.some((n) => memory.nodes.has(n.id))) {
    try {
      return layoutIncremental(norm, memory, dir, sp);
    } catch (error) {
      // fall through to a fresh layout; the warning is added below
      previous = `incremental layout failed: ${error && error.message ? error.message : error}`;
    }
  }
  let why = '';
  if (engine === 'grid') why = 'engine: grid requested';
  else if (String(env.DDD_NO_ELK || '') === '1') why = 'DDD_NO_ELK=1';
  else if (!loadElk()) why = elkError || 'vendor file missing';
  const note = typeof previous === 'string' && previous.startsWith('incremental layout failed') ? [previous] : [];
  if (!why) {
    try {
      const laid = await layoutWithElk(loadElk(), norm, dir, sp);
      laid.warnings = note.concat(laid.warnings);
      return laid;
    } catch (error) {
      why = `elk failed: ${error && error.message ? error.message : error}`;
    }
  }
  const laid = layoutWithGrid(norm, dir, sp, why);
  laid.warnings = note.concat(laid.warnings);
  return laid;
}

// A canonical, byte-stable serialisation of a layout result (Maps in id
// order, numbers as written). Tests and generators use it to compare runs.
export function serializeLayout(laid) {
  const map = (m) => Object.fromEntries([...m.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return JSON.stringify({ engine: laid.engine, width: laid.width, height: laid.height, nodes: map(laid.nodes), groups: map(laid.groups), edges: map(laid.edges) });
}
