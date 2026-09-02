#!/usr/bin/env node
// G4: with Chrome present, `ddd review` writes a PNG for every SVG it wrote (top level
// and decisions/); with DDD_NO_CHROME=1 no PNG is written and the one-line note is on
// stdout and in the page. Both branches are asserted; the Chrome branch is skipped
// with a note when this machine has no Chrome (the ledger pins a machine that does).
//
// Usage: node check-png.mjs
// Exit 0 and print `png verification passed`; 1 on a failed assertion; 2 on misuse.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.argv.length > 2) { console.error("usage: node check-png.mjs"); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(here, "../../..");
const BIN = path.join(SHARED, "bin", "ddd.mjs");
const FIXTURE = path.join(SHARED, "examples", "mealkit");
const { findChrome, NO_CHROME_NOTE } = await import(pathToFileURL(path.join(SHARED, "lib", "render", "core", "chrome.mjs")).href);

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };
const listFiles = (dir, ext) => {
  const out = [];
  for (const d of [dir, path.join(dir, "decisions")]) {
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith(ext)) out.push(path.join(d, f));
  }
  return out;
};
function copy() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-png-check-"));
  const root = path.join(tmp, "mealkit");
  fs.cpSync(FIXTURE, root, { recursive: true });
  const ddd = path.join(root, "ddd");
  fs.rmSync(path.join(ddd, "diagrams"), { recursive: true, force: true });
  fs.rmSync(path.join(ddd, "review.html"), { force: true });
  return { tmp, ddd };
}

// Branch A: Chrome present.
const chrome = findChrome({ env: { ...process.env, DDD_NO_CHROME: "" } });
if (!chrome) {
  console.log("note: no Chrome on this machine; the PNG branch is skipped (the ledger pins a machine with Chrome)");
} else {
  const { tmp, ddd } = copy();
  try {
    const env = { ...process.env };
    delete env.DDD_NO_CHROME;
    const r = spawnSync(process.execPath, [BIN, "review", ddd], { encoding: "utf8", env, timeout: 300000 });
    check(r.status === 0, `ddd review exited ${r.status}: ${r.stderr}`);
    const dir = path.join(ddd, "diagrams");
    const svgs = listFiles(dir, ".svg");
    check(svgs.length > 0, "no SVG written");
    for (const s of svgs) check(fs.existsSync(s.replace(/\.svg$/, ".png")), `no PNG beside ${path.relative(ddd, s)}`);
    check(!r.stdout.includes(NO_CHROME_NOTE), "the no-Chrome note was printed although Chrome was found");
    const page = fs.readFileSync(path.join(ddd, "review.html"), "utf8");
    check(!page.includes(NO_CHROME_NOTE), "the no-Chrome note is on the page although Chrome was found");
    check(/PNG <b>yes<\/b>/.test(page), "status strip does not say PNG yes");
    check(/\.png" download>PNG<\/a>/.test(page), "no PNG link on a plate");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Branch B: DDD_NO_CHROME=1.
{
  const { tmp, ddd } = copy();
  try {
    const r = spawnSync(process.execPath, [BIN, "review", ddd], { encoding: "utf8", env: { ...process.env, DDD_NO_CHROME: "1" }, timeout: 300000 });
    check(r.status === 0, `ddd review (no Chrome) exited ${r.status}: ${r.stderr}`);
    const dir = path.join(ddd, "diagrams");
    check(listFiles(dir, ".svg").length > 0, "no SVG written without Chrome");
    check(listFiles(dir, ".png").length === 0, "PNG written although DDD_NO_CHROME=1");
    check(r.stdout.includes(NO_CHROME_NOTE), `the no-Chrome note is not on stdout: ${r.stdout}`);
    check((r.stdout.split(NO_CHROME_NOTE).length - 1) === 1, "the no-Chrome note is printed more than once");
    const page = fs.readFileSync(path.join(ddd, "review.html"), "utf8");
    check(page.includes(NO_CHROME_NOTE), "the no-Chrome note is not on the page");
    check(/PNG <b>no<\/b>/.test(page), "status strip does not say PNG no");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log("png verification passed");
