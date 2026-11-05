// Working sheets for ddd-strategize: one per subdomain, listing every deterministic signal in
// decompose.json, understand.json and discover.json that feeds a score, a type, an evolution
// stage or a sourcing call. Signals only: the scores and the classification are the modeller's job.
//
// Usage (via the CLI):
//   ddd strategize worksheet <ddd-dir> [--json]
//
// Header: project, mode, depth, scale target (`teams` caps the decisive cores), the core cap
// max(2, n // 2), value propositions, goals, existing systems (`will: replace` = the alternative
// the customer has today), `alternatives` when understand carries them, regulatory constraints and
// every upstream notes_for_downstream addressed to strategize.
// Per subdomain: hosting context(s) with co-hosted subdomains, `wraps` and the ISH verdict;
// capabilities with their Wardley evolution and the least-evolved stage; events (pivotal marked)
// and commands; policies on its events; hotspots near its events/commands; aggregate candidates;
// the goals, impacts and deliverables that name it (structural links first, then text mentions);
// existing/external systems it touches; constraints that mention it.
//
// Ported statement for statement from worksheet.py. One deliberate difference: the Python built
// `cap_rows` by iterating a set, so their order followed CPython's string hash (pinned by
// PYTHONHASHSEED=0 in the goldens). Node cannot reproduce that hash, so capabilities are listed in
// code-point order, which is what the recorded goldens happen to show.
//
// Exit 0 = ok, 2 = missing/invalid input or usage.
import fs from "node:fs";
import path from "node:path";
import { pyDumps, pyStr } from "../../../shared/lib/jsonschema.mjs";

const HELP = `usage: ddd strategize worksheet [-h] [--json] ddd_dir

Working sheets for ddd-strategize: one per subdomain, listing every deterministic signal in
decompose.json, understand.json and discover.json that feeds a score, a type, an evolution stage or
a sourcing call. Signals only — the scores and the classification are the modeller's job.

Usage:
  ddd strategize worksheet <ddd-dir> [--json]

Header: project, mode, depth, scale target (\`teams\` caps the decisive cores), the core cap
max(2, n // 2), value propositions, goals, existing systems (\`will: replace\` = the alternative the
customer has today), \`alternatives\` when understand carries them, regulatory constraints and every
upstream notes_for_downstream addressed to strategize.
Per subdomain: hosting context(s) with co-hosted subdomains, \`wraps\` and the ISH verdict; capabilities
with their Wardley evolution and the least-evolved stage; events (pivotal marked) and commands;
policies on its events; hotspots near its events/commands; aggregate candidates; the goals, impacts
and deliverables that name it (structural \`capabilities\`/\`subdomain\` links first, then text mentions);
existing/external systems it touches; constraints that mention it.

Zero dependencies. Exit 0 = ok, 2 = missing/invalid input.

positional arguments:
  ddd_dir

options:
  -h, --help  show this help message and exit
  --json
`;
// argparse's usage line(s), for the usage-error path.
const USAGE = HELP.split("\n\n")[0];

const EVO = ["genesis", "custom", "product", "commodity"];
const STOP = new Set(["management", "system", "systems", "service", "services", "process", "with", "from", "that", "this", "into", "their",
  "when", "then", "over", "under", "about", "after", "before", "data", "every", "each", "must", "should", "could"]);

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
const intersects = (a, b) => [...a].some((x) => b.has(x));

