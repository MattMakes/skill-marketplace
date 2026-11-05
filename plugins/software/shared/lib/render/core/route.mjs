// derived from archify: renderers/shared/geometry.mjs (MIT)
// derived from archify: renderers/architecture/render-architecture.mjs (MIT)
//
// Orthogonal edge routing between measured boxes ({x, y, width, height, cx,
// cy}). Every function is pure. The router tries a bounded list of candidate
// channels and takes the first that clears every unrelated box; it never
// searches a grid, so a 15-context map with 40 edges still routes instantly.

import { textWidth } from './textfit.mjs';

export function isFinitePoint(...coords) {
  return coords.every((c) => Number.isFinite(c));
}

export function rectsOverlap(a, b, gap = 0) {
  // Non-finite geometry means "unknown", not "overlapping"; every comparison
  // below is false for NaN, so without this guard the negation reports a
  // collision for every pair.
  if (!isFinitePoint(a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height)) return false;
  return !(
    a.x + a.width + gap <= b.x
    || b.x + b.width + gap <= a.x
    || a.y + a.height + gap <= b.y
    || b.y + b.height + gap <= a.y
  );
}

// Touching the border counts as intersecting (pointInBox is inclusive), so
// callers wanting clearance pass a gap.
export function segmentIntersectsRect(segment, rect, gap = 0) {
  const box = {
    x1: rect.x - gap,
    y1: rect.y - gap,
    x2: rect.x + rect.width + gap,
    y2: rect.y + rect.height + gap,
  };
  const [a, b] = [segment.start, segment.end];
  if (pointInBox(a, box) || pointInBox(b, box)) return true;
  return (
    segmentsIntersect(a, b, [box.x1, box.y1], [box.x2, box.y1])
    || segmentsIntersect(a, b, [box.x2, box.y1], [box.x2, box.y2])
    || segmentsIntersect(a, b, [box.x2, box.y2], [box.x1, box.y2])
    || segmentsIntersect(a, b, [box.x1, box.y2], [box.x1, box.y1])
  );
}

function pointInBox(point, box) {
  return point[0] >= box.x1 && point[0] <= box.x2 && point[1] >= box.y1 && point[1] <= box.y2;
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return o1 !== o2 && o3 !== o4;
}

function orientation(a, b, c) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 0.0001) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    b[0] <= Math.max(a[0], c[0])
    && b[0] >= Math.min(a[0], c[0])
    && b[1] <= Math.max(a[1], c[1])
    && b[1] >= Math.min(a[1], c[1])
  );
}

// ---- Ports ------------------------------------------------------------------------

export function anchor(rect, side) {
  switch (side) {
    case 'left': return [rect.x, rect.cy];
    case 'right': return [rect.x + rect.width, rect.cy];
    case 'top': return [rect.cx, rect.y];
    case 'bottom': return [rect.cx, rect.y + rect.height];
    default: return [rect.x + rect.width, rect.cy];
  }
}

// Default sides prefer the vertical axis when the boxes are in different
// rows, because autoGrid lays flow out top to bottom; archify prefers the
// horizontal axis first, which suits its hand-placed grids better.
export function defaultFromSide(from, to) {
  if (Math.abs(to.cy - from.cy) > Math.abs(to.cx - from.cx)) return to.cy > from.cy ? 'bottom' : 'top';
  if (to.cx < from.cx) return 'left';
  if (to.cx > from.cx) return 'right';
  return to.cy > from.cy ? 'bottom' : 'top';
}

export function defaultToSide(from, to) {
  if (Math.abs(to.cy - from.cy) > Math.abs(to.cx - from.cx)) return to.cy > from.cy ? 'top' : 'bottom';
  if (to.cx < from.cx) return 'right';
  if (to.cx > from.cx) return 'left';
  return to.cy > from.cy ? 'top' : 'bottom';
}

export function chosenSide(side, fallback) {
  return side && side !== 'auto' ? side : fallback;
}

