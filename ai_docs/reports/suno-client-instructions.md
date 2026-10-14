# Suno client instructions

## Status

Global Codex registration is a pending user action.

Global Claude Code registration is a pending user action.

Interactive Suno login is a pending user action.

Dependency and browser installation are pending user actions. Runtime checks
cannot run until installation succeeds. See [the runtime report](suno-local-runtime.md)
for the failed installation evidence and post-install checks.

This report does not change client settings or browser profiles.

Run these steps from your normal Terminal. This agent session cannot write
global client settings, and restricted DNS prevents missing package downloads.

## Local paths

Service path:

```text
/Users/mascott/projects/public-skills/services/suno-mcp
```

`uv` path:

```text
/Users/mascott/.local/bin/uv
```

## Install the runtime

Install the locked dependencies and their matching browser before registration:

```bash
cd /Users/mascott/projects/public-skills/services/suno-mcp
/Users/mascott/.local/bin/uv sync --frozen
/Users/mascott/.local/bin/uv run --frozen --offline playwright install chromium
/Users/mascott/.local/bin/uv run --frozen --offline suno-local check
```

Stop if a command fails. `playwright install chromium` downloads the browser;
`--offline` applies to uv package resolution, not that browser download.

## Codex registration

```bash
codex mcp add suno -- /Users/mascott/.local/bin/uv run --directory /Users/mascott/projects/public-skills/services/suno-mcp --frozen --offline suno-local serve
```

Check the registration:

```bash
codex mcp list
```

Restart Codex after registration. The Codex configuration can use this entry:

```toml
[mcp_servers.suno]
command = "/Users/mascott/.local/bin/uv"
args = ["run", "--directory", "/Users/mascott/projects/public-skills/services/suno-mcp", "--frozen", "--offline", "suno-local", "serve"]
startup_timeout_sec = 30
tool_timeout_sec = 240
```

If `[mcp_servers.suno]` exists, add the 2 timeout fields inside that table.

## Claude Code registration

```bash
claude mcp add --transport stdio --scope user suno -- /Users/mascott/.local/bin/uv run --directory /Users/mascott/projects/public-skills/services/suno-mcp --frozen --offline suno-local serve
```

Check the registration:

```bash
claude mcp list
```

Restart Claude Code after registration. Run `/mcp` in Claude Code to inspect
the server.

## Login and verification

```bash
/Users/mascott/.local/bin/uv run --directory /Users/mascott/projects/public-skills/services/suno-mcp --frozen --offline suno-local login
```

The frozen offline server launch does not resolve or download packages. Run
the login command interactively before you use an authenticated Suno tool.

Tool discovery verifies the MCP connection. It does not verify authenticated
Suno access. Call `suno_get_credits` after login to verify the saved session.

Login and 2 active servers cannot use the same profile at the same time. Set
independent `SUNO_PROFILE_DIR` values for concurrent use. Log in to each
profile separately.
