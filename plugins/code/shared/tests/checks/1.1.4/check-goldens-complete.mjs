#!/usr/bin/env node
// G2 for leaf 1.1.4: every subcommand in design §3.3 (except the new
// `decision render`) has a recorded golden on all three fixtures, recorded with
// DDD_NO_RENDER=1 semantics and normalised.
//
// The list of subcommands is written out here rather than imported from
// golden.mjs, so a command dropped from the harness table is caught instead of
// silently shrinking the gate. The design document's table is parsed as well
// and must agree with the list; if the design changes, one of the two moves and
// this check says so.
//
// Usage: node check-goldens-complete.mjs        (no arguments)
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMANDS, GOLDENS_DIR, slugOf, variantsOf } from "../../golden.mjs";
import { FIXTURE_NAMES } from "../../fixtures/build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..", "..", "..", "..");
const DESIGN = path.join(REPO, "ai_docs", "designs", "2026-09-01-ddd-node-visual-design.md");
const MARKER = "goldens-complete verification passed";

if (process.argv.length > 2) {
  console.error("usage: node plugins/code/shared/tests/checks/1.1.4/check-goldens-complete.mjs");
  process.exit(2);
}

// Design §3.3, Node column, minus `decision render`.
const REQUIRED = [
  "init", "mark", "stamp", "validate", "review",
  "understand lint",
  "discover lint", "discover render", "discover glossary",
  "decompose worksheet", "decompose check",
  "strategize worksheet", "strategize lint", "strategize render",
  "connect inputs", "connect render",
  "organise brief", "organise check", "organise mermaid",
  "define prefill", "define render",
  "code prefill", "code check",
  "contracts prefill", "contracts check", "contracts render",
];
const EXCLUDED = ["decision render"];

// Variants the leaf brief names as the minimum per command; the harness may
// record more, but never fewer.
const REQUIRED_VARIANTS = {
  validate: ["default", "json", "status", "step-decompose", "stale-status", "stale-default", "stale-json"],
  "define prefill": ["default", "auto-light"],
  "define render": ["default", "check-only"],
  "code prefill": ["default", "auto"],
  "code check": ["default", "json"],
  "contracts prefill": ["default", "auto-light"],
  "contracts check": ["default", "json"],
  "connect render": ["default", "check", "write-md", "write-mermaid"],
  "strategize render": ["default", "stdout"],
  "discover render": ["default", "stdout"],
};

const failures = [];
const assert = (cond, msg) => { if (!cond) failures.push(msg); };

// 1. The design table and the list above agree.
const fromDesign = parseDesignTable(fs.readFileSync(DESIGN, "utf8"));
for (const cmd of REQUIRED.concat(EXCLUDED)) assert(fromDesign.has(cmd), `design §3.3 no longer lists '${cmd}'`);
for (const cmd of fromDesign) assert(REQUIRED.includes(cmd) || EXCLUDED.includes(cmd), `design §3.3 lists '${cmd}', which this check does not know`);
console.log(`design §3.3: ${fromDesign.size} subcommand(s) parsed, ${REQUIRED.length} required here, ${EXCLUDED.length} excluded (${EXCLUDED.join(", ")})`);

// 2. The harness table covers every required command and nothing outside the design.
const tableSlugs = new Set(COMMANDS.map(slugOf));
for (const cmd of REQUIRED) assert(tableSlugs.has(cmd.replace(/ /g, "-")), `golden.mjs COMMANDS has no entry for '${cmd}'`);
for (const slug of tableSlugs) assert(REQUIRED.some((c) => c.replace(/ /g, "-") === slug), `golden.mjs COMMANDS entry '${slug}' is not in design §3.3`);
for (const [cmd, names] of Object.entries(REQUIRED_VARIANTS)) {
  const entry = COMMANDS.find((c) => slugOf(c) === cmd.replace(/ /g, "-"));
  const have = entry ? variantsOf(entry).map(([n]) => n) : [];
  for (const n of names) assert(have.includes(n), `'${cmd}' lacks the required variant '${n}' (has ${have.join(", ")})`);
}

