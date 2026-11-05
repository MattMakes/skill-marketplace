# software — Software Engineering

Take a change from idea to production, in one plugin. Its 142 skills and five agents follow the
life of a change: **Decide** what to build, **Shape** the system, **Understand** the code that is
already there, **Build** the change, **Verify** it, **Secure** it and **Ship** it. Every step
reads and writes inside the repository you are working in.

**Start with `workflow`** (`/software:workflow`). It lists the flows — development, code review,
research, PRD, design analysis, UI, debugging — with their command sequences and helps you pick
one. In a repository you will touch more than once, run `core` first to prime it.

```bash
claude plugin install software@skill-marketplace
```

Each area below links to its area doc in [`docs/areas/`](docs/areas/), which has the full skill
descriptions, the flows, the workspace layout and every disclosure. Principles and stack
references are router skills: one skill per subject, each topic a `topics/<topic>/GUIDE.md` read
only when the work needs it, cited as `software:<router>` (topic `<topic>`). Coming from 2.x? The
[root README](../../README.md#migrating-from-2x) maps every old `<plugin>:<skill>` name to its new
home.

## Decide — specs and requirements

Is the ask clear enough to build from? Diverge on the problem, challenge the idea, write the spec.
Area doc: [docs/areas/product.md](docs/areas/product.md).

| Skill | What it does |
|---|---|
| `interview-me` | Turns an underspecified ask into a six-line intent with a mandatory out-of-scope, one question at a time, and stops at an explicit yes. |
| `grilling` | Stress-tests a plan, decision or idea by asking the whole frontier of open questions with a recommended answer each. Docs-anchored mode (from the former `grill-with-docs`) works against `CONTEXT.md` and `docs/adr/`; design-brief mode (from the former `grill-me` of the `design-system` plugin) writes a UI `BRIEF.md`. |
| `devil` | A sign-off manager attacks what a PRD, spec or brief is silent about and rules Approve / Conditional / Reject. |
| `advanced-elicitation` | Pushes the last output harder with five methods at a time from a 71-method catalog (socratic, pre-mortem, red team, ...). |
| `product-brainstorming` | A PM's sparring partner in four modes (problem, solution, assumptions, strategy) with HMW, JTBD, opportunity-solution trees and SCAMPER. |
| `adhd` | Five isolated parallel branches under different cognitive frames for an open-ended design, naming or API question; about ten Agent calls a run. |
| `spec` | Interrogates a request in five phases and files a GitHub issue; PRD mode (`--prd`, from the former `write-spec`) writes a full PRD through the same review and secrets scan. |
| `requirement-convergence` | Separates the outcome from the proposed requirements, with user-authored non-goals; acceptance-criteria mode (from the former `intent-driven-development`) writes AC-NNN criteria. |
| `documentation-criteria` | Decides which of PRD, ADR, UI spec, design doc and work plan a change needs, with six templates. |
| `code-to-prd` | Reverse-engineers an existing codebase into a PRD with a stdlib analyzer for eleven web frameworks. |

## Shape — architecture and DDD

How should the system be shaped? Boundaries, module interfaces, recorded decisions, contracts and
diagrams. Area doc: [docs/areas/architecture.md](docs/areas/architecture.md); the
[DDD guide](docs/ddd.md) covers the review page, diagrams, decisions and CLI.

| Skill | What it does |
|---|---|
| `ddd` | Entry point of the nine-step DDD Starter Modelling Process over one `ddd/` workspace: status, next step or whole chain (interactive or auto), re-run from a step, coverage summary. |
| `ddd-understand` | Step 1: why the system exists, for whom, at what scale (Business Model Canvas, Impact Map, scale target). |
| `ddd-discover` | Step 2: big-picture EventStorming timeline, hotspots and a seeded glossary. |
| `ddd-decompose` | Step 3: subdomains, bounded contexts and a context map. |
| `ddd-strategize` | Step 4: core, supporting or generic; build vs buy; implementation pattern per subdomain. |
| `ddd-connect` | Step 5: message flows per scenario, message catalogue, one integration decision per relationship. |
| `ddd-organise` | Step 6: team ownership and deployable count, modular monolith by default. |
| `ddd-define` | Step 7: a Bounded Context Canvas per context and a C4 system context. |
| `ddd-code` | Step 8: aggregates, invariants, ports and adapters, and `implementation-plan.md`. |
| `ddd-contracts` | Step 9: a JSON Schema payload, example, owner and rules for every message that crosses a party boundary. |
| `domain-modeling` | The light mode for an existing codebase: sharpen terms against `GLOSSARY.md` and offer an ADR only when it earns one. |
| `codebase-design` | Designs a module's interface or decides where a seam goes, with the deletion test and design-it-twice. |
| `improve-codebase-architecture` | Finds where the codebase is shallow and picks a refactor worth doing; HTML report, then a grilling loop. User-invoked only. |
| `improve` | A read-only senior-advisor audit that writes numbered handoff plans another agent can execute. |
| `architect` | Sketches types, signatures and module map before code, designs twice through `software:arena`, then implements against the sketch. |
| `architecture-decision-records` | ADR templates (MADR, lightweight, Y-statement, deprecation, RFC), lifecycle and review checklist. |
| `contract-first` | One authoritative OpenAPI/AsyncAPI/proto/JSON Schema artifact for both sides of an API, with provider verification. |
| `api-design-principles` | REST and GraphQL design references, a checklist and a FastAPI template. |
| `saga-orchestration` | Distributed transactions without 2PC: orchestration vs choreography, compensation, idempotent steps. |
| `blueprint` | Validated architecture, sequence, workflow, data-flow and lifecycle diagrams as explorable standalone HTML; also the renderer behind `ddd export blueprint --deliver`. |
| `drawio` | An editable `.drawio` diagram, hand-authored or generated from Terraform, Kubernetes, SQL, OpenAPI or code. User-invoked only. |

## Understand — code intelligence, instruction files and session learning

What does this existing code do, and what should an agent know before it touches it? Area doc:
[docs/areas/code.md](docs/areas/code.md).

| Skill | What it does |
|---|---|
| `core` | Primes a repository once: a deterministic, zero-token graphify code graph, hands the `AGENTS.md` tree to `keys`, reads only what neither answers. Quick mode (from the former `prime` of the `dev` plugin) reads the key files without a graph. |
| `keys` | Installs KEYS, a self-maintaining `AGENTS.md` hierarchy, and folds `CLAUDE.md` and other rule files into it after you confirm. `AGENTS.md` is the only instruction file. |
| `research-codebase` | Documents the code as it is, without critique, by fanning out to the three codebase agents. |
| `trace` | Traces an entry point upstream and downstream into plain-prose business logic; `--parity` sweeps two implementations. |
| `why` | Why the code is shaped this way, from `git`/`gh` and every connected evidence source, with a five-tier confidence framework. |
| `deepwiki` | A cited wiki for a codebase (every claim `file:line`, linted Mermaid); Brownfield mode (from the former `document-project` of the `dev` plugin) writes one architecture document for agents. |
| `code-tour` | An onboarding, architecture, PR, RCA or security walkthrough as a VS Code CodeTour `.tour` file. |
| `explain-diff` | One self-contained HTML page explaining a diff, branch or PR: background, intuition, code walkthrough and a quiz, with Blueprint diagrams and optional local narration. |
| `agent-memory` | Learns durable facts from sessions in a four-tier store; nothing reaches a committed file without a human `adopt`. |
| `stow` | Files a session's preferences, facts, gotchas and next steps into the project's existing notes before a reset or break. |
| `retro` | After a session, improves the agent's environment for the next one. User-invoked only. |
| `correct` | Turns repeated agent mistakes into the strongest enforcement that works: architecture, types, a lint, a test, docs last. |

## Build — the development workflow, craft and stack references

Build the change: a planned pipeline from design to change description, the discipline that keeps
each step honest, the git skills that finish the branch, and the principles and library references
that apply while you write. Area docs: [docs/areas/dev.md](docs/areas/dev.md) (pipeline),
[docs/areas/craft.md](docs/areas/craft.md) (craft) and [docs/areas/stack.md](docs/areas/stack.md)
(stack).

### Pipeline and discipline

| Skill | What it does |
|---|---|
| `workflow` | The entry point: lists the flows and their command sequences. |
| `brainstorm` | Refines a rough idea into a validated design through dialogue. |
| `analyze-design` | Analyzes a design from eight expert perspectives, plus UX and accessibility when it has a UI. |
| `breakdown` | Breaks a design into Simple, Lovable, Complete phases, one plan each. |
| `create-plan` | An implementation plan with exact paths and code for an engineer with zero context. |
| `pre-flight` | Checks a plan against the codebase for wiring, contract, behaviour, configuration and credential gaps before execution. |
| `execute-plan` | Executes a plan in batches with implementer and reviewer subagents and resumes from checkmarks. |
| `check-implementation` | Verifies the code matches the plan; post-flight mode (from the former `post-flight` of the `tools` plugin) also checks behavioural equivalence and runs smoke checks. |
| `change-description` | Generates the change description from the story ticket and the diff. |
| `whats-next` | A zero-loss handoff document for continuing in a fresh context. |
| `swarm` | Agent teams in one session, from a pair to plan-first orchestration with quality gates. |
| `arena` | N parallel attempts at one artifact, an independent cross-judge, then graft the best parts. |
| `spec-driven-workflow` | Spec before code: RFC 2119 requirements, Given/When/Then, a validator and a test-stub extractor. |
| `tdd` | Red-green-refactor before implementation code, with the rules that keep tests honest. |
| `debug` | Four phases from reproduce to verify before any fix; hard-bug and performance-regression mode from the former `diagnosing-bugs`. |
| `verification-before-completion` | No success claim without the command run in this message. |
| `doubt-driven-development` | A fresh-context adversarial reviewer for a non-trivial decision, bounded at three cycles. |
| `unlazy` | Acceptance gates written before a long autonomous run and re-verified before "done"; lite mode is one `GATES.md`. |
| `show-me-your-work` | An append-only decision log for long or unattended runs, audited against the transcript. |
| `using-git-worktrees` | Isolated feature work in a git worktree under a gitignored `.worktrees/`. |
| `git-advanced-workflows` | Rebase, cherry-pick, bisect, worktrees and reflog recovery. |
| `finishing-a-development-branch` | A fixed merge / PR / keep menu when the work is done; discards only on the typed word `discard`. |
| `make-pr-easy-to-review` | Dependency-ordered commit grouping with a tree-hash identity check before and after the rewrite. |

### Craft

| Skill | What it does |
|---|---|
| `principles` | Router over sixteen one-page engineering principles from Lauren Tan's pstack. Topics: `principle-foundational-thinking`, `principle-type-system-discipline`, `principle-model-the-domain`, `principle-boundary-discipline`, `principle-make-operations-idempotent`, `principle-separate-before-serializing-shared-state`, `principle-migrate-callers-then-delete-legacy-apis`, `principle-laziness-protocol`, `principle-subtract-before-you-add`, `principle-sequence-verifiable-units`, `principle-minimize-reader-load`, `principle-test-behavior-not-implementation`, `principle-explain-the-number`, `principle-build-the-lever`, `principle-encode-lessons-in-structure`, `principle-attack-the-premise`. |
| `ponytail` | The smallest change that fully solves the task, with a never-cut list and a reply that names what was skipped. |
| `karpathy-coder` | Karpathy's four coding principles as a review procedure, four stdlib checkers and an optional pre-commit gate. |
| `error-handling-patterns` | Exceptions vs Result types, propagation, circuit breakers and graceful degradation across languages. |
| `performance-optimization` | Measure, identify, fix, verify, guard, with strict keep-or-revert rules. |
| `deprecation-and-migration` | Removing an old system, API or feature, or changing a production schema without downtime. |
| `source-driven-development` | Implements framework code from the exact official doc page for the detected version, and flags what it could not verify. |
| `constraint-driven-development` | Writes the quality bar down as `CONSTRAINTS.md` with ratchets and a floor guard. |
| `ai-development-guide` | Fail-fast fallback policy, five named failure patterns and a risk-scaled impact analysis. |
| `prototype` | Throwaway code that answers one state-model or UI question, then is cleaned up. |
| `oh-my-issues` | Clusters dozens of issues with shared root causes into plan-master issues and one PR per cluster. |
| `rules-from-code` | Reverse-engineers a team's `rules.md` from its own best and worst files. |
| `engineering-rules` | The SLC ethos and a fixed set of coding standards as a preamble for planning or building. |
| `persona` | A senior staff engineer who applies SLC (Simple, Lovable, Complete) and refuses to ship phases. |

### Stack references

| Skill | What it does |
|---|---|
| `animation` | Router for web and video animation. Topics: `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-frameworks`, `motion-foundations`, `motion-patterns`, `motion-advanced`, `remotion-best-practices`. |
| `react-typescript` | Router for React, Next.js and TypeScript rules a model gets wrong. Topics: `react-best-practices`, `react-useeffect`, `server-component-rules`, `shadcn`, `typescript-best-practices`. |
| `data` | Router for relational data. Topics: `postgres-best-practices`, `postgresql-table-design`, `prisma-patterns`, `database-migrations`. |
| `systems` | Router for systems languages. Topics: `cpp-coding-standards`, `boost-asio-pro`, `swift-concurrency-expert`. |
| `dotnet-backend-patterns` | C#/.NET backends: minimal APIs, DI lifetimes, EF Core and Dapper, caching, resilience, xUnit. |

## Verify — review and runtime verification

Is it right, and does it work? Review skills read the code; run skills run it. Start with
`code-sweep` to review a change and `verify-feature` to prove it works. Area doc:
[docs/areas/verify.md](docs/areas/verify.md).

| Skill | What it does |
|---|---|
| `code-sweep` | Twelve specialized reviewers in parallel over a branch, commit or change, synthesized into a severity-ranked report; light mode (`--light`, from the former `review-git-changes`) is one pass with an A-F grade. |
| `ai-debt-detector` | The debt AI-generated code hides: missing failure modes, orphaned resources, hallucinated dependencies, drift. |
| `complexity-sweep` | A bundled static-analysis CLI (14 metrics; TypeScript, JavaScript, Python, Rust, GDScript), then a refactor or a refactoring prompt per function over threshold. |
| `blast-radius` | "What could this break": finds the one fact a change is safe because of and proves it by running real code. |
| `api-design-reviewer` | REST/OpenAPI linting, breaking-change detection that can gate CI, and a design scorecard. |
| `python-anti-patterns` | A checklist of concrete Python anti-patterns with fixes. |
| `code-review-excellence` | Giving review: constructive, catches bugs early, keeps morale. |
| `receiving-code-review` | Taking review: verify before implementing, no performative agreement. |
| `verify-feature` | Drives the changed code at its real surface (CLI, API, UI, library, agent) and reports PASS, FAIL, BLOCKED or SKIP with captured evidence. |
| `verify-this` | Restates a claim falsifiably, captures baseline and treatment, and returns VERIFIED, NOT VERIFIED or INCONCLUSIVE. |
| `santa-method` | Two independent reviewers with one rubric must both pass before output ships. |
| `human-gate` | A named person's sign-off on a single-file HTML review page; the gate refuses to close with an open BLOCKER. |
| `benchmark-checklist` | Seven questions to answer before reporting a speedup or regression. |
| `create-verification-skill` | Writes a project's own `.claude/skills/verify-<app>/` and proves it end to end. |
| `maintain-verification-skill` | Keeps that generated skill honest as the app changes. |
| `control-cli` | Drives an interactive CLI or TUI deterministically through tmux or a pty. |
| `control-ui` | Drives a web, IDE or Electron UI through Playwright or CDP; Quick Playwright mode from the former `webapp-testing`. |
| `ios-simulator` | End-to-end QA of an iOS app with 21 accessibility-driven scripts. macOS only. |
| `windows-desktop-e2e` | E2E tests for Windows native apps with pywinauto and UI Automation. |
| `full-page-screenshot` | One PNG of an entire page, including an authenticated tab, over the Chrome DevTools Protocol. |
| `ui-demo` | Records a polished demo video of a web app with Playwright. |
| `e2e-harness` | End-to-end tests across a polyglot system and its brokers, buckets and databases through a stdlib `e2e` CLI. |
| `integration-e2e-testing` | Which integration and E2E tests to write: lanes, budgets and an ROI formula. |
| `playwright-pro` | Playwright setup, 55 test templates, a 20-item anti-pattern review and flaky-test diagnosis. |
| `react-testing` | React Testing Library with Vitest or Jest, MSW and axe, and when to leave JSDOM. |
| `bats-testing-patterns` | Unit tests for shell scripts with Bats. |
| `k6-load-testing` | Load, stress, spike and soak tests with k6. |
| `test-audit` | Finds low-value and duplicate tests; retires them only in batches you approve. |
| `dogfood` | Exploratory QA of a web app with repro-first evidence and a report. |
| `adversarial-ux-test` | Roleplays the most tech-resistant user, then filters complaints down to real problems. |
| `click-path-audit` | Traces every button through its state changes to find handlers that cancel each other out. |
| `web-quality-audit` | A Lighthouse-style audit across performance, accessibility, SEO and best practices. |

## Secure — security practice

Is it safe? Start with `security-sweep`. Area doc: [docs/areas/security.md](docs/areas/security.md).

| Skill | What it does |
|---|---|
| `security-sweep` | A seven-phase multi-agent audit of the repository (OWASP, secrets, supply chain, LLM security, STRIDE), every finding independently verified, ending in a CSO-style report. |
| `security-threat-model` | A repository threat model: trust boundaries, assets, attacker capabilities and abuse paths, each anchored in evidence. |
| `security-and-hardening` | Threat-model first, then specific controls for untrusted input, sessions, personal data and third parties. |
| `security-best-practices` | The framework's own secure defaults for Express, Next.js, React, Vue, Django, Flask, FastAPI, Go and more. |
| `agent-security-hardening` | Containment for agent runtimes, tool gateways and memory services, with a verification gate. |
| `mcp-dependency-review` | Static review of an MCP config; never executes a server. |
| `skill-security-auditor` | Scans a third-party skill for code execution, exfiltration, prompt injection and supply-chain risk before you install it. |
| `git-guardrails-claude-code` | Installs a PreToolUse hook that blocks `git push`, `reset --hard`, `clean -f` and other destructive commands. |
| `block-no-verify-hook` | Installs a PreToolUse hook that rejects `--no-verify` and `commit -n`. |

## Ship — production operations

Can this go to production, and will it stay up? Start with `ship-gate`. Area doc:
[docs/areas/ops.md](docs/areas/ops.md).

| Skill | What it does |
|---|---|
| `ship-gate` | Pre-production audit with a pass/fail/manual verdict that blocks deploy intent until criticals pass; security from `security-sweep`; launch-plan mode from the former `shipping-and-launch`. |
| `observability-and-instrumentation` | Logs, metrics, traces and alerts that answer the questions on-call will ask. |
| `slo-architect` | SLOs, SLIs, error budgets and multi-window burn-rate alerts. |
| `feature-flags-architect` | Flag taxonomy and lifecycle, a debt scanner, a rollout planner and a kill-switch audit. |
| `changelog-generator` | Keep-a-Changelog output and a semver recommendation from Conventional Commits. |
| `deployment-pipeline-design` | Multi-stage CI/CD with approval gates, canary, blue-green and automated rollback. |
| `github-actions-creator` | A GitHub Actions workflow with minimal permissions, caching and pinned actions. |
| `docker-development` | Dockerfile and compose analysis and container security. |
| `kubernetes-patterns` | Production manifests, probes, RBAC, autoscaling and resource limits. |
| `terraform-patterns` | Module design, state backends and Terraform security scanning. |
| `migration-architect` | Database, service or infrastructure migrations with explicit rollback paths. |
| `wizard` | A generated bash wizard for a procedure only a human can perform. |
| `chaos-engineering` | Chaos experiments and game days with hypothesis, abort criteria and a write-up. |
| `dependency-updater` | Updates dependencies across seven ecosystems: patch and minor applied, majors prompted. |
| `dependabot-review` | Tiers open Dependabot PRs, checks CI and merges the safe tier. |
| `postmortem-writing` | A blameless postmortem with timeline, 5 Whys and action items. |

## Agents

| Agent | What it does |
|---|---|
| `codebase-locator` | Finds where files, directories and components live. Read-only. |
| `codebase-analyzer` | Explains how specific code works, with `file:line` references. Read-only. |
| `codebase-pattern-finder` | Finds existing implementations to model new work on, with the code. Read-only. |
| `code-reviewer` | Reviews recently changed code by priority; `execute-plan`'s reviewer subagent. |
| `ddd-decision-strategist` | The tie-breaker for DDD calls that must be argued: three options, risks, a recommendation and three questions. Never writes artifacts. |

## What these write and where they reach

Installing the plugin wires no hooks, no MCP servers and no background processes, and nothing runs
until you invoke a skill. The area docs list every skill's files and reach in full; this is the
summary.

**Hooks, only when you ask.**
- `git-guardrails-claude-code` copies a script to `.claude/hooks/` (or `~/.claude/hooks/`) and
  `block-no-verify-hook` adds an inline entry; both write a `PreToolUse` entry into
  `.claude/settings.json` or `~/.claude/settings.json`. They keep working after the plugin is
  uninstalled. ([Secure](docs/areas/security.md))
- `core` installs graphify's git hooks (post-commit and post-checkout rebuilds, a merge driver for
  `graph.json`), a `.claude/skills/graphify/` skill and a PreToolUse hook in
  `.claude/settings.json`; `graph.sh --no-hooks` skips them. ([Understand](docs/areas/code.md))
