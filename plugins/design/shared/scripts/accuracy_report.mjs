#!/usr/bin/env node
/**
 * ACCURACY REPORT — one command, all-or-nothing, pointed at YOUR work.
 *
 * Upstream this script gated the kit's own examples from the kit's root. Installed
 * as a plugin that is the wrong target: the work to measure lives in the project,
 * and the kit's examples pass whether or not the project's screens do. This
 * version runs the same objective gates against the paths you name.
 *
 * "100%" means: of the checks that CAN be measured objectively, every one passes.
 * It does NOT claim subjective visual or brand fidelity (no tool can); it claims
 * token-consistency, theme resolution, WCAG contrast from a real headless render
 * in light and dark, state-aware contrast, axe, keyboard, target size, overflow,
 * reduced motion, and the two house rules.
 *
 * Usage:
 *   node accuracy_report.mjs <file.html|dir> [...]
 *        [--tokens <design-tokens.json|dir>]   token set to validate (aliases + contrast)
 *        [--theme <theme.css>]...              theme the code must resolve against
 *        [--src <dir|file>]...                 source to lint for hardcodes (default: the targets)
 *        [--no-dark]                           skip the dark-theme render passes
 *
 * Exit 0 only if every check passes. Exit 2 when there is nothing to measure.
 * Render gates run with DS_REQUIRE_BROWSER=1, so a missing browser FAILS here
 * instead of printing SKIPPED.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReceipt } from './gate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

function takeAll(flag) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && argv[i + 1]) { out.push(argv[i + 1]); argv.splice(i, 2); i--; }
  }
  return out;
}

const tokens = takeAll('--tokens');
const themes = takeAll('--theme');
const srcs = takeAll('--src');
const noDark = argv.includes('--no-dark');
const targets = argv.filter(a => !a.startsWith('--'));

if (!targets.length && !tokens.length) {
  console.log('Usage: node accuracy_report.mjs <file.html|dir> [...] [--tokens <file|dir>] [--theme <css>]... [--src <path>]... [--no-dark]');
  console.log('ERROR: no target given. A gate with nothing to measure is not a pass.');
  process.exit(2);
}
const missing = [...targets, ...tokens, ...themes, ...srcs].filter(p => !existsSync(p));
if (missing.length) {
  console.log(`ERROR: path(s) not found: ${missing.join(', ')}`);
  console.log('Nothing was measured. This is not a pass - check the path and run it again.');
  process.exit(2);
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
function htmlUnder(p) {
  if (statSync(p).isFile()) return /\.html?$/.test(p) ? [p] : [];
  const out = [];
  for (const e of readdirSync(p)) {
    if (SKIP.has(e)) continue;
    out.push(...htmlUnder(join(p, e)));
  }
  return out;
}
const html = [...new Set(targets.flatMap(htmlUnder))];

const node = (script, ...args) => ['node', [join(HERE, script), ...args]];
const py = (script, ...args) => ['python3', [join(HERE, script), ...args]];

/** [label, [cmd, args], files measured] */
const checks = [];

for (const t of tokens) {
  checks.push([`Token JSON valid + aliases resolve — ${t}`, py('validate_tokens.py', t), [t]]);
  // validate_contrast reads one DTCG file: a single design-tokens.json, or the
  // colors.json of a split token directory.
  const colors = statSync(t).isDirectory() ? join(t, 'colors.json') : t;
  if (existsSync(colors)) {
    checks.push([`WCAG contrast, token pairs light + dark — ${colors}`, py('validate_contrast.py', colors), [colors]]);
  } else {
    console.log(`NOTE  ${t} has no colors.json, so token-pair contrast was not measured.`);
  }
}

const lintTargets = srcs.length ? srcs : targets;
if (lintTargets.length) {
  checks.push(['No hardcoded hex/px/ms/Tailwind palette/font', py('lint_hardcodes.py', ...lintTargets), lintTargets]);
  checks.push(['No native <select> (house rule)', py('lint_native_select.py', ...lintTargets), lintTargets]);
  checks.push(['No emoji in UI output', py('check_no_emoji.py', ...lintTargets), lintTargets]);
  if (themes.length) {
    checks.push(['Every var(--...) resolves to the theme',
      py('validate_theme_refs.py', ...themes.flatMap(t => ['--theme', t]), ...lintTargets), [...themes, ...lintTargets]]);
  }
}

for (const f of html) {
  const modes = noDark ? [[]] : [[], ['--dark']];
  for (const m of modes) {
    const tag = m.length ? 'dark' : 'light';
    checks.push([`Real-render WCAG, every text element (${tag}) — ${f}`, node('measure_render.mjs', ...m, f), [f]]);
    checks.push([`State-aware WCAG, default/hover/focus (${tag}) — ${f}`, node('verify_states.mjs', f, ...m), [f]]);
    checks.push([`axe-core WCAG 2.2 A/AA (${tag}) — ${f}`, node('axe_audit.mjs', f, ...m), [f]]);
    checks.push([`Slop tells, no HIGH tell (${tag}) — ${f}`, node('slop_tells.mjs', '--strict', ...m, f), [f]]);
  }
  checks.push([`Keyboard: reachable, operable, composite arrow keys — ${f}`, node('verify_keyboard.mjs', f), [f]]);
  checks.push([`Target size >= 24x24 (WCAG 2.5.8) — ${f}`, node('verify_target_size.mjs', f), [f]]);
  checks.push([`Responsive: no horizontal overflow at 280/320/414 — ${f}`, node('verify_responsive.mjs', f), [f]]);
  checks.push([`Mobile-first: base layer fits 320px with queries removed — ${f}`, node('verify_mobile_first.mjs', f), [f]]);
  checks.push([`No clipped text or overlapping controls — ${f}`, node('verify_overflow.mjs', f), [f]]);
  checks.push([`Reduced motion honoured, no content lost — ${f}`, node('verify_reduced_motion.mjs', f), [f]]);
  checks.push([`Declared ARIA state changes on a real click — ${f}`, node('verify_interactive.mjs', f), [f]]);
  checks.push([`Token by intent: destructive never wears primary — ${f}`, node('lint_intent.mjs', f), [f]]);
}

if (!checks.length) {
  console.log('ERROR: the targets contain nothing these gates can measure (no .html, no tokens, no source).');
  process.exit(2);
}

let pass = 0;
const failed = [];
for (const [label, [cmd, args], files] of checks) {
  const started = new Date().toISOString();
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    env: { ...process.env, DS_REQUIRE_BROWSER: '1' },
  });
  const ok = r.status === 0;
  writeReceipt({ gate: label, args, exit: r.status, files, at: started });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (ok) { pass++; continue; }
  failed.push(label);
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-12);
  for (const line of out) console.log(`        ${line}`);
}

console.log('');
console.log(`${pass}/${checks.length} checks passed`);
if (failed.length) {
  console.log('Not done. Fix the cause of each FAIL above and run this again; do not suppress a check.');
}
console.log('Scope: objective correctness only. Taste is not scored here; run /design:critique for that.');
process.exit(failed.length ? 1 : 0);
