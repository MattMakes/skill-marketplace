#!/usr/bin/env bash
# Read text out of a pane or an agent, returned as a JSON string that is always
# safe to parse. Reading herdr directly can yield invalid JSON, because raw
# terminal escapes from the user's shell prompt land inside the response.
#
# Usage: read_pane.sh (--pane PANE_ID | --agent NAME) [--session NAME]
#                     [--source visible|recent|recent-unwrapped|detection]
#                     [--lines N] [--ansi]
# Output: {"ok":true,"target":...,"source":...,"text":"..."}
#
# --source recent-unwrapped is the default because logs and agent transcripts
# are what people usually want, and soft wrapping corrupts both.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; PANE=""; AGENT=""; SOURCE="recent-unwrapped"; LINES=""; ANSI=0
while [ $# -gt 0 ]; do
  case "$1" in
    --pane)    PANE="${2:-}"; shift 2 ;;
    --agent)   AGENT="${2:-}"; shift 2 ;;
    --session) OPT_SESSION="${2:-}"; shift 2 ;;
    --source)  SOURCE="${2:-}"; shift 2 ;;
    --lines)   LINES="${2:-}"; shift 2 ;;
    --ansi)    ANSI=1; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

[ -n "$PANE" ] || [ -n "$AGENT" ] || die "$EX_USAGE" "missing_target" "Pass --pane PANE_ID or --agent NAME."
[ -z "$PANE" ] || [ -z "$AGENT" ] || die "$EX_USAGE" "ambiguous_target" "Pass only one of --pane or --agent."

herdr_preflight

# herdr 0.8.2: `pane read --lines N` returns an empty body for every source,
# while `agent read --lines N` works and is also what pulls alternate-screen
# history for full-screen agents. So pass --lines through for agents, and for
# panes fetch the whole snapshot and trim locally instead.
trim_lines=""
if [ -n "$AGENT" ]; then
  cmd=(agent read "$AGENT"); target="$AGENT"
  [ -n "$LINES" ] && cmd+=(--lines "$LINES")
else
  cmd=(pane read "$PANE"); target="$PANE"
  trim_lines="$LINES"
fi
cmd+=(--source "$SOURCE")
[ "$ANSI" = 1 ] && cmd+=(--ansi)

herdr_must "${cmd[@]}"

# `pane read` prints raw text; `agent read` and friends may print JSON. Handle both.
printf '%s' "$HERDR_OUT" | TARGET="$target" SOURCE="$SOURCE" TRIM="$trim_lines" python3 -c '
import json, os, sys
raw = sys.stdin.read()
text = raw
try:
    doc = json.loads(raw)
    if isinstance(doc, dict):
        text = doc.get("result", {}).get("read", {}).get("text", raw)
except Exception:
    pass
trim = os.environ.get("TRIM", "")
if trim.isdigit() and int(trim) > 0:
    text = "\n".join(text.split("\n")[-int(trim):])
print(json.dumps({"ok": True, "target": os.environ["TARGET"],
                  "source": os.environ["SOURCE"], "text": text}))
'
