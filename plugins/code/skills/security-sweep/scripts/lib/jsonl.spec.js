#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { readJsonl, writeJsonl, appendJsonl } from './jsonl.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const tmp = async () => fs.mkdtemp(path.join(os.tmpdir(), 'jsonl-spec-'));
const cleanup = async (d) => { try { await fs.rm(d, { recursive: true, force: true }); } catch {} };

t('readJsonl returns [] for missing file', async () => {
  const d = await tmp();
  try {
    const items = await readJsonl(path.join(d, 'nope.jsonl'));
    eq(items, []);
  } finally { await cleanup(d); }
});

t('readJsonl returns [] for empty file', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'empty.jsonl');
    await fs.writeFile(fp, '', 'utf8');
    eq(await readJsonl(fp), []);
  } finally { await cleanup(d); }
});

t('readJsonl skips blank/whitespace-only lines', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'mixed.jsonl');
    await fs.writeFile(fp, '\n   \n{"a":1}\n\n{"b":2}\n', 'utf8');
    eq(await readJsonl(fp), [{ a: 1 }, { b: 2 }]);
  } finally { await cleanup(d); }
});

t('readJsonl throws on invalid JSON line with file path and snippet', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'bad.jsonl');
    await fs.writeFile(fp, '{"a":1}\nthis is not json\n', 'utf8');
    let err = null;
    try { await readJsonl(fp); } catch (e) { err = e; }
    ok(err, 'expected throw');
    ok(err.message.includes(fp), `expected file path in error: ${err.message}`);
    ok(err.message.includes('this is not json'), `expected line snippet in error: ${err.message}`);
  } finally { await cleanup(d); }
});

t('readJsonl truncates long invalid line in error message to 120 chars', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'long.jsonl');
    const longJunk = 'x'.repeat(500);
    await fs.writeFile(fp, longJunk + '\n', 'utf8');
    let err = null;
    try { await readJsonl(fp); } catch (e) { err = e; }
    ok(err);
    // The snippet section should not contain the full 500-char line.
    const afterPipe = err.message.split('| line: ')[1] || '';
    ok(afterPipe.length <= 120, `expected truncated snippet, got length ${afterPipe.length}`);
  } finally { await cleanup(d); }
});

t('writeJsonl writes one item per line with trailing newline', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'out.jsonl');
    await writeJsonl(fp, [{ a: 1 }, { b: 2 }]);
    const raw = await fs.readFile(fp, 'utf8');
    eq(raw, '{"a":1}\n{"b":2}\n');
  } finally { await cleanup(d); }
});

t('writeJsonl with empty array writes empty file (no trailing newline)', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'empty-out.jsonl');
    await writeJsonl(fp, []);
    const raw = await fs.readFile(fp, 'utf8');
    eq(raw, '');
  } finally { await cleanup(d); }
});

t('appendJsonl appends a single record with newline', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'append.jsonl');
    await appendJsonl(fp, { a: 1 });
    await appendJsonl(fp, { b: 2 });
    eq(await fs.readFile(fp, 'utf8'), '{"a":1}\n{"b":2}\n');
  } finally { await cleanup(d); }
});

let pass = 0, fail = 0;
for (const T of tests) {
  try { await T.fn(); process.stdout.write(`PASS ${T.name}\n`); pass++; }
  catch (e) { process.stdout.write(`FAIL ${T.name}: ${e.stack || e.message}\n`); fail++; }
}
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
