#!/usr/bin/env bash
# One call, one block: everything the skill needs to know before it decides
# what to do. This exists so priming does not begin with a dozen exploratory
# tool calls -- the shell can answer "is there a graph, is there a CORE tree,
# is any of it broken, where are the undocumented boundaries" for free, and the
# model only reads the answer.
#
# Usage: status.sh [--root DIR]

set -uo pipefail

ROOT="."
[ "${1:-}" = "--root" ] && { ROOT="$2"; shift 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || { echo "status.sh: cannot enter $ROOT" >&2; exit 2; }
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi
ROOT_ABS="$(pwd)"
export PATH="$PATH:$HOME/.local/bin"

echo "== CORE status =="
echo "repo=$ROOT_ABS"

# --- git -------------------------------------------------------------------
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "git=yes branch=$(git branch --show-current 2>/dev/null || echo detached)"
  IS_GIT=1
else
  echo "git=no"
  IS_GIT=0
fi

# --- graphify --------------------------------------------------------------
if command -v graphify >/dev/null 2>&1; then
  echo "graphify=$(graphify --version 2>/dev/null | awk '{print $2}')"
  HAVE_GF=1
else
  echo "graphify=absent"
  HAVE_GF=0
fi

# --- graph freshness (same content hashes used by the query gateway) --------
python3 "$SCRIPT_DIR/graph.py" --root . status || true

# Hook presence is advisory. Every gateway query validates independently.
if [ "$IS_GIT" -eq 1 ]; then
  HOOK_DIR="$(git rev-parse --git-path hooks)"
  if grep -qs 'CORE graph freshness gateway' "$HOOK_DIR/post-commit"; then
    echo "git_hooks=installed"
  else
    echo "git_hooks=missing"
  fi
fi
if [ -f .claude/settings.json ] && grep -q '.claude/core/graph.py' .claude/settings.json; then
  echo "claude_hooks=installed"
else
  echo "claude_hooks=missing"
fi

# --- the CORE tree ---------------------------------------------------------
python3 "$SCRIPT_DIR/core.py" check --root . 2>/dev/null || echo "core_root=absent"

# A committed AGENTS.md symlink pointing at a gitignored CLAUDE.md dangles for
# everyone who clones the repo, which is a confusing way to find out.
if [ "$IS_GIT" -eq 1 ] && git check-ignore -q CLAUDE.md 2>/dev/null; then
  echo "claude_md_gitignored=yes (AGENTS.md symlinks will dangle on a fresh clone)"
else
  echo "claude_md_gitignored=no"
fi

# --- undocumented boundaries ----------------------------------------------
echo "candidates:"
python3 "$SCRIPT_DIR/core.py" boundaries --root . --limit 12 2>/dev/null | sed 's/^/  /'

# --- what to do next -------------------------------------------------------
CHECK="$(python3 "$SCRIPT_DIR/core.py" check --root . 2>/dev/null)"
ROOT_STATE="$(printf '%s' "$CHECK" | grep '^core_root=' | cut -d= -f2)"
# Only missing and broken links need repairing. A reversed pair
# (CLAUDE.md -> AGENTS.md) is a working setup using the opposite convention, and
# `core.py link` deliberately leaves it alone -- counting it here would send
# people to fix a repo that is not broken.
BROKEN="$(printf '%s' "$CHECK" | grep -Eo 'symlink_(missing|broken)=[0-9]+' | cut -d= -f2 | paste -sd+ - | bc 2>/dev/null || echo 0)"
CONFLICTS="$(printf '%s' "$CHECK" | grep '^core_conflicts=' | cut -d= -f2)"

if [ "$ROOT_STATE" != "present" ]; then
  echo "verdict=BOOTSTRAP"
elif [ "${BROKEN:-0}" -gt 0 ] || [ "$CONFLICTS" != "none" ]; then
  echo "verdict=REPAIR"
else
  echo "verdict=REFRESH"
fi
