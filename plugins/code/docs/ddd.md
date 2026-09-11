# DDD in the code plugin

The DDD Starter Modelling Process as a chained pipeline. Nine steps, one `ddd/` workspace, and a
schema gate between each step — a step cannot run until the previous one's JSON artifact
validates. Every step also rebuilds a self-contained review page with diagrams, so a human can see
the run as it is, not as the last summary described it.

```bash
claude plugin install code@skill-marketplace
```

Start with `code:ddd`. For a new system, give it a short brief; for an existing `ddd/` workspace, ask it to resume or show status. It shows where you are, runs the next step or the whole
chain, and marks downstream steps stale when you re-run an earlier one.

## The chain

| # | Skill | Question it answers | Writes |
|---|---|---|---|
| 1 | `ddd-understand` | Why does this system exist, for whom, at what scale? | `01-understand/understand.json`, Business Model Canvas, Impact Map |
| 2 | `ddd-discover` | What actually happens in the domain? | `02-discover/discover.json`, `event-storm.md`, seeds `glossary.md` |
| 3 | `ddd-decompose` | Where do the boundaries go? | `03-decompose/decompose.json`, `subdomains.md`, context map |
| 4 | `ddd-strategize` | Core, supporting or generic — where do we invest? | `04-strategize/strategize.json`, core domain chart |
| 5 | `ddd-connect` | How do the contexts talk? | `05-connect/connect.json`, `message-flows.md` (mermaid sequence diagrams) |
| 6 | `ddd-organise` | Which team owns what, and how many deployables? | `06-organise/organise.json`, `team-topology.md` |
| 7 | `ddd-define` | What is each context's contract? | `07-define/define.json`, a Bounded Context Canvas per context |
| 8 | `ddd-code` | What does the code structure look like? | `08-code/code.json`, aggregate canvases, `implementation-plan.md` |
| 9 | `ddd-contracts` | What exactly does each message carry? | `09-contracts/contracts.json`, JSON Schema 2020-12 per message, one validated example each |

Each step runs interactively — at most four questions per checkpoint — or in auto mode, where it
asks nothing and logs its assumptions.

## The review page, the diagrams and the decisions

Every time a step is marked (`ddd mark`), the toolchain rebuilds `ddd/review.html`: one HTML file
that opens in any browser with no server. The things needing a human come first (open decisions,
blocking questions, gate errors, stale steps), then every decision as a row of option cards, the
diagrams, the domain tree, the data stores, the contracts, each step's `plain_words`, and the whole
run underneath with a search box. `ddd review <ddd-dir>` rebuilds it on demand.

Diagrams are written to `ddd/diagrams/` as SVG (always) and PNG (when a local Chrome or Chromium
is found; otherwise the page says so): `context-map`, `core-domain-chart`, `flow-<id>` per message
flow, `teams-deployables`, `c4-context`, `aggregates-<context>`, `event-storm`. They keep their
layout from run to run (`<name>.layout.json`); `--relayout` starts afresh. The steps Read the PNG
for their diagram before a deciding checkpoint, so the model looks at the same picture you do.

Hard calls are recorded, not just taken: a step that had to argue a boundary, a classification, a
topology or an integration writes a `decisions[]` entry with every option it weighed, the one it
chose, its confidence and what would flip it. Options that differ in shape get a diagram spec each;
`ddd decision render <ddd-dir> <Did>` draws them side by side under `ddd/diagrams/decisions/`.

At the end, `ddd export blueprint <ddd-dir> --deliver` writes blueprint specs for the whole system and,
when the `blueprint` skill is installed, renders `ddd/diagrams/final.html`: the polished hand-off
picture.

## Agent

`ddd-decision-strategist` is the tie-breaker. When a call has to be argued rather than read off an
artifact (where to draw a boundary, whether two contexts merge, sync vs async, which context owns
an invariant), it returns three options with pros, cons, hidden risks, a recommendation, and three
questions that would change it. It reads `ddd/*.json` as evidence and never writes artifacts; the
step records its answer as a `decisions[]` entry.

## Layout

```
code/
├── agents/ddd-decision-strategist.md
├── shared/
│   ├── bin/ddd.mjs      # the one CLI: init, mark, stamp, validate, review, <step> <verb>, decision render, export blueprint
│   ├── lib/             # workspace index, validator, review page, diagram generators, explorers, blueprint export
│   ├── schemas/         # one JSON Schema per step artifact, plus manifest.schema.json
│   ├── references/      # artifact-contract.md (the envelope), modes.md (the protocol)
│   ├── examples/        # the meal-kit workspace, complete with review page, diagrams and decisions
│   └── tests/           # node --test suites, the golden harness and the gate checks
└── skills/<name>/SKILL.md
```

## Requirements

Node.js 18 or newer. Nothing to install: the CLI is plain ESM.
A local Chrome or Chromium is optional; it turns the SVG diagrams into PNG. The bundled `code:blueprint` skill turns the exported specs into the final render.

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs --help                 # every command
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate ddd --status  # where am I, what's next
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs review ddd             # rebuild ddd/review.html and ddd/diagrams/
```

## Where it hands off

`ddd-code` produces an implementation plan, not source files — it does not scaffold unless you ask.
`ddd-contracts` produces the payload schemas a producer or consumer can be built from alone.
Both are meant to feed a planning or TDD workflow next; `final.html` is the picture to hand over
with them.

## Invoking

Namespaced under the plugin: `code:ddd`, `code:ddd-discover`, and so on.
`ddd` uses those names when it calls its siblings.

## Blueprint visuals

Use `blueprint` independently for architecture, workflow, sequence, data-flow and
lifecycle diagrams. It keeps the bundled viewer's dark/light themes, four visual
presets, finite trace motion, guided views and image exports. JetBrains Mono is
embedded in HTML and SVG/raster exports for consistent offline typography.

Runtime explainers can use `signal-flow` with trace motion; structural schema
views use still relationship maps plus field tables. There is no native
crow's-foot ERD renderer. The `code` plugin's `explain-diff` skill can embed these
validated viewers in its single HTML article. See Blueprint's
[visual-storytelling guide](../skills/blueprint/references/visual-storytelling.md)
and [schema guide](../skills/blueprint/references/schema-diagrams.md).
