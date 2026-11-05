// `ddd contracts check [dir] [--strict] [--json]`: the deep gate for step 9.
//
// Port of contracts.py `cmd_check`. Every message that crosses a party boundary in
// connect.json has a contract entry; every entry has its fields, its ids resolve to
// connect/decompose/organise, no TODO survives; every schema uses only keywords the
// validator evaluates (an ignored key looks like a guarantee and is not one); every
// example validates, every negative example fails, request/response companions are
// checked like any other pair; contracts.md was rendered from the current entries.
//
// Exit 0 = no errors, 1 = errors (or warnings with --strict), 2 = usage/IO. A missing or
// corrupt contracts.json is a gate failure (1), not an IO error: the gate ran and found
// the deliverable absent.
import fs from "node:fs";
import path from "node:path";
import { checkSchema, hasConditional, vocabProblems } from "../../../shared/lib/jsonschema.mjs";
import {
  COMPANIONS, DELIVERIES, ENTITY_STATUS, IoError, KINDS, LIST_KEYS, MARK_RE, PATTERNS, REQUIRED_KEYS, Report,
  SYNC_VIAS, VIAS, asDict, asList, crossParty, entriesHash, exists, get, glossaryHeadings, has, ids, isDict,
  isKebab, loadJson, loadWorkspace, or, partySets, pyDumps, pyIn, pyRepr, pyStr, readText, resolvePath,
  runVerb, slug, sorted, sortedEntries, strip, truthy,
} from "./lib.mjs";

const USAGE = "[ddd_dir] [--strict] [--json]";
const OPTIONS = {
  "--strict": { dest: "strict", flag: true },
  "--json": { dest: "json", flag: true },
};

const scanTodo = (text) => (text || "").includes("TODO");
const joinIds = (xs) => asList(xs).map(pyStr).join(", ");
// `x in (None, "", [])`
const blank = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

// Load and lint one schema file. Returns the parsed schema, or null if it is unusable.
function verifySchemaFile(rep, eid, label, spath, sdisp) {
  if (scanTodo(readText(spath))) rep.err(`[${eid}] ${label}schema ${sdisp} still contains TODO`);
  let schema;
  try {
    schema = loadJson(spath);
  } catch (ex) {
    rep.err(`[${eid}] ${label}schema ${sdisp} is not valid JSON: ${ex.message}`);
    return null;
  }
  if (!isDict(schema)) {
    rep.err(`[${eid}] ${label}schema ${sdisp} is not an object`);
    return null;
  }
  const probs = [];
  vocabProblems(schema, "schema", probs);
  for (const x of probs) rep.err(`[${eid}] ${label}${sdisp} ${x}`);
  if (get(schema, "type") !== "object") {
    rep.warn(`[${eid}] ${label}schema root type is '${pyStr(get(schema, "type"))}' — a payload is usually an object`);
  }
  const props = or(get(schema, "properties"), {});
  if (truthy(props) && !truthy(get(schema, "required"))) {
    rep.warn(`[${eid}] ${label}schema has properties but required is empty — is really nothing mandatory?`);
  }
  if (!has(schema, "additionalProperties")) {
    rep.warn(`[${eid}] ${label}schema does not set additionalProperties — close the payload (false) or open it deliberately`);
  }
  for (const [k, sub] of Object.entries(asDict(props))) {
    if (isDict(sub) && !["type", "enum", "const", "$ref", "anyOf", "oneOf", "allOf"].some((x) => has(sub, x))) {
      rep.warn(`[${eid}] ${label}property '${k}' has no type (and no enum/const/$ref) — the example check cannot constrain it`);
    }
  }
  return schema;
}

function verifyExampleFile(rep, eid, label, epath, edisp, schema) {
  if (scanTodo(readText(epath))) rep.err(`[${eid}] ${label}example ${edisp} still contains TODO`);
  let example;
  try {
    example = loadJson(epath);
  } catch (ex) {
    rep.err(`[${eid}] ${label}example ${edisp} is not valid JSON: ${ex.message}`);
    return;
  }
  if (isDict(schema)) {
    const probs = [];
    checkSchema(example, schema, "example", probs);
    for (const x of probs) rep.err(`[${eid}] ${label}example does not validate against its schema: ${x}`);
  }
}

