#!/usr/bin/env node
// G1 for leaf 1.1.4: the golden harness can tell twins apart.
//
// A replay that always passes is worse than none, so this check runs golden.mjs
// against twins whose outcome is known:
//
//   negative  wrong-twin.mjs prints something else            -> must FAIL, no marker
//   negative  replay-twin.mjs with one channel tampered        -> must FAIL for exit, stdout and files each
//   negative  --twin pointing nowhere                          -> exit 2 with a clear message, no crash
//   positive  replay-twin.mjs emitting the recorded output     -> must PASS on every golden, no Python needed
//   positive  python-twin.mjs re-running the recorded script   -> must PASS while the scripts exist (skipped after 1.4.1)
//
// Usage: node check-golden-harness.mjs        (no arguments)
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { COMMANDS, PASS_MARKER, PLUGIN_ROOT, slugOf, variantsOf } from "../../golden.mjs";
import { FIXTURE_NAMES } from "../../fixtures/build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.resolve(HERE, "..", "..", "golden.mjs");
const TWINS = path.join(HERE, "twins");
const MARKER = "golden-harness verification passed";

if (process.argv.length > 2) {
  console.error("usage: node plugins/code/shared/tests/checks/1.1.4/check-golden-harness.mjs");
  process.exit(2);
}

const failures = [];
const assert = (cond, msg) => { if (!cond) failures.push(msg); };

function replay(args, env = {}) {
  const r = spawnSync(process.execPath, [GOLDEN, ...args], {
    cwd: PLUGIN_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

// A small subset for the negative controls: the harness must reject a wrong
// twin on a single command, not only in aggregate.
const SMALL = ["--fixture", "mealkit", "mark", "stamp"];

// 1. Negative: a twin that is not the ddd CLI.
{
  const r = replay(["--twin", path.join(TWINS, "wrong-twin.mjs"), ...SMALL]);
  assert(r.status === 1, `wrong twin: expected exit 1, got ${r.status}`);
  assert(!r.out.includes(PASS_MARKER), "wrong twin: the pass marker was printed");
  assert(/^FAIL mealkit mark done/m.test(r.out), "wrong twin: expected 'FAIL mealkit mark done' in the output");
  assert(/^\s*--- expected\/stdout/m.test(r.out), "wrong twin: expected a unified diff of stdout");
  assert(/golden verification FAILED: \d+ of \d+ variant/.test(r.out), "wrong twin: expected the FAILED summary line");
  console.log(`negative control (wrong twin): exit ${r.status}, ${(r.out.match(/^FAIL /gm) || []).length} FAIL line(s), marker absent`);
}

// 2. Negative: the recorded output with exactly one channel tampered. Each must
//    be caught on its own, otherwise a channel is not really compared.
for (const channel of ["exit", "stdout", "files"]) {
  const r = replay(["--twin", path.join(TWINS, "replay-twin.mjs"), ...SMALL], { GOLDEN_MUTATE: channel });
  assert(r.status === 1, `tampered ${channel}: expected exit 1, got ${r.status}`);
  assert(!r.out.includes(PASS_MARKER), `tampered ${channel}: the pass marker was printed`);
  const expectedHint = { exit: /expected exit \d+, got \d+/, stdout: /^\s*\+tampered$/m, files: /^\s*\+tampered$/m }[channel];
  assert(expectedHint.test(r.out), `tampered ${channel}: the output does not point at the ${channel} mismatch`);
  console.log(`negative control (tampered ${channel}): exit ${r.status}, marker absent`);
}

// 3. Negative: a twin that does not exist must be reported, not thrown.
{
  const r = replay(["--twin", path.join(TWINS, "does-not-exist.mjs"), ...SMALL]);
  assert(r.status === 2, `missing twin: expected exit 2, got ${r.status}`);
  assert(/command under test not found/.test(r.out), "missing twin: expected a clear 'command under test not found' message");
  assert(!/at .*golden\.mjs:\d+/.test(r.out), "missing twin: a stack trace was printed");
  console.log(`negative control (missing twin): exit ${r.status}, clear message`);
}

// 4. Positive: the recorded output replayed as-is passes on every golden.
{
  const r = replay(["--twin", path.join(TWINS, "replay-twin.mjs")]);
  assert(r.status === 0, `replay twin: expected exit 0, got ${r.status}\n${tail(r.out)}`);
  const lastLine = r.out.trim().split("\n").pop();
  assert(lastLine === PASS_MARKER, `replay twin: expected the last line to be '${PASS_MARKER}', got '${lastLine}'`);
  assert(!/^FAIL /m.test(r.out), `replay twin: FAIL lines present\n${tail(r.out)}`);
  const matched = (r.out.match(/^(\d+) variant\(s\) matched$/m) || [])[1];
  const expectedCount = COMMANDS.reduce((n, c) => n + variantsOf(c).length, 0) * FIXTURE_NAMES.length;
  assert(Number(matched) === expectedCount, `replay twin: expected ${expectedCount} variants matched, got ${matched}`);
  console.log(`positive control (recorded output replayed): exit ${r.status}, ${matched} variant(s) matched`);
}

// 5. Positive: Python replaying itself, while it is still there.
{
  const scripts = COMMANDS.map((c) => path.join(PLUGIN_ROOT, c.py));
  const python = spawnSync(process.env.PYTHON || "python3", ["--version"], { encoding: "utf8" });
  if (python.error || !scripts.every((p) => fs.existsSync(p))) {
    console.log("positive control (python re-run): skipped, python3 or the Python scripts are no longer available");
  } else {
    const r = replay(["--twin", path.join(TWINS, "python-twin.mjs")]);
    assert(r.status === 0, `python twin: expected exit 0, got ${r.status}\n${tail(r.out)}`);
    assert(r.out.trim().endsWith(PASS_MARKER), "python twin: the pass marker is not the last line");
    console.log(`positive control (python re-run): exit ${r.status}, ${(r.out.match(/^ok /gm) || []).length} variant(s) matched`);
  }
}

// 6. Usage: misuse is exit 2 with a usage line, not a crash.
{
  const r = replay(["--fixture"]);
  assert(r.status === 2 && /usage: node golden\.mjs/.test(r.out), `golden.mjs --fixture without a name: expected exit 2 + usage, got ${r.status}`);
  const u = replay(["no-such-command"]);
  assert(u.status === 2 && /unknown command/.test(u.out), `golden.mjs with an unknown command: expected exit 2, got ${u.status}`);
  const rec = replay(["record", "--twin", "x"]);
  assert(rec.status === 2, `golden.mjs record --twin: expected exit 2, got ${rec.status}`);
}

if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`commands under test: ${COMMANDS.map(slugOf).length}`);
console.log(MARKER);

function tail(s, n = 30) {
  return s.trim().split("\n").slice(-n).join("\n");
}
