#!/usr/bin/env node
// Gate check for leaf 1.2.6 G3 (and G5 with --workspace).
//
//   node check-deliver.mjs [--workspace <ddd-dir>]     (default: the mealkit example)
//
// The renderer is the plugin's own blueprint skill (<plugin>/skills/blueprint);
// nothing outside the plugin may be consulted. On private temp copies of the
// workspace:
//   1. with BLUEPRINT_HOME unset, `ddd export blueprint <copy> --deliver` exits 0,
//      writes <copy>/diagrams/final.html and one final-<flow>.html per sequence spec,
//      and prints one receipt line per artifact (path, sha256, error count 0);
//   2. with BLUEPRINT_HOME=/nonexistent it warns and still delivers through the
//      vendored skill (same artifacts, exit 0);
//   3. with HOME pointed at an empty temp directory (and BLUEPRINT_HOME unset) the
//      run still delivers: nothing under a home directory is read;
//   4. the skill's own validator (`blueprint.mjs validate <type> <spec> --json`)
//      reports 0 composition errors on every written spec;
//   5. the skill directory is not modified (sizes and mtimes compared).
// A missing skill is a failure: the plugin would be incomplete.
//
// --workspace names another workspace (G5: the smoke workspace); when that path
// has no manifest.json the toolshare fixture is used instead and that is printed.
//
// Exit 2 on misuse, 1 on failure, 0 when it prints "deliver verification passed".
import fs from 'node:fs';
import path from 'node:path';
import { BLUEPRINT_HOME, BLUEPRINT_BIN, BLUEPRINT_VENDORED, MEALKIT, TOOLSHARE, copyWorkspace, runExport, runBlueprint, tmpDir, envWithout } from './_lib.mjs';

const argv = process.argv.slice(2);
let requested = null;
for (let i = 0; i < argv.length; i += 1) {
  const x = argv[i];
  if (x === '--workspace' || x === '-w') { requested = argv[++i]; if (!requested) usage('--workspace needs a <ddd-dir>'); continue; }
  if (x.startsWith('--workspace=')) { requested = x.slice('--workspace='.length); continue; }
  if (x.startsWith('-')) usage(`unknown option ${x}`);
  if (requested) usage('one workspace only');
  requested = x;
}
let dddDir = path.resolve(requested || MEALKIT);
if (!fs.existsSync(path.join(dddDir, 'manifest.json'))) {
  if (!requested) usage(`${dddDir} has no manifest.json`);
  process.stdout.write(`note ${requested} has no manifest.json; using the toolshare fixture instead\n`);
  dddDir = TOOLSHARE;
}

function usage(msg) {
  process.stderr.write(`check-deliver: ${msg}\nusage: check-deliver.mjs [--workspace <ddd-dir>]\n`);
  process.exit(2);
}

const failures = [];
const fail = (m) => { failures.push(m); process.stderr.write(`FAIL ${m}\n`); };
const ok = (m) => process.stdout.write(`ok   ${m}\n`);

if (!fs.existsSync(BLUEPRINT_BIN)) {
  process.stderr.write(`FAIL the blueprint skill is missing at ${BLUEPRINT_BIN}; the plugin is incomplete\n`);
  process.exit(1);
}
ok(`blueprint skill at ${BLUEPRINT_HOME}${BLUEPRINT_HOME === BLUEPRINT_VENDORED ? ' (vendored)' : ' (BLUEPRINT_HOME override)'}`);
process.stdout.write(`--- ${dddDir}\n`);

// Snapshot of the skill tree so a write into it is caught.
function snapshot(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { const st = fs.statSync(p); out.set(p, `${st.size}:${st.mtimeMs}`); }
    }
  };
  walk(dir);
  return out;
}
const before = snapshot(BLUEPRINT_VENDORED);

