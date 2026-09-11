#!/usr/bin/env node
// G2 for leaf 1.1.2: `ddd validate` writes `stale` into manifest.json on plain, --json,
// --step and --status runs exactly as validate.py does (design §6 invariant 1), while
// the in-process `validate(dir, {persist:false})` leaves the manifest byte-identical.
//
// Three oracles, so the check outlives the Python scripts:
//   1. structural: the manifest after the run is the manifest before with every step
//      downstream of the re-produced one flipped to `stale` and `updated` bumped,
//      and nothing else changed (byte compare of the re-serialised expectation);
//   2. the recorded stale-* goldens (stdout, stderr, exit, manifest content), for the
//      variants that have one;
//   3. python3 running validate.py on an identical copy, while both still exist
//      (skipped with a note when either is gone).
//
// Usage: node plugins/code/shared/tests/checks/1.1.2/check-staleness.mjs   (no arguments)
// Exit 0 on pass, 1 on a failed assertion, 2 on misuse.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { makeNormaliser, readSnapshot, GOLDENS_DIR, RUN_ENV, DEFAULT_TWIN, PLUGIN_ROOT } from "../../golden.mjs";
import { materialise } from "../../fixtures/build.mjs";
import { validate, STEPS } from "../../../lib/validate.mjs";

if (process.argv.length > 2) {
  console.error("usage: node check-staleness.mjs   (no arguments)");
  process.exit(2);
}

const failures = [];
const fail = (msg) => failures.push(msg);
const log = (msg) => console.log(msg);

// The seed the stale-* goldens were recorded with: discover re-produced after every
// downstream step, so decompose..contracts (7 steps) are stale.
const SEED_FILE = "ddd/02-discover/discover.json";
const SEED = { produced_at: "2030-01-01T00:00:00Z" };
const UPSTREAM = "discover";
const STALE_STEPS = STEPS.slice(STEPS.indexOf(UPSTREAM) + 1);
const TS_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-check-staleness-"));
let counter = 0;

function fresh({ seed = true } = {}) {
  const root = materialise("mealkit", path.join(tmpBase, `copy-${counter++}`));
  if (seed) {
    const p = path.join(root, SEED_FILE);
    const doc = { ...JSON.parse(fs.readFileSync(p, "utf8")), ...SEED };
    fs.writeFileSync(p, JSON.stringify(doc, null, 2) + "\n");
  }
  return root;
}

const manifestPath = (root) => path.join(root, "ddd", "manifest.json");
const readBytes = (p) => fs.readFileSync(p, "utf8");

