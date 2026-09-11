// Fixtures shared by the 1.2.2 checks: a temp copy of a workspace cut down
// to its first N steps, a synthetic large workspace (N contexts, ~40
// relationships, 40+ events) and a temp workspace with one decision whose
// options cover all three option-diagram formats. Nothing here writes into
// the example workspace itself.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LIB = path.resolve(HERE, '../../../lib');

export function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Copies <dddDir> into a temp folder and keeps only the step folders whose
// number is <= keep (manifest and glossary stay). Returns the new ddd dir.
export function truncatedCopy(dddDir, keep) {
  const root = tmpDir('ddd-trunc-');
  const dest = path.join(root, 'ddd');
  fs.cpSync(dddDir, dest, { recursive: true });
  for (const name of fs.readdirSync(dest)) {
    const m = /^(\d\d)-/.exec(name);
    if (m && Number(m[1]) > keep) fs.rmSync(path.join(dest, name), { recursive: true, force: true });
  }
  const manifestPath = path.join(dest, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.ddd_dir = 'ddd';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return dest;
}

// A workspace object (not on disk) with `n` contexts and about 40
// relationships, plus discover with 40+ events, organise with 3 teams and
// interactions, so the big-graph paths of every generator get exercised.
export function syntheticWorkspace(n = 15) {
  const ids = Array.from({ length: n }, (_, i) => `ctx-${String(i + 1).padStart(2, '0')}`);
  const patterns = ['customer-supplier', 'published-language', 'conformist', 'anticorruption-layer', 'shared-kernel', 'open-host-service', 'partnership'];
  const relationships = [];
  let k = 0;
  // A ring plus chords: every context has a neighbour, and the chords make
  // the layered layout work for its money.
  for (let i = 0; i < n && relationships.length < 40; i += 1) {
    const a = ids[i];
    const b = ids[(i + 1) % n];
    relationships.push({ id: `R${++k}`, upstream: a, downstream: b, pattern: patterns[k % patterns.length], description: `${a} feeds ${b}` });
  }
  for (let step = 2; relationships.length < 40; step += 1) {
    for (let i = 0; i < n && relationships.length < 40; i += 1) {
      const a = ids[i];
      const b = ids[(i + step) % n];
      if (a === b) continue;
      relationships.push({ id: `R${++k}`, upstream: a, downstream: b, pattern: patterns[k % patterns.length], description: `${a} to ${b}` });
    }
  }
  relationships.push({ id: `R${++k}`, upstream: ids[0], downstream: 'payments-provider', pattern: 'anticorruption-layer', description: 'external' });
  const bounded_contexts = ids.map((id, i) => ({ id, name: `Context ${i + 1}`, subdomains: [id], owns_events: [], owns_commands: [`cmd-${id}`], owns_aggregates: [] }));
  const subdomains = ids.map((id, i) => ({ id, name: `Subdomain ${i + 1}` }));
  const phases = ['discover', 'plan', 'execute', 'settle'].map((id, i) => ({ id, name: id[0].toUpperCase() + id.slice(1), order: i + 1 }));
  const events = [];
  const commands = [];
  const policies = [];
  const actors = [{ id: 'clerk', name: 'Clerk' }, { id: 'customer', name: 'Customer' }];
  for (let i = 0; i < 44; i += 1) {
    const phase = phases[Math.min(phases.length - 1, Math.floor(i / 11))].id;
    const eid = `event-${String(i + 1).padStart(2, '0')}`;
    const cid = `command-${String(i + 1).padStart(2, '0')}`;
    commands.push({ id: cid, name: `Do the thing number ${i + 1}`, actor: i % 3 === 0 ? 'customer' : i % 3 === 1 ? 'clerk' : null, produces: [eid] });
    events.push({ id: eid, name: `Thing ${i + 1} Happened In The Domain`, phase, sequence: (i + 1) * 10, actor: i % 3 === 2 ? 'payments-provider' : null, triggered_by: cid, pivotal: i % 11 === 10, data: ['id'] });
    if (i % 4 === 3) policies.push({ id: `policy-${i}`, name: `Whenever thing ${i} happened, do the thing number ${i + 2}`, when: `event-${String(i).padStart(2, '0')}`, then: [`command-${String(i + 2).padStart(2, '0')}`], kind: 'automatic' });
  }
  const teams = [
    { id: 'team-a', name: 'Team Alpha', type: 'stream-aligned', size: 5, owns_contexts: ids.slice(0, 5) },
    { id: 'team-b', name: 'Team Beta', type: 'stream-aligned', size: 4, owns_contexts: ids.slice(5, 10) },
    { id: 'team-p', name: 'Platform', type: 'platform', size: 3, owns_contexts: ids.slice(10) },
  ];
  const deployables = [];
  for (let i = 0; i < n; i += 3) {
    deployables.push({ id: `dep-${i / 3 + 1}`, name: `Deployable ${i / 3 + 1}`, kind: i % 2 ? 'service' : 'modular-monolith', contexts: ids.slice(i, i + 3), team: i < 5 ? 'team-a' : i < 10 ? 'team-b' : 'team-p', data_store: i % 2 ? 'own' : 'shared' });
  }
  const interactions = [
    { from: 'team-a', to: 'team-p', mode: 'x-as-a-service' },
    { from: 'team-b', to: 'team-p', mode: 'x-as-a-service' },
    { from: 'team-a', to: 'team-b', mode: 'collaboration' },
  ];
  const classifications = ids.map((id, i) => ({ subdomain: id, type: i % 5 === 0 ? 'core' : i % 5 === 1 ? 'generic' : 'supporting', business_differentiation: (i * 7) % 11, model_complexity: (i * 3) % 11, sourcing: i % 5 === 1 ? 'buy' : 'build', implementation_pattern: 'domain-model', investment: i % 5 === 0 ? 'high' : i % 2 ? 'low' : 'medium' }));
  const flowSteps = ids.slice(0, 8).map((id, i) => ({ seq: i + 1, from: i === 0 ? 'customer' : ids[i - 1], to: id, message: `msg-${i + 1}`, kind: i % 2 ? 'event' : 'command', sync: i % 2 === 0, via: i % 2 ? 'message-bus' : 'http' }));
  flowSteps.push({ seq: 9, from: ids[7], to: ids[7], message: 'msg-self', kind: 'command', sync: true, via: 'in-process' });
  const messages = flowSteps.map((s) => ({ id: s.message, kind: s.kind, name: `Message ${s.seq}` }));
  return {
    dddDir: '/nonexistent/synthetic/ddd',
    manifest: { project: 'synthetic', title: 'Synthetic workspace', ddd_dir: 'ddd' },
    steps: {
      understand: { system: { name: 'Synthetic system', one_liner: `${n} contexts, ${relationships.length} relationships` }, actors },
      discover: { actors, external_systems: [{ id: 'payments-provider', name: 'Payments provider' }], phases, events, commands, policies, read_models: [], pivotal_events: [], hotspots: [{ id: 'H1', text: 'Unclear', near: 'event-05', kind: 'unclear' }] },
      decompose: { subdomains, bounded_contexts, relationships },
      strategize: { classifications, bets: [] },
      connect: { flows: [{ id: 'F1', name: 'Long flow', steps: flowSteps }], messages },
      organise: { teams, deployables, interactions, topology_style: 'many-services' },
      define: { canvases: ids.slice(0, 3).map((id) => ({ context: id, inbound: [{ collaborator: 'customer', messages: [{ id: 'msg-1', kind: 'command' }] }], outbound: [{ collaborator: 'payments-provider', messages: [{ id: 'msg-x', kind: 'command' }] }] })) },
      code: { contexts: [{ context: ids[0], implementation_pattern: 'domain-model', aggregates: [{ id: 'agg-1', name: 'Aggregate One', root_entity: 'One', invariants: ['a', 'b'], commands: ['command-01', 'command-02'], events: ['event-01'] }, { id: 'agg-2', name: 'Aggregate Two', root_entity: 'Two', invariants: [], commands: ['command-03'], events: ['event-02', 'event-03'] }], ports: [{ name: 'Commands', kind: 'driving' }, { name: 'Repo', kind: 'driven' }, { name: 'Publisher', kind: 'driven' }] }] },
    },
    files: {},
    problems: [],
    schemas: {},
    glossary: null,
    index: new Map(),
  };
}

// A temp copy of <dddDir> with one decision D1 on decompose whose three
// options carry, in turn, a ddd-diagram-spec, a blueprint architecture
// spec and a blueprint sequence spec. Returns { dddDir, Did, files }.
export async function decisionCopy(dddDir) {
  const root = tmpDir('ddd-decision-');
  const dest = path.join(root, 'ddd');
  fs.cpSync(dddDir, dest, { recursive: true });
  const manifestPath = path.join(dest, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.ddd_dir = 'ddd';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const { loadWorkspace } = await import(path.join(LIB, 'workspace.mjs'));
  const contextMap = await import(path.join(LIB, 'render/diagrams/context-map.mjs'));
  const ws = loadWorkspace(dest);
  const decDir = path.join(dest, '03-decompose', 'decisions');
  fs.mkdirSync(decDir, { recursive: true });
  const ours = contextMap.spec(ws);
  ours.title = 'Option A · keep billing separate';
  fs.writeFileSync(path.join(decDir, 'D1-A.context-map.json'), `${JSON.stringify(ours, null, 2)}\n`);
  const archi = {
    schema_version: 1,
    diagram_type: 'architecture',
    meta: { title: 'Option B · billing folded into subscriptions' },
    components: [
      { id: 'subscriber', type: 'external', label: 'Subscriber' },
      { id: 'subscriptions', type: 'backend', label: 'Subscriptions + billing', sublabel: 'one module' },
      { id: 'fulfilment', type: 'backend', label: 'Fulfilment' },
      { id: 'stripe', type: 'external', label: 'Stripe' },
      { id: 'db', type: 'database', label: 'PostgreSQL' },
    ],
    connections: [
      { id: 'c1', from: 'subscriber', to: 'subscriptions', label: 'choose meals' },
      { id: 'c2', from: 'subscriptions', to: 'stripe', label: 'charge card' },
      { id: 'c3', from: 'subscriptions', to: 'fulfilment', label: 'week charged', variant: 'async' },
      { id: 'c4', from: 'subscriptions', to: 'db', label: 'reads/writes', variant: 'return' },
    ],
    boundaries: [{ id: 'app', label: 'Meal-kit app', type: 'deployable', members: ['subscriptions', 'db'] }],
  };
  fs.writeFileSync(path.join(decDir, 'D1-B.architecture.json'), `${JSON.stringify(archi, null, 2)}\n`);
  const seq = {
    schema_version: 1,
    diagram_type: 'sequence',
    meta: { title: 'Option C · charge synchronously in the request' },
    participants: [
      { id: 'subscriber', type: 'external', label: 'Subscriber' },
      { id: 'subscriptions', type: 'backend', label: 'Subscriptions' },
      { id: 'stripe', type: 'cloud', label: 'Stripe' },
      { id: 'fulfilment', type: 'backend', label: 'Fulfilment' },
    ],
    messages: [
      { from: 'subscriber', to: 'subscriptions', y: 100, label: 'choose meals' },
      { from: 'subscriptions', to: 'stripe', y: 140, label: 'charge card' },
      { from: 'stripe', to: 'subscriptions', y: 180, label: 'charged', variant: 'return' },
      { from: 'subscriptions', to: 'fulfilment', y: 220, label: 'week charged', variant: 'async' },
      { from: 'subscriptions', to: 'subscriber', y: 260, label: '200 OK', variant: 'return' },
    ],
  };
  fs.writeFileSync(path.join(decDir, 'D1-C.sequence.json'), `${JSON.stringify(seq, null, 2)}\n`);
  const decomposePath = path.join(dest, '03-decompose', 'decompose.json');
  const decompose = JSON.parse(fs.readFileSync(decomposePath, 'utf8'));
  decompose.decisions = [{
    id: 'D1',
    question: 'Does billing stay its own bounded context?',
    kind: 'boundary',
    options: [
      { id: 'A', summary: 'Keep billing as its own context wrapping Stripe behind an ACL.', pros: ['Stripe vocabulary stays out of subscriptions', 'Swap providers without touching the core'], cons: ['One more module for one person'], risks: ['Thin context that only forwards'], diagram: 'ddd/03-decompose/decisions/D1-A.context-map.json' },
      { id: 'B', summary: 'Fold billing into subscriptions as a payment policy.', pros: ['Fewer moving parts'], cons: ['Stripe types leak into the core model', 'Retries and declines live beside menu choice'], risks: [], diagram: 'ddd/03-decompose/decisions/D1-B.architecture.json' },
      { id: 'C', summary: 'Charge synchronously inside the choose-meals request.', pros: ['Simplest happy path'], cons: ['Card latency on the hot path', 'A Stripe outage blocks menu choice'], risks: ['Timeouts double-charge without idempotency'], diagram: 'ddd/03-decompose/decisions/D1-C.sequence.json' },
      { id: 'D', summary: 'Defer: decide once payment failures are modelled.', pros: [], cons: ['Blocks strategize'], risks: [] },
    ],
    chosen: 'A',
    confidence: 'medium',
    rationale: 'Billing wraps a bought capability; keeping it apart keeps Stripe vocabulary out of the core and makes the ACL a fitness test.',
    would_flip_if: ['Payment rules turn out to depend on menu choice state', 'A second payment provider never materialises within a year'],
    made_by: 'strategist',
  }];
  fs.writeFileSync(decomposePath, `${JSON.stringify(decompose, null, 2)}\n`);
  return { dddDir: dest, Did: 'D1' };
}
