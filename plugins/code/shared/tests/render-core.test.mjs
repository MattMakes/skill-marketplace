// Tests for shared/lib/render/core: geometry agrees with blueprint, routing
// never crosses an unrelated box, autoGrid is deterministic and terminates on
// cycles, spread ports do not overlap, and PNG rendering degrades cleanly.
//
// Run: node --test plugins/code/shared/tests/render-core.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as svg from '../lib/render/core/svg.mjs';
import * as grid from '../lib/render/core/grid.mjs';
import * as route from '../lib/render/core/route.mjs';
import * as legend from '../lib/render/core/legend.mjs';
import * as textfit from '../lib/render/core/textfit.mjs';
import { findChrome, svgToPng, NO_CHROME_NOTE } from '../lib/render/core/chrome.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- Reference values from blueprint ---------------------------------------------
// Obtained by running blueprint 2.17.0-dev.1 renderers/shared/geometry.mjs
// (rectsOverlap, segmentIntersectsRect) on exactly these inputs, on
// 2026-09-01. Hard-coded so this test passes on a machine without blueprint.
const OVERLAP_CASES = [
  [{ x: 0, y: 0, width: 100, height: 50 }, { x: 50, y: 25, width: 100, height: 50 }, 0, true],
  [{ x: 0, y: 0, width: 100, height: 50 }, { x: 100, y: 0, width: 100, height: 50 }, 0, false],
  [{ x: 0, y: 0, width: 100, height: 50 }, { x: 105, y: 0, width: 100, height: 50 }, 5, false],
  [{ x: 0, y: 0, width: 100, height: 50 }, { x: 106, y: 0, width: 100, height: 50 }, 5, false],
  [{ x: 0, y: 0, width: 100, height: 50 }, { x: 0, y: 60, width: 100, height: 50 }, 10, false],
  [{ x: 0, y: 0, width: 100, height: 50 }, { x: 0, y: 60, width: 100, height: 50 }, 9, false],
  [{ x: NaN, y: 0, width: 100, height: 50 }, { x: 0, y: 0, width: 100, height: 50 }, 0, false],
  [{ x: 10, y: 10, width: 10, height: 10 }, { x: 0, y: 0, width: 100, height: 50 }, 0, true],
];
const SEGMENT_CASES = [
  [{ start: [0, 25], end: [200, 25] }, { x: 50, y: 0, width: 100, height: 50 }, 0, true],
  [{ start: [60, 10], end: [90, 40] }, { x: 50, y: 0, width: 100, height: 50 }, 0, true],
  [{ start: [0, 60], end: [200, 60] }, { x: 50, y: 0, width: 100, height: 50 }, 0, false],
  [{ start: [0, 60], end: [200, 60] }, { x: 50, y: 0, width: 100, height: 50 }, 10, true],
  [{ start: [0, 60], end: [200, 60] }, { x: 50, y: 0, width: 100, height: 50 }, 9, false],
  [{ start: [0, 0], end: [200, 100] }, { x: 50, y: 0, width: 100, height: 50 }, 0, true],
  [{ start: [0, 50], end: [200, 50] }, { x: 50, y: 0, width: 100, height: 50 }, 0, true],
  [{ start: [40, -10], end: [40, 80] }, { x: 50, y: 0, width: 100, height: 50 }, 0, false],
  [{ start: [40, -10], end: [40, 80] }, { x: 50, y: 0, width: 100, height: 50 }, 10, true],
  [{ start: [0, 0], end: [49, 49] }, { x: 50, y: 50, width: 10, height: 10 }, 0, false],
  [{ start: [0, 0], end: [50, 50] }, { x: 50, y: 50, width: 10, height: 10 }, 0, true],
];

test('rectsOverlap agrees with blueprint reference values', () => {
  for (const [a, b, gap, expected] of OVERLAP_CASES) {
    assert.equal(route.rectsOverlap(a, b, gap), expected, JSON.stringify([a, b, gap]));
  }
});

