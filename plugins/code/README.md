# code — Code Intelligence

Six skills for working on a codebase you did not write. Three help you
understand it: `core` primes it, `explain-diff` teaches you a change to it,
and `deepwiki` writes its documentation. Three verify it: `e2e-harness` proves
it still works end to end, `security-sweep` audits it, and `complexity-sweep`
measures its complexity.

```bash
claude plugin install code@skill-marketplace
```

---

# `core` — prime once, stay primed

Replaces the read-everything-again ritual at the start of a session with two
artefacts that outlive it.

## The idea

Priming a codebase normally means reading the tree, the configs, and fifteen or
twenty source files — every session, from scratch, and it is all gone after the
next compaction. `core` spends that budget once and turns it into things that
persist:

| Layer | Answers | Built by | Cost |
|---|---|---|---|
| **Graph** (`graphify-out/`) | what calls what, what breaks if you change this | tree-sitter AST | ~4s first build, ~1s refresh, **zero tokens** |
| **CORE** (`CLAUDE.md` + `AGENTS.md`) | what a directory is *for*, what may not break | you, once per boundary | real tokens, once |
| **Read** | the few specifics neither layer holds | you, every session | small, because the first two did the work |

After that, a question about the codebase costs a scoped `graphify query`
instead of a grep across the repo, and the local rules for a directory arrive
by themselves when an agent reads a file in it.

## Using it

In a repository:

```
/core
```

The skill installs graphify itself if it is missing (`uv tool install graphifyy`,
falling back to pipx, then pip — all isolated and reversible).

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

## Nothing here calls a model

Every script is deterministic, which is what makes running it on every prime
sane:

- `graphify extract . --code-only` — pure tree-sitter, works with no API key at all
- `graphify cluster-only . --no-label` — clustering without asking a model for names
- `graphify update .` — incremental re-extract, explicitly no-LLM
- `core.py link | index | check | boundaries` — filesystem work, no inference

The single exception is opt-in: `graph.sh --label` spends a couple of model
calls to name the graph's communities so `GRAPH_REPORT.md` reads well for a
human. Skip it and you get `Community 1..N`.

## Layout

```
skills/core/
├── SKILL.md
├── assets/
│   ├── CORE-root.md      the root contract, inserted into CLAUDE.md
│   └── CORE-child.md     the six-section child skeleton
└── scripts/
    ├── status.sh         whole-repo state in one call, ends with verdict=
    ├── graph.sh          install / build / refresh the graph, register hooks
    └── core.py           link, block, index, boundaries, check
```

`status.sh` exists specifically so priming does not start with a dozen
exploratory tool calls. It answers "is there a graph, is there a CORE tree, is
any of it broken, where are the undocumented boundaries" in one block, for free.

Two details that came out of running this against real repos:

**`core.py` gets vendored into the repo** at `.claude/core/core.py`, and the CORE
contract points there rather than at the plugin. The contract outlives the skill
invocation — a teammate, a Codex run, or you next session without the plugin
installed reads "run `core.py index`" and needs it to resolve, and
`${CLAUDE_PLUGIN_ROOT}` means nothing outside a running skill.

**Drift is measured against `graphify-out/manifest.json`, not mtimes.** `cp`,
`git clone` and `git checkout` all rewrite timestamps wholesale, so a
mtime comparison reports either everything or nothing as stale. The manifest
records which files the graph was actually built from, so the question becomes a
set difference — which survives being copied.

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
ship alongside the code and sort by date. With the `ddd` plugin installed,
`explain-diff` uses its `blueprint` skill for validated diagrams, finite trace
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
(PyPI package `graphifyy`), used as-is. This plugin only chooses the flags that
keep it deterministic and free.

`explain-diff` is adapted from **[Geoffrey Litt's
explain-diff gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)**
— the four-section structure, the Kleppmann-style writing brief and the
interactive quiz are his. The quiz-fairness rule comes from the gist's
discussion thread.

`deepwiki`, `security-sweep` and `complexity-sweep` are the marketplace
owner's.
