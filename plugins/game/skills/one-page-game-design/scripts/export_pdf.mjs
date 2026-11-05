#!/usr/bin/env node

import { access, mkdir, readFile } from 'node:fs/promises';
import { constants, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PAPER_SIZES = new Set(['A3', 'A2', 'A1', 'A0']);

const usage = `Usage:
  node export_pdf.mjs <input.html|input.htm|input.svg> --output <output.pdf> [options]

Options:
  --preview <output.png>       Save a full-page PNG preview.
  --paper-size A3|A2|A1|A0    Select SVG paper size. SVG input only.
  --module-path <path>         Playwright or playwright-core package directory.
  --browser-executable <path>  Chromium or Chrome executable.
  --help                       Show this help.

The exporter does not install dependencies. Set PLAYWRIGHT_MODULE_PATH or
PLAYWRIGHT_BROWSERS_PATH when automatic discovery does not match your setup.`;

function fail(message) {
  console.error(`Error: ${message}`);
  console.error(`\n${usage}`);
  process.exitCode = 1;
}

export function parseArgs(argv) {
  const options = { input: null, output: null, preview: null, paperSize: null, modulePath: null, executablePath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help') return { help: true };
    if (['--output', '--preview', '--paper-size', '--module-path', '--browser-executable'].includes(value)) {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`${value} requires a value.`);
      const key = {
        '--output': 'output', '--preview': 'preview', '--paper-size': 'paperSize',
        '--module-path': 'modulePath', '--browser-executable': 'executablePath',
      }[value];
      options[key] = value === '--paper-size' ? next.toUpperCase() : next;
      index += 1;
    } else if (value.startsWith('--')) {
      throw new Error(`Unknown option: ${value}`);
    } else if (!options.input) {
      options.input = value;
    } else {
      throw new Error(`Unexpected argument: ${value}`);
    }
  }
  return options;
}

async function resolvePlaywright(modulePath) {
  const candidates = [modulePath, process.env.PLAYWRIGHT_MODULE_PATH, 'playwright', 'playwright-core'].filter(Boolean);
  const errors = [];
  for (const candidate of candidates) {
    try {
      const absoluteCandidate = isAbsolute(candidate) ? candidate : null;
      const requireFrom = createRequire(import.meta.url);
      const resolved = absoluteCandidate ? requireFrom.resolve(resolve(absoluteCandidate)) : requireFrom.resolve(candidate);
      const imported = await import(pathToFileURL(resolved).href);
      return imported.default ?? imported;
    } catch (error) {
      errors.push(`${candidate}: ${error.code ?? error.message}`);
    }
  }
  throw new Error(`Playwright is unavailable. Supply --module-path or PLAYWRIGHT_MODULE_PATH. Tried ${errors.join('; ')}`);
}

