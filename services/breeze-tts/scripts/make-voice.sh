#!/usr/bin/env bash
# Mint the narrator voice, once.
#
# Voice design samples a new speaker on every call, so an article generated that way
# would drift between voices paragraph to paragraph. This records one designed voice
# to narrator/reference.wav with its exact transcript; from then on every segment is
# cloned from it and the whole article is read by the same person. Commit both files.
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"

INSTRUCTION="${1:-A calm, clear narrator reading a technical article at an even pace.}"
mkdir -p narrator

INSTRUCTION="$INSTRUCTION" uv run python - <<'PY'
import json, os
from pathlib import Path
import soundfile as sf
from breeze_service.engines import BreezeEngine, ROOT

TRANSCRIPT = (
    "This is the narrator voice for these explainers. It stays the same from the first "
    "paragraph to the last, so the article sounds like one person reading it aloud."
)

lock = json.loads((ROOT / "model.lock.json").read_text())
model_dir = ROOT / lock["weights"]["local_dir"]

# Force voice design for this one generation, even if a reference already exists.
engine = BreezeEngine(model_dir, seed=42)
engine.ref_audio = None
engine.instruction = os.environ["INSTRUCTION"]

audio = engine.synth(TRANSCRIPT)
sf.write(ROOT / "narrator" / "reference.wav", audio, engine.sample_rate)
(ROOT / "narrator" / "reference.txt").write_text(TRANSCRIPT + "\n")
print(f"wrote narrator/reference.wav ({len(audio) / engine.sample_rate:.1f}s) and reference.txt")
print("listen to it; re-run with a different instruction if you want another voice")
PY
