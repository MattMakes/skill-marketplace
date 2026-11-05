#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPaths } from './lib/run-paths.js';
import { readJsonl } from './lib/jsonl.js';
import { fingerprint } from './lib/fingerprint.js';

export function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run-id') out.runId = argv[++i];
    else if (a === '--repo-root') out.repoRoot = argv[++i];
  }
  return out;
}

export function neutralDescription(finding) {
  return String(finding.one_line_description || finding.description || finding.subcategory || finding.category || 'unspecified');
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (!args.runId) throw new Error('--run-id required');
  const paths = runPaths(args.runId, args.repoRoot);

  if (!existsSync(paths.auditorsDir)) {
    throw new Error(`auditors dir does not exist: ${paths.auditorsDir}`);
  }

  const agentDirs = await fs.readdir(paths.auditorsDir, { withFileTypes: true });
  const allFindings = [];
  for (const e of agentDirs) {
    if (!e.isDirectory()) continue;
    const findingsFile = path.join(paths.auditorsDir, e.name, 'findings.jsonl');
    const items = await readJsonl(findingsFile);
    for (const item of items) allFindings.push({ ...item, _source_agent: e.name });
  }

  const byFingerprint = new Map();
  for (const f of allFindings) {
    const fp = fingerprint({ category: f.category, file: f.file, title: neutralDescription(f) });
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, { fingerprint: fp, ...f });
  }

  await fs.mkdir(paths.verifierQueueDir, { recursive: true });
  const sorted = [...byFingerprint.values()];
  let i = 0;
  for (const f of sorted) {
    i += 1;
    const id = `f-${String(i).padStart(5, '0')}`;
    const queueItem = {
      id,
      fingerprint: f.fingerprint,
      file_path: f.file ?? null,
      line: f.line ?? null,
      category: f.category,
      neutral_description: neutralDescription(f),
      _source_agent: f._source_agent,
      _fp_rules_to_check: f.fp_rules_to_check ?? [],
      _cross_ref: f.cross_ref ?? null,
    };
    await fs.writeFile(paths.verifierQueueItem(id), JSON.stringify(queueItem, null, 2) + '\n', 'utf8');
  }

  const summary = {
    run_id: args.runId,
    total_findings_seen: allFindings.length,
    unique_fingerprints: byFingerprint.size,
    queued: i,
    by_agent: agentDirs.filter((e) => e.isDirectory()).reduce((acc, e) => {
      acc[e.name] = allFindings.filter((f) => f._source_agent === e.name).length;
      return acc;
    }, {}),
  };
  await fs.writeFile(path.join(paths.verifierQueueDir, '_summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(`WROTE ${paths.verifierQueueDir} (${i} findings)\n`);
  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { process.stderr.write(`ERROR ${err.message}\n`); process.exit(1); });
}
