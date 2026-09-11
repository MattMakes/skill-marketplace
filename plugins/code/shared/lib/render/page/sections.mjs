// The page's own sections: cover sheet, exhibit list, shape, words, steps, canvases,
// flows and the plates. Carried from review.py's sec_* functions, restructured to the
// case-file direction in DIRECTION.md; the explorers (domain, contracts, stores,
// decisions, artifacts, everything) come from lib/render/explorers and are not
// repeated here.
//
// Every builder returns the explorers' section shape via `section()` so the page has
// one heading voice (`.x-head`), one fold (`.x-fold`), one table (`.x-table`) and one
// chip (`.x-chip`). Ours add `data-search-row` on every row that matters so the
// runtime's global finder hides what does not match.

import path from "node:path";
import { STEPS, FOLDER, STEP_NO } from "../../workspace.mjs";
import { esc, slug, contexts as contextsOf } from "../explorers/index.mjs";
import { section, fold, table, chip, toolbar, ctxChip } from "../explorers/html.mjs";
import { ORDER, KIND_LABEL, KIND_WHY } from "./worklist.mjs";

const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const asList = (v) => (Array.isArray(v) ? v : []);
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// What each step is for, in words a tired person can read.
export const STEP_BLURB = {
  understand: "Why the system should exist and who it is for.",
  discover: "Everything that happens in the business, named.",
  decompose: "Where the lines are drawn between the parts.",
  strategize: "Which parts are worth our best effort, and which to buy.",
  connect: "How the parts talk to each other.",
  organise: "Who owns what, and how many things we ship.",
  define: "What each part promises, one page each.",
  code: "How each part is built inside.",
  contracts: "The exact shape of every message that crosses a line.",
};

// Jargon, glossed on the page. Keep this short: only words a reader cannot avoid.
export const JARGON = {
  "bounded context": "A slice of the system where one word keeps exactly one meaning.",
  subdomain: "A chunk of the business. Several can live in one bounded context.",
  aggregate: "A group of data that must always change together, or not at all.",
  invariant: "A rule that must never be broken, no matter what happens.",
  deployable: "One thing you ship and run on its own.",
  core: "The part that makes this system worth building. Build it yourself, carefully.",
  supporting: "Has to work, but does not win anything. Keep it plain.",
  generic: "Everyone needs it and nobody wins with it. Buy it.",
  "at-least-once": "The message may arrive twice. The receiver must cope.",
  "at-most-once": "The message may never arrive. Someone must notice.",
  "exactly-once": "Arrives once. Expensive to promise, so check it is really true.",
  sync: "The sender waits for an answer.",
  "in-process": "A direct call inside one running program. Never touches a network.",
  "published-language": "A shared format the publisher promises not to break.",
  "anticorruption-layer": "A translator that stops someone else's model leaking into ours.",
  "customer-supplier": "One side asks, the other side is expected to deliver.",
  conformist: "We take their model exactly as it comes and do not argue.",
  "open-host-service": "One front door, published for anyone who wants in.",
  stale: "Something upstream changed after this was written, so it may be out of date.",
  blocking: "Work downstream is built on a guess until somebody answers this.",
  idempotent: "Doing it twice has the same effect as doing it once.",
};

// Wrap the first appearance of each jargon word in an explaining tooltip.
export function gloss(text) {
  let out = esc(text);
  const used = new Set();
  for (const term of Object.keys(JARGON).sort((a, b) => b.length - a.length)) {
    if (used.has(term)) continue;
    const pat = new RegExp(`(?<![\\w-])(${escapeRe(term)})(?![\\w-])`, "i");
    const m = pat.exec(out);
    if (m && !out.slice(Math.max(0, m.index - 60), m.index).includes("<abbr")) {
      out = `${out.slice(0, m.index)}<abbr title="${esc(JARGON[term])}">${m[1]}</abbr>${out.slice(m.index + m[0].length)}`;
      used.add(term);
    }
  }
  return out;
}

export const KNOWN_ENVELOPE = new Set(["schema_version", "step", "produced_by", "produced_at", "mode", "depth", "inputs",
  "assumptions", "open_questions", "notes_for_downstream", "deprecated", "plain_words", "coined_terms", "decisions"]);

