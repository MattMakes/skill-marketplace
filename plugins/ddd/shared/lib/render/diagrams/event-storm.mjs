// Event storm timeline: discover phases as swim-columns left to right, the
// events of each phase in sequence order as orange stickies, the command
// that triggers each event above it (blue) with its actor above that
// (yellow, or pink for an external system), policies (lilac) in the row
// under the events pointing at the command they fire, read models (green)
// beside the command they inform, hotspots as magenta markers on the event
// they are near, and a vertical divider after each pivotal event.
//
// No ELK: a timeline is a grid. One "slot" per event holds the whole
// vertical stack for it; a phase wider than WRAP slots wraps onto a second
// band of rows, so forty events stay readable instead of becoming a strip
// six metres wide. Layout is pure arithmetic over the spec, so a spec read
// back from disk renders identically.

import {
  makeSpec, fixedLayout, compose, composeParts, titleCase, text, rect, group, MARGIN, esc, textWidth,
} from './_compose.mjs';

export const ID = 'event-storm';

export const WRAP = 6;
const SLOT_W = 128;
const STICKY_W = 112;
const STICKY_H = 56;
const ROW_GAP = 28;
const PHASE_GAP = 40;
const PHASE_HEAD = 36;
const ROWS = { actor: 0, command: 1, event: 2, policy: 3 };
const ROW_H = STICKY_H + ROW_GAP;
const BAND_GAP = 40;

export function available(workspace) {
  const d = workspace.steps?.discover;
  if (!d) return { ok: false, reason: 'needs 02-discover/discover.json', ids: [] };
  if (!Array.isArray(d.events) || !d.events.length) return { ok: false, reason: 'discover.json has no events', ids: [] };
  return { ok: true, reason: '', ids: [ID] };
}

