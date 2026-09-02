// `ddd export blueprint <ddd-dir> [--out DIR] [--deliver] [--quality standard|showcase]`
//
// Translates the workspace into the diagram formats of the plugin's own blueprint
// skill (design §4.5; the skill is a renamed copy of archify by tt-a1i, MIT) so
// `--deliver` can produce the showcase `final.html`:
//
//   <outDir>/final.architecture.json     deployables as `region` boundaries wrapping
//                                        their bounded contexts; externals and actors
//                                        as `external` components; a `database`
//                                        component per deployable that owns its data
//                                        store; one connection per (message, consumer)
//                                        pair that crosses a party boundary.
//   <outDir>/final-<flowId>.sequence.json  one per connect flow: participants in first
//                                        appearance order, one message per step.
//
// The graph comes from the same derivations the review diagrams use (context-map,
// teams-deployables and flows `spec()`), so the final render agrees with the page.
// Every array is built from id-sorted input and the output carries no timestamps, so
// two runs are byte-identical. Each spec is checked against the skill's own schemas
// (skills/blueprint/schemas) before it is written; a schema failure is exit 1.
//
// Placement (architecture). The components are laid out by our own ELK layout
// (core/layout.mjs, deployables as groups, left to right) and the result is
// quantised onto blueprint's grid: a column per cluster of ELK x positions, a row per
// ELK row pitch. When that grid would let a boundary swallow a non-member (a
// boundary in blueprint is the bounding box of what it wraps) the exporter falls back
// to a row per deployable, which can never swallow anything. Connections are then
// routed with blueprint's own rules in mind (renderers/shared/geometry.mjs): a
// connection between neighbouring cells is left to blueprint's automatic router
// (straight line, automatic port spread); every other connection gets explicit
// `fromSide`/`toSide` and `via` points that run through the gutters between rows and
// columns, so no route can cross a component, and a `labelAt` in a gutter so no label
// can sit on one. Gutters are sized from the widest label and the number of lanes
// they carry. Everything is verified again here with the same segment/rectangle
// arithmetic blueprint uses; the blueprint validator remains the judge (see the checks).
//
// Degradation. Every spec is run through `blueprint validate --json` before it is
// written. The one error class that cannot be ruled out geometrically (a label mask
// over a component) is repaired by dropping that connection's label, never the
// connection; each drop is a warning and is named on the receipt line.
//
// Sequence. blueprint's participant boxes are a fixed 86px unless `meta.column_fit` is
// "spread", in which case the box width follows the viewBox. The exporter sets
// spread and a viewBox wide enough for the longest participant name (up to
// blueprint's 190px cap; longer names are abbreviated with a warning).
//
// Variant mapping (blueprint's enums; architecture connections have neither `async` nor
// `return`, sequence messages add `return`):
//   event    -> dashed (async)          command -> default
//   query    -> default / sequence: return   response -> dashed / sequence: return
//
// Discovery. The skill lives inside the plugin at `${CLAUDE_PLUGIN_ROOT}/skills/blueprint`
// (four directories up from this file); BLUEPRINT_HOME may point at another checkout
// for development and wins when it has `bin/blueprint.mjs`, otherwise it is ignored
// with a warning. No home directory is ever consulted. A plugin without the skill is
// broken: exit 1 with a clear message, before anything is written.
//
// `--deliver` runs the skill's `deliver` on each spec. A failing deliver is exit 1 with
// its diagnostics echoed one per line and the previous HTML untouched (the skill keeps
// the last good artifact). Nothing under the skill directory is ever written to.
//
// Zero dependencies (elkjs is vendored), ESM, Node >= 18.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadWorkspace } from '../../workspace.mjs';
import { checkSchema } from '../../jsonschema.mjs';
import { layout as elkLayout, NODE_H, SPACING } from '../core/layout.mjs';
import { textUnits } from '../core/textfit.mjs';
import { titleCase } from '../diagrams/_compose.mjs';
import { spec as contextMapSpec, available as contextMapAvailable } from '../diagrams/context-map.mjs';
import { spec as flowSpec, available as flowsAvailable, flowId } from '../diagrams/flows.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The vendored skill: <plugin>/skills/blueprint, relative to <plugin>/shared/lib/render/export.
export const BLUEPRINT_VENDORED = path.resolve(HERE, '..', '..', '..', '..', 'skills', 'blueprint');
export const BLUEPRINT_SCHEMA_DIR = path.join(BLUEPRINT_VENDORED, 'schemas');
export const SKILL_MISSING = `ddd export blueprint: the blueprint skill is missing at ${BLUEPRINT_VENDORED} (the plugin is incomplete; reinstall it, or set BLUEPRINT_HOME to a checkout)`;

const QUALITIES = new Set(['standard', 'showcase']);

// ---------------------------------------------------------------------------
// Schemas: read from the skill. jsonschema.mjs follows local refs only and the
// skill's schemas point at `common.schema.json#/$defs/...` (their `$id` is a URL
// that is never fetched), so every `<file>.schema.json#` ref is resolved by file
// name and that file's $defs are inlined into the diagram schema.
// ---------------------------------------------------------------------------
const schemaCache = new Map();
const FILE_REF = /^([\w-]+)\.schema\.json(#.*)$/;

export function loadBlueprintSchema(type, schemaDir = BLUEPRINT_SCHEMA_DIR) {
  const key = `${schemaDir}\u0000${type}`;
  if (schemaCache.has(key)) return schemaCache.get(key);
  const read = (name) => JSON.parse(fs.readFileSync(path.join(schemaDir, `${name}.schema.json`), 'utf8'));
  const schema = read(type);
  const referenced = new Set();
  const inline = (node) => {
    if (Array.isArray(node)) return node.map(inline);
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        const m = k === '$ref' && typeof v === 'string' ? FILE_REF.exec(v) : null;
        if (m) { referenced.add(m[1]); out[k] = m[2]; } else out[k] = inline(v);
      }
      return out;
    }
    return node;
  };
  const merged = inline(schema);
  let defs = {};
  for (const name of [...referenced].sort()) if (name !== type) defs = { ...defs, ...(read(name).$defs || {}) };
  merged.$defs = { ...defs, ...(merged.$defs || {}) };
  schemaCache.set(key, merged);
  return merged;
}

// Problems (strings) for a spec against the schema of its diagram_type.
export function schemaProblems(spec) {
  const type = spec && spec.diagram_type;
  if (type !== 'architecture' && type !== 'sequence') return [`diagram_type ${JSON.stringify(type)} is not exported here`];
  const out = [];
  checkSchema(spec, loadBlueprintSchema(type), '', out);
  return out;
}

// ---------------------------------------------------------------------------
// Translation.
// ---------------------------------------------------------------------------
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byId = (a, b) => cmp(a.id, b.id);
const uniq = (list) => [...new Set(list)];

const ARCH_VARIANT = { event: 'dashed', command: 'default', query: 'default', response: 'dashed' };
const SEQ_VARIANT = { event: 'dashed', command: 'default', query: 'return', response: 'return' };

