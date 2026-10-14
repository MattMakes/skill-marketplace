#!/usr/bin/env node
// G3 for leaf 1.1.1: jsonschema.mjs produces the same messages as the Python subset
// validators on the fixture set under fixtures/, negative controls included.
//
// Each fixture is `{ name, value, schema, mustFail?, mustPass?, expect }` where
// `expect` holds what the Python produced: `check` (contracts.py check_schema), `core`
// (validate.py check_schema, or null when it raised on a keyword it never knew),
// `vocab` (vocab_problems) and `conditional` (has_conditional). While python3 and the
// Python scripts exist, the expectations are recomputed at check time and must agree
// with the stored copy, so a fixture cannot go stale unnoticed; after leaf 1.4.1
// deletes the scripts, the stored copy is the oracle. `--update` rewrites the stored
// expectations from Python.
//
// Controls: the meal-kit charge-card negative examples must fail their schema; a
// non-keyword such as `response` at a schema position must be reported; and the
// check's own must-fail assertion must flag a negative example that validates.
//
// Usage: node plugins/code/shared/tests/checks/1.1.1/check-jsonschema.mjs [--update]
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkSchema, checkSchemaCore, hasConditional, vocabProblems } from "../../../lib/jsonschema.mjs";

const MARKER = "jsonschema verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, "..", "..", "..", "..");
const FIXTURES = path.join(HERE, "fixtures");
const VALIDATE_PY = path.join(PLUGIN, "shared", "scripts", "validate.py");
const CONTRACTS_PY = path.join(PLUGIN, "skills", "ddd-contracts", "scripts", "contracts.py");
const MEALKIT = path.join(PLUGIN, "shared", "examples", "mealkit", "ddd", "09-contracts");

const args = process.argv.slice(2);
const update = args.includes("--update");
if (args.some((a) => a !== "--update")) {
  console.error("usage: node plugins/code/shared/tests/checks/1.1.1/check-jsonschema.mjs [--update]");
  process.exit(2);
}

const failures = [];
const fail = (m) => failures.push(m);

// The Python oracle: import both scripts without running main() and evaluate one
// fixture read from stdin.
const DRIVER = `
import importlib.util, json, sys
def load(name, p):
    spec = importlib.util.spec_from_file_location(name, p)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
validate = load("ddd_validate", sys.argv[1])
contracts = load("ddd_contracts", sys.argv[2])
fx = json.load(sys.stdin)
out = {}
probs = []
contracts.check_schema(fx["value"], fx["schema"], fx.get("path", "payload"), probs)
out["check"] = probs
try:
    core = []
    validate.check_schema(fx["value"], fx["schema"], fx.get("path", "payload"), core)
    out["core"] = core
except Exception:
    out["core"] = None
vocab = []
contracts.vocab_problems(fx["schema"], "schema", vocab)
out["vocab"] = vocab
out["conditional"] = contracts.has_conditional(fx["schema"])
json.dump(out, sys.stdout, ensure_ascii=False)
`;

function pythonAvailable() {
  if (!fs.existsSync(VALIDATE_PY) || !fs.existsSync(CONTRACTS_PY)) return false;
  const r = spawnSync("python3", ["--version"], { encoding: "utf8" });
  return !r.error && r.status === 0;
}