- `unlazy`'s `install-hooks.mjs` writes a Stop hook into `.claude/settings.local.json` after you
  agree; `--uninstall` removes it. ([Build](docs/areas/dev.md))
- `agent-memory`'s three hooks run only if you copy them from `scripts/hooks.json` into your
  settings; each fails open and can be disabled by an environment variable. `karpathy-coder`'s
  pre-commit gate runs only if you wire it in. ([Understand](docs/areas/code.md),
  [craft](docs/areas/craft.md))

**Downloads.** `core` installs graphify from PyPI (`uv tool install graphifyy`, else `pipx`, else
`pip install --user`). `complexity-sweep` runs `npm install --omit=dev` for its CLI on first use.
`e2e-harness setup --install` and `check-implementation`'s design gate kit install Playwright from
npm. `verify-feature` may offer to install `shot-scraper` and its Chromium. The `shadcn` topic of
`react-typescript` runs `npx shadcn@latest`. `dependency-updater` runs each ecosystem's tools
against its package registries.

**Network.** `spec`, `improve --issues`, `oh-my-issues`, `make-pr-easy-to-review`,
`finishing-a-development-branch`, `dependabot-review`, `wizard` and `change-description` use `gh`
or `glab` on the forge you point them at; `dependabot-review` merges pull requests and deletes
branches within its tiers. `why` queries the MCP servers you already connected.
`source-driven-development` fetches official docs; `security-best-practices` may search the web.
`skill-security-auditor` shallow-clones a URL you give it. `blueprint brands capture` fetches one
icon from a URL you supply; `drawio`'s icon scripts fetch from the unpkg, simpleicons and GitHub
CDNs when you ask for an icon. `improve-codebase-architecture`'s report loads Tailwind and Mermaid
from CDNs when opened. `doubt-driven-development` pipes to the `codex` or `gemini` CLI only after
you authorize the command. `dogfood` publishes to Surge only when asked. `explain-diff` narration
posts to the local service at `http://127.0.0.1:8477`, a companion in
[`services/breeze-tts`](../../services/breeze-tts/) that the plugin does not install.
`full-page-screenshot` talks to your local Chrome's debugging port. The DDD CLI, `security-sweep`,
`keys` and `agent-memory` make no network calls.

