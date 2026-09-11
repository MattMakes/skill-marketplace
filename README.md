# skill-marketplace

A Claude Code plugin marketplace for engineering work. The plugins are grouped by the job they do:
carry a change from idea to review (`dev`), design a system before building it (`ddd`), understand
and verify a codebase you did not write (`code`), review game work (`game`), run a fleet of agents
(`herdr`), think and finish well (`tools`), and make more skills (`meta`).

## Install

```bash
claude plugin marketplace add MattMakes/skill-marketplace

claude plugin install dev@skill-marketplace
claude plugin install ddd@skill-marketplace
claude plugin install code@skill-marketplace
claude plugin install game@skill-marketplace
claude plugin install herdr@skill-marketplace
claude plugin install tools@skill-marketplace
claude plugin install meta@skill-marketplace
```

Or from inside a session: `/plugin marketplace add MattMakes/skill-marketplace`, then
`/plugin install <name>@skill-marketplace`.

---

## `dev` — Development Workflow

A chained pipeline from rough idea to reviewed change, over an `ai_docs/` workspace in the repo you
are working in. **Start with `workflow`**, which shows the paths and their order. A *change* means a
merge request on GitLab or a pull request on GitHub; the skills detect `glab` or `gh` at runtime.

| Skill | What it does |
|---|---|
| `workflow` | The entry point. Shows the available paths and which skill comes next. |
| `prime` | Loads project context by reading the files that matter for the stack it detects. |
| `brainstorm` | Turns a rough idea into a formed design through structured questioning. |
| `analyze-design` | Puts a design in front of several expert perspectives at once, via subagents. |
| `breakdown` | Splits a design into Simple-Lovable-Complete phases, one plan document each. |
| `create-plan` | Writes an implementation plan an engineer with zero codebase context could follow. |
| `execute-plan` | Executes that plan in batches, with review checkpoints and parallel dispatch. |
| `swarm` | Orchestrates agent teams for build, research, review or debug work. |
| `check-implementation` | Verifies the built code matches the plan: components, tests, build. |
| `code-sweep` | Dispatches a panel of specialized reviewers in parallel, one concern each, into one ranked report. |
| `review-git-changes` | Grades a branch across several aspects from its git history and diff. |
| `change-description` | Writes the description for a change from the ticket and the diff. |
| `debug` | Systematic debugging that finds the cause before proposing a fix. |
| `tdd` | Red-green-refactor discipline for features, bugfixes and skill authoring. |
| `trace` | Follows an entry point upstream and downstream and writes the business logic in prose. |
| `research-codebase` | Documents a codebase as it is, no critique, using parallel subagents. |
| `rules-from-code` | Reverse-engineers a `rules.md` from the code a team is proud of. |
| `engineering-rules` | States the SLC engineering ethos and coding standards up front. |
| `server-component-rules` | Next.js App Router server components and server actions. |
| `document-project` | Brownfield architecture documentation written for agents to consume. |
| `whats-next` | A handoff document so a fresh context loses nothing. |

Agents: `codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder`, `code-reviewer`.

## `ddd` — DDD Modelling

The DDD Starter Modelling Process as a chained pipeline over one `ddd/` workspace, each step
schema-validated before the next runs. Every `ddd mark` rebuilds a self-contained review page with
diagrams, explorers and decision cards. **Start with `ddd-workflow`.** Node ≥ 18, no other runtime.

| Skill | What it does |
|---|---|
| `ddd-workflow` | Runs the whole process, shows status, re-runs a step and marks the rest stale. |
| `ddd-understand` | Why the system exists and for whom: business model, impact map, capabilities. |
| `ddd-discover` | EventStorming the domain into events, commands, policies and hotspots. |
| `ddd-decompose` | Cuts the domain into subdomains and bounded contexts, and draws the context map. |
| `ddd-strategize` | Core, supporting or generic: where to invest, what to buy, which pattern per subdomain. |
| `ddd-connect` | How contexts talk: message flows, sequence diagrams, sync versus async, coupling. |
| `ddd-organise` | Team Topologies and deployable units, checked against the scale you asked for. |
| `ddd-define` | A Bounded Context Canvas per context, plus the system context diagram and glossary. |
| `ddd-code` | Tactical DDD: aggregates, invariants, ports and adapters, an implementation plan. |
| `ddd-contracts` | A JSON Schema payload, an example and an owner for every message that crosses a boundary. |
| `blueprint` | The bundled renderer: architecture, workflow, sequence, data-flow and state diagrams with animated walkthroughs, offline fonts and image export. Also supports schema relationship overviews. |

