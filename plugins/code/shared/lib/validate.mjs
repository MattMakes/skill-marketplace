// `ddd validate`: schemas, cross-step references, staleness. A statement-for-statement
// port of validate.py, whose stdout, exit codes and manifest writes are pinned by the
// goldens under tests/goldens/*/validate/. Message strings are the Python-era ones
// verbatim (design §6 ruling: leaf 1.4.1 rewords code and goldens together).
//
//   main(argv, ctx)                      the CLI entry: prints, returns the exit code
//   validate(dddDir, opts) -> report     in-process entry for the review page
//
// opts: { step: <name>|null, strict: false, notes: true, persist: true }. The report
// carries the same keys as `--json` (ddd_dir, ok, errors, warnings, info, steps) plus
// what the text output needs (next, notes, stale, staleWritten, manifest, artifacts,
// exitCode). A workspace that is not a directory throws ExitError (exit 2), the one
// case validate.py reported on stderr instead of in the report. `renderText` and
// `renderJson` turn a report into the exact bytes the CLI prints.
//
// Staleness (design §6 invariant 1): validate.py writes `stale` into manifest.json on
// ANY run where it detects it, plain, --json, --step or --status alike, and it does
// so BEFORE building the status table, which is why the table already shows `stale`
// and `next:` points at the first stale step. `persist:false` keeps the in-memory
// mutation (so the report matches what the CLI would print) and only skips the write;
// the review page relies on that to never touch a run.
//
// Python fidelity notes, because the goldens compare bytes:
// - `dict.get(k, default)` returns the default only when the key is absent; a key
//   present with null prints `None`. `get()` below has the same shape and every
//   interpolated value goes through `pyStr`.
// - Lists and sets that Python prints (`['a', 'b']`) go through `pyRepr`; `sorted()`
//   is codepoint order, so the comparator is `<`, never localeCompare.
// - Dicts keyed by data values are Maps: a plain object would reorder integer-like keys.
// - The staleness warning prints `datetime.isoformat()` of an aware timestamp, which
//   spells UTC as `+00:00`, not `Z`.
// - `--json` is `json.dumps(indent=2)` with its default ensure_ascii=True, so the
//   em dashes in the messages come out as `—`.
//
// Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import { STEPS, FOLDER, pathExists } from "./workspace.mjs";
import { checkSchemaCore, loadSchema, pyDumps, pyStr, pyRepr, pyEq } from "./jsonschema.mjs";
import { ExitError, now, writeManifest } from "./manifest.mjs";

export { STEPS, FOLDER };

// Markdown artifacts the contract requires next to each step's JSON (per-context
// files are checked via *_path fields).
export const MD_ARTIFACTS = {
  understand: ["understand.md"], discover: ["event-storm.md"], decompose: ["subdomains.md"],
  strategize: ["core-domain-chart.md"], connect: ["message-flows.md"], organise: ["team-topology.md"],
  define: ["system-context.md"], code: ["implementation-plan.md"], contracts: ["contracts.md"],
};

const USAGE = "usage: ddd validate [dir] [--step <name>] [--status] [--strict] [--json] [--no-notes]";

// ---------------------------------------------------------------------------
// Python value helpers.
// ---------------------------------------------------------------------------
const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
// dict.get(k, default): the default only when the key is absent.
const get = (o, k, d = null) => (has(o, k) ? o[k] : d);
// `for x in d.get(k, [])`: iterate what is there, nothing when it is not a list.
const list = (o, k) => { const v = get(o, k, []); return Array.isArray(v) ? v : []; };
const dict = (o, k) => { const v = get(o, k, {}); return isDict(v) ? v : {}; };
// Python truthiness of a JSON value.
const truthy = (v) => !(v === null || v === undefined || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && v.length === 0) || (isDict(v) && Object.keys(v).length === 0));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// sorted() on ids: codepoint order for strings, numeric for numbers.
const sorted = (arr) => [...arr].sort((a, b) => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return cmp(pyStr(a), pyStr(b));
});
// Python `x in coll` for the JSON shapes that reach it: list membership, dict keys,
// substring of a string.
function pyIn(x, coll) {
  if (Array.isArray(coll)) return coll.some((v) => pyEq(v, x));
  if (isDict(coll)) return typeof x === "string" && has(coll, x);
  if (typeof coll === "string") return typeof x === "string" && coll.includes(x);
  return false;
}
// `len(x)` for the values validate.py measures.
const pyLen = (v) => (Array.isArray(v) || typeof v === "string" ? v.length : isDict(v) ? Object.keys(v).length : 0);

// A set with Python `==` membership (1 == 1.0 == True), enough for id lists.
class PySet {
  constructor(items = []) { this.items = []; for (const x of items) this.add(x); }
  has(v) { return this.items.some((x) => pyEq(x, v)); }
  add(v) { if (!this.has(v)) this.items.push(v); return this; }
  get size() { return this.items.length; }
  equals(o) { return this.size === o.size && this.items.every((x) => o.has(x)); }
}

// setdefault on a plain object.
function setdefault(obj, key, value) {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = value;
  return obj[key];
}

// Map.setdefault(k, []).push(v)
function pushTo(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
class Report {
  constructor() { this.errors = []; this.warnings = []; this.info = []; }
  err(step, msg) { this.errors.push([step, msg]); }
  warn(step, msg) { this.warnings.push([step, msg]); }
  note(step, msg) { this.info.push([step, msg]); }
}

// ---------------------------------------------------------------------------
// Helpers (validate.py).
// ---------------------------------------------------------------------------
export function ids(items, key = "id") {
  return (Array.isArray(items) ? items : []).filter((x) => isDict(x) && get(x, key) !== null && get(x, key) !== undefined).map((x) => x[key]);
}

// datetime.fromisoformat(str(s).replace("Z", "+00:00")), kept as the parts Python
// would print back with isoformat() plus an epoch for the comparisons. Naive
// timestamps (no offset) print without one, exactly as Python does; comparing a naive
// with an aware one raises in Python, here the epoch is taken as UTC.
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,6}))?)?)?(?:([+-])(\d{2}):?(\d{2})(?::?(\d{2}))?)?$/;
export function parseTs(s) {
  if (s === null || s === undefined) s = "None";
  const m = ISO.exec(pyStr(s).replace("Z", "+00:00"));
  if (!m) return null;
  const [, Y, Mo, D, h = "00", mi = "00", sec = "00", fracRaw, sign, oh, om, os = "00"] = m;
  const frac = fracRaw ? fracRaw.padEnd(6, "0") : null;
  const micro = frac ? parseInt(frac, 10) : 0;
  let epoch = Date.UTC(+Y, +Mo - 1, +D, +h, +mi, +sec) + micro / 1000;
  if (Number.isNaN(epoch) || +Mo < 1 || +Mo > 12 || +D < 1 || +D > 31 || +h > 23 || +mi > 59 || +sec > 59) return null;
  let iso = `${Y}-${Mo}-${D}T${h}:${mi}:${sec}${micro ? "." + frac : ""}`;
  if (sign) {
    const off = (sign === "-" ? -1 : 1) * ((+oh) * 3600 + (+om) * 60 + (+os));
    epoch -= off * 1000;
    iso += `${sign}${oh}:${om}${os !== "00" ? ":" + os : ""}`;
  }
  return { epoch, iso };
}

