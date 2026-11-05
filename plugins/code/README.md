# code — Code Intelligence

What does this existing code do? Seven skills and three agents for understanding a codebase
you did not write, or wrote long enough ago: prime it once into a code graph, trace and research
it, find out why it is shaped the way it is, document it, and explain a change to someone who was
not there. **Start with `core`** in any repository you will touch more than once.

```bash
claude plugin install code@skill-marketplace
```

## Skills

### Prime

| Skill | Use it when |
|---|---|
| `core` | Starting work in an unfamiliar or large repository, or after a big merge or refactor. Builds a deterministic, zero-token code knowledge graph with graphify, hands the `AGENTS.md` instruction tree to `agentic:keys`, then reads only what neither layer answers. Quick mode, from the former `dev:prime`: no graph, reads the manifests, entry points and at most 15–20 key files for the project type, writes nothing. |

### Investigate

| Skill | Use it when |
|---|---|
| `research-codebase` | A question about the codebase needs a written answer: documents the code as it is, without critique, by fanning out to the three agents below and synthesizing their findings into `ai_docs/research/`. |
| `trace` | You need the business logic behind an entry point (API route, function, class, event handler, background job): traces upstream and downstream and writes it in plain prose to `ai_docs/trace/`. `--parity <old> <new>` sweeps two implementations for behavioural parity. |
| `why` | "Why does X work this way", design rationale, regressions, postmortems, data-backed thresholds. Anchors in `git`/`gh`, spawns one investigator per connected evidence source (issue tracker, docs, chat, observability, error tracking, warehouse), then a synthesizer bound to a five-tier confidence framework. Not for how the code works at runtime. |

### Document

| Skill | Use it when |
|---|---|
| `deepwiki` | Generating, validating or maintaining a wiki for a codebase: a `toc.json`, one page per topic, every claim cited as `file:line`, Mermaid diagrams linted before they are accepted. Also onboarding guides, `AGENTS.md`, `llms.txt`, a changelog, an incremental sync after code changes, cited answers about an unfamiliar repo, and a VitePress site. Brownfield mode, from the former `dev:document-project`: one architecture document for agents about to change an existing system (real patterns, debt, workarounds, constraints), scoped to a PRD or feature. |
| `code-tour` | An onboarding, architecture, PR, RCA or security walkthrough as a VS Code CodeTour `.tour` file: persona-to-depth table, verified file and line anchors, step types, the `ref`-field PR-branch gotcha. |

### Explain a change

| Skill | Use it when |
|---|---|
| `explain-diff` | Someone needs to understand a diff, branch or PR. Writes one self-contained HTML page with background, intuition, a code walkthrough and an interactive quiz, with diagrams from `architecture:blueprint` (inline SVG/HTML when Blueprint is not installed), and narrates itself when the local text-to-speech service is running. |

### Agents

Addressed as `code:<name>`. All three are read-only.

| Agent | Does |
|---|---|
| `codebase-locator` | Finds where files, directories and components live. A "super Grep/Glob/LS". |
| `codebase-analyzer` | Explains how specific code works, with `file:line` references. |
| `codebase-pattern-finder` | Finds existing implementations and usage examples to model new work on, with the code. |

---

## `core` — prime once, stay primed

Priming a codebase normally means reading the tree, the configs and fifteen or twenty source
files, every session, from scratch, and it is all gone after the next compaction. `core` spends
that budget once and turns it into things that persist:

| Layer | Answers | Built by | Cost |
|---|---|---|---|
| **Graph** (`graphify-out/`) | what calls what, what breaks if you change this | tree-sitter AST, via `core` | ~4s first build, ~1s refresh, **zero tokens** |
| **Instruction files** (the `AGENTS.md` tree) | what a directory is *for*, what may not break, how to verify | `agentic:keys`, once per boundary | real tokens, once |
| **Read** | the few specifics neither layer holds | you, every session | small, because the first two did the work |

