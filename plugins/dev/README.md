# dev — Development Workflow

Build the change. A development workflow as a chained skill pipeline: turn an idea into a design,
turn the design into a plan an engineer with zero context could execute, check the plan, execute
it in batches with reviewer subagents, check the code against the plan, describe the change, hand
off. Discipline skills keep each step honest, and the git skills finish the branch. Every step
reads and writes one `ai_docs/` workspace inside the repository you are working in.

```bash
claude plugin install dev@skill-marketplace
```

Start with `dev:workflow`. It lists the flows below with their command sequences and helps
you pick one.

## Glossary

A **change** is the unit of work under review: a merge request on GitLab, a pull request on
GitHub. Skills that talk to the hosting platform detect `glab` or `gh` and use whichever is
installed.

## The flows

Several flows start or end in other plugins; `dev:workflow` names them in full.

| Flow | Sequence | When |
|---|---|---|
| Development | `code:core` → `brainstorm` → `create-plan` → `pre-flight` → `execute-plan` (or `swarm`, or `arena`) → `check-implementation` | Building a feature from an idea |
| Code review | `verify:code-sweep` → `change-description` | A change is ready and needs review and a description |
| Research | `code:core` → `code:research-codebase` → `whats-next` | Joining an unfamiliar codebase |
| PRD | `code:core` → `code:deepwiki` → `analyze-design` | Architecture documentation for a brownfield system |
| Design analysis | `code:core` → `brainstorm` → `analyze-design` → `breakdown` | A design that needs eight expert perspectives and SLC phasing |
| UI | `code:core` → `product:grilling` (design-brief mode) → `brainstorm` → `design:design-screen` → `design:gate` → `design:critique` → `verify:code-sweep` | A feature someone looks at and clicks; needs the `design` plugin |
| Debugging | `debug` → `tdd` | A bug or failing test, before proposing any fix |

## Skills

### Pipeline

| Skill | What it does |
|---|---|
| `workflow` | Shows the flows and their command sequences. The entry point. |
| `brainstorm` | Refines a rough idea into a validated design through dialogue. |
| `analyze-design` | Analyzes a design from eight expert perspectives via subagents, plus a ninth user-experience and accessibility perspective when the design has a UI. |
| `breakdown` | Breaks a design into Simple, Lovable, Complete implementation phases, one plan document each. |
| `create-plan` | Writes an implementation plan with exact paths and code for an engineer with zero context. |
| `pre-flight` | After writing a plan and before executing it. Checks the plan against the codebase for gaps in wiring, contracts, behavior preservation, configuration and credentials while they are still cheap. |
| `execute-plan` | Executes a plan in batches with checkpoints, implementer and reviewer subagents, parallel dispatch for independent tasks, and resume from checkmarks. |
| `check-implementation` | Verifies the implementation matches the plan: components, tests, build and UI gates. Full post-flight mode, from the former `post-flight` of the `tools` plugin: also verifies the code against the original codebase (wiring, behavioral equivalence, contracts, dead interfaces, configuration and credential sources), runs runtime smoke checks and writes a reflection. |
| `whats-next` | A zero-loss handoff document for continuing in a fresh context. |

### Execution modes

| Skill | What it does |
|---|---|
| `swarm` | Orchestrates agent teams in one session (build, research, review, debug) from a two-agent team up to plan-first orchestration with quality gates. |
| `arena` | One attempt at a non-trivial artifact would lock in the wrong shape. N parallel Task subagents on one task with a pre-written rubric, an independent cross-judge (a different model family where available, otherwise a fresh context), pick a base, graft the losers' best parts, verify. |
| `spec-driven-workflow` | Spec-before-code with RFC 2119 requirements, a Given/When/Then pattern library and bounded-autonomy stop/continue rules. Three stdlib scripts: a spec generator, a 0-100 validator and a test-stub extractor (pytest, jest, go test). |

### Discipline

| Skill | What it does |
|---|---|
| `tdd` | Red-green-refactor for any feature or bugfix, before writing implementation code, with `writing-good-tests.md` for the rules that keep tests honest (from the former `test-driven-development` of the `tools` plugin); also TDD for authoring skills. |
| `debug` | Any bug, test failure or unexpected behaviour, before proposing a fix. Four phases from reproduce to verify; root-cause tracing, condition-based waiting, defense in depth, and a test-polluter bisection script. Absorbs the near-identical `systematic-debugging` of the `tools` plugin; hard-bug and performance-regression mode from the former `diagnosing-bugs` of the `craft` plugin (a tight red-capable feedback loop first, ranked falsifiable hypotheses, tagged instrumentation, a regression test at a correct seam). |
| `verification-before-completion` | About to say something is done, fixed or passing. No success claim without the command run in this message; a claim-vs-evidence table and red-green verification of regression tests. |
| `doubt-driven-development` | A non-trivial decision, in unfamiliar code or at high stakes, that is cheaper to verify now than to debug later. CLAIM/EXTRACT/DOUBT/RECONCILE/STOP with a fresh-context adversarial reviewer that gets the artifact and contract but never the claim, a four-class finding precedence and a three-cycle bound. |
| `unlazy` | Long autonomous runs that stall at 80%. Writes acceptance gates before execution, decomposes with the Depth Tree, runs approved checks, re-verifies evidence before reporting done. Lite mode, from the former `unlazy-lite`: one `GATES.md`, no tree, for tasks under about half an hour. |
| `show-me-your-work` | Long or unattended runs a human reviews afterwards. Append-only TSV decision log (what, why, evidence, result) via `scripts/log.sh`, an audit of the log against this session's transcript, and a cross-model review that ends the reply with an Attention section. |

