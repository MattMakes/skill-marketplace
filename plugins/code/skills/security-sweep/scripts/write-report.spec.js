#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  parseArgs, critical, important, minor, needsHuman,
  findingHeader, renderFinding, renderShortFinding, renderFingerprints, main,
} from './write-report.js';
import { runPaths } from './lib/run-paths.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const tmp = async () => fs.mkdtemp(path.join(os.tmpdir(), 'write-report-spec-'));
const cleanup = async (d) => { try { await fs.rm(d, { recursive: true, force: true }); } catch {} };

const captureStdout = async (fn) => {
  const orig = process.stdout.write.bind(process.stdout);
  let buf = '';
  process.stdout.write = (s) => { buf += s; return true; };
  try { await fn(); } finally { process.stdout.write = orig; }
  return buf;
};

function mkFinding({ verdict, confidence, line, exploit, fp = 'abc123def456', file = 'src/x.js' } = {}) {
  return {
    queued: { fingerprint: fp, file_path: file, line, category: 'sec/foo',
      neutral_description: 'desc', _source_agent: 'agent', _cross_ref: null },
    result: { verdict, confidence, evidence: 'ev' },
    exploit,
  };
}

t('parseArgs reads --run-id and --repo-root', () => {
  eq(parseArgs(['node', 'x', '--run-id', 'r', '--repo-root', '/r']), { runId: 'r', repoRoot: '/r' });
});

t('parseArgs returns {} for empty argv', () => { eq(parseArgs(['node', 'x']), {}); });

t('critical/important/minor/needsHuman bucket findings by verdict + confidence', () => {
  const findings = [
    mkFinding({ verdict: 'CONFIRMED', confidence: 9 }),  // critical
    mkFinding({ verdict: 'CONFIRMED', confidence: 8 }),  // critical
    mkFinding({ verdict: 'CONFIRMED', confidence: 7 }),  // important
    mkFinding({ verdict: 'CONFIRMED', confidence: 5 }),  // important
    mkFinding({ verdict: 'CONFIRMED', confidence: 4 }),  // minor
    mkFinding({ verdict: 'CONFIRMED', confidence: 0 }),  // minor
    mkFinding({ verdict: 'CONFIRMED' }),                  // confidence ?? 0 → minor
    mkFinding({ verdict: 'NEEDS_HUMAN' }),                // needsHuman
    mkFinding({ verdict: 'FALSE_POSITIVE' }),             // none
  ];
  const input = { findings };
  eq(critical(input).length, 2);
  eq(important(input).length, 2);
  eq(minor(input).length, 3);
  eq(needsHuman(input).length, 1);
});

t('findingHeader formats id, file:line, category, confidence, agent, evidence', () => {
  const f = mkFinding({ verdict: 'CONFIRMED', confidence: 9, line: 42 });
  const h = findingHeader(f, 1);
  ok(h.includes('Finding #1 — desc'));
  ok(h.includes('`src/x.js:42`'));
  ok(h.includes('Category:** sec/foo'));
  ok(h.includes('Confidence:** 9/10'));
  ok(h.includes('Source agent:** agent'));
  ok(h.includes('Verifier evidence:** ev'));
});

t('findingHeader handles cross-ref, missing line, and missing fields gracefully', () => {
  const f = {
    queued: { file_path: 'p', category: 'cat', _cross_ref: 'secret-scanner' },
    result: {},
  };
  const h = findingHeader(f, 7);
  ok(h.includes('Finding #7 — (no description)'));
  ok(h.includes('`p`'));
  ok(h.includes('cross-ref: secret-scanner'));
  ok(h.includes('Confidence:** —/10'));
  ok(h.includes('Source agent:** unknown'));
  ok(h.includes('Verifier evidence:** (not provided)'));
});

t('findingHeader uses "unknown" for completely missing queued data', () => {
  const f = { queued: undefined, result: {} };
  const h = findingHeader(f, 1);
  ok(h.includes('`unknown`'));
  ok(h.includes('Category:** unknown'));
});

