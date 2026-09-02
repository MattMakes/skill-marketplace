// `ddd organise brief <ddd-dir>`: distil what organise needs from the upstream
// artifacts. Port of organise_tools.py cmd_brief; see organise-lib.mjs for the
// shared pieces and the fidelity rules.
import path from "node:path";
import { ExitError } from "../../../shared/lib/manifest.mjs";
import { pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";
import {
  DOC, FILES, contextFacts, crossContextSteps, dictOr, get, ids, list, ljust, load, or, out, print,
  repoDeployEvidence, resolveDir, sortedStr, strLen, syncChains, truthy,
} from "./organise-lib.mjs";

export function brief(ddd) {
  const [man, und, dec, strat, con, org] = ["manifest", "understand", "decompose", "strategize", "connect", "organise"].map((k) => load(ddd, k));
  if (dec === null) throw new ExitError(`error: ${path.join(ddd, FILES.decompose)} not found — run ddd-decompose first (modes.md §0)`);
  const present = [["manifest", man], ["understand", und], ["decompose", dec], ["strategize", strat], ["connect", con]].filter(([, v]) => truthy(v)).map(([k]) => FILES[k]);
  const missing = [["understand", und], ["strategize", strat], ["connect", con]].filter(([, v]) => !truthy(v)).map(([k]) => FILES[k]);
  const m = dictOr(man);
  const u = dictOr(und);
  const c = dictOr(con);
  const tgt = or(get(m, "scale_target"), or(get(u, "scale_target"), {}));
  print(`ORGANISE BRIEF — ${pyStr(or(get(m, "title"), or(get(m, "project"), "project")))}  (ddd-dir: ${path.resolve(ddd)})`);
  print(`mode=${pyStr(get(m, "mode", "?"))} depth=${pyStr(get(m, "depth", "?"))} ` +
    `scale_target: deployables ${pyStr(get(tgt, "deployables_min", "?"))}–${pyStr(get(tgt, "deployables_max", "?"))}, ` +
    `teams ${pyStr(get(tgt, "teams", "?"))}, users ${pyStr(get(tgt, "users", "?"))}, notes "${pyStr(get(tgt, "notes", ""))}"`);
  print(`Inputs present: ${present.join(", ")}`);
  if (missing.length) print(`Inputs MISSING: ${missing.join(", ")}  → log an assumption for each (connect missing = follow modes.md §0)`);

  const notes = [];
  for (const [k, v] of [["understand", und], ["discover", load(ddd, "discover")], ["decompose", dec], ["strategize", strat], ["connect", con]]) {
    if (!truthy(v)) continue;
    for (const n of list(or(get(v, "notes_for_downstream"), []))) {
      if (list(or(get(n, "for"), [])).includes("organise")) notes.push([k, n]);
    }
  }
  print("\nUpstream notes addressed to organise (contract §3 — a `decision` note is evidence; never re-emit one you merely agree with):");
  for (const [k, n] of notes) print(`  [${k} ${pyStr(get(n, "id"))}] (${pyStr(get(n, "kind", "other"))}) ${pyStr(get(n, "text"))}`);
  if (!notes.length) print("  (none)");

  print("\nConstraints (understand):");
  for (const cs of list(or(get(u, "constraints", []), []))) print(`  ${pyStr(get(cs, "id"))} [${pyStr(get(cs, "kind"))}] ${pyStr(get(cs, "text"))}`);
  if (!truthy(get(u, "constraints"))) print("  (none recorded)");
  const ex = list(or(get(u, "existing_systems", []), []));
  if (ex.length) print("Existing systems: " + ex.map((e) => `${pyStr(get(e, "name"))} (${pyStr(get(e, "role"))}, ${pyStr(get(e, "will"))})`).join("; "));
  const chans = list(or(get(dictOr(get(u, "business_model")), "channels"), []));
  if (chans.length) print("Channels (frontend evidence): " + chans.map(pyStr).join("; "));

  const facts = contextFacts(dec, strat);
  print("\nBounded contexts (decompose × strategize):");
  const rows = [["id", "type", "sourcing", "pattern", "cx", "ISH", "aggr", "ev/cmd"]];
  for (const f of facts.values()) {
    rows.push([pyStr(f.id), pyStr(or(f.type, "?")), pyStr(or(f.sourcing, "?")), pyStr(or(f.pattern, "?")),
      pyStr(f.complexity !== null ? f.complexity : "?"), pyStr(or(f.ish, "?")),
      pyStr(f.aggregates), `${f.events}/${f.commands}`]);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => strLen(r[i]))) + 2); // auto-sized: long ids never collide
  for (const r of rows) print(("  " + r.map((cell, i) => ljust(cell, widths[i])).join("")).replace(/\s+$/, ""));

  const mech = new Map();
  for (const p of list(get(c, "integration_patterns", []))) mech.set(get(p, "relationship"), p);
  print("\nRelationships (decompose → connect mechanism):");
  for (const r of list(get(dec, "relationships", []))) {
    const mm = mech.has(get(r, "id")) ? mech.get(get(r, "id")) : {};
    print(`  ${pyStr(get(r, "id"))} ${pyStr(get(r, "upstream"))} → ${pyStr(get(r, "downstream"))}  ${pyStr(get(r, "pattern"))}  ` +
      `${pyStr(get(mm, "mechanism", "(no mechanism in connect)"))}  "${pyStr(get(mm, "rationale", ""))}"`);
  }
  if (!truthy(get(dec, "relationships"))) print("  (none)");

  const steps = crossContextSteps(con, ids(get(dec, "bounded_contexts")));
  print("\nCross-context traffic (connect flows):");
  for (const st of steps) {
    print(`  ${pyStr(st.from)} → ${pyStr(st.to)}  ${pyStr(st.message)}  ${pyStr(st.kind)}  ${st.sync ? "SYNC" : "async"}  via ${pyStr(st.via)}  (${pyStr(st.flow)}#${pyStr(st.seq)})`);
  }
  if (!steps.length) print("  (none — every flow stays inside one context, or connect is missing)");
  const chains = syncChains(steps);
  print("  Sync chains (≥3 contexts in a row): " + (chains.length ? chains.map(([fl, ch]) => `${pyStr(fl)}: ${ch.map(pyStr).join(" → ")}`).join("; ") : "none"));
  const vias = new Map();
  for (const st of steps) vias.set(st.via, (vias.get(st.via) || 0) + 1);
  if (vias.size) {
    // sorted(key=-count) is stable, so equal counts keep first-seen order.
    const ordered = [...vias].sort((a, b) => b[1] - a[1]);
    print("  Via summary: " + ordered.map(([k, v]) => `${pyStr(k)} ×${v}`).join(", "));
  }
  const inbound = new Map();
  for (const st of steps) {
    if (!inbound.has(st.to)) inbound.set(st.to, []);
    inbound.get(st.to).push(st.sync);
  }
  const asyncOnly = [...inbound].filter(([, flags]) => !flags.some(Boolean)).map(([k]) => k);
  const syncIn = [...inbound].filter(([, flags]) => flags.some(Boolean)).map(([k]) => k);

  const cc = list(or(get(c, "coupling_concerns", []), []));
  print("\nCoupling concerns (connect):");
  for (const x of cc) print(`  ${pyStr(get(x, "id"))} [${pyStr(get(x, "severity"))}] ${list(get(x, "contexts", [])).map(pyStr).join(",")} — ${pyStr(get(x, "text"))}`);
  if (!cc.length) print("  (none)");

  print(`\nTeams in manifest scale_target: ${pyStr(get(tgt, "teams", "(not stated → assume 1)"))}`);
  if (truthy(org)) {
    print(`Previous organise.json: teams ${pyRepr(ids(get(org, "teams")))}, deployables ${pyRepr(ids(get(org, "deployables")))} ` +
      "(re-run → keep these ids, add a `deprecated` list for removals)");
  } else {
    print("Previous organise.json: none (first run)");
  }
  const [root, ev] = repoDeployEvidence(ddd);
  if (ev.length) print(`Deployment evidence in repo (${root}): ${ev.join(", ")}  → brownfield: current deployables are a fact to reconcile`);

  print("\nHints:");
  const all = [...facts.values()];
  const bought = all.filter((f) => f.sourcing === "buy" || f.sourcing === "outsource" || f.type === "generic").map((f) => f.id);
  if (bought.length) print(`  - bought/generic contexts → adapter module inside a deployable, not a deployable of their own: ${bought.map(pyStr).join(", ")}`);
  const cands = all.filter((f) => f.ish === "candidate").map((f) => f.id);
  if (cands.length) print(`  - ISH candidates (eligible for extraction, NOT a mandate): ${cands.map(pyStr).join(", ")}`);
  const merges = all.filter((f) => f.ish === "merge").map((f) => f.id);
  if (merges.length) print(`  - ISH verdict 'merge' (never a deployable on its own): ${merges.map(pyStr).join(", ")}`);
  const viaKeys = [...vias.keys()];
  if (steps.length && viaKeys.every((v) => v === "in-process")) {
    print("  - all cross-context traffic is in-process → connect already assumed one deployable (evidence for a modular monolith)");
  } else if (steps.length && viaKeys.some((v) => v === "message-bus" || v === "http" || v === "grpc")) {
    print("  - some cross-context traffic is over the network → connect assumed separate deployables for those edges; confirm or revise");
  }
  if (asyncOnly.length) print(`  - async-only inbound (cheap to extract later): ${sortedStr(asyncOnly).map(pyStr).join(", ")}`);
  if (syncIn.length) print(`  - synchronous inbound calls (a split here adds a network hop): ${sortedStr(syncIn).map(pyStr).join(", ")}`);
  const core = all.filter((f) => f.type === "core").map((f) => f.id);
  if (core.length) print(`  - core contexts (strongest stream-aligned team; never split ownership): ${core.map(pyStr).join(", ")}`);
  const reg = list(or(get(u, "constraints", []), [])).filter((x) => get(x, "kind") === "regulatory");
  if (reg.length) print(`  - regulatory constraints present (${reg.map((x) => pyStr(get(x, "id"))).join(", ")}) — check whether any demands physical isolation`);
  return 0;
}

export function main(argv) {
  if (argv[0] === "-h" || argv[0] === "--help") { out(DOC); return 0; }
  const ddd = resolveDir(argv);
  if (ddd === null) return 2;
  return brief(ddd);
}

export default main;
