// `ddd contracts prefill [dir] [--mode interactive|auto] [--depth light|standard|deep] [--no-schema-refresh]`
//
// Port of contracts.py `cmd_prefill`. Drafts 09-contracts/contracts.json plus schema
// skeletons and example stubs from the upstream JSON, deterministically: judgement fields
// are TODO. Re-runs merge: ids, filled fields and entityStatus are kept, provenance is
// refreshed, nothing filled is overwritten. A payload name already present in a schema (at
// any depth, however it was later shaped) is never re-added; --no-schema-refresh switches
// the top-up off entirely.
//
// Exit 0 ok, 2 usage/IO (connect/define missing, corrupt JSON, directory missing).
import fs from "node:fs";
import path from "node:path";
import {
  DELIVERIES, ENTITY_STATUS, FOLDER, IoError, KINDS, PATTERNS, VIAS, asDict, asList, canvasRelationship,
  channelNames, chooseVia, crossParty, discoverLookup, exists, findRelationship, firstPattern, get,
  glossaryAnchor, has, isDict, ljust, loadJson, loadJsonOrNull, loadWorkspace, or, partySets, payloadName,
  propertyNames, pyDumps, pyStr, relPrefix, runVerb, saveJson, sortedEntries, strip, teamsOwning, titlecase,
  truthy, uniq, wrapperPattern,
} from "./lib.mjs";

const USAGE = "[ddd_dir] [--mode {interactive,auto}] [--depth {light,standard,deep}] [--no-schema-refresh]";
const OPTIONS = {
  "--mode": { dest: "mode", choices: ["interactive", "auto"] },
  "--depth": { dest: "depth", choices: ["light", "standard", "deep"] },
  "--no-schema-refresh": { dest: "no_schema_refresh", flag: true },
};

const ENUMS = { kind: KINDS, entityStatus: ENTITY_STATUS, pattern: PATTERNS, delivery: DELIVERIES, via: VIAS };

// A value counts as filled unless it is None, a blank or TODO string, or a list with nothing
// filled in it. False, 0 and {} are filled: somebody wrote them.
export function isFilled(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return Boolean(strip(v)) && !v.includes("TODO");
  if (Array.isArray(v)) return v.length > 0 && v.some(isFilled);
  return true;
}

// Keep ids, filled fields and entityStatus; refresh provenance; fill only what is TODO/absent.
// A value that is no longer valid for its enum counts as unfilled: an entry drafted before the
// ingest mapping existed carries `pattern: "external-api"`, and preserving it would leave a
// workspace that can never pass `check`. Key order follows Python's dict: an existing key keeps
// its slot, a new one is appended.
export function mergeEntry(old, nu) {
  for (const [k, v] of Object.entries(nu)) {
    if (k === "provenance") old[k] = v;
    else if (has(ENUMS, k) && !ENUMS[k].includes(get(old, k)) && ENUMS[k].includes(v)) old[k] = v;
    else if (!has(old, k) || !isFilled(get(old, k))) old[k] = v;
  }
  // `via` + `channels` are one decision: whichever transport survived as primary is not "also
  // via", and every other transport upstream knows about is. Merged per `via` rather than
  // replaced, so a `delivery` or `note` somebody filled in on a channel by hand outlives the redraft.
  const known = new Map();
  for (const c of [{ via: get(nu, "via") }, ...asList(get(nu, "channels")), ...asList(get(old, "channels"))]) {
    if (!isDict(c) || !VIAS.includes(get(c, "via"))) continue;
    if (!known.has(c.via)) known.set(c.via, {});
    const target = known.get(c.via);
    for (const [k, v] of Object.entries(c)) if (v !== null && v !== undefined) target[k] = v;
  }
  known.delete(get(old, "via"));
  if (known.size) old.channels = [...known.values()];
  else delete old.channels;
  return old;
}

