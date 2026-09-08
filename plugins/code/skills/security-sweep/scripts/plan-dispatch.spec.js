#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parseArgs, main } from './plan-dispatch.js';
import { runPaths } from './lib/run-paths.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const tmp = async () => fs.mkdtemp(path.join(os.tmpdir(), 'plan-dispatch-spec-'));
const cleanup = async (d) => { try { await fs.rm(d, { recursive: true, force: true }); } catch {} };

const captureStdout = async (fn) => {
  const orig = process.stdout.write.bind(process.stdout);
  let buf = '';
  process.stdout.write = (s) => { buf += s; return true; };
  try { await fn(); } finally { process.stdout.write = orig; }
  return buf;
};

async function withProfile(repoRoot, runId, profile) {
  const paths = runPaths(runId, repoRoot);
  await fs.mkdir(paths.root, { recursive: true });
  await fs.writeFile(paths.stackProfile, JSON.stringify(profile), 'utf8');
  return paths;
}

t('parseArgs reads --run-id, --repo-root and --scan-user-skills', () => {
  const a = parseArgs(['node', 'x', '--run-id', 'r1', '--repo-root', '/tmp/x', '--scan-user-skills']);
  eq(a, { runId: 'r1', repoRoot: '/tmp/x', scanUserSkills: true });
});

t('parseArgs ignores unknown flags', () => {
  const a = parseArgs(['node', 'x', '--what', 'huh']);
  eq(a, {});
});

t('main throws when --run-id missing', async () => {
  let err = null;
  try { await main(['node', 'x']); } catch (e) { err = e; }
  ok(err && err.message === '--run-id required', `unexpected: ${err && err.message}`);
});

t('docs-only repo: only secret-scanner runs; stride skipped without skills', async () => {
  const d = await tmp();
  try {
    const paths = await withProfile(d, 'r', {
      primary_language: 'none',
      frameworks: [],
      manifest_files: [],
      ci_provider: 'none',
      llm_sdks_present: false,
      llm_sdks_detected: [],
      skill_files_present: false,
      skill_paths: [],
      deployment_targets: [],
    });
    let plan;
    const out = await captureStdout(async () => {
      plan = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]);
    });
    ok(out.includes(`WROTE ${paths.dispatchPlan}`), out);
    eq(plan.run_id, 'r');
    eq(plan.auditors['owasp-auditor'].run, false);
    eq(plan.auditors['owasp-auditor'].reason, 'skipped — no server surface');
    eq(plan.auditors['secret-scanner'].run, true);
    eq(plan.auditors['supply-chain-auditor'].run, false);
    eq(plan.auditors['supply-chain-auditor'].reason, 'skipped — no manifests or CI');
    eq(plan.auditors['llm-security'].run, false);
    eq(plan.auditors['llm-security'].reason, 'skipped — no LLM SDK');
    eq(plan.auditors['skill-supply-chain'].run, false);
    eq(plan.auditors['stride-modeler'].run, false);
    eq(plan.flags.scan_user_skills, false);
    // Verify file written matches returned plan.
    const onDisk = JSON.parse(await fs.readFile(paths.dispatchPlan, 'utf8'));
    eq(onDisk, plan);
  } finally { await cleanup(d); }
});

t('server code via frameworks: owasp + stride run; supply-chain via manifests', async () => {
  const d = await tmp();
  try {
    await withProfile(d, 'r', {
      primary_language: 'javascript',
      frameworks: ['express'],
      manifest_files: ['package.json'],
      ci_provider: 'none',
      llm_sdks_present: true,
      llm_sdks_detected: ['openai@^4'],
      skill_files_present: false,
      skill_paths: [],
      deployment_targets: [],
    });
    await captureStdout(async () => main(['node', 'x', '--run-id', 'r', '--repo-root', d, '--scan-user-skills']));
    const plan = JSON.parse(await fs.readFile(runPaths('r', d).dispatchPlan, 'utf8'));
    eq(plan.auditors['owasp-auditor'].run, true);
    eq(plan.auditors['owasp-auditor'].reason, 'server code present');
    eq(plan.auditors['supply-chain-auditor'].run, true);
    eq(plan.auditors['supply-chain-auditor'].reason, 'manifests present');
    eq(plan.auditors['llm-security'].run, true);
    ok(plan.auditors['llm-security'].reason.includes('openai@^4'));
    eq(plan.auditors['stride-modeler'].run, true);
    eq(plan.flags.scan_user_skills, true);
  } finally { await cleanup(d); }
});

