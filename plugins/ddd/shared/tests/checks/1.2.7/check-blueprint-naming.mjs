#!/usr/bin/env node
// G2: nothing under <plugin-dir> (except shared/tests/goldens) references
// ~/.claude/skills/archify, bin/archify.mjs or ARCHIFY_HOME; within
// skills/blueprint the word archify appears only in NOTICE.md, LICENSE and on
// provenance lines (`renamed copy of archify`, `derived from archify`, `based_on`).
// THIRD_PARTY_NOTICES.md and the derived-from headers in shared/lib are the
// driver's and are skipped here.
//
// Usage: node check-blueprint-naming.mjs <plugin-dir>
// Exit 0 and print `blueprint-naming verification passed`; 1 on a failed assertion; 2 on misuse.
import fs from 'node:fs';
import path from 'node:path';
import { report } from './_lib.mjs';

if (process.argv.length !== 3 || process.argv[2].startsWith('-')) { console.error('usage: node check-blueprint-naming.mjs <plugin-dir>'); process.exit(2); }
const plugin = path.resolve(process.argv[2]);
if (!fs.existsSync(path.join(plugin, 'skills', 'blueprint'))) { console.error(`FAIL ${plugin}/skills/blueprint does not exist`); process.exit(1); }

const failures = [];
const HARD = [/\.claude\/skills\/archify/, /bin\/archify\.mjs/, /ARCHIFY_HOME/];
const PROVENANCE = /renamed copy of archify|derived from archify|based_on/i;
// This check's own directory names the forbidden patterns; NOTICE.md and LICENSE state the origin.
const SELF_REL = path.join('shared', 'tests', 'checks', '1.2.7');
const SKIP_DIRS = new Set(['node_modules', '.git', 'goldens']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(p); }
    else if (e.isFile()) yield p;
  }
}
const isText = (buf) => !buf.subarray(0, 8000).includes(0);

const skill = path.join(plugin, 'skills', 'blueprint');
let filesSeen = 0;
for (const file of walk(plugin)) {
  const buf = fs.readFileSync(file);
  if (!isText(buf)) continue;
  filesSeen += 1;
  const text = buf.toString('utf8');
  const rel = path.relative(plugin, file);
  const lines = text.split('\n');
  if (rel.startsWith(SELF_REL + path.sep)) continue;
  const base = path.basename(file);
  const origin = file.startsWith(skill + path.sep) && (base === 'NOTICE.md' || base === 'LICENSE');
  if (origin) continue;
  lines.forEach((line, i) => {
    if (PROVENANCE.test(line)) return;
    for (const re of HARD) if (re.test(line)) failures.push(`${rel}:${i + 1} matches ${re}: ${line.trim().slice(0, 120)}`);
  });
  if (!file.startsWith(skill + path.sep)) continue;
  lines.forEach((line, i) => {
    if (/archify/i.test(line) && !PROVENANCE.test(line)) failures.push(`${rel}:${i + 1} says archify outside a provenance line: ${line.trim().slice(0, 120)}`);
  });
}
if (filesSeen === 0) failures.push('no text files scanned');
// User-facing strings say blueprint.
const bin = fs.readFileSync(path.join(skill, 'bin', 'blueprint.mjs'), 'utf8');
if (!bin.includes('blueprint render <type>')) failures.push('bin/blueprint.mjs usage does not say blueprint');
if (!bin.includes("'\\nBlueprint is ready.'")) failures.push('doctor ready line does not say Blueprint');
const tpl = fs.readFileSync(path.join(skill, 'assets', 'template.html'), 'utf8');
if (!/<meta name="generator" content="blueprint/.test(tpl)) failures.push('template generator meta does not say blueprint');
if (!/var Blueprint = \{\};/.test(tpl)) failures.push('template viewer runtime global is not Blueprint');
// Attribution still names the upstream with the MIT text.
const lic = fs.readFileSync(path.join(skill, 'LICENSE'), 'utf8');
if (!/MIT License/.test(lic) || !/tt-a1i \(Archify\)/.test(lic)) failures.push('LICENSE is not archify\'s unchanged MIT text');
const notice = fs.readFileSync(path.join(skill, 'NOTICE.md'), 'utf8');
if (!/archify 2\.17\.0-dev\.1/.test(notice) || !/tt-a1i/.test(notice) || !/MIT/.test(notice)) failures.push('NOTICE.md does not state the archify 2.17.0-dev.1 / tt-a1i / MIT origin');
for (const gone of ['scripts/check-update.mjs', 'scripts/update-contract.mjs', 'skill-release.json', 'test', 'node_modules', 'package-lock.json', 'bin/archify.mjs']) {
  if (fs.existsSync(path.join(skill, gone))) failures.push(`${gone} should not be vendored`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(skill, 'package.json'), 'utf8'));
if (pkg.dependencies || pkg.devDependencies) failures.push('package.json declares dependencies');
if (pkg.name !== 'ddd-blueprint' || pkg.type !== 'module' || pkg.private !== true) failures.push('package.json is not ddd-blueprint/private/module');
report('blueprint-naming', failures);