const none = (text) => `<p class="x-empty">${esc(text)}</p>`;
const code = (v) => `<code>${esc(v)}</code>`;

// ---- plates -------------------------------------------------------------------------------------

// A figure: serif caption above, the drawing below, file links when the files exist.
// `wide` puts the drawing in a horizontally scrollable frame so a decision composite
// or a long event storm is never squashed to the column.
export function plate({ id, svg, title, subtitle, files = {}, wide = false, note = "", anchor }) {
  const links = [];
  if (files.svg) links.push(`<a href="${esc(files.svg)}" download>open SVG</a>`);
  if (files.png) links.push(`<a href="${esc(files.png)}" download>PNG</a>`);
  const fileLine = links.length ? `<span class="plate-files">${links.join(`<span class="sep">/</span>`)}</span>`
    : `<span class="plate-files plate-files-none">files not written yet</span>`;
  const body = svg
    ? `<div class="plate-frame${wide ? " plate-wide" : ""}">${svg}</div>`
    : `<p class="x-empty">${esc(note || "This drawing could not be made from the run's JSON.")}</p>`;
  // The drawing carries its own serif title; the caption repeats it only for screen
  // readers and the finder, and shows the id, the source and the files.
  return `<figure class="plate" id="${esc(anchor || `plate-${slug(id)}`)}" data-plate="${esc(id)}" data-search-row="${esc(`${id} ${title || ""}`)}">` +
    `<figcaption><span class="plate-title${svg ? " sr-only" : ""}">${esc(title || id)}</span>` +
    `${subtitle ? `<span class="plate-sub">${esc(subtitle)}</span>` : ""}${fileLine}</figcaption>${body}</figure>`;
}

// ---- cover sheet --------------------------------------------------------------------------------

