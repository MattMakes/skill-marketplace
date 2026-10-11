# skill-marketplace

A Claude Code plugin marketplace for engineering work. The plugins are grouped by the job they do:
carry a change from idea to review (`dev`), design, diagram, understand
and verify systems (`code`), review game work (`game`), design games (`game-design`), run a fleet of agents
(`herdr`), think and finish well (`tools`), and make more skills (`meta`).

Eleven further plugins hold **two hundred and five skills harvested from the open skill ecosystem**
(fifty-eight repositories reviewed, twenty-three contributed): engineering craft (`craft`), verification
and testing (`verify`), Lauren Tan's pstack principles (`pstack`), product thinking and specs
(`product`), design craft (`design`), stack references (`stack`), production operations (`ops`),
security practice (`security`), agent engineering (`agentic`), LLM training (`ml`) and knowledge work
(`work`). Every one is a supply-chain-controlled copy, adapted only as far as it takes to run standalone in
Claude Code, and credited with its upstream repository, commit and license in the plugin's `NOTICE.md`.
The harvest itself is written up in [docs/2026-10-11-skill-harvest.md](docs/2026-10-11-skill-harvest.md).

## Install

```bash
claude plugin marketplace add MattMakes/skill-marketplace

claude plugin install dev@skill-marketplace
claude plugin install code@skill-marketplace
claude plugin install game@skill-marketplace
claude plugin install game-design@skill-marketplace
claude plugin install herdr@skill-marketplace
claude plugin install tools@skill-marketplace
claude plugin install meta@skill-marketplace

# harvested plugins
claude plugin install craft@skill-marketplace
claude plugin install verify@skill-marketplace
claude plugin install pstack@skill-marketplace
claude plugin install product@skill-marketplace
claude plugin install design@skill-marketplace
claude plugin install stack@skill-marketplace
claude plugin install ops@skill-marketplace
claude plugin install security@skill-marketplace
claude plugin install agentic@skill-marketplace
claude plugin install ml@skill-marketplace
claude plugin install work@skill-marketplace
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

## `code` — Code Intelligence

Design, understand, and verify systems. Choose the entry point for the job:

| Start here | What it does |
|---|---|
| `ddd` | Starts or resumes domain modelling; routes through nine step skills with shared artifacts, validation gates, and a review page. |
| `blueprint` | Creates standalone architecture, workflow, sequence, data-flow and state diagrams with animated walkthroughs, offline fonts, and image export. Also supplies diagrams to DDD and explain-diff. |
| `core` | Primes an existing repo into a knowledge graph and `CLAUDE.md` contracts. |
| `keys` | Stands up a self-maintaining `AGENTS.md` tree and folds `CLAUDE.md` and other agent-instruction files into it. |
| `explain-diff` | Explains a diff, branch or PR with background, intuition, a code walkthrough, an interactive quiz, and embedded Blueprint diagrams. |
| `deepwiki` | Generates and maintains wiki documentation with source citations and validated Mermaid. |
| `security-sweep` | Audits security across stacks with OWASP, STRIDE, secrets and supply-chain checks. |
| `complexity-sweep` | Measures TypeScript/JavaScript complexity and suggests or implements refactorings. |
| `e2e-harness` | Generates runnable end-to-end suites from system documentation. |

For DDD, invoke **`code:ddd`** rather than choosing a step first. It routes through
`ddd-understand` → `ddd-discover` → `ddd-decompose` → `ddd-strategize` → `ddd-connect` →
`ddd-organise` → `ddd-define` → `ddd-code` → `ddd-contracts`. The
`code:ddd-decision-strategist` agent supports difficult design decisions.
Node ≥ 18 runs the DDD and Blueprint tools. See the [DDD guide](plugins/code/docs/ddd.md)
and [code plugin guide](plugins/code/README.md).

The former `ddd` plugin is now part of `code`. Update/install `code@skill-marketplace`
and remove the old `ddd` plugin to avoid duplicate skills. Replace `ddd:ddd-workflow`
with `code:ddd`; existing project `ddd/` workspaces need no conversion.

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

## `game-design` — Game Design Studio

Generative game design that runs headless, the counterpart to the `game` review board. Run the
skills in pipeline order; send the result to `game:game-studio-cpo` for critique.
**Start with `fun-targeting`.**

| Skill | What it does |
|---|---|
| `fun-targeting` | Picks 2–3 of the eight kinds of fun and traces every mechanic back to one (MDA). |
| `game-ideation` | At least 6 concepts under a constraint card, a boundaries-first gate, a scored shortlist. |
| `core-loop` | Moment-to-moment, session and long-term loops as Mermaid flowcharts. |
| `design-diagrams` | Which diagram to draw when: storyboard, time-and-space map, triangle, matrix, module map. |
| `game-brief` | The reader-facing brief, down to the smallest prototype that tests the fun. |
| `one-page-design` | Librande's one-page method; renders a JSON spec to a dated SVG. |
| `art-direction` | A style sheet, a shot list tied to the fun, and placeholder image prompts. |

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

---

# Harvested plugins

These eleven plugins are vendored from other people's work. Each plugin's `README.md` says what every
skill does and what it writes, runs or reaches outside its own directory; each `NOTICE.md` names the
upstream repository, path, commit, date, license and author of every skill, and lists the edits made
here. Skills that install hooks, download binaries or call the network only do so when you invoke them;
installing a plugin wires nothing.

## `craft` — Engineering Craft

Twenty-two vendored skills on engineering practice: how to design modules and name domain concepts, how to keep changes small and honest while coding, how to diagnose bugs and performance, how to audit and migrate a codebase, and how to finish a branch. Each is a supply-chain-controlled copy of an upstream skill, adapted only as far as it takes to run standalone in Claude Code.

| Group | Skills |
|---|---|
| Designing code | `codebase-design`, `domain-modeling`, `architecture-decision-records`, `contract-first`, `prototype`, `improve-codebase-architecture` |
| Discipline while coding | `ponytail`, `karpathy-coder`, `ai-development-guide`, `source-driven-development`, `constraint-driven-development`, `doubt-driven-development`, `verification-before-completion` |
| Debugging and performance | `diagnosing-bugs`, `performance-optimization` |
| Auditing and improving a codebase | `improve`, `deprecation-and-migration`, `oh-my-issues`, `retro`, `code-tour` |
| Finishing a change | `finishing-a-development-branch`, `make-pr-easy-to-review` |

See [plugins/craft/README.md](plugins/craft/README.md) for what each skill does and what it reaches, and [plugins/craft/NOTICE.md](plugins/craft/NOTICE.md) for upstream credits.

## `verify` — Verification and Testing

Twenty-two skills for proving a change works: harnesses that capture runtime evidence, browser and desktop QA, test-suite authoring and auditing, load tests, and review lenses. All of them are vendored from upstream repositories and maintained here.

| Group | Skills |
|---|---|
| Prove a change works | `verify-feature`, `verify-this`, `santa-method`, `control-cli`, `control-ui`, `full-page-screenshot` |
| Browser and desktop QA | `dogfood`, `adversarial-ux-test`, `webapp-testing`, `ui-demo`, `ios-simulator`, `windows-desktop-e2e` |
| Test suites | `playwright-pro`, `react-testing`, `integration-e2e-testing`, `bats-testing-patterns`, `test-audit`, `k6-load-testing` |
| Review lenses | `click-path-audit`, `api-design-reviewer`, `python-anti-patterns`, `ai-debt-detector` |

See [plugins/verify/README.md](plugins/verify/README.md) for what each skill does and what it reaches, and [plugins/verify/NOTICE.md](plugins/verify/NOTICE.md) for upstream credits.

## `pstack` — pstack Principles

Lauren Tan's pstack, vendored from cursor/plugins: sixteen one-page engineering principles and eleven procedures that cite them (design, rationale archaeology, blast radius, benchmarks, writing, decision trails, repo hygiene, TypeScript, verification skills). The Cursor-only router (`poteto-mode`), its playbooks, the model-config rule and the sibling skills it leaned on are not vendored; everything here runs on Claude Code's Task tool and model aliases.

| Group | Skills |
|---|---|
| Principles | `principle-type-system-discipline`, `principle-model-the-domain`, `principle-minimize-reader-load`, `principle-boundary-discipline`, `principle-separate-before-serializing-shared-state`, `principle-make-operations-idempotent`, `principle-build-the-lever`, `principle-encode-lessons-in-structure`, `principle-test-behavior-not-implementation`, `principle-attack-the-premise`, `principle-laziness-protocol`, `principle-sequence-verifiable-units`, `principle-explain-the-number`, `principle-foundational-thinking`, `principle-migrate-callers-then-delete-legacy-apis`, `principle-subtract-before-you-add` |
| Procedures | `architect`, `arena`, `why`, `blast-radius`, `benchmark-checklist`, `correct`, `technical-writing`, `show-me-your-work`, `typescript-best-practices`, `create-verification-skill`, `maintain-verification-skill` |

See [plugins/pstack/README.md](plugins/pstack/README.md) for what each skill does and what it reaches, and [plugins/pstack/NOTICE.md](plugins/pstack/NOTICE.md) for upstream credits.

## `product` — Product Thinking and Specs

Twenty-three skills for the stretch between "I have an idea" and a spec someone can build from: interviewing the user until the ask is clear, critiquing the idea from hostile angles, writing the PRD or issue, and doing the research that feeds all three. Every one is a vendored copy of an upstream skill, adapted to run standalone inside Claude Code.

| Group | Skills |
|---|---|
| Interview and clarify | `interview-me`, `grilling`, `grill-with-docs`, `requirement-convergence`, `intent-driven-development`, `advanced-elicitation` |
| Ideas and product critique | `office-hours`, `product-brainstorming`, `roast`, `prfaq`, `devil`, `plan-ceo-review`, `plan-design-review`, `scientific-problem-selection` |
| Specs and PRDs | `write-spec`, `spec`, `spec-driven-workflow`, `code-to-prd`, `documentation-criteria` |
| Research | `synthesize-research`, `deep-research`, `deepread`, `litreview` |

See [plugins/product/README.md](plugins/product/README.md) for what each skill does and what it reaches, and [plugins/product/NOTICE.md](plugins/product/NOTICE.md) for upstream credits.

## `design` — Design Craft

Eighteen vendored skills for frontend design and UX craft: anti-slop design methods and design direction, motion rules and their reviewer, design and web-quality audits, accessibility, and HTML slide decks. Install the whole thing or copy out the one you want.

| Group | Skills |
|---|---|
| Design direction and craft | `frontend-design`, `impeccable`, `hallmark`, `ui-ux-pro-max`, `make-interfaces-feel-better`, `design-system-patterns`, `design-md` |
| Motion | `emil-design-eng`, `review-animations` |
| Review and audit | `design-is`, `design-review`, `web-design-guidelines`, `web-quality-audit`, `core-web-vitals` |
| Accessibility | `accessibility`, `a11y-audit`, `screen-reader-testing` |
| Presentations | `frontend-slides` |

See [plugins/design/README.md](plugins/design/README.md) for what each skill does and what it reaches, and [plugins/design/NOTICE.md](plugins/design/NOTICE.md) for upstream credits.

## `stack` — Stack References

Twenty-three reference skills for specific libraries, frameworks and languages, each carrying the API detail and the gotchas a model otherwise guesses at. All of them are vendored from upstream projects — several are the library authors' own official skills — and maintained here.

| Group | Skills |
|---|---|
| Animation and video | `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-frameworks`, `motion-foundations`, `motion-patterns`, `motion-advanced`, `remotion-best-practices` |
| React and UI | `react-best-practices`, `react-useeffect`, `shadcn` |
| Databases | `postgres-best-practices`, `postgresql-table-design`, `prisma-patterns`, `database-migrations` |
| Systems languages | `cpp-coding-standards`, `boost-asio-pro`, `swift-concurrency-expert` |
| Backend patterns | `dotnet-backend-patterns`, `saga-orchestration` |

See [plugins/stack/README.md](plugins/stack/README.md) for what each skill does and what it reaches, and [plugins/stack/NOTICE.md](plugins/stack/NOTICE.md) for upstream credits.

## `ops` — Production Operations

Seventeen skills for running software in production, vendored from six upstream repositories and maintained here. They cover the whole loop: instrument and set targets, release safely, manage the infrastructure underneath, and learn from what breaks.

| Group | Skills |
|---|---|
| Observe and set targets | `observability-and-instrumentation`, `slo-architect` |
| Release safely | `feature-flags-architect`, `shipping-and-launch`, `ship-gate`, `changelog-generator`, `deployment-pipeline-design`, `github-actions-creator` |
| Infrastructure | `docker-development`, `kubernetes-patterns`, `terraform-patterns`, `migration-architect`, `wizard` |
| Keep it healthy | `chaos-engineering`, `dependency-updater`, `dependabot-review`, `postmortem-writing` |

See [plugins/ops/README.md](plugins/ops/README.md) for what each skill does and what it reaches, and [plugins/ops/NOTICE.md](plugins/ops/NOTICE.md) for upstream credits.

## `security` — Security Practice

Eight vendored skills for securing application and agent code: threat modeling and hardening, per-framework security rules, hardening for agent runtimes, static review of MCP configs, a pre-install scanner for third-party skills, and two git guardrail hooks. Install the whole thing or copy out the one you want.

| Group | Skills |
|---|---|
| Threat modeling and hardening | `security-and-hardening`, `security-threat-model`, `security-best-practices` |
| Agent runtimes and supply chain | `agent-security-hardening`, `mcp-dependency-review`, `skill-security-auditor` |
| Git guardrails (hook installers) | `git-guardrails-claude-code`, `block-no-verify-hook` |

See [plugins/security/README.md](plugins/security/README.md) for what each skill does and what it reaches, and [plugins/security/NOTICE.md](plugins/security/NOTICE.md) for upstream credits.

## `agentic` — Agent Engineering

Ten skills for building and running agents: deciding whether a task deserves a loop and reviewing the loop for the ways it runs away, auditing a misbehaving agent stack, putting a human sign-off lane in front of irreversible work, running an autonomous optimize loop, giving an agent memory that earns promotion instead of asserting it, and writing the documents, prompts and CLIs that agents consume. All ten are vendored from upstream and maintained here.

| Group | Skills |
|---|---|
| Designing, auditing and gating loops | `loop-design-check`, `agent-architecture-audit`, `human-gate`, `autoresearch-agent` |
| Memory | `agent-memory`, `stow` |
| Writing for agents | `writing-for-agents`, `llm-friendly-context`, `cli-for-agents`, `book-to-skill` |

See [plugins/agentic/README.md](plugins/agentic/README.md) for what each skill does and what it reaches, and [plugins/agentic/NOTICE.md](plugins/agentic/NOTICE.md) for upstream credits.

## `ml` — LLM Training and ML Pipelines

Nine vendored skills: seven that walk a language-model post-training run end to end — decide the method, build the eval harness first, curate the data, configure LoRA/QLoRA, preference optimization or GRPO/RLVR, then gate the checkpoint — and two that design retrieval and ranking pipelines. The seven fine-tuning skills are one lifecycle and hand off to each other by name; the other two stand alone.

| Group | Skills |
|---|---|
| Fine-tuning lifecycle (in order) | `finetuning-method-selection`, `eval-harness-first`, `dataset-curation`, `lora-qlora-recipes`, `preference-optimization`, `grpo-rlvr-training`, `checkpoint-promotion` |
| Pipeline design | `rag-architect`, `recsys-pipeline-architect` |

See [plugins/ml/README.md](plugins/ml/README.md) for what each skill does and what it reaches, and [plugins/ml/NOTICE.md](plugins/ml/NOTICE.md) for upstream credits.

## `work` — Knowledge Work

Twenty-six vendored skills for the parts of a working day that are not writing code: analysing data, running product operations, reviewing contracts and budgets, triaging support, writing clearly, and producing diagrams and media files. Fifteen come from Anthropic's knowledge-work plugins and the rest from eight other repositories; all are maintained here as copies.

| Group | Skills |
|---|---|
| Data | `explore-data`, `validate-data`, `sql-queries`, `statistical-analysis`, `statistical-analyst`, `data-visualization`, `build-dashboard` |
| Product operations | `metrics-review`, `roadmap-update`, `stakeholder-update`, `competitive-brief`, `market-sizing-analysis`, `startup-metrics-framework` |
| Legal and finance | `review-contract`, `triage-nda`, `variance-analysis` |
| Support | `ticket-triage`, `customer-escalation` |
| Writing | `writing-clearly-and-concisely`, `crafting-effective-readmes`, `writing-guidelines`, `to-questionnaire` |
| Diagrams, knowledge and files | `drawio`, `grounded-vault`, `video-editor`, `file-conversion` |

See [plugins/work/README.md](plugins/work/README.md) for what each skill does and what it reaches, and [plugins/work/NOTICE.md](plugins/work/NOTICE.md) for upstream credits.


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
`~/.claude/skills`. [SECURITY.md](SECURITY.md) spells them all out. The `dev` and `code:ddd` pipelines
write their working documents inside the repository you run them in (`ai_docs/` and `ddd/`), which
is the point.

## Skill names are namespaced

Installed as plugins, skills are addressed as `<plugin>:<skill>` — `dev:workflow`,
`code:ddd`, `code:core`, `herdr:herdr-orchestrator`, `tools:humanize`, `craft:ponytail`,
`product:grilling`, `pstack:blast-radius`. Agents too:
`code:ddd-decision-strategist`, `dev:codebase-locator`. The skills that dispatch their siblings
(`dev:workflow`, `code:ddd` and every agent-dispatch site) use the namespaced form,
including across plugins: the `dev` pipeline calls `tools:pre-flight` and `tools:post-flight`,
which stay in `tools` so existing installs keep working. A bare name may still resolve when it is
unambiguous, but do not rely on it.

If you already have any of these skills loose in `~/.claude/skills`, move the loose copy aside
before installing the plugin. Claude Code loads both, and two identical descriptions make
triggering a coin flip.

## What is not in the repo

Most of a clone is the DDD golden test fixtures under `code/shared`. `.gitignore` keeps the rest out:

| Ignored | Why |
|---|---|
| `**/node_modules/` | the Playwright fixture install under `code/skills/e2e-harness/evals/fixtures/`, which dwarfs the fixture itself; also the install for `code/skills/complexity-sweep`'s bundled CLI, which the skill runs `npm install` for on first use |
| `**/e2e/artifacts/` | regenerated by `e2e run` |
| `__pycache__/`, `.pytest_cache/` | test caches |
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
