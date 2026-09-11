---
name: core
description: Prime a codebase with a local code graph whose queries mechanically verify freshness. Builds an AST-only knowledge graph with graphify, lays down a CORE tree of CLAUDE.md contracts with AGENTS.md symlinks beside them, and reads only what those two layers cannot already answer. Use this whenever you are starting work in an unfamiliar or large repository, or when the user says "prime", "/core", "get up to speed on this repo", "load the project context", "onboard me to this codebase", "build a map of this project", "set up CLAUDE.md and AGENTS.md", "index this codebase", or complains that the agent keeps re-reading the same files and burning context. Also use it at the start of any session where wide grepping or reading is expected, and after a big merge, refactor or dependency bump when the map and the docs have drifted. Spends context up front so that every later question costs a graph query instead of a file sweep.
---

# core

Most priming is an expense you pay again every session: read the tree, read the
configs, read twenty files, start work, run out of context, compact, forget.
This one is an investment. It builds two artefacts that survive the session — a
code graph and a tree of written contracts — so the next prime is a few seconds
of shell and the questions in between cost a scoped query instead of a sweep.

The first run builds the graph and authors the contracts. Later runs reuse
unchanged graphs after content verification.

## Three layers, three different jobs

| Layer | Answers | Built by | Cost | Goes stale |
|---|---|---|---|---|
| **Graph** — local snapshot cache | what calls what, what depends on what, where a change lands | tree-sitter AST, no model | content hashing; extraction when changed, zero model tokens | checked before every gateway query |
| **CORE** — `CLAUDE.md` + `AGENTS.md` | what a directory is *for*, what may not break, how to verify | you, once per boundary | real tokens, once | when someone skips the closeout |
| **Read** — configs, entry points | the handful of specifics neither layer holds | you, every session | small, because the first two did the work | n/a |

The graph cannot tell you that `payments/` must never import from `billing/`.
CORE cannot tell you which forty functions break if you change a signature.
Keeping them separate is what lets each stay cheap.

## Step 1 — Look before you touch anything

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/status.sh"
```

One call, one block, no guessing. It reports whether graphify is installed,
whether a graph exists and how stale it is, whether the hooks are registered,
how many CORE docs there are and whether their symlinks are healthy, and which
directories look like boundaries but have no contract yet. It ends with a
`verdict=` line that decides Step 3.

Read the block. Do not go exploring to confirm it.

## Step 2 — The graph, every single time

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/graph.sh"
```

Installs the tested Graphify release if missing, vendors `graph.py` and
`core.py` into `.claude/core/`, installs refresh hooks, and synchronizes the
index. No model or API key is involved. `--no-hooks` skips hook installation;
the query gateway still enforces freshness.

**All graph reads go through `python3 .claude/core/graph.py`.** It fingerprints
working-tree contents (including uncommitted changes), builds in an isolated
snapshot, and publishes a complete generation atomically. It buffers each query
and discards the answer if the repository changes while the query runs. A stale
or failed build produces an error, never a fallback answer from the old graph.
Do not bypass this with raw `graphify`, old `graphify-out/` files, or a separate
MCP/database reader. Those interfaces cannot inherit the gateway's checks.

For continuous refresh while a human edits, run this in a terminal or under a
process supervisor:

```bash
python3 .claude/core/graph.py watch --interval 2
```

Git hooks cover commit, checkout, merge and rewrite. Claude hooks refresh at
session start and after editing/shell tools, and intercept common direct graph
reads. Watchers and hooks reduce query latency; correctness comes from the
gateway. See [graph consistency](references/graph-consistency.md) for the scope,
performance tradeoffs, cache locations, migration and race guarantees.

## Step 3 — The CORE tree

Follow the `verdict` from Step 1.

### `verdict=BOOTSTRAP` — no tree yet

This is the expensive half of the expensive first run. Do it deliberately.

**1. Write the root contract.**

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/core.py" block CLAUDE.md \
  --source "${CLAUDE_PLUGIN_ROOT}/skills/core/assets/CORE-root.md"
python3 "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/core.py" link .
```

`block` inserts a marker-delimited section and replaces it on re-runs, so
anything already in `CLAUDE.md` — including an existing `## graphify`
section — survives untouched. Replace legacy raw Graphify commands there with
the gateway commands; the old section is not a freshness guarantee.

Then add what is true everywhere in this repo and nowhere else: the build
command, the test command, the conventions that would surprise someone. Get
these from the manifest and the CI config, not by reading source.

**2. Choose the boundaries.**

`status.sh` printed candidates: directories with their own build manifest, and
directories holding enough code to be a real area. That list is mechanical, so
treat it as a shortlist rather than an answer. A boundary earns a contract when
it has a purpose you could state in a sentence and rules someone could
plausibly break.

Pick five to ten for a normal repository. A contract in every directory is how
this ends up as noise nobody maintains — and every one of them loads into
context whenever an agent touches that directory, so an empty contract is a
recurring bill for nothing.

**3. Write each one.** Use `assets/CORE-child.md` as the shape — its guidance
sits in HTML comments, which Claude Code strips before a CLAUDE.md reaches the
context window, so the instructions stay visible to you and cost nothing on
every later load. Drop any section you have nothing real to say about; an
unfilled section is a bill charged every time an agent enters that directory.

