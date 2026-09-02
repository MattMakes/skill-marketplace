#!/usr/bin/env node
// G4 for leaf 1.1.1: the CLI shell's surface. `ddd` with no arguments and `ddd
// <unknown>` exit 2 with usage on stderr; `ddd --help` exits 0 and lists every
// subcommand of design §3.3 (parsed from the document, so the two cannot drift);
// a subcommand whose module has not landed exits 2 with the "not implemented yet"
// message; argument errors on the built-in commands exit 2.
//
// Usage: node plugins/ddd/shared/tests/checks/1.1.1/check-cli-surface.mjs
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKER = "cli-surface verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const REPO = path.resolve(PLUGIN, "..", "..");
const BIN = path.join(PLUGIN, "shared", "bin", "ddd.mjs");
const DESIGN = path.join(REPO, "ai_docs", "designs", "2026-09-01-ddd-node-visual-design.md");

if (process.argv.length > 2) {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.1.1/check-cli-surface.mjs");
  process.exit(2);
}
for (const f of [BIN, DESIGN]) {
  if (!fs.existsSync(f)) { console.error(`error: ${f} not found`); process.exit(2); }
}

const failures = [];
const fail = (m) => failures.push(m);

function ddd(args, opts = {}) {
  const r = spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" }, cwd: opts.cwd ?? REPO });
  if (r.error) throw r.error;
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// Design §3.3, Node column: `ddd validate …`, `ddd discover lint\|render\|glossary …`,
// `ddd decision render <dir> <Did>`.
function parseDesignTable(md) {
  const start = md.indexOf("### 3.3 Command parity");
  const end = md.indexOf("### 3.4", start);
  if (start < 0 || end < 0) throw new Error("design §3.3 table not found");
  const out = new Set();
  for (const m of md.slice(start, end).matchAll(/\|\s*`ddd ([^`]*)`/g)) {
    const words = m[1].replace(/\\\|/g, "|").trim().split(/\s+/).filter((w) => !/^[<…(\[]/.test(w));
    if (!words.length) continue;
    const alts = (words[1] || "").split("|").filter(Boolean);
    if (!alts.length) out.add(words[0]);
    else for (const a of alts) out.add(`${words[0]} ${a}`);
  }
  return out;
}

// 1. No arguments: usage on stderr, exit 2, nothing on stdout.
{
  const r = ddd([]);
  if (r.code !== 2) fail(`ddd (no args): exit ${r.code}, expected 2`);
  if (!/usage:/i.test(r.err)) fail("ddd (no args): no usage on stderr");
  if (r.out) fail("ddd (no args): wrote to stdout");
}

// 2. Unknown command, and a known head word with an unknown verb.
for (const argv of [["bogus"], ["discover", "bogus"], ["--bogus"]]) {
  const r = ddd(argv);
  if (r.code !== 2) fail(`ddd ${argv.join(" ")}: exit ${r.code}, expected 2`);
  if (!/usage:/i.test(r.err)) fail(`ddd ${argv.join(" ")}: no usage on stderr`);
}

// 3. --help lists every subcommand from the design table, exit 0, on stdout.
const commands = parseDesignTable(fs.readFileSync(DESIGN, "utf8"));
if (commands.size < 20) fail(`design §3.3 parsed to only ${commands.size} subcommand(s)`);
{
  const r = ddd(["--help"]);
  if (r.code !== 0) fail(`ddd --help: exit ${r.code}, expected 0`);
  if (r.err) fail("ddd --help: wrote to stderr");
  const listed = new Set(r.out.split("\n").map((l) => l.trim().split(/\s{2,}/)[0]).filter(Boolean));
  for (const c of commands) if (!listed.has(c)) fail(`ddd --help does not list '${c}'`);
  const rh = ddd(["-h"]);
  if (rh.code !== 0 || rh.out !== r.out) fail("ddd -h differs from ddd --help");
}

// 4. Every design subcommand is dispatchable: either it runs (any exit but the
//    "not implemented" one) or it says so and exits 2. Whichever modules are still
//    absent must produce exactly the message; at least the built-ins must run.
const NOT_IMPL = /^ddd: (.+) is not implemented yet\n$/;
let unimplemented = 0;
let tmp;
try {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-cli-surface-"));
  for (const c of commands) {
    const words = c.split(" ");
    const r = ddd([...words, "--help"], { cwd: tmp });
    const m = NOT_IMPL.exec(r.err);
    if (m) {
      unimplemented++;
      if (r.code !== 2) fail(`ddd ${c}: "not implemented yet" but exit ${r.code}, expected 2`);
      if (m[1] !== c) fail(`ddd ${c}: message names '${m[1]}'`);
      if (r.out) fail(`ddd ${c}: unimplemented but wrote to stdout`);
      if (["init", "mark", "stamp"].includes(c)) fail(`ddd ${c} is built in and must not report itself unimplemented`);
    } else if (r.code === 2 && ["init", "mark"].includes(c)) {
      fail(`ddd ${c} --help: exit 2: ${r.err.trim()}`);
    }
  }
} finally {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
}
// The unimplemented branch, kept alive after every module has landed: dispatch a
// synthetic table entry whose module cannot exist, in-process, and read what the
// dispatcher says.
{
  const { COMMANDS, main } = await import(pathToFileURL(BIN).href);
  COMMANDS.push({ words: ["__probe__"], module: path.join(os.tmpdir(), `ddd-no-such-module-${process.pid}.mjs`), usage: "", help: "probe" });
  let captured = "";
  const orig = process.stderr.write;
  process.stderr.write = (s) => { captured += s; return true; };
  let code;
  try { code = await main(["__probe__"]); } finally { process.stderr.write = orig; COMMANDS.pop(); }
  if (code !== 2) fail(`synthetic unimplemented command: exit ${code}, expected 2`);
  if (captured !== "ddd: __probe__ is not implemented yet\n") fail(`synthetic unimplemented command: stderr ${JSON.stringify(captured)}`);
}
// A command outside the design table but in the CLI, dispatched the same way.
{
  const r = ddd(["export", "blueprint", "--help"]);
  if (r.code !== 2 && r.code !== 0 && r.code !== 1) fail(`ddd export blueprint: exit ${r.code}`);
  if (NOT_IMPL.test(r.err) && r.code !== 2) fail("ddd export blueprint: not implemented but exit is not 2");
}

// 5. Argument errors on the built-ins exit 2 and touch nothing.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-cli-surface-args-"));
  try {
    const cases = [
      [["init", "--mode", "bogus"], "init: bad --mode choice"],
      [["init", "--teams", "two"], "init: non-int --teams"],
      [["init", "--nonsense", "x"], "init: unknown flag"],
      [["mark", "discover"], "mark: missing status"],
      [["mark", "discover", "bogus"], "mark: bad status choice"],
      [["mark", "nowhere", "done"], "mark: bad step choice"],
      [["mark", "--dir", "ddd", "discover", "done", "extra"], "mark: extra positional"],
    ];
    for (const [argv, label] of cases) {
      const r = ddd(argv, { cwd: dir });
      if (r.code !== 2) fail(`${label}: exit ${r.code}, expected 2 (${r.err.trim().split("\n").pop()})`);
      if (!/usage:/i.test(r.err)) fail(`${label}: no usage on stderr`);
    }
    if (fs.readdirSync(dir).length) fail(`argument errors wrote files: ${fs.readdirSync(dir).join(", ")}`);
    // sys.exit("...") parity: a missing --project on a fresh manifest and a missing
    // manifest for mark are exit 1 with the message on stderr.
    const r1 = ddd(["init", "--dir", "ws"], { cwd: dir });
    if (r1.code !== 1 || !r1.err.includes("--project is required")) fail(`init without --project: exit ${r1.code}, stderr ${JSON.stringify(r1.err)}`);
    const r2 = ddd(["mark", "--dir", "ws", "discover", "done"], { cwd: dir });
    if (r2.code !== 1 || !r2.err.includes("not found")) fail(`mark without a manifest: exit ${r2.code}, stderr ${JSON.stringify(r2.err)}`);
    // And the happy path still works end to end.
    const r3 = ddd(["init", "--dir", "ws", "--project", "probe", "--title", "Probé"], { cwd: dir });
    if (r3.code !== 0 || !r3.out.startsWith("created ")) fail(`init happy path: exit ${r3.code}: ${r3.err}`);
    const r4 = ddd(["mark", "--dir", "ws", "understand", "draft", "--note", "ünïcode"], { cwd: dir });
    if (r4.code !== 0 || r4.out !== "understand: draft\n") fail(`mark happy path: exit ${r4.code}, stdout ${JSON.stringify(r4.out)}`);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "ws", "manifest.json"), "utf8"));
    if (manifest.title !== "Probé" || manifest.steps.understand.note !== "ünïcode") fail("non-ASCII was not preserved in manifest.json");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(manifest.updated)) fail(`timestamp format: ${manifest.updated}`);
    const r5 = ddd(["stamp", "ws/manifest.json"], { cwd: dir });
    if (r5.code !== 0 || !/^ws\/manifest\.json: produced_at=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\n$/.test(r5.out)) fail(`stamp: exit ${r5.code}, stdout ${JSON.stringify(r5.out)}`);
    const r6 = ddd(["stamp", "ws/missing.json"], { cwd: dir });
    if (r6.code !== 1) fail(`stamp on a missing file: exit ${r6.code}, expected 1`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`design §3.3: ${commands.size} subcommand(s), all listed by --help; ${unimplemented} still report "not implemented yet"`);
if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  console.log(`${failures.length} failure(s)`);
  process.exit(1);
}
console.log(MARKER);
