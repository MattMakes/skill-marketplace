// Render ddd/04-strategize/core-domain-chart.md from strategize.json (mermaid quadrantChart + tables).
//
// Usage (via the CLI):
//   ddd strategize render [<ddd-dir>] [--out PATH] [--update-json] [--styled] [--stdout]
//
//   <ddd-dir>      workspace folder (default ./ddd)
//   --out PATH     write the Markdown here (default <ddd-dir>/04-strategize/core-domain-chart.md)
//   --update-json  also store the generated mermaid in strategize.json as `chart_mermaid` and
//                  stamp `produced_at` (UTC, now), so run it after the last JSON edit
//   --styled       colour points by type (needs a mermaid with point styling; default = plain)
//   --stdout       print the Markdown instead of writing it
//
// Reads strategize.json (required) and, when present, decompose.json (names, contexts, `wraps`),
// understand.json (system name, existing systems), discover.json (external systems) and
// manifest.json (title). The derived Hand-off gives each bounded context the type and pattern of
// its most demanding hosted subdomain (core > supporting > generic; event-sourced > domain-model >
// active-record > transaction-script); generic or bought subdomains hosted inside a built context
// are adapters ("ACL inside <context> around <vendor>"), not context relationships. Coincident
// chart points are nudged by at most 0.01 (0.1 on the 0-10 scale) and the nudge is noted; the
// tables always show the true scores.
//
// Ported statement for statement from render_chart.py, whose argv handling was hand-rolled: every
// `--word` is a flag, everything else a positional, `--out` takes the next token. The
// `render_chart:` stderr prefix is Python-era wording pinned by the goldens until leaf 1.4.1.
// Point coordinates use Python's `%.2f` (round half to even on an exact tie such as 0.125), which
// differs from Number.prototype.toFixed there.
//
// Exit 0 = rendered, 2 = usage / IO problem.
import fs from "node:fs";
import path from "node:path";
import { pyStr } from "../../../shared/lib/jsonschema.mjs";
import { now, writeJson } from "../../../shared/lib/manifest.mjs";

const TYPE_ORDER = { core: 0, supporting: 1, generic: 2 };
const PATTERN_ORDER = { "event-sourced-domain-model": 0, "domain-model": 1, "active-record": 2, "transaction-script": 3 };
const RICH = new Set(["domain-model", "event-sourced-domain-model"]);
const NUDGES = [[0.01, 0], [-0.01, 0], [0, 0.01], [0, -0.01], [0.01, 0.01], [-0.01, -0.01], [0.01, -0.01], [-0.01, 0.01]];

// print(__doc__): the Python docstring verbatim, plus print's newline.
const DOC = `Render ddd/04-strategize/core-domain-chart.md from strategize.json (mermaid quadrantChart + tables).

Usage:
  ddd strategize render [<ddd-dir>] [--out PATH] [--update-json] [--styled] [--stdout]

  <ddd-dir>      workspace folder (default ./ddd)
  --out PATH     write the Markdown here (default <ddd-dir>/04-strategize/core-domain-chart.md)
  --update-json  also store the generated mermaid in strategize.json as \`chart_mermaid\` and stamp
                 \`produced_at\` (UTC, now) — so run it after the last JSON edit
  --styled       colour points by type (needs a mermaid with point styling; default = plain points)
  --stdout       print the Markdown instead of writing it

Reads strategize.json (required) and, when present, decompose.json (names, contexts, \`wraps\`),
understand.json (system name, existing systems), discover.json (external systems) and manifest.json
(title). The derived Hand-off gives each bounded context the type and pattern of its *most demanding*
hosted subdomain (core > supporting > generic; event-sourced > domain-model > active-record >
transaction-script — implementation-patterns.md §4); generic or bought subdomains hosted inside a
built context are adapters ("ACL inside <context> around <vendor>"), not context relationships.
Coincident chart points are nudged by at most 0.01 (0.1 on the 0–10 scale) and the nudge is noted;
the tables always show the true scores. Zero dependencies. Exit 0 = rendered, 2 = usage / IO problem.

`;

const out = (s) => process.stdout.write(s + "\n");
const err = (s) => process.stderr.write(s + "\n");

