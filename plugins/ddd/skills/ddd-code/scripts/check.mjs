// ddd code check: deliverable lint for ddd-code, stricter than validate. Port of
// check_code.py; same flags, same wording, same exit codes.
//
// validate guards the chain (schema, ids, deployables, core contexts designed). This
// guards the deliverable: every context designed, every aggregate canvased with
// invariants and tests, ports/adapters consistent, boundaries respected, including
// contract §4.8 (a context a frontend hosts keeps its server-side `deployable`, lives in
// a shared package and lists the frontend in `also_compiled_into`; a command an upstream
// decision vetoed as aggregate material is an application service with `handled_by`),
// coined terms kept out of define's generated glossary sections (§5), markdown complete,
// no placeholders (the agreed phrase "payload: TBD — ask ddd-connect" is an open
// question, not a placeholder), scaffold flags honest. Fix errors, read warnings; `i`
// lines are accepted exceptions.
//
// Invariant 7 (design §6): when the deliverable passes, 08-code/.prefill/ is removed
// (the briefs are scaffolding; `ddd code prefill` regenerates them) unless
// --keep-prefill. A failing check leaves the briefs where they are.
//
//   ddd code check <ddd-dir> [--strict] [--json] [--keep-prefill]
//
// Exit 0 = no errors, 1 = errors (or warnings with --strict), 2 = usage/IO problem.
// The messages still say "stamp.py" and "prefill.py": Python-era wording stays verbatim
// until leaf 1.4.1 rewords code and goldens together. Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import { pyDumps } from "../../../shared/lib/jsonschema.mjs";
import {
  ArgError, cmpStr, get, getList, helpText, isDict, loadJson, parseArgs, plen, pyRepr, pyStr, readText, splitlines, truthy,
} from "./_py.mjs";

const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code"];
const FOLDER = Object.fromEntries(STEPS.map((s, i) => [s, `${String(i + 1).padStart(2, "0")}-${s}`]));
const AGG_PATTERNS = ["domain-model", "event-sourced-domain-model"];
const DESIGN_HEADINGS = ["module layout", "application services", "ports", "adapters", "domain events", "read models", "persistence", "tests"];
const CANVAS_HEADINGS = ["description", "state transitions", "enforced invariants", "corrective policies", "handled commands", "created events", "throughput", "size"];
const PLACEHOLDERS = [/\bTODO\b/mi, /\bTBD\b/mi, /\(fixture\)/mi, /lorem ipsum/mi, /^\s*[-*]\s*…\s*$/mi, /<fill[- ]?in>/mi, /\bXXX\b/mi, /\{\{[^}]*\}\}/mi];
// The Python pattern source is what a warning quotes, so the two lists stay parallel.
const PLACEHOLDER_SOURCES = ["\\bTODO\\b", "\\bTBD\\b", "\\(fixture\\)", "lorem ipsum", "^\\s*[-*]\\s*…\\s*$", "<fill[- ]?in>", "\\bXXX\\b", "\\{\\{[^}]*\\}\\}"];
const TBD_PHRASE = /payload:\s*TBD\s*[—–-]+\s*ask ddd-connect/i; // the one allowed TBD: an open question for ddd-connect
const COINED_HEADING = "coined by ddd-code";

const S = pyStr;

class Report {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.notes = [];
  }

  err(msg) { this.errors.push(msg); }

  warn(msg) { this.warnings.push(msg); }

  note(msg) { this.notes.push(msg); }
}

function ids(items, key = "id") {
  return (items ?? []).filter((x) => isDict(x) && get(x, key) !== null).map((x) => get(x, key));
}

// datetime.fromisoformat on the chain's timestamps; null when it does not parse.
function parseTs(s) {
  const t = pyStr(s ?? "None").replace(/Z$/, "+00:00");
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?([+-]\d{2}:\d{2})?$/.test(t)) return null;
  const ms = Date.parse(/[+-]\d{2}:\d{2}$/.test(t) || !t.includes("T") ? t : t + "Z");
  return Number.isNaN(ms) ? null : ms;
}

