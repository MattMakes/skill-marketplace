// `ddd review [<ddd-dir>] [-o FILE] [--title T] [--no-diagrams] [--relayout]`: one
// self-contained HTML page that makes a whole DDD run reviewable in one sitting, plus
// the diagram files beside it. Also the module `ddd mark` imports after writing the
// manifest (buildPage, then renderDiagrams; see bin/ddd.mjs reviewHook).
//
// Why this exists. A finished run is 100+ files of dense technical English. Nobody
// reads that, so the mistakes that cost the most stay invisible. This page puts the
// things that need a human FIRST, in short sentences, and keeps the whole run
// underneath them so a reviewer never has to leave the file.
//
// Two rules keep it honest (carried from review.py):
//
// 1. It renders the gates, it does not re-derive them. Every error, warning and
//    staleness verdict comes from validate() and the contracts deep check. The page can
//    never say OK while a gate says FAIL, and when the gates learn a new check the page
//    shows it without an edit here.
// 2. It reads the JSON, never the prose. Markdown artifacts are linked, never parsed.
//    Anything a step's JSON carries that this module does not recognise is still shown
//    ("everything else this step recorded"), so a change to the chain can never
//    silently hide data.
//
// Looking at a run must never change it. validate() is called with persist:false and
// the contracts check runs on a throwaway COPY; buildPage only READS the diagram layout
// memory (<ddd>/diagrams/<id>.layout.json) so inline drawings match the files, and only
// renderDiagrams writes under <ddd>/diagrams.
//
// Exit codes: 0 ok, 2 usage/IO. A failing gate is reported on the page, never as a
// non-zero exit: the review is the place to read it.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadWorkspace, STEPS } from "./workspace.mjs";
import { validate } from "./validate.mjs";
import { sections as explorerSections, explorersCss, IdRegistry, decisionRows, esc } from "./render/explorers/index.mjs";
import { available, GENERATORS, renderAll } from "./render/diagrams/index.mjs";
import { decisionSvg, renderDecision } from "./render/diagrams/decision.mjs";
import { themeCss } from "./render/core/svg.mjs";
import { findChrome, svgToPng, NO_CHROME_NOTE } from "./render/core/chrome.mjs";
import { pageCss } from "./render/page/css.mjs";
import { buildWorklist } from "./render/page/worklist.mjs";
import {
  secVerdict, secWorklist, secShape, secDiagrams, secWords, secSteps, secCanvases, secFlows, plate, relLink,
} from "./render/page/sections.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME = path.join(HERE, "render", "core", "runtime.js");
const PAGE_JS = path.join(HERE, "render", "page", "page.js");
const CONTRACTS_CHECK = path.resolve(HERE, "..", "..", "skills", "ddd-contracts", "scripts", "check.mjs");

const USAGE = "usage: ddd review [<ddd-dir>] [-o FILE] [--title TITLE] [--no-diagrams] [--relayout]";

// Page order. Fixed by the plan; the checks assert it.
export const SECTION_ORDER = ["verdict", "worklist", "decisions", "shape", "diagrams", "domain", "stores", "words", "steps", "canvases", "contracts", "flows", "artifacts", "everything"];

// Short names for the index tabs, grouped the way a reader moves through the file.
const TABS = [
  ["First", [["verdict", "Verdict"], ["worklist", "Do first"], ["decisions", "Decisions"]]],
  ["The design", [["shape", "Shape"], ["diagrams", "Drawings"], ["domain", "Domain"], ["stores", "Data"], ["words", "Words"]]],
  ["The record", [["steps", "Steps"], ["canvases", "Parts"], ["contracts", "Messages"], ["flows", "Stories"], ["artifacts", "Artifacts"], ["everything", "Guesses"]]],
];

const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const asList = (v) => (Array.isArray(v) ? v : []);

// ---- gates ----------------------------------------------------------------------------------------

// validate() in-process without persisting, and the contracts deep check on a throwaway
// copy named `ddd` (its manifest's ddd_dir is set to match, so project-root-relative
// artifact paths resolve inside the copy). Both are wrapped: a gate that cannot run is
// reported on the page as "Careful", never thrown, and the page then refuses to say OK.
export function runGates(dddDir) {
  const out = { validate: null, contracts: null, errors: [] };
  try {
    const r = validate(dddDir, { persist: false });
    out.validate = { ok: r.ok, errors: r.errors, warnings: r.warnings, info: r.info, steps: r.steps, stale: r.stale };
  } catch (e) {
    out.errors.push(`validate gate could not be run: ${e && e.message ? e.message : e}`);
  }
  return out;
}

