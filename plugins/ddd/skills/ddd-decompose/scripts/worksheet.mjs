// Boundary worksheet for ddd-decompose: every deterministic signal in discover.json (and
// understand.json / manifest.json when present) that helps cut the timeline into subdomains and
// bounded contexts. Signals only: no scoring, no verdicts; those are the modeller's job.
//
// Usage (via the CLI):
//   ddd decompose worksheet <ddd-dir> [--json]
//
// Prints: upstream notes_for_downstream addressed to decompose, scale band, timeline by phase
// (pivotal marked), swimlanes by actor, aggregate candidates, policies that cross phases/actors
// (relationship hints), policy-driven commands (actor null), external/existing systems with the
// evidence for or against a wrapper context (a `clock` actor is a time trigger, not a system),
// capabilities, regulatory constraints, glossary seeds + conflict hotspots, and a coverage
// checklist of every event/command/aggregate id that must be owned by one context.
//
// Ported statement for statement from boundary_worksheet.py: the goldens compare stdout byte for
// byte, so every list is printed as Python's repr (`['a', 'b']`), every `None` as `None`, and
// `--json` keeps json.dumps' default ensure_ascii=True. Python-era wording stays verbatim until
// leaf 1.4.1 rewords code and goldens together.
//
// Exit 0 = ok, 2 = missing/invalid input or usage.
import fs from "node:fs";
import path from "node:path";
import { pyDumps, pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";

const HELP = `usage: ddd decompose worksheet [-h] [--json] ddd_dir

Boundary worksheet for ddd-decompose: every deterministic signal in discover.json (and
understand.json / manifest.json when present) that helps cut the timeline into subdomains and
bounded contexts. Signals only — no scoring, no verdicts; those are the modeller's job.

Usage:
  ddd decompose worksheet <ddd-dir> [--json]

Prints: upstream notes_for_downstream addressed to decompose, scale band, timeline by phase (pivotal
marked), swimlanes by actor, aggregate candidates, policies that cross phases/actors (relationship
hints), policy-driven commands (actor null), external/existing systems with the evidence for or
against a wrapper context (a \`clock\` actor is a time trigger, not a system), capabilities, regulatory
constraints, glossary seeds + conflict hotspots, and a coverage checklist of every event/command/
aggregate id that must be owned by one context.

Zero dependencies. Exit 0 = ok, 2 = missing/invalid input.

positional arguments:
  ddd_dir

options:
  -h, --help  show this help message and exit
  --json
`;
// argparse's usage line(s), for the usage-error path.
const USAGE = HELP.split("\n\n")[0];

const out = (s) => process.stdout.write(s + "\n");
const err = (s) => process.stderr.write(s + "\n");

// ---------------------------------------------------------------------------
// Python value helpers. Each script in the chain is standalone by design (no imports
// across skills), so the handful of dict/truthiness helpers is repeated here.
// ---------------------------------------------------------------------------
const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
// dict.get(k, default): the default only when the key is absent; a present null stays null.
const get = (o, k, dflt = null) => (has(o, k) ? (o[k] === undefined ? null : o[k]) : dflt);
// Python truthiness: [] and {} are false, unlike JS.
const truthy = (v) => !(v === null || v === undefined || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && v.length === 0) || (isDict(v) && Object.keys(v).length === 0));
const or = (a, b) => (truthy(a) ? a : b);
const list = (v) => (Array.isArray(v) ? v : []);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (xs, key = (x) => x) => [...xs].sort((a, b) => cmp(key(a), key(b)));
const padR = (v, n) => pyStr(v).padEnd(n);
const padL = (v, n) => pyStr(v).padStart(n);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function load(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// {x.get("id"): x for x in items if dict and id is not None}: a Map keeps insertion order and
// non-string keys the way a dict does; a repeated id keeps its first position, last value.
function byId(items) {
  const m = new Map();
  for (const x of list(items)) {
    if (isDict(x) && get(x, "id") !== null) m.set(get(x, "id"), x);
  }
  return m;
}

// (floor, aim_lo, aim_hi, label) for a manifest scale_target.
function scaleBand(scale) {
  const lo = get(scale || {}, "deployables_min");
  const hi = get(scale || {}, "deployables_max");
  if (hi === null) return [1, 2, 6, "no scale target in manifest — assuming 1–3 deployables"];
  const aim = hi <= 3 ? [2, 6] : hi <= 9 ? [4, 10] : [6, 15];
  return [or(lo, 1), aim[0], aim[1], `deployables ${pyStr(lo)}–${pyStr(hi)}`];
}

// argparse subset: one required positional, store_true flags, unique prefixes, `--`, -h.
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
    err(`${USAGE}\nddd decompose worksheet: error: ${e.message}`);
    return 2;
  }
  if (a.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const ddd = path.resolve(a.dir);

  const dpath = path.join(ddd, "02-discover", "discover.json");
  if (!fs.existsSync(dpath)) {
    err(`error: ${dpath} not found — run ddd-discover first (or bootstrap per modes.md §0)`);
    return 2;
  }
  let d;
  try {
    d = load(dpath);
  } catch (e) {
    err(`error: invalid JSON in ${dpath}: ${e.message}`);
    return 2;
  }
  const upath = path.join(ddd, "01-understand", "understand.json");
  const u = fs.existsSync(upath) ? load(upath) : {};
  const mpath = path.join(ddd, "manifest.json");
  const m = fs.existsSync(mpath) ? load(mpath) : {};

  const events = byId(get(d, "events"));
  const commands = byId(get(d, "commands"));
  const phases = sorted(list(get(d, "phases", [])), (p) => get(p, "order", 0));
  const pivotal = new Set(list(get(d, "pivotal_events", [])));
  const actors = byId(get(d, "actors"));
  const externals = byId(get(d, "external_systems"));
  const scale = or(get(m, "scale_target"), or(get(u, "scale_target"), {}));
  const [floor, aimLo, aimHi, label] = scaleBand(scale);

  // producing command -> event actor fallback (events may omit actor)
  const eventActor = (e) => {
    if (truthy(get(e, "actor"))) return e.actor;
    const c = commands.get(get(e, "triggered_by"));
    return get(c || {}, "actor");
  };
  const eventPhase = (eid) => get(events.get(eid) || {}, "phase");

  const result = {
    ddd_dir: ddd,
    project: or(get(m, "project"), get(or(get(u, "system"), {}), "name")),
    mode: get(m, "mode"),
    depth: get(m, "depth"),
    scale_target: scale,
    context_band: { floor, aim_min: aimLo, aim_max: aimHi, basis: label },
  };

  // 0. upstream notes addressed to this step (contract section 3): read before drafting
  result.upstream_notes = [];
  for (const [step, art] of [["understand", u], ["discover", d]]) {
    for (const n of list(or(get(art, "notes_for_downstream", []), []))) {
      if (list(or(get(n, "for"), [])).includes("decompose")) {
        result.upstream_notes.push({ from: step, id: get(n, "id"), kind: get(n, "kind", "other"), text: get(n, "text") });
      }
    }
  }

  // 1. timeline by phase
  const timeline = [];
  const phaseIds = new Set(phases.map((p) => get(p, "id")));
  for (const p of phases) {
    const evs = sorted([...events.values()].filter((e) => get(e, "phase") === get(p, "id")), (e) => get(e, "sequence", 0));
    timeline.push({
      phase: get(p, "id"),
      name: get(p, "name"),
      events: evs.map((e) => ({ id: e.id, sequence: get(e, "sequence"), actor: eventActor(e), triggered_by: get(e, "triggered_by"), pivotal: pivotal.has(e.id) })),
    });
  }
  const orphanPhase = [...events.values()].filter((e) => !phaseIds.has(get(e, "phase"))).map((e) => e.id);
  result.timeline = timeline;
  result.events_without_known_phase = orphanPhase;

  // 2. swimlanes by actor
  const lanes = {};
  const lane = (k) => (lanes[k] ??= { events: [], commands: [] });
  for (const e of sorted([...events.values()], (e) => get(e, "sequence", 0))) lane(or(eventActor(e), "(none)")).events.push(e.id);
  for (const c of commands.values()) lane(or(get(c, "actor"), "(none)")).commands.push(c.id);
  result.swimlanes = lanes;

  // 3. aggregate candidates
  const aggs = list(get(d, "aggregate_candidates", []));
  const coveredC = new Set(aggs.flatMap((ag) => list(get(ag, "handles", []))));
  const coveredE = new Set(aggs.flatMap((ag) => list(get(ag, "emits", []))));
  result.aggregate_candidates = aggs.map((ag) => ({ id: get(ag, "id"), handles: get(ag, "handles", []), emits: get(ag, "emits", []) }));
  result.not_in_any_aggregate = {
    events: [...events.keys()].filter((e) => !coveredE.has(e)),
    commands: [...commands.keys()].filter((c) => !coveredC.has(c)),
  };

  // 4. policies crossing phases / actors
  const pols = [];
  for (const p of list(get(d, "policies", []))) {
    const w = get(p, "when");
    const wPhase = eventPhase(w);
    const wActor = events.has(w) ? eventActor(events.get(w)) : null;
    const thens = [];
    const crosses = [];
    for (const cid of list(get(p, "then", []))) {
      const c = or(commands.get(cid), {});
      const produced = get(c, "produces", []);
      const known = list(produced).filter((x) => events.has(x));
      const tPhases = sorted(new Set(known.map(eventPhase).filter((x) => x !== null)));
      const tActors = sorted(new Set(known.map((x) => eventActor(events.get(x))).filter((x) => x !== null)));
      thens.push({ command: cid, produces: produced, phases: tPhases, actors: tActors });
      if (tPhases.length && truthy(wPhase) && tPhases.some((tp) => tp !== wPhase)) crosses.push("phase");
      if (tActors.length && truthy(wActor) && tActors.some((ta) => ta !== wActor)) crosses.push("actor");
    }
    pols.push({
      id: get(p, "id"), kind: get(p, "kind"), when: w, when_phase: wPhase, when_actor: wActor,
      then: thens, crosses: sorted(new Set(crosses)),
      hint: crosses.length
        ? "relationship candidate: owner of the 'when' event is UPSTREAM of the owner of the 'then' command"
        : "no phase/actor change — check against your contexts (it can still cross a context boundary)",
    });
  }
  result.policies = pols;

  // 5. commands with no actor
  result.commands_without_actor = [...commands.values()].filter((c) => !truthy(get(c, "actor"))).map((c) => ({
    id: c.id, produces: get(c, "produces", []),
    hint: "policy-driven (actor null): own it in the context that owns its produced event(s)",
  }));

  // 6. external + existing systems: evidence for/against a wrapper context, never a default "own context"
  const namesOf = (x) => {
    const s = new Set([pyStr(or(get(x, "id"), "")).toLowerCase(), pyStr(or(get(x, "name"), "")).toLowerCase()]);
    s.delete("");
    return s;
  };
  const termsNaming = (x) => {
    const keys = [...namesOf(x)];
    return list(get(d, "glossary", [])).filter((g) => {
      if (get(g, "context") === get(x, "id")) return true;
      const text = `${pyStr(get(g, "term", ""))} ${pyStr(get(g, "definition", ""))}`.toLowerCase();
      return keys.some((k) => new RegExp(`\\b${escapeRe(k)}\\b`).test(text));
    }).map((g) => get(g, "term"));
  };

  const ext = [];
  for (const x of externals.values()) {
    const evs = [...events.values()].filter((e) => eventActor(e) === x.id).map((e) => e.id);
    const cmds = [...commands.values()].filter((c) => get(c, "actor") === x.id).map((c) => c.id);
    const terms = termsNaming(x);
    let hint;
    if (x.id === "clock") {
      hint = "time trigger, not a system to wrap — own each command where its produced event lives (the scheduler is infrastructure)";
    } else if (!evs.length && !cmds.length && !terms.length) {
      hint = "no evidence on the storm — an adapter inside the context that calls it, not a context of its own (record it in that context's `wraps`)";
    } else {
      hint = `evidence: acts on ${evs.length} event(s) / ${cmds.length} command(s)` + (terms.length ? `, named by terms ${pyRepr(terms)}` : ", no distinct terms")
        + " — a wrapper context only if these carry their own language or a distinct actor drives them; otherwise an adapter inside the context that owns them (record `wraps` there)";
    }
    ext.push({ id: x.id, name: get(x, "name"), events_acted: evs, commands_acted: cmds, terms, hint });
  }
  result.external_systems = ext;

  const existingHint = (s) => {
    const will = get(s, "will");
    const name = pyStr(or(get(s, "name"), "")).toLowerCase();
    const match = ext.find((x) => truthy(name) && namesOf(x).has(name)) ?? null;
    const acts = Boolean(match && (match.events_acted.length || match.commands_acted.length));
    if (will === "ignore") return "not on the map";
    if (will === "replace") {
      return acts
        ? `being replaced but acts on the storm as '${pyStr(match.id)}' — a big-ball-of-mud context only while other contexts must integrate with it live; imported once and retired → not on the map`
        : "being replaced; no evidence it acts on the storm — import once and retire: not on the map (log an assumption)";
    }
    if (will === "integrate") {
      return match ? `see external '${pyStr(match.id)}' above — same evidence rule` : "not on the storm — no evidence; an adapter inside the context that uses it unless it has its own language or actor";
    }
    return "";
  };
  result.existing_systems = list(get(u, "existing_systems", [])).map((s) => ({ name: get(s, "name"), role: get(s, "role"), will: get(s, "will"), hint: existingHint(s) }));

  // 7. capabilities + regulatory constraints
  result.capabilities = list(get(u, "capabilities", [])).map((c) => ({ id: get(c, "id"), name: get(c, "name"), evolution: get(c, "evolution"), description: get(c, "description") }));
  result.regulatory_constraints = list(get(u, "constraints", [])).filter((c) => get(c, "kind") === "regulatory");

  // 8. glossary seeds + hotspots
  result.glossary_seeds = list(get(d, "glossary", [])).map((g) => ({ term: get(g, "term"), definition: get(g, "definition"), avoid: get(g, "avoid", []), context: get(g, "context") }));
  result.hotspots = list(get(d, "hotspots", [])).map((h) => ({
    id: get(h, "id"), kind: get(h, "kind"), near: get(h, "near"), near_phase: eventPhase(get(h, "near")), text: get(h, "text"),
    hint: get(h, "kind") === "conflict" ? "possible language clash — a boundary?" : "",
  }));
  result.read_models = list(get(d, "read_models", [])).map((r) => ({ id: get(r, "id"), informs: get(r, "informs"), used_by: get(r, "used_by") }));

  // 9. coverage checklist
  result.coverage_checklist = { events: sorted(events.keys()), commands: sorted(commands.keys()), aggregates: sorted(byId(aggs).keys()) };

  if (a.json) {
    out(pyDumps(result, { indent: 2 }));
    return 0;
  }

  out(`BOUNDARY WORKSHEET — ${pyStr(result.project)}  (${ddd})`);
  out(`mode=${pyStr(result.mode)} depth=${pyStr(result.depth)} ${label} → aim for ${aimLo}–${aimHi} contexts (never fewer than ${pyStr(floor)})`);
  out("\n0. UPSTREAM NOTES ADDRESSED TO DECOMPOSE  (read before drafting; a 'language' note is a boundary candidate)");
  for (const n of result.upstream_notes) out(`  [${n.from} ${pyStr(n.id)}] (${pyStr(n.kind)}) ${pyStr(n.text)}`);
  if (!result.upstream_notes.length) out("  (none)");
  out("\n1. TIMELINE BY PHASE  (* = pivotal)");
  for (const t of timeline) {
    out(`  [${pyStr(t.phase)}] ${pyStr(t.name)}`);
    for (const e of t.events) {
      out(`    ${e.pivotal ? "*" : " "} ${padL(e.sequence, 4)}  ${padR(e.id, 32)} actor=${padR(or(e.actor, "-"), 14)} via=${pyStr(or(e.triggered_by, "-"))}`);
    }
  }
  if (orphanPhase.length) out(`  events with unknown phase: ${pyRepr(orphanPhase)}`);
  out("\n2. SWIMLANES BY ACTOR");
  for (const [k, v] of Object.entries(lanes)) {
    const who = k === "clock" ? "time trigger" : externals.has(k) ? "external system" : (actors.has(k) ? "actor" : "");
    out(`  ${padR(k, 16)} ${padR(who, 16)} events=${pyRepr(v.events)} commands=${pyRepr(v.commands)}`);
  }
  out("\n3. AGGREGATE CANDIDATES  (each lives in exactly one context)");
  for (const ag of result.aggregate_candidates) out(`  ${padR(ag.id, 20)} handles=${pyRepr(ag.handles)} emits=${pyRepr(ag.emits)}`);
  const nia = result.not_in_any_aggregate;
  if (nia.events.length || nia.commands.length) out(`  not in any aggregate: events=${pyRepr(nia.events)} commands=${pyRepr(nia.commands)}`);
  out("\n4. POLICIES  (a policy whose 'when' event and 'then' command land in different contexts is a RELATIONSHIP, not a reason to merge)");
  for (const p of pols) {
    const thens = p.then.map((t) => `${pyStr(t.command)}→${pyRepr(t.produces)} phases=${pyRepr(t.phases)} actors=${pyRepr(t.actors)}`).join(", ");
    out(`  ${padR(p.id, 20)} ${padR(p.kind, 9)} when ${pyStr(p.when)} (phase=${pyStr(p.when_phase)}, actor=${pyStr(p.when_actor)}) then ${thens}`);
    out(`      crosses=${p.crosses.length ? pyRepr(p.crosses) : "none"} — ${p.hint}`);
  }
  if (result.commands_without_actor.length) {
    out("\n5. POLICY-DRIVEN COMMANDS (actor null)  (own them where their produced event lives)");
    for (const c of result.commands_without_actor) out(`  ${padR(c.id, 24)} produces=${pyRepr(c.produces)}`);
  }
  out("\n6. EXTERNAL / EXISTING SYSTEMS  (a wrapper context needs evidence — its own language or its own actor; default is an adapter inside the context that uses it)");
  for (const x of ext) {
    out(`  external ${padR(x.id, 16)} events=${pyRepr(x.events_acted)} commands=${pyRepr(x.commands_acted)} terms=${pyRepr(x.terms)}`);
    out(`      → ${x.hint}`);
  }
  for (const s of result.existing_systems) {
    out(`  existing ${padR(s.name, 16)} role=${pyStr(s.role)} will=${pyStr(s.will)}`);
    out(`      → ${s.hint}`);
  }
  out("\n7. CAPABILITIES (understand)  → each usually maps to one subdomain");
  for (const c of result.capabilities) out(`  ${padR(c.id, 32)} ${padR(or(c.evolution, "-"), 10)} ${pyStr(c.name)}: ${pyStr(or(c.description, ""))}`);
  if (result.regulatory_constraints.length) {
    out("  regulatory constraints (isolate the data they name):");
    for (const c of result.regulatory_constraints) out(`    ${pyStr(get(c, "id"))}: ${pyStr(get(c, "text"))}`);
  }
  out("\n8. LANGUAGE  (glossary seeds; 'avoid' lists and conflict hotspots are boundary hints)");
  for (const g of result.glossary_seeds) out(`  ${padR(g.term, 20)} ${pyStr(g.definition)}  avoid=${pyRepr(g.avoid)}`);
  for (const h of result.hotspots) {
    out(`  hotspot ${pyStr(h.id)} [${pyStr(h.kind)}] near ${pyStr(h.near)} (${pyStr(h.near_phase)}): ${pyStr(h.text)} ${h.hint ? "— " + h.hint : ""}`);
  }
  for (const r of result.read_models) out(`  read model ${pyStr(r.id)} informs ${pyStr(r.informs)} used by ${pyStr(r.used_by)}`);
  const cl = result.coverage_checklist;
  out("\n9. COVERAGE CHECKLIST — assign every id to exactly one bounded context");
  out(`  events (${cl.events.length}):     ${cl.events.map(pyStr).join(", ")}`);
  out(`  commands (${cl.commands.length}):   ${cl.commands.map(pyStr).join(", ")}`);
  out(`  aggregates (${cl.aggregates.length}): ${cl.aggregates.map(pyStr).join(", ")}`);
  return 0;
}

export default main;
