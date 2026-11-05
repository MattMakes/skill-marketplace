# Plugin taxonomy proposal, 2026-11-05

Status: revised and implemented on 2026-11-05 on branch `feat/plugin-taxonomy-v3` (marketplace
3.0.0). The branch ships five plugins, as the revision below describes. The 16-plugin tree in
"Proposed tree" was implemented first and is now superseded; it stays below as the record of how
each skill's home was decided, because the five plugins are unions of its groups. The owner's four
decisions (see "Decisions") still hold.

## Revision: five plugins (2026-11-05)

### The request

After the 16-plugin tree was built, the owner asked for three to five plugins, each a complete
surface area: one install covers one kind of work from start to finish, without a second plugin
for the next step.

### The five plugins

| Plugin | The question it answers | Holds (names from the 16-plugin tree) |
|---|---|---|
| `software` | How do I take a change from idea to production? | `product` (the spec and challenge skills), `architecture`, `dev`, `verify`, `code`, `craft`, `stack`, `security`, `ops`, and from `agentic`: `keys`, `rules-from-code`, `engineering-rules`, `retro`, `correct`, `agent-memory`, `stow`, `persona` |
| `design` | How should it look and feel? | `design`, unchanged |
| `game` | How do I make a game, and is it good? | `game` and `godot` |
| `agents` | How do I build an AI system? | the rest of `agentic` (agents, skills and MCP servers), `herdr`, `ml` |
| `work` | How do I research, decide, analyse and write when the work is not code? | `work`, plus from `product`: office-hours, prfaq, plan-ceo-review, roast, deep-research, litreview, deepread, synthesize-research, scientific-problem-selection |

`product` splits by audience. The skills that end in a spec or an acceptance criterion
(interview-me, grilling, devil, spec, requirement-convergence, product-brainstorming, adhd,
advanced-elicitation, documentation-criteria, code-to-prd) feed the build and go to `software`.
The skills that decide whether an idea is worth pursuing, or research a question from sources, are
useful without any code and go to `work`.

### Router skills

`software` would hold 176 skills. Thirty-nine of them were reference skills that each cover
one library or one principle. Five router skills in `software` replace them. Each router has one
description for its whole area and keeps each former skill as a topic,
`skills/<router>/topics/<topic>/GUIDE.md`, which it reads only when the topic applies.

| Router | Topics |
|---|---|
| `principles` | the sixteen former `craft:principle-*` skills |
| `animation` | GSAP (seven guides), motion (three), Remotion |
| `react-typescript` | react-best-practices, react-useeffect, server-component-rules, shadcn, typescript-best-practices |
| `data` | postgres-best-practices, postgresql-table-design, prisma-patterns, database-migrations |
| `systems` | cpp-coding-standards, boost-asio-pro, swift-concurrency-expert |

Other skills cite a topic as `software:<router>` (topic `<topic>`). `dotnet-backend-patterns`
stays a normal skill: it is one skill, so a router would save nothing.

### Why these five

The clusters come from measured dependencies: the count of `<plugin>:<skill>` references from one
plugin of the 16 to another.

| Cluster | Cross-plugin references | Result |
|---|---|---|
| `dev` as a hub | `dev`–`design` 34, `dev`–`architecture` 27, `dev`–`verify` 22, `dev`–`code` 20 | `architecture`, `verify` and `code` join `dev` in `software`. |
| `agentic`–`code` | 24, through `core` and `keys` | The instruction-file and session-learning skills join `core` in `software`; the agent-building skills form `agents` with `herdr` and `ml`. |
| `ops`–`security` | 11 | Both join `software`; `ship-gate` calls `security-sweep`. |
| `game`–`godot` | 10 | `godot` merges into `game`. |

`design` has the largest single link to the hub and still stays its own plugin. Its links are
handoffs at the edges of UI work (a brief in, a plan or a review out), each degrades to a note when
`software` is not installed, and a designer needs the whole design surface without the
engineering one. Folding it in would make `software` larger without making `design` more complete.

### The context cost that made routers necessary

Every installed skill puts its description into every session's context. Before routers, the
skill descriptions of the `software` group came to about 70,000 characters. The five routers
replace thirty-nine descriptions with five; after the change the 142 skills of `software` carry
about 60,000 characters of description, measured on 2026-11-05, and a session reads a topic's
guide only when the work needs it.

## Problem

The marketplace has 20 plugins and about 313 skills. The plugins grew in three waves:
first-party work, the 2026-09-07 expansion, and the 2026-10-11 harvest. Each wave added
plugins by source, not by job. The result is overlap:

