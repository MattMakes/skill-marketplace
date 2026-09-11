// Shared bits for the 1.2.6 checks: paths, temp dirs, a workspace copy, and the
// expected counts derived straight from the step JSON (independently of the
// exporter, so a check cannot agree with a bug by construction).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SHARED = path.resolve(HERE, '..', '..', '..');
export const LIB = path.join(SHARED, 'lib');
export const BIN = path.join(SHARED, 'bin', 'ddd.mjs');
export const MEALKIT = path.join(SHARED, 'examples', 'mealkit', 'ddd');
// A realistic workspace (4 contexts in one deployable, 7 outside parties, 20
// cross-party messages, 3 flows): the step JSON of the toolshare smoke run.
export const TOOLSHARE = path.join(HERE, 'fixtures', 'toolshare', 'ddd');
// The plugin's own blueprint skill (<plugin>/skills/blueprint), located here
// independently of the exporter. BLUEPRINT_HOME overrides only when it is usable;
// no home directory is consulted.
export const BLUEPRINT_VENDORED = path.resolve(SHARED, '..', 'skills', 'blueprint');
const override = process.env.BLUEPRINT_HOME ? path.resolve(process.env.BLUEPRINT_HOME) : null;
export const BLUEPRINT_HOME = override && fs.existsSync(path.join(override, 'bin', 'blueprint.mjs')) ? override : BLUEPRINT_VENDORED;
export const BLUEPRINT_BIN = path.join(BLUEPRINT_HOME, 'bin', 'blueprint.mjs');

// process.env minus the named variables (spreading `{ X: undefined }` does not unset).
export function envWithout(keys, extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!keys.includes(k)) env[k] = v;
  return { ...env, ...extra };
}

export function tmpDir(prefix = 'ddd-1.2.6-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// A private copy of a workspace so no check writes into examples/**.
export function copyWorkspace(dddDir) {
  const dst = path.join(tmpDir(), 'ddd');
  fs.cpSync(dddDir, dst, { recursive: true });
  return dst;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Runs `ddd export blueprint` as a child so exit codes and stdout are the real ones.
// `env` replaces the whole environment when given (see envWithout).
export function runExport(dddDir, extra = [], env = null) {
  return spawnSync(process.execPath, [BIN, 'export', 'blueprint', dddDir, ...extra], {
    encoding: 'utf8',
    env: { ...(env || process.env), DDD_NO_RENDER: '1' },
  });
}

export function runBlueprint(args) {
  return spawnSync(process.execPath, [BLUEPRINT_BIN, ...args], { encoding: 'utf8', cwd: BLUEPRINT_HOME });
}

// What the export must contain, read from the step JSON directly.
export function expectedCounts(dddDir) {
  const load = (n, f) => {
    const file = path.join(dddDir, `${n}-${f}`, `${f}.json`);
    return fs.existsSync(file) ? readJson(file) : {};
  };
  const decompose = load('03', 'decompose');
  const connect = load('05', 'connect');
  const organise = load('06', 'organise');
  const discover = load('02', 'discover');
  const contexts = (decompose.bounded_contexts || []).map((c) => c.id);
  const deployables = (organise.deployables || []).filter((d) => (d.contexts || []).some((c) => contexts.includes(c)));
  const stores = deployables.filter((d) => d.data_store === 'own').length;
  const parties = new Set([
    ...contexts,
    ...(discover.actors || []).map((a) => a.id),
    ...(discover.external_systems || []).map((x) => x.id),
  ]);
  let connections = 0;
  const outsiders = new Set();
  for (const m of connect.messages || []) {
    for (const to of new Set(m.consumers || [])) {
      if (!m.producer || to === m.producer || !parties.has(m.producer) || !parties.has(to)) continue;
      connections += 1;
      for (const p of [m.producer, to]) if (!contexts.includes(p)) outsiders.add(p);
    }
  }
  const flows = (connect.flows || []).filter((f) => f && f.id && Array.isArray(f.steps) && f.steps.length);
  return {
    contexts: contexts.length,
    deployables: deployables.length,
    stores,
    outsiders: outsiders.size,
    components: contexts.length + stores + outsiders.size,
    connections,
    flows: flows.map((f) => ({ id: f.id, steps: f.steps.length })),
  };
}

// The workspaces a check runs on: the one(s) named on the command line plus the
// toolshare fixture, each once, in that order.
export function workspacesFor(dirs) {
  const out = [];
  for (const d of [...dirs.map((x) => path.resolve(x)), TOOLSHARE]) if (!out.includes(d)) out.push(d);
  return out;
}

export function fileList(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
}
