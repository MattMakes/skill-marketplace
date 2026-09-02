#!/usr/bin/env node
// Root G10: the nineteen tests carried over from the Python suite exist by name under
// `node --test`: test_review.py x7, test_decision_strategist.py x7, test_channels.py x5. Names
// are compared after normalising case, punctuation and the Python `test_` prefix; the one test
// the Node port renamed while keeping its subject ("blocking questions come first") is matched
// as a prefix, and the port's extra tests are allowed but not required.
//
// Usage: node plugins/ddd/shared/tests/checks/root/check-carried-tests.mjs
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "carried-tests verification passed";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TESTS = path.resolve(HERE, "..", "..");
const CARRIED = {
  "review.test.mjs": [
    "test_looking_at_a_run_never_changes_it",
    "test_a_failing_gate_cannot_be_reported_as_fine",
    "test_blocking_questions_come_first",
    "test_an_unknown_key_is_shown_not_dropped",
    "test_it_runs_on_a_half_finished_run",
    "test_page_is_self_contained",
    "test_note_trace_is_a_prompt_not_an_accusation",
  ],
  "decision-strategist.test.mjs": [
    "test_the_agent_file_exists_where_modes_says",
    "test_frontmatter_is_usable",
    "test_it_cannot_write_artifacts",
    "test_the_output_contract_is_all_there",
    "test_it_is_told_not_to_just_agree",
    "test_modes_and_workflow_point_at_the_real_name",
    "test_no_em_dashes_in_the_persona",
  ],
  "channels.test.mjs": [
    "test_prefill_writes_channel_objects",
    "test_no_channel_detail_is_dropped",
    "test_both_gates_accept_the_object_form",
    "test_check_rejects_a_bare_transport_name",
    "test_render_shows_what_the_extra_channel_promises",
  ],
};

if (process.argv.length > 2) {
  console.error("usage: node plugins/ddd/shared/tests/checks/root/check-carried-tests.mjs");
  process.exit(2);
}
const norm = (s) => s.toLowerCase().replace(/^test_/, "").replace(/[^a-z0-9]+/g, " ").trim();
const failures = [];
let found = 0;
let total = 0;
for (const [file, names] of Object.entries(CARRIED)) {
  const abs = path.join(TESTS, file);
  if (!fs.existsSync(abs)) { failures.push(`${file}: missing`); total += names.length; continue; }
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", abs], { encoding: "utf8" });
  const tap = (r.stdout || "") + (r.stderr || "");
  const passed = [...tap.matchAll(/^ok \d+ - (.+)$/gm)].map((m) => norm(m[1]));
  const failed = [...tap.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => norm(m[1]));
  for (const name of names) {
    total++;
    const want = norm(name);
    if (passed.some((p) => p === want || p.startsWith(want))) { found++; continue; }
    if (failed.some((p) => p === want || p.startsWith(want))) failures.push(`${file}: ${name} exists but fails`);
    else failures.push(`${file}: ${name} not found (have: ${passed.concat(failed).join(" | ") || "nothing"})`);
  }
  if (r.status !== 0) failures.push(`${file}: node --test exited ${r.status}`);
}
if (failures.length) {
  console.log(`carried-tests verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${found}/${total} carried tests present and passing (review 7, decision-strategist 7, channels 5)`);
console.log(MARKER);
