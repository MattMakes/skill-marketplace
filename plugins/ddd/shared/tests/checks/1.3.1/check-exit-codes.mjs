#!/usr/bin/env node
// G5 for leaf 1.3.1: the exit-code contract of the four ported commands.
//
//   lint / advisory commands exit 0 even when they have findings,
//   usage errors exit 2,
//   IO errors exit 2,
//
// with two Python-parity exceptions the ports keep on purpose (the twin is the oracle
// in phase 1.3; leaf 1.4.1 owns any rewording): `understand lint` exits 1 when it finds
// rule *errors* (lint_understand.py: "Exit 0 = no errors, 1 = errors"), and
// `discover lint` exits 0 on an unreadable input (lint_discover.py: "Always exits 0").
// Both are asserted here so a later change to either is a visible decision.
//
// Every run happens on a fresh temp copy of the mealkit fixture; the example under
// shared/examples is never touched.
//
// Usage: node plugins/ddd/shared/tests/checks/1.3.1/check-exit-codes.mjs 1.3.1
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

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== "1.3.1") {
  console.error("usage: node plugins/ddd/shared/tests/checks/1.3.1/check-exit-codes.mjs 1.3.1");
  process.exit(2);
}
if (!fs.existsSync(BIN)) { console.error(`error: ${BIN} not found`); process.exit(2); }

const failures = [];
const fail = (m) => failures.push(m);
let checks = 0;

