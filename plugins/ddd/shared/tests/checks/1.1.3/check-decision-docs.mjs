#!/usr/bin/env node
// G3 for leaf 1.1.3: the three documents that teach the chain about decisions[] all describe it.
//   artifact-contract.md section 3 (the envelope), modes.md section 3b (the strategist), and the
//   strategist agent's "Landing it back in the chain" block.
// Greps are scoped to the section, so an incidental mention elsewhere in a file cannot pass.
//
// Usage: node plugins/ddd/shared/tests/checks/1.1.3/check-decision-docs.mjs
// Exit 0 on pass, 1 on failure, 2 on misuse.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.argv.length > 2) {
  console.error("usage: node check-decision-docs.mjs   (no arguments)");
  process.exit(2);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = join(HERE, "..", "..", "..");
const PLUGIN = join(SHARED, "..");
const CONTRACT = join(SHARED, "references", "artifact-contract.md");
const MODES = join(SHARED, "references", "modes.md");
const AGENT = join(PLUGIN, "agents", "ddd-decision-strategist.md");

const failures = [];
const fail = (m) => failures.push(m);

function read(path) {
  if (!existsSync(path)) {
    fail(`missing file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function section(text, label, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  if (start === -1) {
    fail(`${label}: heading not found: ${startHeading}`);
    return "";
  }
  const end = text.indexOf(endHeading, start + startHeading.length);
  return text.slice(start, end === -1 ? undefined : end);
}

function mustMention(label, text, needles) {
  for (const n of needles) if (!text.includes(n)) fail(`${label} does not mention ${n}`);
}

const COMMON = ["`decisions[]`", "`chosen`", "`records", "`would_flip_if`"];

// artifact-contract.md section 3
const contract = read(CONTRACT);
const s3 = section(contract, "artifact-contract.md section 3", "\n## 3. Common envelope", "\n## 4. ");
mustMention("artifact-contract.md section 3", s3, [
  ...COMMON,
  "`records.open_question`",
  "`made_by`",
  "`supersedes`",
  "`options[].diagram`",
  "side by side",
  "`notes_for_downstream[]`",
  "`plain_words`",
]);
if (!/No `chosen` means the decision is still open/.test(s3)) fail("artifact-contract.md section 3 does not say that no chosen means open");
if (!/`validate` checks/.test(s3)) fail("artifact-contract.md section 3 does not say what validate checks");
const s1 = section(contract, "artifact-contract.md section 1", "\n## 1. Workspace layout", "\n## 2. ");
mustMention("artifact-contract.md section 1", s1, ["<NN-step>/decisions/<Did>-<opt>.<type>.json", "diagrams/"]);

// modes.md section 3b
const modes = read(MODES);
const s3b = section(modes, "modes.md section 3b", "\n## 3b. ", "\n## 4. ");
mustMention("modes.md section 3b", s3b, [
  ...COMMON,
  "`made_by`",
  "`assumptions[]`",
  "`blocking: true`",
  "`ddd decision render <ddd-dir> <Did>`",
  "`ddd/diagrams/decisions/<Did>.png`",
  "Read it before choosing",
]);
if (!/every option/.test(s3b)) fail("modes.md section 3b does not ask for every option, not only the chosen one");

// agent landing block
const agent = read(AGENT);
const landing = section(agent, "agent landing block", "\n## Landing it back in the chain", "\n## Tone");
mustMention("agent landing block", landing, [
  ...COMMON,
  "`made_by: strategist`",
  "`assumptions[]`",
  "`open_questions[]`",
  "`notes_for_downstream[]`",
]);
if (!/not only the winner/.test(landing)) fail("agent landing block does not ask for every option, not only the winner");

// house rule: nothing this leaf wrote may use an em dash. The agent file is checked whole; the two
// reference files predate the rule, so only the sections this leaf owns are held to it.
if (agent.includes("—")) fail("agent file contains an em dash");
for (const [label, text] of [["artifact-contract.md decisions[] bullet", s3.slice(s3.indexOf("- `decisions[]`"))], ["modes.md section 3b", s3b]]) {
  if (text.includes("—")) fail(`${label} contains an em dash`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`decision-docs verification failed (${failures.length})`);
  process.exit(1);
}
console.log("artifact-contract.md section 1 and 3, modes.md section 3b and the strategist landing block all describe decisions[]");
console.log("decision-docs verification passed");
