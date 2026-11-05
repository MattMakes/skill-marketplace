---
name: core
description: Prime a codebase once, then stay primed for free. Builds a deterministic zero-token code knowledge graph with graphify, hands the AGENTS.md instruction tree to agentic:keys, and reads only what those two layers cannot already answer. A quick mode reads the key files for the project type with no graph, for when graphify is unavailable or a fast read-only look is enough. Use this whenever you are starting work in an unfamiliar or large repository, or when the user says "prime", "/core", "get up to speed on this repo", "load the project context", "read the key files", "onboard me to this codebase", "build a map of this project", "index this codebase", or complains that the agent keeps re-reading the same files and burning context. Also use it at the start of any session where wide grepping or reading is expected, and after a big merge, refactor or dependency bump when the map and the docs have drifted. Spends context up front so that every later question costs a graph query instead of a file sweep.
---

# core

Most priming is an expense you pay again every session: read the tree, read the
configs, read twenty files, start work, run out of context, compact, forget.
This one is an investment. It builds two artefacts that survive the session — a
code graph and a tree of written contracts — so the next prime is a few seconds
of shell and the questions in between cost a scoped query instead of a sweep.

The first run on a repository is genuinely expensive. Every run after it is
close to free. If you are about to touch a codebase more than once, that trade
is worth making. If you are not, use [quick mode](#modes).

## Three layers, three different jobs

| Layer | Answers | Built by | Cost | Goes stale |
|---|---|---|---|---|
| **Graph** — `graphify-out/` | what calls what, what depends on what, where a change lands | tree-sitter AST, no model | ~4s first build, ~1s refresh, zero tokens | never, if hooks are on |
| **Instruction files** — the `AGENTS.md` tree | what a directory is *for*, what may not break, how to verify | the `agentic:keys` skill, once per boundary | real tokens, once | when someone skips the closeout |
| **Read** — configs, entry points | the handful of specifics neither layer holds | you, every session | small, because the first two did the work | n/a |

The graph cannot tell you that `payments/` must never import from `billing/`.
The contracts cannot tell you which forty functions break if you change a
signature. Keeping them separate is what lets each stay cheap.

`core` owns the graph and the read. It writes no `CLAUDE.md` and no symlinks.
`AGENTS.md` is the only instruction file, and `agentic:keys` builds and checks
that tree. The one thing `core` puts in it is graphify's own instructions, in a
`<!-- GRAPHIFY:begin -->` … `<!-- GRAPHIFY:end -->` block of the root
`AGENTS.md` that keys leaves alone.

## Modes

| Mode | Pick it when | Steps |
|---|---|---|
| **Full** (default) | You will work in this repository more than once, or it is large | Steps 1–4 below |
| **Quick** | graphify cannot be installed (`graph.sh` prints `graph=unavailable`), the user declines the install, or they want a fast read-only look | Follow [references/quick-prime.md](references/quick-prime.md): list the tree, read the manifests, entry points and at most 15–20 key files for the project type. Writes nothing |

## Step 1 — Look before you touch anything

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/status.sh"
```

One call, one block, no guessing. It reports whether graphify is installed,
whether a graph exists and how stale it is, whether the hooks are registered,
where the `agentic:keys` skill is (`keys=`), the `AGENTS.md` tree (how many
docs, whether keys is installed and indexed, any stray `CLAUDE.md` keys would
fold, keys' own check result), and which directories look like boundaries but
have no `AGENTS.md`. It ends with a `verdict=` line that decides Step 3.

Read the block. Do not go exploring to confirm it.

## Step 2 — The graph, every single time

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/graph.sh"
```

Installs graphify if it is missing, builds the graph if there isn't one,
refreshes it if there is, and registers the hooks that keep it current on
commit and branch switch. Every command it runs is AST-only — no API key, no
model, no tokens. Run it on every prime; a refresh on an unchanged repo takes
about a second.

`graphify claude install` writes a `## graphify` section into `CLAUDE.md`, so
`graph.sh` finishes with `core.py graphify-block`: the section moves into the
marked block in the root `AGENTS.md`, and a `CLAUDE.md` (or `.claude/CLAUDE.md`)
left empty by the move is deleted. A `CLAUDE.md` with other text keeps that text
for keys to fold.

Add `--label` once, on a repo you will live in for a while, to have the
communities named instead of numbered. That one costs a couple of model calls
and makes `GRAPH_REPORT.md` much easier for a human to read. It is the only
part of this skill that is not free, and it is optional.

## Step 3 — The instruction files

Follow the `verdict` from Step 1.

### `verdict=GRAPH_ONLY` — agentic is not installed

Stop at the graph. Tell the user that the instruction files come from the
`agentic` plugin's `keys` skill, and that installing `agentic` and running
`/core` again adds them. Do not write `AGENTS.md` or `CLAUDE.md` files by hand.

### `verdict=BOOTSTRAP` — no AGENTS.md tree yet

Run the `agentic:keys` skill. Its first run scans the project, installs the
root `AGENTS.md` framework block, folds existing `CLAUDE.md` and agent rule
files into `AGENTS.md` (showing a fold plan and deleting nothing until the user
confirms), writes a child `AGENTS.md` per real boundary with a Child KEYS Index
in each, and runs `keys.py check` until it reports `0 errors`.

Feed it what this skill already knows:

- **Boundaries.** Hand keys the `candidates:` list from Step 1 alongside its own
  scan. Both are mechanical shortlists; a boundary earns a doc when it has a
  purpose you could state in a sentence and rules someone could break.
- **What a directory does.** Query the graph rather than sweeping it:

  ```bash
  graphify god-nodes --top 10 --json          # the hubs everything routes through
  graphify explain "<the hub in that dir>"    # what it is and what it touches
  graphify query "what does <dir> do?" --budget 1500
  ```

- **Negative claims.** The graph records the edges its parser resolved. A
  missing edge might be a dynamic import, a template path or a string reference
  it could not follow, so it settles what *is* connected and is silent on what
  is not. "Must not depend on", "nothing else uses", "is only reached from" each
  need one confirming grep before they go in a contract.

A repository primed by an older `core` has `CLAUDE.md` files with
`<!-- CORE:begin -->` blocks and `AGENTS.md` symlinks. Keys handles that
layout: it replaces the symlinks with regular files and drops the CORE blocks.
If `graph.sh` printed `graphify_block=deferred`, run it again once keys is done.

### `verdict=REPAIR` — the tree is unfinished or has drifted

Run `agentic:keys`; it takes its refresh path. `status.sh` has said why:
`keys_indexed=no` (an earlier build stopped before the index),
`stray_claude_md` above zero (a `CLAUDE.md` to fold, with the same confirm rule),
or errors in `keys_check`.

### `verdict=REFRESH` — the normal case

Nothing to build. Read two lines of the status block. `unindexed_files` counts
source files the graph has never seen — drift the refresh just fixed, and if it
was large, the contracts near those files are worth a skim. `candidates:` lists
directories that have grown into boundaries since the last prime; if any
deserve a doc, run `agentic:keys` for a refresh. Usually both are quiet, and
that is the point.

## Step 4 — Read what is left, and only that

The root `AGENTS.md` holds the build and test commands and the project-wide
rules; read it if it is not already in your context. The graph holds the
structure. So the read phase is now small:

- `graphify god-nodes --top 15 --json` — the architectural hubs, a few hundred tokens
- the build manifest and the entry point, if the root `AGENTS.md` does not already say
- nothing else

Resist reading fifteen source files to "get oriented". That was the old prime's
job and the graph has taken it over. Open `GRAPH_REPORT.md` only for a broad
architecture review, and prefer a scoped `graphify query` when you have an
actual question — it returns a subgraph instead of a document.

Close by telling the user what you built and what it cost: graph size, how many
`AGENTS.md` docs keys wrote or changed, and which boundaries were deliberately
left undocumented. Under `GRAPH_ONLY`, say the instruction files were skipped
and why.

## Working after a prime

This is where the investment pays back, so it is worth being deliberate about:

- **Ask the graph before you grep.** `graphify query "..."`, `graphify path "A" "B"`,
  `graphify explain "X"`, `graphify affected "X"` — all scoped, all local, all
  capped by `--budget`. A PreToolUse hook nudges you toward this; the nudge only
  works if you take it.
- **Close out changes.** When a change moves a directory's purpose, contract,
  workflow or verification, update the owning `AGENTS.md` in the same breath,
  as the KEYS rules in the root say. A contract nobody maintains becomes a lie
  that gets believed.
- **Let the hooks do the rest.** Commits and branch switches rebuild the graph
  on their own. After a `git pull`, run `graphify update .`.

## Command reference

| Command | Does |
|---|---|
| `status.sh [--root R]` | full state in one block, ends with `verdict=` |
| `graph.sh [--label] [--no-hooks]` | install / build / refresh graph, register hooks, place the graphify block |
| `core.py graphify-block [--root R]` | move graphify's `CLAUDE.md` section into the marked block in the root `AGENTS.md` |
| `core.py boundaries [--root R]` | candidate directories with no `AGENTS.md` |
| `core.py check [--root R]` | the `AGENTS.md` tree as `key=value` lines |

Scripts live under `${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/`. All of them are
deterministic; none of them call a model. `status.sh` finds keys through the
installed `agentic` plugin or a sibling plugin directory; set `CORE_KEYS_DIR`
to a `skills/keys` directory to point it elsewhere.
