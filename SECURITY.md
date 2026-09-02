# Security notes

**Date:** 2026-09-02
**Scope:** the five plugins in `plugins/`, as packaged in this repo.

Most of this marketplace is first-party: the `ddd`, `game`, `code` and `herdr` skills were written
by the owner. `tools` bundles third-party skills, credited in
[plugins/tools/README.md](plugins/tools/README.md). `code`'s CORE contract is adapted from DOX
(agent0ai/dox, MIT) and `herdr` drives the separately installed herdr CLI (herdr.dev); neither
upstream tool is bundled here.

**Installing any of these plugins wires no hooks, no MCP servers and no LSP servers.** Nothing
here starts a background process. Every script runs only when a skill tells Claude to run it.

```bash
find plugins -name hooks.json -o -name .mcp.json -o -name .lsp.json -o -name monitors.json
# no output
```

**One skill installs hooks when you run it.** `core`'s prime (`graph.sh`) defaults to
`HOOKS=1`: it runs `graphify hook install` (git post-commit and post-checkout rebuilds, plus a
merge driver) and `graphify claude install --project`, which writes a project-local
`.claude/skills/graphify` and a PreToolUse hook-guard into that repo's `.claude/settings.json`.
It also appends two `graphify-out/` lines to the repo's `.gitignore`. All of it lands in the
repository you primed, never in your home directory, and `graph.sh --no-hooks` skips the hook
half entirely.

## Network egress

These hosts are reachable from executable files. Everything else — and there is a lot of it, in
the `blueprint` renderer's icon and palette tables and the `game` reference notes — is inert
strings in data and documentation, never dereferenced.

| Host | Where | When it is contacted |
|---|---|---|
| `app.mochi.cards` | `tools/skills/mochi-deck/scripts/mochi_deck.py` | **Only** when you ask to upload a deck. Requires `MOCHI_API_KEY`. Without it the script writes a local `.mochi` file and stops. |
| PyPI | `code/skills/core/scripts/graph.sh` | Installs `graphifyy` on the first prime, trying `uv tool install`, then `pipx`, then `pip --user`. Isolated and reversible; if none are available it prints the command and stops. |
| `localhost` / `127.0.0.1` | `code/skills/e2e-harness/scripts/e2elib/runner.py` and the generated harness | The system under test — compose services, Kafka, Playwright targets. Loopback only. |
| `json-schema.org` | `ddd/shared/schemas/*.json`, `ddd/skills/blueprint/schemas/*.json` | `$schema` identifiers. Never dereferenced. |
| `w3.org` | SVG output in the `blueprint` renderer | XML namespace declarations. Never dereferenced. |
| `herdr.dev` | `herdr/skills/herdr-orchestrator/scripts/install.sh` | A documentation link inside an error message. Never fetched. |

No telemetry, no webhooks, no analytics, no background egress. Nothing here fetches a remote page
as *input* — every skill's input is your own repo, your own documents, or what you typed.

## Code execution

- **`code`** — `core`'s scripts are filesystem work plus deterministic `graphify` calls
  (tree-sitter, no model, no API key); the one model-spending path is opt-in behind
  `graph.sh --label`. Priming a repo installs into that repo by default — git hooks, a
  PreToolUse hook-guard, a project-local `graphify` skill, two `.gitignore` lines — which is the
  point (the graph only pays for itself if it gets consulted), but it is a write to your
  project's `.claude/settings.json`. `--no-hooks` opts out; read the diff either way.
  `e2e-harness` runs `subprocess` deliberately — it brings compose services
  up, waits on readiness, runs Playwright, tears down. It executes the project's own commands as
  resolved from the repo, not commands it invents.
- **`herdr`** — shell scripts that drive the `herdr` CLI and spawn agent sessions in terminal
  panes. Spawning processes is the whole purpose; the fleet runs whatever tier binaries you have
  installed. `install.sh` symlinks `horch` into `~/.local/bin` (`HORCH_BIN_DIR` overrides) and
  writes into your skills directory (`CLAUDE_SKILLS_DIR` overrides). Nothing runs until you
  invoke it.
- **`ddd`, `game`** — plain Node, stdlib plus a vendored [elkjs](https://github.com/kieler/elkjs)
  layout engine that runs in-process with no worker. No `eval`, no `new Function`, no
  `os.system`. It does use dynamic `import()` — to lazy-load its own modules by a path it
  computed, never a path from your data. All file writes land in the workspace folder the skill
  was pointed at. `ddd`'s test suite spawns subprocesses; that is the test suite, not the skills.
- **`tools/unlazy` and `unlazy-lite`** — these two *do* spawn subprocesses
  (`node:child_process` in `scripts/gate-check.mjs`). That is the point of the skill: it runs the
  verification commands you wrote into a gate file and reports pass/fail. It runs your commands,
  not commands it invented, and `install-hooks.mjs` only writes hook entries into a settings file
  when you explicitly invoke it. Review a gate file before letting it run, as you would any local
  task runner.

## Credentials

One credential is read anywhere in this marketplace: `mochi-deck` reads `MOCHI_API_KEY` from the
environment, falling back to `~/.config/mochi/api_key`, and sends it only to `app.mochi.cards`.
Nothing reads `~/.ssh`, `~/.aws`, `.env` files, or the shell history.

## Re-running this audit

The `code` plugin vendors a Playwright fixture, so exclude `node_modules` or it drowns the signal.
Two `ddd` sources contain literal NUL bytes, which makes `grep` treat them as binary and skip them
silently — pass `-a`, and include `*.js` or you will miss the vendored layout engine.

```bash
cd plugins
src() { grep -ra --include='*.py' --include='*.sh' --include='*.mjs' --include='*.js' \
             --exclude-dir=node_modules "$@" . ; }

src -hoE 'https?://[^ )"]+' | sed -E 's|(https?://[^/]+).*|\1|' | sort -u
src -nE '\beval\(|new Function|\bexec\(|os\.system|base64 -d|child_process'
src -nE 'API_KEY|TOKEN|SECRET|PASSWORD|\.ssh|\.aws'
```

The first sweep returns many hosts — most are inert strings in icon tables, brand palettes and
reference notes. Narrow it to the call sites:

```bash
src -nE '\bfetch\(|XMLHttpRequest|axios|urllib|requests\.(get|post)|http\.client|curl '
```

The second sweep is noisy for a different reason: `re.exec(` is a RegExp method, not a process
call. Filter those out before reading the results.

`ddd/shared/vendor/elkjs/elk.bundled.js` is minified, so it matches almost any identifier sweep on
one enormous line and will dominate the output. Exclude it while reading the rest, then treat it
as what it is — a vendored third-party bundle, best checked by diffing it against the elkjs
release you trust. `render-core.test.mjs` asserts it loads in-process without spawning a worker.

## Reporting

Open an issue on the repository. There is no bug bounty; these are personal tools published in
the hope they are useful.
