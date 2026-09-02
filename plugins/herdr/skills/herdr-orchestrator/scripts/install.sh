#!/usr/bin/env bash
# Put `horch` on PATH for the orchestrator and every worker it spawns, and
# install the herdr agent integrations that give native session-id restore.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${HORCH_BIN_DIR:-$HOME/.local/bin}"

mkdir -p "$BIN_DIR"
ln -sf "$HERE/horch" "$BIN_DIR/horch"
echo "linked $BIN_DIR/horch -> $HERE/horch"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "WARNING: $BIN_DIR is not on your PATH. Workers will not find horch."
     echo "         Add it in your shell rc:  export PATH=\"$BIN_DIR:\$PATH\"" ;;
esac

if ! command -v herdr >/dev/null 2>&1; then
  echo "ERROR: herdr is not installed. See https://herdr.dev" >&2
  exit 1
fi

# Session identity integrations: these let herdr report and restore the native
# Claude Code / Codex session ids that `horch spawn --resume` relies on.
for agent in claude codex pi; do
  if command -v "$agent" >/dev/null 2>&1; then
    if herdr integration install "$agent" >/dev/null 2>&1; then
      echo "herdr integration installed: $agent"
    else
      echo "note: could not install herdr integration for $agent (continuing)"
    fi
  else
    echo "note: $agent not found on PATH - that tier will be unavailable"
  fi
done

# Install both skills for Claude Code, if it is the host agent.
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
if [ -d "$(dirname "$SKILLS_DIR")" ]; then
  mkdir -p "$SKILLS_DIR"
  for skill in herdr-orchestrator herdr-worker; do
    src="$(cd "$HERE/../.." && pwd)/$skill"
    [ -d "$src" ] || continue
    ln -sfn "$src" "$SKILLS_DIR/$skill"
    echo "linked skill: $SKILLS_DIR/$skill -> $src"
  done
fi

echo
echo "Done. From any project root:"
echo "  horch \"<what you want built>\"     launch a fleet"
echo
echo "That is the only command you need - it starts herdr, opens an orchestrator,"
echo "and hands it the job. The rest of horch is the orchestrator's toolkit."
