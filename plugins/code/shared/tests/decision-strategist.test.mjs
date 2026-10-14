// The ddd-decision-strategist persona.
//
// modes.md section 3b tells all nine skills to dispatch this subagent for any call the artifacts
// do not settle. That reference rots silently if the file is renamed or its frontmatter drifts,
// and a skill would then quietly go back to deciding alone. These tests are the link check.
//
// Carried from test_decision_strategist.py: same seven assertions, plus one for the decisions[]
// landing block. Run: node --test plugins/code/shared/tests/decision-strategist.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const SHARED = dirname(dirname(fileURLToPath(import.meta.url)));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || dirname(SHARED);
const SKILLS = join(PLUGIN_ROOT, "skills");
const AGENT = join(PLUGIN_ROOT, "agents", "ddd-decision-strategist.md");
const MODES = join(SHARED, "references", "modes.md");

function frontmatter(path) {
  const text = readFileSync(path, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split("\n")) {
    if (line.includes(":") && !/^[ \t-]/.test(line)) {
      const i = line.indexOf(":");
      fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { fm, body: text.slice(m[0].length) };
}

function section(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  assert.notEqual(start, -1, `heading not found: ${startHeading}`);
  const end = text.indexOf(endHeading, start + startHeading.length);
  return text.slice(start, end === -1 ? undefined : end);
}

test("the agent file exists where modes says", () => {
  assert.ok(existsSync(AGENT), `missing: ${AGENT}`);
});

test("frontmatter is usable", () => {
  const { fm } = frontmatter(AGENT);
  assert.equal(fm.name, "ddd-decision-strategist");
  assert.ok((fm.description || "").length > 200,
    "description is what makes it trigger; it needs the decision vocabulary");
  assert.ok((fm.tools || "").includes("Read"), "it must be able to read the workspace");
});

test("it cannot write artifacts", () => {
  // It advises, the step records. A write tool would let it edit the chain behind the step.
  const { fm } = frontmatter(AGENT);
  for (const banned of ["Write", "Edit", "NotebookEdit"]) {
    assert.ok(!(fm.tools || "").includes(banned),
      `${banned} would let the strategist change artifacts it is only meant to advise on`);
  }
});

test("the output contract is all there", () => {
  const { body } = frontmatter(AGENT);
  for (const need of ["3 strongest options", "Pros and cons", "Hidden risks",
    "Short-term vs long-term", "still need", "recommended option", "3 questions"]) {
    assert.ok(body.includes(need), `the answer format lost: ${need}`);
  }
});

test("it is told not to just agree", () => {
  const { body } = frontmatter(AGENT);
  assert.ok(body.includes("Never agree by default"));
  assert.ok(body.replaceAll("**", "").includes("against your own recommendation"));
});

test("modes and workflow point at the real name", () => {
  for (const path of [MODES, join(SKILLS, "ddd", "SKILL.md")]) {
    assert.ok(readFileSync(path, "utf8").includes("ddd-decision-strategist"),
      `${basename(path)} does not name the agent`);
  }
});

test("no em dashes in the persona", () => {
  const { body } = frontmatter(AGENT);
  assert.ok(!body.includes("—"), "house rule: no em dashes");
});

test("the landing block names the decisions[] entry", () => {
  // A decision that is not in the JSON did not happen. The landing block must tell the step to
  // record the decisions[] entry with every option, next to the assumption or blocking question.
  const { body } = frontmatter(AGENT);
  const landing = section(body, "## Landing it back in the chain", "## Tone");
  for (const need of ["`decisions[]`", "`chosen`", "`records`", "`would_flip_if`", "`made_by: strategist`"]) {
    assert.ok(landing.includes(need), `the landing block does not mention ${need}`);
  }
  assert.ok(/not only the winner/.test(landing), "the landing block must ask for every option, not only the chosen one");
});