// Negative fixtures. Each case MUST fail its schema, which is the only proof a conditional
// rule is encoded rather than merely described. Returns the number of cases checked.
function verifyInvalidFile(rep, eid, label, ipath, idisp, schema) {
  let cases;
  try {
    cases = loadJson(ipath);
  } catch (ex) {
    rep.err(`[${eid}] ${label}negative examples ${idisp} are not valid JSON: ${ex.message}`);
    return 0;
  }
  const shaped = Array.isArray(cases) && cases.length > 0 && cases.every((c) =>
    isDict(c) && typeof get(c, "why") === "string" && strip(c.why) && has(c, "payload"));
  if (!shaped) {
    rep.err(`[${eid}] ${label}${idisp} must be a non-empty list of ` +
      '{"why": "<the rule this payload breaks>", "payload": <the payload>} objects');
    return 0;
  }
  if (!isDict(schema)) return 0;
  cases.forEach((c, i) => {
    const probs = [];
    checkSchema(c.payload, schema, "payload", probs);
    if (!probs.length) {
      rep.err(`[${eid}] ${label}negative example ${i} ('${c.why}') VALIDATES against the schema — ` +
        "the rule is described but not encoded; use anyOf/oneOf/if/const/not so it actually fails");
    }
  });
  return cases.length;
}

