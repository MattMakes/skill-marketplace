// `ddd understand lint [<ddd-dir>] [--json]`: the port of lint_understand.py.
//
// Lints ddd/01-understand/understand.{json,md} against the ddd-understand output rules:
// id conventions, uniqueness, envelope details, additive keys (system.lifecycle,
// actors[].role), method heuristics, depth sizing, manifest scale_target sync,
// notes_for_downstream[] shape, alternatives[] and value_proposition_links[], and the
// Markdown <-> JSON consistency checks. Every message is printed word for word as the
// Python printed it (Python-era hints included; leaf 1.4.1 rewords code and goldens
// together), so the goldens compare byte for byte.
//
// Exit codes follow the Python: 0 = no errors (warnings allowed), 1 = errors,
// 2 = usage/IO problem. The fixtures only pin exit 0; the 1-on-errors branch is kept
// because parity with the twin is the contract of phase 1.3.
import fs from "node:fs";
import path from "node:path";
import { pyDumps, pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";

const USAGE = "usage: ddd understand lint [<ddd-dir>] [--json]";

// Patterns are kept as the Python strings so the `does not match <pattern>` message
// prints them verbatim; they are compiled separately with Python's `$` semantics
// (end of string or just before a final newline).
const ID_RULES = [
  ["goals", "^G[1-9]\\d*$"],
  ["impacts", "^I[1-9]\\d*$"],
  ["deliverables", "^D[1-9]\\d*$"],
  ["constraints", "^C[1-9]\\d*$"],
  ["assumptions", "^A[1-9]\\d*$"],
  ["open_questions", "^Q[1-9]\\d*$"],
  ["notes_for_downstream", "^N[1-9]\\d*$"],
  ["capabilities", "^cap-[a-z0-9]+(?:-[a-z0-9]+)*$"],
  ["alternatives", "^alt-[a-z0-9]+(?:-[a-z0-9]+)*$"],
  ["actors", "^[a-z0-9]+(?:-[a-z0-9]+)*$"],
];
const ALT_KINDS = ["competitor", "incumbent-product", "spreadsheet", "manual-process", "in-house-tool", "do-nothing"];
const ASSUMED_SUFFIX = /\s*\(assumed\)\s*$/i;
const ALT_TABLE_HEADING = /^#{2,4}\s+(?:\d+[a-z]?[.)]?\s*)?alternatives today\b/im;
const VP_TABLE_HEADING = /^#{2,4}\s+(?:\d+[a-z]?[.)]?\s*)?value propositions?\b.*beats/im;
const DOWNSTREAM_STEPS = ["discover", "decompose", "strategize", "connect", "organise", "define", "code"];
const NOTE_KINDS = ["language", "boundary", "process", "risk", "decision", "other"];
// A Markdown heading that carries notes for later steps: the template's "10a. Notes for
// downstream steps" or an ad-hoc "Notes for ddd-decompose" / "Notes".
const NOTES_HEADING = /^(#{2,4})\s+(?:\d+[a-z]?[.)]?\s*)?((?:notes?\b|.*\bnotes?\s+for\b|.*\bdownstream\b)[^\n]*?)\s*$/gim;
// A lone "none" / "n/a" / "—" bullet or table row under that heading is the template's placeholder.
const PLACEHOLDER = /^(?:none|n\/?a|nil|—|–|-|\(none\)|no notes?)\.?$/i;
const DEPTH_CAPS = { light: [3, 8], standard: [4, 15], deep: [6, 30] };
const H2_REQUIRED = [
  "System", "Business Model Canvas", "Goals", "Impact map", "Capabilities",
  "Constraints", "Non-goals", "Existing systems", "Scale target",
  "Assumptions and open questions",
];
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SOLUTION_WORDS = /\b(api|apis|microservices?|database|db|endpoints?|screens?|pages?|modules?|backend|frontend|ui|app|kafka|queue|lambda|kubernetes|k8s|react|postgres|mongo)\b/i;
const DELIVERABLE_VERBS = /^\s*(build|implement|add|create|develop|deploy|ship|integrate|migrate|write|design|set up|launch|introduce)\b/i;
const LIFECYCLES = ["greenfield", "brownfield", "rewrite"];
const ROLES = ["primary", "secondary", "off-stage"];
const DEPRECATED_KEYS = ["id", "collection", "reason", "since"];

// ---------------------------------------------------------------------------
// Python semantics the checks lean on.
// ---------------------------------------------------------------------------
const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
// dict.get(k[, default]): the default only when the key is absent.
const get = (o, k, dflt = null) => (has(o, k) ? o[k] : dflt);
// Python truthiness for JSON values.
const truthy = (v) => !(v === null || v === undefined || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && v.length === 0) || (isDict(v) && Object.keys(v).length === 0));
const isStr = (v) => typeof v === "string";
// isinstance(v, int): bool is an int in Python; JSON.parse cannot tell 1.0 from 1.
const isInt = (v) => typeof v === "boolean" || (typeof v === "number" && Number.isInteger(v));
// repr() of a list, as an f-string `{list(X)}` or `{bad}` prints it.
const listRepr = (xs) => pyRepr(xs);
// str.strip() on a JSON string.
const strip = (s) => s.trim();
// Python's `x in dict` / `x in set` where JS would stringify: compare on the raw values.
const includes = (set, v) => set.has(v);
// `"x" in str` — a value tested against a text.
const inText = (needle, hay) => hay.includes(needle);
// re.match(pattern, s) with Python's `$` (also just before a trailing "\n").
const pyMatch = (pattern, s) => new RegExp(pattern.replace(/\$$/, "\\n?$")).test(s);
// `sep.join(map(str, xs))`.
const join = (xs, sep) => xs.map(pyStr).join(sep);
// str.splitlines(): every line boundary Python recognises, no trailing empty line.
function splitlines(text) {
  const parts = text.split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}

class Report {
  constructor() { this.errors = []; this.warnings = []; this.info = []; }
  err(m) { this.errors.push(m); }
  warn(m) { this.warnings.push(m); }
  note(m) { this.info.push(m); }
}

function idsOf(items) {
  return (Array.isArray(items) ? items : []).filter(isDict).map((x) => get(x, "id"));
}
// Python's `u.get(coll) or []`: anything falsy becomes an empty list; a truthy non-list
// would make the Python iterate a dict's keys or a string's characters, which no
// fixture does, so it is treated as a list of its values.
function listOr(v) {
  if (!truthy(v)) return [];
  return Array.isArray(v) ? v : (isDict(v) ? Object.keys(v) : Array.from(String(v)));
}
const dictOr = (v) => (truthy(v) && isDict(v) ? v : {});

function checkIds(rep, u) {
  for (const [coll, pattern] of ID_RULES) {
    const seen = new Set();
    listOr(get(u, coll)).forEach((item, i) => {
      if (!isDict(item)) { rep.err(`${coll}[${i}]: not an object`); return; }
      const v = get(item, "id");
      if (!isStr(v) || !pyMatch(pattern, v)) rep.err(`${coll}[${i}].id=${pyRepr(v)} does not match ${pattern}`);
      if (seen.has(v)) rep.err(`${coll}: duplicate id ${pyRepr(v)}`);
      seen.add(v);
    });
  }
}

function checkRefs(rep, u) {
  const goals = new Set(idsOf(get(u, "goals")));
  const actors = new Set(idsOf(get(u, "actors")));
  const impacts = new Set(idsOf(get(u, "impacts")));
  for (const a of listOr(get(u, "actors"))) {
    for (const g of listOr(get(a, "goals"))) {
      if (!includes(goals, g)) rep.err(`actors[${pyStr(get(a, "id"))}].goals: unknown goal ${pyRepr(g)}`);
    }
  }
  for (const i of listOr(get(u, "impacts"))) {
    if (!includes(actors, get(i, "actor"))) rep.err(`impacts[${pyStr(get(i, "id"))}].actor: unknown actor ${pyRepr(get(i, "actor"))}`);
    if (!includes(goals, get(i, "goal"))) rep.err(`impacts[${pyStr(get(i, "id"))}].goal: unknown goal ${pyRepr(get(i, "goal"))}`);
  }
  for (const d of listOr(get(u, "deliverables"))) {
    if (!includes(impacts, get(d, "impact"))) rep.err(`deliverables[${pyStr(get(d, "id"))}].impact: unknown impact ${pyRepr(get(d, "impact"))}`);
  }
}

function checkEnvelope(rep, u) {
  if (get(u, "step") !== "understand") rep.err(`step is ${pyRepr(get(u, "step"))}, expected 'understand'`);
  if (get(u, "produced_by") !== "ddd-understand") rep.err(`produced_by is ${pyRepr(get(u, "produced_by"))}, expected 'ddd-understand'`);
  if (!TS_RE.test(pyStr(get(u, "produced_at", "")))) {
    rep.err(`produced_at ${pyRepr(get(u, "produced_at"))} is not YYYY-MM-DDTHH:MM:SSZ (use: date -u +%Y-%m-%dT%H:%M:%SZ)`);
  }
  if (!truthy(get(u, "inputs"))) rep.warn("inputs is empty — list what you actually read (README, docs, conversation notes)");
  if (get(u, "mode") === "auto" && !truthy(get(u, "assumptions"))) {
    rep.warn("auto mode with zero assumptions — every inference a domain expert could overturn belongs in assumptions[]");
  }
  for (const q of listOr(get(u, "open_questions"))) {
    if (truthy(get(q, "blocking"))) rep.note(`blocking question ${pyStr(get(q, "id"))}: ${pyStr(get(q, "text"))} (step must be marked draft, not done)`);
  }
  if (has(u, "deprecated") && !Array.isArray(u.deprecated)) rep.err("deprecated must be a list");
  listOr(get(u, "deprecated")).forEach((d, i) => {
    const missing = DEPRECATED_KEYS.filter((k) => !(isDict(d) && truthy(get(d, k))));
    if (missing.length) rep.warn(`deprecated[${i}] lacks ${missing.join(", ")} — the shape is {id, collection, reason, since} (contract §7)`);
  });
}

function checkSystem(rep, u) {
  const s = dictOr(get(u, "system"));
  const lc = get(s, "lifecycle");
  if (lc === null) rep.warn("system.lifecycle missing — record greenfield | brownfield | rewrite");
  else if (!LIFECYCLES.includes(lc)) rep.err(`system.lifecycle=${pyRepr(lc)} not in ${listRepr(LIFECYCLES)}`);
  if ((lc === "brownfield" || lc === "rewrite") && !truthy(get(u, "existing_systems"))) {
    rep.warn(`lifecycle is ${lc} but existing_systems is empty — name the systems being kept, replaced or integrated`);
  }
  if (!truthy(get(s, "why_now"))) rep.warn("system.why_now empty — say what changed (or that nothing did)");
  const actors = listOr(get(u, "actors")).filter(isDict);
  for (const a of actors) {
    if (has(a, "role") && !ROLES.includes(get(a, "role"))) {
      rep.err(`actors[${pyStr(get(a, "id"))}].role=${pyRepr(get(a, "role"))} not in ${listRepr(ROLES)}`);
    }
  }
  if (actors.length) {
    const role = get(actors[0], "role");
    if (!(role === null || role === "primary")) {
      rep.warn(`first actor ${pyStr(get(actors[0], "id"))} has role ${pyRepr(role)} — the first actor listed is the primary one`);
    }
  }
}

// notes_for_downstream[] — the only channel to later steps besides the step's own keys (contract §3).
function checkNotes(rep, u) {
  if (!has(u, "notes_for_downstream")) {
    rep.note("no notes_for_downstream — fine only if nothing a later step depends on lacks a field of its own (Method → Pass on)");
    return;
  }
  const notes = u.notes_for_downstream;
  if (!Array.isArray(notes)) {
    rep.err("notes_for_downstream must be a list of {id, text, for, kind} (contract §3)");
    return;
  }
  notes.forEach((n, i) => {
    if (!isDict(n)) return; // check_ids already reported it
    const nid = truthy(get(n, "id")) ? get(n, "id") : `[${i}]`;
    if (!(isStr(get(n, "text")) && strip(n.text))) rep.err(`note ${pyStr(nid)}: empty text — say what the later step must know`);
    let fr = get(n, "for");
    if (!Array.isArray(fr) || !fr.length) {
      rep.err(`note ${pyStr(nid)}: 'for' must be a non-empty list of step names — a note addressed to nobody never travels`);
      fr = [];
    } else {
      const bad = fr.filter((x) => !DOWNSTREAM_STEPS.includes(x));
      if (bad.length) {
        rep.err(`note ${pyStr(nid)}: unknown step(s) in 'for': ${listRepr(bad)} — use bare names from ${listRepr(DOWNSTREAM_STEPS)} ('discover', not 'ddd-discover')`);
      }
    }
    const kind = get(n, "kind");
    if (kind === null) rep.warn(`note ${pyStr(nid)}: no kind — set language|boundary|process|risk|decision|other`);
    else if (!NOTE_KINDS.includes(kind)) rep.err(`note ${pyStr(nid)}: kind=${pyRepr(kind)} not in ${listRepr(NOTE_KINDS)}`);
    rep.note(`note ${pyStr(nid)} → ${join(fr, ", ") || "?"} (${truthy(kind) ? pyStr(kind) : "other"}): ${pyStr(get(n, "text"))}`);
  });
  if (!notes.length) {
    rep.note("notes_for_downstream is empty — fine only if nothing a later step depends on lacks a field of its own (Method → Pass on)");
  }
}

// alternatives[] — what each actor uses instead of us today; strategize scores differentiation against it.
function checkAlternatives(rep, u) {
  const actors = new Set(idsOf(get(u, "actors")));
  const caps = new Set(idsOf(get(u, "capabilities")));
  if (!has(u, "alternatives")) {
    rep.warn("alternatives missing — write [] explicitly when people truly use nothing instead (and say so in an assumption);" +
      " strategize scores differentiation against what each actor uses today");
    return;
  }
  const alts = u.alternatives;
  if (!Array.isArray(alts)) {
    rep.err("alternatives must be a list of {id, name, kind, used_by, strengths, weaknesses, capabilities}");
    return;
  }
  if (!alts.length) {
    const texts = listOr(get(u, "assumptions")).filter(isDict).map((a) => pyStr(get(a, "text", ""))).join(" ");
    if (!/alternativ|instead of|nothing today|do.nothing|competitor|incumbent/i.test(texts)) {
      rep.warn("alternatives is [] but no assumption says people use nothing instead — 'do-nothing' is itself an alternative; record it or the assumption");
    }
    return;
  }
  alts.forEach((a, i) => {
    if (!isDict(a)) return; // check_ids already reported it
    const aid = truthy(get(a, "id")) ? pyStr(get(a, "id")) : `[${i}]`;
    if (!(isStr(get(a, "name")) && strip(a.name))) rep.err(`alternative ${aid}: no name — what do people call it?`);
    const kind = get(a, "kind");
    if (!ALT_KINDS.includes(kind)) rep.err(`alternative ${aid}: kind=${pyRepr(kind)} not in ${listRepr(ALT_KINDS)}`);
    let usedBy = get(a, "used_by");
    if (!Array.isArray(usedBy) || !usedBy.length) {
      rep.warn(`alternative ${aid}: used_by empty — which actor lives with it today?`);
      usedBy = [];
    }
    for (const x of usedBy) if (!includes(actors, x)) rep.err(`alternative ${aid}.used_by: unknown actor ${pyRepr(x)}`);
    for (const f of ["strengths", "weaknesses"]) {
      if (!(isStr(get(a, f)) && strip(a[f]))) rep.warn(`alternative ${aid}: ${f} empty — strategize needs both sides to score differentiation`);
    }
    let cps = get(a, "capabilities");
    if (!Array.isArray(cps) || !cps.length) {
      rep.warn(`alternative ${aid}: competes with no capability — name the cap-… it does instead of us, or drop it`);
      cps = [];
    }
    for (const c of cps) if (!includes(caps, c)) rep.err(`alternative ${aid}.capabilities: unknown capability ${pyRepr(c)}`);
    rep.note(`alternative ${aid} (${pyStr(kind)}) used by ${join(usedBy, ", ") || "?"} competes with ${join(cps, ", ") || "—"}`);
  });
}

// Value-proposition strings compare after trimming whitespace, case and a trailing "(assumed)".
// (casefold() is approximated by toLowerCase(); they differ only for letters such as ß.)
function vpKey(s) {
  return strip(pyStr(s).replace(ASSUMED_SUFFIX, "")).toLowerCase();
}

// business_model.value_proposition_links[] — the capability each proposition rests on and the alternative it beats.
function checkVpLinks(rep, u) {
  const bm = dictOr(get(u, "business_model"));
  const vps = listOr(get(bm, "value_propositions")).filter(isStr);
  const caps = new Set(idsOf(get(u, "capabilities")));
  const alts = new Set(idsOf(get(u, "alternatives")));
  const links = get(bm, "value_proposition_links");
  if (links === null) {
    if (vps.length) {
      rep.warn("business_model.value_proposition_links missing — one line per value proposition:" +
        " {value_proposition: <the string>, capabilities: [cap-…], beats: [alt-…]}");
    }
    return;
  }
  if (!Array.isArray(links)) {
    rep.err("business_model.value_proposition_links must be a list of {value_proposition, capabilities, beats}");
    return;
  }
  const known = new Map();
  for (const v of vps) known.set(vpKey(v), v); // a later duplicate wins, as a dict comprehension does
  const linked = new Set();
  const backed = new Set();
  links.forEach((l, i) => {
    if (!isDict(l)) { rep.err(`value_proposition_links[${i}]: not an object`); return; }
    const vp = get(l, "value_proposition");
    let label = `value_proposition_links[${i}]`;
    if (known.has(vpKey(vp))) {
      linked.add(vpKey(vp));
      label = `link '${known.get(vpKey(vp))}'`;
    } else {
      rep.err(`${label}: ${pyRepr(vp)} is not one of business_model.value_propositions — copy the canvas string verbatim`);
    }
    let cps = get(l, "capabilities");
    if (!Array.isArray(cps) || !cps.length) {
      rep.warn(`${label}: links to no capability — strategize cannot see what this proposition rests on`);
      cps = [];
    }
    for (const c of cps) {
      if (includes(caps, c)) backed.add(c);
      else rep.err(`${label}.capabilities: unknown capability ${pyRepr(c)}`);
    }
    const beats = get(l, "beats");
    if (!Array.isArray(beats) || !beats.length) rep.note(`${label}: beats nothing — fine when no alternative competes here`);
    for (const b of Array.isArray(beats) ? beats : []) {
      if (!includes(alts, b)) rep.note(`${label}.beats: ${pyRepr(b)} is not an alternatives[] id`);
    }
  });
  for (const [k, v] of known) {
    if (!linked.has(k)) rep.warn(`value proposition '${v}' has no value_proposition_links entry — which capability does it rest on?`);
  }
  // A capability an alternative competes with, that no proposition rests on: strategize
  // should hear whether the alternative wins.
  const contested = new Map();
  for (const a of listOr(get(u, "alternatives"))) {
    if (!isDict(a)) continue;
    for (const c of listOr(get(a, "capabilities"))) {
      if (includes(caps, c)) {
        if (!contested.has(c)) contested.set(c, []);
        contested.get(c).push(get(a, "id"));
      }
    }
  }
  const told = listOr(get(u, "notes_for_downstream"))
    .filter((n) => isDict(n) && listOr(get(n, "for")).includes("strategize"))
    .map((n) => pyStr(get(n, "text", ""))).join(" ");
  for (const [c, who] of contested) {
    if (!backed.has(c) && !inText(pyStr(c), told)) {
      rep.note(`capability ${pyStr(c)} is contested by ${join(who, ", ")} and no value proposition rests on it` +
        " — if the alternative wins, say so in a notes_for_downstream entry for strategize (\"…do not build\")");
    }
  }
}

function checkMethod(rep, u) {
  const depth = get(u, "depth", "standard");
  const goals = listOr(get(u, "goals"));
  for (const g of goals) {
    if (!truthy(get(g, "metric")) || !truthy(get(g, "target"))) {
      rep.warn(`goal ${pyStr(get(g, "id"))} has no metric/target — a goal without a measure is a wish`);
    }
  }
  const impactedGoals = new Set(listOr(get(u, "impacts")).map((i) => get(i, "goal")));
  for (const g of goals) {
    if (!impactedGoals.has(get(g, "id"))) rep.warn(`goal ${pyStr(get(g, "id"))} has no impacts — a 'why' with no 'how'`);
  }
  const impactedActors = new Set(listOr(get(u, "impacts")).map((i) => get(i, "actor")));
  const people = listOr(get(u, "actors")).filter((a) =>
    ["person", "organisation"].includes(get(a, "kind")) && get(a, "role") !== "off-stage"); // off-stage may have none
  const toCheck = depth === "light" ? people.slice(0, 1) : people;
  for (const a of toCheck) {
    if (!impactedActors.has(get(a, "id"))) {
      rep.warn(`actor ${pyStr(get(a, "id"))} has no impact — whose behaviour changes? give it one, mark it role: off-stage, or record it as a constraint`);
    }
  }
  for (const i of listOr(get(u, "impacts"))) {
    if (DELIVERABLE_VERBS.test(pyStr(get(i, "change", "")))) {
      rep.warn(`impact ${pyStr(get(i, "id"))} '${pyStr(get(i, "change"))}' reads like a deliverable — phrase it as a behaviour change of ${pyStr(get(i, "actor"))}`);
    }
  }
  for (const d of listOr(get(u, "deliverables"))) {
    const desc = get(d, "description", "");
    if (get(d, "priority") === "must" && SOLUTION_WORDS.test(pyStr(desc)) && [...pyStr(desc)].length > 120) {
      rep.warn(`deliverable ${pyStr(get(d, "id"))} is long and technical — deliverables are the smallest thing that could cause the impact`);
    }
  }
  const caps = listOr(get(u, "capabilities"));
  const [lo, hi] = has(DEPTH_CAPS, depth) ? DEPTH_CAPS[depth] : [3, 30];
  if (!(lo <= caps.length && caps.length <= hi)) {
    rep.warn(`${caps.length} capabilities at depth ${pyStr(depth)}; expected ${lo}–${hi} (merge or split, or change depth)`);
  }
  for (const c of caps) {
    if (!truthy(get(c, "evolution"))) rep.warn(`capability ${pyStr(get(c, "id"))} has no evolution stage — strategize needs it (genesis|custom|product|commodity)`);
    if (!truthy(get(c, "description"))) rep.warn(`capability ${pyStr(get(c, "id"))} has no description — decompose uses it to form subdomains`);
    if (SOLUTION_WORDS.test(pyStr(get(c, "name", "")))) {
      rep.warn(`capability '${pyStr(get(c, "name"))}' names a solution, not what the business does — rename as a noun phrase`);
    }
  }
  if (!has(u, "existing_systems")) rep.warn("existing_systems missing — write [] explicitly when there are none");
  if (!truthy(get(u, "non_goals"))) rep.warn("non_goals empty — name at least one thing this system will not do");
  if (!truthy(get(u, "constraints"))) rep.warn("constraints empty — regulatory, technical, organisational, budget or timeline; there is always one");
  const st = dictOr(get(u, "scale_target"));
  const loD = get(st, "deployables_min");
  const hiD = get(st, "deployables_max");
  if (isInt(loD) && isInt(hiD)) {
    if (Number(loD) < 1 || Number(hiD) < Number(loD)) rep.err(`scale_target: need 1 <= deployables_min <= deployables_max (got ${pyStr(loD)}, ${pyStr(hiD)})`);
  }
  if (get(st, "teams") === null) rep.warn("scale_target.teams missing — organise needs a team count");
}

function checkManifest(rep, u, dddDir) {
  const mp = path.join(dddDir, "manifest.json");
  if (!fs.existsSync(mp)) {
    rep.err("manifest.json missing — run ddd init from the project root first");
    return;
  }
  let m;
  try {
    m = JSON.parse(fs.readFileSync(mp, "utf8"));
  } catch (e) {
    rep.err(`manifest.json invalid JSON: ${e.message}`);
    return;
  }
  const st = dictOr(get(u, "scale_target"));
  const mt = dictOr(get(m, "scale_target"));
  const diff = ["deployables_min", "deployables_max", "teams"].filter((k) => !pyEqual(get(st, k), get(mt, k)));
  if (diff.length) {
    const rel = path.basename(dddDir);
    rep.warn("manifest.scale_target differs from understand.json on " + diff.join(", ") +
      ` — sync with: cd <project-root> && node \${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir ${rel}` +
      ` --from-understand ${rel}/01-understand/understand.json`);
  }
  if (!pyEqual(get(m, "depth"), get(u, "depth"))) rep.warn(`manifest.depth=${pyRepr(get(m, "depth"))} but understand.json depth=${pyRepr(get(u, "depth"))}`);
  if (inText("..", pyStr(get(m, "ddd_dir", "")))) {
    rep.warn(`manifest.ddd_dir=${pyRepr(get(m, "ddd_dir"))} — ddd init was run from the wrong cwd; re-run it from the project root with --dir ddd`);
  }
}

// Python `!=` on the scalars the manifest holds (numbers, strings, null, bools).
function pyEqual(a, b) {
  const numLike = (v) => typeof v === "number" || typeof v === "boolean";
  if (numLike(a) && numLike(b)) return Number(a) === Number(b);
  if (typeof a !== typeof b) return false;
  if (a === null || typeof a !== "object") return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

function checkInputsExist(rep, u, dddDir) {
  const root = path.dirname(dddDir.replace(/\/+$/, ""));
  for (const p of listOr(get(u, "inputs"))) {
    const s = pyStr(p);
    if (s.includes(" ") || s.includes("(")) continue; // free-text input such as "conversation notes (2026-08-29)"
    if (!fs.existsSync(path.join(root, s)) && !fs.existsSync(s)) {
      rep.warn(`inputs: '${s}' not found under ${root} — list real paths relative to the project root`);
    }
  }
}

function checkMarkdown(rep, u, mdPath) {
  if (!fs.existsSync(mdPath)) {
    rep.err(`${mdPath} missing — the human artifact is required`);
    return;
  }
  const text = fs.readFileSync(mdPath, "utf8");
  const h2 = [...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => strip(m[1].replace(/^\s*\d+[.)]?\s*/, "")).toLowerCase());
  for (const h of H2_REQUIRED) {
    if (!h2.includes(h.toLowerCase())) rep.warn(`understand.md: missing H2 '## ${h}' (see references/understand-template.md)`);
  }
  const missing = [];
  for (const coll of ["goals", "impacts", "deliverables", "capabilities", "alternatives", "constraints", "assumptions", "open_questions", "notes_for_downstream"]) {
    for (const i of idsOf(get(u, coll))) {
      if (truthy(i) && !new RegExp(`(?<![\\w-])${escapeRe(pyStr(i))}(?![\\w-])`).test(text)) missing.push(i);
    }
  }
  if (missing.length) {
    rep.warn("understand.md does not mention ids: " + join(missing.slice(0, 12), ", ") + (missing.length > 12 ? " …" : "") +
      " — put ids in the tables so readers can move between md and json");
  }
  if (truthy(get(u, "alternatives")) && !ALT_TABLE_HEADING.test(text)) {
    rep.warn("understand.md: no '### 8a. Alternatives today' table — render alternatives[] from the JSON (see references/understand-template.md)");
  }
  if (truthy(get(dictOr(get(u, "business_model")), "value_proposition_links")) && !VP_TABLE_HEADING.test(text)) {
    rep.warn("understand.md: no '### 2b. Value proposition → capability → beats' table — render value_proposition_links[] from the JSON");
  }
  // A notes section in the Markdown whose items are not in the JSON never reaches the next step.
  let items = 0;
  const titles = [];
  for (const m of text.matchAll(NOTES_HEADING)) {
    const level = m[1].length;
    const title = strip(m[2]);
    const body = text.slice(m.index + m[0].length);
    const nxt = new RegExp(`^#{1,${level}}\\s`, "m").exec(body);
    const found = mdItems(nxt ? body.slice(0, nxt.index) : body).filter((x) => !isPlaceholder(x));
    if (found.length) { items += found.length; titles.push(title); }
  }
  const notes = listOr(get(u, "notes_for_downstream"));
  if (items && !notes.length) {
    rep.warn(`understand.md '${titles.join("; ")}' lists ${items} item(s) but understand.json has no notes_for_downstream` +
      " — prose does not reach ddd-discover; write each as {id: N<n>, text, for: [steps], kind} in the JSON and render the table from it");
  } else if (items > notes.length) {
    rep.warn(`understand.md '${titles.join("; ")}' lists ${items} item(s) but the JSON has ${notes.length} note(s)` +
      " — the Markdown mirrors the JSON; add the missing ones to notes_for_downstream[]");
  }
}

// Bullets, numbered items and table data rows (header and separator rows excluded) in a Markdown section.
function mdItems(body) {
  const items = [];
  let inTable = false;
  for (const line of splitlines(body)) {
    const s = strip(line);
    if (s.startsWith("|")) {
      if (/^\|?\s*:?-{2,}/.test(s)) continue; // separator row
      if (!inTable) { inTable = true; continue; } // header row
      items.push(s);
    } else {
      inTable = false;
      const m = /^(?:[-*+]|\d+[.)])\s+(\S.*)$/.exec(s);
      if (m) items.push(m[1]);
    }
  }
  return items;
}

