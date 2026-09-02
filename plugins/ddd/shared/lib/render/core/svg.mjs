// derived from archify: renderers/shared/utils.mjs (MIT)
// derived from archify: renderers/shared/i18n.mjs (MIT)
//
// SVG primitives shared by every diagram generator. Nothing here knows about
// DDD; it knows about boxes, arrows, text that must fit, and a theme that
// works in light and dark mode.
//
// DOM contract (the explorers, the page and runtime.js bind to these names,
// so they are fixed here and nowhere else):
//   svg[data-diagram="<diagram id>"]   one per diagram, always with viewBox
//   g[data-node-id][data-label][data-kind]   a node; id is the workspace id
//   path[data-edge][data-from][data-to][data-kind][data-label]   an edge
//   [data-search-text]                 extra text the finder may match on
// Marker and node DOM ids are prefixed with the diagram id because a review
// page embeds many SVGs and duplicate ids make arrowheads resolve into the
// wrong (possibly collapsed) diagram.

import { textWidth } from './textfit.mjs';
import { paletteCss, edgeStyle, contextColor, STICKY_KINDS } from './palette.mjs';

export { textUnits } from './textfit.mjs';
export { paletteCss, edgeStyle, contextColor, stickyColor } from './palette.mjs';

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function r1(n) {
  return Math.round(n * 10) / 10;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ESCAPE_MAP[character]);
}

// ---- Attribute helpers -------------------------------------------------------

