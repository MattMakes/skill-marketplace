# product — Product Thinking and Specs

Twenty-three skills for the stretch between "I have an idea" and a spec someone can build from:
interviewing the user until the ask is clear, critiquing the idea from hostile angles, writing the
PRD or issue, and doing the research that feeds all three. Every one is a vendored copy of an
upstream skill, adapted to run standalone inside Claude Code.

```bash
claude plugin install product@skill-marketplace
```

## Skills

### Interview and clarify

| Skill | Use it when |
|---|---|
| `interview-me` | An ask is underspecified ("build me X" with no who or why) or the user says "interview me". States a hypothesis with a confidence number, asks one question at a time with a guess attached, probes "want vs should want", restates intent in six lines with a mandatory out-of-scope, and stops at an explicit yes. |
| `grilling` | The user wants a plan, decision or idea stress-tested. Maps the design tree, asks the whole frontier of settled-prerequisite questions in one round with a recommended answer each, looks facts up itself with sub-agents, and is done only when nothing is left silently assumed. |
| `grill-with-docs` | The same interview anchored to the project's `CONTEXT.md` glossary and `docs/adr/` decisions, updating both inline as terms and trade-offs crystallise. Ships three stdlib linters: a CONTEXT.md linter, an ADR scanner and a glossary-vs-code consistency check. |
| `requirement-convergence` | A requirement enters a workflow, before design. Separates the outcome from the requirements proposed to reach it, labels current-state vs desired-future, requires user-authored non-goals, bands cost from structure, and records answers in the user's own wording. |
| `intent-driven-development` | A feature needs scoped, verifiable acceptance criteria before or alongside implementation. Quick Capture or a Full Acceptance Brief of AC-NNN criteria with scenario, action, expected result, must-not, verification method and priority; business constraints are never inferred from code. |
| `advanced-elicitation` | The user wants the last output pushed harder: socratic, first principles, pre-mortem, red team, round tables and 65 more. A stdlib picker serves five methods at a time from a 71-method catalog; apply or reject each result. |

### Ideas and product critique

| Skill | Use it when |
|---|---|
| `office-hours` | "Is this worth building?", "I have an idea", "help me think through this". Startup mode runs six YC forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit) with anti-sycophancy rules; builder mode is an enthusiastic design partner. Both challenge premises, force 2-3 alternatives, and save a design doc to `docs/designs/`. |
| `product-brainstorming` | A PM needs a sparring partner before converging. Four modes (problem exploration, solution ideation, assumption testing, strategy) with HMW, JTBD, opportunity-solution trees, SCAMPER, OODA and reverse brainstorming, in a frame/diverge/provoke/converge/capture session. |
| `roast` | "Roast this idea", "convene the panel", a brutal second opinion before building. Five parallel reviewers (Critic, Champion, Analyst, Investigator, Customer) and a Judge that returns GO / RESHAPE / KILL with the cheapest 48-hour test; three stdlib scripts build the brief, weight the verdict and design the test. |
| `prfaq` | "Create a PRFAQ", "work backwards". Amazon's Working Backwards coached in five stages: press release, customer FAQ, internal FAQ, verdict, plus a distillate for PRD creation. Writes to `docs/prfaq/`. |
| `devil` | A PRD, spec or brief needs checking for readiness before code exists. A sign-off manager who attacks what the document is silent about through a nine-step routine and domain question banks, forces scenario-form findings, and rules Approve / Conditional / Reject with a forwardable question list. |
| `plan-ceo-review` | "Think bigger", "expand scope", "is this ambitious enough". Founder-mode review in four modes (scope expansion, selective expansion, hold scope, scope reduction) with premise, leverage and dream-state challenges, then eleven review sections: architecture, error and rescue map, threat model, data-flow edge cases, code quality, tests, performance, observability, rollout, trajectory, design. Long and thorough by design. |
| `plan-design-review` | A plan or spec needs a UI/UX critique before coding. Seven passes (information architecture, interaction states, user journey, AI-slop risk, design system, responsive and accessibility, unresolved decisions), each rated 0-10 and fixed in the plan. |
| `scientific-problem-selection` | A scientist is pitching a project, stuck on one, or asking a strategic question. Fischbach and Walsh's problem-choice framework (Cell, 2024) as nine skills with reference files: intuition pumps, risk matrix, optimization function, parameter strategy, decision trees, adversity, inversion, synthesis, meta-framework. |

### Specs and PRDs

