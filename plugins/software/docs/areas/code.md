# Understand — code intelligence, instruction files and session learning (former `code` plugin)

What does this existing code do, and what should an agent know before it touches it? Twelve
skills and three agents for understanding a codebase you did not write, or wrote long enough
ago: prime it once into a code graph, keep one `AGENTS.md` tree current, trace and research it,
find out why it is shaped the way it is, document it, explain a change to someone who was not
there, and turn what sessions teach into durable facts and checks. **Start with `core`** in any
repository you will touch more than once.

This area is part of the `software` plugin; see the [plugin README](../../README.md). `keys` and
the four session-learning skills came from the former `agentic` plugin.

## Skills

### Prime

| Skill | Use it when |
|---|---|
| `core` | Starting work in an unfamiliar or large repository, or after a big merge or refactor. Builds a deterministic, zero-token code knowledge graph with graphify, hands the `AGENTS.md` instruction tree to `software:keys`, then reads only what neither layer answers. Quick mode, from the former `prime` of the `dev` plugin: no graph, reads the manifests, entry points and at most 15–20 key files for the project type, writes nothing. |

### Instruction files

`AGENTS.md` is the only instruction file. `keys` builds and checks the tree; `core` feeds it the
boundary candidates and graph queries.

| Skill | Use it when |
|---|---|
| `keys` | Start here for instruction files. Installs KEYS, a self-maintaining `AGENTS.md` hierarchy: a root contract with the framework rules, a child `AGENTS.md` at each real boundary, and an index of direct children in every doc. Agents read the chain from the root before an edit and update it after. Folds each `CLAUDE.md`, plus root rule files such as `GEMINI.md`, `.cursorrules` and `.github/copilot-instructions.md`, into the owning `AGENTS.md`, and deletes them only after you confirm. No `CLAUDE.md`, no symlinks. `keys.py scan`, `install` and `check`; Python 3. |

### Investigate

| Skill | Use it when |
|---|---|
| `research-codebase` | A question about the codebase needs a written answer: documents the code as it is, without critique, by fanning out to the three agents below and synthesizing their findings into `ai_docs/research/`. |
| `trace` | You need the business logic behind an entry point (API route, function, class, event handler, background job): traces upstream and downstream and writes it in plain prose to `ai_docs/trace/`. `--parity <old> <new>` sweeps two implementations for behavioural parity. |
| `why` | "Why does X work this way", design rationale, regressions, postmortems, data-backed thresholds. Anchors in `git`/`gh`, spawns one investigator per connected evidence source (issue tracker, docs, chat, observability, error tracking, warehouse), then a synthesizer bound to a five-tier confidence framework. Not for how the code works at runtime. |

### Document

| Skill | Use it when |
|---|---|
| `deepwiki` | Generating, validating or maintaining a wiki for a codebase: a `toc.json`, one page per topic, every claim cited as `file:line`, Mermaid diagrams linted before they are accepted. Also onboarding guides, `AGENTS.md`, `llms.txt`, a changelog, an incremental sync after code changes, cited answers about an unfamiliar repo, and a VitePress site. Brownfield mode, from the former `document-project` of the `dev` plugin: one architecture document for agents about to change an existing system (real patterns, debt, workarounds, constraints), scoped to a PRD or feature. |
| `code-tour` | An onboarding, architecture, PR, RCA or security walkthrough as a VS Code CodeTour `.tour` file: persona-to-depth table, verified file and line anchors, step types, the `ref`-field PR-branch gotcha. |

### Explain a change

| Skill | Use it when |
|---|---|
| `explain-diff` | Someone needs to understand a diff, branch or PR. Writes one self-contained HTML page with background, intuition, a code walkthrough and an interactive quiz, with diagrams from `software:blueprint` (inline SVG/HTML when Blueprint is not installed), and narrates itself when the local text-to-speech service is running. |

### Learn from sessions

| Skill | Use it when |
|---|---|
| `agent-memory` | A project's instruction file has outgrown what anyone reads and you want the agent to learn durable facts from its own sessions. A four-tier store (transcripts, candidates, project context, persona) where promotion needs recurrence across sessions and days, contradictions freeze a claim, redacted claims never promote on evidence alone, and nothing reaches a committed file without a human `adopt`. Five stdlib scripts plus three optional hooks you wire yourself (see below). |
| `stow` | End of a session, before a context reset or a long break: sweep the conversation for preferences, project facts, gotchas, standing decisions and open next steps, and file each into the project's existing `CLAUDE.md` / `AGENTS.md` / `TODO` conventions or a private `.stow-notes.md`, inspecting before updating and retiring stale entries to a local archive on a tiered decay clock. |
| `retro` | After a coding session, to improve the agent's environment for the next one: navigation pointers, missing guardrails, mechanical vs judgement standards, `AGENTS.md` bloat, tool economy, no-ops and information access. User-invoked only. |
| `correct` | The operator keeps correcting agents for the same mistakes. Mines commits, reverts and reviews for mistake classes and fixes each at the strongest level that works: architecture, then types, then a lint whose error names the fix, then a test, docs last. Proves each check on a real past mistake and keeps a rule-to-enforcer table. |