- One concept has two or three owners. Debugging has three skills in three plugins. Accessibility
  audit has four skills in two plugins.
- Two plugins are grab bags. `tools` and `craft` hold skills that have no other home.
- `code` holds five unrelated jobs: domain modelling, codebase priming, diff explainers,
  security audit and end-to-end tests. It is also 155 MB.
- Two skills in one plugin contradict each other. `code:core` writes `CLAUDE.md` files with
  `AGENTS.md` symlinks. `code:keys` writes only `AGENTS.md` and deletes `CLAUDE.md` files.

## Design rules

1. **One plugin answers one question.** A user who knows the question knows the plugin.
2. **One owner per concept.** Other plugins cite the owner as `<plugin>:<skill>`. They do not
   keep a copy.
3. **A first-party pipeline is the spine of its plugin.** A vendored skill attaches to the spine
   as a specialist, a mode or a reference.
4. **Plugins are ordered by the life of a change.** The order is: decide, shape, build, verify,
   secure, ship.
5. **Provenance moves with the skill.** Each move carries its `NOTICE.md` entry to the new plugin.

## Proposed tree (superseded)

Superseded on 2026-11-05 by "Revision: five plugins" above. The groups below are kept as the record
of where each skill was placed; the five plugins are unions of them. Names such as `dev:debug` or
`craft:principle-*` in the rest of this document are the 16-plugin names; the root `README.md`
maps every 2.x name to its 3.0.0 name.

16 plugins (from 20). Five plugins dissolve: `tools`, `pstack`, `meta`, `design-system` and
`game-design`. One plugin is new: `architecture`.

```
LIFE OF A CHANGE
  product        What should we build, and why?           idea -> research -> challenge -> spec
  architecture   How should the system be shaped?         DDD, module design, ADRs, APIs, diagrams
  dev            Build the change.                        plan -> execute -> finish (the spine)
  verify         Is it right, and does it work?           review by reading, proof by running
  security       Is it safe?                              audit, threat model, agent guardrails
  ops            Ship it and run it.                      CI/CD, release, SLOs, flags, migrations

FOUNDATION (used at every stage)
  code           What does this existing code do?         priming, graph, tracing, wikis, explainers
  craft          What does good code look like?           principles and code-level practices
  stack          What does this library get wrong?        framework and language references
  agentic        Make agents, skills and the harness.     AGENTS.md (keys), memory, skill authoring
  herdr          Run a fleet of agent sessions.           unchanged

DOMAINS
  design         How should it look and feel?             design-system spine + vendored directions
  game           What game, and is it good?               design studio + review board, any engine
  godot          Build it in Godot.                       renamed from godot-incremental
  ml             Train and evaluate a model.              unchanged
  work           Knowledge work and prose.                data, business documents, writing
```

### product — "What should we build, and why?"

| Group | Skills |
|---|---|
| Discover | product-brainstorming, `tools:adhd`, office-hours, prfaq, scientific-problem-selection |
| Research | deep-research, litreview, deepread, synthesize-research |
| Challenge | interview-me, grilling (absorbs grill-with-docs and `design-system:grill-me` as modes), devil, roast, plan-ceo-review, advanced-elicitation |
| Specify | spec (absorbs write-spec), requirement-convergence (absorbs intent-driven-development), documentation-criteria, code-to-prd |

Out: plan-design-review goes to `design`. spec-driven-workflow goes to `dev`.

Handoff: `product:spec` hands off to `dev:brainstorm` for technical design, or to
`architecture:ddd` for a new system.

### architecture — "How should the system be shaped?" (new)

| Group | Skills |
|---|---|
| Domain | ddd and its nine steps (from `code`), ddd-decision-strategist agent, `craft:domain-modeling` (the light mode for an existing codebase) |
| Modules | `craft:codebase-design`, `craft:improve-codebase-architecture`, `craft:improve`, `pstack:architect` |
| Decisions | `craft:architecture-decision-records` |
| Contracts | `craft:contract-first`, `tools:api-design-principles`, `stack:saga-orchestration` |
| Diagrams | blueprint (from `code`), `work:drawio` |

Blueprint gives explorable HTML. drawio gives an editable file for humans. Both are renderers,
so both live here.

### dev — "Build the change." (the spine)

