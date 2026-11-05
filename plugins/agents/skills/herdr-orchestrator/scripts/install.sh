#!/usr/bin/env bash
# install.sh - version 1.1.0
#
# Kept for backwards compatibility. Since plugin 1.1.0 the setup logic lives in
# skills/herdr-setup/scripts/setup.py, which checks the machine first and fixes
# only what is missing. This wrapper runs that in --apply mode and forwards any
# flags (--install-herdr, --prune-loose-skills, --json).
#
# Preview what would change:  ../../herdr-setup/scripts/setup.py --check
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP="$HERE/../../herdr-setup/scripts/setup.py"

[ -f "$SETUP" ] || { echo "install.sh: $SETUP not found" >&2; exit 1; }
exec python3 "$SETUP" --apply "$@"