export function secVerdict(ws, gates, items, status) {
  const v = gates.validate || {};
  const c = gates.contracts || {};
  const nErr = asList(v.errors).length + asList(c.errors).length;
  const nWarn = asList(v.warnings).length + asList(c.warnings).length;
  const stale = new Set(items.filter((i) => i.kind === "stale").map((i) => i.step));
  const stoppers = items.filter((i) => ["decision", "blocking", "error"].includes(i.kind));
  const later = items.length - stoppers.length;
  const gatesRan = gates.validate !== null && gates.validate !== undefined;
  const ok = gatesRan && v.ok !== false && (c.ok !== false);
  const done = status.done;
  const undecided = items.filter((i) => i.kind === "decision").length;

  // The headline: what exists, what needs a person, what stops the work. One paragraph.
  const parts = [];
  parts.push(done === STEPS.length
    ? `All ${STEPS.length} steps have run`
    : done === 0 ? "No step has finished yet" : `${done} of ${STEPS.length} steps have run`);
  const ctxN = asList((ws.steps.decompose || {}).bounded_contexts).length;
  const depN = asList((ws.steps.organise || {}).deployables).length;
  const msgN = asList((ws.steps.connect || {}).messages).length;
  const shape = [];
  if (ctxN) shape.push(`${ctxN} bounded context${ctxN === 1 ? "" : "s"}`);
  if (depN) shape.push(`${depN} deployable${depN === 1 ? "" : "s"}`);
  if (msgN) shape.push(`${msgN} message${msgN === 1 ? "" : "s"} across the lines`);
  if (shape.length) parts[0] += `: ${shape.join(", ")}`;
  parts[0] += ".";
  if (!gatesRan) parts.push("The automatic checks could not be run, so nothing below can be called fine.");
  else parts.push(ok ? "The automatic checks pass." : `The automatic checks FAIL: ${nErr} error${nErr === 1 ? "" : "s"}.`);
  if (!items.length) parts.push("Nothing on this page needs a person. Check the gates actually ran.");
  else {
    const kinds = [];
    if (undecided) kinds.push(`${undecided} ${undecided === 1 ? "is a call" : "are calls"} nobody has made yet`);
    const blocking = items.filter((i) => i.kind === "blocking").length;
    if (blocking) kinds.push(`${blocking} ${blocking === 1 ? "is a question" : "are questions"} that must be answered`);
    const broken = items.filter((i) => i.kind === "error").length;
    if (broken) kinds.push(`${broken} ${broken === 1 ? "is a check" : "are checks"} that failed`);
    if (kinds.length === 1 && stoppers.length === 1) parts.push(`The one that stops the work ${kinds[0].replace(/^1 is /, "is ")}.`);
    else if (kinds.length) parts.push(`Of the ${stoppers.length} that stop the work, ${kinds.join("; ")}.`);
    if (later) parts.push(`The other ${later} ${later === 1 ? "is" : "are"} logged and can wait.`);
  }
  if (stale.size) parts.push(`${stale.size} step${stale.size === 1 ? " is" : "s are"} out of date.`);

  const facts = [
    ["Steps finished", `${done} of ${STEPS.length}`, done === STEPS.length ? "ok" : "warn"],
    ["Automatic checks", !gatesRan ? "not run" : ok ? "pass" : "FAIL", !gatesRan ? "warn" : ok ? "ok" : "bad"],
    ["Out of date", stale.size ? `${stale.size} step${stale.size === 1 ? "" : "s"}` : "none", stale.size ? "warn" : "ok"],
    ["From the gates", `${nErr} error${nErr === 1 ? "" : "s"}, ${nWarn} warning${nWarn === 1 ? "" : "s"}`, nErr ? "bad" : nWarn ? "warn" : "ok"],
  ];
  // One running line, not a strip of tiles: value in the serif, label after it.
  // The separator lives inside its fact so a wrap never strands a lone dot at a line edge.
  const factLine = `<p class="facts">${facts.map(([k, val, cls], i) => `<span class="fact fact-${cls}"><b>${esc(val)}</b> ${esc(k.toLowerCase())}${i < facts.length - 1 ? '<span class="sep">·</span>' : ""}</span>`).join("")}</p>`;
  const careful = asList(gates.errors).length
    ? `<p class="careful"><b>Careful:</b> ${gates.errors.map(esc).join("; ")}. Anything below that depends on a check may be missing.</p>` : "";
  const headline = `<p class="cover-count ${stoppers.length ? "is-bad" : ok ? "is-ok" : "is-warn"}">` +
    `<b class="n-all">${items.length}</b> thing${items.length === 1 ? "" : "s"} want${items.length === 1 ? "s" : ""} a person. <b class="n-stop">${stoppers.length}</b> stop${stoppers.length === 1 ? "s" : ""} the work.</p>`;
  const body = `${headline}<p class="verdict-text">${parts.map(gloss).join(" ")}</p>${factLine}${careful}` +
    `<p class="x-lede cover-note">Nothing here is invented: every line is copied from the run's own JSON or printed by an automatic check.</p>`;
  return section({ id: "verdict", title: "The verdict", lede: "", body, count: items.length });
}

// ---- exhibit list -------------------------------------------------------------------------------

export function secWorklist(items) {
  const orderNote = ORDER.map(([, l]) => esc(l)).join(" &rsaquo; ");
  const rows = items.map((it, i) => {
    const stepTxt = it.step && STEP_NO[it.step] ? `step ${STEP_NO[it.step]} &middot; ${esc(it.step)}` : esc(it.step || it.extra.gateStep || "chain");
    const meta = [`<span class="src">${esc(it.source)}</span>`];
    if (it.extra.owner) meta.push(`<span class="src">answer: ${esc(it.extra.owner)}</span>`);
    if (it.extra.costly) meta.push(chip("expensive if wrong", "hot"));
    if (it.extra.blocking) meta.push(chip("blocking", "hot"));
    const link = it.extra.anchor ? `<a class="go" href="#${esc(it.extra.anchor)}">see it</a>` : "";
    const detail = it.detail ? `<p class="detail">${gloss(it.detail)}</p>` : "";
    return `<article class="card k-${it.kind}" data-kind="${it.kind}" data-step="${esc(it.step || "")}" data-search-row="${esc(`${it.kind} ${it.step || ""} ${it.title} ${it.detail}`)}">` +
      `<div class="ex-no"><span class="ex-word">Exhibit</span><span class="ex-n">${i + 1}</span></div>` +
      `<div class="ex-body"><p class="title">${gloss(it.title)}<span class="klabel">${esc(KIND_LABEL[it.kind])}</span><span class="step">${stepTxt}</span></p>` +
      `${detail}<p class="why">${esc(KIND_WHY[it.kind])}</p><footer>${meta.join("")}${link}</footer></div></article>`;
  });
  const counts = {};
  for (const it of items) counts[it.kind] = (counts[it.kind] || 0) + 1;
  const btns = [`<button type="button" class="f on" data-f="all">everything (${items.length})</button>`];
  for (const [k, lbl] of ORDER) if (counts[k]) btns.push(`<button type="button" class="f" data-f="${k}">${esc(lbl)} (${counts[k]})</button>`);
  const body = `<div class="filters" role="group" aria-label="Show only">${btns.join("")}</div>` +
    `<div class="cards">${rows.join("") || none("Nothing needs a person. Check the gates actually ran.")}</div>`;
  return section({ id: "worklist", title: "Do these first", lede: `Sorted worst first, by this rule and nothing else: ${orderNote}.`, body, count: items.length });
}