function headings(md) {
  const out = [];
  for (const m of md.matchAll(/^#{1,4}\s+(.+)$/gm)) out.push(m[1].toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim());
  return out;
}

function placeholderIn(text) {
  const scan = text.replace(new RegExp(TBD_PHRASE.source, "gi"), "payload pending ddd-connect");
  for (let i = 0; i < PLACEHOLDERS.length; i++) {
    if (PLACEHOLDERS[i].test(scan)) return PLACEHOLDER_SOURCES[i];
  }
  return null;
}

function checkMd(rep, label, p, required, projectRoot) {
  const md = readText(path.join(projectRoot, p));
  if (md === null) {
    rep.err(`${label}: file not found: ${p}`);
    return;
  }
  const hs = headings(md);
  for (const h of required) {
    if (!hs.some((x) => x.includes(h))) rep.warn(`${label}: no '${h}' heading in ${p}`);
  }
  const pat = placeholderIn(md);
  if (pat) rep.warn(`${label}: placeholder text (${pat}) left in ${p}`);
  const n = plen(md.trim());
  if (n < 200) rep.warn(`${label}: ${p} is only ${n} characters — is it a real design?`);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Contract §5: coined terms live under '## Coined by ddd-code' and in code.json coined_terms[], never inside a generated section.
function checkGlossary(rep, code, dddDir) {
  const coined = getList(code, "coined_terms");
  const gl = readText(path.join(dddDir, "glossary.md"));
  if (gl === null) {
    if (coined.length) rep.warn("code.json lists coined_terms but glossary.md does not exist");
    return;
  }
  const sections = [];
  let cur = null;
  let buf = [];
  for (const line of splitlines(gl)) {
    if (line.startsWith("## ")) {
      if (cur !== null) sections.push([cur, buf.join("\n")]);
      cur = line.slice(3).trim();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  if (cur !== null) sections.push([cur, buf.join("\n")]);
  const generated = sections.filter(([h]) => h.toLowerCase().endsWith(" context")); // regenerated by define's renderer
  const coinedSec = sections.filter(([h]) => h.toLowerCase().startsWith(COINED_HEADING)).map(([, b]) => b).join("\n");
  const hasSec = sections.some(([h]) => h.toLowerCase().startsWith(COINED_HEADING));
  const hasTerm = (body, term) => new RegExp(`^\\*\\*${escapeRe(term)}\\*\\*`, "m").test(body);

  for (const t of coined) {
    const term = get(t, "term") || "";
    const where = generated.filter(([, b]) => hasTerm(b, term)).map(([h]) => h);
    if (where.length) {
      rep.warn(`coined term '${term}' is written inside the generated glossary section(s) ${pyRepr(where)} — define's renderer regenerates them; move it under '## Coined by ddd-code' (contract §5)`);
    }
    if (!hasTerm(coinedSec, term)) rep.warn(`coined term '${term}' (code.json coined_terms[]) is not under '## Coined by ddd-code' in glossary.md`);
    if (!truthy(get(t, "definition")) || !truthy(get(t, "context"))) rep.warn(`coined term '${term}' needs term, definition and context (contract §5)`);
  }
  if (hasSec) {
    const listed = new Set(coined.map((t) => get(t, "term")));
    for (const m of coinedSec.matchAll(/^\*\*(.+?)\*\*/gm)) {
      if (!listed.has(m[1])) rep.warn(`glossary.md '## Coined by ddd-code' has '${m[1]}' but code.json coined_terms[] does not — keep them in sync`);
    }
  }
}

const SPEC = {
  usage: "ddd code check [ddd_dir] [--strict] [--json] [--keep-prefill]",
  description: "deliverable lint for ddd-code, stricter than validate",
  options: {
    "--strict": { dest: "strict", action: "store_true" },
    "--json": { dest: "json", action: "store_true" },
    "--keep-prefill": { dest: "keep_prefill", action: "store_true", help: "do not remove 08-code/.prefill/ on success" },
  },
  positional: { dest: "ddd_dir", default: "ddd" },
};

export async function main(argv) {
  const out = (s) => process.stdout.write(s);
  const err = (s) => process.stderr.write(s);
  let a;
  try {
    a = parseArgs(SPEC, argv);
  } catch (e) {
    if (e instanceof ArgError) {
      err(`usage: ${SPEC.usage}\nddd code check: error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if (a.help) {
    out(helpText(SPEC));
    return 0;
  }
  const dddDir = path.resolve(a.ddd_dir);
  let stat = null;
  try { stat = fs.statSync(dddDir); } catch { /* missing */ }
  if (!stat || !stat.isDirectory()) {
    err(`error: ${dddDir} does not exist\n`);
    return 2;
  }
  const projectRoot = path.dirname(dddDir);
  const rel = path.relative(projectRoot, dddDir) || ".";
  const rep = new Report();
  const A = {};
  for (const s of STEPS) A[s] = loadJson(path.join(dddDir, FOLDER[s], `${s}.json`));
  const code = A.code;
  if (!truthy(code) || !isDict(code)) {
    err(`error: ${rel}/08-code/code.json missing or invalid JSON\n`);
    return 2;
  }
  const [disc, dec, strat, conn, org] = ["discover", "decompose", "strategize", "connect", "organise"].map((s) => (isDict(A[s]) ? A[s] : {}));

  const cmdIds = new Set(ids(get(disc, "commands")));
  const evIds = new Set(ids(get(disc, "events")));
  const candidates = new Set(ids(get(disc, "aggregate_candidates")));
  const bcs = getList(dec, "bounded_contexts");
  const bcIds = ids(bcs);
  const ownsCmd = new Map(bcs.map((bc) => [get(bc, "id"), new Set(getList(bc, "owns_commands"))]));
  const ownsEv = new Map(bcs.map((bc) => [get(bc, "id"), new Set(getList(bc, "owns_events"))]));
  const ownsAgg = new Map(bcs.map((bc) => [get(bc, "id"), new Set(getList(bc, "owns_aggregates"))]));
  const cmdOwner = new Map();
  for (const [bc, cs] of ownsCmd) for (const c of cs) cmdOwner.set(c, bc);
  const evOwner = new Map();
  for (const [bc, es] of ownsEv) for (const e of es) evOwner.set(e, bc);
  const subCls = new Map(getList(strat, "classifications").map((x) => [get(x, "subdomain"), x]));
  const coreCtx = bcs.filter((bc) => getList(bc, "subdomains").some((s) => get(subCls.get(s) ?? {}, "type") === "core")).map((bc) => get(bc, "id"));
  const msgs = getList(conn, "messages");
  const depsById = new Map(getList(org, "deployables").map((d) => [get(d, "id"), d]));
  const hosts = new Map();
  for (const d of getList(org, "deployables")) {
    for (const x of get(d, "hosts_runtime_of") ?? []) {
      if (!hosts.has(x)) hosts.set(x, []);
      hosts.get(x).push(get(d, "id"));
    }
  }
  const ownerOf = (m, k) => (m.has(k) ? m.get(k) : null);

  // ----- envelope / staleness -----
  for (const k of ["assumptions", "open_questions"]) {
    if (!Array.isArray(get(code, k))) rep.err(`envelope: '${k}' must be a list`);
  }
  const tCode = parseTs(get(code, "produced_at"));
  const tDef = parseTs(get(A.define ?? {}, "produced_at"));
  if (tCode !== null && tDef !== null && tCode < tDef) {
    rep.warn(`produced_at ${S(get(code, "produced_at"))} is older than define.json — run ddd stamp after the last edit or the step will be marked stale`);
  }
  if (!truthy(get(code, "inputs"))) rep.warn("envelope.inputs is empty — list the artifacts actually read");
  if (get(code, "mode") === "auto" && !truthy(get(code, "assumptions"))) {
    rep.warn("auto mode with zero assumptions — an auto run always guesses something (language, invariants, sizes); record it");
  }
  checkGlossary(rep, code, dddDir);

  // ----- contexts -----
  const designed = new Map(getList(code, "contexts").map((c) => [get(c, "context"), c]));
  for (const bc of bcIds) {
    if (!designed.has(bc)) rep.err(`context '${S(bc)}' has no entry in code.json — every bounded context needs a design.md (ACL/adapter-only for bought/generic ones)`);
  }
  const modulePaths = new Map();
  for (const [cid, c] of designed) {
    const pat = get(c, "implementation_pattern");
    const aggs = getList(c, "aggregates");
    const dp = get(c, "design_path");
    const expectedDp = `${rel}/08-code/${S(cid)}/design.md`;
    if (dp !== expectedDp) rep.err(`[${S(cid)}] design_path must be '${expectedDp}' (got ${pyRepr(dp)})`);
    else checkMd(rep, `[${S(cid)}] design.md`, dp, DESIGN_HEADINGS, projectRoot);
    const mp = get(c, "module_path") || "";
    if (!truthy(mp)) rep.err(`[${S(cid)}] module_path is empty`);
    else if (modulePaths.has(mp)) rep.err(`[${S(cid)}] module_path '${S(mp)}' is also used by '${S(modulePaths.get(mp))}' — one module per context`);
    modulePaths.set(mp, cid);
    // contract §4.8: deployable stays the server-side owner; a hosting frontend goes in also_compiled_into
    const dep = depsById.has(get(c, "deployable")) ? depsById.get(get(c, "deployable")) : null;
    if (truthy(dep) && get(dep, "kind") === "frontend") {
      rep.err(`[${S(cid)}] deployable '${S(get(dep, "id"))}' is a frontend — \`deployable\` stays the server-side owner; a frontend that runs the model goes in also_compiled_into (contract §4.8)`);
    }
    const aci = get(c, "also_compiled_into") ?? [];
    for (const x of aci) {
      if (!depsById.has(x)) rep.err(`[${S(cid)}] also_compiled_into '${S(x)}' is not an organise deployable`);
      else if (!(get(depsById.get(x), "hosts_runtime_of") ?? []).includes(cid)) {
        rep.warn(`[${S(cid)}] also_compiled_into '${S(x)}' but organise does not list '${S(cid)}' in that deployable's hosts_runtime_of — fix one side`);
      }
    }
    for (const x of hosts.get(cid) ?? []) {
      if (!aci.includes(x)) rep.warn(`[${S(cid)}] organise says '${S(x)}' hosts this context's runtime — set also_compiled_into: ["${S(x)}"] and make module_path the shared domain package (contract §4.8)`);
    }
    const depId = S(get(dep ?? {}, "id"));
    if (truthy(aci) && truthy(dep) && truthy(mp) && [`apps/${depId}/`, `services/${depId}/`, `${depId}/`].some((pfx) => S(mp).startsWith(pfx))) {
      rep.warn(`[${S(cid)}] module_path '${S(mp)}' sits inside deployable '${depId}' although ${pyRepr(aci)} also compile it — use a shared domain package (e.g. packages/${S(cid)}/src)`);
    } else if (truthy(aci)) {
      rep.note(`[${S(cid)}] shared domain package '${S(mp)}', deployable '${S(get(c, "deployable"))}', also compiled into ${pyRepr(aci)} — accepted (contract §4.8)`);
    }
    if (AGG_PATTERNS.includes(pat) && !aggs.length) rep.err(`[${S(cid)}] is a ${S(pat)} context but has no aggregates`);
    if (!AGG_PATTERNS.includes(pat) && aggs.length) {
      rep.err(`[${S(cid)}] is a ${S(pat)} context but lists aggregates — transaction-script/active-record contexts get use cases + persistence, not aggregates (or change the pattern upstream in strategize)`);
    }
    // application services cover owned commands
    const svcByCmd = new Map();
    for (const s of getList(c, "application_services")) if (truthy(get(s, "command"))) svcByCmd.set(get(s, "command"), s);
    for (const sc of svcByCmd.keys()) {
      if (cmdIds.size && !cmdIds.has(sc)) rep.err(`[${S(cid)}] application service command '${S(sc)}' is not a discover command id`);
      else if (![null, cid].includes(ownerOf(cmdOwner, sc))) rep.err(`[${S(cid)}] application service handles '${S(sc)}' which decompose gave to '${S(ownerOf(cmdOwner, sc))}'`);
    }
    const ownedCmds = [...(ownsCmd.get(cid) ?? new Set())].sort(cmpStr);
    for (const oc of ownedCmds) {
      if (!svcByCmd.has(oc)) rep.warn(`[${S(cid)}] owned command '${S(oc)}' has no application service`);
    }
    // ports / adapters
    const ports = new Map();
    for (const p of getList(c, "ports")) ports.set(get(p, "name"), p);
    const adapters = getList(c, "adapters");
    if (![...ports.values()].some((p) => get(p, "kind") === "driving")) rep.warn(`[${S(cid)}] no driving port — how does anything call this context (HTTP, message handler, CLI, test)?`);
    for (const ad of adapters) {
      if (!ports.has(get(ad, "port"))) rep.err(`[${S(cid)}] adapter '${S(get(ad, "implementation"))}' implements unknown port '${S(get(ad, "port"))}'`);
    }
    for (const p of ports.values()) {
      if (get(p, "kind") === "driven" && !adapters.some((ad) => get(ad, "port") === get(p, "name"))) {
        rep.warn(`[${S(cid)}] driven port '${S(get(p, "name"))}' has no adapter (at least an in-memory/fake one for tests)`);
      }
    }
    const producedHere = msgs.filter((m) => get(m, "producer") === cid && get(m, "kind") === "event");
    if (producedHere.length && ![...ports.values()].some((p) => get(p, "kind") === "driven" && S(get(p, "name") ?? "").toLowerCase().includes("publish"))) {
      rep.warn(`[${S(cid)}] publishes ${pyRepr(producedHere.map((m) => get(m, "id")))} but has no driven publisher port`);
    }
    // tests
    const tests = getList(c, "tests");
    const tInv = new Set(tests.map((t) => get(t, "invariant")));
    for (const m of producedHere) {
      if (!tInv.has(`contract: ${S(get(m, "id"))}`)) rep.warn(`[${S(cid)}] published event '${S(get(m, "id"))}' has no contract test (tests[].invariant = 'contract: ${S(get(m, "id"))}')`);
    }
    for (const m of msgs) {
      if (getList(m, "consumers").includes(cid) && get(m, "kind") === "event" && get(m, "delivery") === "at-least-once") {
        if (!tInv.has(`idempotent: ${S(get(m, "id"))}`)) {
          rep.warn(`[${S(cid)}] consumes '${S(get(m, "id"))}' at-least-once but has no idempotency test (tests[].invariant = 'idempotent: ${S(get(m, "id"))}')`);
        }
      }
    }
    for (const t of tests) {
      if (TBD_PHRASE.test(get(t, "test") || "")) {
        const eid = S(get(t, "invariant") || "").split("contract: ").join(""); // str.replace replaces every occurrence
        const qs = getList(code, "open_questions").filter((q) => truthy(eid) && S(get(q, "text") || "").includes(eid));
        if (qs.length) rep.note(`[${S(cid)}] contract test for '${eid}' waits on ddd-connect for the payload — open question ${S(get(qs[0], "id"))} (not a placeholder)`);
        else rep.warn(`[${S(cid)}] contract test for '${eid}' says payload TBD but no open question names '${eid}' for ddd-connect — add one`);
      }
    }
    // read models
    for (const rm of getList(c, "read_models")) {
      for (const e of getList(rm, "source_events")) {
        if (evIds.size && !evIds.has(e)) rep.err(`[${S(cid)}] read model '${S(get(rm, "name"))}' sources unknown event '${S(e)}'`);
      }
    }
    // aggregates
    const seen = new Set();
    for (const ag of aggs) {
      const aid = get(ag, "id");
      if (seen.has(aid)) rep.err(`[${S(cid)}] duplicate aggregate id '${S(aid)}'`);
      seen.add(aid);
      const expectedCp = `${rel}/08-code/${S(cid)}/aggregate-canvas-${S(aid)}.md`;
      if (get(ag, "canvas_path") !== expectedCp) rep.err(`[${S(cid)}] aggregate '${S(aid)}' canvas_path must be '${expectedCp}' (got ${pyRepr(get(ag, "canvas_path"))})`);
      else checkMd(rep, `[${S(cid)}] canvas ${S(aid)}`, expectedCp, CANVAS_HEADINGS, projectRoot);
      if (!truthy(get(ag, "invariants"))) rep.err(`[${S(cid)}] aggregate '${S(aid)}' has no invariants — protect something or drop the aggregate`);
      if (!truthy(get(ag, "commands"))) rep.err(`[${S(cid)}] aggregate '${S(aid)}' handles no commands`);
      if (!truthy(get(ag, "state_transitions"))) rep.warn(`[${S(cid)}] aggregate '${S(aid)}' has no state_transitions — even 'created→active→closed' makes the lifecycle explicit`);
      if (!candidates.has(aid) && !(ownsAgg.get(cid) ?? new Set()).has(aid)) {
        rep.warn(`[${S(cid)}] aggregate '${S(aid)}' was not a discover candidate nor in decompose.owns_aggregates — fine if justified in the canvas`);
      }
      for (const cm of getList(ag, "commands")) {
        if (![null, cid].includes(ownerOf(cmdOwner, cm))) rep.err(`[${S(cid)}] aggregate '${S(aid)}' handles '${S(cm)}', which decompose gave to '${S(ownerOf(cmdOwner, cm))}' — fix the boundary upstream, not here`);
        else if (ownerOf(cmdOwner, cm) === null && cmdIds.size) rep.warn(`[${S(cid)}] aggregate '${S(aid)}' handles '${S(cm)}', which no context owns in decompose`);
      }
      for (const e of getList(ag, "events")) {
        if (![null, cid].includes(ownerOf(evOwner, e))) rep.err(`[${S(cid)}] aggregate '${S(aid)}' emits '${S(e)}', which decompose gave to '${S(ownerOf(evOwner, e))}'`);
      }
      for (const inv of getList(ag, "invariants")) {
        if (!tInv.has(inv)) rep.warn(`[${S(cid)}] invariant '${S(inv)}' of '${S(aid)}' has no test with the same wording in tests[]`);
      }
      if (![...ports.values()].some((p) => get(p, "kind") === "driven" && S(get(p, "name") ?? "").toLowerCase().endsWith("repository"))) {
        rep.warn(`[${S(cid)}] aggregate '${S(aid)}' but no driven *Repository port`);
      }
    }
    for (const oc of ownedCmds) {
      if (AGG_PATTERNS.includes(pat) && aggs.length && !aggs.some((ag) => getList(ag, "commands").includes(oc))) {
        const hb = get(svcByCmd.get(oc) ?? {}, "handled_by");
        if (truthy(hb)) rep.note(`[${S(cid)}] '${S(oc)}' is handled by a ${S(hb)} application service, not an aggregate (upstream decision) — accepted (contract §4.8)`);
        else rep.warn(`[${S(cid)}] owned command '${S(oc)}' is handled by no aggregate — assign it to one, or when an upstream decision note vetoes an aggregate set handled_by: "transaction-script" on its application service (contract §4.8)`);
      }
    }
    const dropped = getList(code, "deprecated").filter((d) => get(d, "collection") === "aggregate_candidates" && candidates.has(get(d, "id")));
    for (const d of dropped) {
      if ((ownsAgg.get(cid) ?? new Set()).has(get(d, "id")) && !aggs.some((ag) => get(ag, "id") === get(d, "id"))) {
        rep.note(`[${S(cid)}] candidate '${S(get(d, "id"))}' dropped: ${S(get(d, "reason"))}`);
      }
    }
  }

  // ----- scaffold / handoff / plan -----
  const sc = get(code, "scaffold") ?? {};
  const files = getList(sc, "files");
  if (truthy(get(sc, "generated")) && !files.length) rep.err("scaffold.generated is true but scaffold.files is empty");
  if (!truthy(get(sc, "generated")) && files.length) rep.warn("scaffold.generated is false but scaffold.files lists files — which is it?");
  for (const fpath of files) {
    // os.path.join drops the root when the listed path is absolute; path.resolve does the same.
    if (!fs.existsSync(path.resolve(projectRoot, S(fpath)))) rep.warn(`scaffold file listed but not on disk: ${S(fpath)}`);
  }
  const hp = get(get(code, "handoff") ?? {}, "plan_path");
  const expectedHp = `${rel}/08-code/implementation-plan.md`;
  if (hp !== expectedHp) rep.err(`handoff.plan_path must be '${expectedHp}' (got ${pyRepr(hp)})`);
  const plan = readText(path.join(projectRoot, expectedHp));
  if (plan === null) {
    rep.err(`implementation plan missing: ${expectedHp}`);
  } else {
    const low = plan.toLowerCase();
    for (const cid of designed.keys()) {
      if (!low.includes(S(cid).toLowerCase())) rep.warn(`implementation-plan.md never mentions context '${S(cid)}'`);
    }
    if (!/hand-?off/.test(low)) rep.warn("implementation-plan.md has no hand-off section (writing-plans / dev-create-plan / TDD)");
    const firstSlice = /^#{2,3}\s+slice\s*1\b.*$/mi.exec(plan);
    if (coreCtx.length && firstSlice && !coreCtx.some((cc) => firstSlice[0].toLowerCase().includes(S(cc).toLowerCase()))) {
      const end = firstSlice.index + firstSlice[0].length;
      const bodyAfter = plan.slice(end, end + 600).toLowerCase();
      if (!coreCtx.some((cc) => bodyAfter.includes(S(cc).toLowerCase()))) rep.warn(`Slice 1 does not name a core context (${pyRepr(coreCtx)}) — core first`);
    }
    const pat = placeholderIn(plan);
    if (pat) rep.warn(`implementation-plan.md: placeholder text (${pat}) left in`);
  }

  const ok = !rep.errors.length && !(a.strict && rep.warnings.length);
  const pre = path.join(dddDir, "08-code", ".prefill");
  let removed = null;
  // Invariant 7: the briefs go only after a passing check, and only without --keep-prefill.
  if (ok && !a.keep_prefill && isDirectory(pre)) {
    fs.rmSync(pre, { recursive: true, force: true });
    removed = pre;
  }
  if (a.json) {
    out(pyDumps({ ok, errors: rep.errors, warnings: rep.warnings, notes: rep.notes, removed_prefill: removed }, { indent: 2 }) + "\n");
    return ok ? 0 : 1;
  }
  const lines = [];
  lines.push(`ddd-code deliverable check: ${dddDir}`);
  const nAggs = [...designed.values()].reduce((n, c) => n + getList(c, "aggregates").length, 0);
  lines.push(`contexts designed: ${designed.size}/${bcIds.length}  aggregates: ${nAggs}  scaffold.generated=${S(get(sc, "generated"))}`);
  if (rep.errors.length) {
    lines.push(`\n${rep.errors.length} error(s):`);
    for (const m of rep.errors) lines.push(`  E ${m}`);
  }
  if (rep.warnings.length) {
    lines.push(`\n${rep.warnings.length} warning(s):`);
    for (const m of rep.warnings) lines.push(`  W ${m}`);
  }
  if (rep.notes.length) {
    lines.push(`\n${rep.notes.length} accepted exception(s):`);
    for (const m of rep.notes) lines.push(`  i ${m}`);
  }
  if (removed) lines.push(`\nremoved ${removed} (pre-fill briefs are scaffolding; ddd code prefill regenerates them)`);
  lines.push("\nRESULT: " + (ok ? "OK" : "FAIL"));
  out(lines.join("\n") + "\n");
  return ok ? 0 : 1;
}

function isDirectory(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}