**Workspaces in the repository.** `ai_docs/` (the Build pipeline, `research-codebase`, `trace`,
`code-sweep` reviews, `security-sweep` runs), `ddd/`, `graphify-out/`, the `AGENTS.md` tree,
`e2e/`, `plans/` (`improve`), `.memory/` (`agent-memory`), `.unlazy/`, `.worktrees/`,
`.claude/test-audit/`, `.claude/skills/verify-<app>/`, `dogfood-output/`, `.tours/`, `docs/wiki/`,
`docs/YYYY-MM-DD-explanation-*.html`, `rules.md`, `CONSTRAINTS.md`, `.github/workflows/`, and the
`docs/` paths each Decide skill names.

**Outside the repository.** `drawio` saves style presets to `~/.drawio-skill/styles/`;
`ios-simulator` caches under `~/.ios-simulator-skill/`; `arena` may use `/tmp/arena-<slug>/`;
harnesses and captures go to `/tmp`. `retro`, `show-me-your-work`'s audit and
`agent-memory --why` read session transcripts under `~/.claude/projects/`. `agent-memory`'s `adopt`
is the only path that edits `~/.claude/CLAUDE.md`, one confirmed atom at a time after a backup.

**Changes you confirm first.** `keys` deletes the `CLAUDE.md` and rule files it folded only after
you confirm the list. `make-pr-easy-to-review` rewrites history and force-pushes only after you
agree to its plan. `correct` commits lint, CI, type and test changes, one per mistake class. `test-audit` edits
tests only in a batch you approve and never commits. `e2e-harness run` boots the system only after
you confirm the command, and takes it down afterwards.

