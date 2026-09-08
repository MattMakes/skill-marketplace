#!/usr/bin/env node
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runPaths } from './lib/run-paths.js';

export function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run-id') out.runId = argv[++i];
    else if (a === '--repo-root') out.repoRoot = argv[++i];
    else if (a === '--scan-user-skills') out.scanUserSkills = true;
  }
  return out;
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (!args.runId) throw new Error('--run-id required');
  const paths = runPaths(args.runId, args.repoRoot);
  const profile = JSON.parse(await fs.readFile(paths.stackProfile, 'utf8'));

  const isDocsOnly = profile.primary_language === 'none';
  const hasServerCode = !isDocsOnly && (
    profile.frameworks.length > 0 ||
    profile.deployment_targets.includes('docker') ||
    profile.deployment_targets.includes('kubernetes') ||
    profile.deployment_targets.includes('serverless')
  );

  const plan = {
    run_id: args.runId,
    auditors: {
      'owasp-auditor': { run: hasServerCode, reason: hasServerCode ? 'server code present' : 'skipped — no server surface' },
      'secret-scanner': { run: true, reason: 'always run' },
      'supply-chain-auditor': { run: profile.manifest_files.length > 0 || profile.ci_provider !== 'none', reason: profile.manifest_files.length > 0 ? 'manifests present' : (profile.ci_provider !== 'none' ? 'CI present' : 'skipped — no manifests or CI') },
      'llm-security': { run: profile.llm_sdks_present, reason: profile.llm_sdks_present ? `LLM SDK detected: ${profile.llm_sdks_detected.join(', ')}` : 'skipped — no LLM SDK' },
      'skill-supply-chain': { run: profile.skill_files_present, reason: profile.skill_files_present ? `skill files present in: ${profile.skill_paths.join(', ')}` : 'skipped — no skill files' },
      'stride-modeler': { run: hasServerCode || profile.skill_files_present, reason: 'always run when there is anything to model' },
    },
    flags: {
      scan_user_skills: Boolean(args.scanUserSkills),
    },
  };

  await fs.writeFile(paths.dispatchPlan, JSON.stringify(plan, null, 2) + '\n', 'utf8');
  process.stdout.write(`WROTE ${paths.dispatchPlan}\n`);
  return plan;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { process.stderr.write(`ERROR ${err.message}\n`); process.exit(1); });
}
