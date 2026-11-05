#!/usr/bin/env node
import { fingerprint } from './fingerprint.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };

t('returns 12-char lowercase hex', () => {
  const fp = fingerprint({ category: 'sec/sql-injection', file: 'src/a.js', title: 'Hello' });
  eq(fp.length, 12);
  ok(/^[0-9a-f]{12}$/.test(fp), `not hex: ${fp}`);
});

t('is deterministic for same inputs', () => {
  const a = fingerprint({ category: 'x', file: 'y', title: 'z' });
  const b = fingerprint({ category: 'x', file: 'y', title: 'z' });
  eq(a, b);
});

t('changes when category changes', () => {
  const a = fingerprint({ category: 'x', file: 'y', title: 'z' });
  const b = fingerprint({ category: 'x2', file: 'y', title: 'z' });
  ok(a !== b, 'expected different fingerprints');
});

t('changes when file changes', () => {
  const a = fingerprint({ category: 'x', file: 'y', title: 'z' });
  const b = fingerprint({ category: 'x', file: 'y2', title: 'z' });
  ok(a !== b);
});

t('normalises whitespace and case in title', () => {
  const a = fingerprint({ category: 'c', file: 'f', title: 'Hello   World' });
  const b = fingerprint({ category: 'c', file: 'f', title: '  hello world  ' });
  eq(a, b);
});

t('treats missing title as empty string', () => {
  // Covers `title ?? ''` branch.
  const a = fingerprint({ category: 'c', file: 'f', title: undefined });
  const b = fingerprint({ category: 'c', file: 'f', title: '' });
  eq(a, b);
});

t('handles missing category and file as literal "undefined"', () => {
  // Template literal stringifies undefined; same inputs hash the same.
  const a = fingerprint({});
  const b = fingerprint({});
  eq(a, b);
  ok(/^[0-9a-f]{12}$/.test(a));
});

let pass = 0, fail = 0;
for (const T of tests) {
  try { await T.fn(); process.stdout.write(`PASS ${T.name}\n`); pass++; }
  catch (e) { process.stdout.write(`FAIL ${T.name}: ${e.stack || e.message}\n`); fail++; }
}
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
