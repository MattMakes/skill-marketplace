// review.mjs: the one-page review of a whole run. The seven invariants carried from
// tests/test_review.py, one to one, against the Node page.
//
// Two properties matter more than the layout. First, looking at a run must never
// change it: validate rewrites manifest.json when it finds staleness, so the page calls
// it with persist:false and runs the contracts check on a copy. Second, the page must
// never claim things are fine when a gate says otherwise, and must never quietly drop a
// key the chain grew after this module was written.
//
// Run: node --test --test-reporter=tap plugins/code/shared/tests/review.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(here, "..");
const BIN = path.join(SHARED, "bin", "ddd.mjs");
const FIXTURE = path.join(SHARED, "examples", "mealkit");
const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];
const FOLDER = Object.fromEntries(STEPS.map((s, i) => [s, `${String(i + 1).padStart(2, "0")}-${s}`]));

// A throwaway copy of the shipped meal-kit fixture, so a failing test can never damage
// the example or any real workspace. Diagram files from the example (if it ships with
// them) are dropped so every test starts from the JSON alone.
function fixture(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-test-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const root = path.join(tmp, "mealkit");
  fs.cpSync(FIXTURE, root, { recursive: true });
  const ddd = path.join(root, "ddd");
  fs.rmSync(path.join(ddd, "diagrams"), { recursive: true, force: true });
  fs.rmSync(path.join(ddd, "review.html"), { force: true });
  const stepPath = (s) => path.join(ddd, FOLDER[s], `${s}.json`);
  return {
    tmp, root, ddd, stepPath,
    load: (s) => JSON.parse(fs.readFileSync(stepPath(s), "utf8")),
    save: (s, doc) => fs.writeFileSync(stepPath(s), `${JSON.stringify(doc, null, 2)}\n`),
  };
}

// `ddd review <ddd> -o <out> --no-diagrams`: the page alone, no PNG work (Chrome is
// switched off so the suite is fast and the same on every machine).
function build(f, ...extra) {
  const out = path.join(f.tmp, "review.html");
  const r = spawnSync(process.execPath, [BIN, "review", f.ddd, "-o", out, "--no-diagrams", ...extra], {
    encoding: "utf8", env: { ...process.env, DDD_NO_CHROME: "1" },
  });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  return { page: fs.readFileSync(out, "utf8"), log: r.stdout + r.stderr, out };
}

// Every file under the workspace with a hash of its bytes, to prove nothing moved.
function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else out[path.relative(dir, p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
    }
  };
  walk(dir);
  return out;
}

const cardKinds = (page) => [...page.matchAll(/class="card k-\w+" data-kind="(\w+)"/g)].map((m) => m[1]);
const RANK = ["decision", "blocking", "error", "guess", "stale", "note", "warning"];

test("looking at a run never changes it", (t) => {
  // validate rewrites manifest.json on staleness when it persists. The review must
  // not trigger that: it validates with persist:false and checks contracts on a copy.
  // The page is written elsewhere (-o) and the diagram files are skipped
  // (--no-diagrams) because writing <ddd>/diagrams is the one thing `ddd review` is
  // allowed to add; the invariant is about the run's own files.
  const f = fixture(t);
  const stale = f.load("understand");
  stale.produced_at = "2099-01-01T00:00:00Z"; // makes every later step stale
  f.save("understand", stale);
  const before = snapshot(f.ddd);
  const { page } = build(f);
  const after = snapshot(f.ddd);
  const changed = Object.keys(before).filter((k) => before[k] !== after[k]).sort();
  assert.deepEqual(changed, [], `the review modified the workspace: ${changed}`);
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort(), "the review added or removed files in the workspace");
  assert.match(page, /stale/i, "the staleness the gate found did not reach the page");
});

test("the shipped command path never changes the run either", (t) => {
  // Default flags (diagram files written) with the page elsewhere: manifest.json and every
  // step file stay byte-identical and the only additions are under diagrams/**.
  const f = fixture(t);
  const before = snapshot(f.ddd);
  const out = path.join(f.tmp, "elsewhere", "review.html");
  const r = spawnSync(process.execPath, [BIN, "review", f.ddd, "-o", out], { encoding: "utf8", env: { ...process.env, DDD_NO_CHROME: "1" } });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  const after = snapshot(f.ddd);
  const changed = Object.keys(before).filter((k) => before[k] !== after[k]).sort();
  assert.deepEqual(changed, [], `the review modified the workspace: ${changed}`);
  const added = Object.keys(after).filter((k) => !(k in before)).sort();
  assert.ok(added.length > 0, "no diagram files were written");
  assert.deepEqual(added.filter((k) => !k.startsWith("diagrams/")), [], `files added outside diagrams/: ${added}`);
  assert.ok(fs.existsSync(out), "the page was not written where -o said");
});

