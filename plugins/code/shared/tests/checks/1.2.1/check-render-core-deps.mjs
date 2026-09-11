#!/usr/bin/env node
// G1 for leaf 1.2.1: every module under shared/lib/render/core imports only
// node: builtins, sibling files, and files under shared/vendor/ (each of
// which must have a LICENSE beside it), and each module actually loads.
//
// Usage: node plugins/code/shared/tests/checks/1.2.1/check-render-core-deps.mjs
// Exit 0 pass, 1 fail, 2 usage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
if (args.length) {
  console.error('usage: node check-render-core-deps.mjs   (no arguments)');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const core = path.resolve(here, '../../../lib/render/core');
const vendor = path.resolve(here, '../../../vendor');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(mjs|js|cjs)$/.test(entry.name)) out.push(full);
  }
  return out.sort();
}

// Static imports, re-exports, dynamic imports and require() calls.
const PATTERNS = [
  /\bimport\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+[^'";]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const problems = [];
const files = walk(core);
if (!files.length) problems.push(`no modules found under ${core}`);
const vendored = new Set();

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(core, file);
  for (const pattern of PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const spec = match[1];
      if (spec.startsWith('node:')) continue;
      if (spec.startsWith('./') || spec.startsWith('../')) {
        const target = path.resolve(path.dirname(file), spec);
        if (target.startsWith(core + path.sep)) {
          if (!fs.existsSync(target)) problems.push(`${rel}: "${spec}" does not exist`);
        } else if (target.startsWith(vendor + path.sep)) {
          if (!fs.existsSync(target)) problems.push(`${rel}: vendored "${spec}" does not exist`);
          else {
            vendored.add(target);
            const licence = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE'].map((n) => path.join(path.dirname(target), n)).find((f) => fs.existsSync(f));
            if (!licence) problems.push(`${rel}: vendored "${spec}" has no LICENSE beside it`);
          }
        } else {
          problems.push(`${rel}: "${spec}" leaves core/ and vendor/`);
        }
        continue;
      }
      problems.push(`${rel}: "${spec}" is not a node: builtin, a sibling file or a vendored file`);
    }
  }
}

// Every vendored file, referenced or not, needs a licence and a VERSION beside it.
if (fs.existsSync(vendor)) {
  for (const file of walk(vendor)) {
    const dir = path.dirname(file);
    if (!['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE'].some((n) => fs.existsSync(path.join(dir, n)))) problems.push(`vendor/${path.relative(vendor, file)}: no LICENSE beside it`);
    if (!fs.existsSync(path.join(dir, 'VERSION'))) problems.push(`vendor/${path.relative(vendor, file)}: no VERSION beside it`);
  }
  if (fs.existsSync(path.join(vendor, 'node_modules'))) problems.push('vendor/ contains node_modules');
}

for (const file of files.filter((f) => f.endsWith('.mjs'))) {
  try {
    await import(pathToFileURL(file).href);
  } catch (error) {
    problems.push(`${path.relative(core, file)}: failed to import: ${error.message}`);
  }
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(`checked ${files.length} files under ${path.relative(process.cwd(), core)}; vendored: ${[...vendored].map((v) => path.relative(vendor, v)).join(', ') || 'none'}`);
console.log('render-core-deps verification passed');
