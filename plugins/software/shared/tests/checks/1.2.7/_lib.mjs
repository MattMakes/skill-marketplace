// Shared bits for the 1.2.7 checks: the vendored blueprint skill's paths, an
// empty HOME so nothing can reach ~/.claude/skills/archify, and a runner.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PLUGIN = path.resolve(HERE, '..', '..', '..', '..');
export const SKILL = path.join(PLUGIN, 'skills', 'blueprint');
export const BIN = path.join(SKILL, 'bin', 'blueprint.mjs');
export const TYPES = ['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle'];
// One vendored example per type (the same list doctor and scripts/render-examples.mjs use).
export const EXAMPLES = {
  architecture: 'web-app.architecture.json',
  workflow: 'agent-tool-call.workflow.json',
  sequence: 'cache-miss-request.sequence.json',
  dataflow: 'product-analytics.dataflow.json',
  lifecycle: 'agent-run.lifecycle.json',
};

export function tmpDir(prefix = 'ddd-1.2.7-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Runs the blueprint CLI with HOME pointed at an empty directory and every
// BLUEPRINT_* / ARCHIFY_* variable stripped, so a pass proves the skill is
// self-contained.
export function runBlueprint(args, { home, cwd } = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(BLUEPRINT_|ARCHIFY_)/.test(k)) continue;
    env[k] = v;
  }
  env.HOME = home;
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', env, cwd: cwd || PLUGIN, timeout: 300000 });
}

export function report(name, failures) {
  if (failures.length) {
    for (const f of failures) process.stderr.write(`FAIL ${f}\n`);
    process.exit(1);
  }
  console.log(`${name} verification passed`);
}
