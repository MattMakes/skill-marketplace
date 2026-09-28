#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..', '..');
const skillRoot = join(repositoryRoot, 'plugins', 'game-design', 'skills', 'one-page-game-design');
const exporter = join(skillRoot, 'scripts', 'export_pdf.mjs');
const detailedSvg = join(skillRoot, 'assets', 'detailed-diagram.svg');
const lightHtml = join(skillRoot, 'assets', 'diagram-shell.html');
const outputDirectory = process.argv[2] ? resolve(process.argv[2]) : null;

const paperDimensions = {
  A3: [1190.55, 841.89],
  A2: [1683.78, 1190.55],
  A1: [2383.94, 1683.78],
};

const results = {
  status: 'running',
  node: process.version,
  playwrightModulePath: process.env.PLAYWRIGHT_MODULE_PATH || null,
  documents: [],
  optionalFixtures: [],
};

function commandText(command, args) {
  return [command, ...args].map((value) => JSON.stringify(value)).join(' ');
}

async function run(command, args, options = {}) {
  const { cwd = repositoryRoot, env = process.env } = options;
  return await new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd, env, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status, signal) => {
      if (status === 0) {
        accept({ stdout, stderr, status });
        return;
      }
      const error = new Error(`${commandText(command, args)} failed with status ${status}${signal ? ` and signal ${signal}` : ''}.\n${stderr || stdout}`);
      error.stdout = stdout;
      error.stderr = stderr;
      error.status = status;
      reject(error);
    });
  });
}