// Blueprint ids must match ^[a-zA-Z][a-zA-Z0-9_-]*$; ddd ids are kebab-case but an
// upstream author may have used dots or a leading digit.
export function blueprintId(id) {
  let s = String(id ?? '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!/^[a-zA-Z]/.test(s)) s = `n-${s}`;
  return s || 'n';
}

function messageLabel(m, id) {
  return (m && m.name) || titleCase(id || '');
}

// Who is a party: bounded contexts, actors and external systems by id.
function parties(workspace) {
  const s = workspace.steps || {};
  const contexts = new Map(((s.decompose || {}).bounded_contexts || []).map((c) => [c.id, c]));
  const actors = new Map([...((s.discover || {}).actors || []), ...((s.understand || {}).actors || [])].map((a) => [a.id, a]));
  const externals = new Map(((s.discover || {}).external_systems || []).map((x) => [x.id, x]));
  return { contexts, actors, externals };
}

function outsiderComponent(id, { actors, externals }) {
  if (actors.has(id)) return { id: blueprintId(id), type: 'external', label: actors.get(id).name || titleCase(id), sublabel: 'actor' };
  const x = externals.get(id);
  return { id: blueprintId(id), type: 'external', label: x ? x.name || titleCase(id) : titleCase(id), sublabel: 'external system' };
}

// The workspace graph as blueprint components, boundaries and connections (no
// geometry yet). Returned separately so the placement can be tested on its own.
export function architectureGraph(workspace, warnings = []) {
  const s = workspace.steps || {};
  const { contexts, actors, externals } = parties(workspace);
  const organise = s.organise || {};
  const connect = s.connect || {};

  // Bounded contexts: the context map's node derivation (name, strategic type).
  const cm = contextMapAvailable(workspace).ok ? contextMapSpec(workspace) : { graph: { nodes: [], edges: [] } };
  const contextNodes = cm.graph.nodes.filter((n) => n.kind === 'context').sort(byId);
  const components = new Map();
  for (const n of contextNodes) {
    components.set(n.id, {
      id: blueprintId(n.id),
      type: 'backend',
      label: n.label,
      ...(n.sublabel ? { sublabel: n.sublabel } : {}),
      ...(n.tag ? { tag: n.tag } : {}),
    });
  }

  // Deployables: one region boundary each, wrapping its contexts and, when it owns
  // its data, a database component.
  const deployables = [...(organise.deployables || [])].filter((d) => d && d.id).sort(byId);
  const host = new Map();
  const boundaries = [];
  const stores = [];
  for (const dep of deployables) {
    const members = uniq(dep.contexts || []).filter((c) => components.has(c)).sort();
    for (const c of members) if (!host.has(c)) host.set(c, dep.id);
    const wraps = members.map((c) => components.get(c).id);
    if (dep.data_store === 'own') {
      const store = { id: blueprintId(`${dep.id}-store`), type: 'database', label: `${dep.name || titleCase(dep.id)} data`, sublabel: 'own data store' };
      stores.push({ dep: dep.id, component: store });
      wraps.push(store.id);
    }
    if (!wraps.length) { warnings.push(`deployable ${dep.id} wraps no known bounded context; no boundary written`); continue; }
    boundaries.push({ kind: 'region', label: dep.name || titleCase(dep.id), wraps, dep: dep.id });
  }
  const unhosted = contextNodes.map((n) => n.id).filter((c) => !host.has(c));
  if (deployables.length && unhosted.length) warnings.push(`not deployed anywhere: ${unhosted.join(', ')}`);

  // Connections: one per (message, consumer) pair whose producer and consumer differ.
  const messages = [...(connect.messages || [])].filter((m) => m && m.id).sort(byId);
  const outsiders = new Map();
  const ensureOutsider = (id) => {
    if (components.has(id) || outsiders.has(id)) return true;
    if (actors.has(id) || externals.has(id)) { outsiders.set(id, outsiderComponent(id, { actors, externals })); return true; }
    return false;
  };
  const connections = [];
  for (const m of messages) {
    const consumers = uniq(Array.isArray(m.consumers) ? m.consumers : []).sort();
    for (const to of consumers) {
      if (!m.producer || to === m.producer) continue;
      if (!ensureOutsider(m.producer) || !ensureOutsider(to)) {
        warnings.push(`message ${m.id}: ${m.producer} -> ${to} names a party that is not a context, actor or external system; skipped`);
        continue;
      }
      const from = components.get(m.producer) || outsiders.get(m.producer);
      const dest = components.get(to) || outsiders.get(to);
      connections.push({
        id: blueprintId(consumers.length > 1 ? `${m.id}-to-${to}` : m.id),
        from: from.id,
        to: dest.id,
        label: messageLabel(m, m.id),
        variant: ARCH_VARIANT[m.kind] || 'default',
      });
    }
  }
  connections.sort(byId);

  // Node list in a stable order: contexts, stores, outsiders (each id-sorted).
  const nodes = [
    ...contextNodes.map((n) => components.get(n.id)),
    ...stores.map((x) => x.component).sort(byId),
    ...[...outsiders.values()].sort(byId),
  ];
  const groups = boundaries.map((b) => ({ id: blueprintId(`dep-${b.dep}`), label: b.label, members: [...b.wraps] }));
  const stepCount = Object.keys(s).length;
  const title = workspace.manifest?.title || workspace.manifest?.project || s.understand?.system?.name || 'System';
  return { nodes, groups, boundaries: boundaries.map(({ dep, ...b }) => b), connections, title: String(title), stepCount };
}

// ---------------------------------------------------------------------------
// Placement: ELK layout quantised onto blueprint's grid.
// ---------------------------------------------------------------------------
const MAX_COLS = 12; // blueprint's schema caps layout.cols at 12

// Cells for every node: Map id -> { row, col }, plus how they were obtained.
export async function placeNodes(graph, warnings = []) {
  const { nodes, groups, connections } = graph;
  const laid = await elkLayout({
    nodes: nodes.map((n) => ({ id: n.id, label: n.label, sublabel: n.sublabel, kind: n.type })),
    edges: connections.map((c) => ({ id: c.id, from: c.from, to: c.to, label: c.label })),
    groups: groups.map((g) => ({ id: g.id, label: g.label, kind: 'deployable', members: g.members })),
  }, { direction: 'RIGHT' });
  const boxes = nodes.map((n) => {
    const b = laid.nodes.get(n.id) || { x: 0, y: 0, w: 0, h: 0 };
    return { id: n.id, x: b.x, y: b.y, w: b.w, h: b.h, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
  });
  // Columns: clusters of overlapping x ranges, left to right.
  const byX = [...boxes].sort((a, b) => a.x - b.x || a.y - b.y || cmp(a.id, b.id));
  let col = -1;
  let right = -Infinity;
  for (const b of byX) {
    if (b.x >= right - 0.5) { col += 1; right = b.x + b.w; } else right = Math.max(right, b.x + b.w);
    b.col = col;
  }
  // Rows: centre y rounded to ELK's row pitch, then compacted.
  const pitch = NODE_H + SPACING.comfortable.nodeNode;
  const minCy = Math.min(...boxes.map((b) => b.cy));
  for (const b of boxes) b.row = Math.round((b.cy - minCy) / pitch);
  const rowsUsed = [...new Set(boxes.map((b) => b.row))].sort((a, b) => a - b);
  const rowIndex = new Map(rowsUsed.map((r, i) => [r, i]));
  for (const b of boxes) b.row = rowIndex.get(b.row);
  const occ = new Set();
  for (const b of [...boxes].sort((a, b) => a.col - b.col || a.row - b.row || cmp(a.id, b.id))) {
    while (occ.has(`${b.row},${b.col}`)) b.row += 1;
    occ.add(`${b.row},${b.col}`);
  }
  const cells = new Map(boxes.map((b) => [b.id, { row: b.row, col: b.col }]));
  const groupOrder = [...groups].sort((a, b) => {
    const ga = laid.groups.get(a.id) || { y: 0, x: 0 };
    const gb = laid.groups.get(b.id) || { y: 0, x: 0 };
    return ga.y - gb.y || ga.x - gb.x || cmp(a.id, b.id);
  }).map((g) => g.id);
  const xRank = new Map(byX.map((b, i) => [b.id, i]));
  const invalid = boundaryProblem(cells, groups);
  if (!invalid && col + 1 <= MAX_COLS) return { cells, engine: `${laid.engine} quantised`, note: null };
  const why = invalid || `${col + 1} columns exceed blueprint's ${MAX_COLS}`;
  return { ...placeInBands(graph, { groupOrder, xRank }), note: `grid from ${laid.engine} layout rejected (${why}); placed a row per deployable` };
}

// A boundary is the bounding box of its members: a non-member inside that box, or
// two boxes overlapping, would draw an untrue picture.
function boundaryProblem(cells, groups) {
  const bbox = (g) => {
    const cs = g.members.map((m) => cells.get(m)).filter(Boolean);
    if (!cs.length) return null;
    return { r0: Math.min(...cs.map((c) => c.row)), r1: Math.max(...cs.map((c) => c.row)), c0: Math.min(...cs.map((c) => c.col)), c1: Math.max(...cs.map((c) => c.col)) };
  };
  const boxes = groups.map((g) => ({ g, box: bbox(g) })).filter((x) => x.box);
  for (const { g, box } of boxes) {
    const members = new Set(g.members);
    for (const [id, c] of cells) {
      if (members.has(id)) continue;
      if (c.row >= box.r0 && c.row <= box.r1 && c.col >= box.c0 && c.col <= box.c1) return `boundary ${g.label} would enclose ${id}`;
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i].box; const b = boxes[j].box;
      if (a.r0 <= b.r1 && b.r0 <= a.r1 && a.c0 <= b.c1 && b.c0 <= a.c1) return `boundaries ${boxes[i].g.label} and ${boxes[j].g.label} would overlap`;
    }
  }
  return null;
}

// Fallback placement: producers-only outsiders on the top row, a row per
// deployable (members in layout x order, wrapping at MAX_COLS), the remaining
// outsiders below, undeployed contexts last.
function placeInBands(graph, { groupOrder, xRank }) {
  const { nodes, groups, connections } = graph;
  const rank = (id) => xRank.get(id) ?? 0;
  const byRank = (a, b) => rank(a) - rank(b) || cmp(a, b);
  const grouped = new Set(groups.flatMap((g) => g.members));
  const outDeg = new Map(); const inDeg = new Map();
  for (const c of connections) { outDeg.set(c.from, (outDeg.get(c.from) || 0) + 1); inDeg.set(c.to, (inDeg.get(c.to) || 0) + 1); }
  const loose = nodes.filter((n) => !grouped.has(n.id));
  const top = loose.filter((n) => n.type === 'external' && (outDeg.get(n.id) || 0) > 0 && !(inDeg.get(n.id) || 0)).map((n) => n.id).sort(byRank);
  const bottom = loose.filter((n) => n.type === 'external' && !top.includes(n.id)).map((n) => n.id).sort(byRank);
  const rest = loose.filter((n) => n.type !== 'external').map((n) => n.id).sort(byRank);
  const cells = new Map();
  let row = 0;
  const place = (ids) => {
    let col = 0;
    for (const id of ids) {
      if (col >= MAX_COLS) { row += 1; col = 0; }
      cells.set(id, { row, col: col++ });
    }
    if (ids.length) row += 1;
  };
  place(top);
  for (const gid of groupOrder) {
    const g = groups.find((x) => x.id === gid);
    place([...g.members].sort(byRank));
  }
  place(bottom);
  place(rest);
  return { cells, engine: 'bands' };
}

// ---------------------------------------------------------------------------
// Geometry, mirrored from blueprint's renderer (renderers/architecture and
// renderers/shared/geometry.mjs) so the exporter can verify what blueprint will see.
// ---------------------------------------------------------------------------
const CELL_H = 64;
const CELL_MIN_W = 120;
const LANE = 12;             // distance between parallel routes sharing a gutter
const FRAME_PAD = 30;        // blueprint boundaryPad
const FRAME_BOTTOM = 50;     // boundaryPad + boundaryExtraBottom
const TITLE_BAND = 20;       // the boundary title rect sits at memberTop-20 .. memberTop-4
const CLEAR = 2;             // blueprint's edge-through-node clearance
const MARGIN = 40;           // blueprint layout.margin
const LEGEND_H = 28;         // blueprint layout.legendH

const labelMaskW = (label) => Math.max(30, textUnits(label) * 4.8 + 10);
const roundUp10 = (v) => Math.ceil(v / 10) * 10;

function segmentIntersectsRect(a, b, rect, gap = 0) {
  const x1 = rect.x - gap; const y1 = rect.y - gap; const x2 = rect.x + rect.width + gap; const y2 = rect.y + rect.height + gap;
  const inBox = (p) => p[0] >= x1 && p[0] <= x2 && p[1] >= y1 && p[1] <= y2;
  if (inBox(a) || inBox(b)) return true;
  const corners = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  for (let i = 0; i < 4; i += 1) if (segmentsCross(a, b, corners[i], corners[(i + 1) % 4])) return true;
  return false;
}

function segmentsCross(p1, p2, p3, p4) {
  const d = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = d(p3, p4, p1); const d2 = d(p3, p4, p2); const d3 = d(p1, p2, p3); const d4 = d(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const on = (p, q, r) => Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) && Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
  return (d1 === 0 && on(p3, p4, p1)) || (d2 === 0 && on(p3, p4, p2)) || (d3 === 0 && on(p1, p2, p3)) || (d4 === 0 && on(p1, p2, p4));
}

function rectsOverlap(a, b, gap = 0) {
  return !(a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x || a.y + a.height + gap <= b.y || b.y + b.height + gap <= a.y);
}

// Lays out the placed graph: cell geometry, routes, labels. Returns the spec
// fragments (layout, components, connections, viewBox) plus the verification notes.
function composeArchitecture(graph, cells, warnings) {
  const { nodes, groups, connections } = graph;
  const nRows = 1 + Math.max(...[...cells.values()].map((c) => c.row));
  const nCols = 1 + Math.max(...[...cells.values()].map((c) => c.col));
  const occ = new Map([...cells].map(([id, c]) => [`${c.row},${c.col}`, id]));
  const at = (r, c) => occ.get(`${r},${c}`);
  const groupOf = new Map(groups.flatMap((g) => g.members.map((m) => [m, g.id])));

  // ---- Route topology (symbolic; gutter lanes and gaps are decided afterwards).
  //   x: { cell: id, side: 'left'|'right'|'centre' } | { gutter: g }   (g = between col g and g+1)
  //   y: { cell: id, side: 'top'|'bottom'|'centre' } | { gutter: h }   (h = between row h and h+1)
  const routes = new Map();
  const laneUse = { v: new Map(), h: new Map() };
  const lane = (axis, index) => {
    const m = laneUse[axis];
    const list = m.get(index) || [];
    m.set(index, list);
    list.push(null);
    return list.length - 1;
  };
  const pairSeen = new Map();
  const emptyBetween = (a, b) => {
    if (a.row === b.row) { const [c0, c1] = [Math.min(a.col, b.col), Math.max(a.col, b.col)]; for (let c = c0 + 1; c < c1; c += 1) if (at(a.row, c)) return false; return true; }
    if (a.col === b.col) { const [r0, r1] = [Math.min(a.row, b.row), Math.max(a.row, b.row)]; for (let r = r0 + 1; r < r1; r += 1) if (at(r, a.col)) return false; return true; }
    return false;
  };
  for (const conn of connections) {
    const a = cells.get(conn.from); const b = cells.get(conn.to);
    const dx = Math.sign(b.col - a.col); const dy = Math.sign(b.row - a.row);
    const hSides = dx > 0 ? ['right', 'left'] : ['left', 'right'];
    const vSides = dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
    const key = [conn.from, conn.to].sort().join(' ');
    const bundle = pairSeen.get(key) || [];
    pairSeen.set(key, bundle);
    let route;
    if (a.row === b.row && Math.abs(a.col - b.col) === 1) {
      route = { kind: 'adjacent', axis: 'h', fromSide: hSides[0], toSide: hSides[1] };
    } else if (a.col === b.col && Math.abs(a.row - b.row) === 1) {
      route = { kind: 'adjacent', axis: 'v', fromSide: vSides[0], toSide: vSides[1] };
    } else if ((a.row === b.row || a.col === b.col) && emptyBetween(a, b)) {
      route = a.row === b.row
        ? { kind: 'straight', axis: 'h', fromSide: hSides[0], toSide: hSides[1] }
        : { kind: 'straight', axis: 'v', fromSide: vSides[0], toSide: vSides[1] };
    } else if (dx !== 0 && dy !== 0) {
      const gA = dx > 0 ? a.col : a.col - 1;               // vertical gutter beside a, towards b
      const hA = dy > 0 ? a.row : a.row - 1;               // horizontal gutter beside a, towards b
      const hB = dy > 0 ? b.row - 1 : b.row;               // horizontal gutter beside b, towards a
      let clear = true;
      for (let c = a.col + dx; c !== b.col; c += dx) if (at(b.row, c)) clear = false;
      if (clear) {
        // Z through the vertical gutter beside a, entering b horizontally.
        route = { kind: 'via', fromSide: hSides[0], toSide: hSides[1], via: [{ x: { gutter: gA }, y: { cell: conn.from, side: 'centre' } }, { x: { gutter: gA }, y: { cell: conn.to, side: 'centre' } }] };
      } else {
        clear = true;
        for (let r = a.row + dy; r !== b.row; r += dy) if (at(r, b.col)) clear = false;
        if (clear) {
          // Z through the horizontal gutter beside a, entering b vertically.
          route = { kind: 'via', fromSide: vSides[0], toSide: vSides[1], via: [{ x: { cell: conn.from, side: 'centre' }, y: { gutter: hA } }, { x: { cell: conn.to, side: 'centre' }, y: { gutter: hA } }] };
        } else {
          // Vertical gutter beside a, horizontal gutter beside b: gutters only.
          route = { kind: 'via', fromSide: hSides[0], toSide: vSides[1], via: [{ x: { gutter: gA }, y: { cell: conn.from, side: 'centre' } }, { x: { gutter: gA }, y: { gutter: hB } }, { x: { cell: conn.to, side: 'centre' }, y: { gutter: hB } }] };
        }
      }
    } else if (a.col === b.col) {
      // Same column, something between: U through a vertical gutter (interior first).
      const g = a.col < nCols - 1 ? a.col : a.col - 1;
      const side = g === a.col ? 'right' : 'left';
      route = { kind: 'via', fromSide: side, toSide: side, via: [{ x: { gutter: g }, y: { cell: conn.from, side: 'centre' } }, { x: { gutter: g }, y: { cell: conn.to, side: 'centre' } }] };
    } else {
      // Same row, something between: U through a horizontal gutter (above first).
      const h = a.row > 0 ? a.row - 1 : a.row;
      const side = h === a.row ? 'bottom' : 'top';
      route = { kind: 'via', fromSide: side, toSide: side, via: [{ x: { cell: conn.from, side: 'centre' }, y: { gutter: h } }, { x: { cell: conn.to, side: 'centre' }, y: { gutter: h } }] };
    }
    if (route.via) {
      const seenV = new Map(); const seenH = new Map();
      for (const p of route.via) {
        if (p.x.gutter !== undefined) { if (!seenV.has(p.x.gutter)) seenV.set(p.x.gutter, lane('v', p.x.gutter)); p.x.lane = seenV.get(p.x.gutter); }
        if (p.y.gutter !== undefined) { if (!seenH.has(p.y.gutter)) seenH.set(p.y.gutter, lane('h', p.y.gutter)); p.y.lane = seenH.get(p.y.gutter); }
      }
    }
    route.bundle = bundle;
    bundle.push(conn.id);
    routes.set(conn.id, route);
  }

  // ---- Grid metrics from the labels and the lanes.
  const lanesV = Math.max(0, ...[...laneUse.v.values()].map((l) => l.length));
  const lanesH = Math.max(0, ...[...laneUse.h.values()].map((l) => l.length));
  const maxMask = Math.max(30, ...connections.map((c) => labelMaskW(c.label)));
  const cellW = Math.max(CELL_MIN_W, ...nodes.map((n) => roundUp10(textUnits(n.label) * 6.6 + 12)));
  const gapX = roundUp10(Math.max(120, maxMask + 8, 68 + LANE * lanesV));
  const gapY = roundUp10(Math.max(120, 76 + LANE * lanesH + 24));
  const grid = { mode: 'grid', origin: [gapX, gapY], cols: nCols, gapX, gapY, cellW, cellH: CELL_H };
  const X = (c) => grid.origin[0] + c * (cellW + gapX);
  const Y = (r) => grid.origin[1] + r * (CELL_H + gapY);
  const box = (id) => { const c = cells.get(id); const x = X(c.col); const y = Y(c.row); return { id, x, y, width: cellW, height: CELL_H, cx: x + cellW / 2, cy: y + CELL_H / 2 }; };
  const boxes = new Map(nodes.map((n) => [n.id, box(n.id)]));
  const laneOffset = (axis, index, k) => { const n = (laneUse[axis].get(index) || []).length; return (k - (n - 1) / 2) * LANE; };
  // Vertical gutters are symmetric; horizontal ones keep clear of the frame bottom
  // (+50) above and the title band (-20, minus label room) below.
  const gutterX = (g, k) => X(g) + cellW + gapX / 2 + laneOffset('v', g, k);
  const gutterY = (h, k) => Y(h) + CELL_H + (FRAME_BOTTOM + 2 + gapY - TITLE_BAND - 4) / 2 + laneOffset('h', h, k);
  const anchor = (id, side) => {
    const b = boxes.get(id);
    return side === 'left' ? [b.x, b.cy] : side === 'right' ? [b.x + b.width, b.cy] : side === 'top' ? [b.cx, b.y] : [b.cx, b.y + b.height];
  };
  const resolve = (p) => [
    p.x.gutter !== undefined ? gutterX(p.x.gutter, p.x.lane) : boxes.get(p.x.cell).cx,
    p.y.gutter !== undefined ? gutterY(p.y.gutter, p.y.lane) : boxes.get(p.y.cell).cy,
  ];

  // Boundary frames and title rects, as blueprint computes them.
  const frames = groups.map((g) => {
    const ms = g.members.map((m) => boxes.get(m)).filter(Boolean);
    const minX = Math.min(...ms.map((m) => m.x)); const minY = Math.min(...ms.map((m) => m.y));
    const maxX = Math.max(...ms.map((m) => m.x + m.width)); const maxY = Math.max(...ms.map((m) => m.y + m.height));
    const frame = { x: minX - FRAME_PAD, y: minY - FRAME_PAD, width: maxX - minX + FRAME_PAD * 2, height: maxY - minY + FRAME_PAD + FRAME_BOTTOM };
    const titleW = Math.min(frame.width - 8, Math.max(30, textUnits(g.label) * 9 * 0.6 + 10));
    return { ...frame, label: g.label, title: { x: frame.x + 4, y: minY - TITLE_BAND, width: titleW, height: 16 } };
  });

  // ---- Automatic port spread for the adjacent (auto) connections, mirrored so the
  // label offsets land beside the lines blueprint will draw.
  const spreadGroups = new Map();
  for (const conn of connections) {
    const r = routes.get(conn.id);
    if (r.kind !== 'adjacent') continue;
    for (const [end, id, side, other] of [['from', conn.from, r.fromSide, conn.to], ['to', conn.to, r.toSide, conn.from]]) {
      const k = `${id} ${side}`;
      const list = spreadGroups.get(k) || [];
      spreadGroups.set(k, list);
      list.push({ conn, end, counterpart: boxes.get(other) });
    }
  }
  const spread = new Map(); // conn.id -> { from: offset, to: offset }
  for (const [k, items] of spreadGroups) {
    if (items.length < 2) continue;
    const vertical = k.endsWith('left') || k.endsWith('right');
    items.sort((p, q) => {
      const pc = vertical ? p.counterpart.cy : p.counterpart.cx; const qc = vertical ? q.counterpart.cy : q.counterpart.cx;
      if (pc !== qc) return pc - qc;
      const key = (c) => `${c.id || ''} ${c.from} ${c.to} ${c.label || ''}`;
      return cmp(key(p.conn), key(q.conn));
    });
    const extent = vertical ? CELL_H : cellW;
    const spacing = Math.min(14, Math.max(0, extent - 32) / (items.length - 1));
    items.forEach((it, i) => {
      const s = spread.get(it.conn.id) || {};
      s[it.end] = (i - (items.length - 1) / 2) * spacing;
      s.index = s.index ?? i;
      s.count = items.length;
      spread.set(it.conn.id, s);
    });
  }

  // ---- Concrete points and labels.
  const placedLabels = [];
  const out = [];
  const notes = [];
  for (const conn of connections) {
    const r = routes.get(conn.id);
    const c = { ...conn };
    const a = boxes.get(conn.from); const b = boxes.get(conn.to);
    const w = labelMaskW(conn.label);
    let points;
    let labelRect = null;
    if (r.kind === 'adjacent') {
      c.fromSide = r.fromSide; c.toSide = r.toSide;
      const s = spread.get(conn.id) || { from: 0, to: 0, index: 0, count: 1 };
      const start = anchor(conn.from, r.fromSide); const end = anchor(conn.to, r.toSide);
      if (r.axis === 'h') { start[1] += s.from; end[1] += s.to; } else { start[0] += s.from; end[0] += s.to; }
      points = [start, end];
      // blueprint puts a 2-point label at (midX, startY - 10): fine above a single
      // horizontal line; a bundle is fanned below the lowest line, and a vertical
      // line's label is moved into the gutter beside it.
      const n = s.count; const k = s.index;
      let lx = (start[0] + end[0]) / 2; let ly = start[1] - 10;
      if (r.axis === 'h' && n > 1) {
        const bottom = Math.max(...(spreadGroups.get(`${conn.from} ${r.fromSide}`) || []).map((it) => (spread.get(it.conn.id) || { from: 0 }).from)) + a.cy;
        c.labelDy = (bottom + 16 + 16 * k) - ly;
        ly += c.labelDy;
      } else if (r.axis === 'v') {
        const rightmost = Math.max(...(spreadGroups.get(`${conn.from} ${r.fromSide}`) || [{ conn }]).map((it) => (spread.get(it.conn.id) || { from: 0 }).from)) + a.cx;
        const midY = r.fromSide === 'bottom' ? a.y + a.height + gapY / 2 : a.y - gapY / 2;
        c.labelDx = rightmost + 6 + w / 2 - lx;
        c.labelDy = (midY - 8 * (n - 1) + 16 * k) - ly;
        lx += c.labelDx; ly += c.labelDy;
      }
      labelRect = { x: lx - w / 2, y: ly - 10, width: w, height: 14 };
    } else if (r.kind === 'straight') {
      c.fromSide = r.fromSide; c.toSide = r.toSide; c.route = 'straight';
      const start = anchor(conn.from, r.fromSide); const end = anchor(conn.to, r.toSide);
      points = [start, end];
      const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
      const first = r.axis === 'h' ? [mid[0], mid[1] - 10] : [mid[0] + 6 + w / 2, mid[1]];
      const pick = placeLabel(first, r.axis === 'h' ? 'h' : 'v', w, r.axis === 'h' ? Math.abs(end[0] - start[0]) : Math.abs(end[1] - start[1]), placedLabels, boxes, frames);
      c.labelAt = [round1(pick[0]), round1(pick[1])];
      labelRect = { x: pick[0] - w / 2, y: pick[1] - 10, width: w, height: 14 };
    } else {
      c.fromSide = r.fromSide; c.toSide = r.toSide;
      const via = r.via.map(resolve);
      points = [anchor(conn.from, r.fromSide), ...via, anchor(conn.to, r.toSide)];
      c.via = via.map((p) => [round1(p[0]), round1(p[1])]);
      // Label on the longest interior segment (horizontal preferred): above a
      // horizontal run, across a vertical run at the gutter's centre line.
      let best = null;
      for (let i = 1; i < points.length - 2; i += 1) {
        const p = points[i]; const q = points[i + 1];
        const horizontal = Math.abs(p[1] - q[1]) < 0.01;
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]) * (horizontal ? 1.5 : 1);
        if (!best || len > best.len) best = { len, i, horizontal, p, q };
      }
      const seg = best || { i: 0, horizontal: Math.abs(points[0][1] - points[1][1]) < 0.01, p: points[0], q: points[1] };
      const mid = [(seg.p[0] + seg.q[0]) / 2, (seg.p[1] + seg.q[1]) / 2];
      const first = seg.horizontal ? [mid[0], mid[1] - 10] : [X(r.via[seg.i - 1]?.x.gutter ?? 0) + cellW + gapX / 2, mid[1]];
      if (!seg.horizontal && r.via[seg.i - 1]?.x.gutter === undefined) first[0] = mid[0];
      const pick = placeLabel(first, seg.horizontal ? 'h' : 'v', w, Math.hypot(seg.q[0] - seg.p[0], seg.q[1] - seg.p[1]), placedLabels, boxes, frames);
      c.labelAt = [round1(pick[0]), round1(pick[1])];
      labelRect = { x: pick[0] - w / 2, y: pick[1] - 10, width: w, height: 14 };
    }
    if (labelRect) placedLabels.push(labelRect);
    // Verification with blueprint's rules: no segment through an unrelated component,
    // first/last segments perpendicular to their sides, no run along a frame border,
    // no label mask on a component or a boundary title.
    for (const [id, bx] of boxes) {
      if (id === conn.from || id === conn.to) continue;
      for (let i = 0; i < points.length - 1; i += 1) if (segmentIntersectsRect(points[i], points[i + 1], bx, CLEAR)) notes.push(`${conn.id}: segment ${i} crosses ${id}`);
      if (labelRect && rectsOverlap(labelRect, bx, -2)) notes.push(`${conn.id}: label over ${id}`);
    }
    for (const f of frames) {
      for (let i = 0; i < points.length - 1; i += 1) if (runsAlongFrame(points[i], points[i + 1], f)) notes.push(`${conn.id}: segment ${i} runs along boundary ${f.label}`);
      if (labelRect && rectsOverlap(labelRect, f.title)) notes.push(`${conn.id}: label over the title of ${f.label}`);
    }
    if (!honoursSide(points[0], points[1], c.fromSide, true)) notes.push(`${conn.id}: first segment does not leave ${c.fromSide}`);
    if (!honoursSide(points[points.length - 2], points[points.length - 1], c.toSide, false)) notes.push(`${conn.id}: last segment does not enter ${c.toSide}`);
    c.points = points;
    c.labelRect = labelRect;
    out.push(c);
  }
  for (const n of uniq(notes)) warnings.push(`architecture geometry: ${n}`);

  // ---- viewBox: blueprint sizes it from components and boundaries only; routes or
  // labels beyond that footprint need an explicit one.
  let maxX = 0; let maxY = 0;
  for (const bx of boxes.values()) { maxX = Math.max(maxX, bx.x + bx.width); maxY = Math.max(maxY, bx.y + bx.height); }
  for (const f of frames) { maxX = Math.max(maxX, f.x + f.width); maxY = Math.max(maxY, f.y + f.height); }
  let extX = maxX; let extY = maxY;
  for (const c of out) {
    for (const p of c.points) { extX = Math.max(extX, p[0]); extY = Math.max(extY, p[1]); }
    if (c.labelRect) { extX = Math.max(extX, c.labelRect.x + c.labelRect.width); extY = Math.max(extY, c.labelRect.y + c.labelRect.height); }
  }
  const viewBox = extX > maxX || extY > maxY ? [Math.ceil(extX + MARGIN), Math.ceil(extY + MARGIN + LEGEND_H)] : null;

  const components = nodes.map((n) => ({ ...n, row: cells.get(n.id).row, col: cells.get(n.id).col, size: [cellW, CELL_H] }));
  const conns = out.map(({ points, labelRect, ...c }) => c);
  return { layout: grid, components, connections: conns, viewBox, notes: uniq(notes) };
}

