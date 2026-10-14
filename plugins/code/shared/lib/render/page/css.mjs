// The page's own CSS: the case-file direction in DIRECTION.md. Everything visual
// comes from the same variables the diagrams and explorers use (THEME_VARS, the
// accent hues, FONTS), declared once on :root and flipped by [data-theme]. The page
// adds no colour of its own; what it adds is structure: the docket header, the index
// tabs, the cover sheet, the exhibit rows and the plates.
import { FONTS, PALETTE_VARS } from "../core/palette.mjs";
import { THEME_VARS, themeCss } from "../core/svg.mjs";

// The accent variables live on svg[data-diagram] inside themeCss(); read back so the
// page uses the diagrams' exact values (the explorers do the same).
function accentVars() {
  const m = /svg\[data-diagram\]\{([^}]*)\}/.exec(themeCss());
  const names = /^--(core|supporting|generic|external|team|deployable|aggregate|command|event|port|store|focus|match):/;
  return m ? m[1].split(";").map((d) => d.trim()).filter((d) => names.test(d)).join(";") + ";" : "";
}

export function pageCss() {
  const font = `--font-title:${FONTS.title};--font-label:${FONTS.label};--font-mono:${FONTS.mono};`;
  const r = [];
  // Variables. Light by default; the OS scheme flips them; an explicit data-theme on
  // <html> wins over the OS so the toggle (and a pinned PNG render) can override it.
  r.push(`:root{${font}${accentVars()}${THEME_VARS.light}${PALETTE_VARS.light}--page-max:1180px;--tabs-w:176px;--head-h:56px;color-scheme:light}`);
  r.push(`@media (prefers-color-scheme:dark){:root{${THEME_VARS.dark}${PALETTE_VARS.dark}color-scheme:dark}}`);
  r.push(`:root[data-theme=dark]{${THEME_VARS.dark}${PALETTE_VARS.dark}color-scheme:dark}`);
  r.push(`:root[data-theme=light]{${THEME_VARS.light}${PALETTE_VARS.light}color-scheme:light}`);

  // Base.
  r.push(`*,*::before,*::after{box-sizing:border-box}`);
  r.push(`html{background:var(--bg);overflow-x:clip;scroll-padding-top:calc(var(--head-h) + 40px)}`);
  r.push(`body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-label);font-size:14px;line-height:1.5;overflow-x:clip;-webkit-font-smoothing:antialiased}`);
  r.push(`a{color:var(--supporting);text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:2px}`);
  r.push(`code{font-family:var(--font-mono);font-size:12.5px;background:var(--tag-fill);color:var(--tag-fg);padding:0 4px;border-radius:3px}`);
  r.push(`pre{font-family:var(--font-mono);font-size:12px;line-height:1.45;background:var(--grid);border:1px solid var(--grid);border-radius:4px;padding:10px 12px;overflow:auto;max-height:420px;margin:6px 0}`);
  r.push(`abbr[title]{text-decoration:none;border-bottom:1px dotted var(--supporting);cursor:help}`);
  r.push(`:focus-visible{outline:2px solid var(--focus);outline-offset:2px}`);
  r.push(`button{font:inherit;color:inherit}`);
  r.push(`::selection{background:var(--core-fill)}`);

  // The docket: sticky header with title, project line, finder, theme toggle.
  r.push(`header.docket{position:sticky;top:0;z-index:20;background:var(--bg);border-bottom:1px solid var(--node-stroke);transition:box-shadow .2s}`);
  r.push(`header.docket.is-stuck{box-shadow:0 6px 18px -12px rgba(0,0,0,.45)}`);
  r.push(`.docket-row{max-width:calc(var(--page-max) + var(--tabs-w) + 48px);margin:0 auto;padding:0 24px;min-height:var(--head-h);display:flex;align-items:center;gap:16px}`);
  r.push(`.docket h1{font-family:var(--font-title);font-weight:500;font-size:19px;letter-spacing:.005em;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;min-width:0}`);
  r.push(`.docket h1 small{font-family:var(--font-label);font-size:12px;color:var(--muted);margin-left:10px;font-weight:400;letter-spacing:0}`);
  r.push(`.docket .finder{margin-left:auto;display:flex;align-items:center;gap:8px}`);
  r.push(`.docket input[type=search]{font:inherit;font-size:13px;color:var(--fg);background:var(--bg);border:1px solid var(--node-stroke);border-radius:4px;padding:5px 10px;width:240px;max-width:40vw}`);
  r.push(`.docket input[type=search]::placeholder{color:var(--muted)}`);
  r.push(`.docket input[type=search]:focus{border-color:var(--fg);outline:none}`);
  r.push(`.docket output{font-size:12px;color:var(--muted);min-width:5em;text-align:right}`);
  r.push(`.docket button[data-theme-toggle]{font-size:12px;color:var(--muted);background:transparent;border:1px solid var(--node-stroke);border-radius:4px;padding:4px 10px;cursor:pointer;min-width:56px}`);
  r.push(`.docket button[data-theme-toggle]:hover{color:var(--fg);border-color:var(--fg)}`);

  // Status strip: one line, reads like a docket line.
  r.push(`.strip{border-top:1px solid var(--grid);background:var(--bg)}`);
  r.push(`.strip-row{max-width:calc(var(--page-max) + var(--tabs-w) + 48px);margin:0 auto;padding:4px 24px;display:flex;flex-wrap:wrap;gap:2px 0;font-size:12px;color:var(--muted);line-height:20px}`);
  r.push(`.strip-row>span{white-space:nowrap}.strip-row>span+span::before{content:"·";margin:0 8px;color:var(--node-stroke)}`);
  r.push(`.strip b{color:var(--fg);font-weight:600}.strip .st-ok b{color:var(--store)}.strip .st-bad b{color:var(--event)}.strip .st-warn b{color:var(--core)}`);
  r.push(`.strip .st-note{flex-basis:100%;white-space:normal;color:var(--core)}.strip .st-note::before{content:none!important}`);

  // Frame: index tabs on the left at wide widths, a strip under the header otherwise.
  r.push(`.frame{max-width:calc(var(--page-max) + var(--tabs-w) + 48px);margin:0 auto;padding:0 24px 120px;display:grid;grid-template-columns:var(--tabs-w) minmax(0,1fr);gap:0 24px}`);
  r.push(`nav.tabs{position:sticky;top:calc(var(--head-h) + 30px);align-self:start;padding:28px 0 0;max-height:calc(100vh - var(--head-h) - 30px);overflow:auto;scrollbar-width:none}`);
  r.push(`nav.tabs ol{list-style:none;margin:0;padding:0;border-right:1px solid var(--grid)}`);
  r.push(`nav.tabs a{display:flex;align-items:baseline;gap:6px;padding:5px 12px 5px 0;color:var(--muted);font-size:13px;line-height:1.3;border-right:2px solid transparent;margin-right:-1px}`);
  r.push(`nav.tabs a:hover{color:var(--fg);text-decoration:none}`);
  r.push(`nav.tabs a.is-current{color:var(--fg);border-right-color:var(--fg);font-weight:600}`);
  r.push(`nav.tabs a .n{margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--muted);font-weight:400}`);
  r.push(`nav.tabs a.is-empty{color:var(--node-stroke)}`);
  r.push(`nav.tabs .tabs-group{font-family:var(--font-title);font-size:12px;color:var(--muted);letter-spacing:.04em;margin:18px 0 4px;padding-right:12px}`);
  r.push(`nav.tabs .tabs-group:first-child{margin-top:0}`);
  r.push(`main{min-width:0;padding-top:28px}`);
  r.push(`@media (max-width:1179px){.frame{grid-template-columns:minmax(0,1fr)}nav.tabs{position:static;max-height:none;padding:16px 0 0;overflow:visible}nav.tabs ol{display:flex;flex-wrap:wrap;gap:2px 14px;border:0}nav.tabs a{padding:2px 0;border:0;border-bottom:2px solid transparent}nav.tabs a.is-current{border-bottom-color:var(--fg)}nav.tabs .tabs-group{display:none}nav.tabs a .n{margin-left:2px}}`);
  r.push(`@media (max-width:720px){.docket-row{flex-wrap:wrap;padding:8px 16px}.docket .finder{margin-left:0;width:100%}.docket input[type=search]{flex:1;max-width:none}.frame,.strip-row{padding-left:16px;padding-right:16px}}`);

  // Chapters: the explorers' section frame is the page's; ours sit in it too.
  r.push(`main>section{margin:0 0 64px;scroll-margin-top:calc(var(--head-h) + 40px)}`);
  r.push(`main>section .x-head{margin-top:0}`);
  r.push(`.ddd-x .x-empty{margin:6px 0}`);

  // Cover sheet.
  r.push(`#verdict .x-head{border-bottom:0;padding-bottom:0;margin-bottom:6px}`);
  // The cover's own h2 exists for the outline and the tabs; the headline count is the
  // visible title, so the h2 is read by assistive tech only (no label above a heading).
  r.push(`.sr-only{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`);
  r.push(`#verdict .x-head{margin:0;padding:0}#verdict .x-head h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`);
  r.push(`.cover-count{font-family:var(--font-title);font-weight:500;font-size:44px;line-height:1.1;letter-spacing:-.005em;margin:0 0 14px;max-width:24ch;text-wrap:balance}`);
  // The count of things is ink; only the count that STOPS the work takes the event hue,
  // the same orange that means "stops" everywhere else on the page.
  r.push(`.cover-count b{font-weight:500}.cover-count .n-stop{color:var(--event)}.cover-count.is-ok .n-stop{color:var(--store)}`);
  r.push(`.verdict-text{font-family:var(--font-title);font-size:19px;line-height:1.45;margin:0 0 20px;max-width:64ch}`);
  // Facts as one running line between two hairlines: the value in the serif, its label
  // after it in the label face. Never a strip of tiles.
  r.push(`.facts{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 0;margin:0 0 12px;padding:10px 0;border-top:1px solid var(--node-stroke);border-bottom:1px solid var(--grid);font-size:14px;color:var(--muted);line-height:1.6}`);
  r.push(`.fact{white-space:nowrap}.fact b{font-family:var(--font-title);font-weight:500;font-size:22px;color:var(--fg);line-height:1;margin-right:2px}`);
  r.push(`.facts .sep{margin:0 12px;color:var(--node-stroke)}`);
  r.push(`.fact-ok b{color:var(--store)}.fact-bad b{color:var(--event)}.fact-warn b{color:var(--core)}`);
  r.push(`.facts-plain{border-top-color:var(--grid);margin-bottom:20px}`);
  r.push(`.careful{padding:8px 12px;margin:0 0 12px;background:var(--event-fill);color:var(--event);border-radius:4px}`);
  r.push(`.cover-note{margin-top:0}`);

  // Exhibit list.
  r.push(`.filters{display:flex;flex-wrap:wrap;gap:0;margin:0 0 12px;border:1px solid var(--node-stroke);border-radius:4px;width:max-content;max-width:100%;overflow:hidden}`);
  r.push(`.filters button{background:transparent;border:0;border-right:1px solid var(--node-stroke);padding:5px 12px;font-size:12.5px;color:var(--muted);cursor:pointer}`);
  r.push(`.filters button:last-child{border-right:0}.filters button:hover{color:var(--fg);background:var(--grid)}`);
  r.push(`.filters button.on{background:var(--fg);color:var(--bg)}`);
  r.push(`.cards{border-top:1px solid var(--node-stroke)}`);
  r.push(`.card{display:grid;grid-template-columns:96px minmax(0,1fr);gap:0 20px;padding:14px 0;border-bottom:1px solid var(--grid)}`);
  r.push(`.card.is-filtered,.card[hidden]{display:none}`);
  r.push(`.ex-no{display:flex;flex-direction:column;position:relative;padding-right:12px;border-right:1px solid var(--node-stroke)}`);
  r.push(`.ex-word{font-family:var(--font-title);font-size:12px;color:var(--muted);letter-spacing:.04em}`);
  r.push(`.ex-n{font-family:var(--font-title);font-size:32px;line-height:1;font-weight:500;margin-top:2px}`);
  r.push(`.card.k-decision .ex-no,.card.k-blocking .ex-no,.card.k-error .ex-no{border-right-color:var(--event)}.card.k-decision .ex-n,.card.k-blocking .ex-n,.card.k-error .ex-n{color:var(--event)}`);
  r.push(`.card.k-guess .ex-no,.card.k-stale .ex-no{border-right-color:var(--core)}.card.k-guess .ex-n,.card.k-stale .ex-n{color:var(--core)}`);
  r.push(`.card.k-note .ex-no{border-right-color:var(--external)}.card.k-note .ex-n{color:var(--external)}`);
  r.push(`.card.k-warning .ex-no{border-right-color:var(--node-stroke)}.card.k-warning .ex-n{color:var(--muted)}`);
  r.push(`.card .title{font-size:16px;line-height:1.4;margin:0 0 4px}`);
  r.push(`.card .klabel{display:inline-block;margin-left:10px;font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);vertical-align:1px}`);
  r.push(`.card.k-decision .klabel,.card.k-blocking .klabel,.card.k-error .klabel{color:var(--event)}.card.k-guess .klabel,.card.k-stale .klabel{color:var(--core)}.card.k-note .klabel{color:var(--external)}`);
  r.push(`.card .step{display:inline-block;margin-left:10px;font-size:12px;color:var(--muted)}`);
  r.push(`.card .detail{margin:2px 0 4px;color:var(--fg)}`);
  r.push(`.card .why{margin:2px 0 0;color:var(--muted);font-size:13px}`);
  r.push(`.card footer{margin-top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:6px}`);
  r.push(`.src{font-family:var(--font-mono);font-size:11.5px;color:var(--muted);background:var(--grid);border-radius:3px;padding:1px 6px}`);
  r.push(`.card .go{margin-left:auto;font-size:12.5px;white-space:nowrap}`);
  r.push(`@media (max-width:720px){.card{grid-template-columns:72px minmax(0,1fr);gap:0 12px}.ex-n{font-size:26px}.cover-count{font-size:34px}.verdict-text{font-size:17px}.docket h1 small{display:none}}`);

  // Plates.
  r.push(`.plate{margin:20px 0 28px}`);
  r.push(`.plate figcaption{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:0 0 8px}`);
  r.push(`.plate-title{font-family:var(--font-title);font-size:17px;font-weight:500}`);
  r.push(`.plate-sub{font-family:var(--font-mono);font-size:11.5px;color:var(--muted)}`);
  r.push(`.plate-refs{list-style:none;margin:0 0 24px;padding:0;border-top:1px solid var(--node-stroke)}`);
  r.push(`.plate-refs li{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:8px 0;border-bottom:1px solid var(--grid)}`);
  r.push(`.plate-refs li>a:first-child{font-weight:600;color:var(--fg)}`);
  r.push(`.plate-ref{font-size:12.5px;color:var(--muted)}`);
  r.push(`.plate-files{margin-left:auto;font-size:12px}.plate-files .sep{color:var(--node-stroke);margin:0 6px}.plate-files-none{color:var(--muted)}`);
  r.push(`.plate-frame{position:relative;border:1px solid var(--grid);border-radius:4px;background:var(--bg);overflow:hidden}`);
  // Natural size up to the column: a drawing is never enlarged past the size it was
  // laid out at, so type is the same size from one plate to the next.
  r.push(`.plate-frame svg[data-diagram]{width:auto;max-width:100%;height:auto;display:block;touch-action:none}`);
  r.push(`.plate-frame.plate-wide{overflow-x:auto;overflow-y:hidden}`);
  r.push(`.plate-frame.plate-wide svg[data-diagram]{width:auto;max-width:none;height:auto;max-height:80vh}`);
  r.push(`.plate-frame .ddd-fit{position:absolute;right:8px;top:8px;font-size:11px;color:var(--muted);background:var(--bg);border:1px solid var(--node-stroke);border-radius:3px;padding:2px 8px;cursor:pointer;opacity:0;transition:opacity .15s}`);
  r.push(`.plate-frame:hover .ddd-fit,.plate-frame .ddd-fit:focus-visible{opacity:1}`);
  r.push(`.plate-frame.plate-wide .ddd-fit{position:sticky;float:right;left:calc(100% - 60px)}`);
  r.push(`.ddd-tooltip{font-family:var(--font-label);font-size:12px;line-height:1.35;background:var(--fg);color:var(--bg);padding:4px 8px;border-radius:3px;max-width:320px;box-shadow:0 4px 12px -6px rgba(0,0,0,.5)}`);

  // Steps.
  r.push(`.steprow{padding:14px 0;border-bottom:1px solid var(--grid)}.steprow:first-of-type{border-top:1px solid var(--node-stroke)}`);
  r.push(`.steprow header{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px}`);
  r.push(`.steprow header b{font-family:var(--font-title);font-weight:500;font-size:19px}`);
  r.push(`.steprow .sn{font-family:var(--font-title);font-size:13px;color:var(--muted);min-width:1.5em}`);
  r.push(`.steprow header .x-sub{flex-basis:100%;margin-left:calc(1.5em + 8px);color:var(--muted);font-size:13px}`);
  r.push(`.steprow.missing{color:var(--muted)}.steprow.missing header b{color:var(--muted)}`);
  r.push(`.pwgrid{margin:8px 0 0 calc(1.5em + 8px)}`);
  r.push(`.pw{display:grid;grid-template-columns:84px minmax(0,1fr);gap:0 12px;padding:5px 0;border-top:1px solid var(--grid)}.pw:first-child{border-top:0}`);
  r.push(`.pwk{font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding-top:3px}.pwv{max-width:72ch}`);
  r.push(`.steprow .x-counts,.steprow .x-fold{margin-left:calc(1.5em + 8px)}`);
  r.push(`pre.raw{max-height:300px}`);
  r.push(`@media (max-width:720px){.pw{grid-template-columns:1fr}.pwgrid,.steprow .x-counts,.steprow .x-fold,.steprow header .x-sub{margin-left:0}}`);

  // Canvases and flows.
  r.push(`.purpose{font-size:15px;max-width:72ch}`);
  r.push(`.flow{padding:12px 0 18px;border-bottom:1px solid var(--grid)}.flow:first-of-type{border-top:1px solid var(--node-stroke)}`);
  r.push(`.flow-title{font-family:var(--font-title);font-weight:500;font-size:19px;margin:0 0 4px}`);
  r.push(`.flow .plate{margin-top:10px}`);

  // The decisions explorer, restyled to the page's hairline system. Its markup is the
  // explorers' (lib/render/explorers/decisions.mjs, not owned here); the page CSS loads
  // last, so the rounded coloured frame, the filled option panels and the chip row
  // above the question become rules, columns and a running line under the question.
  r.push(`.ddd-x .x-dec{border:0;border-top:1px solid var(--node-stroke);border-radius:0;padding:14px 0 18px;margin:0;background:transparent}`);
  r.push(`.ddd-x .x-dec:last-of-type{border-bottom:1px solid var(--grid)}`);
  r.push(`.ddd-x .x-dec.is-open{border-top:2px solid var(--event)}`);
  r.push(`.ddd-x .x-dec-head{gap:6px 8px}.ddd-x .x-dec-q{order:-1;margin:0 0 4px}`);
  r.push(`.ddd-x .x-dec-row{gap:0}`);
  r.push(`.ddd-x .x-opt{border:0;border-left:1px solid var(--grid);border-radius:0;background:transparent;padding:6px 16px 6px 16px}`);
  r.push(`.ddd-x .x-opt:first-child{border-left:0;padding-left:0}`);
  r.push(`.ddd-x .x-opt.is-chosen{border:0;border-left:2px solid var(--core);background:transparent;margin-left:-1px}`);
  r.push(`.ddd-x .x-opt.is-chosen:first-child{margin-left:0;padding-left:14px}`);
  // Option drawings at their natural size in a scrollable frame, never squashed to the
  // column (DIRECTION.md, plates); the runtime's Fit button and pan/zoom apply here too.
  r.push(`.ddd-x .x-opt-fig{border:1px solid var(--grid);border-radius:0;display:block;overflow:auto;max-height:360px;position:relative}`);
  r.push(`.ddd-x .x-opt-fig svg[data-diagram]{width:auto;max-width:none;height:auto;display:block}`);
  r.push(`.ddd-x .x-opt-fig .ddd-fit{position:sticky;float:right;left:calc(100% - 52px);top:6px;font-size:11px;color:var(--muted);background:var(--bg);border:1px solid var(--node-stroke);border-radius:3px;padding:2px 8px;cursor:pointer}`);
  r.push(`@media (max-width:820px){.ddd-x .x-opt{border-left:0;padding-left:0;border-top:1px solid var(--grid);padding-top:12px}.ddd-x .x-opt.is-chosen{border-left:0;border-top:2px solid var(--core);margin-left:0}}`);

  // Search results: runtime hides non-matching rows with [hidden]; keep that final.
  r.push(`[hidden]{display:none!important}`);
  r.push(`:target{scroll-margin-top:calc(var(--head-h) + 48px)}`);

  // Print: the file on paper, no chrome.
  r.push(`@media print{header.docket,nav.tabs,.filters,.plate-files,.ddd-fit,.x-tools{display:none!important}.frame{display:block;padding:0}main{padding:0}details{break-inside:avoid}main>section{margin-bottom:32px}}`);
  r.push(`@media (prefers-reduced-motion:reduce){*{transition:none!important}}`);
  return `${r.join("\n")}\n`;
}
