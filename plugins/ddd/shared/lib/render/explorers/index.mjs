// The explorers as one list, in page order, plus the CSS that styles all of them.
//
//   sections(workspace, gates, opts) -> Promise<[{id, title, lede, body, html, count, empty}]>
//   explorersCss()                   -> string, every rule scoped under `.ddd-x`
//
// `sections` is async because the decisions explorer may draw diagrams. `opts`:
//   ids               an IdRegistry shared with the rest of the page (one is made
//                     when absent, so ids stay unique across the six sections)
//   only              array of section ids to build (the checks use it)
//   decisionRenderer  override for the late-bound diagram renderer (null = none)
//
// Everything visual comes from core/palette.mjs (fonts, the twelve context hues)
// and core/svg.mjs (the neutral and accent variables the diagrams use), so a
// context is the same colour in a tree row as in the context map and the page has
// no colour of its own to drift.
import { CONTEXT_SLOTS, FONTS, PALETTE_VARS } from "../core/palette.mjs";
import { THEME_VARS, themeCss } from "../core/svg.mjs";
import { IdRegistry } from "./html.mjs";
import * as domain from "./domain.mjs";
import * as contracts from "./contracts.mjs";
import * as stores from "./stores.mjs";
import * as decisions from "./decisions.mjs";
import * as artifacts from "./artifacts.mjs";
import * as everything from "./everything.mjs";

export { IdRegistry, home, homeOf, esc, slug } from "./html.mjs";
export { decisionRows, openDecisions } from "./decisions.mjs";
export { contexts } from "./domain.mjs";
export { storeRows } from "./stores.mjs";
export { fieldRows } from "./contracts.mjs";

// Page order follows the design's progressive disclosure: the shape of the domain,
// then what crosses its lines, where its data lives, the calls that were argued,
// then the raw record and, last, everything guessed or asked.
export const EXPLORERS = [
  { id: "domain", section: domain.section },
  { id: "contracts", section: contracts.section },
  { id: "stores", section: stores.section },
  { id: "decisions", section: decisions.section },
  { id: "artifacts", section: artifacts.section },
  { id: "everything", section: everything.section },
];

export async function sections(workspace, gates = [], opts = {}) {
  const ids = opts.ids || new IdRegistry();
  const only = Array.isArray(opts.only) ? new Set(opts.only) : null;
  const out = [];
  for (const x of EXPLORERS) {
    if (only && !only.has(x.id)) continue;
    out.push(await x.section(workspace, gates, { ...opts, ids }));
  }
  return out;
}

// ---- CSS -------------------------------------------------------------------------------------

const ACCENT_CHIPS = {
  // chip kind -> [background variable, ink variable]; each pair is one the diagrams
  // already use for the same meaning, so "hot" is the event orange, "ok" the store
  // green, "warn" and "core" the core amber, "driving" the command blue.
  hot: ["--event-fill", "--event"],
  ok: ["--store-fill", "--store"],
  warn: ["--core-fill", "--core"],
  core: ["--core-fill", "--core"],
  driving: ["--command-fill", "--command"],
  driven: ["--port-fill", "--port"],
  note: ["--supporting-fill", "--supporting"],
  kind: ["--external-fill", "--external"],
};

// The accent variables (--core, --event, --store, ...) are declared by themeCss()
// on svg[data-diagram] but not exported on their own; they are read back out of
// its first rule so the explorers use the diagrams' exact values, never a copy.
function accentVars() {
  const m = /svg\[data-diagram\]\{([^}]*)\}/.exec(themeCss());
  const names = /^--(core|supporting|generic|external|team|deployable|aggregate|command|event|port|store|focus|match):/;
  return m ? m[1].split(";").map((d) => d.trim()).filter((d) => names.test(d)).join(";") + ";" : "";
}

