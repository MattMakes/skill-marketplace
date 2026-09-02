#!/usr/bin/env node
// Golden harness for the ddd toolchain: record the Python scripts once, replay the
// Node CLI against the snapshot forever after.
//
//   node golden.mjs record [--fixture <name>] [<cmd>...]     snapshot the Python twin (historical: the scripts are gone)
//   node golden.mjs record --from-node [<cmd>...]             snapshot the Node CLI (review only, see goldens/REWORDING.md)
//   node golden.mjs [--fixture <name>] [--twin <path>] [<cmd>...]   replay against the snapshot
//
// <cmd> is a subcommand from design §3.3, written either as separate words
// (`understand lint`) or as a slug (`understand-lint`). No <cmd> means all of them.
//
// Every variant runs against a fresh copy of a fixture (see fixtures/build.mjs),
// with cwd = the copy's project root and the workspace addressed as `ddd`, so the
// example under shared/examples is never touched and relative paths in the output
// are byte-stable across machines. What the run printed, its exit code and every
// file it added, changed or deleted under the project root are normalised and
// stored under goldens/<fixture>/<cmd-slug>/<variant-slug>/.
//
// Python is only needed by `record`. Replay runs `node <twin> <cmd words> <args>`
// where the twin defaults to shared/bin/ddd.mjs, so the goldens stay verifiable
// after the Python scripts are deleted. `--twin` exists for the harness's own
// controls (checks/1.1.4/check-golden-harness.mjs).
//
// Exit codes follow the repo convention: 0 pass, 1 mismatch, 2 usage or IO.
// Zero dependencies, Node >= 18.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FIXTURE_NAMES, materialise } from "./fixtures/build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = path.resolve(HERE, "..", "..");
export const GOLDENS_DIR = path.join(HERE, "goldens");
export const DEFAULT_TWIN = path.join(PLUGIN_ROOT, "shared", "bin", "ddd.mjs");
export const PASS_MARKER = "golden verification passed";

// Environment every recorded and replayed run gets on top of the parent's.
// DDD_NO_RENDER=1 is the `ddd mark` seam from the plan: the Node CLI must skip
// the review-page hook under it, and the Python twin never had one, so the two
// agree on stdout, exit code and manifest.json bytes. TZ and the encoding
// settings pin the parts of the output that would otherwise follow the machine.
export const RUN_ENV = {
  DDD_NO_RENDER: "1",
  TZ: "UTC",
  PYTHONIOENCODING: "utf-8",
  PYTHONHASHSEED: "0",
  NO_COLOR: "1",
};

// Files larger than this are stored as a hash of their normalised bytes instead
// of inline. Everything the chain writes today is far below it; the cap only
// keeps a runaway output from bloating the goldens directory.
const INLINE_LIMIT = 256 * 1024;

const DDD = "ddd";
const DISCOVER_JSON = "ddd/02-discover/discover.json";