function checkRefs(rep, step, label, values, allowed, sev = "err") {
  const set = allowed instanceof PySet ? allowed : new PySet(allowed);
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (!set.has(v)) (sev === "err" ? rep.err : rep.warn).call(rep, step, `${label}: unknown reference '${pyStr(v)}'`);
  }
}

function checkDupes(rep, step, label, values) {
  const seen = new PySet();
  const dup = new PySet();
  for (const v of values) (seen.has(v) ? dup : seen).add(v);
  for (const d of sorted(dup.items)) rep.err(step, `${label}: duplicate id '${pyStr(d)}'`);
}

// ---------------------------------------------------------------------------
// Step checks.
// ---------------------------------------------------------------------------
function checkUnderstand(rep, A) {
  const u = A.understand;
  checkDupes(rep, "understand", "goals", ids(get(u, "goals")));
  checkDupes(rep, "understand", "actors", ids(get(u, "actors")));
  const goals = ids(get(u, "goals"));
  const actors = ids(get(u, "actors"));
  const impacts = ids(get(u, "impacts"));
  for (const a of list(u, "actors")) checkRefs(rep, "understand", `actors[${pyStr(get(a, "id"))}].goals`, list(a, "goals"), goals);
  for (const i of list(u, "impacts")) {
    checkRefs(rep, "understand", `impacts[${pyStr(get(i, "id"))}].actor`, [get(i, "actor")], actors);
    checkRefs(rep, "understand", `impacts[${pyStr(get(i, "id"))}].goal`, [get(i, "goal")], goals);
  }
  for (const d of list(u, "deliverables")) checkRefs(rep, "understand", `deliverables[${pyStr(get(d, "id"))}].impact`, [get(d, "impact")], impacts);
  if (!truthy(get(u, "goals"))) rep.warn("understand", "no goals recorded — impact map has no 'why'");
}

function checkDiscover(rep, A) {
  const d = A.discover;
  const ev = ids(get(d, "events"));
  const cmd = ids(get(d, "commands"));
  const ph = ids(get(d, "phases"));
  const actors = [...ids(get(d, "actors")), ...ids(get(d, "external_systems"))];
  for (const label of ["events", "commands", "policies", "phases", "actors", "external_systems", "scenarios", "hotspots"]) {
    checkDupes(rep, "discover", label, ids(get(d, label)));
  }
  for (const e of list(d, "events")) {
    checkRefs(rep, "discover", `events[${pyStr(get(e, "id"))}].phase`, [get(e, "phase")], ph);
    checkRefs(rep, "discover", `events[${pyStr(get(e, "id"))}].triggered_by`, [get(e, "triggered_by")], cmd);
    checkRefs(rep, "discover", `events[${pyStr(get(e, "id"))}].actor`, [get(e, "actor")], actors, "warn");
  }
  for (const c of list(d, "commands")) {
    checkRefs(rep, "discover", `commands[${pyStr(get(c, "id"))}].produces`, list(c, "produces"), ev);
    checkRefs(rep, "discover", `commands[${pyStr(get(c, "id"))}].actor`, [get(c, "actor")], actors, "warn");
  }
  for (const p of list(d, "policies")) {
    checkRefs(rep, "discover", `policies[${pyStr(get(p, "id"))}].when`, [get(p, "when")], ev);
    checkRefs(rep, "discover", `policies[${pyStr(get(p, "id"))}].then`, list(p, "then"), cmd);
  }
  for (const r of list(d, "read_models")) checkRefs(rep, "discover", `read_models[${pyStr(get(r, "id"))}].informs`, [get(r, "informs")], cmd, "warn");
  checkRefs(rep, "discover", "pivotal_events", list(d, "pivotal_events"), ev);
  for (const s of list(d, "scenarios")) checkRefs(rep, "discover", `scenarios[${pyStr(get(s, "id"))}].events`, list(s, "events"), ev);
  if ("understand" in A) {
    const uActors = ids(get(A.understand, "actors"));
    for (const a of list(d, "actors")) checkRefs(rep, "discover", `actors[${pyStr(get(a, "id"))}].from_understand`, [get(a, "from_understand")], uActors, "warn");
  }
  if (!truthy(get(d, "pivotal_events"))) rep.warn("discover", "no pivotal events marked — boundaries will be harder to find in decompose");
  const flagged = new PySet(list(d, "events").filter((e) => truthy(get(e, "pivotal"))).map((e) => get(e, "id")));
  const listed = new PySet(list(d, "pivotal_events"));
  if (!flagged.equals(listed)) {
    const onlyList = sorted(listed.items.filter((x) => !flagged.has(x)));
    const onlyFlag = sorted(flagged.items.filter((x) => !listed.has(x)));
    rep.warn("discover", `pivotal_events[] and events[].pivotal disagree: only-in-list=${pyRepr(onlyList)} only-flagged=${pyRepr(onlyFlag)}`);
  }
  if (ev.length < 3) rep.warn("discover", `only ${ev.length} events — is the big-picture storm complete?`);
}

