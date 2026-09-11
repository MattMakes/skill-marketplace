# Graph freshness contract

Use `python3 .claude/core/graph.py query "..."` for every lookup. The same gateway
supports `explain`, `path`, `affected` and `god-nodes` with their Graphify options.
`--root DIR` precedes the command; inside Git it resolves to the worktree root.
The gateway owns `--graph`; callers cannot substitute another graph.

## What is verified

1. Enumerate tracked and untracked, nonignored files using NUL-delimited Git
   output. Read current bytes, including unstaged edits; a commit ID is not a
   freshness proof. Hash file contents with SHA-256, checking for changes during
   reads. Track additions, deletions, renames, ignore changes and file contents.
2. Hold a process lock for synchronization and queries. Build a replacement in
   a private source snapshot with `extract --code-only --no-cluster --force`.
   Git already selected the input files, so `--no-gitignore` prevents a second,
   inconsistent Git ignore decision. Graphify's own parser exclusions still apply.
3. Compare the live contents again. On drift, discard the candidate and retry
   up to three times. Publish the manifest with one atomic replacement only
   after successful extraction and validation. Include root identity, Graphify
   version, launcher and gateway hashes, and a checksum of the graph itself.
4. For each query, verify the current generation, capture all backend output,
   and check repository contents and file observations again before releasing
   the answer. An edit during the query discards that answer with a nonzero
   exit. A failed build never permits serving the previous generation as fresh.

The snapshot digest accompanies results on stderr, leaving JSON stdout intact.
`status` emits JSON with `state`, `added`, `modified`, `removed` and the current
content digest. It exits 0 only for a validated fresh generation, 1 for stale
or absent state, and 2 for an operational error. Queries exit nonzero with no
answer on failed validation. Re-run a query after concurrent writes settle.

## Scope and limits

This is an optimistic, validated filesystem snapshot, not a lock on the editor.
The gateway serializes its own processes; it cannot stop unrelated writers or
make a multi-file save transactional. Files can change after the final check,
and adversarial edits that occur and revert entirely between observations are
outside the guarantee. Stronger guarantees require all writers to participate
in a shared transaction or queries against an explicitly immutable revision.

The input scope is regular files visible to Git, excluding `.git`,
`graphify-out`, `.core-graph`, `__pycache__`, and `.claude/core/`. Symlink targets
are fingerprinted but not followed or indexed. Submodule entries fail explicitly:
index each submodule separately. Outside Git, regular files are walked with the
same exclusions; Git ignore rules do not apply. Use Git for large workspaces.
Graphify's language support, `.graphifyignore`, and parser exclusions determine
which inputs yield nodes. Freshness does not imply complete dependency analysis;
dynamic references and unsupported syntax can still be missing.

No guarantee extends to raw `graphify` commands, saved reports, externally
exported databases, MCP servers that load their own graph, or graph bytes read
directly. Such integrations must invoke the gateway or implement its validation
contract. The Claude PreToolUse guard intercepts common bypasses; it is not a
shell security boundary. Other agents use the same gateway command in CORE.

## Automatic refresh and cost

`graph.sh` installs hooks for Git post-commit, post-checkout, post-merge and
post-rewrite, backing up an existing shell hook in `<hook>.core-previous` and running its
body first in a subshell with the original interpreter, path, arguments and exit
status. Non-shell hooks are left intact and installation fails with guidance
to use `--no-hooks` and the watcher. Git's `core.hooksPath` is
respected. Hook scripts resolve the active worktree at runtime. Hook refresh
failures are visible but do not undo an already completed Git operation.

Claude session-start and post-edit/shell hooks call `sync`; settings are merged
without replacing unrelated hooks. The guard intercepts ordinary direct graph
reads. `--no-hooks` leaves existing hooks unchanged and skips new installations.
Clones need to run `graph.sh` once because Git does not clone installed hooks.

For human edits while no agent is running, supervise this foreground process:

```sh
python3 .claude/core/graph.py watch --interval 2
```

It retries after errors; Ctrl-C stops it. It does not install a login service or
start an unmanaged daemon. Missed hooks, stopped watchers and branch switches do
not bypass query validation. They can increase the next query's latency.

Every freshness check reads and hashes the input bytes: O(repository bytes).
Unchanged generations skip extraction. Changed generations take a full AST
extraction so deleted nodes and old cross-file edges cannot survive a partial
merge or Graphify's shrink guard. This favors correctness over minimum update
time. It saves model context, but is not necessarily faster than `rg` for a
single text search. No fixed one-second refresh promise applies. Incremental
extraction would need separate equivalence tests against full rebuilds before
replacing this path. No clustering, semantic inference, or LLM labeling runs.

## Cache, upgrades and validation

The local cache is at `git rev-parse --git-path core-graph` for each worktree,
or `.core-graph/` outside Git. It contains `current.json`, a process lock, and a
generation with its own source snapshot and graph. Keep it local: it holds
copies of uncommitted source. Successful replacements remove older generations
while holding the lock. After a crash, the next changed build cleans up orphans.

Commit `.claude/core/graph.py` and `core.py` so other agents can use the gateway
without the plugin. New installations pin `graphifyy==0.9.53`, the tested CLI;
existing versions are retained and fingerprinted. Changes to the gateway or
Graphify invalidate the cache. This does not guarantee compatibility with an
arbitrary future Graphify CLI.

Legacy `graphify-out/` is never adopted as current or deleted automatically.
Replace old query and update instructions in existing CORE contracts with the
gateway commands. Existing upstream Graphify hooks may still maintain that
legacy output; remove them with Graphify's own uninstaller if no longer needed.
`graph.sh --label` now fails explicitly: managed snapshots never call a model.

Run the deterministic race/failure tests and the opt-in installed-Graphify test:

```sh
python3 -m unittest discover -s plugins/code/skills/core/scripts -p test_graph.py
CORE_GRAPH_REAL=1 python3 -m unittest discover -s plugins/code/skills/core/scripts -p test_graph.py
```