// 3. Every required command has a complete, normalised golden on every fixture.
const TS = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|\+00:00)/;
const TMP_PATH = /\/(private\/)?(var\/folders|tmp)\//;
let variantCount = 0;
for (const fixture of FIXTURE_NAMES) {
  for (const cmd of REQUIRED) {
    const slug = cmd.replace(/ /g, "-");
    const entry = COMMANDS.find((c) => slugOf(c) === slug);
    const cmdDir = path.join(GOLDENS_DIR, fixture, slug);
    if (!fs.existsSync(cmdDir)) { failures.push(`no golden directory for ${fixture}/${slug}`); continue; }
    const recorded = fs.readdirSync(cmdDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    const expected = entry ? variantsOf(entry).map(([n]) => n).sort() : [];
    assert(recorded.length > 0, `${fixture}/${slug}: no variants recorded`);
    for (const v of expected) assert(recorded.includes(v), `${fixture}/${slug}: variant '${v}' in the table has no golden (run: node golden.mjs record ${slug})`);
    for (const v of recorded) assert(expected.includes(v), `${fixture}/${slug}: stale golden '${v}' is not in the table`);
    for (const v of recorded) {
      variantCount++;
      const dir = path.join(cmdDir, v);
      const where = `${fixture}/${slug}/${v}`;
      for (const f of ["stdout.txt", "stderr.txt", "exit.txt", "files.json", "meta.json"]) {
        assert(fs.existsSync(path.join(dir, f)), `${where}: missing ${f}`);
      }
      if (!fs.existsSync(path.join(dir, "meta.json")) || !fs.existsSync(path.join(dir, "files.json"))) continue;
      const meta = readJson(path.join(dir, "meta.json"));
      assert(meta.env && meta.env.DDD_NO_RENDER === "1", `${where}: meta.env.DDD_NO_RENDER is not "1"`);
      assert(meta.fixture === fixture && JSON.stringify(meta.command) === JSON.stringify(cmd.split(" ")) && meta.variant === v,
        `${where}: meta.json does not describe this variant`);
      // The twin is the recorded Python script, except for `review` (re-baselined from the Node CLI
      // after review.py's page was superseded) and `strategize render` (re-recorded from Node after
      // its "step 4 of 8" wording was corrected to "of 9"); both are documented in goldens/REWORDING.md.
      const nodeTwin = Array.isArray(meta.twin) && meta.twin[0] === "node" && /ddd\.mjs$/.test(meta.twin[1] || "");
      const pyTwin = Array.isArray(meta.twin) && meta.twin[0] === "python3" && /\.py$/.test(meta.twin[1] || "");
      assert(pyTwin || (nodeTwin && (cmd === "review" || slug === "strategize-render")), `${where}: meta.twin is neither the recorded python3 script nor (for review / strategize-render) the Node CLI`);
      const exit = fs.readFileSync(path.join(dir, "exit.txt"), "utf8").trim();
      assert(/^\d+$/.test(exit), `${where}: exit.txt is '${exit}', not an integer`);
      const files = readJson(path.join(dir, "files.json"));
      assert(Array.isArray(files.changed) && Array.isArray(files.deleted), `${where}: files.json lacks changed[]/deleted[]`);
      for (const e of files.changed || []) {
        assert(typeof e.path === "string" && ["added", "modified"].includes(e.kind), `${where}: malformed files.json entry ${JSON.stringify(e)}`);
        if (meta.files_policy !== "paths") assert("content" in e || "sha256" in e, `${where}: ${e.path} has neither content nor sha256`);
        if (typeof e.content === "string") {
          assert(!TS.test(e.content), `${where}: ${e.path} still contains a raw timestamp`);
          assert(!TMP_PATH.test(e.content), `${where}: ${e.path} still contains a temp path`);
        }
      }
      for (const f of ["stdout.txt", "stderr.txt"]) {
        const text = fs.readFileSync(path.join(dir, f), "utf8");
        assert(!TS.test(text), `${where}: ${f} still contains a raw timestamp`);
        assert(!TMP_PATH.test(text), `${where}: ${f} still contains a temp path`);
      }
    }
  }
  // No goldens for commands outside the list (a stray directory would never be replayed).
  const fixtureDir = path.join(GOLDENS_DIR, fixture);
  if (fs.existsSync(fixtureDir)) {
    for (const d of fs.readdirSync(fixtureDir)) {
      assert(REQUIRED.some((c) => c.replace(/ /g, "-") === d), `${fixture}/${d}: golden directory for a command not in design §3.3`);
    }
  }
}
// Beside the fixture directories only the rewording record may live (leaf 1.4.1).
const GOLDENS_ROOT_FILES = new Set(["REWORDING.md", "reword.mjs"]);
for (const d of fs.existsSync(GOLDENS_DIR) ? fs.readdirSync(GOLDENS_DIR) : []) {
  if (GOLDENS_ROOT_FILES.has(d)) continue;
  assert(FIXTURE_NAMES.includes(d), `goldens/${d} is not one of the fixtures (${FIXTURE_NAMES.join(", ")})`);
}

// Some evidence that the fixtures do what their README claims.
const exitOf = (fixture, slug, v) => fs.readFileSync(path.join(GOLDENS_DIR, fixture, slug, v, "exit.txt"), "utf8").trim();
try {
  assert(exitOf("mealkit", "validate", "default") === "0", "mealkit validate should exit 0");
  assert(exitOf("truncated-3", "validate", "default") === "0", "truncated-3 validate should exit 0");
  assert(exitOf("broken-refs", "validate", "default") === "1", "broken-refs validate should exit 1");
  const brokenOut = fs.readFileSync(path.join(GOLDENS_DIR, "broken-refs", "validate", "default", "stdout.txt"), "utf8");
  assert(/unknown reference 'subscription-teleported'/.test(brokenOut), "broken-refs validate stdout should name the dangling id");
} catch (e) {
  failures.push(`could not read fixture evidence: ${e.message}`);
}

console.log(`${variantCount} variant(s) across ${FIXTURE_NAMES.length} fixture(s) and ${REQUIRED.length} subcommand(s)`);
if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(MARKER);

// Pull the Node column out of the §3.3 table: cells look like `ddd validate …`,
// `ddd discover lint\|render\|glossary …`, `ddd decision render <dir> <Did>`.
function parseDesignTable(md) {
  const start = md.indexOf("### 3.3 Command parity");
  const end = md.indexOf("### 3.4", start);
  const section = md.slice(start, end);
  const out = new Set();
  for (const m of section.matchAll(/\|\s*`ddd ([^`]*)`/g)) {
    const cell = m[1].replace(/\\\|/g, "|").trim();
    const words = cell.split(/\s+/).filter((w) => !/^[<…(]/.test(w));
    if (words.length === 0) continue;
    const head = words[0];
    const alts = (words[1] || "").split("|").filter(Boolean);
    if (alts.length === 0) out.add(head);
    else for (const a of alts) out.add(`${head} ${a}`);
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