### Git and the change

| Skill | What it does |
|---|---|
| `using-git-worktrees` | Feature work that needs isolation from the current workspace. Prefers a native worktree tool, falls back to `git worktree` under a gitignored `.worktrees/`. |
| `git-advanced-workflows` | Complex histories: rebase, cherry-pick, bisect, worktrees, reflog recovery. |
| `finishing-a-development-branch` | Implementation is complete and tests pass. Detects normal repo vs worktree vs detached HEAD, confirms the base branch, presents a fixed merge / PR / keep menu, cleans up only worktrees it owns, and discards only on the typed word `discard`. |
| `make-pr-easy-to-review` | "Tidy this PR" or "clean up commits". Dependency-ordered commit grouping, a tree-hash identity check before and after rewriting history, and reviewer guidance in the description without changing behaviour. |
| `change-description` | Generates the change description from the story ticket and the diff. |

## The workspace

Every pipeline step writes to `./ai_docs/<sub>/` in the repository you are working in:

| Folder | Written by |
|---|---|
| `ai_docs/designs/` | `brainstorm`, `analyze-design` |
| `ai_docs/plans/` | `create-plan`, `breakdown`, `execute-plan` |
| `ai_docs/checkpoints/` | `execute-plan`, `swarm` |
| `ai_docs/reports/` | `pre-flight`, `check-implementation` (post-flight mode) |
| `ai_docs/reflections/` | `check-implementation` (post-flight mode) |
| `ai_docs/requirements/` | `change-description` |
| `ai_docs/handoffs/` | `whats-next` |

Commit it if you want the design history alongside the code, or add `ai_docs/` to `.gitignore`.
`verify:code-sweep` writes to `ai_docs/reviews/` in the same workspace.

## What these write and where they reach

Installing this plugin wires no hooks, no MCP servers and no background processes. The only
download is the design gate kit's Playwright install noted under `check-implementation`.

- **`execute-plan`** and **`swarm`** run the project's own build and test commands. `execute-plan`
  and `using-git-worktrees` create git worktrees under `.worktrees/` in the repository (verified to
  be gitignored first); `execute-plan` puts them under `DEV_WORKTREE_ROOT` instead when that is set.
- **`arena`** gives each candidate a git worktree or a directory under `/tmp/arena-<slug>/`.
  `arena`, `show-me-your-work`, `analyze-design`, `execute-plan` and `swarm` spawn Task subagents.
- **`unlazy`** spawns subprocesses: it runs the verification commands you put in a gate file. That
  is what it is for, but read a gate file before letting one run. Its `scripts/install-hooks.mjs`
  writes a Stop hook entry into a settings file (`.claude/settings.local.json` by default), and
  only when you invoke it directly after agreeing; `--uninstall` removes it. Its ledger lives in
  `.unlazy/` and `.unlazy-hook-state.json` in the project.
- **`debug`** ships `find-polluter.sh` and `find-polluter.ts`, which bisect test files to find the
  one that leaves state behind by running the test command you give them (the shell version runs
  `npm test` per file), `condition-based-waiting-example.ts`, and `scripts/hitl-loop.template.sh`,
  a bash template for the hard-bug mode that you copy and edit; it prompts a human in the terminal
  and prints back what they answered. All run only when invoked.
- **`spec-driven-workflow`**'s three Python 3 standard-library scripts run only when invoked; the
  extractor writes test stubs where you point it.
- **`show-me-your-work`**'s `scripts/log.sh` appends rows to the TSV file you name (creating its
  parent directory) and nothing else. The audit step reads this session's transcript under
  `~/.claude/projects/` and tells the model not to glob across other projects.
- **`make-pr-easy-to-review`** uses `gh` and `git`; it rewrites branch history and force-pushes
  only after you agree to its plan.
- **`finishing-a-development-branch`** merges, pushes, deletes branches and removes worktrees it
  created, each after you pick the option; it creates pull requests with the forge's CLI when one
  is available.
