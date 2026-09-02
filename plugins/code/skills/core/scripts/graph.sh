#!/usr/bin/env bash
# Build or refresh the code knowledge graph. Deterministic and LLM-free.
#
# Every graphify invocation below is chosen so that no model is ever called:
# `extract --code-only` is pure tree-sitter AST parsing and runs without an API
# key at all, `cluster-only --no-label` keeps "Community N" placeholders instead
# of asking a model to name them, and `update` re-extracts code only. That
# matters because this runs on every prime -- if it cost tokens, the whole
# arrangement would be a net loss.
#
# Usage: graph.sh [--root DIR] [--label] [--no-hooks]
#   --label     one-off: name communities with the configured backend (costs a
#               couple of model calls, makes GRAPH_REPORT.md far more readable)
#   --no-hooks  skip git hook + Claude Code hook installation

set -uo pipefail

ROOT="."
LABEL=0
HOOKS=1

while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    --label) LABEL=1; shift ;;
    --no-hooks) HOOKS=0; shift ;;
    *) echo "graph.sh: unknown argument $1" >&2; exit 2 ;;
  esac
done

cd "$ROOT" || { echo "graph.sh: cannot enter $ROOT" >&2; exit 2; }
ROOT_ABS="$(pwd)"

# uv and pipx drop their shims in ~/.local/bin, which is often missing from a
# non-login shell's PATH even when the tool is installed.
export PATH="$HOME/.local/bin:$PATH"

say() { printf '%s\n' "$*"; }

# --------------------------------------------------------------------------
# 1. the tool itself
# --------------------------------------------------------------------------
if ! command -v graphify >/dev/null 2>&1; then
  say "graphify: not found, installing (isolated, reversible with 'uv tool uninstall graphifyy')"
  # The PyPI package is graphifyy with two y's; the command it installs is
  # graphify. Isolated installers come first because the skill resolves Python
  # at runtime and a shared-env pip install is the usual cause of a later
  # ModuleNotFoundError.
  if command -v uv >/dev/null 2>&1; then
    uv tool install graphifyy >/dev/null 2>&1 && uv tool update-shell >/dev/null 2>&1
  elif command -v pipx >/dev/null 2>&1; then
    pipx install graphifyy >/dev/null 2>&1
  else
    python3 -m pip install --user graphifyy >/dev/null 2>&1
  fi
  export PATH="$HOME/.local/bin:$PATH"
  if ! command -v graphify >/dev/null 2>&1; then
    say "graphify: install failed. Install it by hand, then run this again:"
    say "  uv tool install graphifyy   # or: pipx install graphifyy"
    say "graph=unavailable"
    exit 1
  fi
fi
say "graphify: $(graphify --version 2>/dev/null | head -1)"

# --------------------------------------------------------------------------
# 2. build or refresh
# --------------------------------------------------------------------------
if [ -f graphify-out/graph.json ]; then
  say "graph: refreshing changed files"
  graphify update . 2>&1 | grep -Ev '^Tip:|^$' | sed 's/^/  /'
else
  say "graph: first build (AST only, no API key needed)"
  graphify extract . --code-only 2>&1 | grep -Ev '^\[graphify\] |^$' | sed 's/^/  /'
  if [ -f graphify-out/graph.json ]; then
    # extract stops at graph.json; clustering is what produces GRAPH_REPORT.md.
    # --no-label keeps it deterministic.
    graphify cluster-only . --no-label 2>&1 | tail -2 | sed 's/^/  /'
  fi
fi

if [ ! -f graphify-out/graph.json ]; then
  say "graph: no graph produced -- this tree probably holds no parseable source"
  say "graph=empty"
  exit 0
fi

if [ "$LABEL" -eq 1 ]; then
  say "graph: naming communities (this one is not free)"
  graphify label . --missing-only 2>&1 | tail -3 | sed 's/^/  /'
fi

# --------------------------------------------------------------------------
# 3. keep it current without anyone remembering to
# --------------------------------------------------------------------------
if [ "$HOOKS" -eq 1 ]; then
  if [ -d .git ] || git rev-parse --git-dir >/dev/null 2>&1; then
    # post-commit and post-checkout rebuilds, plus a merge driver so graph.json
    # never shows conflict markers. Idempotent -- safe to run every prime.
    graphify hook install 2>&1 | sed 's/^/  hook: /'
  else
    say "  hook: not a git repo, skipping commit hooks"
  fi

  # Check for the hooks themselves, not just the skill directory. Those are two
  # separate things graphify writes, and it is the hooks that produce the
  # ongoing saving -- if someone reset .claude/settings.json but kept the skill
  # folder, a directory check would quietly never put them back.
  if [ ! -f .claude/skills/graphify/SKILL.md ] || ! grep -qs 'hook-guard' .claude/settings.json; then
    # Registers a PreToolUse hook that nudges toward `graphify query` before a
    # Bash/Grep sweep or a run of one-by-one Reads. This is where the ongoing
    # saving actually comes from: the graph only pays for itself if it gets
    # consulted instead of grep.
    graphify claude install --project 2>&1 | grep -E 'skill installed|PreToolUse|CLAUDE.md' | sed 's/^/  claude: /'
  else
    say "  claude: query-first hooks already registered"
  fi
fi

# --------------------------------------------------------------------------
# 4. housekeeping
# --------------------------------------------------------------------------
# graphify-out/ is meant to be committed so the whole team starts with the map.
# cost.json is local-only, and .graphify_root holds an absolute path to whoever
# built the graph -- committing that sends the next person chasing a directory
# that does not exist on their machine.
if ! grep -qs '^graphify-out/cost.json' .gitignore; then
  printf '\n# graphify: local only, the rest of graphify-out/ is meant to be committed\ngraphify-out/cost.json\ngraphify-out/.graphify_root\n' >> .gitignore
  say "  gitignore: added graphify-out/cost.json and .graphify_root"
fi

# Vendor core.py into the repo. The CORE contract written into CLAUDE.md
# outlives this skill invocation: a teammate, a Codex run, or this same repo
# next session without the plugin installed will read "run core.py index" and
# have no way to resolve it, because ${CLAUDE_PLUGIN_ROOT} only means anything
# while the skill is executing. Copying it in makes the repo self-contained, the
# same way graphify-out/ is meant to be.
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p .claude/core
if ! cmp -s "$SELF_DIR/core.py" .claude/core/core.py; then
  cp "$SELF_DIR/core.py" .claude/core/core.py
  say "  core: vendored core.py -> .claude/core/core.py"
fi

python3 - "$ROOT_ABS/graphify-out/graph.json" <<'PY'
import json, sys
try:
    g = json.load(open(sys.argv[1]))
except Exception as e:
    print(f"graph=unreadable ({e})"); raise SystemExit(0)
nodes, edges = g.get("nodes", []), g.get("edges", g.get("links", []))
comms = {n.get("community") for n in nodes if isinstance(n, dict) and n.get("community") is not None}
print(f"graph=ready nodes={len(nodes)} edges={len(edges)} communities={len(comms)}")
PY
