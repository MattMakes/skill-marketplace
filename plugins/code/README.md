# code — Code Intelligence

Design a system, understand an existing codebase, explain a change, or verify the implementation.

## Start here

| What you want to do | Invoke |
|---|---|
| Design a system with DDD, resume a model, or find the next modelling step | `code:ddd` |
| Draw or animate an architecture, sequence, workflow, data flow, or schema relationship | `code:blueprint` |
| Understand an unfamiliar repository | `code:core` |
| Understand a diff, branch, or PR | `code:explain-diff` |
| Document or verify implementation | `code:deepwiki`, `code:e2e-harness`, `code:security-sweep`, `code:complexity-sweep` |

`ddd` is the DDD kickoff; it routes to nine focused step skills and keeps the workspace and validation gates consistent. See the [DDD guide](docs/ddd.md) for the full process. Blueprint is independently invocable and also supplies diagrams to DDD and explain-diff. There is one renderer in `skills/blueprint`.

Migrating from the old `ddd` plugin: install/update `code@skill-marketplace`, then remove the old `ddd` plugin to avoid duplicate DDD skills. Invoke `code:ddd` in place of `ddd:ddd-workflow`; step and agent names now use the `code:` namespace. Existing project `ddd/` workspaces and their JSON formats are unchanged.

```bash
claude plugin install code@skill-marketplace
```

---

# `core` — query a current code index

`code:core` creates an AST-only Graphify index and a tree of `CLAUDE.md`
contracts with `AGENTS.md` symlinks. Contracts explain intent and constraints;
the graph supplies structural lookups without loading whole files into model
context.

Run `/core` in a repository. Setup installs Graphify if needed, vendors the
maintenance scripts into `.claude/core/`, installs refresh hooks, and builds a
validated snapshot. Query it through:

```sh
python3 .claude/core/graph.py query "what calls checkout?" --budget 1500
python3 .claude/core/graph.py affected "checkout"
python3 .claude/core/graph.py status
```

The gateway hashes working-tree contents, including uncommitted edits. It
reuses unchanged generations, builds changed ones in isolation, publishes
atomically, and discards query output if files change during the query.
Deletions, branch switches and failed builds cannot silently make an old
managed graph count as current. Git and Claude hooks refresh mechanically;
queries perform their own validation even when hooks did not run.

For continuous refresh during human edits, run
`python3 .claude/core/graph.py watch --interval 2` in a terminal or supervisor.
This process is optional: queries already synchronize on demand. No AI needs
to decide whether or when to update the index.

Freshness checks read repository bytes, and changed snapshots currently use
full extraction to avoid stale nodes and cross-file edges. This saves model
context; it does not promise every query is faster than `rg`. Results describe
a snapshot validated at query completion, and code may change afterward.
Raw Graphify, legacy graph files and independent database/MCP readers bypass
these checks. See the [consistency contract](skills/core/references/graph-consistency.md)
for scope, limitations and migration.

## Why `CLAUDE.md` is the real file and `AGENTS.md` is the symlink

