"""Stitch per-segment audio into one MP3 and report exactly when each segment speaks.

Cue times are derived from sample counts, not estimated from text length, so the
highlight in the browser stays locked to the voice for the whole article.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

GAP_SECONDS = 0.4


def assemble(
    pieces: list[tuple[str, np.ndarray]],
    sample_rate: int,
    out_mp3: Path,
    *,
    gap_seconds: float = GAP_SECONDS,
    bitrate: str = "64k",
) -> tuple[list[dict], float]:
    """Concatenate `(segment_id, audio)` pairs; return cue list and total duration."""
    if not pieces:
        raise ValueError("nothing to assemble")

    gap = np.zeros(int(sample_rate * gap_seconds), dtype=np.float32)
    tracks: list[np.ndarray] = []
    cues: list[dict] = []
    cursor = 0

    for index, (segment_id, audio) in enumerate(pieces):
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)
        start = cursor
        tracks.append(audio)
        cursor += audio.size
        cues.append({
            "index": index,
            "id": segment_id,
            "start": round(start / sample_rate, 3),
            "end": round(cursor / sample_rate, 3),
        })
        if index < len(pieces) - 1:
            tracks.append(gap)
            cursor += gap.size

    merged = np.concatenate(tracks)
    peak = float(np.max(np.abs(merged))) if merged.size else 0.0
    if peak > 1.0:
        merged = merged / peak

    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = Path(tmp.name)
    try:
        sf.write(wav, merged, sample_rate, subtype="PCM_16")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
             "-ac", "1", "-b:a", bitrate, str(out_mp3)],
            check=True, capture_output=True,
        )
    finally:
        wav.unlink(missing_ok=True)

    return cues, round(merged.size / sample_rate, 3)