t('renderFinding includes exploit only when includeExploit && exploit truthy', () => {
  const withExploit = renderFinding(mkFinding({ verdict: 'CONFIRMED', confidence: 9, exploit: 'EX' }), 1, true);
  ok(withExploit.includes('EX'));
  ok(withExploit.endsWith('---\n'));

  const withoutFlag = renderFinding(mkFinding({ verdict: 'CONFIRMED', confidence: 9, exploit: 'EX' }), 1, false);
  ok(!withoutFlag.includes('EX'));

  const withoutExploit = renderFinding(mkFinding({ verdict: 'CONFIRMED', confidence: 9 }), 1, true);
  ok(!withoutExploit.includes('EX'));
});

t('renderShortFinding renders compact one-liner with file:line and evidence', () => {
  const out = renderShortFinding(mkFinding({ verdict: 'CONFIRMED', confidence: 4, line: 11 }), 3);
  ok(out.includes('Finding #3 — desc'));
  ok(out.includes('`src/x.js:11`'));
  ok(out.includes('One-line:** ev'));
  ok(out.endsWith('---\n'));

  // Missing file_path/line/evidence fall back to defaults.
  const out2 = renderShortFinding({ queued: undefined, result: undefined }, 1);
  ok(out2.includes('(no description)'));
  ok(out2.includes('`unknown`'));
  ok(out2.includes('(no evidence)'));
});

t('renderFingerprints maps verdicts to severity labels (high/medium/low/missing)', () => {
  const input = {
    findings: [
      mkFinding({ verdict: 'CONFIRMED', confidence: 9, fp: 'aaa', file: 'a' }),
      mkFinding({ verdict: 'CONFIRMED', confidence: 6, fp: 'bbb', file: 'b' }),
      mkFinding({ verdict: 'CONFIRMED', confidence: 1, fp: 'ccc', file: 'c' }),
      mkFinding({ verdict: 'NEEDS_HUMAN', fp: 'ddd', file: 'd' }),
      { queued: undefined, result: undefined }, // hits both `?? '------------'` and `?? 'missing'`
    ],
  };
  const lines = renderFingerprints(input).split('\n');
  ok(lines[0].includes('aaa') && lines[0].endsWith('high'));
  ok(lines[1].includes('bbb') && lines[1].endsWith('medium'));
  ok(lines[2].includes('ccc') && lines[2].endsWith('low'));
  ok(lines[3].includes('ddd') && lines[3].endsWith('NEEDS_HUMAN'));
  ok(lines[4].startsWith('------------') && lines[4].endsWith('missing'));
});

t('main throws when --run-id missing', async () => {
  let err = null;
  try { await main(['node', 'x']); } catch (e) { err = e; }
  ok(err && err.message === '--run-id required');
});

async function writeReportInput(d, runId, input) {
  const paths = runPaths(runId, d);
  await fs.mkdir(paths.root, { recursive: true });
  await fs.writeFile(paths.reportInput, JSON.stringify(input), 'utf8');
  return paths;
}

