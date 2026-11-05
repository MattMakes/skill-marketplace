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
  }
  return out;
}

export function critical(input) {
  return input.findings.filter((f) => f.result?.verdict === 'CONFIRMED' && (f.result.confidence ?? 0) >= 8);
}
export function important(input) {
  return input.findings.filter((f) => f.result?.verdict === 'CONFIRMED' && (f.result.confidence ?? 0) >= 5 && (f.result.confidence ?? 0) < 8);
}
export function minor(input) {
  return input.findings.filter((f) => f.result?.verdict === 'CONFIRMED' && (f.result.confidence ?? 0) < 5);
}
export function needsHuman(input) {
  return input.findings.filter((f) => f.result?.verdict === 'NEEDS_HUMAN');
}

export function findingHeader(f, idx) {
  const lineSuffix = f.queued?.line != null ? `:${f.queued.line}` : '';
  return `#### Finding #${idx} — ${f.queued?.neutral_description ?? '(no description)'}\n\n` +
    `- **File:** \`${f.queued?.file_path ?? 'unknown'}${lineSuffix}\`\n` +
    `- **Category:** ${f.queued?.category ?? 'unknown'}${f.queued?._cross_ref ? ` (cross-ref: ${f.queued._cross_ref})` : ''}\n` +
    `- **Confidence:** ${f.result?.confidence ?? '—'}/10\n` +
    `- **Source agent:** ${f.queued?._source_agent ?? 'unknown'}\n` +
    `- **Verifier evidence:** ${f.result?.evidence ?? '(not provided)'}\n`;
}

export function renderFinding(f, idx, includeExploit) {
  let block = findingHeader(f, idx);
  if (includeExploit && f.exploit) block += `\n${f.exploit}\n`;
  block += `\n---\n`;
  return block;
}

export function renderShortFinding(f, idx) {
  const lineSuffix = f.queued?.line != null ? `:${f.queued.line}` : '';
  return `#### Finding #${idx} — ${f.queued?.neutral_description ?? '(no description)'}\n\n` +
    `- **File:** \`${f.queued?.file_path ?? 'unknown'}${lineSuffix}\`\n` +
    `- **One-line:** ${f.result?.evidence ?? '(no evidence)'}\n\n---\n`;
}

export function renderFingerprints(input) {
  return input.findings.map((f) => {
    const sev = f.result?.verdict === 'CONFIRMED' ? (f.result.confidence >= 8 ? 'high' : f.result.confidence >= 5 ? 'medium' : 'low') : (f.result?.verdict ?? 'missing');
    return `${f.queued?.fingerprint ?? '------------'}  ${f.queued?.file_path ?? 'unknown'}  ${f.queued?.category ?? '?'}  ${sev}`;
  }).join('\n');
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (!args.runId) throw new Error('--run-id required');
  const paths = runPaths(args.runId, args.repoRoot);
  const input = JSON.parse(await fs.readFile(paths.reportInput, 'utf8'));

  const repoName = (args.repoRoot || process.cwd()).split('/').filter(Boolean).pop();
  const date = input.generated_at.slice(0, 10);
  const c = critical(input), imp = important(input), m = minor(input), nh = needsHuman(input);

  const top3 = [...c, ...imp].slice(0, 3).map((f) => `${f.queued?.neutral_description ?? '(unnamed)'} — \`${f.queued?.file_path ?? 'unknown'}\``);

  const lines = [];
  lines.push(`# Security Audit Report — ${repoName} — ${date}`);
  lines.push('');
  lines.push('## Executive summary');
  lines.push('');
  lines.push(`- **Verdict:** ${input.verdict}`);
  lines.push(`- **Findings:** ${input.counts.confirmed} confirmed (${c.length} critical, ${imp.length} important, ${m.length} minor), ${input.counts.needs_human} require manual review, ${input.counts.false_positive} filtered as false positive (out of ${input.counts.candidates} candidates)`);
  lines.push(`- **Top risks:**`);
  if (top3.length === 0) lines.push(`  - none surfaced`);
  else for (const r of top3) lines.push(`  - ${r}`);
  lines.push('');
  lines.push('## Findings by severity');
  lines.push('');
  lines.push('### Critical (must fix before next deploy)');
  lines.push('');
  if (c.length === 0) lines.push('_None._'); else c.forEach((f, i) => lines.push(renderFinding(f, i + 1, true)));
  lines.push('');
  lines.push('### Important (should fix this sprint)');
  lines.push('');
  if (imp.length === 0) lines.push('_None._'); else imp.forEach((f, i) => lines.push(renderFinding(f, c.length + i + 1, true)));
  lines.push('');
  lines.push('### Minor (defense in depth, plan into backlog)');
  lines.push('');
  if (m.length === 0) lines.push('_None._'); else m.forEach((f, i) => lines.push(renderShortFinding(f, c.length + imp.length + i + 1)));
  lines.push('');
  lines.push('## STRIDE threat model');
  lines.push('');
  if (input.stride_blocks.length === 0) lines.push('_No STRIDE blocks produced._');
  else for (const block of input.stride_blocks) {
    lines.push(`### Component: ${block.component}\n\n${block.content.trim()}\n`);
  }
  lines.push('');
  lines.push('## Manual review required');
  lines.push('');
  if (nh.length === 0) lines.push('_None._');
  else for (let i = 0; i < nh.length; i++) {
    const f = nh[i];
    lines.push(`- **${f.queued?.file_path ?? 'unknown'}${f.queued?.line ? ':' + f.queued.line : ''}** (${f.queued?.category}) — ${f.result?.evidence ?? '(no evidence)'}`);
  }
  lines.push('');
  lines.push('## False-positive filtering stats');
  lines.push('');
  lines.push('```');
  lines.push(`Candidate findings:    ${input.counts.candidates}`);
  lines.push(`Filtered by FP rule:   ${input.counts.filtered_by_fp_rule} (${Object.entries(input.counts.fp_rule_breakdown).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'})`);
  lines.push(`Verifier scored < 5:   ${m.length}`);
  lines.push(`Final reported:        ${c.length + imp.length + m.length}`);
  lines.push('```');
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push(`- Run ID: \`${input.run_id}\``);
  lines.push(`- Generated: ${input.generated_at}`);
  lines.push(`- Stack profile:`);
  lines.push(`  - Primary language: ${input.stack_profile?.primary_language ?? 'unknown'}`);
  lines.push(`  - Frameworks: ${(input.stack_profile?.frameworks ?? []).join(', ') || 'none'}`);
  lines.push(`  - LLM SDKs: ${(input.stack_profile?.llm_sdks_detected ?? []).join(', ') || 'none'}`);
  lines.push(`  - Deployment: ${(input.stack_profile?.deployment_targets ?? []).join(', ') || 'none'}`);
  lines.push(`  - Skill files: ${input.stack_profile?.skill_files_present ? input.stack_profile.skill_paths.join(', ') : 'none'}`);
  lines.push(`- Auditors run: ${Object.entries(input.dispatch_plan?.auditors ?? {}).filter(([, v]) => v.run).map(([k]) => k).join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Finding fingerprints (for cross-run diffing)');
  lines.push('');
  lines.push('```');
  lines.push(renderFingerprints(input));
  lines.push('```');
  lines.push('');

  await fs.writeFile(paths.report, lines.join('\n'), 'utf8');
  process.stdout.write(`WROTE ${paths.report}\n`);
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { process.stderr.write(`ERROR ${err.message}\n`); process.exit(1); });
}