function draftEntry(info, A, rel, names, externals, actors) {
  const contexts = new Set(names.keys());
  const { producer, consumers } = info;
  const d = or(discoverLookup(A, info.id), {});
  const domain = contexts.has(producer) ? producer : (consumers.find((c) => contexts.has(c)) ?? "TODO");
  const rid = findRelationship(A, producer, consumers);
  const ext = uniq([producer, ...consumers].filter((p) => externals.has(p)));
  const hum = uniq([producer, ...consumers].filter((p) => actors.has(p)));
  let relPattern = null;
  if (truthy(rid)) {
    const r = asList(get(asDict(get(A, "decompose")), "relationships")).find((x) => isDict(x) && get(x, "id") === rid) ?? {};
    relPattern = get(r, "pattern");
  }
  // connect's `contract` is mapped on ingest: ui/user-interaction -> open-host-service,
  // external-api -> the pattern that wraps that system. Anything still out of enum
  // (big-ball-of-mud) is a judgement call, not a silent coercion.
  let pattern = firstPattern(get(info, "pattern"));
  if (!truthy(pattern) && ext.length) pattern = wrapperPattern(A, domain, ext[0]);
  if (!truthy(pattern) && hum.length) pattern = or(firstPattern(canvasRelationship(A, domain, hum[0])), "open-host-service");
  pattern = or(pattern, or(firstPattern(relPattern), "TODO"));
  // inherited follows the party kind, not the pattern string: an external system on either end
  // owns the wire contract, unless we are the one publishing it and they conform.
  const wePublish = ext.length > 0 && !externals.has(producer) && ["published-language", "open-host-service"].includes(pattern);
  const inherited = ext.length > 0 && !wePublish;
  const owners = inherited ? ext : or(teamsOwning(A, [domain]), ["TODO"]);
  const reviewers = or(teamsOwning(A, [producer, ...consumers].filter((c) => contexts.has(c))), ["TODO"]);
  const [via, otherChannels] = chooseVia(info);
  const semantics = truthy(get(info, "idempotency")) ? [info.idempotency] : ["TODO"];
  const entry = {
    id: info.id,
    kind: or(get(info, "kind"), "TODO"),
    name: or(get(info, "name"), or(get(d, "name"), titlecase(info.id))),
    description: or(get(info, "description"), or(strip(pyStr(or(get(d, "description"), ""))), "TODO")),
    entityStatus: "Draft",
    version: "1.0",
    domain,
    owners,
    consumers,
    reviewers,
    pattern,
    delivery: or(get(info, "delivery"), "TODO"),
    via,
    schema: `${rel}/09-contracts/schemas/${info.id}.schema.json`,
    example: `${rel}/09-contracts/examples/${info.id}.json`,
    semantics,
    termsOfUse: "TODO",
    glossary: or(glossaryAnchor(A, rel, domain, names), `${rel}/glossary.md`),
    provenance: { connect: info.id, relationship: rid, flows: info.flows },
  };
  if (otherChannels.length) entry.channels = otherChannels;
  if (inherited) entry.inherited = true;
  // which way does this cross the ACL: a call we make, or their message arriving
  if (inherited) entry.direction = externals.has(producer) ? "inbound" : "outbound";
  if (hum.length) entry.client = hum[0];
  return entry;
}

// schemas/<mid>.request.schema.json / examples/<mid>.response.json, by convention beside the
// main pair: a standalone file the other team can run through their own validator.
function companionPath(outDir, mid, suffix, kind) {
  const [sub, ext] = kind === "schema" ? ["schemas", ".schema.json"] : ["examples", ".json"];
  return path.join(outDir, sub, `${mid}.${suffix}${ext}`);
}

