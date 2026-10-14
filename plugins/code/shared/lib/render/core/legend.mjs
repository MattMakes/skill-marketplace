// derived from archify: renderers/shared/legend.mjs (MIT)
//
// A legend built from the kinds a diagram actually uses, so a context map
// with no external systems does not explain what an external system looks
// like. Entries wrap onto extra rows when the diagram is narrow; the caller
// asks legendHeight() first so the canvas leaves room for it.

import { esc, rect, text, markerId, edgeBase } from './svg.mjs';
import { edgeStyle } from './palette.mjs';
import { textWidth } from './textfit.mjs';

const FONT = 10;
const SWATCH_W = 22;
const SWATCH_GAP = 6;
const ITEM_GAP = 18;
const ROW_H = 18;

// The default catalogue. Generators may pass their own labels per kind; a
// kind missing from every catalogue is labelled by its own name.
export const NODE_CATALOG = {
  context: 'Bounded context',
  core: 'Core domain',
  supporting: 'Supporting',
  generic: 'Generic',
  external: 'External system',
  team: 'Team',
  aggregate: 'Aggregate',
  command: 'Command',
  event: 'Domain event',
  port: 'Port',
  store: 'Data store',
  actor: 'Actor',
};

export const EDGE_CATALOG = {
  sync: 'Sync call',
  async: 'Async event',
  command: 'Command',
  event: 'Domain event',
  query: 'Query',
  dependency: 'Dependency',
};

export const BOUNDARY_CATALOG = {
  deployable: 'Deployable unit',
  team: 'Team boundary',
  system: 'System boundary',
};

// Collects the kinds present in a diagram, in first-seen order.
export function usedKinds(nodes = [], edges = [], boundaries = []) {
  return {
    nodes: [...new Set(nodes.map((n) => n.kind).filter(Boolean))],
    edges: [...new Set(edges.map((e) => e.kind).filter(Boolean))],
    boundaries: [...new Set(boundaries.map((b) => b.kind).filter(Boolean))],
  };
}

function entries(used, catalog = {}) {
  const list = [];
  for (const kind of used.nodes || []) {
    list.push({ kind, swatch: 'node', label: catalog.nodes?.[kind] ?? NODE_CATALOG[kind] ?? kind });
  }
  for (const kind of used.boundaries || []) {
    list.push({ kind, swatch: 'boundary', label: catalog.boundaries?.[kind] ?? BOUNDARY_CATALOG[kind] ?? kind });
  }
  for (const kind of used.edges || []) {
    const style = edgeStyle(kind);
    list.push({ kind: style.kind, base: edgeBase(kind), swatch: 'edge', label: catalog.edges?.[kind] ?? EDGE_CATALOG[kind] ?? style.label ?? kind });
  }
  return list.map((entry) => ({ ...entry, width: Math.ceil(SWATCH_W + SWATCH_GAP + textWidth(entry.label, FONT)) }));
}

function rows(list, width) {
  const out = [[]];
  let cursor = 0;
  for (const entry of list) {
    const row = out[out.length - 1];
    const required = (row.length ? ITEM_GAP : 0) + entry.width;
    if (row.length && cursor + required > width) {
      out.push([entry]);
      cursor = entry.width;
    } else {
      row.push(entry);
      cursor += required;
    }
  }
  return out;
}

// Height the legend needs for `width` px; 0 when nothing is used.
export function legendHeight(used, { width = 600, catalog } = {}) {
  const list = entries(used, catalog);
  if (!list.length) return 0;
  return rows(list, width).length * ROW_H + 6;
}

// Renders the legend with its top-left corner at (x, y).
export function legend(used, { x = 12, y = 12, width = 600, diagramId, catalog } = {}) {
  const list = entries(used, catalog);
  if (!list.length) return '';
  const parts = [];
  rows(list, width).forEach((row, rowIndex) => {
    let ex = x;
    const baseline = y + rowIndex * ROW_H + 12;
    for (const entry of row) {
      parts.push(`<g class="legend-entry" data-legend-kind="${esc(entry.kind)}" data-legend-swatch="${esc(entry.swatch)}">`);
      if (entry.swatch === 'node') {
        parts.push(rect({ x: ex, y: baseline - 9, width: SWATCH_W, height: 12, rx: 3, cls: `node n-${entry.kind}` }));
      } else if (entry.swatch === 'boundary') {
        parts.push(rect({ x: ex, y: baseline - 9, width: SWATCH_W, height: 12, rx: 3, cls: `boundary b-${entry.kind}` }));
      } else {
        parts.push(`<path d="M ${ex} ${baseline - 3} L ${ex + SWATCH_W - 1} ${baseline - 3}" class="edge e-${entry.base} edge-${entry.kind}" marker-end="url(#${markerId(diagramId, entry.base)})"/>`);
      }
      parts.push(text(ex + SWATCH_W + SWATCH_GAP, baseline, entry.label, { cls: 't-muted', size: FONT, anchor: 'start' }));
      parts.push('</g>');
      ex += entry.width + ITEM_GAP;
    }
  });
  return `<g class="legend" data-legend="">${parts.join('')}</g>`;
}