Agent: `ddd-decision-strategist`, for the calls that have to be argued rather than read off an artifact.

## `code` — Code Intelligence

Understand a codebase, then verify it.

| Skill | What it does |
|---|---|
| `core` | Primes a repo once into a zero-token knowledge graph plus a tree of `CLAUDE.md` contracts, so later questions cost a graph query instead of a file sweep. **Start here.** |
| `deepwiki` | Generates and maintains wiki documentation with line-level source citations and validated Mermaid. |
| `explain-diff` | Turns a diff, branch or change into a self-contained HTML explainer: background, intuition, code walkthrough, an interactive quiz, and embedded Blueprint diagrams when ddd is installed. |
| `security-sweep` | A multi-agent security audit with per-stack OWASP, STRIDE, secrets and supply-chain catalogs. |
| `complexity-sweep` | Flags over-complex TypeScript and JavaScript functions and either refactors them or writes the refactoring prompt. |
| `e2e-harness` | Discovers a polyglot system from its own docs and generates a runnable end-to-end suite across Node, Python, Go, C#, Rust, Kafka and Playwright. |

## `game` — Game Dev Review Board

A review board for game work, each member backed by cited rules distilled from a shelf of
game-development books. **Start with `game-studio-cpo`.**

| Skill | What it does |
|---|---|
| `game-studio-cpo` | A veteran studio Chief Product Officer for any "is this fun" question. |
| `game-systems-reviewer` | Reviews a system: progression, combat, loot, crafting, inventory. |
| `game-balance-auditor` | Internal economies, sources and drains, feedback loops, difficulty curves. |
| `game-code-reviewer` | Game code and architecture: Unity scripts, systems wiring, decoupling. |
| `game-performance-auditor` | Frame budget: CPU versus GPU bound, allocations, pooling, draw calls. |
| `game-qa-reviewer` | Test plans, bug triage, severity, regression and ship-readiness. |

## `herdr` — herdr Fleet