export async function runContractsGate(dddDir, gates) {
  if (!fs.existsSync(CONTRACTS_CHECK)) return gates;
  let tmp = null;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-review-"));
    const copy = path.join(tmp, "ddd");
    fs.cpSync(dddDir, copy, { recursive: true });
    const mpath = path.join(copy, "manifest.json");
    if (fs.existsSync(mpath)) {
      try {
        const m = JSON.parse(fs.readFileSync(mpath, "utf8"));
        if (isDict(m)) { m.ddd_dir = "ddd"; fs.writeFileSync(mpath, `${JSON.stringify(m, null, 2)}\n`); }
      } catch { /* an unreadable manifest is validate's finding, not ours */ }
    }
    const { cmdCheck } = await import(pathToFileURL(CONTRACTS_CHECK).href);
    const lines = [];
    cmdCheck({ json: true, strict: false }, copy, (s) => lines.push(String(s)));
    gates.contracts = JSON.parse(lines.join("\n"));
  } catch (e) {
    // A missing connect.json is an IoError from the check: on a half-finished run that
    // is expected, and the page says the contracts gate did not run rather than FAIL.
    const msg = e && e.message ? e.message : String(e);
    if (/05-connect\/connect\.json not found/.test(msg)) gates.contracts = null;
    else gates.errors.push(`contracts gate could not be run: ${msg}`);
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  }
  return gates;
}

// ---- diagrams -------------------------------------------------------------------------------------

function readLayout(dir, id) {
  const file = path.join(dir, `${id}.layout.json`);
  try { return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null; } catch { return null; }
}

// Every diagram the run allows, drawn in memory with standalone:false (the page embeds
// the theme once) and the same layout memory the files use, so the inline drawing and
// the file are the same picture. Decision composites follow, one per decision that has
// at least one option diagram. Nothing is written here.
async function inlineDiagrams(ws, diagramsDir, warnings) {
  const out = [];
  const { available: ok, missing } = available(ws);
  for (const { id, family } of ok) {
    const g = GENERATORS.find((x) => x.family === family);
    try {
      const spec = g.module.spec(ws, { id });
      const res = await g.module.svg(spec, { previous: readLayout(diagramsDir, spec.id), standalone: false });
      out.push({ id: spec.id, title: spec.title, subtitle: spec.subtitle, svg: res.svg, wide: spec.kind === "timeline" || family === "event-storm" });
      for (const w of res.warnings || []) warnings.push(`${spec.id}: ${w}`);
    } catch (e) {
      warnings.push(`${id}: could not draw: ${e && e.message ? e.message : e}`);
      out.push({ id, title: id, svg: null, note: `Could not draw ${id}: ${e && e.message ? e.message : e}` });
    }
  }
  for (const row of decisionRows(ws)) {
    if (!row.options.some((o) => o.specExists)) continue;
    const name = decisionFileName(ws, row);
    const id = `decision-${name}`;
    try {
      const res = await decisionSvg(ws, row.step, row.raw, { standalone: false });
      out.push({ id, title: `Decision ${row.id} (${row.step}): ${row.question || ""}`.trim(), subtitle: `${id} · ${row.step}.json`, svg: qualifyDecisionSvg(res.svg, row, name), wide: true, decision: { id: name }, anchor: `plate-${id}` });
      for (const w of res.warnings || []) warnings.push(`${id}: ${w}`);
    } catch (e) {
      warnings.push(`${id}: could not draw: ${e && e.message ? e.message : e}`);
    }
  }
  return { drawn: out, missing };
}

