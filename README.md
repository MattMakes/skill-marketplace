# skill-marketplace

A Claude Code plugin marketplace for engineering work, organised by the life of a change. Sixteen
plugins hold 301 skills and six agents. Each plugin answers one question, so a user who knows the
question knows the plugin:

- **Life of a change** — decide (`product`), shape (`architecture`), build (`dev`), verify
  (`verify`), secure (`security`), ship (`ops`).
- **Foundation**, used at every stage — understand existing code (`code`), engineering principles
  (`craft`), library references (`stack`), agents and skills (`agentic`), multi-agent fleets
  (`herdr`).
- **Domains** — UX/UI design (`design`), game design and review (`game`), building in Godot
  (`godot`), model training (`ml`), knowledge work and prose (`work`).

Most skills are first-party pipelines; the rest are vendored from the open skill ecosystem. Every
vendored skill is a supply-chain-controlled copy, adapted only as far as it takes to run
standalone in Claude Code, and credited with its upstream repository, commit and license in its
plugin's `NOTICE.md`. The harvest that brought most of them in is written up in
[docs/2026-10-11-skill-harvest.md](docs/2026-10-11-skill-harvest.md).

## Install

```bash
claude plugin marketplace add MattMakes/skill-marketplace

# life of a change
claude plugin install product@skill-marketplace
claude plugin install architecture@skill-marketplace
claude plugin install dev@skill-marketplace
claude plugin install verify@skill-marketplace
claude plugin install security@skill-marketplace
claude plugin install ops@skill-marketplace

# foundation
claude plugin install code@skill-marketplace
claude plugin install craft@skill-marketplace
claude plugin install stack@skill-marketplace
claude plugin install agentic@skill-marketplace
claude plugin install herdr@skill-marketplace

# domains
claude plugin install design@skill-marketplace
claude plugin install game@skill-marketplace
claude plugin install godot@skill-marketplace
claude plugin install ml@skill-marketplace
claude plugin install work@skill-marketplace
```

Or from inside a session: `/plugin marketplace add MattMakes/skill-marketplace`, then
`/plugin install <name>@skill-marketplace`.

## Migrating from 2.x

Marketplace **3.0.0 is a breaking change.** The 2.x plugins grew by source, not by job, so one
concept had two or three owners. In 3.0.0 every skill has one home, six plugins are gone, two are
new, and many skills have a new `<plugin>:<skill>` name. Existing project workspaces (`ai_docs/`,
`ddd/`, `docs/wiki/`, `graphify-out/`) need no conversion.

**Removed plugins and where their skills went:**

