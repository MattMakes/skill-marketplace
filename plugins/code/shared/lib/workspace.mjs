// The spine (design §3.2): load a ddd/ workspace once and build one id index that the
// validator, the explorers, the decision cards and the diagram generators all project
// from. Markdown is linked, never parsed.
//
//   loadWorkspace("ddd") -> {
//     dddDir, projectRoot, manifest,
//     steps:    { understand?: {...}, ... }            step JSON that exists and parses
//     files:    { understand?: "<abs path>", ... }
//     problems: [{ step, path, error }]                 present but unparsable
//     schemas:  { "choose-meals": { id, path, schema, examplePath, example, invalidPath, invalid, entry } }
//     glossary: "<glossary.md text>" | null, glossaryPath,
//     index:    Map<key, entry>
//   }
//
// Index keys and entries. Every object that carries an `id` inside any array of any
// step JSON becomes an entry: `{ id, key, step, collection, path, idKey, object,
// referencedBy: [{step, path}], also: [key] }`. Canvases (define.canvases) and code
// contexts (code.contexts) are keyed by `context`; decisions by `id` and their options
// as `<Did>.<opt>`. Every entry has one unique key, `<step>:<collection>:<id>`, and
// is also reachable under `<step>:<id>` (the form the design uses in
// `supersedes: "decompose:D1"`) and under the bare `id`. Both aliases go to the first
// registration in document order, upstream step first, and that entry's `also` lists
// the keys of the other registrations sharing the alias: step-local ids such as `A1`
// or `Q1` repeat in every step, and `billing` is at once a decompose subdomain, a
// bounded context, a define canvas and a code context. `also` is the join the
// explorers want (see `usesOf`); it is not a reference.
//
// `referencedBy` is built by scanning every string value in every step JSON. A string
// equal to a known id records `{ step, path }` on the entry the string resolves to:
// the same step's registration when there is one (so `A1` inside discover means
// discover's assumption, not understand's), otherwise the bare id; a `<step>:<id>`
// string resolves directly. An object's own identity field is not a reference to
// itself. Paths read `connect.messages[2].consumers[0]` and are parsed back by
// `followPath`, so a consumer can walk from any reference to the value it points at.
//
// Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";

export const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];
export const FOLDER = Object.fromEntries(STEPS.map((s, i) => [s, `${String(i + 1).padStart(2, "0")}-${s}`]));
export const STEP_NO = Object.fromEntries(STEPS.map((s, i) => [s, i + 1]));

// Collections whose items are identified by `context` rather than `id`.
const CONTEXT_KEYED = new Set(["define.canvases", "code.contexts"]);

// ---------------------------------------------------------------------------
// Files and paths (validate.py helpers).
// ---------------------------------------------------------------------------
export function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// Project root = ddd_dir minus the manifest's relative ddd_dir, so a nested workspace
// such as docs/ddd resolves its artifact paths from the right place.
export function projectRoot(dddDir, manifest) {
  const rel = String((manifest && manifest.ddd_dir) || "ddd").replace(/^\/+|\/+$/g, "");
  const d = dddDir.replace(/[\\/]+$/, "");
  const unix = d.split(path.sep).join("/");
  if (unix.endsWith("/" + rel)) return d.slice(0, d.length - rel.length - 1);
  return path.dirname(d);
}

// Resolve a project-root-relative artifact path against THIS workspace's project
// root, never the CWD: validating <other>/ddd from a directory with its own ddd/
// would otherwise confirm the wrong files.
export function resolvePath(p, dddDir, manifest) {
  if (!p) return null;
  if (path.isAbsolute(p)) return p;
  return path.join(projectRoot(dddDir, manifest), p);
}

export function pathExists(p, dddDir, manifest) {
  if (!p) return true;
  return fs.existsSync(resolvePath(p, dddDir, manifest));
}

