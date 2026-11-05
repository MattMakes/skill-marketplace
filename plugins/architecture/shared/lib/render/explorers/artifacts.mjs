// The artifact browser: every step JSON that exists, in order, as its envelope
// (assumptions, open questions, notes forward, deprecations, plain words) and then
// every other top-level key as a collapsible tree. Nothing is dropped: a key this
// code does not know is rendered generically, so a change to the chain cannot hide
// data. Every object with an id gets an anchor and a "referenced by" list; every
// string that names a known id becomes a link to that id's home.
import { resolveId } from "../../workspace.mjs";
import {
  esc, slug, chip, fold, row, dl, ul, h, table, section, toolbar, STEPS, STEP_NO, FOLDER,
  idLink, homeOf, home, containerOf, stepStatus, confidenceKind, isDict, asList,
} from "./html.mjs";
import { relHref } from "./domain.mjs";

// The envelope keys review.py knew, in the order they are shown. Everything else
// is "the step's own record" and rendered generically below.
export const KNOWN_ENVELOPE = ["schema_version", "step", "produced_by", "produced_at", "mode", "depth", "inputs",
  "assumptions", "open_questions", "notes_for_downstream", "deprecated", "plain_words", "coined_terms"];

// Keys whose value names a file on disk: linked, not just shown.
const FILE_KEYS = /(_path|^schema$|^example$|^glossary$|^diagram$)$/;

const STEP_BLURB = {
  understand: "why the system exists, for whom, and how big it should be",
  discover: "the event storm: what happens, in order",
  decompose: "where the lines go: subdomains, contexts, the context map",
  strategize: "where the effort goes: core, supporting, generic; build or buy",
  connect: "how the contexts talk: flows, messages, integration patterns",
  organise: "who owns what and how many things get deployed",
  define: "one canvas per context: purpose, rules, collaborators, words",
  code: "aggregates, ports and adapters; the build order",
  contracts: "the exact shape of every message that crosses a line",
};

export function section_(workspace, gates, opts = {}) {
  const { steps, index } = workspace;
  const ids = opts.ids;
  const claim = (want) => (ids ? ids.claim(want) : slug(want));
  const byPath = new Map();
  for (const [key, entry] of index) if (key === entry.key) byPath.set(`${entry.step}|${entry.path}`, entry);
  const ctx = { workspace, index, byPath, claim };
  const present = STEPS.filter((s) => steps[s]);
  const body = STEPS.map((s) => stepNode(s, ctx)).join("");
  return section({
    id: "artifacts",
    title: "Every artifact, key by key",
    lede: `${present.length} of ${STEPS.length} steps have written their JSON. Each is shown whole: the envelope first, then everything the step recorded. Any id is a link; under it, every place that names it.`,
    body,
    count: present.length,
    toolbar: toolbar("artifacts"),
    empty: present.length === 0,
  });
}
export { section_ as section };

