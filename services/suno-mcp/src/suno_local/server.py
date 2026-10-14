"""The MCP server: stdio only, no listening sockets.

Built on the SDK's low-level `Server` rather than `FastMCP`, because FastMCP's settings
class reads a `.env` file from the working directory. Tool schemas are written out here in
full so what the model can send is visible in one place.
"""

from __future__ import annotations

import json
from typing import Any

import mcp.types as types
from mcp.server.lowlevel import Server
from mcp.server.stdio import stdio_server

from .browser import BrowserSession
from .client import SunoClient
from .config import Settings
from .netguard import AUDIT

_UUID = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
_SONG_IDS = {
    "type": "array",
    "items": {"type": "string", "pattern": _UUID},
    "minItems": 1,
    "maxItems": 20,
    "description": "Suno song (clip) IDs",
}


def _schema(props: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {"type": "object", "properties": props, "required": required, "additionalProperties": False}


TOOLS = [
    types.Tool(
        name="suno_get_credits",
        description="Your Suno credit balance and plan, from your signed-in suno.com account.",
        inputSchema=_schema({}, []),
    ),
    types.Tool(
        name="suno_get_recent",
        description="List recent songs in your Suno library.",
        inputSchema=_schema({"page": {"type": "integer", "minimum": 1, "maximum": 500, "default": 1}}, []),
    ),
    types.Tool(
        name="suno_generate_song",
        description=(
            "Generate a song from your own lyrics and a style (Suno's Custom/Advanced mode). "
            "Spends Suno credits. Drives the Suno browser window, which must stay visible. "
            "Returns song IDs; then call suno_wait_for_songs."
        ),
        inputSchema=_schema(
            {
                "lyrics": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 5000,
                    "description": "Lyrics with section tags such as [Verse] and [Chorus]",
                },
                "style": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 1000,
                    "description": "Style tags, e.g. 'indie folk, acoustic, warm male vocals'",
                },
            },
            ["lyrics", "style"],
        ),
    ),
    types.Tool(
        name="suno_generate_from_description",
        description=(
            "Generate a song from a description; Suno writes the lyrics (Simple mode). "
            "Spends Suno credits. Returns song IDs; then call suno_wait_for_songs."
        ),
        inputSchema=_schema(
            {"description": {"type": "string", "minLength": 1, "maxLength": 3000}},
            ["description"],
        ),
    ),
    types.Tool(
        name="suno_check_status",
        description="Current generation status of one or more songs.",
        inputSchema=_schema({"song_ids": _SONG_IDS}, ["song_ids"]),
    ),
    types.Tool(
        name="suno_wait_for_songs",
        description="Wait up to 3 minutes for songs to finish, then return their titles and links.",
        inputSchema=_schema({"song_ids": _SONG_IDS}, ["song_ids"]),
    ),
    types.Tool(
        name="suno_download_song",
        description=(
            "Save a finished song as an MP3 inside your Suno download folder "
            "(SUNO_DOWNLOAD_DIR, default ~/Music/Suno). Never overwrites an existing file."
        ),
        inputSchema=_schema(
            {
                "song_id": {"type": "string", "pattern": _UUID},
                "subfolder": {
                    "type": "string",
                    "maxLength": 200,
                    "description": "Optional relative folder inside the download folder",
                },
                "filename": {
                    "type": "string",
                    "maxLength": 120,
                    "description": "Optional file name without extension; defaults to the song title",
                },
            },
            ["song_id"],
        ),
    ),
    types.Tool(
        name="suno_network_audit",
        description=(
            "Every host this server and its browser contacted or were blocked from, this session. "
            "Use it to confirm nothing reached anywhere but Suno."
        ),
        inputSchema=_schema({}, []),
    ),
]


class _Runtime:
    """Starts the browser only when a tool first needs it."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.browser: BrowserSession | None = None
        self.client: SunoClient | None = None

    def get(self) -> SunoClient:
        if self.client is None:
            self.browser = BrowserSession(self.settings)
            self.client = SunoClient(self.settings, self.browser)
        return self.client

    async def close(self) -> None:
        if self.client:
            await self.client.close()
        if self.browser:
            await self.browser.close()


def _song_ids(clips: list[dict]) -> list[str]:
    return [c["id"] for c in clips if c.get("id")]


async def _dispatch(rt: _Runtime, name: str, args: dict[str, Any]) -> Any:
    if name == "suno_network_audit":
        return AUDIT.snapshot()
    client = rt.get()
    if name == "suno_get_credits":
        return await client.get_credits()
    if name == "suno_get_recent":
        return await client.get_recent_songs(page=args.get("page", 1))
    if name == "suno_generate_song":
        result = await client.generate_song(lyrics=args["lyrics"], style=args["style"])
        return {"message": result.get("message"), "song_ids": _song_ids(result["clips"]), "clips": result["clips"]}
    if name == "suno_generate_from_description":
        result = await client.generate_from_description(args["description"])
        return {"message": result.get("message"), "song_ids": _song_ids(result["clips"]), "clips": result["clips"]}
    if name == "suno_check_status":
        return await client.get_song_status(args["song_ids"])
    if name == "suno_wait_for_songs":
        return {"songs": await client.wait_for_songs(args["song_ids"])}
    if name == "suno_download_song":
        return await client.download_song(args["song_id"], args.get("subfolder"), args.get("filename"))
    raise ValueError(f"Unknown tool: {name}")


def build_server(settings: Settings) -> tuple[Server, _Runtime]:
    server: Server = Server("suno-local")
    rt = _Runtime(settings)

    @server.list_tools()
    async def list_tools() -> list[types.Tool]:
        return TOOLS

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[types.TextContent]:
        result = await _dispatch(rt, name, arguments or {})
        return [types.TextContent(type="text", text=json.dumps(result, indent=2, default=str))]

    return server, rt


async def serve(settings: Settings) -> None:
    server, rt = build_server(settings)
    try:
        async with stdio_server() as (read, write):
            await server.run(read, write, server.create_initialization_options())
    finally:
        await rt.close()
