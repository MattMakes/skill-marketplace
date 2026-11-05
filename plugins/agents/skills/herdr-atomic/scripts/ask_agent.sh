#!/usr/bin/env bash
# Send a prompt to a running agent, wait for it to settle, and return its reply.
#
# This is the whole round trip in one call: prompt, wait for a settled lifecycle
# state, then read the transcript. Doing it by hand is three commands with three
# different failure modes, and the middle one is easy to skip by accident, which
# yields a read of the agent's *previous* answer.
#
# Usage: ask_agent.sh --agent NAME --prompt "TEXT" [--session NAME]
#                     [--timeout MS] [--lines N] [--until STATUS]... [--no-read]
# Output: {"ok":true,"agent":...,"status":...,"text":"..."}
# Exit:   6 if the agent is or becomes blocked, 5 on timeout.
#
# A blocked agent is deliberately not answered here. herdr refuses to type into
# an approval dialog, and guessing a response to a question you have not read is
# how automation approves things nobody intended.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; AGENT=""; PROMPT=""; TIMEOUT="300000"; LINES="200"; NOREAD=0; UNTIL=()
while [ $# -gt 0 ]; do
  case "$1" in
    --agent)   AGENT="${2:-}"; shift 2 ;;
    --prompt)  PROMPT="${2:-}"; shift 2 ;;
    --session) OPT_SESSION="${2:-}"; shift 2 ;;
    --timeout) TIMEOUT="${2:-}"; shift 2 ;;
    --lines)   LINES="${2:-}"; shift 2 ;;
    --until)   UNTIL+=("${2:-}"); shift 2 ;;
    --no-read) NOREAD=1; shift ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

[ -n "$AGENT" ]  || die "$EX_USAGE" "missing_agent" "--agent is required."
[ -n "$PROMPT" ] || die "$EX_USAGE" "missing_prompt" "--prompt is required."

herdr_preflight

cmd=(agent prompt "$AGENT" "$PROMPT" --wait --timeout "$TIMEOUT")
for u in "${UNTIL[@]:-}"; do [ -n "$u" ] && cmd+=(--until "$u"); done

herdr_call "${cmd[@]}"
if [ "$HERDR_RC" -ne 0 ]; then
  code="$(herdr_err_code "$HERDR_ERR")"; [ -z "$code" ] && code="cli_error"
  msg="$(herdr_err_message "$HERDR_ERR")"
  case "$code" in
    agent_blocked)
      die "$EX_BLOCKED" "agent_blocked" "Agent '$AGENT' is at an approval or question prompt and was not sent the prompt. Read it with read_pane.sh --agent $AGENT, then answer deliberately with send_keys." ;;
    agent_prompt_stalled)
      die "$EX_TIMEOUT" "agent_prompt_stalled" "Agent '$AGENT' accepted the prompt but never changed state. It may be wedged; read the pane." ;;
  esac
  die "$(map_err_exit "$code")" "$code" "$msg"
fi

status="$(jqr "$HERDR_OUT" '.result.agent.agent_status // .result.agent.status // "unknown"')"

if [ "$NOREAD" = 1 ]; then
  jq -c -n --arg a "$AGENT" --arg s "$status" '{ok:true,agent:$a,status:$s,text:null}'
  exit 0
fi

read_args=(--agent "$AGENT" --source recent-unwrapped --lines "$LINES")
[ -n "${OPT_SESSION:-}" ] && read_args+=(--session "$OPT_SESSION")
text_json="$("$DIR/read_pane.sh" "${read_args[@]}")" || true

out="$(jq -c -n --arg a "$AGENT" --arg s "$status" --argjson r "${text_json:-{\}}" \
  '{ok:true,agent:$a,status:$s,text:($r.text // null)}')"
printf '%s\n' "$out"

# blocked is a real outcome, not an error, but it must not read as success.
[ "$status" = "blocked" ] && exit "$EX_BLOCKED"
exit 0