| Group | Skills |
|---|---|
| Pipeline | workflow, brainstorm, analyze-design, breakdown, create-plan, `tools:pre-flight`, execute-plan, check-implementation (absorbs `tools:post-flight`), whats-next |
| Execution modes | swarm, `pstack:arena`, `product:spec-driven-workflow` |
| Discipline | tdd (absorbs `tools:test-driven-development`), debug (absorbs `tools:systematic-debugging` and `craft:diagnosing-bugs`), `craft:verification-before-completion`, `craft:doubt-driven-development`, unlazy (absorbs unlazy-lite), `pstack:show-me-your-work` |
| Git and the change | `tools:using-git-worktrees`, `tools:git-advanced-workflows`, `craft:finishing-a-development-branch`, `craft:make-pr-easy-to-review`, change-description |

Out: prime, research-codebase, trace and document-project go to `code`. code-sweep,
review-git-changes and the code-reviewer agent go to `verify`. server-component-rules goes to
`stack`. rules-from-code goes to `agentic`.

### verify — "Is it right, and does it work?"

`verify` holds the review skills and the runtime skills in one plugin. The group names keep the
two kinds apart. A review group reads the code. A runtime group runs the code.

| Group | Kind | Skills |
|---|---|---|
| Review a change | Read | code-sweep (absorbs review-git-changes as its light mode, from `dev`), code-reviewer agent (from `dev`) |
| Review lenses | Read | ai-debt-detector, `code:complexity-sweep`, `pstack:blast-radius`, api-design-reviewer, python-anti-patterns |
| Give and take review | Read | `tools:code-review-excellence`, `tools:receiving-code-review` |
| Prove a claim | Run | verify-feature, verify-this, santa-method, `agentic:human-gate`, `pstack:benchmark-checklist` |
| Project verification skill | Run | `pstack:create-verification-skill`, `pstack:maintain-verification-skill` |
| Harnesses | Run | control-cli, control-ui (absorbs webapp-testing), ios-simulator, windows-desktop-e2e, full-page-screenshot, ui-demo |
| Test suites | Run | `code:e2e-harness`, integration-e2e-testing, playwright-pro, react-testing, bats-testing-patterns, k6-load-testing, test-audit |
| Exploratory | Run | dogfood, adversarial-ux-test, click-path-audit, `design:web-quality-audit` |

The plugin grows from 22 to 32 skills and one agent. The README lists them by group, so a user finds the review
skills without a scan through the harness skills.

### security — "Is it safe?"

`code:security-sweep` moves here and becomes the entry point. The others go deeper on one area each:
security-threat-model, security-and-hardening, security-best-practices, agent-security-hardening,
mcp-dependency-review, skill-security-auditor, block-no-verify-hook and git-guardrails-claude-code.

### ops — "Ship it and run it."

No skills move in or out. Two merges inside the plugin:

- ship-gate absorbs shipping-and-launch. ship-gate scans. shipping-and-launch is the checklist
  that ship-gate reports against.
- ship-gate calls `security:security-sweep` for its security section. It does not keep its own
  security rules.

`ops` owns system-level migration (migration-architect). `stack` owns per-tool database
migration. `craft` owns code-level deprecation.

### code — "What does this existing code do?"

| Group | Skills |
|---|---|
| Prime | core (absorbs `dev:prime` as its no-graph mode; gives its instruction-file layer to `agentic:keys`) |
| Investigate | `dev:research-codebase`, `dev:trace`, `pstack:why`, and the codebase-locator, codebase-analyzer and codebase-pattern-finder agents (from `dev`, because research-codebase and trace use them) |
| Document | deepwiki (absorbs `dev:document-project`), `craft:code-tour` |
| Explain a change | explain-diff |

Out: ddd and blueprint go to `architecture`. security-sweep goes to `security`. e2e-harness
goes to `verify`. complexity-sweep goes to `verify`. keys goes to `agentic`.

#### core gives the instruction-file layer to keys

The owner decided that `keys` has the correct model: AGENTS.md is the only instruction file, with
no CLAUDE.md and no symlinks. Today `core` has three layers. Only the second layer conflicts.

| core layer | After the change |
|---|---|
| Graph (`graphify-out/`) | No change. `core` keeps it. |
| CORE (CLAUDE.md contracts with AGENTS.md symlinks) | Removed from `core`. `core` runs `agentic:keys` for this layer. |
| Read (configs, entry points) | No change. |

Work in `core`:

- `core/SKILL.md` has 10 CLAUDE.md references and 5 symlink references. `core/scripts/core.py`
  has 34 and 20. Remove the CLAUDE.md writer and the symlink health check.