function stepNode(step, ctx) {
  const { workspace, claim } = ctx;
  const doc = workspace.steps[step];
  const status = stepStatus(workspace, step);
  const id = claim(`art-${step}`);
  const head = `<span class="x-sn">${STEP_NO[step]}</span><b>${esc(step)}</b>${chip(status, status === "done" ? "ok" : status === "stale" ? "hot" : "warn")}<span class="x-sub">${esc(STEP_BLURB[step] || "")}</span>`;
  if (!doc) {
    const problem = workspace.problems.find((p) => p.step === step);
    const why = problem ? `${FOLDER[step]}/${step}.json does not parse: ${problem.error}` : `${FOLDER[step]}/${step}.json has not been written`;
    return row({ id, kind: "step", dataId: step, cls: "x-step x-step-missing", search: `${step} ${status}`, html: `${head}<p class="x-empty">${esc(why)}.</p>` });
  }
  const parts = [];
  parts.push(dl([
    ["Produced", `${esc(doc.produced_by || "")}${doc.produced_at ? ` <span class="x-muted">${esc(doc.produced_at)}</span>` : ""}${doc.mode ? ` ${chip(doc.mode)}` : ""}${doc.depth ? chip(doc.depth) : ""}${doc.schema_version !== undefined ? chip(`schema v${doc.schema_version}`, "mono") : ""}`],
    ["Read", asList(doc.inputs).map((p) => fileLink(p, workspace)).join(", ")],
  ], "x-dl-inline"));

  const pw = isDict(doc.plain_words) ? doc.plain_words : null;
  if (pw) {
    const rows = ["what", "decided", "assumed", "riskiest"].filter((k) => pw[k]).map((k) => `<div class="x-pw"><span class="x-pwk">${esc(k)}</span><span class="x-pwv">${esc(pw[k])}</span></div>`);
    const extra = Object.keys(pw).filter((k) => !["what", "decided", "assumed", "riskiest"].includes(k)).map((k) => `<div class="x-pw"><span class="x-pwk">${esc(k)}</span><span class="x-pwv">${renderValue(pw[k], step, `${step}.plain_words.${k}`, ctx, 1)}</span></div>`);
    parts.push(`<div class="x-pwgrid">${rows.join("")}${extra.join("")}</div>`);
  }

  // Envelope collections, each as id-keyed nodes.
  const env = [
    ["assumptions", "Assumptions", "guess"],
    ["open_questions", "Open questions", "question"],
    ["notes_for_downstream", "Notes for later steps", "note"],
    ["deprecated", "Deprecated", "deprecated"],
    ["coined_terms", "Coined terms", "term"],
  ];
  for (const [key, label] of env) {
    if (doc[key] === undefined) continue;
    const list = asList(doc[key]);
    const open = key === "open_questions" && list.some((q) => isDict(q) && q.blocking);
    parts.push(fold({
      title: esc(label), count: list.length, kind: `envelope-${key}`, open,
      body: list.length ? renderValue(doc[key], step, `${step}.${key}`, ctx, 0) : `<p class="x-muted">none</p>`,
    }));
  }

  // Everything else, generically, never dropped.
  const rest = Object.keys(doc).filter((k) => !KNOWN_ENVELOPE.includes(k));
  for (const k of rest) {
    const v = doc[k];
    const count = Array.isArray(v) ? v.length : isDict(v) ? Object.keys(v).length : undefined;
    parts.push(fold({
      title: `<code class="x-key">${esc(k)}</code>`, count, kind: "collection", dataId: k, open: false,
      sub: Array.isArray(v) && v.length && isDict(v[0]) ? "" : typeLabel(v),
      body: renderValue(v, step, `${step}.${k}`, ctx, 0),
    }));
  }
  const counts = [`${asList(doc.assumptions).length} guesses`, `${asList(doc.open_questions).length} open questions`, `${asList(doc.notes_for_downstream).length} notes forward`, `${rest.length} own keys`].join(" · ");
  return fold({
    id, kind: "step", dataId: step, open: true, cls: "x-step",
    title: head, search: `${step} ${status}`,
    body: `<p class="x-counts">${esc(counts)} · <a class="x-file" href="${esc(`${FOLDER[step]}/${step}.json`)}">${esc(`${FOLDER[step]}/${step}.json`)}</a></p>${parts.join("")}`,
  });
}

function typeLabel(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? (typeof v[0] === "string" ? "list of ids or words" : "list") : "empty list";
  if (isDict(v)) return "record";
  return typeof v;
}

