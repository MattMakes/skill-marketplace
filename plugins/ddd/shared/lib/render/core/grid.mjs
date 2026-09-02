// derived from archify: renderers/architecture/grid.mjs (MIT)
// derived from archify: renderers/shared/layout-report.mjs (MIT)
// derived from archify: renderers/architecture/render-architecture.mjs (MIT)
//
// Grid placement: row/col cells become x/y, nodes become measured boxes,
// boundaries wrap their member boxes with padding. autoGrid() assigns cells
// when the caller does not, by longest-path layering, so every diagram has a
// deterministic layout with no auto-layout engine.

import { textWidth } from './textfit.mjs';

export const DEFAULT_GRID = {
  origin: [40, 60],
  cellW: 160,
  cellH: 64,
  gapX: 48,
  gapY: 56,
};

// Boundary padding: pad on left/right, a taller top band so the frame label
// never collides with the first member, and a little extra at the bottom so
// the frame reads as containing rather than clipping its members.
export const BOUNDARY = {
  pad: 24,
  top: 30,
  bottom: 12,
};

export function gridSettings(overrides = {}) {
  return { ...DEFAULT_GRID, ...overrides };
}

// Top-left corner of the cell at (row, col).
export function cellToXY(row, col, grid = DEFAULT_GRID) {
  const [ox, oy] = grid.origin;
  return [ox + col * (grid.cellW + grid.gapX), oy + row * (grid.cellH + grid.gapY)];
}

function hasCell(node) {
  return Number.isInteger(node.row) && Number.isInteger(node.col);
}

function hasPos(node) {
  return Array.isArray(node.pos) && node.pos.length === 2;
}

// A measured box for one node. Explicit `pos` wins over row/col; explicit
// `size` wins over the cell size. cx/cy are precomputed because routing and
// port selection read them constantly.
export function componentBox(node, grid = DEFAULT_GRID) {
  const [w, h] = Array.isArray(node.size) ? node.size : [grid.cellW, grid.cellH];
  let x; let y;
  if (hasPos(node)) [x, y] = node.pos;
  else if (hasCell(node)) [x, y] = cellToXY(node.row, node.col, grid);
  else [x, y] = [NaN, NaN];
  return {
    id: node.id,
    label: node.label ?? node.id,
    kind: node.kind,
    x, y, width: w, height: h,
    cx: x + w / 2,
    cy: y + h / 2,
    ...(Number.isInteger(node.row) ? { row: node.row } : {}),
    ...(Number.isInteger(node.col) ? { col: node.col } : {}),
  };
}

// Places every node. Nodes without a cell (or pos) are laid out by autoGrid,
// which also respects the cells the caller did fix. Returns Map id -> box in
// input order.
export function placeNodes(nodes, edges = [], grid = DEFAULT_GRID, { maxCols } = {}) {
  const needsAuto = nodes.some((n) => !(hasPos(n) || hasCell(n)));
  const cells = needsAuto ? autoGrid(nodes, edges, { maxCols }) : new Map();
  const boxes = new Map();
  for (const node of nodes) {
    const cell = cells.get(node.id);
    const placed = cell && !(hasPos(node) || hasCell(node)) ? { ...node, row: cell.row, col: cell.col } : node;
    boxes.set(node.id, componentBox(placed, grid));
  }
  return boxes;
}

// Frame around a set of member boxes. The label band is reserved on top.
export function boundaryBox(members, {
  label, kind = 'boundary', id, pad = BOUNDARY.pad, top = BOUNDARY.top, bottom = BOUNDARY.bottom,
} = {}) {
  const list = members.filter((m) => m && Number.isFinite(m.x) && Number.isFinite(m.y));
  if (!list.length) return null;
  const minX = Math.min(...list.map((m) => m.x));
  const minY = Math.min(...list.map((m) => m.y));
  const maxX = Math.max(...list.map((m) => m.x + m.width));
  const maxY = Math.max(...list.map((m) => m.y + m.height));
  const x = minX - pad;
  const y = minY - top;
  const width = maxX - minX + pad * 2;
  // The title sits in the top-left corner; its rect is exposed so edge label
  // placement can keep clear of it (svg.boundary draws it at the same spot).
  const titleRect = label
    ? { x: x + 8, y: y + 2, width: Math.min(width - 12, textWidth(label, 11) + 10), height: 16 }
    : null;
  return {
    id, label, kind,
    x, y, width,
    height: maxY - minY + top + bottom,
    cx: (minX + maxX) / 2,
    cy: (minY - top + maxY + bottom) / 2,
    wraps: list.map((m) => m.id),
    titleRect,
  };
}