// Numbers are rounded to a tenth so the SVG stays diff-friendly; undefined and
// null attributes are dropped so callers can pass optional values freely.
export function attrs(map) {
  const out = [];
  for (const [key, value] of Object.entries(map)) {
    if (value === undefined || value === null || value === false) continue;
    const text = typeof value === 'number' ? String(Math.round(value * 10) / 10) : String(value);
    out.push(`${key}="${esc(text)}"`);
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

// Ids in the workspace are kebab-case already; anything else is normalised so
// a generated DOM id is always a valid CSS selector target.
export function domId(...parts) {
  return parts
    .filter((part) => part !== undefined && part !== null && part !== '')
    .map((part) => String(part).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''))
    .join('-');
}

// ---- Primitives --------------------------------------------------------------

export function rect({ x, y, width, height, rx = 6, cls, ...rest }) {
  return `<rect${attrs({ x, y, width, height, rx, class: cls, ...rest })}/>`;
}

// Text is a single line. When `width` is given the font shrinks toward
// `minSize` and, if still too wide, the string is truncated with an ellipsis,
// so a long label never spills into its neighbour.
export function text(x, y, value, {
  cls = 't-primary', size = 12, minSize = 8, width, anchor = 'middle', weight, title, ...rest
} = {}) {
  let str = String(value ?? '');
  let fontSize = size;
  if (width !== undefined) {
    fontSize = Math.max(minSize, Math.min(size, Math.floor((width / Math.max(1, textWidth(str, 1))) * 10) / 10));
    if (textWidth(str, fontSize) > width) str = truncate(str, width, fontSize);
  }
  const tip = title ? `<title>${esc(title)}</title>` : '';
  return `<text${attrs({ x, y, class: cls, 'font-size': fontSize, 'text-anchor': anchor, 'font-weight': weight, ...rest })}>${tip}${esc(str)}</text>`;
}

export function truncate(str, width, fontSize) {
  const chars = Array.from(str);
  while (chars.length > 1 && textWidth(`${chars.join('')}…`, fontSize) > width) chars.pop();
  return chars.length < Array.from(str).length ? `${chars.join('')}…` : str;
}

export function path(d, { cls, marker, ...rest } = {}) {
  return `<path${attrs({ d, class: cls, 'marker-end': marker ? `url(#${marker})` : undefined, ...rest })}/>`;
}

export function group(inner, attributes = {}) {
  return `<g${attrs(attributes)}>${Array.isArray(inner) ? inner.join('') : inner}</g>`;
}

// ---- Edges --------------------------------------------------------------------

// The four edge kinds every DDD diagram needs. Each has its own line style AND
// its own arrowhead so they stay distinguishable in monochrome print and for
// colour-blind readers: sync = solid + filled head, async = dashed + open head,
// query = dotted + small filled head, dependency = thin solid + hollow diamond.
export const EDGE_KINDS = ['sync', 'async', 'query', 'dependency'];

// The drawn style for a message kind: `event`/`command`/`query`/`dependency`
// (the palette's vocabulary) or the older `sync`/`async` names, which map
// onto the same four markers via palette.edgeStyle().
export function edgeBase(kind) {
  return EDGE_KINDS.includes(kind) ? kind : edgeStyle(kind).base;
}

export function markerId(diagramId, kind) {
  return domId(diagramId, 'arrow', edgeBase(kind));
}

export function markerDefs(diagramId) {
  const id = (kind) => markerId(diagramId, kind);
  return `<defs>`
    + `<marker id="${id('sync')}" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0 L10 4 L0 8 Z" class="m-sync"/></marker>`
    + `<marker id="${id('async')}" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0 L10 4 L0 8" class="m-async"/></marker>`
    + `<marker id="${id('query')}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1 1 L7 4 L1 7 Z" class="m-query"/></marker>`
    + `<marker id="${id('dependency')}" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1 4 L6 0.5 L11 4 L6 7.5 Z" class="m-dependency"/></marker>`
    + `</defs>`;
}

// An edge is a path plus an optional label placed at `labelAt`. The label gets
// a mask rect behind it so it stays readable where it crosses other lines.
export function edge(diagramId, { d, kind = 'sync', from, to, label, labelAt, fromLabel, toLabel, id }) {
  const k = edgeBase(kind);
  const semantic = edgeStyle(kind).kind;
  const parts = [path(d, {
    cls: `edge e-${k} edge-${semantic}`,
    marker: markerId(diagramId, k),
    'data-edge': id || `${from}->${to}`,
    'data-from': from,
    'data-to': to,
    'data-kind': k,
    'data-message-kind': semantic,
    'data-label': label,
    'data-from-label': fromLabel,
    'data-to-label': toLabel,
  })];
  if (label && labelAt) {
    const size = 10;
    const w = textWidth(label, size) + 8;
    parts.push(rect({ x: labelAt[0] - w / 2, y: labelAt[1] - size, width: w, height: size + 5, rx: 3, cls: 'edge-label-mask', 'data-edge-label': from && to ? `${from}->${to}` : undefined }));
    parts.push(text(labelAt[0], labelAt[1], label, { cls: 't-edge', size, 'data-edge-label': from && to ? `${from}->${to}` : undefined }));
  }
  return parts.join('');
}

// ---- Nodes --------------------------------------------------------------------

// A boxed node: label on top, an optional sublabel underneath and an optional
// small tag (a role or pattern name) in the corner. `box` supplies geometry and
// identity; `kind` selects the semantic colour class (n-core, n-external ...).
// `context` (an id) colours the node with that context's palette slot and
// adds a colour band on the left edge; `sticky` draws the box as the
// EventStorming sticky for `kind` (square corners, paper colour, no band).
export function boxed(label, sublabel, tag, box, {
  kind = 'default', diagramId, href, searchText, extraClass, context, sticky = false,
} = {}) {
  const { id, x, y, width, height } = box;
  const nodeId = id ? domId(diagramId, 'node', id) : undefined;
  const pad = 6;
  const hasSub = sublabel !== undefined && sublabel !== null && String(sublabel) !== '';
  const labelSize = height >= 56 ? 13 : 12;
  const labelY = hasSub ? y + height / 2 - 3 : y + height / 2 + labelSize / 3;
  const isSticky = sticky && Object.prototype.hasOwnProperty.call(STICKY_KINDS, kind);
  const slot = !isSticky && context !== undefined && context !== null && context !== '' ? contextColor(context).slot : null;
  const bandW = slot ? 6 : 0;
  const rx = isSticky ? 2 : 6;
  const inner = [
    rect({ x, y, width, height, rx, cls: `node n-${domId(kind)}${extraClass ? ` ${extraClass}` : ''}` }),
  ];
  if (slot) {
    inner.push(`<path class="band" d="M ${r1(x + bandW)} ${r1(y)} V ${r1(y + height)} A ${rx} ${rx} 0 0 1 ${r1(x)} ${r1(y + height - rx)} V ${r1(y + rx)} A ${rx} ${rx} 0 0 1 ${r1(x + bandW)} ${r1(y)} Z"/>`);
  }
  const tx = x + bandW / 2 + width / 2;
  inner.push(text(tx, labelY, label, { cls: 't-node', size: labelSize, width: width - pad * 2 - bandW, weight: 600, title: label }));
  if (hasSub) {
    inner.push(text(tx, labelY + 14, sublabel, { cls: 't-sub', size: 10, minSize: 7, width: width - pad * 2 - bandW, title: sublabel }));
  }
  if (tag) {
    const tagSize = 8;
    const tw = Math.min(width - 8, textWidth(tag, tagSize) + 8);
    inner.push(rect({ x: x + width - tw - 4, y: y + 4, width: tw, height: 12, rx: 6, cls: 'tag' }));
    inner.push(text(x + width - tw / 2 - 4, y + 12.5, tag, { cls: 't-tag', size: tagSize, minSize: 7, width: tw - 6 }));
  }
  const body = group(inner, {
    id: nodeId,
    class: `node-group${slot ? ` ctx-${slot}` : ''}${isSticky ? ` sticky-${domId(kind)}` : ''}`,
    'data-node-id': id,
    'data-label': label,
    'data-kind': kind,
    'data-context': slot ? context : undefined,
    'data-search-text': searchText,
    tabindex: id ? 0 : undefined,
    role: id ? 'button' : undefined,
  });
  return href ? `<a href="${esc(href)}">${body}</a>` : body;
}

// A boundary frame that wraps a set of nodes: dashed rounded rect with the
// label in the top-left corner on a mask so it reads over the frame line.
// `part` lets a generator layer the frame under the edges and the title over
// them: 'frame' | 'title' | 'both' (default).
// `context` colours the frame and title with that context's slot; `sublabel`
// is a quiet second line under the title (a team name, a deployable kind).
export function boundary({ x, y, width, height, label, sublabel, kind = 'boundary', id }, { diagramId, part = 'both', context } = {}) {
  const parts = [];
  const slot = context !== undefined && context !== null && context !== '' ? contextColor(context).slot : null;
  if (part !== 'title') {
    parts.push(rect({ x, y, width, height, rx: 10, cls: `boundary b-${domId(kind)}`, 'data-boundary': id || label }));
  }
  if (label && part !== 'frame') {
    const size = 12;
    const w = Math.min(width - 12, textWidth(label, size) + 12);
    parts.push(rect({ x: x + 8, y: y + 2, width: w, height: 18, rx: 3, cls: 'mask' }));
    parts.push(text(x + 14, y + 15, label, { cls: 't-boundary', size, anchor: 'start', weight: 600, width: w - 12, title: label }));
    if (sublabel) parts.push(text(x + 14, y + 30, sublabel, { cls: 't-sub t-boundary-sub', size: 9.5, anchor: 'start', width: width - 24, title: sublabel }));
  }
  return group(parts, { id: id && part !== 'title' ? domId(diagramId, 'boundary', id) : undefined, class: `boundary-group boundary-${part}${slot ? ` ctx-${slot}` : ''}` });
}

// ---- Theme ----------------------------------------------------------------------

// Every colour is a CSS variable on the diagram root; the element classes only
// name a role. Dark mode flips the variables via prefers-color-scheme and via a
// `[data-theme=dark]` ancestor so a page toggle works without a reload. Rules
// are scoped to svg[data-diagram] because an inline <style> is document-wide.
// The accent hues are shared by both themes; only the fills and neutrals flip.
const ACCENTS = '--core:#d97706;--supporting:#2563eb;--generic:#6b7280;--external:#7c3aed;--team:#0f766e;--deployable:#334155;'
  + '--aggregate:#b45309;--command:#1d4ed8;--event:#c2410c;--port:#0e7490;--store:#4d7c0f;--focus:#f59e0b;--match:#22c55e;';
const LIGHT = '--bg:#ffffff;--fg:#1f2430;--muted:#5b6472;--line:#4b5563;--grid:#eef0f3;--mask:#ffffff;'
  + '--node-fill:#f8fafc;--node-stroke:#94a3b8;--boundary:#64748b;--tag-fill:#e2e8f0;--tag-fg:#334155;'
  + '--core-fill:#fff7e6;--supporting-fill:#eaf1ff;--generic-fill:#f1f3f5;--external-fill:#f3ecff;--team-fill:#e6f7f5;--aggregate-fill:#fff4e0;'
  + '--command-fill:#e8efff;--event-fill:#fff1e8;--port-fill:#e6f7fb;--store-fill:#f0f8e6;'
  + '--sync:#1f2430;--async:#c2410c;--query:#2563eb;--dependency:#6b7280;';
const DARK = '--bg:#0f1218;--fg:#e6e9ef;--muted:#9aa3b2;--line:#aab2c0;--grid:#1a1f29;--mask:#0f1218;'
  + '--node-fill:#171c26;--node-stroke:#4b5563;--boundary:#8b95a7;--tag-fill:#2a3140;--tag-fg:#d5dae3;'
  + '--core-fill:#3a2a0c;--supporting-fill:#14264d;--generic-fill:#242a33;--external-fill:#2b1d4d;--team-fill:#0c3330;--aggregate-fill:#3b2608;'
  + '--command-fill:#132552;--event-fill:#3d1d0c;--port-fill:#0c2f38;--store-fill:#1f3308;'
  + '--sync:#e6e9ef;--async:#fb923c;--query:#60a5fa;--dependency:#9ca3af;';

export const THEME_VARS = { light: LIGHT, dark: DARK };

export function themeCss() {
  return `
svg[data-diagram]{${ACCENTS}${LIGHT}font-family:var(--font-label,ui-sans-serif,system-ui,sans-serif);background:var(--bg);color:var(--fg);max-width:100%;height:auto;display:block}
@media (prefers-color-scheme:dark){svg[data-diagram]{${DARK}}}
[data-theme=dark] svg[data-diagram],svg[data-diagram][data-theme=dark]{${DARK}}
[data-theme=light] svg[data-diagram],svg[data-diagram][data-theme=light]{${LIGHT}}
svg[data-diagram] .canvas{fill:var(--bg)}
svg[data-diagram] text{fill:var(--fg);font-family:inherit}
svg[data-diagram] .t-title{fill:var(--fg)} svg[data-diagram] .t-muted,svg[data-diagram] .t-sub{fill:var(--muted)}
svg[data-diagram] .t-edge{fill:var(--muted)} svg[data-diagram] .t-boundary{fill:var(--boundary)} svg[data-diagram] .t-tag{fill:var(--tag-fg)}
svg[data-diagram] .node{fill:var(--node-fill);stroke:var(--node-stroke);stroke-width:1.2}
svg[data-diagram] .n-core{fill:var(--core-fill);stroke:var(--core);stroke-width:2}
svg[data-diagram] .n-supporting{fill:var(--supporting-fill);stroke:var(--supporting)}
svg[data-diagram] .n-generic{fill:var(--generic-fill);stroke:var(--generic);stroke-dasharray:4 2}
svg[data-diagram] .n-external{fill:var(--external-fill);stroke:var(--external);stroke-dasharray:6 3}
svg[data-diagram] .n-team{fill:var(--team-fill);stroke:var(--team)}
svg[data-diagram] .n-aggregate{fill:var(--aggregate-fill);stroke:var(--aggregate);stroke-width:1.8}
svg[data-diagram] .n-command{fill:var(--command-fill);stroke:var(--command)}
svg[data-diagram] .n-event{fill:var(--event-fill);stroke:var(--event)}
svg[data-diagram] .n-port{fill:var(--port-fill);stroke:var(--port)}
svg[data-diagram] .n-store{fill:var(--store-fill);stroke:var(--store)}
svg[data-diagram] .n-actor{fill:var(--node-fill);stroke:var(--fg)}
svg[data-diagram] .tag{fill:var(--tag-fill)} svg[data-diagram] .mask,svg[data-diagram] .edge-label-mask{fill:var(--mask);opacity:.92}
svg[data-diagram] .boundary{fill:none;stroke:var(--boundary);stroke-width:1.2;stroke-dasharray:8 4}
svg[data-diagram] .b-deployable{stroke:var(--deployable);stroke-dasharray:none;stroke-width:1.5}
svg[data-diagram] .b-team{stroke:var(--team)}
svg[data-diagram] .b-system{stroke:var(--supporting);stroke-dasharray:none}
svg[data-diagram] .edge{fill:none;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
svg[data-diagram] .e-sync{stroke:var(--sync)}
svg[data-diagram] .e-async{stroke:var(--async);stroke-dasharray:7 4}
svg[data-diagram] .e-query{stroke:var(--query);stroke-dasharray:2 3;stroke-width:1.4}
svg[data-diagram] .e-dependency{stroke:var(--dependency);stroke-width:1.1}
svg[data-diagram] .m-sync{fill:var(--sync);stroke:none}
svg[data-diagram] .m-async{fill:none;stroke:var(--async);stroke-width:1.6;stroke-linejoin:round}
svg[data-diagram] .m-query{fill:var(--query);stroke:none}
svg[data-diagram] .m-dependency{fill:var(--bg);stroke:var(--dependency);stroke-width:1.2}
svg[data-diagram] .legend-swatch-node{fill:var(--node-fill);stroke:var(--node-stroke)}
svg[data-diagram] .node-group{cursor:pointer;transition:opacity .15s}
svg[data-diagram] .node-group:focus{outline:none}
svg[data-diagram] .node-group:focus .node,svg[data-diagram] .node-group:hover .node{stroke:var(--focus);stroke-width:2.4}
svg[data-diagram].has-focus .node-group:not(.is-focus):not(.is-related),svg[data-diagram].has-focus .edge:not(.is-related),svg[data-diagram].has-focus [data-edge-label]:not(.is-related){opacity:.18}
svg[data-diagram] .is-focus .node{stroke:var(--focus);stroke-width:3}
svg[data-diagram] .edge.is-related{stroke-width:2.6}
svg[data-diagram].has-search .node-group:not(.is-match){opacity:.15}
svg[data-diagram] .is-match .node{stroke:var(--match);stroke-width:3}
svg[data-diagram] .edge:hover{stroke-width:3;cursor:help}
svg[data-diagram] .band{stroke:none}
svg[data-diagram] .t-boundary{font-family:var(--font-title);font-size:12px}
svg[data-diagram] .t-boundary-sub{font-style:italic}
svg[data-diagram] .t-caption{font-family:var(--font-title);fill:var(--fg)}
svg[data-diagram] .t-caption-sub{fill:var(--muted)}
` + paletteCss();
}

// ---- Document ---------------------------------------------------------------------

// The root element. `standalone` adds the XML header and inlines the theme so
// the file opens on its own (and so Chrome can screenshot it); the review page
// embeds themeCss() once instead and passes standalone:false.
export function svgDocument({ id, width, height, title, body, standalone = true, kind }) {
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  const head = standalone ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';
  const style = standalone ? `<style>${themeCss()}</style>` : '';
  const titleEl = title ? `<title>${esc(title)}</title>` : '';
  return `${head}<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"${attrs({
    id: domId('diagram', id), 'data-diagram': id, 'data-diagram-kind': kind, viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-label': title,
  })}>${titleEl}${style}${markerDefs(id)}<rect class="canvas" x="0" y="0" width="${w}" height="${h}"/>${body}</svg>`;
}
