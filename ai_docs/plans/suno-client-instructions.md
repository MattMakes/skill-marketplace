# GOAL
Document accurate local Suno MCP registration and verification for Codex and Claude Code.

# CONTEXT
The user wants the existing Suno server available in both local clients.
Both CLIs and uv are installed.
Neither client currently has a Suno server.
Global settings are outside the orchestrator write permissions.
The runtime worker owns dependency installation and test evidence.

# FILES
- Own `services/suno-mcp/README.md`.
- Own `ai_docs/reports/suno-client-instructions.md`.
- Do not edit any other files.
- Preserve the existing deletion of `services/suno-mcp/THIRD_PARTY_NOTICES.md`.

# PRIOR WORK
No previous worker summaries exist.
Read-only inspection finds no Suno entry in `~/.codex/config.toml` or `~/.claude.json`.
`~/.suno-local/profile` does not exist.
`uv` resolves to `/Users/mascott/.local/bin/uv`.
The service path is `/Users/mascott/projects/public-skills/services/suno-mcp`.
The existing server uses stdio and opens its browser lazily.
Codex supports `codex mcp add NAME -- COMMAND ARGS`.
Claude supports `claude mcp add --transport stdio --scope user NAME -- COMMAND ARGS`.
Codex has a default tool timeout of 60 seconds.
The song-wait tool waits for up to 180 seconds.

# STEPS
1. Read the README and the timeout behavior in the Suno source.
2. Check both installed CLI help outputs without changing global settings.
3. Extend the connection section with Codex CLI registration and a complete TOML example.
4. Set `startup_timeout_sec = 30` and `tool_timeout_sec = 240` in the TOML example.
5. Explain how to add timeout fields inside an existing `[mcp_servers.suno]` table.
6. Use user scope explicitly in the Claude Code example.
7. Preserve the existing JSON example for other clients.
8. Explain absolute uv paths when a GUI client does not inherit shell PATH.
9. Document frozen offline launches and interactive Suno login.
10. Explain that login and 2 active servers cannot share the profile simultaneously.
11. Document independent `SUNO_PROFILE_DIR` values as an optional concurrent-use alternative that requires separate logins.
12. Document registration checks and `/mcp` after restarting the clients.
13. Distinguish tool discovery from authenticated Suno access.
14. Put exact machine-specific registration and login commands in the report.
15. Check the diff and validate every shell command against installed CLI help.

# CONSTRAINTS
Do not edit global client settings or browser profiles.
Do not invoke login or any generation tool.
Do not change runtime source, dependency pins, or network guards.
Do not add a plugin or installer framework.
Do not revert user changes.
Keep reusable README examples free of this user's home path.
Use the actual local paths in the local report only.
Cite official client documentation in the README where it helps the setup.
Official Codex source: https://learn.chatgpt.com/docs/extend/mcp?surface=cli
Official Claude source: https://code.claude.com/docs/en/mcp
The orchestrator already fetched both official sources.

# DONE WHEN
- D1: Both clients have complete registration instructions with correct scope and stdio syntax.
- D2: Codex configuration accommodates the 180-second wait tool.
- D3: Login and concurrent profile limits are explicit.
- D4: The report contains exact registration commands and verification commands.
- D5: `git diff --check` passes for your changes.

# REPORT
Use STE in messages.
Report unresolved dependencies with `horch tell orchestrator`.
Record progress with `horch note`.
Finish with `horch done` and include owned paths, checks, and remaining steps.
