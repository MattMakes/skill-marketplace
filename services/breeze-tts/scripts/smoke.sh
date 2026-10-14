#!/usr/bin/env bash
# Generate one short clip straight through the engine, no server, and report the
# realtime factor - the number that decides whether narrating a whole article is
# practical. Above 1.0x means audio is produced faster than it plays.
#
#   scripts/smoke.sh [--engine breeze|say] [--out smoke.wav]
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"

ENGINE="${BREEZE_ENGINE:-breeze}"
OUT="smoke.wav"
while [ $# -gt 0 ]; do
  case "$1" in
    --engine) ENGINE="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

BREEZE_ENGINE="$ENGINE" OUT="$OUT" uv run python - <<'PY'
import os, time, soundfile as sf
from breeze_service import engines

text = (
    "The tightest constraint is not accuracy but speed. A long explainer runs to "
    "several thousand words, which is roughly twenty minutes of speech, so the "
    "question that matters is how much audio this machine produces per second of work."
)
print(f"engine: {os.environ['BREEZE_ENGINE']}  loading...", flush=True)
t0 = time.time()
engine = engines.build()
print(f"loaded in {time.time() - t0:.1f}s -> {engine.describe()}", flush=True)

t0 = time.time()
audio = engine.synth(text)
elapsed = time.time() - t0
duration = len(audio) / engine.sample_rate
sf.write(os.environ["OUT"], audio, engine.sample_rate)

print(f"\naudio {duration:.2f}s | generated in {elapsed:.1f}s | "
      f"{duration / elapsed:.2f}x realtime -> {os.environ['OUT']}")
print(f"a 20-minute article would take about {20 * elapsed / duration:.0f} minutes to generate")
PY
