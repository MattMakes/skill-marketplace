# Decide — specs and requirements (former `product` plugin)

What should we build, and is the ask clear enough to build from? Ten skills for the stretch
between "I have an idea" and a spec someone can build from: diverge on the problem, challenge the
idea from hostile angles, then write the spec. Start with `interview-me` for an underspecified ask,
or `spec` when you already know what you want and need it written down.

This area is part of the `software` plugin; see the [plugin README](../../README.md). The former
`product` plugin's strategy and research skills (`office-hours`, `prfaq`, `plan-ceo-review`,
`roast`, `deep-research`, `litreview`, `deepread`, `synthesize-research`,
`scientific-problem-selection`) are in the `work` plugin now, and their disclosures moved with
them to its README.

All but one are vendored copies of upstream skills, adapted to run standalone inside Claude Code;
`adhd` is based on an upstream project. See Credits.

## Skills

### Diverge

| Skill | What it does |
|---|---|
| `product-brainstorming` | A PM needs a sparring partner before converging. Four modes (problem exploration, solution ideation, assumption testing, strategy) with HMW, JTBD, opportunity-solution trees, SCAMPER, OODA and reverse brainstorming, in a frame/diverge/provoke/converge/capture session. |
| `adhd` | An open-ended design, naming, API-surface or fuzzy-debugging question where the first three answers will be correct and forgettable. Spawns five isolated parallel branches under different cognitive frames (regulator, biology, speedrunner, 10-year-old, $0 budget), scores and clusters them, prunes traps, and deepens the top survivors. About ten Agent calls a run; skip it for lookups and bugs with a known cause. |

### Challenge

| Skill | What it does |
|---|---|
| `interview-me` | An ask is underspecified ("build me X" with no who or why) or the user says "interview me". States a hypothesis with a confidence number, asks one question at a time with a guess attached, probes "want vs should want", restates intent in six lines with a mandatory out-of-scope, and stops at an explicit yes. |
| `grilling` | A plan, decision or idea needs stress-testing. Maps the design tree, asks the whole frontier of settled-prerequisite questions in one round with a recommended answer each, looks facts up itself with sub-agents, and is done only when nothing is left silently assumed. Docs-anchored mode, from the former `grill-with-docs`: the same interview against the project's `CONTEXT.md` glossary and `docs/adr/` decisions, updating both inline, with three stdlib linters (CONTEXT.md linter, ADR scanner, glossary-vs-code check). Design-brief mode, from the former `grill-me` of the `design-system` plugin: interrogates a UI brief before a screen or component is built and writes every unasked decision into `BRIEF.md` as an assumption. |
| `devil` | A PRD, spec or brief needs checking for readiness before code exists. A sign-off manager who attacks what the document is silent about through a nine-step routine and domain question banks, forces scenario-form findings, and rules Approve / Conditional / Reject with a forwardable question list. |
| `advanced-elicitation` | The user wants the last output pushed harder: socratic, first principles, pre-mortem, red team, round tables and 65 more. A stdlib picker serves five methods at a time from a 71-method catalog; apply or reject each result. |

### Specify

| Skill | What it does |
|---|---|
| `spec` | "Spec this out", "file an issue", "write up a ticket". Issue mode (default): a principal engineer interrogates the request in five strict phases (why, scope, code-grounded technical questions, draft review, file), applies fourteen issue-quality standards, and files the result with `gh` or hands back the rendered issue. PRD mode (`--prd`), from the former `write-spec`: problem statement, goals vs non-goals, INVEST user stories, P0/P1/P2 and MoSCoW requirements, leading and lagging metrics, Given/When/Then acceptance criteria and scope-creep controls, passed through the same content review and secrets scan. |
| `requirement-convergence` | A requirement enters a workflow, before design. Separates the outcome from the requirements proposed to reach it, labels current-state vs desired-future, requires user-authored non-goals, bands cost from structure, and records answers in the user's own wording. Acceptance-criteria mode, from the former `intent-driven-development`: Quick Capture or a Full Acceptance Brief of AC-NNN criteria with scenario, action, expected result, must-not, verification method and priority; business constraints are never inferred from code. |
| `documentation-criteria` | Deciding which of PRD, ADR, UI spec, design doc and work plan a change needs, by structural scale and the ADR choice and durability filters. Six templates included. |
| `code-to-prd` | Reverse-engineering an existing codebase into a PRD: global scan, page-by-page (or endpoint-by-endpoint) analysis, structured document generation. A stdlib analyzer covers React, Vue, Angular, Svelte, Next.js, Nuxt, NestJS, Express, Django, FastAPI and Flask, with mock-vs-real API detection; a scaffolder writes the `prd/` skeleton. |