After that, a question about the codebase costs a scoped `graphify query` instead of a grep
across the repo.

`core` owns the graph and the read. It writes no `CLAUDE.md` and no symlinks: `AGENTS.md` is
the only instruction file, and `agentic:keys` builds and checks that tree. The one thing `core`
puts in it is graphify's own instructions, in a `<!-- GRAPHIFY:begin -->` …
`<!-- GRAPHIFY:end -->` block of the root `AGENTS.md` that keys leaves alone.

```
/core
```

`status.sh` reports the whole repository in one block — graphify, the graph and its drift, the
hooks, where `agentic:keys` is, the `AGENTS.md` tree and keys' own check, and directories that
look like boundaries but have no `AGENTS.md` — and ends with a `verdict=` line:

| Verdict | Meaning | What `core` does |
|---|---|---|
| `GRAPH_ONLY` | the `agentic` plugin is not installed | builds the graph, skips the instruction files, and tells you to install `agentic` and run `/core` again |
| `BOOTSTRAP` | no `AGENTS.md` tree yet | runs `agentic:keys`, feeding it the boundary candidates and graph queries |
| `REPAIR` | the tree is unfinished, has a `CLAUDE.md` left to fold, or keys check reports errors | runs `agentic:keys` on its refresh path |
| `REFRESH` | the tree is clean | nothing to build; a keys refresh only if new boundaries appeared |

A repository primed by an older `core` (`CLAUDE.md` files with `<!-- CORE:begin -->` blocks and
`AGENTS.md` symlinks) is handled by keys: it replaces the symlinks with regular files and drops
the CORE blocks.

**Nothing here calls a model.** `graphify extract . --code-only`, `graphify cluster-only .
--no-label` and `graphify update .` are pure tree-sitter and need no API key;
`core.py graphify-block | boundaries | check` is filesystem work. The single exception is
opt-in: `graph.sh --label` spends a couple of model calls to name the graph's communities so
`GRAPH_REPORT.md` reads well for a human. Skip it and you get `Community 1..N`.

**Drift is measured against `graphify-out/manifest.json`, not mtimes.** `cp`, `git clone` and
`git checkout` all rewrite timestamps wholesale, so a mtime comparison reports either everything
or nothing as stale. The manifest records which files the graph was built from, so drift is a set
difference, which survives being copied.

```
skills/core/
├── SKILL.md
├── references/
│   └── quick-prime.md    quick mode: per-project-type file lists, no graph
└── scripts/
    ├── status.sh         whole-repo state in one call, ends with verdict=
    ├── graph.sh          install / build / refresh the graph, register hooks, place the graphify block
    └── core.py           graphify-block, boundaries, check
```

## `explain-diff` — a change you can learn from

```
/explain-diff origin/main..feature/retry-budget
```

The page always has the same four sections, in this order:

| Section | What it does |
|---|---|
| **Background** | The part of the existing system the change touches: a deep version for a newcomer, marked skippable, then the narrow version the change depends on. The skill explores surrounding code to write it, not just the diff. |
| **Intuition** | The essence of the change with toy data, Blueprint diagrams for architecture, sequences and data flow, and HTML UI sketches. Schema changes get relationship maps and field tables. No ASCII art. |
| **Code** | A walkthrough of the diff, grouped and ordered so it reads as a story rather than a file list. |
| **Quiz** | Five interactive multiple-choice questions, medium difficulty, with feedback on click. The correct answer is shuffled across positions and options are kept the same length so it cannot be guessed. |

It is a single file with its own CSS and JavaScript, a table of contents, and responsive styling
for a phone. Diagrams come from `architecture:blueprint`; `embed-blueprint.mjs` embeds each
viewer in an isolated iframe and the typed diagram JSON is kept for later edits. Without the
`architecture` plugin or Node, the skill draws inline SVG/HTML figures and says so; it never
installs a plugin. Schema explanations use labelled foreign-key relationships plus field tables;
Blueprint has no native crow's-foot notation.

