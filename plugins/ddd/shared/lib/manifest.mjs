// ddd/manifest.json: create (init), record a step status (mark), bump produced_at (stamp).
//
// Ported statement-for-statement from init.py, mark_step.py and stamp.py because the
// goldens compare stdout byte for byte and manifest.json structurally with key order
// intact. Python dicts keep insertion order and so do JS objects, so every key is
// assigned in the order the Python assigned it; a key that already exists keeps its
// place either way.
//
// Exit codes follow the Python: sys.exit("message") prints to stderr and exits 1, so
// a missing --project or a missing manifest is exit 1 here too (parity over the
// design's "usage/IO = 2"; leaf 1.4.1 owns any rewording). Argument errors are the
// CLI's business and exit 2 there.
import fs from "node:fs";
import path from "node:path";
import { pyDumps } from "./jsonschema.mjs";

export const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];
export const STATUSES = ["pending", "draft", "done", "skipped", "stale"];

// UTC, whole seconds, `Z` suffix: the staleness compare and the goldens both expect
// exactly `YYYY-MM-DDTHH:MM:SSZ`.
export function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function readManifest(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// json.dump(..., indent=2, ensure_ascii=False) + "\n". JSON.stringify with an indent of
// 2 produces the same bytes for everything the chain writes (non-ASCII preserved, the
// same escapes, the same layout for empty arrays and objects).
export function writeManifest(file, manifest) {
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
}

export function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

// An exit with a message on stderr, the way sys.exit("...") behaves.
export class ExitError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.exitCode = code;
  }
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
// opts: { dir, project, title, mode, depth, deployablesMin, deployablesMax, teams,
//         notes, source: [], fromUnderstand }; undefined means "not given".
// Returns { stdout: [lines], path }.
export function initWorkspace(opts) {
  const dddDir = path.resolve(opts.dir ?? "ddd");
  fs.mkdirSync(dddDir, { recursive: true });
  const file = path.join(dddDir, "manifest.json");
  let m;
  let created;
  if (fs.existsSync(file)) {
    m = readManifest(file);
    created = false;
  } else {
    if (!opts.project) throw new ExitError("error: --project is required when creating a new manifest");
    m = {
      schema_version: 1,
      project: opts.project,
      title: opts.title || opts.project,
      ddd_dir: relToCwd(dddDir),
      created: now(),
      updated: now(),
      mode: "interactive",
      depth: "standard",
      scale_target: { deployables_min: 1, deployables_max: 3, teams: 1, notes: "" },
      sources: [],
      steps: Object.fromEntries(STEPS.map((s) => [s, { status: "pending" }])),
    };
    created = true;
  }

  if (opts.fromUnderstand) {
    let u;
    try {
      u = JSON.parse(fs.readFileSync(opts.fromUnderstand, "utf8"));
    } catch (e) {
      throw new ExitError(`error: cannot read ${opts.fromUnderstand}: ${e.message}`);
    }
    if (isDict(u.scale_target)) {
      const st = setdefault(m, "scale_target", {});
      for (const [k, v] of Object.entries(u.scale_target)) {
        if (["deployables_min", "deployables_max", "teams", "notes"].includes(k)) st[k] = v;
      }
    }
    const name = isDict(u.system) ? u.system.name : undefined;
    if ((!m.title || m.title === m.project) && name) m.title = name;
  }
  if (opts.project) m.project = opts.project;
  if (opts.title) m.title = opts.title;
  if (opts.mode) m.mode = opts.mode;
  if (opts.depth) m.depth = opts.depth;
  const st = setdefault(m, "scale_target", {});
  if (opts.deployablesMin !== undefined && opts.deployablesMin !== null) st.deployables_min = opts.deployablesMin;
  if (opts.deployablesMax !== undefined && opts.deployablesMax !== null) st.deployables_max = opts.deployablesMax;
  if (opts.teams !== undefined && opts.teams !== null) st.teams = opts.teams;
  if (opts.notes !== undefined && opts.notes !== null) st.notes = opts.notes;
  for (const s of opts.source ?? []) {
    const sources = setdefault(m, "sources", []);
    if (!sources.includes(s)) sources.push(s);
  }
  for (const s of STEPS) setdefault(setdefault(m, "steps", {}), s, { status: "pending" });
  m.updated = now();

  writeManifest(file, m);
  const glossary = path.join(dddDir, "glossary.md");
  if (!fs.existsSync(glossary)) {
    fs.writeFileSync(glossary, `# Ubiquitous language: ${m.title}\n\n## Shared\n\n_(seeded by ddd-discover, refined by ddd-define)_\n`);
  }
  return {
    path: file,
    stdout: [
      (created ? "created " : "updated ") + file,
      // json.dumps with Python's default separators and ensure_ascii, because this
      // line is compared byte for byte.
      `mode=${m.mode} depth=${m.depth} scale_target=${pyDumps(m.scale_target)}`,
    ],
  };
}

