// The old `sec_everything`: every assumption and every open question across all
// steps, in two tables, so nothing the run guessed or asked can hide in a step.
import { esc, chip, fold, table, section, STEPS, home, entryFor, confidenceKind, isDict, asList } from "./html.mjs";

export function section_(workspace, gates, opts = {}) {
  const { steps, index } = workspace;
  const rowsA = [];
  const rowsQ = [];
  for (const s of STEPS) {
    const d = steps[s];
    if (!isDict(d)) continue;
    for (const a of asList(d.assumptions).filter(isDict)) {
      const e = entryFor(index, s, "assumptions", a.id);
      rowsA.push({
        attrs: { "data-search-row": `${s} ${a.id} ${a.text || ""}`, "data-search-text": `${s} ${a.id} ${a.text || ""}` },
        cells: [esc(s), e ? `<a class="x-id" href="#${esc(home.artifact(e))}">${esc(a.id)}</a>` : `<code class="x-id">${esc(a.id)}</code>`, chip(a.confidence || "?", confidenceKind(a.confidence)), esc(a.text || "")],
      });
    }
    for (const q of asList(d.open_questions).filter(isDict)) {
      const e = entryFor(index, s, "open_questions", q.id);
      rowsQ.push({
        attrs: { "data-search-row": `${s} ${q.id} ${q.text || ""}`, "data-search-text": `${s} ${q.id} ${q.text || ""}`, "data-blocking": q.blocking ? "true" : "false" },
        cells: [esc(s), e ? `<a class="x-id" href="#${esc(home.artifact(e))}">${esc(q.id)}</a>` : `<code class="x-id">${esc(q.id)}</code>`, q.blocking ? chip("stops work", "hot") : chip("can wait"), esc(q.owner || ""), esc(q.text || "")],
      });
    }
  }
  // Blocking questions first, then step order (a stable sort keeps step order).
  rowsQ.sort((x, y) => (y.attrs["data-blocking"] === "true") - (x.attrs["data-blocking"] === "true"));
  const any = Object.keys(steps).length > 0;
  const body = any
    ? fold({ title: "Every guess", count: rowsA.length, kind: "all-assumptions", open: false, body: rowsA.length ? table(["Step", "id", "Sure?", "The guess"], rowsA) : `<p class="x-muted">No assumptions recorded.</p>` }) +
      fold({ title: "Every open question", count: rowsQ.length, kind: "all-questions", open: rowsQ.length > 0, body: rowsQ.length ? table(["Step", "id", "Urgency", "Answer", "The question"], rowsQ) : `<p class="x-muted">No open questions recorded.</p>` })
    : `<p class="x-empty">Nothing here yet: step 1 (understand) writes the first assumptions and open questions.</p>`;
  return section({
    id: "everything",
    title: "Everything the run guessed or asked",
    lede: `${rowsA.length} guess${rowsA.length === 1 ? "" : "es"} and ${rowsQ.length} open question${rowsQ.length === 1 ? "" : "s"} across ${Object.keys(steps).length} step${Object.keys(steps).length === 1 ? "" : "s"}.`,
    body, count: rowsA.length + rowsQ.length, empty: !any,
  });
}
export { section_ as section };
