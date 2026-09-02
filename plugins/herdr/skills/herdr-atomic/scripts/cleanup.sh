#!/usr/bin/env bash
# Close only the panes, tabs, and workspaces these scripts created.
#
# Every creating script records what it made in a manifest. Cleanup reads that
# manifest and nothing else, which is what makes "never close what you did not
# create" a mechanical guarantee rather than a rule someone has to remember.
#
# Usage: cleanup.sh [--session NAME] [--dry-run] [--pane PANE_ID] [--all]
# Output: {"ok":true,"closed":[...],"skipped":[...]}

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$DIR/_lib.sh"

OPT_SESSION=""; DRY=0; ONLY=""; ALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --session) OPT_SESSION="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    --pane)    ONLY="${2:-}"; shift 2 ;;
    --all)     ALL=1; shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) die "$EX_USAGE" "bad_argument" "Unknown argument: $1" ;;
  esac
done

herdr_preflight
mf="$(manifest_path)"
[ -f "$mf" ] || { jq -c -n '{ok:true,closed:[],skipped:[],note:"nothing was recorded as created"}'; exit 0; }

closed="[]"; skipped="[]"
# Reverse order: panes created last are closed first, so closing a parent
# workspace never orphans a wait on one of its children.
while IFS= read -r line; do
  [ -n "$line" ] || continue
  kind="$(jqr "$line" '.kind')"; id="$(jqr "$line" '.id')"
  [ -n "$ONLY" ] && [ "$id" != "$ONLY" ] && continue
  if [ "$DRY" = 1 ]; then
    closed="$(jq -c -n --argjson c "$closed" --arg k "$kind" --arg i "$id" '$c + [{kind:$k,id:$i,dry_run:true}]')"
    continue
  fi
  case "$kind" in
    pane)      herdr_call pane close "$id" ;;
    tab)       herdr_call tab close "$id" ;;
    workspace) herdr_call workspace close "$id" ;;
    *) continue ;;
  esac
  reason="$(herdr_err_code "$HERDR_ERR")"
  if [ "$HERDR_RC" -eq 0 ]; then
    closed="$(jq -c -n --argjson c "$closed" --arg k "$kind" --arg i "$id" '$c + [{kind:$k,id:$i}]')"
  elif [ "$reason" = "pane_not_found" ] || [ "$reason" = "tab_not_found" ] || [ "$reason" = "workspace_not_found" ]; then
    closed="$(jq -c -n --argjson c "$closed" --arg k "$kind" --arg i "$id" '$c + [{kind:$k,id:$i,already_gone:true}]')"
  else
    [ -z "$reason" ] && reason="error"
    skipped="$(jq -c -n --argjson s "$skipped" --arg k "$kind" --arg i "$id" --arg r "$reason" '$s + [{kind:$k,id:$i,reason:$r}]')"
  fi
done < <(tail -r "$mf" 2>/dev/null || tac "$mf")

if [ "$DRY" = 0 ]; then
  if [ -n "$ONLY" ]; then grep -v "\"id\":\"$ONLY\"" "$mf" > "$mf.tmp" 2>/dev/null && mv "$mf.tmp" "$mf"
  else : > "$mf"; fi
fi

jq -c -n --argjson c "$closed" --argjson s "$skipped" '{ok:true,closed:$c,skipped:$s}'
