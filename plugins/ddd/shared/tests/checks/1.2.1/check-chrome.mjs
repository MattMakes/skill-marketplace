#!/usr/bin/env node
// G4 for leaf 1.2.1: findChrome returns an existing path on this machine or
// null, never throws for a fake platform or env, and svgToPng either renders
// a real PNG (Chrome present) or resolves {ok:false, note} without throwing.
//
// Usage: node plugins/ddd/shared/tests/checks/1.2.1/check-chrome.mjs
// Exit 0 pass, 1 fail, 2 usage.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length) {
  console.error('usage: node check-chrome.mjs   (no arguments)');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const { findChrome, svgToPng, headlessArgs, NO_CHROME_NOTE } = await import(path.resolve(here, '../../../lib/render/core/chrome.mjs'));
const { svgDocument, boxed } = await import(path.resolve(here, '../../../lib/render/core/svg.mjs'));

const problems = [];
const EXPECTED_NOTE = 'No Chrome/Chromium found; PNG skipped. Set CHROME_PATH to enable.';

let found;
try {
  found = findChrome();
} catch (error) {
  problems.push(`findChrome() threw: ${error.message}`);
}
if (found !== null && !(typeof found === 'string' && fs.existsSync(found))) {
  problems.push(`findChrome() returned ${JSON.stringify(found)}, which is neither null nor an existing path`);
}

for (const platform of ['darwin', 'linux', 'win32', 'sunos', '']) {
  for (const env of [{}, { PATH: '/nowhere' }, { CHROME_PATH: '/nowhere/chrome' }, { PUPPETEER_EXECUTABLE_PATH: '' }, { PROGRAMFILES: 'C:\\x' }]) {
    try {
      const value = findChrome({ env, platform });
      if (value !== null && typeof value !== 'string') problems.push(`findChrome(${platform}) returned a non-string`);
    } catch (error) {
      problems.push(`findChrome({platform:${JSON.stringify(platform)}, env:${JSON.stringify(env)}}) threw: ${error.message}`);
    }
  }
}
if (findChrome({ env: { DDD_NO_CHROME: '1' } }) !== null) problems.push('DDD_NO_CHROME=1 did not force null');
if (findChrome({ env: { CHROME_PATH: '/nowhere/chrome' } }) !== null) problems.push('a bad CHROME_PATH did not yield null');
if (NO_CHROME_NOTE !== EXPECTED_NOTE) problems.push(`NO_CHROME_NOTE is ${JSON.stringify(NO_CHROME_NOTE)}`);
const hargs = headlessArgs('/tmp/p', { width: 10, height: 20 });
if (!hargs.includes('--headless=new') || !hargs.includes('--window-size=10,20') || !hargs.includes('--user-data-dir=/tmp/p')) {
  problems.push(`headlessArgs is missing a required flag: ${hargs.join(' ')}`);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddd-check-chrome-'));
try {
  const svgFile = path.join(dir, 'tiny.svg');
  const body = boxed('Ordering', 'core', 'ACL', { id: 'ordering', x: 10, y: 10, width: 120, height: 50 }, { kind: 'core', diagramId: 'tiny' });
  fs.writeFileSync(svgFile, svgDocument({ id: 'tiny', title: 'tiny', width: 140, height: 70, body }));

  const skipped = await svgToPng(svgFile, path.join(dir, 'skipped.png'), { env: { DDD_NO_CHROME: '1' } });
  if (skipped.ok !== false || skipped.note !== EXPECTED_NOTE) problems.push(`DDD_NO_CHROME result was ${JSON.stringify(skipped)}`);

  const missing = await svgToPng(svgFile, path.join(dir, 'missing.png'), { chrome: path.join(dir, 'no-such-chrome') });
  if (missing.ok !== false || typeof missing.note !== 'string' || !missing.note) problems.push(`a missing binary did not resolve {ok:false, note}: ${JSON.stringify(missing)}`);

  if (found) {
    const png = path.join(dir, 'tiny.png');
    const result = await svgToPng(svgFile, png, { chrome: found });
    if (!result.ok) problems.push(`svgToPng with ${found} failed: ${result.note}`);
    else {
      const head = fs.readFileSync(png).subarray(0, 8);
      if (!head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) problems.push('output is not a PNG');
    }
  }
} catch (error) {
  problems.push(`svgToPng threw: ${error.message}`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(found ? `findChrome() = ${found}; svgToPng rendered a PNG` : `findChrome() = null on this machine; PNG skipped with note: ${EXPECTED_NOTE}`);
console.log('chrome verification passed');