// Parallel edges that share a box side would leave from the same point and
// overlap for their whole first segment. Spread them along the side, ordered
// by the counterpart's position so the lines do not cross each other, and
// remember each edge's offset so the router can shift its channel by the same
// amount (otherwise two spread edges between the same pair still merge on the
// middle segment). Returns Map edge -> { from?, to?, fromOffset?, toOffset? }.
export function spreadPorts(edges, boxes, { gutter = 12, maxSpacing = 16, sideFor } = {}) {
  const groups = new Map();
  const spread = new Map();
  const add = (edge, endpoint, rect, side, counterpart) => {
    const key = `${rect.id} ${side}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ edge, endpoint, rect, side, counterpart });
  };
  for (const [i, edge] of edges.entries()) {
    if (!edge) continue;
    const from = boxes.get(edge.from);
    const to = boxes.get(edge.to);
    if (!from || !to) continue;
    const sides = sideFor ? sideFor(edge) : {};
    const fromSide = chosenSide(edge.fromSide, sides.fromSide || defaultFromSide(from, to));
    const toSide = chosenSide(edge.toSide, sides.toSide || defaultToSide(from, to));
    add(edge, 'from', from, fromSide, { box: to, order: i });
    add(edge, 'to', to, toSide, { box: from, order: i });
  }
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    const verticalSide = items[0].side === 'left' || items[0].side === 'right';
    items.sort((a, b) => {
      const ac = verticalSide ? a.counterpart.box.cy : a.counterpart.box.cx;
      const bc = verticalSide ? b.counterpart.box.cy : b.counterpart.box.cx;
      if (ac !== bc) return ac - bc;
      return a.counterpart.order - b.counterpart.order;
    });
    const extent = verticalSide ? items[0].rect.height : items[0].rect.width;
    const usable = Math.max(0, extent - gutter * 2);
    const spacing = Math.min(maxSpacing, usable / (items.length - 1));
    if (!(spacing > 0)) continue;
    for (const [index, item] of items.entries()) {
      const offset = (index - (items.length - 1) / 2) * spacing;
      const point = anchor(item.rect, item.side);
      if (verticalSide) point[1] += offset; else point[0] += offset;
      const entry = spread.get(item.edge) || {};
      entry[item.endpoint] = point;
      entry[`${item.endpoint}Offset`] = offset;
      spread.set(item.edge, entry);
    }
  }
  return spread;
}

// ---- Paths -------------------------------------------------------------------------

function r(n) {
  return Math.round(n * 10) / 10;
}

export function polylinePath(points) {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${r(x)} ${r(y)}`).join(' ');
}

export function roundedPath(points, radius = 8) {
  if (points.length < 3 || radius <= 0) return polylinePath(points);
  const commands = [`M ${r(points[0][0])} ${r(points[0][1])}`];
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const prevLen = Math.hypot(cx - px, cy - py);
    const nextLen = Math.hypot(nx - cx, ny - cy);
    const rad = Math.min(radius, prevLen / 2, nextLen / 2);
    if (rad < 1) { commands.push(`L ${r(cx)} ${r(cy)}`); continue; }
    const before = [cx - ((cx - px) / prevLen) * rad, cy - ((cy - py) / prevLen) * rad];
    const after = [cx + ((nx - cx) / nextLen) * rad, cy + ((ny - cy) / nextLen) * rad];
    commands.push(`L ${r(before[0])} ${r(before[1])}`);
    commands.push(`Q ${r(cx)} ${r(cy)} ${r(after[0])} ${r(after[1])}`);
  }
  const [ex, ey] = points[points.length - 1];
  commands.push(`L ${r(ex)} ${r(ey)}`);
  return commands.join(' ');
}

// Drop repeated and collinear intermediate points so the path has one
// segment per turn; label placement and crossing checks rely on that.
export function normalizePoints(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    out.push(p);
  }
  for (let i = 1; i < out.length - 1;) {
    const [a, b, c] = [out[i - 1], out[i], out[i + 1]];
    const collinear = (a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]);
    if (collinear) out.splice(i, 1); else i += 1;
  }
  return out;
}

