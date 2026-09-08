"""Speech engines behind one interface: text in, mono float32 audio out.

Two implementations. `breeze` is the real one. `say` wraps the macOS built-in and
exists so the whole pipeline - client, job queue, assembly, player - can be
exercised without the model, and so narration still works if the model is not set up.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_RATE = 24_000


class Engine:
    name = "abstract"
    sample_rate = SAMPLE_RATE

    def describe(self) -> dict:
        return {"engine": self.name, "sample_rate": self.sample_rate}

    def synth(self, text: str) -> np.ndarray:
        raise NotImplementedError


class SayEngine(Engine):
    """macOS `say`. Instant to start, no download, good enough to build against."""

    name = "say"

    def __init__(self, voice: str | None = None) -> None:
        self.voice = voice or os.environ.get("BREEZE_SAY_VOICE", "Samantha")

    def describe(self) -> dict:
        return {**super().describe(), "voice": self.voice}

    def synth(self, text: str) -> np.ndarray:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            out = Path(tmp.name)
        try:
            subprocess.run(
                ["say", "-v", self.voice, "-o", str(out),
                 "--file-format=WAVE", f"--data-format=LEI16@{self.sample_rate}", text],
                check=True, capture_output=True,
            )
            audio, rate = sf.read(out, dtype="float32", always_2d=False)
            if rate != self.sample_rate:
                raise RuntimeError(f"say returned {rate} Hz, expected {self.sample_rate}")
            return audio.reshape(-1)
        finally:
            out.unlink(missing_ok=True)


class BreezeEngine(Engine):
    """Breeze TTS 2 via the vendored MLX port.

    The whole point of holding the model in a service is this constructor: 3B
    parameters are loaded once, then every segment reuses them. Shelling out to the
    port's infer.py per paragraph would reload the model each time.

    Voice consistency is why narration clones rather than designs. Voice design
    samples a fresh speaker on every call, so a forty-paragraph article would wander
    between voices. With narrator/reference.wav committed, every segment clones that
    one speaker and the article is read by a single person.
    """

    name = "breeze"

    def __init__(self, model_dir: Path, *, audio_device: str = "auto", seed: int = 42) -> None:
        lock = json.loads((ROOT / "model.lock.json").read_text())
        port_dir = ROOT / lock["port"]["vendor_dir"]
        if not (port_dir / "breeze_tts_mlx").is_dir():
            raise RuntimeError(f"vendored port missing at {port_dir}; run scripts/setup.sh")
        if str(port_dir) not in sys.path:
            sys.path.insert(0, str(port_dir))

        from breeze_tts_mlx.runtime import BreezeMLXRuntime, MLXRuntimeConfig
        from breeze_tts_mlx.sampling import SamplingConfig
        from breeze_tts_mlx.templates import get_template, prepare_inputs

        self._get_template = get_template
        self._prepare_inputs = prepare_inputs
        self.model_dir = model_dir
        self.revision = lock["weights"]["revision"]

        sampling = SamplingConfig(temperature=0.9, top_k=50, top_p=1.0, do_sample=True)
        self.runtime = BreezeMLXRuntime(
            model_dir,
            audio_device=audio_device,
            seed=seed,
            config=MLXRuntimeConfig(
                max_new_tokens=1500,
                max_seq_len=2048,
                repetition_penalty=1.1,
                codec_chunk_frames=2,
                backbone_sampling=sampling,
                depth_sampling=sampling,
            ),
        )
        self.sample_rate = int(self.runtime.sample_rate)

        ref_audio = ROOT / "narrator" / "reference.wav"
        ref_text = ROOT / "narrator" / "reference.txt"
        if ref_audio.is_file() and ref_text.is_file():
            self.ref_audio: Path | None = ref_audio
            self.ref_text: str | None = ref_text.read_text().strip()
        else:
            self.ref_audio, self.ref_text = None, None
        self.instruction = os.environ.get(
            "BREEZE_INSTRUCTION",
            "A calm, clear narrator reading a technical article at an even pace.",
        )

    def describe(self) -> dict:
        return {
            **super().describe(),
            "model_dir": str(self.model_dir),
            "revision": self.revision,
            "mode": self._mode(),
            "voice_reference": str(self.ref_audio) if self.ref_audio else None,
        }

    def _mode(self) -> str:
        # Mirrors infer.py's `auto` resolution. Narration wants `clone` whenever a
        # reference exists; `edit` (reference + instruction) would let the
        # instruction pull the voice away from the reference between segments.
        return "clone" if self.ref_audio else "guided"

    def synth(self, text: str) -> np.ndarray:
        mode = self._mode()
        request: dict = {"id": "narrate", "text": text, "speaker": "S0"}
        if mode == "clone":
            request["ref_audio_path"] = str(self.ref_audio)
            request["ref_text"] = self.ref_text
            template, cfg = "ref_clone_tata", 1.0  # clone mode rejects CFG != 1
        else:
            request["instruction"] = self.instruction
            template, cfg = "tts_instruction", float(os.environ.get("BREEZE_CFG_SCALE", "4"))

        inputs = self._prepare_inputs(
            self.runtime.tokenizer,
            self.runtime.audio_tokenizer,
            self.runtime,
            [request],
            self._get_template(template),
            guidance_scale=cfg,
            guidance_scale_ref=None,
            guidance_scale_ins=None,
        )
        chunks = [c.audio for c in self.runtime.iter_audio_chunks(inputs, request_id="narrate")]
        if not chunks:
            raise RuntimeError("model produced no audio")
        return np.concatenate([np.asarray(c, dtype=np.float32).reshape(-1) for c in chunks])


def build(name: str | None = None) -> Engine:
    """Pick an engine. `say` unless breeze is asked for and its weights are present."""
    name = (name or os.environ.get("BREEZE_ENGINE", "breeze")).lower()
    if name == "say":
        return SayEngine()
    lock = json.loads((ROOT / "model.lock.json").read_text())
    model_dir = ROOT / lock["weights"]["local_dir"]
    if not model_dir.is_dir():
        raise RuntimeError(f"weights missing at {model_dir}; run scripts/setup.sh")
    return BreezeEngine(model_dir, audio_device=os.environ.get("BREEZE_AUDIO_DEVICE", "auto"))
