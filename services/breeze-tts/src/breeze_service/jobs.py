"""Job store and the single worker thread that owns the model.

Narrating a long article takes minutes to tens of minutes, far longer than any
sensible HTTP request, so synthesis is a job: submit, poll, then fetch the MP3.
Job metadata and completed audio live on disk. The queue and unfinished audio
are in memory; interrupted jobs are not automatically recovered after a restart.

One worker thread, and only that thread ever touches the engine. That serialises
GPU work and keeps MLX on a single thread without any locking elsewhere.
"""

from __future__ import annotations

import json
import queue
import re
import threading
import time
import traceback
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from . import engines
from .assemble import assemble
from .text import normalize, split

ROOT = Path(__file__).resolve().parents[2]
JOBS_DIR = ROOT / "jobs"
MAX_CHARS = 350  # one generation is capped at 1500 codec frames; stay well under

# A job id is concatenated onto a filesystem path, so it is validated rather than
# trusted. `JOBS_DIR / job_id` would happily accept ".." or, because pathlib's `/`
# discards the base when the right side is absolute, "/etc/passwd". The router
# normalises away most of that today, but that is the framework's behaviour, not this
# service's guarantee, so the shape is pinned here instead.
JOB_ID = re.compile(r"\A[0-9a-f]{12}\Z")


def valid_job_id(job_id: str) -> bool:
    return bool(JOB_ID.match(job_id))


@dataclass
class Segment:
    id: str
    text: str


@dataclass
class Worker:
    engine_name: str | None = None
    max_chars: int = MAX_CHARS
    status: str = "loading"
    error: str | None = None
    engine: engines.Engine | None = None
    _queue: queue.Queue = field(default_factory=queue.Queue)
    _thread: threading.Thread | None = None

    def start(self) -> None:
        JOBS_DIR.mkdir(parents=True, exist_ok=True)
        self._thread = threading.Thread(target=self._run, name="tts-worker", daemon=True)
        self._thread.start()

    def describe(self) -> dict:
        info = {"status": self.status, "queued": self._queue.qsize()}
        if self.engine is not None:
            info.update(self.engine.describe())
        elif self.engine_name:
            info["engine"] = self.engine_name
        if self.error:
            info["error"] = self.error
        return info

    def submit(self, segments: list[Segment]) -> str:
        job_id = uuid.uuid4().hex[:12]
        pieces = [{"id": s.id, "text": s.text} for s in segments]
        self._write(job_id, {
            "id": job_id,
            "status": "queued",
            "total": len(pieces),
            "done": 0,
            "segments": pieces,
            "created": time.time(),
            "updated": time.time(),
        })
        self._queue.put(job_id)
        return job_id

    def read(self, job_id: str) -> dict | None:
        if not valid_job_id(job_id):
            return None
        path = JOBS_DIR / job_id / "job.json"
        if not path.is_file():
            return None
        job = json.loads(path.read_text())
        job.pop("segments", None)  # the caller sent them; no need to echo them back
        return job

    def audio_path(self, job_id: str) -> Path | None:
        if not valid_job_id(job_id):
            return None
        return JOBS_DIR / job_id / "narration.mp3"

    def _write(self, job_id: str, job: dict) -> None:
        directory = JOBS_DIR / job_id
        directory.mkdir(parents=True, exist_ok=True)
        job["updated"] = time.time()
        tmp = directory / "job.json.tmp"
        tmp.write_text(json.dumps(job, indent=2))
        tmp.replace(directory / "job.json")

    def _load(self, job_id: str) -> dict:
        return json.loads((JOBS_DIR / job_id / "job.json").read_text())

    def _run(self) -> None:
        try:
            self.engine = engines.build(self.engine_name)
            self.status = "ok"
        except Exception as exc:  # the service still answers /health, and says why
            self.status = "error"
            self.error = f"{type(exc).__name__}: {exc}"
            traceback.print_exc()
            return

        while True:
            job_id = self._queue.get()
            try:
                self._narrate(job_id)
            except Exception as exc:
                traceback.print_exc()
                job = self._load(job_id)
                job["status"] = "error"
                job["error"] = f"{type(exc).__name__}: {exc}"
                self._write(job_id, job)
            finally:
                self._queue.task_done()

    def _narrate(self, job_id: str) -> None:
        assert self.engine is not None
        job = self._load(job_id)
        job["status"] = "running"
        job["engine"] = self.engine.name
        job["started"] = time.time()
        self._write(job_id, job)

        rendered: list[tuple[str, "object"]] = []
        started = time.time()
        for done, segment in enumerate(job["segments"], start=1):
            text = normalize(segment["text"])
            if not text:
                continue
            parts = [self.engine.synth(chunk) for chunk in split(text, self.max_chars)]
            if parts:
                import numpy as np
                rendered.append((segment["id"], np.concatenate(parts)))
            job["done"] = done
            job["elapsed"] = round(time.time() - started, 1)
            self._write(job_id, job)

        if not rendered:
            raise ValueError("no speakable segments")

        cues, duration = assemble(rendered, self.engine.sample_rate, self.audio_path(job_id))
        elapsed = time.time() - started
        job.update({
            "status": "done",
            "cues": cues,
            "duration": duration,
            "elapsed": round(elapsed, 1),
            "realtime_factor": round(duration / elapsed, 2) if elapsed else None,
            "sample_rate": self.engine.sample_rate,
        })
        self._write(job_id, job)
