---
name: ddd-workflow
description: Use when the user wants to design a system with Domain-Driven Design end-to-end, asks "where are we in the DDD process", "what's the next DDD step", "ddd status", "run the whole DDD modelling process", "design this system properly before we build it", wants to apply DDD to a new system (anything from 1–3 services up to 10–20 deployable units), mentions the DDD Starter Modelling Process, or wants to go from event storming through bounded contexts to aggregates, an implementation plan and message contracts (payload schemas). Orchestrates the nine chained skills ddd-understand → ddd-discover → ddd-decompose → ddd-strategize → ddd-connect → ddd-organise → ddd-define → ddd-code → ddd-contracts over one shared `ddd/` workspace: shows status, runs the next step or all steps in order (interactive checkpoints or auto), re-runs from a step and marks downstream stale, and ends with a coverage summary. Also use when someone asks which DDD skill to use — this is the entry point.
---

# DDD Workflow (orchestrator)

Runs the [DDD Starter Modelling Process](https://github.com/ddd-crew/ddd-starter-modelling-process)
as nine chained Claude Code skills (the modelling steps of the process plus `ddd-contracts`, which turns the
designed message flows into implementable data contracts) — over one workspace (`<project>/ddd/`). Each step reads the JSON
its predecessor wrote and writes its own; `ddd validate` is the gate between steps. This skill
produces no design content itself — it resolves the workspace once, runs the step skills in order,
gates each hop, and aggregates. The step skills do the real work.

```
01 ddd-understand  why / for whom / how big        → understand.json  (creates ddd/manifest.json)
02 ddd-discover    big-picture EventStorming        → discover.json    (seeds ddd/glossary.md)
03 ddd-decompose   subdomains, bounded contexts, context map → decompose.json
04 ddd-strategize  core / supporting / generic, build-vs-buy, implementation pattern → strategize.json
05 ddd-connect     message flows between contexts, integration mechanisms → connect.json
06 ddd-organise    teams and deployable units (1–3 … 10–20), Conway alignment → organise.json
07 ddd-define      bounded context canvas per context, C4 context, quality attributes → define.json
08 ddd-code        aggregates, ports/adapters, module layout, implementation plan → code.json
09 ddd-contracts   payload schema + validated example + owners + rules per cross-party message → contracts.json
```

Contract and protocol (read once if you have not this session, and only when you are about to
*run* steps): `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md` and `…/modes.md`.
Per-step detail: `references/pipeline.md`. A status or coverage-summary request needs only
`references/coverage-summary.md` and the validator.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI
  `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened
  (`--help` lists the commands, `<cmd> --help` a command's flags). This skill uses `ddd validate`,
  `ddd mark`, `ddd stamp`, `ddd review` and `ddd export blueprint`.
- The nine `ddd-*` skills installed in `${CLAUDE_PLUGIN_ROOT}/skills/`. Invoke them with the `Skill`
  tool using their namespaced names (`ddd:ddd-discover`, …) — the bare `ddd-discover`
  works only when the skill also sits loose in a skills directory. If the Skill tool cannot see
  them (fresh install, not yet reloaded, or you are a subagent), read
  `${CLAUDE_PLUGIN_ROOT}/skills/ddd-<step>/SKILL.md` and follow it directly — same result.

## Step 1 — Resolve the workspace ONCE

1. Workspace = the user's instruction > `ddd_dir` in an existing `./ddd/manifest.json` > `./ddd`.
   Print the absolute path and pass the same folder to every step.
2. Status: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status`
   (exit 2 = no workspace yet → the pipeline starts at `ddd-understand`, which creates it). Add
   `--no-notes` on repeated runs to skip the upstream-notes block. Note that `--status` may write
   `stale` statuses into `manifest.json` — that is the validator's job, not a hand edit.
3. Mode and depth (see modes.md §0): the user's words ("auto", "no questions", "just draft") or
   the manifest decide; you are non-interactive if you are a subagent. Depth `light` for a
   time-boxed pass on a small system, `standard` by default, `deep` for many contexts.
4. Scale: if the user stated a size ("three services", "up to fifteen deployables"), pass it to
   `ddd-understand` so the manifest's `scale_target` is right from the start.
5. Sources: point the first step at what the repo already knows (`README`, `CONTEXT.md`, design
   docs, brainstorms) — `ddd init --source <path>` records them so every step reads the same inputs.

## Step 2 — Decide what the user asked for

| Request | Do |
|---|---|
| "status", "where are we", "what's next" | Print the status table and the `next:` line, plus open-question counts. No `next:` line means every step is `done` — the next action is the hand-off, not another design step. Stop (no coverage summary unless asked). |
| "next step" / "continue" | Run exactly the `next:` step (first `pending`/`stale`/`draft`). |
| "run the whole process" / "design this system" | Run every `pending` step in order, gating each hop (Step 3). |
| "just the contracts" / "schemas for the events" | If 05-connect and 07-define exist, run `ddd-contracts` alone; otherwise say which step is missing. |
| "run from <step>" / "redo <step>" | Run that step, then every step after it (they are stale by definition). |
| "skip <step>" | `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> <step> skipped --note "<reason>"` and continue. Only `connect` and `organise` are sensible to skip, and only for a one-context, one-deployable system — say so. |
| "just the strategic part" | Run understand → discover → decompose → strategize, then stop with a summary. |

## Step 3 — Run steps strictly in order, gating each hop

For each step to run:

1. Announce: "Running ddd-<step> (N/9) in <mode> mode, depth <depth>."
2. Invoke the skill (`Skill` tool → `ddd-<step>`), passing the workspace path, mode and depth in
   the prompt — plus the "notes addressed to ddd-<step>" lines that `ddd validate --status` printed,
   so upstream findings are not lost. Do not fan steps out in parallel: each one reads the file the
   previous one wrote.
3. Gate: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step <step>`.
   Errors → hand them back to the same step skill to fix (once); if still failing, stop the
   pipeline and report — do not run downstream steps on a broken artifact.
4. Interactive mode: after each step's own checkpoints, pause with a one-paragraph recap
   (key findings, open questions) and ask whether to continue, adjust, or stop. Keep it to one
   question. Auto mode: print the recap and continue.
5. Staleness: `ddd validate --status` compares `produced_at` stamps and marks every step older
   than any earlier step `stale`; re-run them in order. A hand edit does not move `produced_at` —
   after editing a JSON by hand run `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp <file>`
   so the cascade fires.
6. Pictures: every `ddd mark` a step runs rebuilds `<ddd-dir>/review.html` and `<ddd-dir>/diagrams/`
   (a `review:` line on stderr says what was drawn; a render problem is reported there and never
   changes the exit code). Between steps, if `<ddd-dir>/diagrams/<diagram>.png` exists for the step
   that just ran (`context-map` after decompose, `core-domain-chart` after strategize, `flow-<id>` after
   connect, `teams-deployables` after organise, `c4-context` and `aggregates-<context>` after define and
   code), Read it before the recap: the Read tool renders PNG, not SVG, and it is the picture the human
   sees. Steps record their hard calls as `decisions[]` (contract §3); an entry without `chosen` is an
   open decision and belongs in the recap next to the blocking questions.

### Auto-draft pattern (whole process, no human)

When the user wants a first draft of everything without being asked questions, run the nine
steps sequentially in auto mode. Running each step as a subagent is fine (the step skill's SKILL.md
path + the workspace path + "mode: auto" is enough for a fresh agent) — but still one at a time,
gating each with `ddd validate`. Then produce the coverage summary and recommend the human review
order: glossary → decompose (boundaries) → strategize (investment) → organise (deployables) →
define canvases → code. Boundaries and investment are where a wrong guess costs the most.

## Step 4 — Coverage summary (always, at the end)

Produce it when a pipeline run ends or when the user asks for it. Use
`references/coverage-summary.md`. It lists every artifact with its absolute path, the step
statuses, open-question counts (blocking ones quoted), open `decisions[]`, warnings from `ddd validate`, the deployable
count vs `scale_target`, the core domain(s), the review page and diagrams (Step 5), and the hand-off (`ddd/08-code/implementation-plan.md` +
`ddd/09-contracts/contracts.md` → `superpowers:writing-plans` / `dev-create-plan` → TDD). A reader who sees only this message must
know what exists, what is uncertain, and what to do next.

## Hard decisions, at any step

When a step hits a call the artifacts do not settle - a boundary, a merge, core vs supporting,
build vs buy, how many deployables, or anything cross-cutting nothing upstream states (language,
framework, datastore, cloud) - dispatch the **`ddd-decision-strategist`** subagent instead of
deciding alone (`subagent_type: "ddd-decision-strategist"`; `"ddd:ddd-decision-strategist"` is the
namespaced form when installed as a plugin — try the plain name first) or asking the user cold. It reads the workspace, returns three real options with
cited trade-offs, the hidden risks (blast radius, reversibility, contradicted canvas rules), one
recommendation with the strongest argument against it, and three questions that would change it.
In interactive mode those three questions are your checkpoint. Full protocol:
`${CLAUDE_PLUGIN_ROOT}/shared/references/modes.md` section 3b.

## Step 5 — The review page and the final render (always, right after the summary)

The coverage summary is a message; it scrolls away and it cannot hold a whole run. The page holds
it: `<ddd-dir>/review.html` is rebuilt by every `ddd mark`, so it already exists when a run ends.
Rebuild it on demand whenever the user asks to review a run, or after a hand edit:

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs review <ddd-dir>               # rebuilds <ddd-dir>/review.html and <ddd-dir>/diagrams/
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs review <ddd-dir> --relayout    # same, dropping the remembered diagram layout
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs export blueprint <ddd-dir> --deliver   # the hand-off render (below)
```

One self-contained HTML file: the things needing a human first (open decisions, blocking questions,
gate errors, low-confidence guesses, stale steps, notes the addressed step never names), then every
decision as a row of option cards with its option diagrams, the shape of the system, the diagrams
(context map, core domain chart, one per message flow, teams and deployables, C4 context, aggregates,
event storm), the domain tree, the data stores, the words that mean two things, each step in its own
`plain_words`, and then the whole run underneath with a search box. Give the user the absolute path
and say it opens in any browser with no server.

Diagrams live beside the page as `<ddd-dir>/diagrams/<name>.svg` (always) and `.png` (when a local
Chrome or Chromium is found; otherwise the page and the `review:` line say so, and the SVG is the
picture). Layout memory keeps them stable run to run: each diagram remembers where its nodes were
in `diagrams/<name>.layout.json`, so a re-run moves only what changed. Delete those files or pass
`--relayout` for a fresh layout.

The page reads the step JSON and runs `ddd validate --json` + `ddd contracts check --json` against a
throwaway copy, so it can never disagree with a gate and never modifies the workspace. Do not
hand-write a review of a run when this exists, and do not paste its contents into chat: point at
the file.

The hand-off render: `ddd export blueprint <ddd-dir> --deliver` writes blueprint specs
(`<ddd-dir>/diagrams/final.architecture.json`, one `final-<flow>.sequence.json` per flow) and, when
the `blueprint` skill is installed (`~/.claude/skills/blueprint`, or `BLUEPRINT_HOME`), renders them to
`<ddd-dir>/diagrams/final.html` (plus `final-<flow>.html`): the polished, explorable picture of the
designed system to hand to whoever builds it. Without blueprint it writes the specs and says so; that
is not a failure. Name `review.html`, `diagrams/` and `final.html` (when present) in the coverage
summary (`references/coverage-summary.md`).

## Sizing guidance (so the process stays cheap)

- **1–3 services, one team:** depth `light`. Expect 2–6 bounded contexts, one modular monolith or
  two deployables, one canvas per context, aggregates only in the core, contracts for the handful of messages that cross a boundary. About a day of
  interactive work; an auto draft in one sitting.
- **10–20 deployable units, several teams:** depth `standard` or `deep`. Expect 6–15 contexts;
  `organise` and `connect` carry real weight (team boundaries, async integration); run `define`
  per team if teams own their contexts.
- Whatever the size: strategic steps (01–04) are cheap and pay for themselves; tactical effort
  (08) is spent only on contexts whose implementation pattern is a domain model; contracts (09) are
  written for messages that cross a party boundary, not for in-module calls.

## Non-negotiables

- One workspace, one manifest, same `<ddd-dir>` for every step.
- Never hand-edit statuses; use `ddd mark`. Never skip the validator between steps.
- Do not write `ddd/` into a repo the user has not asked to design — if they only want to *see*
  the process, run it in a scratch folder and say so.
