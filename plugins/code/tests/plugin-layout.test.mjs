import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const plugin = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(plugin, '../..');
const steps = ['understand', 'discover', 'decompose', 'strategize', 'connect', 'organise', 'define', 'code', 'contracts'];

test('code owns the DDD kickoff, all nine steps, and the single Blueprint renderer', () => {
  const kickoff = fs.readFileSync(path.join(plugin, 'skills/ddd/SKILL.md'), 'utf8');
  assert.match(kickoff, /^name: ddd$/m);
  assert.match(kickoff, /## Start here/);
  assert.match(kickoff, /code:ddd-understand/);
  for (const step of steps) {
    assert.ok(fs.existsSync(path.join(plugin, `skills/ddd-${step}/SKILL.md`)));
  }
  assert.ok(fs.existsSync(path.join(plugin, 'agents/ddd-decision-strategist.md')));
  assert.ok(fs.existsSync(path.join(plugin, 'skills/blueprint/bin/blueprint.mjs')));
  assert.ok(!fs.existsSync(path.join(repo, 'plugins/ddd')));
  const marketplace = JSON.parse(fs.readFileSync(path.join(repo, '.claude-plugin/marketplace.json')));
  assert.ok(!marketplace.plugins.some(p => p.name === 'ddd' || p.name === 'blueprint'));
  const entry = marketplace.plugins.find(p => p.name === 'code');
  assert.match(entry.description, /ddd/);
  assert.match(entry.description, /Blueprint/);
  assert.equal(entry.version, JSON.parse(fs.readFileSync(path.join(plugin, '.claude-plugin/plugin.json'))).version);
});

test('explain-diff uses Blueprint from its own plugin', () => {
  const reference = fs.readFileSync(path.join(plugin, 'skills/explain-diff/references/blueprint-diagrams.md'), 'utf8');
  assert.match(reference, /code:blueprint/);
  assert.match(reference, /\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/blueprint\/SKILL.md/);
  assert.doesNotMatch(reference, /ddd:blueprint|plugins\/ddd|ddd plugin/);
});

test('an isolated code installation can run DDD and deliver through its bundled Blueprint', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-plugin-layout-'));
  try {
    const installed = path.join(tmp, 'installed-code');
    fs.mkdirSync(installed);
    fs.cpSync(path.join(plugin, 'shared'), path.join(installed, 'shared'), { recursive: true });
    fs.cpSync(path.join(plugin, 'skills/blueprint'), path.join(installed, 'skills/blueprint'), { recursive: true });
    for (const step of steps) {
      fs.cpSync(path.join(plugin, `skills/ddd-${step}`), path.join(installed, `skills/ddd-${step}`), { recursive: true });
    }
    const workspace = path.join(tmp, 'ddd');
    fs.cpSync(path.join(installed, 'shared/examples/mealkit/ddd'), workspace, { recursive: true });
    const env = { ...process.env, DDD_NO_RENDER: '1' };
    delete env.BLUEPRINT_HOME;
    const run = args => spawnSync(process.execPath, [path.join(installed, 'shared/bin/ddd.mjs'), ...args], { env, encoding: 'utf8', timeout: 120000 });
    const help = run(['--help']);
    assert.equal(help.status, 0, help.stderr);
    const contracts = run(['contracts', 'check', workspace]);
    assert.equal(contracts.status, 0, contracts.stderr + contracts.stdout);
    const output = path.join(tmp, 'diagrams');
    const result = run(['export', 'blueprint', workspace, '--out', output, '--deliver']);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /sha256 [a-f0-9]{64}/);
    assert.ok(fs.statSync(path.join(output, 'final.html')).size > 1000);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