// os.path.relpath(ddd_dir, os.getcwd()), always with forward slashes because the
// value lands in manifest.json as a project-relative path.
function relToCwd(dir) {
  const rel = path.relative(process.cwd(), dir) || ".";
  return rel.split(path.sep).join("/");
}

// ---------------------------------------------------------------------------
// mark
// ---------------------------------------------------------------------------
// opts: { mode, artifacts: string[]|undefined, openQuestions: number|undefined, note }.
// Returns { stdout: [line], path, entry }. Throws ExitError when the manifest is
// missing (exit 1, like sys.exit).
export function markStep(dir, step, status, opts = {}) {
  const file = path.join(dir, "manifest.json");
  if (!fs.existsSync(file)) throw new ExitError(`error: ${file} not found — run ddd init first`);
  const m = readManifest(file);
  const entry = setdefault(setdefault(m, "steps", {}), step, {});
  entry.status = status;
  entry.updated = now();
  if (opts.mode) entry.mode = opts.mode;
  if (opts.artifacts !== undefined && opts.artifacts !== null) entry.artifacts = opts.artifacts;
  const folder = stepFolder(step);
  if (opts.openQuestions !== undefined && opts.openQuestions !== null) {
    entry.open_questions = opts.openQuestions;
  } else {
    const art = path.join(dir, folder, `${step}.json`);
    if (fs.existsSync(art)) {
      try {
        const doc = JSON.parse(fs.readFileSync(art, "utf8"));
        const oq = isDict(doc) ? doc.open_questions : undefined;
        entry.open_questions = Array.isArray(oq) ? oq.length : (isDict(oq) ? Object.keys(oq).length : 0);
      } catch {
        // unreadable artifact: leave open_questions alone, as the Python does
      }
    }
  }
  if ((opts.artifacts === undefined || opts.artifacts === null) && (status === "done" || status === "draft")) {
    const found = walkArtifacts(dir, path.join(dir, folder));
    if (found.length) entry.artifacts = found;
  }
  if (opts.note !== undefined && opts.note !== null) entry.note = opts.note;
  m.updated = now();
  writeManifest(file, m);
  const oq = entry.open_questions;
  const n = Array.isArray(entry.artifacts) ? entry.artifacts.length : 0;
  const line = `${step}: ${status}` +
    (oq !== undefined && oq !== null ? ` (${oq} open questions)` : "") +
    (n ? `, ${n} artifacts` : "");
  return { path: file, entry, stdout: [line] };
}

export function stepFolder(step) {
  return `${String(STEPS.indexOf(step) + 1).padStart(2, "0")}-${step}`;
}

// os.walk over the step folder, dot-files skipped (dot-directories are not), paths
// relative to the parent of the workspace so they read `ddd/03-decompose/...`. The
// Python computes the base as dirname(abspath(dir)) when dir has a basename and as
// dir itself when it ends in a separator; that quirk is kept.
function walkArtifacts(dir, folder) {
  // Node's basename("ddd/") is "ddd" while Python's is "", so test the separator itself.
  const base = /[\\/]$/.test(dir) ? dir : path.dirname(path.resolve(dir));
  const out = [];
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && !ent.name.startsWith(".")) out.push(path.relative(base, p).split(path.sep).join("/"));
    }
  };
  walk(folder);
  return out.sort(cmpStr);
}

// ---------------------------------------------------------------------------
// stamp
// ---------------------------------------------------------------------------
// Sets produced_at on one artifact; returns the stdout line. Throws on an unreadable
// file (the Python traceback is not golden-recorded, so the CLI reports it plainly).
export function stamp(file, ts = now()) {
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  d.produced_at = ts;
  writeJson(file, d);
  return `${file}: produced_at=${ts}`;
}

// ---------------------------------------------------------------------------
function isDict(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function setdefault(obj, key, value) {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = value;
  return obj[key];
}

function cmpStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
