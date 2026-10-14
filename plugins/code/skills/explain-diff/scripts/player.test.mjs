import test from 'node:test';
import assert from 'node:assert/strict';
import { playerBlock, inject, BEGIN } from './player.mjs';

test('cue and engine strings cannot close the inline player script', () => {
  const hostile = '</script><script>window.injected=true</script>\u2028\u2029';
  const cues = [{ id: hostile, index: 0, start: 0, end: 1 }];
  const block = playerBlock({ cues, engine: hostile, duration: 1, src: 'data:audio/mpeg;base64,AAAA' });
  assert.equal((block.match(/<script>/g) || []).length, 1);
  assert.equal((block.match(/<\/script>/g) || []).length, 1);
  const payload = block.match(/var DATA = (.*);/)[1];
  assert.ok(!/[<\u2028\u2029]/.test(payload));
  assert.deepEqual(JSON.parse(payload), { cues, duration: 1, engine: hostile });
});

test('replacing a player preserves the embedded diagram and includes audio only once', () => {
  const iframe = '<iframe sandbox="allow-scripts allow-downloads" srcdoc="&lt;p data-tts&gt;Diagram&lt;/p&gt;"></iframe>';
  const page = '<html><body><p data-tts>Article prose for narration.</p>' + iframe + '</body></html>';
  const block = playerBlock({ cues: [{ id: 's0', index: 0, start: 0, end: 1 }], src: 'data:audio/mpeg;base64,AAAA', duration: 1, engine: 'test' });
  const result = inject(inject(page, block), block);
  assert.equal(result.split(BEGIN).length - 1, 1);
  assert.equal(result.split('data:audio/mpeg;base64,AAAA').length - 1, 1);
  assert.ok(result.includes(iframe));
});
