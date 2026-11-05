#!/usr/bin/env bash
# Send literal terminal keys to a pane or an agent. This is how you answer a
# blocked agent's dialog, dismiss a menu, or interrupt a runaway process.
#
# Usage: send_keys.sh (--agent NAME | --pane PANE_ID) KEY [KEY...] [--session NAME]
#        send_keys.sh (--agent NAME | --pane PANE_ID) --text "LITERAL TEXT"
# Output: {"ok":true,"target":...,"sent":[...]}
#
# Keys use herdr's combo syntax: printable keys (a), named keys (enter, tab,
# esc, backspace, up, down, left, right), chords (ctrl+c, alt+x, shift+tab),
# function keys (f1), and named punctuation (minus, plus, backtick).
#
# --text types characters without submitting. Use run_cmd.sh to run a command;
# it submits atomically and reports the exit code, which typing plus enter cannot.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; AGENT=""; PANE=""; TEXT=""; KEYS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --agent)   AGENT="${2:-}"; shift 2 ;;
    --pane)    PANE="${2:-}"; shift 2 ;;
    --session) OPT_SESSION="${2:-}"; shift 2 ;;
    --text)    TEXT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) KEYS+=("$1"); shift ;;
  esac
done

[ -n "$AGENT" ] || [ -n "$PANE" ] || die "$EX_USAGE" "missing_target" "Pass --agent NAME or --pane PANE_ID."
[ -z "$AGENT" ] || [ -z "$PANE" ] || die "$EX_USAGE" "ambiguous_target" "Pass only one of --agent or --pane."

herdr_preflight

if [ -n "$TEXT" ]; then
  [ -n "$PANE" ] || die "$EX_USAGE" "text_needs_pane" "--text writes raw characters and requires --pane."
  herdr_must pane send-text "$PANE" "$TEXT"
  jq -c -n --arg t "$PANE" --arg x "$TEXT" '{ok:true,target:$t,sent:[$x]}'
  exit 0
fi

[ ${#KEYS[@]} -gt 0 ] || die "$EX_USAGE" "missing_keys" "Give at least one key, or use --text."

if [ -n "$AGENT" ]; then herdr_must agent send-keys "$AGENT" "${KEYS[@]}"; target="$AGENT"
else                     herdr_must pane send-keys  "$PANE"  "${KEYS[@]}"; target="$PANE"; fi

printf '{"ok":true,"target":%s,"sent":%s}\n' "$(json_str "$target")" \
  "$(printf '%s\n' "${KEYS[@]}" | jq -R . | jq -c -s .)"
