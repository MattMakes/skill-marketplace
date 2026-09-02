#!/usr/bin/env node
// Gates G1-G4 for leaf 1.2.3: the explorers, checked against the step JSON they
// were built from (never against their own helpers) by walking the HTML they
// produce with a small tag parser.
//
// Usage: node plugins/ddd/shared/tests/checks/1.2.3/check-explorers.mjs <ddd-dir> <explorer...>
//   explorers: domain | contracts | stores | artifacts | decisions
//   G1 domain      every context, aggregate, invariant, command, event and port of
//                  code.json / define.json / decompose.json, nested correctly
//   G2 contracts   every field of every schema with type, required flag and example
//                  value beside it; request and response halves
//   G3 stores      a shared store is flagged (temp copy) and none is on the fixture;
//      artifacts   every indexed id has a node, and that node links every reference
//   G4 decisions   a chosen three-option decision with two spec files is one row of
//                  three cards with the chosen one marked; an open decision has no
//                  mark and is in openDecisions()
// Prints "explorers verification passed"; exit 0 pass, 1 failure, 2 misuse.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KNOWN = ["domain", "contracts", "stores", "artifacts", "decisions"];
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("usage: node check-explorers.mjs <ddd-dir> <explorer...>   explorers: " + KNOWN.join(", "));
  process.exit(2);
}
const [dddDirArg, ...wanted] = args;
const dddDir = path.resolve(dddDirArg);
if (!fs.existsSync(path.join(dddDir, "manifest.json"))) {
  console.error(`usage: ${dddDirArg} has no manifest.json`);
  process.exit(2);
}
for (const w of wanted) {
  if (!KNOWN.includes(w)) {
    console.error(`usage: unknown explorer "${w}"; known: ${KNOWN.join(", ")}`);
    process.exit(2);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const lib = path.resolve(here, "../../../lib");
const { loadWorkspace, STEPS, FOLDER } = await import(pathToFileURL(path.join(lib, "workspace.mjs")).href);
const X = await import(pathToFileURL(path.join(lib, "render/explorers/index.mjs")).href);

// ---- a small HTML parser -------------------------------------------------------------
// Enough for the markup the explorers emit: start tags with double-quoted
// attributes, end tags, self-closing tags, text. Keeps an ancestor chain so
// nesting can be asserted.
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "wbr", "path", "rect", "circle", "line", "use"]);
function parse(html) {
  const root = { tag: "#root", attrs: {}, children: [], parent: null };
  let cur = root;
  const re = /<!--[\s\S]*?-->|<\/([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)((?:\s+[\w:.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      const name = m[1].toLowerCase();
      let n = cur;
      while (n && n.tag !== name) n = n.parent;
      if (n) cur = n.parent;
      continue;
    }
    if (m[2]) {
      const attrs = {};
      const ar = /([\w:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      let a;
      while ((a = ar.exec(m[3] || ""))) attrs[a[1]] = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : "";
      const node = { tag: m[2].toLowerCase(), attrs, children: [], parent: cur };
      cur.children.push(node);
      if (!m[4] && !VOID.has(node.tag)) cur = node;
      continue;
    }
    if (m[5]) cur.children.push({ tag: "#text", text: m[5], children: [], parent: cur });
  }
  return root;
}
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function all(node, pred, out = []) {
  for (const c of node.children) {
    if (c.tag !== "#text" && pred(c)) out.push(c);
    all(c, pred, out);
  }
  return out;
}
const first = (node, pred) => all(node, pred)[0] || null;
const text = (node) => node.tag === "#text" ? unesc(node.text) : node.children.map(text).join("");
const attr = (node, k) => (node && node.attrs[k] !== undefined ? unesc(node.attrs[k]) : undefined);
const hasAncestor = (node, pred) => { for (let n = node.parent; n; n = n.parent) if (n.tag !== "#root" && pred(n)) return true; return false; };
const byId = (root, id) => first(root, (n) => attr(n, "id") === id);
const cls = (n, c) => (attr(n, "class") || "").split(/\s+/).includes(c);
const slug = (v) => { const s = String(v ?? "").replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-"); return s || "x"; };

// ---- harness -------------------------------------------------------------------------
const problems = [];
const fail = (msg) => problems.push(msg);
const must = (cond, msg) => { if (!cond) fail(msg); return !!cond; };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const list = (v) => (Array.isArray(v) ? v : []);
const dict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const tmpDirs = [];
// A temp workspace: the fixture copied under <tmp>/ddd so project-relative
// artifact paths (ddd/...) resolve the same way they do in the fixture.
function tempCopy() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-x-"));
  tmpDirs.push(d);
  const dest = path.join(d, "ddd");
  fs.cpSync(dddDir, dest, { recursive: true });
  return dest;
}
async function render(dir, only, opts = {}) {
  const ws = loadWorkspace(dir);
  const secs = await X.sections(ws, [], { only, ...opts });
  const html = secs.map((s) => s.html).join("\n");
  return { ws, secs, html, root: parse(html) };
}
// Every entity row is searchable: the runtime hides [data-search-row] rows that do
// not match, and needs data-search-text for the same reason.
function searchable(root, pred, label) {
  for (const n of all(root, pred)) {
    if (attr(n, "data-search-row") === undefined || attr(n, "data-search-text") === undefined) {
      fail(`${label}: entity row ${n.tag}#${attr(n, "id") || attr(n, "data-id")} lacks data-search-row/data-search-text`);
    }
  }
}
// The raw JSON strings that would break markup, so an escape gap shows up.
function escapedEverywhere(html, label) {
  // The explorers never emit a script tag themselves (runtime.js is added by the page),
  // so any one in their output came through unescaped from the JSON.
  if (/<script[\s>]/i.test(html)) fail(`${label}: a <script> tag survived escaping`);
}

// ---- G1 domain -----------------------------------------------------------------------
async function checkDomain() {
  const { root, html, ws } = await render(dddDir, ["domain"]);
  const sec = byId(root, "domain");
  if (!must(sec && cls(sec, "ddd-x"), "domain: no <section id=domain class=ddd-x>")) return;
  const code = ws.steps.code || {};
  const define = ws.steps.define || {};
  const decompose = ws.steps.decompose || {};
  const ctxNode = (id) => { const n = byId(sec, `ctx-${slug(id)}`); must(n && attr(n, "data-kind") === "context", `domain: context ${id} has no #ctx-${slug(id)} node`); return n; };
  const inside = (node, container) => node && container && hasAncestor(node, (n) => n === container);

  for (const bc of list(decompose.bounded_contexts)) ctxNode(bc.id);
  for (const c of list(define.canvases)) {
    const n = ctxNode(c.context);
    if (!n) continue;
    for (const side of ["inbound", "outbound"]) {
      for (const x of list(c[side])) for (const m of list(x.messages)) {
        const leaf = first(n, (e) => attr(e, "data-id") === String(m.id));
        must(leaf, `domain: canvas ${c.context} ${side} message ${m.id} not shown under its context`);
      }
    }
    if (c.purpose) must(text(n).includes(c.purpose.slice(0, 40)), `domain: canvas ${c.context} purpose text missing`);
  }
  let counts = { ctx: 0, agg: 0, inv: 0, cmd: 0, ev: 0, port: 0 };
  for (const c of list(code.contexts)) {
    const n = ctxNode(c.context);
    if (!n) continue;
    counts.ctx++;
    for (const a of list(c.aggregates)) {
      const an = byId(sec, `agg-${slug(a.id)}`);
      if (!must(an && attr(an, "data-kind") === "aggregate", `domain: aggregate ${a.id} has no #agg-${slug(a.id)} node`)) continue;
      must(inside(an, n), `domain: aggregate ${a.id} is not nested inside context ${c.context}`);
      counts.agg++;
      for (const inv of list(a.invariants)) {
        const e = first(an, (x) => attr(x, "data-kind") === "invariant" && attr(x, "data-id") === inv);
        must(e, `domain: invariant "${inv}" of ${a.id} not inside its aggregate node`);
        counts.inv++;
      }
      for (const [kind, ids] of [["command", list(a.commands)], ["event", list(a.events)]]) {
        for (const id of ids) {
          const e = first(an, (x) => attr(x, "data-kind") === kind && attr(x, "data-id") === id);
          must(e, `domain: ${kind} ${id} of ${a.id} not inside its aggregate node`);
          if (kind === "command") counts.cmd++; else counts.ev++;
        }
      }
      for (const t of list(a.state_transitions)) must(text(an).includes(t), `domain: transition ${t} of ${a.id} missing`);
    }
    for (const p of list(c.ports)) {
      const e = first(n, (x) => attr(x, "data-kind") === "port" && attr(x, "data-id") === p.name);
      must(e, `domain: port ${p.name} of ${c.context} not inside its context node`);
      if (e) {
        const adapters = list(c.adapters).filter((a) => a.port === p.name).map((a) => a.implementation);
        for (const impl of adapters) must(text(e).includes(impl), `domain: adapter ${impl} for port ${p.name} missing`);
      }
      counts.port++;
    }
    for (const s of [...list(c.domain_services), ...list(c.application_services)]) must(first(n, (x) => attr(x, "data-kind") === "service" && attr(x, "data-id") === s.name), `domain: service ${s.name} missing`);
    for (const r of list(c.read_models)) must(first(n, (x) => attr(x, "data-kind") === "read-model" && attr(x, "data-id") === r.name), `domain: read model ${r.name} missing`);
    // Two levels open by default: the context is open; its aggregates are not.
    must(attr(n, "open") !== undefined, `domain: context ${c.context} is not open by default`);
    for (const a of list(c.aggregates)) { const an = byId(sec, `agg-${slug(a.id)}`); if (an) must(attr(an, "open") === undefined, `domain: aggregate ${a.id} is open by default (only two levels should be)`); }
    // The "used in" line comes from the index's referencedBy.
    if (ws.index.get(c.context) && ws.index.get(c.context).referencedBy.length) must(first(n, (x) => cls(x, "x-used")), `domain: context ${c.context} has no "used in" line`);
  }
  must(counts.ctx > 0 && counts.agg > 0 && counts.inv > 0 && counts.port > 0, `domain: fixture yielded nothing to check (${JSON.stringify(counts)})`);
  searchable(sec, (n) => ["context", "aggregate", "port", "service", "read-model", "invariant", "command", "event"].includes(attr(n, "data-kind")), "domain");
  escapedEverywhere(html, "domain");
  return counts;
}

// ---- G2 contracts --------------------------------------------------------------------
// An independent walk of a schema beside its example: every property path, with
// the example value at that path when there is one.
function walkSchema(schema, example, prefix = "", out = []) {
  if (!dict(schema)) return out;
  const req = new Set(list(schema.required));
  for (const [name, sub] of Object.entries(dict(schema.properties) ? schema.properties : {})) {
    if (!dict(sub)) continue;
    const p = prefix ? `${prefix}.${name}` : name;
    const ex = dict(example) ? example[name] : undefined;
    out.push({ path: p, required: req.has(name), example: ex });
    walkSchema(sub, ex, p, out);
    if (dict(sub.items)) walkSchema(sub.items, Array.isArray(ex) ? ex[0] : undefined, `${p}[]`, out);
    for (const kw of ["oneOf", "anyOf", "allOf"]) for (const alt of list(sub[kw])) walkSchema(alt, ex, p, out);
  }
  for (const kw of ["oneOf", "anyOf", "allOf"]) for (const alt of list(schema[kw])) walkSchema(alt, example, prefix, out);
  return out;
}
async function checkContracts() {
  const { root, html, ws } = await render(dddDir, ["contracts"]);
  const sec = byId(root, "contracts");
  if (!must(sec && cls(sec, "ddd-x"), "contracts: no <section id=contracts class=ddd-x>")) return;
  const ct = ws.steps.contracts || {};
  const root_ = ws.projectRoot;
  let fields = 0;
  for (const e of list(ct.entries)) {
    const node = byId(sec, `msg-${slug(e.id)}`);
    if (!must(node && attr(node, "data-kind") === "message", `contracts: entry ${e.id} has no #msg-${slug(e.id)} node`)) continue;
    const schemaPath = e.schema ? path.join(root_, e.schema) : path.join(dddDir, FOLDER.contracts, "schemas", `${e.id}.schema.json`);
    const examplePath = e.example ? path.join(root_, e.example) : path.join(dddDir, FOLDER.contracts, "examples", `${e.id}.json`);
    const respSchemaPath = path.join(dddDir, FOLDER.contracts, "schemas", `${e.id}.response.schema.json`);
    const respExamplePath = path.join(dddDir, FOLDER.contracts, "examples", `${e.id}.response.json`);
    const halves = [];
    if (fs.existsSync(schemaPath)) halves.push({ half: fs.existsSync(respSchemaPath) ? "request" : "payload", schema: readJson(schemaPath), example: fs.existsSync(examplePath) ? readJson(examplePath) : undefined, invalid: path.join(dddDir, FOLDER.contracts, "examples", `${e.id}.invalid.json`) });
    if (fs.existsSync(respSchemaPath)) halves.push({ half: "response", schema: readJson(respSchemaPath), example: fs.existsSync(respExamplePath) ? readJson(respExamplePath) : undefined });
    for (const h of halves) {
      const hn = first(node, (x) => attr(x, "data-half") === h.half);
      if (!must(hn, `contracts: ${e.id} has no [data-half=${h.half}]`)) continue;
      for (const f of walkSchema(h.schema, h.example)) {
        const tr = first(hn, (x) => x.tag === "tr" && attr(x, "data-field") === f.path);
        if (!must(tr, `contracts: ${e.id} ${h.half} field ${f.path} has no row`)) continue;
        fields++;
        must((attr(tr, "data-type") || "").length > 0, `contracts: ${e.id} field ${f.path} has an empty type`);
        must(attr(tr, "data-required") === String(f.required), `contracts: ${e.id} field ${f.path} required flag is ${attr(tr, "data-required")}, schema says ${f.required}`);
        const cells = tr.children.filter((c) => c.tag === "td");
        if (h.example !== undefined) {
          must(cells.length === 4, `contracts: ${e.id} field ${f.path} row has ${cells.length} cells, expected 4 (field, type, example, means)`);
          if (f.example !== undefined && cells[2]) {
            const shown = text(cells[2]).trim();
            const want = JSON.stringify(f.example);
            must(shown.length > 0 && (shown === want || want.startsWith(shown.replace(/…$/, ""))), `contracts: ${e.id} field ${f.path} example cell "${shown}" does not show ${want}`);
          }
        }
      }
      if (h.invalid && fs.existsSync(h.invalid)) {
        for (const bad of list(readJson(h.invalid))) if (bad && bad.why) must(text(hn).includes(bad.why), `contracts: ${e.id} negative example "${bad.why}" missing`);
      }
      if (h.example !== undefined) must(first(hn, (x) => attr(x, "data-kind") === "example"), `contracts: ${e.id} ${h.half} has no whole-example fold`);
    }
    for (const s of list(e.semantics)) must(text(node).includes(s), `contracts: ${e.id} semantics line missing: ${s.slice(0, 40)}`);
    if (dict(e.provenance)) for (const k of ["connect", "relationship"]) if (e.provenance[k]) must(text(node).includes(String(e.provenance[k])), `contracts: ${e.id} provenance ${k} missing`);
  }
  must(fields > 0, "contracts: fixture yielded no schema fields to check");
  must(all(sec, (x) => attr(x, "data-half") === "response").length > 0, "contracts: no response half found in the fixture (choose-meals has one)");
  searchable(sec, (n) => attr(n, "data-kind") === "message" || attr(n, "data-field") !== undefined, "contracts");
  escapedEverywhere(html, "contracts");
  return fields;
}

// ---- G3 stores -----------------------------------------------------------------------
async function checkStores() {
  const base = await render(dddDir, ["stores"]);
  const sec = byId(base.root, "stores");
  if (!must(sec && cls(sec, "ddd-x"), "stores: no <section id=stores class=ddd-x>")) return;
  const org = base.ws.steps.organise || {};
  const code = base.ws.steps.code || {};
  for (const d of list(org.deployables)) {
    const n = byId(sec, `dep-${slug(d.id)}`);
    if (!must(n && attr(n, "data-kind") === "deployable", `stores: deployable ${d.id} has no #dep-${slug(d.id)} node`)) continue;
    for (const c of list(d.contexts)) {
      const cn = first(n, (x) => attr(x, "data-kind") === "hosted-context" && attr(x, "data-id") === c);
      if (!must(cn, `stores: ${d.id} does not show hosted context ${c}`)) continue;
      const cc = list(code.contexts).find((x) => x.context === c);
      for (const a of list(cc && cc.aggregates)) must(first(cn, (x) => attr(x, "data-kind") === "persisted" && attr(x, "data-id") === a.id), `stores: aggregate ${a.id} not listed under ${d.id} › ${c}`);
    }
    if (d.data_store !== "shared") must(!first(n, (x) => attr(x, "data-flag") === "shared"), `stores: ${d.id} (${d.data_store}) is wrongly flagged shared`);
  }
  for (const t of list(org.teams)) must(byId(sec, `team-${slug(t.id)}`), `stores: team ${t.id} has no #team-${slug(t.id)} node`);
  searchable(sec, (n) => ["deployable", "hosted-context", "persisted", "team"].includes(attr(n, "data-kind")), "stores");

  // Temp copy: two deployables on one shared store, one named with markup.
  const tmp = tempCopy();
  const orgPath = path.join(tmp, FOLDER.organise, "organise.json");
  const o = readJson(orgPath);
  const deps = list(o.deployables);
  if (!must(deps.length >= 2, "stores: fixture needs two deployables for the shared-store case")) return;
  deps[0].data_store = "shared";
  deps[1].data_store = "shared";
  deps[1].name = `Warehouse <script>alert("x")</script>`;
  fs.writeFileSync(orgPath, JSON.stringify(o, null, 2));
  const shared = await render(tmp, ["stores"]);
  const ssec = byId(shared.root, "stores");
  for (const d of [deps[0], deps[1]]) {
    const n = byId(ssec, `dep-${slug(d.id)}`);
    const flag = n && first(n, (x) => attr(x, "data-flag") === "shared");
    if (!must(flag, `stores: shared store on ${d.id} is not flagged`)) continue;
    const t = text(flag);
    must(t.length > 40 && t.includes(deps[0].id) && t.includes(deps[1].id), `stores: shared flag on ${d.id} has no "so what" naming both deployables: "${t}"`);
  }
  must(!/<script>alert/.test(shared.html) && shared.html.includes("&lt;script&gt;"), "stores: a deployable name with markup was not escaped");
  escapedEverywhere(shared.html, "stores");
}

// ---- G3 artifacts --------------------------------------------------------------------
async function checkArtifacts() {
  // All sections are rendered so a link from the browser to a context or message
  // home can be resolved on the same page.
  const { root, html, ws } = await render(dddDir, undefined);
  const sec = byId(root, "artifacts");
  if (!must(sec && cls(sec, "ddd-x"), "artifacts: no <section id=artifacts class=ddd-x>")) return;
  const ids = new Set(all(root, (n) => attr(n, "id") !== undefined).map((n) => attr(n, "id")));
  const dup = all(root, (n) => attr(n, "id") !== undefined).length - ids.size;
  must(dup === 0, `artifacts: ${dup} duplicate element ids across the page`);
  for (const s of STEPS) {
    if (ws.steps[s]) must(byId(sec, `art-${s}`), `artifacts: step ${s} has no #art-${s} node`);
    else must(text(sec).includes(`${FOLDER[s]}/${s}.json has not been written`), `artifacts: missing step ${s} has no honest one-liner`);
  }
  // Every top-level key of every step appears (nothing dropped).
  for (const s of STEPS) {
    const doc = ws.steps[s];
    if (!dict(doc)) continue;
    const node = byId(sec, `art-${s}`);
    for (const k of Object.keys(doc)) {
      if (["schema_version", "step", "produced_by", "produced_at", "mode", "depth", "inputs", "plain_words"].includes(k)) continue;
      must(node && first(node, (x) => attr(x, "data-kind") === "collection" && attr(x, "data-id") === k) || first(node, (x) => attr(x, "data-kind") === `envelope-${k}`), `artifacts: ${s}.${k} is not rendered`);
    }
  }
  let entries = 0;
  let links = 0;
  const { containerOf, home } = await import(pathToFileURL(path.join(lib, "render/explorers/html.mjs")).href);
  for (const [key, entry] of ws.index) {
    if (key !== entry.key) continue;
    entries++;
    const node = byId(sec, slug(key));
    if (!must(node, `artifacts: indexed ${key} has no #${slug(key)} node`)) continue;
    const refs = first(node, (x) => attr(x, "data-refs") !== undefined && x.parent && closestItem(x) === node);
    if (!must(refs, `artifacts: ${key} has no referenced-by line`)) continue;
    must(attr(refs, "data-refs") === String(entry.referencedBy.length), `artifacts: ${key} says ${attr(refs, "data-refs")} references, index has ${entry.referencedBy.length}`);
    const hrefs = new Set(all(refs, (a) => a.tag === "a").map((a) => (attr(a, "href") || "").slice(1)));
    for (const r of entry.referencedBy) {
      const owner = containerOf(ws.index, r.step, r.path);
      const want = owner ? home.artifact(owner) : `art-${r.step}`;
      must(hrefs.has(want), `artifacts: ${key} reference at ${r.path} has no link to #${want}`);
      links++;
    }
  }
  for (const a of all(sec, (n) => n.tag === "a" && (attr(n, "href") || "").startsWith("#"))) {
    const target = attr(a, "href").slice(1);
    must(ids.has(target), `artifacts: link #${target} ("${text(a).trim()}") lands nowhere on the page`);
  }
  must(entries > 20 && links > 20, `artifacts: fixture yielded too little to check (${entries} entries, ${links} references)`);
  searchable(sec, (n) => attr(n, "data-kind") === "item" || attr(n, "data-kind") === "step", "artifacts");
  escapedEverywhere(html, "artifacts");
  return { entries, links };
}
// The nearest enclosing item node of a referenced-by line, so a nested item's line
// is not mistaken for its parent's.
function closestItem(n) { for (let p = n.parent; p; p = p.parent) if (attr(p, "data-kind") === "item") return p; return null; }

// ---- G4 decisions --------------------------------------------------------------------
async function checkDecisions() {
  const tmp = tempCopy();
  // The fixture may ship its own decisions (the example does, since leaf 1.2.5); this check owns
  // the whole decision set of its copy, so strip them first.
  for (const step of Object.keys(FOLDER)) {
    const sp = path.join(tmp, FOLDER[step], `${step}.json`);
    if (!fs.existsSync(sp)) continue;
    const sd = readJson(sp);
    if (sd.decisions) { delete sd.decisions; fs.writeFileSync(sp, JSON.stringify(sd, null, 2)); }
    fs.rmSync(path.join(tmp, FOLDER[step], "decisions"), { recursive: true, force: true });
  }
  const decPath = path.join(tmp, FOLDER.decompose, "decompose.json");
  const doc = readJson(decPath);
  const q = list(doc.open_questions)[0];
  const specDir = path.join(tmp, FOLDER.decompose, "decisions");
  fs.mkdirSync(specDir, { recursive: true });
  const specA = "ddd/03-decompose/decisions/D1-A.architecture.json";
  const specB = "ddd/03-decompose/decisions/D1-B.architecture.json";
  for (const p of [specA, specB]) fs.writeFileSync(path.join(tmp, "..", p), JSON.stringify({ format: "ddd-diagram-spec", version: 1, id: path.basename(p, ".architecture.json"), graph: { nodes: [], edges: [] } }));
  doc.decisions = [
    {
      id: "D1", question: "Which context owns the subscription week?", kind: "ownership",
      options: [
        { id: "A", summary: "Subscriptions owns the week", pros: ["one writer"], cons: ["billing must ask"], risks: [], diagram: specA },
        { id: "B", summary: "Billing owns the week", pros: ["charges are local"], cons: ["subscriptions must ask"], risks: ["two clocks"], diagram: specB },
        { id: "C", summary: "A shared week service", pros: [], cons: ["a third thing"], risks: ["chatty"] },
      ],
      chosen: "B", confidence: "medium", rationale: "The charge is the moment the week matters.",
      would_flip_if: ["a second billing provider arrives"], made_by: "strategist",
      records: q ? { open_question: q.id } : {},
    },
    {
      id: "D2", question: "Should fulfilment read the menu directly?", kind: "integration",
      options: [{ id: "A", summary: "Read it" }, { id: "B", summary: "Get told" }],
      confidence: "low", made_by: "step", supersedes: "decompose:D1",
    },
  ];
  fs.writeFileSync(decPath, JSON.stringify(doc, null, 2));

  // Data first: the worklist API.
  const ws = loadWorkspace(tmp);
  const open = X.openDecisions(ws);
  must(open.some((r) => r.id === "D2") && !open.some((r) => r.id === "D1"), `decisions: openDecisions() = [${open.map((r) => r.id)}], expected D2 only`);
  const rows = X.decisionRows(ws);
  must(rows[0] && rows[0].id === "D2", `decisions: open decision should come first, got ${rows.map((r) => r.id)}`);

  // Without a renderer: placeholders that name the spec path.
  const none = await render(tmp, ["decisions"], { decisionRenderer: null });
  const sec = byId(none.root, "decisions");
  if (!must(sec && cls(sec, "ddd-x"), "decisions: no <section id=decisions class=ddd-x>")) return;
  // The bare id is the anchor only when no earlier collection uses it (mealkit's
  // understand step has a deliverable D1), so the article is found by its
  // data-decision and its id must be the anchor decisionRows() reports.
  const byDecision = (id) => first(sec, (x) => attr(x, "data-decision") === id);
  const d1 = byDecision("D1");
  if (!must(d1, "decisions: no article for D1")) return;
  const r1 = rows.find((r) => r.id === "D1");
  must(r1 && attr(d1, "id") === r1.anchor && byId(none.root, r1.anchor) === d1, `decisions: D1 article id "${attr(d1, "id")}" is not the anchor decisionRows() reports (${r1 && r1.anchor})`);
  must(attr(d1, "data-open") === "false", "decisions: D1 is marked open although chosen");
  const row = first(d1, (x) => cls(x, "x-dec-row"));
  must(row && attr(row, "data-options") === "3" && (attr(row, "style") || "").includes("--n:3"), "decisions: D1 has no one-row grid of three (data-options=3, --n:3)");
  const cards = row ? row.children.filter((c) => cls(c, "x-opt")) : [];
  must(cards.length === 3, `decisions: D1 row has ${cards.length} cards, expected 3`);
  const chosen = cards.filter((c) => attr(c, "data-chosen") === "true");
  must(chosen.length === 1 && attr(chosen[0], "data-option") === "B", `decisions: expected exactly one chosen card (B), got ${chosen.map((c) => attr(c, "data-option"))}`);
  if (chosen[0]) {
    must(first(chosen[0], (x) => cls(x, "x-opt-mark")) && text(chosen[0]).includes("The charge is the moment"), "decisions: chosen card lacks its mark or rationale");
  }
  for (const c of cards.filter((x) => attr(x, "data-chosen") !== "true")) must(!first(c, (x) => cls(x, "x-opt-mark")), `decisions: option ${attr(c, "data-option")} carries a chosen mark`);
  const figs = all(d1, (x) => attr(x, "data-diagram-for") !== undefined);
  must(figs.length === 2 && figs.every((f) => attr(f, "data-missing") === "true"), `decisions: without a renderer expected 2 placeholders, got ${figs.length} figures`);
  for (const [f, p] of [[figs.find((x) => attr(x, "data-diagram-for") === "A"), specA], [figs.find((x) => attr(x, "data-diagram-for") === "B"), specB]]) must(f && text(f).includes(p), `decisions: placeholder does not name ${p}`);
  must(text(d1).includes("a second billing provider arrives"), "decisions: would_flip_if missing");
  if (q) must(first(d1, (x) => x.tag === "a" && text(x) === q.id), `decisions: records.open_question ${q.id} is not linked`);
  const d2 = byDecision("D2");
  const r2 = rows.find((r) => r.id === "D2");
  if (must(d2, "decisions: no article for D2")) {
    must(r2 && attr(d2, "id") === r2.anchor, `decisions: D2 article id "${attr(d2, "id")}" is not the anchor decisionRows() reports (${r2 && r2.anchor})`);
    must(attr(d2, "data-open") === "true", "decisions: D2 is not marked open");
    must(!first(d2, (x) => attr(x, "data-chosen") !== undefined) && !first(d2, (x) => cls(x, "x-opt-mark")), "decisions: open D2 carries a chosen mark");
    must(first(d2, (x) => x.tag === "a" && text(x) === "decompose:D1"), "decisions: supersedes link missing");
  }
  must(sec.children.length && rowsOrder(sec)[0] === "D2", "decisions: D2 (open) is not listed first in the section");

  // With a renderer: both specs become inline SVG on the cards.
  const stub = { optionSvg: async (workspace, decision, option, opts) => `<svg data-diagram="decision-${decision.id}-${option.id}" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>` };
  const drawn = await render(tmp, ["decisions"], { decisionRenderer: stub });
  const dd1 = first(byId(drawn.root, "decisions"), (x) => attr(x, "data-decision") === "D1");
  const svgs = dd1 ? all(dd1, (x) => attr(x, "data-diagram-for") !== undefined) : [];
  must(svgs.length === 2 && svgs.every((f) => attr(f, "data-missing") === undefined && first(f, (x) => x.tag === "svg")), `decisions: with a renderer expected 2 inline SVG figures, got ${svgs.length}`);
  must(svgs.map((f) => attr(f, "data-diagram-for")).sort().join() === "A,B", "decisions: diagrams are on the wrong cards");
  searchable(sec, (n) => attr(n, "data-decision") !== undefined, "decisions");
  escapedEverywhere(none.html, "decisions");

  // A workspace with no decisions at all: one honest sentence, no scaffold. Built from a stripped
  // copy, because the shipped example carries decisions since leaf 1.2.5.
  const bare = tempCopy();
  for (const step of Object.keys(FOLDER)) {
    const sp = path.join(bare, FOLDER[step], `${step}.json`);
    if (!fs.existsSync(sp)) continue;
    const sd = readJson(sp);
    if (sd.decisions) { delete sd.decisions; fs.writeFileSync(sp, JSON.stringify(sd, null, 2)); }
  }
  const empty = await render(bare, ["decisions"], { decisionRenderer: null });
  const es = empty.secs[0];
  must(es.empty === true && es.count === 0 && !first(byId(empty.root, "decisions"), (x) => x.tag === "table"), "decisions: fixture without decisions should be an honest empty section");
}
function rowsOrder(sec) { return all(sec, (x) => attr(x, "data-decision") !== undefined).map((x) => attr(x, "data-decision")); }

// ---- run -------------------------------------------------------------------------------
const RUN = { domain: checkDomain, contracts: checkContracts, stores: checkStores, artifacts: checkArtifacts, decisions: checkDecisions };
try {
  for (const w of wanted) {
    const before = problems.length;
    const r = await RUN[w]();
    console.log(`${w}: ${problems.length === before ? "ok" : `${problems.length - before} problem(s)`}${r ? ` ${JSON.stringify(r)}` : ""}`);
  }
} catch (e) {
  fail(`crashed: ${e && e.stack ? e.stack : e}`);
} finally {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
}
if (problems.length) {
  for (const p of problems.slice(0, 60)) console.error(`FAIL ${p}`);
  if (problems.length > 60) console.error(`... and ${problems.length - 60} more`);
  process.exit(1);
}
console.log("explorers verification passed");