export function explorersCss() {
  const font = `--font-title:${FONTS.title};--font-label:${FONTS.label};--font-mono:${FONTS.mono};`;
  const r = [];
  // Variables: the SVG theme scopes its variables to svg[data-diagram], so the
  // explorers carry their own copy under .ddd-x, flipped by the same hooks.
  r.push(`.ddd-x{${font}${accentVars()}${THEME_VARS.light}${PALETTE_VARS.light}}`);
  r.push(`@media (prefers-color-scheme:dark){.ddd-x{${THEME_VARS.dark}${PALETTE_VARS.dark}}}`);
  r.push(`[data-theme=dark] .ddd-x,.ddd-x[data-theme=dark]{${THEME_VARS.dark}${PALETTE_VARS.dark}}`);
  r.push(`[data-theme=light] .ddd-x,.ddd-x[data-theme=light]{${THEME_VARS.light}${PALETTE_VARS.light}}`);

  // Section frame.
  r.push(`.ddd-x{font-family:var(--font-label);color:var(--fg);font-size:14px;line-height:1.5;margin:0 0 48px}`);
  r.push(`.ddd-x *{box-sizing:border-box}`);
  r.push(`.ddd-x .x-head{display:grid;grid-template-columns:1fr auto;gap:2px 16px;align-items:end;margin:0 0 14px;padding:0 0 10px;border-bottom:1px solid var(--node-stroke)}`);
  r.push(`.ddd-x .x-head h2{font-family:var(--font-title);font-weight:500;font-size:24px;letter-spacing:.005em;margin:0;grid-column:1}`);
  r.push(`.ddd-x .x-lede{grid-column:1;margin:0;color:var(--muted);font-size:14px;max-width:70ch}`);
  r.push(`.ddd-x .x-lede b{color:var(--fg);font-weight:600}`);
  r.push(`.ddd-x .x-tools{grid-column:2;grid-row:1/span 2;display:flex;gap:6px;align-self:end}`);
  r.push(`.ddd-x .x-tools button{font:inherit;font-size:12px;color:var(--muted);background:transparent;border:1px solid var(--node-stroke);border-radius:999px;padding:3px 10px;cursor:pointer}`);
  r.push(`.ddd-x .x-tools button:hover{color:var(--fg);border-color:var(--fg)}`);

  // Folds: the tree. A summary is one line: title, count, one-line subtitle.
  r.push(`.ddd-x details.x-fold{margin:0;border-left:2px solid var(--grid);padding-left:0}`);
  r.push(`.ddd-x details.x-fold[open]{border-left-color:var(--node-stroke)}`);
  r.push(`.ddd-x details.x-fold>summary{list-style:none;cursor:pointer;display:flex;align-items:baseline;gap:8px;padding:5px 8px 5px 22px;position:relative;border-radius:4px}`);
  r.push(`.ddd-x details.x-fold>summary::-webkit-details-marker{display:none}`);
  r.push(`.ddd-x details.x-fold>summary::before{content:"";position:absolute;left:8px;top:.95em;width:6px;height:6px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(-45deg);transition:transform .12s}`);
  r.push(`.ddd-x details.x-fold[open]>summary::before{transform:rotate(45deg)}`);
  r.push(`.ddd-x details.x-fold>summary:hover{background:var(--grid)}`);
  r.push(`.ddd-x details.x-fold>summary:focus-visible{outline:2px solid var(--focus);outline-offset:-2px}`);
  r.push(`.ddd-x .x-body{padding:2px 8px 10px 22px}`);
  r.push(`.ddd-x .x-fold .x-fold{margin-left:0}`);
  r.push(`.ddd-x .x-title{font-weight:600;min-width:0}`);
  r.push(`.ddd-x .x-title b{font-weight:600}`);
  r.push(`.ddd-x .x-n{font-family:var(--font-mono);font-size:11px;color:var(--muted);background:var(--tag-fill);border-radius:999px;padding:0 7px;line-height:18px;flex:none}`);
  r.push(`.ddd-x .x-sub{color:var(--muted);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1 1 auto}`);
  r.push(`.ddd-x .x-row{padding:4px 8px 4px 22px;position:relative;border-left:2px solid var(--grid)}`);

  // Top-level entity nodes: a card per context / message / deployable / step.
  r.push(`.ddd-x .x-ctx-node,.ddd-x .x-msg-node,.ddd-x .x-dep-node,.ddd-x .x-step{border:1px solid var(--grid);border-left-width:3px;border-radius:6px;margin:0 0 10px;background:var(--bg)}`);
  r.push(`.ddd-x .x-ctx-node>summary,.ddd-x .x-msg-node>summary,.ddd-x .x-dep-node>summary,.ddd-x .x-step>summary{padding:9px 12px 9px 26px;font-size:15px}`);
  r.push(`.ddd-x .x-ctx-node>summary::before,.ddd-x .x-msg-node>summary::before,.ddd-x .x-dep-node>summary::before,.ddd-x .x-step>summary::before{left:12px}`);
  r.push(`.ddd-x .x-ctx-node>.x-body,.ddd-x .x-msg-node>.x-body,.ddd-x .x-dep-node>.x-body,.ddd-x .x-step>.x-body{padding:0 12px 12px 26px}`);
  r.push(`.ddd-x .x-ctx-node>summary .x-title{font-family:var(--font-title);font-weight:500;font-size:17px}`);
  r.push(`.ddd-x .x-agg-node{border:1px solid var(--grid);border-radius:5px;margin:6px 0;background:var(--node-fill)}`);
  r.push(`.ddd-x .x-agg-node>summary{padding:6px 10px 6px 24px}`);
  r.push(`.ddd-x .x-agg-node>summary::before{left:10px}`);
  r.push(`.ddd-x .x-step>summary .x-sn{font-family:var(--font-mono);font-size:11px;color:var(--muted);display:inline-block;min-width:1.4em;margin-right:6px}`);
  r.push(`.ddd-x .x-step>summary .x-title>.x-chip{margin:0 8px}`);
  r.push(`.ddd-x .x-step-missing{padding:9px 12px 9px 26px;color:var(--muted)}`);
  r.push(`.ddd-x .x-step-missing b{color:var(--fg)}`);

  // Context colour: chips and the card's left rule take the context's own hue.
  r.push(`.ddd-x .x-ctx{display:inline-flex;align-items:center;gap:6px;font-weight:600;text-decoration:none;color:var(--ctx-ink,var(--fg))}`);
  r.push(`.ddd-x .x-swatch{display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--ctx-fill,var(--node-fill));border:1.5px solid var(--ctx-stroke,var(--node-stroke));flex:none}`);
  for (const { slot } of CONTEXT_SLOTS) {
    r.push(`.ddd-x .ctx-${slot}{--ctx-fill:var(--ctx-${slot}-fill);--ctx-stroke:var(--ctx-${slot}-stroke);--ctx-ink:var(--ctx-${slot}-ink)}`);
  }
  r.push(`.ddd-x .x-ctx-node.x-fold,.ddd-x .x-fold[data-kind=hosted-context]{border-left-color:var(--ctx-stroke,var(--node-stroke))}`);
  r.push(`.ddd-x .x-ctx-node>summary:hover{background:var(--ctx-fill,var(--grid))}`);

  // Text bits.
  r.push(`.ddd-x p{margin:4px 0}`);
  r.push(`.ddd-x .x-purpose{font-family:var(--font-title);font-size:15.5px;line-height:1.45;max-width:78ch;margin:2px 0 6px}`);
  r.push(`.ddd-x .x-muted{color:var(--muted)}`);
  r.push(`.ddd-x .x-small{font-size:12px}`);
  r.push(`.ddd-x .x-empty{color:var(--muted);font-style:italic;margin:6px 0}`);
  r.push(`.ddd-x .x-text{max-width:78ch}`);
  r.push(`.ddd-x .x-pre{font-family:var(--font-mono);font-size:12px;line-height:1.45;white-space:pre-wrap;background:var(--node-fill);border:1px solid var(--grid);border-radius:4px;padding:8px 10px;margin:4px 0;max-height:420px;overflow:auto}`);
  r.push(`.ddd-x code,.ddd-x .x-id{font-family:var(--font-mono);font-size:12px}`);
  r.push(`.ddd-x .x-id{color:var(--muted)}`);
  r.push(`.ddd-x a.x-id{color:var(--supporting);text-decoration:none;border-bottom:1px dotted var(--supporting)}`);
  r.push(`.ddd-x a.x-id:hover{border-bottom-style:solid}`);
  r.push(`.ddd-x .x-id-strong{color:var(--fg);font-weight:600;background:var(--tag-fill);padding:0 5px;border-radius:3px}`);
  r.push(`.ddd-x a{color:var(--supporting)}`);
  r.push(`.ddd-x .x-body a:not([class]){color:inherit;text-decoration:none;border-bottom:1px dotted var(--supporting)}`);
  r.push(`.ddd-x a.x-file{font-size:12px;color:var(--muted);text-decoration:none;border-bottom:1px dotted var(--muted);margin-right:10px}`);
  r.push(`.ddd-x .x-foot{font-size:12px;color:var(--muted);margin:8px 0 0;padding-top:6px;border-top:1px dashed var(--grid)}`);
  r.push(`.ddd-x .x-used,.ddd-x .x-refs{font-size:12px;color:var(--muted)}`);
  r.push(`.ddd-x .x-used-k{text-transform:uppercase;letter-spacing:.06em;font-size:10.5px;margin-right:4px}`);
  r.push(`.ddd-x .x-used a,.ddd-x .x-refs a{color:var(--muted);text-decoration:none;border-bottom:1px dotted var(--muted)}`);
  r.push(`.ddd-x .x-used a:hover,.ddd-x .x-refs a:hover{color:var(--fg)}`);
  r.push(`.ddd-x .x-h{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:12px 0 4px}`);
  r.push(`.ddd-x .x-h .x-n{margin-left:4px}`);
  r.push(`.ddd-x .x-h-inline{display:block;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:6px 0 1px}`);
  r.push(`.ddd-x ul.x-list{margin:2px 0 4px;padding-left:18px}`);
  r.push(`.ddd-x ul.x-list li{margin:1px 0}`);
  r.push(`.ddd-x ul.x-inv li{list-style:none;position:relative;padding-left:4px}`);
  r.push(`.ddd-x ul.x-inv li::before{content:"\\2713";position:absolute;left:-14px;color:var(--store)}`);

  // Chips.
  r.push(`.ddd-x .x-chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 6px}`);
  r.push(`.ddd-x .x-chip{display:inline-block;font-size:11.5px;line-height:18px;padding:0 8px;border-radius:999px;background:var(--tag-fill);color:var(--tag-fg);text-decoration:none;white-space:nowrap}`);
  r.push(`.ddd-x a.x-chip:hover{outline:1px solid var(--tag-fg)}`);
  for (const [kind, [bg, ink]] of Object.entries(ACCENT_CHIPS)) r.push(`.ddd-x .x-chip-${kind}{background:var(${bg});color:var(${ink})}`);
  r.push(`.ddd-x .x-chip-core{font-weight:600}`);
  r.push(`.ddd-x .x-chip-mono{font-family:var(--font-mono);font-size:11px}`);
  r.push(`.ddd-x .x-leaf{display:inline-block;margin:1px 4px 1px 0}`);
  r.push(`.ddd-x .x-leaf-a{font-family:var(--font-mono);font-size:12px;padding:0 6px;border-radius:3px;text-decoration:none;color:var(--fg);background:var(--tag-fill);border:1px solid transparent}`);
  r.push(`.ddd-x .x-leaf-command .x-leaf-a{background:var(--command-fill);color:var(--command)}`);
  r.push(`.ddd-x .x-leaf-event .x-leaf-a{background:var(--event-fill);color:var(--event)}`);
  r.push(`.ddd-x .x-leaf-query .x-leaf-a{background:var(--supporting-fill);color:var(--query)}`);
  r.push(`.ddd-x a.x-leaf-a:hover{border-color:currentColor}`);
  r.push(`.ddd-x .x-trans{font-family:var(--font-mono);font-size:12px;background:var(--aggregate-fill);color:var(--aggregate);padding:0 6px;border-radius:3px;margin-right:4px}`);

  // Key facts.
  r.push(`.ddd-x dl.x-dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 14px;margin:4px 0 6px;align-items:baseline}`);
  r.push(`.ddd-x dl.x-dl dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding-top:2px}`);
  r.push(`.ddd-x dl.x-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}`);
  // Short facts (from, to, owner) read as one line, not a four-row stack.
  r.push(`.ddd-x dl.x-dl-inline{display:flex;flex-wrap:wrap;gap:2px 0;font-size:13px}`);
  r.push(`.ddd-x dl.x-dl-inline dt{margin-right:6px}`);
  r.push(`.ddd-x dl.x-dl-inline dd{margin-right:20px}`);
  r.push(`.ddd-x dl.x-dl-generic dt{text-transform:none;letter-spacing:0;font-family:var(--font-mono);font-size:12px}`);
  r.push(`.ddd-x dl.x-dl-generic dd>dl.x-dl{margin:0 0 2px;padding-left:10px;border-left:1px solid var(--grid)}`);
  r.push(`.ddd-x .x-inline-list{display:inline-flex;flex-wrap:wrap;gap:3px 6px}`);
  r.push(`.ddd-x .x-counts{font-size:12px;color:var(--muted);margin:2px 0 8px}`);
  r.push(`.ddd-x .x-pwgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 14px;margin:6px 0 10px;padding:8px 10px;background:var(--node-fill);border-radius:5px}`);
  r.push(`.ddd-x .x-pw{display:grid;gap:1px}`);
  r.push(`.ddd-x .x-pwk{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}`);
  r.push(`.ddd-x .x-pwv{font-size:13px}`);
  r.push(`.ddd-x .x-item>summary .x-item-title{font-weight:400}`);
  r.push(`.ddd-x .x-item>summary .x-chip{margin-left:2px}`);
  r.push(`.ddd-x .x-key{color:var(--fg);font-weight:600}`);

  // Tables: hairlines, no zebra, the first column carries the weight.
  r.push(`.ddd-x table.x-table{border-collapse:collapse;width:auto;min-width:min(100%,560px);font-size:13px;margin:2px 0 6px}`);
  r.push(`.ddd-x table.x-fields,.ddd-x .x-body>table.x-table{width:100%}`);
  r.push(`.ddd-x table.x-table td:last-child,.ddd-x table.x-table th:last-child{padding-right:0}`);
  r.push(`.ddd-x table.x-table th{text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:4px 10px 4px 0;border-bottom:1px solid var(--node-stroke)}`);
  r.push(`.ddd-x table.x-table td{padding:4px 10px 4px 0;border-bottom:1px solid var(--grid);vertical-align:top;overflow-wrap:anywhere}`);
  r.push(`.ddd-x table.x-table tr:last-child td{border-bottom:0}`);
  r.push(`.ddd-x table.x-table tr[data-search-row]:hover td{background:var(--grid)}`);

  // Contract field trees and halves.
  r.push(`.ddd-x .x-halves{display:grid;gap:12px 24px;grid-template-columns:1fr}`);
  r.push(`@media (min-width:1100px){.ddd-x .x-halves-2{grid-template-columns:1fr 1fr}}`);
  r.push(`.ddd-x .x-half{min-width:0}`);
  r.push(`.ddd-x .x-half[data-half=response]{border-left:1px solid var(--grid);padding-left:16px}`);
  r.push(`.ddd-x table.x-fields td:first-child{white-space:nowrap}`);
  r.push(`.ddd-x .x-indent{display:inline-block;padding-left:calc(var(--d,0)*16px);position:relative}`);
  r.push(`.ddd-x .x-indent[style*="--d:0"]{padding-left:0}`);
  r.push(`.ddd-x .x-field{color:var(--fg);font-weight:600;background:none}`);
  r.push(`.ddd-x .x-req{color:var(--event);text-decoration:none;font-weight:700;margin-left:1px}`);
  r.push(`.ddd-x .x-opt-mark{color:var(--muted);margin-left:1px}`);
  r.push(`.ddd-x .x-branch{font-style:italic;color:var(--external)}`);
  r.push(`.ddd-x .x-type{font-family:var(--font-mono);font-size:12px;color:var(--port)}`);
  r.push(`.ddd-x .x-json{font-family:var(--font-mono);font-size:12px;color:var(--store);white-space:pre-wrap;overflow-wrap:anywhere}`);
  r.push(`.ddd-x .x-constraints{font-size:12px}`);
  r.push(`.ddd-x .x-prov{margin-right:10px}`);

  // Stores.
  r.push(`.ddd-x .x-flag{padding:8px 12px;border-radius:5px;margin:4px 0 8px;font-size:13.5px;background:var(--event-fill);color:var(--event);border-left:3px solid var(--event)}`);
  r.push(`.ddd-x .x-flag-two-writers{background:var(--core-fill);color:var(--core);border-left-color:var(--core)}`);
  r.push(`.ddd-x .x-dep-node.x-store-shared{border-left-color:var(--event)}`);

  // Decisions: one row of cards on a shared grid.
  r.push(`.ddd-x .x-dec{border:1px solid var(--grid);border-radius:8px;padding:14px 16px;margin:0 0 16px;background:var(--bg)}`);
  r.push(`.ddd-x .x-dec.is-open{border-color:var(--event)}`);
  r.push(`.ddd-x .x-dec-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 10px}`);
  r.push(`.ddd-x .x-dec-q{font-family:var(--font-title);font-weight:500;font-size:19px;margin:2px 0 0;flex-basis:100%}`);
  r.push(`.ddd-x .x-dec-row{display:grid;grid-template-columns:repeat(var(--n,1),minmax(0,1fr));gap:12px;align-items:stretch}`);
  r.push(`@media (max-width:820px){.ddd-x .x-dec-row{grid-template-columns:1fr}}`);
  r.push(`.ddd-x .x-opt{border:1px solid var(--grid);border-radius:6px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;background:var(--node-fill);min-width:0}`);
  r.push(`.ddd-x .x-opt.is-chosen{border:2px solid var(--core);background:var(--core-fill)}`);
  r.push(`.ddd-x .x-opt-head{display:flex;align-items:center;gap:8px}`);
  r.push(`.ddd-x .x-opt-id{font-family:var(--font-mono);font-weight:700;font-size:13px;background:var(--tag-fill);color:var(--tag-fg);padding:0 7px;border-radius:3px}`);
  r.push(`.ddd-x .x-opt.is-chosen .x-opt-id{background:var(--core);color:var(--bg)}`);
  r.push(`.ddd-x .x-opt .x-opt-mark{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--core);margin:0}`);
  r.push(`.ddd-x .x-opt-summary{font-size:14px;margin:0 0 2px}`);
  r.push(`.ddd-x .x-opt-fig{margin:4px 0;padding:0;border:1px solid var(--grid);border-radius:4px;background:var(--bg);min-height:120px;display:flex;align-items:center;justify-content:center;overflow:hidden}`);
  r.push(`.ddd-x .x-opt-fig svg{width:100%;height:auto;display:block}`);
  r.push(`.ddd-x .x-opt-missing{flex-direction:column;gap:2px;color:var(--muted);font-size:12px;padding:12px;border-style:dashed;text-align:center}`);
  r.push(`.ddd-x .x-opt-missing small{font-family:var(--font-mono);font-size:11px;overflow-wrap:anywhere}`);
  r.push(`.ddd-x .x-opt-list ul{margin:0;padding-left:16px;font-size:13px}`);
  r.push(`.ddd-x .x-opt-pros .x-h-inline{color:var(--store)}`);
  r.push(`.ddd-x .x-opt-cons .x-h-inline{color:var(--event)}`);
  r.push(`.ddd-x .x-opt-risks .x-h-inline{color:var(--core)}`);
  r.push(`.ddd-x .x-opt-why{margin-top:auto;padding-top:6px;border-top:1px dashed var(--core)}`);
  r.push(`.ddd-x .x-opt-why p{margin:0;font-size:13.5px}`);
  r.push(`.ddd-x .x-dec-foot{margin-top:10px;font-size:13px}`);
  r.push(`.ddd-x .x-flip ul{margin:0;padding-left:18px}`);
  r.push(`.ddd-x .x-dec-records{color:var(--muted);font-size:12.5px}`);

  // Search: the runtime hides rows that do not match by adding [hidden]; keep that
  // authoritative over display rules above.
  r.push(`.ddd-x [hidden]{display:none!important}`);
  r.push(`.ddd-x :target{outline:2px solid var(--focus);outline-offset:2px;border-radius:4px}`);
  return `${r.join("\n")}\n`;
}
