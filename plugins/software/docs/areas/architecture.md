# Shape — architecture and DDD (former `architecture` plugin)

How should the system be shaped? Twenty-one skills and one agent for the decisions above the code:
where the boundaries go, what each module's interface is, which decisions to write down, what
crosses a boundary and in what shape, and the diagrams that show it.

This area is part of the `software` plugin; see the [plugin README](../../README.md).

## Start here

| What you want to do | Invoke |
|---|---|
| Design a new system with DDD, resume a model, or find the next modelling step | `software:ddd` |
| Sharpen the domain language of an existing codebase, or record one ADR | `software:domain-modeling` |
| Design a module's interface or decide where a seam goes | `software:codebase-design` |
| Find the refactor worth doing in an existing codebase | `software:improve-codebase-architecture` |
| Sketch types and module structure before writing a non-trivial feature | `software:architect` |
| Agree an API or event schema between two sides before both build | `software:contract-first` |
| Draw an architecture, sequence, workflow, data-flow or lifecycle diagram | `software:blueprint` (explorable HTML) or `software:drawio` (editable `.drawio`) |

## Skills

### Domain

The DDD Starter Modelling Process as a chained pipeline: nine steps over one `ddd/` workspace,
with a schema gate between each step, so a step cannot run until the previous one's JSON artifact
validates. Each step runs interactively (at most four questions per checkpoint) or in auto mode,
where it asks nothing and logs its assumptions. The [DDD guide](../ddd.md) covers the review
page, diagrams, decisions and CLI in full.

| Skill | What it does |
|---|---|
| `ddd` | The entry point. Shows where a `ddd/` workspace stands, runs the next step or the whole chain, re-runs from a step and marks downstream steps stale, and ends with a coverage summary. For a new system, give it a short brief. |
| `ddd-understand` | Step 1. Why the system exists, for whom, at what scale: Business Model Canvas, Impact Map, goals with metrics, capabilities and a scale target. Writes `ddd/manifest.json` and `01-understand/`. |
| `ddd-discover` | Step 2. What happens in the domain: a big-picture EventStorming timeline, hotspots and a seeded `glossary.md`. Writes `02-discover/discover.json` and `event-storm.md`. |
| `ddd-decompose` | Step 3. Where the boundaries go: subdomains and bounded contexts from language-shift, pivotal-event, actor, data-ownership and rate-of-change heuristics, the Independent Service Heuristics, and a context map with named relationship patterns. |
| `ddd-strategize` | Step 4. Core, supporting or generic, and where to invest: a core domain chart, build-vs-buy, and an implementation pattern per subdomain. |
| `ddd-connect` | Step 5. How the contexts talk: a numbered message flow per scenario as a mermaid sequence diagram, a message catalogue, one integration decision per context-map relationship, and coupling concerns. |
| `ddd-organise` | Step 6. Which team owns what and how many deployables: Team Topologies, a modular monolith by default, every split justified and the count checked against the scale target. |
| `ddd-define` | Step 7. Each context's contract: a Bounded Context Canvas per context, a C4 system context and a refined per-context glossary. |
| `ddd-code` | Step 8. Tactical design: aggregates with an Aggregate Design Canvas, entities, value objects, invariants, ports and adapters, and `implementation-plan.md`. Designs and plans; it scaffolds source only if you ask. |
| `ddd-contracts` | Step 9. What each message carries: a JSON Schema 2020-12 payload schema, one validated example, an owner and business rules for every message that crosses a party boundary. |
| `domain-modeling` | The light mode for an existing codebase, when a full DDD run is too much. Challenges terms against `GLOSSARY.md`, sharpens fuzzy words, stress-tests with scenarios, cross-checks the code, and offers a one-paragraph ADR only when a decision is hard to reverse, surprising and a real trade-off. |
| `ddd-decision-strategist` (agent) | The tie-breaker for calls that must be argued rather than read off an artifact: where a boundary goes, whether two contexts merge, sync vs async, which context owns an invariant. Returns three options with pros, cons, hidden risks, a recommendation and three questions that would change it. Reads `ddd/*.json` as evidence and never writes artifacts; the step records its answer as a `decisions[]` entry. |

### Modules