test('segmentIntersectsRect agrees with blueprint reference values', () => {
  for (const [segment, rect, gap, expected] of SEGMENT_CASES) {
    assert.equal(route.segmentIntersectsRect(segment, rect, gap), expected, JSON.stringify([segment, rect, gap]));
  }
});

// ---- Routing fixture: 8 boxes, 10 edges, including a same-pair duplicate ------
const NODES = ['ordering', 'catalog', 'payments', 'shipping', 'identity', 'notifications', 'billing', 'analytics']
  .map((id, i) => ({ id, label: id, kind: ['core', 'supporting', 'generic', 'external'][i % 4] }));
const EDGES = [
  { from: 'ordering', to: 'payments', kind: 'sync', label: 'charge' },
  { from: 'ordering', to: 'payments', kind: 'async', label: 'OrderPlaced' },
  { from: 'ordering', to: 'shipping', kind: 'async', label: 'OrderPaid' },
  { from: 'catalog', to: 'ordering', kind: 'query', label: 'prices' },
  { from: 'identity', to: 'ordering', kind: 'dependency' },
  { from: 'payments', to: 'billing', kind: 'async', label: 'PaymentTaken' },
  { from: 'shipping', to: 'notifications', kind: 'async', label: 'Shipped' },
  { from: 'identity', to: 'billing', kind: 'sync', label: 'customer' },
  { from: 'catalog', to: 'analytics', kind: 'async', label: 'ProductViewed' },
  { from: 'billing', to: 'ordering', kind: 'async', label: 'InvoiceIssued' },
];

test('routing on the fixture never crosses an unrelated box', () => {
  const boxes = grid.placeNodes(NODES, EDGES);
  assert.equal(boxes.size, 8);
  const routed = route.routeEdges(EDGES, boxes);
  assert.equal(routed.length, 10);
  routed.forEach((r, i) => {
    assert.ok(r, `edge ${i} routed`);
    assert.ok(r.points.length >= 2);
    const hit = route.crossesUnrelatedNode(r.points, boxes, [EDGES[i].from, EDGES[i].to]);
    assert.equal(hit, null, `${EDGES[i].from} -> ${EDGES[i].to} crosses ${hit && hit.id}`);
    assert.equal(r.crossings, 0);
    // Orthogonal: every segment is axis aligned.
    for (let k = 0; k < r.points.length - 1; k += 1) {
      const [a, b] = [r.points[k], r.points[k + 1]];
      assert.ok(a[0] === b[0] || a[1] === b[1], 'segment is axis aligned');
    }
  });
});

test('edge labels cover neither a box nor another label', () => {
  const boxes = grid.placeNodes(NODES, EDGES);
  const routed = route.routeEdges(EDGES, boxes);
  const rects = routed.filter((r) => r.labelRect).map((r) => r.labelRect);
  assert.equal(rects.length, 9);
  for (const rect of rects) {
    for (const box of boxes.values()) assert.equal(route.rectsOverlap(rect, box), false, 'label over a box');
  }
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) assert.equal(route.rectsOverlap(rects[i], rects[j]), false, 'labels overlap');
  }
});

test('edge labels keep clear of boundary titles passed as label obstacles', () => {
  const boxes = grid.placeNodes(NODES, EDGES);
  const finance = grid.boundaryBox([boxes.get('payments'), boxes.get('billing')], { label: 'Finance deployable', kind: 'deployable', id: 'finance' });
  assert.ok(finance.titleRect && finance.titleRect.width > 0);
  assert.deepEqual(finance.wraps, ['payments', 'billing']);
  const routed = route.routeEdges(EDGES, boxes, { labelObstacles: [finance.titleRect] });
  for (const r of routed) {
    if (r.labelRect) assert.equal(route.rectsOverlap(r.labelRect, finance.titleRect), false, 'label over the boundary title');
  }
});

