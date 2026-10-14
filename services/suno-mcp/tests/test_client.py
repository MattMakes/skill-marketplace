import asyncio
from pathlib import Path

import httpx
import pytest

from suno_local.client import (
    SunoClient,
    check_song_id,
    resolve_download_dir,
    safe_name,
    unique_path,
)
from suno_local.config import Settings
from suno_local.netguard import PROCESS_HOSTS, BlockedNetworkAccess, GuardedTransport

SONG = "0f8fad5b-d9cb-469f-a165-70867728950e"


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        profile_dir=tmp_path / "profile",
        download_dir=tmp_path / "music",
        headless=True,
        browser_channel=None,
        extra_hosts=(),
        debug=False,
    )


class FakeBrowser:
    async def get_token(self):
        # header.payload.signature with exp far in the future
        return "eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.sig"


def test_song_ids_must_be_uuids():
    assert check_song_id(SONG.upper()) == SONG
    for bad in ["../../etc", f"{SONG}&ids=x", "", "abc"]:
        with pytest.raises(ValueError):
            check_song_id(bad)


def test_download_dir_confinement(tmp_path):
    root = tmp_path / "music"
    assert resolve_download_dir(root, None) == root.resolve()
    assert resolve_download_dir(root, "albums/one") == (root / "albums/one").resolve()
    for bad in ["../outside", "/etc", "a/../../b", str(tmp_path)]:
        with pytest.raises(ValueError):
            resolve_download_dir(root, bad)


def test_download_dir_rejects_symlink_escape(tmp_path):
    root = tmp_path / "music"
    root.mkdir()
    (root / "link").symlink_to(tmp_path)
    with pytest.raises(ValueError):
        resolve_download_dir(root, "link/escaped")


def test_names_and_no_overwrite(tmp_path):
    assert safe_name("../../My Song!", "id") == "my-song"
    assert safe_name("///", "fallback") == "fallback"
    (tmp_path / "a.mp3").write_bytes(b"x")
    assert unique_path(tmp_path, "a").name == "a-2.mp3"


@pytest.mark.parametrize(
    "audio_url,expected",
    [
        (f"https://cdn1.suno.ai/{SONG}.mp3", f"https://cdn1.suno.ai/{SONG}.mp3"),
        ("https://evil-cdn.example/x.mp3", f"https://cdn1.suno.ai/{SONG}.mp3"),  # upstream fetched this
        (f"http://cdn1.suno.ai/{SONG}.mp3", f"https://cdn1.suno.ai/{SONG}.mp3"),
        ("https://audiopipe.suno.ai/?item_id=1", f"https://cdn1.suno.ai/{SONG}.mp3"),
        (None, f"https://cdn1.suno.ai/{SONG}.mp3"),
    ],
)
def test_audio_url_is_never_taken_on_trust(tmp_path, audio_url, expected):
    client = SunoClient(_settings(tmp_path), FakeBrowser())
    assert client._audio_url_for({"audio_url": audio_url}, SONG) == expected
    asyncio.run(client.close())


def test_download_flow_keeps_token_off_the_cdn(tmp_path):
    calls = []

    def handler(request: httpx.Request):
        calls.append((request.url.host, request.headers.get("authorization")))
        if request.url.host == "studio-api.prod.suno.com":
            return httpx.Response(200, json={"clips": [{"id": SONG, "status": "complete", "title": "Night Drive"}]})
        return httpx.Response(200, content=b"ID3fake-mp3")

    async def go():
        client = SunoClient(_settings(tmp_path), FakeBrowser())
        mock = httpx.MockTransport(handler)
        client._api._transport = GuardedTransport(PROCESS_HOSTS, mock)
        client._cdn._transport = GuardedTransport(PROCESS_HOSTS, mock)
        try:
            return await client.download_song(SONG, subfolder="drives")
        finally:
            await client.close()

    result = asyncio.run(go())
    path = Path(result["path"])
    assert path == (tmp_path / "music" / "drives" / "night-drive.mp3").resolve()
    assert path.read_bytes() == b"ID3fake-mp3"
    api, cdn = calls
    assert api[0] == "studio-api.prod.suno.com" and api[1].startswith("Bearer ")
    assert cdn == ("cdn1.suno.ai", None)


def test_api_client_cannot_be_pointed_elsewhere(tmp_path):
    async def go():
        client = SunoClient(_settings(tmp_path), FakeBrowser())
        try:
            with pytest.raises(BlockedNetworkAccess):
                await client._request("GET", "https://exfil.example/collect")
        finally:
            await client.close()

    asyncio.run(go())
