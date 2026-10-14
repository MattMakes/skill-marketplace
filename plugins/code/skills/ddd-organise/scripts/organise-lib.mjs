// Shared half of the organise_tools.py port: loading, the per-context facts table,
// the cross-context step scan, sync chains and the brownfield deployment scan.
// brief.mjs, check.mjs and mermaid.mjs are the three subcommands `ddd organise
// <verb>` dispatches to; they import from here so the three stay one program the
// way the Python file was.
//
// Fidelity notes: the goldens compare stdout byte for byte, so every value the
// Python interpolated with str() goes through pyStr (None -> "None", a list ->
// its repr) and `sys.exit("message")` becomes an ExitError with exit code 1,
// which the CLI prints to stderr. Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import { ExitError } from "../../../shared/lib/manifest.mjs";
import { pyStr } from "../../../shared/lib/jsonschema.mjs";

export const DOC = `ddd organise — deterministic helpers for the ddd-organise skill (zero dependencies).

Usage:
  ddd organise brief   <ddd-dir>   # distil what organise needs from the upstream artifacts
  ddd organise check   <ddd-dir>   # advisory checks beyond ddd validate (Conway straddling, shared
                                        # DBs, bought contexts as deployables, sync hops across
                                        # deployables, topology_style rule, scale_check arithmetic,
                                        # hosts_runtime_of pairing); prints each interaction's direction
                                        # (from = consumes/needs, to = provides) without judging it
  ddd organise mermaid <ddd-dir>   # render the teams → contexts → deployables diagram from organise.json

\`ddd validate --step organise\` stays the formal gate; \`check\` catches the things it
does not look at. Exit codes: 0 ok, 1 \`check\` found errors, 2 usage/IO problem.
`;

export const FILES = {
  manifest: "manifest.json",
  understand: "01-understand/understand.json",
  discover: "02-discover/discover.json",
  decompose: "03-decompose/decompose.json",
  strategize: "04-strategize/strategize.json",
  connect: "05-connect/connect.json",
  organise: "06-organise/organise.json",
};
export const RANK = { core: 3, supporting: 2, generic: 1 };
export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const out = (s) => process.stdout.write(s);
export const print = (s = "") => process.stdout.write(s + "\n");

// ---------------------------------------------------------------------------
// Python value helpers.
// ---------------------------------------------------------------------------
export const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
export const get = (o, k, d = null) => (has(o, k) ? o[k] : d);
export const list = (v) => (Array.isArray(v) ? v : []);
export const truthy = (v) => {
  if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (isDict(v)) return Object.keys(v).length > 0;
  return Boolean(v);
};
export const or = (v, d) => (truthy(v) ? v : d);
export const dictOr = (v) => (isDict(v) ? v : {});
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const sortedStr = (it) => [...it].sort((a, b) => cmp(pyStr(a), pyStr(b)));
// Python `==` between JSON scalars: 1 == 1.0 == True; None only equals None.
export const pyEq = (a, b) => {
  const numLike = (v) => typeof v === "number" || typeof v === "boolean";
  if (numLike(a) && numLike(b)) return Number(a) === Number(b);
  return (a ?? null) === (b ?? null);
};
// len() of a string in code points, as Python counts.
export const strLen = (s) => [...s].length;
export const ljust = (s, w) => s + " ".repeat(Math.max(0, w - strLen(s)));

// ---------------------------------------------------------------------------
// loading
// ---------------------------------------------------------------------------
// `sys.exit(f"error: invalid JSON in {path}: {e}")` exits 1; the parse message
// itself differs between the two runtimes and is not golden-recorded.
export function load(ddd, key) {
  const p = path.join(ddd, FILES[key]);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    throw new ExitError(`error: invalid JSON in ${p}: ${e.message}`);
  }
}

export function ids(items, key = "id") {
  return list(items).filter((x) => isDict(x) && get(x, key) !== null).map((x) => x[key]);
}

