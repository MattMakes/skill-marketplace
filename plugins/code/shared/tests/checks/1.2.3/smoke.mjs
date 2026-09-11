#!/usr/bin/env node
// Smoke page for leaf 1.2.3: the six explorer sections wrapped in a standalone
// HTML page (core theme + explorers CSS + runtime.js) and, when Chrome is found,
// a PNG of it so a reviewer can look at the result with the Read tool.
//
// Usage: node plugins/code/shared/tests/checks/1.2.3/smoke.mjs <ddd-dir> <out.html> [section,section]
//   The optional third argument limits the page to those sections (ids: domain,
//   contracts, stores, decisions, artifacts, everything) so one section can be
//   screenshotted at a readable height.
// Exit 0 when the HTML was written (the PNG needs Chrome; without it a note is
// printed and the exit is still 0), 1 on an error, 2 on misuse.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
if (args.length < 2 || args.length > 3) {
  console.error("usage: node smoke.mjs <ddd-dir> <out.html> [section,section]");
  process.exit(2);
}
const [dddDir, outHtml, onlyArg] = args;
if (!fs.existsSync(path.join(dddDir, "manifest.json"))) {
  console.error(`usage: ${dddDir} has no manifest.json`);
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const lib = path.resolve(here, "../../../lib");
const { loadWorkspace } = await import(pathToFileURL(path.join(lib, "workspace.mjs")).href);
const { sections, explorersCss } = await import(pathToFileURL(path.join(lib, "render/explorers/index.mjs")).href);
const { themeCss } = await import(pathToFileURL(path.join(lib, "render/core/svg.mjs")).href);
const { findChrome, headlessArgs } = await import(pathToFileURL(path.join(lib, "render/core/chrome.mjs")).href);
const { FONTS } = await import(pathToFileURL(path.join(lib, "render/core/palette.mjs")).href);
const runtime = fs.readFileSync(path.join(lib, "render/core/runtime.js"), "utf8");

try {
  const workspace = loadWorkspace(dddDir);
  const only = onlyArg ? onlyArg.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const secs = await sections(workspace, [], { only });
  const title = `${workspace.manifest.title || workspace.manifest.project || "ddd"}: explorers`;
  // A minimal shell: the real page (leaf 1.2.4) owns the chrome around the
  // sections; this only gives the runtime its hooks and the sections a column.
  const shell = `html{background:#ffffff}body{margin:0;font-family:${FONTS.label};color:#1f2430}` +
    `.wrap{max-width:1180px;margin:0 auto;padding:24px 28px 80px}` +
    `.top{display:flex;align-items:baseline;gap:16px;margin:0 0 28px;padding-bottom:12px;border-bottom:2px solid #1f2430}` +
    `.top h1{font-family:${FONTS.title};font-weight:500;font-size:28px;margin:0;flex:1}` +
    `.top input{font:inherit;font-size:14px;padding:5px 10px;border:1px solid #94a3b8;border-radius:6px;min-width:260px}` +
    `.top output{font-size:12px;color:#5b6472}` +
    `nav.toc{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;margin:0 0 28px}nav.toc a{color:#2563eb;text-decoration:none}`;
  const toc = secs.map((s) => `<a href="#${s.id}">${s.title}</a>`).join("");
  const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</title>
<style>${themeCss()}${explorersCss()}${shell}</style>
</head>
<body>
<div class="wrap">
<header class="top"><h1>${title.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</h1><input type="search" placeholder="find anything" data-ddd-search><output data-ddd-search-count></output></header>
<nav class="toc">${toc}</nav>
${secs.map((s) => s.html).join("\n")}
</div>
<script>${runtime}</script>
</body>
</html>
`;
  fs.mkdirSync(path.dirname(path.resolve(outHtml)), { recursive: true });
  fs.writeFileSync(outHtml, html);
  console.log(`wrote ${outHtml} (${html.length} bytes, ${secs.map((s) => `${s.id}=${s.count}`).join(" ")})`);

  const chrome = findChrome();
  const png = outHtml.replace(/\.html?$/i, "") + ".png";
  if (!chrome) {
    console.log("note: no Chrome found; PNG skipped (set CHROME_PATH to enable)");
  } else {
    // A screenshot is viewport-sized, so the viewport is made tall enough for the
    // sections asked for; an overrun just clips the bottom.
    const height = Number(process.env.DDD_SMOKE_HEIGHT || (only ? 2600 : 6000));
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-explorers-"));
    const profile = path.join(work, "profile");
    fs.mkdirSync(profile);
    if (fs.existsSync(png)) fs.unlinkSync(png);
    const argv = [...headlessArgs(profile, { width: 1280, height, screenshot: path.resolve(png) }), pathToFileURL(path.resolve(outHtml)).href];
    await new Promise((resolve) => {
      execFile(chrome, argv, { timeout: 45000 }, () => resolve());
    });
    fs.rmSync(work, { recursive: true, force: true });
    if (fs.existsSync(png) && fs.statSync(png).size > 0) console.log(`wrote ${png}`);
    else console.log("note: Chrome ran but wrote no PNG");
  }
} catch (e) {
  console.error(`smoke failed: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
}
