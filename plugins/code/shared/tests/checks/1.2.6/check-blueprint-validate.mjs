#!/usr/bin/env node
// Gate check for leaf 1.2.6 G2.
//
//   node check-blueprint-validate.mjs <ddd-dir>
//
// For the given workspace and for the toolshare fixture (fixtures/toolshare/ddd),
// exports to a temp dir, then runs the vendored skill's own validator on every spec:
// `node plugins/code/skills/blueprint/bin/blueprint.mjs validate architecture <spec>
// --json` and `validate sequence ...`. Requires `ok: true` and zero composition
// errors per receipt (warnings are acceptable at the standard profile and are
// printed). The skill is the plugin's own (BLUEPRINT_HOME may override for
// development); a plugin without it fails this check (exit 1), because this gate
// is about the validator's judgement, not ours.
//
// Exit 2 on misuse, 1 on failure, 0 when it prints "blueprint-validate verification passed".
import fs from 'node:fs';
import path from 'node:path';
import { BLUEPRINT_BIN, tmpDir, runExport, runBlueprint, fileList, workspacesFor } from './_lib.mjs';

const argv = process.argv.slice(2);
if (argv.length !== 1 || argv[0].startsWith('-')) usage('exactly one <ddd-dir> is required');
if (!fs.existsSync(path.join(path.resolve(argv[0]), 'manifest.json'))) usage(`${argv[0]} has no manifest.json`);

function usage(msg) {
  process.stderr.write(`check-blueprint-validate: ${msg}\nusage: check-blueprint-validate.mjs <ddd-dir>\n`);
  process.exit(2);
}

const failures = [];
const fail = (m) => { failures.push(m); process.stderr.write(`FAIL ${m}\n`); };
const ok = (m) => process.stdout.write(`ok   ${m}\n`);

if (!fs.existsSync(BLUEPRINT_BIN)) {
  process.stderr.write(`FAIL the blueprint skill is missing at ${BLUEPRINT_BIN} (the plugin is incomplete); this gate needs its validator\n`);
  process.exit(1);
}
ok(`blueprint found at ${BLUEPRINT_BIN}`);

function checkWorkspace(dddDir) {
  process.stdout.write(`--- ${dddDir}\n`);
  const out = tmpDir();
  const r = runExport(dddDir, ['--out', out]);
  if (r.status !== 0) { fail(`ddd export blueprint exited ${r.status}: ${r.stderr.trim()}`); }
  if (/dropped the label/.test(r.stderr)) fail(`a connection label was dropped:\n${r.stderr}`);
  const files = fs.existsSync(out) ? fileList(out) : [];
  if (!files.length) fail('no specs written');

  for (const f of files) {
    const type = f.endsWith('.sequence.json') ? 'sequence' : 'architecture';
    const file = path.join(out, f);
    const v = runBlueprint(['validate', type, file, '--json']);
    let receipt = null;
    try { receipt = JSON.parse(v.stdout); } catch { receipt = null; }
    if (!receipt) { fail(`${f}: blueprint validate produced no JSON (exit ${v.status}): ${(v.stderr || v.stdout).trim()}`); continue; }
    const errors = receipt.composition?.summary?.errors;
    const warnings = receipt.composition?.summary?.warnings;
    if (v.status !== 0 || receipt.ok !== true) {
      fail(`${f}: blueprint validate ${type} failed (exit ${v.status}): ${receipt.error || JSON.stringify(receipt.diagnostics || receipt)}`);
      continue;
    }
    if (errors !== 0) { fail(`${f}: composition errors ${errors}`); continue; }
    const badChecks = (receipt.checks || []).filter((c) => c.ok === false).map((c) => c.name);
    if (badChecks.length) { fail(`${f}: failed checks ${badChecks.join(', ')}`); continue; }
    const byCode = {};
    for (const issue of receipt.composition?.issues || []) byCode[issue.code] = (byCode[issue.code] || 0) + 1;
    const codes = Object.entries(byCode).map(([c, n]) => `${c} x${n}`).join(', ');
    ok(`${f}: blueprint validate ${type} ok, ${receipt.checks?.length ?? 0} checks, ${errors} errors, ${warnings} warnings${codes ? ` (${codes})` : ''}`);
  }
}

for (const dddDir of workspacesFor(argv)) checkWorkspace(dddDir);

if (failures.length) {
  process.stderr.write(`blueprint-validate verification failed: ${failures.length} problem(s)\n`);
  process.exit(1);
}
process.stdout.write('blueprint-validate verification passed\n');