const round1 = (v) => Math.round(v * 10) / 10;

function honoursSide(p, q, side, outward) {
  const dx = q[0] - p[0]; const dy = q[1] - p[1];
  const dir = outward ? 1 : -1; // leaving: away from the box; entering: towards it
  if (side === 'right') return Math.abs(dy) < 0.01 && dx * dir > 0;
  if (side === 'left') return Math.abs(dy) < 0.01 && dx * dir < 0;
  if (side === 'bottom') return Math.abs(dx) < 0.01 && dy * dir > 0;
  return Math.abs(dx) < 0.01 && dy * dir < 0;
}

function runsAlongFrame(p, q, f) {
  const horizontal = Math.abs(p[1] - q[1]) < 0.01;
  if (horizontal) {
    const overlap = Math.min(Math.max(p[0], q[0]), f.x + f.width) - Math.max(Math.min(p[0], q[0]), f.x);
    return overlap > 0.01 && (Math.abs(p[1] - f.y) < 0.01 || Math.abs(p[1] - (f.y + f.height)) < 0.01);
  }
  const overlap = Math.min(Math.max(p[1], q[1]), f.y + f.height) - Math.max(Math.min(p[1], q[1]), f.y);
  return overlap > 0.01 && (Math.abs(p[0] - f.x) < 0.01 || Math.abs(p[0] - (f.x + f.width)) < 0.01);
}

