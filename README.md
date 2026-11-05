# skill-marketplace

A Claude Code plugin marketplace in five plugins, one per kind of work. Each plugin is a complete
surface: install the one for the work you do and it holds every skill that work needs, from the
first question to the finished result, so a skill rarely has to reach into another plugin. The
five hold 267 skills and six agents.

| Plugin | The question it answers | Skills |
|---|---|---|
| [`software`](plugins/software/README.md) | How do I take a change from idea to production? | 142 and five agents |
| [`design`](plugins/design/README.md) | How should it look and feel? | 34 and one agent |
| [`game`](plugins/game/README.md) | How do I make a game, and is it good? | 30 |
| [`agents`](plugins/agents/README.md) | How do I build an AI system: agents, skills, fleets, models? | 24 |
| [`work`](plugins/work/README.md) | How do I research, decide, analyse and write when the work is not code? | 37 |

Most skills are first-party pipelines; the rest are vendored from the open skill ecosystem. Every
vendored skill is a supply-chain-controlled copy, adapted only as far as it takes to run
standalone in Claude Code, and credited with its upstream repository, commit and license in its
plugin's `NOTICE.md`. The harvest that brought most of them in is written up in
[docs/2026-10-11-skill-harvest.md](docs/2026-10-11-skill-harvest.md).