// ---- shape --------------------------------------------------------------------------------------

export function secShape(ws, plates) {
  const org = ws.steps.organise || {};
  const dec = ws.steps.decompose || {};
  const con = ws.steps.connect || {};
  const ctxs = contextsOf(ws);
  const byId = new Map(ctxs.map((c) => [c.id, c]));
  const ctxLink = (id) => {
    const c = byId.get(String(id));
    return c ? ctxChip(c.id, c.name, c.color.slot) : esc(id);
  };
  const depRows = asList(org.deployables).filter(isDict).map((d) => ({
    attrs: { "data-search-row": `${d.id} ${d.kind || ""} ${d.team || ""}` },
    cells: [`<a class="x-id-strong" href="#${esc(`dep-${slug(d.id)}`)}">${esc(d.id)}</a>`, esc(d.kind),
      asList(d.contexts).map(ctxLink).join(" ") || "<i>no part of its own</i>", esc(d.team), esc(d.data_store)],
  }));
  const msgRows = asList(con.messages).filter(isDict).map((m) => ({
    attrs: { "data-search-row": `${m.id} ${m.kind || ""} ${m.producer || ""}` },
    cells: [`<a class="x-id-strong" href="#${esc(`msg-${slug(m.id)}`)}">${esc(m.id)}</a>`, esc(m.kind), ctxLink(m.producer),
      asList(m.consumers).map(ctxLink).join(" "), gloss(m.delivery || "")],
  }));
  const facts = [["Parts of the business", asList(dec.bounded_contexts).length], ["Things we ship", asList(org.deployables).length],
    ["Teams", asList(org.teams).length], ["Messages between parts", asList(con.messages).length]];
  const factLine = `<p class="facts facts-plain">${facts.map(([k, v], i) => `<span class="fact"><b>${v}</b> ${esc(k.toLowerCase())}${i < facts.length - 1 ? '<span class="sep">·</span>' : ""}</span>`).join("")}</p>`;
  const parts = [factLine];
  if (plates["context-map"]) parts.push(plates["context-map"]);
  parts.push(fold({ id: "shape-runs-where", title: "What runs where", sub: "one row per thing you ship", count: depRows.length, open: true,
    body: depRows.length ? table(["Ships as", "Kind", "Holds which parts", "Team", "Store"], depRows) : none("No organise step yet.") }));
  if (plates["teams-deployables"]) parts.push(plates["teams-deployables"]);
  parts.push(fold({ id: "shape-who-talks", title: "Who talks to whom", sub: "every message that crosses a line", count: msgRows.length, open: msgRows.length <= 12,
    body: msgRows.length ? table(["Message", "Kind", "From", "To", "Delivery"], msgRows) : none("No connect step yet.") }));
  const empty = !asList(dec.bounded_contexts).length && !depRows.length && !msgRows.length;
  return section({ id: "shape", title: "The shape of the system", lede: "The parts, what ships, and what crosses the lines between them.",
    body: empty ? none("Nothing here yet: step 3 (decompose) draws the first lines.") : parts.join(""), count: asList(dec.bounded_contexts).length, empty, toolbar: toolbar("shape") });
}

