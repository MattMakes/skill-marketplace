#!/usr/bin/env bash
# Stop a service started with `serve.sh --daemon`. Exit 0 whether or not it was running.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .server.pid ]; then echo "not running"; exit 0; fi
PID="$(cat .server.pid)"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  for _ in $(seq 1 20); do kill -0 "$PID" 2>/dev/null || break; sleep 0.25; done
  kill -9 "$PID" 2>/dev/null || true
  echo "stopped pid $PID"
else
  echo "not running (stale pid $PID)"
fi
rm -f .server.pid