## `deepwiki` — documentation that cites its sources

```
/deepwiki document this repo
/deepwiki update the docs for the changes since v2.3
/deepwiki brownfield doc for the checkout PRD
```

Eleven scripts, all stdlib Python 3, no `pip install`. Validation is a gate: a page with an
invalid diagram or a missing citation is fixed, not shipped. Its `AGENTS.md` phase writes an
`AGENTS.md` only where one is missing, writes no `CLAUDE.md` companion and no symlink, and hands
the new files to `agentic:keys` to index.

## What these write and where they reach

Installing this plugin wires nothing. Everything below happens only when you invoke a skill.

- **`core`** (`graph.sh`), in the repository you point it at:
  - installs graphify if it is missing: `uv tool install graphifyy`, falling back to `pipx`, then
    `pip install --user`. Isolated and reversible (`uv tool uninstall graphifyy`). This is the
    only download, from PyPI.
  - writes `graphify-out/` (meant to be committed) and appends `graphify-out/cost.json` and
    `graphify-out/.graphify_root` to `.gitignore`.
  - installs graphify's git hooks (post-commit and post-checkout rebuilds, plus a merge driver for
    `graph.json`) and, through `graphify claude install --project`, a `.claude/skills/graphify/`
    skill and a PreToolUse hook in `.claude/settings.json` that nudges toward `graphify query`
    before a grep sweep. `graph.sh --no-hooks` skips both.
  - moves graphify's `## graphify` section out of `CLAUDE.md` into the GRAPHIFY block of the root
    `AGENTS.md`, and deletes a `CLAUDE.md` (or `.claude/CLAUDE.md`) the move left empty. A
    `CLAUDE.md` with other text keeps it for keys to fold.
  - `--label` is the one step that calls a model.
  - The `AGENTS.md` tree itself is written by `agentic:keys`, which shows its fold plan and
    deletes nothing until you confirm. Quick mode writes nothing.
- **`research-codebase`** writes `ai_docs/research/YYYY-MM-DD-<description>.md`; **`trace`**
  writes under `ai_docs/trace/` (and `ai_docs/trace/parity-report.md` for a parity sweep). Both
  spawn Task subagents.
- **`why`** runs `git` and `gh`, spawns Task subagents, and queries whatever MCP servers are
  already connected in the session (issue tracker, docs, chat, observability, error tracking,
  warehouse). That network reach goes only through tools you configured.
- **`deepwiki`** writes the wiki under `docs/wiki/` (or the directory you name), `AGENTS.md`
  files only where missing, `llms.txt` and `llms-full.txt` at the repo root when asked, and the
  Brownfield document to `ai_docs/docs/<name>.md`. Three scripts shell out to `git diff` and
  `git log`. The optional VitePress site build is the only step that needs npm.
- **`code-tour`** writes `.tours/<persona>-<focus>.tour`.
- **`explain-diff`** writes `docs/YYYY-MM-DD-explanation-<slug>.html` at the repository root,
  runs Blueprint's Node CLI from the installed `architecture` plugin, and, when the `design`
  plugin is installed, measures the page with its Playwright and axe gates. Narration posts the
  page's text to the local narration service at `http://127.0.0.1:8477` (`BREEZE_TTS_URL`
  overrides) and embeds the returned audio and player in the HTML.

### Narration is a local companion, not part of the plugin

The narration service is [`services/breeze-tts`](../../services/breeze-tts/) in this repository:
Breeze TTS 2 held in memory on Apple Silicon, started with `just install` once and `just start`
after. It is not a plugin and `/plugin` does not install it. Narration is always optional: with
the service down, `explain-diff` writes exactly the explainer it always did — the narration step
exits 3, the skill says in one sentence that the service is not running, and nothing else
changes. Exit 4 means narration is still generating; re-running the same command picks it up.
The model weights are under a research and non-commercial licence and are never committed here;
`setup.sh` fetches them from Hugging Face, where you accept those terms yourself.

