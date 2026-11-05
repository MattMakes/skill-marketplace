#!/usr/bin/env bash
# Create one terminal pane and return its ID. This is the single entry point for
# making a place to work, so callers never have to remember which of
# workspace/tab/split returns which JSON path.
#
# Usage: new_pane.sh [--session NAME] [--where split|tab|workspace]
#                    [--from PANE_ID|--current] [--direction right|down]
#                    [--cwd PATH] [--label TEXT] [--focus] [--ratio FLOAT]
# Output: {"ok":true,"pane_id":...,"tab_id":...,"workspace_id":...}
#
# Defaults are the safe ones: split the current pane, to the right, without
# stealing the human's focus.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; WHERE="split"; FROM=""; DIRECTION="right"; CWD=""; LABEL=""; FOCUS="--no-focus"; RATIO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --session)   OPT_SESSION="${2:-}"; shift 2 ;;
    --where)     WHERE="${2:-}"; shift 2 ;;
    --from)      FROM="${2:-}"; shift 2 ;;
    --current)   FROM="current"; shift ;;
    --direction) DIRECTION="${2:-}"; shift 2 ;;
    --cwd)       CWD="${2:-}"; shift 2 ;;
    --label)     LABEL="${2:-}"; shift 2 ;;
    --ratio)     RATIO="${2:-}"; shift 2 ;;
    --focus)     FOCUS="--focus"; shift ;;
    --no-focus)  FOCUS="--no-focus"; shift ;;
    -h|--help)   sed -n '2,14p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

case "$WHERE" in split|tab|workspace) ;; *) die "$EX_USAGE" "bad_argument" "--where must be split, tab, or workspace (got '$WHERE')" ;; esac
case "$DIRECTION" in right|down) ;; *) die "$EX_USAGE" "bad_argument" "--direction must be right or down (got '$DIRECTION')" ;; esac

herdr_preflight

args=(); [ -n "$CWD" ] && args+=(--cwd "$CWD")
[ -n "$LABEL" ] && args+=(--label "$LABEL")

case "$WHERE" in
  workspace)
    herdr_must workspace create "${args[@]}" "$FOCUS"
    pane_id="$(jqr "$HERDR_OUT" '.result.root_pane.pane_id')"
    manifest_record workspace "$(jqr "$HERDR_OUT" '.result.workspace.workspace_id')" "$LABEL"
    ;;
  tab)
    herdr_must tab create "${args[@]}" "$FOCUS"
    pane_id="$(jqr "$HERDR_OUT" '.result.root_pane.pane_id')"
    manifest_record tab "$(jqr "$HERDR_OUT" '.result.tab.tab_id')" "$LABEL"
    ;;
  split)
    split=(pane split)
    if [ "$FROM" = "current" ] || { [ -z "$FROM" ] && [ -n "${HERDR_PANE_ID:-}" ]; }; then
      # Target the calling pane explicitly. Omitting a target uses whichever
      # pane the UI has focused, which may belong to the human or another client.
      split+=(--pane "${HERDR_PANE_ID:?--current requires HERDR_PANE_ID; pass --from PANE_ID instead}")
    elif [ -n "$FROM" ]; then
      split+=("$FROM")
    else
      # Outside a pane with no --from: anchor to the first pane rather than
      # inheriting somebody else's focus.
      herdr_must pane list
      first="$(jqr "$HERDR_OUT" '.result.panes[0].pane_id')"
      [ -n "$first" ] && [ "$first" != "null" ] || die "$EX_NOTFOUND" "no_panes" \
        "No panes exist to split. Use --where workspace to create one."
      split+=("$first")
    fi
    split+=(--direction "$DIRECTION" "$FOCUS")
    [ -n "$RATIO" ] && split+=(--ratio "$RATIO")
    [ -n "$CWD" ] && split+=(--cwd "$CWD")
    herdr_must "${split[@]}"
    pane_id="$(jqr "$HERDR_OUT" '.result.pane.pane_id')"
    manifest_record pane "$pane_id" "$LABEL"
    ;;
esac

[ -n "$pane_id" ] && [ "$pane_id" != "null" ] || die "$EX_HERDR" "no_pane_id" "herdr did not return a pane id."

herdr_must pane get "$pane_id"
jq -c -n --argjson p "$HERDR_OUT" \
  '{ok:true, pane_id:$p.result.pane.pane_id, tab_id:$p.result.pane.tab_id, workspace_id:$p.result.pane.workspace_id, cwd:$p.result.pane.cwd}'