function schemaSkeleton(rel, sid, title, desc, props) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${rel}/09-contracts/schemas/${sid}.schema.json`,
    title,
    description: desc,
    type: "object",
    additionalProperties: false,
    required: [],
    properties: Object.fromEntries(props.map(([n, p]) => [n, { description: propSeed(n, p) }])),
  };
}

// Seed description for a property drafted from a connect payload entry. Compound notation
// (`slaWindow{from, to}`) is kept as a hint; the sub-shape is the author's to design.
function propSeed(name, raw) {
  return strip(pyStr(raw)) === name ? "TODO" : `TODO — connect payload notation: ${pyStr(raw)}`;
}

// [(payload_name(p), p)] with unnamed entries dropped. Python's dict comprehension over the
// pairs makes a repeated name collapse to one property; Object.fromEntries does the same.
const namedProps = (raw) => raw.map((p) => [payloadName(p), p]).filter(([n]) => truthy(n));

export function cmdPrefill(a, dddDir, print) {
  const A = loadWorkspace(dddDir);
  const missing = ["connect", "define"].filter((s) => !has(A, s));
  if (missing.length) {
    throw new IoError(`error: missing required input(s): ${missing.map((s) => `${FOLDER[s]}/${s}.json`).join(", ")} ` +
      `— run ddd-${missing[0]} first`);
  }
  const manifest = asDict(get(A, "manifest"));
  const rel = relPrefix(A, dddDir);
  const mode = or(a.mode, or(get(manifest, "mode"), "auto"));
  const depth = or(a.depth, or(get(manifest, "depth"), "standard"));
  const { xp, inproc } = crossParty(A);
  const { names, externals, actors } = partySets(A);
  const outDir = path.join(dddDir, "09-contracts");
  fs.mkdirSync(path.join(outDir, "schemas"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "examples"), { recursive: true });
  const cpath = path.join(outDir, "contracts.json");
  const inputs = ["connect", "define", "organise", "decompose", "discover"].filter((s) => has(A, s)).map((s) => `${rel}/${FOLDER[s]}/${s}.json`);
  if (get(A, "glossary_text") !== null) inputs.push(`${rel}/glossary.md`);
  let doc = null;
  if (exists(cpath)) {
    try {
      doc = loadJson(cpath);
    } catch (e) {
      throw new IoError(`error: invalid JSON in ${cpath}: ${e.message}`);
    }
  }
  if (doc === null) {
    doc = { schema_version: 1, step: "contracts", produced_by: "ddd-contracts",
      produced_at: "1970-01-01T00:00:00Z", mode, depth, inputs,
      assumptions: [], open_questions: [], entries: [] };
  } else {
    doc.inputs = inputs;
    for (const [k, v] of [["assumptions", []], ["open_questions", []], ["entries", []]]) if (!has(doc, k)) doc[k] = v;
  }
  const docEntries = asList(get(doc, "entries", [])).filter(isDict);
  const byId = new Map();
  for (const e of docEntries) byId.set(get(e, "id"), e);
  const entries = [];
  let newN = 0;
  let keptN = 0;
  for (const [mid, info] of xp) {
    const nu = draftEntry(info, A, rel, names, externals, actors);
    if (byId.has(mid)) {
      const old = byId.get(mid);
      byId.delete(mid);
      entries.push(mergeEntry(old, nu));
      keptN++;
    } else {
      entries.push(nu);
      newN++;
    }
  }
  const leftovers = docEntries.filter((e) => byId.has(get(e, "id")));
  entries.push(...leftovers);
  doc.entries = entries;
  saveJson(cpath, doc);
  let wroteS = 0;
  let wroteE = 0;
  let refreshed = 0;
  const entryOf = (mid) => entries.find((e) => get(e, "id") === mid);
  for (const [mid, info] of xp) {
    const entry = entryOf(mid);
    const isQuery = get(entry, "kind") === "query";
    const params = [...asList(or(info.payload, []))]; // a query's `payload` is its request parameters
    const raw = isQuery
      ? [...asList(or(info.response_payload, []))]
      : or(info.payload, [...asList(or(get(or(discoverLookup(A, mid), {}), "data"), []))]);
    const props = namedProps(raw);
    const spath = path.join(outDir, "schemas", `${mid}.schema.json`);
    if (exists(spath)) {
      const sch = loadJsonOrNull(spath);
      if (isDict(sch) && !a.no_schema_refresh) {
        if (!has(sch, "properties")) sch.properties = {};
        const have = propertyNames(sch); // at any depth: a payload already shaped stays shaped
        const added = props.filter(([n]) => !have.has(n));
        if (added.length && !isDict(sch.properties)) sch.properties = {};
        for (const [n, p] of added) sch.properties[n] = { description: propSeed(n, p) };
        if (added.length) {
          saveJson(spath, sch);
          refreshed += added.length;
        }
      }
    } else {
      let desc = or(get(entry, "description"), "TODO");
      if (isQuery) { // a query contract describes the RESPONSE; connect's payload is the request
        if (!isFilled(desc)) {
          desc = props.length ? "TODO — describe the answer this query returns." : "TODO — design the response payload; connect does not carry it.";
        }
        if (params.length) {
          desc = pyStr(desc);
          if (desc && !".!?".includes(desc.slice(-1))) desc += ".";
          desc += ` The caller's parameters are their own contract: schemas/${mid}.request.schema.json.`;
        }
      }
      // No `parameters`/`response` key here: neither is a JSON Schema keyword, so a validator
      // ignores it and everything written under it is unenforced. The request and the reply get
      // their own files below, which are checked like any other schema.
      saveJson(spath, schemaSkeleton(rel, mid, or(get(entry, "name"), titlecase(mid)), desc, props));
      wroteS++;
    }
    const epath = path.join(outDir, "examples", `${mid}.json`);
    if (!exists(epath)) {
      const stub = Object.fromEntries(props.map(([n]) => [n, "TODO"]));
      saveJson(epath, Object.keys(stub).length ? stub
        : { TODO: isQuery ? "replace with a realistic response payload" : "replace with realistic values" });
      wroteE++;
    }
    // A query's main schema is its answer, so its request is the companion; a command that
    // replies with something carries that reply as a `response` companion. Both halves get
    // checked, which the old top-level annotation keys never were.
    const extra = [];
    if (isQuery && params.length) {
      extra.push(["request", params.map((x) => [payloadName(x), x]), "What the caller sends. Named in connect as this query's payload."]);
    } else if (!isQuery && truthy(info.response_payload)) {
      extra.push(["response", asList(info.response_payload).map((x) => [payloadName(x), x]), "What the producer sends back. Part of this contract, not a separate message."]);
    }
    for (const [suffix, cpropsRaw, cdesc] of extra) {
      const cprops = cpropsRaw.filter(([n]) => truthy(n));
      const csp = companionPath(outDir, mid, suffix, "schema");
      if (!exists(csp)) {
        saveJson(csp, schemaSkeleton(rel, `${mid}.${suffix}`, `${or(get(entry, "name"), titlecase(mid))} (${suffix})`, cdesc, cprops));
        wroteS++;
      }
      const cep = companionPath(outDir, mid, suffix, "example");
      if (!exists(cep)) {
        const stub = Object.fromEntries(cprops.map(([n]) => [n, "TODO"]));
        saveJson(cep, Object.keys(stub).length ? stub : { TODO: `replace with a realistic ${suffix}` });
        wroteE++;
      }
    }
  }
  // index
  print(`prefill: ${cpath} — ${entries.length} entrie(s) (${newN} new, ${keptN} merged, ` +
    `${leftovers.length} without a cross-party match), ${wroteS} schema skeleton(s), ` +
    `${wroteE} example stub(s), ${refreshed} propertie(s) added to existing schemas`);
  for (const e of entries) {
    const eid = get(e, "id");
    if (!xp.has(eid)) continue;
    const arrow = `${pyStr(xp.get(eid).producer)} → ${asList(or(get(e, "consumers"), [])).map(pyStr).join(", ")}`;
    let tag = truthy(get(e, "inherited")) ? "  [inherited]" : "";
    tag += truthy(get(e, "direction")) ? `  [${pyStr(e.direction)} external]` : "";
    tag += truthy(get(e, "client")) ? `  [client: ${pyStr(e.client)}]` : "";
    const also = truthy(get(e, "channels")) ? ` (+ ${channelNames(e.channels)})` : "";
    print(`  ${ljust(pyStr(eid), 16)} ${ljust(pyStr(get(e, "kind")), 8)} ${ljust(arrow, 32)} ${ljust(pyStr(get(e, "pattern")), 22)} ` +
      `${pyStr(get(e, "delivery"))} via ${pyStr(get(e, "via"))}${also}${tag}`);
  }
  if (inproc.size) {
    print(`in-process, so deliberately NOT drafted (${inproc.size}): organise puts producer and every ` +
      "consumer in one deployable, so the call compiles and a versioned wire schema would invent " +
      "a seam the build does not have. Cover each with a code-level test, or split the deployable " +
      "in ddd-organise if the seam is real:");
    for (const [mid, i] of sortedEntries(inproc)) {
      print(`  ${ljust(pyStr(mid), 24)} ${pyStr(i.producer)} → ${i.consumers.map(pyStr).join(", ")}   [in ${pyStr(i.deployable)}]`);
    }
  }
  const flowOnly = [...xp].filter(([, info]) => info.source === "flow").map(([mid]) => mid);
  if (flowOnly.length) {
    print("flow-only (no connect.messages[] entry, so no payload/delivery/contract from upstream): " +
      `${flowOnly.join(", ")} — design them here and log an open question owned by ddd-connect ` +
      "asking for them in the catalogue");
  }
  // A channel note on the transport that WON as primary has no home in the entry: `via` and
  // `delivery` take the enum values and the sentence is left over. It is often the only place a
  // deployment decision was written down, so surface it here rather than let it evaporate.
  const primaryOf = (mid) => get(or(entryOf(mid), {}), "via");
  const seeded = [...xp].filter(([mid, info]) => truthy(get(info, "idempotency")) || truthy(get(info, "description")) ||
    asList(info.channels).some((c) => isDict(c) && get(c, "via") === primaryOf(mid) && truthy(get(c, "note"))));
  if (seeded.length) {
    print("judgement hints — what connect already carries (seeded into the entry; sharpen it, never drop it):");
    for (const [mid, info] of seeded) {
      if (truthy(get(info, "description"))) print(`  [${mid}] description: ${info.description}`);
      if (truthy(get(info, "idempotency"))) print(`  [${mid}] idempotency → semantics: ${info.idempotency}`);
      const primary = primaryOf(mid);
      for (const c of asList(info.channels)) {
        if (isDict(c) && get(c, "via") === primary && truthy(get(c, "note"))) {
          print(`  [${mid}] connect's note on the primary transport (${pyStr(primary)}) has no field ` +
            `of its own — put it in description or semantics: ${pyStr(c.note)}`);
        }
      }
    }
  }
  const handling = new Set(entries.filter((e) => xp.has(get(e, "id"))).map((e) => get(e, "domain")));
  const decisions = new Map();
  for (const c of asList(get(asDict(get(A, "define")), "canvases"))) {
    if (!isDict(c)) continue;
    const cid = get(c, "context");
    if (handling.has(cid) && truthy(get(c, "business_decisions"))) decisions.set(cid, c.business_decisions);
  }
  if (decisions.size) {
    print("judgement hints — the handling context's business decisions (define.json); pick the ones that constrain each message:");
    for (const [cid, ds] of decisions) for (const d of asList(ds)) print(`  [${pyStr(cid)}] ${pyStr(d)}`);
  }
  const todo = entries.reduce((n, e) => n + pyDumps(e, { ensureAscii: false }).split("TODO").length - 1, 0);
  print("left to fill (judgement): field types/formats/required-ness in schemas/, example values, " +
    `description, semantics, termsOfUse — ${todo} TODO marker(s) in entries; then ddd contracts render + check`);
  return 0;
}

export function main(argv, ctx) {
  return runVerb({ argv, ctx, verb: "prefill", options: OPTIONS, usage: USAGE, body: cmdPrefill });
}
