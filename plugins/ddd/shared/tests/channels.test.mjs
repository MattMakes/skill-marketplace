// Defect 1: `entries[].channels`.
//
// connect.json records an extra transport as an object: `{via, sync, delivery, note}`.
// contracts.json used to flatten it to a bare name, which silently deleted the second
// transport's delivery guarantee and the sentence explaining why it exists. The contract
// entry is the last artifact in the chain and is meant to stand alone, so the detail has
// to survive the hop.
//
// Carried 1:1 from test_channels.py against the Node tool: prefill writes objects, no field
// is dropped, both gates accept the same value, check rejects a bare name, and the rendered
// Markdown shows what the extra channel actually promises. Every test works on a throwaway
// copy of the shipped meal-kit fixture, as helpers.py did.
//
// Run: node --test --test-reporter=tap plugins/ddd/shared/tests/channels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TESTS = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(TESTS, "..", "..");
const FIXTURE = path.join(PLUGIN_ROOT, "shared", "examples", "mealkit");
const BIN = path.join(PLUGIN_ROOT, "shared", "bin", "ddd.mjs");
// The validate half of "both gates" is leaf 1.1.2's port; the test needs it present.
const VALIDATE_MJS = path.join(PLUGIN_ROOT, "shared", "lib", "validate.mjs");

const STEPS = ["understand", "discover", "decompose", "strategize", "connect", "organise", "define", "code", "contracts"];
const FOLDER = Object.fromEntries(STEPS.map((s, i) => [s, `${String(i + 1).padStart(2, "0")}-${s}`]));

const CHANNEL = {
  via: "file",
  sync: false,
  delivery: "at-most-once",
  note: "the warehouse also picks the week up from the nightly pick-list file",
};

// Run a chain command and return [returncode, stdout+stderr], as helpers.run did.
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1", TZ: "UTC" } });
  if (r.error) throw r.error;
  return [r.status, r.stdout + r.stderr];
}

// A test case with `root` (project root) and `ddd` (workspace), on a fresh copy of the fixture.
function fixtureCase(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-test-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const root = path.join(tmp, "mealkit");
  fs.cpSync(FIXTURE, root, { recursive: true });
  const ddd = path.join(root, "ddd");
  const self = {
    root,
    ddd,
    path: (step) => path.join(ddd, FOLDER[step], `${step}.json`),
    load: (step) => JSON.parse(fs.readFileSync(self.path(step), "utf8")),
    save: (step, doc) => fs.writeFileSync(self.path(step), JSON.stringify(doc, null, 2) + "\n"),
    entry(eid, doc) {
      doc = doc || self.load("contracts");
      const found = (doc.entries || []).filter((e) => e.id === eid);
      assert.equal(found.length, 1, `expected exactly one '${eid}' entry`);
      return found[0];
    },
    read: (...parts) => fs.readFileSync(path.join(ddd, ...parts), "utf8"),
    // ---- the two gates ----
    contracts: (cmd, ...extra) => run(process.execPath, [BIN, "contracts", cmd, ddd, ...extra], root),
    validate(...extra) {
      assert.ok(fs.existsSync(VALIDATE_MJS), `${VALIDATE_MJS} is missing: the validate gate is leaf 1.1.2's port`);
      return run(process.execPath, [BIN, "validate", ddd, ...extra], root);
    },
    // Put one extra channel on `week-charged` in connect.json.
    givenASecondTransport() {
      const cn = self.load("connect");
      const msg = cn.messages.find((m) => m.id === "week-charged");
      msg.channels = [{ ...CHANNEL }];
      self.save("connect", cn);
    },
    prefillFromScratch() {
      fs.rmSync(path.join(ddd, "09-contracts"), { recursive: true, force: true });
      const [rc, out] = self.contracts("prefill");
      assert.equal(rc, 0, out);
      return out;
    },
  };
  return self;
}

test("prefill writes channel objects", (t) => {
  const c = fixtureCase(t);
  c.givenASecondTransport();
  c.prefillFromScratch();
  const chans = c.entry("week-charged").channels;
  assert.ok(chans && chans.length, "week-charged lost its second transport entirely");
  for (const ch of chans) {
    assert.ok(ch !== null && typeof ch === "object" && !Array.isArray(ch),
      `channel ${JSON.stringify(ch)} is a bare name; the schema requires an object`);
    assert.ok("via" in ch, `channel ${JSON.stringify(ch)} has no \`via\``);
  }
});

test("no channel detail is dropped", (t) => {
  // The whole point: delivery, sync and the note reach the contract entry.
  const c = fixtureCase(t);
  c.givenASecondTransport();
  c.prefillFromScratch();
  const chan = c.entry("week-charged").channels.find((x) => x.via === "file");
  assert.ok(chan, "no `file` channel on week-charged");
  for (const key of ["sync", "delivery", "note"]) {
    assert.ok(key in chan, `connect recorded \`${key}\` on this channel and the contract dropped it`);
    assert.equal(chan[key], CHANNEL[key]);
  }
});

test("both gates accept the object form", (t) => {
  // The original defect: no value satisfied contracts check and the shared schema.
  const c = fixtureCase(t);
  c.givenASecondTransport();
  const doc = c.load("contracts");
  c.entry("week-charged", doc).channels = [{ ...CHANNEL }];
  c.save("contracts", doc);
  c.contracts("render");

  let [rc, out] = c.contracts("check");
  assert.ok(!out.toLowerCase().replaceAll("channels[]", "").includes("channels"),
    `contracts check rejected the object form:\n${out}`);
  assert.equal(rc, 0, out);

  [rc, out] = c.validate("--step", "contracts");
  assert.equal(rc, 0, `validate rejected the object form:\n${out}`);
});

test("check rejects a bare transport name", (t) => {
  // The flattened form must not pass silently: it is missing a required `via`.
  const c = fixtureCase(t);
  const doc = c.load("contracts");
  c.entry("week-charged", doc).channels = ["file"];
  c.save("contracts", doc);
  c.contracts("render");
  const [rc, out] = c.contracts("check");
  assert.notEqual(rc, 0, `a bare name passed the gate:\n${out}`);
  assert.ok(out.toLowerCase().includes("channel"));
});

test("render shows what the extra channel promises", (t) => {
  // A contract you can build from alone has to say more than "also via file".
  const c = fixtureCase(t);
  c.givenASecondTransport();
  const doc = c.load("contracts");
  c.entry("week-charged", doc).channels = [{ ...CHANNEL }];
  c.save("contracts", doc);
  const [rc, out] = c.contracts("render");
  assert.equal(rc, 0, out);
  const md = c.read("09-contracts", "contracts.md");
  assert.ok(md.includes("file"));
  assert.ok(md.includes(CHANNEL.delivery), "the extra channel's delivery guarantee is not rendered anywhere");
  assert.ok(md.includes("nightly pick-list file"), "the note explaining the extra channel is not rendered anywhere");
});