function checkDecompose(rep, A) {
  const dc = A.decompose;
  const sd = ids(get(dc, "subdomains"));
  const bc = ids(get(dc, "bounded_contexts"));
  checkDupes(rep, "decompose", "subdomains", sd);
  checkDupes(rep, "decompose", "bounded_contexts", bc);
  checkDupes(rep, "decompose", "relationships", ids(get(dc, "relationships")));
  if ("discover" in A) {
    const d = A.discover;
    const ev = ids(get(d, "events"));
    const cmd = ids(get(d, "commands"));
    const agg = ids(get(d, "aggregate_candidates"));
    for (const s of list(dc, "subdomains")) {
      checkRefs(rep, "decompose", `subdomains[${pyStr(get(s, "id"))}].events`, list(s, "events"), ev);
      checkRefs(rep, "decompose", `subdomains[${pyStr(get(s, "id"))}].commands`, list(s, "commands"), cmd);
    }
    const ownersE = new Map();
    const ownersC = new Map();
    for (const b of list(dc, "bounded_contexts")) {
      checkRefs(rep, "decompose", `bounded_contexts[${pyStr(get(b, "id"))}].owns_events`, list(b, "owns_events"), ev);
      checkRefs(rep, "decompose", `bounded_contexts[${pyStr(get(b, "id"))}].owns_commands`, list(b, "owns_commands"), cmd);
      checkRefs(rep, "decompose", `bounded_contexts[${pyStr(get(b, "id"))}].owns_aggregates`, list(b, "owns_aggregates"), agg, "warn");
      for (const e of list(b, "owns_events")) pushTo(ownersE, e, get(b, "id"));
      for (const c of list(b, "owns_commands")) pushTo(ownersC, c, get(b, "id"));
    }
    for (const e of ev) {
      const n = (ownersE.get(e) || []).length;
      if (n === 0) rep.warn("decompose", `event '${pyStr(e)}' is not owned by any bounded context`);
      else if (n > 1) rep.warn("decompose", `event '${pyStr(e)}' owned by several contexts: ${pyRepr(ownersE.get(e))}`);
    }
    for (const c of cmd) {
      const n = (ownersC.get(c) || []).length;
      if (n === 0) rep.warn("decompose", `command '${pyStr(c)}' is not owned by any bounded context`);
      else if (n > 1) rep.warn("decompose", `command '${pyStr(c)}' owned by several contexts: ${pyRepr(ownersC.get(c))}`);
    }
  }
  if ("understand" in A) {
    const caps = ids(get(A.understand, "capabilities"));
    for (const s of list(dc, "subdomains")) checkRefs(rep, "decompose", `subdomains[${pyStr(get(s, "id"))}].capabilities`, list(s, "capabilities"), caps, "warn");
  }
  for (const b of list(dc, "bounded_contexts")) checkRefs(rep, "decompose", `bounded_contexts[${pyStr(get(b, "id"))}].subdomains`, list(b, "subdomains"), sd);
  for (const r of list(dc, "relationships")) checkRefs(rep, "decompose", `relationships[${pyStr(get(r, "id"))}]`, [get(r, "upstream"), get(r, "downstream")], bc);
  if (bc.length === 1) rep.note("decompose", "single bounded context — fine for a small system; connect/organise will be light");
}

function checkStrategize(rep, A) {
  const st = A.strategize;
  const classified = list(st, "classifications").map((c) => get(c, "subdomain"));
  checkDupes(rep, "strategize", "classifications", classified);
  if ("decompose" in A) {
    const sd = ids(get(A.decompose, "subdomains"));
    checkRefs(rep, "strategize", "classifications[].subdomain", classified, sd);
    const cl = new PySet(classified);
    for (const s of sd) if (!cl.has(s)) rep.err("strategize", `subdomain '${pyStr(s)}' is not classified`);
  }
  const cores = list(st, "classifications").filter((c) => get(c, "type") === "core").map((c) => get(c, "subdomain"));
  checkRefs(rep, "strategize", "core_domains", list(st, "core_domains"), classified);
  const coreDomains = new PySet(list(st, "core_domains"));
  for (const c of cores) if (!coreDomains.has(c)) rep.warn("strategize", `'${pyStr(c)}' is typed core but missing from core_domains`);
  if (cores.length === 0) rep.warn("strategize", "no core subdomain — every system has one; if nothing differentiates, say so explicitly");
  if (cores.length > Math.max(2, Math.floor(classified.length / 2))) {
    rep.warn("strategize", `${cores.length} of ${classified.length} subdomains marked core — core should be the minority`);
  }
}

function parties(A) {
  const p = new PySet();
  if ("decompose" in A) for (const x of ids(get(A.decompose, "bounded_contexts"))) p.add(x);
  if ("discover" in A) {
    for (const x of ids(get(A.discover, "actors"))) p.add(x);
    for (const x of ids(get(A.discover, "external_systems"))) p.add(x);
  }
  if ("understand" in A) for (const x of ids(get(A.understand, "actors"))) p.add(x);
  if ("connect" in A) for (const x of ids(get(A.connect, "parties"))) p.add(x);
  return p;
}

function checkConnect(rep, A) {
  const cn = A.connect;
  const pts = parties(A);
  const contexts = new PySet("decompose" in A ? ids(get(A.decompose, "bounded_contexts")) : []);
  checkDupes(rep, "connect", "flows", ids(get(cn, "flows")));
  checkDupes(rep, "connect", "messages", ids(get(cn, "messages")));
  const msgIds = ids(get(cn, "messages"));
  const knownMsgs = new PySet(msgIds);
  if ("discover" in A) {
    for (const x of ids(get(A.discover, "events"))) knownMsgs.add(x);
    for (const x of ids(get(A.discover, "commands"))) knownMsgs.add(x);
  }
  for (const f of list(cn, "flows")) {
    for (const s of list(f, "steps")) {
      if (pts.size) checkRefs(rep, "connect", `flows[${pyStr(get(f, "id"))}].steps[${pyStr(get(s, "seq"))}].from/to`, [get(s, "from"), get(s, "to")], pts);
      checkRefs(rep, "connect", `flows[${pyStr(get(f, "id"))}].steps[${pyStr(get(s, "seq"))}].message`, [get(s, "message")], knownMsgs, "warn");
    }
    if ("discover" in A) checkRefs(rep, "connect", `flows[${pyStr(get(f, "id"))}].scenario`, [get(f, "scenario")], ids(get(A.discover, "scenarios")), "warn");
  }
  for (const m of list(cn, "messages")) {
    if (pts.size) {
      checkRefs(rep, "connect", `messages[${pyStr(get(m, "id"))}].producer`, [get(m, "producer")], pts);
      checkRefs(rep, "connect", `messages[${pyStr(get(m, "id"))}].consumers`, list(m, "consumers"), pts);
    }
    if ("discover" in A && ["command", "event"].includes(get(m, "kind"))) {
      const dIds = new PySet([...ids(get(A.discover, "events")), ...ids(get(A.discover, "commands"))]);
      if (!dIds.has(get(m, "id"))) rep.warn("connect", `messages[${pyStr(get(m, "id"))}] is a ${pyStr(get(m, "kind"))} not present in discover — new message or renamed id?`);
    }
  }
  if ("decompose" in A) {
    const rels = ids(get(A.decompose, "relationships"));
    checkRefs(rep, "connect", "integration_patterns[].relationship", list(cn, "integration_patterns").map((p) => get(p, "relationship")), rels);
    const covered = new PySet(list(cn, "integration_patterns").map((p) => get(p, "relationship")));
    for (const r of rels) if (!covered.has(r)) rep.warn("connect", `relationship '${pyStr(r)}' has no integration pattern decided`);
  }
  for (const c of list(cn, "coupling_concerns")) {
    if (contexts.size) checkRefs(rep, "connect", `coupling_concerns[${pyStr(get(c, "id"))}].contexts`, list(c, "contexts"), contexts);
  }
  for (const pty of list(cn, "parties")) {
    rep.warn("connect", `parties[${pyStr(get(pty, "id"))}] declared here — ask ddd-discover to adopt it as an ${pyStr(get(pty, "kind"))} on the next re-run`);
  }
}

