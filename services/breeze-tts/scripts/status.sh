#!/usr/bin/env bash
# Probe the service. Prints the /health JSON.
# Exit 0 = ready, 3 = not reachable or still loading, 1 = engine failed to load.
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${BREEZE_TTS_PORT:-8477}"
URL="${BREEZE_TTS_URL:-http://127.0.0.1:$PORT}"

BODY="$(curl -fsS --max-time 3 "$URL/health" 2>/dev/null)" || {
  echo '{"status":"unreachable","url":"'"$URL"'"}'
  exit 3
}
echo "$BODY"
case "$(printf '%s' "$BODY" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("status",""))')" in
  ok) exit 0 ;;
  error) exit 1 ;;
  *) exit 3 ;;
esac