// One entry per Node subcommand in design §3.3, mapped to the Python script it
// replaces and the argument variants worth pinning. Variant argv is exactly what
// follows the subcommand words on the command line, for both twins.
//
// Argparse usage errors are deliberately not recorded: they embed the Python
// program name (`usage: validate.py ...`) and could never match. IO and gate
// failures are recorded (a missing strategize.json on truncated-3, the dangling
// id on broken-refs) because their wording and exit code are part of the contract.
//
// A variant is either an argv array or `{ args, seed }`, where `seed` maps
// project-relative paths to either file contents (a string, written as-is) or
// an object that is shallow-merged into an existing JSON file. Seeds stand in
// for state an earlier step would have left behind, such as `.prefill/` briefs
// or a re-produced upstream artifact, so a single run can pin behaviour that
// otherwise needs a sequence (invariant 7: briefs are removed only after a full
// successful render/check; invariant 1: only `validate --status` writes `stale`).
//
// `files: "paths"` is the one policy exception. review.py stamps the page with
// the local wall-clock time and its own script path, and the plan hands the page
// to leaf 1.2.4 for a redesign, so review.html is compared by path only and the
// `(NN KB)` figure in its stdout is masked. Everything else is compared in full.
export const COMMANDS = [
  { words: ["validate"], py: "shared/scripts/validate.py", variants: {
    default: [DDD],
    json: [DDD, "--json"],
    status: [DDD, "--status"],
    "status-no-notes": [DDD, "--status", "--no-notes"],
    strict: [DDD, "--strict"],
    "step-decompose": [DDD, "--step", "decompose"],
    "step-contracts-json": [DDD, "--step", "contracts", "--json"],
    // Upstream re-produced after everything downstream: `--status` must write
    // `stale` into the manifest, the plain and --json runs must not.
    "stale-status": { args: [DDD, "--status"], seed: { "ddd/02-discover/discover.json": { produced_at: "2030-01-01T00:00:00Z" } } },
    "stale-default": { args: [DDD], seed: { "ddd/02-discover/discover.json": { produced_at: "2030-01-01T00:00:00Z" } } },
    "stale-json": { args: [DDD, "--json"], seed: { "ddd/02-discover/discover.json": { produced_at: "2030-01-01T00:00:00Z" } } },
  } },
  { words: ["init"], py: "shared/scripts/init.py", variants: {
    existing: ["--dir", DDD],
    "existing-flags": ["--dir", DDD, "--mode", "interactive", "--depth", "deep", "--teams", "2", "--source", "docs/notes.md"],
    fresh: ["--dir", "ddd2", "--project", "mealkit-two", "--title", "Meal kit two", "--mode", "auto", "--depth", "light",
      "--deployables-min", "1", "--deployables-max", "3", "--teams", "1", "--notes", "solo dev", "--source", "README.md"],
    "from-understand": ["--dir", DDD, "--from-understand", "ddd/01-understand/understand.json"],
  } },
  { words: ["mark"], py: "shared/scripts/mark_step.py", variants: {
    done: ["--dir", DDD, "discover", "done"],
    "draft-note": ["--dir", DDD, "contracts", "draft", "--mode", "auto", "--open-questions", "2", "--note", "hand check"],
    artifacts: ["--dir", DDD, "code", "done", "--artifacts", "ddd/08-code/code.json"],
    stale: ["--dir", DDD, "define", "stale"],
    skipped: ["--dir", DDD, "strategize", "skipped"],
  } },
  { words: ["stamp"], py: "shared/scripts/stamp.py", variants: {
    default: ["ddd/03-decompose/decompose.json"],
    multi: ["ddd/01-understand/understand.json", "ddd/02-discover/discover.json"],
  } },
  // Re-baselined from the Node CLI by leaf 1.4.1 (goldens/REWORDING.md): review.py's page
  // was superseded by the 1.2.4 redesign, so these snapshots describe `ddd review`, not
  // the Python twin. `--no-diagrams` keeps the snapshot independent of whether a Chrome
  // is installed (the PNG count would otherwise leak into stdout and the file list).
  { words: ["review"], py: "shared/scripts/review.py", files: "paths", stdoutMask: [[/\(\d+ KB\)/g, "(<KB> KB)"]], variants: {
    default: [DDD, "--no-diagrams"],
    "out-title": [DDD, "-o", "review-out.html", "--title", "Golden review", "--no-diagrams"],
  } },
  { words: ["understand", "lint"], py: "skills/ddd-understand/scripts/lint_understand.py", variants: {
    default: [DDD],
    json: [DDD, "--json"],
  } },
  { words: ["discover", "lint"], py: "skills/ddd-discover/scripts/lint_discover.py", variants: {
    default: [DISCOVER_JSON],
    "depth-deep": [DISCOVER_JSON, "--depth", "deep"],
  } },
  { words: ["discover", "render"], py: "skills/ddd-discover/scripts/render_event_storm.py", variants: {
    default: [DISCOVER_JSON],
    stdout: [DISCOVER_JSON, "--stdout"],
    "out-split-title": [DISCOVER_JSON, "-o", "ddd/02-discover/event-storm-alt.md", "--split", "always", "--title", "Storm"],
  } },
  { words: ["discover", "glossary"], py: "skills/ddd-discover/scripts/seed_glossary.py", variants: {
    default: [DISCOVER_JSON],
    "dry-run": [DISCOVER_JSON, "--dry-run"],
    "glossary-title": [DISCOVER_JSON, "--glossary", "ddd/glossary-alt.md", "--title", "Words"],
  } },
  { words: ["decompose", "worksheet"], py: "skills/ddd-decompose/scripts/boundary_worksheet.py", variants: {
    default: [DDD],
    json: [DDD, "--json"],
  } },
  { words: ["decompose", "check"], py: "skills/ddd-decompose/scripts/decompose_check.py", variants: {
    default: [DDD],
    json: [DDD, "--json"],
    "write-map": [DDD, "--write-map"],
    stamp: [DDD, "--stamp"],
    "sync-glossary": [DDD, "--sync-glossary"],
    all: [DDD, "--stamp", "--write-map", "--sync-glossary"],
  } },
  { words: ["strategize", "worksheet"], py: "skills/ddd-strategize/scripts/worksheet.py", variants: {
    default: [DDD],
    json: [DDD, "--json"],
  } },
  { words: ["strategize", "lint"], py: "skills/ddd-strategize/scripts/lint_strategize.py", variants: {
    default: [DDD],
  } },
  { words: ["strategize", "render"], py: "skills/ddd-strategize/scripts/render_chart.py", variants: {
    default: [DDD],
    stdout: [DDD, "--stdout"],
    styled: [DDD, "--styled"],
    "update-json": [DDD, "--update-json"],
    out: [DDD, "--out", "ddd/04-strategize/chart-alt.md"],
  } },
  { words: ["connect", "inputs"], py: "skills/ddd-connect/scripts/connect_inputs.py", variants: {
    default: [DDD],
    json: [DDD, "--json"],
  } },
  { words: ["connect", "render"], py: "skills/ddd-connect/scripts/render_connect.py", variants: {
    default: [DDD],
    check: [DDD, "--check"],
    "write-md": [DDD, "--write-md"],
    "write-mermaid": [DDD, "--write-mermaid"],
    "write-all-quiet": [DDD, "--write-md", "--write-mermaid", "--quiet"],
  } },
  { words: ["organise", "brief"], py: "skills/ddd-organise/scripts/organise_tools.py", pyPrefix: ["brief"], variants: {
    default: [DDD],
  } },
  { words: ["organise", "check"], py: "skills/ddd-organise/scripts/organise_tools.py", pyPrefix: ["check"], variants: {
    default: [DDD],
  } },
  { words: ["organise", "mermaid"], py: "skills/ddd-organise/scripts/organise_tools.py", pyPrefix: ["mermaid"], variants: {
    default: [DDD],
  } },
  { words: ["define", "prefill"], py: "skills/ddd-define/scripts/prefill.py", variants: {
    default: [DDD],
    "auto-light": [DDD, "--mode", "auto", "--depth", "light"],
    json: [DDD, "--json"],
    write: [DDD, "--write"],
    "context-print": [DDD, "--context", "billing", "--print"],
  } },
  { words: ["define", "render"], py: "skills/ddd-define/scripts/render.py", variants: {
    default: [DDD],
    "check-only": [DDD, "--check-only"],
    force: [DDD, "--force"],
    "no-glossary": [DDD, "--no-glossary"],
    context: [DDD, "--context", "billing"],
    "seeded-prefill": { args: [DDD], seed: { "ddd/07-define/.prefill/billing.md": "# billing brief (seed)\n", "ddd/07-define/.prefill/fulfilment.md": "# fulfilment brief (seed)\n" } },
    "seeded-prefill-context": { args: [DDD, "--context", "billing"], seed: { "ddd/07-define/.prefill/billing.md": "# billing brief (seed)\n", "ddd/07-define/.prefill/fulfilment.md": "# fulfilment brief (seed)\n" } },
  } },
  // code prefill has --mode but no --depth (see its argparse), so the auto
  // variant is `--mode auto` alone.
  { words: ["code", "prefill"], py: "skills/ddd-code/scripts/prefill.py", variants: {
    default: [DDD],
    auto: [DDD, "--mode", "auto"],
    "format-json": [DDD, "--format", "json"],
    "context-print": [DDD, "--context", "billing", "--print"],
    detect: [DDD, "--detect"],
    out: [DDD, "--context", "billing", "--out", "code-brief-out.md"],
  } },
  { words: ["code", "check"], py: "skills/ddd-code/scripts/check_code.py", variants: {
    default: [DDD],
    json: [DDD, "--json"],
    strict: [DDD, "--strict"],
    "keep-prefill": [DDD, "--keep-prefill"],
    "seeded-prefill": { args: [DDD], seed: { "ddd/08-code/.prefill/billing.md": "# billing brief (seed)\n", "ddd/08-code/.prefill/subscriptions.md": "# subscriptions brief (seed)\n" } },
    "seeded-prefill-keep": { args: [DDD, "--keep-prefill"], seed: { "ddd/08-code/.prefill/billing.md": "# billing brief (seed)\n", "ddd/08-code/.prefill/subscriptions.md": "# subscriptions brief (seed)\n" } },
    "seeded-prefill-json": { args: [DDD, "--json"], seed: { "ddd/08-code/.prefill/billing.md": "# billing brief (seed)\n", "ddd/08-code/.prefill/subscriptions.md": "# subscriptions brief (seed)\n" } },
  } },
  { words: ["contracts", "prefill"], py: "skills/ddd-contracts/scripts/contracts.py", pyPrefix: ["prefill"], variants: {
    default: [DDD],
    "auto-light": [DDD, "--mode", "auto", "--depth", "light"],
    "no-schema-refresh": [DDD, "--no-schema-refresh"],
  } },
  { words: ["contracts", "check"], py: "skills/ddd-contracts/scripts/contracts.py", pyPrefix: ["check"], variants: {
    default: [DDD],
    json: [DDD, "--json"],
    strict: [DDD, "--strict"],
  } },
  { words: ["contracts", "render"], py: "skills/ddd-contracts/scripts/contracts.py", pyPrefix: ["render"], variants: {
    default: [DDD],
  } },
];