// Segment midpoints as label candidates, best first: a horizontal segment
// long enough to sit a label on beats a vertical one (a label beside a
// vertical run covers whatever is in the neighbouring column), then longer
// beats shorter.
export function labelCandidates(points, { minHorizontal = 40 } = {}) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [a, b] = [points[i], points[i + 1]];
    const horizontal = a[1] === b[1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (horizontal ? -6 : 3)], len, horizontal });
  }
  if (!segs.length) return [{ at: points[0] ? [...points[0]] : [0, 0], len: 0, horizontal: true }];
  const long = segs.filter((s) => s.horizontal && s.len >= minHorizontal).sort((x, y) => y.len - x.len);
  const rest = segs.filter((s) => !long.includes(s)).sort((x, y) => y.len - x.len);
  return [...long, ...rest];
}

// Label anchor: the best candidate above.
export function labelPoint(points) {
  return labelCandidates(points)[0].at;
}

// Places edge labels so they cover neither a box nor an earlier label. Each
// label tries its route's candidates, each with a few vertical nudges, and
// falls back to the first candidate when nothing is free. `routed[i]` gains
// `labelAt` and `labelRect`; edges without a label are left alone.
export function placeLabels(routed, edges, boxes, { fontSize = 10, labelObstacles = [] } = {}) {
  const obstacles = [...(boxes instanceof Map ? [...boxes.values()] : boxes), ...labelObstacles]
    .filter((b) => b && Number.isFinite(b.x));
  const placed = [];
  // Nudges are tried nearest first, vertical before horizontal, so a label
  // stays as close to its segment midpoint as the neighbours allow.
  const nudges = [];
  for (const dy of [0, 14, -14, 28, -28, 42, -42]) for (const dx of [0, 24, -24, 48, -48]) nudges.push([dx, dy]);
  nudges.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  routed.forEach((route, i) => {
    const label = edges[i]?.label;
    if (!route || !label) return;
    // Same measure as svg.edge() uses for the label mask, so the reserved
    // rect and the drawn mask agree (including for wide CJK glyphs).
    const w = textWidth(label, fontSize) + 8;
    const h = fontSize + 5;
    const rectAt = ([x, y]) => ({ x: x - w / 2, y: y - fontSize, width: w, height: h });
    let chosen = null;
    outer: for (const candidate of labelCandidates(route.points)) {
      for (const [dx, dy] of nudges) {
        const at = [candidate.at[0] + dx, candidate.at[1] + dy];
        const rect = rectAt(at);
        const free = !obstacles.some((b) => rectsOverlap(rect, b)) && !placed.some((p) => rectsOverlap(rect, p, 2));
        if (free) { chosen = at; break outer; }
      }
    }
    if (!chosen) chosen = labelCandidates(route.points)[0].at;
    route.labelAt = chosen.map(r);
    route.labelRect = rectAt(chosen);
    placed.push(route.labelRect);
  });
  return routed;
}

// ---- Routing -------------------------------------------------------------------------

// Every box in `boxes` other than `exclude` is opaque. Returns the first box
// any segment crosses, or null. `gap` gives a little clearance so a line does
// not graze a border.
export function crossesUnrelatedNode(points, boxes, exclude = [], { gap = 2 } = {}) {
  const skip = new Set(Array.isArray(exclude) ? exclude : [exclude]);
  const list = boxes instanceof Map ? [...boxes.values()] : boxes;
  for (const box of list) {
    if (!box || skip.has(box.id)) continue;
    for (let i = 0; i < points.length - 1; i += 1) {
      if (segmentIntersectsRect({ start: points[i], end: points[i + 1] }, box, gap)) return box;
    }
  }
  return null;
}

function crossingCount(points, obstacles, gap) {
  let n = 0;
  for (const box of obstacles) {
    for (let i = 0; i < points.length - 1; i += 1) {
      if (segmentIntersectsRect({ start: points[i], end: points[i + 1] }, box, gap)) { n += 1; break; }
    }
  }
  return n;
}

// A segment leaving a port must head away from the box (a route that exits
// the top and immediately turns back down reads as if it came from below).
function honoursSide(points, side, atStart) {
  const [a, b] = atStart ? [points[0], points[1]] : [points[points.length - 1], points[points.length - 2]];
  if (!b) return true;
  switch (side) {
    case 'top': return b[1] <= a[1];
    case 'bottom': return b[1] >= a[1];
    case 'left': return b[0] <= a[0];
    case 'right': return b[0] >= a[0];
    default: return true;
  }
}

