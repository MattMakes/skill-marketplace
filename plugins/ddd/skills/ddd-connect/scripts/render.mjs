// `ddd connect render`: render and lint ddd/05-connect/connect.json (mermaid sequence
// diagrams, message-flows.md, coupling checks). Port of render_connect.py, kept
// statement for statement because the goldens compare stdout, connect.json and
// message-flows.md byte for byte. Where the Python interpolated a value with
// str() (None -> "None", a list -> its repr) the formatters from
// shared/lib/jsonschema.mjs are used, and connect.json is written the way
// json.dump(indent=2, ensure_ascii=False) wrote it.
//
// Usage:
//   ddd connect render [<ddd-dir>] [--write-mermaid] [--write-md] [--check] [--quiet]
//
//   (no flags)        print the rendered message-flows.md to stdout
//   --write-mermaid   fill/overwrite flows[].mermaid in connect.json from flows[].steps (keeps every other key)
//   --write-md        write <ddd-dir>/05-connect/message-flows.md (overwrites)
//   --check           lint: things validate does not check
//   --quiet           accepted for parity; the Python never read it
//
// Exit 0 = ok, 1 = lint errors (with --check), 2 = usage/IO problem.
// Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import { pyDumps, pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";

const DOC = `Render and lint ddd/05-connect/connect.json: mermaid sequence diagrams, message-flows.md, coupling checks.

Usage:
  ddd connect render [<ddd-dir>] [--write-mermaid] [--write-md] [--check] [--quiet]

  (no flags)        print the rendered message-flows.md to stdout
  --write-mermaid   fill/overwrite flows[].mermaid in connect.json from flows[].steps (keeps every other key)
  --write-md        write <ddd-dir>/05-connect/message-flows.md (overwrites — reconcile hand edits first, contract §7)
  --check           lint: things ddd validate does not check (seq contiguity, sync/via consistency, sync chains,
                    chatty flows, uncovered cross-context policies, mechanism vs steps, shared db, payload size)
  --quiet           with --check: only print findings and RESULT

Reads <ddd-dir>/05-connect/connect.json (required) plus manifest, understand, discover, decompose, strategize
when present (for display names, party kinds, ownership and relationships). Zero dependencies.
Exit 0 = ok, 1 = lint errors (with --check), 2 = usage/IO problem.

Conventions rendered (see SKILL.md "Output rules"):
  arrows: sync command/query  ->>   async command/event  -)   response  -->> (or --) if async)
  labels: "<message-id> (<kind> via <via>)"; step.note -> "Note over from,to"; consecutive steps sharing
  step.when are wrapped in "opt <when> … end"; participant ids are sanitised, display names come from
  decompose/discover (or connect.json parties[] for a party discover never named); actors use the \`actor\`
  keyword; external systems are suffixed "(external)". Labels, notes and \`when\` are plain text — the renderer
  escapes \`;\` and \`#\` itself. messages[].channels[] (a secondary channel) is listed in the catalogue notes.
`;

const out = (s) => process.stdout.write(s);
const err = (s) => process.stderr.write(s);

const SAFE = /[^A-Za-z0-9_]/g;
const RESERVED = new Set(["end", "participant", "actor", "note", "loop", "alt", "else", "opt", "par", "and", "rect", "activate",
  "deactivate", "box", "critical", "option", "break", "autonumber", "title", "links", "link",
  "properties", "details", "create", "destroy", "sequencediagram"]);
const FOLDER = { understand: "01-understand", discover: "02-discover", decompose: "03-decompose", strategize: "04-strategize", connect: "05-connect" };
const VIAS = new Set(["http", "grpc", "message-bus", "in-process", "file", "db", "other"]);
const DELIVERIES = new Set(["sync", "at-most-once", "at-least-once", "exactly-once"]);

// ---------------------------------------------------------------------------
// Python value helpers (see inputs.mjs for the rationale).
// ---------------------------------------------------------------------------
const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
const get = (o, k, d = null) => (has(o, k) ? o[k] : d);
const list = (v) => (Array.isArray(v) ? v : []);
const truthy = (v) => {
  if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (isDict(v)) return Object.keys(v).length > 0;
  return Boolean(v);
};
const or = (v, d) => (truthy(v) ? v : d);
const dictOr = (v) => (isDict(v) ? v : {});
// len() of a JSON value: code points for strings.
const pyLen = (v) => (typeof v === "string" ? [...v].length : Array.isArray(v) ? v.length : isDict(v) ? Object.keys(v).length : 0);
// sorted() of a list of strings: code point order, which is what Python uses.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sortedStr = (it) => [...it].sort((a, b) => cmp(pyStr(a), pyStr(b)));
const setEq = (s, arr) => s.size === arr.length && arr.every((x) => s.has(x));
const setSub = (s, arr) => [...s].every((x) => arr.includes(x));
const setAnd = (s, arr) => [...s].some((x) => arr.includes(x));
// frozenset((a, b)) as a Map key.
const pairKey = (a, b) => [a, b].map(pyRepr).sort().join(" ");
// sorted(steps, key=seq): stable, missing seq counts as 0.
const bySeq = (steps) => [...list(steps)].sort((a, b) => Number(get(a, "seq", 0)) - Number(get(b, "seq", 0)));

