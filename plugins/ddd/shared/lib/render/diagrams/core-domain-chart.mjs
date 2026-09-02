// Core domain chart: strategize classifications as stickies on a
// differentiation (up) by model-complexity (right) plane, the four
// quadrants named the way the chart is read in a strategy session, each
// sticky sized by investment and coloured by its type (core amber,
// supporting blue, generic grey) with the owning context's colour band.
//
// No ELK: a scatter is arithmetic. Two stickies that land on the same spot
// are nudged apart deterministically (in id order, downwards then
// sideways) so both stay readable; the true position is the sticky's
// top-left corner marker, and the notes list the raw scores.

import {
  makeSpec, fixedLayout, compose, composeParts, titleCase, text, rect, group, MARGIN, rectsOverlap, textWidth,
} from './_compose.mjs';

export const ID = 'core-domain-chart';

const PLOT_W = 720;
const PLOT_H = 480;
const AXIS_PAD = { left: 44, bottom: 40, top: 12, right: 12 };
const SIZE = {
  high: { w: 176, h: 72 },
  medium: { w: 152, h: 64 },
  low: { w: 128, h: 56 },
};

export function available(workspace) {
  const s = workspace.steps?.strategize;
  if (!s) return { ok: false, reason: 'needs 04-strategize/strategize.json', ids: [] };
  if (!Array.isArray(s.classifications) || !s.classifications.length) return { ok: false, reason: 'strategize.json has no classifications', ids: [] };
  return { ok: true, reason: '', ids: [ID] };
}

const score = (v) => Math.max(0, Math.min(10, Number.isFinite(Number(v)) ? Number(v) : 5));

export function spec(workspace) {
  const s = workspace.steps.strategize;
  const d = workspace.steps.decompose;
  const subs = new Map(((d || {}).subdomains || []).map((x) => [x.id, x]));
  const owner = new Map();
  for (const bc of (d || {}).bounded_contexts || []) for (const sd of bc.subdomains || []) if (!owner.has(sd)) owner.set(sd, bc.id);
  // Past eight subdomains the stickies shrink (see place()), and a corner
  // tag would then sit on the name, so investment moves into the sublabel.
  const crowded = (s.classifications || []).length > 8;
  const nodes = [...(s.classifications || [])].sort((a, b) => (a.subdomain < b.subdomain ? -1 : 1)).map((c) => {
    const inv = SIZE[c.investment] ? c.investment : 'medium';
    const ctx = owner.get(c.subdomain) || (subs.has(c.subdomain) ? undefined : c.subdomain);
    return {
      id: c.subdomain,
      label: subs.get(c.subdomain)?.name || titleCase(c.subdomain),
      sublabel: crowded ? [`${inv} invest`, c.sourcing].filter(Boolean).join(' · ') : [c.sourcing, c.implementation_pattern].filter(Boolean).join(' · '),
      kind: ['core', 'supporting', 'generic'].includes(c.type) ? c.type : 'generic',
      ...(crowded ? {} : { tag: `${inv} invest` }),
      context: ctx || '',
      x: score(c.business_differentiation !== undefined ? c.business_differentiation : c.differentiation),
      y: score(c.model_complexity !== undefined ? c.model_complexity : c.complexity),
      w: SIZE[inv].w,
      h: SIZE[inv].h,
      searchText: [c.subdomain, c.type, c.sourcing, c.implementation_pattern, c.evolution].filter(Boolean).join(' '),
    };
  });
  const notes = nodes.map((n) => `${n.label}: differentiation ${n.x}, complexity ${n.y}, ${n.kind}.`);
  if (Array.isArray(s.bets) && s.bets.length) notes.push(...s.bets.map((b) => `Bet ${b.id}: ${b.text}${b.risk ? ` (${b.risk})` : ''}.`));
  return makeSpec({
    id: ID,
    kind: 'scatter',
    title: `Core domain chart · ${workspace.steps.understand?.system?.name || workspace.manifest?.title || ''}`.replace(/ · $/, ''),
    step: 'strategize',
    graph: { nodes, edges: [], groups: [] },
    notes,
  });
}

