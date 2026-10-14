// `ddd organise mermaid <ddd-dir>`: render the teams → contexts → deployables
// flowchart from organise.json. Port of organise_tools.py cmd_mermaid.
import path from "node:path";
import { ExitError } from "../../../shared/lib/manifest.mjs";
import { pyStr } from "../../../shared/lib/jsonschema.mjs";
import { DOC, FILES, contextFacts, get, list, load, out, print, resolveDir, sortedStr, truthy } from "./organise-lib.mjs";

const nid = (prefix, raw) => prefix + "_" + pyStr(raw).replace(/[^A-Za-z0-9_]/g, "_");
const label = (s) => pyStr(s).replace(/"/g, "'");

export function mermaid(ddd) {
  const org = load(ddd, "organise");
  if (org === null) throw new ExitError(`error: ${path.join(ddd, FILES.organise)} not found — write it first`);
  const dec = load(ddd, "decompose");
  const strat = load(ddd, "strategize");
  const facts = contextFacts(dec, strat);
  const teams = list(get(org, "teams", []));
  const deployables = list(get(org, "deployables", []));
  const order = facts.size ? [...facts.keys()] : sortedStr(new Set(teams.flatMap((t) => list(get(t, "owns_contexts", [])))));
  const L = ["flowchart LR"];
  L.push('  subgraph teams["Teams"]');
  for (const t of teams) {
    const size = truthy(get(t, "size")) ? `, ${pyStr(t.size)}` : "";
    L.push(`    ${nid("t", t.id)}["${label(get(t, "name", t.id))} (${pyStr(get(t, "type", "?"))}${size})"]`);
  }
  L.push("  end");
  L.push('  subgraph contexts["Bounded contexts"]');
  for (const c of order) {
    const f = facts.has(c) ? facts.get(c) : {};
    L.push(`    ${nid("c", c)}["${label(get(f, "name", c))}${truthy(get(f, "type")) ? ` (${pyStr(f.type)})` : ""}"]`);
  }
  L.push("  end");
  L.push('  subgraph deployables["Deployable units"]');
  for (const d of deployables) {
    L.push(`    ${nid("d", d.id)}[["${label(get(d, "name", d.id))} (${pyStr(get(d, "kind", "?"))})"]]`);
  }
  L.push("  end");
  for (const t of teams) {
    for (const c of list(get(t, "owns_contexts", []))) L.push(`  ${nid("t", t.id)} --> ${nid("c", c)}`);
  }
  for (const d of deployables) {
    for (const c of list(get(d, "contexts", []))) L.push(`  ${nid("c", c)} --> ${nid("d", d.id)}`);
    if (!truthy(get(d, "contexts"))) L.push(`  ${nid("t", get(d, "team", "?"))} -.-> ${nid("d", d.id)}`);
  }
  const interactions = list(get(org, "interactions", []));
  if (interactions.length) L.push("  %% interactions: from (consumes/needs) -. mode .-> to (provides)");
  for (const i of interactions) L.push(`  ${nid("t", get(i, "from"))} -. ${pyStr(get(i, "mode"))} .-> ${nid("t", get(i, "to"))}`);
  print(L.join("\n"));
  return 0;
}

export function main(argv) {
  if (argv[0] === "-h" || argv[0] === "--help") { out(DOC); return 0; }
  const ddd = resolveDir(argv);
  if (ddd === null) return 2;
  return mermaid(ddd);
}

export default main;
