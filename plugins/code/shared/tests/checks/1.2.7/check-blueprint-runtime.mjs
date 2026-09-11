#!/usr/bin/env node
// G1: `blueprint doctor` reports ready and `demo` plus one `render` per diagram
// type write HTML into a temp dir, with HOME pointed at an empty temp dir (so
// nothing outside plugins/code/skills/blueprint is reachable).
//
// Usage: node check-blueprint-runtime.mjs
// Exit 0 and print `blueprint-runtime verification passed`; 1 on a failed assertion; 2 on misuse.
import fs from 'node:fs';
import path from 'node:path';
import { BIN, SKILL, TYPES, EXAMPLES, tmpDir, runBlueprint, report } from './_lib.mjs';

if (process.argv.length > 2) { console.error('usage: node check-blueprint-runtime.mjs'); process.exit(2); }
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
if (!fs.existsSync(BIN)) { console.error(`FAIL ${BIN} is missing`); process.exit(1); }

const home = tmpDir('ddd-1.2.7-home-');
const out = tmpDir('ddd-1.2.7-out-');
try {
  const doctor = runBlueprint(['doctor'], { home });
  check(doctor.status === 0, `doctor exited ${doctor.status}: ${doctor.stderr}`);
  check(/^Blueprint doctor/m.test(doctor.stdout), 'doctor banner does not say Blueprint');
  check(/Blueprint is ready\./.test(doctor.stdout), `doctor did not report ready:\n${doctor.stdout}${doctor.stderr}`);
  check(!/\[(missing|invalid)\]/.test(doctor.stdout), `doctor reported a missing or invalid file:\n${doctor.stdout}`);
  check(!/archify/i.test(doctor.stdout + doctor.stderr), 'doctor output mentions archify');
  for (const t of TYPES) check(new RegExp(`\\[ok\\] ${t} renderer, schema, and example`).test(doctor.stdout), `doctor has no ok line for ${t}`);

  const demoDir = path.join(out, 'demo');
  const demo = runBlueprint(['demo', demoDir], { home });
  check(demo.status === 0, `demo exited ${demo.status}: ${demo.stderr}`);
  const demoHtml = path.join(demoDir, 'blueprint-demo.html');
  check(fs.existsSync(demoHtml), 'demo did not write blueprint-demo.html');
  check(!fs.existsSync(path.join(demoDir, 'archify-demo.html')), 'demo still writes archify-demo.html');
  check(demo.stdout.includes('blueprint render architecture'), 'demo next-step hint does not say blueprint');

  // demo only renders architecture; render every type explicitly.
  for (const t of TYPES) {
    const html = path.join(out, `${t}.html`);
    const r = runBlueprint(['render', t, path.join(SKILL, 'examples', EXAMPLES[t]), html], { home });
    check(r.status === 0, `render ${t} exited ${r.status}: ${r.stderr}`);
    check(fs.existsSync(html) && fs.statSync(html).size > 100000, `render ${t} wrote no artifact`);
    if (fs.existsSync(html)) {
      const body = fs.readFileSync(html, 'utf8');
      const stray = body.split("\n").filter((l) => /archify/i.test(l) && !/renamed copy of archify/.test(l));
      check(stray.length === 0, `rendered ${t} HTML says archify outside a provenance comment: ${stray[0]}`);
      check(/var Blueprint = \{\};/.test(body), `rendered ${t} HTML has no Blueprint viewer runtime global`);
      check(/<meta name="generator" content="blueprint/.test(body), `rendered ${t} HTML generator meta does not say blueprint`);
    }
  }
  check(fs.readdirSync(home).length === 0, `the empty HOME was written to: ${fs.readdirSync(home).join(', ')}`);
} finally {
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(out, { recursive: true, force: true });
}
report('blueprint-runtime', failures);
