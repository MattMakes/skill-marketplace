#!/usr/bin/env node
// G5 for leaf 1.2.1: THIRD_PARTY_NOTICES.md names Archify (the upstream project; shipped here as blueprint) and MIT, lists
// every file under shared/lib/render/core that carries a
// "// derived from archify: <path> (MIT)" header together with each source
// path that header cites, and names every vendored file under shared/vendor
// (elkjs, EPL-2.0) with its version and sha256.
//
// Usage: node plugins/code/shared/tests/checks/1.2.1/check-notices.mjs
// Exit 0 pass, 1 fail, 2 usage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length) {
  console.error('usage: node check-notices.mjs   (no arguments)');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const shared = path.resolve(here, '../../..');
const core = path.join(shared, 'lib/render/core');
const vendor = path.join(shared, 'vendor');
const noticesFile = path.join(shared, 'THIRD_PARTY_NOTICES.md');
const problems = [];

if (!fs.existsSync(noticesFile)) {
  console.error(`FAIL missing ${noticesFile}`);
  process.exit(1);
}
const notices = fs.readFileSync(noticesFile, 'utf8');
if (!/archify/i.test(notices)) problems.push('notices do not name Archify (the upstream project)');
if (!/blueprint/i.test(notices)) problems.push('notices do not say the renderer ships as blueprint');
if (!/\bMIT\b/.test(notices)) problems.push('notices do not name the MIT licence');
if (!/Permission is hereby granted, free of charge/.test(notices)) problems.push('notices do not include the MIT licence text');
if (!/tt-a1i/.test(notices)) problems.push('notices do not carry the Archify copyright holder');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out.sort();
}

const HEADER = /^\/\/ derived from archify: (\S+) \(MIT\)\s*$/gm;
let derived = 0;
for (const file of walk(core)) {
  const source = fs.readFileSync(file, 'utf8');
  const sources = [...source.matchAll(HEADER)].map((m) => m[1]);
  if (!sources.length) continue;
  derived += 1;
  const rel = path.relative(core, file);
  if (!notices.includes(rel)) problems.push(`notices do not list core/${rel}`);
  for (const src of sources) {
    if (!notices.includes(src)) problems.push(`notices do not cite ${src} (used by core/${rel})`);
  }
}
if (!derived) problems.push('no file under core/ carries a "derived from archify" header');

// Vendored libraries: every file under vendor/ (other than the licence and
// VERSION themselves) is named in the notices with its licence; elkjs is
// required with its EPL-2.0 election and the sha256 recorded in VERSION.
let vendoredFiles = 0;
if (!/elkjs/i.test(notices)) problems.push('notices do not name elkjs');
if (!/EPL-2\.0|Eclipse Public License/.test(notices)) problems.push('notices do not name the EPL-2.0 licence');
if (fs.existsSync(vendor)) {
  for (const file of walk(vendor)) {
    const rel = path.relative(vendor, file);
    const name = path.basename(file);
    if (['LICENSE', 'LICENSE.md', 'VERSION', 'package.json'].includes(name)) continue;
    vendoredFiles += 1;
    if (!notices.includes(rel)) problems.push(`notices do not list vendor/${rel}`);
    const versionFile = path.join(path.dirname(file), 'VERSION');
    if (fs.existsSync(versionFile)) {
      const sha = /sha256:\s*([0-9a-f]{64})/.exec(fs.readFileSync(versionFile, 'utf8'));
      if (!sha) problems.push(`vendor/${path.dirname(rel)}/VERSION records no sha256`);
      else if (!notices.includes(sha[1])) problems.push(`notices do not record the sha256 of vendor/${rel}`);
    }
  }
}
if (!vendoredFiles) problems.push('no vendored file found under shared/vendor');

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(`${derived} derived files, every cited archify path and ${vendoredFiles} vendored file(s) appear in THIRD_PARTY_NOTICES.md`);
console.log('notices verification passed');
