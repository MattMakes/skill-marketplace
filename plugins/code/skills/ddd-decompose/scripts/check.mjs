// Pre-validation checks for a draft ddd/03-decompose/decompose.json, plus three deterministic
// writers. Complements `ddd validate` (which owns schema and cross-step checks); this covers
// what the validator does not, and does it on a draft before you commit to it.
//
// Usage (via the CLI):
//   ddd decompose check <ddd-dir> [--stamp] [--write-map] [--sync-glossary] [--json]
//
// Checks: ownership matrix (orphans, duplicates), aggregate candidates that straddle contexts,
// subdomain coverage, heuristics slugs, relationships (endpoints, self-loops, duplicate pairs,
// connectivity, ids), wraps, ISH verdicts, notes_for_downstream / deprecated shapes,
// capabilities, scale band, kebab-case ids, produced_at later than discover's.
// Writers (all patch the named key in place; the rest of the file's formatting is untouched):
//   --stamp          set produced_at to now (UTC, ISO-8601 Z)
//   --write-map      regenerate context_map_mermaid from relationships[]
//   --sync-glossary  append missing '## <Context> context' sections / '**Term** — meaning' lines
//                    to glossary.md; idempotent (never rewrites existing lines)
//
// Ported statement for statement from decompose_check.py: message strings, their order, the
// Python repr of lists and dicts inside them, and the in-place JSON patching are all pinned by
// the goldens. Python-era wording (`validate.py will mark decompose stale`) stays verbatim until
// leaf 1.4.1 rewords code and goldens together.
//
// Exit 0 = no errors (warnings allowed), 1 = errors, 2 = usage / IO.
import fs from "node:fs";
import path from "node:path";
import { pyDumps, pyEq, pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";
import { now } from "../../../shared/lib/manifest.mjs";

const HELP = `usage: ddd decompose check [-h] [--stamp] [--write-map] [--sync-glossary]
                          [--json]
                          ddd_dir

Pre-validation checks for a draft ddd/03-decompose/decompose.json, plus three deterministic
writers. Complements ddd validate (which owns schema and cross-step checks);
this script covers what the validator does not, and does it on a draft before you commit to it.

Usage:
  ddd decompose check <ddd-dir> [--stamp] [--write-map] [--sync-glossary] [--json]

Checks:
  ownership matrix     events / commands / aggregates per context; orphans and duplicates (aggregates too)
  aggregate candidates a candidate whose handles/emits are owned by several contexts (note: deliberate
                       split? log an assumption + a kind:boundary note for code); listed owner vs real owner
  subdomain coverage   every subdomain in >= 1 context; a subdomain's events/commands owned by its contexts
  heuristics           heuristics_applied slugs against the documented list (warning on unknown;
                       note when a subdomain lists only secondary lenses)
  relationships        endpoints are context ids (never an external system), no self-loops, no duplicate
                       ordered pairs, every context connected (or an explicit separate-ways), ids R1.. unique
  wraps                bounded_contexts[].wraps names a discover external system or an understand existing system
  ISH                  a verdict on every context; 'merge' with no own terms -> consider merging the context;
                       'unsure' / 'merge' without a notes_for_downstream entry for organise -> note
  notes / deprecated   notes_for_downstream shape {id N.., text, for[later steps], kind}; deprecated shape
                       {id, collection, reason, since} (contract section 7)
  capabilities         understand.json capabilities not assigned to any subdomain
  scale                context count vs the band derived from manifest.scale_target
  ids                  kebab-case context/subdomain ids
  timestamps           produced_at later than discover.json (otherwise ddd validate marks the step stale)
Writers (all patch the named key in place — the rest of the file's formatting is untouched):
  --stamp              set produced_at to now (UTC, ISO-8601 Z); re-run after every edit of the JSON
  --write-map          regenerate context_map_mermaid from relationships[]
  --sync-glossary      append missing '## <Context> context' sections / '**Term** — meaning' lines to
                       glossary.md; idempotent (never rewrites existing lines)
Exit 0 = no errors (warnings allowed), 1 = errors, 2 = usage / IO.

positional arguments:
  ddd_dir

options:
  -h, --help       show this help message and exit
  --stamp
  --write-map
  --sync-glossary
  --json
`;
// argparse's usage line(s), for the usage-error path.
const USAGE = HELP.split("\n\n")[0];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MUTUAL = new Set(["partnership", "shared-kernel"]);
const PRIMARY = ["language-boundary", "pivotal-event", "actor", "data-ownership", "rate-of-change", "regulatory", "external-system"];
const SECONDARY = ["capability", "coupling"];
const NOTE_KINDS = ["language", "boundary", "process", "risk", "decision", "other"];
const LATER_STEPS = ["strategize", "connect", "organise", "define", "code"];

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
const setMinus = (a, b) => [...a].filter((x) => !b.has(x));
const padR = (v, n) => pyStr(v).padEnd(n);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function load(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function ids(items) {
  return list(items).filter((x) => isDict(x) && get(x, "id") !== null).map((x) => x.id);
}

function slug(s) {
  return pyStr(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function scaleBand(scale) {
  const lo = get(scale || {}, "deployables_min");
  const hi = get(scale || {}, "deployables_max");
  if (hi === null) return [1, 2, 6, "no scale target in manifest — assuming 1–3 deployables"];
  const aim = hi <= 3 ? [2, 6] : hi <= 9 ? [4, 10] : [6, 15];
  return [or(lo, 1), aim[0], aim[1], `deployables ${pyStr(lo)}–${pyStr(hi)}`];
}

// datetime.fromisoformat(str(s).replace("Z", "+00:00")), or None when it does not parse.
function parseTs(s) {
  if (s === null || s === undefined) return null;
  const t = Date.parse(pyStr(s).replace("Z", "+00:00"));
  return Number.isNaN(t) ? null : t;
}

// Conservative mermaid: flowchart LR, one node per context, one edge per relationship.
export function renderMap(dc) {
  const node = (cid) => pyStr(cid).replace(/-/g, "_");
  const lines = ["flowchart LR"];
  for (const b of list(get(dc, "bounded_contexts", []))) {
    lines.push(`  ${node(get(b, "id"))}["${pyStr(or(get(b, "name"), get(b, "id")))}"]`);
  }
  for (const r of list(get(dc, "relationships", []))) {
    const label = `${pyStr(get(r, "id"))} ${pyStr(get(r, "pattern"))}` + (MUTUAL.has(get(r, "pattern")) ? " (mutual)" : "");
    const arrow = get(r, "pattern") === "separate-ways" ? "-.-" : "-->";
    lines.push(`  ${node(get(r, "upstream"))} ${arrow}|"${label}"| ${node(get(r, "downstream"))}`);
  }
  return lines.join("\n");
}

// Replace the string value of "key" in the raw JSON text. null when the key is absent.
// JSON.stringify escapes exactly what json.dumps(ensure_ascii=False) escapes for the strings
// the chain writes (quotes, backslashes, control characters; non-ASCII kept).
function patchStringKey(text, key, value) {
  const re = new RegExp('("' + escapeRe(key) + '"\\s*:\\s*)("(?:[^"\\\\]|\\\\.)*")');
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + m[1].length;
  return text.slice(0, start) + JSON.stringify(value) + text.slice(start + m[2].length);
}

// Patch string keys in place so the file's own formatting survives; if a key is missing or the
// patched text does not round-trip to the expected document, re-dump with the file's indent.
// Returns the mode used.
function writeBack(file, text, dc, patches) {
  const expected = { ...dc, ...patches };
  let next = text;
  for (const [k, v] of Object.entries(patches)) next = next !== null ? patchStringKey(next, k, v) : null;
  let ok;
  try {
    ok = next !== null && pyEq(JSON.parse(next), expected);
  } catch {
    ok = false;
  }
  let mode = "in-place";
  if (!ok) {
    const m = /\n([ \t]+)"/.exec(text);
    next = JSON.stringify(expected, null, m ? m[1] : 2) + "\n";
    mode = "re-dumped (a key was missing or the patch did not round-trip)";
  }
  fs.writeFileSync(file, next);
  return mode;
}

// Append missing per-context sections/terms. Returns the list of lines added.
function syncGlossary(gpath, dc) {
  const text = fs.existsSync(gpath) ? fs.readFileSync(gpath, "utf8") : "# Ubiquitous language\n\n## Shared\n";
  const lines = text.replace(/\n+$/, "").split("\n");
  // split into [heading, lines] blocks; block 0 is the preamble
  const blocks = [[null, []]];
  for (const ln of lines) {
    if (ln.startsWith("## ")) blocks.push([ln.trim(), []]);
    else blocks[blocks.length - 1][1].push(ln);
  }
  const added = [];
  const TERM = /^\*\*(.+?)\*\*/;
  for (const b of list(get(dc, "bounded_contexts", []))) {
    const terms = list(get(b, "terms", [])).filter((t) => isDict(t) && truthy(get(t, "term")));
    if (!terms.length) continue;
    const heading = `## ${pyStr(or(get(b, "name"), get(b, "id")))} context`;
    let idx = blocks.findIndex(([h]) => h && h.toLowerCase() === heading.toLowerCase());
    if (idx < 0) {
      blocks.push([heading, []]);
      idx = blocks.length - 1;
      added.push(heading);
    }
    const existing = new Set(blocks[idx][1].map((l) => TERM.exec(l)).filter(Boolean).map((m) => m[1].trim().toLowerCase()));
    for (const t of terms) {
      if (!existing.has(pyStr(t.term).trim().toLowerCase())) {
        const line = `**${pyStr(t.term)}** — ${pyStr(get(t, "meaning_here", "") ?? "").trim()}`;
        blocks[idx][1].push(line);
        added.push(line);
      }
    }
  }
  if (added.length) {
    const result = [];
    for (const [h, body] of blocks) {
      while (body.length && body[body.length - 1] === "") body.pop();
      if (h) { result.push(""); result.push(h); }
      result.push(...body);
    }
    fs.writeFileSync(gpath, result.join("\n").replace(/^\n+|\n+$/g, "") + "\n");
  }
  return added;
}

// argparse subset: one required positional, store_true flags, unique prefixes, `--`, -h.
function parseArgs(argv) {
  const flags = { "--stamp": "stamp", "--write-map": "writeMap", "--sync-glossary": "syncGlossary", "--json": "json" };
  const res = { stamp: false, writeMap: false, syncGlossary: false, json: false, dir: null };
  let onlyPositional = false;
  const positional = [];
  for (const a of argv) {
    if (!onlyPositional && a === "--") { onlyPositional = true; continue; }
    if (!onlyPositional && a.startsWith("-") && a.length > 1) {
      if (a === "-h" || a === "--help") return { help: true };
      const name = a.includes("=") ? a.slice(0, a.indexOf("=")) : a;
      const matches = Object.keys(flags).filter((f) => f.startsWith(name));
      if (matches.length !== 1) throw new UsageError(matches.length ? `ambiguous option: ${name} could match ${matches.join(", ")}` : `unrecognized arguments: ${a}`);
      if (a.includes("=")) throw new UsageError(`argument ${matches[0]}: ignored explicit argument '${a.slice(a.indexOf("=") + 1)}'`);
      res[flags[matches[0]]] = true;
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
    err(`${USAGE}\nddd decompose check: error: ${e.message}`);
    return 2;
  }
  if (a.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const ddd = path.resolve(a.dir);
  const file = path.join(ddd, "03-decompose", "decompose.json");
  if (!fs.existsSync(file)) {
    err(`error: ${file} not found`);
    return 2;
  }
  let text;
  let dc;
  try {
    text = fs.readFileSync(file, "utf8");
    dc = JSON.parse(text);
  } catch (e) {
    err(`error: invalid JSON in ${file}: ${e.message}`);
    return 2;
  }
  let d;
  let u;
  let m;
  try {
    const dpath = path.join(ddd, "02-discover", "discover.json");
    d = fs.existsSync(dpath) ? load(dpath) : null;
    const upath = path.join(ddd, "01-understand", "understand.json");
    u = fs.existsSync(upath) ? load(upath) : {};
    const mpath = path.join(ddd, "manifest.json");
    m = fs.existsSync(mpath) ? load(mpath) : {};
  } catch (e) {
    err(`error: ${e.message}`);
    return 2;
  }

  // writers first, so the checks see the stamped/rendered values
  const patches = {};
  if (a.stamp) patches.produced_at = now();
  if (a.writeMap) patches.context_map_mermaid = renderMap(dc);
  Object.assign(dc, patches);

  const errors = [];
  const warnings = [];
  const notes = [];
  const subs = list(get(dc, "subdomains", []));
  const ctxs = list(get(dc, "bounded_contexts", []));
  const rels = list(get(dc, "relationships", []));
  const subIds = ids(subs);
  const ctxIds = ids(ctxs);

  for (const cid of [...subIds, ...ctxIds]) {
    if (!KEBAB.test(pyStr(cid))) warnings.push(`id '${pyStr(cid)}' is not kebab-case`);
  }
  if (new Set(ctxIds).size !== ctxIds.length) errors.push("duplicate bounded context ids");
  if (new Set(subIds).size !== subIds.length) errors.push("duplicate subdomain ids");

  // ownership matrix
  const hasD = truthy(d);
  const evAll = new Set(hasD ? ids(get(d, "events")) : []);
  const cmdAll = new Set(hasD ? ids(get(d, "commands")) : []);
  const aggAll = new Set(hasD ? ids(get(d, "aggregate_candidates")) : []);
  const extKnown = new Set([
    ...ids(get(d || {}, "external_systems")).map(slug),
    ...list(get(u, "existing_systems", [])).filter((s) => truthy(get(s, "name"))).map((s) => slug(get(s, "name"))),
  ]);
  const own = { events: new Map(), commands: new Map(), aggregates: new Map() };
  const addOwner = (kind, x, cid) => { if (!own[kind].has(x)) own[kind].set(x, []); own[kind].get(x).push(cid); };
  const matrix = [];
  for (const b of ctxs) {
    const e = list(get(b, "owns_events", []));
    const c = list(get(b, "owns_commands", []));
    const g = list(get(b, "owns_aggregates", []));
    const verdict = get(or(get(b, "independent_service_check"), {}), "verdict");
    matrix.push({ context: get(b, "id"), events: e.length, commands: c.length, aggregates: g.length,
      subdomains: get(b, "subdomains", []), verdict, wraps: get(b, "wraps", []) });
    for (const x of e) addOwner("events", x, get(b, "id"));
    for (const x of c) addOwner("commands", x, get(b, "id"));
    for (const x of g) addOwner("aggregates", x, get(b, "id"));
    if (!e.length && !c.length) warnings.push(`context '${pyStr(get(b, "id"))}' owns no events and no commands — is it a context or a note?`);
    if (!truthy(verdict)) errors.push(`context '${pyStr(get(b, "id"))}' has no independent_service_check.verdict`);
    else if (verdict === "merge" && !truthy(get(b, "terms"))) {
      notes.push(`context '${pyStr(get(b, "id"))}' verdict=merge and no terms of its own — consider merging it into its neighbour (fewer, coarser contexts)`);
    }
    for (const s of list(get(b, "subdomains", []))) {
      if (!subIds.some((x) => pyEq(x, s))) errors.push(`context '${pyStr(get(b, "id"))}' references unknown subdomain '${pyStr(s)}'`);
    }
    for (const w of list(or(get(b, "wraps", []), []))) {
      if (extKnown.size && !extKnown.has(slug(w))) {
        warnings.push(`context '${pyStr(get(b, "id"))}' wraps '${pyStr(w)}' — not a discover external system id or an understand existing system name`);
      }
    }
  }
  const kinds = [["events", evAll], ["commands", cmdAll], ["aggregates", aggAll]];
  const orphans = Object.fromEntries(kinds.map(([k, v]) => [k, sorted(setMinus(v, new Set(own[k].keys())))]));
  const dupes = Object.fromEntries(Object.keys(own).map((k) => [k, Object.fromEntries([...own[k]].filter(([, o]) => o.length > 1))]));
  const unknown = hasD ? Object.fromEntries(kinds.map(([k, v]) => [k, sorted(setMinus(new Set(own[k].keys()), v))])) : {};
  for (const k of ["events", "commands"]) {
    const one = k.slice(0, -1);
    for (const x of orphans[k]) warnings.push(`${one} '${pyStr(x)}' is not owned by any context`);
    for (const [x, o] of Object.entries(dupes[k])) warnings.push(`${one} '${x}' owned by several contexts: ${pyRepr(o)}`);
    for (const x of unknown[k] ?? []) errors.push(`${one} '${pyStr(x)}' is not in discover.json`);
  }
  for (const x of orphans.aggregates) warnings.push(`aggregate candidate '${pyStr(x)}' is not owned by any context`);
  for (const [x, o] of Object.entries(dupes.aggregates)) warnings.push(`aggregate '${x}' owned by several contexts: ${pyRepr(o)}`);
  for (const x of unknown.aggregates ?? []) warnings.push(`aggregate '${pyStr(x)}' is not in discover.json aggregate_candidates`);

  // aggregate candidates that straddle contexts (they yield to language / data ownership, but say so)
  const straddling = [];
  for (const ag of list(get(d || {}, "aggregate_candidates", []))) {
    const where = {};
    for (const x of list(get(ag, "handles", []))) for (const o of own.commands.get(x) ?? []) (where[o] ??= []).push(x);
    for (const x of list(get(ag, "emits", []))) for (const o of own.events.get(x) ?? []) (where[o] ??= []).push(x);
    const whereKeys = Object.keys(where);
    if (whereKeys.length > 1) {
      straddling.push(get(ag, "id"));
      notes.push(`aggregate candidate '${pyStr(get(ag, "id"))}' straddles contexts ${pyRepr(where)} — deliberate split (language/data ownership win)? ` +
        "log an assumption and a kind:boundary note for code; otherwise move the boundary");
    }
    const listed = own.aggregates.get(get(ag, "id")) ?? [];
    if (whereKeys.length === 1 && listed.length && !pyEq(listed, whereKeys)) {
      notes.push(`aggregate '${pyStr(get(ag, "id"))}' is listed under ${pyRepr(listed)} but its commands/events are owned by ${pyRepr(whereKeys)}`);
    }
  }

  // subdomain coverage + heuristics
  const covered = new Set(ctxs.flatMap((b) => list(get(b, "subdomains", []))));
  for (const s of subs) {
    const sid = get(s, "id");
    if (!covered.has(sid)) errors.push(`subdomain '${pyStr(sid)}' is not covered by any bounded context`);
    const owners = ctxs.filter((b) => list(get(b, "subdomains", [])).some((x) => pyEq(x, sid)));
    const ownedE = new Set(owners.flatMap((b) => list(get(b, "owns_events", []))));
    const ownedC = new Set(owners.flatMap((b) => list(get(b, "owns_commands", []))));
    for (const x of list(get(s, "events", []))) {
      if (!ownedE.has(x)) warnings.push(`subdomain '${pyStr(sid)}' lists event '${pyStr(x)}' but none of its contexts owns it`);
    }
    for (const x of list(get(s, "commands", []))) {
      if (!ownedC.has(x)) warnings.push(`subdomain '${pyStr(sid)}' lists command '${pyStr(x)}' but none of its contexts owns it`);
    }
    if (owners.length > 1) notes.push(`subdomain '${pyStr(sid)}' spans ${owners.length} contexts ${pyRepr(owners.map((b) => get(b, "id")))} — deliberate? log an assumption`);
    const hs = list(or(get(s, "heuristics_applied"), []));
    if (!hs.length) {
      warnings.push(`subdomain '${pyStr(sid)}' has no heuristics_applied — which heuristic decided this boundary?`);
    } else {
      for (const h of hs) {
        if (!PRIMARY.includes(h) && !SECONDARY.includes(h)) {
          warnings.push(`subdomain '${pyStr(sid)}' heuristics_applied has unknown slug '${pyStr(h)}' — use one of ${pyRepr([...PRIMARY, ...SECONDARY])}`);
        }
      }
      if (hs.every((h) => SECONDARY.includes(h))) {
        notes.push(`subdomain '${pyStr(sid)}' lists only secondary lenses ${pyRepr(hs)} — they confirm a boundary; name the primary heuristic that decided it`);
      }
    }
  }

  // relationships
  const seenPairs = new Set();
  const seenIds = new Set();
  const connected = new Set();
  for (const r of rels) {
    const rid = get(r, "id");
    const up = get(r, "upstream");
    const down = get(r, "downstream");
    if (seenIds.has(rid)) errors.push(`duplicate relationship id '${pyStr(rid)}'`);
    seenIds.add(rid);
    if (!/^R\d+$/.test(pyStr(rid))) warnings.push(`relationship id '${pyStr(rid)}' should look like R1, R2, …`);
    for (const end of [up, down]) {
      if (!ctxIds.some((x) => pyEq(x, end))) {
        const hint = extKnown.has(slug(end)) ? " (an external system is never an endpoint — the context that wraps or adapts it is)" : "";
        errors.push(`relationship '${pyStr(rid)}': '${pyStr(end)}' is not a bounded context id${hint}`);
      }
    }
    if (pyEq(up, down)) errors.push(`relationship '${pyStr(rid)}' is a self-loop`);
    // One set holds directed (up, down) tuples and sorted (str, str) tuples alike, so a
    // partnership between a and b duplicates an earlier a -> b customer-supplier.
    const pattern = get(r, "pattern");
    const key = !MUTUAL.has(pattern) && pattern !== "separate-ways"
      ? JSON.stringify([up, down])
      : JSON.stringify(sorted([pyStr(up), pyStr(down)]));
    if (seenPairs.has(key)) warnings.push(`relationship '${pyStr(rid)}' duplicates an earlier one between ${pyStr(up)} and ${pyStr(down)}`);
    seenPairs.add(key);
    if (!truthy(get(r, "description"))) warnings.push(`relationship '${pyStr(rid)}' has no description — say what crosses and why this direction/pattern`);
    connected.add(up);
    connected.add(down);
  }
  if (ctxIds.length > 1) {
    for (const cid of ctxIds) {
      if (!connected.has(cid)) warnings.push(`context '${pyStr(cid)}' has no relationship — add one or an explicit separate-ways`);
    }
  }

  // notes_for_downstream / deprecated shapes (contract sections 3 and 7)
  const noteFor = new Set();
  for (const n of list(or(get(dc, "notes_for_downstream", []), []))) {
    const nid = get(n, "id");
    const fr = list(or(get(n, "for"), []));
    if (!/^N\d+$/.test(pyStr(nid))) warnings.push(`note '${pyStr(nid)}': id should look like N1, N2, …`);
    if (!fr.length) warnings.push(`note '${pyStr(nid)}': 'for' is empty — name the later step(s) it is addressed to`);
    for (const s of fr) {
      if (!LATER_STEPS.includes(s)) warnings.push(`note '${pyStr(nid)}': 'for' entry '${pyStr(s)}' is not a later step name ${pyRepr(LATER_STEPS)} (bare names, no 'ddd-' prefix)`);
      noteFor.add(s);
    }
    if (!NOTE_KINDS.includes(get(n, "kind"))) warnings.push(`note '${pyStr(nid)}': kind '${pyStr(get(n, "kind"))}' is not one of ${pyRepr(sorted(NOTE_KINDS))}`);
    if (!truthy(get(n, "text"))) warnings.push(`note '${pyStr(nid)}' has no text`);
  }
  for (const b of ctxs) {
    const v = get(or(get(b, "independent_service_check"), {}), "verdict");
    if ((v === "unsure" || v === "merge") && !noteFor.has("organise")) {
      notes.push(`context '${pyStr(get(b, "id"))}' ISH verdict=${v} (a module, not a deployable) — no notes_for_downstream entry addressed to organise carries that decision`);
      break;
    }
  }
  for (const x of list(or(get(dc, "deprecated", []), []))) {
    if (!has(x, "collection") || has(x, "kind")) {
      warnings.push(`deprecated '${pyStr(get(x, "id"))}': use the contract shape {id, collection, reason, since} — collection names the list it left (open_questions, assumptions, relationships, …)`);
    }
  }

  // capabilities
  const caps = new Set(ids(get(u, "capabilities")));
  const used = new Set(subs.flatMap((s) => list(get(s, "capabilities", []))));
  for (const c of sorted(setMinus(caps, used))) warnings.push(`capability '${pyStr(c)}' (understand) is not assigned to any subdomain`);

  // scale band
  const [floor, aimLo, aimHi, label] = scaleBand(or(get(m, "scale_target"), get(u, "scale_target")));
  const n = ctxIds.length;
  if (n < floor) {
    warnings.push(`${n} contexts but the scale target needs at least ${pyStr(floor)} deployables — a deployable cannot be half a context`);
  } else if (!(aimLo <= n && n <= aimHi)) {
    notes.push(`${n} contexts; band for ${label} is ${aimLo}–${aimHi} — fine if deliberate, say why in subdomains.md §1`);
  }

  // timestamps
  if (hasD) {
    const td = parseTs(get(d, "produced_at"));
    const tc = parseTs(get(dc, "produced_at"));
    if (td !== null && tc !== null && tc <= td) {
      warnings.push(`produced_at ${pyStr(get(dc, "produced_at"))} is not later than discover's ${pyStr(get(d, "produced_at"))} — run with --stamp (ddd validate will mark decompose stale)`);
    }
  }

  // write
  const written = {};
  if (Object.keys(patches).length) {
    written.write_mode = writeBack(file, text, dc, patches);
    Object.assign(written, patches);
  }
  if (a.syncGlossary) written.glossary_added = syncGlossary(path.join(ddd, "glossary.md"), dc);

  const ok = errors.length === 0;
  if (a.json) {
    out(pyDumps({ ok, errors, warnings, notes, matrix, orphans, duplicates: dupes, straddling_aggregates: straddling, written }, { indent: 2, ensureAscii: false }));
    return ok ? 0 : 1;
  }

  out(`DECOMPOSE CHECK — ${file}`);
  out(`contexts=${n} subdomains=${subIds.length} relationships=${rels.length}   band for ${label}: ${aimLo}–${aimHi} (floor ${pyStr(floor)})`);
  out(`${"context".padEnd(24)}${"events".padEnd(8)}${"commands".padEnd(10)}${"aggregates".padEnd(12)}${"verdict".padEnd(11)}${"wraps".padEnd(18)}subdomains`);
  for (const row of matrix) {
    out(`${padR(row.context, 24)}${padR(row.events, 8)}${padR(row.commands, 10)}${padR(row.aggregates, 12)}${padR(row.verdict, 11)}${padR(or(list(row.wraps).map(pyStr).join(","), "-"), 18)}${list(row.subdomains).map(pyStr).join(", ")}`);
  }
  if (hasD) out(`orphans: events=${pyRepr(orphans.events)} commands=${pyRepr(orphans.commands)} aggregates=${pyRepr(orphans.aggregates)}`);
  if (Object.keys(patches).length) {
    out(`\nwrote ${Object.keys(patches).join(", ")} (${written.write_mode})`);
    if (has(patches, "produced_at")) out(`produced_at = ${patches.produced_at}`);
    if (has(patches, "context_map_mermaid")) out("context_map_mermaid:\n" + patches.context_map_mermaid);
  }
  if (has(written, "glossary_added")) {
    out(`\nglossary: ${written.glossary_added.length ? `added ${written.glossary_added.length} line(s)` : "nothing to add"}`);
    for (const l of written.glossary_added) out(`  + ${l}`);
  }
  if (errors.length) {
    out(`\n${errors.length} error(s):`);
    for (const e of errors) out(`  [error] ${e}`);
  }
  if (warnings.length) {
    out(`\n${warnings.length} warning(s):`);
    for (const w of warnings) out(`  [warn] ${w}`);
  }
  for (const x of notes) out(`  (note) ${x}`);
  out("\nRESULT: " + (ok ? "OK" : "FAIL"));
  return ok ? 0 : 1;
}

export default main;