- The `## graphify` section that `core` writes into CLAUDE.md goes into the root AGENTS.md. Use
  the same block-marker method that `keys` uses for its own sections.
- `status.sh` reports the AGENTS.md tree from `keys` in place of the CORE document count.
- If `agentic` is not installed, `core` builds the graph only and tells the user to install
  `agentic` for the instruction files.

### craft — "What does good code look like?"

`craft` becomes the principles library. The 16 pstack principles move here as `principle-*`.
Code-level practices stay: karpathy-coder, ponytail, performance-optimization,
deprecation-and-migration, source-driven-development, constraint-driven-development and
`tools:error-handling-patterns`.

Out: every skill that is a workflow or a design method moves to `dev` or `architecture`.

Merge candidate: ponytail, karpathy-coder and `principle-laziness-protocol` say one thing three
ways. Keep the principle as the rule and ponytail as the working mode. Retire karpathy-coder,
or keep it only for its pre-commit gate.

### stack — "What does this library get wrong?"

Add `dev:server-component-rules` and `pstack:typescript-best-practices`. Move
saga-orchestration to `architecture`, because it is a pattern and not a library.

### agentic — "Make agents, skills and the agent harness."

| Group | Skills |
|---|---|
| Instruction files | `code:keys`, writing-for-agents, llm-friendly-context, `dev:rules-from-code`, `dev:engineering-rules` |
| Learn from sessions | agent-memory, stow, `craft:retro`, `pstack:correct` |
| Route and behave | `tools:model-router`, `tools:persona` |
| Build agents | loop-design-check, agent-architecture-audit, autoresearch-agent, cli-for-agents |
| Make skills and servers | `meta:skill-creator`, `meta:mcp-builder`, `meta:harvest`, book-to-skill |

Out: human-gate goes to `verify`.

### design — "How should it look and feel?"

`design` and `design-system` merge. The design-system pipeline is the spine. The vendored
skills attach to it.

| Group | Skills |
|---|---|
| Rules | design-doctrine, design-critic agent |
| System | design-tokens (absorbs design-system-patterns), brandkit, token-build, governance, migrate-design-system, figma-integration, design-md |
| Build | design-component, design-screen, design-code, image-to-code, redesign, data-dashboard, scaffold-project, prototype, ux-writing |
| Direction | apply-aesthetic, frontend-design, impeccable, hallmark, ui-ux-pro-max, emil-design-eng |
| Polish | make-interfaces-feel-better, review-animations, web-design-guidelines |
| Gates | gate, design-qa, a11y-audit (one skill: the vendored scanner body, the design-system routing; absorbs accessibility), screen-reader-testing, performance (absorbs core-web-vitals) |
| Critique | critique (absorbs design-is as a Dieter Rams lens), design-review (one skill from the two), `product:plan-design-review` |

Out: frontend-slides goes to `work`. web-quality-audit goes to `verify`.

### game — "What game, and is it good?"

`game` and `game-design` merge. Both are engine-agnostic.

| Group | Skills |
|---|---|
| Design studio | game-ideation, fun-targeting, core-loop, systems-economy, progression-content, level-ux, art-direction, game-brief, prototype-plan, design-diagrams, one-page-game-design (absorbs one-page-design as its headless mode) |
| Review board | game-studio-cpo, game-systems-reviewer, game-balance-auditor, game-code-reviewer, game-performance-auditor, game-qa-reviewer |

### godot — "Build it in Godot."

Rename `godot-incremental` to `godot`. Most of its skills are not specific to incremental games.
Keep all 13 skills. Each skill cites its `game` auditor for the rules, and keeps the Godot
method to measure them. Two examples:

- godot-perf measures. `game:game-performance-auditor` holds the rules.
- bot-balance-loop measures. `game:game-balance-auditor` holds the rules.

fleet-game-dev cites `herdr` for the fleet protocol.

### work — "Knowledge work and prose."

Add `tools:humanize`, `tools:mochi-deck`, `pstack:technical-writing` and `design:frontend-slides`.
Move drawio to `architecture`.

Merge statistical-analysis and statistical-analyst into one skill. The two bodies differ, so the
merged skill keeps both as references.

`pstack:technical-writing` becomes the entry for prose. writing-clearly-and-concisely and
writing-guidelines become its references.

### herdr and ml

No change. `dev:swarm` runs agent teams in one session. `herdr` runs a fleet of sessions. Each
skill cites the other in its "when not to use" section.

## Duplicate and overlap register