| Removed plugin | Its skills now live in |
|---|---|
| `tools` | `product` (adhd), `architecture` (api-design-principles), `dev` (pre-flight, unlazy, git worktrees, advanced git; post-flight, unlazy-lite, test-driven-development and systematic-debugging merged into dev skills), `verify` (code-review-excellence, receiving-code-review), `craft` (error-handling-patterns), `agentic` (model-router, persona), `work` (humanize, mochi-deck) |
| `pstack` | `craft` (the sixteen `principle-*` skills), `architecture` (architect), `dev` (arena, show-me-your-work), `verify` (blast-radius, benchmark-checklist, create- and maintain-verification-skill), `code` (why), `agentic` (correct), `stack` (typescript-best-practices), `work` (technical-writing) |
| `meta` | `agentic` (skill-creator, mcp-builder, harvest) |
| `design-system` | `design` (the whole pipeline and the design-critic agent; a11y-audit and design-review merged with design's own); `product:grilling` (grill-me) |
| `game-design` | `game` (the design studio; one-page-design merged into one-page-game-design) |
| `godot-incremental` | `godot` (renamed; all thirteen skills, same names) |

**New plugins:** `architecture` (DDD and Blueprint from `code`, module design and contracts from
`craft`, `tools`, `pstack`, `stack` and `work`) and `godot` (the renamed `godot-incremental`).

**What to do:**

```bash
claude plugin marketplace update skill-marketplace

# 1. uninstall every removed plugin you have
claude plugin uninstall tools@skill-marketplace
claude plugin uninstall pstack@skill-marketplace
claude plugin uninstall meta@skill-marketplace
claude plugin uninstall design-system@skill-marketplace
claude plugin uninstall game-design@skill-marketplace
claude plugin uninstall godot-incremental@skill-marketplace

# 2. install the plugins that now hold those skills
claude plugin install architecture@skill-marketplace
claude plugin install godot@skill-marketplace
#    ...and any of product, dev, verify, code, craft, stack, agentic, design, game, work
#    that you did not have before (see the table above)

# 3. update the rest, then /reload-plugins or restart
```

Uninstall the removed plugins first. A 2.x plugin left installed beside its 3.0.0 successor loads
the same skill twice under two names, and two near-identical descriptions make triggering a coin
flip. Then update anything of yours that calls a skill by its old name — scripts, `AGENTS.md`
files, saved prompts — using the tables below.

**Merged skills.** These no longer exist under any name; their content is a mode or a reference of
the skill they joined:

| Old skill | Now part of | As |
|---|---|---|
| `product:write-spec` | `product:spec` | its quick PRD mode |
| `product:grill-with-docs` | `product:grilling` | its docs-anchored mode |
| `product:intent-driven-development` | `product:requirement-convergence` | — |
| `design-system:grill-me` | `product:grilling` | its design-brief mode |
| `tools:post-flight` | `dev:check-implementation` | its full post-flight mode |
| `tools:unlazy-lite` | `dev:unlazy` | its lite mode |
| `tools:test-driven-development` | `dev:tdd` | — |
| `tools:systematic-debugging` | `dev:debug` | — |
| `craft:diagnosing-bugs` | `dev:debug` | its hard-bug and performance-regression mode |
| `dev:prime` | `code:core` | its quick mode (no graph) |
| `dev:document-project` | `code:deepwiki` | its Brownfield mode |
| `dev:review-git-changes` | `verify:code-sweep` | its light mode |
| `verify:webapp-testing` | `verify:control-ui` | — |
| `ops:shipping-and-launch` | `ops:ship-gate` | its launch checklist and launch-plan mode |
| `design-system:a11y-audit` | `design:a11y-audit` | — |
| `design:accessibility` | `design:a11y-audit` | — |
| `design-system:design-review` | `design:design-review` | — |
| `design:core-web-vitals` | `design:performance` | — |
| `design:design-system-patterns` | `design:design-tokens` | — |
| `design:design-is` | `design:critique` | its Dieter Rams lens (`rams`) |
| `game-design:one-page-design` | `game:one-page-game-design` | its headless pipeline mode |
| `work:statistical-analysis` | `work:statistical-analyst` | — |

Two changes inside skills that kept their names: `code:core` no longer writes `CLAUDE.md` files
or `AGENTS.md` symlinks; it builds the graph and hands the instruction files to `agentic:keys`
(AGENTS.md only). `ops:ship-gate` calls `security:security-sweep` for its security section.

**Every move, by old plugin.** One row per skill and agent that changed its name. A skill not
listed kept its plugin and its name.

<details>
<summary><code>tools</code> (removed): 17 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `tools:adhd` | `product:adhd` | moved |
| `tools:api-design-principles` | `architecture:api-design-principles` | moved |
| `tools:pre-flight` | `dev:pre-flight` | moved |
| `tools:unlazy` | `dev:unlazy` | moved |
| `tools:using-git-worktrees` | `dev:using-git-worktrees` | moved |
| `tools:git-advanced-workflows` | `dev:git-advanced-workflows` | moved |
| `tools:code-review-excellence` | `verify:code-review-excellence` | moved |
| `tools:receiving-code-review` | `verify:receiving-code-review` | moved |
| `tools:error-handling-patterns` | `craft:error-handling-patterns` | moved |
| `tools:model-router` | `agentic:model-router` | moved |
| `tools:persona` | `agentic:persona` | moved |
| `tools:humanize` | `work:humanize` | moved |
| `tools:mochi-deck` | `work:mochi-deck` | moved |
| `tools:post-flight` | `dev:check-implementation` | merged |
| `tools:unlazy-lite` | `dev:unlazy` | merged |
| `tools:test-driven-development` | `dev:tdd` | merged |
| `tools:systematic-debugging` | `dev:debug` | merged |

</details>

<details>
<summary><code>pstack</code> (removed): 27 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `pstack:architect` | `architecture:architect` | moved |
| `pstack:arena` | `dev:arena` | moved |
| `pstack:show-me-your-work` | `dev:show-me-your-work` | moved |
| `pstack:blast-radius` | `verify:blast-radius` | moved |
| `pstack:benchmark-checklist` | `verify:benchmark-checklist` | moved |
| `pstack:create-verification-skill` | `verify:create-verification-skill` | moved |
| `pstack:maintain-verification-skill` | `verify:maintain-verification-skill` | moved |
| `pstack:why` | `code:why` | moved |
| `pstack:principle-attack-the-premise` | `craft:principle-attack-the-premise` | moved |
| `pstack:principle-boundary-discipline` | `craft:principle-boundary-discipline` | moved |
| `pstack:principle-build-the-lever` | `craft:principle-build-the-lever` | moved |
| `pstack:principle-encode-lessons-in-structure` | `craft:principle-encode-lessons-in-structure` | moved |
| `pstack:principle-explain-the-number` | `craft:principle-explain-the-number` | moved |
| `pstack:principle-foundational-thinking` | `craft:principle-foundational-thinking` | moved |
| `pstack:principle-laziness-protocol` | `craft:principle-laziness-protocol` | moved |
| `pstack:principle-make-operations-idempotent` | `craft:principle-make-operations-idempotent` | moved |
| `pstack:principle-migrate-callers-then-delete-legacy-apis` | `craft:principle-migrate-callers-then-delete-legacy-apis` | moved |
| `pstack:principle-minimize-reader-load` | `craft:principle-minimize-reader-load` | moved |
| `pstack:principle-model-the-domain` | `craft:principle-model-the-domain` | moved |
| `pstack:principle-separate-before-serializing-shared-state` | `craft:principle-separate-before-serializing-shared-state` | moved |
| `pstack:principle-sequence-verifiable-units` | `craft:principle-sequence-verifiable-units` | moved |
| `pstack:principle-subtract-before-you-add` | `craft:principle-subtract-before-you-add` | moved |
| `pstack:principle-test-behavior-not-implementation` | `craft:principle-test-behavior-not-implementation` | moved |
| `pstack:principle-type-system-discipline` | `craft:principle-type-system-discipline` | moved |
| `pstack:typescript-best-practices` | `stack:typescript-best-practices` | moved |
| `pstack:correct` | `agentic:correct` | moved |
| `pstack:technical-writing` | `work:technical-writing` | moved |

</details>

<details>
<summary><code>meta</code> (removed): 3 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `meta:skill-creator` | `agentic:skill-creator` | moved |
| `meta:mcp-builder` | `agentic:mcp-builder` | moved |
| `meta:harvest` | `agentic:harvest` | moved |

</details>

<details>
<summary><code>design-system</code> (removed): 25 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `design-system:apply-aesthetic` | `design:apply-aesthetic` | moved |
| `design-system:brandkit` | `design:brandkit` | moved |
| `design-system:critique` | `design:critique` | moved |
| `design-system:data-dashboard` | `design:data-dashboard` | moved |
| `design-system:design-code` | `design:design-code` | moved |
| `design-system:design-component` | `design:design-component` | moved |
| `design-system:design-doctrine` | `design:design-doctrine` | moved |
| `design-system:design-qa` | `design:design-qa` | moved |
| `design-system:design-screen` | `design:design-screen` | moved |
| `design-system:design-tokens` | `design:design-tokens` | moved |
| `design-system:figma-integration` | `design:figma-integration` | moved |
| `design-system:gate` | `design:gate` | moved |
| `design-system:governance` | `design:governance` | moved |
| `design-system:image-to-code` | `design:image-to-code` | moved |
| `design-system:migrate-design-system` | `design:migrate-design-system` | moved |
| `design-system:performance` | `design:performance` | moved |
| `design-system:prototype` | `design:prototype` | moved |
| `design-system:redesign` | `design:redesign` | moved |
| `design-system:scaffold-project` | `design:scaffold-project` | moved |
| `design-system:token-build` | `design:token-build` | moved |
| `design-system:ux-writing` | `design:ux-writing` | moved |
| `design-system:design-critic` (agent) | `design:design-critic` | moved |
| `design-system:grill-me` | `product:grilling` | merged |
| `design-system:a11y-audit` | `design:a11y-audit` | merged |
| `design-system:design-review` | `design:design-review` | merged |

</details>

<details>
<summary><code>game-design</code> (removed): 12 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `game-design:art-direction` | `game:art-direction` | moved |
| `game-design:core-loop` | `game:core-loop` | moved |
| `game-design:design-diagrams` | `game:design-diagrams` | moved |
| `game-design:fun-targeting` | `game:fun-targeting` | moved |
| `game-design:game-brief` | `game:game-brief` | moved |
| `game-design:game-ideation` | `game:game-ideation` | moved |
| `game-design:level-ux` | `game:level-ux` | moved |
| `game-design:one-page-game-design` | `game:one-page-game-design` | moved |
| `game-design:progression-content` | `game:progression-content` | moved |
| `game-design:prototype-plan` | `game:prototype-plan` | moved |
| `game-design:systems-economy` | `game:systems-economy` | moved |
| `game-design:one-page-design` | `game:one-page-game-design` | merged |

</details>

<details>
<summary><code>godot-incremental</code> (removed): 13 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `godot-incremental:balance-model-data` | `godot:balance-model-data` | moved |
| `godot-incremental:bot-balance-loop` | `godot:bot-balance-loop` | moved |
| `godot-incremental:feature-seams-and-saves` | `godot:feature-seams-and-saves` | moved |
| `godot-incremental:fleet-game-dev` | `godot:fleet-game-dev` | moved |
| `godot-incremental:game-audio` | `godot:game-audio` | moved |
| `godot-incremental:godot-perf` | `godot:godot-perf` | moved |
| `godot-incremental:godot-testing` | `godot:godot-testing` | moved |
| `godot-incremental:headless-godot-runs` | `godot:headless-godot-runs` | moved |
| `godot-incremental:pixel-art-pipeline` | `godot:pixel-art-pipeline` | moved |
| `godot-incremental:release-and-store` | `godot:release-and-store` | moved |
| `godot-incremental:safe-refactor-and-review` | `godot:safe-refactor-and-review` | moved |
| `godot-incremental:upgrade-tree-design` | `godot:upgrade-tree-design` | moved |
| `godot-incremental:visual-verification` | `godot:visual-verification` | moved |

</details>

<details>
<summary><code>code</code>: 16 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `code:ddd` | `architecture:ddd` | moved |
| `code:ddd-understand` | `architecture:ddd-understand` | moved |
| `code:ddd-discover` | `architecture:ddd-discover` | moved |
| `code:ddd-decompose` | `architecture:ddd-decompose` | moved |
| `code:ddd-strategize` | `architecture:ddd-strategize` | moved |
| `code:ddd-connect` | `architecture:ddd-connect` | moved |
| `code:ddd-organise` | `architecture:ddd-organise` | moved |
| `code:ddd-define` | `architecture:ddd-define` | moved |
| `code:ddd-code` | `architecture:ddd-code` | moved |
| `code:ddd-contracts` | `architecture:ddd-contracts` | moved |
| `code:blueprint` | `architecture:blueprint` | moved |
| `code:complexity-sweep` | `verify:complexity-sweep` | moved |
| `code:e2e-harness` | `verify:e2e-harness` | moved |
| `code:security-sweep` | `security:security-sweep` | moved |
| `code:keys` | `agentic:keys` | moved |
| `code:ddd-decision-strategist` (agent) | `architecture:ddd-decision-strategist` | moved |

</details>

<details>
<summary><code>dev</code>: 13 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `dev:research-codebase` | `code:research-codebase` | moved |
| `dev:trace` | `code:trace` | moved |
| `dev:code-sweep` | `verify:code-sweep` | moved |
| `dev:server-component-rules` | `stack:server-component-rules` | moved |
| `dev:rules-from-code` | `agentic:rules-from-code` | moved |
| `dev:engineering-rules` | `agentic:engineering-rules` | moved |
| `dev:code-reviewer` (agent) | `verify:code-reviewer` | moved |
| `dev:codebase-locator` (agent) | `code:codebase-locator` | moved |
| `dev:codebase-analyzer` (agent) | `code:codebase-analyzer` | moved |
| `dev:codebase-pattern-finder` (agent) | `code:codebase-pattern-finder` | moved |
| `dev:prime` | `code:core` | merged |
| `dev:document-project` | `code:deepwiki` | merged |
| `dev:review-git-changes` | `verify:code-sweep` | merged |

</details>

<details>
<summary><code>craft</code>: 13 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `craft:domain-modeling` | `architecture:domain-modeling` | moved |
| `craft:codebase-design` | `architecture:codebase-design` | moved |
| `craft:improve-codebase-architecture` | `architecture:improve-codebase-architecture` | moved |
| `craft:improve` | `architecture:improve` | moved |
| `craft:architecture-decision-records` | `architecture:architecture-decision-records` | moved |
| `craft:contract-first` | `architecture:contract-first` | moved |
| `craft:verification-before-completion` | `dev:verification-before-completion` | moved |
| `craft:doubt-driven-development` | `dev:doubt-driven-development` | moved |
| `craft:finishing-a-development-branch` | `dev:finishing-a-development-branch` | moved |
| `craft:make-pr-easy-to-review` | `dev:make-pr-easy-to-review` | moved |
| `craft:code-tour` | `code:code-tour` | moved |
| `craft:retro` | `agentic:retro` | moved |
| `craft:diagnosing-bugs` | `dev:debug` | merged |

</details>

<details>
<summary><code>product</code>: 5 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `product:plan-design-review` | `design:plan-design-review` | moved |
| `product:spec-driven-workflow` | `dev:spec-driven-workflow` | moved |
| `product:write-spec` | `product:spec` | merged |
| `product:grill-with-docs` | `product:grilling` | merged |
| `product:intent-driven-development` | `product:requirement-convergence` | merged |

</details>

<details>
<summary><code>design</code>: 6 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `design:web-quality-audit` | `verify:web-quality-audit` | moved |
| `design:frontend-slides` | `work:frontend-slides` | moved |
| `design:accessibility` | `design:a11y-audit` | merged |
| `design:core-web-vitals` | `design:performance` | merged |
| `design:design-system-patterns` | `design:design-tokens` | merged |
| `design:design-is` | `design:critique` | merged |

</details>

<details>
<summary><code>stack</code>: 1 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `stack:saga-orchestration` | `architecture:saga-orchestration` | moved |

</details>

<details>
<summary><code>agentic</code>: 1 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `agentic:human-gate` | `verify:human-gate` | moved |

</details>

<details>
<summary><code>work</code>: 2 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `work:drawio` | `architecture:drawio` | moved |
| `work:statistical-analysis` | `work:statistical-analyst` | merged |

</details>

<details>
<summary><code>verify</code>: 1 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `verify:webapp-testing` | `verify:control-ui` | merged |

</details>

<details>
<summary><code>ops</code>: 1 skills and agents</summary>

| Old name | New name | Change |
|---|---|---|
| `ops:shipping-and-launch` | `ops:ship-gate` | merged |

</details>

Each plugin's README has a "Moved in v3" section with the same moves from that plugin's side.

---

# Life of a change

## `product` — Product Thinking and Specs

**What should we build, and why?** From an idea to a spec someone can build from: discover,
research, challenge, specify. Nineteen skills.

| Skill | What it does |
|---|---|
| `product-brainstorming` | A thinking partner for a problem space: explore an opportunity, generate solutions, challenge assumptions. |
| `office-hours` | YC office hours: six forcing questions for a startup idea, or design-thinking brainstorming for a builder. |
| `deep-research` | A disciplined multi-source investigation with parallel subagents and triangulated sources. |
| `grilling` | Grills a plan or idea in rounds over a design tree, with a recommended answer for each question; docs-anchored and design-brief modes. |
| `spec` | Turns vague intent into an executable spec through strict phases; a quick PRD mode. |
| `requirement-convergence` | Separates the outcome from the proposed requirements, then writes verifiable acceptance criteria. |

Full list: [plugins/product/README.md](plugins/product/README.md).

```bash
claude plugin install product@skill-marketplace
```

## `architecture` — Architecture

**How should the system be shaped?** Domain-driven design, module design, decision records,
contracts and diagrams. Twenty-one skills and one agent. The DDD and Blueprint tools need Node.js
18 or newer.

| Skill | What it does |
|---|---|
| `ddd` | Starts or resumes the nine-step DDD Starter Modelling Process (`ddd-understand` … `ddd-contracts`) over one `ddd/` workspace, with validators, a review page and the `ddd-decision-strategist` agent. |
| `blueprint` | Renders validated architecture, workflow, sequence, data-flow and lifecycle diagrams as explorable standalone HTML with image export. |
| `domain-modeling` | The light DDD mode for an existing codebase: terminology, `GLOSSARY.md`, ADRs. |
| `codebase-design` | Shared vocabulary for deep modules: interfaces, seams, testability. |
| `architecture-decision-records` | Writes and maintains ADRs. |
| `contract-first` | Coordinates services through one machine-checkable contract (OpenAPI, AsyncAPI, Protobuf, JSON Schema). |
| `drawio` | Editable `.drawio` diagrams for humans to keep editing. |

Full list: [plugins/architecture/README.md](plugins/architecture/README.md); the DDD guide is
[plugins/architecture/docs/ddd.md](plugins/architecture/docs/ddd.md).

```bash
claude plugin install architecture@skill-marketplace
```

## `dev` — Development Workflow

**Build the change.** A chained pipeline over one `ai_docs/` workspace in the repository you work
in: design, plan, execute, check, hand off. **Start with `workflow`.** A *change* means a merge
request on GitLab or a pull request on GitHub; the skills detect `glab` or `gh` at runtime.
Twenty-three skills.

| Skill | What it does |
|---|---|
| `workflow` | The entry point. Shows the paths and which skill comes next. |
| `brainstorm` | Turns a rough idea into a formed technical design through structured questioning. |
| `create-plan` | Writes an implementation plan an engineer with zero codebase context could follow. |
| `execute-plan` | Executes the plan in batches with reviewer subagents; `swarm` and `arena` are the parallel alternatives. |
| `check-implementation` | Verifies the built code against the plan; full post-flight mode from the former `tools:post-flight`. |
| `debug` | Systematic debugging before any fix; a hard-bug and performance-regression mode. |
| `tdd` | Red-green-refactor discipline for features, bug fixes and skill authoring. |
| `change-description` | Writes the description for a change from the ticket and the diff. |

Full list: [plugins/dev/README.md](plugins/dev/README.md).

```bash
claude plugin install dev@skill-marketplace
```

## `verify` — Review and Verification

**Is it right, and does it work?** Review by reading, proof by running, in separate groups.
Thirty-two skills and one agent.

| Skill | What it does |
|---|---|
| `code-sweep` | Twelve parallel reviewers, one concern each, into one severity-ranked report; a light six-aspect mode. Uses the `code-reviewer` agent. |
| `complexity-sweep` | Fourteen complexity metrics on TypeScript, JavaScript, Python, Rust and GDScript, then refactors or emits refactoring prompts. |
| `blast-radius` | Finds what a change could break beyond the diff and proves the fact it is safe because of. |
| `verify-feature` | Builds and runs the app and observes the change at its real surface, capturing runtime evidence. |
| `e2e-harness` | Turns a documented polyglot system into a deterministic Playwright end-to-end suite. |
| `playwright-pro` | Playwright test authoring, templates, anti-pattern review and flaky-test diagnosis. |
| `dogfood` | Exploratory QA of a web app with screenshots and reproduction steps. |

Full list: [plugins/verify/README.md](plugins/verify/README.md).

```bash
claude plugin install verify@skill-marketplace
```

## `security` — Security Practice

**Is it safe?** **Start with `security-sweep`**, which orchestrates the rest. Nine skills.

| Skill | What it does |
|---|---|
| `security-sweep` | A multi-agent OWASP, STRIDE, secrets, supply-chain and LLM-security audit with a verifier fan-out and a CSO report. |
| `security-threat-model` | A repository-grounded threat model: trust boundaries, assets, abuse paths, mitigations. |
| `agent-security-hardening` | Hardening for agent runtimes that process untrusted content, call tools or hold credentials. |
| `skill-security-auditor` | Scans a third-party skill for malicious code before you install it. |
| `git-guardrails-claude-code` | Installs Claude Code hooks that block destructive git commands, only when invoked. |

Full list: [plugins/security/README.md](plugins/security/README.md).

```bash
claude plugin install security@skill-marketplace
```

## `ops` — Production Operations

**Ship it and run it.** Release, instrument, set targets and learn from what breaks. Sixteen
skills.

| Skill | What it does |
|---|---|
| `ship-gate` | "Can this go to production?" A pre-launch audit with a launch-plan mode; calls `security:security-sweep` for its security section. |
| `observability-and-instrumentation` | Structured logs, RED metrics, OpenTelemetry and alerts with runbooks. |
| `slo-architect` | SLOs, SLIs, error budgets and burn-rate alerts. |
| `feature-flags-architect` | Feature flags as a lifecycle: taxonomy, rollout plans, debt scanning. |
| `migration-architect` | Zero-downtime database, service and infrastructure migrations with rollback paths. |
| `postmortem-writing` | Blameless postmortems. |

Full list: [plugins/ops/README.md](plugins/ops/README.md).

```bash
claude plugin install ops@skill-marketplace
```

---

# Foundation

## `code` — Code Intelligence

**What does this existing code do?** Prime a repository into a code graph, trace and research it,
find out why it is shaped the way it is, document it, and explain a change. **Start with
`core`.** Seven skills and three agents.

| Skill | What it does |
|---|---|
| `core` | Primes a repository once with a deterministic zero-token knowledge graph (graphify) and hands the `AGENTS.md` tree to `agentic:keys`; a quick read-only mode. |
| `research-codebase` | Documents the codebase as it is, with the `codebase-locator`, `codebase-analyzer` and `codebase-pattern-finder` agents. |
| `trace` | Follows an entry point upstream and downstream and writes the business logic in prose; parity sweeps. |
| `why` | Design rationale from every source it can reach: git, issues, docs, chat, observability. |
| `deepwiki` | A wiki with `file:line` citations and validated Mermaid; a Brownfield mode for agents. |
| `explain-diff` | A diff, branch or PR as one self-contained HTML explainer with a quiz and Blueprint diagrams, narrated when the local service runs. |

Full list: [plugins/code/README.md](plugins/code/README.md).

```bash
claude plugin install code@skill-marketplace
```

## `craft` — Engineering Craft

**What does good code look like?** Sixteen one-page engineering principles from Lauren Tan's
pstack plus code-level practice. Twenty-six skills.

| Skill | What it does |
|---|---|
| `principle-*` | Sixteen principles: type-system discipline, model the domain, minimize reader load, boundary discipline, idempotent operations, subtract before you add and more. |
| `ponytail` | The smallest change that fully solves the task, and a reply a busy human reads once. |
| `karpathy-coder` | Karpathy's four coding principles, with a pre-commit gate. |
| `error-handling-patterns` | Exceptions, Result types, propagation and graceful degradation across languages. |
| `prototype` | A throwaway prototype that answers one design question. |
| `oh-my-issues` | Clusters an issue backlog by root cause. |

Full list: [plugins/craft/README.md](plugins/craft/README.md).

```bash
claude plugin install craft@skill-marketplace
```

## `stack` — Stack References

**What does this library get wrong?** Library and framework references with the gotchas a model
gets wrong. Twenty-four skills.

| Skill | What it does |
|---|---|
| `gsap-*`, `motion-*`, `remotion-best-practices` | GreenSock's official GSAP set, a motion/react system in three layers, Remotion. |
| `react-best-practices`, `react-useeffect`, `server-component-rules` | React and Next.js performance rules, `useEffect` discipline, Server Components and Server Actions. |
| `typescript-best-practices` | Sixteen TypeScript rules with before/after code. |
| `postgres-best-practices`, `prisma-patterns`, `database-migrations` | Postgres, Prisma, and per-tool database migrations. |
| `cpp-coding-standards`, `dotnet-backend-patterns`, `swift-concurrency-expert` | C++ Core Guidelines, .NET backend patterns, Swift concurrency. |

Full list: [plugins/stack/README.md](plugins/stack/README.md).

```bash
claude plugin install stack@skill-marketplace
```

## `agentic` — Agent Engineering

**Make agents, skills and the agent harness.** Instruction files, learning from sessions, routing,
building agents, making skills and MCP servers. Nineteen skills.

| Skill | What it does |
|---|---|
| `keys` | A self-maintaining `AGENTS.md` hierarchy; folds `CLAUDE.md`, `.cursorrules` and similar files into it after you confirm. |
| `writing-for-agents` | How to write skills and `AGENTS.md` files that agents use well. |
| `agent-memory` | Lets an agent learn durable facts from its own sessions; can install hooks, only when invoked. |
| `loop-design-check` | Designs or reviews an agent loop for spinning, verifier gaming and runaway wrong answers. |
| `skill-creator` | Creates, edits and evaluates a skill, and measures whether its description triggers. |
| `mcp-builder` | Builds an MCP server and a harness to evaluate it. |
| `harvest` | Clones a GitHub repository you name and installs the skills it finds. |

Full list: [plugins/agentic/README.md](plugins/agentic/README.md).

```bash
claude plugin install agentic@skill-marketplace
```

## `herdr` — herdr Fleet

**Run a fleet of agent sessions** in persistent terminal panes. Needs the
[herdr](https://herdr.dev) CLI, which is not bundled. **Start with `herdr-setup`.** Four skills.

| Skill | What it does |
|---|---|
| `herdr-setup` | Checks the machine and fills only what is missing before the first run. |
| `herdr-orchestrator` | The orchestrator side: decompose work, spawn and assign workers by tier, integrate results. |
| `herdr-worker` | The worker side: take a task, work independently, record progress, report done. |
| `herdr-atomic` | Deterministic one-action-per-call scripts for driving herdr, returning JSON. |

Full list: [plugins/herdr/README.md](plugins/herdr/README.md).

```bash
claude plugin install herdr@skill-marketplace
```

---

# Domains

## `design` — UX/UI Design

**How should it look and feel?** A design-system spine with vendored directions attached, and
render gates that measure accessibility in light and dark instead of claiming it. **Start with
`design-doctrine`**, then `design-screen`. The render gates need Playwright once per install;
the plugin README has the command. Thirty-four skills and the `design-critic` agent.

| Skill | What it does |
|---|---|
| `design-doctrine` | The verification protocol and house rules every other design skill assumes. |
| `design-screen` | A page, screen or app end to end: brief, direction, tokens, build, gates, critic. |
| `design-tokens` | DTCG tokens in three tiers. |
| `frontend-design` | Distinctive visual direction that does not read as a templated default. |
| `gate` | The one-command quality gate with a real N/N result. |
| `a11y-audit` | Scan, fix and verify WCAG 2.2 A and AA, or audit a design against WCAG and ARIA. |
| `critique` | Adversarial design critique; a Dieter Rams lens with `rams`. |

Full list: [plugins/design/README.md](plugins/design/README.md).

```bash
claude plugin install design@skill-marketplace
```

## `game` — Game Design and Review

**What game, and is it good?** Any engine. A design studio and a review board backed by cited
rules distilled from 38 game-development books. **Start with `game-studio-cpo`** for review, or
`one-page-game-design` for design. Seventeen skills.

| Skill | What it does |
|---|---|
| `game-studio-cpo` | A veteran studio Chief Product Officer for any "is this fun" question, checking the work against a 2,970-rule studio rulebook. |
| `one-page-game-design` | A one-page visual design as interactive HTML or SVG with a printable PDF, collaborative or headless. |
| `fun-targeting` | Picks two or three kinds of fun and traces every mechanic back to one. |
| `game-ideation` | Concepts under a constraint card, a boundaries-first gate and a scored shortlist. |
| `core-loop` | Moment-to-moment, session and long-term loops. |
| `game-balance-auditor` | Economies, sources and drains, feedback loops, difficulty curves. |

Full list: [plugins/game/README.md](plugins/game/README.md).

```bash
claude plugin install game@skill-marketplace
```

## `godot` — Godot Build

**Build it in Godot.** Thirteen skills from the agent sessions of one long Godot build: scripted
bots, headless tests, a scripted balance model and a worker fleet. The rules each skill measures
against live in `game`'s auditors. Needs Godot 4 and Python 3; `ffmpeg` serves two skills.

| Skill | What it does |
|---|---|
| `balance-model-data` | A scripted balance model as the source of the game's data, with parity to the game. |
| `feature-seams-and-saves` | Content and modes behind data seams and flags; saves safe across versions. |
| `headless-godot-runs` | Runs Godot tools, probes and bots headless without side effects. |
| `godot-testing` | The headless test loop, test quality and the finish gate of a unit. |
| `bot-balance-loop` | Bot fights, measure tables and wall diagnosis against target bands. |
| `fleet-game-dev` | Habits for a game built by many agent sessions: locks, worktrees, landing, verification. |

Full list: [plugins/godot/README.md](plugins/godot/README.md).

```bash
claude plugin install godot@skill-marketplace
```

## `ml` — LLM Training and ML Pipelines

**Train and evaluate a model.** Seven skills walk a post-training run end to end, eval-gated; two
design retrieval and ranking pipelines. Nine skills.

| Skill | What it does |
|---|---|
| `finetuning-method-selection` | Whether to fine-tune at all, and which method for the data shape. |
| `eval-harness-first` | The golden set, graders and baseline before any training config. |
| `dataset-curation` | Formats, templates, packs and documents the training data. |
| `lora-qlora-recipes` | The LoRA/QLoRA recipe with Unsloth defaults and failure signatures. |
| `checkpoint-promotion` | Gates a trained checkpoint before it ships. |
| `rag-architect` | Designs and evaluates RAG pipelines. |

Full list: [plugins/ml/README.md](plugins/ml/README.md).

```bash
claude plugin install ml@skill-marketplace
```

## `work` — Knowledge Work

**Knowledge work and prose.** Data, product operations, support and legal, writing, media and
files. Twenty-eight skills.

| Skill | What it does |
|---|---|
| `technical-writing` | The entry for prose: Diátaxis structure, Google developer style, STE and Global English. |
| `humanize` | Writes and edits prose a person will read, then scrubs the AI tells. |
| `explore-data` | Profiles a dataset: shape, quality, distributions. |
| `statistical-analyst` | Hypothesis tests, A/B results, sample sizes and descriptive statistics. |
| `frontend-slides` | Zero-dependency HTML slide decks. |
| `mochi-deck` | Teaches a concept, then packages it as a spaced-repetition Mochi deck. |

Full list: [plugins/work/README.md](plugins/work/README.md).

```bash
claude plugin install work@skill-marketplace
```

---

## `services/` — local companions, not plugins

A skill can ask a local service to do something no skill can do alone. Those services live in
`services/`, deliberately outside `plugins/` and absent from `marketplace.json`: they are not
installed by `/plugin`, and they hold state — a Python environment, model weights — that a
plugin directory managed by the installer is the wrong home for.

**[`services/breeze-tts`](services/breeze-tts/)** narrates. It holds
[Breeze TTS 2](https://huggingface.co/BreezeBlue/Breeze-TTS-2) in memory on Apple Silicon and turns
text into an MP3 plus the exact times each paragraph is spoken. `code:explain-diff` uses it to make
its HTML explainers read themselves aloud with a follow-along player.

```bash
cd services/breeze-tts
just install   # once: vendor the port, fetch ~3.5 GB of weights, start it
just start     # start it again later
just down      # stop it
```

Narration is always optional. With the service down, `explain-diff` writes exactly the explainer
it always did — the narration step exits 3 and changes nothing. The model's weights are under a
research and non-commercial licence, so they are never committed here; `setup.sh` fetches them
from Hugging Face, where you accept those terms yourself. See
[`services/breeze-tts/README.md`](services/breeze-tts/README.md).

**[`services/suno-mcp`](services/suno-mcp/)** makes music. It is an MCP server that drives
[Suno](https://suno.com) with your own login, rebuilt from the PyPI `suno-mcp` package so that
nothing it runs can reach a host other than Suno's: a permanent audit hook on the Python process,
an allowlisting HTTP transport, and Chromium resolver and proxy rules that also stop the beacons
request interception misses. `suno_network_audit` shows what was allowed and blocked.

```bash
cd services/suno-mcp
just install   # hash-locked environment plus Playwright's Chromium
just login     # sign in to Suno once
claude mcp add suno -- uv run --directory "$PWD" --frozen --offline suno-local serve
```

See [`services/suno-mcp/README.md`](services/suno-mcp/README.md) for what changed from upstream
and why.

## Layout

```
skill-marketplace/
├── .claude-plugin/
│   └── marketplace.json        # the marketplace manifest
├── plugins/
│   └── <plugin>/               # folder name == plugin name
│       ├── .claude-plugin/
│       │   └── plugin.json     # the plugin manifest
│       ├── skills/<name>/SKILL.md
│       ├── agents/<name>.md    # where the plugin ships any
│       ├── shared/             # scripts, schemas and references used by several skills
│       └── NOTICE.md           # upstream credits, where the plugin vendors third-party skills
├── services/
│   └── <service>/              # long-running local companions, not plugins
└── README.md
```

Folder name, `plugin.json` `name`, and the marketplace entry `name` are always the same terse
string; `displayName` carries the readable label. `skills/` and `agents/` are the default
locations, so no manifest field points at them. `shared/` is plain plugin payload — skills reach
it through `${CLAUDE_PLUGIN_ROOT}`, which Claude Code expands to the install directory, so a
plugin works wherever it lands.

Installing a plugin wires nothing. Some skills write outside their own install directory, on
purpose, when you run them:

- `herdr`'s setup (`herdr-setup`, or the `install.sh` wrapper) symlinks `horch` into
  `~/.local/bin` (`HORCH_BIN_DIR` overrides) and, only for a cloned repo rather than a plugin
  install, links skills into `~/.claude/skills` (`CLAUDE_SKILLS_DIR` overrides).
- `code:core` installs `graphify` (from PyPI, isolated) plus git and Claude Code hooks into the
  repo you point it at (`graph.sh --no-hooks` skips the hooks).
- `agentic:harvest` clones the GitHub repository you name and copies its skills into
  `~/.claude/skills` (`CLAUDE_SKILLS_DIR` overrides). `agentic:agent-memory`,
  `security:git-guardrails-claude-code` and `security:block-no-verify-hook` install hooks.
- `design`'s render gates install Playwright into the plugin's own `shared/` when you run the
  install command its skills print, and keep gate receipts in the plugin data directory or the OS
  temp directory; `design:scaffold-project` writes a new project where you point it.
- The `dev` and `architecture:ddd` pipelines write their working documents inside the repository
  you run them in (`ai_docs/` and `ddd/`), which is the point.

Each plugin README has a "What these write and where they reach" section with the details.

## Skill names are namespaced

Installed as plugins, skills are addressed as `<plugin>:<skill>` — `dev:workflow`,
`architecture:ddd`, `code:core`, `herdr:herdr-orchestrator`, `work:humanize`, `craft:ponytail`,
`product:grilling`, `verify:blast-radius`. Agents too: `architecture:ddd-decision-strategist`,
`code:codebase-locator`, `verify:code-reviewer`. The skills that dispatch their siblings
(`dev:workflow`, `architecture:ddd` and every agent-dispatch site) use the namespaced form,
including across plugins: the `dev` pipeline starts with `code:core`, and `ops:ship-gate` calls
`security:security-sweep`. A bare name may still resolve when it is unambiguous, but do not rely
on it.

If you already have any of these skills loose in `~/.claude/skills`, move the loose copy aside
before installing the plugin. Claude Code loads both, and two identical descriptions make
triggering a coin flip.

## What is not in the repo

Most of a clone is the DDD golden test fixtures under `architecture/shared`. `.gitignore` keeps
the rest out:

| Ignored | Why |
|---|---|
| `**/node_modules/` | the Playwright fixture install under `verify/skills/e2e-harness/evals/fixtures/`, which dwarfs the fixture itself; also the install for `verify/skills/complexity-sweep`'s bundled CLI, which the skill runs `npm install` for on first use; and `design/shared`'s Playwright and axe-core runtime for the render gates |
| `**/e2e/artifacts/`, `**/test-results/` | regenerated by `e2e run` and Playwright |
| `__pycache__/`, `*.py[cod]`, `.pytest_cache/` | Python and test caches |
| `services/*/models/`, `.venv/`, `jobs/` | model weights (gigabytes, and separately licensed), Python environments and generated audio — all rebuilt by the service's own `setup.sh` |

## Validate after editing

```bash
claude plugin validate .                    # the marketplace manifest
claude plugin validate ./plugins/<name>     # one plugin
claude plugin marketplace update skill-marketplace
```

`claude plugin validate` checks JSON shape but **not** that a relative `source` actually
resolves — a renamed folder passes validation and then fails at install. Check sources too:

```bash
node -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json', 'utf8'));
for (const p of d.plugins) {
  const s = p.source;
  if (typeof s === 'string' && !fs.existsSync(s.replace(/^\.\//, ''))) console.log('BROKEN', p.name, s);
}
"
```

Changes to a `SKILL.md` take effect immediately. Changes to manifests, agents or hooks need
`/reload-plugins` or a restart.
