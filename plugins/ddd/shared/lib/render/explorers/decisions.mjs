// Decisions (design §5): every `decisions[]` entry of every step as one row of option
// cards, diagrams side by side on one grid when specs exist, the chosen option
// highlighted with its rationale beneath, `would_flip_if` under the row. Open
// decisions (no `chosen`) come first and are what the worklist picks up through
// `openDecisions()`.
//
// Diagrams are drawn by ../diagrams/decision.mjs (leaf 1.2.2) when it exists. It is
// imported late and optionally: without it, or when a spec file is missing, the card
// shows a neutral placeholder that names the spec path, never an error.
import fs from "node:fs";
import { resolvePath } from "../../workspace.mjs";
import {
  esc, slug, chip, ul, section, toolbar, STEPS, STEP_NO,
  idLink, home, homeOf, confidenceKind, isDict, asList,
} from "./html.mjs";

// All decisions as data, open first, then step order, then id order. Exported for
// the worklist (leaf 1.2.4) and the check.
export function decisionRows(workspace) {
  const { steps, index, dddDir, manifest } = workspace;
  const rows = [];
  for (const step of STEPS) {
    const doc = steps[step];
    if (!isDict(doc)) continue;
    asList(doc.decisions).forEach((d, i) => {
      if (!isDict(d) || !d.id) return;
      const entry = index.get(`${step}:decisions:${d.id}`) || null;
      const options = asList(d.options).filter((o) => isDict(o) && o.id).map((o) => {
        const specPath = typeof o.diagram === "string" && o.diagram ? o.diagram : null;
        const abs = specPath ? resolvePath(specPath, dddDir, manifest) : null;
        return {
          id: String(o.id), summary: o.summary || "", pros: asList(o.pros), cons: asList(o.cons), risks: asList(o.risks),
          diagram: specPath, specAbs: abs, specExists: abs ? fs.existsSync(abs) : false,
          chosen: d.chosen !== undefined && String(d.chosen) === String(o.id),
        };
      });
      const chosen = d.chosen !== undefined && d.chosen !== null && d.chosen !== "" ? String(d.chosen) : null;
      const records = isDict(d.records) ? d.records : {};
      const q = records.open_question ? asList(doc.open_questions).find((x) => isDict(x) && String(x.id) === String(records.open_question)) : null;
      const a = records.assumption ? asList(doc.assumptions).find((x) => isDict(x) && String(x.id) === String(records.assumption)) : null;
      const sup = typeof d.supersedes === "string" && d.supersedes ? d.supersedes : null;
      const supEntry = sup ? index.get(sup) || index.get(`${step}:${sup}`) || null : null;
      rows.push({
        step, stepNo: STEP_NO[step], id: String(d.id), index: i, entry,
        anchor: entry ? home.decision(entry, index) : `${step}-${slug(d.id)}`,
        question: d.question || "", kind: d.kind || "", options, chosen,
        open: chosen === null || !options.some((o) => o.chosen),
        confidence: d.confidence || "", rationale: d.rationale || "", wouldFlipIf: asList(d.would_flip_if),
        madeBy: d.made_by || "",
        records: {
          assumption: records.assumption ? { id: String(records.assumption), text: a ? a.text : null, confidence: a ? a.confidence : null } : null,
          openQuestion: records.open_question ? { id: String(records.open_question), text: q ? q.text : null, blocking: q ? q.blocking === true : false, owner: q ? q.owner : null } : null,
        },
        blocking: !!(q && q.blocking === true),
        supersedes: sup ? { ref: sup, entry: supEntry, anchor: supEntry ? homeOf(supEntry, index) : null } : null,
        raw: d,
      });
    });
  }
  const num = (id) => parseInt(String(id).replace(/\D+/g, ""), 10) || 0;
  rows.sort((x, y) => (x.open === y.open ? 0 : x.open ? -1 : 1) || (y.blocking - x.blocking) || (x.stepNo - y.stepNo) || (num(x.id) - num(y.id)) || x.id.localeCompare(y.id));
  return rows;
}