The DDD and Blueprint tools need Node.js 18 or newer; most bundled scripts are Python 3 standard
library. Size notes: `drawio` is about 1 MB (a gzipped index of 10,446 shapes), `playwright-pro`
540 KB of templates, `security-best-practices` about 400 KB of rules and `ios-simulator` 400 KB of
scripts — the payload is the point in each.

## How it works with the other plugins

- **`design`** — the UI flow in `software:workflow` runs `software:grilling` (design-brief mode),
  `software:brainstorm`, `design:design-screen`, `design:gate`, `design:critique` and
  `software:code-sweep`. `software:check-implementation`, `software:code-sweep`'s interface auditor
  and `software:explain-diff` run the design plugin's render gates when it is installed.
  `software:web-quality-audit` hands Core Web Vitals to `design:performance` and accessibility to
  `design:a11y-audit`; `design:plan-design-review` critiques a plan's UI before coding, and
  `design:design-doctrine` primes an unfamiliar codebase with `software:core`.
  `software:prototype` answers one design question in throwaway code; `design:prototype` is the UI
  fidelity ladder.
- **`work`** — whether an idea is worth building is decided there (`work:office-hours`,
  `work:prfaq`, `work:roast`, `work:plan-ceo-review`, `work:deep-research`); `office-hours` and
  `plan-ceo-review` hand off to `software:create-plan` and `software:pre-flight`. For making AI text
  sound human use `work:humanize`, not `software:human-gate`.