## How it works with the other plugins

| Direction | Handoff |
|---|---|
| In | `dev:workflow` starts every flow with `code:core`, and its research and documentation flows continue with `code:research-codebase` and `code:deepwiki`. `design:design-doctrine` primes an unfamiliar codebase with `code:core` before touching its UI. |
| In | `dev:brainstorm` and `dev:check-implementation` use `code:trace` (and `--parity`) to baseline and check behavioural equivalence. `architecture:architect` runs `code:why` on the existing shape; `verify:blast-radius` follows the same evidence rules as `code:why`. `agentic:rules-from-code` uses the `code:codebase-locator` agent. |
| Out | `code:core` and `code:deepwiki` hand the `AGENTS.md` tree to `agentic:keys`. Without `agentic`, `core` stops at the graph and says so. |
| Out | `code:explain-diff` draws with `architecture:blueprint`, and measures its page with the `design` plugin's render gates when that plugin is installed. |
| Split | `code` explains code that exists. Shaping a new system or module is `architecture` (`architecture:ddd`, `architecture:blueprint`); reviewing a change for defects is `verify` (`verify:code-sweep`, `verify:complexity-sweep`); auditing it for security is `security:security-sweep`. |

## Credits

The graph layer is **[graphify](https://github.com/Graphify-Labs/graphify)** (PyPI package
`graphifyy`), used as-is. This plugin only chooses the flags that keep it deterministic and free.

`explain-diff` is adapted from **[Geoffrey Litt's explain-diff
gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)** — the
four-section structure, the Kleppmann-style writing brief and the interactive quiz are his. The
quiz-fairness rule comes from the gist's discussion thread.

`why` is a vendored copy of Lauren Tan's pstack (cursor/plugins, MIT, `LICENSE-pstack.txt`);
`code-tour` is from affaan-m/ECC (MIT); `deepwiki`'s Brownfield mode is adapted from
BMAD-METHOD's `document-project` task (MIT); the three agents are adapted from HumanLayer
(Apache-2.0). [NOTICE.md](NOTICE.md) has the upstream, commit, license and author of each, and
the edits made here. `core`, `deepwiki`, `research-codebase` and `trace` are otherwise the
marketplace owner's.

## Moved in v3

| Before | After |
|---|---|
| `dev:research-codebase` | `code:research-codebase` |
| `dev:trace` | `code:trace` |
| `pstack:why` | `code:why` |
| `craft:code-tour` | `code:code-tour` |
| `dev:codebase-locator`, `dev:codebase-analyzer`, `dev:codebase-pattern-finder` (agents) | `code:codebase-locator`, `code:codebase-analyzer`, `code:codebase-pattern-finder` |
| `dev:prime` (merged) | `code:core`, quick mode (`references/quick-prime.md`) |
| `dev:document-project` (merged) | `code:deepwiki`, Brownfield mode (`references/workflow/brownfield-doc.md`) |
| `code:core`'s CORE layer (`CLAUDE.md` contracts with `AGENTS.md` symlinks) | `agentic:keys` (`AGENTS.md` only) |
| `code:keys` | `agentic:keys` |
| `code:ddd` and its nine steps (`ddd-understand` … `ddd-contracts`), `code:blueprint`, the `ddd-decision-strategist` agent, `shared/` and the DDD guide | `architecture:ddd`, `architecture:ddd-*`, `architecture:blueprint`, `architecture:ddd-decision-strategist`; guide at [plugins/architecture/docs/ddd.md](../architecture/docs/ddd.md) |
| `code:security-sweep` | `security:security-sweep` |
| `code:complexity-sweep`, `code:e2e-harness` | `verify:complexity-sweep`, `verify:e2e-harness` |

## Invoking

Namespaced under the plugin: `/code:core`, `/code:trace`, `/code:why`, `/code:deepwiki`,
`/code:explain-diff`, and so on. Script paths inside each skill resolve from
`${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`.