function checkOrganise(rep, A, manifest) {
  const org = A.organise;
  const teams = ids(get(org, "teams"));
  const deps = ids(get(org, "deployables"));
  checkDupes(rep, "organise", "teams", teams);
  checkDupes(rep, "organise", "deployables", deps);
  const contexts = "decompose" in A ? ids(get(A.decompose, "bounded_contexts")) : [];
  const ownT = new Map();
  const ownD = new Map();
  for (const t of list(org, "teams")) {
    if (contexts.length) checkRefs(rep, "organise", `teams[${pyStr(get(t, "id"))}].owns_contexts`, list(t, "owns_contexts"), contexts);
    for (const c of list(t, "owns_contexts")) pushTo(ownT, c, get(t, "id"));
  }
  for (const d of list(org, "deployables")) {
    if (contexts.length) checkRefs(rep, "organise", `deployables[${pyStr(get(d, "id"))}].contexts`, list(d, "contexts"), contexts);
    checkRefs(rep, "organise", `deployables[${pyStr(get(d, "id"))}].team`, [get(d, "team")], teams);
    for (const c of list(d, "contexts")) pushTo(ownD, c, get(d, "id"));
  }
  for (const c of contexts) {
    if ((ownT.get(c) || []).length !== 1) rep.err("organise", `context '${pyStr(c)}' must be owned by exactly one team (found ${pyRepr(ownT.get(c) || [])})`);
    if ((ownD.get(c) || []).length !== 1) rep.err("organise", `context '${pyStr(c)}' must be in exactly one deployable (found ${pyRepr(ownD.get(c) || [])})`);
  }
  for (const i of list(org, "interactions")) checkRefs(rep, "organise", "interactions[].from/to", [get(i, "from"), get(i, "to")], teams);
  if (!pyEq(get(org, "deployable_count"), deps.length)) {
    rep.err("organise", `deployable_count=${pyStr(get(org, "deployable_count"))} but ${deps.length} deployables listed`);
  }
  const sc = dict(org, "scale_check");
  const tgt = dict(manifest, "scale_target");
  if (truthy(tgt)) {
    const lo = get(tgt, "deployables_min");
    const hi = get(tgt, "deployables_max");
    const within = lo !== null && lo !== undefined && hi !== null && hi !== undefined && lo <= deps.length && deps.length <= hi;
    if (!pyEq(get(sc, "within_target"), within)) {
      rep.warn("organise", `scale_check.within_target=${pyStr(get(sc, "within_target"))} but manifest target is ${pyStr(lo)}–${pyStr(hi)} and there are ${deps.length} deployables`);
    }
    if (!within) rep.warn("organise", `${deps.length} deployables is outside the target ${pyStr(lo)}–${pyStr(hi)} — deliberate? note it in scale_check.note`);
  }
  for (const t of list(org, "teams")) {
    if (get(t, "cognitive_load") === "high") rep.warn("organise", `team '${pyStr(get(t, "id"))}' has high cognitive load — consider splitting or a platform team`);
  }
}

function checkDefine(rep, A, dddDir) {
  const df = A.define;
  const canvases = list(df, "canvases").map((c) => get(c, "context"));
  checkDupes(rep, "define", "canvases", canvases);
  const contexts = "decompose" in A ? ids(get(A.decompose, "bounded_contexts")) : [];
  if (contexts.length) {
    checkRefs(rep, "define", "canvases[].context", canvases, contexts);
    const cv = new PySet(canvases);
    for (const c of contexts) if (!cv.has(c)) rep.err("define", `no bounded context canvas for '${pyStr(c)}'`);
  }
  const pts = parties(A);
  const knownMsgs = new PySet();
  if ("connect" in A) for (const x of ids(get(A.connect, "messages"))) knownMsgs.add(x);
  if ("discover" in A) {
    for (const x of ids(get(A.discover, "events"))) knownMsgs.add(x);
    for (const x of ids(get(A.discover, "commands"))) knownMsgs.add(x);
  }
  for (const c of list(df, "canvases")) {
    for (const side of ["inbound", "outbound"]) {
      for (const coll of list(c, side)) {
        if (pts.size) checkRefs(rep, "define", `canvases[${pyStr(get(c, "context"))}].${side}[].collaborator`, [get(coll, "collaborator")], pts, "warn");
        if (knownMsgs.size) checkRefs(rep, "define", `canvases[${pyStr(get(c, "context"))}].${side}[].messages`, list(coll, "messages").map((m) => get(m, "id")), knownMsgs);
      }
    }
    const p = get(c, "canvas_path");
    if (!pathExists(p, dddDir, A.__manifest__)) rep.warn("define", `canvas_path '${pyStr(p)}' not found on disk`);
    if ("strategize" in A && "decompose" in A) {
      const subTypes = new Map();
      for (const x of list(A.strategize, "classifications")) subTypes.set(get(x, "subdomain"), get(x, "type"));
      const bc = list(A.decompose, "bounded_contexts").find((b) => pyEq(get(b, "id"), get(c, "context"))) || null;
      if (bc) {
        const types = new PySet(list(bc, "subdomains").map((s) => (subTypes.has(s) ? subTypes.get(s) : null)).filter((t) => t !== null && t !== undefined));
        const dom = get(dict(c, "strategic_classification"), "domain");
        if (types.size && !types.has(dom)) {
          rep.warn("define", `canvas '${pyStr(get(c, "context"))}' says ${pyStr(dom)} but strategize classified its subdomains as ${pyRepr(sorted(types.items))}`);
        }
      }
    }
  }
  for (const q of list(df, "quality_attributes")) {
    if (contexts.length) checkRefs(rep, "define", "quality_attributes[].context", [get(q, "context")], [...contexts, "system"], "warn");
  }
}

