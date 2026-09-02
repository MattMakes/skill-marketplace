// Semantic lint for ddd/04-strategize/strategize.json (the checks `ddd validate` does not make).
//
// Usage (via the CLI):
//   ddd strategize lint [<ddd-dir>]
//
// Errors (exit 1) mirror the validate gate: missing/invalid file, unclassified or unknown or
// duplicated subdomains, scores outside 0-10. Everything else is a WARN (exit 0): type vs scores,
// core count (minority; decisive cores vs manifest scale_target.teams), sourcing vs
// type/evolution, pattern vs type/complexity, investment vs type, rationale tied to a goal, event
// sourcing justified, missing evolution/future_direction/bets at standard+ depth, chart_mermaid.
//
// Structured keys win over prose when present (both additive, per classification):
//   goal_ids: ["G1", ...]    understand goal ids this subdomain moves; [] means "no goal applies"
//   history_is_asset: bool   true is what justifies event-sourced-domain-model
// Without them the prose is read: a goal is `G<n>` or one of "no goal" / "outside the software" /
// "not tied to a goal"; an event-sourcing need is one of HISTORY_WORDS below.
//
// Ported statement for statement from lint_strategize.py, whose argv handling was hand-rolled
// (no argparse): `-h`/`--help` anywhere prints this text, the first argument is the workspace
// (default `ddd`), anything else is ignored. Everything, errors included, goes to stdout. The
// Python-era hint `run render_chart.py <ddd-dir> --update-json` stays verbatim until leaf 1.4.1.
//
// Exit 1 = errors, 0 = clean or warnings only.
import fs from "node:fs";
import path from "node:path";
import { pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";

const RICH = new Set(["domain-model", "event-sourced-domain-model"]);
const HISTORY_WORDS = /audit|ledger|money|monetary|refund|dispute|regulat|complian|temporal|as of|history|analytic|replay|reconstruct|forensic|machine learning|\bML\b/i;
const NO_GOAL = /no goal|outside the software|not tied to a goal/i;

// print(__doc__): the Python docstring verbatim, plus print's newline.
const DOC = `Semantic lint for ddd/04-strategize/strategize.json (the checks ddd validate does not make).

Usage:
  ddd strategize lint [<ddd-dir>]

Errors (exit 1) mirror the ddd validate gate: missing/invalid file, unclassified or unknown or
duplicated subdomains, scores outside 0-10. Everything else is a WARN (exit 0): type vs scores,
core count (minority; decisive cores vs manifest scale_target.teams), sourcing vs type/evolution,
pattern vs type/complexity, investment vs type, rationale tied to a goal, event sourcing justified,
missing evolution/future_direction/bets at standard+ depth, chart_mermaid.

Structured keys win over prose when present (both additive, per classification):
  goal_ids: ["G1", …]      understand goal ids this subdomain moves; [] means "no goal applies"
  history_is_asset: bool   true is what justifies event-sourced-domain-model
Without them the prose is read: a goal is \`G<n>\` or one of "no goal" / "outside the software" /
"not tied to a goal"; an event-sourcing need is one of HISTORY_WORDS below.
Fix errors; either fix warnings or record why you kept the decision. Zero dependencies.

`;

const out = (s) => process.stdout.write(s + "\n");

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
// isinstance(v, (int, float)) and not isinstance(v, bool)
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
// len() of a str counts code points, not UTF-16 units.
const strLen = (s) => [...pyStr(s)].length;

// load(): None when the file is missing; a parse error propagates like json.JSONDecodeError.
function load(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function main(argv) {
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(DOC);
    return 0;
  }
  const ddd = argv.length ? argv[0] : "ddd";
  const errors = [];
  const warns = [];
  const notes = [];
  const stPath = path.join(ddd, "04-strategize", "strategize.json");
  let st;
  try {
    st = load(stPath);
  } catch (e) {
    out(`ERROR invalid JSON in ${stPath}: ${e.message}`);
    return 1;
  }
  if (st === null) {
    out(`ERROR ${stPath} not found`);
    return 1;
  }
  let dc;
  let un;
  let mf;
  try {
    dc = or(load(path.join(ddd, "03-decompose", "decompose.json")), {});
    un = or(load(path.join(ddd, "01-understand", "understand.json")), {});
    mf = or(load(path.join(ddd, "manifest.json")), {});
  } catch (e) {
    // The Python died with a traceback (exit 1) on an unreadable upstream file.
    process.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
  let teams = get(or(get(mf, "scale_target"), or(get(un, "scale_target"), {})), "teams");
  // bool is an int in Python: True counts as 1 team.
  if (typeof teams === "boolean") teams = teams ? 1 : 0;
  const depth = get(st, "depth", "standard");
  const cls = get(st, "classifications", []);
  if (!Array.isArray(cls) || !cls.length) {
    out("ERROR classifications missing or empty");
    return 1;
  }
  const ids = cls.map((c) => get(c, "subdomain"));
  const known = list(get(dc, "subdomains", [])).map((s) => get(s, "id"));
  const goalIds = new Set(list(get(un, "goals", [])).map((g) => get(g, "id")));
  for (const s of known) {
    if (!ids.includes(s)) errors.push(`subdomain '${pyStr(s)}' from decompose.json is not classified`);
  }
  for (const s of ids) {
    if (known.length && !known.includes(s)) errors.push(`classified '${pyStr(s)}' is not a subdomain in decompose.json`);
  }
  // `for s in set(ids)`: the Python iterated a set (hash order); first-seen order here.
  for (const s of new Set(ids)) {
    if (ids.filter((x) => x === s).length > 1) errors.push(`subdomain '${pyStr(s)}' classified more than once`);
  }
  const cores = cls.filter((c) => get(c, "type") === "core").map((c) => c.subdomain);
  const n = cls.length;
  if (!cores.length) warns.push("no core subdomain — allowed only if the differentiation lies outside the software; say so in assumptions");
  if (cores.length > Math.max(2, Math.floor(n / 2))) {
    warns.push(`${cores.length} of ${n} subdomains are core — core should be the minority; demote by differentiation rank and log each demotion`);
  }
  const cd = get(st, "core_domains", []);
  if (JSON.stringify(sorted(list(cd))) !== JSON.stringify(sorted(cores))) {
    warns.push(`core_domains ${pyRepr(cd)} != subdomains typed core ${pyRepr(cores)} — set core_domains = ${pyRepr(sorted(cores))}`);
  }
  const decisive = cls.filter((c) => get(c, "type") === "core" && or(num(get(c, "business_differentiation")), 0) >= 8 && or(num(get(c, "model_complexity")), 0) >= 8).map((c) => c.subdomain);
  if (Number.isInteger(teams) && teams > 0 && decisive.length > teams) {
    const forOrganise = list(or(get(st, "notes_for_downstream"), [])).some((x) => list(or(get(x, "for"), [])).includes("organise"));
    const msg = `${decisive.length} decisive cores ${pyRepr(decisive)} but scale_target.teams = ${teams} — one core per stream-aligned team is the healthy shape: ` +
      "demote one (log the assumption) or say which team owns both in a notes_for_downstream entry for organise";
    (forOrganise ? notes : warns).push(msg);
  }
  for (const c of cls) {
    const sid = pyStr(get(c, "subdomain"));
    const t = get(c, "type");
    const d = get(c, "business_differentiation");
    const x = get(c, "model_complexity");
    for (const [name, v] of [["business_differentiation", d], ["model_complexity", x]]) {
      if (num(v) === null || v < 0 || v > 10) errors.push(`${sid}: ${name} must be a number 0-10 (got ${pyRepr(v)})`);
    }
    if (num(d) === null || num(x) === null) continue;
    const src = get(c, "sourcing");
    const pat = get(c, "implementation_pattern");
    const inv = get(c, "investment");
    const evo = get(c, "evolution");
    // type vs scores
    if (t === "core" && d < 6) warns.push(`${sid}: core with differentiation ${pyStr(d)} — core needs >= 7 (or 6 with complexity >= 6 and a goal); re-score or demote to supporting`);
    if (t === "generic" && d > 4) warns.push(`${sid}: generic with differentiation ${pyStr(d)} — if customers pick us for this it is not generic`);
    if (t === "supporting" && d >= 8) warns.push(`${sid}: supporting with differentiation ${pyStr(d)} — core in disguise? promote or lower the score`);
    if (t === "supporting" && x >= 8) warns.push(`${sid}: supporting with complexity ${pyStr(x)} — suspect supporting: accidental complexity to reduce, or a hidden core`);
    if (t === "core" && x <= 3) notes.push(`${sid}: core with complexity ${pyStr(x)} — short-term or hidden core; keep the architecture light and name the next core in future_direction`);
    // sourcing
    if (t === "core" && (src === "buy" || src === "outsource")) warns.push(`${sid}: core sourced as ${src} — never buy or outsource the core; build (vendor components are fine, the model is ours)`);
    if (t === "generic" && src === "build") warns.push(`${sid}: generic but sourcing=build — buy/open-source unless a constraint forbids it (say which)`);
    if (evo === "commodity" && src === "build") warns.push(`${sid}: commodity evolution but sourcing=build — commodity means buy the utility`);
    if (evo === "genesis" && (src === "buy" || src === "open-source")) warns.push(`${sid}: genesis evolution but sourcing=${src} — nothing to buy yet; this is an experiment/bet`);
    // pattern
    if (t === "generic" && RICH.has(pat)) warns.push(`${sid}: generic with ${pat} — integrate, don't model; use transaction-script glue`);
    if (t === "core" && pat === "transaction-script") warns.push(`${sid}: core with transaction-script — rules will scatter; use domain-model (or active-record only if complexity <= 3)`);
    if (t === "core" && x >= 4 && pat === "active-record") warns.push(`${sid}: core with complexity ${pyStr(x)} on active-record — invariants belong in an aggregate; use domain-model`);
    if (t === "supporting" && pat === "event-sourced-domain-model") warns.push(`${sid}: supporting with event sourcing — over-engineering; active-record or transaction-script`);
    const hia = get(c, "history_is_asset");
    const prose = pyStr(or(get(c, "rationale"), "")) + " " + pyStr(or(get(c, "future_direction"), ""));
    if (pat === "event-sourced-domain-model" && (hia === false || (hia === null && !HISTORY_WORDS.test(prose)))) {
      warns.push(`${sid}: event-sourced but history_is_asset is ${hia === false ? "false" : "unset and the rationale names no audit/money/temporal/analytics need"} — set history_is_asset: true with the need in the rationale, or use domain-model`);
    }
    if (hia === true && t === "core" && x >= 4 && pat === "domain-model") {
      notes.push(`${sid}: history_is_asset is true but pattern is domain-model — event-sourced-domain-model would fit; otherwise set history_is_asset: false`);
    }
    if ((src === "buy" || src === "open-source") && RICH.has(pat)) warns.push(`${sid}: sourcing=${src} with ${pat} — you do not model a vendor's problem`);
    // investment
    if (t === "core" && inv === "low") warns.push(`${sid}: core with low investment — the core gets the best people and the modelling time`);
    if (t === "generic" && inv === "high") warns.push(`${sid}: generic with high investment — integration only`);
    // rationale tied to a goal (goal_ids wins over prose)
    const rat = or(get(c, "rationale", ""), "");
    const gids = get(c, "goal_ids");
    const ratLen = strLen(rat);
    if (ratLen < 40) {
      warns.push(`${sid}: rationale too thin (${ratLen} chars) — name the goal (or that none applies), the alternative the customer has today (or 'no alternative known') and the rule that fired`);
    }
    if (Array.isArray(gids)) {
      const bad = gids.filter((g) => goalIds.size && !goalIds.has(g));
      if (bad.length) warns.push(`${sid}: goal_ids ${pyRepr(bad)} are not understand goals ${pyRepr(sorted(goalIds))}`);
    } else if (gids !== null) {
      warns.push(`${sid}: goal_ids must be a list of goal ids ([] = no goal applies), got ${pyRepr(gids)}`);
    } else if (ratLen >= 40 && goalIds.size && !/\bG\d+\b/.test(pyStr(rat)) && !NO_GOAL.test(pyStr(rat))) {
      warns.push(`${sid}: rationale does not reference an understand goal (G1, G2, …) — add goal_ids: ["G1"] (or [] for none), or say 'no goal applies' in the rationale`);
    }
    if (has(c, "evolution_rationale") && typeof get(c, "evolution_rationale") !== "string") warns.push(`${sid}: evolution_rationale must be a string`);
    if (depth !== "light") {
      if (!truthy(evo)) warns.push(`${sid}: evolution missing (required at depth ${pyStr(depth)})`);
      if (!pyStr(or(get(c, "future_direction"), "")).trim()) warns.push(`${sid}: future_direction missing (required at depth ${pyStr(depth)})`);
    }
  }
  if (depth !== "light" && !truthy(get(st, "bets"))) warns.push("bets is empty — record at least one big bet (or state that there is none and why)");
  const cm = get(st, "chart_mermaid", "");
  if (!truthy(cm) || !pyStr(cm).trimStart().startsWith("quadrantChart")) {
    warns.push("chart_mermaid missing or not a quadrantChart — run ddd strategize render <ddd-dir> --update-json");
  }
  const inputs = get(st, "inputs", []);
  // `"decompose" in i`: substring of a string, key of a dict.
  const mentionsDecompose = (i) => (typeof i === "string" ? i.includes("decompose") : isDict(i) ? has(i, "decompose") : list(i).includes("decompose"));
  if (!list(inputs).some(mentionsDecompose)) warns.push("inputs does not list ddd/03-decompose/decompose.json");
  for (const e of errors) out(`ERROR strategize: ${e}`);
  for (const w of warns) out(`WARN  strategize: ${w}`);
  for (const x of notes) out(`NOTE  strategize: ${x}`);
  out(`lint: ${errors.length} error(s), ${warns.length} warning(s), ${notes.length} note(s); ${n} subdomains, core = ${pyRepr(cores)}` + (decisive.length ? `, decisive = ${pyRepr(decisive)}` : ""));
  return errors.length ? 1 : 0;
}

export default main;
