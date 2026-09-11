#!/usr/bin/env node
// G2 (and root G5): a built review.html has every section in the plan's order and
// reaches nowhere outside itself. With --require-open-decision at least one OPEN
// decision row carries option cards with inline option diagrams; with
// --require-diagrams at least one inline svg[data-diagram] is on the page.
//
// Usage: node check-review.mjs <review.html> [--require-open-decision] [--require-diagrams]
// Exit 0 and print `review verification passed`; 1 on a failed assertion; 2 on misuse.

import fs from "node:fs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const files = args.filter((a) => !a.startsWith("--"));
for (const f of flags) {
  if (!["--require-open-decision", "--require-diagrams"].includes(f)) { console.error(`usage: unknown flag ${f}`); process.exit(2); }
}
if (files.length !== 1) { console.error("usage: node check-review.mjs <review.html> [--require-open-decision] [--require-diagrams]"); process.exit(2); }
if (!fs.existsSync(files[0])) { console.error(`usage: ${files[0]} does not exist`); process.exit(2); }
const page = fs.readFileSync(files[0], "utf8");

const ORDER = ["verdict", "worklist", "decisions", "shape", "diagrams", "domain", "stores", "words", "steps", "canvases", "contracts", "flows", "artifacts", "everything"];
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

// 1. Sections present, in order, each once.
const found = [...page.matchAll(/<section id="([a-z-]+)"/g)].map((m) => m[1]).filter((id) => ORDER.includes(id));
check(found.length === ORDER.length, `expected ${ORDER.length} sections, found ${found.length}: ${found.join(", ")}`);
check(found.join(",") === ORDER.join(","), `sections out of order: ${found.join(", ")}`);
for (const id of ORDER) check(page.includes(`<section id="${id}"`), `section #${id} missing`);

// 2. Self-contained: no external resource. Namespace identifiers and the JSON Schema
//    dialect id are names, not fetches.
const stripped = page.replace(/https?:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink)/g, "").replace(/https?:\/\/json-schema\.org\S*/g, "");
for (const bad of ["http://", "https://", "<script src", "<link ", "@import"]) check(!stripped.includes(bad), `page reaches outside itself: ${bad}`);
check(page.includes("<script>"), "no embedded script (runtime missing)");
check(/data-ddd-search/.test(page), "no global search input");
check(/data-theme-toggle/.test(page), "no theme toggle");
check(/class="strip"/.test(page), "no status strip");

// 3. Gates: the page can never say OK while a gate says FAIL.
const stripOk = /gates <b>OK<\/b>/.test(page);
const stripFail = /gates <b>FAIL<\/b>/.test(page);
check(stripOk || stripFail || /gates <b>not run<\/b>/.test(page), "status strip carries no gate verdict");
if (stripOk) check(!/A gate says this is broken \(\d+\)/.test(page), "status strip says OK while the worklist lists gate errors");

// 4. Optional: an open decision row with option cards and inline diagrams.
if (flags.has("--require-open-decision")) {
  // The decisions explorer renders one <article class="x-dec ..."> per decision.
  const rows = [...page.matchAll(/<article[^>]*class="x-dec[^"]*\bis-open\b[^"]*"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  check(rows.length > 0, "no open decision row (x-dec.is-open) on the page");
  const good = rows.filter((r) => /class="x-opt[ "]/.test(r) && /<svg[^>]*data-diagram=/.test(r));
  check(good.length > 0, "no open decision row has option cards with inline diagrams");
}

// 5. Optional: at least one inline diagram.
if (flags.has("--require-diagrams")) {
  const n = (page.match(/<svg[^>]*data-diagram=/g) || []).length;
  check(n >= 1, "no inline svg[data-diagram] on the page");
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log("review verification passed");