function load(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function byId(items) {
  const m = new Map();
  for (const x of list(items)) {
    if (isDict(x) && get(x, "id") !== null) m.set(get(x, "id"), x);
  }
  return m;
}

// {t for x in texts if x for t in re.findall(r"[a-z]{4,}", str(x).lower())} - STOP
function toks(...texts) {
  const s = new Set();
  for (const x of texts) {
    if (!truthy(x)) continue;
    for (const t of pyStr(x).toLowerCase().match(/[a-z]{4,}/g) ?? []) if (!STOP.has(t)) s.add(t);
  }
  return s;
}

function parseArgs(argv) {
  const flags = ["--json"];
  const res = { json: false, dir: null };
  let onlyPositional = false;
  const positional = [];
  for (const a of argv) {
    if (!onlyPositional && a === "--") { onlyPositional = true; continue; }
    if (!onlyPositional && a.startsWith("-") && a.length > 1) {
      if (a === "-h" || a === "--help") return { help: true };
      const name = a.includes("=") ? a.slice(0, a.indexOf("=")) : a;
      const matches = flags.filter((f) => f.startsWith(name));
      if (matches.length !== 1) throw new UsageError(`unrecognized arguments: ${a}`);
      if (a.includes("=")) throw new UsageError(`argument ${matches[0]}: ignored explicit argument '${a.slice(a.indexOf("=") + 1)}'`);
      res[matches[0].slice(2)] = true;
      continue;
    }
    positional.push(a);
  }
  if (positional.length === 0) throw new UsageError("the following arguments are required: ddd_dir");
  if (positional.length > 1) throw new UsageError(`unrecognized arguments: ${positional.slice(1).join(" ")}`);
  res.dir = positional[0];
  return res;
}

class UsageError extends Error {}

export function main(argv) {
  let a;
  try {
    a = parseArgs(argv);
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    err(`${USAGE}\nddd strategize worksheet: error: ${e.message}`);
    return 2;
  }
  if (a.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const ddd = path.resolve(a.dir);
  const dpath = path.join(ddd, "03-decompose", "decompose.json");
  if (!fs.existsSync(dpath)) {
    err(`error: ${dpath} not found — run ddd-decompose first (or bootstrap per modes.md §0)`);
    return 2;
  }
  let dc;
  try {
    dc = load(dpath);
  } catch (e) {
    err(`error: invalid JSON in ${dpath}: ${e.message}`);
    return 2;
  }
  const opt = (rel) => (fs.existsSync(path.join(ddd, rel)) ? load(path.join(ddd, rel)) : {});
  let u;
  let d;
  let m;
  try {
    u = opt("01-understand/understand.json");
    d = opt("02-discover/discover.json");
    m = opt("manifest.json");
  } catch (e) {
    err(`error: ${e.message}`);
    return 2;
  }

  const subs = list(get(dc, "subdomains", []));
  const ctxs = list(get(dc, "bounded_contexts", []));
  const caps = byId(get(u, "capabilities"));
  const goals = byId(get(u, "goals"));
  const impacts = byId(get(u, "impacts"));
  const dels = list(get(u, "deliverables", []));
  const events = byId(get(d, "events"));
  const commands = byId(get(d, "commands"));
  const pivotal = new Set(list(get(d, "pivotal_events", [])));
  for (const [e, ev] of events) if (truthy(get(ev, "pivotal"))) pivotal.add(e);
  const ext = byId(get(d, "external_systems"));
  const existing = list(get(u, "existing_systems", []));
  const constraints = list(get(u, "constraints", []));
  const scale = or(get(m, "scale_target"), or(get(u, "scale_target"), {}));
  const n = subs.length;
  const result = {
    ddd_dir: ddd,
    project: or(get(m, "project"), get(or(get(u, "system"), {}), "name")),
    mode: get(m, "mode"),
    depth: get(m, "depth"),
    scale_target: scale,
    teams: get(scale, "teams"),
    subdomain_count: n,
    core_cap: Math.max(2, Math.floor(n / 2)),
    value_propositions: get(or(get(u, "business_model"), {}), "value_propositions", []),
    goals: [...goals.values()].map((g) => ({ id: get(g, "id"), statement: get(g, "statement"), metric: get(g, "metric"), target: get(g, "target"), horizon: get(g, "horizon") })),
    existing_systems: existing.map((s) => ({ name: get(s, "name"), role: get(s, "role"), will: get(s, "will"), alternative_today: get(s, "will") === "replace" })),
    alternatives: get(u, "alternatives"),
    regulatory_constraints: constraints.filter((c) => get(c, "kind") === "regulatory").map((c) => ({ id: get(c, "id"), text: get(c, "text") })),
    upstream_notes: [],
    subdomains: [],
  };
  for (const [step, art] of [["understand", u], ["discover", d], ["decompose", dc]]) {
    for (const x of list(or(get(art, "notes_for_downstream", []), []))) {
      if (list(or(get(x, "for"), [])).includes("strategize")) {
        result.upstream_notes.push({ from: step, id: get(x, "id"), kind: get(x, "kind", "other"), text: get(x, "text") });
      }
    }
  }

  for (const s of subs) {
    const sid = get(s, "id");
    const sev = list(or(get(s, "events", []), []));
    const scm = list(or(get(s, "commands", []), []));
    const sevSet = new Set(sev);
    const scmSet = new Set(scm);
    const capset = new Set(list(or(get(s, "capabilities", []), [])));
    const hosts = ctxs.filter((c) => list(get(c, "subdomains", [])).includes(sid)).map((c) => ({
      id: get(c, "id"),
      co_hosted: list(get(c, "subdomains", [])).filter((x) => x !== sid),
      wraps: or(get(c, "wraps", []), []),
      ish_verdict: get(or(get(c, "independent_service_check"), {}), "verdict"),
    }));
    const capRows = sorted(capset).map((cid) => ({ id: cid, name: get(or(caps.get(cid), {}), "name"), evolution: get(or(caps.get(cid), {}), "evolution"), known: caps.has(cid) }));
    const stages = capRows.map((r) => r.evolution).filter((e) => EVO.includes(e));
    const words = toks(sid, get(s, "name"), ...capRows.map((r) => r.name));
    const linked = (item) => intersects(capset, new Set(list(or(get(item, "capabilities"), [])))) || capset.has(get(item, "capability")) || get(item, "subdomain") === sid;
    const mentions = (...texts) => intersects(words, toks(...texts));
    const impHits = [...impacts.values()].filter((i) => linked(i) || mentions(get(i, "change")))
      .map((i) => ({ id: get(i, "id"), goal: get(i, "goal"), how: linked(i) ? "link" : "mention", change: get(i, "change") }));
    const delHits = dels.filter((x) => linked(x) || mentions(get(x, "description")))
      .map((x) => ({ id: get(x, "id"), priority: get(x, "priority"), impact: get(x, "impact"), goal: get(or(impacts.get(get(x, "impact")), {}), "goal"),
        how: linked(x) ? "link" : "mention", description: get(x, "description") }));
    const goalHits = {};
    for (const h of [...impHits, ...delHits]) {
      if (goals.has(h.goal)) (goalHits[h.goal] ??= []).push(`${pyStr(h.id)} ${h.how}`);
    }
    for (const g of goals.values()) {
      if (linked(g) || mentions(get(g, "statement"), get(g, "metric"))) (goalHits[g.id] ??= []).push(linked(g) ? "link" : "statement mention");
    }
    const actors = new Set(sev.map((e) => get(or(events.get(e), {}), "actor")));
    let sysHits = sorted([...actors].filter((x) => ext.has(x))).map((x) => ({ name: or(get(ext.get(x), "name"), x), via: "event actor", will: null }));
    for (const h of hosts) for (const w of list(h.wraps)) sysHits.push({ name: or(get(or(ext.get(w), {}), "name"), w), via: "context wraps", will: null });
    sysHits = sysHits.concat(existing.filter((x) => mentions(get(x, "name"), get(x, "role"))).map((x) => ({ name: get(x, "name"), via: "mention", will: get(x, "will") })));
    const seen = new Set();
    const systems = [];
    for (const x of sysHits) {
      if (seen.has(x.name)) continue;
      seen.add(x.name);
      // next((e.get("will") for e in existing if e.get("name") == x["name"]), None)
      const match = existing.find((e) => get(e, "name") === x.name);
      x.will = or(x.will, match ? get(match, "will") : null);
      systems.push(x);
    }
    result.subdomains.push({
      id: sid, name: get(s, "name"), description: get(s, "description"), contexts: hosts,
      capabilities: capRows,
      least_evolved: stages.length ? stages.reduce((best, e) => (EVO.indexOf(e) < EVO.indexOf(best) ? e : best)) : null,
      events: sev.map((e) => ({ id: e, pivotal: pivotal.has(e), known: events.has(e) })),
      commands: scm,
      policies_on_its_events: list(get(d, "policies", [])).filter((p) => sevSet.has(get(p, "when")))
        .map((p) => ({ id: get(p, "id"), when: get(p, "when"), then: get(p, "then", []), kind: get(p, "kind") })),
      hotspots_near: list(get(d, "hotspots", [])).filter((h) => sevSet.has(get(h, "near")) || scmSet.has(get(h, "near")))
        .map((h) => ({ id: get(h, "id"), kind: get(h, "kind"), near: get(h, "near"), text: get(h, "text") })),
      aggregate_candidates: list(get(d, "aggregate_candidates", []))
        .filter((g) => intersects(new Set(list(get(g, "handles", []))), scmSet) || intersects(new Set(list(get(g, "emits", []))), sevSet))
        .map((g) => ({ id: get(g, "id"), handles: get(g, "handles", []), emits: get(g, "emits", []) })),
      goals: goalHits, impacts: impHits, deliverables: delHits, systems,
      constraints_mentioning: constraints.filter((c) => mentions(get(c, "text"))).map((c) => ({ id: get(c, "id"), kind: get(c, "kind"), text: get(c, "text") })),
    });
  }

  if (a.json) {
    out(pyDumps(result, { indent: 2, ensureAscii: false }));
    return 0;
  }
  const j = (xs) => (xs.length ? xs.join(", ") : "none");
  const teams = result.teams;
  out(`DDD workspace: ${ddd} · project ${pyStr(result.project)} · mode ${pyStr(result.mode)} · depth ${pyStr(result.depth)} · ` +
    `scale ${pyStr(get(scale, "deployables_min", "?"))}–${pyStr(get(scale, "deployables_max", "?"))} deployables / ${teams !== null ? pyStr(teams) : "?"} team(s)`);
  out(`${n} subdomains → core cap max(2, n // 2) = ${result.core_cap}; decisive cores (both scores ≥ 8) should not exceed teams (${teams !== null ? pyStr(teams) : "unknown"})`);
  out(`value propositions: ${j(list(result.value_propositions).map(pyStr))}`);
  out("goals: " + j(result.goals.map((g) => `${pyStr(g.id)} ${pyStr(g.statement)} — ${pyStr(g.metric)} → ${pyStr(g.target)} (${pyStr(g.horizon)})`)));
  out("existing systems: " + j(result.existing_systems.map((s) => `${pyStr(s.name)} (${pyStr(s.role)}; ${pyStr(s.will)}${s.alternative_today ? "; ALTERNATIVE TODAY" : ""})`)));
  if (truthy(result.alternatives)) out(`alternatives (from understand): ${pyDumps(result.alternatives, { ensureAscii: false })}`);
  out("regulatory constraints: " + j(result.regulatory_constraints.map((c) => `${pyStr(c.id)} ${pyStr(c.text)}`)));
  out("upstream notes for strategize: " + j(result.upstream_notes.map((x) => `[${x.from} ${pyStr(x.id)}] (${pyStr(x.kind)}) ${pyStr(x.text)}`)));
  for (const s of result.subdomains) {
    out(`\n== ${pyStr(s.id)} — ${pyStr(or(s.name, s.id))}` + (truthy(s.description) ? `  (${pyStr(s.description)})` : ""));
    out("   context: " + j(s.contexts.map((h) => `${pyStr(h.id)} (ISH ${pyStr(or(h.ish_verdict, "?"))}; co-hosted: ${j(h.co_hosted.map(pyStr))}; wraps: ${j(list(h.wraps).map(pyStr))})`)));
    out("   capabilities: " + j(s.capabilities.map((r) => `${pyStr(r.id)}=${pyStr(or(r.evolution, r.known ? "UNKNOWN" : "NOT IN UNDERSTAND"))}`))
      + ` → least evolved: ${pyStr(or(s.least_evolved, "none — infer from existing systems / description and log it"))}`);
    const piv = s.events.filter((e) => e.pivotal).map((e) => pyStr(e.id));
    out(`   events ${s.events.length} (pivotal: ${j(piv)}) / commands ${s.commands.length}; policies on its events: `
      + j(s.policies_on_its_events.map((p) => `${pyStr(p.id)} (${pyStr(p.when)} → ${list(p.then).map(pyStr).join(", ")})`))
      + "; hotspots near: " + j(s.hotspots_near.map((h) => `${pyStr(h.id)} ${pyStr(h.kind)} @${pyStr(h.near)}: ${pyStr(h.text)}`)));
    out("   aggregate candidates: " + j(s.aggregate_candidates.map((g) => `${pyStr(g.id)} (handles ${list(g.handles).length}, emits ${list(g.emits).length})`)));
    out("   goals: " + (Object.keys(s.goals).length ? j(Object.entries(s.goals).map(([g, v]) => `${g} (${v.join("; ")})`)) : "none — say so in the rationale (goal_ids: [])")
      + "; impacts: " + j(s.impacts.map((i) => `${pyStr(i.id)} ${i.how} "${pyStr(i.change)}"`))
      + "; deliverables: " + j(s.deliverables.map((x) => `${pyStr(x.id)} ${pyStr(x.priority)} ${x.how} "${pyStr(x.description)}"`)));
    out("   systems touched: " + j(s.systems.map((x) => `${pyStr(x.name)} (${x.via}${truthy(x.will) ? "; " + pyStr(x.will) : ""})`))
      + "; constraints mentioning it: " + j(s.constraints_mentioning.map((c) => `${pyStr(c.id)} ${pyStr(c.kind)}: ${pyStr(c.text)}`)));
  }
  return 0;
}

export default main;
