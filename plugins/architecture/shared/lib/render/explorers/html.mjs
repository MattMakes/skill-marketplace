// HTML helpers every explorer goes through. Nothing in this folder concatenates a
// JSON string into markup without one of these: `esc` for text and attribute
// values, `slug` for anchors, `anchors` for the page-wide id registry.
//
// Anchor scheme (leaf 1.2.4 reads it from here, never guesses):
//   ctx-<id>        a bounded context (domain tree)
//   agg-<id>        an aggregate (domain tree)
//   msg-<id>        a message / contract entry (contracts explorer)
//   dep-<id>        a deployable, team-<id> a team (stores explorer)
//   <step>-<Did>    a decision row; the bare <Did> as well when this step is the
//                   first to use that id (index.get(Did) is this entry)
//   <step>-<collection>-<id>   every indexed object's node in the artifact browser
//                   (slug of the index key), the guaranteed home of any id
//   x-<section>     the section elements themselves keep their plain ids
import { STEPS, STEP_NO, FOLDER, resolveId, usesOf } from "../../workspace.mjs";

export { STEPS, STEP_NO, FOLDER };

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Text and attribute escaping in one function: quotes are always escaped so the
// same string is safe inside a double-quoted attribute and in element text.
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

// Attribute string from a map; null/undefined/false drop the attribute, true is a
// bare boolean attribute.
export function attrs(map) {
  let out = "";
  for (const [k, v] of Object.entries(map || {})) {
    if (v === null || v === undefined || v === false) continue;
    out += v === true ? ` ${k}` : ` ${k}="${esc(v)}"`;
  }
  return out;
}

// A safe anchor fragment. Ids such as "cap-subscription management" or
// "decompose:bounded_contexts:billing" become dashed ASCII; never empty.
export function slug(value) {
  const s = String(value ?? "").replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
  return s || "x";
}

// Page-wide id registry: every element id is claimed once; a second claim gets
// "-2", "-3"... so a page assembled from six explorers is still valid HTML and every
// permalink lands somewhere.
export class IdRegistry {
  constructor() { this.used = new Set(); }
  claim(wanted) {
    let id = slug(wanted);
    if (/^[0-9]/.test(id)) id = `x-${id}`;
    let n = 2;
    let out = id;
    while (this.used.has(out)) out = `${id}-${n++}`;
    this.used.add(out);
    return out;
  }
  has(id) { return this.used.has(id); }
}

// Home anchors of well-known things. These are stable strings (no registry) so any
// explorer can link to them before or after the owning explorer has rendered.
export const home = {
  context: (id) => `ctx-${slug(id)}`,
  aggregate: (id) => `agg-${slug(id)}`,
  message: (id) => `msg-${slug(id)}`,
  deployable: (id) => `dep-${slug(id)}`,
  team: (id) => `team-${slug(id)}`,
  artifact: (entry) => slug(entry.key),
  decision: (entry, index) => (index && index.get(entry.id) === entry ? slug(entry.id) : `${entry.step}-${slug(entry.id)}`),
};

// Where a link to an index entry should land: the explorer that owns that kind of
// thing, otherwise the entry's node in the artifact browser.
export function homeOf(entry, index) {
  if (!entry) return null;
  const c = `${entry.step}.${entry.collection}`;
  if (c === "decompose.bounded_contexts" || c === "define.canvases" || c === "code.contexts") return home.context(entry.id);
  if (c === "code.contexts.aggregates") return home.aggregate(entry.id);
  if (c === "connect.messages" || c === "contracts.entries") return home.message(entry.id);
  if (c === "organise.deployables") return home.deployable(entry.id);
  if (c === "organise.teams") return home.team(entry.id);
  if (entry.collection === "decisions") return home.decision(entry, index);
  return home.artifact(entry);
}

// A string that names a known id becomes a link to its home; anything else is
// plain escaped text. `step` biases resolution to the same step (A1 inside connect is
// connect's A1).
export function idLink(index, value, step, { cls = "x-id", text } = {}) {
  const entry = index && typeof value === "string" ? resolveId(index, value, step) : null;
  if (!entry) return `<code class="${cls}">${esc(text ?? value)}</code>`;
  return `<a class="${cls}" href="#${esc(homeOf(entry, index))}">${esc(text ?? value)}</a>`;
}

