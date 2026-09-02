// `ddd organise check <ddd-dir>`: advisory checks beyond validate (Conway
// straddling, shared DBs, bought contexts as deployables, sync hops across
// deployables, topology_style rule, scale_check arithmetic, hosts_runtime_of
// pairing). Port of organise_tools.py cmd_check; exit 1 when it finds errors.
import path from "node:path";
import { ExitError } from "../../../shared/lib/manifest.mjs";
import { pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";
import {
  DOC, FILES, KEBAB, contextFacts, crossContextSteps, dictOr, get, ids, list, load, or, out, print, pyEq,
  resolveDir, strLen, truthy,
} from "./organise-lib.mjs";

// Read an interaction the contract's way (§4.6: from = consumes/needs, to = provides). Printed, never judged.
function direction(i) {
  const f = pyStr(get(i, "from"));
  const t = pyStr(get(i, "to"));
  const m = get(i, "mode");
  if (m === "x-as-a-service") return `${f} → ${t}  x-as-a-service: '${f}' consumes what '${t}' provides`;
  if (m === "facilitating") return `${f} → ${t}  facilitating: enabling team '${f}' helps '${t}'`;
  if (m === "collaboration") return `${f} ↔ ${t}  collaboration (either order; the reason says why): ${pyStr(or(get(i, "reason"), "(no reason)"))}`;
  return `${f} → ${t}  ${pyStr(m)}`;
}

export function check(ddd) {
  const org = load(ddd, "organise");
  if (org === null) throw new ExitError(`error: ${path.join(ddd, FILES.organise)} not found — write it first`);
  const [man, dec, strat, con] = ["manifest", "decompose", "strategize", "connect"].map((k) => load(ddd, k));
  const errors = [];
  const warnings = [];
  const info = [];
  const contexts = ids(get(dictOr(dec), "bounded_contexts"));
  const facts = contextFacts(dec, strat);
  const teams = new Map();
  for (const t of list(get(org, "teams", []))) if (get(t, "id") !== null) teams.set(t.id, t);
  const deps = new Map();
  for (const d of list(get(org, "deployables", []))) if (get(d, "id") !== null) deps.set(d.id, d);

  const allIds = [...teams.keys(), ...deps.keys(),
    ...list(get(org, "assumptions", [])).map((a) => get(a, "id")),
    ...list(get(org, "open_questions", [])).map((q) => get(q, "id"))];
  for (const i of allIds) {
    if (truthy(i) && !(KEBAB.test(pyStr(i)) || /^[AQ]\d+$/.test(pyStr(i)))) warnings.push(`id '${pyStr(i)}' is not kebab-case (or A1/Q1 style)`);
  }

  const ownT = new Map();
  const ownD = new Map();
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  const owned = (m, k) => (m.has(k) ? m.get(k) : []);
  for (const t of teams.values()) {
    for (const c of list(get(t, "owns_contexts", []))) {
      push(ownT, c, t.id);
      if (contexts.length && !contexts.includes(c)) errors.push(`team '${pyStr(t.id)}' owns unknown context '${pyStr(c)}'`);
    }
  }
  for (const d of deps.values()) {
    for (const c of list(get(d, "contexts", []))) {
      push(ownD, c, d.id);
      if (contexts.length && !contexts.includes(c)) errors.push(`deployable '${pyStr(d.id)}' contains unknown context '${pyStr(c)}'`);
    }
    if (!teams.has(get(d, "team"))) errors.push(`deployable '${pyStr(d.id)}' references unknown team '${pyStr(get(d, "team"))}'`);
  }
  for (const c of contexts) {
    if (owned(ownT, c).length !== 1) errors.push(`context '${pyStr(c)}' must be owned by exactly one team (found ${pyRepr(owned(ownT, c))})`);
    if (owned(ownD, c).length !== 1) errors.push(`context '${pyStr(c)}' must be in exactly one deployable (found ${pyRepr(owned(ownD, c))})`);
  }

  // Conway: a deployable never straddles team boundaries
  for (const d of deps.values()) {
    for (const c of list(get(d, "contexts", []))) {
      const owner = (owned(ownT, c).length ? owned(ownT, c) : [null])[0];
      if (truthy(owner) && owner !== get(d, "team")) {
        errors.push(`deployable '${pyStr(d.id)}' is run by team '${pyStr(get(d, "team"))}' but contains context '${pyStr(c)}' owned by team '${pyStr(owner)}' ` +
          "— deployables must not straddle team boundaries (Inverse Conway): move the context or split the deployable");
      }
    }
  }

  if (!pyEq(get(org, "deployable_count"), deps.size)) errors.push(`deployable_count=${pyStr(get(org, "deployable_count"))} but ${deps.size} deployables listed`);
  const carrying = [...deps.values()].filter((d) => truthy(get(d, "contexts")));
  const expected = carrying.length <= 1 ? "modular-monolith" : (carrying.length <= 5 ? "few-services" : "many-services");
  if (get(org, "topology_style") !== expected) {
    errors.push(`topology_style='${pyStr(get(org, "topology_style"))}' but ${carrying.length} deployable(s) carry contexts → expected ` +
      `'${expected}' (rule: 1 → modular-monolith, 2–5 → few-services, 6+ → many-services)`);
  }

  const tgt = or(get(dictOr(man), "scale_target"), {});
  const sc = or(get(org, "scale_check"), {});
  const lo = get(tgt, "deployables_min");
  const hi = get(tgt, "deployables_max");
  if (lo !== null && hi !== null) {
    const within = lo <= deps.size && deps.size <= hi;
    if (!pyEq(get(sc, "target_min"), lo) || !pyEq(get(sc, "target_max"), hi)) {
      errors.push(`scale_check.target_min/max = ${pyStr(get(sc, "target_min"))}–${pyStr(get(sc, "target_max"))} must mirror manifest scale_target ${pyStr(lo)}–${pyStr(hi)}`);
    }
    if (!pyEq(get(sc, "within_target"), within)) {
      errors.push(`scale_check.within_target=${pyStr(get(sc, "within_target"))} but ${deps.size} deployables vs target ${pyStr(lo)}–${pyStr(hi)} → should be ${pyStr(within)}`);
    }
    if (!within && !pyStr(or(get(sc, "note"), "")).trim()) {
      errors.push(`${deps.size} deployables is outside the target ${pyStr(lo)}–${pyStr(hi)}: allowed, but scale_check.note must carry the argument`);
    }
    if (!pyStr(or(get(sc, "note"), "")).trim()) warnings.push("scale_check.note is empty — put the one-line 'why not fewer / why not more' here");
  } else {
    warnings.push("manifest has no scale_target — scale check cannot be verified (ddd init --deployables-min/max)");
  }

  const ctx2dep = new Map();
  for (const [c, v] of ownD) if (v.length === 1) ctx2dep.set(c, v[0]);
  const depOf = (c, d = null) => (ctx2dep.has(c) ? ctx2dep.get(c) : d);
  for (const d of deps.values()) {
    const ds = get(d, "data_store");
    if (ds === "shared") {
      warnings.push(`deployable '${pyStr(d.id)}' has data_store=shared — a shared database couples deployables; state which store, with whom, and why in the rationale`);
    } else if (ds === null) {
      info.push(`deployable '${pyStr(d.id)}' has no data_store — set own | shared | none`);
    }
    if (strLen(pyStr(or(get(d, "rationale"), "")).trim()) < 25) {
      warnings.push(`deployable '${pyStr(d.id)}' rationale is too thin — name the reason from references/deployable-split-decisions.md`);
    }
    const hro = list(or(get(d, "hosts_runtime_of"), []));
    if (!truthy(get(d, "contexts")) && !hro.length) {
      info.push(`deployable '${pyStr(d.id)}' carries no bounded context (auxiliary) — make sure the inputs evidence it`);
    }
    for (const c of hro) { // a client that runs a context's model offline; the context stays listed in its server-side deployable
      if (contexts.length && !contexts.includes(c)) {
        errors.push(`deployable '${pyStr(d.id)}' hosts_runtime_of unknown context '${pyStr(c)}'`);
      } else if (list(or(get(d, "contexts"), [])).includes(c)) {
        warnings.push(`deployable '${pyStr(d.id)}' lists '${pyStr(c)}' in both contexts and hosts_runtime_of — list it once, in the server-side deployable; hosts_runtime_of is for the client`);
      }
    }
    if (hro.length && ds === "none") {
      warnings.push(`deployable '${pyStr(d.id)}' runs ${hro.map(pyStr).join(", ")} offline but data_store=none — an offline-first client holds the source of truth until synced: use 'own' (contract §4.6)`);
    }
    const dcs = list(get(d, "contexts", []));
    if (dcs.length === 1 && (get(d, "kind") === "service" || get(d, "kind") === "function")) {
      const f = facts.has(dcs[0]) ? facts.get(dcs[0]) : {};
      if (get(f, "sourcing") === "buy" || get(f, "sourcing") === "outsource" || get(f, "type") === "generic") {
        warnings.push(`deployable '${pyStr(d.id)}' is just the bought/generic context '${pyStr(get(f, "id"))}' — usually an adapter inside another deployable, not a deployable; keep only with a concrete reason in the rationale`);
      }
      if (get(f, "ish") === "merge") warnings.push(`deployable '${pyStr(d.id)}' isolates context '${pyStr(get(f, "id"))}' whose ISH verdict is 'merge'`);
    }
  }
  for (const st of crossContextSteps(con, contexts)) {
    const a = depOf(st.from);
    const b = depOf(st.to);
    if (st.sync && truthy(a) && truthy(b) && a !== b) {
      warnings.push(`sync ${pyStr(st.kind)} '${pyStr(st.message)}' ${pyStr(st.from)}→${pyStr(st.to)} crosses deployables ${pyStr(a)}→${pyStr(b)} (${pyStr(st.flow)}#${pyStr(st.seq)}) ` +
        "— a network hop with temporal coupling; make it async, co-locate, or accept it explicitly in the rationale");
    }
    if (st.via === "in-process" && truthy(a) && truthy(b) && a !== b) {
      warnings.push(`connect says '${pyStr(st.message)}' ${pyStr(st.from)}→${pyStr(st.to)} is in-process, but they are in different deployables (${pyStr(a)}, ${pyStr(b)}) — connect is now stale for that edge; note it as an open question`);
    }
  }

  const interactions = list(get(org, "interactions", []));
  for (const i of interactions) {
    const from = get(i, "from");
    const to = get(i, "to");
    if (!teams.has(from) || !teams.has(to)) errors.push(`interaction ${pyStr(from)}→${pyStr(to)} references an unknown team`);
    else if (from === to) errors.push(`interaction ${pyStr(from)}→${pyStr(to)}: a team does not interact with itself`);
    if (get(i, "mode") === "collaboration" && !/until|review|week|month|sprint|quarter|end|then/i.test(pyStr(or(get(i, "reason"), "")))) {
      warnings.push(`collaboration ${pyStr(from)}→${pyStr(to)} is not time-boxed — put the end condition in reason (then switch to x-as-a-service)`);
    }
  }
  if (teams.size >= 2 && !interactions.length) {
    warnings.push("2+ teams but no interactions — record at least the modes implied by cross-team relationships");
  }

  const nSa = [...teams.values()].filter((t) => get(t, "type") === "stream-aligned").length;
  if ([...teams.values()].some((t) => get(t, "type") === "platform") && nSa < 3) {
    warnings.push(`platform team with only ${nSa} stream-aligned team(s) — usually premature; justify in notes or fold it into a stream-aligned team`);
  }
  for (const t of teams.values()) {
    if (get(t, "type") === "stream-aligned" && !truthy(get(t, "owns_contexts"))) warnings.push(`stream-aligned team '${pyStr(t.id)}' owns no context`);
    if (get(t, "cognitive_load") === "high") warnings.push(`team '${pyStr(t.id)}' has high cognitive load — honest is right; put the mitigation in notes (ddd validate will warn too)`);
    if (get(t, "cognitive_load") === null) info.push(`team '${pyStr(t.id)}' has no cognitive_load — set low | ok | high`);
    const ownedDeps = [...deps.values()].filter((d) => get(d, "team") === t.id);
    if (truthy(get(t, "size")) && t.size <= 3 && ownedDeps.length > 2) {
      warnings.push(`team '${pyStr(t.id)}' (${pyStr(t.size)} people) operates ${ownedDeps.length} deployables — operational load; why not fewer?`);
    }
    const nOwned = list(get(t, "owns_contexts", [])).length;
    if (get(t, "type") === "stream-aligned" && nOwned > 4 && or(get(t, "size"), 0) <= 8) {
      warnings.push(`team '${pyStr(t.id)}' owns ${nOwned} contexts — check cognitive load honestly`);
    }
  }
  if (truthy(get(tgt, "teams")) && !pyEq(get(tgt, "teams"), teams.size)) {
    info.push(`manifest says ${pyStr(get(tgt, "teams"))} team(s), organise has ${teams.size} — fine if deliberate; record an assumption`);
  }
  if (!truthy(or(get(org, "assumptions"), [])) && get(org, "mode") === "auto") {
    warnings.push("auto mode with zero assumptions — an auto run always guesses something; record it");
  }

  print(`organise check — ${path.resolve(ddd)}: ${teams.size} team(s), ${deps.size} deployable(s), ${contexts.length} context(s)`);
  for (const i of interactions) print(`  interaction ${direction(i)}`);
  for (const d of deps.values()) {
    for (const c of list(or(get(d, "hosts_runtime_of"), []))) {
      print(`  runtime     '${pyStr(d.id)}' hosts '${pyStr(c)}' offline; the context is owned by deployable '${pyStr(depOf(c, "?"))}'`);
    }
  }
  for (const [label, rows] of [["ERROR", errors], ["warning", warnings], ["info", info]]) {
    for (const m of rows) print(`  [${label}] ${m}`);
  }
  print(`RESULT: ${errors.length ? "FAIL" : "OK"} (${errors.length} errors, ${warnings.length} warnings)`);
  return errors.length ? 1 : 0;
}

export function main(argv) {
  if (argv[0] === "-h" || argv[0] === "--help") { out(DOC); return 0; }
  const ddd = resolveDir(argv);
  if (ddd === null) return 2;
  return check(ddd);
}

export default main;