// Light chain check; `ddd contracts check` is the deep gate (schemas, examples, TODOs).
function checkContracts(rep, A, dddDir) {
  const ct = A.contracts;
  const entries = list(ct, "entries");
  checkDupes(rep, "contracts", "entries", ids(entries));
  const pts = parties(A);
  // {m.get("id"): m}: a repeated id keeps its first position and takes the last value.
  const msgs = new Map();
  if ("connect" in A) for (const m of list(A.connect, "messages")) msgs.set(get(m, "id"), m);
  const covered = new PySet();
  for (const e of entries) {
    const eid = get(e, "id");
    covered.add(eid);
    if (msgs.size && !msgs.has(eid)) rep.warn("contracts", `entries[${pyStr(eid)}] is not a connect message — new contract or renamed id?`);
    if (pts.size) {
      checkRefs(rep, "contracts", `entries[${pyStr(eid)}].domain`, [get(e, "domain")], pts, "warn");
      checkRefs(rep, "contracts", `entries[${pyStr(eid)}].consumers`, list(e, "consumers"), pts);
    }
    for (const key of ["schema", "example"]) {
      if (!pathExists(get(e, key), dddDir, A.__manifest__)) rep.err("contracts", `entries[${pyStr(eid)}].${key} '${pyStr(get(e, key))}' not found on disk`);
    }
    if (!truthy(get(e, "semantics"))) rep.warn("contracts", `entries[${pyStr(eid)}] has no semantics — which business rule constrains this message?`);
  }
  if (msgs.size) {
    // Mirror ddd-contracts' own scope rule so the gate can never demand an entry the
    // skill may not create: responses belong to their request, a human-to-human edge
    // is not a software contract, and a message organise puts inside ONE deployable
    // never crosses a process boundary, so it is a function call the compiler checks
    // rather than a wire contract. Anything uncertain (organise not run, a party
    // unplaced or hosted twice, an external system or human on either end) stays
    // demanded: a contract too many is a review comment, a contract too few is an outage.
    const actors = new PySet("discover" in A ? ids(get(A.discover, "actors")) : []);
    if ("understand" in A) for (const x of ids(get(A.understand, "actors"))) actors.add(x);
    const externals = new PySet("discover" in A ? ids(get(A.discover, "external_systems")) : []);
    for (const party of list(A.connect, "parties")) {
      (get(party, "kind") === "external-system" ? externals : actors).add(get(party, "id"));
    }
    const placed = new Map();
    for (const d of list(A.organise, "deployables")) {
      for (const ctx of list(d, "contexts")) {
        if (truthy(ctx)) {
          if (!placed.has(ctx)) placed.set(ctx, new PySet());
          placed.get(ctx).add(get(d, "id"));
        }
      }
    }
    const inOneDeployable = (m) => {
      if (!placed.size) return false;
      const ends = [get(m, "producer"), ...list(m, "consumers")];
      if (ends.some((x) => !truthy(x) || actors.has(x) || externals.has(x))) return false;
      const units = ends.map((x) => placed.get(x) || new PySet());
      return units.every((u) => u.size === 1) && units.every((u) => u.equals(units[0]));
    };
    for (const [mid, m] of msgs) {
      const consumers = list(m, "consumers");
      if (!consumers.length || get(m, "kind") === "response") continue;
      if (new PySet(consumers).has(get(m, "producer"))) continue;
      if (actors.has(get(m, "producer")) && consumers.every((c) => actors.has(c))) continue; // human on both ends
      if (inOneDeployable(m)) {
        if (covered.has(mid)) {
          rep.warn("contracts", `entries[${pyStr(mid)}] is an in-process call (organise co-locates its ` +
            "parties in one deployable) — a wire contract invents a seam the " +
            "build does not have; cover it with a code-level test instead");
        }
        continue;
      }
      if (!covered.has(mid)) rep.err("contracts", `connect message '${pyStr(mid)}' crosses a party boundary but has no contract entry`);
    }
  }
}

function checkCode(rep, A, dddDir) {
  const cd = A.code;
  const designed = list(cd, "contexts").map((c) => get(c, "context"));
  checkDupes(rep, "code", "contexts", designed);
  const contexts = "decompose" in A ? ids(get(A.decompose, "bounded_contexts")) : [];
  if (contexts.length) checkRefs(rep, "code", "contexts[].context", designed, contexts);
  const patternByCtx = new Map();
  if ("strategize" in A && "decompose" in A) {
    const subCls = new Map();
    for (const x of list(A.strategize, "classifications")) subCls.set(get(x, "subdomain"), x);
    const designedSet = new PySet(designed);
    for (const b of list(A.decompose, "bounded_contexts")) {
      const cls = list(b, "subdomains").filter((s) => subCls.has(s)).map((s) => subCls.get(s));
      if (cls.some((c) => get(c, "type") === "core") && !designedSet.has(get(b, "id"))) {
        rep.err("code", `core context '${pyStr(get(b, "id"))}' has no tactical design`);
      }
      const pats = new PySet(cls.map((c) => get(c, "implementation_pattern")));
      if (pats.size === 1) patternByCtx.set(get(b, "id"), pats.items[0]);
    }
  }
  const ev = new PySet("discover" in A ? ids(get(A.discover, "events")) : []);
  const cmd = new PySet("discover" in A ? ids(get(A.discover, "commands")) : []);
  const deps = "organise" in A ? ids(get(A.organise, "deployables")) : [];
  for (const c of list(cd, "contexts")) {
    const cid = get(c, "context");
    if (deps.length) checkRefs(rep, "code", `contexts[${pyStr(cid)}].deployable`, [get(c, "deployable")], deps);
    const exp = patternByCtx.has(cid) ? patternByCtx.get(cid) : null;
    if (truthy(exp) && !pyEq(get(c, "implementation_pattern"), exp)) {
      rep.warn("code", `contexts[${pyStr(cid)}] uses ${pyStr(get(c, "implementation_pattern"))} but strategize chose ${pyStr(exp)}`);
    }
    if (["domain-model", "event-sourced-domain-model"].includes(get(c, "implementation_pattern")) && !truthy(get(c, "aggregates"))) {
      rep.warn("code", `contexts[${pyStr(cid)}] is a domain model but has no aggregates designed`);
    }
    for (const a of list(c, "aggregates")) {
      if (cmd.size) checkRefs(rep, "code", `contexts[${pyStr(cid)}].aggregates[${pyStr(get(a, "id"))}].commands`, list(a, "commands"), cmd);
      if (ev.size) checkRefs(rep, "code", `contexts[${pyStr(cid)}].aggregates[${pyStr(get(a, "id"))}].events`, list(a, "events"), ev);
      if (!truthy(get(a, "invariants"))) rep.warn("code", `aggregate '${pyStr(get(a, "id"))}' has no invariants — if nothing must be protected, it may not need to be an aggregate`);
      const p = get(a, "canvas_path");
      if (!pathExists(p, dddDir, A.__manifest__)) rep.warn("code", `canvas_path '${pyStr(p)}' not found on disk`);
    }
  }
  const hp = get(dict(cd, "handoff"), "plan_path");
  if (!pathExists(hp, dddDir, A.__manifest__)) rep.warn("code", `handoff.plan_path '${pyStr(hp)}' not found on disk`);
  for (const c of list(cd, "contexts")) {
    if (!pathExists(get(c, "design_path"), dddDir, A.__manifest__)) {
      rep.warn("code", `contexts[${pyStr(get(c, "context"))}].design_path '${pyStr(get(c, "design_path"))}' not found on disk`);
    }
  }
}

