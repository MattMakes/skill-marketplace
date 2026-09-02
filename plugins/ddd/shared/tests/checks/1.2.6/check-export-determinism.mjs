#!/usr/bin/env node
// Gate check for leaf 1.2.6 G4.
//
//   node check-export-determinism.mjs <ddd-dir>
//
// For the given workspace and for the toolshare fixture (fixtures/toolshare/ddd),
// runs `ddd export blueprint <ddd-dir> --out <temp>` twice (two processes, two temp
// dirs) and requires the same file names with byte-identical contents, and no
// timestamp-shaped strings in any spec.
//
// Exit 2 on misuse, 1 on failure, 0 when it prints "export-determinism verification passed".
import fs from 'node:fs';
import path from 'node:path';
import { tmpDir, runExport, fileList, workspacesFor } from './_lib.mjs';

const argv = process.argv.slice(2);
if (argv.length !== 1 || argv[0].startsWith('-')) usage('exactly one <ddd-dir> is required');
if (!fs.existsSync(path.join(path.resolve(argv[0]), 'manifest.json'))) usage(`${argv[0]} has no manifest.json`);

function usage(msg) {
  process.stderr.write(`check-export-determinism: ${msg}\nusage: check-export-determinism.mjs <ddd-dir>\n`);
  process.exit(2);
}

const failures = [];
const fail = (m) => { failures.push(m); process.stderr.write(`FAIL ${m}\n`); };
const ok = (m) => process.stdout.write(`ok   ${m}\n`);

function checkWorkspace(dddDir) {
  process.stdout.write(`--- ${dddDir}\n`);
  const outs = [tmpDir(), tmpDir()];
  for (const out of outs) {
    const r = runExport(dddDir, ['--out', out]);
    if (r.status !== 0) fail(`run into ${out} exited ${r.status}: ${r.stderr.trim()}`);
  }
  const [a, b] = outs.map((o) => (fs.existsSync(o) ? fileList(o) : []));
  if (a.length && a.join(',') === b.join(',')) ok(`same ${a.length} file(s) both runs`);
  else fail(`file lists differ: [${a}] vs [${b}]`);
  for (const f of a) {
    const x = fs.readFileSync(path.join(outs[0], f));
    const y = fs.existsSync(path.join(outs[1], f)) ? fs.readFileSync(path.join(outs[1], f)) : Buffer.alloc(0);
    if (x.equals(y)) ok(`${f} byte-identical (${x.length} bytes)`);
    else fail(`${f} differs between runs`);
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(x.toString('utf8'))) fail(`${f} contains a timestamp`);
  }
}

for (const dddDir of workspacesFor(argv)) checkWorkspace(dddDir);

if (failures.length) {
  process.stderr.write(`export-determinism verification failed: ${failures.length} problem(s)\n`);
  process.exit(1);
}
process.stdout.write('export-determinism verification passed\n');
