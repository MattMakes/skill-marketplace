import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFile, mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertNoBlockedSvgRequests, blockSvgExternalRequests, parseArgs, svgWrapper, validateSvgSource } from './export_pdf.mjs';

const requireFrom = createRequire(import.meta.url);
const requireBrowserTests = process.env.REQUIRE_BROWSER_TESTS === '1';

async function launchBrowser() {
  const candidates = process.env.PLAYWRIGHT_MODULE_PATH
    ? [process.env.PLAYWRIGHT_MODULE_PATH]
    : ['playwright', 'playwright-core'];
  const errors = [];
  for (const candidate of candidates) {
    try {
      const resolved = requireFrom.resolve(candidate);
      const imported = await import(pathToFileURL(resolved).href);
      const playwright = imported.default ?? imported;
      const executablePath = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE;
      return await playwright.chromium.launch(executablePath ? { headless: true, executablePath } : { headless: true });
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }
  throw new Error(`Chromium validation runtime unavailable: ${errors.join('; ')}`);
}

function svg(body = '', attributes = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" ${attributes}>${body}</svg>`;
}

test('argument parser accepts SVG paper selection and HTML extensions', () => {
  assert.equal(parseArgs(['design.svg', '--output', 'out.pdf', '--paper-size', 'a1']).paperSize, 'A1');
  assert.equal(parseArgs(['design.htm', '--output', 'out.pdf']).input, 'design.htm');
  assert.throws(() => parseArgs(['design.svg', '--paper-size']), /requires a value/);
});

test('direct execution works from a path containing spaces', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'svg exporter space '));
  const copiedExporter = join(directory, 'export pdf.mjs');
  await copyFile(fileURLToPath(new URL('./export_pdf.mjs', import.meta.url)), copiedExporter);
  const result = spawnSync(process.execPath, [copiedExporter, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage:/);
});

test('blocked SVG request state is a hard failure', () => {
  assert.doesNotThrow(() => assertNoBlockedSvgRequests([]));
  assert.throws(
    () => assertNoBlockedSvgRequests(['https://example.invalid/external.png']),
    /SVG attempted an external request/,
  );
});