// Decision ids are unique within a step, not across the run (the mealkit example has a
// decompose D1 and an organise D1). The first row with an id keeps the plain file name
// the plan's vocabulary promises (decisions/D1.svg); a later step's same id is written
// as decisions/<step>-D1.svg, and its DOM ids are qualified the same way so two
// composites on one page do not share element ids.
function decisionFileName(ws, row) {
  // "First" is step order, the same rule `ddd decision render <dir> <Did>` uses to pick a
  // decision, so decisions/D1.svg is the same picture whichever command wrote it.
  const first = decisionRows(ws).filter((r) => r.id === row.id).sort((a, b) => a.stepNo - b.stepNo)[0];
  return first && first.step === row.step ? row.id : `${row.step}-${row.id}`;
}
// Only the INLINE copy is qualified (both spellings: data-diagram keeps the case, domId()
// lowercases element and marker ids); a standalone file has nothing to collide with and is
// written exactly as decisionSvg produces it.
function qualifyDecisionSvg(svg, row, name) {
  if (name === row.id) return svg;
  return svg.split(`decision-${row.id}`).join(`decision-${name}`)
    .split(`decision-${row.id.toLowerCase()}`).join(`decision-${name.toLowerCase()}`);
}

// Writes <ddd>/diagrams/<id>.svg (+ .layout.json) for every available diagram and
// <ddd>/diagrams/decisions/<Did>.svg for every decision with option diagrams, then a
// PNG beside each SVG when a Chrome is found. Without Chrome: {png: [], note}, never an
// error. DDD_RENDER_FAIL=1 throws so the mark seam's try/catch can be tested.
export async function renderDiagrams(dddDirIn, { relayout = false } = {}) {
  if (process.env.DDD_RENDER_FAIL === "1") throw new Error("renderDiagrams forced to fail (DDD_RENDER_FAIL=1)");
  const dddDir = path.resolve(dddDirIn || "ddd");
  const ws = loadWorkspace(dddDir);
  const outDir = path.join(dddDir, "diagrams");
  const warnings = [];
  const svg = [];
  const r = await renderAll(ws, { outDir, standalone: true, relayout });
  for (const w of r.written) svg.push(w.svg);
  for (const w of r.warnings) warnings.push(w);
  for (const row of decisionRows(ws)) {
    if (!row.options.some((o) => o.specExists)) continue;
    const name = decisionFileName(ws, row);
    try {
      if (name === row.id) {
        // The plan's path: `ddd decision render` and the page agree on decisions/<Did>.svg.
        const d = await renderDecision(ws, row.id, { outDir: path.join(outDir, "decisions"), png: false });
        svg.push(d.svg);
        for (const w of d.warnings) warnings.push(`decision-${row.id}: ${w}`);
      } else {
        const res = await decisionSvg(ws, row.step, row.raw, { standalone: true });
        const file = path.join(outDir, "decisions", `${name}.svg`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, res.svg);
        svg.push(file);
        for (const w of res.warnings || []) warnings.push(`decision-${name}: ${w}`);
      }
    } catch (e) {
      warnings.push(`decision-${name}: ${e && e.message ? e.message : e}`);
    }
  }
  const png = [];
  let note = "";
  const chrome = findChrome();
  if (!chrome) note = NO_CHROME_NOTE;
  else {
    for (const file of svg) {
      const target = file.replace(/\.svg$/, ".png");
      const res = await svgToPng(file, target, { chrome, scale: 2 });
      if (res.ok) png.push(target);
      else warnings.push(`${path.basename(file)}: ${res.note}`);
    }
  }
  return { svg, png, note, warnings, skipped: r.skipped };
}

// ---- page -----------------------------------------------------------------------------------------

function stepStatus(ws, gates) {
  const man = (ws.manifest && ws.manifest.steps) || {};
  const done = STEPS.filter((s) => man[s] && man[s].status === "done").length;
  const staleSteps = new Set();
  for (const row of asList(gates.validate && gates.validate.warnings)) {
    if (Array.isArray(row) && String(row[1]).startsWith("stale:")) staleSteps.add(row[0]);
  }
  for (const s of STEPS) if (man[s] && man[s].status === "stale") staleSteps.add(s);
  const stale = staleSteps.size;
  return { done, stale, pending: Math.max(0, STEPS.length - done - stale) };
}