- **`agents`** — `software:human-gate` puts a named person's sign-off in front of loops designed
  with `agents:loop-design-check` and runs of `agents:autoresearch-agent`.
  `agents:agent-architecture-audit` sends non-agent bugs to `software:debug` and security questions
  to `software:security-sweep`. `software:skill-security-auditor` gates `agents:harvest`, and
  `software:mcp-dependency-review` reviews servers built with `agents:mcp-builder`.
  `software:swarm` and `software:arena` run agents inside one session; `agents:herdr-orchestrator`
  runs a fleet of sessions. `software:retro` points prose work at `agents:writing-for-agents`.
- **`game`** — no skill hands off either way. General review, debugging and testing apply to game
  code as to any project, and `software:complexity-sweep` measures GDScript.

## Credits

Most skills here are vendored, supply-chain-controlled copies: reviewed on the way in, owned as
this marketplace's copies, and re-pulled from upstream deliberately, by diffing against the
recorded commit. [NOTICE.md](NOTICE.md) credits each one with its upstream repository, path,
commit, date, license and author, and lists every change and merge made here; it is organised by
the former plugin each skill came from. Pstack-derived skills keep the MIT license in
[LICENSE-pstack.txt](LICENSE-pstack.txt); Blueprint's own notice is
[skills/blueprint/NOTICE.md](skills/blueprint/NOTICE.md), and `complexity-sweep`'s grammar notices
are in `skills/complexity-sweep/code/core/grammars/NOTICE.md`.