| Skill | What it does |
|---|---|
| `codebase-design` | Designing or restructuring a module's interface, deciding where a seam goes, or making code testable. Shared vocabulary (module, interface, depth, seam, adapter, leverage, locality), the deletion test, the one-vs-two-adapter rule, `DEEPENING.md` for dependency categories and `DESIGN-IT-TWICE.md` for parallel sub-agent interface exploration. |
| `improve-codebase-architecture` | Finding where the codebase is shallow and picking a refactor worth doing. Hot-spot-weighted scan, deletion-test triage, a self-contained HTML report with before/after diagrams, then a grilling loop through `software:grilling` that updates the glossary and ADRs. User-invoked only. |
| `improve` | A senior-advisor audit of a codebase with handoff plans another agent can execute. Read-only on source: nine audit categories with parallel subagents, vetting of over-reported findings, numbered self-contained plans under `plans/` with drift checks and STOP conditions. Variants for `quick`/`deep`, a focus, the current `branch`, `next` (direction), `plan`, `review-plan`, `execute`, `reconcile` and `--issues`. |
| `architect` | Non-trivial work where jumping to code would lock in the wrong shape. Grounds in the surrounding system, sketches types, signatures and module map with `not implemented` bodies, designs twice through `software:arena`, screens candidates against `references/design-red-flags.md`, then implements against the sketch and names the tells for scrapping it. Ships a rationale from `references/rationale-template.md`. |

### Decisions

| Skill | What it does |
|---|---|
| `architecture-decision-records` | Documenting a significant technical decision. Five templates (MADR, lightweight, Y-statement, deprecation, RFC), a status lifecycle, an index layout, and a review checklist. |

### Contracts

| Skill | What it does |
|---|---|
| `contract-first` | Frontend/backend or service-to-service work that must evolve an API or event schema in parallel. One authoritative OpenAPI/AsyncAPI/proto/JSON Schema artifact, generated consumer types, provider verification (including the bigint-ID trap), and a change protocol. |
| `api-design-principles` | Designing or reviewing a REST or GraphQL API. REST and GraphQL schema references, a design checklist and a FastAPI template. |
| `saga-orchestration` | Distributed transactions without 2PC: orchestration vs choreography, compensation design, idempotent steps, per-step timeouts, stuck-saga troubleshooting, with full orchestrator implementations in `references/`. |

### Diagrams

Both are renderers. Blueprint gives an explorable HTML page; drawio gives an editable file a
human keeps working on.

| Skill | What it does |
|---|---|
| `blueprint` | Validated architecture, workflow, sequence, data-flow and lifecycle/state diagrams as standalone HTML with inline SVG, dark/light themes, four visual presets, finite trace motion, guided views, and PNG/JPEG/WebP/SVG/WebM export. Takes plain-language requirements or pasted Mermaid flowchart, sequenceDiagram and stateDiagram input, and can inspect the repository when a diagram must reflect real code. Schema views use labeled relationship maps plus field tables; there is no native crow's-foot ERD. It is also the renderer behind `ddd export blueprint --deliver`. |
| `drawio` | An editable `.drawio` diagram: architecture, UML/ERD/sequence, BPMN, network or swimlane, hand-authored from a description or generated from Terraform, Kubernetes, compose, SQL, OpenAPI/AsyncAPI, protobuf, GraphQL, CI workflows or Python/JS/Go/Rust code; sync that preserves manual layout; executive/system/deployment/data-flow/security views; policy tests and architecture review; export to Mermaid, PPTX or HTML. 45 Python scripts and a 436 KB gzipped index of 10,446 official shapes, which is why this skill is about 1 MB. User-invoked only (`/software:drawio`). |

## What these write and where they reach

None of these wires a hook, an MCP server or a background process.

- **The DDD skills** write only under `ddd/` in the project: `manifest.json`, one folder per step
  (`01-understand/` to `09-contracts/`), `glossary.md`, `review.html` (rebuilt on every
  `ddd mark`, opens with no server) and `diagrams/`. Diagrams are SVG always and PNG when a local
  Chrome or Chromium is found; layouts persist in `<name>.layout.json`. The CLI is plain ESM on
  Node.js 18 or newer with nothing to install, run as
  `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs`. No network.
- **`blueprint`** writes the HTML (and any exports) to the paths you give it. Its runtime and the
  JetBrains Mono font are bundled; no package install. `visual-check` drives a local Chrome or
  Chromium (`BLUEPRINT_CHROME` points at one it cannot find). `preview` serves the page from a
  loopback-only HTTP server and only when asked. `brands capture <url>` fetches the icon from an
  official site URL you supply and pins it by digest; that is its one network call, and render and
  validate never capture.
