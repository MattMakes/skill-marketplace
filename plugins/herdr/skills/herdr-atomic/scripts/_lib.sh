#!/usr/bin/env bash
# Shared contract for every herdr-atomic script.
# Sourced, never executed directly.

set -uo pipefail

MIN_HERDR_VERSION="0.8.2"

# Exit codes. Every script uses these and only these, so a caller can branch
# on the number alone without reading stdout or parsing prose.
EX_OK=0            # success
EX_USAGE=2         # bad arguments to this script
EX_GUARD=3         # not inside a herdr pane and no explicit session given
EX_ENV=4           # server not running, or herdr too old / missing
EX_TIMEOUT=5       # a wait exceeded its timeout
EX_BLOCKED=6       # agent sits at an approval/question prompt
EX_NOTFOUND=7      # pane / agent / workspace target does not exist
EX_HERDR=8         # any other herdr server error

die() { # die <exit_code> <error_code> <message>
  local ec="$1" code="$2" msg="$3"
  emit_json "{\"ok\":false,\"error\":$(json_str "$code"),\"message\":$(json_str "$msg")}"
  exit "$ec"
}

# JSON string escaping without depending on jq being present for output.
json_str() {
  printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

emit_json() { printf '%s\n' "$1"; }

# herdr writes raw terminal bytes (ESC sequences from the user's shell prompt)
# straight into JSON string values, which makes the document invalid and breaks
# jq. Strip C0 controls and DEL bytewise; real content is already backslash
# escaped, so nothing legitimate is lost.
sanitize_json() { LC_ALL=C tr -d '\000-\010\013-\037\177'; }

# Run a herdr command, capturing sanitized stdout and raw stderr.
# Sets: HERDR_OUT, HERDR_ERR, HERDR_RC
herdr_call() {
  local err_file; err_file="$(mktemp)"
  HERDR_OUT="$("$HERDR_BIN" "$@" 2>"$err_file" | sanitize_json)"
  HERDR_RC=$?
  HERDR_ERR="$(sanitize_json <"$err_file")"
  rm -f "$err_file"
  return 0
}

# herdr reports errors in two shapes: {"error":{"code":..}} for most commands
# and a bare {"code":..} for waits. Read whichever is present.
herdr_err_code() {
  printf '%s' "${1:-}" | jq -r '(.error.code // .code // empty)' 2>/dev/null
}

herdr_err_message() {
  local m; m="$(printf '%s' "${1:-}" | jq -r '(.error.message // .message // empty)' 2>/dev/null)"
  [ -n "$m" ] && { printf '%s' "$m"; return; }
  printf '%s' "${1:-}" | head -c 200
}

# Map a herdr error code onto our exit-code contract.
map_err_exit() {
  case "$1" in
    timeout|agent_prompt_stalled) echo "$EX_TIMEOUT" ;;
    agent_blocked|agent_not_ready) echo "$EX_BLOCKED" ;;
    pane_not_found|agent_not_found|workspace_not_found|tab_not_found|agent_not_running) echo "$EX_NOTFOUND" ;;
    *) echo "$EX_HERDR" ;;
  esac
}

# Run a herdr command and abort with the mapped exit code on failure.
herdr_must() {
  herdr_call "$@"
  if [ "$HERDR_RC" -ne 0 ]; then
    local code; code="$(herdr_err_code "$HERDR_ERR")"
    [ -z "$code" ] && code="$(herdr_err_code "$HERDR_OUT")"
    [ -z "$code" ] && code="cli_error"
    local detail; detail="$(printf '%s' "$HERDR_ERR" | jq -r '(.error.message // .message // empty)' 2>/dev/null)"
    [ -z "$detail" ] && detail="$(printf '%s' "$HERDR_ERR" | head -c 300)"
    if [ "$HERDR_RC" -eq 2 ]; then
      die "$EX_USAGE" "cli_usage" "herdr rejected the command syntax: $detail"
    fi
    die "$(map_err_exit "$code")" "$code" "${detail:-herdr command failed}"
  fi
}

jqr() { printf '%s' "$1" | jq -r "$2" 2>/dev/null; }

version_ge() { # version_ge <have> <want>
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -t. -k1,1n -k2,2n -k3,3n | head -1)" = "$2" ]
}

# --- preflight -------------------------------------------------------------
# Establishes: HERDR_BIN, HERDR_SESSION_ARGS, HERDR_VERSION.
#
# The guard exists so a script never *implicitly* drives the session a human is
# looking at. Acting inside a herdr pane is explicit (the user put us there);
# naming a session is explicit too. Neither means we have no business issuing
# commands, so we stop.
herdr_preflight() {
  HERDR_BIN="${HERDR_BIN:-$(command -v herdr || true)}"
  if [ -z "$HERDR_BIN" ] && [ -x "$HOME/.local/bin/herdr" ]; then
    HERDR_BIN="$HOME/.local/bin/herdr"
  fi
  [ -x "${HERDR_BIN:-}" ] || die "$EX_ENV" "herdr_not_installed" \
    "herdr is not on PATH. Install it from https://herdr.dev/docs/install/"

  command -v jq >/dev/null 2>&1 || die "$EX_ENV" "jq_missing" "jq is required but not on PATH."
  command -v python3 >/dev/null 2>&1 || die "$EX_ENV" "python3_missing" "python3 is required but not on PATH."

  HERDR_VERSION="$("$HERDR_BIN" --version 2>/dev/null | awk '{print $2}')"
  version_ge "${HERDR_VERSION:-0}" "$MIN_HERDR_VERSION" || die "$EX_ENV" "herdr_too_old" \
    "herdr $HERDR_VERSION is installed but these scripts need $MIN_HERDR_VERSION or newer. Run: herdr update"

  # Session targeting. An explicit --session beats HERDR_SESSION, which beats
  # being inside a pane (which uses the ambient default session).
  if [ -n "${OPT_SESSION:-}" ]; then
    export HERDR_SESSION="$OPT_SESSION"
  elif [ -n "${HERDR_SESSION:-}" ]; then
    export HERDR_SESSION
  elif [ "${HERDR_ENV:-}" != "1" ]; then
    die "$EX_GUARD" "not_in_herdr" \
      "Refusing to act: not running inside a herdr pane (HERDR_ENV is not 1) and no session was named. Pass --session NAME to target a session explicitly."
  fi

  local status; status="$("$HERDR_BIN" status server 2>/dev/null)"
  printf '%s' "$status" | grep -q 'status: running' || die "$EX_ENV" "server_not_running" \
    "No herdr server is running for session '${HERDR_SESSION:-default}'. Start one with: herdr"
}

# --- created-resource manifest --------------------------------------------
# cleanup.sh may only close what these scripts created. Recording it mechanically
# is what makes "never close what you did not create" enforceable rather than a
# rule someone has to remember.
manifest_path() {
  local dir="${HERDR_ATOMIC_STATE:-$HOME/.cache/herdr-atomic}/${HERDR_SESSION:-default}"
  mkdir -p "$dir"
  printf '%s/created.jsonl' "$dir"
}

manifest_record() { # manifest_record <kind> <id> [label]
  local ts; ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"kind":%s,"id":%s,"label":%s,"created_at":%s}\n' \
    "$(json_str "$1")" "$(json_str "$2")" "$(json_str "${3:-}")" "$(json_str "$ts")" \
    >> "$(manifest_path)"
}

# Unique per invocation. A reused pane keeps old sentinels in its scrollback and
# wait-output matches text that is already there, so a stable token would match
# a previous run instantly and report its exit code.
new_token() {
  printf 'HERDRATOMIC%s' "$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')"
}
