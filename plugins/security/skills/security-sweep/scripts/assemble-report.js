#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPaths } from './lib/run-paths.js';

export function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run-id') out.runId = argv[++i];
    else if (a === '--repo-root') out.repoRoot = argv[++i];
  }
  return out;
}

export async function readJsonSafe(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return null; }
}

export async function listIds(dir, suffix = '.json') {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir);
  return entries.filter((n) => n.startsWith('f-') && n.endsWith(suffix)).map((n) => n.slice(0, -suffix.length)).sort();
}

export function severityFromConfidence(verifierResult) {
  if (verifierResult.verdict !== 'CONFIRMED') return null;
  const c = verifierResult.confidence ?? 0;
  if (c >= 8) return 'critical-or-important';
  if (c >= 5) return 'minor';
  return null;
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (!args.runId) throw new Error('--run-id required');
  const paths = runPaths(args.runId, args.repoRoot);

  const profile = await readJsonSafe(paths.stackProfile);
  const plan = await readJsonSafe(paths.dispatchPlan);
  const queueSummary = await readJsonSafe(path.join(paths.verifierQueueDir, '_summary.json'));

  const queuedIds = await listIds(paths.verifierQueueDir);
  const findings = [];
  let confirmedCount = 0, falsePositiveCount = 0, needsHumanCount = 0;
  const fpRuleCounts = {};

  for (const id of queuedIds) {
    const queued = await readJsonSafe(paths.verifierQueueItem(id));
    const result = await readJsonSafe(paths.verifierResultItem(id));
    if (!result) {
      findings.push({ id, queued, result: null, exploit: null, status: 'MISSING_VERIFIER_RESULT' });
      continue;
    }
    if (result.verdict === 'CONFIRMED') confirmedCount += 1;
    else if (result.verdict === 'FALSE_POSITIVE') falsePositiveCount += 1;
    else if (result.verdict === 'NEEDS_HUMAN') needsHumanCount += 1;
    if (result.fp_rule_matched) {
      fpRuleCounts[result.fp_rule_matched] = (fpRuleCounts[result.fp_rule_matched] ?? 0) + 1;
    }

    let exploit = null;
    const exploitPath = paths.exploitItem(id);
    if (existsSync(exploitPath)) exploit = await fs.readFile(exploitPath, 'utf8');

    findings.push({ id, queued, result, exploit, severity_bucket: severityFromConfidence(result) });
  }

  const strideBlocks = [];
  if (existsSync(paths.strideComponentsDir)) {
    const componentFiles = await fs.readdir(paths.strideComponentsDir);
    for (const f of componentFiles.sort()) {
      if (!f.endsWith('.md')) continue;
      const text = await fs.readFile(path.join(paths.strideComponentsDir, f), 'utf8');
      strideBlocks.push({ component: f.replace(/\.md$/, ''), content: text });
    }
  }

  const verdict = (() => {
    const critical = findings.filter((x) => x.result?.verdict === 'CONFIRMED' && (x.result.confidence ?? 0) >= 8);
    if (critical.length > 0) return 'CRITICAL';
    if (findings.filter((x) => x.result?.verdict === 'CONFIRMED' && (x.result.confidence ?? 0) >= 5).length > 5) return 'NEEDS ATTENTION';
    if (needsHumanCount > 3) return 'NEEDS ATTENTION';
    return 'HEALTHY';
  })();

  const reportInput = {
    run_id: args.runId,
    generated_at: new Date().toISOString(),
    repo_root: args.repoRoot || process.cwd(),
    stack_profile: profile,
    dispatch_plan: plan,
    queue_summary: queueSummary,
    verdict,
    counts: {
      candidates: queuedIds.length,
      confirmed: confirmedCount,
      false_positive: falsePositiveCount,
      needs_human: needsHumanCount,
      filtered_by_fp_rule: Object.values(fpRuleCounts).reduce((a, b) => a + b, 0),
      fp_rule_breakdown: fpRuleCounts,
    },
    findings,
    stride_blocks: strideBlocks,
  };

  await fs.writeFile(paths.reportInput, JSON.stringify(reportInput, null, 2) + '\n', 'utf8');
  process.stdout.write(`WROTE ${paths.reportInput}\n`);
  return reportInput;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { process.stderr.write(`ERROR ${err.message}\n`); process.exit(1); });
}