// Per bounded context: type/sourcing/pattern/complexity derived from its subdomains' classifications.
export function contextFacts(dec, strat) {
  const cls = new Map();
  for (const c of list(get(dictOr(strat), "classifications", []))) cls.set(get(c, "subdomain"), c);
  const facts = new Map();
  for (const ctx of list(get(dictOr(dec), "bounded_contexts", []))) {
    const rows = list(get(ctx, "subdomains", [])).filter((s) => cls.has(s)).map((s) => cls.get(s));
    const fact = {
      id: get(ctx, "id"), name: get(ctx, "name", get(ctx, "id")), type: null, sourcing: null,
      pattern: null, complexity: null, evolution: null,
      ish: get(dictOr(get(ctx, "independent_service_check")), "verdict"),
      aggregates: list(or(get(ctx, "owns_aggregates"), [])).length,
      events: list(or(get(ctx, "owns_events"), [])).length, commands: list(or(get(ctx, "owns_commands"), [])).length,
    };
    if (rows.length) {
      // max() keeps the first of equally ranked rows.
      const rank = (r) => (has(RANK, get(r, "type")) ? RANK[get(r, "type")] : 0);
      let best = rows[0];
      for (const r of rows) if (rank(r) > rank(best)) best = r;
      fact.type = get(best, "type");
      fact.sourcing = rows.some((r) => get(r, "sourcing") === "build") ? "build" : get(best, "sourcing");
      fact.pattern = get(best, "implementation_pattern");
      fact.evolution = get(best, "evolution");
      const cx = rows.map((r) => get(r, "model_complexity")).filter((v) => typeof v === "number");
      fact.complexity = cx.length ? Math.max(...cx) : null;
    }
    facts.set(fact.id, fact);
  }
  return facts;
}

// Every flow step whose from/to are two different bounded contexts.
export function crossContextSteps(con, contexts) {
  const cs = new Set(contexts);
  const steps = [];
  for (const flow of list(get(dictOr(con), "flows", []))) {
    const sorted = [...list(get(flow, "steps", []))].sort((a, b) => Number(get(a, "seq", 0)) - Number(get(b, "seq", 0)));
    for (const st of sorted) {
      const a = get(st, "from");
      const b = get(st, "to");
      if (cs.has(a) && cs.has(b) && a !== b) {
        steps.push({ flow: get(flow, "id"), seq: get(st, "seq"), from: a, to: b, message: get(st, "message"), kind: get(st, "kind"), sync: truthy(get(st, "sync")), via: get(st, "via") });
      }
    }
  }
  return steps;
}

// Runs of consecutive synchronous cross-context steps inside one flow, e.g. a→b→c.
export function syncChains(steps) {
  const chains = [];
  let cur = [];
  let curFlow = null;
  for (const st of steps) {
    if (st.sync && cur.length && curFlow === st.flow && cur[cur.length - 1] === st.from) {
      cur.push(st.to);
    } else if (st.sync) {
      if (cur.length >= 3) chains.push([curFlow, cur]);
      cur = [st.from, st.to];
      curFlow = st.flow;
    } else {
      if (cur.length >= 3) chains.push([curFlow, cur]);
      cur = [];
      curFlow = null;
    }
  }
  if (cur.length >= 3) chains.push([curFlow, cur]);
  return chains;
}

// Brownfield hint: files in the project root that reveal existing deployable units.
export function repoDeployEvidence(ddd) {
  const root = path.dirname(path.resolve(ddd.replace(/\/+$/, ""))) || ".";
  const pats = [/^docker-compose.*\.ya?ml$/, /^compose.*\.ya?ml$/, /^Dockerfile/, /^Procfile$/, /^serverless\.ya?ml$/,
    /^fly\.toml$/, /^vercel\.json$/, /^netlify\.toml$/, /^app\.ya?ml$/, /^skaffold\.ya?ml$/];
  const dirs = new Set(["k8s", "kubernetes", "helm", "charts", "deploy", "infra", "terraform", "apps", "services"]);
  const found = [];
  try {
    for (const name of fs.readdirSync(root).sort(cmp)) {
      if (pats.some((p) => p.test(name))) found.push(name);
      if (dirs.has(name) && fs.statSync(path.join(root, name)).isDirectory()) found.push(name + "/");
    }
  } catch {
    // an unreadable root is simply no evidence, as in the Python
  }
  return [root, found];
}

// The Python main: `organise_tools.py <verb> <ddd-dir>`; anything else prints the
// module doc to stdout and exits 2, a non-directory exits 1 via sys.exit.
export function resolveDir(argv) {
  if (argv.length < 1) { out(DOC + "\n"); return null; }
  const ddd = argv[0];
  if (!fs.existsSync(ddd) || !fs.statSync(ddd).isDirectory()) throw new ExitError(`error: ${ddd} is not a directory`);
  return ddd;
}