function run(file, argv, cwd) {
  const res = spawnSync(file, argv, { cwd, env: { ...process.env, ...RUN_ENV }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.error) throw res.error;
  return { stdout: res.stdout, stderr: res.stderr, exit: res.status === null ? `signal:${res.signal}` : String(res.status) };
}

// The manifest the run must leave behind: statuses flipped, `updated` bumped, and
// the same serialisation (json.dump indent=2 + newline) as every other writer.
function expectedManifest(beforeText, afterText) {
  const before = JSON.parse(beforeText);
  const after = JSON.parse(afterText);
  for (const s of STALE_STEPS) before.steps[s].status = "stale";
  before.updated = after.updated;
  return JSON.stringify(before, null, 2) + "\n";
}

// JSON output is compared canonically, like the harness does; text byte for byte.
function sameText(a, b) {
  if (a === b) return true;
  try { return JSON.stringify(JSON.parse(a), null, 2) === JSON.stringify(JSON.parse(b), null, 2); } catch { return false; }
}

const python = process.env.PYTHON || "python3";
const validatePy = path.join(PLUGIN_ROOT, "shared", "scripts", "validate.py");
const pythonProbe = spawnSync(python, ["--version"], { encoding: "utf8" });
const pythonAvailable = !pythonProbe.error && fs.existsSync(validatePy);
if (!pythonAvailable) log(`note: python3 leg skipped (${pythonProbe.error ? `${python} not on PATH` : `${validatePy} is gone`}); goldens and structure still verify`);

const VARIANTS = {
  "stale-default": ["ddd"],
  "stale-json": ["ddd", "--json"],
  "stale-step": ["ddd", "--step", "define"],
  "stale-status": ["ddd", "--status"],
};

try {
  for (const [variant, args] of Object.entries(VARIANTS)) {
    const root = fresh();
    const before = readBytes(manifestPath(root));
    const node = run(process.execPath, [DEFAULT_TWIN, "validate", ...args], root);
    const after = readBytes(manifestPath(root));
    const normalise = makeNormaliser(root);

    // 1. Structure.
    if (node.exit !== "0") fail(`${variant}: exit ${node.exit}, expected 0\n${node.stderr}`);
    if (after === before) fail(`${variant}: manifest.json was not written`);
    else {
      const want = expectedManifest(before, after);
      if (after !== want) fail(`${variant}: manifest.json differs from the expected stale flip`);
      const updated = JSON.parse(after).updated;
      if (!TS_Z.test(updated)) fail(`${variant}: manifest.updated is '${updated}', expected YYYY-MM-DDTHH:MM:SSZ`);
    }
    // The warning prints datetime.isoformat() of an aware timestamp: `+00:00`, never
    // `Z`. The golden normaliser masks both spellings, so it is asserted raw here.
    const staleLine = new RegExp(`stale: produced \\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+00:00 but '${UPSTREAM}' was re-produced 2030-01-01T00:00:00\\+00:00`);
    if (!staleLine.test(node.stdout)) fail(`${variant}: stdout lacks the stale warning with +00:00 timestamps`);
    const staleMentions = (node.stdout.match(/stale: produced /g) || []).length;
    if (staleMentions !== STALE_STEPS.length) fail(`${variant}: ${staleMentions} stale warning(s) printed, expected ${STALE_STEPS.length}`);
    if (variant === "stale-step" && !/^validated define: 0 error\(s\), 1 warning\(s\)$/m.test(node.stdout)) {
      fail(`${variant}: the 'validated define' line should count the stale warning:\n${node.stdout}`);
    }

    // 2. Goldens.
    const goldenDir = path.join(GOLDENS_DIR, "mealkit", "validate", variant);
    if (fs.existsSync(path.join(goldenDir, "exit.txt"))) {
      const g = readSnapshot(goldenDir);
      if (g.exit !== node.exit) fail(`${variant}: golden exit ${g.exit}, got ${node.exit}`);
      if (!sameText(g.stdout, normalise(node.stdout))) fail(`${variant}: stdout differs from the recorded golden`);
      if (g.stderr !== normalise(node.stderr)) fail(`${variant}: stderr differs from the recorded golden`);
      const gm = g.files.changed.find((f) => f.path === "ddd/manifest.json");
      if (!gm) fail(`${variant}: golden records no manifest.json write (the golden itself is wrong)`);
      else if (gm.kind !== "modified" || !sameText(gm.content, normalise(after))) fail(`${variant}: manifest.json differs from the recorded golden`);
      log(`ok   ${variant}: node matches golden and writes stale`);
    } else {
      log(`ok   ${variant}: node writes stale (no golden for this variant; structure and python are the oracles)`);
    }

    // 3. Python, on its own identical copy.
    if (pythonAvailable) {
      const root2 = fresh();
      const before2 = readBytes(manifestPath(root2));
      const py = run(python, [validatePy, ...args], root2);
      const after2 = readBytes(manifestPath(root2));
      const normalise2 = makeNormaliser(root2);
      if (before2 !== before) fail(`${variant}: the two copies differ before the run`);
      if (py.exit !== node.exit) fail(`${variant}: python exit ${py.exit}, node ${node.exit}`);
      if (!sameText(normalise2(py.stdout), normalise(node.stdout))) fail(`${variant}: stdout differs between python and node`);
      if (normalise2(py.stderr) !== normalise(node.stderr)) fail(`${variant}: stderr differs between python and node`);
      if (normalise2(after2) !== normalise(after)) fail(`${variant}: manifest.json differs between python and node`);
      // Same wall-clock format for `updated`, not just the same masked text.
      if (!TS_Z.test(JSON.parse(after2).updated)) fail(`${variant}: python wrote updated='${JSON.parse(after2).updated}'`);
      log(`ok   ${variant}: python and node agree (stdout, stderr, exit, manifest bytes)`);
    }
  }

  // 4. No staleness, no write: an unseeded copy comes back byte-identical.
  {
    const root = fresh({ seed: false });
    const before = readBytes(manifestPath(root));
    const node = run(process.execPath, [DEFAULT_TWIN, "validate", "ddd"], root);
    if (node.exit !== "0") fail(`control: exit ${node.exit}`);
    if (readBytes(manifestPath(root)) !== before) fail("control: manifest.json rewritten although nothing is stale");
    else log("ok   control: nothing stale, manifest untouched");
  }

  // 5. In-process, persist:false: same report as the CLI, nothing on disk changes.
  {
    const root = fresh();
    const dir = path.join(root, "ddd");
    const before = readBytes(manifestPath(root));
    const report = validate(dir, { persist: false });
    const after = readBytes(manifestPath(root));
    if (after !== before) fail("persist:false: manifest.json changed on disk");
    if (report.staleWritten !== false) fail("persist:false: report.staleWritten should be false");
    if (JSON.stringify(report.stale) !== JSON.stringify(STALE_STEPS)) fail(`persist:false: report.stale is ${JSON.stringify(report.stale)}`);
    // The manifest is still flipped in memory, so the table and `next:` match the CLI.
    for (const row of report.steps) {
      const want = STALE_STEPS.includes(row.step) ? "stale" : "done";
      if (row.status !== want) fail(`persist:false: table shows ${row.step}=${row.status}, expected ${want}`);
    }
    if (report.next !== STALE_STEPS[0]) fail(`persist:false: next is ${report.next}, expected ${STALE_STEPS[0]}`);
    if (report.warnings.filter(([, m]) => m.startsWith("stale: produced ")).length !== STALE_STEPS.length) fail("persist:false: stale warnings missing from the report");
    if (report.ok !== true || report.exitCode !== 0) fail("persist:false: stale is a warning, the report should be ok");
    for (const k of ["ddd_dir", "ok", "errors", "warnings", "info", "steps"]) if (!(k in report)) fail(`persist:false: report lacks --json key '${k}'`);
    // A second call sees the untouched file and reports the same thing again.
    const again = validate(dir, { persist: false });
    if (JSON.stringify(again.stale) !== JSON.stringify(report.stale)) fail("persist:false: second call differs (was something persisted?)");
    if (readBytes(manifestPath(root)) !== before) fail("persist:false: manifest.json changed after the second call");
    log(`ok   persist:false leaves manifest.json byte-identical, report still lists ${report.stale.length} stale steps`);

    // persist:true from the same entry point writes the same flip the CLI writes.
    const written = validate(dir, { persist: true });
    const afterWrite = readBytes(manifestPath(root));
    if (written.staleWritten !== true) fail("persist:true: report.staleWritten should be true");
    if (afterWrite !== expectedManifest(before, afterWrite)) fail("persist:true: manifest.json differs from the expected stale flip");
    // Now that the manifest says stale, a further run has nothing to flip and does not write.
    const settled = validate(dir, { persist: true });
    if (settled.staleWritten !== false || readBytes(manifestPath(root)) !== afterWrite) fail("persist:true: a settled manifest was rewritten");
    log("ok   persist:true writes the flip once");
  }

  // 6. --strict: the stale warnings alone make the run fail, and the write still happens.
  {
    const root = fresh();
    const before = readBytes(manifestPath(root));
    const node = run(process.execPath, [DEFAULT_TWIN, "validate", "ddd", "--strict"], root);
    if (node.exit !== "1") fail(`strict: exit ${node.exit}, expected 1`);
    if (!/^RESULT: FAIL$/m.test(node.stdout)) fail("strict: expected RESULT: FAIL");
    if (readBytes(manifestPath(root)) === before) fail("strict: manifest.json was not written");
    else log("ok   strict: warnings fail the run, stale still written");
  }
} finally {
  fs.rmSync(tmpBase, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`staleness verification failed (${failures.length})`);
  process.exit(1);
}
console.log("staleness verification passed");
