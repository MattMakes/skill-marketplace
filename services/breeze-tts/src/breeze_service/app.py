"""HTTP surface. Three routes for narration, one to ask whether we are up.

Bound to localhost only: the weights are under a non-commercial licence and this is a
personal tool, not a service to expose. Two things follow from "localhost" not being a
security boundary on its own. Any other process on the machine can reach this, so the
work a single request can queue is capped. And a browser can be tricked into treating a
127.0.0.1 service as same-origin by re-pointing a hostname at it after page load, so the
Host header is checked rather than assumed.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .jobs import MAX_CHARS, Segment, Worker

# One article's worth of work, generously sized: an explainer runs to a few hundred
# paragraphs, and at ~1x realtime these caps still bound a request to hours rather than
# days of GPU time and disk.
MAX_SEGMENTS = int(os.environ.get("BREEZE_MAX_SEGMENTS", "1000"))
MAX_SEGMENT_CHARS = int(os.environ.get("BREEZE_MAX_SEGMENT_CHARS", "20000"))
MAX_TOTAL_CHARS = int(os.environ.get("BREEZE_MAX_TOTAL_CHARS", "500000"))

app = FastAPI(title="breeze-tts-service", version="0.1.0")

# Rejects requests whose Host is not a loopback name, which is what a DNS-rebinding page
# has to send. Starlette strips the port with a plain split on ":", so a bracketed IPv6
# host can never match; that costs nothing here because the server binds IPv4 loopback
# only. Set BREEZE_ALLOWED_HOSTS if you deliberately front this with a proxy.
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[h for h in os.environ.get(
        "BREEZE_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",") if h],
)

worker = Worker(engine_name=os.environ.get("BREEZE_ENGINE"), max_chars=int(os.environ.get("BREEZE_MAX_CHARS", MAX_CHARS)))


class SegmentIn(BaseModel):
    id: str = Field(max_length=200)
    text: str = Field(max_length=MAX_SEGMENT_CHARS)


class NarrateIn(BaseModel):
    segments: list[SegmentIn] = Field(min_length=1, max_length=MAX_SEGMENTS)


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
    total_chars = sum(len(s.text) for s in body.segments)
    if total_chars > MAX_TOTAL_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"{total_chars} characters exceeds the {MAX_TOTAL_CHARS} limit for one job",
        )
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
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="audio not ready")
    return FileResponse(path, media_type="audio/mpeg", filename="narration.mp3")
