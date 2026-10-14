"""Calls to Suno's studio API with the Clerk token from your browser session.

Ported from suno-mcp 0.1.0 (MIT, David Shibley). Differences that matter:

- Every request goes through `GuardedTransport`: HTTPS to the studio API and the audio CDN
  only, checked again on each redirect hop. `trust_env=False`, so proxy variables and
  `~/.netrc` cannot reroute requests or attach credentials.
- The bearer token is sent only to the studio API. Downloads use a separate client that
  never carries it.
- Song IDs must be UUIDs before they go anywhere near a URL.
- Downloads land inside SUNO_DOWNLOAD_DIR and nowhere else, are size-capped, and never
  overwrite a file. Upstream took any folder the model named and fetched any URL that
  merely contained the substring "cdn".
"""

from __future__ import annotations

import asyncio
import base64
import json
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx

from .browser import BrowserSession
from .config import SUNO_API_BASE, SUNO_AUDIO_URL, SUNO_SONG_URL, Settings
from .netguard import PROCESS_HOSTS, GuardedTransport, host_allowed

_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
_DONE = ("complete", "streaming")
MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)


def check_song_id(song_id: str) -> str:
    song_id = song_id.strip().lower()
    if not _UUID.match(song_id):
        raise ValueError(f"Not a Suno song ID: {song_id!r}")
    return song_id


def safe_name(base: str, fallback: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "-_ " else "" for ch in base)
    return "-".join(cleaned.split()).lower()[:80] or fallback


def resolve_download_dir(root: Path, subfolder: str | None) -> Path:
    """`root`, or a folder inside it. Refuses anything that would escape `root`."""
    root = root.expanduser().resolve()
    if not subfolder:
        return root
    rel = Path(subfolder)
    if rel.is_absolute() or ".." in rel.parts:
        raise ValueError("subfolder must be a relative path inside the download folder")
    target = (root / rel).resolve()
    if not target.is_relative_to(root):
        raise ValueError("subfolder resolves outside the download folder")
    return target


def unique_path(folder: Path, stem: str, suffix: str = ".mp3") -> Path:
    candidate = folder / f"{stem}{suffix}"
    n = 2
    while candidate.exists():
        candidate = folder / f"{stem}-{n}{suffix}"
        n += 1
    return candidate


