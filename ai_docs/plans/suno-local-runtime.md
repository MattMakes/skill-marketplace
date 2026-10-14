# GOAL
Prepare the existing Suno MCP runtime and verify its stdio interface within the permitted filesystem and network boundaries.

# CONTEXT
The user requests local Suno MCP use from Codex and Claude Code.
The server already exists in `services/suno-mcp`.
Python dependencies and a Suno login profile are absent.
Another worker owns documentation only.
The orchestrator owns plans and integration decisions.

# FILES
- Own `services/suno-mcp/.venv/` and local generated runtime files.
- Own `ai_docs/reports/suno-local-runtime.md`.
- Use `/private/tmp/suno-local-setup/` for caches and test data.
- Do not edit source, tests, `pyproject.toml`, `uv.lock`, README, or client settings.
- Do not modify the existing deletion of `services/suno-mcp/THIRD_PARTY_NOTICES.md`.

# PRIOR WORK
The session ledger contains no earlier workers.
`uv` is `/Users/mascott/.local/bin/uv`.
Python 3.11 or newer is required.
`~/.cache/uv` exists and can be read.
Installed browser revisions are 1243, 1217, and 1234.
Playwright is pinned to 1.56.0 and may require another revision.
The README describes 43 tests and 8 MCP tools.
The server initializes without opening a browser.

# STEPS
1. Read the service configuration, CLI, and existing test commands.
2. Select an installed compatible Python executable.
3. Install the frozen environment using permitted caches and existing packages when possible.
4. Use a writable cache beneath `/private/tmp/suno-local-setup/`.
5. Copy only needed cached artifacts if the default cache needs writes.
6. Report missing packages if restricted network access prevents installation.
7. If installed, run `.venv/bin/suno-local check` from the service directory.
8. Run `.venv/bin/python -m pytest -q` from the service directory.
9. Run a real stdio handshake with `suno-local serve` and list the 8 tools.
10. Call only `suno_network_audit` in the smoke test.
11. Verify the pinned browser executable exists without opening Suno.
12. Write exact commands, observations, skips, and blockers to the report.

# CONSTRAINTS
Respect the orchestrator sandbox even if your session has broader permissions.
Write only under this repository, `/private/tmp`, and `/Users/mascott/.local/state/horch`.
Do not write under `.git`, `.agents`, `.codex`, or `.aws`.
Do not bypass restricted network access through another tool or process.
Do not request escalation.
Do not inspect credentials, cookies, or browser profile contents.
Do not run login, generate music, spend credits, or change network guards.
Do not install an unpinned replacement or change the lockfile.
Use existing tests; do not add tests for this operational task.

# DONE WHEN
- R1: The frozen runtime is installed, or a precise dependency blocker is documented.
- R2: `suno-local check` prints the default settings, or R1 explains why it cannot run.
- R3: Existing tests have exact pass and skip counts, or R1 explains why they cannot run.
- R4: A real stdio handshake lists 8 tools and audit returns empty counters, or R1 explains the blocker.
- R5: Browser availability is established for the pinned revision.
- R6: The report contains the remaining user commands and no secret values.

# REPORT
Use STE in messages.
Send blockers immediately with `horch tell orchestrator`.
Continue independent checks after a blocker.
Record evidence with `horch note`.
Finish with `horch done` and name the report, checks, and remaining dependencies.
