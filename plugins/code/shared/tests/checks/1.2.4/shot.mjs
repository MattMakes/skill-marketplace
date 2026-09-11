#!/usr/bin/env node
// Screenshot helper for the design review (G6): renders a review.html to PNG with
// headless Chrome at a given width, theme pinned through <html data-theme>, so the
// page can be LOOKED at with the Read tool. Not a gate; the gates never need it.
//
// Usage: node shot.mjs <review.html> <out.png> [--theme light|dark] [--width 1440] [--height 12000] [--tiles 2400]
//   --tiles N   also cut the tall PNG into N-pixel-high tiles (out-1.png, out-2.png, ...)
//               with `magick` or `sips` when one is installed, because a 12000px image
//               is unreadable when shrunk to fit a viewer.
// Exit 0 when the PNG was written, 1 when Chrome is missing or wrote nothing, 2 on misuse.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = { theme: "light", width: 1440, height: 12000, tiles: 0 };
const pos = [];
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--theme") opt.theme = args[++i];
  else if (a === "--width") opt.width = Number(args[++i]);
  else if (a === "--height") opt.height = Number(args[++i]);
  else if (a === "--tiles") opt.tiles = Number(args[++i]);
  else if (a.startsWith("-")) { console.error(`usage: unknown flag ${a}`); process.exit(2); }
  else pos.push(a);
}
if (pos.length !== 2 || !fs.existsSync(pos[0])) {
  console.error("usage: node shot.mjs <review.html> <out.png> [--theme light|dark] [--width W] [--height H] [--tiles N]");
  process.exit(2);
}
const [htmlIn, pngOut] = pos;
const lib = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../lib");
const { findChrome, headlessArgs } = await import(pathToFileURL(path.join(lib, "render/core/chrome.mjs")).href);
const chrome = findChrome();
if (!chrome) { console.error("no Chrome found; set CHROME_PATH"); process.exit(1); }

// Pin the theme by attribute so the PNG is the same on every machine.
const work = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-shot-"));
const html = fs.readFileSync(htmlIn, "utf8").replace(/<html lang="en"[^>]*>/, `<html lang="en" data-theme="${opt.theme}">`);
const page = path.join(path.dirname(path.resolve(htmlIn)), `.shot-${opt.theme}.html`);
fs.writeFileSync(page, html);
const profile = path.join(work, "profile");
fs.mkdirSync(profile);
const out = path.resolve(pngOut);
if (fs.existsSync(out)) fs.unlinkSync(out);
const argv = [...headlessArgs(profile, { width: opt.width, height: opt.height, screenshot: out }), pathToFileURL(page).href];
await new Promise((resolve) => execFile(chrome, argv, { timeout: 90000 }, () => resolve()));
fs.rmSync(work, { recursive: true, force: true });
fs.rmSync(page, { force: true });
if (!fs.existsSync(out) || !fs.statSync(out).size) { console.error("Chrome wrote no PNG"); process.exit(1); }
console.log(`wrote ${out}`);

if (opt.tiles > 0) {
  const base = out.replace(/\.png$/i, "");
  const n = Math.ceil(opt.height / opt.tiles);
  let tool = null;
  for (const t of ["magick", "sips"]) { try { execFileSync("which", [t], { stdio: "ignore" }); tool = t; break; } catch { /* next */ } }
  if (!tool) { console.log("note: neither magick nor sips found; no tiles"); process.exit(0); }
  for (let i = 0; i < n; i += 1) {
    const tile = `${base}-${i + 1}.png`;
    const y = i * opt.tiles;
    if (tool === "magick") execFileSync("magick", [out, "-crop", `${opt.width}x${opt.tiles}+0+${y}`, "+repage", tile]);
    else { fs.copyFileSync(out, tile); execFileSync("sips", ["--cropOffset", String(y), "0", "--cropToHeightWidth", String(opt.tiles), String(opt.width), tile], { stdio: "ignore" }); }
    console.log(`wrote ${tile}`);
  }
}
