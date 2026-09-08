#!/usr/bin/env bash
# One-time setup: vendor the MLX port at its pinned commit, resolve the Python
# environment, and download the pinned model weights.
#
#   scripts/setup.sh [--skip-weights]
#
# Idempotent: safe to re-run. Exit 0 = ready, 1 = a prerequisite is missing.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

lock() { python3 -c "import json,sys;print(json.load(open('model.lock.json'))$1)"; }

[ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ] || {
  echo "error: Breeze TTS 2 MLX requires an Apple Silicon Mac (got $(uname -s)/$(uname -m))" >&2
  exit 1
}

for tool in uv sox ffmpeg; do
  command -v "$tool" >/dev/null || {
    echo "error: '$tool' not found. Install with: brew install uv sox ffmpeg" >&2
    exit 1
  }
done

echo "==> Python 3.12"
uv python install 3.12

PORT_DIR="$ROOT/$(lock "['port']['vendor_dir']")"
PORT_REPO="$(lock "['port']['repo']")"
PORT_COMMIT="$(lock "['port']['commit']")"
echo "==> vendored port @ ${PORT_COMMIT:0:12}"
if [ -d "$PORT_DIR/breeze_tts_mlx" ] && [ ! -d "$PORT_DIR/.git" ]; then
  # Already vendored into this repo at the pinned commit; nothing to fetch.
  echo "    using vendored source"
else
  if [ ! -d "$PORT_DIR/.git" ]; then
    rm -rf "$PORT_DIR"
    git clone --quiet "$PORT_REPO" "$PORT_DIR"
  fi
  git -C "$PORT_DIR" fetch --quiet origin "$PORT_COMMIT" 2>/dev/null || git -C "$PORT_DIR" fetch --quiet origin
  git -C "$PORT_DIR" checkout --quiet "$PORT_COMMIT"
fi

echo "==> dependencies"
uv sync

if [ "${1:-}" != "--skip-weights" ]; then
  WEIGHTS_REPO="$(lock "['weights']['repo']")"
  WEIGHTS_REV="$(lock "['weights']['revision']")"
  WEIGHTS_DIR="$ROOT/$(lock "['weights']['local_dir']")"
  echo "==> weights $WEIGHTS_REPO @ ${WEIGHTS_REV:0:12} (~3.8 GB) -> $WEIGHTS_DIR"
  uv run hf download "$WEIGHTS_REPO" --revision "$WEIGHTS_REV" --local-dir "$WEIGHTS_DIR"
fi

echo
echo "ready. Next: scripts/serve.sh --daemon && scripts/status.sh"