// A label point along a segment: the preferred point, else slid along the
// segment's axis in 16px steps, so labels do not stack on each other or on a
// component/title. The first candidate is kept when nothing better exists.
function placeLabel(first, axis, w, segLen, placed, boxes, frames) {
  const rectAt = (p) => ({ x: p[0] - w / 2, y: p[1] - 10, width: w, height: 14 });
  const bad = (rect) => [...boxes.values()].some((b) => rectsOverlap(rect, b, -2))
    || frames.some((f) => rectsOverlap(rect, f.title))
    || placed.some((l) => rectsOverlap(rect, l, 2));
  const reach = Math.max(0, (axis === 'h' ? segLen - w : segLen - 14) / 2);
  const steps = [0];
  for (let d = 16; d <= reach; d += 16) steps.push(d, -d);
  for (const d of steps) {
    const p = axis === 'h' ? [first[0] + d, first[1]] : [first[0], first[1] + d];
    if (!bad(rectAt(p))) return p;
  }
  return first;
}

export async function architectureSpec(workspace, warnings = []) {
  const graph = architectureGraph(workspace, warnings);
  const placement = await placeNodes(graph, warnings);
  if (placement.note) warnings.push(placement.note);
  const composed = composeArchitecture(graph, placement.cells, warnings);
  return {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: {
      title: graph.title,
      subtitle: `generated by ddd from ${graph.stepCount} step${graph.stepCount === 1 ? '' : 's'}`,
      quality_profile: 'standard',
      ...(composed.viewBox ? { viewBox: composed.viewBox } : {}),
    },
    layout: composed.layout,
    components: composed.components,
    ...(graph.boundaries.length ? { boundaries: graph.boundaries } : {}),
    ...(composed.connections.length ? { connections: composed.connections } : {}),
  };
}

