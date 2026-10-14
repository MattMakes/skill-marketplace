# Suno local setup pre-flight

Result: CLEAR for runtime preparation and documentation. HOLD for global registration and interactive Suno sign-in.

- Wiring PASS: `pyproject.toml` maps `suno-local` to `suno_local.cli:main`. The CLI dispatches `serve` to the low-level stdio server. Browser startup is lazy.
- Preservation PASS: plans prohibit source, lockfile, guard, and existing user-change edits. The existing third-party notice deletion is outside scope.
- Contracts PASS: both installed clients accept a stdio command after `--`. Claude user scope must be explicit.
- Configuration WARN: Codex defaults to 60 seconds per tool; documentation must provide 240 seconds for the 180-second Suno wait tool.
- Domain values PASS: default profile and download directories remain unchanged. Shared-profile access remains exclusive.
- Credentials WARN: no Suno profile exists. The user must sign in interactively; no cookie or credential extraction is authorized or needed.
- Environment WARN: no service virtual environment exists. Cached packages and compatible browser availability require verification. Restricted network access can block installation.
- Permissions HOLD: global Codex and Claude settings are outside writable roots. Workers must not bypass that boundary.
- Acceptance PASS: plans specify frozen runtime checks, existing tests, a real MCP handshake, 8-tool discovery, non-network audit, CLI syntax checks, and documentation verification.

Official references fetched: https://learn.chatgpt.com/docs/extend/mcp?surface=cli and https://code.claude.com/docs/en/mcp.