export function openDecisions(workspace) {
  return decisionRows(workspace).filter((r) => r.open);
}

// Late-bound renderer: { optionSvg(workspace, decision, option, opts) } or null.
// `opts.decisionRenderer` (any value, including null) overrides the import so a
// check can run with and without diagrams regardless of what is on disk.
async function loadRenderer(opts) {
  if (opts && opts.decisionRenderer !== undefined) return opts.decisionRenderer;
  try {
    const mod = await import("../diagrams/decision.mjs");
    if (typeof mod.optionSvg === "function") return mod;
  } catch {
    // no diagrams module yet, or it failed to load: placeholders are the honest answer
  }
  return null;
}

// Per-option SVG markup for a decision, keyed by option id. Any failure becomes a
// note on the card; the promise never rejects.
async function optionDiagrams(renderer, workspace, row) {
  const out = new Map();
  if (!renderer || typeof renderer.optionSvg !== "function") return out;
  for (const o of row.options) {
    if (!o.diagram || !o.specExists) continue;
    try {
      let spec;
      try { spec = JSON.parse(fs.readFileSync(o.specAbs, "utf8")); } catch (e) { out.set(o.id, { error: `spec unreadable: ${e.message}` }); continue; }
      const res = await renderer.optionSvg(workspace, row.raw, o, { step: row.step, spec, standalone: false });
      if (typeof res === "string" && res.includes("<svg")) out.set(o.id, { svg: res });
      else if (isDict(res) && typeof res.svg === "string" && res.svg.includes("<svg")) out.set(o.id, { svg: res.svg });
      else out.set(o.id, { error: (isDict(res) && res.note) || "renderer returned no SVG" });
    } catch (e) {
      out.set(o.id, { error: e && e.message ? e.message : String(e) });
    }
  }
  return out;
}

export async function section_(workspace, gates, opts = {}) {
  const ids = opts.ids;
  const claim = (want) => (ids ? ids.claim(want) : slug(want));
  const rows = decisionRows(workspace);
  const anySteps = STEPS.some((s) => workspace.steps[s]);
  if (!rows.length) {
    return section({
      id: "decisions", title: "Decisions, with the options that lost", empty: true, count: 0,
      lede: "Every design call a step had to argue, all options kept.",
      body: `<p class="x-empty">${anySteps ? "No step has recorded a decision yet; a step writes one when it has to argue a call (with the decision strategist) rather than read it off an upstream artifact." : "Nothing here yet: step 1 (understand) starts the chain; decisions appear as soon as a step has to argue a call."}</p>`,
    });
  }
  const renderer = await loadRenderer(opts);
  const blocks = [];
  for (const row of rows) blocks.push(await decisionNode(row, workspace, renderer, claim));
  const open = rows.filter((r) => r.open).length;
  const lede = [
    `${rows.length} decision${rows.length === 1 ? "" : "s"}`,
    open ? `<b>${open} still open</b>, listed first` : "all taken",
    "each option kept so you can see what was weighed",
  ].join(" · ") + ".";
  return section({ id: "decisions", title: "Decisions, with the options that lost", lede, body: blocks.join(""), count: rows.length, toolbar: toolbar("decisions") });
}
export { section_ as section };