Run a multi-agent worker fleet in persistent terminal panes. Needs the [herdr](https://herdr.dev)
CLI, which is not bundled. **Start with `herdr-setup`.**

| Skill | What it does |
|---|---|
| `herdr-setup` | Checks the machine and fills only what is missing before the first run. |
| `herdr-orchestrator` | The orchestrator side: decompose work, spawn and assign workers by tier, integrate results. |
| `herdr-worker` | The worker side: take a task, work independently, record progress, report done. |
| `herdr-atomic` | Deterministic one-action-per-call scripts for driving herdr, returning JSON. |

## `tools` — Matt's Toolkit

Cross-cutting skills that belong to no single domain.

| Skill | What it does |
|---|---|
| `adhd` | Parallel divergent ideation: branches under different cognitive frames, scored and pruned. |
| `humanize` | Writes and edits prose a person will read, then scrubs the AI tells. |
| `persona` | A senior staff engineer who applies Simple-Lovable-Complete and refuses to ship phases. |
| `model-router` | Decides which model should do the work and whether it should fan out across subagents. |
| `pre-flight` | Reads a plan against the codebase for wiring and contract gaps, before you execute it. |
| `post-flight` | Verifies executed code against both the plan and the original codebase, then reflects. |
| `unlazy` | Completion discipline for long autonomous runs: acceptance gates written before execution. |
| `unlazy-lite` | The same discipline with less ceremony. |
| `mochi-deck` | Teaches a concept, then packages it as a spaced-repetition deck for Mochi. |
| `systematic-debugging` | Four phases from symptom to root cause, with defense-in-depth and flaky-test references. |
| `test-driven-development` | Strict red-green-refactor, plus what makes a test worth keeping. |
| `receiving-code-review` | Handling review feedback with technical rigor rather than reflexive agreement. |
| `using-git-worktrees` | Isolating feature work in a worktree before touching the main workspace. |
| `git-advanced-workflows` | Rebase, cherry-pick, bisect, reflog recovery. |
| `api-design-principles` | REST and GraphQL design and review standards. |
| `error-handling-patterns` | Exceptions, Result types, propagation and graceful degradation across languages. |
| `code-review-excellence` | Constructive review practice that catches bugs without costing morale. |

## `meta` — Skill Authoring

Make more skills and tools. **Start with `skill-creator`.**

| Skill | What it does |
|---|---|
| `skill-creator` | Creates, edits and evaluates a skill, and measures whether its description triggers. |
| `mcp-builder` | Builds an MCP server with well-designed tools, and a harness to evaluate it. |
| `harvest` | Clones a GitHub repository you name and installs the skills it finds. |

`skill-creator` and `mcp-builder` are owned copies from anthropics/skills, Apache-2.0.

---

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
│       └── shared/             # scripts, schemas and references used by several skills
├── README.md
└── SECURITY.md
```

Folder name, `plugin.json` `name`, and the marketplace entry `name` are always the same terse
string; `displayName` carries the readable label. `skills/` and `agents/` are the default
locations, so no manifest field points at them. `shared/` is plain plugin payload — skills reach
it through `${CLAUDE_PLUGIN_ROOT}`, which Claude Code expands to the install directory, so a
plugin works wherever it lands.

Some skills write outside their own install directory, on purpose, when you run them:
`herdr`'s setup (`herdr-setup`, or the `install.sh` wrapper) symlinks `horch` into `~/.local/bin`
(`HORCH_BIN_DIR` overrides) and, only for a cloned repo rather than a plugin install, links skills
into `~/.claude/skills` (`CLAUDE_SKILLS_DIR` overrides); `core`'s prime installs `graphify` plus
git and Claude Code hooks into the repo you point it at (`graph.sh --no-hooks` skips the hooks);
and `meta`'s `harvest` clones the GitHub repository you name and copies its skills into
`~/.claude/skills`. [SECURITY.md](SECURITY.md) spells them all out. The `dev` and `ddd` pipelines
write their working documents inside the repository you run them in (`ai_docs/` and `ddd/`), which
is the point.

## Skill names are namespaced

Installed as plugins, skills are addressed as `<plugin>:<skill>` — `dev:workflow`,
`ddd:ddd-workflow`, `code:core`, `herdr:herdr-orchestrator`, `tools:humanize`. Agents too:
`ddd:ddd-decision-strategist`, `dev:codebase-locator`. The skills that dispatch their siblings
(`dev:workflow`, `ddd:ddd-workflow` and every agent-dispatch site) use the namespaced form,
including across plugins: the `dev` pipeline calls `tools:pre-flight` and `tools:post-flight`,
which stay in `tools` so existing installs keep working. A bare name may still resolve when it is
unambiguous, but do not rely on it.

If you already have any of these skills loose in `~/.claude/skills`, move the loose copy aside
before installing the plugin. Claude Code loads both, and two identical descriptions make
triggering a coin flip.

## What is not in the repo

Most of a clone is the `ddd` plugin's golden test fixtures. `.gitignore` keeps the rest out:

| Ignored | Why |
|---|---|
| `**/node_modules/` | the Playwright fixture install under `code/skills/e2e-harness/evals/fixtures/`, which dwarfs the fixture itself; also the install for `code/skills/complexity-sweep`'s bundled CLI, which the skill runs `npm install` for on first use |
| `**/e2e/artifacts/` | regenerated by `e2e run` |
| `__pycache__/`, `.pytest_cache/` | test caches |

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