// ---- diagrams -----------------------------------------------------------------------------------

// `plateList` is every drawing in page order; `elsewhere` names the ones another
// section already shows inline (the context map and teams in #shape, each flow in
// #flows): those become a one-line reference here rather than a second copy, so the
// page never asks a reader to scroll past the same picture twice.
export function secDiagrams(plateList, missing, status, elsewhere = new Map()) {
  const parts = [];
  if (status.pngNote) parts.push(`<p class="x-lede">${esc(status.pngNote)}</p>`);
  const refs = [];
  for (const p of plateList) {
    const where = elsewhere.get(p.id);
    if (!where) { parts.push(p.html); continue; }
    const links = [];
    if (p.files && p.files.svg) links.push(`<a href="${esc(p.files.svg)}" download>open SVG</a>`);
    if (p.files && p.files.png) links.push(`<a href="${esc(p.files.png)}" download>PNG</a>`);
    refs.push(`<li data-search-row="${esc(`${p.id} ${p.title || ""}`)}"><a href="#${esc(p.anchor)}">${esc(p.title || p.id)}</a> <span class="x-id">${esc(p.id)}</span>` +
      ` <span class="plate-ref">drawn in ${esc(where)}</span>${links.length ? `<span class="plate-files">${links.join('<span class="sep">/</span>')}</span>` : ""}</li>`);
  }
  if (refs.length) parts.push(`<ul class="plate-refs">${refs.join("")}</ul>`);
  if (missing.length) {
    parts.push(fold({ id: "diagrams-missing", title: "Not drawn yet", sub: "what each missing step would add", count: missing.length,
      body: `<ul class="x-list">${missing.map((m) => `<li><code>${esc(m.id)}</code> needs step ${STEP_NO[m.step] || "?"} (${esc(m.step)}): ${esc(m.reason)}</li>`).join("")}</ul>` }));
  }
  const empty = !plateList.length;
  return section({ id: "diagrams", title: "The drawings", lede: "Every diagram the run allows, drawn from its JSON. Drag to pan, hold Ctrl or Cmd and scroll to zoom, click a box to see only what touches it, double-click to reset.",
    body: empty ? none("Nothing to draw yet: the first drawing (the event storm) needs step 2 (discover).") + parts.join("") : parts.join(""),
    count: plateList.length, empty });
}

// ---- words --------------------------------------------------------------------------------------

// A meaning that is only punctuation ("….", "-", "TBD") is a placeholder the run left;
// it is shown as such rather than as a row of dots that looks like a rendering fault.
function glossaryMeaning(d) {
  const t = String(d || "").replace(/_\(.*?\)_/g, "").replace(/_Avoid_:/g, "Avoid:").trim();
  if (!t || /^[\s.…\-–—?]*$/.test(t) || /^tbd$/i.test(t)) return `<span class="x-empty">no definition recorded</span>`;
  return esc(t);
}

export function secWords(ws) {
  const g = ws.glossary || "";
  // Terms, with the heading they sit under (glossary.md keeps a shared list and then
  // one list per context; the same word can appear in several).
  const terms = [];
  let under = "";
  for (const line of g.split(/\r?\n/)) {
    const h = /^#{1,3}\s+(.+?)\s*$/.exec(line);
    if (h) { under = h[1]; continue; }
    const m = /^\*\*(.+?)\*\*\s*[-–—]\s*(.*)$/.exec(line);
    if (m) terms.push([m[1], m[2], under]);
  }
  const differs = [...new Set(terms.filter(([, d]) => /differs (by|from|between)/i.test(d)).map(([t]) => t))];
  const sections = new Set(terms.map(([, , u]) => u));
  const multi = sections.size > 1;
  const rows = terms.map(([t, d, u]) => ({ attrs: { "data-search-row": `${t} ${u}` },
    cells: [`<b>${esc(t)}</b>`, ...(multi ? [`<span class="x-id">${esc(u)}</span>`] : []), glossaryMeaning(d)] }));
  const warn = differs.length
    ? `<p class="x-lede"><b>${differs.length} word${differs.length === 1 ? " means" : "s mean"} different things in different parts.</b> That is normal and it is also a line somebody has to keep straight: ${differs.slice(0, 12).map(code).join(", ")}.</p>` : "";
  const body = rows.length ? warn + fold({ id: "words-all", title: "Every term", count: rows.length, open: rows.length <= 16, body: table(multi ? ["Term", "Where", "Means"] : ["Term", "Means"], rows) })
    : none("No glossary.md yet: step 2 (discover) seeds it.");
  return section({ id: "words", title: "The words", lede: "A word that means two things is where the parts were cut. Worth two minutes.", body, count: rows.length, empty: !rows.length });
}