function stripHtml(status, gates) {
  const gatesRan = !!gates.validate;
  const ok = gatesRan && gates.validate.ok !== false && !(gates.contracts && gates.contracts.ok === false);
  const bits = [
    `<span class="st-steps">steps <b>${status.done} done</b>${status.stale ? `, <b class="st-warn">${status.stale} stale</b>` : ""}${status.pending ? `, ${status.pending} pending` : ""}</span>`,
    `<span class="${!gatesRan ? "st-warn" : ok ? "st-ok" : "st-bad"}">gates <b>${!gatesRan ? "not run" : ok ? "OK" : "FAIL"}</b></span>`,
    `<span>drawings <b>${status.diagrams}</b>${status.svgFiles ? ` (${status.svgFiles} SVG on disk)` : ""}</span>`,
    `<span class="${status.png ? "st-ok" : "st-warn"}">PNG <b>${status.png ? "yes" : "no"}</b></span>`,
  ];
  if (status.pngNote) bits.push(`<span class="st-note">${esc(status.pngNote)}</span>`);
  return `<div class="strip"><div class="strip-row">${bits.join("")}</div></div>`;
}

function tabsHtml(secs) {
  const byId = new Map(secs.map((s) => [s.id, s]));
  const groups = TABS.map(([label, list]) => {
    const links = list.map(([id, name]) => {
      const s = byId.get(id);
      const n = s && s.count !== undefined && s.count !== null && s.count !== "" ? `<span class="n">${esc(s.count)}</span>` : "";
      return `<li><a href="#${id}"${s && s.empty ? ' class="is-empty"' : ""}>${esc(name)}${n}</a></li>`;
    }).join("");
    return `<li class="tabs-group">${esc(label)}</li>${links}`;
  });
  return `<nav class="tabs" aria-label="Chapters"><ol>${groups.join("")}</ol></nav>`;
}

function directionComment() {
  return `<!--
THESIS: A finished DDD run is a case file: evidence (the steps' JSON), exhibits (what needs a person), a verdict. Cover sheet, exhibit list, then the evidence chapters with index tabs; it refuses stat tiles, a card grid and a table per section.
OWN-WORLD: The diagrams' own language (palette.mjs): Iowan Old Style titles and exhibit numbers, Avenir Next text, SF Mono for ids only; restrained neutrals with the diagrams' semantic hues meaning what they mean there (event orange stops, core amber guesses, store green passes, external violet notes); one hairline system, no cards.
STORY: The reviewer reads what exists, what needs a person and what stops the work in one paragraph, works the numbered exhibits, and follows each one to its evidence without leaving the file.
FIRST VIEWPORT: Docket header (title, finder, theme), the status strip, index tabs on the left, the cover sheet: the 44px count headline, the verdict paragraph, four facts as one ruled line; the first exhibits begin below.
FORM: Case file / dossier, structure 3 of 7 on the grounded list; seed key b449a5a4 (impeccable concept-seed, scope surface, mode read).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review and the verdict (REVIEW.md); the visual world is inherited from palette.mjs, so DIRECTION.md records it and no DESIGN.md is written
-->`;
}

