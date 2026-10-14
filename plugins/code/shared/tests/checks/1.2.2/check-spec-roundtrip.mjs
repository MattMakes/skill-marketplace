#!/usr/bin/env node
// Gate check for leaf 1.2.2 (G3): every spec the mealkit workspace yields,
// written to disk as JSON and read back, renders the byte-identical SVG,
// and the decision renderer accepts a written spec as an option diagram
// (that file format is the option-diagram format). Also converts the two
// blueprint shapes and checks they round-trip through our spec the same way.
//
//   node check-spec-roundtrip.mjs [<ddd-dir>]
//
// Exit 2 on misuse, 1 on failure, 0 when it prints "spec-roundtrip verification passed".

import fs from 'node:fs';
import path from 'node:path';
import { HERE, LIB, tmpDir, decisionCopy } from './_fixtures.mjs';

const argv = process.argv.slice(2);
if (argv.some((a) => a.startsWith('-'))) {
  process.stderr.write('usage: check-spec-roundtrip.mjs [<ddd-dir>]\n');
  process.exit(2);
}
const dddDir = argv[0] || path.resolve(HERE, '../../../examples/mealkit/ddd');
if (!fs.existsSync(path.join(dddDir, 'manifest.json'))) {
  process.stderr.write(`check-spec-roundtrip: ${dddDir} has no manifest.json\n`);
  process.exit(2);
}

const failures = [];
const fail = (m) => { failures.push(m); process.stderr.write(`FAIL ${m}\n`); };
const ok = (m) => process.stdout.write(`ok   ${m}\n`);

const { loadWorkspace } = await import(path.join(LIB, 'workspace.mjs'));
const diagrams = await import(path.join(LIB, 'render/diagrams/index.mjs'));
const decision = await import(path.join(LIB, 'render/diagrams/decision.mjs'));

const ws = loadWorkspace(dddDir);
const out = tmpDir('ddd-roundtrip-');
const specs = diagrams.specs(ws);
if (!specs.length) fail('no specs produced');
for (const spec of specs) {
  const g = diagrams.generatorFor(spec.id);
  const file = path.join(out, `${spec.id}.json`);
  fs.writeFileSync(file, `${JSON.stringify(spec, null, 2)}\n`);
  const back = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (back.format !== 'ddd-diagram-spec' || back.version !== 1) fail(`${spec.id}: spec lacks format/version`);
  if (JSON.stringify(back) !== JSON.stringify(spec)) fail(`${spec.id}: spec changed through JSON (undefined or non-JSON values in it)`);
  const a = await g.module.svg(spec, {});
  const b = await g.module.svg(back, {});
  if (a.svg !== b.svg) {
    fail(`${spec.id}: SVG from the read-back spec differs (${a.svg.length} vs ${b.svg.length} bytes)`);
  } else ok(`${spec.id}: ${a.svg.length} bytes identical after write/read`);
  // The same spec rendered as an option diagram, through decision.mjs.
  const conv = decision.toSpec(back, { id: `decision-X-${spec.id}` });
  if (conv.origin !== spec.id) fail(`${spec.id}: toSpec lost the origin id`);
  const c = await decision.optionSvg({ dddDir: out, manifest: { ddd_dir: out } }, { id: 'X' }, { id: spec.id, diagram: file });
  if (!c.svg || !new RegExp(`data-diagram="decision-[a-z]+-X-${spec.id}"`).test(c.svg)) fail(`${spec.id}: optionSvg did not render the written spec (${c.note})`);
}

// Blueprint shapes: convert, write, read back, identical bytes.
const { dddDir: decDir } = await decisionCopy(dddDir);
const dws = loadWorkspace(decDir);
const found = decision.findDecision(dws, 'D1');
if (!found) fail('decision fixture has no D1');
else {
  for (const opt of found.decision.options) {
    const first = await decision.optionSvg(dws, found.decision, opt);
    if (!opt.diagram) {
      if (first.svg) fail(`${opt.id}: rendered a diagram for an option without one`);
      continue;
    }
    if (!first.svg) { fail(`${opt.id}: no svg (${first.note})`); continue; }
    const file = path.join(out, `D1-${opt.id}.spec.json`);
    fs.writeFileSync(file, `${JSON.stringify(first.spec, null, 2)}\n`);
    const again = await decision.optionSvg(dws, found.decision, { ...opt, diagram: file });
    if (again.svg !== first.svg) fail(`${opt.id}: converted spec written and read back renders differently`);
    else ok(`D1 option ${opt.id} (${path.basename(opt.diagram)}): ${first.svg.length} bytes identical via our spec`);
  }
  const whole1 = await decision.decisionSvg(dws, found.step, found.decision);
  const whole2 = await decision.decisionSvg(dws, found.step, found.decision);
  if (whole1.svg !== whole2.svg) fail('decision render is not deterministic');
  else ok(`decision D1: ${whole1.svg.length} bytes, deterministic`);
}
fs.rmSync(out, { recursive: true, force: true });
fs.rmSync(path.dirname(decDir), { recursive: true, force: true });

if (failures.length) {
  process.stderr.write(`${failures.length} failure(s)\n`);
  process.exit(1);
}
process.stdout.write('spec-roundtrip verification passed\n');
