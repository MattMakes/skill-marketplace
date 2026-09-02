#!/usr/bin/env bash
# Put a coding agent in its own pane and return once it is ready for a prompt.
#
# herdr splits these into two operations with a precondition between them:
# `agent start` needs a pane that already exists and is sitting at its shell
# prompt, and it never creates layout itself. This script does both halves and
# reports one result, so a caller cannot start an agent into a pane that is busy.
#
# Usage: spawn_agent.sh --kind KIND [--name NAME] [--pane PANE_ID]
#                       [--session NAME] [--direction right|down] [--cwd PATH]
#                       [--timeout MS] [--focus] [-- AGENT_ARGS...]
# Output: {"ok":true,"agent":NAME,"pane_id":...,"kind":...,"status":...}
# Exit:   6 if the agent came up blocked (it exists; read it before answering).
#
# Kinds: pi claude codex gemini cursor devin agy cline omp mastracode opencode
#        copilot kimi kiro droid amp grok hermes kilo qodercli qwen maki

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; KIND=""; NAME=""; PANE=""; DIRECTION="right"; CWD=""; TIMEOUT=""; FOCUS="--no-focus"; AGENT_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --kind)      KIND="${2:-}"; shift 2 ;;
    --name)      NAME="${2:-}"; shift 2 ;;
    --pane)      PANE="${2:-}"; shift 2 ;;
    --session)   OPT_SESSION="${2:-}"; shift 2 ;;
    --direction) DIRECTION="${2:-}"; shift 2 ;;
    --cwd)       CWD="${2:-}"; shift 2 ;;
    --timeout)   TIMEOUT="${2:-}"; shift 2 ;;
    --focus)     FOCUS="--focus"; shift ;;
    --) shift; AGENT_ARGS=("$@"); break ;;
    -h|--help)   sed -n '2,18p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

[ -n "$KIND" ] || die "$EX_USAGE" "missing_kind" "--kind is required. See --help for the supported list."

# herdr requires [a-z][a-z0-9_-]{0,31} and uniqueness among live agents. Derive a
# valid name rather than making the caller invent one that might collide.
if [ -z "$NAME" ]; then
  NAME="$(printf '%s' "$KIND" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')_$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')"
fi
printf '%s' "$NAME" | grep -Eq '^[a-z][a-z0-9_-]{0,31}$' || die "$EX_USAGE" "bad_name" \
  "Agent name '$NAME' is invalid. herdr requires [a-z][a-z0-9_-]{0,31}."

herdr_preflight

if [ -z "$PANE" ]; then
  np_args=(--where split --direction "$DIRECTION" "$FOCUS")
  [ -n "$CWD" ] && np_args+=(--cwd "$CWD")
  [ -n "${OPT_SESSION:-}" ] && np_args+=(--session "$OPT_SESSION")
  out="$("$DIR/new_pane.sh" "${np_args[@]}")" || { printf '%s\n' "$out"; exit $?; }
  PANE="$(jqr "$out" '.pane_id')"
fi

# `agent start` requires the pane's own shell to hold the foreground. Checking
# first turns a confusing mid-start failure into a clear precondition error.
#
# The reliable signal is the foreground process *group* matching the shell's own
# pid. Counting foreground processes does not work: a shell that is still
# sourcing its rc files briefly shows several helper subprocesses while being
# perfectly idle. So poll for a settled shell before giving up.
settled=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  herdr_must pane process-info --pane "$PANE"
  fg_pgid="$(jqr "$HERDR_OUT" '.result.process_info.foreground_process_group_id')"
  shell_pid="$(jqr "$HERDR_OUT" '.result.process_info.shell_pid')"
  if [ -n "$fg_pgid" ] && [ "$fg_pgid" = "$shell_pid" ]; then settled=1; break; fi
  sleep 0.5
done
if [ "$settled" = 0 ]; then
  busy="$(jqr "$HERDR_OUT" '[.result.process_info.foreground_processes[].name] | unique | join(", ")')"
  die "$EX_HERDR" "pane_busy" "Pane $PANE is running: $busy. agent start needs a pane idle at its shell prompt."
fi

start=(agent start "$NAME" --kind "$KIND" --pane "$PANE")
[ -n "$TIMEOUT" ] && start+=(--timeout "$TIMEOUT")
[ ${#AGENT_ARGS[@]} -gt 0 ] && start+=(-- "${AGENT_ARGS[@]}")

herdr_call "${start[@]}"
if [ "$HERDR_RC" -ne 0 ]; then
  code="$(herdr_err_code "$HERDR_ERR")"; [ -z "$code" ] && code="cli_error"
  msg="$(herdr_err_message "$HERDR_ERR")"
  if [ "$code" = "agent_not_ready" ]; then
    # The agent is alive but sitting at a prompt (often a trust or login dialog).
    # Report the pane so the caller can read it instead of retrying blindly.
    die "$EX_BLOCKED" "agent_not_ready" "Agent '$NAME' started in pane $PANE but is blocked at a prompt. Read it with read_pane.sh --agent $NAME."
  fi
  die "$(map_err_exit "$code")" "$code" "$msg"
fi

manifest_record agent "$NAME" "$KIND"

# `agent start` can return success while the agent is still painting a first-run
# dialog, and herdr reports that moment as `unknown` rather than `blocked`. That
# gap is dangerous: the very next prompt sends Enter, which activates whatever
# option the dialog has highlighted. Claude Code highlights "No, exit" on its
# trust prompt, so an eager prompt silently kills the agent it just started.
#
# So do not report success on `unknown`. Wait for a genuinely settled state.
herdr_call agent wait "$NAME" --until idle --until done --until blocked --timeout "${TIMEOUT:-30000}"
herdr_call agent get "$NAME"
status="$(jqr "$HERDR_OUT" '.result.agent.agent_status // "unknown"')"

if [ "$status" = "blocked" ]; then
  die "$EX_BLOCKED" "agent_blocked" "Agent '$NAME' started in pane $PANE but is waiting at a dialog (often a first-run trust or login prompt). Read it with read_pane.sh --agent $NAME, then answer it with send_keys.sh before prompting."
fi
if [ "$status" != "idle" ] && [ "$status" != "done" ]; then
  die "$EX_BLOCKED" "agent_not_settled" "Agent '$NAME' started in pane $PANE but never reached a ready state (status: $status). Read the pane before prompting it."
fi

jq -c -n --arg n "$NAME" --arg p "$PANE" --arg k "$KIND" --arg s "$status" \
  '{ok:true,agent:$n,pane_id:$p,kind:$k,status:$s}'
