#!/usr/bin/env bash
# Run empowerment-sa analysis on target files and output JSON
# Usage: run-analysis.sh <cli-path> [glob-patterns...] [-- extra-cli-flags]
#
# Examples:
#   run-analysis.sh /path/to/index.js "src/**/*.ts"
#   run-analysis.sh /path/to/index.js "src/api/*.ts" "src/utils/*.ts"
#   run-analysis.sh /path/to/index.js "src/**/*.ts" -- --config .empowerment-sarc.json
#   run-analysis.sh /path/to/index.js  # uses repo config include globs

set -euo pipefail

CLI_PATH="${1:?Usage: run-analysis.sh <cli-path> [glob-patterns...] [-- extra-cli-flags]}"
shift

# Separate glob patterns from extra flags (after --)
GLOBS=()
EXTRA_FLAGS=()
past_separator=false

for arg in "$@"; do
  if [[ "$arg" == "--" ]]; then
    past_separator=true
    continue
  fi
  if $past_separator; then
    EXTRA_FLAGS+=("$arg")
  else
    GLOBS+=("$arg")
  fi
done

node "$CLI_PATH" \
  --format json \
  --threshold-action none \
  "${EXTRA_FLAGS[@]+"${EXTRA_FLAGS[@]}"}" \
  "${GLOBS[@]+"${GLOBS[@]}"}"
