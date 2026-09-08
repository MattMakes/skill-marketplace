#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  parseArgs, readJsonSafe, listIds, severityFromConfidence, main,
} from './assemble-report.js';
import { runPaths } from './lib/run-paths.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const tmp = async () => fs.mkdtemp(path.join(os.tmpdir(), 'assemble-report-spec-'));
const cleanup = async (d) => { try { await fs.rm(d, { recursive: true, force: true }); } catch {} };

const captureStdout = async (fn) => {
  const orig = process.stdout.write.bind(process.stdout);
  let buf = '';
  process.stdout.write = (s) => { buf += s; return true; };
  try { await fn(); } finally { process.stdout.write = orig; }
  return buf;
};

t('parseArgs reads --run-id and --repo-root', () => {
  eq(parseArgs(['node', 'x', '--run-id', 'r', '--repo-root', '/r']), { runId: 'r', repoRoot: '/r' });
});

t('parseArgs ignores extras and unknown flags', () => {
  eq(parseArgs(['node', 'x', '--unknown', '1']), {});
});

t('readJsonSafe returns parsed JSON when file exists and is valid', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'a.json');
    await fs.writeFile(fp, '{"a":1}', 'utf8');
    eq(await readJsonSafe(fp), { a: 1 });
  } finally { await cleanup(d); }
});

t('readJsonSafe returns null on missing file', async () => {
  const d = await tmp();
  try {
    eq(await readJsonSafe(path.join(d, 'missing.json')), null);
  } finally { await cleanup(d); }
});

t('readJsonSafe returns null on invalid JSON', async () => {
  const d = await tmp();
  try {
    const fp = path.join(d, 'bad.json');
    await fs.writeFile(fp, 'not json', 'utf8');
    eq(await readJsonSafe(fp), null);
  } finally { await cleanup(d); }
});

t('listIds returns [] when dir is missing', async () => {
  const d = await tmp();
  try {
    eq(await listIds(path.join(d, 'nope')), []);
  } finally { await cleanup(d); }
});

t('listIds filters f-* files by suffix and returns sorted ids', async () => {
  const d = await tmp();
  try {
    await fs.writeFile(path.join(d, 'f-00002.json'), '{}');
    await fs.writeFile(path.join(d, 'f-00001.json'), '{}');
    await fs.writeFile(path.join(d, 'f-00003.md'), 'x');
    await fs.writeFile(path.join(d, 'README.md'), 'ignore');
    eq(await listIds(d), ['f-00001', 'f-00002']);
    eq(await listIds(d, '.md'), ['f-00003']);
  } finally { await cleanup(d); }
});

t('severityFromConfidence maps verdict + confidence to bucket', () => {
  eq(severityFromConfidence({ verdict: 'CONFIRMED', confidence: 9 }), 'critical-or-important');
  eq(severityFromConfidence({ verdict: 'CONFIRMED', confidence: 8 }), 'critical-or-important');
  eq(severityFromConfidence({ verdict: 'CONFIRMED', confidence: 7 }), 'minor');
  eq(severityFromConfidence({ verdict: 'CONFIRMED', confidence: 5 }), 'minor');
  eq(severityFromConfidence({ verdict: 'CONFIRMED', confidence: 4 }), null);
  eq(severityFromConfidence({ verdict: 'CONFIRMED' }), null); // confidence ?? 0 → 0
  eq(severityFromConfidence({ verdict: 'FALSE_POSITIVE', confidence: 9 }), null);
});

t('main throws when --run-id missing', async () => {
  let err = null;
  try { await main(['node', 'x']); } catch (e) { err = e; }
  ok(err && err.message === '--run-id required');
});

t('main produces report-input with verdict CRITICAL when any confirmed >= 8', async () => {
  const d = await tmp();
  try {
    const paths = runPaths('r', d);
    await fs.mkdir(paths.verifierQueueDir, { recursive: true });
    await fs.mkdir(paths.verifierResultsDir, { recursive: true });
    await fs.mkdir(paths.exploitsDir, { recursive: true });
    await fs.mkdir(paths.strideComponentsDir, { recursive: true });

    // Stack profile + dispatch plan + queue summary present.
    await fs.writeFile(paths.stackProfile, JSON.stringify({ primary_language: 'javascript' }), 'utf8');
    await fs.writeFile(paths.dispatchPlan, JSON.stringify({ run_id: 'r', auditors: {} }), 'utf8');
    await fs.writeFile(path.join(paths.verifierQueueDir, '_summary.json'), JSON.stringify({ queued: 3 }), 'utf8');

    // Two queued findings.
    await fs.writeFile(paths.verifierQueueItem('f-00001'),
      JSON.stringify({ id: 'f-00001', file_path: 'a.js', line: 1 }), 'utf8');
    await fs.writeFile(paths.verifierQueueItem('f-00002'),
      JSON.stringify({ id: 'f-00002', file_path: 'b.js' }), 'utf8');
    // Third id has queue file but missing result file → MISSING_VERIFIER_RESULT.
    await fs.writeFile(paths.verifierQueueItem('f-00003'),
      JSON.stringify({ id: 'f-00003' }), 'utf8');

    // Results: one CONFIRMED critical with exploit, one FALSE_POSITIVE with fp_rule, one missing.
    await fs.writeFile(paths.verifierResultItem('f-00001'),
      JSON.stringify({ verdict: 'CONFIRMED', confidence: 9, evidence: 'eek' }), 'utf8');
    await fs.writeFile(paths.verifierResultItem('f-00002'),
      JSON.stringify({ verdict: 'FALSE_POSITIVE', confidence: 1, fp_rule_matched: 'rule-A' }), 'utf8');

    await fs.writeFile(paths.exploitItem('f-00001'), 'EXPLOIT BODY', 'utf8');

    // Two STRIDE component files plus a non-md file (skipped).
    await fs.writeFile(path.join(paths.strideComponentsDir, 'api.md'), '# api');
    await fs.writeFile(path.join(paths.strideComponentsDir, 'worker.md'), '# worker');
    await fs.writeFile(path.join(paths.strideComponentsDir, 'README.txt'), 'skip');

    let report;
    const out = await captureStdout(async () => {
      report = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]);
    });
    ok(out.includes(`WROTE ${paths.reportInput}`));

    eq(report.verdict, 'CRITICAL');
    eq(report.counts.candidates, 3);
    eq(report.counts.confirmed, 1);
    eq(report.counts.false_positive, 1);
    eq(report.counts.needs_human, 0);
    eq(report.counts.fp_rule_breakdown, { 'rule-A': 1 });
    eq(report.counts.filtered_by_fp_rule, 1);
    eq(report.findings.length, 3);
    const missing = report.findings.find((f) => f.id === 'f-00003');
    eq(missing.status, 'MISSING_VERIFIER_RESULT');
    const confirmed = report.findings.find((f) => f.id === 'f-00001');
    eq(confirmed.exploit, 'EXPLOIT BODY');
    eq(confirmed.severity_bucket, 'critical-or-important');
    eq(report.stride_blocks.map((b) => b.component).sort(), ['api', 'worker']);

    // The on-disk file should equal the returned object.
    const onDisk = JSON.parse(await fs.readFile(paths.reportInput, 'utf8'));
    eq(onDisk, report);
  } finally { await cleanup(d); }
});