t('docker deployment counts as server surface even with no frameworks', async () => {
  const d = await tmp();
  try {
    await withProfile(d, 'r', {
      primary_language: 'go',
      frameworks: [],
      manifest_files: [],
      ci_provider: 'none',
      llm_sdks_present: false,
      llm_sdks_detected: [],
      skill_files_present: false,
      skill_paths: [],
      deployment_targets: ['docker'],
    });
    await captureStdout(async () => main(['node', 'x', '--run-id', 'r', '--repo-root', d]));
    const plan = JSON.parse(await fs.readFile(runPaths('r', d).dispatchPlan, 'utf8'));
    eq(plan.auditors['owasp-auditor'].run, true);
    eq(plan.auditors['stride-modeler'].run, true);
  } finally { await cleanup(d); }
});

t('kubernetes-only deployment counts as server surface', async () => {
  const d = await tmp();
  try {
    await withProfile(d, 'r', {
      primary_language: 'python', frameworks: [], manifest_files: [],
      ci_provider: 'none', llm_sdks_present: false, llm_sdks_detected: [],
      skill_files_present: false, skill_paths: [], deployment_targets: ['kubernetes'],
    });
    await captureStdout(async () => main(['node', 'x', '--run-id', 'r', '--repo-root', d]));
    const plan = JSON.parse(await fs.readFile(runPaths('r', d).dispatchPlan, 'utf8'));
    eq(plan.auditors['owasp-auditor'].run, true);
  } finally { await cleanup(d); }
});

t('serverless deployment counts as server surface', async () => {
  const d = await tmp();
  try {
    await withProfile(d, 'r', {
      primary_language: 'python', frameworks: [], manifest_files: [],
      ci_provider: 'none', llm_sdks_present: false, llm_sdks_detected: [],
      skill_files_present: false, skill_paths: [], deployment_targets: ['serverless'],
    });
    await captureStdout(async () => main(['node', 'x', '--run-id', 'r', '--repo-root', d]));
    const plan = JSON.parse(await fs.readFile(runPaths('r', d).dispatchPlan, 'utf8'));
    eq(plan.auditors['owasp-auditor'].run, true);
  } finally { await cleanup(d); }
});

t('CI present but no manifests still triggers supply-chain', async () => {
  const d = await tmp();
  try {
    await withProfile(d, 'r', {
      primary_language: 'none', frameworks: [], manifest_files: [],
      ci_provider: 'github_actions', llm_sdks_present: false, llm_sdks_detected: [],
      skill_files_present: false, skill_paths: [], deployment_targets: [],
    });
    await captureStdout(async () => main(['node', 'x', '--run-id', 'r', '--repo-root', d]));
    const plan = JSON.parse(await fs.readFile(runPaths('r', d).dispatchPlan, 'utf8'));
    eq(plan.auditors['supply-chain-auditor'].run, true);
    eq(plan.auditors['supply-chain-auditor'].reason, 'CI present');
  } finally { await cleanup(d); }
});

t('skill files present trigger skill-supply-chain and stride', async () => {
  const d = await tmp();
  try {
    await withProfile(d, 'r', {
      primary_language: 'none', frameworks: [], manifest_files: [],
      ci_provider: 'none', llm_sdks_present: false, llm_sdks_detected: [],
      skill_files_present: true, skill_paths: ['.claude/skills/'],
      deployment_targets: [],
    });
    await captureStdout(async () => main(['node', 'x', '--run-id', 'r', '--repo-root', d]));
    const plan = JSON.parse(await fs.readFile(runPaths('r', d).dispatchPlan, 'utf8'));
    eq(plan.auditors['skill-supply-chain'].run, true);
    ok(plan.auditors['skill-supply-chain'].reason.includes('.claude/skills/'));
    eq(plan.auditors['stride-modeler'].run, true);
  } finally { await cleanup(d); }
});

let pass = 0, fail = 0;
for (const T of tests) {
  try { await T.fn(); process.stdout.write(`PASS ${T.name}\n`); pass++; }
  catch (e) { process.stdout.write(`FAIL ${T.name}: ${e.stack || e.message}\n`); fail++; }
}
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
