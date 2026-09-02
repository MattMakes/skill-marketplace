#!/usr/bin/env node
// G6 for leaf 1.3.3: the exit-code contract of the connect and organise ports.
//
//   lint / advisory commands (connect inputs, connect render without --check,
//   organise brief, organise mermaid)           -> always 0
//   gates (connect render --check, organise check) -> 0 clean, 1 findings
//   usage / missing-input problems              -> 2
//
// Two cases are pinned to exit 1 rather than 2 by the recorded goldens, because the
// Python raised them with sys.exit("message"): organise check/mermaid on a workspace
// without organise.json (truncated-3 golden) and organise <verb> on a path that is
// not a directory. Parity wins until leaf 1.4.1 rewords; this check asserts the
// pinned value and says so. Every run happens on a throwaway copy of a fixture.
//
// Usage: node plugins/ddd/shared/tests/checks/1.3.3/check-exit-codes.mjs 1.3.3
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { materialise } from "../../fixtures/build.mjs";

const MARKER = "exit-codes verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const BIN = path.join(PLUGIN, "shared", "bin", "ddd.mjs");

if (process.argv.length !== 3 || process.argv[2] !== "1.3.3") {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.3.3/check-exit-codes.mjs 1.3.3");
  process.exit(2);
}
if (!fs.existsSync(BIN)) { console.error(`error: ${BIN} not found`); process.exit(2); }

const failures = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-exit-codes-"));

function ddd(cwd, args) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1", TZ: "UTC" } });
  if (r.error) throw r.error;
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// A fresh fixture copy, optionally mutated; returns the project root.
function copy(fixture, mutate) {
  const root = materialise(fixture, fs.mkdtempSync(path.join(tmp, `${fixture}-`)));
  if (mutate) mutate(path.join(root, "ddd"));
  return root;
}

function editJson(file, fn) {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  fn(doc);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
}

// expect(label, cwd, args, code, { stdout, stderr }) where stdout/stderr are
// regexes the respective stream must match (or "empty").
function expect(label, cwd, args, code, streams = {}) {
  const r = ddd(cwd, args);
  const cmd = `ddd ${args.join(" ")}`;
  if (r.code !== code) failures.push(`${label}: ${cmd} exited ${r.code}, expected ${code}\n    stderr: ${r.err.trim().split("\n")[0] || "(empty)"}`);
  for (const [stream, want] of Object.entries(streams)) {
    const text = stream === "stdout" ? r.out : r.err;
    if (want === "empty" ? text !== "" : !want.test(text)) failures.push(`${label}: ${cmd} ${stream} ${want === "empty" ? "should be empty" : `should match ${want}`}: ${JSON.stringify(text.slice(0, 200))}`);
  }
  return r;
}