- **`drawio`** runs its Python scripts only when invoked; they write the output paths you pass.
  Standard library, except PyYAML for YAML specs and compose/CI/Kubernetes manifests, python-pptx
  for `drawio2pptx.py` and Pillow for image handling. Two scripts reach the network by design:
  `aiicons.py` fetches AI-vendor logos from the unpkg and simpleicons CDNs and `dbxicons.py`
  fetches Databricks icons from GitHub, both only when you ask for an icon (`--embed` inlines the
  SVG; without it the diagram references the CDN URL and draw.io fetches it when the file is
  opened). Their `--refresh-manifest` flags contact the upstream catalogs and are maintainer
  operations. `autolayout.py`, `c4.py` and `compress.py` shell out to Graphviz `dot`; native
  PNG/SVG/PDF export and `prdiff.py` shell out to the `drawio` binary and `git`; `tfstate.py`,
  `dockerimports.py` and `k8simports.py` only parse JSON you pipe in from `terraform`, `docker`
  and `kubectl`. Style presets you ask it to save go to `~/.drawio-skill/styles/`, the one
  location outside the skill directory. The `diagramctl_mcp.py` stdio MCP server exists only if
  you register it yourself. The draw.io desktop CLI and Graphviz are optional extras.
- **`improve-codebase-architecture`** writes an HTML report to the OS temp directory and opens it;
  the report loads Tailwind and Mermaid from CDNs when viewed in a browser. It, `domain-modeling`
  and `architecture-decision-records` write `GLOSSARY.md` and `docs/adr/` in the repo.
- **`improve`** is read-only on source and writes only under `plans/` (or `advisor-plans/`) in the
  repo. Its `execute` variant spawns a subagent in an isolated git worktree; `--issues` creates
  GitHub issues with `gh`, and only with that flag.
- **`architect`** and **`codebase-design`** spawn Task subagents; `architect` designs twice
  through `software:arena`, which gives each candidate a git worktree or a directory under
  `/tmp/arena-<slug>/`.
- `contract-first`, `api-design-principles`, `saga-orchestration` and the
  `ddd-decision-strategist` agent are prose and code samples only.

## How it works with the other plugins

- **In.** A spec from `software:spec` that describes a new system comes here for `ddd`; a feature
  inside an existing system goes to `software:brainstorm` instead. `improve-codebase-architecture`
  grills through `software:grilling`.
- **Out.** `ddd-code`'s implementation plan and `ddd-contracts`' payload schemas feed
  `software:create-plan` and `software:tdd`; `final.html` from `ddd export blueprint --deliver` is the picture
  to hand over with them. `improve` writes plans for another agent to execute, for example with
  `software:execute-plan`.
- **Parallel candidates.** `architect` designs twice through `software:arena`.
- **Diagrams for the rest of the plugin.** `software:explain-diff` embeds validated Blueprint
  viewers in its article and falls back to inline SVG when Node is missing.
- **Principles and history.** `architect` cites the principles by name, as topics of
  `software:principles` (for example `software:principles` (topic `principle-boundary-discipline`)),
  and runs `software:why` for why the existing code is shaped the way it is.

## Credits

`ddd`, its nine steps, the `ddd-decision-strategist` agent and the shared DDD toolchain are the
marketplace owner's. Blueprint is a renamed, bundled derivative of
[archify](https://github.com/tt-a1i/archify) 2.17.0-dev.1 by tt-a1i, itself based on Cocoon AI's
architecture-diagram-generator, under MIT; JetBrains Mono is under the SIL Open Font License 1.1.
See [skills/blueprint/NOTICE.md](../../skills/blueprint/NOTICE.md).

The other skills are vendored, supply-chain-controlled copies from mattpocock/skills
(`domain-modeling`, `codebase-design`, `improve-codebase-architecture`), shadcn/improve
(`improve`), wshobson/agents (`architecture-decision-records`, `api-design-principles`,
`saga-orchestration`), affaan-m/ECC (`contract-first`), Lauren Tan's pstack in cursor/plugins
(`architect`, MIT, [`LICENSE-pstack.txt`](../../LICENSE-pstack.txt)) and Agents365-ai/drawio-skill (`drawio`). Each is credited
with its upstream repository, path, commit, date, license and author in the plugin's
[NOTICE.md](../../NOTICE.md) (section "From the former `architecture` plugin"),
which also lists what was changed here. Upstream is re-pulled deliberately, not tracked live: diff
against the recorded commit before pulling changes in.

## Existing workspaces

Existing `ddd/` workspaces and their JSON formats are unchanged by the move into `software`. If
you still have the old standalone `ddd` plugin installed, remove it to avoid duplicate DDD skills.

## Invoking

`software:ddd`, `software:ddd-discover`,
`software:blueprint`, `software:codebase-design`, and so on. `ddd` uses those names when it
calls its siblings. `drawio` and `improve-codebase-architecture` must be invoked by you
(`/software:drawio`, `/software:improve-codebase-architecture`); `improve` takes
`quick`/`deep`, a focus, `branch`, `next`, `plan <description>`, `review-plan <file>`,
`execute <plan>`, `reconcile` and `--issues`.
