"""HTTP surface. Three routes for narration, one to ask whether we are up.

Bound to localhost only: the weights are under a non-commercial licence and this
is a personal tool, not a service to expose.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .jobs import MAX_CHARS, Segment, Worker

app = FastAPI(title="breeze-tts-service", version="0.1.0")
worker = Worker(engine_name=os.environ.get("BREEZE_ENGINE"), max_chars=int(os.environ.get("BREEZE_MAX_CHARS", MAX_CHARS)))


class SegmentIn(BaseModel):
    id: str
    text: str


class NarrateIn(BaseModel):
    segments: list[SegmentIn] = Field(min_length=1)


@app.on_event("startup")
def _startup() -> None:
    worker.start()


@app.get("/health")
def health() -> dict:
    """`status` is loading | ok | error. Clients treat anything but ok as unavailable."""
    return {"service": "breeze-tts-service", **worker.describe()}


@app.post("/v1/narrate", status_code=202)
def narrate(body: NarrateIn) -> dict:
    if worker.status != "ok":
        raise HTTPException(status_code=503, detail=f"engine {worker.status}: {worker.error or 'not ready'}")
    job_id = worker.submit([Segment(id=s.id, text=s.text) for s in body.segments])
    return {"job_id": job_id, "total": len(body.segments)}


@app.get("/v1/narrate/{job_id}")
def job_status(job_id: str) -> dict:
    job = worker.read(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="no such job")
    return job


@app.get("/v1/narrate/{job_id}/audio.mp3")
def job_audio(job_id: str) -> FileResponse:
    path = worker.audio_path(job_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="audio not ready")
    return FileResponse(path, media_type="audio/mpeg", filename="narration.mp3")
