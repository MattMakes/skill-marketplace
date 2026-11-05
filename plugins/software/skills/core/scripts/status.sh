#!/usr/bin/env bash
# One call, one block: everything the skill needs to know before it decides
# what to do. This exists so priming does not begin with a dozen exploratory
# tool calls -- the shell can answer "is there a graph, is there an AGENTS.md
# tree, has software:keys installed it, where are the undocumented
# boundaries" for free, and the model only reads the answer.
#
# Usage: status.sh [--root DIR]

set -uo pipefail

ROOT="."
[ "${1:-}" = "--root" ] && { ROOT="$2"; shift 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || { echo "status.sh: cannot enter $ROOT" >&2; exit 2; }
ROOT_ABS="$(pwd)"
export PATH="$HOME/.local/bin:$PATH"

echo "== core status =="
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

# --- the graph -------------------------------------------------------------
if [ -f graphify-out/graph.json ]; then
  python3 - graphify-out/graph.json <<'PY'
import json, os, sys, time
p = sys.argv[1]
try:
    g = json.load(open(p))
except Exception:
    print("graph=unreadable"); raise SystemExit(0)
nodes = g.get("nodes", [])
edges = g.get("edges", g.get("links", []))
comms = {n.get("community") for n in nodes if isinstance(n, dict) and n.get("community") is not None}
mins = int((time.time() - os.path.getmtime(p)) / 60)
age = f"{mins}m" if mins < 90 else (f"{mins//60}h" if mins < 2880 else f"{mins//1440}d")
print(f"graph=ready nodes={len(nodes)} edges={len(edges)} communities={len(comms)} age={age}")
PY
  # Source files touched since the graph was written. A handful is normal; a
  # large number means the graph predates real work and `graphify update .`
  # has real ground to make up.
  # Drift is measured against the manifest, not against mtimes. `cp`, `git
  # clone` and `git checkout` all rewrite mtimes wholesale, so a timestamp
  # comparison reports either everything or nothing as stale depending on which
  # way the rewrite fell -- it once reported stale_files=0 on a repo that was
  # eight modules behind. The manifest records exactly which files the graph was
  # built from, so the honest question is a set difference, and that survives
  # being copied.
  if [ "$IS_GIT" -eq 1 ] && [ -f graphify-out/manifest.json ]; then
    git ls-files -co --exclude-standard > /tmp/.core-ondisk.$$ 2>/dev/null
    python3 - graphify-out/manifest.json /tmp/.core-ondisk.$$ <<'PY'
import json, os, sys
CODE = {".py",".ts",".tsx",".js",".jsx",".mjs",".cjs",".go",".rs",".java",".kt",
        ".scala",".rb",".php",".cs",".c",".h",".cc",".cpp",".hpp",".swift",".m",
        ".lua",".zig",".ex",".exs",".dart",".vue",".svelte",".sql"}
try:
    indexed = set(json.load(open(sys.argv[1])))
except Exception:
    print("unindexed_files=? removed_files=?"); raise SystemExit(0)
disk = {l.strip() for l in open(sys.argv[2]) if l.strip()}
# Tool-owned paths are not project code, and would otherwise report as
# permanent drift on every single prime.
SKIP = (".claude/", ".codex/", ".cursor/", "graphify-out/")
code = {f for f in disk
        if os.path.splitext(f)[1] in CODE and not f.startswith(SKIP)}
new = sorted(code - indexed)
gone = sorted(f for f in indexed - disk if os.path.splitext(f)[1] in CODE)
print(f"unindexed_files={len(new)} removed_files={len(gone)}")
if new:
    print("  never indexed: " + ", ".join(new[:6]) + (" …" if len(new) > 6 else ""))
PY
    rm -f /tmp/.core-ondisk.$$
  else
    echo "unindexed_files=n/a"
  fi
else
  echo "graph=absent"
fi

# --- hooks -----------------------------------------------------------------
if [ "$HAVE_GF" -eq 1 ] && [ "$IS_GIT" -eq 1 ]; then
  if graphify hook status 2>/dev/null | grep -q 'post-commit: installed'; then
    echo "git_hooks=installed"
  else
    echo "git_hooks=missing"
  fi
else
  echo "git_hooks=n/a"
fi

if [ -f .claude/settings.json ] && grep -q 'hook-guard' .claude/settings.json 2>/dev/null; then
  echo "claude_hooks=installed"
else
  echo "claude_hooks=missing"
fi

# --- instruction files: the AGENTS.md tree software:keys owns ---------------
# core does not write instruction files; software:keys, in this same plugin,
# builds and checks them. CORE_KEYS_DIR overrides the path to a skills/keys
# directory (for testing a keys checkout).
KEYS_DIR=""
d="${CORE_KEYS_DIR:-$SCRIPT_DIR/../../keys}"
[ -f "$d/scripts/keys.py" ] && KEYS_DIR="$(cd "$d" && pwd)"
echo "keys=${KEYS_DIR:-absent}"

TREE="$(python3 "$SCRIPT_DIR/core.py" check --root . 2>/dev/null)"
printf '%s\n' "$TREE"

KEYS_ERRORS=0
if [ -n "$KEYS_DIR" ]; then
  KC="$(python3 "$KEYS_DIR/scripts/keys.py" check --root . 2>/dev/null | tail -1)"
  echo "keys_check=${KC#keys check: }"
  KEYS_ERRORS="$(printf '%s' "$KC" | grep -Eo '[0-9]+ errors' | cut -d' ' -f1)"
fi

# --- undocumented boundaries ----------------------------------------------
echo "candidates:"
python3 "$SCRIPT_DIR/core.py" boundaries --root . --limit 12 2>/dev/null | sed 's/^/  /'

# --- what to do next -------------------------------------------------------
# BOOTSTRAP   keys has never been installed here
# REPAIR      keys is installed but the tree is unfinished or has drifted:
#             still unindexed, a CLAUDE.md left to fold, or keys check errors
# REFRESH     the tree is clean; a keys refresh only if candidates grew
# graphify_block is not part of the verdict: graph.sh writes that block itself.
val() { printf '%s\n' "$TREE" | grep "^$1=" | cut -d= -f2; }
if [ "$(val keys_root)" != "present" ]; then
  echo "verdict=BOOTSTRAP"
elif [ "$(val keys_indexed)" != "yes" ] || [ "$(val stray_claude_md)" -gt 0 ] || [ "${KEYS_ERRORS:-0}" -gt 0 ]; then
  echo "verdict=REPAIR"
else
  echo "verdict=REFRESH"
fi