// Builds the page. Never throws on a half-finished run: every section builder and every
// drawing is wrapped, and a failure becomes an honest empty state plus a warning.
export async function buildPage(dddDirIn, { out, title, diagrams = true } = {}) {
  const dddDir = path.resolve(dddDirIn || "ddd");
  if (!fs.existsSync(dddDir) || !fs.statSync(dddDir).isDirectory()) throw new Error(`error: ${dddDir} does not exist`);
  const warnings = [];
  const ws = loadWorkspace(dddDir);
  for (const p of ws.problems || []) warnings.push(`${p.step}: ${p.error}`);
  const gates = await runContractsGate(dddDir, runGates(dddDir));
  const items = buildWorklist(ws, gates);
  const outFile = path.resolve(out || path.join(dddDir, "review.html"));
  const diagramsDir = path.join(dddDir, "diagrams");

  // Drawings, in memory.
  let drawn = [];
  let missing = [];
  if (diagrams) {
    try { ({ drawn, missing } = await inlineDiagrams(ws, diagramsDir, warnings)); } catch (e) { warnings.push(`diagrams: ${e && e.message ? e.message : e}`); }
  } else {
    missing = available(ws).missing;
  }
  const files = (id, decision) => {
    const base = decision ? path.join(diagramsDir, "decisions", decision) : path.join(diagramsDir, id);
    const f = {};
    if (fs.existsSync(`${base}.svg`)) f.svg = relLink(outFile, `${base}.svg`);
    if (fs.existsSync(`${base}.png`)) f.png = relLink(outFile, `${base}.png`);
    return f;
  };
  const plates = {};
  const plateList = [];
  const flowIds = new Set(asList((ws.steps.connect || {}).flows).filter(isDict).map((f) => `flow-${f.id}`));
  const elsewhere = new Map();
  for (const d of drawn) {
    const f = files(d.id, d.decision ? d.decision.id : null);
    const anchor = d.anchor || `plate-${d.id}`;
    const html = plate({ id: d.id, svg: d.svg, title: d.title, subtitle: d.subtitle, wide: d.wide, note: d.note, files: f, anchor });
    plates[d.id] = html;
    plateList.push({ id: d.id, title: d.title, html, files: f, anchor });
    if (d.svg && (d.id === "context-map" || d.id === "teams-deployables")) elsewhere.set(d.id, "The shape of the system");
    if (d.svg && flowIds.has(d.id)) elsewhere.set(d.id, "What happens, start to finish");
  }

  // Status for the strip and the cover.
  const chrome = findChrome();
  const onDisk = (ext) => {
    let n = 0;
    for (const dir of [diagramsDir, path.join(diagramsDir, "decisions")]) {
      if (fs.existsSync(dir)) n += fs.readdirSync(dir).filter((f) => f.endsWith(ext)).length;
    }
    return n;
  };
  const svgOnDisk = onDisk(".svg");
  const pngOnDisk = onDisk(".png");
  const status = { ...stepStatus(ws, gates), diagrams: drawn.filter((d) => d.svg).length, svgFiles: svgOnDisk, png: !!chrome && (pngOnDisk > 0 || svgOnDisk === 0), pngNote: chrome ? "" : NO_CHROME_NOTE };

  // Sections, ours and the explorers', each guarded.
  const ids = new IdRegistry();
  for (const id of SECTION_ORDER) ids.claim(id);
  const built = new Map();
  const guard = (id, fn) => {
    try { built.set(id, fn()); } catch (e) {
      warnings.push(`${id}: ${e && e.stack ? e.stack : e}`);
      built.set(id, { id, title: id, html: `<section id="${id}" class="ddd-x x-${id}"><header class="x-head"><h2>${esc(id)}</h2></header><p class="x-empty">This section could not be built: ${esc(e && e.message ? e.message : e)}.</p></section>`, count: 0, empty: true });
    }
  };
  guard("verdict", () => secVerdict(ws, gates, items, status));
  guard("worklist", () => secWorklist(items));
  guard("shape", () => secShape(ws, plates));
  guard("diagrams", () => secDiagrams(plateList, missing, status, elsewhere));
  guard("words", () => secWords(ws));
  guard("steps", () => secSteps(ws, items));
  guard("canvases", () => secCanvases(ws));
  guard("flows", () => secFlows(ws, plates));
  try {
    for (const s of await explorerSections(ws, gates, { ids })) built.set(s.id, s);
  } catch (e) {
    warnings.push(`explorers: ${e && e.stack ? e.stack : e}`);
  }
  for (const id of ["decisions", "domain", "stores", "contracts", "artifacts", "everything"]) {
    if (!built.has(id)) {
      // One explorer failing must not lose the others: build it alone, or show why.
      try {
        const [s] = await explorerSections(ws, gates, { ids, only: [id] });
        if (s) built.set(id, s);
      } catch (e) {
        warnings.push(`${id}: ${e && e.message ? e.message : e}`);
        built.set(id, { id, title: id, html: `<section id="${id}" class="ddd-x x-${id}"><header class="x-head"><h2>${esc(id)}</h2></header><p class="x-empty">This section could not be built: ${esc(e && e.message ? e.message : e)}.</p></section>`, count: 0, empty: true });
      }
    }
  }
  const secs = SECTION_ORDER.map((id) => built.get(id)).filter(Boolean);

  // The shell.
  const man = ws.manifest || {};
  const pageTitle = title || man.title || man.project || "DDD run";
  const made = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const runtime = fs.readFileSync(RUNTIME, "utf8");
  const pageJs = fs.readFileSync(PAGE_JS, "utf8");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}: design review</title>