// Plot coordinates: x is complexity (right), y is differentiation (up).
function plotXY(n) {
  const x0 = MARGIN + AXIS_PAD.left;
  const y0 = MARGIN + AXIS_PAD.top;
  return { x: x0 + (n.y / 10) * PLOT_W, y: y0 + (1 - n.x / 10) * PLOT_H };
}

function place(spec) {
  const nodes = [...spec.graph.nodes].sort((a, b) => (a.id < b.id ? -1 : 1));
  const x0 = MARGIN + AXIS_PAD.left;
  const y0 = MARGIN + AXIS_PAD.top;
  // Many subdomains: smaller stickies, or the plane is all paper.
  const scale = nodes.length > 8 ? 0.8 : 1;
  const boxes = new Map();
  const inside = (b) => b.x >= x0 && b.y >= y0 && b.x + b.w <= x0 + PLOT_W && b.y + b.h <= y0 + PLOT_H;
  const clash = (b) => [...boxes.values()].some((o) => rectsOverlap({ x: b.x, y: b.y, width: b.w, height: b.h }, { x: o.x, y: o.y, width: o.w, height: o.h }, 8));
  for (const n of nodes) {
    const p = plotXY(n);
    const w = Math.round((n.w || SIZE.medium.w) * scale);
    const h = Math.round((n.h || SIZE.medium.h) * scale);
    // Centre the sticky on its point, then keep it inside the plot.
    const clamp = (b) => ({ ...b, x: Math.round(Math.min(Math.max(b.x, x0), x0 + PLOT_W - w)), y: Math.round(Math.min(Math.max(b.y, y0), y0 + PLOT_H - h)) });
    let box = clamp({ x: p.x - w / 2, y: p.y - h / 2, w, h });
    // On a collision, take the free spot nearest the score: candidate
    // corners on a 16px lattice over the plot, nearest first, inside the
    // plot always. Only when the plane is truly full does a sticky overlap.
    if (clash(box)) {
      const cands = [];
      for (let cx = x0; cx + w <= x0 + PLOT_W; cx += 16) {
        for (let cy = y0; cy + h <= y0 + PLOT_H; cy += 16) cands.push({ x: cx, y: cy, w, h, d: Math.hypot(cx + w / 2 - p.x, cy + h / 2 - p.y) });
      }
      cands.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
      const free = cands.find((c) => !clash(c));
      if (free) box = { x: free.x, y: free.y, w, h };
    }
    boxes.set(n.id, box);
  }
  return { boxes, width: MARGIN * 2 + AXIS_PAD.left + PLOT_W + AXIS_PAD.right, height: MARGIN * 2 + AXIS_PAD.top + PLOT_H + AXIS_PAD.bottom };
}

