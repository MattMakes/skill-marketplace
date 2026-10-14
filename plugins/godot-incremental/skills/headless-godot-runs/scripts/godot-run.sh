#!/bin/sh
# Usage: godot-run.sh <seconds> <log file> <command> [args...]
# Example: godot-run.sh 300 /tmp/probe.log godot --headless --path game -s /abs/tools/probe.gd
#
# Runs the command under a hard alarm (perl, because macOS has no `timeout`), writes stdout and
# stderr to the log, and scans the log for the error lines that a headless Godot run prints
# but does not turn into an exit code.
# Set GODOT_RUN_REQUIRE to a text that must appear in the log, for example a summary line.
# Exit codes:
#   the command's own code when it fails
#   124 when the alarm stopped the command
#   3   when the command exited 0 but the log holds an error marker
#   4   when GODOT_RUN_REQUIRE is set and the log does not hold it
# The alarm sits on the command itself, so a wait before this call does not use up its time.
set -u
if [ $# -lt 3 ]; then
	sed -n '2,3p' "$0" >&2
	exit 64
fi
limit=$1
log=$2
shift 2
case $log in
	/*) ;;
	*) log="$(pwd)/$log" ;;
esac
perl -e 'alarm shift; exec @ARGV or die "exec failed: $!\n"' "$limit" "$@" >"$log" 2>&1
rc=$?
markers='SCRIPT ERROR|Parse Error|Identifier not found|Could not find type|Failed to load script|No loader found'
if [ $rc -eq 142 ]; then
	echo "godot-run: ALARM after ${limit}s. Log: $log" >&2
	rc=124
fi
if grep -E -q "$markers" "$log"; then
	echo "godot-run: error markers in $log:" >&2
	grep -E -n "$markers" "$log" | head -n 5 >&2
	[ $rc -eq 0 ] && rc=3
fi
if [ $rc -eq 0 ] && [ -n "${GODOT_RUN_REQUIRE:-}" ] && ! grep -F -q "$GODOT_RUN_REQUIRE" "$log"; then
	echo "godot-run: required text not found in $log: $GODOT_RUN_REQUIRE" >&2
	rc=4
fi
if grep -F -q "leaked at exit" "$log"; then
	echo "godot-run: note: the log reports objects leaked at exit" >&2
fi
exit $rc
