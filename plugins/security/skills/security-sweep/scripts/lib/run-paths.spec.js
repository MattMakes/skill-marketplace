#!/usr/bin/env node
import path from 'node:path';
import { newRunId, runPaths } from './run-paths.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };

t('newRunId with explicit Date strips ms and replaces : and . with -', () => {
  const id = newRunId(new Date('2026-01-02T03:04:05.678Z'));
  eq(id, '2026-01-02T03-04-05Z');
});

t('newRunId default arg returns a string matching the expected pattern', () => {
  const id = newRunId();
  ok(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/.test(id), `unexpected format: ${id}`);
});

t('runPaths returns root anchored at default cwd when repoRoot omitted', () => {
  const p = runPaths('run-1');
  eq(p.runId, 'run-1');
  eq(p.repoRoot, process.cwd());
  eq(p.root, path.join(process.cwd(), 'ai_docs/security-sweep/runs/run-1'));
});

t('runPaths uses explicit repoRoot', () => {
  const p = runPaths('run-2', '/tmp/repo');
  eq(p.repoRoot, '/tmp/repo');
  eq(p.root, '/tmp/repo/ai_docs/security-sweep/runs/run-2');
  eq(p.stackProfile, '/tmp/repo/ai_docs/security-sweep/runs/run-2/00-stack-profile.json');
  eq(p.dispatchPlan, '/tmp/repo/ai_docs/security-sweep/runs/run-2/01-dispatch-plan.json');
  eq(p.auditorsDir, '/tmp/repo/ai_docs/security-sweep/runs/run-2/02-auditors');
  eq(p.auditorStatus, '/tmp/repo/ai_docs/security-sweep/runs/run-2/02-auditors/status.json');
  eq(p.strideDir, '/tmp/repo/ai_docs/security-sweep/runs/run-2/03-stride');
  eq(p.strideComponentsDir, '/tmp/repo/ai_docs/security-sweep/runs/run-2/03-stride/components');
  eq(p.strideStatus, '/tmp/repo/ai_docs/security-sweep/runs/run-2/03-stride/status.json');
  eq(p.verifierQueueDir, '/tmp/repo/ai_docs/security-sweep/runs/run-2/04-verifier-queue');
  eq(p.verifierResultsDir, '/tmp/repo/ai_docs/security-sweep/runs/run-2/05-verifier-results');
  eq(p.exploitsDir, '/tmp/repo/ai_docs/security-sweep/runs/run-2/06-exploits');
  eq(p.reportInput, '/tmp/repo/ai_docs/security-sweep/runs/run-2/07-report-input.json');
  eq(p.report, '/tmp/repo/ai_docs/security-sweep/runs/run-2/08-cso-report.md');
  eq(p.meta, '/tmp/repo/ai_docs/security-sweep/runs/run-2/meta.json');
  eq(p.agentLogsDir, '/tmp/repo/ai_docs/security-sweep/runs/run-2/agent-logs');
});

t('auditorFindings builds nested path including agent name', () => {
  const p = runPaths('r', '/repo');
  eq(p.auditorFindings('owasp-auditor'), '/repo/ai_docs/security-sweep/runs/r/02-auditors/owasp-auditor/findings.jsonl');
});

t('verifierQueueItem and verifierResultItem build per-id paths', () => {
  const p = runPaths('r', '/repo');
  eq(p.verifierQueueItem('f-00001'), '/repo/ai_docs/security-sweep/runs/r/04-verifier-queue/f-00001.json');
  eq(p.verifierResultItem('f-00002'), '/repo/ai_docs/security-sweep/runs/r/05-verifier-results/f-00002.json');
});

t('exploitItem builds .md path per id', () => {
  const p = runPaths('r', '/repo');
  eq(p.exploitItem('f-00003'), '/repo/ai_docs/security-sweep/runs/r/06-exploits/f-00003.md');
});

let pass = 0, fail = 0;
for (const T of tests) {
  try { await T.fn(); process.stdout.write(`PASS ${T.name}\n`); pass++; }
  catch (e) { process.stdout.write(`FAIL ${T.name}: ${e.stack || e.message}\n`); fail++; }
}
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