| Skill | Use it when |
|---|---|
| `write-spec` | Turning an idea or request into a PRD: problem statement, goals vs non-goals, INVEST user stories, P0/P1/P2 and MoSCoW requirements, leading and lagging metrics with targets, Given/When/Then acceptance criteria, scope-creep controls. |
| `spec` | "Spec this out", "file an issue", "write up a ticket". A principal engineer interrogates the request in five strict phases (why, scope, code-grounded technical questions, draft review, file), applies fourteen issue-quality standards, and files the result with `gh` or hands back the rendered issue. |
| `spec-driven-workflow` | Spec-before-code with RFC 2119 requirements, a Given/When/Then pattern library and bounded-autonomy stop/continue rules. Three stdlib scripts: a spec generator, a 0-100 validator and a test-stub extractor (pytest, jest, go test). |
| `code-to-prd` | Reverse-engineering an existing codebase into a PRD: global scan, page-by-page (or endpoint-by-endpoint) analysis, structured document generation. A stdlib analyzer covers React, Vue, Angular, Svelte, Next.js, Nuxt, NestJS, Express, Django, FastAPI and Flask, with mock-vs-real API detection; a scaffolder writes the `prd/` skeleton. |
| `documentation-criteria` | Deciding which of PRD, ADR, UI spec, design doc and work plan a change needs, by structural scale and the ADR choice and durability filters. Six templates included. |

### Research

| Skill | Use it when |
|---|---|
| `synthesize-research` | A pile of interview notes, survey responses or support tickets needs turning into findings. Six-step thematic analysis, affinity mapping, triangulation, behaviour-vs-stated-preference extraction, survey-analysis pitfalls, evidence-based personas and opportunity sizing. |
| `deep-research` | A low-quality answer would be expensive: strategy, comparisons, hypothesis validation. Falsifiable hypotheses, parallel sub-agent fan-out, at least three differently-typed sources per thesis, per-source files with verbatim quotes, an adversarial pass and refresh targets. |
| `deepread` | Deeply reading a book, article or document set. Five modes (quick, deep, map, feynman, book), claim/reason/evidence decomposition with four confidence labels, an evidence ledger, knowledge maps and Feynman teach-back. Treats source text as untrusted data. |
| `litreview` | Starting a literature review. Keyless PubMed E-utilities and OpenAlex searches, a PICO/SPIDER/Decomposition framework recommender, budgeted depth (5/10/20 queries) with a forcing checkpoint before spend, cross-search aggregation, and an eight-section research guide. |

## What these write and where they reach

All shipped scripts are Python 3 standard library, run only when a skill invokes them, and are
addressed as `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/scripts/<file>`:
`spec-driven-workflow` (generator, validator, test extractor), `grill-with-docs` (three
linters), `code-to-prd` (analyzer, scaffolder), `roast` (brief builder, verdict synthesizer,
test designer), `advanced-elicitation` (method picker) and `litreview` (four scripts).

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

Files written in the project, as each method prescribes: `office-hours` saves design docs to
`docs/designs/`; `plan-ceo-review` writes the review into the plan file under review (or
`docs/plans/`), a CEO summary to `docs/designs/` in expansion modes, and approved deferrals to
`TODOS.md`; `spec` offers an archive under `docs/specs/`; `prfaq` writes to `docs/prfaq/`;
`code-to-prd` scaffolds a `prd/` directory; `grill-with-docs` edits `CONTEXT.md` and
`docs/adr/`; `spec-driven-workflow`'s extractor writes test stubs where you point it;
`deep-research` persists its sources folder; `interview-me` offers `docs/intent/`;
`documentation-criteria` names `docs/prd/`, `docs/adr/`, `docs/ui-spec/`, `docs/design/` and
`docs/plans/`.

`roast`, `prfaq`, `deep-research` and `grilling` fan out sub-agents through the Task tool.
Installing this plugin wires no hooks, no MCP servers and no background processes, and nothing
here downloads a binary.

`plan-ceo-review` (62 KB) and `office-hours` (47 KB) are large single files: each is the complete
upstream method with its sections inlined, so a run reads nothing outside its own file.

## Credits

Every skill here is a vendored, supply-chain-controlled copy of an upstream skill, reviewed and
adapted in this repository; see `NOTICE.md` for each one's repository, path, commit, date,
license and what was changed. Upstream is re-pulled deliberately, not automatically — diff
against the recorded commit before pulling changes in.

## Invoking

Namespaced under the plugin: `product:office-hours`, `product:write-spec`, `product:spec`,
`product:roast`, `product:interview-me`, and so on.
