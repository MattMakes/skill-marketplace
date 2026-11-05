# product — Product Thinking and Specs

What should we build, and why? Nineteen skills for the stretch between "I have an idea" and a spec
someone can build from: diverge on the idea, research it, challenge it from hostile angles, then
write the spec. Start with `office-hours` for a raw idea, `interview-me` for an underspecified ask,
or `spec` when you already know what you want and need it written down.

All but one are vendored copies of upstream skills, adapted to run standalone inside Claude Code;
`adhd` is based on an upstream project. See Credits.

```bash
claude plugin install product@skill-marketplace
```

## Skills

### Discover

| Skill | What it does |
|---|---|
| `product-brainstorming` | A PM needs a sparring partner before converging. Four modes (problem exploration, solution ideation, assumption testing, strategy) with HMW, JTBD, opportunity-solution trees, SCAMPER, OODA and reverse brainstorming, in a frame/diverge/provoke/converge/capture session. |
| `adhd` | An open-ended design, naming, API-surface or fuzzy-debugging question where the first three answers will be correct and forgettable. Spawns five isolated parallel branches under different cognitive frames (regulator, biology, speedrunner, 10-year-old, $0 budget), scores and clusters them, prunes traps, and deepens the top survivors. About ten Agent calls a run; skip it for lookups and bugs with a known cause. |
| `office-hours` | "Is this worth building?", "I have an idea", "help me think through this". Startup mode runs six YC forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit) with anti-sycophancy rules; builder mode is an enthusiastic design partner. Both challenge premises, force 2-3 alternatives, and save a design doc to `docs/designs/`. |
| `prfaq` | "Create a PRFAQ", "work backwards". Amazon's Working Backwards coached in five stages: press release, customer FAQ, internal FAQ, verdict, plus a distillate for PRD creation. Writes to `docs/prfaq/`. |
| `scientific-problem-selection` | A scientist is pitching a project, stuck on one, or asking a strategic question. Fischbach and Walsh's problem-choice framework (Cell, 2024) as nine skills with reference files: intuition pumps, risk matrix, optimization function, parameter strategy, decision trees, adversity, inversion, synthesis, meta-framework. |

### Research

| Skill | What it does |
|---|---|
| `deep-research` | A low-quality answer would be expensive: strategy, comparisons, hypothesis validation. Falsifiable hypotheses, parallel sub-agent fan-out, at least three differently-typed sources per thesis, per-source files with verbatim quotes, an adversarial pass and refresh targets. |
| `litreview` | Starting a literature review. Keyless PubMed E-utilities and OpenAlex searches, a PICO/SPIDER/Decomposition framework recommender, budgeted depth (5/10/20 queries) with a forcing checkpoint before spend, cross-search aggregation, and an eight-section research guide. |
| `deepread` | Deeply reading a book, article or document set. Five modes (quick, deep, map, feynman, book), claim/reason/evidence decomposition with four confidence labels, an evidence ledger, knowledge maps and Feynman teach-back. Treats source text as untrusted data. |
| `synthesize-research` | A pile of interview notes, survey responses or support tickets needs turning into findings. Six-step thematic analysis, affinity mapping, triangulation, behaviour-vs-stated-preference extraction, survey-analysis pitfalls, evidence-based personas and opportunity sizing. |

### Challenge

| Skill | What it does |
|---|---|
| `interview-me` | An ask is underspecified ("build me X" with no who or why) or the user says "interview me". States a hypothesis with a confidence number, asks one question at a time with a guess attached, probes "want vs should want", restates intent in six lines with a mandatory out-of-scope, and stops at an explicit yes. |
| `grilling` | A plan, decision or idea needs stress-testing. Maps the design tree, asks the whole frontier of settled-prerequisite questions in one round with a recommended answer each, looks facts up itself with sub-agents, and is done only when nothing is left silently assumed. Docs-anchored mode, from the former `grill-with-docs`: the same interview against the project's `CONTEXT.md` glossary and `docs/adr/` decisions, updating both inline, with three stdlib linters (CONTEXT.md linter, ADR scanner, glossary-vs-code check). Design-brief mode, from the former `grill-me` of the `design-system` plugin: interrogates a UI brief before a screen or component is built and writes every unasked decision into `BRIEF.md` as an assumption. |
| `devil` | A PRD, spec or brief needs checking for readiness before code exists. A sign-off manager who attacks what the document is silent about through a nine-step routine and domain question banks, forces scenario-form findings, and rules Approve / Conditional / Reject with a forwardable question list. |
| `roast` | "Roast this idea", "convene the panel", a brutal second opinion before building. Five parallel reviewers (Critic, Champion, Analyst, Investigator, Customer) and a Judge that returns GO / RESHAPE / KILL with the cheapest 48-hour test; three stdlib scripts build the brief, weight the verdict and design the test. |
| `plan-ceo-review` | "Think bigger", "expand scope", "is this ambitious enough". Founder-mode review in four modes (scope expansion, selective expansion, hold scope, scope reduction) with premise, leverage and dream-state challenges, then eleven review sections: architecture, error and rescue map, threat model, data-flow edge cases, code quality, tests, performance, observability, rollout, trajectory, design. Long and thorough by design. |
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
used in docs-anchored mode), `code-to-prd` (analyzer, scaffolder), `roast` (brief builder, verdict
synthesizer, test designer), `advanced-elicitation` (method picker) and `litreview` (four scripts).

