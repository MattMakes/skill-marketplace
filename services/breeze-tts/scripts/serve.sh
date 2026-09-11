#!/usr/bin/env bash
# Start the narration service.
#
#   scripts/serve.sh              foreground (Ctrl-C to stop)
#   scripts/serve.sh --daemon     background; writes .server.pid and .server.log
#
# Env: BREEZE_TTS_PORT (8477), BREEZE_ENGINE (breeze|say), BREEZE_AUDIO_DEVICE (auto|mps|cpu)
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${BREEZE_TTS_PORT:-8477}"
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"

if [ -f .server.pid ] && kill -0 "$(cat .server.pid)" 2>/dev/null; then
  echo "already running (pid $(cat .server.pid)) on port $PORT" >&2
  exit 0
fi

# Localhost only: the weights are non-commercial licensed and this is a personal tool.
CMD=(uv run uvicorn breeze_service.app:app --host 127.0.0.1 --port "$PORT" --log-level warning)

if [ "${1:-}" = "--daemon" ]; then
  nohup "${CMD[@]}" > .server.log 2>&1 &
  echo $! > .server.pid
  echo "started pid $(cat .server.pid) on http://127.0.0.1:$PORT (log: .server.log)"
  echo "the model loads in the background; scripts/status.sh reports when it is ready"
else
  exec "${CMD[@]}"
fi
