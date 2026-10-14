"""Settings, read from environment variables only.

The upstream package called `load_dotenv()` at import, which reads a `.env` from whatever
directory the MCP client happened to launch it in. This reads nothing from disk: what the
MCP client config passes in `env` is the whole configuration.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .netguard import BROWSER_CORE_HOSTS, LOGIN_PROVIDER_HOSTS, parse_extra_hosts

SUNO_API_BASE = "https://studio-api.prod.suno.com"
SUNO_CREATE_URL = "https://suno.com/create"
SUNO_SONG_URL = "https://suno.com/song/{id}"
SUNO_AUDIO_URL = "https://cdn1.suno.ai/{id}.mp3"


def _flag(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    profile_dir: Path
    download_dir: Path
    headless: bool
    browser_channel: str | None
    extra_hosts: tuple[str, ...]
    debug: bool

    def browser_hosts(self, *, login: bool = False) -> tuple[str, ...]:
        hosts = BROWSER_CORE_HOSTS + self.extra_hosts
        return hosts + LOGIN_PROVIDER_HOSTS if login else hosts

    @classmethod
    def from_env(cls) -> Settings:
        home = Path.home()
        channel = os.environ.get("SUNO_BROWSER_CHANNEL", "").strip() or None
        if channel not in (None, "chrome", "msedge", "chromium"):
            raise ValueError("SUNO_BROWSER_CHANNEL must be chrome, msedge or chromium")
        return cls(
            profile_dir=Path(
                os.environ.get("SUNO_PROFILE_DIR", home / ".suno-local" / "profile")
            ).expanduser(),
            download_dir=Path(
                os.environ.get("SUNO_DOWNLOAD_DIR", home / "Music" / "Suno")
            ).expanduser(),
            headless=_flag("SUNO_HEADLESS", False),
            browser_channel=channel,
            extra_hosts=parse_extra_hosts(os.environ.get("SUNO_EXTRA_ALLOWED_HOSTS")),
            debug=_flag("SUNO_DEBUG", False),
        )