function load(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function byId(items) {
  const m = new Map();
  for (const x of list(items)) {
    if (isDict(x) && get(x, "id") !== null) m.set(x.id, x);
  }
  return m;
}

function esc(text) {
  return pyStr(text).replace(/\n/g, " ").replace(/[;#]/g, (m) => (m === ";" ? "#59;" : "#35;"));
}

// Everything the renderer and linter know about the workspace.
class World {
  constructor(dddDir) {
    this.dir = dddDir;
    this.manifest = or(load(path.join(dddDir, "manifest.json")), {});
    this.und = or(load(path.join(dddDir, FOLDER.understand, "understand.json")), {});
    this.dis = or(load(path.join(dddDir, FOLDER.discover, "discover.json")), {});
    this.dec = or(load(path.join(dddDir, FOLDER.decompose, "decompose.json")), {});
    this.st = or(load(path.join(dddDir, FOLDER.strategize, "strategize.json")), {});
    this.connectPath = path.join(dddDir, FOLDER.connect, "connect.json");
    this.cn = load(this.connectPath);
    this.contexts = byId(get(this.dec, "bounded_contexts"));
    this.actors = byId(get(this.dis, "actors"));
    for (const a of list(get(this.und, "actors", []))) {
      if (!this.actors.has(get(a, "id"))) this.actors.set(get(a, "id"), a);
    }
    this.externals = byId(get(this.dis, "external_systems"));
    this.events = byId(get(this.dis, "events"));
    this.commands = byId(get(this.dis, "commands"));
    this.scenarios = byId(get(this.dis, "scenarios"));
    this.rels = byId(get(this.dec, "relationships"));
    this.ownerE = new Map();
    this.ownerC = new Map();
    for (const c of this.contexts.values()) {
      for (const e of list(get(c, "owns_events", []))) if (!this.ownerE.has(e)) this.ownerE.set(e, c.id);
      for (const k of list(get(c, "owns_commands", []))) if (!this.ownerC.has(k)) this.ownerC.set(k, c.id);
    }
    this.messages = byId(get(dictOr(this.cn), "messages"));
    this.parties = byId(get(dictOr(this.cn), "parties")); // contract §4.5: parties discover never named
  }

  kindOf(pid) {
    if (this.contexts.has(pid)) return "context";
    if (this.actors.has(pid)) return "actor";
    if (this.externals.has(pid)) return "external";
    if (this.parties.has(pid)) return get(this.parties.get(pid), "kind") === "actor" ? "actor" : "external";
    return "unknown";
  }

  nameOf(pid) {
    for (const src of [this.contexts, this.actors, this.externals, this.parties]) {
      if (src.has(pid) && truthy(get(src.get(pid), "name"))) return src.get(pid).name;
    }
    return pid;
  }

  knownParty(pid) { return this.kindOf(pid) !== "unknown"; }

  hasUpstream() { return this.contexts.size > 0; }
}

// ---------------------------------------------------------------------------
// mermaid
// ---------------------------------------------------------------------------
function aliasMap(pids) {
  const used = new Map();
  const outMap = new Map();
  for (const pid of pids) {
    let base = pyStr(pid).replace(SAFE, "_") || "p";
    if (/^[0-9]/.test(base)) base = "p_" + base;
    if (RESERVED.has(base.toLowerCase())) base = base + "_";
    let cand = base;
    let n = 2;
    while (used.has(cand) && used.get(cand) !== pid) { cand = `${base}${n}`; n += 1; }
    used.set(cand, pid);
    outMap.set(pid, cand);
  }
  return outMap;
}

function arrowFor(step) {
  const kind = get(step, "kind");
  const sync = truthy(get(step, "sync"));
  if (kind === "response") return sync ? "-->>" : "--)";
  if (kind === "event") return sync ? "->>" : "-)";
  return sync ? "->>" : "-)";
}

export function renderMermaid(flow, world) {
  const steps = bySeq(get(flow, "steps", []));
  const order = [];
  for (const s of steps) {
    for (const p of [get(s, "from"), get(s, "to")]) {
      if (p !== null && !order.includes(p)) order.push(p);
    }
  }
  const al = aliasMap(order);
  const L = ["sequenceDiagram", "  autonumber"];
  for (const p of order) {
    const kw = world.kindOf(p) === "actor" ? "actor" : "participant";
    let name = world.nameOf(p);
    if (world.kindOf(p) === "external") name = pyStr(name) + " (external)";
    L.push(`  ${kw} ${al.get(p)} as ${esc(name)}`);
  }
  let openWhen = null;
  for (const s of steps) {
    const when = get(s, "when");
    if (truthy(openWhen) && when !== openWhen) { L.push("  end"); openWhen = null; }
    if (truthy(when) && when !== openWhen) { L.push(`  opt ${esc(when)}`); openWhen = when; }
    const ind = truthy(openWhen) ? "    " : "  ";
    const via = or(get(s, "via"), "?");
    const label = `${pyStr(get(s, "message"))} (${pyStr(get(s, "kind"))} via ${pyStr(via)})`;
    L.push(`${ind}${al.get(get(s, "from"))}${arrowFor(s)}${al.get(get(s, "to"))}: ${esc(label)}`);
    if (truthy(get(s, "note"))) L.push(`${ind}Note over ${al.get(get(s, "from"))},${al.get(get(s, "to"))}: ${esc(s.note)}`);
  }
  if (truthy(openWhen)) L.push("  end");
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------
const j = (items, sep = ", ") => list(items).map(pyStr).join(sep) || "-";

// "In plain words" (envelope `plain_words`, artifact-contract.md §3), duplicated in
// every step renderer because the scripts are standalone by design.
function plainWordsBlock(doc) {
  const pw = get(dictOr(doc), "plain_words");
  if (!isDict(pw)) return [];
  const [what, decided, assumed, riskiest] = ["what", "decided", "assumed", "riskiest"].map((k) => pyStr(or(get(pw, k), "")).trim());
  if (!(what || decided || assumed || riskiest)) return [];
  const block = ["## In plain words", ""];
  if (what) block.push(what, "");
  for (const [label, value] of [["Decided", decided], ["Assumed", assumed], ["Riskiest", riskiest]]) {
    if (value) block.push(`**${label}:** ${value}`, "");
  }
  return [...block, "---", ""];
}

export function renderMd(world) {
  const cn = world.cn;
  const m = world.manifest;
  const title = or(get(m, "title"), or(get(m, "project"), "project"));
  const L = [`# Message flows — ${pyStr(title)}`, "",
    `_Step 5 of the DDD chain (connect) · produced ${pyStr(get(cn, "produced_at"))} · mode ${pyStr(get(cn, "mode"))} · depth ${pyStr(get(cn, "depth"))} · ` +
    `inputs: ${j(get(cn, "inputs"))}_`, "",
    "Rendered from `connect.json` by `ddd connect render`. The JSON is the chain " +
    "(contract §7): edit it and re-render rather than editing tables here.", ""];
  const scale = or(get(m, "scale_target"), {});
  if (truthy(scale)) {
    L.push(`**Scale target:** ${pyStr(get(scale, "deployables_min"))}–${pyStr(get(scale, "deployables_max"))} deployables, ` +
      `${pyStr(get(scale, "teams"))} team(s)${truthy(get(scale, "notes")) ? " — " + pyStr(scale.notes) : ""}. ` +
      "Mechanisms below assume the distances recorded per relationship; `ddd-organise` confirms or flips them.", "");
  }
  L.push("## How to read the diagrams", "",
    "| Arrow | Meaning |", "|---|---|",
    "| `->>` solid, filled head | synchronous command or query — the sender waits for the answer |",
    "| `-)` solid, open head | asynchronous message — an event published (or a command queued); sender continues |",
    "| `-->>` dotted | response to a query or command |",
    "| `opt …` | steps that only happen under that condition |", "",
    "Labels read `message-id (kind via mechanism)`. `via in-process` means both parties live in the same deployable " +
    "(in-memory event or direct call); `message-bus` means an outbox-published event; `http`/`grpc` a network call.", "");
  if (truthy(get(cn, "parties"))) {
    L.push("## Parties declared in this step (discover never named them — ddd-discover should adopt them)", "");
    for (const p of list(cn.parties)) {
      L.push(`- \`${pyStr(get(p, "id"))}\` ${pyStr(get(p, "name"))} (${pyStr(get(p, "kind"))})` + (truthy(get(p, "description")) ? ` — ${pyStr(p.description)}` : ""));
    }
    L.push("");
  }
  L.push("## Flows", "");
  for (const f of list(get(cn, "flows", []))) {
    const sc = get(f, "scenario");
    const scTxt = truthy(sc) ? ` (scenario ${pyStr(sc)}: ${pyStr(get(dictOr(world.scenarios.get(sc)), "name", ""))})` : " (no discover scenario — derived flow)";
    L.push(`### ${pyStr(get(f, "id"))} — ${pyStr(get(f, "name"))}${scTxt}`);
    L.push("");
    if (truthy(get(f, "summary"))) L.push(pyStr(f.summary), "");
    if (truthy(get(f, "policies"))) L.push(`Policies realised: ${j(f.policies)}`, "");
    const mer = or(get(f, "mermaid"), null) ?? renderMermaid(f, world);
    L.push("```mermaid", pyStr(mer), "```", "");
    L.push("| # | From | To | Message | Kind | Sync | Via |", "|---|---|---|---|---|---|---|");
    for (const s of bySeq(get(f, "steps", []))) {
      L.push(`| ${pyStr(get(s, "seq"))} | ${pyStr(get(s, "from"))} | ${pyStr(get(s, "to"))} | \`${pyStr(get(s, "message"))}\` | ${pyStr(get(s, "kind"))} | ` +
        `${truthy(get(s, "sync")) ? "yes" : "no"} | ${pyStr(get(s, "via"))} |`);
    }
    L.push("");
    if (truthy(get(f, "failure_paths"))) {
      L.push("Failure paths:");
      for (const fp of list(f.failure_paths)) L.push(`- ${pyStr(fp)}`);
      L.push("");
    }
    if (truthy(get(f, "notes"))) L.push(pyStr(f.notes), "");
  }
  L.push("## Message catalogue", "",
    "| Message | Kind | Producer | Consumers | Payload | Delivery | Contract type | Notes |",
    "|---|---|---|---|---|---|---|---|");
  for (const msg of list(get(cn, "messages", []))) {
    const notes = [];
    if (truthy(get(msg, "version"))) notes.push(`v${pyStr(msg.version)}`);
    if (truthy(get(msg, "idempotency"))) notes.push(`idempotency: ${pyStr(msg.idempotency)}`);
    if (truthy(get(msg, "response_payload"))) notes.push(`response: ${j(msg.response_payload)}`);
    for (const ch of list(or(get(msg, "channels"), []))) {
      notes.push(`also via ${pyStr(get(ch, "via"))} (${truthy(get(ch, "sync")) ? "sync" : "async"}, ${pyStr(get(ch, "delivery", "?"))})` +
        (truthy(get(ch, "note")) ? `: ${pyStr(ch.note)}` : ""));
    }
    if (truthy(get(msg, "description"))) notes.push(pyStr(msg.description));
    L.push(`| \`${pyStr(get(msg, "id"))}\` | ${pyStr(get(msg, "kind"))} | ${pyStr(get(msg, "producer"))} | ${j(get(msg, "consumers"))} | ` +
      `${j(get(msg, "payload"))} | ${pyStr(get(msg, "delivery", "-"))} | ${pyStr(get(msg, "contract", "-"))} | ${notes.join("; ") || "-"} |`);
  }
  L.push("");
  L.push("## Integration decisions (one per context-map relationship)", "",
    "| Relationship | Upstream → downstream | Pattern | Mechanism | Assumed distance | Rationale |",
    "|---|---|---|---|---|---|");
  for (const ip of list(get(cn, "integration_patterns", []))) {
    const r = dictOr(world.rels.get(get(ip, "relationship")));
    L.push(`| ${pyStr(get(ip, "relationship"))} | ${pyStr(get(r, "upstream", "?"))} → ${pyStr(get(r, "downstream", "?"))} | ${pyStr(get(r, "pattern", "?"))} | ` +
      `${pyStr(get(ip, "mechanism"))} | ${pyStr(get(ip, "assumed_distance", "-"))} | ${pyStr(get(ip, "rationale", ""))} |`);
  }
  L.push("");
  if (truthy(get(cn, "sagas"))) {
    L.push("## Long-running processes (sagas / process managers)", "");
    for (const sg of list(cn.sagas)) {
      L.push(`### ${pyStr(get(sg, "id"))} — ${pyStr(get(sg, "name"))} (${pyStr(get(sg, "style", "?"))}, owner: ${pyStr(get(sg, "owner", "?"))})`);
      if (truthy(get(sg, "trigger"))) L.push(`Trigger: \`${pyStr(sg.trigger)}\``);
      for (const stp of list(get(sg, "steps", []))) L.push(`- ${pyStr(stp)}`);
      if (truthy(get(sg, "compensations"))) {
        L.push("Compensations:");
        for (const c of list(sg.compensations)) L.push(`- ${pyStr(c)}`);
      }
      if (truthy(get(sg, "timeouts"))) L.push(`Timeouts: ${pyStr(sg.timeouts)}`);
      L.push("");
    }
  }
  L.push("## Coupling concerns", "");
  if (!truthy(get(cn, "coupling_concerns"))) L.push("None recorded.");
  for (const c of list(get(cn, "coupling_concerns", []))) {
    const extra = [];
    if (truthy(get(c, "smell"))) extra.push(`smell: ${pyStr(c.smell)}`);
    if (truthy(get(c, "flows"))) extra.push(`flows: ${j(c.flows)}`);
    if (truthy(get(c, "mitigation"))) extra.push(`mitigation: ${pyStr(c.mitigation)}`);
    if (truthy(get(c, "saga_candidate"))) extra.push("saga / process-manager candidate — design it at deep depth");
    L.push(`- **${pyStr(get(c, "id"))}** (${pyStr(get(c, "severity"))}) — ${pyStr(get(c, "text"))} — contexts: ${j(get(c, "contexts"))}` +
      (extra.length ? ` — ${extra.join("; ")}` : ""));
  }
  L.push("");
  if (truthy(get(cn, "deprecated"))) {
    L.push("## Deprecated (removed on a re-run; ids are never reused)", "");
    for (const dp of list(cn.deprecated)) {
      L.push(`- \`${pyStr(get(dp, "id"))}\` (${pyStr(get(dp, "collection", "?"))}) — ${pyStr(get(dp, "reason", ""))}` + (truthy(get(dp, "since")) ? ` — since ${pyStr(dp.since)}` : ""));
    }
    L.push("");
  }
  L.push("## Assumptions", "");
  for (const a of list(get(cn, "assumptions", []))) {
    L.push(`- **${pyStr(get(a, "id"))}** (${pyStr(get(a, "confidence"))}) ${pyStr(get(a, "text"))}`);
  }
  if (!truthy(get(cn, "assumptions"))) L.push("None.");
  L.push("", "## Open questions", "");
  for (const q of list(get(cn, "open_questions", []))) {
    L.push(`- **${pyStr(get(q, "id"))}**${truthy(get(q, "blocking")) ? " (blocking)" : ""} ${pyStr(get(q, "text"))}` +
      (truthy(get(q, "owner")) ? ` — owner: ${pyStr(q.owner)}` : ""));
  }
  if (!truthy(get(cn, "open_questions"))) L.push("None.");
  L.push("", "---", "Next step: `/ddd-organise` groups contexts into teams and deployables using the coupling concerns and sync chains above.", "");
  L.splice(2, 0, ...plainWordsBlock(cn));
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// lint
// ---------------------------------------------------------------------------
class Lint {
  constructor() { this.errors = []; this.warnings = []; this.info = []; }
  err(m) { this.errors.push(m); }
  warn(m) { this.warnings.push(m); }
  note(m) { this.info.push(m); }
}

// Who depends on whom: caller depends on callee for commands/queries; consumer depends on producer for events.
function dependency(step) {
  const k = get(step, "kind");
  if (k === "event") return [get(step, "to"), get(step, "from")];
  if (k === "command" || k === "query") return [get(step, "from"), get(step, "to")];
  return null;
}

// A Python list of ids is printed with repr(): ['F1', 'F2'].
const reprList = (arr) => pyRepr(arr);

export function lint(world) {
  const L = new Lint();
  const cn = world.cn;
  const flows = list(get(cn, "flows", []));
  const msgs = list(get(cn, "messages", []));
  const ids = flows.map((f) => get(f, "id"));
  if (ids.length !== new Set(ids.map(pyRepr)).size) L.err("flows: duplicate ids");
  for (const fid of ids) {
    if (!/^F\d+$/.test(pyStr(fid))) L.warn(`flows[${pyStr(fid)}]: id should look like F1, F2 …`);
  }
  const mids = msgs.map((m) => get(m, "id"));
  if (mids.length !== new Set(mids.map(pyRepr)).size) L.err("messages: duplicate ids");
  for (const cid of list(get(cn, "coupling_concerns", [])).map((c) => get(c, "id"))) {
    if (!/^CC\d+$/.test(pyStr(cid))) L.warn(`coupling_concerns[${pyStr(cid)}]: id should look like CC1, CC2 …`);
  }
  const discIds = new Set([...world.events.keys(), ...world.commands.keys()]);
  const allSteps = [];
  const pairSteps = new Map();
  const depEdges = new Map();
  const edgeKey = (a, b) => `${pyRepr(a)} ${pyRepr(b)}`;
  const stepMsgSync = new Map();
  for (const f of flows) {
    const fid = get(f, "id");
    const steps = bySeq(get(f, "steps", []));
    if (!steps.length) { L.err(`flows[${pyStr(fid)}]: no steps`); continue; }
    const seqs = steps.map((s) => get(s, "seq"));
    const contiguous = seqs.every((v, i) => typeof v === "number" && v === i + 1);
    if (!contiguous) L.err(`flows[${pyStr(fid)}]: seq must be contiguous 1..${steps.length} (got ${reprList(seqs)}) — autonumber relies on it`);
    if (truthy(get(f, "scenario")) && world.scenarios.size && !world.scenarios.has(f.scenario)) {
      L.warn(`flows[${pyStr(fid)}].scenario '${pyStr(f.scenario)}' is not a discover scenario id (use null for derived flows)`);
    }
    const nMsgs = steps.filter((s) => get(s, "kind") !== "response").length;
    if (nMsgs > 9) L.warn(`flows[${pyStr(fid)}]: ${nMsgs} messages — ddd-crew advises 5–9 per diagram; split the scenario or collapse chatty round trips`);
    const ctxs = new Set();
    for (const s of steps) for (const p of [get(s, "from"), get(s, "to")]) if (world.kindOf(p) === "context") ctxs.add(p);
    if (ctxs.size > 5) L.warn(`flows[${pyStr(fid)}]: touches ${ctxs.size} contexts — chatty; is a boundary wrong or is this two scenarios?`);
    let chain = [];
    let best = [];
    const seenRequests = new Set();
    for (const s of steps) {
      const fr = get(s, "from");
      const to = get(s, "to");
      const kind = get(s, "kind");
      const via = get(s, "via");
      const sync = truthy(get(s, "sync"));
      const tag = `flows[${pyStr(fid)}].steps[${pyStr(get(s, "seq"))}]`;
      allSteps.push([fid, s]);
      if (world.hasUpstream()) {
        for (const p of [fr, to]) {
          if (!world.knownParty(p)) L.err(`${tag}: '${pyStr(p)}' is not a bounded context, actor or external-system id`);
        }
      }
      if (fr === to) L.warn(`${tag}: from == to ('${pyStr(fr)}') — internal step; flows show messages between parties`);
      if (!world.messages.has(get(s, "message"))) {
        L.warn(`${tag}: message '${pyStr(get(s, "message"))}' has no catalogue entry in messages[] (define/code build ports from the catalogue)`);
      }
      if (sync && via === "message-bus") L.err(`${tag}: sync=true via message-bus — a bus is not synchronous; use http/grpc/in-process or sync=false`);
      if (kind === "event" && sync) L.warn(`${tag}: an event marked sync — events are one-way notifications; make it async or model a command/query`);
      if (kind === "query" && !sync) L.note(`${tag}: async query — fine only if the answer is a replicated read model; otherwise make it sync`);
      if (kind === "command" && !sync && via === "in-process") L.note(`${tag}: async in-process command = background job; make sure something persists it`);
      if (via === "db" && world.kindOf(fr) === "context" && world.kindOf(to) === "context") {
        L.err(`${tag}: via db between two bounded contexts — never share a database between contexts (use events or an API)`);
      }
      if (kind === "response") {
        if (!seenRequests.has(get(s, "message"))) {
          L.warn(`${tag}: response '${pyStr(get(s, "message"))}' has no preceding query/command with that id in this flow`);
        }
      } else {
        seenRequests.add(get(s, "message"));
      }
      if ((kind === "command" || kind === "query") && sync) {
        if (chain.length && get(chain[chain.length - 1], "to") === fr) chain.push(s);
        else chain = [s];
        if (chain.length > best.length) best = [...chain];
      } else if (kind !== "response") {
        chain = [];
      }
      if (kind !== "response") {
        if (world.kindOf(fr) === "context" && world.kindOf(to) === "context") {
          const k = pairKey(fr, to);
          if (!pairSteps.has(k)) pairSteps.set(k, []);
          pairSteps.get(k).push(s);
        }
        const d = dependency(s);
        if (d && world.kindOf(d[0]) === "context" && world.kindOf(d[1]) === "context" && d[0] !== d[1]) {
          const k = edgeKey(d[0], d[1]);
          if (!depEdges.has(k)) depEdges.set(k, { a: d[0], b: d[1], flows: new Set(), kinds: new Set() });
          depEdges.get(k).flows.add(fid);
          depEdges.get(k).kinds.add(kind);
        }
        if (world.kindOf(fr) === "context" && world.kindOf(to) === "context" && fr !== to && world.rels.size &&
          ![...world.rels.values()].some((r) => pairKey(get(r, "upstream"), get(r, "downstream")) === pairKey(fr, to))) {
          L.warn(`${tag}: message between '${pyStr(fr)}' and '${pyStr(to)}' but the context map has no relationship for that pair — hidden integration; add it in decompose or record a concern`);
        }
      }
      const mk = get(s, "message");
      if (!stepMsgSync.has(mk)) stepMsgSync.set(mk, new Set());
      stepMsgSync.get(mk).add(sync);
    }
    if (best.length >= 3) {
      const p = [get(best[0], "from"), ...best.map((s) => get(s, "to"))].map(pyStr).join(" → ");
      L.warn(`flows[${pyStr(fid)}]: synchronous chain of ${best.length} hops (${p}) — the first caller waits on every hop; break it with an event or a read model`);
    }
  }
  // messages
  for (const m of msgs) {
    const mid = get(m, "id");
    const kind = get(m, "kind");
    const tag = `messages[${pyStr(mid)}]`;
    if (world.hasUpstream()) {
      if (!world.knownParty(get(m, "producer"))) L.err(`${tag}.producer '${pyStr(get(m, "producer"))}' unknown`);
      for (const c of list(get(m, "consumers", []))) {
        if (!world.knownParty(c)) L.err(`${tag}.consumers '${pyStr(c)}' unknown`);
      }
    }
    if (!truthy(get(m, "consumers"))) L.warn(`${tag}: no consumers — who reacts to it? (drop it or name the consumer)`);
    if ((kind === "command" || kind === "event") && discIds.size && !discIds.has(mid)) {
      L.warn(`${tag}: ${pyStr(kind)} not in discover — reuse the discover id, or add it upstream and record an assumption`);
    }
    if ((kind === "query" || kind === "response") && discIds.has(mid)) {
      L.err(`${tag}: query id collides with a discover command/event id — queries get new kebab-case ids`);
    }
    if (!truthy(get(m, "delivery"))) L.warn(`${tag}: delivery not set (sync | at-most-once | at-least-once | exactly-once)`);
    if (kind === "event" && get(m, "delivery") === "sync") L.warn(`${tag}: event with delivery=sync — events are asynchronous notifications`);
    if (get(m, "delivery") === "exactly-once") L.note(`${tag}: exactly-once is a platform+idempotency claim; at-least-once + idempotent consumer is the honest default`);
    if (get(m, "delivery") === "at-least-once" && !truthy(get(m, "idempotency"))) {
      L.note(`${tag}: at-least-once without an \`idempotency\` note — say how consumers de-duplicate`);
    }
    const channels = list(or(get(m, "channels"), []));
    channels.forEach((ch, i) => {
      if (!VIAS.has(get(ch, "via"))) L.warn(`${tag}.channels[${i}]: via '${pyStr(get(ch, "via"))}' is not one of ${reprList(sortedStr(VIAS))}`);
      if (!DELIVERIES.has(get(ch, "delivery"))) L.warn(`${tag}.channels[${i}]: delivery '${pyStr(get(ch, "delivery"))}' is not one of ${reprList(sortedStr(DELIVERIES))}`);
      if (truthy(get(ch, "sync")) && get(ch, "via") === "message-bus") L.err(`${tag}.channels[${i}]: sync=true via message-bus`);
    });
    const deliveries = new Set([get(m, "delivery"), ...channels.map((ch) => get(ch, "delivery"))]); // primary + secondary channels
    const used = stepMsgSync.get(mid);
    if (used && used.size && truthy(get(m, "delivery"))) {
      if (used.has(true) && !deliveries.has("sync") && (kind === "command" || kind === "query")) {
        L.warn(`${tag}: used synchronously in a flow but delivery is '${pyStr(m.delivery)}' (a second channel goes in channels[])`);
      }
      if (setEq(used, [false]) && setEq(deliveries, ["sync"])) L.warn(`${tag}: only used asynchronously but delivery is 'sync'`);
    }
    if (pyLen(or(get(m, "payload"), [])) > 8) L.note(`${tag}: payload has ${pyLen(m.payload)} fields — data-hungry? publish what consumers need, not the whole aggregate`);
    if (kind === "event" && world.contexts.has(get(m, "producer")) && truthy(world.ownerE.get(mid)) && world.ownerE.get(mid) !== get(m, "producer")) {
      L.warn(`${tag}: producer '${pyStr(get(m, "producer"))}' but decompose says '${pyStr(world.ownerE.get(mid))}' owns this event`);
    }
  }
  // bidirectional dependencies
  const seenPairs = new Set();
  for (const info of depEdges.values()) {
    const { a, b } = info;
    const backKey = edgeKey(b, a);
    if (depEdges.has(backKey) && !seenPairs.has(pairKey(a, b))) {
      seenPairs.add(pairKey(a, b));
      const back = depEdges.get(backKey);
      const fids = sortedStr(new Set([...info.flows, ...back.flows]));
      const pat = new Set([...world.rels.values()].filter((r) => pairKey(get(r, "upstream"), get(r, "downstream")) === pairKey(a, b)).map((r) => get(r, "pattern")));
      if (pat.has("partnership")) continue;
      if (setSub(info.kinds, ["event"]) && setSub(back.kinds, ["event"])) {
        L.note(`mutual event subscription between '${pyStr(a)}' and '${pyStr(b)}' (flows ${reprList(fids)}) — fine as an async request/reply of outcomes; check neither side needs the other's model`);
      } else {
        L.warn(`bidirectional dependency between '${pyStr(a)}' and '${pyStr(b)}' (flows ${reprList(fids)}) — commands/queries both ways; the context map says ${pat.size ? reprList(sortedStr(pat)) : "no relationship"}; break the cycle (events one way) or declare a partnership`);
      }
    }
  }
  // integration patterns vs relationships and steps
  const ips = list(get(cn, "integration_patterns", []));
  const covered = new Set();
  for (const ip of ips) {
    const rid = get(ip, "relationship");
    const mech = get(ip, "mechanism");
    const r = world.rels.has(rid) ? world.rels.get(rid) : null;
    if (world.rels.size && !r) { L.err(`integration_patterns[${pyStr(rid)}]: unknown decompose relationship`); continue; }
    covered.add(rid);
    if (mech === "shared-db") L.err(`integration_patterns[${pyStr(rid)}]: shared-db — never share a database between bounded contexts`);
    if (!r) continue;
    const steps = pairSteps.get(pairKey(get(r, "upstream"), get(r, "downstream"))) || [];
    const vias = new Set(steps.map((s) => get(s, "via")));
    const syncs = new Set(steps.map((s) => truthy(get(s, "sync"))));
    if (!steps.length) {
      if (get(r, "pattern") !== "separate-ways") {
        L.note(`integration_patterns[${pyStr(rid)}]: no message between ${pyStr(get(r, "upstream"))} and ${pyStr(get(r, "downstream"))} in any flow — add a flow or say why in rationale`);
      }
    } else {
      if (mech === "in-process-call" && setAnd(vias, ["http", "grpc", "message-bus"])) {
        L.warn(`integration_patterns[${pyStr(rid)}]: mechanism in-process-call but flow steps use ${reprList(sortedStr(vias))}`);
      }
      if (mech === "async-events" && setEq(syncs, [true])) {
        L.warn(`integration_patterns[${pyStr(rid)}]: mechanism async-events but every step between these contexts is synchronous`);
      }
      if (mech === "sync-api" && !syncs.has(true)) {
        L.warn(`integration_patterns[${pyStr(rid)}]: mechanism sync-api but no synchronous step between these contexts`);
      }
      if (mech === "batch" && get(r, "pattern") !== "separate-ways") {
        L.note(`integration_patterns[${pyStr(rid)}]: batch with runtime messages in flows — intended?`);
      }
    }
    const ad = get(ip, "assumed_distance");
    if (!(ad === null || ad === "same-deployable" || ad === "separate-deployable")) {
      L.warn(`integration_patterns[${pyStr(rid)}]: assumed_distance should be same-deployable | separate-deployable`);
    }
    if (mech === "in-process-call" && ad === "separate-deployable") {
      L.err(`integration_patterns[${pyStr(rid)}]: in-process-call across separate deployables is impossible`);
    }
    if ((mech === "async-events" || mech === "sync-api") && ad === "same-deployable" && vias.size && setSub(vias, ["in-process"])) {
      L.note(`integration_patterns[${pyStr(rid)}]: ${pyStr(mech)} inside one deployable — fine if it is an in-memory bus / internal API; say so`);
    }
  }
  for (const rid of world.rels.keys()) {
    if (!covered.has(rid)) L.warn(`relationship '${pyStr(rid)}' has no integration pattern decided`);
  }
  // cross-context policy coverage
  for (const p of list(get(world.dis, "policies", []))) {
    const wo = world.ownerE.has(get(p, "when")) ? world.ownerE.get(get(p, "when")) : null;
    for (const t of list(get(p, "then", []))) {
      const to = world.ownerC.has(t) ? world.ownerC.get(t) : null;
      if (!truthy(wo) || !truthy(to) || wo === to) continue;
      const ok = allSteps.some(([, s]) => (get(s, "message") === get(p, "when") || get(s, "message") === t) && get(s, "from") === wo && get(s, "to") === to && get(s, "kind") !== "response");
      if (!ok) {
        L.warn(`policy '${pyStr(get(p, "id"))}' (whenever ${pyStr(get(p, "when"))} @${pyStr(wo)} → ${pyStr(t)} @${pyStr(to)}) is not realised in any flow — it is an integration point by definition`);
      }
    }
  }
  // parties declared here (contract §4.5)
  for (const p of list(get(cn, "parties", []))) {
    const pid = get(p, "id");
    if (!(get(p, "kind") === "actor" || get(p, "kind") === "external-system")) L.err(`parties[${pyStr(pid)}]: kind must be actor | external-system`);
    if (world.contexts.has(pid) || world.actors.has(pid) || world.externals.has(pid)) {
      L.warn(`parties[${pyStr(pid)}]: already an upstream id — drop the parties[] entry and use the upstream one`);
    } else {
      L.note(`parties[${pyStr(pid)}] (${pyStr(get(p, "kind"))}) declared here — ddd validate warns until ddd-discover adopts it (expected)`);
    }
  }
  // coupling concerns
  const depth = or(get(cn, "depth"), get(world.manifest, "depth"));
  for (const c of list(get(cn, "coupling_concerns", []))) {
    for (const x of list(get(c, "contexts", []))) {
      if (world.contexts.size && !world.contexts.has(x)) {
        L.err(`coupling_concerns[${pyStr(get(c, "id"))}].contexts '${pyStr(x)}' is not a bounded context id (name actors/external systems in the text instead)`);
      }
    }
    if (truthy(get(c, "saga_candidate")) && depth === "deep") {
      L.note(`coupling_concerns[${pyStr(get(c, "id"))}]: saga_candidate at deep depth — design it in sagas[] and draw its failure path`);
    }
  }
  const ranges = { light: [2, 3], standard: [4, 7], deep: [5, 9] };
  const [lo, hi] = has(ranges, depth) ? ranges[depth] : [4, 7];
  if (flows.length < lo) L.note(`${flows.length} flow(s) for depth ${pyStr(depth)} — expected ${lo}–${hi}; fine only if the system has fewer boundary-crossing scenarios`);
  if (flows.length > hi) L.note(`${flows.length} flows for depth ${pyStr(depth)} — expected ${lo}–${hi}; keep the ones that cross boundaries`);
  for (const q of list(get(cn, "open_questions", []))) {
    if (truthy(get(q, "blocking"))) L.note(`blocking open question ${pyStr(get(q, "id"))} — mark the step 'draft', not 'done'`);
  }
  return L;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const USAGE = "usage: ddd connect render [-h] [--write-mermaid] [--write-md] [--check] [--quiet] [ddd_dir]\n";
const FLAGS = { "--write-mermaid": "writeMermaid", "--write-md": "writeMd", "--check": "check", "--quiet": "quiet" };

function parse(argv) {
  const a = { dddDir: null, writeMermaid: false, writeMd: false, check: false, quiet: false };
  let onlyPositional = false;
  for (const t of argv) {
    if (!onlyPositional && t === "--") { onlyPositional = true; continue; }
    if (!onlyPositional && t.startsWith("-") && t.length > 1) {
      if (t === "-h" || t === "--help") return { help: true };
      // argparse accepts any unambiguous prefix of a long option.
      const matches = Object.keys(FLAGS).filter((f) => f === t || (t.length >= 3 && f.startsWith(t)));
      const exact = matches.find((f) => f === t);
      if (exact) a[FLAGS[exact]] = true;
      else if (matches.length === 1) a[FLAGS[matches[0]]] = true;
      else if (matches.length > 1) throw new Error(`ambiguous option: ${t} could match ${matches.join(", ")}`);
      else throw new Error(`unrecognized arguments: ${t}`);
      continue;
    }
    if (a.dddDir !== null) throw new Error(`unrecognized arguments: ${t}`);
    a.dddDir = t;
  }
  if (a.dddDir === null) a.dddDir = "ddd";
  return a;
}

export function main(argv) {
  let a;
  try {
    a = parse(argv);
  } catch (e) {
    err(`${USAGE}ddd connect render: error: ${e.message}\n`);
    return 2;
  }
  if (a.help) { out(USAGE + "\n" + DOC); return 0; }
  const d = path.resolve(a.dddDir);
  const world = new World(d);
  if (world.cn === null) {
    err(`error: ${world.connectPath} not found — draft connect.json first\n`);
    return 2;
  }
  for (const f of list(get(world.cn, "flows", []))) f.mermaid = renderMermaid(f, world);
  if (a.writeMermaid) {
    fs.writeFileSync(world.connectPath, pyDumps(world.cn, { indent: 2, ensureAscii: false }) + "\n");
    out(`wrote flows[].mermaid for ${list(get(world.cn, "flows", [])).length} flow(s) → ${world.connectPath}\n`);
  }
  const md = renderMd(world);
  if (a.writeMd) {
    const p = path.join(d, FOLDER.connect, "message-flows.md");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, md);
    out(`wrote ${p}\n`);
  }
  let rc = 0;
  if (a.check) {
    const r = lint(world);
    for (const m of r.errors) out(`  ERROR ${m}\n`);
    for (const m of r.warnings) out(`  WARN  ${m}\n`);
    for (const m of r.info) out(`  info  ${m}\n`);
    out(`RESULT: ${r.errors.length ? "FAIL" : "OK"} — ${r.errors.length} error(s), ${r.warnings.length} warning(s), ${r.info.length} note(s)\n`);
    rc = r.errors.length ? 1 : 0;
  }
  if (!(a.writeMermaid || a.writeMd || a.check)) out(md + "\n");
  return rc;
}

export default main;