async function decisionNode(row, workspace, renderer, claim) {
  const { index } = workspace;
  const diagrams = await optionDiagrams(renderer, workspace, row);
  const n = Math.max(1, row.options.length);
  const cards = row.options.map((o) => optionCard(o, row, diagrams.get(o.id), renderer)).join("");
  const head = [
    `<span class="x-dec-id"><code class="x-id x-id-strong">${esc(row.id)}</code></span>`,
    `<a class="x-chip" href="#${esc(`art-${row.step}`)}">step ${row.stepNo} · ${esc(row.step)}</a>`,
    row.kind ? chip(row.kind, "kind") : "",
    row.open ? chip(row.blocking ? "open, blocks the work" : "open", "hot") : chip("taken", "ok"),
    row.madeBy ? chip(`by ${row.madeBy}`) : "",
    row.confidence ? chip(`${row.confidence} confidence`, confidenceKind(row.confidence)) : "",
  ].filter(Boolean).join("");
  const under = [];
  if (row.wouldFlipIf.length) under.push(`<div class="x-flip"><span class="x-h-inline">Would flip if</span>${ul(row.wouldFlipIf.map(esc))}</div>`);
  const rec = [];
  if (row.records.assumption) rec.push(`recorded as assumption ${idLink(index, row.records.assumption.id, row.step)}${row.records.assumption.text ? ` <span class="x-muted">${esc(shorten(row.records.assumption.text, 120))}</span>` : ""}`);
  if (row.records.openQuestion) rec.push(`waits on question ${idLink(index, row.records.openQuestion.id, row.step)}${row.records.openQuestion.blocking ? ` ${chip("blocking", "hot")}` : ""}${row.records.openQuestion.owner ? ` <span class="x-muted">answer: ${esc(row.records.openQuestion.owner)}</span>` : ""}`);
  if (row.supersedes) rec.push(`supersedes ${row.supersedes.anchor ? `<a class="x-id" href="#${esc(row.supersedes.anchor)}">${esc(row.supersedes.ref)}</a>` : `<code class="x-id">${esc(row.supersedes.ref)}</code>`}`);
  if (rec.length) under.push(`<p class="x-dec-records">${rec.join(" · ")}</p>`);
  const search = `${row.id} ${row.question} ${row.kind} ${row.options.map((o) => `${o.id} ${o.summary}`).join(" ")}`;
  return `<article class="x-dec${row.open ? " is-open" : ""}" id="${esc(claim(row.anchor))}" data-decision="${esc(row.id)}" data-step="${esc(row.step)}" data-open="${row.open ? "true" : "false"}" data-search-row="${esc(search)}" data-search-text="${esc(search)}">` +
    `<header class="x-dec-head">${head}<h3 class="x-dec-q">${esc(row.question || "(no question written)")}</h3></header>` +
    `<div class="x-dec-row" style="--n:${n}" data-options="${n}">${cards}</div>` +
    (under.length ? `<footer class="x-dec-foot">${under.join("")}</footer>` : "") +
    `</article>`;
}

function optionCard(o, row, dia, renderer) {
  const three = [["Pros", o.pros, "pros"], ["Cons", o.cons, "cons"], ["Risks", o.risks, "risks"]]
    .filter(([, l]) => l.length)
    .map(([label, list, k]) => `<div class="x-opt-list x-opt-${k}"><span class="x-h-inline">${label}</span>${ul(list.map(esc))}</div>`).join("");
  let fig = "";
  if (o.diagram) {
    if (dia && dia.svg) fig = `<figure class="x-opt-fig" data-diagram-for="${esc(o.id)}">${dia.svg}</figure>`;
    else if (!o.specExists) fig = placeholder(o, `spec file not found: ${o.diagram}`);
    else if (!renderer) fig = placeholder(o, `spec at ${o.diagram}; the diagram renderer is not available in this build`);
    else fig = placeholder(o, `spec at ${o.diagram}; ${dia && dia.error ? dia.error : "no diagram produced"}`);
  }
  return `<div class="x-opt${o.chosen ? " is-chosen" : ""}" data-option="${esc(o.id)}"${o.chosen ? ' data-chosen="true"' : ""}>` +
    `<div class="x-opt-head"><span class="x-opt-id">${esc(o.id)}</span>${o.chosen ? `<span class="x-opt-mark">chosen</span>` : ""}</div>` +
    `<p class="x-opt-summary">${esc(o.summary)}</p>` +
    fig + three +
    (o.chosen && row.rationale ? `<div class="x-opt-why"><span class="x-h-inline">Why</span><p>${esc(row.rationale)}</p></div>` : "") +
    `</div>`;
}

function placeholder(o, note) {
  return `<figure class="x-opt-fig x-opt-missing" data-diagram-for="${esc(o.id)}" data-missing="true"><span class="x-muted">no diagram</span><small>${esc(note)}</small></figure>`;
}

function shorten(s, n) {
  s = String(s);
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