test("a failing gate cannot be reported as fine", (t) => {
  const f = fixture(t);
  const doc = f.load("contracts");
  doc.entries[0].schema = "ddd/09-contracts/schemas/does-not-exist.schema.json";
  f.save("contracts", doc);
  const { page } = build(f);
  assert.match(page, /FAIL/, "a broken gate did not reach the page");
  assert.match(page, /does-not-exist/, "the gate's own message was not rendered");
  assert.doesNotMatch(page, /gates <b>OK<\/b>/, "the status strip says OK while a gate says FAIL");
});

test("open decisions come first, then blocking questions", (t) => {
  const f = fixture(t);
  const doc = f.load("define");
  (doc.open_questions ||= []).push({ id: "QZ", text: "Which currency is the price in?", blocking: true, owner: "you" });
  // An open decision (no `chosen`) in the same step.
  (doc.decisions ||= []).push({
    id: "D9", question: "Which context owns the price?", kind: "ownership",
    options: [{ id: "A", summary: "Subscriptions owns it." }, { id: "B", summary: "Billing owns it." }],
    confidence: "low", made_by: "strategist",
  });
  f.save("define", doc);
  const { page } = build(f);
  assert.match(page, /Which currency is the price in\?/);
  assert.match(page, /Which context owns the price\?/);
  // Compare the CARDS, not the filter buttons that repeat the same labels.
  const kinds = cardKinds(page);
  assert.ok(kinds.length, "no worklist cards rendered");
  assert.deepEqual(kinds, [...kinds].sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b)), `worklist is not in the printed order: ${kinds.slice(0, 12)}`);
  assert.equal(kinds[0], "decision", "the first card is not an open decision");
  assert.equal(kinds.find((k) => k !== "decision"), "blocking", "the first card after the open decisions is not a blocking question");
  // The decision card links to the decision's own anchor, never a bare #D9 that may
  // belong to another collection.
  const cards = [...page.matchAll(/class="card k-decision"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  const card = cards.find((c) => c.includes("Which context owns the price?"));
  assert.ok(card, "no card for the new open decision");
  assert.match(card, /href="#[a-z]+-D9"|href="#D9"/, "the open decision card does not link to its row");
});

test("blocking questions come first when nothing is undecided", (t) => {
  const f = fixture(t);
  // The fixture may ship with open decisions of its own; close them so the blocking
  // question is the worst thing on the list.
  for (const s of STEPS) {
    const doc = f.load(s);
    for (const d of doc.decisions || []) if (!d.chosen && d.options && d.options.length) d.chosen = d.options[0].id;
    f.save(s, doc);
  }
  const doc = f.load("define");
  (doc.open_questions ||= []).push({ id: "QZ", text: "Which currency is the price in?", blocking: true, owner: "you" });
  f.save("define", doc);
  const { page } = build(f);
  const kinds = cardKinds(page);
  assert.equal(kinds[0], "blocking", "the first card is not a blocking question");
});

test("an unknown key is shown, not dropped", (t) => {
  // The chain grows keys. A reviewer must still see them.
  const f = fixture(t);
  const doc = f.load("decompose");
  doc.some_future_key = ["a value nobody has taught review.mjs about"];
  f.save("decompose", doc);
  const { page } = build(f);
  assert.match(page, /a value nobody has taught review\.mjs about/);
});

test("it runs on a half-finished run", (t) => {
  const f = fixture(t);
  fs.rmSync(path.join(f.ddd, "09-contracts"), { recursive: true });
  fs.rmSync(path.join(f.ddd, "08-code"), { recursive: true });
  const { page } = build(f);
  assert.match(page, /not run/, "missing steps are not shown as missing");
  for (const id of ["verdict", "worklist", "decisions", "shape", "diagrams", "domain", "stores", "words", "steps", "canvases", "contracts", "flows", "artifacts", "everything"]) {
    assert.ok(page.includes(`<section id="${id}"`), `section #${id} missing on a half-finished run`);
  }
});

test("page is self-contained", (t) => {
  const f = fixture(t);
  const { page } = build(f);
  // Namespace identifiers (xmlns) and the JSON Schema dialect id are names, not
  // resources the page fetches; everything else that looks like a URL is a failure.
  const stripped = page.replace(/https?:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink)/g, "").replace(/https?:\/\/json-schema\.org\S*/g, "");
  for (const bad of ["http://", "https://", "<script src", "<link "]) {
    assert.ok(!stripped.includes(bad), `page reaches outside itself: ${bad}`);
  }
  assert.ok(page.includes("<script>"), "the runtime is not embedded");
  assert.match(page, /svg\[data-diagram\]\{/, "the diagram theme is not embedded");
});

test("note-trace is a prompt, not an accusation", (t) => {
  const f = fixture(t);
  const { page } = build(f);
  if (page.includes("Check this was heard")) {
    assert.match(page, /never names it/);
    // The wording under test is the page's own, in the exhibit list; the run's JSON
    // may say "ignored" about anything and that is quoted, not written here.
    const list = /<section id="worklist"[\s\S]*?<\/section>/.exec(page)[0].toLowerCase();
    assert.ok(!list.includes("ignored"), "the note-trace wording accuses");
  }
});