## What these write and where they reach

All shipped scripts are Python 3 standard library, run only when a skill invokes them, and are
addressed as `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/scripts/<file>`: `grilling` (three linters,
used in docs-anchored mode), `code-to-prd` (analyzer, scaffolder) and `advanced-elicitation`
(method picker).

Network, by design:

- `spec` runs `gh issue list` to find duplicates and `gh issue create` to file the issue, when
  `gh` is installed and authenticated; otherwise it prints the issue for pasting.
- `adhd` mentions the upstream `adhd-agent` npm CLI for use outside Claude Code; the skill never
  installs or runs it.

Files written in the project, as each method prescribes: `spec` offers an archive under
`docs/specs/`; `code-to-prd` scaffolds a `prd/` directory; `grilling` edits `CONTEXT.md` and
`docs/adr/` in docs-anchored mode and writes `BRIEF.md` next to the work in design-brief mode;
`interview-me` offers `docs/intent/`; `requirement-convergence` writes its acceptance brief to a
file only when asked; `documentation-criteria` names `docs/prd/`, `docs/adr/`, `docs/ui-spec/`,
`docs/design/` and `docs/plans/`.

`adhd` and `grilling` fan out sub-agents through the Task tool (`adhd` makes about ten calls a
run). None of these wires a hook, an MCP server or a background process, and nothing here
downloads a binary.

## How it works with the rest of the plugin and the others

- **In from `work`.** `work:office-hours`, `work:prfaq`, `work:roast` and
  `work:plan-ceo-review` decide whether an idea is worth building; this area turns the answer into
  a spec. `office-hours` and `plan-ceo-review` point at `software:create-plan` and then
  `software:pre-flight` as the engineering gate.
- **Out to a technical design.** A converged `spec` or PRD goes to `software:brainstorm` for the
  technical design, or to `software:ddd` when it describes a new system that needs its
  boundaries drawn.
- **Spec-first execution.** `software:spec-driven-workflow` turns a spec into RFC 2119
  requirements and test stubs during the build.
- **UI work.** `grilling`'s design-brief mode is step one of the UI flow in `software:workflow`;
  the brief it writes is what `design:gate` and `design:critique` argue against later.
  `design:plan-design-review` critiques a plan's UI/UX before coding.
- **Brainstorming.** `product-brainstorming` explores the problem space; `software:brainstorm`
  designs the technical solution. They complement each other.

## Credits

Every skill here is a vendored, supply-chain-controlled copy of an upstream skill, reviewed and
adapted in this repository, except `adhd`, which is based on
[UditAkhourii/adhd](https://github.com/UditAkhourii/adhd). The plugin's
[NOTICE.md](../../NOTICE.md), section "From the former `product` plugin", has each one's
repository, path, commit, date, license and what was changed, including the four merges
(`write-spec` into `spec`, `grill-with-docs` and the `design-system` plugin's `grill-me` into `grilling`,
`intent-driven-development` into `requirement-convergence`). Sources: anthropics/knowledge-work-plugins
(`spec` PRD mode, `product-brainstorming`), addyosmani/agent-skills (`interview-me`),
mattpocock/skills (`grilling`), alirezarezvani/claude-skills (`grilling` docs-anchored mode,
`code-to-prd`), plugin87/ux-ui-agent-skills (`grilling` design-brief mode), affaan-m/ECC
(`requirement-convergence` acceptance-criteria mode), BMAD-METHOD (`advanced-elicitation`),
davila7/claude-code-templates (`devil`, by dhha22), garrytan/gstack (`spec`) and
shinpr/claude-code-workflows (`documentation-criteria`, `requirement-convergence`). Upstream is
re-pulled deliberately, not automatically — diff against the recorded commit before pulling
changes in.

## Invoking

`/software:interview-me`, `/software:grilling`, `/software:spec`, `/software:devil`,
`/software:adhd`, and so on. PRD mode is `/software:spec --prd`.
