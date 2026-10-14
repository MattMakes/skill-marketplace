#!/usr/bin/env node
// G3 for leaf 1.1.2: the decisions[] checks from design §5 fire in `ddd validate`.
// Errors: duplicate id, `chosen` not an option, `records.assumption` /
// `records.open_question` unresolved, `supersedes` unresolved. Warnings: an
// `options[].diagram` path missing on disk, a strategist call with no records link.
// A valid record (and an open one, and one whose links all resolve) passes clean.
//
// Every case is run in-process on a temp copy of the meal-kit example with
// `persist:false`, on decompose.json (assumptions A1, open_questions Q1), and one
// case is run through the CLI so the errors are seen to reach `--json` and the exit
// code. Each injected decision is schema-valid apart from the one defect under test,
// otherwise the schema failure would skip the semantic checks and hide the assertion.
//
// Usage: node plugins/code/shared/tests/checks/1.1.2/check-decisions-validate.mjs   (no arguments)
// Exit 0 on pass, 1 on a failed assertion, 2 on misuse.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RUN_ENV, DEFAULT_TWIN } from "../../golden.mjs";
import { materialise } from "../../fixtures/build.mjs";
import { validate } from "../../../lib/validate.mjs";

if (process.argv.length > 2) {
  console.error("usage: node check-decisions-validate.mjs   (no arguments)");
  console.error("Runs the decisions[] validate checks on a temp copy of the meal-kit example.");
  process.exit(2);
}

const failures = [];
const fail = (msg) => failures.push(msg);
const log = (msg) => console.log(msg);

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "ddd-check-decisions-"));
const root = materialise("mealkit", tmpBase);
const dir = path.join(root, "ddd");
const DECOMPOSE = path.join(dir, "03-decompose", "decompose.json");
const UNDERSTAND = path.join(dir, "01-understand", "understand.json");
const DIAGRAM = "ddd/03-decompose/decisions/D1-A.architecture.json";

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const originals = { [DECOMPOSE]: fs.readFileSync(DECOMPOSE, "utf8"), [UNDERSTAND]: fs.readFileSync(UNDERSTAND, "utf8") };

// A complete, schema-valid, fully linked record; each case overrides one thing.
function valid(over = {}) {
  return {
    id: "D1",
    question: "Which context owns the subscription week?",
    kind: "ownership",
    options: [
      { id: "A", summary: "subscriptions owns it", pros: ["one writer"], cons: [], risks: [] },
      { id: "B", summary: "fulfilment owns it", pros: [], cons: ["two writers"], risks: ["split brain"] },
    ],
    chosen: "A",
    confidence: "medium",
    rationale: "the week is a subscriber promise before it is a parcel",
    would_flip_if: ["packing drives the calendar"],
    made_by: "strategist",
    records: { assumption: "A1", open_question: "Q1" },
    ...over,
  };
}

// Run validate with the given decisions on decompose (and optionally understand),
// with persist:false so the copy is reusable; the files are restored afterwards.
function runCase(decisions, { understandDecisions = null, strict = false } = {}) {
  try {
    const dc = readJson(DECOMPOSE);
    dc.decisions = decisions;
    writeJson(DECOMPOSE, dc);
    if (understandDecisions) {
      const u = readJson(UNDERSTAND);
      u.decisions = understandDecisions;
      writeJson(UNDERSTAND, u);
    }
    const before = fs.readFileSync(path.join(dir, "manifest.json"), "utf8");
    const report = validate(dir, { persist: false, strict });
    if (fs.readFileSync(path.join(dir, "manifest.json"), "utf8") !== before) fail("persist:false wrote manifest.json during a decisions case");
    return report;
  } finally {
    for (const [p, text] of Object.entries(originals)) fs.writeFileSync(p, text);
  }
}

const errorsOf = (r) => r.errors.filter(([s]) => s === "decompose").map(([, m]) => m);
const warningsOf = (r) => r.warnings.filter(([s]) => s === "decompose").map(([, m]) => m);

function expectClean(name, report) {
  const e = errorsOf(report);
  const w = warningsOf(report);
  if (e.length || w.length) fail(`${name}: expected no decompose errors or warnings, got errors=${JSON.stringify(e)} warnings=${JSON.stringify(w)}`);
  else if (!report.ok || report.exitCode !== 0) fail(`${name}: report not ok`);
  else log(`ok   ${name}`);
}

function expectError(name, report, message) {
  const e = errorsOf(report);
  if (!e.includes(message)) fail(`${name}: expected error ${JSON.stringify(message)}, got ${JSON.stringify(e)}`);
  else if (report.ok || report.exitCode !== 1) fail(`${name}: an error must make the report fail (ok=${report.ok}, exitCode=${report.exitCode})`);
  else log(`ok   ${name}`);
}

function expectWarning(name, report, message) {
  const w = warningsOf(report);
  const e = errorsOf(report);
  if (!w.includes(message)) fail(`${name}: expected warning ${JSON.stringify(message)}, got ${JSON.stringify(w)}`);
  else if (e.length) fail(`${name}: expected no errors, got ${JSON.stringify(e)}`);
  else if (!report.ok || report.exitCode !== 0) fail(`${name}: a warning alone must not fail the run`);
  else log(`ok   ${name}`);
}