// True when every non-empty cell of a bullet or table row is a placeholder such as "none".
function isPlaceholder(item) {
  const cells = item.replace(/^\|+|\|+$/g, "").split("|").map(strip).filter(Boolean);
  return cells.length > 0 && cells.every((c) => PLACEHOLDER.test(c));
}

// ---------------------------------------------------------------------------
// CLI: `[<ddd-dir>] [--json]`, the argparse surface of the Python.
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { dddDir: "ddd", json: false };
  let positional = 0;
  let onlyPositional = false;
  for (const x of argv) {
    if (!onlyPositional && x === "--") { onlyPositional = true; continue; }
    if (!onlyPositional && x.startsWith("-") && x.length > 1) {
      if (x === "-h" || x === "--help") return { help: true };
      if ("--json".startsWith(x) && x.length >= 3) { a.json = true; continue; }
      throw new Error(`unrecognized arguments: ${x}`);
    }
    if (positional++ > 0) throw new Error(`unrecognized arguments: ${x}`);
    a.dddDir = x;
  }
  return a;
}

export async function main(argv) {
  const out = (s) => process.stdout.write(s);
  const err = (s) => process.stderr.write(s);
  let a;
  try {
    a = parseArgs(argv);
  } catch (e) {
    err(`${USAGE}\nddd understand lint: error: ${e.message}\n`);
    return 2;
  }
  if (a.help) {
    out(`${USAGE}\n\n  <ddd-dir>   workspace folder (default ./ddd); understand.json is read from\n              <ddd-dir>/01-understand/\n  --json      machine-readable report\n`);
    return 0;
  }
  const dddDir = path.resolve(a.dddDir);
  const jp = path.join(dddDir, "01-understand", "understand.json");
  const mp = path.join(dddDir, "01-understand", "understand.md");
  const rep = new Report();
  if (!fs.existsSync(jp)) {
    err(`error: ${jp} not found\n`);
    return 2;
  }
  let u;
  try {
    u = JSON.parse(fs.readFileSync(jp, "utf8"));
  } catch (e) {
    err(`error: ${jp} invalid JSON: ${e.message}\n`);
    return 2;
  }
  for (const fn of [checkEnvelope, checkIds, checkRefs, checkSystem, checkNotes, checkAlternatives, checkVpLinks, checkMethod]) fn(rep, u);
  checkManifest(rep, u, dddDir);
  checkInputsExist(rep, u, dddDir);
  checkMarkdown(rep, u, mp);
  const ok = rep.errors.length === 0;
  if (a.json) {
    out(pyDumps({ ok, errors: rep.errors, warnings: rep.warnings, info: rep.info }, { indent: 2 }) + "\n");
    return ok ? 0 : 1;
  }
  const lines = [`lint: ${jp}`];
  for (const m of rep.errors) lines.push(`  [error] ${m}`);
  for (const m of rep.warnings) lines.push(`  [warn]  ${m}`);
  for (const m of rep.info) lines.push(`  (info)  ${m}`);
  lines.push(`${rep.errors.length} error(s), ${rep.warnings.length} warning(s)`);
  lines.push("RESULT: " + (ok ? "OK" : "FAIL"));
  out(lines.join("\n") + "\n");
  return ok ? 0 : 1;
}

export default main;