function runPython(fixture) {
  const r = spawnSync("python3", ["-c", DRIVER, VALIDATE_PY, CONTRACTS_PY], {
    input: JSON.stringify(fixture),
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (r.error || r.status !== 0) throw new Error(`python3 failed on ${fixture.name}: ${r.error ? r.error.message : r.stderr}`);
  return JSON.parse(r.stdout);
}

function runNode(fixture) {
  const p = fixture.path ?? "payload";
  const check = [];
  checkSchema(fixture.value, fixture.schema, p, check);
  const core = [];
  checkSchemaCore(fixture.value, fixture.schema, p, core);
  const vocab = [];
  vocabProblems(fixture.schema, "schema", vocab);
  return { check, core, vocab, conditional: hasConditional(fixture.schema) };
}

function sameList(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
}

function diffLists(label, expected, actual) {
  const lines = [];
  const n = Math.max(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    if (expected[i] === actual[i]) continue;
    lines.push(`  ${label}[${i}]\n    python: ${JSON.stringify(expected[i] ?? null)}\n    node:   ${JSON.stringify(actual[i] ?? null)}`);
  }
  return lines.join("\n");
}

// The must-fail assertion, written as a function so it can be tested on itself: a
// negative example that validates must come back as a failure.
function mustFailProblem(fixtureName, problems) {
  return problems.length === 0 ? `${fixtureName}: negative example VALIDATES against the schema, so the rule it should prove is unenforced` : null;
}

// ---------------------------------------------------------------------------
const havePython = pythonAvailable();
if (update && !havePython) {
  console.error("error: --update needs python3 and the Python scripts");
  process.exit(2);
}
const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json")).sort();
if (files.length === 0) fail(`no fixtures under ${FIXTURES}`);

let compared = 0;
for (const f of files) {
  const file = path.join(FIXTURES, f);
  const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
  const name = fixture.name ?? f;
  const node = runNode(fixture);
  let expect = fixture.expect;
  if (havePython) {
    const py = runPython(fixture);
    if (update) {
      fixture.expect = py;
      fs.writeFileSync(file, JSON.stringify(fixture, null, 2) + "\n");
      expect = py;
    } else if (!expect) {
      fail(`${name}: no stored expectations (run with --update)`);
      expect = py;
    } else {
      // The stored copy must still be what Python says, otherwise the check would
      // keep passing against a fixture nobody re-recorded.
      const stale = [];
      if (!sameList(expect.check, py.check)) stale.push("check");
      if (!(expect.core === null && py.core === null) && !sameList(expect.core ?? [], py.core ?? [])) stale.push("core");
      if (!sameList(expect.vocab, py.vocab)) stale.push("vocab");
      if (expect.conditional !== py.conditional) stale.push("conditional");
      if (stale.length) fail(`${name}: stored expectations differ from python3 for ${stale.join(", ")} (rerun with --update)`);
      expect = py;
    }
  } else if (!expect) {
    fail(`${name}: no stored expectations and python3 is unavailable`);
    continue;
  }
  compared++;
  if (!sameList(expect.check, node.check)) fail(`${name}: checkSchema messages differ\n${diffLists("check", expect.check, node.check)}`);
  if (expect.core !== null && !sameList(expect.core, node.core)) fail(`${name}: checkSchemaCore messages differ\n${diffLists("core", expect.core, node.core)}`);
  if (!sameList(expect.vocab, node.vocab)) fail(`${name}: vocabProblems messages differ\n${diffLists("vocab", expect.vocab, node.vocab)}`);
  if (expect.conditional !== node.conditional) fail(`${name}: hasConditional is ${node.conditional}, python says ${expect.conditional}`);
  if (fixture.mustFail) {
    const p = mustFailProblem(name, node.check);
    if (p) fail(p);
  }
  if (fixture.mustPass && node.check.length) fail(`${name}: must validate but got: ${node.check.join(" | ")}`);
  if (fixture.expectVocabProblem && !node.vocab.some((m) => m.includes(fixture.expectVocabProblem))) {
    fail(`${name}: vocabProblems did not report ${JSON.stringify(fixture.expectVocabProblem)}`);
  }
}

// Live controls on the shipped example workspace (no Python needed).
let negatives = 0;
if (fs.existsSync(MEALKIT)) {
  for (const f of fs.readdirSync(path.join(MEALKIT, "examples")).filter((n) => n.endsWith(".invalid.json")).sort()) {
    const stem = f.slice(0, -".invalid.json".length);
    const schema = JSON.parse(fs.readFileSync(path.join(MEALKIT, "schemas", `${stem}.schema.json`), "utf8"));
    const cases = JSON.parse(fs.readFileSync(path.join(MEALKIT, "examples", f), "utf8"));
    cases.forEach((c, i) => {
      negatives++;
      const probs = [];
      checkSchema(c.payload, schema, "payload", probs);
      const p = mustFailProblem(`mealkit ${stem} negative ${i} ('${c.why}')`, probs);
      if (p) fail(p);
    });
    const example = JSON.parse(fs.readFileSync(path.join(MEALKIT, "examples", `${stem}.json`), "utf8"));
    const probs = [];
    checkSchema(example, schema, "payload", probs);
    if (probs.length) fail(`mealkit ${stem}: the valid example fails: ${probs.join(" | ")}`);
    // The self-test of the must-fail assertion: hand it the valid example's (empty)
    // problem list as if it were a negative example; it has to complain.
    if (!mustFailProblem(`mealkit ${stem} control`, probs)) fail("the must-fail assertion accepted a negative example that validates");
  }
} else {
  fail(`example workspace not found at ${MEALKIT}`);
}

// A non-keyword at a schema position is always an error.
const vocab = [];
vocabProblems({ type: "object", response: { type: "string" }, properties: { a: { type: "string", parameters: {} } } }, "schema", vocab);
if (!vocab.some((m) => m.startsWith("schema: 'response' is not a JSON Schema keyword"))) fail("non-keyword `response` at the schema root was not reported");
if (!vocab.some((m) => m.startsWith("schema.properties.a: 'parameters' is not a JSON Schema keyword"))) fail("non-keyword `parameters` under properties.a was not reported");

console.log(`${compared} fixture(s) compared ${havePython ? "against python3 and the stored expectations" : "against the stored expectations (python3 absent)"}, ${negatives} mealkit negative example(s) rejected`);
if (failures.length) {
  for (const f of failures) console.log(`FAIL: ${f}`);
  console.log(`${failures.length} failure(s)`);
  process.exit(1);
}
console.log(MARKER);