function ddd(cwd, argv) {
  const r = spawnSync(process.execPath, [BIN, ...argv], {
    cwd, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1", TZ: "UTC" },
  });
  if (r.error) throw r.error;
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// expect(label, result, code, { out: /re/, err: /re/, noOut, noErr })
function expect(label, r, code, opts = {}) {
  checks++;
  if (r.code !== code) fail(`${label}: exit ${r.code}, expected ${code}\n  stdout: ${r.out.trim().slice(0, 200)}\n  stderr: ${r.err.trim().slice(0, 200)}`);
  if (opts.out && !opts.out.test(r.out)) fail(`${label}: stdout does not match ${opts.out}\n  got: ${r.out.trim().slice(0, 300)}`);
  if (opts.err && !opts.err.test(r.err)) fail(`${label}: stderr does not match ${opts.err}\n  got: ${r.err.trim().slice(0, 300)}`);
  if (opts.noOut && r.out) fail(`${label}: unexpected stdout: ${r.out.trim().slice(0, 200)}`);
  if (opts.noErr && r.err) fail(`${label}: unexpected stderr: ${r.err.trim().slice(0, 200)}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-exit-codes-"));
try {
  const root = materialise("mealkit", tmp);
  const DDD = "ddd";
  const DJ = "ddd/02-discover/discover.json";

  // 1. Findings never change the exit code of a lint / advisory command.
  //    The mealkit fixture yields 15 warnings from understand lint and 6 notes from
  //    discover lint (see the goldens), so "findings present" is asserted, not assumed.
  expect("understand lint (warnings)", ddd(root, ["understand", "lint", DDD]), 0, { out: /\[warn\][\s\S]*RESULT: OK/, noErr: true });
  expect("understand lint --json (warnings)", ddd(root, ["understand", "lint", DDD, "--json"]), 0, { out: /"ok": true[\s\S]*"warnings": \[\s+"/, noErr: true });
  expect("discover lint (notes)", ddd(root, ["discover", "lint", DJ]), 0, { out: /^note: [\s\S]*\nlint: [1-9]\d* notes/, noErr: true });
  expect("discover lint --depth deep (notes)", ddd(root, ["discover", "lint", DJ, "--depth", "deep"]), 0, { out: /^note: /, noErr: true });
  expect("discover render", ddd(root, ["discover", "render", DJ]), 0, { out: /^wrote .*event-storm\.md \(\d+ lines\)\n$/, noErr: true });
  expect("discover render --stdout", ddd(root, ["discover", "render", DJ, "--stdout"]), 0, { out: /^# Event storm - /, noErr: true });
  expect("discover glossary", ddd(root, ["discover", "glossary", DJ]), 0, { out: /^wrote .*glossary\.md: 2 shared terms\n$/ });
  expect("discover glossary --dry-run", ddd(root, ["discover", "glossary", DJ, "--dry-run"]), 0, { out: /^# Ubiquitous language/ });

  // 1b. Advisory notes on stderr (kept / skipped / empty glossary) are still exit 0.
  {
    const r2 = materialise("mealkit", path.join(tmp, "advisory"));
    const dj = path.join(r2, DJ);
    const d = JSON.parse(fs.readFileSync(dj, "utf8"));
    d.glossary = [{ term: "Box", definition: "x", context: "billing" }];
    fs.writeFileSync(dj, JSON.stringify(d, null, 2) + "\n");
    expect("discover glossary (kept + skipped + empty notes)", ddd(r2, ["discover", "glossary", DJ]), 0,
      { out: /: 0 shared terms/, err: /note: kept from previous glossary[\s\S]*note: skipped 'Box' \(context='billing'[\s\S]*note: discover\.json has no glossary entries/ });
  }

  // 2. Usage errors: exit 2, usage on stderr, nothing on stdout.
  const usage = [
    ["understand lint --bogus", ["understand", "lint", DDD, "--bogus"]],
    ["understand lint extra positional", ["understand", "lint", DDD, "extra"]],
    ["discover lint (no file)", ["discover", "lint"]],
    ["discover lint --depth bad", ["discover", "lint", DJ, "--depth", "huge"]],
    ["discover lint --depth (missing value)", ["discover", "lint", DJ, "--depth"]],
    ["discover render --split bad", ["discover", "render", DJ, "--split", "sometimes"]],
    ["discover render --bogus", ["discover", "render", DJ, "--bogus"]],
    ["discover render (no file)", ["discover", "render"]],
    ["discover glossary two positionals", ["discover", "glossary", DJ, "other.json"]],
    ["discover glossary --stdout (not its flag)", ["discover", "glossary", DJ, "--stdout"]],
    ["discover glossary --dry-run=yes", ["discover", "glossary", DJ, "--dry-run=yes"]],
  ];
  for (const [label, argv] of usage) expect(`usage: ${label}`, ddd(root, argv), 2, { err: /^usage: ddd /, noOut: true });

  // 2b. --help is not an error.
  for (const words of [["understand", "lint"], ["discover", "lint"], ["discover", "render"], ["discover", "glossary"]]) {
    expect(`${words.join(" ")} --help`, ddd(root, [...words, "--help"]), 0, { out: /^usage: ddd /, noErr: true });
  }

  // 3. IO errors: exit 2 with `error:` on stderr, nothing on stdout.
  expect("understand lint missing workspace", ddd(root, ["understand", "lint", "nowhere"]), 2, { err: /^error: .*understand\.json not found\n$/, noOut: true });
  expect("discover render missing json", ddd(root, ["discover", "render", "ddd/02-discover/missing.json"]), 2, { err: /^error: cannot read ddd\/02-discover\/missing\.json: /, noOut: true });
  expect("discover render -o into missing dir", ddd(root, ["discover", "render", DJ, "-o", "no/such/dir/out.md"]), 2, { err: /^error: /, noOut: true });
  expect("discover glossary missing json", ddd(root, ["discover", "glossary", "ddd/02-discover/missing.json"]), 2, { err: /^error: cannot read /, noOut: true });
  {
    const bad = materialise("mealkit", path.join(tmp, "badjson"));
    fs.writeFileSync(path.join(bad, "ddd", "01-understand", "understand.json"), "{ not json");
    fs.writeFileSync(path.join(bad, DJ), "[1,");
    expect("understand lint invalid JSON", ddd(bad, ["understand", "lint", DDD]), 2, { err: /^error: .*understand\.json invalid JSON: /, noOut: true });
    expect("discover render invalid JSON", ddd(bad, ["discover", "render", DJ]), 2, { err: /^error: cannot read /, noOut: true });
    expect("discover glossary invalid JSON", ddd(bad, ["discover", "glossary", DJ]), 2, { err: /^error: cannot read /, noOut: true });
    fs.writeFileSync(path.join(bad, DJ), "[1, 2]\n");
    expect("discover render non-object JSON", ddd(bad, ["discover", "render", DJ]), 2, { err: /^error: discover\.json must be an object\n$/, noOut: true });
  }

  // 4. Python-parity cases, pinned deliberately (see the header).
  expect("PARITY discover lint missing json exits 0", ddd(root, ["discover", "lint", "ddd/02-discover/missing.json"]), 0, { err: /^error: cannot read /, noOut: true });
  {
    const r3 = materialise("mealkit", path.join(tmp, "errors"));
    const uj = path.join(r3, "ddd", "01-understand", "understand.json");
    const u = JSON.parse(fs.readFileSync(uj, "utf8"));
    u.step = "wrong";
    fs.writeFileSync(uj, JSON.stringify(u, null, 2) + "\n");
    expect("PARITY understand lint with rule errors exits 1", ddd(r3, ["understand", "lint", DDD]), 1, { out: /\[error\] step is 'wrong'[\s\S]*RESULT: FAIL\n$/, noErr: true });
    expect("PARITY understand lint --json with rule errors exits 1", ddd(r3, ["understand", "lint", DDD, "--json"]), 1, { out: /"ok": false/, noErr: true });
  }
  console.log("python-parity exceptions kept: `discover lint` unreadable input -> 0; `understand lint` rule errors -> 1");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  console.log(`exit-codes verification FAILED: ${failures.length} of ${checks} check(s)`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${checks} exit-code check(s) passed`);
console.log(MARKER);
