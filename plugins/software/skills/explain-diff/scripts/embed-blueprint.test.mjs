import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { markedElements, decodeEntities } from './html.mjs';

const cli = fileURLToPath(new URL('./embed-blueprint.mjs', import.meta.url));
const marker = '<template data-blueprint="request"></template>';
const diagram = '<!DOCTYPE html><html><style>p{color:red}</style><body><p data-tts>Diagram only</p><script>window.label = "A & B < C";</script></body></html>';

function fixture(t, body = marker) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-blueprint-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const page = path.join(dir, 'explainer.html');
  const source = path.join(dir, 'diagram.html');
  fs.writeFileSync(page, '<!DOCTYPE html><html><body><p data-tts>Article prose</p>' + body + '</body></html>');
  fs.writeFileSync(source, diagram);
  return { page, source, run: () => spawnSync(process.execPath, [cli, page, 'request', source, 'A "request" & <response>'], { encoding: 'utf8' }) };
}

test('embeds the exact viewer in a portable, isolated frame and preserves article narration', t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const html = fs.readFileSync(f.page, 'utf8');
  const srcdoc = html.match(/\bsrcdoc="([^"]*)"/);
  assert.ok(srcdoc, 'viewer must be embedded, not linked to a sidecar');
  assert.equal(decodeEntities(srcdoc[1]), diagram);
  assert.match(html, /sandbox="allow-scripts allow-downloads"/);
  assert.doesNotMatch(html, /allow-same-origin/);
  assert.match(html, /title="A &quot;request&quot; &amp; &lt;response&gt;"/);
  assert.deepEqual(markedElements(html).map(e => e.inner), ['Article prose']);
  assert.equal(fs.readFileSync(f.source, 'utf8'), diagram);
  assert.ok(!html.includes(marker));
});

for (const [name, body] of [['missing', 'No slot'], ['duplicate', marker + marker]]) {
  test(`a ${name} slot leaves the explainer byte-identical`, t => {
    const f = fixture(t, body);
    const before = fs.readFileSync(f.page);
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exactly one/i);
    assert.deepEqual(fs.readFileSync(f.page), before);
  });
}

test('missing diagram leaves the explainer byte-identical', t => {
  const f = fixture(t);
  const before = fs.readFileSync(f.page);
  fs.unlinkSync(f.source);
  assert.notEqual(f.run().status, 0);
  assert.deepEqual(fs.readFileSync(f.page), before);
});
