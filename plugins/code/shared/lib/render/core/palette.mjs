// The visual language. One file decides every colour, dash and typeface the
// diagrams and the review page use, so a bounded context looks the same in
// the context map, the flow diagrams, the explorers and the exported page.
//
// Art direction (leaf 1.2.4's page CSS must match this):
//
//   Typography: an editorial pairing, not a framework default.
//     titles   "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif
//     labels   "Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif
//     ids      "SF Mono", Menlo, Consolas, "Liberation Mono", monospace
//     The label face is metrically close to the system sans that textfit.mjs
//     is calibrated for (0.6 em per glyph), so shrink-to-fit stays accurate.
//
//   Colour: twelve curated context hues, muted and print-safe, each with a
//     light and a dark variant. A context's slot is a hash of its id, never
//     its position in a list, so "billing" is the same colour in every
//     diagram, every run, and on every machine. EventStorming stickies keep
//     their conventional paper colours in both themes. Edges use one arrow
//     vocabulary: event dashed + open head, command solid + filled head,
//     query dotted + small head, dependency thin + hollow diamond.
//
// Everything is emitted as CSS variables on svg[data-diagram] (and as plain
// values for callers that need a hex), so a page toggle flips the theme
// without a re-render.

// ---- Context palette ---------------------------------------------------------------

// Order matters only for the slot index; the hues alternate warm and cool so
// two neighbouring slots are never near-identical.
export const CONTEXT_SLOTS = [
  { slot: 'indigo', light: { fill: '#e9ecfa', stroke: '#4d5cd3', ink: '#2b3591' }, dark: { fill: '#1d2249', stroke: '#8d97ec', ink: '#cdd2f8' } },
  { slot: 'amber', light: { fill: '#fbeed7', stroke: '#c4811b', ink: '#7a4d0b' }, dark: { fill: '#3a2a10', stroke: '#e0a24a', ink: '#f5ddb2' } },
  { slot: 'teal', light: { fill: '#e0f3f1', stroke: '#118a7e', ink: '#0b5f57' }, dark: { fill: '#0f2f2c', stroke: '#41bfb0', ink: '#b8ebe4' } },
  { slot: 'rose', light: { fill: '#fbe5ea', stroke: '#c8405f', ink: '#8a2540' }, dark: { fill: '#3d1620', stroke: '#e8738e', ink: '#f7c4d0' } },
  { slot: 'moss', light: { fill: '#e2f1e5', stroke: '#2f8a4d', ink: '#1c5a31' }, dark: { fill: '#12301c', stroke: '#63bd80', ink: '#c0e8cb' } },
  { slot: 'plum', light: { fill: '#f0e4f5', stroke: '#8b45a8', ink: '#5c2a72' }, dark: { fill: '#2d1638', stroke: '#bd80d6', ink: '#e6c9ef' } },
  { slot: 'sky', light: { fill: '#e1eef9', stroke: '#2b7bc0', ink: '#1a4e7c' }, dark: { fill: '#102638', stroke: '#64aee6', ink: '#c0dcf3' } },
  { slot: 'copper', light: { fill: '#f9e6dc', stroke: '#c0602c', ink: '#7c3a17' }, dark: { fill: '#3a1e11', stroke: '#e58b5a', ink: '#f5ccb5' } },
  { slot: 'olive', light: { fill: '#edf2dc', stroke: '#6f8a1f', ink: '#45580e' }, dark: { fill: '#232c0f', stroke: '#a4c247', ink: '#dce8b1' } },
  { slot: 'mauve', light: { fill: '#ede6ef', stroke: '#7d6591', ink: '#4f3d61' }, dark: { fill: '#26202c', stroke: '#ac97be', ink: '#ddd3e4' } },
  { slot: 'ochre', light: { fill: '#f6f0d6', stroke: '#9b8a1c', ink: '#625610' }, dark: { fill: '#302b0d', stroke: '#c8b43f', ink: '#ece5a9' } },
  { slot: 'steel', light: { fill: '#e6ebef', stroke: '#587080', ink: '#35474f' }, dark: { fill: '#1d262c', stroke: '#8ca3b3', ink: '#d0dbe3' } },
];