test('connectionPath honours explicit routes and sides', () => {
  const a = grid.componentBox({ id: 'a', row: 0, col: 0 });
  const b = grid.componentBox({ id: 'b', row: 1, col: 2 });
  const h = route.connectionPath(a, b, { route: 'orthogonal-h', fromSide: 'right', toSide: 'left' });
  assert.equal(h.points.length, 4);
  assert.equal(h.points[0][1], h.points[1][1], 'horizontal first');
  const v = route.connectionPath(a, b, { route: 'orthogonal-v', fromSide: 'bottom', toSide: 'top' });
  assert.equal(v.points[0][0], v.points[1][0], 'vertical first');
  assert.equal(v.fromSide, 'bottom');
  assert.equal(v.toSide, 'top');
  assert.match(h.d, /^M /);
  assert.ok(Array.isArray(h.labelAt) && h.labelAt.length === 2);
});

test('a route around an obstacle in the middle goes around, not through', () => {
  const a = grid.componentBox({ id: 'a', row: 0, col: 0 });
  const wall = grid.componentBox({ id: 'wall', row: 1, col: 0 });
  const b = grid.componentBox({ id: 'b', row: 2, col: 0 });
  const r = route.connectionPath(a, b, { obstacles: [a, wall, b] });
  assert.equal(r.crossings, 0);
  assert.equal(route.crossesUnrelatedNode(r.points, [a, wall, b], ['a', 'b']), null);
});

// ---- autoGrid --------------------------------------------------------------------

test('autoGrid layering is deterministic and follows longest paths', () => {
  const first = grid.autoGrid(NODES, EDGES);
  const second = grid.autoGrid(NODES, EDGES);
  assert.deepEqual([...first], [...second]);
  const rowOf = (id) => first.get(id).row;
  // Every forward edge points down or sideways; back edges (cycle) are ignored.
  assert.ok(rowOf('catalog') < rowOf('ordering'));
  assert.ok(rowOf('ordering') < rowOf('payments'));
  assert.ok(rowOf('payments') < rowOf('billing'));
  assert.ok(rowOf('identity') < rowOf('ordering'));
  // Columns are dense from 0 within a layer.
  const layerCols = new Map();
  for (const [, cell] of first) {
    if (!layerCols.has(cell.row)) layerCols.set(cell.row, []);
    layerCols.get(cell.row).push(cell.col);
  }
  for (const cols of layerCols.values()) assert.deepEqual(cols.sort((x, y) => x - y), cols.map((_, i) => i));
});

test('autoGrid terminates on cycles and self loops, and wraps at maxCols', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }, { from: 'a', to: 'a' }];
  const cells = grid.autoGrid(nodes, edges);
  assert.deepEqual([...cells], [['a', { row: 0, col: 0 }], ['b', { row: 1, col: 0 }], ['c', { row: 2, col: 0 }]]);
  const wide = Array.from({ length: 7 }, (_, i) => ({ id: `n${i}` }));
  const wrapped = grid.autoGrid(wide, [], { maxCols: 3 });
  assert.deepEqual(wrapped.get('n0'), { row: 0, col: 0 });
  assert.deepEqual(wrapped.get('n3'), { row: 1, col: 0 });
  assert.deepEqual(wrapped.get('n6'), { row: 2, col: 0 });
  // A fixed cell is honoured and never double-booked.
  const mixed = grid.autoGrid([{ id: 'x', row: 0, col: 0 }, { id: 'y' }], []);
  assert.deepEqual(mixed.get('x'), { row: 0, col: 0 });
  assert.deepEqual(mixed.get('y'), { row: 0, col: 1 });
});

// ---- spreadPorts -------------------------------------------------------------------

function parallelOverlap(p, q) {
  // Collinear segments on the same axis that share any length.
  const [a1, a2] = p; const [b1, b2] = q;
  const pv = a1[0] === a2[0]; const qv = b1[0] === b2[0];
  if (pv !== qv) return false;
  if (pv) {
    if (a1[0] !== b1[0]) return false;
    return Math.max(Math.min(a1[1], a2[1]), Math.min(b1[1], b2[1])) < Math.min(Math.max(a1[1], a2[1]), Math.max(b1[1], b2[1]));
  }
  if (a1[1] !== b1[1]) return false;
  return Math.max(Math.min(a1[0], a2[0]), Math.min(b1[0], b2[0])) < Math.min(Math.max(a1[0], a2[0]), Math.max(b1[0], b2[0]));
}