t('main verdict NEEDS ATTENTION when many confirmed-medium findings', async () => {
  const d = await tmp();
  try {
    const paths = runPaths('r', d);
    await fs.mkdir(paths.verifierQueueDir, { recursive: true });
    await fs.mkdir(paths.verifierResultsDir, { recursive: true });
    // 6 confirmed mediums (confidence 5–7).
    for (let i = 1; i <= 6; i++) {
      const id = `f-${String(i).padStart(5, '0')}`;
      await fs.writeFile(paths.verifierQueueItem(id), JSON.stringify({ id }), 'utf8');
      await fs.writeFile(paths.verifierResultItem(id),
        JSON.stringify({ verdict: 'CONFIRMED', confidence: 6 }), 'utf8');
    }
    let report;
    await captureStdout(async () => { report = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(report.verdict, 'NEEDS ATTENTION');
  } finally { await cleanup(d); }
});

t('main verdict NEEDS ATTENTION when many NEEDS_HUMAN', async () => {
  const d = await tmp();
  try {
    const paths = runPaths('r', d);
    await fs.mkdir(paths.verifierQueueDir, { recursive: true });
    await fs.mkdir(paths.verifierResultsDir, { recursive: true });
    for (let i = 1; i <= 4; i++) {
      const id = `f-${String(i).padStart(5, '0')}`;
      await fs.writeFile(paths.verifierQueueItem(id), JSON.stringify({ id }), 'utf8');
      await fs.writeFile(paths.verifierResultItem(id),
        JSON.stringify({ verdict: 'NEEDS_HUMAN' }), 'utf8');
    }
    let report;
    await captureStdout(async () => { report = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(report.verdict, 'NEEDS ATTENTION');
    eq(report.counts.needs_human, 4);
  } finally { await cleanup(d); }
});

t('main verdict HEALTHY when nothing serious', async () => {
  const d = await tmp();
  try {
    const paths = runPaths('r', d);
    await fs.mkdir(paths.verifierQueueDir, { recursive: true });
    await fs.mkdir(paths.verifierResultsDir, { recursive: true });
    // single false positive
    await fs.writeFile(paths.verifierQueueItem('f-00001'), JSON.stringify({ id: 'f-00001' }), 'utf8');
    await fs.writeFile(paths.verifierResultItem('f-00001'),
      JSON.stringify({ verdict: 'FALSE_POSITIVE' }), 'utf8');
    let report;
    await captureStdout(async () => { report = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(report.verdict, 'HEALTHY');
  } finally { await cleanup(d); }
});

t('main with no STRIDE dir leaves stride_blocks empty', async () => {
  const d = await tmp();
  try {
    const paths = runPaths('r', d);
    await fs.mkdir(paths.verifierQueueDir, { recursive: true });
    let report;
    await captureStdout(async () => { report = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(report.stride_blocks, []);
  } finally { await cleanup(d); }
});

t('main without --repo-root falls back to process.cwd in repo_root field', async () => {
  const d = await tmp();
  const prevCwd = process.cwd();
  try {
    process.chdir(d);
    const cwd = process.cwd(); // macOS may resolve the symlink-prefixed tmp path
    const paths = runPaths('r'); // uses cwd
    await fs.mkdir(paths.verifierQueueDir, { recursive: true });
    let report;
    await captureStdout(async () => { report = await main(['node', 'x', '--run-id', 'r']); });
    eq(report.repo_root, cwd);
  } finally {
    process.chdir(prevCwd);
    await cleanup(d);
  }
});

let pass = 0, fail = 0;
for (const T of tests) {
  try { await T.fn(); process.stdout.write(`PASS ${T.name}\n`); pass++; }
  catch (e) { process.stdout.write(`FAIL ${T.name}: ${e.stack || e.message}\n`); fail++; }
}
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