Coming from 2.x? Read [Migrating from 2.x](#migrating-from-2x): 3.0.0 is one breaking change, and
the twenty 2.x plugins are now these five.

## Install

```bash
claude plugin marketplace add MattMakes/skill-marketplace

claude plugin install software@skill-marketplace
claude plugin install design@skill-marketplace
claude plugin install game@skill-marketplace
claude plugin install agents@skill-marketplace
claude plugin install work@skill-marketplace
```

Or from inside a session: `/plugin marketplace add MattMakes/skill-marketplace`, then
`/plugin install <name>@skill-marketplace`.

## `software` — Software Engineering

**How do I take a change from idea to production?** For anyone who writes or changes code. One
plugin for the whole life of a change: decide, shape, understand, build, verify, secure, ship,
with engineering principles and stack references alongside. A *change* means a merge request on
GitLab or a pull request on GitHub; the pipeline skills detect `glab` or `gh` at runtime. The DDD
and Blueprint tools need Node.js 18 or newer. **Start with `workflow`**, which shows the paths and
which skill comes next.

| Area | Start with | What it covers |
|---|---|---|
| Decide | `interview-me`, `spec` | Interview an underspecified ask, grill a plan (`grilling`), attack a spec (`devil`), write an issue or a PRD (`spec`), acceptance criteria (`requirement-convergence`), problem-space brainstorming, reverse-engineer a PRD from code. |
| Shape | `ddd` | The nine-step DDD Starter Modelling Process with the `ddd-decision-strategist` agent, `blueprint` diagrams, `drawio`, module design, ADRs, `contract-first`, API design, sagas. |
| Understand | `core` | A code knowledge graph (`core`) and one `AGENTS.md` tree (`keys`), `trace`, `research-codebase` with three agents, `why`, `deepwiki`, `code-tour`, `explain-diff`. |
| Build | `workflow` | `brainstorm` → `create-plan` → `pre-flight` → `execute-plan` → `check-implementation` → `change-description` over one `ai_docs/` workspace; `tdd`, `debug`, `swarm`, `arena`, `unlazy`, git worktrees. |
| Verify | `code-sweep`, `verify-feature` | Review by reading (`code-sweep` with the `code-reviewer` agent, `complexity-sweep`, `blast-radius`) and proof by running (harnesses, `e2e-harness`, `playwright-pro`, `test-audit`, `dogfood`). |
| Secure | `security-sweep` | An OWASP, STRIDE, secrets, supply-chain and LLM-security audit, threat models, agent hardening, skill and MCP audits, git guardrail hooks. |
| Ship | `ship-gate` | Pre-launch audit and launch plan, SLOs, observability, feature flags, CI/CD, containers, migrations, postmortems. |
| Agent harness | `keys` | Rules from your own code, agent memory, `stow`, `retro`, `correct`, `persona`. |
| Principles and stacks | `principles` | Five router skills that load one guide at a time: `principles`, `animation`, `react-typescript`, `data`, `systems`; plus `dotnet-backend-patterns`, error handling and code-level practice. |

Full list: [plugins/software/README.md](plugins/software/README.md); the DDD guide is
[plugins/software/docs/ddd.md](plugins/software/docs/ddd.md).

```bash
claude plugin install software@skill-marketplace
```

## `design` — UX/UI Design

**How should it look and feel?** For anyone building a user interface. A design-system spine with
vendored directions attached, and render gates that measure accessibility in light and dark
instead of claiming it. **Start with `design-doctrine`**, then `design-screen`. The render gates
need Playwright once per install; the plugin README has the command.

| Area | Start with | What it covers |
|---|---|---|
| Rules | `design-doctrine` | The verification protocol and house rules; the `design-critic` agent. |
| System | `design-tokens` | DTCG tokens in three tiers, brand kits, token builds, governance, migration between design systems, Figma, `DESIGN.md`. |
| Build | `design-screen` | Screens, components, any-framework code, image-to-code, redesign, dashboards, prototypes, UX writing. |
| Direction | `frontend-design` | `impeccable`, `hallmark`, `ui-ux-pro-max`, Emil Kowalski's design engineering, 138 named design systems. |
| Gates | `gate` | Contrast, states, axe, keyboard, target size, overflow, reduced motion; `a11y-audit`, screen-reader testing, Core Web Vitals. |
| Critique | `critique` | An adversarial critic with a Dieter Rams lens, `design-review`, `plan-design-review`. |

Full list: [plugins/design/README.md](plugins/design/README.md).

```bash
claude plugin install design@skill-marketplace
```

## `game` — Game Design and Build

**How do I make a game, and is it good?** For anyone making a game. A design studio and a review
board work for any engine; the board's rules are distilled from 38 game-development books. A
Godot build kit builds the game and measures it against those rules. **Start with
`game-studio-cpo`** for review, `one-page-game-design` for design, or the build kit's foundation
skills for Godot.

| Area | Start with | What it covers |
|---|---|---|
| Design studio | `one-page-game-design`, `fun-targeting` | Ideation, kinds of fun, core loops, a brief, a one-page design, diagrams, art direction, systems and economy, progression, levels, a prototype plan. |
| Review board | `game-studio-cpo` | Auditors for systems, balance, code, performance and QA, each scoring against cited rules. |
| Build it in Godot | `balance-model-data`, `godot-testing` | Scripted balance models and bots, upgrade trees, saves, headless runs and tests, frame cost, rendered-frame checks, pixel art, audio, release and store, fleet habits. Needs Godot 4 and Python 3. |

Full list: [plugins/game/README.md](plugins/game/README.md).

```bash
claude plugin install game@skill-marketplace
```

## `agents` — AI Agents and Models

**How do I build an AI system?** For anyone building agents, skills or MCP servers, running a
fleet of agent sessions, or training a model. **Start with `skill-creator`** to make a skill,
`loop-design-check` before an agent loop, `herdr-setup` for a fleet, or
`finetuning-method-selection` to train.

| Area | Start with | What it covers |
|---|---|---|
| Agents | `loop-design-check` | Agent loops, an agent-stack audit, an autoresearch loop, CLIs for agents, writing for agents, model routing. |
| Skills and servers | `skill-creator` | Skill authoring and evals, MCP servers, `harvest` and `book-to-skill`. |
| Fleets (herdr) | `herdr-setup` | Orchestrator and worker sides of a [herdr](https://herdr.dev) fleet and deterministic herdr scripts. The herdr CLI is not bundled. |
| Models (ml) | `finetuning-method-selection` | Eval harness first, dataset curation, LoRA/QLoRA, preference optimisation, GRPO/RLVR, checkpoint promotion, RAG and recommender pipelines. |

Full list: [plugins/agents/README.md](plugins/agents/README.md).

```bash
claude plugin install agents@skill-marketplace
```

## `work` — Knowledge Work

**How do I research, decide, analyse and write when the work is not code?** For anyone doing
research, decisions, data, business documents or prose. **Start with `office-hours`** for a raw
idea, `deep-research` for a question that needs sources, `technical-writing` for prose, or
`explore-data` for a new dataset.

| Area | Start with | What it covers |
|---|---|---|
| Decide and research | `office-hours`, `deep-research` | PRFAQs, a CEO-mode plan review, a panel roast, literature reviews, deep reading, research synthesis, scientific problem selection. |
| Data | `explore-data` | Data QA, SQL across warehouse dialects, statistics and A/B tests, charts, an offline HTML dashboard. |
| Product operations | `metrics-review` | Roadmap and stakeholder updates, competitive briefs, market sizing, startup metrics. |
| Legal, finance, support | `review-contract`, `ticket-triage` | NDA triage, variance analysis, escalations. |
| Writing | `technical-writing` | Clear-prose and writing-guideline checks, `humanize`, READMEs, questionnaires. |
| Media and files | `frontend-slides` | HTML slide decks, ffmpeg video editing, file conversion, Mochi flashcards, a grounded knowledge vault. |

Full list: [plugins/work/README.md](plugins/work/README.md).

```bash
claude plugin install work@skill-marketplace
```

## Migrating from 2.x

Marketplace **3.0.0 is one breaking change.** The 2.x plugins grew by source, not by job: twenty
plugins, one concept with two or three owners, and skills that needed three plugins installed to
do one piece of work. In 3.0.0 the twenty plugins became five, every skill has one home, the
duplicates are merged, and thirty-nine reference skills became topics of five router skills. Many
skills have a new `<plugin>:<skill>` name. Existing project workspaces (`ai_docs/`, `ddd/`,
`docs/wiki/`, `graphify-out/`) need no conversion.

**Where the 2.x plugins went.** Three plugin names survive (`design`, `game`, `work`), but each
changed what it holds. The other seventeen are gone.

| 2.x plugin | Now in |
|---|---|
| `agentic` | `agents` (7), `software` (agent-memory, human-gate, stow) |
| `code` | `software` (19) |
| `craft` | `software` (22) |
| `design` (kept its name) | `design` (16), `work` (frontend-slides), `software` (web-quality-audit) |
| `design-system` | `design` (24), `software` (grill-me) |
| `dev` | `software` (25) |
| `game` (kept its name) | `game` (6) |
| `game-design` | `game` (12) |
| `godot-incremental` | `game` (13) |
| `herdr` | `agents` (4) |
| `meta` | `agents` (3) |
| `ml` | `agents` (9) |
| `ops` | `software` (17) |
| `product` | `software` (13), `work` (9), `design` (plan-design-review) |
| `pstack` | `software` (26), `work` (technical-writing) |
| `security` | `software` (8) |
| `stack` | `software` (23) |
| `tools` | `software` (14), `work` (humanize, mochi-deck), `agents` (model-router) |
| `verify` | `software` (22) |
| `work` (kept its name) | `work` (25), `software` (drawio) |

Counts are skills and agents. The per-skill tables at the end of this section give every name.

**What to do:**

```bash
claude plugin marketplace update skill-marketplace

# 1. uninstall every 2.x plugin that is gone (an error for one you never had is harmless)
for p in agentic code craft design-system dev game-design godot-incremental herdr meta ml \
         ops product pstack security stack tools verify; do
  claude plugin uninstall "$p@skill-marketplace"
done

# 2. install the five plugins you need
claude plugin install software@skill-marketplace
claude plugin install agents@skill-marketplace
#    ...and design, game, work if you did not have them

# 3. update design, game and work if you had them, then /reload-plugins or restart
claude plugin update design@skill-marketplace
claude plugin update game@skill-marketplace
claude plugin update work@skill-marketplace
```

Uninstall the 2.x plugins first. A 2.x plugin left installed beside its 3.0.0 successor loads the
same skill twice under two names, and two near-identical descriptions make triggering a coin
flip. Then update anything of yours that calls a skill by its old name (scripts, `AGENTS.md`
files, saved prompts) using the tables below.

**Router skills.** Reference skills that only hold guidance for one library or one principle are
now topics of a router skill in `software`. The router's description triggers on the whole area;
when it runs it reads only the guide for the topic that applies, so their thirty-nine
descriptions no longer sit in every session's context.

| Router | Topics (the 2.x skills it replaces) |
|---|---|
| `software:principles` | `principle-attack-the-premise`, `principle-boundary-discipline`, `principle-build-the-lever`, `principle-encode-lessons-in-structure`, `principle-explain-the-number`, `principle-foundational-thinking`, `principle-laziness-protocol`, `principle-make-operations-idempotent`, `principle-migrate-callers-then-delete-legacy-apis`, `principle-minimize-reader-load`, `principle-model-the-domain`, `principle-separate-before-serializing-shared-state`, `principle-sequence-verifiable-units`, `principle-subtract-before-you-add`, `principle-test-behavior-not-implementation`, `principle-type-system-discipline` |
| `software:animation` | `gsap-core`, `gsap-frameworks`, `gsap-plugins`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils`, `motion-advanced`, `motion-foundations`, `motion-patterns`, `remotion-best-practices` |
| `software:react-typescript` | `react-best-practices`, `react-useeffect`, `server-component-rules`, `shadcn`, `typescript-best-practices` |
| `software:data` | `database-migrations`, `postgres-best-practices`, `postgresql-table-design`, `prisma-patterns` |
| `software:systems` | `boost-asio-pro`, `cpp-coding-standards`, `swift-concurrency-expert` |

To cite a topic from a skill, a script or an `AGENTS.md`, write the router and the topic:
`software:principles` (topic `principle-model-the-domain`). The guide itself is
`plugins/software/skills/<router>/topics/<topic>/GUIDE.md`; from inside the plugin,
`${CLAUDE_PLUGIN_ROOT}/skills/<router>/topics/<topic>/GUIDE.md`. To use a topic yourself, invoke
the router (`/software:principles`) and name the topic, or just describe the work and let the
router pick. `dotnet-backend-patterns` stays a normal skill, `software:dotnet-backend-patterns`.

**Merged skills.** These no longer exist under any name; their content is a mode or a reference
of the skill they joined:

| 2.x skill | Now part of | As |
|---|---|---|
| `craft:diagnosing-bugs` | `software:debug` | its hard-bug and performance-regression mode |
| `design-system:a11y-audit` | `design:a11y-audit` | its design-audit mode |
| `design-system:design-review` | `design:design-review` | its scored-review mode |
| `design-system:grill-me` | `software:grilling` | its design-brief mode |
| `design:accessibility` | `design:a11y-audit` | its pitfalls and checklist items |
| `design:core-web-vitals` | `design:performance` | its `references/core-web-vitals.md` |
| `design:design-is` | `design:critique` | its Dieter Rams lens (`/design:critique rams`) |
| `design:design-system-patterns` | `design:design-tokens` | its theming, Style Dictionary and component-pattern references |
| `dev:document-project` | `software:deepwiki` | its Brownfield mode |
| `dev:prime` | `software:core` | its quick mode (no graph) |
| `dev:review-git-changes` | `software:code-sweep` | its light mode |
| `game-design:one-page-design` | `game:one-page-game-design` | its headless pipeline mode |
| `ops:shipping-and-launch` | `software:ship-gate` | its launch checklist and launch-plan mode |
| `product:grill-with-docs` | `software:grilling` | its docs-anchored mode |
| `product:intent-driven-development` | `software:requirement-convergence` | its acceptance-criteria mode |
| `product:write-spec` | `software:spec` | its PRD mode (`--prd`) |
| `tools:post-flight` | `software:check-implementation` | its full post-flight mode |
| `tools:systematic-debugging` | `software:debug` | folded into the one debugging skill |
| `tools:test-driven-development` | `software:tdd` | folded into the one TDD skill |
| `tools:unlazy-lite` | `software:unlazy` | its lite mode |
| `verify:webapp-testing` | `software:control-ui` | folded into the one local web harness |
| `work:statistical-analysis` | `work:statistical-analyst` | its Mode 4 and `references/descriptive-trend-and-outliers.md` |

Two changes inside skills that kept their names: `software:core` no longer writes `CLAUDE.md`
files or `AGENTS.md` symlinks; it builds the graph and hands the instruction files to
`software:keys` (`AGENTS.md` only). `software:ship-gate` calls `software:security-sweep` for its
security section instead of keeping its own security rules.

**Every move, by 2.x plugin.** One row per 2.x skill and agent, with its 3.0.0 name.

<details>
<summary><code>agentic</code>: 10 skills and agents, now in agents, software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `agentic:agent-architecture-audit` | `agents:agent-architecture-audit` | moved |
| `agentic:agent-memory` | `software:agent-memory` | moved |
| `agentic:autoresearch-agent` | `agents:autoresearch-agent` | moved |
| `agentic:book-to-skill` | `agents:book-to-skill` | moved |
| `agentic:cli-for-agents` | `agents:cli-for-agents` | moved |
| `agentic:human-gate` | `software:human-gate` | moved |
| `agentic:llm-friendly-context` | `agents:llm-friendly-context` | moved |
| `agentic:loop-design-check` | `agents:loop-design-check` | moved |
| `agentic:stow` | `software:stow` | moved |
| `agentic:writing-for-agents` | `agents:writing-for-agents` | moved |

</details>

<details>
<summary><code>code</code>: 19 skills and agents, now in software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `code:blueprint` | `software:blueprint` | moved |
| `code:complexity-sweep` | `software:complexity-sweep` | moved |
| `code:core` | `software:core` | moved |
| `code:ddd-code` | `software:ddd-code` | moved |
| `code:ddd-connect` | `software:ddd-connect` | moved |
| `code:ddd-contracts` | `software:ddd-contracts` | moved |
| `code:ddd-decompose` | `software:ddd-decompose` | moved |
| `code:ddd-define` | `software:ddd-define` | moved |
| `code:ddd-discover` | `software:ddd-discover` | moved |
| `code:ddd-organise` | `software:ddd-organise` | moved |
| `code:ddd-strategize` | `software:ddd-strategize` | moved |
| `code:ddd-understand` | `software:ddd-understand` | moved |
| `code:ddd` | `software:ddd` | moved |
| `code:deepwiki` | `software:deepwiki` | moved |
| `code:e2e-harness` | `software:e2e-harness` | moved |
| `code:explain-diff` | `software:explain-diff` | moved |
| `code:keys` | `software:keys` | moved |
| `code:security-sweep` | `software:security-sweep` | moved |
| `code:ddd-decision-strategist` (agent) | `software:ddd-decision-strategist` | moved |

</details>

<details>
<summary><code>craft</code>: 22 skills and agents, now in software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `craft:ai-development-guide` | `software:ai-development-guide` | moved |
| `craft:architecture-decision-records` | `software:architecture-decision-records` | moved |
| `craft:code-tour` | `software:code-tour` | moved |
| `craft:codebase-design` | `software:codebase-design` | moved |
| `craft:constraint-driven-development` | `software:constraint-driven-development` | moved |
| `craft:contract-first` | `software:contract-first` | moved |
| `craft:deprecation-and-migration` | `software:deprecation-and-migration` | moved |
| `craft:diagnosing-bugs` | `software:debug` | merged: hard-bug and performance-regression mode |
| `craft:domain-modeling` | `software:domain-modeling` | moved |
| `craft:doubt-driven-development` | `software:doubt-driven-development` | moved |
| `craft:finishing-a-development-branch` | `software:finishing-a-development-branch` | moved |
| `craft:improve-codebase-architecture` | `software:improve-codebase-architecture` | moved |
| `craft:improve` | `software:improve` | moved |
| `craft:karpathy-coder` | `software:karpathy-coder` | moved |
| `craft:make-pr-easy-to-review` | `software:make-pr-easy-to-review` | moved |
| `craft:oh-my-issues` | `software:oh-my-issues` | moved |
| `craft:performance-optimization` | `software:performance-optimization` | moved |
| `craft:ponytail` | `software:ponytail` | moved |
| `craft:prototype` | `software:prototype` | moved |
| `craft:retro` | `software:retro` | moved |
| `craft:source-driven-development` | `software:source-driven-development` | moved |
| `craft:verification-before-completion` | `software:verification-before-completion` | moved |

</details>

<details>
<summary><code>design</code> (kept its name): 18 skills and agents, now in design, software, work</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `design:a11y-audit` | `design:a11y-audit` | unchanged |
| `design:accessibility` | `design:a11y-audit` | merged: pitfalls and checklist items |
| `design:core-web-vitals` | `design:performance` | merged: `references/core-web-vitals.md` |
| `design:design-is` | `design:critique` | merged: Dieter Rams lens (`/design:critique rams`) |
| `design:design-md` | `design:design-md` | unchanged |
| `design:design-review` | `design:design-review` | unchanged |
| `design:design-system-patterns` | `design:design-tokens` | merged: theming, Style Dictionary and component-pattern references |
| `design:emil-design-eng` | `design:emil-design-eng` | unchanged |
| `design:frontend-design` | `design:frontend-design` | unchanged |
| `design:frontend-slides` | `work:frontend-slides` | moved |
| `design:hallmark` | `design:hallmark` | unchanged |
| `design:impeccable` | `design:impeccable` | unchanged |
| `design:make-interfaces-feel-better` | `design:make-interfaces-feel-better` | unchanged |
| `design:review-animations` | `design:review-animations` | unchanged |
| `design:screen-reader-testing` | `design:screen-reader-testing` | unchanged |
| `design:ui-ux-pro-max` | `design:ui-ux-pro-max` | unchanged |
| `design:web-design-guidelines` | `design:web-design-guidelines` | unchanged |
| `design:web-quality-audit` | `software:web-quality-audit` | moved |

</details>

<details>
<summary><code>design-system</code>: 25 skills and agents, now in design, software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `design-system:a11y-audit` | `design:a11y-audit` | merged: design-audit mode |
| `design-system:apply-aesthetic` | `design:apply-aesthetic` | moved |
| `design-system:brandkit` | `design:brandkit` | moved |
| `design-system:critique` | `design:critique` | moved |
| `design-system:data-dashboard` | `design:data-dashboard` | moved |
| `design-system:design-code` | `design:design-code` | moved |
| `design-system:design-component` | `design:design-component` | moved |
| `design-system:design-doctrine` | `design:design-doctrine` | moved |
| `design-system:design-qa` | `design:design-qa` | moved |
| `design-system:design-review` | `design:design-review` | merged: scored-review mode |
| `design-system:design-screen` | `design:design-screen` | moved |
| `design-system:design-tokens` | `design:design-tokens` | moved |
| `design-system:figma-integration` | `design:figma-integration` | moved |
| `design-system:gate` | `design:gate` | moved |
| `design-system:governance` | `design:governance` | moved |
| `design-system:grill-me` | `software:grilling` | merged: design-brief mode |
| `design-system:image-to-code` | `design:image-to-code` | moved |
| `design-system:migrate-design-system` | `design:migrate-design-system` | moved |
| `design-system:performance` | `design:performance` | moved |
| `design-system:prototype` | `design:prototype` | moved |
| `design-system:redesign` | `design:redesign` | moved |
| `design-system:scaffold-project` | `design:scaffold-project` | moved |
| `design-system:token-build` | `design:token-build` | moved |
| `design-system:ux-writing` | `design:ux-writing` | moved |
| `design-system:design-critic` (agent) | `design:design-critic` | moved |

</details>

<details>
<summary><code>dev</code>: 25 skills and agents, now in software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `dev:analyze-design` | `software:analyze-design` | moved |
| `dev:brainstorm` | `software:brainstorm` | moved |
| `dev:breakdown` | `software:breakdown` | moved |
| `dev:change-description` | `software:change-description` | moved |
| `dev:check-implementation` | `software:check-implementation` | moved |
| `dev:code-sweep` | `software:code-sweep` | moved |
| `dev:create-plan` | `software:create-plan` | moved |
| `dev:debug` | `software:debug` | moved |
| `dev:document-project` | `software:deepwiki` | merged: Brownfield mode |
| `dev:engineering-rules` | `software:engineering-rules` | moved |
| `dev:execute-plan` | `software:execute-plan` | moved |
| `dev:prime` | `software:core` | merged: quick mode (no graph) |
| `dev:research-codebase` | `software:research-codebase` | moved |
| `dev:review-git-changes` | `software:code-sweep` | merged: light mode |
| `dev:rules-from-code` | `software:rules-from-code` | moved |
| `dev:server-component-rules` | `software:react-typescript` (topic `server-component-rules`) | router topic |
| `dev:swarm` | `software:swarm` | moved |
| `dev:tdd` | `software:tdd` | moved |
| `dev:trace` | `software:trace` | moved |
| `dev:whats-next` | `software:whats-next` | moved |
| `dev:workflow` | `software:workflow` | moved |
| `dev:code-reviewer` (agent) | `software:code-reviewer` | moved |
| `dev:codebase-analyzer` (agent) | `software:codebase-analyzer` | moved |
| `dev:codebase-locator` (agent) | `software:codebase-locator` | moved |
| `dev:codebase-pattern-finder` (agent) | `software:codebase-pattern-finder` | moved |

</details>

<details>
<summary><code>game</code> (kept its name): 6 skills and agents, now in game</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `game:game-balance-auditor` | `game:game-balance-auditor` | unchanged |
| `game:game-code-reviewer` | `game:game-code-reviewer` | unchanged |
| `game:game-performance-auditor` | `game:game-performance-auditor` | unchanged |
| `game:game-qa-reviewer` | `game:game-qa-reviewer` | unchanged |
| `game:game-studio-cpo` | `game:game-studio-cpo` | unchanged |
| `game:game-systems-reviewer` | `game:game-systems-reviewer` | unchanged |

</details>

<details>
<summary><code>game-design</code>: 12 skills and agents, now in game</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `game-design:art-direction` | `game:art-direction` | moved |
| `game-design:core-loop` | `game:core-loop` | moved |
| `game-design:design-diagrams` | `game:design-diagrams` | moved |
| `game-design:fun-targeting` | `game:fun-targeting` | moved |
| `game-design:game-brief` | `game:game-brief` | moved |
| `game-design:game-ideation` | `game:game-ideation` | moved |
| `game-design:level-ux` | `game:level-ux` | moved |
| `game-design:one-page-design` | `game:one-page-game-design` | merged: headless pipeline mode |
| `game-design:one-page-game-design` | `game:one-page-game-design` | moved |
| `game-design:progression-content` | `game:progression-content` | moved |
| `game-design:prototype-plan` | `game:prototype-plan` | moved |
| `game-design:systems-economy` | `game:systems-economy` | moved |

</details>

<details>
<summary><code>godot-incremental</code>: 13 skills and agents, now in game</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `godot-incremental:balance-model-data` | `game:balance-model-data` | moved |
| `godot-incremental:bot-balance-loop` | `game:bot-balance-loop` | moved |
| `godot-incremental:feature-seams-and-saves` | `game:feature-seams-and-saves` | moved |
| `godot-incremental:fleet-game-dev` | `game:fleet-game-dev` | moved |
| `godot-incremental:game-audio` | `game:game-audio` | moved |
| `godot-incremental:godot-perf` | `game:godot-perf` | moved |
| `godot-incremental:godot-testing` | `game:godot-testing` | moved |
| `godot-incremental:headless-godot-runs` | `game:headless-godot-runs` | moved |
| `godot-incremental:pixel-art-pipeline` | `game:pixel-art-pipeline` | moved |
| `godot-incremental:release-and-store` | `game:release-and-store` | moved |
| `godot-incremental:safe-refactor-and-review` | `game:safe-refactor-and-review` | moved |
| `godot-incremental:upgrade-tree-design` | `game:upgrade-tree-design` | moved |
| `godot-incremental:visual-verification` | `game:visual-verification` | moved |

</details>

<details>
<summary><code>herdr</code>: 4 skills and agents, now in agents</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `herdr:herdr-atomic` | `agents:herdr-atomic` | moved |
| `herdr:herdr-orchestrator` | `agents:herdr-orchestrator` | moved |
| `herdr:herdr-setup` | `agents:herdr-setup` | moved |
| `herdr:herdr-worker` | `agents:herdr-worker` | moved |

</details>

<details>
<summary><code>meta</code>: 3 skills and agents, now in agents</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `meta:harvest` | `agents:harvest` | moved |
| `meta:mcp-builder` | `agents:mcp-builder` | moved |
| `meta:skill-creator` | `agents:skill-creator` | moved |

</details>

<details>
<summary><code>ml</code>: 9 skills and agents, now in agents</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `ml:checkpoint-promotion` | `agents:checkpoint-promotion` | moved |
| `ml:dataset-curation` | `agents:dataset-curation` | moved |
| `ml:eval-harness-first` | `agents:eval-harness-first` | moved |
| `ml:finetuning-method-selection` | `agents:finetuning-method-selection` | moved |
| `ml:grpo-rlvr-training` | `agents:grpo-rlvr-training` | moved |
| `ml:lora-qlora-recipes` | `agents:lora-qlora-recipes` | moved |
| `ml:preference-optimization` | `agents:preference-optimization` | moved |
| `ml:rag-architect` | `agents:rag-architect` | moved |
| `ml:recsys-pipeline-architect` | `agents:recsys-pipeline-architect` | moved |

</details>

<details>
<summary><code>ops</code>: 17 skills and agents, now in software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `ops:changelog-generator` | `software:changelog-generator` | moved |
| `ops:chaos-engineering` | `software:chaos-engineering` | moved |
| `ops:dependabot-review` | `software:dependabot-review` | moved |
| `ops:dependency-updater` | `software:dependency-updater` | moved |
| `ops:deployment-pipeline-design` | `software:deployment-pipeline-design` | moved |
| `ops:docker-development` | `software:docker-development` | moved |
| `ops:feature-flags-architect` | `software:feature-flags-architect` | moved |
| `ops:github-actions-creator` | `software:github-actions-creator` | moved |
| `ops:kubernetes-patterns` | `software:kubernetes-patterns` | moved |
| `ops:migration-architect` | `software:migration-architect` | moved |
| `ops:observability-and-instrumentation` | `software:observability-and-instrumentation` | moved |
| `ops:postmortem-writing` | `software:postmortem-writing` | moved |
| `ops:ship-gate` | `software:ship-gate` | moved |
| `ops:shipping-and-launch` | `software:ship-gate` | merged: launch checklist and launch-plan mode |
| `ops:slo-architect` | `software:slo-architect` | moved |
| `ops:terraform-patterns` | `software:terraform-patterns` | moved |
| `ops:wizard` | `software:wizard` | moved |

</details>

<details>
<summary><code>product</code>: 23 skills and agents, now in design, software, work</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `product:advanced-elicitation` | `software:advanced-elicitation` | moved |
| `product:code-to-prd` | `software:code-to-prd` | moved |
| `product:deep-research` | `work:deep-research` | moved |
| `product:deepread` | `work:deepread` | moved |
| `product:devil` | `software:devil` | moved |
| `product:documentation-criteria` | `software:documentation-criteria` | moved |
| `product:grill-with-docs` | `software:grilling` | merged: docs-anchored mode |
| `product:grilling` | `software:grilling` | moved |
| `product:intent-driven-development` | `software:requirement-convergence` | merged: acceptance-criteria mode |
| `product:interview-me` | `software:interview-me` | moved |
| `product:litreview` | `work:litreview` | moved |
| `product:office-hours` | `work:office-hours` | moved |
| `product:plan-ceo-review` | `work:plan-ceo-review` | moved |
| `product:plan-design-review` | `design:plan-design-review` | moved |
| `product:prfaq` | `work:prfaq` | moved |
| `product:product-brainstorming` | `software:product-brainstorming` | moved |
| `product:requirement-convergence` | `software:requirement-convergence` | moved |
| `product:roast` | `work:roast` | moved |
| `product:scientific-problem-selection` | `work:scientific-problem-selection` | moved |
| `product:spec-driven-workflow` | `software:spec-driven-workflow` | moved |
| `product:spec` | `software:spec` | moved |
| `product:synthesize-research` | `work:synthesize-research` | moved |
| `product:write-spec` | `software:spec` | merged: PRD mode (`--prd`) |

</details>

<details>
<summary><code>pstack</code>: 27 skills and agents, now in software, work</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `pstack:architect` | `software:architect` | moved |
| `pstack:arena` | `software:arena` | moved |
| `pstack:benchmark-checklist` | `software:benchmark-checklist` | moved |
| `pstack:blast-radius` | `software:blast-radius` | moved |
| `pstack:correct` | `software:correct` | moved |
| `pstack:create-verification-skill` | `software:create-verification-skill` | moved |
| `pstack:maintain-verification-skill` | `software:maintain-verification-skill` | moved |
| `pstack:principle-attack-the-premise` | `software:principles` (topic `principle-attack-the-premise`) | router topic |
| `pstack:principle-boundary-discipline` | `software:principles` (topic `principle-boundary-discipline`) | router topic |
| `pstack:principle-build-the-lever` | `software:principles` (topic `principle-build-the-lever`) | router topic |
| `pstack:principle-encode-lessons-in-structure` | `software:principles` (topic `principle-encode-lessons-in-structure`) | router topic |
| `pstack:principle-explain-the-number` | `software:principles` (topic `principle-explain-the-number`) | router topic |
| `pstack:principle-foundational-thinking` | `software:principles` (topic `principle-foundational-thinking`) | router topic |
| `pstack:principle-laziness-protocol` | `software:principles` (topic `principle-laziness-protocol`) | router topic |
| `pstack:principle-make-operations-idempotent` | `software:principles` (topic `principle-make-operations-idempotent`) | router topic |
| `pstack:principle-migrate-callers-then-delete-legacy-apis` | `software:principles` (topic `principle-migrate-callers-then-delete-legacy-apis`) | router topic |
| `pstack:principle-minimize-reader-load` | `software:principles` (topic `principle-minimize-reader-load`) | router topic |
| `pstack:principle-model-the-domain` | `software:principles` (topic `principle-model-the-domain`) | router topic |
| `pstack:principle-separate-before-serializing-shared-state` | `software:principles` (topic `principle-separate-before-serializing-shared-state`) | router topic |
| `pstack:principle-sequence-verifiable-units` | `software:principles` (topic `principle-sequence-verifiable-units`) | router topic |
| `pstack:principle-subtract-before-you-add` | `software:principles` (topic `principle-subtract-before-you-add`) | router topic |
| `pstack:principle-test-behavior-not-implementation` | `software:principles` (topic `principle-test-behavior-not-implementation`) | router topic |
| `pstack:principle-type-system-discipline` | `software:principles` (topic `principle-type-system-discipline`) | router topic |
| `pstack:show-me-your-work` | `software:show-me-your-work` | moved |
| `pstack:technical-writing` | `work:technical-writing` | moved |
| `pstack:typescript-best-practices` | `software:react-typescript` (topic `typescript-best-practices`) | router topic |
| `pstack:why` | `software:why` | moved |

</details>

<details>
<summary><code>security</code>: 8 skills and agents, now in software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `security:agent-security-hardening` | `software:agent-security-hardening` | moved |
| `security:block-no-verify-hook` | `software:block-no-verify-hook` | moved |
| `security:git-guardrails-claude-code` | `software:git-guardrails-claude-code` | moved |
| `security:mcp-dependency-review` | `software:mcp-dependency-review` | moved |
| `security:security-and-hardening` | `software:security-and-hardening` | moved |
| `security:security-best-practices` | `software:security-best-practices` | moved |
| `security:security-threat-model` | `software:security-threat-model` | moved |
| `security:skill-security-auditor` | `software:skill-security-auditor` | moved |

</details>

<details>
<summary><code>stack</code>: 23 skills and agents, now in software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `stack:boost-asio-pro` | `software:systems` (topic `boost-asio-pro`) | router topic |
| `stack:cpp-coding-standards` | `software:systems` (topic `cpp-coding-standards`) | router topic |
| `stack:database-migrations` | `software:data` (topic `database-migrations`) | router topic |
| `stack:dotnet-backend-patterns` | `software:dotnet-backend-patterns` | moved |
| `stack:gsap-core` | `software:animation` (topic `gsap-core`) | router topic |
| `stack:gsap-frameworks` | `software:animation` (topic `gsap-frameworks`) | router topic |
| `stack:gsap-plugins` | `software:animation` (topic `gsap-plugins`) | router topic |
| `stack:gsap-react` | `software:animation` (topic `gsap-react`) | router topic |
| `stack:gsap-scrolltrigger` | `software:animation` (topic `gsap-scrolltrigger`) | router topic |
| `stack:gsap-timeline` | `software:animation` (topic `gsap-timeline`) | router topic |
| `stack:gsap-utils` | `software:animation` (topic `gsap-utils`) | router topic |
| `stack:motion-advanced` | `software:animation` (topic `motion-advanced`) | router topic |
| `stack:motion-foundations` | `software:animation` (topic `motion-foundations`) | router topic |
| `stack:motion-patterns` | `software:animation` (topic `motion-patterns`) | router topic |
| `stack:postgres-best-practices` | `software:data` (topic `postgres-best-practices`) | router topic |
| `stack:postgresql-table-design` | `software:data` (topic `postgresql-table-design`) | router topic |
| `stack:prisma-patterns` | `software:data` (topic `prisma-patterns`) | router topic |
| `stack:react-best-practices` | `software:react-typescript` (topic `react-best-practices`) | router topic |
| `stack:react-useeffect` | `software:react-typescript` (topic `react-useeffect`) | router topic |
| `stack:remotion-best-practices` | `software:animation` (topic `remotion-best-practices`) | router topic |
| `stack:saga-orchestration` | `software:saga-orchestration` | moved |
| `stack:shadcn` | `software:react-typescript` (topic `shadcn`) | router topic |
| `stack:swift-concurrency-expert` | `software:systems` (topic `swift-concurrency-expert`) | router topic |

</details>

<details>
<summary><code>tools</code>: 17 skills and agents, now in agents, software, work</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `tools:adhd` | `software:adhd` | moved |
| `tools:api-design-principles` | `software:api-design-principles` | moved |
| `tools:code-review-excellence` | `software:code-review-excellence` | moved |
| `tools:error-handling-patterns` | `software:error-handling-patterns` | moved |
| `tools:git-advanced-workflows` | `software:git-advanced-workflows` | moved |
| `tools:humanize` | `work:humanize` | moved |
| `tools:mochi-deck` | `work:mochi-deck` | moved |
| `tools:model-router` | `agents:model-router` | moved |
| `tools:persona` | `software:persona` | moved |
| `tools:post-flight` | `software:check-implementation` | merged: full post-flight mode |
| `tools:pre-flight` | `software:pre-flight` | moved |
| `tools:receiving-code-review` | `software:receiving-code-review` | moved |
| `tools:systematic-debugging` | `software:debug` | merged: folded into the one debugging skill |
| `tools:test-driven-development` | `software:tdd` | merged: folded into the one TDD skill |
| `tools:unlazy-lite` | `software:unlazy` | merged: lite mode |
| `tools:unlazy` | `software:unlazy` | moved |
| `tools:using-git-worktrees` | `software:using-git-worktrees` | moved |

</details>

<details>
<summary><code>verify</code>: 22 skills and agents, now in software</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `verify:adversarial-ux-test` | `software:adversarial-ux-test` | moved |
| `verify:ai-debt-detector` | `software:ai-debt-detector` | moved |
| `verify:api-design-reviewer` | `software:api-design-reviewer` | moved |
| `verify:bats-testing-patterns` | `software:bats-testing-patterns` | moved |
| `verify:click-path-audit` | `software:click-path-audit` | moved |
| `verify:control-cli` | `software:control-cli` | moved |
| `verify:control-ui` | `software:control-ui` | moved |
| `verify:dogfood` | `software:dogfood` | moved |
| `verify:full-page-screenshot` | `software:full-page-screenshot` | moved |
| `verify:integration-e2e-testing` | `software:integration-e2e-testing` | moved |
| `verify:ios-simulator` | `software:ios-simulator` | moved |
| `verify:k6-load-testing` | `software:k6-load-testing` | moved |
| `verify:playwright-pro` | `software:playwright-pro` | moved |
| `verify:python-anti-patterns` | `software:python-anti-patterns` | moved |
| `verify:react-testing` | `software:react-testing` | moved |
| `verify:santa-method` | `software:santa-method` | moved |
| `verify:test-audit` | `software:test-audit` | moved |
| `verify:ui-demo` | `software:ui-demo` | moved |
| `verify:verify-feature` | `software:verify-feature` | moved |
| `verify:verify-this` | `software:verify-this` | moved |
| `verify:webapp-testing` | `software:control-ui` | merged: folded into the one local web harness |
| `verify:windows-desktop-e2e` | `software:windows-desktop-e2e` | moved |

</details>

<details>
<summary><code>work</code> (kept its name): 26 skills and agents, now in software, work</summary>

| 2.x name | 3.0.0 name | Change |
|---|---|---|
| `work:build-dashboard` | `work:build-dashboard` | unchanged |
| `work:competitive-brief` | `work:competitive-brief` | unchanged |
| `work:crafting-effective-readmes` | `work:crafting-effective-readmes` | unchanged |
| `work:customer-escalation` | `work:customer-escalation` | unchanged |
| `work:data-visualization` | `work:data-visualization` | unchanged |
| `work:drawio` | `software:drawio` | moved |
| `work:explore-data` | `work:explore-data` | unchanged |
| `work:file-conversion` | `work:file-conversion` | unchanged |
| `work:grounded-vault` | `work:grounded-vault` | unchanged |
| `work:market-sizing-analysis` | `work:market-sizing-analysis` | unchanged |
| `work:metrics-review` | `work:metrics-review` | unchanged |
| `work:review-contract` | `work:review-contract` | unchanged |
| `work:roadmap-update` | `work:roadmap-update` | unchanged |
| `work:sql-queries` | `work:sql-queries` | unchanged |
| `work:stakeholder-update` | `work:stakeholder-update` | unchanged |
| `work:startup-metrics-framework` | `work:startup-metrics-framework` | unchanged |
| `work:statistical-analysis` | `work:statistical-analyst` | merged: Mode 4 and `references/descriptive-trend-and-outliers.md` |
| `work:statistical-analyst` | `work:statistical-analyst` | unchanged |
| `work:ticket-triage` | `work:ticket-triage` | unchanged |
| `work:to-questionnaire` | `work:to-questionnaire` | unchanged |
| `work:triage-nda` | `work:triage-nda` | unchanged |
| `work:validate-data` | `work:validate-data` | unchanged |
| `work:variance-analysis` | `work:variance-analysis` | unchanged |
| `work:video-editor` | `work:video-editor` | unchanged |
| `work:writing-clearly-and-concisely` | `work:writing-clearly-and-concisely` | unchanged |
| `work:writing-guidelines` | `work:writing-guidelines` | unchanged |

</details>

Each plugin README has a "Moved in v3" section with the same moves from that plugin's side.

---

## `services/` — local companions, not plugins

A skill can ask a local service to do something no skill can do alone. Those services live in
`services/`, deliberately outside `plugins/` and absent from `marketplace.json`: they are not
installed by `/plugin`, and they hold state — a Python environment, model weights — that a
plugin directory managed by the installer is the wrong home for.

**[`services/breeze-tts`](services/breeze-tts/)** narrates. It holds
[Breeze TTS 2](https://huggingface.co/BreezeBlue/Breeze-TTS-2) in memory on Apple Silicon and turns
text into an MP3 plus the exact times each paragraph is spoken. `software:explain-diff` uses it to make
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
│       ├── skills/<router>/topics/<topic>/GUIDE.md   # router skills in software
│       ├── agents/<name>.md    # where the plugin ships any
│       ├── shared/             # scripts, schemas and references used by several skills
│       ├── docs/areas/<area>.md  # detailed area documents (software, game, agents)
│       ├── README.md
│       └── NOTICE.md           # upstream credits, where the plugin vendors third-party skills
├── services/
│   └── <service>/              # long-running local companions, not plugins
└── README.md
```

Folder name, `plugin.json` `name`, and the marketplace entry `name` are always the same terse
string; `displayName` carries the readable label. The five folders are `software`, `design`,
`game`, `agents` and `work`. `skills/` and `agents/` are the default locations, so no manifest
field points at them. `shared/` is plain plugin payload — skills reach it through
`${CLAUDE_PLUGIN_ROOT}`, which Claude Code expands to the install directory, so a plugin works
wherever it lands.

Installing a plugin wires nothing. Some skills write outside their own install directory, on
purpose, when you run them:

- `agents:herdr-setup` (or the `install.sh` wrapper) symlinks `horch` into `~/.local/bin`
  (`HORCH_BIN_DIR` overrides), installs herdr's per-engine integration hooks, and, only for a
  cloned repo rather than a plugin install, links skills into `~/.claude/skills`
  (`CLAUDE_SKILLS_DIR` overrides).
- `software:core` installs `graphify` (from PyPI, isolated) plus git and Claude Code hooks into the
  repo you point it at (`graph.sh --no-hooks` skips the hooks).
- `agents:harvest` clones the GitHub repository you name and copies its skills into
  `~/.claude/skills` (`CLAUDE_SKILLS_DIR` overrides). `software:agent-memory`,
  `software:git-guardrails-claude-code` and `software:block-no-verify-hook` install hooks.
- `design`'s render gates install Playwright into the plugin's own `shared/` when you run the
  install command its skills print, and keep gate receipts in the plugin data directory or the OS
  temp directory; `design:scaffold-project` writes a new project where you point it.
- The `software` build pipeline and `software:ddd` write their working documents inside the
  repository you run them in (`ai_docs/` and `ddd/`), which is the point.

Each plugin README has a "What these write and where they reach" section with the details.

## Skill names are namespaced

Installed as plugins, skills are addressed as `<plugin>:<skill>`: `software:workflow`,
`software:ddd`, `software:core`, `software:grilling`, `software:blast-radius`,
`agents:herdr-orchestrator`, `work:humanize`, `design:critique`. Agents too:
`software:ddd-decision-strategist`, `software:codebase-locator`, `software:code-reviewer`,
`design:design-critic`. A router topic is cited as the router plus the topic:
`software:principles` (topic `principle-model-the-domain`). The skills that dispatch their
siblings (`software:workflow`, `software:ddd` and every agent-dispatch site) use the namespaced
form, including across plugins: `design:critique` hands its plan to `software:create-plan`, and
`game:fleet-game-dev` sends the fleet protocol to `agents:herdr-worker`. A bare name may still
resolve when it is unambiguous, but do not rely on it.

If you already have any of these skills loose in `~/.claude/skills`, move the loose copy aside
before installing the plugin. Claude Code loads both, and two identical descriptions make
triggering a coin flip.

## What is not in the repo

Most of a clone is the DDD golden test fixtures under `plugins/software/shared`. `.gitignore`
keeps the rest out:

| Ignored | Why |
|---|---|
| `**/node_modules/` | the Playwright fixture install under `plugins/software/skills/e2e-harness/evals/fixtures/`, which dwarfs the fixture itself; also the install for `plugins/software/skills/complexity-sweep`'s bundled CLI, which the skill runs `npm install` for on first use; and `plugins/design/shared`'s Playwright and axe-core runtime for the render gates |
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