function normalizedText(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function assertExpectedText(text, phrases, label) {
  const normalized = normalizedText(text);
  for (const phrase of phrases) {
    assert.ok(normalized.includes(normalizedText(phrase)), `${label} PDF text must include ${JSON.stringify(phrase)}.`);
  }
}

function parsePdfInfo(text, paperSize, label) {
  const pages = text.match(/^Pages:\s+(\d+)$/m);
  assert.ok(pages, `${label} pdfinfo output must include a page count.`);
  assert.equal(Number(pages[1]), 1, `${label} must contain exactly 1 page.`);

  const size = text.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
  assert.ok(size, `${label} pdfinfo output must include page dimensions.`);
  const width = Number(size[1]);
  const height = Number(size[2]);
  const [expectedWidth, expectedHeight] = paperDimensions[paperSize];
  assert.ok(width > height, `${label} must use landscape orientation.`);
  assert.ok(Math.abs(width - expectedWidth) <= 4, `${label} width ${width} pt does not match ${paperSize} landscape.`);
  assert.ok(Math.abs(height - expectedHeight) <= 4, `${label} height ${height} pt does not match ${paperSize} landscape.`);
  return { pages: 1, widthPoints: width, heightPoints: height };
}

function fontCount(text) {
  return text.split('\n').filter((line) => /^\S.+\s+(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+$/.test(line.trim())).length;
}

function imageRows(text) {
  return text.split('\n').filter((line) => /^\s*\d+\s+\d+\s+\w+\s+\d+\s+\d+/.test(line));
}

async function fileHash(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function writeResults() {
  if (!outputDirectory) return;
  await writeFile(join(outputDirectory, 'check-results.json'), `${JSON.stringify(results, null, 2)}\n`);
}

async function exportAndInspect({ name, input, paperSize, expectedText, assertNoImages = false }) {
  const pdf = join(outputDirectory, `${name}.pdf`);
  const browserPreview = join(outputDirectory, `${name}-browser.png`);
  const popplerPrefix = join(outputDirectory, `${name}-poppler`);
  const extractedText = join(outputDirectory, `${name}.txt`);
  const args = [exporter, input, '--output', pdf, '--preview', browserPreview];
  if (input.toLowerCase().endsWith('.svg')) args.push('--paper-size', paperSize);

  const sourceHashBefore = await fileHash(input);
  const exported = await run(process.execPath, args);
  await writeFile(join(outputDirectory, `${name}.export.txt`), `${exported.stdout}${exported.stderr}`);

  const info = await run('pdfinfo', [pdf]);
  await writeFile(join(outputDirectory, `${name}.pdfinfo.txt`), info.stdout);
  const page = parsePdfInfo(info.stdout, paperSize, name);

  await run('pdftotext', ['-layout', pdf, extractedText]);
  const text = await readFile(extractedText, 'utf8');
  assert.ok(text.trim().length >= 100, `${name} must contain readable extracted text.`);
  assertExpectedText(text, expectedText, name);

  const fonts = await run('pdffonts', [pdf]);
  await writeFile(join(outputDirectory, `${name}.pdffonts.txt`), fonts.stdout);
  const fontsFound = fontCount(fonts.stdout);
  assert.ok(fontsFound > 0, `${name} must retain at least 1 PDF font.`);

  const images = await run('pdfimages', ['-list', pdf]);
  await writeFile(join(outputDirectory, `${name}.pdfimages.txt`), images.stdout);
  const rasterImages = imageRows(images.stdout);
  if (assertNoImages) {
    assert.equal(rasterImages.length, 0, `${name} dense SVG must not flatten into a raster image.`);
  }

  await run('pdftoppm', ['-png', '-r', '150', '-singlefile', pdf, popplerPrefix]);
  await access(`${popplerPrefix}.png`);
  await access(browserPreview);
  assert.ok((await stat(`${popplerPrefix}.png`)).size > 0, `${name} Poppler PNG must not be empty.`);
  assert.ok((await stat(browserPreview)).size > 0, `${name} browser PNG must not be empty.`);
  assert.equal(await fileHash(input), sourceHashBefore, `${name} export must not modify its input.`);

  const evidence = {
    name,
    input,
    paperSize,
    ...page,
    extractedTextBytes: Buffer.byteLength(text),
    fontsFound,
    rasterImagesFound: rasterImages.length,
    pdf,
    browserPreview,
    popplerPreview: `${popplerPrefix}.png`,
  };
  results.documents.push(evidence);
  await writeResults();
  return evidence;
}

async function makeA1Variant() {
  const source = await readFile(detailedSvg, 'utf8');
  assert.match(source, /data-paper-size=["']A2["']/, 'Detailed SVG must declare A2 paper metadata.');
  assert.match(source, /A2 landscape/, 'Detailed SVG must include visible A2 paper metadata.');
  const variant = source
    .replace(/data-paper-size=(["'])A2\1/, 'data-paper-size="A1"')
    .replaceAll('A2 landscape', 'A1 landscape');
  const path = join(outputDirectory, 'glasswing-station-a1.svg');
  await writeFile(path, variant);
  return path;
}

async function optionalRelayFixtures() {
  for (const revision of ['v1', 'v2']) {
    const input = join(skillRoot, 'evals', 'relay-orchard', revision, 'relay-orchard.svg');
    try {
      await access(input);
    } catch {
      results.optionalFixtures.push({ revision, status: 'absent-not-tested', input });
      continue;
    }
    const source = await readFile(input, 'utf8');
    assert.match(source, /data-paper-size=["']A2["']/i, `Relay Orchard ${revision} must declare A2 paper metadata.`);
    await exportAndInspect({
      name: `relay-orchard-${revision}`,
      input,
      paperSize: 'A2',
      expectedText: ['Relay Orchard'],
      assertNoImages: true,
    });
    results.optionalFixtures.push({ revision, status: 'tested', input });
  }
}

async function main() {
  assert.ok(outputDirectory, 'Usage: node check-one-page-game-design.mjs <output-directory>');
  await mkdir(outputDirectory, { recursive: true });
  await writeResults();

  try {
    assert.ok(process.env.PLAYWRIGHT_MODULE_PATH, 'PLAYWRIGHT_MODULE_PATH must identify the temporary Playwright installation.');
    await exportAndInspect({
      name: 'glasswing-station-a2',
      input: detailedSvg,
      paperSize: 'A2',
      expectedText: ['GLASSWING STATION', 'NUMERIC TRACE', 'FAILURE / RECOVERY TRACE'],
      assertNoImages: true,
    });

    const a1Variant = await makeA1Variant();
    await exportAndInspect({
      name: 'glasswing-station-a1',
      input: a1Variant,
      paperSize: 'A1',
      expectedText: ['GLASSWING STATION', 'A1 landscape', 'PLAYTEST'],
      assertNoImages: true,
    });

    await exportAndInspect({
      name: 'beaconfall-courier-a3',
      input: lightHtml,
      paperSize: 'A3',
      expectedText: ['Beaconfall Courier', 'Journey and resource loop', 'Key rules'],
    });

    await optionalRelayFixtures();
    results.status = 'passed';
    await writeResults();
    console.log(`Validation passed. Evidence: ${outputDirectory}`);
  } catch (error) {
    results.status = 'failed';
    results.error = error.stack || error.message;
    await writeResults();
    throw error;
  }
}

await main();
