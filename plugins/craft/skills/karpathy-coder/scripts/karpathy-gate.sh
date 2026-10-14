#!/bin/bash
# Karpathy Gate — pre-commit hook (non-blocking)
#
# Runs complexity_checker and diff_surgeon on staged files. Prints warnings
# but does NOT block the commit — the goal is awareness, not enforcement.
#
# To install as a Husky pre-commit hook, copy this skill's scripts/ directory
# into the repo (e.g. tools/karpathy/) and point Husky at the copy:
#   npx husky add .husky/pre-commit "bash tools/karpathy/karpathy-gate.sh"
#
# To install as a Claude Code PostToolUse hook (in .claude/settings.json):
#   {
#     "hooks": {
#       "PostToolUse": [{
#         "matcher": "Bash",
#         "hooks": [{
#           "type": "command",
#           "command": "${CLAUDE_PLUGIN_ROOT}/skills/karpathy-coder/scripts/karpathy-gate.sh"
#         }]
#       }]
#     }
#   }

set -e

# The Python tools live next to this script.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Only run on git commit operations
if [ -z "$(git diff --staged --name-only 2>/dev/null)" ]; then
    exit 0
fi

echo "--- Karpathy Gate ---"

# Get changed Python/TS files
CHANGED_FILES=$(git diff --staged --name-only --diff-filter=ACMR | grep -E '\.(py|ts|tsx|js|jsx)$' || true)

if [ -n "$CHANGED_FILES" ]; then
    echo "[simplicity] checking complexity..."
    for f in $CHANGED_FILES; do
        python3 "$SCRIPT_DIR/complexity_checker.py" "$f" --threshold medium 2>/dev/null | grep -E "^\s+\[WARN\]" || true
    done
fi

echo "[surgical] checking diff noise..."
python3 "$SCRIPT_DIR/diff_surgeon.py" 2>/dev/null | grep -E "Noise ratio:|Verdict:" || true

echo "--- /Karpathy Gate ---"
exit 0