- **`check-implementation`**, when the plan built UI and the `design` plugin is installed, runs
  that plugin's gate suite; its render gates need Playwright installed once per install
  (`npm install --prefix "$KIT"` into the design plugin's gate kit), which downloads from npm.
- **`change-description`** detects `glab` or `gh` when it needs to post the description.
- **`doubt-driven-development`** can pipe an artifact to the `codex` or `gemini` CLI for a second
  opinion, only after you authorize that exact command.

## How it works with the other plugins

- **In.** A converged spec from `product:spec` goes to `brainstorm`; `product:office-hours`
  points at `create-plan`, and `product:plan-ceo-review` at `create-plan` then `pre-flight`. A new
  system goes through `architecture:ddd` first; its implementation plan feeds `create-plan` and
  `tdd`. Every flow starts with `code:core` to prime the codebase.
- **Investigation.** `code:research-codebase`, `code:trace` and `code:deepwiki` answer "what does
  this code do"; the `code:codebase-locator`, `code:codebase-analyzer` and
  `code:codebase-pattern-finder` agents serve the pipeline's subagents.
- **Review and proof.** `verify:code-sweep` and the `verify:code-reviewer` agent review the change;
  `execute-plan` dispatches the reviewer. `verify:verify-feature` proves it runs.
- **UI.** `check-implementation` runs the `design` plugin's gates when the plan built UI, and the UI
  flow uses `design:design-screen`, `design:gate` and `design:critique`.
- **Fleets.** `swarm` and `arena` run agents inside one session; `herdr` runs a fleet of separate
  sessions.

## Credits

The pipeline skills (`workflow`, `brainstorm`, `analyze-design`, `breakdown`, `create-plan`,
`pre-flight`, `execute-plan`, `check-implementation`, `swarm`, `change-description`,
`whats-next`) are the marketplace owner's, adapted in part from obra/superpowers, HumanLayer,
wshobson/agents and BMAD-METHOD; `pre-flight` and the post-flight mode of `check-implementation`
are the owner's own. The vendored skills (`tdd`, `debug`, `verification-before-completion`,
`finishing-a-development-branch`, `using-git-worktrees` from obra/superpowers; `git-advanced-workflows`
from wshobson/agents; `doubt-driven-development` from addyosmani/agent-skills;
`make-pr-easy-to-review` from cursor/plugins; `arena` and `show-me-your-work` from Lauren Tan's
pstack, MIT, `LICENSE-pstack.txt`; `spec-driven-workflow` from alirezarezvani/claude-skills;
`unlazy` from Leonxlnx/unlazy) are credited with upstream repository, commit, license and author in
[NOTICE.md](NOTICE.md), which also lists every change and merge made here. Upstream is re-pulled
deliberately, not tracked live.

## Moved in v3

| Skill | Before | Now |
|---|---|---|
| `pre-flight` | `tools:pre-flight` | `dev:pre-flight` |
| `post-flight` (merged) | `tools:post-flight` | `dev:check-implementation`, post-flight mode |
| `arena` | `pstack:arena` | `dev:arena` |
| `show-me-your-work` | `pstack:show-me-your-work` | `dev:show-me-your-work` |
| `spec-driven-workflow` | `product:spec-driven-workflow` | `dev:spec-driven-workflow` |
| `test-driven-development` (merged) | `tools:test-driven-development` | `dev:tdd` |
| `systematic-debugging` (merged) | `tools:systematic-debugging` | `dev:debug` |
| `diagnosing-bugs` (merged) | `craft:diagnosing-bugs` | `dev:debug`, hard-bug mode |
| `verification-before-completion` | `craft:verification-before-completion` | `dev:verification-before-completion` |
| `doubt-driven-development` | `craft:doubt-driven-development` | `dev:doubt-driven-development` |
| `unlazy` | `tools:unlazy` | `dev:unlazy` |
| `unlazy-lite` (merged) | `tools:unlazy-lite` | `dev:unlazy`, lite mode |
| `using-git-worktrees` | `tools:using-git-worktrees` | `dev:using-git-worktrees` |
| `git-advanced-workflows` | `tools:git-advanced-workflows` | `dev:git-advanced-workflows` |
| `finishing-a-development-branch` | `craft:finishing-a-development-branch` | `dev:finishing-a-development-branch` |
| `make-pr-easy-to-review` | `craft:make-pr-easy-to-review` | `dev:make-pr-easy-to-review` |
| `prime` (merged) | `dev:prime` | `code:core`, no-graph mode |
| `research-codebase` | `dev:research-codebase` | `code:research-codebase` |
| `trace` | `dev:trace` | `code:trace` |
| `document-project` (merged) | `dev:document-project` | `code:deepwiki` |
| `code-sweep` | `dev:code-sweep` | `verify:code-sweep` |
| `review-git-changes` (merged) | `dev:review-git-changes` | `verify:code-sweep`, light mode (`--light`) |
| `server-component-rules` | `dev:server-component-rules` | `stack:server-component-rules` |
| `rules-from-code` | `dev:rules-from-code` | `agentic:rules-from-code` |
| `engineering-rules` | `dev:engineering-rules` | `agentic:engineering-rules` |
| `codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder` (agents) | `dev:<agent>` | `code:<agent>` |
| `code-reviewer` (agent) | `dev:code-reviewer` | `verify:code-reviewer` |

## Invoking

Namespaced under the plugin: `dev:workflow`, `dev:brainstorm`, `dev:create-plan`,
`dev:execute-plan`, `dev:debug`, `dev:tdd`, and so on. Post-flight is a mode of
`dev:check-implementation`; lite is a mode of `dev:unlazy`.