// Free coordinates between obstacle extents on one axis: the midpoints of
// the gaps between consecutive (merged) extents, plus one just outside either
// end. Sorted by distance from the midpoint of the edge so the most direct
// corridor is tried first.
function corridors(obstacles, axis, lo, hi, gap) {
  const extents = obstacles.map((b) => (axis === 'x'
    ? [b.x - gap, b.x + b.width + gap]
    : [b.y - gap, b.y + b.height + gap])).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const e of extents) {
    const last = merged[merged.length - 1];
    if (last && e[0] <= last[1]) last[1] = Math.max(last[1], e[1]); else merged.push([...e]);
  }
  const out = [];
  for (let i = 0; i < merged.length - 1; i += 1) out.push((merged[i][1] + merged[i + 1][0]) / 2);
  if (merged.length) {
    out.push(merged[0][0] - gap);
    out.push(merged[merged.length - 1][1] + gap);
  }
  const mid = (lo + hi) / 2;
  return [...new Set(out.map((v) => Math.round(v)))].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
}

// Collinear segments on the same axis that share some length: two edges
// drawn on top of each other, which a reader cannot tell apart.
function segmentsOverlap(p, q) {
  const [a1, a2] = p;
  const [b1, b2] = q;
  const pv = a1[0] === a2[0];
  const qv = b1[0] === b2[0];
  if (pv !== qv) return false;
  const axis = pv ? 1 : 0;
  const fixed = pv ? 0 : 1;
  if (Math.abs(a1[fixed] - b1[fixed]) > 0.5) return false;
  const lo = Math.max(Math.min(a1[axis], a2[axis]), Math.min(b1[axis], b2[axis]));
  const hi = Math.min(Math.max(a1[axis], a2[axis]), Math.max(b1[axis], b2[axis]));
  return lo < hi;
}

function overlapCount(points, avoid) {
  let n = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    for (const seg of avoid) if (segmentsOverlap([points[i], points[i + 1]], seg)) n += 1;
  }
  return n;
}