// A deliver run on a fresh copy: exit 0, every html present, one clean receipt per spec.
function deliverRun(name, env) {
  const copy = copyWorkspace(dddDir);
  const r = runExport(copy, ['--deliver'], env);
  const diagrams = path.join(copy, 'diagrams');
  if (r.status === 0) ok(`${name}: --deliver exit 0`);
  else fail(`${name}: --deliver exited ${r.status}\n${r.stdout}${r.stderr}`);
  const html = path.join(diagrams, 'final.html');
  if (fs.existsSync(html) && fs.statSync(html).size > 1000) ok(`${name}: wrote final.html (${fs.statSync(html).size} bytes)`);
  else fail(`${name}: final.html not written`);
  const specs = fs.existsSync(diagrams) ? fs.readdirSync(diagrams).filter((f) => /\.(architecture|sequence)\.json$/.test(f)).sort() : [];
  const seqs = specs.filter((f) => f.endsWith('.sequence.json'));
  if (seqs.length) ok(`${name}: ${seqs.length} sequence spec(s)`);
  else fail(`${name}: no sequence spec written`);
  for (const s of seqs) {
    const h = path.join(diagrams, s.replace(/\.sequence\.json$/, '.html'));
    if (fs.existsSync(h) && fs.statSync(h).size > 1000) ok(`${name}: wrote ${path.basename(h)}`);
    else fail(`${name}: ${path.basename(h)} not written`);
  }
  const receiptLines = r.stdout.split('\n').filter((l) => /sha256 [0-9a-f]{64}\s+errors \d+/.test(l));
  if (receiptLines.length === 1 + seqs.length) ok(`${name}: ${receiptLines.length} receipt line(s): ${receiptLines[0]}`);
  else fail(`${name}: expected ${1 + seqs.length} receipt lines, got ${receiptLines.length}:\n${r.stdout}`);
  if (receiptLines.every((l) => l.includes('errors 0'))) ok(`${name}: every receipt reports errors 0`);
  else fail(`${name}: a receipt reports errors`);
  if (/not installed/.test(r.stdout + r.stderr)) fail(`${name}: a not-installed note appeared`);
  return { r, diagrams, specs };
}

// 1. default discovery (BLUEPRINT_HOME unset).
const first = deliverRun('vendored', envWithout(['BLUEPRINT_HOME']));
{
  const snap = fs.existsSync(first.diagrams) ? fs.readdirSync(first.diagrams).filter((f) => f.startsWith('.')) : [];
  if (snap.length) ok(`vendored: the skill's private snapshot(s) live beside the html: ${snap.join(', ')}`);
}

// 2. an unusable BLUEPRINT_HOME falls back to the vendored skill.
{
  const { r } = deliverRun('BLUEPRINT_HOME=/nonexistent', envWithout(['BLUEPRINT_HOME'], { BLUEPRINT_HOME: '/nonexistent' }));
  if (/warning: BLUEPRINT_HOME=\/nonexistent has no bin\/blueprint\.mjs/.test(r.stderr)) ok('BLUEPRINT_HOME=/nonexistent: warns and uses the plugin\'s skill');
  else fail(`BLUEPRINT_HOME=/nonexistent: no fallback warning on stderr:\n${r.stderr}`);
}

// 3. an empty HOME: nothing outside the plugin is read.
{
  const home = tmpDir('ddd-empty-home-');
  deliverRun('HOME=<empty>', envWithout(['BLUEPRINT_HOME'], { HOME: home }));
  const inHome = fs.readdirSync(home);
  if (!inHome.length) ok('HOME=<empty>: the empty home directory is still empty');
  else fail(`HOME=<empty>: the run wrote into HOME: ${inHome.join(', ')}`);
}

// 4. the skill's validator on every delivered spec.
for (const f of first.specs) {
  const type = f.endsWith('.sequence.json') ? 'sequence' : 'architecture';
  const v = runBlueprint(['validate', type, path.join(first.diagrams, f), '--json']);
  let receipt = null;
  try { receipt = JSON.parse(v.stdout); } catch { receipt = null; }
  const errors = receipt?.composition?.summary?.errors;
  const warnings = receipt?.composition?.summary?.warnings;
  if (v.status === 0 && receipt?.ok === true && errors === 0) ok(`${f}: blueprint validate ${type} ok, ${receipt.checks?.length ?? 0} checks, 0 errors, ${warnings} warnings`);
  else fail(`${f}: blueprint validate ${type} exit ${v.status}, errors ${errors}: ${receipt ? receipt.error || JSON.stringify(receipt.diagnostics || receipt.composition?.issues || receipt).slice(0, 400) : (v.stderr || v.stdout).trim()}`);
}

// 5. the skill untouched.
{
  const after = snapshot(BLUEPRINT_VENDORED);
  const changed = [...after].filter(([p, v]) => before.get(p) !== v).map(([p]) => p);
  const removed = [...before.keys()].filter((p) => !after.has(p));
  if (!changed.length && !removed.length) ok('blueprint directory unchanged');
  else fail(`blueprint directory changed: ${[...changed, ...removed].slice(0, 5).join(', ')}`);
}

if (failures.length) {
  process.stderr.write(`deliver verification failed: ${failures.length} problem(s)\n`);
  process.exit(1);
}
process.stdout.write('deliver verification passed\n');