// Variants as `[name, args, seed]` triples regardless of how they were written.
export function variantsOf(cmd) {
  return Object.entries(cmd.variants).map(([name, v]) =>
    Array.isArray(v) ? [name, v, {}] : [name, v.args, v.seed || {}]);
}

export function slugOf(cmd) {
  return cmd.words.join("-");
}

// Resolve subcommand words (or a slug) to a table entry; used by the harness's
// own controls to re-dispatch a call to the recorded Python script.
export function findCommand(words) {
  const slug = words.join("-");
  return COMMANDS.find((c) => slugOf(c) === slug) || null;
}

// The Python argv that the subcommand words plus variant args stand for.
export function pythonArgv(cmd, args) {
  return [path.join(PLUGIN_ROOT, cmd.py), ...(cmd.pyPrefix || []), ...args];
}

// ---------------------------------------------------------------------------
// Normalisation. The rules are the ones the plan lists, applied in a fixed
// order: the workspace path first (it is a prefix of the root), then the root,
// then timestamps. Both spellings of a macOS temp path are covered because
// Python's abspath keeps `/var/...` while Node's realpath gives `/private/var/...`.
// ---------------------------------------------------------------------------
// `Z` is what the writers emit; `+00:00` is how validate prints a parsed
// timestamp in its staleness warning. Both are the same instant.
const ISO_TS = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|\+00:00)/g;

