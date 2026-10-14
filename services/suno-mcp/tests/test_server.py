"""Starts the real `suno-local serve` over stdio and talks MCP to it."""

import asyncio
import json
import os
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SONG = "0f8fad5b-d9cb-469f-a165-70867728950e"


def test_server_lists_tools_and_validates_input(tmp_path):
    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "suno_local", "serve"],
        env={**os.environ, "SUNO_PROFILE_DIR": str(tmp_path / "p"), "SUNO_DOWNLOAD_DIR": str(tmp_path / "m")},
        cwd=str(tmp_path),
    )

    async def go():
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = {t.name for t in (await session.list_tools()).tools}
                audit = await session.call_tool("suno_network_audit", {})
                bad_id = await session.call_tool("suno_check_status", {"song_ids": ["../../x"]})
                extra = await session.call_tool("suno_download_song", {"song_id": SONG, "folder": "/etc"})
                return tools, audit, bad_id, extra

    tools, audit, bad_id, extra = asyncio.run(go())
    assert tools == {
        "suno_get_credits",
        "suno_get_recent",
        "suno_generate_song",
        "suno_generate_from_description",
        "suno_check_status",
        "suno_wait_for_songs",
        "suno_download_song",
        "suno_network_audit",
    }
    assert json.loads(audit.content[0].text) == {"allowed": {}, "blocked": {}}
    assert bad_id.isError and "validation" in bad_id.content[0].text.lower()
    assert extra.isError  # upstream's free-form `folder` argument no longer exists


def test_server_ignores_dotenv_in_launch_dir(tmp_path):
    # Upstream read .env from wherever it was launched. Plant one and make sure it is ignored.
    (tmp_path / ".env").write_text("SUNO_DOWNLOAD_DIR=/tmp/planted\nSUNO_EXTRA_ALLOWED_HOSTS=*.evil.example\n")
    env = {k: v for k, v in os.environ.items() if not k.startswith("SUNO_")}
    import subprocess

    out = subprocess.run(
        [sys.executable, "-m", "suno_local", "check"], cwd=tmp_path, env=env,
        capture_output=True, text=True, timeout=60,
    )
    report = json.loads(out.stdout)
    assert report["download_dir"] != "/tmp/planted"
    assert "*.evil.example" not in report["browser_allowlist"]