export async function validateSvgSource(page, source, cliPaperSize = null) {
  return page.evaluate(({ sourceText, cliPaper, namespace, supportedPapers }) => {
    const problems = [];
    const cssPresentationAttributes = new Set([
      'clip', 'clip-path', 'color', 'cursor', 'display', 'fill', 'fill-opacity', 'fill-rule', 'filter',
      'font-family', 'font-size', 'font-style', 'font-weight', 'marker-end', 'marker-mid', 'marker-start',
      'mask', 'opacity', 'overflow', 'pointer-events', 'shape-rendering', 'stop-color', 'stop-opacity',
      'stroke', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
      'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration',
      'text-rendering', 'transform', 'vector-effect', 'visibility', 'word-spacing', 'writing-mode',
    ]);
    const hasMotionRule = (css) => /(?:^|[;{])\s*(?:animation|transition)(?:-[\w-]+)?\s*:/i.test(css);
    const documentNode = new DOMParser().parseFromString(sourceText, 'image/svg+xml');
    const parserError = documentNode.querySelector('parsererror');
    if (parserError) throw new Error(`Malformed SVG XML: ${parserError.textContent.trim().replace(/\s+/g, ' ')}`);
    if (documentNode.doctype) throw new Error('SVG document-type declarations are not allowed.');
    for (const node of documentNode.childNodes) {
      if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE && node.target.toLowerCase() === 'xml-stylesheet') {
        throw new Error('SVG stylesheet processing instructions are not allowed.');
      }
    }
    const root = documentNode.documentElement;
    if (root.localName !== 'svg') throw new Error('SVG input must have an <svg> root element.');
    if (root.namespaceURI !== namespace) throw new Error(`SVG root must use the ${namespace} namespace.`);
    const viewBoxText = root.getAttribute('viewBox');
    if (!viewBoxText) throw new Error('SVG root must have a viewBox.');
    const viewBox = viewBoxText.trim().split(/[\s,]+/).map(Number);
    if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) {
      throw new Error('SVG viewBox must contain 4 finite numbers with positive width and height.');
    }
    const forbidden = root.querySelector('script, foreignObject, animate, animateMotion, animateTransform, set');
    if (forbidden) throw new Error(`Active SVG content is not allowed: <${forbidden.localName}>.`);
    for (const element of [root, ...root.querySelectorAll('*')]) {
      if (element.namespaceURI !== namespace) {
        throw new Error(`Foreign-namespace SVG content is not allowed: <${element.tagName}>.`);
      }
      for (const attribute of element.attributes) {
        const name = attribute.name.toLowerCase();
        const localName = attribute.localName.toLowerCase();
        const value = attribute.value.trim();
        if (name.startsWith('on')) problems.push(`event-handler attribute ${attribute.name}`);
        if (name === 'xml:base' || (localName === 'base' && attribute.namespaceURI === 'http://www.w3.org/XML/1998/namespace')) {
          problems.push('xml:base');
        }
        if (localName === 'href' || localName === 'src') {
          if (!value.startsWith('#')) problems.push(`external resource in ${attribute.name}`);
        }
        if ((name === 'style' || cssPresentationAttributes.has(localName)) && value.includes('\\')) {
          problems.push('CSS escapes are unsupported');
        }
        if (name === 'style' && /@import\b/i.test(value)) problems.push('CSS @import');
        if (name === 'style' && hasMotionRule(value)) problems.push('CSS animation or transition');
        for (const match of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
          if (!match[2].trim().startsWith('#')) problems.push('external resource URL');
        }
      }
    }
    for (const style of root.querySelectorAll('style')) {
      const css = style.textContent;
      if (css.includes('\\')) problems.push('CSS escapes are unsupported');
      if (/@import\b/i.test(css)) problems.push('CSS @import');
      if (/@(?:-webkit-)?keyframes\b/i.test(css) || hasMotionRule(css)) problems.push('CSS animation or transition');
      if (/@page\b/i.test(css)) problems.push('CSS @page');
      for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
        if (!match[2].trim().startsWith('#')) problems.push('external resource URL');
      }
    }
    if (problems.length) throw new Error(`SVG must be static and self-contained: ${[...new Set(problems)].join(', ')}.`);
    const rootPaper = root.getAttribute('data-paper-size')?.toUpperCase() || null;
    if (rootPaper && !supportedPapers.includes(rootPaper)) throw new Error(`Unsupported root paper size: ${rootPaper}.`);
    if (cliPaper && !supportedPapers.includes(cliPaper)) throw new Error(`Unsupported paper size: ${cliPaper}.`);
    if (cliPaper && rootPaper && cliPaper !== rootPaper) {
      throw new Error(`Paper size mismatch: CLI requests ${cliPaper}, but SVG declares ${rootPaper}.`);
    }
    root.removeAttribute('width');
    root.removeAttribute('height');
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    root.style.setProperty('width', '100%', 'important');
    root.style.setProperty('height', '100%', 'important');
    root.style.setProperty('min-width', '0', 'important');
    root.style.setProperty('min-height', '0', 'important');
    root.style.setProperty('max-width', '100%', 'important');
    root.style.setProperty('max-height', '100%', 'important');
    return { markup: new XMLSerializer().serializeToString(root), paperSize: cliPaper || rootPaper || 'A2', viewBox };
  }, { sourceText: source, cliPaper: cliPaperSize, namespace: SVG_NAMESPACE, supportedPapers: [...PAPER_SIZES] });
}