Network, by design:

- `litreview`'s `free_search.py` calls the PubMed E-utilities and OpenAlex APIs over HTTPS (no
  key; `--mailto` opts into OpenAlex's polite pool). It also uses the Consensus MCP only if one is
  connected. Its `citation_tracker.py` keeps session counts in `~/.litreview_sessions/`. The
  final `.docx` guide needs Node.js with the `docx` package; without it the skill writes Markdown.
- `spec` runs `gh issue list` to find duplicates and `gh issue create` to file the issue, when
  `gh` is installed and authenticated; otherwise it prints the issue for pasting.
- `office-hours`, `plan-ceo-review`, `roast` (the Investigator), `prfaq` (the web researcher) and
  `deep-research` use the WebSearch tool when it is available; `office-hours` asks before
  searching and sends only generalized category terms.
- `adhd` mentions the upstream `adhd-agent` npm CLI for use outside Claude Code; the skill never
  installs or runs it.

Files written in the project, as each method prescribes: `office-hours` saves design docs to
`docs/designs/`; `plan-ceo-review` writes the review into the plan file under review (or
`docs/plans/`), a CEO summary to `docs/designs/` in expansion modes, and approved deferrals to
`TODOS.md`; `spec` offers an archive under `docs/specs/`; `prfaq` writes to `docs/prfaq/`;
`code-to-prd` scaffolds a `prd/` directory; `grilling` edits `CONTEXT.md` and `docs/adr/` in
docs-anchored mode and writes `BRIEF.md` next to the work in design-brief mode; `deep-research`
persists its sources folder; `interview-me` offers `docs/intent/`; `requirement-convergence`
writes its acceptance brief to a file only when asked; `documentation-criteria` names
`docs/prd/`, `docs/adr/`, `docs/ui-spec/`, `docs/design/` and `docs/plans/`.

`adhd`, `roast`, `prfaq`, `deep-research` and `grilling` fan out sub-agents through the Task tool
(`adhd` makes about ten calls a run). Installing this plugin wires no hooks, no MCP servers and no
background processes, and nothing here downloads a binary.

`plan-ceo-review` (62 KB) and `office-hours` (47 KB) are large single files: each is the complete
upstream method with its sections inlined, so a run reads nothing outside its own file.

## How it works with the other plugins

- **Out to a technical design.** A converged `spec` or PRD goes to `dev:brainstorm` for the
  technical design, or to `architecture:ddd` when it describes a new system that needs its
  boundaries drawn. `office-hours` and `plan-ceo-review` point at `dev:create-plan` and then
  `dev:pre-flight` as the engineering gate.
- **Spec-first execution.** `dev:spec-driven-workflow` (moved from here) turns a spec into RFC 2119
  requirements and test stubs during the build.
- **UI work.** `grilling`'s design-brief mode is step one of the UI flow in `dev:workflow`; the
  brief it writes is what `design:gate` and `design:critique` argue against later.
  `design:plan-design-review` (moved from here) critiques a plan's UI/UX before coding.
- **Brainstorming.** `product-brainstorming` explores the problem space; `dev:brainstorm` designs
  the technical solution. They complement each other.

## Credits

Every skill here is a vendored, supply-chain-controlled copy of an upstream skill, reviewed and
adapted in this repository, except `adhd`, which is based on
[UditAkhourii/adhd](https://github.com/UditAkhourii/adhd). See `NOTICE.md` for each one's
repository, path, commit, date, license and what was changed, including the four merges listed
below. Upstream is re-pulled deliberately, not automatically — diff against the recorded commit
before pulling changes in.

## Moved in v3

| Skill | Before | Now |
|---|---|---|
| `adhd` | `tools:adhd` | `product:adhd` |
| `plan-design-review` | `product:plan-design-review` | `design:plan-design-review` |
| `spec-driven-workflow` | `product:spec-driven-workflow` | `dev:spec-driven-workflow` |
| `write-spec` (merged) | `product:write-spec` | `product:spec`, PRD mode (`--prd`) |
| `grill-with-docs` (merged) | `product:grill-with-docs` | `product:grilling`, docs-anchored mode |
| `grill-me` (merged) | `design-system:grill-me` | `product:grilling`, design-brief mode |
| `intent-driven-development` (merged) | `product:intent-driven-development` | `product:requirement-convergence`, acceptance-criteria mode |

## Invoking

Namespaced under the plugin: `product:office-hours`, `product:spec`, `product:grilling`,
`product:roast`, `product:interview-me`, `product:adhd`, and so on. PRD mode is
`/product:spec --prd`.