export function makeNormaliser(root, extra = []) {
  const roots = [...new Set([root, safeRealpath(root)])].sort((a, b) => b.length - a.length);
  const pairs = [];
  // `<root>/ddd` only when the path ends there or continues with a separator,
  // otherwise `<root>/ddd2` (init --dir ddd2) would come out as `<DDD_DIR>2`.
  for (const r of roots) pairs.push([new RegExp(`${escapeRegExp(path.join(r, DDD))}(?![A-Za-z0-9_.-])`, "g"), "<DDD_DIR>"]);
  for (const r of roots) pairs.push([new RegExp(escapeRegExp(r), "g"), "<ROOT>"]);
  return (text) => {
    let out = text;
    for (const [re, to] of pairs) out = out.replace(re, to);
    out = out.replace(ISO_TS, "<TS>");
    for (const [re, to] of extra) out = out.replace(re, to);
    return out;
  };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeRealpath(p) {
  try { return fs.realpathSync(p); } catch { return p; }
}

// ---------------------------------------------------------------------------
// File inventory: every regular file under the project root, so writes outside
// `ddd/` (init --dir ddd2, review -o, prefill --out) are caught too.
// ---------------------------------------------------------------------------
function inventory(root) {
  const out = new Map();
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort(byName)) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile()) out.set(path.relative(root, p).split(path.sep).join("/"), fs.readFileSync(p));
    }
  };
  walk(root);
  return out;
}