export function svgWrapper(markup, paperSize) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${paperSize} landscape; margin: 0; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: white; }
    body { display: flex; align-items: center; justify-content: center; }
    svg { display: block; width: 100%; height: 100%; max-width: 100%; max-height: 100%; }
  </style></head><body>${markup}</body></html>`;
}

export async function blockSvgExternalRequests(page) {
  const blocked = [];
  await page.route('**/*', async (route) => {
    blocked.push(route.request().url());
    await route.abort('blockedbyclient');
  });
  return blocked;
}

export function assertNoBlockedSvgRequests(blockedRequests) {
  if (blockedRequests.length) throw new Error(`SVG attempted an external request: ${blockedRequests[0]}`);
}

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); } catch (error) { fail(error.message); return; }
  if (options.help) { console.log(usage); return; }
  if (!options.input) { fail('Missing input file.'); return; }
  if (!options.output) { fail('Missing required --output path.'); return; }
  const inputExtension = extname(options.input).toLowerCase();
  if (!['.html', '.htm', '.svg'].includes(inputExtension)) { fail('Input path must end in .html, .htm, or .svg.'); return; }
  const isSvg = inputExtension === '.svg';
  if (options.paperSize && !isSvg) { fail('--paper-size is available for SVG input only.'); return; }
  if (options.paperSize && !PAPER_SIZES.has(options.paperSize)) {
    fail(`Unsupported paper size: ${options.paperSize}. Use A3, A2, A1, or A0.`); return;
  }
  if (extname(options.output).toLowerCase() !== '.pdf') { fail('The --output path must end in .pdf.'); return; }
  if (options.preview && extname(options.preview).toLowerCase() !== '.png') { fail('The --preview path must end in .png.'); return; }
  const inputPath = resolve(options.input);
  const outputPath = resolve(options.output);
  const previewPath = options.preview ? resolve(options.preview) : null;
  try { await access(inputPath, constants.R_OK); } catch { fail(`Input is not readable: ${inputPath}`); return; }
  let playwright;
  try { playwright = await resolvePlaywright(options.modulePath); } catch (error) { fail(error.message); return; }
  await mkdir(dirname(outputPath), { recursive: true });
  if (previewPath) await mkdir(dirname(previewPath), { recursive: true });
  const executablePath = options.executablePath || process.env.PLAYWRIGHT_BROWSER_EXECUTABLE || undefined;
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 1 });
    let paperSize = 'A3';
    let blockedRequests = null;
    if (isSvg) {
      blockedRequests = await blockSvgExternalRequests(page);
      const validated = await validateSvgSource(page, await readFile(inputPath, 'utf8'), options.paperSize);
      paperSize = validated.paperSize;
      await page.setContent(svgWrapper(validated.markup, paperSize), { waitUntil: 'load' });
      assertNoBlockedSvgRequests(blockedRequests);
    } else {
      await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'load' });
    }
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      if (document.readyState !== 'complete') await new Promise((done) => window.addEventListener('load', done, { once: true }));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    if (isSvg) assertNoBlockedSvgRequests(blockedRequests);
    await page.pdf({
      path: outputPath, landscape: true, format: paperSize, printBackground: true,
      preferCSSPageSize: true, displayHeaderFooter: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    if (previewPath) await page.screenshot({ path: previewPath, fullPage: true, animations: 'disabled' });
    if (isSvg) assertNoBlockedSvgRequests(blockedRequests);
    console.log(`PDF: ${outputPath}`);
    if (previewPath) console.log(`Preview: ${previewPath}`);
  } catch (error) {
    fail(`Export failed: ${error.message}`);
  } finally {
    await browser?.close();
  }
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))) await main();
