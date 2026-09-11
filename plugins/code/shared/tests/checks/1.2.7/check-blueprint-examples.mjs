#!/usr/bin/env node
// G3: for each diagram type, `validate` and `deliver` the vendored example into
// a temp dir with --quality standard --json: exit 0, ok true, 0 errors, artifact
// exists. HOME is an empty temp dir so only files inside plugins/code are used.
//
// Usage: node check-blueprint-examples.mjs
// Exit 0 and print `blueprint-examples verification passed`; 1 on a failed assertion; 2 on misuse.
import fs from 'node:fs';
import path from 'node:path';
import { SKILL, TYPES, EXAMPLES, tmpDir, runBlueprint, report } from './_lib.mjs';

if (process.argv.length > 2) { console.error('usage: node check-blueprint-examples.mjs'); process.exit(2); }
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const parse = (r, label) => { try { return JSON.parse(r.stdout); } catch { failures.push(`${label}: stdout is not JSON: ${r.stdout.slice(0, 200)}${r.stderr.slice(0, 200)}`); return null; } };
const errorCount = (receipt) => {
  let n = 0;
  const visit = (v) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') {
      if (v.severity === 'error') n += 1;
      if (typeof v.errors === 'number') n += v.errors;
      for (const k of Object.keys(v)) if (k !== 'severity' && k !== 'errors') visit(v[k]);
    }
  };
  visit(receipt);
  return n;
};

const home = tmpDir('ddd-1.2.7-home-');
const out = tmpDir('ddd-1.2.7-examples-');
try {
  for (const t of TYPES) {
    const input = path.join(SKILL, 'examples', EXAMPLES[t]);
    check(fs.existsSync(input), `vendored example missing: ${input}`);
    const v = runBlueprint(['validate', t, input, '--quality', 'standard', '--json'], { home });
    check(v.status === 0, `validate ${t} exited ${v.status}: ${v.stderr.slice(0, 300)}`);
    const vr = parse(v, `validate ${t}`);
    if (vr) { check(vr.ok === true, `validate ${t}: ok=${vr.ok}`); check(errorCount(vr) === 0, `validate ${t}: ${errorCount(vr)} errors`); }

    const html = path.join(out, `${t}.html`);
    const d = runBlueprint(['deliver', t, input, html, '--quality', 'standard', '--json'], { home });
    check(d.status === 0, `deliver ${t} exited ${d.status}: ${d.stderr.slice(0, 300)}`);
    const dr = parse(d, `deliver ${t}`);
    if (dr) {
      check(dr.ok === true, `deliver ${t}: ok=${dr.ok}`);
      check(errorCount(dr) === 0, `deliver ${t}: ${errorCount(dr)} errors`);
      check(dr.output === html, `deliver ${t}: receipt output is ${dr.output}`);
      check(dr.artifact && /^[0-9a-f]{64}$/.test(dr.artifact.sha256 || "") && dr.artifact.bytes > 100000, `deliver ${t}: receipt has no artifact sha256/bytes`);
      check(dr.validation && dr.validation.errors === 0, `deliver ${t}: validation.errors=${dr.validation?.errors}`);
    }
    check(fs.existsSync(html) && fs.statSync(html).size > 100000, `deliver ${t}: no artifact at ${html}`);
  }
  check(fs.readdirSync(home).length === 0, 'the empty HOME was written to');
  const leftovers = fs.readdirSync(path.join(SKILL, 'examples')).filter((f) => !/\.(json|html)$/.test(f));
  check(leftovers.length === 0, `deliver left staging files in examples/: ${leftovers.join(', ')}`);
} finally {
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(out, { recursive: true, force: true });
}
report('blueprint-examples', failures);