Claude Code [loads a subdirectory's `CLAUDE.md` the moment it reads a file in
that directory](https://code.claude.com/docs/en/memory#how-claude-md-files-load).
Keeping the real content there means a directory's contract shows up exactly
when it becomes relevant, with nothing having to walk the tree to find it. The
`AGENTS.md` symlink beside it hands the same bytes to Codex, Cursor, Aider and
everything else that reads `AGENTS.md`, without a second copy to keep in sync.

`core.py link` handles the messy cases rather than clobbering them: an existing
`AGENTS.md` is promoted or merged with a backup, a repo already using the
opposite convention (`CLAUDE.md → AGENTS.md`) is reported and left alone unless
you pass `--flip`, and a platform without symlink permissions gets an
`@CLAUDE.md` import stub instead.

## Mechanical maintenance

The managed graph uses `graphify extract --code-only --no-cluster --force`.
It does not run semantic extraction, clustering or community labeling.
`graph.sh --label` now fails explicitly. New installs pin the tested
`graphifyy==0.9.53`; existing installations are retained and fingerprinted.
`core.py link | index | check | boundaries` handles the CORE filesystem work.
The prose contracts still need human or agent judgment when their meaning changes.

```
skills/core/
├── SKILL.md
├── assets/
│   ├── CORE-root.md
│   └── CORE-child.md
├── references/graph-consistency.md
└── scripts/
    ├── status.sh         graph content drift and CORE health
    ├── graph.sh          install, vendor scripts, register hooks, synchronize
    ├── graph.py          validated queries, snapshots, hooks, polling watcher
    ├── test_graph.py     race/failure tests and real Graphify integration
    └── core.py           link, block, index, boundaries, check
```

`graph.sh` vendors both Python scripts into `.claude/core/` so the contract's
commands work for teammates and other agents without the plugin. Generated
snapshots stay in Git's per-worktree metadata, or `.core-graph/` outside Git.
Legacy `graphify-out/` is never trusted or removed automatically. `status.sh`
uses the same content checks as queries; matching filenames or timestamps
alone never establish freshness.

The child template keeps all its authoring guidance in HTML comments. Claude
Code strips those before a CLAUDE.md reaches the context window but the Read
tool still shows them, so a filled-in child doc costs **274 characters of
context against 2,638 on disk**. That matters because a child doc loads every
single time an agent touches its directory, which makes unfilled boilerplate a
bill rather than a placeholder.

---

# `explain-diff` — a change you can actually learn from

Point it at a diff, a branch or a PR and it writes one self-contained HTML page
that explains the change to someone who was not there when it was made.

```
/explain-diff origin/main..feature/retry-budget
```

The page always has the same four sections, in this order:

| Section | What it does |
|---|---|
| **Background** | The part of the existing system the change touches — a deep version for a newcomer, marked skippable, then the narrow version the change actually depends on. The skill explores surrounding code to write this, not just the diff. |
| **Intuition** | The essence of the change with toy data, Blueprint diagrams for architecture, sequences and data flow, plus HTML UI sketches. Schema changes get relationship maps and field tables. No ASCII art. |
| **Code** | A walkthrough of the diff, grouped and ordered so it reads as a story rather than a file list. |
| **Quiz** | Five interactive multiple-choice questions, medium difficulty, with feedback on click. The correct answer is shuffled across positions and options are kept the same length so it cannot be guessed. |

It is a single file with its own CSS and JavaScript, a table of contents, and
enough responsive styling to read on a phone. The skill writes it to
`docs/YYYY-MM-DD-explanation-<slug>.html` at the repository root, so explainers
ship alongside the code and sort by date. `explain-diff` uses the same plugin’s `code:blueprint` skill for validated diagrams, finite trace
motion and guided walkthroughs. `embed-blueprint.mjs` embeds each complete viewer
in an isolated iframe inside the article; fonts, scripts and styles travel with
the single HTML file. Typed diagram JSON is retained for later edits. Without
Blueprint, the skill uses inline SVG/HTML and reports the fallback.

Schema/ERD explanations use labeled foreign-key relationships plus field tables;
Blueprint does not implement native crow's-foot notation. Optional narration
runs after diagram embedding, with inline audio and no spoken diagram controls.

---

# `deepwiki` — documentation that cites its sources

Generates, validates and maintains a wiki for a codebase under `docs/wiki/`:
a `toc.json`, one page per topic, every claim cited as `file:line`, and Mermaid
diagrams that are linted before they are accepted. It also covers the smaller
jobs that fall out of that: an onboarding guide, `AGENTS.md`, `llms.txt`, a
changelog, an incremental sync after code changes, and answering a question
about an unfamiliar repo with citations.

```
/deepwiki document this repo
/deepwiki update the docs for the changes since v2.3
```

Eleven scripts, all stdlib Python 3 — no `pip install`. Three of them shell out,
and only to `git` (`diff`, `log`) to find what changed since the last documented
commit. The one optional step that needs npm is publishing the wiki as a
VitePress site. Validation is a gate: a page with an invalid diagram or a
missing citation is fixed, not shipped.

---

# `security-sweep` — a security audit with a paper trail

Orchestrates a multi-agent audit of the current repo in seven phases: detect the
stack, plan which auditors to run, run them in parallel (OWASP, secrets,
supply chain, LLM security, STRIDE modelling), queue every finding for an
independent verifier fan-out, write an exploit scenario for each confirmed
high-confidence finding, and assemble a CSO-style report.

```
/security-sweep
```

Everything lands in `ai_docs/security-sweep/runs/<RUN_ID>/` inside the repo, one
JSON or Markdown file per stage, and every agent reads the previous stage from
disk rather than from another agent's reply so nothing drifts in transit. The
auditor, verifier and exploit-author prompts are inline in the skill, so it
dispatches only generic subagents. Six Node scripts (Node 18.17 or newer, no
dependencies) handle the deterministic parts: stack detection, dispatch
planning, queueing, and report assembly. Language catalogs for Node, Python, Go
and .NET give each auditor a concrete checklist. Nothing calls out to the
network.

---

# `complexity-sweep` — complexity you can act on

Runs a bundled static-analysis CLI over TypeScript and JavaScript, measuring 14
metrics in five families (control flow such as McCabe cyclomatic and essential
complexity, data flow, cognitive load, information density such as Halstead,
and composites such as the maintainability index), then reviews each function
that breaks a threshold and either refactors it directly, re-running the
analysis to confirm, or emits one structured refactoring prompt per function.
It can also generate the repo's config file.

```
/complexity-sweep src/**/*.ts
/complexity-sweep the files changed on this branch
```

The CLI ships as source plus a built `dist/` under `code/`; on first use the
skill runs `npm install --omit=dev` in `code/core` and `code/cli` (ts-morph and
cosmiconfig). Read-only against the target repo apart from the refactorings you
ask for.

---

# `e2e-harness` — a documented system becomes a running suite

Five phases; four of them are deterministic and belong to the `e2e` CLI, not to a
model.

```
setup     probe the repo, write config.json, install the runner   deterministic
discover  probe repo + docs -> inventory.json                     deterministic
journeys  author journeys.json                                    <- judgment
build     journeys.json + inventory.json -> Playwright specs      deterministic
run       up -> readiness gate -> tests -> report -> down         deterministic
```

Only `journeys.json` needs a model, because deciding *which flows matter* and
*what counts as success* is the one genuine judgment call. Finding services,
resolving ports, emitting spec code and waiting on readiness are functions of
files on disk, so the same repo always produces the same tests. A wrong test
means a wrong journey — fix that and rebuild; hand-edits to generated specs are
destroyed on the next `e2e build`.

Covers services in Node, Python, Go, C# and Rust, plus Kafka and Event Hubs, and
drives them through Playwright.

```
skills/e2e-harness/
├── SKILL.md
├── assets/templates/     harness.ts, playwright.config.ts
├── references/           adapters.md, journeys-schema.md
├── scripts/e2e           stdlib-only Python CLI, no install step
└── evals/                fixtures and graded evals for the skill itself
```

`scripts/e2e` is stdlib-only Python and is invoked by path. The `evals/fixtures`
tree carries a real sample project; its `node_modules/` and generated
`e2e/artifacts/` are gitignored, so the plugin ships at a few hundred kilobytes.

## Credits

The CORE contract is adapted from **[DOX](https://github.com/agent0ai/dox)** by
agent0ai — the hierarchical `AGENTS.md`-as-binding-contract idea, the
pre-edit and closeout discipline, and the child index are all theirs. CORE
rewrites it around `CLAUDE.md` as the real file so contracts load on demand
rather than being traversed by hand, drops the manual re-read rule that
on-demand loading makes redundant, and generates the child index mechanically
instead of asking the agent to maintain it.

The graph layer is **[graphify](https://github.com/Graphify-Labs/graphify)**
(PyPI package `graphifyy`). This plugin wraps AST extraction and graph queries
with snapshot publication, content validation, locking and refresh scripts.

`explain-diff` is adapted from **[Geoffrey Litt's
explain-diff gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)**
— the four-section structure, the Kleppmann-style writing brief and the
interactive quiz are his. The quiz-fairness rule comes from the gist's
discussion thread.

`deepwiki`, `security-sweep` and `complexity-sweep` are the marketplace
owner's.