<style>
${themeCss()}
${explorersCss()}
${pageCss()}
</style>
</head>
<body>
${directionComment()}
<header class="docket">
<div class="docket-row">
<h1>${esc(pageTitle)}<small>${esc(man.project || "")}${man.mode ? ` · ${esc(man.mode)} mode` : ""} · made ${esc(made)}</small></h1>
<div class="finder"><input type="search" placeholder="Find anything  ( / )" aria-label="Find anything on this page" data-ddd-search><output data-ddd-search-count aria-live="polite"></output>
<button type="button" data-theme-toggle aria-pressed="false">Dark</button></div>
</div>
${stripHtml(status, gates)}
</header>
<div class="frame">
${tabsHtml(secs)}
<main>
${secs.map((s) => s.html).join("\n")}
<footer class="colophon x-lede">Every line on this page is read from <code>${esc(dddDir)}</code> and from its automatic checks; nothing is typed by hand. Regenerate it with <code>ddd review &lt;ddd-dir&gt;</code>. Underlined words have a plain-English meaning on hover.</footer>
</main>
</div>
<script>${runtime}</script>
<script>${pageJs}</script>
</body>
</html>
`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  return { path: outFile, bytes: Buffer.byteLength(html), warnings, items, gates, sections: secs.map((s) => s.id) };
}

// ---- CLI ------------------------------------------------------------------------------------------

export async function main(argv, ctx = {}) {
  void ctx;
  const a = { dir: "ddd", out: null, title: null, diagrams: true, relayout: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const x = argv[i];
    if (x === "-h" || x === "--help") { process.stdout.write(`${USAGE}\n`); return 0; }
    if (x === "-o" || x === "--out") { a.out = argv[++i]; if (a.out === undefined) { process.stderr.write(`${USAGE}\nddd review: error: argument -o/--out: expected one argument\n`); return 2; } continue; }
    if (x.startsWith("--out=")) { a.out = x.slice(6); continue; }
    if (x === "--title") { a.title = argv[++i]; if (a.title === undefined) { process.stderr.write(`${USAGE}\nddd review: error: argument --title: expected one argument\n`); return 2; } continue; }
    if (x.startsWith("--title=")) { a.title = x.slice(8); continue; }
    if (x === "--no-diagrams") { a.diagrams = false; continue; }
    if (x === "--relayout") { a.relayout = true; continue; }
    if (x.startsWith("-") && x !== "-") { process.stderr.write(`${USAGE}\nddd review: error: unrecognized arguments: ${x}\n`); return 2; }
    positional.push(x);
  }
  if (positional.length > 1) { process.stderr.write(`${USAGE}\nddd review: error: unrecognized arguments: ${positional.slice(1).join(" ")}\n`); return 2; }
  if (positional.length) a.dir = positional[0];
  const dddDir = path.resolve(a.dir);
  if (!fs.existsSync(dddDir) || !fs.statSync(dddDir).isDirectory()) {
    process.stderr.write(`error: ${dddDir} does not exist\n`);
    return 2;
  }
  const ws = loadWorkspace(dddDir);
  if (!Object.keys(ws.steps).length) {
    process.stderr.write(`error: no step artifacts under ${dddDir}\n`);
    return 2;
  }
  // Files first so the page's "open SVG / PNG" links land on something.
  if (a.diagrams) {
    try {
      const d = await renderDiagrams(dddDir, { relayout: a.relayout });
      process.stdout.write(`review: ${d.svg.length} svg, ${d.png.length} png under ${path.join(dddDir, "diagrams")}${d.note ? ` (${d.note})` : ""}\n`);
      for (const w of d.warnings) process.stderr.write(`review: warning: ${w}\n`);
    } catch (e) {
      process.stderr.write(`review: diagrams: ${e && e.message ? e.message : e}\n`);
    }
  }
  const page = await buildPage(dddDir, { out: a.out, title: a.title, diagrams: a.diagrams });
  const kb = Math.round(page.bytes / 1024);
  const stoppers = page.items.filter((i) => ["decision", "blocking", "error"].includes(i.kind)).length;
  process.stdout.write(`review: wrote ${page.path} (${kb} KB) - ${Object.keys(ws.steps).length} step(s), ${page.items.length} thing(s) needing a person, ${stoppers} that stop the work\n`);
  for (const i of page.items.slice(0, 5)) process.stdout.write(`  [${i.kind}] ${(i.title || "").slice(0, 96)}\n`);
  for (const w of page.warnings) process.stderr.write(`review: warning: ${w}\n`);
  return 0;
}

export default main;
