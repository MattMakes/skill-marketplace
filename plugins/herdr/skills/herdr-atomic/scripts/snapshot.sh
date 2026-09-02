#!/usr/bin/env bash
# One compact, stable view of everything live: workspaces, panes, agents.
# Use this instead of stitching together three list commands and guessing at
# which fields matter.
#
# Usage: snapshot.sh [--session NAME] [--workspace ID]
# Output: {"ok":true,"workspaces":[...],"panes":[...],"agents":[...]}

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; WORKSPACE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --session)   OPT_SESSION="${2:-}"; shift 2 ;;
    --workspace) WORKSPACE="${2:-}"; shift 2 ;;
    -h|--help)   sed -n '2,10p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

herdr_preflight

herdr_must workspace list; ws="$HERDR_OUT"
if [ -n "$WORKSPACE" ]; then herdr_must pane list --workspace "$WORKSPACE"; else herdr_must pane list; fi
pn="$HERDR_OUT"
herdr_must agent list; ag="$HERDR_OUT"

jq -c -n --argjson ws "$ws" --argjson pn "$pn" --argjson ag "$ag" '
{ ok: true,
  workspaces: [ $ws.result.workspaces[]? | {workspace_id, label, tab_count, pane_count, focused} ],
  panes:      [ $pn.result.panes[]?      | {pane_id, tab_id, workspace_id, cwd, agent_status, focused} ],
  agents:     [ $ag.result.agents[]?     | {name, pane_id, kind: (.agent // null), status: (.agent_status // null)} ] }' \