try {
  // Precondition: the example itself is clean, so anything reported below comes from
  // the injected decisions.
  const baseline = validate(dir, { persist: false });
  if (baseline.errors.length || baseline.warnings.length) {
    fail(`baseline mealkit is not clean: ${JSON.stringify(baseline.errors)} ${JSON.stringify(baseline.warnings)}`);
  }

  // Passing records.
  expectClean("valid record passes", runCase([valid()]));
  expectClean("open decision (no chosen) passes", runCase([valid({ chosen: undefined, made_by: "step", records: undefined })]));
  expectClean("two decisions with distinct ids pass", runCase([valid(), valid({ id: "D2", question: "Second call?", kind: "boundary" })]));
  expectClean("supersedes resolving to an upstream decision passes",
    runCase([valid({ supersedes: "understand:D1" })], { understandDecisions: [valid({ kind: "foundation", records: undefined, made_by: "user" })] }));
  {
    const abs = path.join(root, DIAGRAM);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "{}\n");
    const d = valid();
    d.options[0].diagram = DIAGRAM;
    expectClean("options[].diagram present on disk passes", runCase([d]));
    fs.rmSync(path.dirname(abs), { recursive: true, force: true });
  }
  expectClean("user decision without records passes", runCase([valid({ made_by: "user", records: undefined })]));

  // Errors.
  expectError("duplicate id", runCase([valid(), valid()]), "decisions: duplicate id 'D1'");
  expectError("chosen not an option", runCase([valid({ chosen: "C" })]), "decisions[D1].chosen: unknown reference 'C'");
  expectError("records.assumption unresolved", runCase([valid({ records: { assumption: "A9", open_question: "Q1" } })]),
    "decisions[D1].records.assumption: unknown reference 'A9'");
  expectError("records.open_question unresolved", runCase([valid({ records: { assumption: "A1", open_question: "Q9" } })]),
    "decisions[D1].records.open_question: unknown reference 'Q9'");
  expectError("supersedes unresolved (missing decision)", runCase([valid({ supersedes: "understand:D7" })]),
    "decisions[D1].supersedes: unknown reference 'understand:D7'");
  expectError("supersedes unresolved (unknown step)", runCase([valid({ supersedes: "nowhere:D1" })]),
    "decisions[D1].supersedes: unknown reference 'nowhere:D1'");
  expectError("supersedes unresolved (no step prefix)", runCase([valid({ supersedes: "D1" })]),
    "decisions[D1].supersedes: unknown reference 'D1'");
  {
    // Assumptions and open questions are step-local: understand's ids do not satisfy
    // a decompose decision. A2 exists only in contracts.json.
    expectError("records resolve within the step only", runCase([valid({ records: { assumption: "A2" } })]),
      "decisions[D1].records.assumption: unknown reference 'A2'");
  }

  // Warnings.
  {
    const d = valid();
    d.options[0].diagram = DIAGRAM;
    expectWarning("options[].diagram missing on disk", runCase([d]),
      `decisions[D1].options[A].diagram '${DIAGRAM}' not found on disk`);
  }
  expectWarning("strategist decision with no records link", runCase([valid({ records: undefined })]),
    "decisions[D1] was made by the strategist but records no assumption or open question: downstream steps key off those and will not see this call");
  expectWarning("strategist decision with empty records", runCase([valid({ records: {} })]),
    "decisions[D1] was made by the strategist but records no assumption or open question: downstream steps key off those and will not see this call");
  {
    const r = runCase([valid({ records: undefined })], { strict: true });
    if (r.ok || r.exitCode !== 1) fail("--strict: the strategist warning should fail the run");
    else log("ok   --strict turns the warning into a failure");
  }

  // One case through the CLI: the error reaches --json and the exit code.
  {
    const dc = readJson(DECOMPOSE);
    dc.decisions = [valid({ chosen: "C" })];
    writeJson(DECOMPOSE, dc);
    try {
      const res = spawnSync(process.execPath, [DEFAULT_TWIN, "validate", "ddd", "--json"], { cwd: root, env: { ...process.env, ...RUN_ENV }, encoding: "utf8" });
      if (res.error) throw res.error;
      let out = null;
      try { out = JSON.parse(res.stdout); } catch { fail(`cli: --json output is not JSON:\n${res.stdout}\n${res.stderr}`); }
      if (out) {
        const hit = out.errors.some(([s, m]) => s === "decompose" && m === "decisions[D1].chosen: unknown reference 'C'");
        if (!hit || out.ok !== false || res.status !== 1) fail(`cli: expected the chosen error, ok=false and exit 1; got exit ${res.status}, ok=${out.ok}, errors=${JSON.stringify(out.errors)}`);
        else log("ok   cli --json reports the error and exits 1");
      }
      const text = spawnSync(process.execPath, [DEFAULT_TWIN, "validate", "ddd"], { cwd: root, env: { ...process.env, ...RUN_ENV }, encoding: "utf8" });
      if (!/^  \[decompose\] decisions\[D1\]\.chosen: unknown reference 'C'$/m.test(text.stdout) || !/^RESULT: FAIL$/m.test(text.stdout) || text.status !== 1) {
        fail(`cli: plain output should list the error and FAIL:\n${text.stdout}`);
      } else log("ok   cli plain output lists the error and fails");
    } finally {
      fs.writeFileSync(DECOMPOSE, originals[DECOMPOSE]);
    }
  }
} finally {
  fs.rmSync(tmpBase, { recursive: true, force: true });
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`decisions-validate verification failed (${failures.length})`);
  process.exit(1);
}
console.log("decisions-validate verification passed");