// Codepoint order, not locale order, so goldens recorded on another machine
// list files identically.
function byName(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function isText(buf) {
  if (buf.includes(0)) return false;
  try { new TextDecoder("utf-8", { fatal: true }).decode(buf); return true; } catch { return false; }
}

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

// Turn a before/after inventory pair into the files.json shape.
function fileDelta(before, after, normalise, policy) {
  const changed = [];
  const deleted = [];
  for (const [rel, buf] of after) {
    const prev = before.get(rel);
    if (prev && prev.equals(buf)) continue;
    const entry = { path: rel, kind: prev ? "modified" : "added" };
    if (policy === "paths") { changed.push(entry); continue; }
    if (isText(buf)) {
      const text = normalise(buf.toString("utf8"));
      if (Buffer.byteLength(text) <= INLINE_LIMIT) entry.content = text;
      else entry.sha256 = sha256(text);
    } else {
      entry.sha256 = sha256(buf);
    }
    changed.push(entry);
  }
  for (const rel of before.keys()) if (!after.has(rel)) deleted.push(rel);
  return { changed, deleted: deleted.sort() };
}

// ---------------------------------------------------------------------------
// Running one variant. `invoke` builds the argv; everything else is shared
// between record and replay so both sides are snapshotted the same way.
// ---------------------------------------------------------------------------
function runVariant({ fixture, cmd, variant, args, seed = {}, invoke, tmpBase, extraEnv = {} }) {
  const root = materialise(fixture, fs.mkdtempSync(path.join(tmpBase, `${slugOf(cmd)}-${variant}-`)));
  for (const [rel, value] of Object.entries(seed)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (typeof value === "string") {
      fs.writeFileSync(p, value);
    } else {
      const doc = { ...JSON.parse(fs.readFileSync(p, "utf8")), ...value };
      fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n");
    }
  }
  const before = inventory(root);
  const [file, ...argv] = invoke(cmd, args);
  const res = spawnSync(file, argv, {
    cwd: root,
    env: { ...process.env, ...RUN_ENV, ...extraEnv },
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) {
    return { root, error: res.error, argv: [file, ...argv] };
  }
  const normalise = makeNormaliser(root, cmd.stdoutMask || []);
  const after = inventory(root);
  return {
    root,
    argv: [file, ...argv],
    stdout: normalise(res.stdout.toString("utf8")),
    stderr: normalise(res.stderr.toString("utf8")),
    exit: res.status === null ? `signal:${res.signal}` : String(res.status),
    files: fileDelta(before, after, normalise, cmd.files || "content"),
  };
}

function snapshotDir(fixture, cmd, variant) {
  return path.join(GOLDENS_DIR, fixture, slugOf(cmd), variant);
}

function writeSnapshot(dir, snap, meta) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "stdout.txt"), snap.stdout);
  fs.writeFileSync(path.join(dir, "stderr.txt"), snap.stderr);
  fs.writeFileSync(path.join(dir, "exit.txt"), snap.exit + "\n");
  fs.writeFileSync(path.join(dir, "files.json"), JSON.stringify(snap.files, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
}

export function readSnapshot(dir) {
  const read = (n) => fs.readFileSync(path.join(dir, n), "utf8");
  return {
    stdout: read("stdout.txt"),
    stderr: read("stderr.txt"),
    exit: read("exit.txt").trim(),
    files: JSON.parse(read("files.json")),
    meta: JSON.parse(read("meta.json")),
  };
}

// ---------------------------------------------------------------------------
// Comparison. JSON is compared structurally when both sides parse, which is
// what makes Python's `1.0` and Node's `1` equal; anything else is compared
// byte for byte, trailing whitespace included.
// ---------------------------------------------------------------------------
function parseJson(text) {
  try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false }; }
}