// Decisions record (design §5). Fires only when the step carries `decisions`, so an
// old workspace and every golden are untouched. Wording follows the existing
// reference and path checks so a reader meets one vocabulary.
function checkDecisions(rep, s, A, dddDir) {
  const doc = A[s];
  const decisions = list(doc, "decisions");
  checkDupes(rep, s, "decisions", ids(decisions));
  const assumptions = ids(get(doc, "assumptions"));
  const questions = ids(get(doc, "open_questions"));
  for (const d of decisions) {
    const did = get(d, "id");
    const label = `decisions[${pyStr(did)}]`;
    // No `chosen` means the decision is still open; a `chosen` must name an option.
    checkRefs(rep, s, `${label}.chosen`, [get(d, "chosen")], ids(get(d, "options")));
    const records = dict(d, "records");
    checkRefs(rep, s, `${label}.records.assumption`, [get(records, "assumption")], assumptions);
    checkRefs(rep, s, `${label}.records.open_question`, [get(records, "open_question")], questions);
    // `supersedes` is `<step>:<Did>`: the step must be loaded and hold that decision.
    const sup = get(d, "supersedes");
    if (sup !== null && sup !== undefined && !supersedesResolves(sup, A)) rep.err(s, `${label}.supersedes: unknown reference '${pyStr(sup)}'`);
    for (const o of list(d, "options")) {
      const p = get(o, "diagram");
      if (!pathExists(p, dddDir, A.__manifest__)) rep.warn(s, `${label}.options[${pyStr(get(o, "id"))}].diagram '${pyStr(p)}' not found on disk`);
    }
    // Downstream steps key off assumptions and open questions, not decisions, so a
    // strategist call recorded nowhere else is invisible to them.
    if (get(d, "made_by") === "strategist" && !truthy(get(records, "assumption")) && !truthy(get(records, "open_question"))) {
      rep.warn(s, `${label} was made by the strategist but records no assumption or open question: downstream steps key off those and will not see this call`);
    }
  }
}

function supersedesResolves(sup, A) {
  if (typeof sup !== "string") return false;
  const i = sup.indexOf(":");
  if (i < 0) return false;
  const step = sup.slice(0, i);
  const did = sup.slice(i + 1);
  if (!STEPS.includes(step) || !(step in A)) return false;
  return new PySet(ids(get(A[step], "decisions"))).has(did);
}

const CHECKS = {
  understand: checkUnderstand, discover: checkDiscover, decompose: checkDecompose,
  strategize: checkStrategize, connect: checkConnect, define: checkDefine, code: checkCode,
  contracts: checkContracts,
};