test('SVG validation contract rejects unsafe and inconsistent sources', async (t) => {
  let browser;
  try {
    browser = await launchBrowser();
  } catch (error) {
    if (requireBrowserTests) throw error;
    t.skip(`Chromium validation runtime unavailable: ${error.message}`);
    return;
  }
  t.after(() => browser.close());
  const page = await browser.newPage();
  const blockedRequests = await blockSvgExternalRequests(page);

  const internalReferences = '<defs><marker id="m"/><linearGradient id="g"/><clipPath id="c"><rect width="5" height="5"/></clipPath><path id="p"/></defs><use href="#p" fill="url(#g)" clip-path="url(#c)" marker-end="url(#m)"/>';
  const valid = await validateSvgSource(page, svg(internalReferences, 'data-paper-size="A2" width="400" height="200" preserveAspectRatio="none" style="width:7px;height:9px"'));
  assert.equal(valid.paperSize, 'A2');
  assert.deepEqual(valid.viewBox, [0, 0, 100, 50]);
  assert.match(valid.markup, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(valid.markup, /width: 100% !important/);

  const cases = [
    ['malformed XML', '<svg>', /Malformed SVG XML/],
    ['wrong root', '<html xmlns="http://www.w3.org/1999/xhtml" viewBox="0 0 1 1"/>', /<svg> root/],
    ['wrong namespace', '<svg xmlns="urn:not-svg" viewBox="0 0 1 1"/>', /namespace/],
    ['invalid viewBox', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 -2 4"/>', /positive width and height/],
    ['script', svg('<script>void 0</script>'), /Active SVG content/],
    ['foreign object', svg('<foreignObject/>'), /Active SVG content/],
    ['event handler', svg('<rect onclick="alert(1)"/>'), /event-handler/],
    ['external image', svg('<image href="https://example.invalid/a.png"/>'), /external resource/],
    ['alternate XLink prefix', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:alt="http://www.w3.org/1999/xlink" viewBox="0 0 1 1"><use alt:href="https://example.invalid/a.svg#x"/></svg>', /external resource/],
    ['external CSS', svg('<style>.x{fill:url(https://example.invalid/a.svg)}</style>'), /external resource URL/],
    ['external paint server', svg('<rect fill="url(https://example.invalid/a.svg#p)"/>'), /external resource URL/],
    ['external file filter', svg('<rect filter="url(file:///tmp/a.svg#x)"/>'), /external resource URL/],
    ['XML base', svg('<g xml:base="https://example.invalid/"><use href="#x"/></g>'), /xml:base/],
    ['CSS escape', svg('<style>.x{fill:u\\72l(https://example.invalid/a.svg)}</style>'), /CSS escapes are unsupported/],
    ['presentation attribute CSS escape', svg('<rect fill="u\\72l(https://example.invalid/a.svg)"/>'), /CSS escapes are unsupported/],
    ['style attribute animation', svg('<rect style="animation: pulse 1s"/>'), /CSS animation or transition/],
    ['style element transition', svg('<style>.x{transition-property:fill}</style>'), /CSS animation or transition/],
    ['keyframes rule', svg('<style>@keyframes pulse{to{opacity:0}}</style>'), /CSS animation or transition/],
    ['stylesheet page rule', svg('<style>@page{size:A0 landscape}</style>'), /CSS @page/],
    ['animation', svg('<animate attributeName="opacity" values="0;1"/>'), /Active SVG content/],
    ['set animation', svg('<set attributeName="href" to="https://example.invalid/a.svg"/>'), /Active SVG content/],
    ['foreign namespace', svg('<html:div xmlns:html="http://www.w3.org/1999/xhtml">active HTML</html:div>'), /Foreign-namespace/],
    ['stylesheet import', svg('<style>@import "https://example.invalid/a.css";</style>'), /CSS @import/],
    ['doctype', '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>', /document-type/],
  ];
  for (const [name, source, expected] of cases) {
    await t.test(name, async () => assert.rejects(validateSvgSource(page, source), expected));
  }
  await assert.rejects(validateSvgSource(page, svg('', 'data-paper-size="A2"'), 'A1'), /Paper size mismatch/);
  await assert.rejects(validateSvgSource(page, svg('', 'data-paper-size="LETTER"')), /Unsupported root paper size/);
  await assert.rejects(validateSvgSource(page, svg(''), 'LETTER'), /Unsupported paper size/);
  assert.equal(blockedRequests.length, 0, 'rejected SVG validation must not make external requests');

  const wide = await validateSvgSource(page, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100"><text id="left" x="2" y="55">LEFT EDGE</text><text id="right" x="998" y="55" text-anchor="end">RIGHT EDGE</text></svg>');
  await page.setContent(svgWrapper(wide.markup, wide.paperSize));
  const bounds = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    left: document.querySelector('#left').getBoundingClientRect().toJSON(),
    right: document.querySelector('#right').getBoundingClientRect().toJSON(),
  }));
  assert.ok(bounds.left.left >= 0 && bounds.left.right <= bounds.viewport.width);
  assert.ok(bounds.right.left >= 0 && bounds.right.right <= bounds.viewport.width);
  assert.equal(blockedRequests.length, 0, 'valid self-contained SVG must not make external requests');
});

test('blocked SVG requests produce an export failure', async (t) => {
  let browser;
  try {
    browser = await launchBrowser();
  } catch (error) {
    if (requireBrowserTests) throw error;
    t.skip(`Chromium validation runtime unavailable: ${error.message}`);
    return;
  }
  t.after(() => browser.close());
  const page = await browser.newPage();
  const blockedRequests = await blockSvgExternalRequests(page);
  await page.setContent('<img src="https://example.invalid/external.png">', { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
  assert.throws(() => assertNoBlockedSvgRequests(blockedRequests), /SVG attempted an external request/);
});