function canonical(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

// Returns null when equal, otherwise the two texts to diff.
function compareText(expected, actual) {
  if (expected === actual) return null;
  const a = parseJson(expected);
  const b = parseJson(actual);
  if (a.ok && b.ok) {
    const ca = canonical(a.value);
    const cb = canonical(b.value);
    return ca === cb ? null : [ca, cb];
  }
  return [expected, actual];
}

function compareSnapshots(expected, actual) {
  const problems = [];
  const text = (label, e, a) => {
    const d = compareText(e, a);
    if (d) problems.push({ label, diff: unifiedDiff(d[0], d[1], `expected/${label}`, `actual/${label}`) });
  };
  if (expected.exit !== actual.exit) {
    problems.push({ label: "exit", diff: `expected exit ${expected.exit}, got ${actual.exit}` });
  }
  text("stdout", expected.stdout, actual.stdout);
  text("stderr", expected.stderr, actual.stderr);

  const byPath = (list) => new Map(list.map((e) => [e.path, e]));
  const ec = byPath(expected.files.changed);
  const ac = byPath(actual.files.changed);
  for (const [rel, e] of ec) {
    const a = ac.get(rel);
    if (!a) { problems.push({ label: `files/${rel}`, diff: `expected ${e.kind} file ${rel}, but it was not written` }); continue; }
    if (e.kind !== a.kind) problems.push({ label: `files/${rel}`, diff: `expected ${rel} to be ${e.kind}, got ${a.kind}` });
    if ("content" in e) {
      if (!("content" in a)) problems.push({ label: `files/${rel}`, diff: `expected inline content for ${rel}, got a hash` });
      else text(`files/${rel}`, e.content, a.content);
    } else if ("sha256" in e) {
      const got = "sha256" in a ? a.sha256 : sha256(a.content);
      if (got !== e.sha256) problems.push({ label: `files/${rel}`, diff: `sha256 of ${rel}: expected ${e.sha256}, got ${got}` });
    }
  }
  for (const rel of ac.keys()) {
    if (!ec.has(rel)) problems.push({ label: `files/${rel}`, diff: `unexpected file written: ${rel}` });
  }
  const ed = new Set(expected.files.deleted);
  const ad = new Set(actual.files.deleted);
  for (const rel of ed) if (!ad.has(rel)) problems.push({ label: `files/${rel}`, diff: `expected ${rel} to be deleted, it still exists` });
  for (const rel of ad) if (!ed.has(rel)) problems.push({ label: `files/${rel}`, diff: `unexpected deletion: ${rel}` });
  return problems;
}

// A small unified diff (LCS on lines, three lines of context). Inputs are
// capped so a runaway mismatch prints a bounded amount.
export function unifiedDiff(a, b, aName = "expected", bName = "actual") {
  const A = a.split("\n");
  const B = b.split("\n");
  const CAP = 4000;
  if (A.length > CAP || B.length > CAP) {
    const i = firstDifference(A, B);
    return `--- ${aName}\n+++ ${bName}\n(too large for a full diff: ${A.length} vs ${B.length} lines; first difference at line ${i + 1})\n-${A[i] ?? "<eof>"}\n+${B[i] ?? "<eof>"}`;
  }
  // LCS table.
  const n = A.length;
  const m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push([" ", A[i]]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { ops.push(["-", A[i]]); i++; }
    else { ops.push(["+", B[j]]); j++; }
  }
  while (i < n) ops.push(["-", A[i++]]);
  while (j < m) ops.push(["+", B[j++]]);
  // Keep only hunks around changes.
  const keep = new Array(ops.length).fill(false);
  for (let k = 0; k < ops.length; k++) {
    if (ops[k][0] !== " ") for (let c = Math.max(0, k - 3); c <= Math.min(ops.length - 1, k + 3); c++) keep[c] = true;
  }
  const lines = [`--- ${aName}`, `+++ ${bName}`];
  let inHunk = false;
  for (let k = 0; k < ops.length; k++) {
    if (!keep[k]) { if (inHunk) lines.push("@@"); inHunk = false; continue; }
    inHunk = true;
    lines.push(ops[k][0] + ops[k][1]);
  }
  return lines.join("\n");
}

function firstDifference(A, B) {
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) if (A[i] !== B[i]) return i;
  return n;
}