// ---------------------------------------------------------------------------
// Sequence.
// ---------------------------------------------------------------------------
const SEQ_FIRST_Y = 185;
const SEQ_ROW = 44;
const SEQ_SIDE_MARGIN = 62;   // blueprint render-sequence.mjs
const SEQ_BOX_MIN = 86;
const SEQ_BOX_MAX = 190;
const SEQ_LABEL_PX = 6.8;     // blueprint: textUnits * 6.8 must be <= box + 6

// Abbreviates a participant label to what a 190px box can hold.
function fitParticipantLabel(label) {
  const maxUnits = Math.floor((SEQ_BOX_MAX + 6) / SEQ_LABEL_PX);
  if (textUnits(label) <= maxUnits) return label;
  const chars = Array.from(label);
  let s = '';
  for (const ch of chars) { if (textUnits(s + ch) > maxUnits - 1) break; s += ch; }
  return `${s.trimEnd()}…`;
}

export function sequenceSpec(workspace, fid, warnings = []) {
  const sp = flowSpec(workspace, { id: `flow-${fid}` });
  const { actors, externals } = parties(workspace);
  const participants = sp.graph.nodes.map((n) => {
    const label = fitParticipantLabel(n.label);
    if (label !== n.label) warnings.push(`flow ${fid}: participant "${n.label}" abbreviated to "${label}" (blueprint's widest participant box is ${SEQ_BOX_MAX}px)`);
    return {
      id: blueprintId(n.id),
      type: n.kind === 'context' ? 'backend' : 'external',
      label,
      sublabel: n.kind === 'context' ? 'bounded context' : n.kind === 'actor' || actors.has(n.id) ? 'actor' : externals.has(n.id) ? 'external system' : 'external',
    };
  });
  const ids = new Set(participants.map((p) => p.id));
  const messages = [];
  sp.graph.edges.forEach((e) => {
    const from = blueprintId(e.from);
    const to = blueprintId(e.to);
    if (!ids.has(from) || !ids.has(to)) { warnings.push(`flow ${fid} step ${e.seq}: unknown participant; skipped`); return; }
    messages.push({
      id: blueprintId(e.id),
      from,
      to,
      y: SEQ_FIRST_Y + messages.length * SEQ_ROW,
      label: e.label,
      variant: SEQ_VARIANT[e.kind] || 'default',
    });
  });
  // Box width from the longest name; with column_fit "spread" blueprint derives
  // `round((width - 124) / n) - 24`, so this width lands exactly on boxW.
  const units = Math.max(1, ...participants.map((p) => textUnits(p.label)));
  const boxW = Math.min(SEQ_BOX_MAX, Math.max(SEQ_BOX_MIN, Math.ceil(units * SEQ_LABEL_PX - 6)));
  const n = Math.max(1, participants.length);
  const width = Math.max(480, SEQ_SIDE_MARGIN * 2 + n * (boxW + 24));
  const flow = (workspace.steps.connect.flows || []).find((f) => f.id === fid) || {};
  return {
    schema_version: 1,
    diagram_type: 'sequence',
    meta: {
      title: `${flow.name || titleCase(fid)} (${fid})`,
      subtitle: `generated by ddd from ${messages.length} step${messages.length === 1 ? '' : 's'}`,
      quality_profile: 'standard',
      column_fit: 'spread',
      viewBox: [width, Math.max(480, SEQ_FIRST_Y + messages.length * SEQ_ROW + 60)],
    },
    participants,
    messages,
  };
}