// ---- steps --------------------------------------------------------------------------------------

export function secSteps(ws, items) {
  const per = {};
  for (const it of items) (per[it.step] ||= []).push(it);
  const man = (ws.manifest && ws.manifest.steps) || {};
  const blocks = STEPS.map((s) => {
    const d = ws.steps[s];
    const st = (man[s] && man[s].status) || "pending";
    if (!isDict(d)) {
      return `<article class="steprow missing" id="step-${s}" data-search-row="${esc(s)}"><header><span class="sn">${STEP_NO[s]}</span><b>${esc(s)}</b>${chip("not run", "")}` +
        `<span class="x-sub">${esc(STEP_BLURB[s])}</span></header></article>`;
    }
    const pw = isDict(d.plain_words) ? d.plain_words : null;
    const body = pw
      ? ["what", "decided", "assumed", "riskiest"].filter((k) => pw[k]).map((k) => `<div class="pw"><div class="pwk">${esc(k)}</div><div class="pwv">${gloss(pw[k])}</div></div>`).join("")
      : none("This step has no plain-language summary, so the only people who can check it are the ones who can read the whole artifact.");
    const n = (x, one, many) => `${x} ${x === 1 ? one : many}`;
    const counts = `${n(asList(d.assumptions).length, "guess", "guesses")} &middot; ${n(asList(d.open_questions).length, "open question", "open questions")} &middot; ${n(asList(d.notes_for_downstream).length, "note forward", "notes forward")}` +
      (asList(d.decisions).length ? ` &middot; ${asList(d.decisions).length} decision${asList(d.decisions).length === 1 ? "" : "s"}` : "");
    const mine = per[s] || [];
    const flag = mine.length ? chip(`${mine.length} on the list`, "hot") : "";
    // Anything the envelope does not name is still shown, in full, so a change to the
    // chain can never silently hide data (review.py's rule 2).
    const extra = Object.fromEntries(Object.entries(d).filter(([k]) => !KNOWN_ENVELOPE.has(k)));
    const raw = fold({ id: `step-${s}-raw`, title: "Everything else this step recorded", sub: `${Object.keys(extra).length} key(s), shown so a change to the chain cannot hide data`, count: Object.keys(extra).length,
      body: `<pre class="raw">${esc(JSON.stringify(extra, null, 2).slice(0, 400000))}</pre>` });
    return `<article class="steprow" id="step-${s}" data-search-row="${esc(`${s} ${pw ? Object.values(pw).join(" ") : ""}`)}"><header><span class="sn">${STEP_NO[s]}</span><b>${esc(s)}</b>` +
      `${chip(st, st === "done" ? "ok" : "warn")}${flag}<span class="x-sub">${esc(STEP_BLURB[s])}</span></header>` +
      `<div class="pwgrid">${body}</div><p class="x-counts">${counts}</p>${raw}</article>`;
  });
  return section({ id: "steps", title: "Step by step, in plain words", lede: "Each step in four sentences: what it did, what it decided, what it guessed, and what hurts most if the guess is wrong.",
    body: blocks.join(""), count: Object.keys(ws.steps).length });
}

// ---- canvases -----------------------------------------------------------------------------------