### Agents

Addressed as `software:<name>`. All three are read-only.

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
| **Instruction files** (the `AGENTS.md` tree) | what a directory is *for*, what may not break, how to verify | `software:keys`, once per boundary | real tokens, once |
| **Read** | the few specifics neither layer holds | you, every session | small, because the first two did the work |

After that, a question about the codebase costs a scoped `graphify query` instead of a grep
across the repo.

`core` owns the graph and the read. It writes no `CLAUDE.md` and no symlinks: `AGENTS.md` is
the only instruction file, and `software:keys` builds and checks that tree. The one thing `core`
puts in it is graphify's own instructions, in a `<!-- GRAPHIFY:begin -->` …
`<!-- GRAPHIFY:end -->` block of the root `AGENTS.md` that keys leaves alone.

```
/core
```

`status.sh` reports the whole repository in one block — graphify, the graph and its drift, the
hooks, where `software:keys` is, the `AGENTS.md` tree and keys' own check, and directories that
look like boundaries but have no `AGENTS.md` — and ends with a `verdict=` line:

| Verdict | Meaning | What `core` does |
|---|---|---|
| `BOOTSTRAP` | no `AGENTS.md` tree yet | runs `software:keys`, feeding it the boundary candidates and graph queries |
| `REPAIR` | the tree is unfinished, has a `CLAUDE.md` left to fold, or keys check reports errors | runs `software:keys` on its refresh path |
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
for a phone. Diagrams come from `software:blueprint`; `embed-blueprint.mjs` embeds each
viewer in an isolated iframe and the typed diagram JSON is kept for later edits. When Blueprint
cannot run (a loose copy of explain-diff, or no Node), the skill draws inline SVG/HTML figures and
says so; it never installs anything. Schema explanations use labelled foreign-key relationships plus field tables;
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
the new files to `software:keys` to index.

## What these write and where they reach

None of these wires anything at install. Everything below happens only when you invoke a skill.

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
  - The `AGENTS.md` tree itself is written by `software:keys`, which shows its fold plan and
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
  runs Blueprint's Node CLI from `software:blueprint` in this plugin, and, when the `design`
  plugin is installed, measures the page with its Playwright and axe gates. Narration posts the
  page's text to the local narration service at `http://127.0.0.1:8477` (`BREEZE_TTS_URL`
  overrides) and embeds the returned audio and player in the HTML.
- **`keys`** writes the root `AGENTS.md` (the framework sits between `<!-- KEYS:begin -->` and
  `<!-- KEYS:end -->`; a re-run replaces only that block) and a child `AGENTS.md` per boundary.
  An `AGENTS.md` that is a symlink becomes a regular file. It deletes the `CLAUDE.md` and rule
  files it folded only after you confirm the delete list, and warns first when the git tree is
  dirty or there is no git repository. `CLAUDE.local.md` is never touched. In a headless run with
  nobody to confirm, it folds, deletes nothing and lists each source as `pending delete`.
  `keys.py` is stdlib Python 3 and makes no network calls.