// ---------------------------------------------------------------------------
// validate(): everything main() did in Python up to the printing.
// ---------------------------------------------------------------------------
export function validate(dddDirIn, opts = {}) {
  const { step = null, strict = false, notes = true, persist = true } = opts;
  const dddDir = path.resolve(dddDirIn ?? "ddd");
  const rep = new Report();
  if (!fs.existsSync(dddDir) || !fs.statSync(dddDir).isDirectory()) {
    throw new ExitError(`error: ${dddDir} does not exist (run ddd init or ddd-understand first)`, 2);
  }

  let manifest = null;
  const mpath = path.join(dddDir, "manifest.json");
  if (fs.existsSync(mpath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(mpath, "utf8"));
      const sch = loadSchema("manifest");
      if (sch) {
        const probs = [];
        checkSchemaCore(manifest, sch, "manifest", probs);
        for (const p of probs) rep.err("manifest", p);
      }
    } catch (e) {
      // json.JSONDecodeError. The message text is Node's; the Python one was never
      // golden-recorded.
      rep.err("manifest", `invalid JSON: ${e.message}`);
    }
  } else {
    rep.warn("manifest", "manifest.json missing — run ddd init");
  }
  const mSteps = () => dict(manifest, "steps");

  // Load all step artifacts that exist.
  const A = {};
  const ts = {};
  for (const s of STEPS) {
    const p = path.join(dddDir, FOLDER[s], `${s}.json`);
    if (!fs.existsSync(p)) continue;
    try {
      A[s] = JSON.parse(fs.readFileSync(p, "utf8"));
      ts[s] = parseTs(get(A[s], "produced_at"));
    } catch (e) {
      rep.err(s, `invalid JSON in ${p}: ${e.message}`);
    }
  }

  // A manifest status of done/draft whose artifact has vanished is an error, not a
  // silent gap.
  for (const s of STEPS) {
    const st = manifest ? get(dict(mSteps(), s), "status") : null;
    if (["done", "draft", "stale"].includes(st) && !(s in A)) {
      rep.err(s, `manifest says '${st}' but ${FOLDER[s]}/${s}.json is missing — re-run ddd-${s} or mark it pending`);
    }
  }

  A.__manifest__ = manifest;
  const targets = step ? [step] : STEPS.filter((s) => s in A);
  for (const s of targets) {
    if (!(s in A)) {
      rep.err(s, `artifact ${FOLDER[s]}/${s}.json not found`);
      continue;
    }
    const sch = loadSchema(s);
    const probs = [];
    if (sch) checkSchemaCore(A[s], sch, s, probs);
    for (const p of probs) rep.err(s, p);
    if (!pyEq(get(A[s], "step"), s)) rep.err(s, `envelope.step is '${pyStr(get(A[s], "step"))}', expected '${s}'`);
    for (const md of MD_ARTIFACTS[s] || []) {
      if (!fs.existsSync(path.join(dddDir, FOLDER[s], md))) {
        rep.warn(s, `human artifact ${FOLDER[s]}/${md} is missing (the JSON is the chain, but people review the Markdown)`);
      }
    }
    if (probs.length) continue; // structure broken; skip semantic checks that would cascade
    // Predecessor present?
    const i = STEPS.indexOf(s);
    if (i > 0 && !(STEPS[i - 1] in A)) rep.warn(s, `predecessor '${STEPS[i - 1]}' artifact missing — step was bootstrapped without it?`);
    if (s === "organise") checkOrganise(rep, A, manifest);
    else if (s in CHECKS) CHECKS[s](rep, A, dddDir);
    if (has(A[s], "decisions")) checkDecisions(rep, s, A, dddDir);
    const pw = get(A[s], "plain_words");
    if (!isDict(pw)) {
      rep.warn(s, "no plain_words — the artifact has no 'In plain words' section, so the only " +
        "reviewers who can catch its mistakes are the ones who can read it (modes.md §4)");
    } else {
      const thin = ["what", "decided", "assumed", "riskiest"].filter((k) => {
        const v = get(pw, k);
        return !pyStr(truthy(v) ? v : "").trim() || pyStr(v).includes("TODO");
      });
      if (thin.length) rep.warn(s, `plain_words is unfinished: ${thin.join(", ")}`);
    }
    const stNow = get(dict(mSteps(), s), "status", "pending");
    for (const q of list(A[s], "open_questions")) {
      if (truthy(get(q, "blocking"))) {
        if (stNow === "done") {
          // modes.md section 4: a step that cannot answer a blocking question is
          // `draft`, not `done`. Marking it done hides the blocker from --status, from
          // `next:` and from the orchestrator, so every later step builds on an answer
          // nobody gave.
          rep.err(s, `marked 'done' while blocking open question ${pyStr(get(q, "id"))} is unanswered ` +
            `(${pyStr(get(q, "text"))}) — set the step to 'draft' (ddd mark) or clear the blocking flag`);
        } else {
          rep.warn(s, `blocking open question ${pyStr(get(q, "id"))}: ${pyStr(get(q, "text"))}`);
        }
      }
    }
  }

  // Staleness: a step is stale when ANY earlier step was produced after it (cascades
  // through the chain). Strict comparisons: an equal timestamp is neither stale nor
  // the new high-water mark.
  const stale = [];
  let newestUp = null;
  let newestName = null;
  for (const s of STEPS) {
    if (s in ts && ts[s]) {
      if (newestUp && ts[s].epoch < newestUp.epoch) {
        rep.warn(s, `stale: produced ${ts[s].iso} but '${newestName}' was re-produced ${newestUp.iso} — re-run ddd-${s} (hand edits: bump produced_at with ddd stamp)`);
        stale.push(s);
      }
      if (newestUp === null || ts[s].epoch > newestUp.epoch) { newestUp = ts[s]; newestName = s; }
    }
  }
  let staleWritten = false;
  if (truthy(manifest) && stale.length) {
    let changed = false;
    for (const s of stale) {
      // setdefault has a side effect the Python keeps: a stale step without a manifest
      // entry gains `{}`, and that lands on disk when another step flips.
      const e = setdefault(setdefault(manifest, "steps", {}), s, {});
      if (["done", "draft"].includes(get(e, "status"))) { e.status = "stale"; changed = true; }
    }
    if (changed) {
      manifest.updated = now();
      if (persist) { writeManifest(mpath, manifest); staleWritten = true; }
    }
  }

  // Coined terms (contract §5): a "## Coined by ddd-<step>" glossary section needs
  // coined_terms[] on that step's JSON.
  const gpath = path.join(dddDir, "glossary.md");
  if (fs.existsSync(gpath)) {
    const text = fs.readFileSync(gpath, "utf8");
    for (const m of text.matchAll(/^## Coined by ddd-([a-z]+)/gm)) {
      const st = m[1];
      if (st in A && !truthy(get(A[st], "coined_terms"))) {
        rep.warn(st, `glossary.md has a 'Coined by ddd-${st}' section but ${st}.json has no coined_terms[] — define cannot fold them in on re-run`);
      }
    }
  }

  // Status table rows.
  const rows = [];
  for (const s of STEPS) {
    const st = manifest ? dict(mSteps(), s) : {};
    rows.push({
      step: s,
      status: get(st, "status", "pending"),
      artifact: s in A,
      updated: get(st, "updated", ""),
      open_questions: s in A ? pyLen(get(A[s], "open_questions", [])) : get(st, "open_questions", 0),
      errors: rep.errors.filter((x) => x[0] === s).length,
      warnings: rep.warnings.filter((x) => x[0] === s).length,
    });
  }

  // next: the first step still to run; notes for EVERY step still to run, not only
  // `nxt`. Holding one step at `draft` used to pin `nxt` to it and starve steps 8 and
  // 9 of notes addressed to them.
  const needsRun = (s) => {
    const st = get(dict(mSteps(), s), "status", "pending");
    return ["pending", "stale", "draft"].includes(st) || (st === "done" && !(s in A));
  };
  const next = manifest ? (STEPS.find(needsRun) ?? null) : null;
  const noteBlocks = [];
  if (next && notes) {
    for (const tgt of STEPS.filter(needsRun)) {
      const found = [];
      for (const s of STEPS) {
        if (!(s in A)) continue;
        for (const n of list(A[s], "notes_for_downstream")) {
          // `tgt in (n.get("for") or [])`: a list is membership, but a bare string
          // (`"for": "define"`) is a substring test in Python, and that is what the
          // Python printed for such a note, so it is kept.
          const forVal = get(n, "for");
          if (pyIn(tgt, truthy(forVal) ? forVal : [])) found.push([s, n]);
        }
      }
      if (found.length) noteBlocks.push({ step: tgt, notes: found });
    }
  }

  const ok = rep.errors.length === 0 && !(strict && rep.warnings.length > 0);
  return {
    ddd_dir: dddDir,
    ok,
    errors: rep.errors,
    warnings: rep.warnings,
    info: rep.info,
    steps: rows,
    step,
    strict,
    manifest,
    artifacts: A,
    next,
    notes: noteBlocks,
    stale,
    staleWritten,
    exitCode: ok ? 0 : 1,
  };
}