t('main writes a populated markdown report including critical/important/minor sections', async () => {
  const d = await tmp();
  try {
    const findings = [
      // critical
      { ...mkFinding({ verdict: 'CONFIRMED', confidence: 9, line: 1, exploit: 'EX1', fp: 'aaa', file: 'crit.js' }) },
      // important
      { ...mkFinding({ verdict: 'CONFIRMED', confidence: 6, line: 2, fp: 'bbb', file: 'imp.js' }) },
      // minor
      { ...mkFinding({ verdict: 'CONFIRMED', confidence: 3, fp: 'ccc', file: 'min.js' }) },
      // needs_human
      { ...mkFinding({ verdict: 'NEEDS_HUMAN', line: 99, fp: 'ddd', file: 'nh.js' }) },
    ];
    const input = {
      run_id: 'r',
      generated_at: '2026-05-15T00:00:00.000Z',
      verdict: 'CRITICAL',
      counts: { confirmed: 3, candidates: 5, needs_human: 1, false_positive: 1, filtered_by_fp_rule: 1, fp_rule_breakdown: { 'rule-A': 1 } },
      stack_profile: { primary_language: 'javascript', frameworks: ['express'], llm_sdks_detected: ['openai'], deployment_targets: ['docker'], skill_files_present: true, skill_paths: ['.claude/skills/'] },
      dispatch_plan: { auditors: { 'owasp-auditor': { run: true }, 'secret-scanner': { run: true }, 'llm-security': { run: false } } },
      stride_blocks: [{ component: 'api', content: '## STRIDE for api\n' }],
      findings,
    };
    const paths = await writeReportInput(d, 'r', input);
    let body;
    const out = await captureStdout(async () => { body = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(out.includes(`WROTE ${paths.report}`));

    ok(body.startsWith('# Security Audit Report — '));
    ok(body.includes('Verdict:** CRITICAL'));
    ok(body.includes('1 critical, 1 important, 1 minor'));
    ok(body.includes('### Critical (must fix before next deploy)'));
    ok(body.includes('EX1')); // exploit included for critical
    ok(body.includes('### Important (should fix this sprint)'));
    ok(body.includes('### Minor (defense in depth, plan into backlog)'));
    ok(body.includes('### Component: api'));
    ok(body.includes('## Manual review required'));
    ok(body.includes('nh.js:99'));
    ok(body.includes('Filtered by FP rule:   1 (rule-A=1)'));
    ok(body.includes('Final reported:        3'));
    ok(body.includes('Run ID: `r`'));
    ok(body.includes('Frameworks: express'));
    ok(body.includes('LLM SDKs: openai'));
    ok(body.includes('Deployment: docker'));
    ok(body.includes('Skill files: .claude/skills/'));
    ok(body.includes('Auditors run: owasp-auditor, secret-scanner'));

    // File on disk matches.
    eq(await fs.readFile(paths.report, 'utf8'), body);
  } finally { await cleanup(d); }
});

t('main renders fallback "_None._" sections and "none surfaced" when there are no findings', async () => {
  const d = await tmp();
  try {
    const input = {
      run_id: 'r2',
      generated_at: '2026-05-15T00:00:00.000Z',
      verdict: 'HEALTHY',
      counts: { confirmed: 0, candidates: 0, needs_human: 0, false_positive: 0, filtered_by_fp_rule: 0, fp_rule_breakdown: {} },
      stack_profile: null, // exercises the `?? 'unknown'` and `?? []` fallbacks
      dispatch_plan: null, // exercises the `?? {}` fallback
      stride_blocks: [],
      findings: [],
    };
    await writeReportInput(d, 'r2', input);
    let body;
    await captureStdout(async () => { body = await main(['node', 'x', '--run-id', 'r2', '--repo-root', d]); });
    ok(body.includes('none surfaced'));
    ok(body.includes('### Critical (must fix before next deploy)\n\n_None._'));
    ok(body.includes('### Important (should fix this sprint)\n\n_None._'));
    ok(body.includes('### Minor (defense in depth, plan into backlog)\n\n_None._'));
    ok(body.includes('_No STRIDE blocks produced._'));
    ok(body.includes('## Manual review required\n\n_None._'));
    ok(body.includes('Filtered by FP rule:   0 (none)'));
    ok(body.includes('Primary language: unknown'));
    ok(body.includes('Frameworks: none'));
    ok(body.includes('LLM SDKs: none'));
    ok(body.includes('Deployment: none'));
    ok(body.includes('Skill files: none'));
    ok(body.includes('Auditors run: none'));
  } finally { await cleanup(d); }
});

t('main without --repo-root falls back to process.cwd for repoName', async () => {
  const d = await tmp();
  const prevCwd = process.cwd();
  try {
    process.chdir(d);
    const input = {
      run_id: 'r', generated_at: '2026-05-15T00:00:00.000Z', verdict: 'HEALTHY',
      counts: { confirmed: 0, candidates: 0, needs_human: 0, false_positive: 0, filtered_by_fp_rule: 0, fp_rule_breakdown: {} },
      stack_profile: {}, dispatch_plan: {}, stride_blocks: [], findings: [],
    };
    const paths = runPaths('r');
    await fs.mkdir(paths.root, { recursive: true });
    await fs.writeFile(paths.reportInput, JSON.stringify(input), 'utf8');
    let body;
    await captureStdout(async () => { body = await main(['node', 'x', '--run-id', 'r']); });
    const cwdName = process.cwd().split('/').filter(Boolean).pop();
    ok(body.includes(`# Security Audit Report — ${cwdName}`));
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
