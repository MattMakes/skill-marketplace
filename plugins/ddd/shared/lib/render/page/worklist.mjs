// The worklist: everything that needs a person, worst first, in one printed order.
//
// Carried from review.py's build_worklist/note_trace with one addition at the top of
// the order: an OPEN DECISION (a decisions[] entry with no chosen option) leads,
// because a design that has not decided is not yet a design somebody can check.
//
// Each item is copied from the run's JSON or from a gate's output. Nothing is
// invented here, and the order is printed on the page so it is never a matter of
// taste. Every item carries `anchor`, the id of the element that shows the thing on
// this page (a decision row, an artifact node, a step), so the list is a table of
// contents for the evidence, not a summary of it.

import { STEPS, FOLDER, STEP_NO } from "../../workspace.mjs";
import { decisionRows, slug } from "../explorers/index.mjs";

// Printed on the page so the ordering is never a matter of taste.
export const ORDER = [
  ["decision", "Not yet decided", "A call the chain argued but did not make. Every step after it is built on one of the options."],
  ["blocking", "Stops the work", "Somebody has to answer this before the work downstream can be trusted."],
  ["error", "A gate says this is broken", "An automatic check failed. This is not an opinion."],
  ["guess", "A guess nobody checked", "The chain made this up because nothing upstream said. Low confidence."],
  ["stale", "Written before something upstream changed", "This step may describe a design that has since moved."],
  ["note", "Check this was heard", "One step left a note for another. The other never names it."],
  ["warning", "A gate is uneasy", "Not broken, but worth a look."],
];
export const SEVERITY = Object.fromEntries(ORDER.map(([k], i) => [k, i]));
export const KIND_LABEL = Object.fromEntries(ORDER.map(([k, l]) => [k, l]));
export const KIND_WHY = Object.fromEntries(ORDER.map(([k, , w]) => [k, w]));

// A guess about one of these is the expensive kind.
export const COSTLY = /\b(money|currency|price|pay|payment|charge|billing|invoice|refund|identity|identit|auth|permission|access|tenant|owner|legal|regulat|complian|retention|audit|privacy|gdpr|pii|language|framework|runtime|datastore|database)\w*/i;

const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const asList = (v) => (Array.isArray(v) ? v : []);
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Did the target step name this note?
//
// The contract says a step that merely AGREES with a note must not repeat it, so
// silence is what a correctly consumed note looks like. This can therefore never be
// a verdict: it is a prompt to go and check. Matching is strict (`<source> <ID>`) so
// a target's own note ids cannot be mistaken for a citation.
export function noteTrace(sourceStep, noteId, targetDoc) {
  if (!targetDoc) return true;
  const pat = new RegExp(`\\b${escapeRe(sourceStep)}(?:'s)?\\s+${escapeRe(noteId)}\\b`, "i");
  return pat.test(JSON.stringify(targetDoc));
}

// The anchor of an indexed object on this page: its node in the artifact browser
// (slug of the index key), which every indexed id is guaranteed to have.
function artifactAnchor(index, step, collection, id) {
  if (!index || id === undefined || id === null) return null;
  const entry = index.get(`${step}:${collection}:${id}`);
  return entry ? slug(entry.key) : null;
}

export function buildWorklist(workspace, gates) {
  const { steps, index } = workspace;
  const items = [];
  const add = (kind, step, title, detail, source, extra = {}) => {
    items.push({ kind, step, title: String(title || "").trim(), detail: String(detail || "").trim(), source, extra });
  };

  // 0. open decisions, in the explorers' order (blocking ones first, then by step)
  for (const row of decisionRows(workspace)) {
    if (!row.open) continue;
    const opts = row.options.map((o) => `${o.id}: ${o.summary}`).filter(Boolean);
    add("decision", row.step, row.question || `Decision ${row.id}`,
      opts.length ? `${row.options.length} option${row.options.length === 1 ? "" : "s"} on the table: ${opts.join(" / ")}` : "No options recorded.",
      `${FOLDER[row.step]}/${row.step}.json  decisions[${row.id}]`,
      { anchor: row.anchor, id: row.id, blocking: row.blocking, kind: row.kind, madeBy: row.madeBy });
  }

  // 1. blocking questions
  for (const s of STEPS) {
    const d = steps[s];
    if (!isDict(d)) continue;
    for (const q of asList(d.open_questions)) {
      if (isDict(q) && q.blocking) {
        add("blocking", s, q.text, "", `${FOLDER[s]}/${s}.json  open_questions[${q.id}]`,
          { owner: q.owner, anchor: artifactAnchor(index, s, "open_questions", q.id), id: q.id });
      }
    }
  }

  // 2 + 6. gate output, exactly as the gates said it
  const v = gates.validate || {};
  for (const [sev, kind] of [["errors", "error"], ["warnings", "warning"]]) {
    for (const row of asList(v[sev])) {
      const [step, msg] = Array.isArray(row) && row.length === 2 ? row : ["chain", String(row)];
      const k = kind === "warning" && String(msg).startsWith("stale:") ? "stale" : kind;
      add(k, STEPS.includes(step) ? step : null, String(msg), "", "ddd validate", { gateStep: step, anchor: STEPS.includes(step) ? `step-${step}` : null });
    }
  }
  const c = gates.contracts || {};
  for (const [sev, kind] of [["errors", "error"], ["warnings", "warning"]]) {
    for (const msg of asList(c[sev])) add(kind, "contracts", String(msg), "", "ddd contracts check", { anchor: "contracts" });
  }

  // 3. low-confidence assumptions
  for (const s of STEPS) {
    const d = steps[s];
    if (!isDict(d)) continue;
    for (const a of asList(d.assumptions)) {
      if (!isDict(a) || a.confidence !== "low") continue;
      const hit = COSTLY.exec(String(a.text || ""));
      add("guess", s, a.text,
        hit ? `This one touches ${hit[0].toLowerCase()}, which is the expensive kind to get wrong.` : "Overturn it here if it is wrong; every later step assumed it.",
        `${FOLDER[s]}/${s}.json  assumptions[${a.id}]`,
        { costly: !!hit, anchor: artifactAnchor(index, s, "assumptions", a.id), id: a.id });
    }
  }

  // 5. notes with no visible trace in the step they were addressed to
  for (const s of STEPS) {
    const d = steps[s];
    if (!isDict(d)) continue;
    for (const n of asList(d.notes_for_downstream)) {
      if (!isDict(n)) continue;
      for (const tgt of asList(n.for)) {
        if (steps[tgt] && !noteTrace(s, String(n.id || ""), steps[tgt])) {
          add("note", tgt,
            `Step ${STEP_NO[s]} (${s}) left a note for step ${STEP_NO[tgt]} (${tgt}), which never names it.`,
            n.text, `${FOLDER[s]}/${s}.json  notes_for_downstream[${n.id}]`,
            { from: s, to: tgt, anchor: artifactAnchor(index, s, "notes_for_downstream", n.id), id: n.id });
        }
      }
    }
  }

  // Stable sort: severity, then the expensive guesses first, then step order.
  items.forEach((it, i) => { it._i = i; });
  items.sort((x, y) => (SEVERITY[x.kind] ?? 9) - (SEVERITY[y.kind] ?? 9)
    || (x.extra.costly ? 0 : 1) - (y.extra.costly ? 0 : 1)
    || (STEP_NO[x.step] || 0) - (STEP_NO[y.step] || 0)
    || x._i - y._i);
  items.forEach((it) => { delete it._i; });
  return items;
}