// ---------------------------------------------------------------------------
// Loading.
// ---------------------------------------------------------------------------
export function loadWorkspace(dddDirIn) {
  const dddDir = path.resolve(dddDirIn);
  const manifest = loadJson(path.join(dddDir, "manifest.json"));
  const root = projectRoot(dddDir, manifest);
  const steps = {};
  const files = {};
  const problems = [];
  for (const s of STEPS) {
    const file = path.join(dddDir, FOLDER[s], `${s}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      steps[s] = JSON.parse(fs.readFileSync(file, "utf8"));
      files[s] = file;
    } catch (e) {
      problems.push({ step: s, path: file, error: e.message });
    }
  }
  const glossaryPath = path.join(dddDir, "glossary.md");
  const glossary = fs.existsSync(glossaryPath) ? fs.readFileSync(glossaryPath, "utf8") : null;
  const schemas = loadSchemas(dddDir, manifest, steps.contracts);
  const index = buildIndex(steps);
  return { dddDir, projectRoot: root, manifest, steps, files, problems, schemas, glossary, glossaryPath, index };
}

// Contract schemas by stem: `choose-meals`, `choose-meals.response`, ... The contract
// entry's own `schema`/`example` paths win when they are set; the schemas/ folder is
// scanned as well so a companion file without an entry is still visible.
function loadSchemas(dddDir, manifest, contracts) {
  const out = {};
  const schemaDir = path.join(dddDir, FOLDER.contracts, "schemas");
  const exampleDir = path.join(dddDir, FOLDER.contracts, "examples");
  const add = (id, schemaPath) => {
    if (out[id]) return out[id];
    const examplePath = path.join(exampleDir, `${id}.json`);
    const invalidPath = path.join(exampleDir, `${id}.invalid.json`);
    out[id] = {
      id,
      path: schemaPath,
      schema: schemaPath && fs.existsSync(schemaPath) ? loadJson(schemaPath) : null,
      examplePath,
      example: fs.existsSync(examplePath) ? loadJson(examplePath) : null,
      invalidPath,
      invalid: fs.existsSync(invalidPath) ? loadJson(invalidPath) : null,
      entry: null,
    };
    return out[id];
  };
  for (const entry of asList(contracts && contracts.entries)) {
    if (!isDict(entry) || typeof entry.id !== "string") continue;
    const schemaPath = typeof entry.schema === "string" ? resolvePath(entry.schema, dddDir, manifest) : path.join(schemaDir, `${entry.id}.schema.json`);
    const rec = add(entry.id, schemaPath);
    rec.entry = entry;
    if (typeof entry.example === "string") {
      rec.examplePath = resolvePath(entry.example, dddDir, manifest);
      rec.example = fs.existsSync(rec.examplePath) ? loadJson(rec.examplePath) : null;
    }
  }
  if (fs.existsSync(schemaDir)) {
    for (const name of fs.readdirSync(schemaDir).sort()) {
      if (!name.endsWith(".schema.json")) continue;
      add(name.slice(0, -".schema.json".length), path.join(schemaDir, name));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Index.
// ---------------------------------------------------------------------------
export function buildIndex(steps) {
  const index = new Map();
  const byObject = new Map();
  const register = (id, step, collection, objPath, idKey, object) => {
    // `<step>:<collection>:<id>` is unique (a duplicate inside one collection is a
    // validate error, not an index concern); `<step>:<id>` and the bare id go to the
    // first registration and remember the rest in `also`.
    const key = `${step}:${collection}:${id}`;
    if (index.has(key)) return index.get(key);
    const entry = { id, key, step, collection, path: objPath, idKey, object, referencedBy: [], also: [] };
    index.set(key, entry);
    for (const alias of [`${step}:${id}`, id]) {
      if (!index.has(alias)) index.set(alias, entry);
      else if (!index.get(alias).also.includes(key) && index.get(alias) !== entry) index.get(alias).also.push(key);
    }
    byObject.set(object, entry);
    return entry;
  };

  // Registration pass, upstream steps first so the bare id lands on the origin.
  for (const step of STEPS) {
    const doc = steps[step];
    if (!isDict(doc)) continue;
    walk(doc, step, (value, p, parent, key) => {
      if (!Array.isArray(parent) || !isDict(value)) return;
      const collection = collectionOf(p);
      // Options are registered by their decision as `<Did>.<opt>`; a bare `A` would
      // only collide across decisions.
      if (collection === "decisions.options") return;
      const qualified = `${step}.${collection}`;
      let idKey = null;
      if (isId(value.id)) idKey = "id";
      else if (CONTEXT_KEYED.has(qualified) && isId(value.context)) idKey = "context";
      if (!idKey) return;
      const id = String(value[idKey]);
      register(id, step, collection, p, idKey, value);
      // Decision options are keyed under their decision: D1.A, D1.B, ...
      if (collection === "decisions" && idKey === "id") {
        asList(value.options).forEach((opt, i) => {
          if (isDict(opt) && isId(opt.id)) register(`${id}.${opt.id}`, step, "decisions.options", `${p}.options[${i}]`, "id", opt);
        });
      }
    });
  }

  // Reference pass.
  for (const step of STEPS) {
    const doc = steps[step];
    if (!isDict(doc)) continue;
    walk(doc, step, (value, p, parent, key) => {
      if (typeof value !== "string" || !value) return;
      if (isDict(parent)) {
        const own = byObject.get(parent);
        if (own && key === own.idKey) return;
        // A decision option's `id` is registered as `<Did>.<opt>`, so `key === "id"` on
        // an option is its identity too.
        if (own && own.collection === "decisions.options" && key === "id") return;
      }
      // A decision's `chosen` names one of its own options, which are indexed as
      // `<Did>.<opt>`.
      let target = null;
      if (isDict(parent) && key === "chosen") {
        const own = byObject.get(parent);
        if (own && own.collection === "decisions") target = index.get(`${step}:decisions.options:${own.id}.${value}`) || null;
      }
      if (!target) target = resolveId(index, value, step);
      if (target) target.referencedBy.push({ step, path: p });
    });
  }
  return index;
}

// The entry a string refers to from inside `step`: same-step registration first, then
// the bare id, then a `<step>:<id>` spelling.
export function resolveId(index, value, step) {
  return index.get(`${step}:${value}`) || index.get(value) || null;
}

// Every place an id and its same-id registrations in other steps are referenced.
export function usesOf(index, id) {
  const first = index.get(id);
  if (!first) return [];
  const seen = new Set();
  const out = [];
  for (const e of [first, ...first.also.map((k) => index.get(k)).filter(Boolean)]) {
    for (const r of e.referencedBy) {
      const k = `${r.step} ${r.path}`;
      if (!seen.has(k)) { seen.add(k); out.push(r); }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Paths: `step.key[3].other["odd key"]`.
// ---------------------------------------------------------------------------
const PLAIN_KEY = /^[A-Za-z_$][A-Za-z0-9_$-]*$/;

function segment(key) {
  if (typeof key === "number") return `[${key}]`;
  return PLAIN_KEY.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
}

// Walk a document depth first, calling visit(value, path, parent, key) for every value
// below the root. Only plain objects and arrays are descended into.
function walk(doc, step, visit) {
  const rec = (value, p) => {
    if (Array.isArray(value)) {
      value.forEach((item, i) => { const q = `${p}[${i}]`; visit(item, q, value, i); rec(item, q); });
    } else if (isDict(value)) {
      for (const k of Object.keys(value)) { const q = p + segment(k); visit(value[k], q, value, k); rec(value[k], q); }
    }
  };
  rec(doc, step);
}

export function parsePath(p) {
  const parts = [];
  let i = 0;
  const readWord = () => { const m = /^[^.[]+/.exec(p.slice(i)); i += m[0].length; return m[0]; };
  parts.push(readWord());
  while (i < p.length) {
    if (p[i] === ".") { i++; parts.push(readWord()); continue; }
    if (p[i] === "[") {
      if (p[i + 1] === '"') {
        const end = findStringEnd(p, i + 1);
        parts.push(JSON.parse(p.slice(i + 1, end + 1)));
        i = end + 2;
      } else {
        const end = p.indexOf("]", i);
        parts.push(parseInt(p.slice(i + 1, end), 10));
        i = end + 1;
      }
      continue;
    }
    throw new Error(`bad path: ${p}`);
  }
  return parts;
}

function findStringEnd(s, start) {
  for (let j = start + 1; j < s.length; j++) {
    if (s[j] === "\\") { j++; continue; }
    if (s[j] === '"') return j;
  }
  throw new Error(`unterminated key in path: ${s}`);
}

// The value at a path, or undefined when any segment is missing.
export function followPath(steps, p) {
  const [step, ...rest] = parsePath(p);
  let node = steps[step];
  for (const seg of rest) {
    if (node === null || typeof node !== "object") return undefined;
    if (Array.isArray(node) ? typeof seg !== "number" : typeof seg !== "string") return undefined;
    if (!Object.prototype.hasOwnProperty.call(node, seg)) return undefined;
    node = node[seg];
  }
  return node;
}

// The collection an array item belongs to: the string segments of its path after the
// step, dotted. `define.canvases[0].inbound[1].messages[0]` -> `canvases.inbound.messages`.
export function collectionOf(p) {
  return parsePath(p).slice(1).filter((seg) => typeof seg === "string").join(".");
}

function isId(v) {
  return (typeof v === "string" && v.length > 0) || (typeof v === "number" && Number.isFinite(v));
}

function isDict(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asList(v) {
  return Array.isArray(v) ? v : [];
}