// A sticky is one or two lines; a name too long for one line at 12px is
// split at the word nearest the middle so it reads as two lines rather
// than an ellipsis.
export function stickyText(name) {
  const str = String(name || '');
  if (textWidth(str, 12) <= STICKY_W - 12) return { label: str };
  const words = str.split(/\s+/);
  if (words.length < 2) return { label: str };
  // Pick the split whose worse-fitting half is the most legible: boxed()
  // shrinks the label (12px) and sublabel (10px) to the sticky's width.
  const avail = STICKY_W - 12;
  const fit = (str, max) => Math.min(max, avail / Math.max(1, textWidth(str, 1)));
  let best = 1;
  let bestScore = -1;
  for (let i = 1; i < words.length; i += 1) {
    const score = Math.min(fit(words.slice(0, i).join(' '), 12), fit(words.slice(i).join(' '), 10));
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return { label: words.slice(0, best).join(' '), sublabel: words.slice(best).join(' ') };
}

// A policy reads "when <event>, then <commands>": the name is usually the
// sentence "Whenever X, do Y", which no sticky can hold, so the two halves
// go on two lines and the event/command names stand in when the sentence
// does not split at a comma.
export function policyText(p, d) {
  const name = String(p.name || '');
  const m = /^\s*(?:whenever|when)\s+(.+?)\s*,\s*(?:then\s+)?(.+)$/i.exec(name);
  if (m) return { label: `when ${m[1]}`, sublabel: `then ${m[2]}` };
  const ev = (d.events || []).find((e) => e.id === p.when);
  const cmds = (p.then || []).map((c) => (d.commands || []).find((x) => x.id === c)?.name || titleCase(c));
  if (ev && cmds.length) return { label: `when ${ev.name || titleCase(ev.id)}`, sublabel: `then ${cmds.join(', ')}` };
  return stickyText(name || titleCase(p.id));
}

const bySeq = (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || (a.id < b.id ? -1 : 1);

export function spec(workspace) {
  const d = workspace.steps.discover;
  const dec = workspace.steps.decompose;
  const phases = [...(d.phases || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id < b.id ? -1 : 1));
  const phaseIds = new Set(phases.map((p) => p.id));
  const events = [...(d.events || [])].sort(bySeq);
  const commands = new Map((d.commands || []).map((c) => [c.id, c]));
  const actors = new Map((d.actors || []).map((a) => [a.id, a]));
  const externals = new Map((d.external_systems || []).map((x) => [x.id, x]));
  const pivotal = new Set([...(d.pivotal_events || []), ...events.filter((e) => e.pivotal).map((e) => e.id)]);

  // Events without a known phase get a trailing "unphased" column rather
  // than being dropped: a missing phase is a modelling gap worth seeing.
  const orphan = events.filter((e) => !phaseIds.has(e.phase));
  const lanes = phases.map((p) => ({ id: p.id, label: p.name || titleCase(p.id) }));
  if (orphan.length) lanes.push({ id: '_unphased', label: 'No phase' });

  const nodes = [];
  const edges = [];
  const usedCommands = new Set();
  const slotOf = new Map(); // event id -> { lane, index }
  const laneCounts = new Map(lanes.map((l) => [l.id, 0]));
  const pushSlot = (laneId, event, command) => {
    const index = laneCounts.get(laneId);
    laneCounts.set(laneId, index + 1);
    if (event) {
      slotOf.set(event.id, { lane: laneId, index });
      nodes.push({
        id: event.id, ...stickyText(event.name || titleCase(event.id)), kind: 'event', sticky: true,
        lane: laneId, slot: index, row: 'event', pivotal: pivotal.has(event.id),
        searchText: [event.id, ...(event.data || [])].join(' '),
      });
    }
    if (command) {
      usedCommands.add(command.id);
      nodes.push({ id: command.id, ...stickyText(command.name || titleCase(command.id)), kind: 'command', sticky: true, lane: laneId, slot: index, row: 'command' });
      if (event) edges.push({ id: `${command.id}->${event.id}`, from: command.id, to: event.id, kind: 'command' });
      const actorId = command.actor ?? event?.actor ?? null;
      if (actorId) {
        const ext = externals.get(actorId);
        const act = actors.get(actorId);
        const nid = `${command.id}@${actorId}`;
        nodes.push({ id: nid, ...stickyText(ext ? ext.name : act ? act.name : titleCase(actorId)), kind: ext ? 'external' : 'actor', sticky: true, lane: laneId, slot: index, row: 'actor', actor: actorId });
        edges.push({ id: `${nid}->${command.id}`, from: nid, to: command.id, kind: 'command' });
      }
    } else if (event && event.actor) {
      const actorId = event.actor;
      const ext = externals.get(actorId);
      const act = actors.get(actorId);
      const nid = `${event.id}@${actorId}`;
      nodes.push({ id: nid, ...stickyText(ext ? ext.name : act ? act.name : titleCase(actorId)), kind: ext ? 'external' : 'actor', sticky: true, lane: laneId, slot: index, row: 'actor', actor: actorId });
      edges.push({ id: `${nid}->${event.id}`, from: nid, to: event.id, kind: 'command' });
    }
  };
  for (const e of events) {
    const laneId = phaseIds.has(e.phase) ? e.phase : '_unphased';
    const cmd = e.triggered_by ? commands.get(e.triggered_by) : null;
    pushSlot(laneId, e, cmd && !usedCommands.has(cmd.id) ? cmd : null);
    if (cmd && usedCommands.has(cmd.id) && !nodes.some((n) => n.id === `${cmd.id}->${e.id}`)) {
      edges.push({ id: `${cmd.id}->${e.id}`, from: cmd.id, to: e.id, kind: 'command' });
    }
  }
  // Commands that produce nothing (a request to an external system, say)
  // still belong on the wall: a slot of their own at the end of the phase
  // whose policy fires them, else the last lane.
  const policies = d.policies || [];
  for (const c of commands.values()) {
    if (usedCommands.has(c.id)) continue;
    const firedBy = policies.find((p) => (p.then || []).includes(c.id));
    const whenSlot = firedBy ? slotOf.get(firedBy.when) : null;
    // Next best: the phase where the owning context's events happen (a
    // request to Stripe belongs beside the charge, not at the end).
    let ownerLane = null;
    const owner = (dec?.bounded_contexts || []).find((bc) => (bc.owns_commands || []).includes(c.id));
    if (owner) {
      const phases = (owner.owns_events || []).map((eid) => slotOf.get(eid)?.lane).filter(Boolean);
      if (phases.length) ownerLane = phases[phases.length - 1];
    }
    const laneId = whenSlot ? whenSlot.lane : ownerLane || lanes[lanes.length - 1].id;
    pushSlot(laneId, null, c);
  }
  // Policies: under their `when` event, arrows to the commands they fire.
  for (const p of policies) {
    const at = slotOf.get(p.when);
    if (!at) continue;
    nodes.push({ id: p.id, ...policyText(p, d), kind: 'policy', sticky: true, lane: at.lane, slot: at.index, row: 'policy', searchText: p.id });
    edges.push({ id: `${p.when}->${p.id}`, from: p.when, to: p.id, kind: 'event' });
    for (const cid of p.then || []) if (usedCommands.has(cid)) edges.push({ id: `${p.id}->${cid}`, from: p.id, to: cid, kind: 'command' });
  }
  // Read models: in the actor row beside the command they inform, which is
  // where a reader looks for "what did the actor see before deciding".
  for (const rm of d.read_models || []) {
    const cmdNode = nodes.find((n) => n.id === rm.informs && n.row === 'command');
    if (!cmdNode) continue;
    nodes.push({ id: rm.id, ...stickyText(rm.name || titleCase(rm.id)), kind: 'read-model', sticky: true, lane: cmdNode.lane, slot: cmdNode.slot, row: 'read-model' });
    edges.push({ id: `${rm.id}->${rm.informs}`, from: rm.id, to: rm.informs, kind: 'query' });
  }
  const hotspots = (d.hotspots || []).map((h) => ({ id: h.id, text: h.text, near: h.near, kind: h.kind }));
  const notes = [];
  if (orphan.length) notes.push(`${orphan.length} event(s) have no phase and sit in the "No phase" column.`);
  if (hotspots.length) notes.push(...hotspots.map((h) => `${h.id} (${h.kind || 'hotspot'}) near ${h.near}: ${h.text}`));
  return makeSpec({
    id: ID,
    kind: 'timeline',
    title: `Event storm · ${workspace.steps.understand?.system?.name || workspace.manifest?.title || 'big picture'}`,
    step: 'discover',
    graph: { nodes, edges, groups: [] },
    notes,
    extra: { lanes, hotspots, wrap: WRAP },
  });
}

// Geometry: lanes side by side; within a lane, slots run left to right
// and wrap every `wrap` slots onto a new band (a band is the four rows).
// A slot holding a read model is wider: the read model sits left of its
// command and the stack keeps to the right.
function place(spec) {
  const wrap = spec.wrap || WRAP;
  const lanes = spec.lanes || [];
  const nodes = spec.graph.nodes;
  const slotW = new Map(); // `${lane}/${slot}` -> width
  const slotsPerLane = new Map(lanes.map((l) => [l.id, 0]));
  for (const n of nodes) {
    const key = `${n.lane}/${n.slot}`;
    const wide = n.row === 'read-model';
    slotW.set(key, Math.max(slotW.get(key) || SLOT_W, wide ? SLOT_W + STICKY_W + 8 : SLOT_W));
    slotsPerLane.set(n.lane, Math.max(slotsPerLane.get(n.lane) || 0, n.slot + 1));
  }
  const rowsPerBand = 4;
  const bandH = rowsPerBand * ROW_H;
  const laneX = new Map();
  const laneW = new Map();
  const slotX = new Map(); // `${lane}/${slot}` -> x offset within the lane
  const bandsOf = new Map();
  let x = MARGIN;
  for (const l of lanes) {
    const count = slotsPerLane.get(l.id) || 0;
    const bands = Math.max(1, Math.ceil(count / wrap));
    bandsOf.set(l.id, bands);
    let widest = SLOT_W;
    for (let b = 0; b < bands; b += 1) {
      let off = 0;
      for (let i = b * wrap; i < Math.min(count, (b + 1) * wrap); i += 1) {
        const key = `${l.id}/${i}`;
        slotX.set(key, off);
        off += slotW.get(key) || SLOT_W;
      }
      widest = Math.max(widest, off);
    }
    laneX.set(l.id, x);
    laneW.set(l.id, widest);
    x += widest + PHASE_GAP;
  }
  const width = Math.max(320, x - PHASE_GAP + MARGIN);
  const top = MARGIN + PHASE_HEAD;
  const maxBands = Math.max(1, ...bandsOf.values());
  const height = top + maxBands * bandH - ROW_GAP + BAND_GAP + MARGIN;
  const boxes = new Map();
  for (const n of nodes) {
    const key = `${n.lane}/${n.slot}`;
    const band = Math.floor(n.slot / wrap);
    const row = n.row === 'read-model' ? ROWS.command : ROWS[n.row] ?? ROWS.event;
    const sw = slotW.get(key) || SLOT_W;
    const right = laneX.get(n.lane) + slotX.get(key) + sw - (SLOT_W - STICKY_W) / 2;
    const bx = n.row === 'read-model' ? right - STICKY_W - 8 - STICKY_W : right - STICKY_W;
    const by = top + band * bandH + row * ROW_H;
    boxes.set(n.id, { x: bx, y: by, w: STICKY_W, h: STICKY_H });
  }
  return { boxes, lanes: lanes.map((l) => ({ ...l, x: laneX.get(l.id), w: laneW.get(l.id) })), width, height, top, bandH, maxBands };
}

function routes(spec, boxes) {
  const out = new Map();
  for (const e of spec.graph.edges) {
    const a = boxes.get(e.from);
    const b = boxes.get(e.to);
    if (!a || !b) continue;
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    let points;
    if (Math.abs(ac.x - bc.x) < 1) {
      // Same slot, vertical neighbour: a straight drop.
      points = ac.y < bc.y ? [{ x: ac.x, y: a.y + a.h }, { x: bc.x, y: b.y }] : [{ x: ac.x, y: a.y }, { x: bc.x, y: b.y + b.h }];
    } else if (Math.abs(ac.y - bc.y) < 1) {
      points = ac.x < bc.x ? [{ x: a.x + a.w, y: ac.y }, { x: b.x, y: bc.y }] : [{ x: a.x, y: ac.y }, { x: b.x + b.w, y: bc.y }];
    } else if (ac.y > bc.y) {
      // Policy (bottom row) to the command it fires (upper row, another
      // slot): leave sideways, climb in the gap beside the target slot and
      // enter the command from its side, so the arrowhead never lands on
      // the command -> event arrow below the command.
      const dir = bc.x > ac.x ? 1 : -1;
      const startX = dir > 0 ? a.x + a.w : a.x;
      const midX = dir > 0 ? b.x - 8 : b.x + b.w + 8;
      const endX = dir > 0 ? b.x : b.x + b.w;
      points = [{ x: startX, y: ac.y }, { x: midX, y: ac.y }, { x: midX, y: bc.y }, { x: endX, y: bc.y }];
    } else {
      const dir = bc.x > ac.x ? 1 : -1;
      const gapY = b.y - ROW_GAP / 2;
      points = [{ x: ac.x, y: a.y + a.h }, { x: ac.x, y: gapY }, { x: bc.x, y: gapY }, { x: bc.x, y: b.y }];
    }
    out.set(e.id, { points, labelAt: null });
  }
  return out;
}

export function build(spec) {
  const geo = place(spec);
  const laid = fixedLayout({ nodes: geo.boxes, edges: routes(spec, geo.boxes), width: geo.width, height: geo.height });
  const underlay = [];
  const extras = [];
  const dId = spec.id;
  // Lane columns: a tinted band with the phase name in the head.
  geo.lanes.forEach((l, i) => {
    const y = MARGIN;
    const h = geo.height - MARGIN * 2;
    underlay.push(rect({ x: l.x - 8, y, width: l.w + 16, height: h, rx: 8, cls: 'lane', fill: i % 2 ? 'var(--grid)' : 'var(--node-fill)', stroke: 'none', 'data-lane': l.id }));
    underlay.push(text(l.x + l.w / 2, y + 22, l.label, { cls: 't-boundary t-title', size: 13, weight: 600, width: l.w }));
  });
  // Pivotal events: a divider on the right edge of their slot, full height.
  for (const n of spec.graph.nodes) {
    if (!n.pivotal) continue;
    const b = geo.boxes.get(n.id);
    const x = b.x + b.w + (SLOT_W - STICKY_W) / 2;
    extras.push(`<path d="M ${x} ${MARGIN + PHASE_HEAD - 8} V ${geo.height - MARGIN}" class="pivotal-divider" stroke="var(--event)" stroke-width="2" stroke-dasharray="2 6" fill="none" data-pivotal="${esc(n.id)}"/>`);
    // The word sits at the foot of the divider, where no lane title is.
    extras.push(text(x, geo.height - MARGIN - 6, 'pivotal', { cls: 't-muted', size: 8 }));
  }
  // Hotspots: a magenta marker on the top-right corner of the event.
  for (const h of spec.hotspots || []) {
    const b = geo.boxes.get(h.near);
    if (!b) continue;
    const cx = b.x + b.w - 4;
    const cy = b.y + 4;
    extras.push(group([
      `<path d="M ${cx - 11} ${cy + 11} L ${cx} ${cy - 11} L ${cx + 11} ${cy + 11} Z" fill="var(--sticky-hotspot-fill)" stroke="var(--sticky-hotspot-stroke)" stroke-width="1"/>`,
      `<title>${esc(`${h.id}: ${h.text}`)}</title>`,
      text(cx, cy + 8, h.id, { cls: 't-node', size: 7, weight: 700, fill: 'var(--sticky-hotspot-ink)' }),
    ], { class: 'hotspot', 'data-hotspot': h.id }));
  }
  const catalog = { nodes: { hotspot: 'Hotspot' }, edges: { command: 'triggers', event: 'when', query: 'informs' } };
  // The legend lists what is used; a hotspot is a marker, not a node, so
  // add it by hand when present.
  const specForLegend = (spec.hotspots || []).length
    ? { ...spec, graph: { ...spec.graph, nodes: [...spec.graph.nodes, { id: '_hotspot-legend', kind: 'hotspot', sticky: true }] } }
    : spec;
  return { laid, opts: { extras, underlay, catalog }, legendSpec: specForLegend, warnings: [] };
}

export function parts(spec) {
  const b = build(spec);
  return { ...composeParts(b.legendSpec, b.laid, b.opts), laid: b.laid, warnings: b.warnings };
}

export async function svg(spec, { standalone = true } = {}) {
  const b = build(spec);
  return { svg: compose(b.legendSpec, b.laid, { standalone, ...b.opts }), layout: b.laid, warnings: b.warnings };
}