// Canvas size that contains every box and boundary plus a margin.
export function canvasSize(boxes, boundaries = [], {
  margin = 40, minWidth = 320, minHeight = 160, extraBottom = 0,
} = {}) {
  const all = [...(boxes instanceof Map ? boxes.values() : boxes), ...boundaries]
    .filter((b) => b && Number.isFinite(b.x) && Number.isFinite(b.y));
  const width = Math.max(minWidth, ...all.map((b) => b.x + b.width)) + margin;
  const height = Math.max(minHeight, ...all.map((b) => b.y + b.height)) + margin + extraBottom;
  return { width: Math.ceil(width), height: Math.ceil(height) };
}

// ---- Automatic placement ------------------------------------------------------

// Longest-path layering: a node's row is one more than the deepest of its
// predecessors, so an edge always points downward (or sideways) and readers
// can follow flow top to bottom. Cycles are broken by ignoring back edges in
// a DFS from the nodes in input order, which keeps the result deterministic.
// Columns are the node's order within its layer, in input order, unless
// `maxCols` wraps a wide layer onto extra rows (a 15-context map with sparse
// edges would otherwise be one row of 15 columns).
export function autoGrid(nodes, edges = [], { maxCols } = {}) {
  const ids = nodes.map((n) => n.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const out = new Map(ids.map((id) => [id, []]));
  for (const e of edges) {
    if (!e || !index.has(e.from) || !index.has(e.to) || e.from === e.to) continue;
    if (!out.get(e.from).includes(e.to)) out.get(e.from).push(e.to);
  }
  for (const list of out.values()) list.sort((a, b) => index.get(a) - index.get(b));

  // Iterative DFS that classifies back edges (target is on the current stack).
  const state = new Map();
  const back = new Set();
  for (const root of ids) {
    if (state.get(root)) continue;
    const stack = [[root, 0]];
    state.set(root, 'open');
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const [node, i] = frame;
      const next = out.get(node)[i];
      if (next === undefined) { state.set(node, 'done'); stack.pop(); continue; }
      frame[1] = i + 1;
      if (state.get(next) === 'open') back.add(`${node} ${next}`);
      else if (!state.get(next)) { state.set(next, 'open'); stack.push([next, 0]); }
    }
  }

  const indeg = new Map(ids.map((id) => [id, 0]));
  const fwd = new Map(ids.map((id) => [id, []]));
  for (const [from, targets] of out) {
    for (const to of targets) {
      if (back.has(`${from} ${to}`)) continue;
      fwd.get(from).push(to);
      indeg.set(to, indeg.get(to) + 1);
    }
  }
  const layer = new Map(ids.map((id) => [id, 0]));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  while (queue.length) {
    const id = queue.shift();
    for (const to of fwd.get(id)) {
      layer.set(to, Math.max(layer.get(to), layer.get(id) + 1));
      indeg.set(to, indeg.get(to) - 1);
      if (indeg.get(to) === 0) queue.push(to);
    }
  }

  // Fixed cells are honoured; automatic nodes fill the remaining columns of
  // their layer, wrapping when maxCols is set.
  const fixed = new Map();
  for (const n of nodes) if (hasCell(n)) fixed.set(n.id, { row: n.row, col: n.col });
  const taken = new Set([...fixed.values()].map((c) => `${c.row},${c.col}`));
  const layers = new Map();
  for (const id of ids) {
    if (fixed.has(id)) continue;
    const l = layer.get(id);
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l).push(id);
  }
  const cells = new Map(fixed);
  let rowOffset = 0;
  for (const l of [...layers.keys()].sort((a, b) => a - b)) {
    let row = l + rowOffset;
    let col = 0;
    for (const id of layers.get(l)) {
      while (taken.has(`${row},${col}`)) col += 1;
      if (maxCols && col >= maxCols) {
        row += 1;
        rowOffset += 1;
        col = 0;
        while (taken.has(`${row},${col}`)) col += 1;
      }
      cells.set(id, { row, col });
      taken.add(`${row},${col}`);
      col += 1;
    }
  }
  return new Map(ids.map((id) => [id, cells.get(id)]));
}