// ---------------------------------------------------------------------------
// Modes.
// ---------------------------------------------------------------------------
function pythonInvoke(cmd, args) {
  return [process.env.PYTHON || "python3", ...pythonArgv(cmd, args)];
}

export function record({ commands, fixtures, fromNode = false, log = console.log }) {
  const python = process.env.PYTHON || "python3";
  const probe = fromNode ? { stdout: process.version, stderr: "" } : spawnSync(python, ["--version"], { encoding: "utf8" });
  if (probe.error) {
    throw new UsageError(`record needs ${python} on PATH (set PYTHON to override): ${probe.error.message}`);
  }
  const nodeInvoke = (c, a) => [process.execPath, DEFAULT_TWIN, ...c.words, ...a];
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-golden-record-"));
  let count = 0;
  try {
    for (const cmd of commands) {
      const script = path.join(PLUGIN_ROOT, cmd.py);
      if (!fromNode && !fs.existsSync(script)) throw new UsageError(`cannot record ${slugOf(cmd)}: ${script} does not exist`);
      for (const fixture of fixtures) {
        for (const [variant, args, seed] of variantsOf(cmd)) {
          const snap = runVariant({ fixture, cmd, variant, args, seed, invoke: fromNode ? nodeInvoke : pythonInvoke, tmpBase });
          if (snap.error) throw new UsageError(`${slugOf(cmd)} ${variant}: ${snap.error.message}`);
          const meta = {
            fixture,
            command: cmd.words,
            variant,
            args,
            seed,
            twin: fromNode
              ? ["node", path.relative(PLUGIN_ROOT, DEFAULT_TWIN), ...cmd.words]
              : ["python3", path.relative(PLUGIN_ROOT, path.join(PLUGIN_ROOT, cmd.py)), ...(cmd.pyPrefix || [])],
            cwd: "<ROOT>",
            env: RUN_ENV,
            files_policy: cmd.files || "content",
            [fromNode ? "node" : "python"]: probe.stdout.trim() || probe.stderr.trim(),
          };
          const dir = snapshotDir(fixture, cmd, variant);
          fs.rmSync(dir, { recursive: true, force: true });
          writeSnapshot(dir, snap, meta);
          count++;
          log(`recorded ${fixture} ${slugOf(cmd)} ${variant} (exit ${snap.exit}, ${snap.files.changed.length} written, ${snap.files.deleted.length} deleted)`);
        }
      }
    }
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
  return count;
}

export function replay({ commands, fixtures, twin = DEFAULT_TWIN, log = console.log }) {
  if (!fs.existsSync(twin)) {
    throw new UsageError(`command under test not found: ${twin}\n` +
      "replay runs `node <twin> <cmd> ...`; build shared/bin/ddd.mjs first or pass --twin <path>.");
  }
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-golden-replay-"));
  let total = 0;
  let failed = 0;
  try {
    for (const cmd of commands) {
      for (const fixture of fixtures) {
        for (const [variant, args, seed] of variantsOf(cmd)) {
          const dir = snapshotDir(fixture, cmd, variant);
          total++;
          if (!fs.existsSync(path.join(dir, "exit.txt"))) {
            failed++;
            log(`FAIL ${fixture} ${slugOf(cmd)} ${variant}: no golden recorded at ${path.relative(process.cwd(), dir)} (run: node golden.mjs record ${slugOf(cmd)})`);
            continue;
          }
          const expected = readSnapshot(dir);
          const snap = runVariant({
            fixture, cmd, variant, args, seed, tmpBase,
            invoke: (c, a) => [process.execPath, twin, ...c.words, ...a],
            // Tell a control twin which snapshot it stands in for. The real CLI
            // ignores these.
            extraEnv: {
              GOLDEN_SNAPSHOT_DIR: dir,
              GOLDEN_FIXTURE: fixture,
              GOLDEN_COMMAND: slugOf(cmd),
              GOLDEN_VARIANT: variant,
            },
          });
          if (snap.error) {
            failed++;
            log(`FAIL ${fixture} ${slugOf(cmd)} ${variant}: could not run twin: ${snap.error.message}`);
            continue;
          }
          const problems = compareSnapshots(expected, snap);
          if (problems.length === 0) {
            log(`ok   ${fixture} ${slugOf(cmd)} ${variant}`);
          } else {
            failed++;
            log(`FAIL ${fixture} ${slugOf(cmd)} ${variant} (${problems.length} mismatch${problems.length === 1 ? "" : "es"})`);
            for (const p of problems) log(indent(p.diff));
          }
        }
      }
    }
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
  return { total, failed };
}

function indent(s) {
  return s.split("\n").map((l) => "    " + l).join("\n");
}

export class UsageError extends Error {}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------
const USAGE = `usage: node golden.mjs record [--fixture <name>] [--from-node] [<cmd>...]
       node golden.mjs [--fixture <name>] [--twin <path>] [<cmd>...]
commands: ${COMMANDS.map(slugOf).join(", ")}
fixtures: ${FIXTURE_NAMES.join(", ")}`;

// Consume subcommand words greedily: two words when they name a command, else one.
export function parseCommandWords(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const two = tokens[i + 1] !== undefined ? findCommand([tokens[i], tokens[i + 1]]) : null;
    if (two) { out.push(two); i += 2; continue; }
    const one = findCommand([tokens[i]]) || findCommand(tokens[i].split("-"));
    if (!one) throw new UsageError(`unknown command '${tokens[i]}'\n${USAGE}`);
    out.push(one);
    i += 1;
  }
  return out;
}

export function parseArgs(argv) {
  const opts = { mode: "replay", fixtures: [...FIXTURE_NAMES], twin: DEFAULT_TWIN, tokens: [], fromNode: false };
  const rest = [...argv];
  if (rest[0] === "record") { opts.mode = "record"; rest.shift(); }
  while (rest.length) {
    const t = rest.shift();
    if (t === "--fixture") {
      const f = rest.shift();
      if (!f || !FIXTURE_NAMES.includes(f)) throw new UsageError(`--fixture needs one of ${FIXTURE_NAMES.join(", ")}\n${USAGE}`);
      opts.fixtures = [f];
    } else if (t === "--twin") {
      const p = rest.shift();
      if (!p) throw new UsageError(`--twin needs a path\n${USAGE}`);
      if (opts.mode === "record") throw new UsageError(`--twin applies to replay only\n${USAGE}`);
      opts.twin = path.resolve(p);
    } else if (t === "--from-node") {
      // Snapshot the Node CLI itself instead of the Python twin. Used once, by leaf
      // 1.4.1, to re-baseline `review` after review.py was superseded (goldens/REWORDING.md).
      if (opts.mode !== "record") throw new UsageError(`--from-node applies to record only\n${USAGE}`);
      opts.fromNode = true;
    } else if (t === "-h" || t === "--help") {
      throw new UsageError(USAGE);
    } else if (t.startsWith("-")) {
      throw new UsageError(`unknown option ${t}\n${USAGE}`);
    } else {
      opts.tokens.push(t);
    }
  }
  opts.commands = opts.tokens.length ? parseCommandWords(opts.tokens) : [...COMMANDS];
  return opts;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    if (e instanceof UsageError) { console.error(e.message); return 2; }
    throw e;
  }
  try {
    if (opts.mode === "record") {
      const n = record({ commands: opts.commands, fixtures: opts.fixtures, fromNode: opts.fromNode });
      console.log(`recorded ${n} golden variant(s) into ${path.relative(process.cwd(), GOLDENS_DIR)}`);
      return 0;
    }
    const { total, failed } = replay({ commands: opts.commands, fixtures: opts.fixtures, twin: opts.twin });
    if (failed === 0 && total > 0) {
      console.log(`${total} variant(s) matched`);
      console.log(PASS_MARKER);
      return 0;
    }
    if (total === 0) { console.error("nothing to replay"); return 2; }
    console.log(`golden verification FAILED: ${failed} of ${total} variant(s) differ`);
    return 1;
  } catch (e) {
    if (e instanceof UsageError) { console.error(`error: ${e.message}`); return 2; }
    throw e;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