// The "used in" line under an entity: every place the id (and its same-id
// registrations in other steps) is referenced, grouped by step, each a link to the
// artifact node that contains the reference.
export function usedIn(index, id, { limit = 12 } = {}) {
  const refs = index ? usesOf(index, id) : [];
  if (!refs.length) return "";
  const links = [];
  const seen = new Set();
  for (const r of refs) {
    const owner = containerOf(index, r.step, r.path);
    const anchor = owner ? home.artifact(owner) : slug(r.step);
    const label = owner ? `${r.step} ${owner.collection.split(".").pop()} ${owner.id}` : r.step;
    const key = `${anchor}|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(`<a href="#${esc(anchor)}" title="${esc(r.path)}">${esc(label)}</a>`);
  }
  const shown = links.slice(0, limit);
  const more = links.length > limit ? ` <span class="x-more">+${links.length - limit} more</span>` : "";
  return `<span class="x-used"><span class="x-used-k">used in</span> ${shown.join(", ")}${more}</span>`;
}

// The innermost indexed object whose path is a prefix of `p`; the thing a reference
// "lives in". Paths are compared textually because the index stores them as text.
export function containerOf(index, step, p) {
  let best = null;
  for (const [key, entry] of index) {
    if (key !== entry.key || entry.step !== step) continue;
    if (p === entry.path || p.startsWith(entry.path + ".") || p.startsWith(entry.path + "[")) {
      if (!best || entry.path.length > best.path.length) best = entry;
    }
  }
  return best;
}

// ---- small components ---------------------------------------------------------------------

export function chip(text, kind = "") {
  if (text === null || text === undefined || text === "") return "";
  return `<span class="x-chip${kind ? ` x-chip-${kind}` : ""}">${esc(text)}</span>`;
}

// A context colour chip: the same hue the diagrams use, via the palette variables.
export function ctxChip(id, name, slot, href = true) {
  const inner = `<i class="x-swatch"></i>${esc(name || id)}`;
  return href
    ? `<a class="x-ctx ctx-${slot}" href="#${esc(home.context(id))}">${inner}</a>`
    : `<span class="x-ctx ctx-${slot}">${inner}</span>`;
}

// A collapsible node. `search` becomes both data-search-row and data-search-text so
// the runtime finder can hide rows that do not match.
export function fold({ id, title, sub, count, open = false, body, kind, dataId, search, cls = "" }) {
  const n = count !== undefined && count !== null ? `<span class="x-n">${esc(count)}</span>` : "";
  const s = sub ? `<span class="x-sub">${sub}</span>` : "";
  const searchAttrs = search ? { "data-search-row": search, "data-search-text": search } : {};
  return `<details class="x-fold${cls ? ` ${cls}` : ""}"${attrs({ id, open, "data-kind": kind, "data-id": dataId, ...searchAttrs })}>` +
    `<summary><span class="x-title">${title}</span>${n}${s}</summary><div class="x-body">${body}</div></details>`;
}

// A leaf row (no children), searchable like a fold.
export function row({ id, kind, dataId, search, html, cls = "" }) {
  const searchAttrs = search ? { "data-search-row": search, "data-search-text": search } : {};
  return `<div class="x-row${cls ? ` ${cls}` : ""}"${attrs({ id, "data-kind": kind, "data-id": dataId, ...searchAttrs })}>${html}</div>`;
}

// Key facts. `pairs` is [[label, html]]; empty values are skipped so a canvas with no
// team does not show an empty cell.
export function dl(pairs, cls = "") {
  const items = pairs.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!items.length) return "";
  return `<dl class="x-dl${cls ? ` ${cls}` : ""}">${items.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

export function ul(items, cls = "") {
  const list = (items || []).filter((x) => x !== null && x !== undefined && x !== "");
  if (!list.length) return "";
  return `<ul class="x-list${cls ? ` ${cls}` : ""}">${list.map((x) => `<li>${x}</li>`).join("")}</ul>`;
}

// A small heading inside a node.
export function h(label, count) {
  const n = count !== undefined ? ` <span class="x-n">${esc(count)}</span>` : "";
  return `<h4 class="x-h">${esc(label)}${n}</h4>`;
}

export function table(headers, rows, cls = "") {
  if (!rows.length) return "";
  const head = headers.map((x) => `<th>${esc(x)}</th>`).join("");
  const body = rows.map((r) => `<tr${r.attrs ? attrs(r.attrs) : ""}>${(r.cells || r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table class="x-table${cls ? ` ${cls}` : ""}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// One sentence for a section whose step has not run yet. Never a scaffold table.
export function emptyNote(step, whatItWouldAdd) {
  return `<p class="x-empty">Nothing here yet: step ${STEP_NO[step]} (${esc(step)}) ${esc(whatItWouldAdd)}.</p>`;
}

// Section wrapper. `body` is the section's inner HTML; the assembler can use `html`
// as is or take `title`/`lede`/`body` apart.
export function section({ id, title, lede, body, count, empty = false, toolbar = "" }) {
  const html = `<section id="${esc(id)}" class="ddd-x x-${esc(id)}"${attrs({ "data-count": count, "data-empty": empty || null })}>` +
    `<header class="x-head"><h2>${esc(title)}</h2>${lede ? `<p class="x-lede">${lede}</p>` : ""}${toolbar}</header>${body}</section>`;
  return { id, title, lede, body, html, count, empty };
}

// Expand/collapse buttons the runtime binds to, scoped to one section.
export function toolbar(sectionId) {
  return `<div class="x-tools"><button type="button" data-ddd-toggle="expand" data-ddd-scope="#${esc(sectionId)}">expand all</button>` +
    `<button type="button" data-ddd-toggle="collapse" data-ddd-scope="#${esc(sectionId)}">collapse all</button></div>`;
}

// A JSON value as compact inline text, for example values beside schema fields.
export function inlineJson(value, max = 80) {
  if (value === undefined) return "";
  let s;
  try { s = JSON.stringify(value); } catch { s = String(value); }
  if (s === undefined) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ---- data helpers shared by the explorers ---------------------------------------------------

export const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const asList = (v) => (Array.isArray(v) ? v : []);

// Step status from the manifest, "pending" when unknown.
export function stepStatus(workspace, step) {
  const m = workspace.manifest && workspace.manifest.steps && workspace.manifest.steps[step];
  return (m && m.status) || "pending";
}

// The index entry for a well-known thing by full key, so a subdomain that shares its
// id with a bounded context never wins the alias.
export function entryFor(index, step, collection, id) {
  return index ? index.get(`${step}:${collection}:${id}`) || null : null;
}

// Human label for a confidence / blocking flag chip kind.
export function confidenceKind(c) {
  return c === "low" ? "hot" : c === "high" ? "ok" : "warn";
}
