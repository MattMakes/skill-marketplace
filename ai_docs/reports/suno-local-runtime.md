# Suno local runtime report

Date: 2026-10-11

## Result

The frozen runtime is not installed. The permitted package cache does not contain all locked dependencies. Restricted DNS prevents downloads from `files.pythonhosted.org`.

The failed sync created `services/suno-mcp/.venv/` with Python 3.12.8 only. It did not create `suno-local`, `pytest`, or Playwright entry points.

## Environment

- `uv`: `/Users/mascott/.local/bin/uv`, version 0.8.4.
- Selected Python: `/usr/local/bin/python3`, version 3.12.8.
- Required Python: 3.11 or newer.
- Writable cache: `/private/tmp/suno-local-setup/uv-cache`.
- Default `uv` cache: readable at `/Users/mascott/.cache/uv`.
- No Suno profile or credential content was inspected.
- No browser was opened.
- No Suno request was sent.

## Commands and observations

The first offline frozen sync used an empty writable cache:

```sh
mkdir -p /private/tmp/suno-local-setup/uv-cache
UV_CACHE_DIR=/private/tmp/suno-local-setup/uv-cache /Users/mascott/.local/bin/uv sync --frozen --offline
```

This command selected CPython 3.12.11 and stopped at `h11==0.16.0`. The empty cache did not contain its wheel.

I copied only exact locked wheel-cache entries from `/Users/mascott/.cache/uv/wheels-v5/pypi/` into the writable cache. The cache contains exact entries for 28 of 37 resolved third-party packages. These 9 exact packages are absent:

```text
greenlet==3.5.6
iniconfig==2.3.1
mcp==1.27.2
playwright==1.56.0
pycparser==3.11
pydantic==2.14.0
pydantic-core==2.50.0
pyee==13.0.1
pytest==8.4.2
```

The frozen sync with the selected system Python was:

```sh
UV_CACHE_DIR=/private/tmp/suno-local-setup/uv-cache /Users/mascott/.local/bin/uv sync --frozen --python /usr/local/bin/python3
```

This command retried 3 times and stopped while fetching `pydantic-settings==2.15.0`. DNS returned `nodename nor servname provided, or not known`. The cache now has a copied exact entry for that package, but the 9 packages above remain absent. Per the orchestrator instruction, I made no more network attempts.

## Skipped runtime checks

The dependency blocker prevents these checks:

- `.venv/bin/suno-local check` is skipped because `.venv/bin/suno-local` does not exist.
- `.venv/bin/python -m pytest -q` is skipped because `pytest` and runtime dependencies are not installed.
- The real stdio handshake is skipped because the server and MCP client dependencies are not installed.
- The `suno_network_audit` smoke call is skipped for the same reason.

Therefore, this run has no test pass or skip count. It also has no tool-list or audit output.

## Browser availability

Playwright is pinned to 1.56.0. Its [official browser manifest](https://raw.githubusercontent.com/microsoft/playwright/v1.56.0/packages/playwright-core/browsers.json) specifies Chromium revision 1194. Revision 1194 is not installed.

The following installed Chromium and headless-shell pairs have executable files and completed-install markers:

```text
revision 1217, linked to Playwright 1.59.1
revision 1234, linked to Playwright 1.62.1
revision 1243, linked to Playwright 1.63.0
```

These revisions do not satisfy Playwright 1.56.0. Google Chrome exists at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, but the default configuration uses Playwright Chromium. A user can select Chrome with `SUNO_BROWSER_CHANNEL=chrome` after the Python runtime is installed.

## Remaining commands

Run these commands from `services/suno-mcp` after package-index access is available:

```sh
UV_CACHE_DIR=/private/tmp/suno-local-setup/uv-cache /Users/mascott/.local/bin/uv sync --frozen --python /usr/local/bin/python3
.venv/bin/playwright install chromium
.venv/bin/suno-local check
.venv/bin/python -m pytest -q
```

Use this smoke test after installation. It initializes the real stdio server, lists its tools, and calls only `suno_network_audit`:

```sh
SUNO_PROFILE_DIR=/private/tmp/suno-local-setup/profile \
SUNO_DOWNLOAD_DIR=/private/tmp/suno-local-setup/downloads \
.venv/bin/python - <<'PY'
import asyncio
import json
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    params = StdioServerParameters(
        command=os.path.abspath(".venv/bin/suno-local"),
        args=["serve"],
        env=dict(os.environ),
        cwd=os.getcwd(),
    )
    async with stdio_client(params) as streams:
        async with ClientSession(*streams) as session:
            await session.initialize()
            tools = [tool.name for tool in (await session.list_tools()).tools]
            audit = await session.call_tool("suno_network_audit", {})
            print(json.dumps({"tools": tools, "audit": json.loads(audit.content[0].text)}, indent=2))

asyncio.run(main())
PY
```

The expected result contains exactly 8 tools. The expected audit is `{"allowed": {}, "blocked": {}}`.

## Orchestrator verification

The orchestrator reran the frozen offline sync with the writable cache. It exited
with code 1 because `playwright==1.56.0` is unavailable in that cache. No network
retry was used for this verification.

The orchestrator ran `.venv/bin/python -m pytest -q`. It exited with code 1 and
`No module named pytest`. The service entry point is absent. No runtime test or
authenticated Suno check has passed in this run.

Codex Sol performed the dependency and browser checks. Codex Terra updated the
client instructions. The orchestrator validated both TOML examples, checked CLI
syntax, and ran `git diff --check` successfully.
