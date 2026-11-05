---
name: grilling
description: "Grill the user relentlessly about a plan, decision, or idea, in rounds over a design tree with a recommended answer for each question. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases. Three modes: default (any plan); docs-anchored, which challenges the plan against the project's CONTEXT.md glossary and docs/adr/ decisions, updates both inline and ships stdlib linters (use for 'grill with docs', domain language, ubiquitous language, ADRs); and design brief, which interrogates a UI brief before a screen or component is built, asks at most seven questions that change the work, writes every unasked decision down as a stated assumption and produces BRIEF.md (use for 'grill me on the brief', or before a design build)."
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent (the Task/Agent tool) to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Modes

Every mode keeps the rounds, the recommended answers and the rule that facts are yours to find. Pick by what anchors the session.

| Mode | Pick when | Steps |
|---|---|---|
| **Default** | Any plan, decision or idea with no docs to anchor to | As above. |
| **Docs-anchored** | The repo has, or should have, a `CONTEXT.md` glossary and `docs/adr/`, or the user says "grill with docs" | Read [references/docs-anchored.md](references/docs-anchored.md). Pre-flight the three linters in `${CLAUDE_PLUGIN_ROOT}/skills/grilling/scripts/` and turn their findings into opening questions; challenge every term against the glossary; write each resolved term into `CONTEXT.md` at once ([format](references/CONTEXT-FORMAT.md)); offer an ADR only when the decision is hard to reverse, surprising without context and a real trade-off ([format](references/ADR-FORMAT.md)); close with a glossary-vs-code run. |
| **Design brief** | A screen, component or UI flow is about to be built | Read [references/design-brief.md](references/design-brief.md). Read the repo first (brief, theme, neighbouring screens); ask one round of at most seven questions from its bank, each one changing the build; take a default for everything else and write it down with its cost if wrong; write `BRIEF.md` next to the work. One round, not a full tree: an unasked decision becomes a stated assumption instead of another round. |