export function build(spec) {
  const geo = place(spec);
  const laid = fixedLayout({ nodes: geo.boxes, width: geo.width, height: geo.height });
  const x0 = MARGIN + AXIS_PAD.left;
  const y0 = MARGIN + AXIS_PAD.top;
  const underlay = [];
  const extras = [];
  // Quadrant fills, the midlines, axis labels and ticks.
  const mx = x0 + PLOT_W / 2;
  const my = y0 + PLOT_H / 2;
  underlay.push(rect({ x: x0, y: y0, width: PLOT_W, height: PLOT_H, rx: 0, cls: 'plot', fill: 'var(--node-fill)', stroke: 'var(--node-stroke)' }));
  underlay.push(rect({ x: mx, y: y0, width: PLOT_W / 2, height: PLOT_H / 2, rx: 0, fill: 'var(--core-fill)', stroke: 'none', opacity: 0.9 }));
  underlay.push(rect({ x: x0, y: my, width: PLOT_W / 2, height: PLOT_H / 2, rx: 0, fill: 'var(--supporting-fill)', stroke: 'none', opacity: 0.6 }));
  underlay.push(rect({ x: mx, y: my, width: PLOT_W / 2, height: PLOT_H / 2, rx: 0, fill: 'var(--generic-fill)', stroke: 'none', opacity: 0.9 }));
  for (let i = 1; i < 10; i += 1) {
    const gx = x0 + (i / 10) * PLOT_W;
    const gy = y0 + (i / 10) * PLOT_H;
    underlay.push(`<path d="M ${gx} ${y0} V ${y0 + PLOT_H} M ${x0} ${gy} H ${x0 + PLOT_W}" stroke="var(--grid)" stroke-width="1" fill="none"/>`);
    underlay.push(text(gx, y0 + PLOT_H + 12, String(i), { cls: 't-muted', size: 8 }));
    underlay.push(text(x0 - 8, y0 + PLOT_H - (i / 10) * PLOT_H + 3, String(i), { cls: 't-muted', size: 8, anchor: 'end' }));
  }
  underlay.push(`<path d="M ${mx} ${y0} V ${y0 + PLOT_H} M ${x0} ${my} H ${x0 + PLOT_W}" stroke="var(--boundary)" stroke-width="1" stroke-dasharray="6 4" fill="none"/>`);
  const quad = (x, y, title, sub, anchor) => {
    underlay.push(text(x, y, title, { cls: 't-boundary t-title', size: 13, weight: 600, anchor }));
    underlay.push(text(x, y + 14, sub, { cls: 't-muted', size: 9.5, anchor }));
  };
  quad(x0 + PLOT_W - 10, y0 + 18, 'Core', 'differentiating and hard: build, invest, model richly', 'end');
  quad(x0 + 10, y0 + 18, 'Decisive but simple', 'differentiating today; keep in-house, expect it to commoditise', 'start');
  quad(x0 + 10, y0 + PLOT_H - 20, 'Supporting', 'necessary, not decisive: keep it simple, do not over-engineer', 'start');
  quad(x0 + PLOT_W - 10, y0 + PLOT_H - 20, 'Generic', 'hard but undifferentiating: buy or adopt', 'end');
  underlay.push(text(x0 + PLOT_W / 2, y0 + PLOT_H + AXIS_PAD.bottom - 6, 'Model complexity →', { cls: 't-boundary', size: 11, weight: 600 }));
  underlay.push(`<text x="${x0 - 30}" y="${y0 + PLOT_H / 2}" class="t-boundary" font-size="11" font-weight="600" text-anchor="middle" transform="rotate(-90 ${x0 - 30} ${y0 + PLOT_H / 2})">Business differentiation →</text>`);
  // Each sticky's true point: a small dot with a leader to the box, so a
  // nudged sticky still shows where it scored.
  for (const n of spec.graph.nodes) {
    const p = plotXY(n);
    const b = geo.boxes.get(n.id);
    const inside = p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    const cx = Math.min(Math.max(p.x, b.x), b.x + b.w);
    const cy = Math.min(Math.max(p.y, b.y), b.y + b.h);
    // A sticky sitting on its score needs no marker; a displaced one gets
    // the dot and a leader so the reader sees where it really scored.
    if (inside) continue;
    extras.push(group([
      `<path d="M ${p.x} ${p.y} L ${cx} ${cy}" stroke="var(--muted)" stroke-width="1" fill="none"/>`,
      `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--fg)" stroke="var(--bg)" stroke-width="1.2"/>`,
    ], { class: 'score-point', 'data-point': n.id }));
  }
  const catalog = { nodes: { core: 'Core subdomain', supporting: 'Supporting subdomain', generic: 'Generic subdomain' } };
  return { laid, opts: { extras, underlay, catalog }, warnings: [] };
}

export function parts(spec) {
  const b = build(spec);
  return { ...composeParts(spec, b.laid, b.opts), laid: b.laid, warnings: b.warnings };
}

export async function svg(spec, { standalone = true } = {}) {
  const b = build(spec);
  return { svg: compose(spec, b.laid, { standalone, ...b.opts }), layout: b.laid, warnings: b.warnings };
}