export function cmdCheck(a, dddDir, print) {
  const rep = new Report();
  const A = loadWorkspace(dddDir);
  if (!has(A, "connect")) throw new IoError(`error: 05-connect/connect.json not found under ${dddDir}`);
  const manifest = asDict(get(A, "manifest"));
  const outDir = path.join(dddDir, "09-contracts");
  const cpath = path.join(outDir, "contracts.json");
  if (!exists(cpath)) {
    rep.err("09-contracts/contracts.json missing — run ddd contracts prefill first");
    return finish(rep, a, 0, 0, print);
  }
  let doc;
  try {
    doc = loadJson(cpath);
  } catch (e) {
    rep.err(`invalid JSON in ${cpath}: ${e.message}`);
    return finish(rep, a, 0, 0, print);
  }
  const entries = asList(or(get(doc, "entries", []), [])).filter(isDict);
  const { contexts, externals, actors } = partySets(A);
  const { xp, inproc } = crossParty(A);
  if (inproc.size) {
    rep.note(`${inproc.size} message(s) stay inside one deployable, so no wire contract is demanded ` +
      "(cover them with code-level tests): " +
      sortedEntries(inproc).map(([m, i]) => `${m} (${i.producer} → ${joinIds(i.consumers)}, in ${i.deployable})`).join(", "));
  }
  const teams = new Set(ids(get(asDict(get(A, "organise")), "teams")));
  const rels = new Set(ids(get(asDict(get(A, "decompose")), "relationships")));
  const flowIds = new Set(ids(get(A.connect, "flows")));
  const msgIds = new Set(ids(get(A.connect, "messages")));
  const flowMsgs = new Set();
  for (const f of asList(get(asDict(A.connect), "flows"))) {
    for (const s of asList(get(asDict(f), "steps"))) flowMsgs.add(get(asDict(s), "message"));
  }
  const parties = new Set([...contexts, ...externals, ...actors]);
  const knownOwner = new Set([...teams, ...externals]);
  const glossaryRequired = get(A, "glossary_text") !== null;
  const glossSlugs = new Set(glossaryHeadings(or(get(A, "glossary_text"), "")).map(slug));
  const byId = new Map();
  const seen = new Set();
  for (const e of entries) {
    const eid = get(e, "id");
    if (seen.has(eid)) rep.err(`duplicate entry id '${pyStr(eid)}'`);
    seen.add(eid);
    byId.set(eid, e);
  }
  for (const [mid, info] of xp) {
    if (!byId.has(mid)) rep.err(`cross-party message '${mid}' (${info.producer} → ${joinIds(info.consumers)}) has no contract entry`);
  }
  for (const e of entries) {
    const eid = or(get(e, "id"), "?");
    const req = [...REQUIRED_KEYS, ...(glossaryRequired ? ["glossary"] : [])];
    for (const k of req) if (blank(get(e, k))) rep.err(`[${eid}] missing required field '${k}'`);
    for (const k of LIST_KEYS) {
      const v = get(e, k);
      if (v !== null && (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !strip(x)))) {
        rep.err(`[${eid}] ${k} must be a list of non-empty strings`);
      }
    }
    for (const [k, enumList] of [["kind", KINDS], ["entityStatus", ENTITY_STATUS], ["pattern", PATTERNS],
      ["delivery", DELIVERIES], ["via", VIAS]]) {
      const v = get(e, k);
      if (v !== null && !pyIn(v, enumList)) rep.err(`[${eid}] ${k} '${pyStr(v)}' not in ${pyRepr(enumList)}`);
    }
    if (truthy(get(e, "id")) && !isKebab(pyStr(e.id))) rep.warn(`[${eid}] id is not a kebab-case slug`);
    const version = get(e, "version");
    if (version !== null && !/^\d+\.\d+$/.test(pyStr(version))) rep.warn(`[${eid}] version '${pyStr(version)}' is not MAJOR.MINOR`);
    const direction = get(e, "direction");
    if (direction !== null && direction !== "inbound" && direction !== "outbound") {
      rep.err(`[${eid}] direction '${pyStr(direction)}' is not inbound|outbound`);
    }
    const chans = get(e, "channels");
    if (chans !== null) {
      if (!Array.isArray(chans) || chans.some((c) => !isDict(c) || !pyIn(get(c, "via"), VIAS))) {
        rep.err(`[${eid}] channels must be a list of {via, sync?, delivery?, note?} objects ` +
          `whose \`via\` is one of ${pyRepr(VIAS)} — a bare transport name drops what that ` +
          "channel promises (contract §4.9)");
      } else {
        const seenVia = new Set();
        for (const c of chans) {
          const v = c.via;
          if (v === get(e, "via")) rep.warn(`[${eid}] channels repeats the primary via '${v}'`);
          if (seenVia.has(v)) rep.err(`[${eid}] channels lists '${v}' twice`);
          seenVia.add(v);
          const extra = Object.keys(c).filter((k) => !["via", "sync", "delivery", "note"].includes(k));
          if (extra.length) rep.err(`[${eid}] channels[${v}]: unknown key(s) ${pyRepr(sorted(extra))}`);
          const delivery = get(c, "delivery");
          if (delivery !== null && !pyIn(delivery, DELIVERIES)) {
            rep.err(`[${eid}] channels[${v}].delivery '${pyStr(delivery)}' not in ${pyRepr(DELIVERIES)}`);
          }
          const sync = get(c, "sync");
          if (sync !== null && typeof sync !== "boolean") rep.err(`[${eid}] channels[${v}].sync must be true or false`);
          if (delivery === null) {
            rep.warn(`[${eid}] channels[${v}] has no delivery — a second transport is a ` +
              "second promise; say what this one guarantees or drop it");
          }
          if (truthy(sync) && !SYNC_VIAS.includes(v)) {
            rep.warn(`[${eid}] channels[${v}] is marked sync but '${v}' is not a synchronous transport`);
          }
        }
      }
    }
    const client = get(e, "client");
    if (truthy(client) && actors.size && !actors.has(client)) rep.err(`[${eid}] client '${pyStr(client)}' is not a human actor`);
    if (get(e, "delivery") === "sync" && get(e, "via") === "file") {
      rep.warn(`[${eid}] 'sync via file' contradicts itself — make the synchronous channel primary ` +
        "(the file transfer goes in channels[]) or say the delivery is not sync");
    }
    if (scanTodo(pyDumps(e, { ensureAscii: false }))) rep.err(`[${eid}] entry still contains TODO`);
    if (contexts.length && !contexts.includes(get(e, "domain"))) {
      rep.err(`[${eid}] domain '${pyStr(get(e, "domain"))}' is not a bounded context in decompose`);
    }
    for (const role of ["owners", "reviewers"]) {
      for (const o of asList(or(get(e, role), []))) {
        if (knownOwner.size && !knownOwner.has(o)) rep.err(`[${eid}] ${role}: unknown id '${pyStr(o)}' (not an organise team or an external system)`);
      }
    }
    for (const c of asList(or(get(e, "consumers"), []))) {
      if (parties.size && !parties.has(c)) rep.err(`[${eid}] consumers: unknown id '${pyStr(c)}' (not a context, actor or external system)`);
    }
    const pv = asDict(or(get(e, "provenance"), {}));
    const pvConnect = get(pv, "connect");
    if (truthy(pvConnect) && !(msgIds.has(pvConnect) || flowMsgs.has(pvConnect))) {
      rep.err(`[${eid}] provenance.connect '${pyStr(pvConnect)}' not found in connect messages/flows`);
    }
    const pvRel = get(pv, "relationship");
    if (pvRel !== null && rels.size && !rels.has(pvRel)) {
      rep.err(`[${eid}] provenance.relationship '${pyStr(pvRel)}' not in decompose relationships`);
    }
    for (const fl of asList(or(get(pv, "flows"), []))) {
      if (flowIds.size && !flowIds.has(fl)) rep.err(`[${eid}] provenance.flows: unknown flow '${pyStr(fl)}'`);
    }
    if (xp.has(eid)) {
      const want = xp.get(eid).consumers;
      const got = asList(or(get(e, "consumers"), []));
      if (pyRepr(sorted(got)) !== pyRepr(sorted(want))) {
        rep.warn(`[${eid}] consumers ${pyRepr(get(e, "consumers"))} differ from connect's ${pyRepr(want)} — drift? ` +
          "(prefill keeps filled fields; align by hand or deliberately diverge)");
      }
    } else if (inproc.has(eid)) {
      rep.warn(`[${eid}] producer and consumers all sit inside deployable ` +
        `'${pyStr(inproc.get(eid).deployable)}' (organise), so this call never crosses a process ` +
        "boundary — a wire contract invents a seam the build does not have. Cover it with a " +
        "code-level test instead, or split the deployable in ddd-organise if the seam is real");
    } else {
      rep.warn(`[${eid}] has no matching cross-party message in connect — set entityStatus Deprecated ` +
        "and record it in the envelope's deprecated[], or re-run ddd-connect");
    }
    if (xp.has(eid)) {
      const partyIds = [xp.get(eid).producer, ...xp.get(eid).consumers];
      if (partyIds.some((p) => actors.has(p)) && !truthy(get(e, "client"))) {
        rep.warn(`[${eid}] a human actor is on one end but no 'client' is named`);
      }
      if (truthy(get(e, "inherited")) && !truthy(get(e, "direction"))) {
        rep.warn(`[${eid}] inherited but 'direction' (inbound = their message arriving, ` +
          "outbound = a call we make) is unset");
      }
    }
    const inh = truthy(get(e, "inherited"));
    const extOwner = asList(or(get(e, "owners"), [])).some((o) => externals.has(o));
    if (inh && externals.size && !extOwner) rep.warn(`[${eid}] inherited is true but no owner is an external system`);
    if (!inh && extOwner) rep.warn(`[${eid}] an external system owns this contract — should it be inherited: true?`);
    const g = get(e, "glossary");
    if (truthy(g) && pyStr(g).includes("#")) {
      const anchor = pyStr(g).slice(pyStr(g).indexOf("#") + 1);
      if (glossSlugs.size && !glossSlugs.has(anchor)) rep.warn(`[${eid}] glossary anchor '#${anchor}' not found in glossary.md`);
    }
    // schema + example, then the request/response companions and the negative fixtures.
    // Every half of the contract is validated by the same code: a half nobody validates is a
    // half nobody can rely on, however confidently the description states the rule.
    const sp = resolvePath(get(e, "schema"), dddDir, manifest);
    let schema = null;
    if (!sp || !exists(sp)) rep.err(`[${eid}] schema file '${pyStr(get(e, "schema"))}' not found`);
    else schema = verifySchemaFile(rep, eid, "", sp, pyStr(get(e, "schema")));
    const ep = resolvePath(get(e, "example"), dddDir, manifest);
    if (!ep || !exists(ep)) rep.err(`[${eid}] example file '${pyStr(get(e, "example"))}' not found`);
    else verifyExampleFile(rep, eid, "", ep, pyStr(get(e, "example")), schema);
    const halves = [["", schema, pyStr(eid)], ...COMPANIONS.map((c) => [`${c} `, null, `${eid}.${c}`])];
    for (let [label, sch, stem] of halves) {
      if (label) {
        const csp = path.join(outDir, "schemas", `${stem}.schema.json`);
        const cep = path.join(outDir, "examples", `${stem}.json`);
        if (!exists(csp) && !exists(cep)) continue;
        if (!exists(csp)) {
          rep.err(`[${eid}] examples/${stem}.json exists but schemas/${stem}.schema.json does not — ` +
            "an example nothing validates proves nothing");
          continue;
        }
        sch = verifySchemaFile(rep, eid, label, csp, `schemas/${stem}.schema.json`);
        if (!exists(cep)) rep.err(`[${eid}] schemas/${stem}.schema.json has no examples/${stem}.json to validate it`);
        else verifyExampleFile(rep, eid, label, cep, `examples/${stem}.json`, sch);
      }
      const ipath = path.join(outDir, "examples", `${stem}.invalid.json`);
      const nNeg = exists(ipath) ? verifyInvalidFile(rep, eid, label, ipath, `examples/${stem}.invalid.json`, sch) : 0;
      if (hasConditional(sch) && !nNeg) {
        rep.warn(`[${eid}] ${label}schema encodes a conditional rule but has no ` +
          `examples/${stem}.invalid.json — add a payload the rule must reject, so a later ` +
          "edit cannot quietly loosen it");
      }
    }
  }
  // orphan files
  for (const [sub, suffix] of [["schemas", ".schema.json"], ["examples", ".json"]]) {
    const d = path.join(outDir, sub);
    if (!(exists(d) && fs.statSync(d).isDirectory())) continue;
    for (const fn of sorted(fs.readdirSync(d))) {
      if (!fn.endsWith(suffix)) continue;
      let stem = fn.slice(0, fn.length - suffix.length);
      for (const tail of [".invalid", ".request", ".response"]) { // <id>.request.invalid.json too
        if (stem.endsWith(tail)) stem = stem.slice(0, stem.length - tail.length);
      }
      if (!byId.has(stem)) rep.warn(`${sub}/${fn} has no contract entry — orphan file`);
    }
  }
  // contracts.md must be rendered from the current entries
  const md = readText(path.join(outDir, "contracts.md"));
  if (md === null) {
    rep.err("09-contracts/contracts.md missing — run ddd contracts render (never hand-write it)");
  } else {
    const m = MARK_RE.exec(md);
    if (!m) rep.err("contracts.md has no generated marker — hand-written? run ddd contracts render");
    else if (m[1] !== entriesHash(get(doc, "entries", []), get(doc, "plain_words"))) {
      rep.err("contracts.md is stale — entries[] or plain_words changed since the last render; run ddd contracts render");
    }
  }
  return finish(rep, a, entries.length, xp.size, print);
}

// json.dumps(indent=2) keeps ensure_ascii=True here, so the em dashes and arrows in a
// finding come out as \u escapes in --json output, exactly as the Python did.
function finish(rep, a, nEntries, nMsgs, print) {
  const ok = !rep.errors.length && !(a.strict && rep.warnings.length);
  if (a.json) {
    print(pyDumps({ ok, entries: nEntries, cross_party_messages: nMsgs, errors: rep.errors, warnings: rep.warnings }, { indent: 2 }));
    return ok ? 0 : 1;
  }
  print(`contracts check: ${nEntries} entrie(s) against ${nMsgs} cross-party message(s)`);
  for (const m of rep.errors) print(`  e ${m}`);
  for (const m of rep.warnings) print(`  w ${m}`);
  for (const m of rep.notes) print(`  i ${m}`);
  print(`${rep.errors.length} error(s), ${rep.warnings.length} warning(s)`);
  print("RESULT: " + (ok ? "OK" : "FAIL"));
  return ok ? 0 : 1;
}

export function main(argv, ctx) {
  return runVerb({ argv, ctx, verb: "check", options: OPTIONS, usage: USAGE, body: cmdCheck });
}