// FNV-1a over the UTF-8 bytes of the id, 32-bit. Chosen because it is a
// dozen lines, has no dependencies and gives every JS engine the same
// answer; the seed is fixed so a slot never changes between releases.
export function hashId(id) {
  const bytes = new TextEncoder().encode(String(id ?? ''));
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// The colour of a bounded context (or any thing that should keep one colour
// everywhere). Same id, same answer, in any process. With twelve slots and a
// plain hash, two contexts sharing a hue becomes likely once a workspace has
// more than a handful of them (the 12-node test fixture has three such
// pairs); the label always tells them apart, and the three mealkit contexts
// (subscriptions, billing, fulfilment) are verified distinct by test.
export function contextColor(id, { theme = 'light' } = {}) {
  const index = hashId(id) % CONTEXT_SLOTS.length;
  const entry = CONTEXT_SLOTS[index];
  const variant = theme === 'dark' ? entry.dark : entry.light;
  return { slot: entry.slot, index, ...variant };
}

// ---- EventStorming stickies -------------------------------------------------------------

// The conventional sticky colours. Paper stays paper in dark mode: the fills
// are dimmed a step so they do not glare, the ink stays dark on them.
export const STICKY_KINDS = {
  event: { label: 'Domain event', light: { fill: '#ffb057', ink: '#4a2a00', stroke: '#e08a2b' }, dark: { fill: '#e2933f', ink: '#2e1a00', stroke: '#f2b46b' } },
  command: { label: 'Command', light: { fill: '#8cc4f2', ink: '#0d2f4d', stroke: '#4f9bd9' }, dark: { fill: '#6ea8d8', ink: '#08223a', stroke: '#9ccdf2' } },
  policy: { label: 'Policy', light: { fill: '#d9c2f0', ink: '#3c2159', stroke: '#a985cf' }, dark: { fill: '#bca3da', ink: '#2b1544', stroke: '#d8c3ee' } },
  actor: { label: 'Actor', light: { fill: '#ffe66d', ink: '#4a3d00', stroke: '#d9bd2a' }, dark: { fill: '#e6cf5e', ink: '#332a00', stroke: '#f5e38a' } },
  external: { label: 'External system', light: { fill: '#f9b8cf', ink: '#57132f', stroke: '#e07ba3' }, dark: { fill: '#dc9bb5', ink: '#3f0c22', stroke: '#f2bdd3' } },
  'read-model': { label: 'Read model', light: { fill: '#a9e3a4', ink: '#153f12', stroke: '#6fbf68' }, dark: { fill: '#8fcb8a', ink: '#0e2f0c', stroke: '#b6e4b2' } },
  aggregate: { label: 'Aggregate', light: { fill: '#fff6c2', ink: '#4a4000', stroke: '#e3d16e' }, dark: { fill: '#e8dca4', ink: '#332c00', stroke: '#f4ecc2' } },
  hotspot: { label: 'Hotspot', light: { fill: '#e83e8c', ink: '#ffffff', stroke: '#b81f68' }, dark: { fill: '#d63a80', ink: '#ffffff', stroke: '#f279b3' } },
};

export function stickyColor(kind, { theme = 'light' } = {}) {
  const entry = STICKY_KINDS[kind] || STICKY_KINDS.event;
  return { kind: STICKY_KINDS[kind] ? kind : 'event', label: entry.label, ...(theme === 'dark' ? entry.dark : entry.light) };
}

// ---- Edge vocabulary ----------------------------------------------------------------------

// Message kinds map onto four drawn styles. `marker` names the arrowhead
// (svg.mjs defines one <marker> per style); `base` is the style class the
// theme colours (e-<base>), kept so the older sync/async names still work.
export const EDGE_STYLES = {
  event: { base: 'async', dash: '7 4', width: 1.6, marker: 'open', label: 'Domain event' },
  command: { base: 'sync', dash: null, width: 1.6, marker: 'filled', label: 'Command' },
  query: { base: 'query', dash: '2 3', width: 1.4, marker: 'small', label: 'Query' },
  dependency: { base: 'dependency', dash: null, width: 1.1, marker: 'diamond', label: 'Dependency' },
};

const EDGE_ALIASES = { async: 'event', sync: 'command', message: 'event', call: 'command', read: 'query', uses: 'dependency' };

export function edgeStyle(kind) {
  const name = EDGE_STYLES[kind] ? kind : (EDGE_ALIASES[kind] || 'command');
  return { kind: name, ...EDGE_STYLES[name] };
}

// ---- Typography ---------------------------------------------------------------------------

export const FONTS = {
  title: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  label: '"Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
};

// ---- CSS ---------------------------------------------------------------------------------------

function vars(theme) {
  const out = [];
  for (const entry of CONTEXT_SLOTS) {
    const v = entry[theme];
    out.push(`--ctx-${entry.slot}-fill:${v.fill};--ctx-${entry.slot}-stroke:${v.stroke};--ctx-${entry.slot}-ink:${v.ink};`);
  }
  for (const [kind, entry] of Object.entries(STICKY_KINDS)) {
    const v = entry[theme];
    out.push(`--sticky-${kind}-fill:${v.fill};--sticky-${kind}-ink:${v.ink};--sticky-${kind}-stroke:${v.stroke};`);
  }
  return out.join('');
}

export const PALETTE_VARS = { light: vars('light'), dark: vars('dark') };

// Variable blocks plus the class rules that consume them. Scoped to
// svg[data-diagram] like themeCss(); svg.mjs appends this to its own CSS so
// one <style> carries the whole language. `.ctx-<slot>` colours a node by
// context, `.sticky-<kind>` draws an EventStorming sticky, `.edge-<kind>`
// applies the arrow vocabulary by message kind.
export function paletteCss() {
  const font = `--font-title:${FONTS.title};--font-label:${FONTS.label};--font-mono:${FONTS.mono};`;
  const rules = [];
  rules.push(`svg[data-diagram]{${font}${PALETTE_VARS.light}}`);
  rules.push(`@media (prefers-color-scheme:dark){svg[data-diagram]{${PALETTE_VARS.dark}}}`);
  rules.push(`[data-theme=dark] svg[data-diagram],svg[data-diagram][data-theme=dark]{${PALETTE_VARS.dark}}`);
  rules.push(`[data-theme=light] svg[data-diagram],svg[data-diagram][data-theme=light]{${PALETTE_VARS.light}}`);
  for (const { slot } of CONTEXT_SLOTS) {
    rules.push(`svg[data-diagram] .ctx-${slot} .node,svg[data-diagram] .node.ctx-${slot}{fill:var(--ctx-${slot}-fill);stroke:var(--ctx-${slot}-stroke)}`);
    rules.push(`svg[data-diagram] .ctx-${slot} .t-node,svg[data-diagram] .ctx-${slot} .t-boundary{fill:var(--ctx-${slot}-ink)}`);
    rules.push(`svg[data-diagram] .ctx-${slot} .boundary{stroke:var(--ctx-${slot}-stroke)}`);
    rules.push(`svg[data-diagram] .ctx-${slot} .band{fill:var(--ctx-${slot}-stroke)}`);
  }
  for (const kind of Object.keys(STICKY_KINDS)) {
    rules.push(`svg[data-diagram] .sticky-${kind} .node,svg[data-diagram] .node.sticky-${kind}{fill:var(--sticky-${kind}-fill);stroke:var(--sticky-${kind}-stroke);stroke-width:1}`);
    rules.push(`svg[data-diagram] .sticky-${kind} .t-node,svg[data-diagram] .sticky-${kind} .t-sub{fill:var(--sticky-${kind}-ink)}`);
  }
  for (const [kind, style] of Object.entries(EDGE_STYLES)) {
    rules.push(`svg[data-diagram] .edge-${kind}{stroke-width:${style.width}${style.dash ? `;stroke-dasharray:${style.dash}` : ';stroke-dasharray:none'}}`);
  }
  rules.push(`svg[data-diagram] .t-title{font-family:var(--font-title);letter-spacing:.01em}`);
  rules.push(`svg[data-diagram] .t-id,svg[data-diagram] .t-mono{font-family:var(--font-mono)}`);
  return `${rules.join('\n')}\n`;
}