def _clips_of(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        clips = payload.get("clips")
        if isinstance(clips, list):
            return clips
    return []


def _project_clips(project: Any) -> list[dict[str, Any]]:
    clips = []
    for entry in (project or {}).get("project_clips") or []:
        clip = entry.get("clip") or entry
        if clip.get("id"):
            clips.append(clip)
    return clips


class SunoClient:
    def __init__(self, settings: Settings, browser: BrowserSession) -> None:
        self.settings = settings
        self.browser = browser
        self._token: str | None = None
        self._token_expiry = 0.0
        self._api = httpx.AsyncClient(
            base_url=SUNO_API_BASE,
            transport=GuardedTransport(PROCESS_HOSTS),
            timeout=60.0,
            trust_env=False,
            follow_redirects=False,
            headers={"User-Agent": _USER_AGENT, "Content-Type": "application/json"},
        )
        self._cdn = httpx.AsyncClient(
            transport=GuardedTransport(PROCESS_HOSTS),
            timeout=120.0,
            trust_env=False,
            follow_redirects=True,
            max_redirects=3,
            headers={"User-Agent": _USER_AGENT},
        )

    async def close(self) -> None:
        await self._api.aclose()
        await self._cdn.aclose()

    async def _ensure_token(self) -> str:
        if self._token and time.time() < self._token_expiry:
            return self._token
        token = await self.browser.get_token()
        try:
            payload = token.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            self._token_expiry = float(claims["exp"]) - 60
        except Exception:
            self._token_expiry = time.time() + 50
        self._token = token
        return token

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        for attempt in (1, 2):
            token = await self._ensure_token()
            response = await self._api.request(
                method, path, headers={"Authorization": f"Bearer {token}"}, **kwargs
            )
            if response.status_code == 401 and attempt == 1:
                self._token = None
                continue
            break
        if not response.is_success:
            raise RuntimeError(f"Suno API {path} answered {response.status_code}: {response.text[:300]}")
        return response.json()

    async def get_credits(self) -> Any:
        return await self._request("GET", "/api/billing/info/")

    async def get_song_status(self, ids: list[str]) -> Any:
        ids = [check_song_id(i) for i in ids]
        return await self._request("GET", "/api/feed/v2", params={"ids": ",".join(ids)})

    async def get_recent_songs(self, page: int = 1) -> Any:
        return await self._request("GET", "/api/project/default", params={"page": int(page)})

    async def _new_clips_since(self, before: set[str], attempts: int = 20) -> list[dict]:
        for _ in range(attempts):
            await asyncio.sleep(2)
            fresh = [c for c in _project_clips(await self.get_recent_songs()) if c["id"] not in before]
            if fresh:
                return fresh
        return []

    async def _generate(self, **form) -> dict[str, Any]:
        before = {c["id"] for c in _project_clips(await self.get_recent_songs())}
        result = await self.browser.drive_generate(**form)
        if result.get("clips"):
            return result
        fresh = await self._new_clips_since(before)
        if fresh:
            return {"clips": fresh, "message": "Song generation started (found in your library)"}
        raise RuntimeError(
            f"{result.get('message') or 'Generation did not start.'} Keep the Suno window "
            "visible (SUNO_HEADLESS=false), make sure you are signed in, and solve any hCaptcha."
        )

    async def generate_song(self, *, lyrics: str, style: str) -> dict[str, Any]:
        return await self._generate(mode="custom", lyrics=lyrics, style=style)

    async def generate_from_description(self, description: str) -> dict[str, Any]:
        return await self._generate(mode="simple", simple_prompt=description)

    async def wait_for_songs(self, ids: list[str], max_wait: int = 180, interval: int = 5) -> list[dict]:
        deadline = time.time() + max_wait
        while time.time() < deadline:
            clips = _clips_of(await self.get_song_status(ids))
            if clips and all(c.get("status") in _DONE for c in clips):
                return [
                    {
                        "id": c["id"],
                        "title": c.get("title"),
                        "status": c.get("status"),
                        "audio_url": c.get("audio_url"),
                        "image_url": c.get("image_url"),
                        "suno_url": SUNO_SONG_URL.format(id=c["id"]),
                    }
                    for c in clips
                ]
            await asyncio.sleep(interval)
        raise TimeoutError(f"Songs not ready after {max_wait}s: {ids}")

    def _audio_url_for(self, song: dict[str, Any], song_id: str) -> str:
        url = song.get("audio_url") or ""
        parts = urlsplit(url)
        if parts.scheme == "https" and host_allowed(parts.hostname, PROCESS_HOSTS) and parts.path.endswith(".mp3"):
            return url
        return SUNO_AUDIO_URL.format(id=song_id)

    async def download_song(
        self, song_id: str, subfolder: str | None = None, filename: str | None = None
    ) -> dict[str, Any]:
        song_id = check_song_id(song_id)
        song = next((c for c in _clips_of(await self.get_song_status([song_id])) if c.get("id") == song_id), None)
        if not song:
            raise RuntimeError(f"Song not found in your account: {song_id}")
        if song.get("status") != "complete":
            raise RuntimeError(f"Song is not finished yet (status: {song.get('status')})")

        folder = resolve_download_dir(self.settings.download_dir, subfolder)
        folder.mkdir(parents=True, exist_ok=True)
        out = unique_path(folder, safe_name(filename or song.get("title") or song_id, song_id))
        url = self._audio_url_for(song, song_id)

        partial = out.with_suffix(".part")
        written = 0
        try:
            async with self._cdn.stream("GET", url) as resp:
                resp.raise_for_status()
                with partial.open("xb") as fh:
                    async for chunk in resp.aiter_bytes():
                        written += len(chunk)
                        if written > MAX_DOWNLOAD_BYTES:
                            raise RuntimeError("Download exceeded 50 MB; refusing to keep it")
                        fh.write(chunk)
            partial.rename(out)
        finally:
            partial.unlink(missing_ok=True)

        return {
            "path": str(out),
            "size": written,
            "song_id": song_id,
            "title": song.get("title"),
            "suno_url": SUNO_SONG_URL.format(id=song_id),
        }
