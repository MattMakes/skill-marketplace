#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseArgs, neutralDescription, main } from './queue-findings.js';
import { runPaths } from './lib/run-paths.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const tmp = async () => fs.mkdtemp(path.join(os.tmpdir(), 'queue-findings-spec-'));
const cleanup = async (d) => { try { await fs.rm(d, { recursive: true, force: true }); } catch {} };

const captureStdout = async (fn) => {
  const orig = process.stdout.write.bind(process.stdout);
  let buf = '';
  process.stdout.write = (s) => { buf += s; return true; };
  try { await fn(); } finally { process.stdout.write = orig; }
  return buf;
};

async function writeFindings(repoRoot, runId, agent, items) {
  const paths = runPaths(runId, repoRoot);
  const dir = path.join(paths.auditorsDir, agent);
  await fs.mkdir(dir, { recursive: true });
  const lines = items.map((x) => JSON.stringify(x)).join('\n');
  await fs.writeFile(path.join(dir, 'findings.jsonl'), lines + (lines ? '\n' : ''), 'utf8');
}

t('parseArgs reads --run-id and --repo-root', () => {
  eq(parseArgs(['node', 'x', '--run-id', 'r', '--repo-root', '/r']), { runId: 'r', repoRoot: '/r' });
});

t('parseArgs returns {} for empty argv', () => { eq(parseArgs(['node', 'x']), {}); });

t('neutralDescription falls back through one_line_description, description, subcategory, category, default', () => {
  eq(neutralDescription({ one_line_description: 'A' }), 'A');
  eq(neutralDescription({ description: 'B' }), 'B');
  eq(neutralDescription({ subcategory: 'C' }), 'C');
  eq(neutralDescription({ category: 'D' }), 'D');
  eq(neutralDescription({}), 'unspecified');
  // Empty strings fall through (truthy check is `||`).
  eq(neutralDescription({ one_line_description: '', description: 'D2' }), 'D2');
  // String() coerces non-strings.
  eq(neutralDescription({ category: 42 }), '42');
});

t('main throws when --run-id missing', async () => {
  let err = null;
  try { await main(['node', 'x']); } catch (e) { err = e; }
  ok(err && err.message === '--run-id required');
});

t('main throws when auditors dir does not exist', async () => {
  const d = await tmp();
  try {
    let err = null;
    try { await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); } catch (e) { err = e; }
    ok(err && err.message.includes('auditors dir does not exist'), err && err.message);
  } finally { await cleanup(d); }
});

t('main dedupes by fingerprint, writes one queue item per unique finding plus _summary.json', async () => {
  const d = await tmp();
  try {
    // Two findings in agent A with identical (category,file,description) → 1 fingerprint.
    // One distinct finding in agent B → 2 unique total.
    await writeFindings(d, 'r', 'owasp-auditor', [
      { category: 'sec/sqli', file: 'src/a.js', line: 10, one_line_description: 'SQL injection',
        fp_rules_to_check: ['rule-1'] },
      { category: 'sec/sqli', file: 'src/a.js', line: 12, one_line_description: 'SQL injection',
        fp_rules_to_check: ['rule-1'], cross_ref: 'secret-scanner' },
    ]);
    await writeFindings(d, 'r', 'secret-scanner', [
      { category: 'secret/aws-key', file: 'src/.env', description: 'AWS access key' },
    ]);
    // Also create a non-directory entry inside auditors/ to exercise `if (!e.isDirectory()) continue`.
    const paths = runPaths('r', d);
    await fs.writeFile(path.join(paths.auditorsDir, 'README.txt'), 'ignore me', 'utf8');

    let summary;
    const out = await captureStdout(async () => {
      summary = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]);
    });
    ok(out.includes('WROTE'));
    ok(out.includes('(2 findings)'), `expected 2 findings in stdout: ${out}`);

    eq(summary.run_id, 'r');
    eq(summary.total_findings_seen, 3);
    eq(summary.unique_fingerprints, 2);
    eq(summary.queued, 2);
    eq(summary.by_agent, { 'owasp-auditor': 2, 'secret-scanner': 1 });

    // Queue items written to disk.
    const queueFiles = (await fs.readdir(paths.verifierQueueDir)).sort();
    eq(queueFiles, ['_summary.json', 'f-00001.json', 'f-00002.json']);

    const item1 = JSON.parse(await fs.readFile(paths.verifierQueueItem('f-00001'), 'utf8'));
    eq(item1.id, 'f-00001');
    eq(item1.category, 'sec/sqli');
    eq(item1.file_path, 'src/a.js');
    eq(item1.line, 10);
    eq(item1.neutral_description, 'SQL injection');
    eq(item1._source_agent, 'owasp-auditor');
    eq(item1._fp_rules_to_check, ['rule-1']);
    eq(item1._cross_ref, null); // first occurrence had no cross_ref
    ok(typeof item1.fingerprint === 'string' && item1.fingerprint.length === 12);

    const item2 = JSON.parse(await fs.readFile(paths.verifierQueueItem('f-00002'), 'utf8'));
    eq(item2.category, 'secret/aws-key');
    eq(item2.file_path, 'src/.env');
    eq(item2.line, null); // line missing → null
    eq(item2._fp_rules_to_check, []); // missing → []
    eq(item2._cross_ref, null); // missing → null

    const summaryOnDisk = JSON.parse(await fs.readFile(path.join(paths.verifierQueueDir, '_summary.json'), 'utf8'));
    eq(summaryOnDisk, summary);
  } finally { await cleanup(d); }
});

t('main with empty auditors subdir produces zero queue items', async () => {
  const d = await tmp();
  try {
    const paths = runPaths('r', d);
    await fs.mkdir(path.join(paths.auditorsDir, 'empty-agent'), { recursive: true });
    await captureStdout(async () => main(['node', 'x', '--run-id', 'r', '--repo-root', d]));
    const summary = JSON.parse(await fs.readFile(path.join(paths.verifierQueueDir, '_summary.json'), 'utf8'));
    eq(summary.queued, 0);
    eq(summary.unique_fingerprints, 0);
    eq(summary.by_agent, { 'empty-agent': 0 });
  } finally { await cleanup(d); }
});

let pass = 0, fail = 0;
for (const T of tests) {
  try { await T.fn(); process.stdout.write(`PASS ${T.name}\n`); pass++; }
  catch (e) { process.stdout.write(`FAIL ${T.name}: ${e.stack || e.message}\n`); fail++; }
}
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