- **`agent-memory`** writes `.memory/` (candidate atoms, a lock, an error log, staged
  promotions) in the current project. `memory_inspect.py --why` reads your Claude Code
  transcripts under `~/.claude/projects/` to quote a cited line. The `adopt` flow is the only
  path that edits a `CLAUDE.md` (project and `~/.claude/CLAUDE.md`), one atom at a time with
  your confirmation, after backing both files up. The unattended mode is an explicit opt-in:
  copy the three entries from `skills/agent-memory/scripts/hooks.json` into the `hooks`
  section of your `settings.json`; they run
  `${CLAUDE_PLUGIN_ROOT}/skills/agent-memory/scripts/session_start.py`,
  `user_prompt_submit.py` and `session_end.py` (if your settings file does not expand
  `${CLAUDE_PLUGIN_ROOT}`, substitute the installed plugin's absolute path). Every hook fails
  open and each can be disabled with `AGENT_MEMORY_SESSIONSTART=0`,
  `AGENT_MEMORY_USERPROMPTSUBMIT=0` or `AGENT_MEMORY_SESSIONEND=0`. No network, no LLM calls.
- **`stow`** writes only to files the project already uses (`CLAUDE.md`, `AGENTS.md`, a
  tracked `TODO`/`NOTES`), to `.stow-notes.md` and `.stow-archive.md` in the current directory,
  and adds those two names to a `.gitignore` there. It never commits.
- **`retro`** reads session logs under `~/.claude/projects/`.
- **`correct`** changes repository configuration on purpose: lint rules, CI checks, types, tests
  and the agent instruction file, one commit per mistake class.

### Narration is a local companion, not part of the plugin

The narration service is [`services/breeze-tts`](../../../../services/breeze-tts/) in this repository:
Breeze TTS 2 held in memory on Apple Silicon, started with `just install` once and `just start`
after. It is not a plugin and `/plugin` does not install it. Narration is always optional: with
the service down, `explain-diff` writes exactly the explainer it always did — the narration step
exits 3, the skill says in one sentence that the service is not running, and nothing else
changes. Exit 4 means narration is still generating; re-running the same command picks it up.
The model weights are under a research and non-commercial licence and are never committed here;
`setup.sh` fetches them from Hugging Face, where you accept those terms yourself.

## How it works with the rest of the plugin and the others

| Direction | Handoff |
|---|---|
| In | `software:workflow` starts every flow with `software:core`, and its research and documentation flows continue with `software:research-codebase` and `software:deepwiki`. `design:design-doctrine` primes an unfamiliar codebase with `software:core` before touching its UI. |
| In | `software:brainstorm` and `software:check-implementation` use `software:trace` (and `--parity`) to baseline and check behavioural equivalence. `software:architect` runs `software:why` on the existing shape; `software:blast-radius` follows the same evidence rules as `software:why`. `software:rules-from-code` uses the `software:codebase-locator` agent. |
| Out | `software:core` and `software:deepwiki` hand the `AGENTS.md` tree to `software:keys`. The owner decided that keys' model is the correct one: `core` keeps the graphify graph and the read, and puts only graphify's own instructions in a `<!-- GRAPHIFY:begin -->` block of the root `AGENTS.md`, which keys leaves alone. |
| In | `software:keys` folds a tree that an older `software:core` wrote (`CLAUDE.md` contracts with `AGENTS.md` symlinks, `<!-- CORE:begin -->` blocks, a `## graphify` section) into the KEYS layout, and leaves core's non-instruction files (`.claude/core/`, `graphify-out/`, its git hooks) alone. |
| Out | `software:explain-diff` draws with `software:blueprint`, and measures its page with the `design` plugin's render gates when that plugin is installed. |
| Split | Understand explains code that exists. Shaping a new system or module is Shape (`software:ddd`, `software:blueprint`); reviewing a change for defects is Verify (`software:code-sweep`, `software:complexity-sweep`); auditing it for security is `software:security-sweep`. |
| Split | `software:correct` turns repeated mistakes into enforced checks; `software:principles` (topic `principle-encode-lessons-in-structure`) is the principle behind it. `software:retro` improves the environment for the next session; `software:agent-memory` and `software:stow` keep what this one learned. |

## Credits

The graph layer is **[graphify](https://github.com/Graphify-Labs/graphify)** (PyPI package
`graphifyy`), used as-is. This plugin only chooses the flags that keep it deterministic and free.

`explain-diff` is adapted from **[Geoffrey Litt's explain-diff
gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)** — the
four-section structure, the Kleppmann-style writing brief and the interactive quiz are his. The
quiz-fairness rule comes from the gist's discussion thread.

`why` is a vendored copy of Lauren Tan's pstack (cursor/plugins, MIT, [`LICENSE-pstack.txt`](../../LICENSE-pstack.txt));
`code-tour` is from affaan-m/ECC (MIT); `deepwiki`'s Brownfield mode is adapted from
BMAD-METHOD's `document-project` task (MIT); the three agents are adapted from HumanLayer
(Apache-2.0).

From the former `agentic` plugin: `keys` installs KEYS, the DOX `AGENTS.md` framework from
[agent0ai/dox](https://github.com/agent0ai/dox) (MIT), renamed and made `AGENTS.md`-only;
`agent-memory` is from Alireza Rezvani's claude-skills; `stow` from Kun Chen's firstmate; `retro`
from Matt Pocock's skills; and `correct` from Lauren Tan's pstack at commit `9d76bca`
(2026-10-11), MIT.

The plugin's [NOTICE.md](../../NOTICE.md) has the upstream, commit, license and author of each
(sections "From the former `code` plugin" and "From the former `agentic` plugin"), and the edits
made here. `core`, `deepwiki`, `research-codebase` and `trace` are otherwise the marketplace
owner's.

## Invoking

`/software:core`, `/software:keys`, `/software:trace`, `/software:why`, `/software:deepwiki`,
`/software:explain-diff`, `/software:agent-memory`, `/software:stow`, `/software:retro`,
`/software:correct`, and so on. Script paths inside each skill resolve from
`${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`.