To learn what a directory does, query the graph rather than sweeping it:

```bash
python3 .claude/core/graph.py god-nodes --top 10 --json          # the hubs everything routes through
python3 .claude/core/graph.py explain "<the hub in that dir>"    # what it is and what it touches
python3 .claude/core/graph.py query "what does <dir> do?" --budget 1500
```

**Then verify before you assert.** The graph records the edges its parser
resolved. A missing edge might mean there is no dependency, or it might mean a
dynamic import, a template path or a string reference it could not follow — so
the graph settles what *is* connected and is silent on what is not. Any claim
of the form "must not depend on", "nothing else uses", or "is only reached
from" needs one confirming grep before it goes in a contract.

This is not pedantry. A contract is written once and believed by every session
afterwards, so a false invariant is worse than a missing one, and inferred
negatives are the ones that turn out false.

Reading a targeted slice to check a claim is the right move and costs little —
`sed -n '1,80p'`, a grep with context. What the graph replaces is the *other*
kind of reading: opening fifteen files to work out what the codebase is. Skip
that; keep the verification.

**4. Link and index.**

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/core.py" link src src/api tests
python3 "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/core.py" index
```

`link` makes each `CLAUDE.md` real and each `AGENTS.md` a symlink to it. It
handles the awkward cases without losing anything: an existing `AGENTS.md` gets
promoted or merged, a reversed link is reported rather than churned, and a
platform without symlinks gets an `@CLAUDE.md` import stub instead. `index`
regenerates every parent's child list from what is actually on disk, so nobody
maintains that by hand.

### `verdict=REPAIR` — tree exists, links are wrong

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/core.py" link <the dirs status.sh flagged>
python3 "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/core.py" index
```

If `core_conflicts` is non-empty, look at those paths yourself — something is
there that the script would not overwrite on purpose.

### `verdict=REFRESH` — the normal case

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/core.py" index
```

Then read the status block. `added`, `modified`, and `removed` count content
drift found before synchronization. If changes were substantial, the contracts
near those files are worth a skim. `candidates:` lists
directories that have grown into boundaries since the last prime. Usually both
are quiet, and that is the point.

## Step 4 — Read what is left, and only that

The root `CLAUDE.md` is already in your context; Claude Code loaded it at
launch, and it will load each child contract by itself when you read a file in
that directory. The graph holds the structure. So the read phase is now small:

- `python3 .claude/core/graph.py god-nodes --top 15 --json` — the architectural hubs, a few hundred tokens
- the build manifest and the entry point, if the root contract does not already say
- nothing else

Resist reading fifteen source files to "get oriented". That was the old prime's
job and the graph has taken it over. Use the gateway's `god-nodes` for a broad
structural overview, and prefer a scoped `python3 .claude/core/graph.py query` when you have an
actual question — it returns a subgraph instead of a document.

Close by telling the user what you built and what it cost: graph size, how many
contracts, and which boundaries you deliberately left undocumented.

## Working after a prime

This is where the investment pays back, so it is worth being deliberate about:

- **Ask the graph before you grep.** `python3 .claude/core/graph.py query "..."`, `python3 .claude/core/graph.py path "A" "B"`,
  `python3 .claude/core/graph.py explain "X"`, `python3 .claude/core/graph.py affected "X"` — scoped and local. `query` accepts
  `--budget` to cap its output. A freshness error means retry the gateway or
  inspect the source; never fall back to a saved graph answer.
- **Close out changes.** When a change moves a directory's purpose, contract,
  workflow or verification, update that directory's `CLAUDE.md` in the same
  breath. A contract nobody maintains becomes a lie that gets believed.
- **Updates are mechanical.** Hooks and the optional watcher keep the index
  warm. Every query detects changes even if a hook was skipped. No agent needs
  to remember an update command. On upgrades, replace legacy raw Graphify
  commands in existing contracts with the gateway commands above.

## Command reference

| Command | Does |
|---|---|
| `status.sh` | full state in one block, ends with `verdict=` |
| `graph.sh [--no-hooks]` | install gateway, synchronize, register hooks |
| `graph.py query/explain/path/affected/god-nodes ...` | validated graph reads |
| `graph.py sync` | synchronize now; reuse an unchanged generation |
| `graph.py status` | JSON content drift; nonzero unless fresh |
| `graph.py watch [--interval 2]` | continuous foreground refresh; Ctrl-C stops it |
| `core.py link <dirs...> [--flip]` | real `CLAUDE.md`, symlinked `AGENTS.md`, safely |
| `core.py block <file> --source <tpl>` | insert or replace the CORE section |
| `core.py index [--root R]` | regenerate every Child CORE Index |
| `core.py boundaries [--root R]` | candidate directories with no contract |
| `core.py check [--root R]` | health as `key=value` lines |

Scripts live under `${CLAUDE_PLUGIN_ROOT}/skills/core/scripts/`. All of them are
deterministic; none of them call a model.

`graph.sh` vendors `core.py` and `graph.py` into `.claude/core/`, and the CORE
contract points there rather than at the plugin. The contract stays in the repo
long after this skill has finished running: a teammate, a Codex session, or you next week
without the plugin installed will read "run `core.py index`" and needs it to
resolve. `${CLAUDE_PLUGIN_ROOT}` only means something while the skill executes.