// Any JSON value as HTML. Arrays of objects become one node per item (anchored when
// the item is indexed); objects become key facts; strings that name ids link.
export function renderValue(v, step, p, ctx, depth) {
  if (v === null || v === undefined) return `<span class="x-muted">null</span>`;
  if (Array.isArray(v)) {
    if (!v.length) return `<span class="x-muted">empty</span>`;
    if (v.every((x) => typeof x === "string" || typeof x === "number" || typeof x === "boolean")) {
      return `<span class="x-inline-list">${v.map((x, i) => scalar(x, step, `${p}[${i}]`, ctx, "")).join(" ")}</span>`;
    }
    return v.map((item, i) => (isDict(item) ? itemNode(item, step, `${p}[${i}]`, ctx, depth) : `<div class="x-row">${renderValue(item, step, `${p}[${i}]`, ctx, depth + 1)}</div>`)).join("");
  }
  if (isDict(v)) {
    const keys = Object.keys(v);
    if (!keys.length) return `<span class="x-muted">empty</span>`;
    return dl(keys.map((k) => [k, renderValue(v[k], step, `${p}.${k}`, ctx, depth + 1)]), "x-dl-generic");
  }
  return scalar(v, step, p, ctx, p.split(/[.[]/).pop());
}

function scalar(v, step, p, ctx, key) {
  if (typeof v === "string") {
    if (FILE_KEYS.test(String(key)) && /[\/.]/.test(v)) return fileLink(v, ctx.workspace);
    if (v.includes("\n")) return `<pre class="x-pre">${esc(v)}</pre>`;
    const entry = resolveId(ctx.index, v, step);
    if (entry) return `<a class="x-id" href="#${esc(homeOf(entry, ctx.index))}">${esc(v)}</a>`;
    if (v.length > 140) return `<span class="x-text">${esc(v)}</span>`;
    return esc(v);
  }
  if (typeof v === "boolean") return chip(v ? "yes" : "no", v ? "ok" : "");
  return `<code>${esc(String(v))}</code>`;
}

// One object inside an array: title from id + the best one-line field, chips for the
// flags people scan for, key facts for the rest, and where it is referenced.
function itemNode(item, step, p, ctx, depth) {
  const { index, byPath, claim } = ctx;
  const entry = byPath.get(`${step}|${p}`) || null;
  const idKey = entry ? entry.idKey : isDict(item) && typeof item.id === "string" ? "id" : null;
  const idVal = idKey ? String(item[idKey]) : null;
  const titleKey = ["name", "question", "text", "statement", "summary", "description", "term", "reason", "attribute", "invariant"].find((k) => typeof item[k] === "string" && item[k]);
  const titleText = titleKey ? String(item[titleKey]) : "";
  const short = titleText.length > 110 ? `${titleText.slice(0, 109)}…` : titleText;
  const chips = [
    item.confidence ? chip(item.confidence, confidenceKind(item.confidence)) : "",
    item.blocking === true ? chip("blocks the work", "hot") : item.blocking === false ? chip("can wait") : "",
    item.owner ? chip(`answer: ${item.owner}`) : "",
    Array.isArray(item.for) ? item.for.map((f) => chip(`for ${f}`, "note")).join("") : "",
    typeof item.kind === "string" ? chip(item.kind) : "",
    item.pivotal === true ? chip("pivotal", "core") : "",
    item.severity ? chip(item.severity, item.severity === "high" ? "hot" : "warn") : "",
  ].filter(Boolean).join("");
  const skip = new Set([idKey, titleKey].filter(Boolean));
  const body = [];
  if (titleText && titleText !== short) body.push(`<p class="x-text">${esc(titleText)}</p>`);
  const restKeys = Object.keys(item).filter((k) => !skip.has(k));
  if (restKeys.length) body.push(dl(restKeys.map((k) => [k, renderValue(item[k], step, `${p}.${k}`, ctx, depth + 1)]), "x-dl-generic"));
  if (entry) body.push(referencedBy(entry, ctx));
  const id = entry ? claim(home.artifact(entry)) : undefined;
  const title = `${idVal ? `<code class="x-id x-id-strong">${esc(idVal)}</code> ` : ""}${short ? `<span class="x-item-title">${esc(short)}</span>` : ""}${chips}`;
  return fold({
    id, kind: "item", dataId: idVal, cls: "x-item", open: false,
    title, search: `${idVal || ""} ${titleText}`,
    body: body.join("") || `<span class="x-muted">empty</span>`,
  });
}

// Every place this entry (this registration only) is referenced, grouped and linked
// to the node that contains the reference.
export function referencedBy(entry, ctx) {
  const { index } = ctx;
  const refs = entry.referencedBy || [];
  const also = (entry.also || []).map((k) => index.get(k)).filter(Boolean);
  if (!refs.length && !also.length) return `<p class="x-refs x-muted" data-refs="0">Referenced nowhere else.</p>`;
  const links = [];
  const seen = new Set();
  for (const r of refs) {
    const owner = containerOf(index, r.step, r.path);
    const anchor = owner ? home.artifact(owner) : `art-${r.step}`;
    const label = owner ? `${r.step} › ${owner.collection} ${owner.id}` : `${r.step} › ${r.path.slice(r.step.length + 1)}`;
    const k = `${anchor}|${label}`;
    if (seen.has(k)) continue;
    seen.add(k);
    links.push(`<a href="#${esc(anchor)}" title="${esc(r.path)}" data-ref-path="${esc(r.path)}">${esc(label)}</a>`);
  }
  const alsoHtml = also.length ? `<span class="x-also">same id in ${also.map((e) => `<a href="#${esc(home.artifact(e))}">${esc(e.step)} ${esc(e.collection)}</a>`).join(", ")}</span>` : "";
  return `<p class="x-refs" data-refs="${refs.length}"><span class="x-used-k">referenced by</span> ${links.join(", ") || `<span class="x-muted">nothing</span>`}${alsoHtml ? ` · ${alsoHtml}` : ""}</p>`;
}

function fileLink(p, workspace) {
  return `<a class="x-file" href="${esc(relHref(p, workspace))}">${esc(p)}</a>`;
}