// ---------------------------------------------------------------------------
// Python value helpers (repeated per script: the chain's scripts are standalone by design).
// ---------------------------------------------------------------------------
const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
const get = (o, k, dflt = null) => (has(o, k) ? (o[k] === undefined ? null : o[k]) : dflt);
const truthy = (v) => !(v === null || v === undefined || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && v.length === 0) || (isDict(v) && Object.keys(v).length === 0));
const or = (a, b) => (truthy(a) ? a : b);
const list = (v) => (Array.isArray(v) ? v : []);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (xs) => [...xs].sort(cmp);
// min(iterable, key=order.get, default=None): the first minimum in iteration order.
const minBy = (xs, order) => xs.reduce((best, v) => (best === null || order[v] < order[best] ? v : best), null);
const intersects = (a, b) => [...a].some((x) => b.has(x));

function load(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// Mermaid quadrant point labels: letters, digits, spaces, hyphens; must start with a letter.
function label(text, fallback) {
  let t = pyStr(or(text, fallback)).replace(/[^A-Za-z0-9 \-]+/g, " ");
  t = t.replace(/\s+/g, " ").replace(/^[ -]+|[ -]+$/g, "");
  if (!t || !/^[A-Za-z]/.test(t)) t = ("S " + t).trim();
  return t;
}

function cell(text) {
  return pyStr(text !== null && text !== undefined ? text : "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function clamp(v) {
  // float(v) raises on text that is not a number, which the Python turned into 0.0.
  let x = Number(v) / 10.0;
  if (Number.isNaN(x)) x = 0.0;
  return Math.max(0.02, Math.min(0.98, x));
}

// `%.2f`: correctly rounded from the exact binary value, ties to even. toFixed picks the
// larger candidate on a tie, so 0.125 would print 0.13 where Python prints 0.12.
function fixed2(x) {
  const s = x.toFixed(2);
  const long = x.toFixed(20);
  const dot = long.indexOf(".");
  const tail = long.slice(dot + 3);
  if (!/^50*$/.test(tail)) return s;
  const truncated = long.slice(0, dot + 3);
  const last = Number(truncated[truncated.length - 1]);
  return last % 2 === 0 ? truncated : s;
}

function tokens(...texts) {
  const s = new Set();
  for (const x of texts) {
    if (!truthy(x)) continue;
    for (const t of pyStr(x).toLowerCase().match(/[a-z]{4,}/g) ?? []) s.add(t);
  }
  return s;
}

function buildMermaid(st, names, title, styled) {
  const lines = ["quadrantChart", `  title ${label("Core domain chart - " + title, "Core domain chart")}`,
    "  x-axis Low model complexity --> High model complexity",
    "  y-axis Low business differentiation --> High business differentiation",
    "  quadrant-1 Core - build a rich model", "  quadrant-2 Short-term or hidden core",
    "  quadrant-3 Generic - buy or adopt", "  quadrant-4 Supporting - suspect if complex"];
  const used = new Set();
  const points = [];
  const nudged = [];
  const cls = [...list(get(st, "classifications", []))].sort((a, b) =>
    cmp(get(TYPE_ORDER, get(a, "type"), 9), get(TYPE_ORDER, get(b, "type"), 9)) || cmp(get(a, "subdomain", ""), get(b, "subdomain", "")));
  for (const c of cls) {
    const sid = get(c, "subdomain", "");
    const x0 = clamp(get(c, "model_complexity"));
    const y0 = clamp(get(c, "business_differentiation"));
    let x = x0;
    let y = y0;
    const key = (px, py) => `${fixed2(px)},${fixed2(py)}`;
    for (const [dx, dy] of NUDGES) { // <= 0.01 so the point never visibly leaves its true score
      if (!used.has(key(x, y))) break;
      x = Math.max(0.02, Math.min(0.98, x0 + dx));
      y = Math.max(0.02, Math.min(0.98, y0 + dy));
    }
    if (x !== x0 || y !== y0) nudged.push(sid);
    used.add(key(x, y));
    const klass = styled && has(TYPE_ORDER, get(c, "type")) ? `:::${get(c, "type")}` : "";
    points.push(`  ${label(names.get(sid), sid)}${klass}: [${fixed2(x)}, ${fixed2(y)}]`);
  }
  lines.push(...points);
  if (styled) {
    lines.push("  classDef core color: #c0392b, radius: 8", "  classDef supporting color: #2e86c1, radius: 6",
      "  classDef generic color: #7f8c8d, radius: 5");
  }
  return [lines.join("\n"), nudged];
}

// One profile per bounded context: derived type/pattern = most demanding hosted subdomain;
// `external` subdomains (generic, or sourced buy/open-source) are adapters unless the whole
// context is bought.
function contextProfiles(dc, clsBySub) {
  const profiles = [];
  for (const b of list(get(dc || {}, "bounded_contexts", []))) {
    const subs = list(get(b, "subdomains", [])).filter((s) => clsBySub.has(s));
    const ctype = minBy(subs.map((s) => get(clsBySub.get(s), "type")).filter((t) => has(TYPE_ORDER, t)), TYPE_ORDER);
    const cpat = minBy(subs.map((s) => get(clsBySub.get(s), "implementation_pattern")).filter((p) => has(PATTERN_ORDER, p)), PATTERN_ORDER);
    const external = subs.filter((s) => get(clsBySub.get(s), "type") === "generic" || ["buy", "open-source"].includes(get(clsBySub.get(s), "sourcing")));
    const bought = subs.length > 0 && external.length === subs.length;
    profiles.push({ id: get(b, "id"), type: ctype, pattern: cpat, subs, bought, adapters: bought ? [] : external, wraps: or(get(b, "wraps"), []) });
  }
  return profiles;
}

// Name the external system a hosted adapter subdomain wraps: its events' external-system actors,
// then the context's `wraps`, then an understand existing system whose name/role shares a word.
function vendorOf(sid, prof, dc, un, dsc, names) {
  const ext = new Map();
  for (const e of list(get(dsc || {}, "external_systems", []))) ext.set(get(e, "id"), or(get(e, "name"), get(e, "id")));
  const sub = list(get(dc || {}, "subdomains", [])).find((s) => get(s, "id") === sid) ?? {};
  const subEvents = new Set(list(get(sub, "events", [])));
  const actors = new Set(list(get(dsc || {}, "events", [])).filter((e) => subEvents.has(get(e, "id"))).map((e) => get(e, "actor")));
  let found = sorted([...actors].filter((a) => ext.has(a))).map((a) => ext.get(a));
  if (!found.length) found = list(prof.wraps).map((w) => (ext.has(w) ? ext.get(w) : w));
  if (!found.length) {
    const toks = tokens(sid, names.get(sid), get(sub, "description"));
    found = list(get(un || {}, "existing_systems", [])).filter((s) => intersects(tokens(get(s, "name"), get(s, "role")), toks)).map((s) => get(s, "name"));
  }
  return or([...new Set(found)].map(pyStr).join(", "), "vendor not named upstream");
}

// ---------- "In plain words" (envelope `plain_words`, artifact-contract.md §3) ----------
// Repeated verbatim in every step renderer: these scripts are standalone by design, and a reader
// who cannot read the dense part below still deserves to see what was decided and what would
// hurt if it is wrong.
function plainWordsBlock(doc) {
  const pw = get(doc || {}, "plain_words");
  if (!isDict(pw)) return [];
  const [what, decided, assumed, riskiest] = ["what", "decided", "assumed", "riskiest"].map((k) => pyStr(or(get(pw, k), "")).trim());
  if (!(what || decided || assumed || riskiest)) return [];
  const block = ["## In plain words", ""];
  if (what) block.push(what, "");
  for (const [name, value] of [["Decided", decided], ["Assumed", assumed], ["Riskiest", riskiest]]) {
    if (value) block.push(`**${name}:** ${value}`, "");
  }
  return [...block, "---", ""];
}

export function render(st, dc, un, mf, dsc, styled) {
  const title = or(get(mf || {}, "title"), or(get(or(get(un || {}, "system", {}), {}), "name"), or(get(mf || {}, "project"), "project")));
  const names = new Map();
  const ctxOf = new Map();
  for (const s of list(get(dc || {}, "subdomains", []))) names.set(get(s, "id"), or(get(s, "name"), get(s, "id")));
  for (const b of list(get(dc || {}, "bounded_contexts", []))) {
    for (const s of list(get(b, "subdomains", []))) {
      if (!ctxOf.has(s)) ctxOf.set(s, []);
      ctxOf.get(s).push(get(b, "id"));
    }
  }
  const cls = [...list(get(st, "classifications", []))].sort((a, b) =>
    cmp(get(TYPE_ORDER, get(a, "type"), 9), get(TYPE_ORDER, get(b, "type"), 9)) ||
    cmp(-(Number(or(get(a, "business_differentiation"), 0)) || 0), -(Number(or(get(b, "business_differentiation"), 0)) || 0)) ||
    cmp(get(a, "subdomain", ""), get(b, "subdomain", "")));
  const byType = Object.fromEntries(Object.keys(TYPE_ORDER).map((t) => [t, cls.filter((c) => get(c, "type") === t).map((c) => c.subdomain)]));
  const [mermaid, nudged] = buildMermaid(st, names, title, styled);
  const ids = (xs) => (list(xs).length ? list(xs).map((x) => `\`${pyStr(x)}\``).join(", ") : "—");

  const doc = [`# Core domain chart — ${pyStr(title)}`, "",
    `_Step 4 of 9 (\`ddd-strategize\`) · mode \`${pyStr(get(st, "mode", "?"))}\` · depth \`${pyStr(get(st, "depth", "?"))}\` · produced \`${pyStr(get(st, "produced_at", "?"))}\`_`, "",
    `**Where to invest:** core → ${ids(byType.core)}; supporting → ${ids(byType.supporting)}; generic (buy/adopt) → ${ids(byType.generic)}.`, ""];
  if (truthy(get(st, "summary"))) doc.push(pyStr(st.summary).trim(), "");
  doc.push("## Chart", "", "```mermaid", mermaid, "```", "",
    "Axes: x = model complexity (score/10), y = business differentiation (score/10). Top-right is the core; "
    + "bottom-left is generic; a supporting subdomain far to the right is \"suspect\" (accidental complexity or a core in disguise)."
    + (nudged.length ? ` Points nudged by ≤ 0.01 for legibility (${ids(nudged)}); the table below holds the true scores.` : ""), "",
    "## Classifications", "",
    "| Subdomain | Type | Diff | Cplx | Evolution | Sourcing | Pattern | Investment | Context(s) |", "|---|---|---|---|---|---|---|---|---|");
  for (const c of cls) {
    const sid = get(c, "subdomain", "");
    const t = get(c, "type", "");
    doc.push(`| ${cell(names.has(sid) ? names.get(sid) : sid)} (\`${pyStr(sid)}\`) | ${t === "core" ? `**${t}**` : pyStr(t)} | ${cell(get(c, "business_differentiation"))} | `
      + `${cell(get(c, "model_complexity"))} | ${cell(or(get(c, "evolution"), "—"))} | ${cell(get(c, "sourcing"))} | `
      + `${cell(get(c, "implementation_pattern"))} | ${cell(get(c, "investment"))} | ${ids(ctxOf.get(sid) ?? [])} |`);
  }
  const hasPattern = cls.some((c) => truthy(get(c, "chart_pattern")));
  doc.push("", "## Rationale and future direction", "",
    "| Subdomain | Rationale | Future direction |" + (hasPattern ? " Chart pattern |" : ""),
    "|---|---|---|" + (hasPattern ? "---|" : ""));
  for (const c of cls) {
    let rat = cell(get(c, "rationale"));
    if (Array.isArray(get(c, "goal_ids"))) rat += ` · _Goals:_ ${c.goal_ids.length ? c.goal_ids.map(pyStr).join(", ") : "none apply"}`;
    if (truthy(get(c, "evolution_rationale"))) rat += ` · _Evolution:_ ${cell(c.evolution_rationale)}`;
    let row = `| \`${pyStr(get(c, "subdomain"))}\` | ${rat} | ${cell(or(get(c, "future_direction"), "—"))} |`;
    if (hasPattern) row += ` ${cell(or(get(c, "chart_pattern"), "—"))} |`;
    doc.push(row);
  }
  doc.push("", "## Investment", "");
  if (truthy(get(st, "investment_summary"))) {
    doc.push(pyStr(st.investment_summary).trim(), "");
  } else {
    const inv = Object.fromEntries(["high", "medium", "low"].map((k) => [k, cls.filter((c) => get(c, "investment") === k).map((c) => c.subdomain)]));
    doc.push(`High: ${ids(inv.high)}. Medium: ${ids(inv.medium)}. Low: ${ids(inv.low)}.`, "",
      "Rule: the best people and the modelling time go to the core; supporting subdomains stay simple; generic subdomains get integration effort only.", "");
  }
  doc.push("## Bets", "");
  const bets = get(st, "bets", []);
  if (!truthy(bets)) doc.push("_None recorded._");
  for (const b of list(bets)) {
    let line = `- **${pyStr(get(b, "id"))}** — ${cell(get(b, "text"))}`;
    if (truthy(get(b, "risk"))) line += ` · _Risk:_ ${cell(b.risk)}`;
    if (truthy(get(b, "validate_by"))) line += ` · _Validate by:_ ${cell(b.validate_by)}`;
    if (truthy(get(b, "subdomains"))) line += ` · _Subdomains:_ ${ids(b.subdomains)}`;
    doc.push(line);
  }
  if (cls.some((c) => truthy(get(c, "purpose_alignment")))) {
    doc.push("", "## Purpose alignment", "", "| Subdomain | Quadrant | Type |", "|---|---|---|");
    for (const c of cls) doc.push(`| \`${pyStr(get(c, "subdomain"))}\` | ${cell(or(get(c, "purpose_alignment"), "—"))} | ${pyStr(get(c, "type"))} |`);
  }
  if (truthy(get(st, "wardley_narrative"))) doc.push("", "## Wardley narrative", "", pyStr(st.wardley_narrative).trim());
  if (truthy(get(st, "deprecated"))) {
    doc.push("", "## Deprecated", "");
    for (const d of list(st.deprecated)) doc.push(`- \`${pyStr(or(get(d, "id"), get(d, "subdomain")))}\` — ${cell(get(d, "reason"))}`);
  }
  doc.push("", "## Assumptions", "");
  const assumptions = list(get(st, "assumptions", [])).map((a) => `- **${pyStr(get(a, "id"))}** (${pyStr(get(a, "confidence"))}) — ${cell(get(a, "text"))}`);
  doc.push(...(assumptions.length ? assumptions : ["_None._"]));
  doc.push("", "## Open questions", "");
  const questions = list(get(st, "open_questions", [])).map((q) =>
    `- **${pyStr(get(q, "id"))}** — ${cell(get(q, "text"))} _(blocking: ${truthy(get(q, "blocking")) ? "yes" : "no"}; owner: ${pyStr(or(get(q, "owner"), "unassigned"))})_`);
  doc.push(...(questions.length ? questions : ["_None._"]));
  if (truthy(get(st, "notes_for_downstream"))) {
    doc.push("", "## Notes for downstream", "");
    for (const n of list(st.notes_for_downstream)) {
      doc.push(`- **${pyStr(get(n, "id"))}** → ${list(or(get(n, "for"), [])).map(pyStr).join(", ")} (${pyStr(or(get(n, "kind"), "other"))}): ${cell(get(n, "text"))}`);
    }
  }
  // derived hand-off: a context = its most demanding subdomain; hosted generic/bought subdomains are adapters
  const clsBySub = new Map();
  for (const c of cls) if (truthy(get(c, "subdomain"))) clsBySub.set(c.subdomain, c);
  const profs = contextProfiles(dc, clsBySub);
  const profById = new Map(profs.map((p) => [p.id, p]));
  const richCtx = [];
  const simpleCtx = [];
  const ctxTypes = [];
  const adapterLines = [];
  for (const p of profs) {
    const adapters = p.adapters.map((s) => `\`${pyStr(s)}\` ${pyStr(get(clsBySub.get(s), "implementation_pattern"))}`).join(", ");
    (RICH.has(p.pattern) ? richCtx : simpleCtx).push(`\`${pyStr(p.id)}\` (${pyStr(or(p.pattern, "—"))}` + (adapters ? `; adapters: ${adapters}` : "") + ")");
    ctxTypes.push(`\`${pyStr(p.id)}\` = ${pyStr(or(p.type, "—"))}` + (p.adapters.length ? ` (hosts ${ids(p.adapters)} as an adapter)` : ""));
    for (const s of p.adapters) adapterLines.push(`ACL inside \`${pyStr(p.id)}\` around ${vendorOf(s, p, dc, un, dsc, names)} (\`${pyStr(s)}\`)`);
  }
  const genericUp = list(get(dc || {}, "relationships", []))
    .filter((r) => truthy(get(profById.get(get(r, "upstream")) ?? {}, "bought")) && profById.has(get(r, "downstream")) && !profById.get(get(r, "downstream")).bought)
    .map((r) => `\`${pyStr(get(r, "upstream"))}\` → \`${pyStr(get(r, "downstream"))}\` (${pyStr(get(r, "id"))})`);
  doc.push("", "## Hand-off", "",
    "- `ddd-connect`: integration effort follows investment — protect the core with an anticorruption layer where a bought/generic context is upstream of a built one"
    + (genericUp.length ? `: ${genericUp.join("; ")}` : " (none in this context map)") + ". Adapters inside built contexts (an ACL around the vendor, not a context relationship): "
    + (adapterLines.length ? adapterLines.join("; ") : "none") + ".",
    `- \`ddd-organise\`: the core (${ids(byType.core)}) gets the strongest, most stable team; generic contexts need integrators only.`,
    "- `ddd-define`: strategic classification per context (a context takes its most demanding subdomain): " + (ctxTypes.length ? ctxTypes.join("; ") : "—") + ".",
    "- `ddd-code`: aggregates only for contexts on a domain model: " + (richCtx.length ? richCtx.join(", ") : "none") + ". Application services and a `design.md` only: " + (simpleCtx.length ? simpleCtx.join(", ") : "none") + ".", "");
  doc.splice(2, 0, ...plainWordsBlock(st));
  return [doc.join("\n"), mermaid];
}

export function main(argv) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const flags = argv.filter((a) => a.startsWith("--"));
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(DOC);
    return 0;
  }
  let ddd = args.length ? args[0] : "ddd";
  let outPath = null;
  if (argv.includes("--out")) {
    const i = argv.indexOf("--out");
    outPath = i + 1 < argv.length ? argv[i + 1] : null;
    if (outPath !== null && args.includes(outPath)) {
      args.splice(args.indexOf(outPath), 1);
      ddd = args.length ? args[0] : "ddd";
    }
  }
  const stPath = path.join(ddd, "04-strategize", "strategize.json");
  let st;
  let dc;
  let un;
  let dsc;
  let mf;
  try {
    st = load(stPath);
    if (st === null) {
      err(`ddd strategize render: ${stPath} not found`);
      return 2;
    }
    dc = load(path.join(ddd, "03-decompose", "decompose.json"));
    un = load(path.join(ddd, "01-understand", "understand.json"));
    dsc = load(path.join(ddd, "02-discover", "discover.json"));
    mf = load(path.join(ddd, "manifest.json"));
  } catch (e) {
    err(`ddd strategize render: ${e.message}`);
    return 2;
  }
  if (flags.includes("--update-json")) st.produced_at = now(); // stamp first so the Markdown header shows the same produced_at
  const [md, mermaid] = render(st, dc, un, mf, dsc, flags.includes("--styled"));
  if (flags.includes("--update-json")) {
    st.chart_mermaid = mermaid;
    writeJson(stPath, st);
    out(`updated chart_mermaid and produced_at=${st.produced_at} in ${path.resolve(stPath)}`);
  }
  if (flags.includes("--stdout")) {
    out(md);
    return 0;
  }
  outPath = or(outPath, path.join(ddd, "04-strategize", "core-domain-chart.md"));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md.endsWith("\n") ? md : md + "\n");
  out(`wrote ${path.resolve(outPath)}`);
  return 0;
}

export default main;