// Route one edge. Options:
//   fromSide/toSide  'top' | 'bottom' | 'left' | 'right' | 'auto'
//   route            'auto' | 'orthogonal-h' (horizontal first) | 'orthogonal-v'
//   obstacles        boxes the path should avoid (from/to are ignored)
//   start/end        pre-spread port points from spreadPorts()
//   offset           channel shift (a spreadPorts offset) so parallel edges keep apart
//   avoid            segments of already routed edges; running along one is penalised
// Returns { points, d, labelAt, fromSide, toSide, crossings }.
export function connectionPath(fromBox, toBox, {
  fromSide: fs = 'auto', toSide: ts = 'auto', route = 'auto', obstacles = [], start, end,
  offset = 0, gap = 4, radius = 8, avoid = [],
} = {}) {
  const fromSide = chosenSide(fs, defaultFromSide(fromBox, toBox));
  const toSide = chosenSide(ts, defaultToSide(fromBox, toBox));
  const s = start || anchor(fromBox, fromSide);
  const e = end || anchor(toBox, toSide);
  const others = (obstacles instanceof Map ? [...obstacles.values()] : obstacles)
    .filter((b) => b && b.id !== fromBox.id && b.id !== toBox.id && Number.isFinite(b.x));

  const hFirst = (x) => [s, [x, s[1]], [x, e[1]], e];
  const vFirst = (y) => [s, [s[0], y], [e[0], y], e];
  const midX = (s[0] + e[0]) / 2 + offset;
  const midY = (s[1] + e[1]) / 2 + offset;

  let candidates;
  if (route === 'orthogonal-h') candidates = [hFirst(midX)];
  else if (route === 'orthogonal-v') candidates = [vFirst(midY)];
  else {
    candidates = [];
    // Straight when the ports line up, the common case for neighbouring rows.
    if (Math.abs(s[0] - e[0]) < 1 || Math.abs(s[1] - e[1]) < 1) candidates.push([s, e]);
    const vertical = fromSide === 'top' || fromSide === 'bottom';
    // Two-bend routes: the natural one for the port axis first, then a channel
    // in every free corridor between the obstacles.
    const primary = vertical ? vFirst : hFirst;
    const secondary = vertical ? hFirst : vFirst;
    const ys = corridors(others, 'y', Math.min(s[1], e[1]), Math.max(s[1], e[1]), gap);
    const xs = corridors(others, 'x', Math.min(s[0], e[0]), Math.max(s[0], e[0]), gap);
    // Each corridor is also tried a little to either side, so a second edge
    // sharing the corridor with an earlier one can step aside instead of
    // running on top of it.
    const shifted = (list) => list.flatMap((v) => [v, v + 10, v - 10]);
    candidates.push(primary(vertical ? midY : midX));
    for (const v of shifted(vertical ? ys : xs)) candidates.push(primary(v + offset));
    candidates.push(secondary(vertical ? midX : midY));
    for (const v of shifted(vertical ? xs : ys)) candidates.push(secondary(v + offset));
    // Three-bend routes: exit on the port axis into a corridor, run along the
    // other axis in a second corridor, then come in on the target's axis.
    // This is what lets an edge that skips a layer go around, not through.
    const stub = 16;
    const inX = e[0] + (toSide === 'left' ? -stub : toSide === 'right' ? stub : 0);
    const inY = e[1] + (toSide === 'top' ? -stub : toSide === 'bottom' ? stub : 0);
    for (const c1 of (vertical ? ys : xs).slice(0, 5)) {
      for (const c2 of (vertical ? xs : ys).slice(0, 5)) {
        candidates.push(vertical
          ? [s, [s[0], c1 + offset], [c2 + offset, c1 + offset], [c2 + offset, inY], [e[0], inY], e]
          : [s, [c1 + offset, s[1]], [c1 + offset, c2 + offset], [inX, c2 + offset], [inX, e[1]], e]);
      }
    }
  }

  let best = null;
  for (const raw of candidates) {
    const points = normalizePoints(raw);
    if (!points.every((p) => isFinitePoint(...p))) continue;
    const sideOk = honoursSide(points, fromSide, true) && honoursSide(points, toSide, false);
    const crossings = crossingCount(points, others, gap);
    const overlaps = avoid.length ? overlapCount(points, avoid) : 0;
    const score = crossings * 10 + (sideOk ? 0 : 5) + overlaps * 3 + (points.length - 2);
    if (!best || score < best.score) best = { points, crossings, score };
    if (crossings === 0 && sideOk && overlaps === 0 && points.length <= 4) break;
  }
  const points = best ? best.points : normalizePoints([s, e]);
  return {
    points: points.map(([x, y]) => [r(x), r(y)]),
    d: roundedPath(points, radius),
    labelAt: labelPoint(points).map(r),
    fromSide,
    toSide,
    crossings: best ? best.crossings : 0,
  };
}

// Convenience for generators: spread ports, route every edge with all the
// other boxes as obstacles, then place the labels. `labelObstacles` are extra
// rects labels must keep clear of (boundary title rects, typically). Returns
// an array parallel to `edges` of connectionPath results (null where an
// endpoint is unknown).
export function routeEdges(edges, boxes, { gap = 4, radius = 8, labelFontSize = 10, labelObstacles = [] } = {}) {
  const ports = spreadPorts(edges, boxes);
  const avoid = [];
  const routed = edges.map((edge) => {
    const from = boxes.get(edge.from);
    const to = boxes.get(edge.to);
    if (!from || !to) return null;
    const port = ports.get(edge) || {};
    const offset = port.fromOffset ?? port.toOffset ?? 0;
    const result = connectionPath(from, to, {
      fromSide: edge.fromSide,
      toSide: edge.toSide,
      route: edge.route,
      obstacles: boxes,
      start: port.from,
      end: port.to,
      offset,
      gap,
      radius,
      avoid,
    });
    for (let i = 0; i < result.points.length - 1; i += 1) avoid.push([result.points[i], result.points[i + 1]]);
    return result;
  });
  return placeLabels(routed, edges, boxes, { fontSize: labelFontSize, labelObstacles });
}
