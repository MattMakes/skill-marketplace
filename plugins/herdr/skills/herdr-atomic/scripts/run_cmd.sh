#!/usr/bin/env bash
# Run a shell command in a pane and get its real exit code and output back.
#
# herdr's `pane run` types a command into a terminal and returns immediately —
# there is no exit status and no completion signal. This script supplies both by
# appending a unique end-marker that carries $? , then waiting for that marker.
#
# Usage: run_cmd.sh --cmd "COMMAND" [--pane PANE_ID | --new-pane]
#                   [--session NAME] [--timeout MS] [--cwd PATH]
#                   [--direction right|down] [--keep-pane]
# Output: {"ok":true,"pane_id":...,"exit_code":N,"output":"..."}
# Exit:   0 command ran (check exit_code for its result), 5 timed out.
#
# Note that exit_code is the command's status, not this script's. A command that
# fails is still a successful measurement, so the script exits 0 and reports it.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; CMD=""; PANE=""; NEW_PANE=0; TIMEOUT="120000"; CWD=""; DIRECTION="right"; KEEP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --cmd)       CMD="${2:-}"; shift 2 ;;
    --pane)      PANE="${2:-}"; shift 2 ;;
    --new-pane)  NEW_PANE=1; shift ;;
    --session)   OPT_SESSION="${2:-}"; shift 2 ;;
    --timeout)   TIMEOUT="${2:-}"; shift 2 ;;
    --cwd)       CWD="${2:-}"; shift 2 ;;
    --direction) DIRECTION="${2:-}"; shift 2 ;;
    --keep-pane) KEEP=1; shift ;;
    -h|--help)   sed -n '2,18p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

[ -n "$CMD" ] || die "$EX_USAGE" "missing_cmd" "--cmd is required."

herdr_preflight

created_pane=0
if [ "$NEW_PANE" = 1 ] || [ -z "$PANE" ]; then
  np_args=(--where split --direction "$DIRECTION")
  [ -n "$CWD" ] && np_args+=(--cwd "$CWD")
  [ -n "${OPT_SESSION:-}" ] && np_args+=(--session "$OPT_SESSION")
  out="$("$DIR/new_pane.sh" "${np_args[@]}")" || { printf '%s\n' "$out"; exit $?; }
  PANE="$(jqr "$out" '.pane_id')"
  created_pane=1
fi

TOK="$(new_token)"
# The command runs in a subshell so that `exit`, `set -e`, or a `cd` inside it
# cannot kill or relocate the pane's long-lived shell. The marker prints $? from
# the subshell, which is the command's real status.
#
# The marker template prints "rc=%s"; the echoed command line therefore contains
# the literal "rc=%s" while only the *result* line contains "rc=<digits>". That
# is what keeps the regex from matching herdr's own echo of the command.
wrapped="( $CMD ) ; printf '$TOK rc=%s\\n' \"\$?\""

herdr_must pane run "$PANE" "$wrapped"

herdr_call pane wait-output "$PANE" --regex "$TOK rc=[0-9]+" --timeout "$TIMEOUT"
if [ "$HERDR_RC" -ne 0 ]; then
  code="$(herdr_err_code "$HERDR_ERR")"; [ -z "$code" ] && code="cli_error"
  if [ "$code" = "timeout" ]; then
    die "$EX_TIMEOUT" "timeout" "Command did not finish within ${TIMEOUT}ms in pane $PANE. It may still be running; read the pane with read_pane.sh."
  fi
  die "$(map_err_exit "$code")" "$code" "$(herdr_err_message "$HERDR_ERR")"
fi

result="$HERDR_OUT"

# Slice the transcript between herdr's echo of the wrapped command and the
# marker line, so the caller gets the command's output and nothing else.
printf '%s' "$result" | TOK="$TOK" PANE="$PANE" python3 -c '
import json, os, re, sys
tok = os.environ["TOK"]
doc = json.load(sys.stdin)
res = doc.get("result", {})
text = res.get("read", {}).get("text", "") or ""
lines = text.split("\n")
done = re.compile(re.escape(tok) + r" rc=(\d+)\s*$")
end = None
for i in range(len(lines) - 1, -1, -1):
    m = done.search(lines[i])
    if m:
        end, rc = i, int(m.group(1))
        break
if end is None:
    m = done.search(res.get("matched_line", "") or "")
    print(json.dumps({"ok": False, "error": "marker_not_found",
                      "message": "Command finished but its end-marker could not be located in the transcript."}))
    sys.exit(8)
start = 0
for i in range(end - 1, -1, -1):
    if tok in lines[i]:      # herdr echoing the wrapped command back
        start = i + 1
        break
out = "\n".join(lines[start:end]).strip("\n")
print(json.dumps({"ok": True, "pane_id": os.environ["PANE"], "exit_code": rc, "output": out}))
'
status=$?

if [ "$created_pane" = 1 ] && [ "$KEEP" = 0 ]; then
  herdr_call pane close "$PANE"
fi
exit $status