| Concept | Skills today | Owner after |
|---|---|---|
| Debugging | `dev:debug`, `tools:systematic-debugging` (22 of ~290 lines differ), `craft:diagnosing-bugs` | `dev:debug` |
| TDD | `dev:tdd` (1020 lines), `tools:test-driven-development` (321 lines) | `dev:tdd` |
| Accessibility audit | `design-system:a11y-audit`, `design:a11y-audit`, `design:accessibility` | `design:a11y-audit` |
| Web performance | `design-system:performance`, `design:core-web-vitals` | `design:performance` |
| Design review | `design-system:design-review`, `design:design-review`, `design:design-is` | `design:design-review`, `design:critique` |
| Tokens | `design-system:design-tokens`, `design:design-system-patterns` | `design:design-tokens` |
| Interrogation | `product:grilling`, `product:grill-with-docs`, `design-system:grill-me` | `product:grilling` |
| Spec | `product:spec`, `product:write-spec` | `product:spec` |
| Acceptance criteria | `product:requirement-convergence`, `product:intent-driven-development` | `product:requirement-convergence` |
| Priming | `code:core`, `dev:prime` | `code:core` |
| Project docs | `code:deepwiki`, `dev:document-project` | `code:deepwiki` |
| Plan check | `dev:check-implementation`, `tools:post-flight` | `dev:check-implementation` |
| Completion | `tools:unlazy`, `tools:unlazy-lite` | `dev:unlazy` |
| Code review | `dev:code-sweep`, `dev:review-git-changes` | `verify:code-sweep` |
| Local web harness | `verify:control-ui`, `verify:webapp-testing` | `verify:control-ui` |
| One-page game design | `game-design:one-page-design`, `game-design:one-page-game-design` | `game:one-page-game-design` |
| Statistics | `work:statistical-analysis`, `work:statistical-analyst` | one `work` skill |
| Ship check | `ops:ship-gate`, `ops:shipping-and-launch` | `ops:ship-gate` |
| Instruction files | `code:core`, `code:keys` (they conflict) | `agentic:keys`; `code:core` keeps the graph |

These pairs look similar but are complementary. Keep both and cross-cite:

- `craft:prototype` (throwaway code that answers one question) and `design:prototype` (fidelity
  ladder for a UI).
- `work:build-dashboard` (BI page from query results) and `design:data-dashboard` (product
  screen built from tokens).
- `dev:brainstorm` (technical design) and `product:product-brainstorming` (problem space).
- `dev:swarm` and `herdr`.

## Decisions

The owner decided these four questions on 2026-11-05.

| # | Question | Decision |
|---|---|---|
| 1 | Instruction-file model: `core` (CLAUDE.md first) or `keys` (AGENTS.md only) | `keys`. AGENTS.md is the only instruction file. `core` keeps the graph and gives the instruction-file layer to `agentic:keys`. |
| 2 | Dissolve `pstack`, or keep it whole | Dissolve it. Each skill moves to its stage in the life of a change. Each moved skill keeps its `NOTICE.md` entry. |
| 3 | Separate `review` plugin, or one plugin with `verify` | One plugin. `verify` holds review and runtime skills in separate groups. |
| 4 | Public names change | Bump the marketplace to 3.0.0. Bump each changed plugin to its next major version. Put a move table in the README. |

## Cost

Count of `<plugin>:<skill>` references in the repository, by the cited plugin:

| Plugin | References | Effect |
|---|---|---|
| dev | 144 | Partial move |
| design-system | 131 | Plugin dissolves |
| tools | 87 | Plugin dissolves |
| code | 60 | Plugin splits |
| pstack | 48 | Plugin dissolves |
| meta | 8 | Plugin dissolves |
| game-design | 6 | Plugin dissolves |
| godot-incremental | 2 | Plugin renamed |

One script with a move map can rewrite these references. Then the existing link and frontmatter
checker from the harvest proves each reference resolves.

## Migration order

Each phase is one change and passes `claude plugin validate` before the next phase starts.

1. Merge the duplicates in the register. No plugin moves, so no public name changes.
2. Dissolve `tools` and `meta`.
3. Split `code` into `architecture` and `code`. Move the review skills into `verify`. Remove the
   instruction-file layer from `core` and point it at `agentic:keys`.
4. Merge `design-system` into `design`. Merge `game-design` into `game`. Rename `godot`.
5. Dissolve `pstack`.
6. Rewrite the marketplace description and the README. Add the move table: one row per skill,
   old `<plugin>:<skill>` to new. Publish 3.0.0.
