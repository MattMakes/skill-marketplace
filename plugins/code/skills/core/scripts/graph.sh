#!/usr/bin/env bash
# Install the local freshness gateway, wire automatic refreshes, and synchronize.
# Usage: graph.sh [--root DIR] [--no-hooks]
set -euo pipefail

ROOT="."
HOOKS=1
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [ $# -gt 0 ]; do
  case "$1" in
    --root) [ $# -ge 2 ] || { echo "--root requires a directory" >&2; exit 2; }; ROOT="$2"; shift 2 ;;
    --no-hooks) HOOKS=0; shift ;;
    --label) echo "--label is no longer supported: the managed graph is AST-only and never calls a model." >&2; exit 2 ;;
    *) echo "graph.sh: unknown argument $1" >&2; exit 2 ;;
  esac
done
cd "$ROOT"
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi
export PATH="$PATH:$HOME/.local/bin"

# Pin new installs to the version exercised by the integration test. Existing
# installs are fingerprinted; changing versions invalidates their generations.
if ! command -v graphify >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install graphifyy==0.9.53
  elif command -v pipx >/dev/null 2>&1; then
    pipx install graphifyy==0.9.53
  else
    echo "Install uv or pipx, then install graphifyy==0.9.53 and rerun graph.sh." >&2
    exit 1
  fi
fi

mkdir -p .claude/core
for script in core.py graph.py; do
  if ! cmp -s "$SELF_DIR/$script" ".claude/core/$script"; then
    cp "$SELF_DIR/$script" ".claude/core/$script"
  fi
done

if [ "$HOOKS" -eq 1 ]; then
  if git rev-parse --git-dir >/dev/null 2>&1; then
    python3 .claude/core/graph.py install-hooks
  else
    echo "No Git repository: use graph.py watch for background refreshes." >&2
  fi
fi

# The cache lives in Git's worktree-specific metadata (or .core-graph outside
# Git). Legacy graphify-out is neither imported nor deleted: its provenance is
# unknown. Commit the vendored scripts, not generated graphs or source copies.
python3 .claude/core/graph.py sync