try {
  const clean = copy("mealkit");
  const truncated = copy("truncated-3");
  const broken = copy("broken-refs");

  // 1. Lint / advisory: always 0, even on the broken-refs fixture and with findings.
  expect("inputs default", clean, ["connect", "inputs", "ddd"], 0, { stdout: /^# connect inputs — /, stderr: "empty" });
  expect("inputs json", clean, ["connect", "inputs", "ddd", "--json"], 0, { stdout: /^\{\n {2}"ddd_dir": / });
  expect("inputs smoke", clean, ["connect", "inputs", "--smoke"], 0, { stdout: /^smoke: OK — / });
  expect("inputs broken-refs", broken, ["connect", "inputs", "ddd"], 0);
  expect("inputs truncated-3", truncated, ["connect", "inputs", "ddd"], 0);
  expect("render default", clean, ["connect", "render", "ddd"], 0, { stdout: /^# Message flows — /, stderr: "empty" });
  // Writers get their own copies so nothing below depends on what they wrote.
  expect("render write-md", copy("mealkit"), ["connect", "render", "ddd", "--write-md"], 0, { stdout: /^wrote .*message-flows\.md\n$/ });
  expect("render write-mermaid", copy("mealkit"), ["connect", "render", "ddd", "--write-mermaid"], 0, { stdout: /^wrote flows\[\]\.mermaid for 1 flow\(s\)/ });
  expect("render write-all quiet", copy("mealkit"), ["connect", "render", "ddd", "--write-md", "--write-mermaid", "--quiet"], 0);
  expect("brief default", clean, ["organise", "brief", "ddd"], 0, { stdout: /^ORGANISE BRIEF — /, stderr: "empty" });
  expect("brief truncated-3 (inputs missing is advisory)", truncated, ["organise", "brief", "ddd"], 0, { stdout: /Inputs MISSING: / });
  expect("brief broken-refs", broken, ["organise", "brief", "ddd"], 0);
  expect("mermaid default", clean, ["organise", "mermaid", "ddd"], 0, { stdout: /^flowchart LR\n/, stderr: "empty" });
  expect("mermaid broken-refs", broken, ["organise", "mermaid", "ddd"], 0);

  // Advisory output with real findings still exits 0: a brief on a workspace whose
  // connect says in-process everywhere and an inputs run with an orphan event.
  const orphan = copy("mealkit", (d) => editJson(path.join(d, "02-discover", "discover.json"), (doc) => { doc.events.push({ id: "orphan-event" }); }));
  expect("inputs with orphan", orphan, ["connect", "inputs", "ddd"], 0, { stdout: /Orphans \(owned by no context/ });

  // 2. Gates: 0 when clean, 1 when they find an error, and the verdict line says so.
  expect("render --check clean", clean, ["connect", "render", "ddd", "--check"], 0, { stdout: /RESULT: OK — 0 error\(s\)/ });
  const dbShare = copy("mealkit", (d) => editJson(path.join(d, "05-connect", "connect.json"), (doc) => { doc.flows[0].steps[1].via = "db"; }));
  expect("render --check with error", dbShare, ["connect", "render", "ddd", "--check"], 1, { stdout: /ERROR flows\[F1\]\.steps\[2\]: via db between two bounded contexts[\s\S]*RESULT: FAIL — 1 error\(s\)/ });
  const warnOnly = copy("mealkit", (d) => editJson(path.join(d, "05-connect", "connect.json"), (doc) => { doc.flows[0].id = "flow-one"; }));
  expect("render --check warnings only", warnOnly, ["connect", "render", "ddd", "--check"], 0, { stdout: /WARN {2}flows\[flow-one\]: id should look like F1[\s\S]*RESULT: OK/ });
  expect("render --check --write-md with error still 1", copy("mealkit", (d) => editJson(path.join(d, "05-connect", "connect.json"), (doc) => { doc.flows[0].steps[1].via = "db"; })),
    ["connect", "render", "ddd", "--check", "--write-md"], 1);
  expect("organise check clean", clean, ["organise", "check", "ddd"], 0, { stdout: /RESULT: OK \(0 errors, 1 warnings\)/ });
  const badCount = copy("mealkit", (d) => editJson(path.join(d, "06-organise", "organise.json"), (doc) => { doc.deployable_count = 99; }));
  expect("organise check with error", badCount, ["organise", "check", "ddd"], 1, { stdout: /\[ERROR\] deployable_count=99 but 2 deployables listed[\s\S]*RESULT: FAIL \(1 errors/ });
  const straddle = copy("mealkit", (d) => editJson(path.join(d, "06-organise", "organise.json"), (doc) => {
    doc.teams.push({ id: "wh", name: "Warehouse", type: "stream-aligned", owns_contexts: [] });
    doc.deployables[1].team = "wh";
  }));
  expect("organise check Conway straddle", straddle, ["organise", "check", "ddd"], 1, { stdout: /Inverse Conway/ });

  // 3. Usage and missing inputs: 2, message on stderr, nothing on stdout.
  expect("inputs missing discover/decompose", clean, ["connect", "inputs", "nowhere"], 2, { stderr: /^error: missing 02-discover\/discover\.json, 03-decompose\/decompose\.json under .*nowhere — run the predecessor step/, stdout: "empty" });
  expect("inputs bad flag", clean, ["connect", "inputs", "ddd", "--bogus"], 2, { stderr: /unrecognized arguments: --bogus/, stdout: "empty" });
  expect("inputs two positionals", clean, ["connect", "inputs", "ddd", "extra"], 2, { stdout: "empty" });
  expect("render missing connect.json", truncated, ["connect", "render", "ddd"], 2, { stderr: /^error: .*05-connect\/connect\.json not found — draft connect\.json first\n$/, stdout: "empty" });
  expect("render --check missing connect.json", truncated, ["connect", "render", "ddd", "--check"], 2, { stdout: "empty" });
  expect("render bad flag", clean, ["connect", "render", "ddd", "--bogus"], 2, { stderr: /unrecognized arguments: --bogus/, stdout: "empty" });
  expect("render ambiguous prefix", clean, ["connect", "render", "ddd", "--write"], 2, { stderr: /ambiguous option/ });
  for (const verb of ["brief", "check", "mermaid"]) {
    // organise_tools.py with no <ddd-dir> printed its module doc to stdout and returned 2.
    expect(`organise ${verb} without a dir`, clean, ["organise", verb], 2, { stdout: /^ddd organise — deterministic helpers/, stderr: "empty" });
  }
  expect("brief missing decompose.json", copy("mealkit", (d) => fs.rmSync(path.join(d, "03-decompose"), { recursive: true })), ["organise", "brief", "ddd"], 1,
    { stderr: /^error: ddd\/03-decompose\/decompose\.json not found — run ddd-decompose first/, stdout: "empty" });

  // 4. Pinned by goldens: sys.exit("...") in the Python is exit 1 with the message on stderr.
  expect("organise check without organise.json (golden truncated-3 pins exit 1)", truncated, ["organise", "check", "ddd"], 1, { stderr: /^error: ddd\/06-organise\/organise\.json not found — write it first\n$/, stdout: "empty" });
  expect("organise mermaid without organise.json (golden truncated-3 pins exit 1)", truncated, ["organise", "mermaid", "ddd"], 1, { stderr: /not found — write it first/, stdout: "empty" });
  expect("organise brief on a non-directory (sys.exit parity)", clean, ["organise", "brief", "ddd/manifest.json"], 1, { stderr: /^error: ddd\/manifest\.json is not a directory\n$/, stdout: "empty" });

  // 5. --help is a usage path that succeeds.
  expect("inputs --help", clean, ["connect", "inputs", "--help"], 0, { stdout: /^usage: ddd connect inputs/ });
  expect("render --help", clean, ["connect", "render", "-h"], 0, { stdout: /^usage: ddd connect render/ });
  expect("organise --help", clean, ["organise", "check", "--help"], 0, { stdout: /^ddd organise/ });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  console.log(`exit-codes verification FAILED: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log("lint/advisory 0, gates 0/1, usage/missing-input 2, sys.exit parity 1 (pinned by goldens)");
console.log(MARKER);