Major sources: obra/superpowers (Jesse Vincent); Lauren Tan's pstack and the cursor-team-kit in
cursor/plugins; mattpocock/skills; affaan-m/ECC; alirezarezvani/claude-skills;
addyosmani/agent-skills; wshobson/agents; davila7/claude-code-templates (including OpenAI's
security skills and the shadcn/ui, Supabase, Vercel and Remotion skills); anthropics/skills and
anthropics/knowledge-work-plugins; garrytan/gstack; shinpr/claude-code-workflows; exiao/skills;
BMAD-METHOD; HumanLayer (the three codebase agents); GreenSock's gsap-skills; archify by tt-a1i
(Blueprint); Agents365-ai/drawio-skill; shadcn/improve; agent0ai/dox (KEYS); Geoffrey Litt's
explain-diff gist; graphify, which `core` installs and runs as-is; and smaller sources named in
NOTICE.md. `ddd`, its nine steps and toolchain, `core`, `research-codebase`, `trace`, `code-sweep`,
`complexity-sweep`, `e2e-harness`, `security-sweep`, `pre-flight`, `persona`, `rules-from-code`
and `engineering-rules` are the marketplace owner's, as is `deepwiki` apart from its Brownfield
mode (from BMAD-METHOD). The Build pipeline skills (`workflow` through `change-description`) are
the owner's, adapted in part from obra/superpowers, HumanLayer, wshobson/agents and BMAD-METHOD.

## Invoking

Namespaced under the plugin: `/software:workflow`, `/software:core`, `/software:spec --prd`,
`/software:ddd`, `/software:brainstorm`, `/software:code-sweep --light`,
`/software:verify-feature`, `/software:security-sweep`, `/software:ship-gate`, and so on. A router
takes the topic you name, for example `/software:animation` with `gsap-timeline`. Script paths
inside each skill resolve from `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`. `drawio`,
`improve-codebase-architecture` and `retro` run only when you invoke them.
