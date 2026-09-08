# dev — Development Workflow

A development workflow as a chained skill pipeline: prime the codebase, turn an idea into a
design, turn the design into a plan an engineer with zero context could execute, execute it in
batches with reviewer subagents, verify it against the plan, review it from eleven perspectives,
describe the change, hand off. Every step reads and writes one `ai_docs/` workspace inside the
repository you are working in.

```bash
claude plugin install dev@skill-marketplace
```

Start with `dev:workflow`. It lists the flows below with their command sequences and helps
you pick one.

## Glossary

A **change** is the unit of work under review: a merge request on GitLab, a pull request on
GitHub. Skills that talk to the hosting platform detect `glab` or `gh` and use whichever is
installed, so `code-sweep --change 42` works on either.

## The flows

| Flow | Sequence | When |
|---|---|---|
| Development | `prime` → `brainstorm` → `create-plan` → `execute-plan` (or `swarm`) → `check-implementation` | Building a feature from an idea |
| Code review | `code-sweep` → `change-description` | A change is ready and needs review and a description |
| Research | `prime` → `research-codebase` → `whats-next` | Joining an unfamiliar codebase |
| PRD | `prime` → `document-project` → `analyze-design` | Architecture documentation for a brownfield system |
| Design analysis | `prime` → `brainstorm` → `analyze-design` → `breakdown` | A design that needs eight expert perspectives and SLC phasing |
| Debugging | `debug` → `tdd` | A bug or failing test, before proposing any fix |

## The skills

| Skill | Does |
|---|---|
| `workflow` | Shows the flows and their command sequences. The entry point. |
| `prime` | Loads project context by reading the key files for the project type (Node, TypeScript, Next.js, Python, C#/.NET, Go). |
| `brainstorm` | Refines a rough idea into a validated design through dialogue. |
| `analyze-design` | Analyzes a design from eight expert perspectives via subagents. |
| `breakdown` | Breaks a design into Simple, Lovable, Complete implementation phases. |
| `create-plan` | Writes an implementation plan with exact paths and code for an engineer with zero context. |
| `execute-plan` | Executes a plan in batches with checkpoints, implementer and reviewer subagents, and resume. |
| `swarm` | Orchestrates agent teams (build, research, review, debug) with quality gates. |
| `check-implementation` | Verifies the implementation matches the plan: components, tests, build. |
| `code-sweep` | Eleven parallel specialized reviewers, one severity-ranked report. Self-contained. |
| `review-git-changes` | Grades a branch across six aspects from its git history. |
| `change-description` | Generates the change description from the story ticket and the diff. |
| `debug` | Systematic debugging before any fix; root-cause tracing, condition-based waiting, defense in depth. |
| `tdd` | Red-green-refactor discipline for features, bug fixes and skill authoring. |
| `trace` | Traces an entry point upstream and downstream; parity sweeps between two implementations. |
| `research-codebase` | Documents the codebase as it is, via parallel subagents, without critique. |
| `document-project` | Brownfield architecture documentation written for AI agents. |
| `engineering-rules` | The SLC engineering ethos and coding standards preamble. |
| `rules-from-code` | Reverse-engineers a `rules.md` from a team's best and worst files. |
| `server-component-rules` | Next.js Server Components and Server Actions rules. |
| `whats-next` | A zero-loss handoff document for continuing in a fresh context. |

`tools:pre-flight` and `tools:post-flight` are part of the development flow (plan check before
execution, code check after) but live in the `tools` plugin so they can be used on their own. The
skills here call them by their namespaced names.

## The workspace

Every step writes to `./ai_docs/<sub>/` in the repository you are working in:

| Folder | Written by |
|---|---|
| `ai_docs/designs/` | `brainstorm`, `analyze-design` |
| `ai_docs/plans/` | `create-plan`, `breakdown`, `execute-plan` |
| `ai_docs/checkpoints/` | `execute-plan`, `swarm` |
| `ai_docs/reviews/` | `code-sweep`, `review-git-changes` |
| `ai_docs/requirements/` | `change-description` |
| `ai_docs/research/` | `research-codebase` |
| `ai_docs/trace/` | `trace` |
| `ai_docs/docs/` | `document-project` |
| `ai_docs/handoffs/` | `whats-next` |

Commit it if you want the design history alongside the code, or add `ai_docs/` to `.gitignore`.
`prime` never reads it.

`execute-plan` can also create git worktrees. They go under `.worktrees/` in the repository
(verified to be gitignored first) unless `DEV_WORKTREE_ROOT` points elsewhere.

## Agents

Four agents ship with the plugin and are addressed as `dev:<name>`:

| Agent | Does |
|---|---|
| `codebase-locator` | Finds where files and components live |
| `codebase-analyzer` | Explains how specific code works, with file:line references |
| `codebase-pattern-finder` | Finds existing implementations to model new work on |
| `code-reviewer` | Reviews code for quality, security and maintainability |

## What runs

Nothing at install. `execute-plan` and `swarm` run the project's own build and test commands
and `git worktree`; `code-sweep --change` runs `glab mr diff` or `gh pr diff`. The only
scripts in the plugin are two optional TypeScript helpers in `debug`
(`find-polluter.ts` bisects test files to find one that leaves state behind, running the test
command you give it; `condition-based-waiting-example.ts` is an example). Nothing contacts the
network.

## Credits

Parts of this plugin are adapted from obra/superpowers, HumanLayer, wshobson/agents
and BMAD-METHOD. The original work is credited in the skill files themselves.
