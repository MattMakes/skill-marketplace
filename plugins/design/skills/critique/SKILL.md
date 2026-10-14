---
name: critique
description: Adversarial design critique of the current work — render it, look at it, and argue for rejection. Run after the gates are green, never instead of them.
disable-model-invocation: true
# The critic runs in a forked subagent: a fresh context that never sees the
# conversation that produced the work. That is the whole point. A critic that
# has read the maker's reasoning is reviewing the argument, not the artifact,
# and it agrees far too easily.
context: fork
# Wait for the verdict in this turn. Forked skills run in the background by
# default, which would hand the user a "started" message and no critique.
# Requires Claude Code v2.1.218 or later.
background: false
#
# The fork is generic and the body loads the critic's brief from the plugin's
# agents/ directory, so the same instructions back both this skill and the
# design:design-critic agent that other skills dispatch.
---
You are now running in a forked context. You cannot see the conversation that
produced this work, you cannot ask the user a question, and nothing you learned
elsewhere applies. Everything you need is below or on disk.

**Step 0 — runtime.** The scripts below need Playwright once per install:

```bash
npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium
```

Without it they print SKIPPED. Say so in the verdict rather than citing them.

**Step 1 — take the critic's instructions, in full.**

```bash
cat ${CLAUDE_PLUGIN_ROOT}/agents/design-critic.md
```

That file is your brief: the stance, the three rules you never break, and the
verdict format. Read it and follow it literally. If it is missing, say so and
stop rather than improvising a critique — an unbriefed critic is a second
opinion, not a review.

**Step 2 — resolve the target.**

Target: `$ARGUMENTS` — a file or a directory.

You cannot ask. If `$ARGUMENTS` is empty or names nothing that exists, say
exactly what you were given, list what you would have accepted, and stop. A
critique of a guessed target is worse than no critique, because it reads like a
verdict on the real work.

**Step 3 — refuse to critique blind.**

A critique written from source alone is worthless. Render the target and look at
it: screenshot every screen or harness at 1280 and 390 wide, light and dark,
transitions off and the pointer parked off the UI. Then click every control and
write down what actually changed. A control that changes nothing is a finding.

**Step 4 — gather the numbers you will cite.**

```bash
KIT=${CLAUDE_PLUGIN_ROOT}/shared
node $KIT/scripts/taste_audit.mjs      <file> && node $KIT/scripts/taste_audit.mjs <file> --dark
node $KIT/scripts/slop_tells.mjs       <file> && node $KIT/scripts/slop_tells.mjs  <file> --dark
node $KIT/scripts/verify_overflow.mjs  <file|dir>
node $KIT/scripts/verify_responsive.mjs <file|dir> --scale=1.25
```

Report what they actually printed. These are heuristics: they name what you saw,
they do not decide whether it is good. A clean run is not a defence: the kit's
own seeded-defect fixtures pass every one of these gates, in both themes, and
every one of them is work a senior designer would send back.

**Step 5 — write the verdict.**

In the format `design-critic.md` specifies: the verdict, the three reasons a
senior designer would send this back, and the findings table with evidence per
finding. Name the file and the element. "The spacing feels off" is not a finding;
"the card's 12px internal gap is the same as the 12px gap between cards, so the
grouping reads as one block" is.

Do not soften it, and do not pad the "what is good" list to balance the tone.

**Step 6 — state the scope, every time.**

This is judgement, not measurement. It produces no percentage, and no percentage
in this repo covers taste. Say so in the output.

---

## After the critique comes back

For the session that invoked this skill, not for the fork:

Act on it. Fix every Critical and Major finding, re-run `/design:gate`, and run this
critique again on what changed. The loop ends when the remaining findings are
Minor or Enhancement — not when you are tired of it.

Scoring the critic itself, rather than the work, is a maintainer task and lives
with the harness in the kit's repository - not here. This skill installs into
your project, and nothing it tells you to do should name a file your install
does not have.
