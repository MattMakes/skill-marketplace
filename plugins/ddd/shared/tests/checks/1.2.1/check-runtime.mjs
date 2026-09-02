#!/usr/bin/env node
// G3 for leaf 1.2.1: runtime.js is valid plain JS under 400 lines, references
// no external URL, and exposes pan, zoom, search, focus, trace, toggle on
// window.dddRuntime when run against a minimal DOM stub.
//
// Usage: node plugins/ddd/shared/tests/checks/1.2.1/check-runtime.mjs
// Exit 0 pass, 1 fail, 2 usage.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length) {
  console.error('usage: node check-runtime.mjs   (no arguments)');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../../../lib/render/core/runtime.js');
const problems = [];

if (!fs.existsSync(file)) {
  console.error(`FAIL missing ${file}`);
  process.exit(1);
}
const source = fs.readFileSync(file, 'utf8');
const lines = source.split('\n').length;

// Plain script: new Function rejects import/export and top-level await.
try {
  new Function(source); // eslint-disable-line no-new-func
} catch (error) {
  problems.push(`does not parse as a plain script: ${error.message}`);
}
if (lines >= 400) problems.push(`${lines} lines; must be under 400`);
if (/https?:\/\//.test(source)) problems.push('references an external URL (http:// or https://)');

// Minimal DOM so init() runs and the runtime registers itself.
const noop = () => {};
const document = {
  readyState: 'complete',
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: () => null,
  addEventListener: noop,
  createElement: () => ({ style: {}, setAttribute: noop, addEventListener: noop, classList: { add: noop, remove: noop } }),
  body: { appendChild: noop },
};
const window = { addEventListener: noop, scrollX: 0, scrollY: 0, document };
const context = { window, document, location: { hash: '' }, setTimeout, clearTimeout, console };
window.window = window;
try {
  vm.runInNewContext(source, context, { filename: 'runtime.js' });
} catch (error) {
  problems.push(`throws at load against a bare DOM: ${error.message}`);
}
const api = window.dddRuntime;
if (!api || typeof api !== 'object') problems.push('window.dddRuntime is not set');
else {
  for (const name of ['pan', 'zoom', 'search', 'focus', 'trace', 'toggle']) {
    if (typeof api[name] !== 'function') problems.push(`window.dddRuntime.${name} is not a function`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(`runtime.js: ${lines} lines, parses, no external URLs, exposes pan/zoom/search/focus/trace/toggle`);
console.log('runtime verification passed');
