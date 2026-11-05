import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const skill = fileURLToPath(new URL('../../skills/blueprint/', import.meta.url));

test('rendered diagrams carry valid offline font bytes and their license', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprint-fonts-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'diagram.html');
  const result = spawnSync(process.execPath, [path.join(skill, 'bin/blueprint.mjs'), 'render', 'architecture', path.join(skill, 'examples/web-app.architecture.json'), output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const html = fs.readFileSync(output, 'utf8');
  assert.ok(!/<link[^>]+https:\/\/fonts\./.test(html), 'font loading must work offline');
  const fonts = [...html.matchAll(/url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g)];
  assert.equal(fonts.length, 6);
  for (const [, data] of fonts) assert.equal(Buffer.from(data, 'base64').subarray(0, 4).toString(), 'wOF2');
  assert.match(html, /SIL OPEN FONT LICENSE Version 1\.1/);
});