test('spreadPorts separates parallel edges so no segments overlap', () => {
  const boxes = grid.placeNodes(NODES, EDGES);
  const spread = route.spreadPorts(EDGES, boxes);
  const [charge, placed] = [spread.get(EDGES[0]), spread.get(EDGES[1])];
  assert.ok(charge && placed, 'both same-pair edges are spread');
  assert.notDeepEqual(charge.from, placed.from);
  assert.notDeepEqual(charge.to, placed.to);
  assert.notEqual(charge.fromOffset, placed.fromOffset);
  const routed = route.routeEdges(EDGES, boxes);
  for (let i = 0; i < routed.length; i += 1) {
    for (let j = i + 1; j < routed.length; j += 1) {
      const p = routed[i].points; const q = routed[j].points;
      for (let a = 0; a < p.length - 1; a += 1) {
        for (let b = 0; b < q.length - 1; b += 1) {
          assert.equal(parallelOverlap([p[a], p[a + 1]], [q[b], q[b + 1]]), false,
            `${EDGES[i].from}->${EDGES[i].to} and ${EDGES[j].from}->${EDGES[j].to} share a segment`);
        }
      }
    }
  }
});

// ---- SVG primitives ------------------------------------------------------------------

test('svg primitives escape, fit and carry the DOM contract', () => {
  assert.equal(svg.esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(textfit.textUnits('abc'), 3);
  assert.equal(textfit.textUnits('日本'), 4);
  assert.equal(textfit.fittedFontSize('x'.repeat(40), 100, 12, 8), 8);
  const box = grid.componentBox({ id: 'order-management', label: 'Order Management', row: 0, col: 0 });
  const node = svg.boxed('A very long bounded context name that will not fit', 'core domain', 'ACL', box, { kind: 'core', diagramId: 'map' });
  assert.match(node, /data-node-id="order-management"/);
  assert.match(node, /data-kind="core"/);
  assert.match(node, /class="node n-core"/);
  assert.match(node, /…</, 'over-long label is truncated with an ellipsis');
  assert.doesNotMatch(node, /fill="#|stroke="#/, 'no inline colours');
  const e = svg.edge('map', { d: 'M 0 0 L 10 0', kind: 'async', from: 'a', to: 'b', label: 'x', labelAt: [5, -6] });
  assert.match(e, /data-edge="a-&gt;b"/, 'attribute values are escaped; the browser decodes them back to a->b');
  assert.match(e, /marker-end="url\(#map-arrow-async\)"/);
  const doc = svg.svgDocument({ id: 'map', title: 'Map', width: 100.4, height: 50, body: node + e });
  assert.match(doc, /<svg [^>]*data-diagram="map"/);
  assert.match(doc, /viewBox="0 0 101 50"/);
  assert.match(doc, /prefers-color-scheme:dark/);
  assert.match(doc, /id="map-arrow-sync"/);
  const embedded = svg.svgDocument({ id: 'map', width: 10, height: 10, body: '', standalone: false });
  assert.doesNotMatch(embedded, /<style>/);
  assert.doesNotMatch(embedded, /^<\?xml/);
});

test('legend lists only the kinds used and wraps to the width', () => {
  const used = legend.usedKinds(NODES, EDGES);
  assert.deepEqual(used.edges, ['sync', 'async', 'query', 'dependency']);
  const html = legend.legend(used, { diagramId: 'map', width: 400 });
  assert.match(html, /Core domain/);
  assert.match(html, /Async event/);
  assert.doesNotMatch(html, /Aggregate/);
  assert.equal(legend.legend({ nodes: [], edges: [] }), '');
  assert.ok(legend.legendHeight(used, { width: 200 }) > legend.legendHeight(used, { width: 2000 }));
});

// ---- Chrome ----------------------------------------------------------------------------

test('svgToPng resolves {ok:false} with the note when DDD_NO_CHROME=1', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddd-render-test-'));
  try {
    const file = path.join(dir, 'tiny.svg');
    fs.writeFileSync(file, svg.svgDocument({ id: 't', width: 40, height: 20, body: '' }));
    const result = await svgToPng(file, path.join(dir, 'tiny.png'), { env: { DDD_NO_CHROME: '1' } });
    assert.deepEqual(result, { ok: false, note: 'No Chrome/Chromium found; PNG skipped. Set CHROME_PATH to enable.' });
    assert.equal(result.note, NO_CHROME_NOTE);
    assert.equal(fs.existsSync(path.join(dir, 'tiny.png')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('findChrome never throws and honours overrides', () => {
  assert.equal(findChrome({ env: { DDD_NO_CHROME: '1' } }), null);
  assert.equal(findChrome({ env: { CHROME_PATH: path.join(here, 'definitely-missing') } }), null);
  for (const platform of ['darwin', 'linux', 'win32', 'plan9']) {
    assert.doesNotThrow(() => findChrome({ env: {}, platform }));
  }
  const found = findChrome();
  assert.ok(found === null || (typeof found === 'string' && fs.existsSync(found)));
});

// ---- layout.mjs over vendored elkjs ------------------------------------------------------
//
// Fixture: 12 nodes, 16 edges, 3 groups (checks/1.2.1/fixture.mjs). Grid
// cell for the stability test is layout.GRID_UNIT (8 px): every position is
// snapped to it, so "moved by at most one grid cell" means |dx|,|dy| <= 8.

import { layout, serializeLayout, GRID_UNIT, nodeSize, elkAvailable } from '../lib/render/core/layout.mjs';
import { renderScene } from '../lib/render/core/scene.mjs';
import * as palette from '../lib/render/core/palette.mjs';
import { GRAPH, withLeaf, fixture } from './checks/1.2.1/fixture.mjs';

const ELK_ENV = { ...process.env, DDD_NO_ELK: '' };

test('elkjs is vendored and loads without a worker', () => {
  assert.equal(elkAvailable({ env: ELK_ENV }), true);
  assert.equal(elkAvailable({ env: { DDD_NO_ELK: '1' } }), false);
});

test('layout of the fixture twice gives byte-identical JSON (elk)', async () => {
  const a = await layout(fixture(), { env: ELK_ENV });
  const b = await layout(fixture(), { env: ELK_ENV });
  assert.equal(a.engine, 'elk');
  assert.equal(serializeLayout(a), serializeLayout(b));
  // Input order must not matter either: shuffle nodes and edges.
  const shuffled = fixture();
  shuffled.nodes.reverse();
  shuffled.edges.sort((x, y) => (x.to < y.to ? -1 : 1));
  shuffled.groups.reverse();
  assert.equal(serializeLayout(await layout(shuffled, { env: ELK_ENV })), serializeLayout(a));
  assert.equal(a.nodes.size, 12);
  assert.equal(a.edges.size, 16);
  assert.equal(a.groups.size, 3);
  for (const box of a.nodes.values()) {
    assert.equal(box.x % GRID_UNIT, 0, 'x on the grid');
    assert.equal(box.y % GRID_UNIT, 0, 'y on the grid');
    assert.ok(box.w > 0 && box.h > 0);
  }
  for (const e of a.edges.values()) assert.ok(e.points.length >= 2 && e.labelAt);
  assert.equal(a.warnings.length, 0, a.warnings.join('; '));
});

test('no two node rectangles overlap and no group overlaps a non-member', async () => {
  const laid = await layout(fixture(), { env: ELK_ENV });
  const rects = [...laid.nodes].map(([id, b]) => ({ id, x: b.x, y: b.y, width: b.w, height: b.h }));
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      assert.equal(route.rectsOverlap(rects[i], rects[j]), false, `${rects[i].id} overlaps ${rects[j].id}`);
    }
  }
  for (const g of GRAPH.groups) {
    const box = laid.groups.get(g.id);
    const frame = { x: box.x, y: box.y, width: box.w, height: box.h };
    for (const r of rects) {
      if (g.members.includes(r.id)) {
        assert.ok(r.x >= frame.x && r.y >= frame.y && r.x + r.width <= frame.x + frame.width && r.y + r.height <= frame.y + frame.height, `${r.id} inside ${g.id}`);
      } else {
        assert.equal(route.rectsOverlap(frame, r), false, `group ${g.id} overlaps non-member ${r.id}`);
      }
    }
  }
  // Every edge reaches its endpoints' borders and crosses no unrelated node.
  const boxes = new Map(rects.map((r) => [r.id, r]));
  for (const e of GRAPH.edges) {
    const laidEdge = laid.edges.get(e.id);
    assert.equal(route.crossesUnrelatedNode(laidEdge.points.map((p) => [p.x, p.y]), boxes, [e.from, e.to], { gap: 0 }), null, `${e.id} crosses a node`);
  }
});

test('adding one leaf node + one edge moves no pre-existing node by more than one grid cell (8 px) when the previous layout is supplied', async (t) => {
  // Cell size: layout.GRID_UNIT = 8 px, the grid every position is snapped to.
  // The guarantee comes from layout memory: the previous result (or its
  // serialised JSON, as the review page stores it) is passed as `previous`.
  const before = await layout(fixture(), { env: ELK_ENV });
  const after = await layout(withLeaf(fixture()), { env: ELK_ENV, previous: serializeLayout(before) });
  assert.equal(after.engine, 'elk+incremental');
  assert.equal(after.nodes.size, 13);
  assert.equal(after.edges.size, 17);
  let maxMove = 0;
  for (const [id, b] of before.nodes) {
    const a = after.nodes.get(id);
    const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    maxMove = Math.max(maxMove, d);
    assert.ok(d <= GRID_UNIT, `${id} moved ${d}px (limit ${GRID_UNIT})`);
  }
  assert.equal(maxMove, 0, 'layout memory keeps surviving nodes exactly where they were');
  // The new node sits on the grid, overlaps nothing, and its edge reaches it.
  const leaf = after.nodes.get('analytics');
  assert.ok(leaf && leaf.x % GRID_UNIT === 0 && leaf.y % GRID_UNIT === 0);
  const rects = [...after.nodes].map(([id, b]) => ({ id, x: b.x, y: b.y, width: b.w, height: b.h }));
  for (const r of rects) if (r.id !== 'analytics') assert.equal(route.rectsOverlap(r, { ...leaf, width: leaf.w, height: leaf.h }), false, `leaf overlaps ${r.id}`);
  const e17 = after.edges.get('e17');
  assert.ok(e17.points.length >= 2 && e17.labelAt);
  assert.equal(route.crossesUnrelatedNode(e17.points.map((p) => [p.x, p.y]), new Map(rects.map((r) => [r.id, r])), ['ledger', 'analytics']), null);
  // Edges between unchanged nodes keep their exact routes.
  assert.deepEqual(after.edges.get('e01'), before.edges.get('e01'));
  // Same memory, same picture: incremental is deterministic too.
  assert.equal(serializeLayout(after), serializeLayout(await layout(withLeaf(fixture()), { env: ELK_ENV, previous: before })));
  // A fresh layout (no previous) is deterministic but global; that is
  // measured, not claimed: report the drift so a reader sees the trade-off.
  const fresh = await layout(withLeaf(fixture()), { env: ELK_ENV });
  let freshMove = 0;
  for (const [id, b] of before.nodes) { const a = fresh.nodes.get(id); freshMove = Math.max(freshMove, Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
  t.diagnostic(`fresh ELK layout after adding one leaf moved nodes by up to ${freshMove}px; with previous: ${maxMove}px`);
});

test('contextColor is a pure hash: stable across calls and processes, distinct for the mealkit contexts', async () => {
  const ids = ['subscriptions', 'billing', 'fulfilment'];
  const first = ids.map((id) => palette.contextColor(id));
  const again = ids.map((id) => palette.contextColor(id));
  assert.deepEqual(first, again);
  assert.equal(new Set(first.map((c) => c.slot)).size, 3, 'mealkit contexts share no slot');
  // Insertion order irrelevant: ask in reverse.
  assert.deepEqual([...ids].reverse().map((id) => palette.contextColor(id).slot), first.map((c) => c.slot).reverse());
  // Across process restarts: fresh node process computes the same slots.
  const { execFileSync } = await import('node:child_process');
  const script = `import('${new URL('../lib/render/core/palette.mjs', import.meta.url).href}').then(p => console.log(JSON.stringify(${JSON.stringify(ids)}.map(id => p.contextColor(id).slot))))`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }).trim();
  assert.deepEqual(JSON.parse(out), first.map((c) => c.slot));
  // Known anchors so a future change to the hash or palette is a deliberate one.
  assert.equal(palette.hashId('billing') % palette.CONTEXT_SLOTS.length, first[1].index);
  assert.match(first[0].fill, /^#[0-9a-f]{6}$/);
  assert.notEqual(palette.contextColor('billing', { theme: 'dark' }).fill, first[1].fill);
  // Sticky and edge vocabularies are total functions.
  assert.equal(palette.stickyColor('hotspot').kind, 'hotspot');
  assert.equal(palette.stickyColor('nope').kind, 'event');
  assert.equal(palette.edgeStyle('async').kind, 'event');
  assert.equal(palette.edgeStyle('event').marker, 'open');
  assert.equal(palette.edgeStyle('sync').kind, 'command');
  assert.match(palette.paletteCss(), /--ctx-indigo-fill/);
});

test('fallback: with elk disabled (DDD_NO_ELK=1) layout still returns positions and a warning', async () => {
  const laid = await layout(fixture(), { env: { DDD_NO_ELK: '1' } });
  assert.equal(laid.engine, 'grid');
  assert.equal(laid.nodes.size, 12);
  assert.equal(laid.edges.size, 16);
  assert.ok(laid.warnings.some((w) => /elk unavailable/.test(w)), laid.warnings.join('; '));
  for (const b of laid.nodes.values()) assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && b.w > 0);
  for (const e of laid.edges.values()) assert.ok(e.points.length >= 2);
  const viaOption = await layout(fixture(), { engine: 'grid', env: ELK_ENV });
  assert.equal(viaOption.engine, 'grid');
  assert.equal(serializeLayout(await layout(fixture(), { engine: 'grid' })), serializeLayout(viaOption));
  const doc = renderScene(GRAPH, laid, { id: 'fallback' });
  assert.match(doc, /data-node-id="billing"/);
});

test('renderScene carries the visual language into the DOM', async () => {
  const laid = await layout(fixture(), { env: ELK_ENV });
  const doc = renderScene(GRAPH, laid, { id: 'ctx-map', title: 'Context map', caption: true });
  assert.match(doc, /<svg [^>]*data-diagram="ctx-map"/);
  const slot = palette.contextColor('billing').slot;
  assert.match(doc, new RegExp(`class="node-group ctx-${slot}"[^>]*data-node-id="billing"`));
  assert.match(doc, /class="edge e-async edge-event"/);
  assert.match(doc, /class="edge e-sync edge-command"/);
  assert.match(doc, /class="edge e-query edge-query"/);
  assert.match(doc, /class="edge e-dependency edge-dependency"/);
  assert.match(doc, /--font-title/);
  assert.match(doc, /Domain event/);
  assert.match(doc, /Bounded context/);
  assert.doesNotMatch(doc, /fill="#|stroke="#/, 'no inline colours');
  assert.equal(nodeSize({ label: 'x' }).w % GRID_UNIT, 0);
  assert.equal(await layout({ nodes: [] }).then((l) => l.engine), 'none');
});
