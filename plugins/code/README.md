# code — Code Intelligence

Two skills for working on a codebase you did not write: `core` primes it, and
`e2e-harness` proves it still works.

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
agent0ai (MIT) — the hierarchical `AGENTS.md`-as-binding-contract idea, the
pre-edit and closeout discipline, and the child index are all theirs. CORE
rewrites it around `CLAUDE.md` as the real file so contracts load on demand
rather than being traversed by hand, drops the manual re-read rule that
on-demand loading makes redundant, and generates the child index mechanically
instead of asking the agent to maintain it.

The graph layer is **[graphify](https://github.com/Graphify-Labs/graphify)**
(PyPI package `graphifyy`), used as-is. This plugin only chooses the flags that
keep it deterministic and free.

MIT.
