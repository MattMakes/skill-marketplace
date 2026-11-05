#!/usr/bin/env bash
# Block until something is true, then return. Two things are worth waiting on:
# an agent reaching a settled lifecycle state, or text appearing in a pane.
#
# Usage: wait_for.sh --agent NAME [--until idle|done|blocked|working|unknown]...
#        wait_for.sh --pane PANE_ID (--match TEXT | --regex PATTERN) [--lines N]
#        common: [--session NAME] [--timeout MS]
# Output: {"ok":true,"kind":"agent","status":...} | {"ok":true,"kind":"output","matched_line":...}
# Exit:   5 on timeout, 6 if the agent is blocked and blocked was not requested.
#
# A timeout is a real answer, not a crash: it means the thing did not happen in
# the time allowed, and the caller should decide whether to keep waiting.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; AGENT=""; PANE=""; MATCH=""; REGEX=""; LINES=""; TIMEOUT=""; UNTIL=()
while [ $# -gt 0 ]; do
  case "$1" in
    --agent)   AGENT="${2:-}"; shift 2 ;;
    --pane)    PANE="${2:-}"; shift 2 ;;
    --until)   UNTIL+=("${2:-}"); shift 2 ;;
    --match)   MATCH="${2:-}"; shift 2 ;;
    --regex)   REGEX="${2:-}"; shift 2 ;;
    --lines)   LINES="${2:-}"; shift 2 ;;
    --timeout) TIMEOUT="${2:-}"; shift 2 ;;
    --session) OPT_SESSION="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

herdr_preflight

if [ -n "$AGENT" ]; then
  cmd=(agent wait "$AGENT")
  for u in "${UNTIL[@]:-}"; do [ -n "$u" ] && cmd+=(--until "$u"); done
  [ -n "$TIMEOUT" ] && cmd+=(--timeout "$TIMEOUT")
  herdr_call "${cmd[@]}"
  if [ "$HERDR_RC" -ne 0 ]; then
    code="$(herdr_err_code "$HERDR_ERR")"; [ -z "$code" ] && code="cli_error"
    die "$(map_err_exit "$code")" "$code" "$(herdr_err_message "$HERDR_ERR")"
  fi
  status="$(jqr "$HERDR_OUT" '.result.agent.agent_status // .result.agent.status // .result.status // "unknown"')"
  # Surface blocked through the exit code unless the caller asked for it, so a
  # script that was waiting for work to finish does not mistake an approval
  # dialog for completion.
  want_blocked=0; for u in "${UNTIL[@]:-}"; do [ "$u" = "blocked" ] && want_blocked=1; done
  if [ "$status" = "blocked" ] && [ "$want_blocked" = 0 ]; then
    die "$EX_BLOCKED" "agent_blocked" "Agent '$AGENT' is waiting at an approval or question prompt. Read it before answering."
  fi
  jq -c -n --arg s "$status" --arg a "$AGENT" '{ok:true,kind:"agent",agent:$a,status:$s}'
elif [ -n "$PANE" ]; then
  [ -n "$MATCH" ] || [ -n "$REGEX" ] || die "$EX_USAGE" "missing_pattern" "--pane needs --match TEXT or --regex PATTERN."
  cmd=(pane wait-output "$PANE")
  [ -n "$MATCH" ] && cmd+=(--match "$MATCH")
  [ -n "$REGEX" ] && cmd+=(--regex "$REGEX")
  [ -n "$LINES" ] && cmd+=(--lines "$LINES")
  [ -n "$TIMEOUT" ] && cmd+=(--timeout "$TIMEOUT")
  herdr_call "${cmd[@]}"
  if [ "$HERDR_RC" -ne 0 ]; then
    code="$(herdr_err_code "$HERDR_ERR")"; [ -z "$code" ] && code="cli_error"
    die "$(map_err_exit "$code")" "$code" "$(herdr_err_message "$HERDR_ERR")"
  fi
  jq -c -n --argjson r "$HERDR_OUT" --arg p "$PANE" \
    '{ok:true,kind:"output",pane_id:$p,matched_line:($r.result.matched_line // null)}'
else
  die "$EX_USAGE" "missing_target" "Pass --agent NAME or --pane PANE_ID."
fi