// ---------------------------------------------------------------------------
// Repair with blueprint's validator (label masks on components are the one class
// the geometry cannot rule out): drop that label, never the connection.
// ---------------------------------------------------------------------------
export function validateWithBlueprint(spec, blueprint, file) {
  const type = spec.diagram_type;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddd-blueprint-'));
  const input = path.join(tmp, path.basename(file));
  try {
    fs.writeFileSync(input, `${JSON.stringify(spec, null, 2)}\n`);
    const r = spawnSync(process.execPath, [blueprint.bin, 'validate', type, input, '--json'], { encoding: 'utf8', cwd: blueprint.home });
    let receipt = null;
    try { receipt = JSON.parse(r.stdout); } catch { receipt = null; }
    const diagnostics = receipt?.diagnostics || [];
    const ok = r.status === 0 && receipt?.ok === true;
    const messages = diagnostics.length ? diagnostics.map((d) => d.message || '') : String(receipt?.error || r.stderr || '').split('\n').map((l) => l.replace(/^- /, '')).filter(Boolean);
    return { ok, messages, receipt };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const LABEL_ON_COMPONENT = /^Label "(.+?)" overlaps component "(.+?)"/;
const TITLE_ON_LABEL = /^Boundary label "(.+?)" overlaps connection label "(.+?)"/;

export function repairWithBlueprint(spec, blueprint, file, warnings = []) {
  const degraded = [];
  if (spec.diagram_type !== 'architecture') return degraded;
  for (let round = 0; round < 8; round += 1) {
    const v = validateWithBlueprint(spec, blueprint, file);
    if (v.ok) break;
    let fixed = 0;
    for (const msg of v.messages) {
      const m = LABEL_ON_COMPONENT.exec(msg) || TITLE_ON_LABEL.exec(msg);
      if (!m) continue;
      const label = m === LABEL_ON_COMPONENT.exec(msg) ? m[1] : m[2];
      const conn = (spec.connections || []).find((c) => c.label === label);
      if (!conn) continue;
      delete conn.label; delete conn.labelAt; delete conn.labelDx; delete conn.labelDy;
      degraded.push({ id: conn.id, label, why: msg });
      warnings.push(`${path.basename(file)}: dropped the label "${label}" of connection ${conn.id} (blueprint: ${msg})`);
      fixed += 1;
    }
    if (!fixed) break;
  }
  return degraded;
}

// ---------------------------------------------------------------------------
// Export.
// ---------------------------------------------------------------------------
export async function exportBlueprint(workspace, { outDir, blueprint = null } = {}) {
  const dir = path.resolve(outDir || path.join(workspace.dddDir, 'diagrams'));
  const warnings = [];
  const specs = [];
  if (workspace.steps.decompose || workspace.steps.organise) {
    specs.push({ file: 'final.architecture.json', spec: await architectureSpec(workspace, warnings) });
  } else {
    warnings.push('no 03-decompose/decompose.json: final.architecture.json not written');
  }
  const flows = flowsAvailable(workspace);
  if (flows.ok) {
    for (const id of [...flows.ids].sort()) {
      const fid = flowId(id);
      specs.push({ file: `final-${blueprintId(fid)}.sequence.json`, spec: sequenceSpec(workspace, fid, warnings) });
    }
  } else {
    warnings.push(`${flows.reason}: no sequence specs written`);
  }
  const degraded = new Map();
  for (const s of specs) {
    const problems = schemaProblems(s.spec);
    if (problems.length) {
      const e = new Error(`${path.join(dir, s.file)} does not validate against the blueprint ${s.spec.diagram_type} schema:\n  ${problems.join('\n  ')}`);
      e.exitCode = 1;
      throw e;
    }
    if (blueprint) {
      const d = repairWithBlueprint(s.spec, blueprint, s.file, warnings);
      if (d.length) degraded.set(path.join(dir, s.file), d);
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const s of specs) {
    const file = path.join(dir, s.file);
    fs.writeFileSync(file, `${JSON.stringify(s.spec, null, 2)}\n`);
    written.push(file);
  }
  return { written, warnings, degraded };
}

// ---------------------------------------------------------------------------
// Deliver.
// ---------------------------------------------------------------------------
export function findBlueprint(env = process.env, warn = (m) => process.stderr.write(`warning: ${m}\n`)) {
  if (env.BLUEPRINT_HOME) {
    const home = path.resolve(env.BLUEPRINT_HOME);
    const bin = path.join(home, 'bin', 'blueprint.mjs');
    if (fs.existsSync(bin)) return { home, bin };
    warn(`BLUEPRINT_HOME=${env.BLUEPRINT_HOME} has no bin/blueprint.mjs; using the plugin's own skill`);
  }
  const bin = path.join(BLUEPRINT_VENDORED, 'bin', 'blueprint.mjs');
  return fs.existsSync(bin) ? { home: BLUEPRINT_VENDORED, bin } : null;
}

function specType(file) {
  return file.endsWith('.sequence.json') ? 'sequence' : 'architecture';
}

function htmlFor(file) {
  return file.replace(/\.(architecture|sequence)\.json$/, '.html');
}

// Runs `blueprint deliver` on every written spec. Returns { receipts, failed }.
// `degraded` (Map file -> [{ id, label }]) is named on the receipt line.
export function deliver(written, { blueprint, quality = 'standard', log = (s) => process.stdout.write(s), degraded = new Map() } = {}) {
  const receipts = [];
  let failed = 0;
  for (const file of written) {
    const type = specType(file);
    const html = htmlFor(file);
    const args = [blueprint.bin, 'deliver', type, file, html, '--quality', quality, '--json'];
    const r = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: blueprint.home });
    let receipt = null;
    try { receipt = JSON.parse(r.stdout); } catch { receipt = null; }
    const errors = receipt?.validation?.errors ?? receipt?.composition?.summary?.errors ?? null;
    const drops = degraded.get(file) || [];
    const dropNote = drops.length ? `  labels dropped ${drops.length} (${drops.map((d) => `${d.id}: "${d.label}"`).join('; ')})` : '';
    if (r.status === 0 && receipt && receipt.ok !== false) {
      log(`${receipt.output || html}  sha256 ${receipt.artifact?.sha256 || '-'}  errors ${errors ?? 0}${dropNote}\n`);
      receipts.push({ file, html, receipt, ok: true });
      continue;
    }
    failed += 1;
    log(`blueprint deliver ${type} ${file} failed (exit ${r.status}); previous ${html} left untouched\n`);
    const lines = [];
    if (receipt) {
      for (const d of receipt.diagnostics || []) lines.push(`[${d.code || 'error'}] ${(d.message || JSON.stringify(d)).split('\n')[0]}`);
      for (const issue of receipt.composition?.issues || []) lines.push(`${issue.severity || 'error'}: ${issue.subject || ''} ${issue.message || JSON.stringify(issue)}`);
      for (const c of receipt.checks || []) if (c.ok === false) lines.push(`check ${c.name}: ${(c.details || []).join('; ')}`);
      if (!lines.length && receipt.error) lines.push(...String(typeof receipt.error === 'string' ? receipt.error : JSON.stringify(receipt.error)).split('\n').filter(Boolean));
      if (!lines.length) lines.push(JSON.stringify(receipt));
    } else {
      if (r.stdout) lines.push(...r.stdout.trim().split('\n'));
      if (r.stderr) lines.push(...r.stderr.trim().split('\n'));
    }
    for (const l of lines) log(`  ${l}\n`);
    receipts.push({ file, html, receipt, ok: false });
  }
  return { receipts, failed };
}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------
const USAGE = 'usage: ddd export blueprint <ddd-dir> [--out DIR] [--deliver] [--quality standard|showcase]\n';

export function parseArgs(argv) {
  const a = { dir: null, out: null, deliver: false, quality: 'standard', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const x = argv[i];
    if (x === '-h' || x === '--help') { a.help = true; continue; }
    if (x === '--deliver') { a.deliver = true; continue; }
    if (x === '--out' || x === '-o') { a.out = argv[++i]; if (a.out === undefined) throw usage('--out needs a directory'); continue; }
    if (x.startsWith('--out=')) { a.out = x.slice(6); continue; }
    if (x === '--quality') { a.quality = argv[++i]; continue; }
    if (x.startsWith('--quality=')) { a.quality = x.slice(10); continue; }
    if (x.startsWith('-')) throw usage(`unknown option ${x}`);
    if (a.dir) throw usage('one <ddd-dir> only');
    a.dir = x;
  }
  if (!a.help && !a.dir) throw usage('a <ddd-dir> is required');
  if (!QUALITIES.has(a.quality)) throw usage(`--quality must be standard or showcase, not ${a.quality}`);
  return a;
}

function usage(msg) {
  const e = new Error(msg);
  e.usage = true;
  return e;
}

export async function main(argv, ctx = {}) {
  const out = (s) => process.stdout.write(s);
  const err = (s) => process.stderr.write(s);
  let a;
  try {
    a = parseArgs(argv);
  } catch (e) {
    if (!e.usage) throw e;
    err(`${USAGE}ddd export blueprint: error: ${e.message}\n`);
    return 2;
  }
  if (a.help) { out(USAGE); return 0; }
  const dddDir = path.resolve(a.dir);
  if (!fs.existsSync(path.join(dddDir, 'manifest.json'))) {
    err(`ddd export blueprint: ${a.dir} has no manifest.json\n`);
    return 2;
  }
  const blueprint = findBlueprint(process.env, (m) => err(`warning: ${m}\n`));
  if (!blueprint) { err(`${SKILL_MISSING}\n`); return 1; }
  const workspace = loadWorkspace(dddDir);
  let result;
  try {
    result = await exportBlueprint(workspace, { outDir: a.out, blueprint });
  } catch (e) {
    if (e.exitCode === 1) { err(`ddd export blueprint: ${e.message}\n`); return 1; }
    throw e;
  }
  for (const f of result.written) out(`wrote ${f}\n`);
  for (const w of result.warnings) err(`warning: ${w}\n`);
  if (!result.written.length) { err('ddd export blueprint: nothing to export\n'); return 1; }
  if (!a.deliver) return 0;
  const d = deliver(result.written, { blueprint, quality: a.quality, log: out, degraded: result.degraded });
  return d.failed ? 1 : 0;
}