export function secCanvases(ws) {
  const df = ws.steps.define || {};
  const ctxs = contextsOf(ws);
  const byId = new Map(ctxs.map((c) => [c.id, c]));
  const blocks = asList(df.canvases).filter(isDict).map((c) => {
    const ctx = byId.get(String(c.context));
    const bits = [`<p class="purpose">${gloss(c.purpose || "")}</p>`];
    const sc = isDict(c.strategic_classification) ? c.strategic_classification : {};
    bits.push(`<div class="x-chips">${chip(sc.domain || "?", sc.domain === "core" ? "core" : "")}${chip(c.implementation_pattern || "?")}${chip(`team: ${c.owning_team ?? "?"}`)}${chip(`ships in: ${c.deployable ?? "?"}`)}` +
      (ctx ? `<a class="x-chip" href="#${esc(`ctx-${slug(c.context)}`)}">in the domain tree</a>` : "") + `</div>`);
    for (const [key, label] of [["business_decisions", "Rules it decides"], ["verification_metrics", "How you know it is healthy"], ["domain_roles", "What kind of thing it is"]]) {
      const vals = asList(c[key]);
      if (vals.length) bits.push(`<h4 class="x-h">${esc(label)}</h4><ul class="x-list">${vals.map((v) => `<li>${gloss(String(v))}</li>`).join("")}</ul>`);
    }
    for (const side of ["inbound", "outbound"]) {
      const rows = asList(c[side]).filter(isDict).map((x) => [esc(x.collaborator), esc(x.relationship || ""), asList(x.messages).map((m) => code(isDict(m) ? m.id : m)).join(" ")]);
      if (rows.length) bits.push(`<h4 class="x-h">${side === "inbound" ? "Comes in from" : "Goes out to"}</h4>${table(["Who", "Relationship", "Messages"], rows)}`);
    }
    const ul = asList(c.ubiquitous_language).filter(isDict);
    if (ul.length) bits.push(`<h4 class="x-h">Its words</h4>${table(["Term", "Means here"], ul.map((t) => [`<b>${esc(t.term)}</b>`, esc(t.definition)]))}`);
    const title = ctx ? ctxChip(ctx.id, c.name || ctx.name, ctx.color.slot, false) : esc(c.name || c.context);
    return fold({ id: `canvas-${slug(c.context)}`, title: `${title} <span class="x-id">${esc(c.context)}</span>`, sub: esc(String(c.purpose || "").slice(0, 110).replace(/\n/g, " ")),
      body: bits.join(""), search: `${c.context} ${c.name || ""} ${c.purpose || ""}` });
  });
  return section({ id: "canvases", title: "What each part promises", lede: "One card per part of the business. This is the page somebody builds from.",
    body: blocks.join("") || none("No define step yet."), count: blocks.length, empty: !blocks.length, toolbar: toolbar("canvases") });
}

// ---- flows --------------------------------------------------------------------------------------

export function secFlows(ws, plates) {
  const cn = ws.steps.connect || {};
  const blocks = asList(cn.flows).filter(isDict).map((f) => {
    const rows = asList(f.steps).filter(isDict).map((s) => ({ attrs: { "data-search-row": `${s.message || ""} ${s.from || ""} ${s.to || ""}` },
      cells: [esc(s.seq), esc(s.from), esc(s.to), `<a class="x-id-strong" href="#${esc(`msg-${slug(s.message)}`)}">${esc(s.message)}</a>`, esc(s.kind), gloss(s.via || "")] }));
    const summary = f.summary ? `<p>${gloss(f.summary)}</p>` : "";
    const plateHtml = plates[`flow-${f.id}`] || "";
    const stepsFold = fold({ id: `flow-${slug(f.id)}-steps`, title: "Step by step", count: rows.length, open: !plateHtml,
      body: rows.length ? table(["#", "From", "To", "Message", "Kind", "How"], rows) : none("No steps recorded.") });
    return `<article class="flow" id="flow-${esc(slug(f.id))}" data-search-row="${esc(`${f.id} ${f.name || ""} ${f.summary || ""}`)}">` +
      `<h3 class="flow-title">${esc(f.name || f.id)} <span class="x-id">${esc(f.id)}</span></h3>${summary}${plateHtml}${stepsFold}</article>`;
  });
  return section({ id: "flows", title: "What happens, start to finish", lede: "Each story told once, step by step.",
    body: blocks.join("") || none("No connect step yet."), count: blocks.length, empty: !blocks.length, toolbar: toolbar("flows") });
}

// Relative link from the page to a file, with forward slashes so it works as a URL.
export function relLink(fromFile, toFile) {
  return path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
}