// ---------------------------------------------------------------------------
// Rendering, byte for byte what validate.py printed.
// ---------------------------------------------------------------------------
export function renderJson(report) {
  return pyDumps({
    ddd_dir: report.ddd_dir, ok: report.ok, errors: report.errors, warnings: report.warnings,
    info: report.info, steps: report.steps,
  }, { indent: 2 }) + "\n";
}

const pad = (v, n) => pyStr(v).padEnd(n);

export function renderText(report) {
  const { manifest } = report;
  const out = [];
  out.push(`DDD workspace: ${report.ddd_dir}`);
  if (report.step) {
    const s = report.step;
    if (s in report.artifacts) {
      const nE = report.errors.filter((x) => x[0] === s).length;
      const nW = report.warnings.filter((x) => x[0] === s).length;
      out.push(`validated ${s}: ${nE} error(s), ${nW} warning(s)`);
    } else {
      out.push(`validated ${s}: artifact missing`);
    }
  }
  if (truthy(manifest)) {
    out.push(`project=${pyStr(get(manifest, "project"))} mode=${pyStr(get(manifest, "mode"))} depth=${pyStr(get(manifest, "depth"))} scale_target=${pyDumps(get(manifest, "scale_target"))}`);
  }
  out.push(`${pad("step", 12)}${pad("status", 10)}${pad("json", 6)}${pad("open Q", 8)}${pad("err", 5)}${pad("warn", 6)}updated`);
  for (const r of report.steps) {
    out.push(`${pad(r.step, 12)}${pad(r.status, 10)}${pad(r.artifact ? "yes" : "-", 6)}${pad(r.open_questions, 8)}${pad(r.errors, 5)}${pad(r.warnings, 6)}${pyStr(r.updated)}`);
  }
  if (report.next) {
    out.push(`next: ddd-${report.next}`);
    for (const block of report.notes) {
      out.push(`notes addressed to ddd-${block.step} from upstream:`);
      for (const [s, n] of block.notes) out.push(`  [${s} ${pyStr(get(n, "id"))}] (${pyStr(get(n, "kind", "other"))}) ${pyStr(get(n, "text"))}`);
    }
  }
  if (report.errors.length) {
    out.push(`\n${report.errors.length} error(s):`);
    for (const [s, m] of report.errors) out.push(`  [${s}] ${m}`);
  }
  if (report.warnings.length) {
    out.push(`\n${report.warnings.length} warning(s):`);
    for (const [s, m] of report.warnings) out.push(`  [${s}] ${m}`);
  }
  for (const [s, m] of report.info) out.push(`  (${s}) ${m}`);
  out.push("\nRESULT: " + (report.ok ? "OK" : "FAIL"));
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// CLI: validate.py's argparse surface. Usage errors are plain text on stderr with
// exit 2 (their argparse wording was never golden-recorded).
// ---------------------------------------------------------------------------
export function parseArgs(argv) {
  const a = { dddDir: "ddd", step: null, status: false, strict: false, json: false, notes: true, help: false };
  const positional = [];
  const flags = { "--status": "status", "--strict": "strict", "--json": "json", "--no-notes": "no-notes", "--step": "step" };
  let i = 0;
  let onlyPositional = false;
  while (i < argv.length) {
    const tok = argv[i++];
    if (!onlyPositional && tok === "--") { onlyPositional = true; continue; }
    if (onlyPositional || !tok.startsWith("-") || tok === "-") { positional.push(tok); continue; }
    if (tok === "-h" || tok === "--help") { a.help = true; continue; }
    let [name, inline] = tok.includes("=") ? [tok.slice(0, tok.indexOf("=")), tok.slice(tok.indexOf("=") + 1)] : [tok, undefined];
    if (!flags[name]) {
      const matches = Object.keys(flags).filter((f) => f.startsWith(name));
      if (matches.length === 1) name = matches[0];
      else if (matches.length > 1) throw new UsageError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
      else throw new UsageError(`unrecognized arguments: ${tok}`);
    }
    if (name === "--step") {
      let value = inline;
      if (value === undefined) {
        if (i >= argv.length) throw new UsageError("argument --step: expected one argument");
        value = argv[i++];
      }
      if (!STEPS.includes(value)) throw new UsageError(`argument --step: invalid choice: '${value}' (choose from ${STEPS.map((s) => `'${s}'`).join(", ")})`);
      a.step = value;
      continue;
    }
    if (inline !== undefined) throw new UsageError(`argument ${name}: ignored explicit argument '${inline}'`);
    if (name === "--no-notes") a.notes = false;
    else a[flags[name]] = true;
  }
  if (positional.length > 1) throw new UsageError(`unrecognized arguments: ${positional.slice(1).join(" ")}`);
  if (positional.length === 1) a.dddDir = positional[0];
  return a;
}

class UsageError extends Error {}

export async function main(argv, ctx = {}) {
  void ctx;
  let a;
  try {
    a = parseArgs(argv);
  } catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(`${USAGE}\nddd validate: error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if (a.help) {
    process.stdout.write(`${USAGE}\n\n  dir         workspace folder (default ./ddd)\n  --step      only validate this step's artifact (+ the references it makes upstream)\n  --no-notes  omit the "notes addressed to the next step" block\n  --status    print the step status table (also printed after validation)\n  --strict    treat warnings as errors (exit 1)\n  --json      machine-readable output\n\nExit code 0 = no errors, 1 = errors (or warnings with --strict), 2 = usage/IO problem.\n`);
    return 0;
  }
  let report;
  try {
    report = validate(a.dddDir, { step: a.step, strict: a.strict, notes: a.notes, persist: true });
  } catch (e) {
    if (e instanceof ExitError) {
      process.stderr.write(e.message + "\n");
      return e.exitCode;
    }
    throw e;
  }
  process.stdout.write(a.json ? renderJson(report) : renderText(report));
  return report.exitCode;
}

export default main;
