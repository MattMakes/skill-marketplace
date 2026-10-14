#!/usr/bin/env node
// Embed a trusted, delivered Blueprint viewer without merging its DOM/runtime
// into the article. No renderer discovery or validation is implied here.
import fs from 'node:fs';
import path from 'node:path';

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

const [page, slot, diagram, title, ...extra] = process.argv.slice(2);
if (!page || !slot || !diagram || !title || extra.length || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(slot)) {
  console.error('Usage: node embed-blueprint.mjs <explainer.html> <slot-id> <delivered-diagram.html> <title>');
  process.exit(2);
}

let temporary;
try {
  const original = fs.readFileSync(page, 'utf8');
  const marker = `<template data-blueprint="${slot}"></template>`;
  if (original.split(marker).length !== 2) throw new Error(`Expected exactly one ${marker} in ${page}`);
  const viewer = fs.readFileSync(diagram, 'utf8');
  const figure = `<figure class="blueprint-figure" style="margin:2rem 0">
  <iframe title="${escapeHtml(title)}" sandbox="allow-scripts allow-downloads" allowfullscreen
    style="display:block;width:100%;height:clamp(540px,80vh,960px);border:0;border-radius:12px"
    srcdoc="${escapeHtml(viewer)}"></iframe>
  <figcaption>${escapeHtml(title)}</figcaption>
</figure>`;
  const updated = original.replace(marker, () => figure);
  temporary = path.join(path.dirname(page), `.${path.basename(page)}.blueprint-${process.pid}.tmp`);
  fs.writeFileSync(temporary, updated, { flag: 'wx', mode: fs.statSync(page).mode });
  fs.renameSync(temporary, page);
  temporary = undefined;
  console.log(`Embedded ${slot} in ${page}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (temporary) fs.rmSync(temporary, { force: true });
}
