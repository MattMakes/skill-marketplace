#!/usr/bin/env bash
# Verify the environment is fit to drive herdr, and report what is live.
# Run this first when you are unsure; every other script performs the same
# checks internally, so it is never required.
#
# Usage: preflight.sh [--session NAME]
# Output: {"ok":true,"version":...,"session":...,"inside_pane":bool,
#          "caller":{"workspace_id","tab_id","pane_id"},"counts":{...}}

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""
while [ $# -gt 0 ]; do
  case "$1" in
    --session) OPT_SESSION="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

herdr_preflight

herdr_must workspace list; ws="$HERDR_OUT"
herdr_must pane list;      pn="$HERDR_OUT"
herdr_must agent list;     ag="$HERDR_OUT"

printf '{"ok":true,"version":%s,"session":%s,"inside_pane":%s,"caller":{"workspace_id":%s,"tab_id":%s,"pane_id":%s},"counts":{"workspaces":%s,"panes":%s,"agents":%s}}\n' \
  "$(json_str "$HERDR_VERSION")" \
  "$(json_str "${HERDR_SESSION:-default}")" \
  "$([ "${HERDR_ENV:-}" = 1 ] && echo true || echo false)" \
  "$(json_str "${HERDR_WORKSPACE_ID:-}")" \
  "$(json_str "${HERDR_TAB_ID:-}")" \
  "$(json_str "${HERDR_PANE_ID:-}")" \
  "$(jqr "$ws" '.result.workspaces | length')" \
  "$(jqr "$pn" '.result.panes | length')" \
  "$(jqr "$ag" '.result.agents | length')"
