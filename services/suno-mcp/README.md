# suno-mcp (suno-local)

An MCP server that makes music with **your own suno.com login**, running entirely on your
machine, and that **cannot talk to anything but Suno**. It is a rebuild of the PyPI package
[`suno-mcp` 0.1.0](https://pypi.org/project/suno-mcp/) — same tools, same generation technique —
with every outbound path locked to an allowlist and the upstream package's risky defaults removed.

Like `breeze-tts`, this is a local companion, not a plugin: nothing installs it, and
`marketplace.json` does not list it.

## What the upstream package did, and what changed

I read every file of `suno-mcp` 0.1.0 (wheel and sdist are byte-identical; sha256
`bbbf282a…f23f` and `6cdea6e8…2196`). **It contains no hidden phone-home**: the only hosts in its
code are `studio-api.prod.suno.com`, `suno.com` and `cdn1.suno.ai`. What it did have were
defaults that expose your Suno session or your machine:

| Upstream | Risk | Here |
|---|---|---|
| Launched Chromium with `--remote-debugging-port=9222` | Any local process — or a page exploiting a DNS-rebinding bug — gets full control of a browser that is logged in to your Suno account | No port. Playwright drives Chromium over a pipe; the trusted click for hCaptcha rides the same pipe |
| If the profile was locked, attached to *whatever* browser was on `127.0.0.1:9222` | Could drive your everyday Chrome and every site you are logged in to | A locked profile is an error |
| `SUNO_CDP_URL` connected to any URL you gave it | Remote browser control | Removed |
| Clicked **Accept All / Allow All** on the cookie banner | Consented to Suno's ad and analytics tracking on your behalf | Clicks *Reject All*; the consent manager is usually blocked from loading anyway |
| `load_dotenv()` at import (and `FastMCP`, which also reads `.env`) | Configuration taken from whatever directory the MCP client launched it in | Environment variables only; uses the SDK's low-level server, which reads no files |
| `folder` argument: write the MP3 anywhere the model asked | The model chooses paths on your disk | Downloads only inside `SUNO_DOWNLOAD_DIR`; symlink and `..` escapes refused; never overwrites; 50 MB cap |
| Fetched any `audio_url` that contained the substring `"cdn"` | `https://evil-cdn.example/…` qualified | HTTPS to `*.suno.ai` only, re-checked on every redirect |
| Song IDs pasted into URLs as given | Query-string injection | UUIDs only, validated by the tool schema and again in code |
| Unpinned `mcp`, `httpx`, `playwright`, `python-dotenv`, `pydantic` | Whatever is newest on PyPI the day you install | Exact pins; `uv.lock` pins every package by sha256 |

## How "no phone-home" is enforced

The guarantee is not "I read the code and it looked fine". Three independent layers each refuse
traffic off the allowlist, so a dependency or a script on Suno's page that tried to send data
elsewhere would fail, and the failure is logged.

**1. The whole Python process** (`netguard.install_process_guard`). Before anything else runs, a
CPython [audit hook](https://docs.python.org/3/library/sys.html#sys.addaudithook) is installed. Audit
hooks cannot be removed. It refuses DNS lookups for any host but `studio-api.prod.suno.com` and
`*.suno.ai`, and refuses socket connects to any IP that did not come from one of those lookups —
including `127.0.0.1`, so a local proxy cannot be used as a relay. This covers `mcp`, `httpx`,
`pydantic`, and any code they pull in, whichever HTTP library it uses.

**2. httpx** (`GuardedTransport`). Every request must be HTTPS to an allowlisted host; each redirect
hop is checked again. `trust_env=False`, so proxy variables and `~/.netrc` are ignored. The Suno
bearer token is only ever sent to the studio API, never to the CDN.

**3. The browser** — the part that loads Suno's own site, which is where trackers live:

- `--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE <allowlist>`: Chromium's own resolver refuses
  every other host, and bare IP literals.
- `--proxy-server=http://blocked.invalid:9` with only the allowlist bypassed: everything else is
  sent to a proxy that cannot exist. This also overrides any system or environment proxy, which
  would otherwise resolve names for Chromium and make the resolver rules moot.
- Playwright request and WebSocket interception, so blocked requests are counted and reported.
- Service workers blocked; WebRTC restricted to proxied UDP (so no STUN leaks); background
  networking, component updates, sync and pings off.

The browser layers exist because the test suite found that Playwright's interception alone **does
not see `navigator.sendBeacon` or `fetch(…, {keepalive: true})`**. `tests/test_browser_guard.py`
fires both at a local server: with interception only they arrive, with this server's flags they do
not. That control run is part of the test, so the test fails if it ever stops measuring.

The browser allowlist (`suno-local check` prints it):

```
suno.com  *.suno.com  suno.ai  *.suno.ai  hcaptcha.com  *.hcaptcha.com  challenges.cloudflare.com
```

Ask the model to call **`suno_network_audit`** at any time to see every host that was allowed or
blocked this session, per layer. Blocked hosts are also printed to stderr the first time they occur.

**What this does not cover.** Suno itself sees what you send it — that is the service. The Node
process that ships with Playwright, which relays commands to the browser over pipes, is not under
the Python audit hook; Playwright has no telemetry, and it is the version pinned in `uv.lock`. The
one-time `playwright install chromium` downloads the browser from Microsoft's CDN.

## Requirements

Python 3.11+, [uv](https://docs.astral.sh/uv/), and a Suno account (free or paid). Optionally
[`just`](https://github.com/casey/just).

## Setup

From this directory (`services/suno-mcp`):

```bash
just install    # uv sync --frozen (hash-checked), then download Playwright's Chromium
just login      # opens a browser on suno.com/create; sign in, and it closes itself
just check      # prints settings and allowlists; `just check-live` also reads your credits
```

Without `just`:

```bash
uv sync --frozen
uv run --frozen playwright install chromium
uv run --frozen --offline suno-local login
```

`login` is the only time the browser may reach a sign-in provider (Google, Apple, Microsoft,
Discord); the MCP server never runs with those hosts. Your session is saved in
`~/.suno-local/profile` (mode `700`). Google sometimes refuses sign-in from an automated
browser; if it does, use another Suno sign-in method, or set `SUNO_BROWSER_CHANNEL=chrome` to use
your installed Chrome binary (with a separate, allowlisted profile — not your everyday one).

## Connect it to an MCP client

The server uses stdio. It starts the browser only when a tool needs Suno, so
tool discovery proves that the MCP connection works but does not prove that a
saved Suno session works.

### Codex

Use the [Codex MCP CLI documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
to register a local stdio server:

```bash
codex mcp add suno -- uv run --directory /absolute/path/to/services/suno-mcp --frozen --offline suno-local serve
```

The equivalent `~/.codex/config.toml` entry is:

```toml
[mcp_servers.suno]
command = "uv"
args = ["run", "--directory", "/absolute/path/to/services/suno-mcp", "--frozen", "--offline", "suno-local", "serve"]
startup_timeout_sec = 30
tool_timeout_sec = 240
```

The 240-second tool timeout allows `suno_wait_for_songs` to use its full
180-second wait. If `[mcp_servers.suno]` already exists, add
`startup_timeout_sec = 30` and `tool_timeout_sec = 240` inside that existing
table. Do not create a second table with the same name.

### Claude Code

Use the [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp)
to register the server in user scope:

```bash
claude mcp add --transport stdio --scope user suno -- uv run --directory /absolute/path/to/services/suno-mcp --frozen --offline suno-local serve
```

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`), Cursor
(`~/.cursor/mcp.json`) and other clients:

```json
{
  "mcpServers": {
    "suno": {
      "command": "uv",
      "args": ["run", "--directory", "/absolute/path/to/services/suno-mcp",
               "--frozen", "--offline", "suno-local", "serve"]
    }
  }
}
```

`--frozen --offline` means starting the server never resolves or downloads a package.

Use an absolute path to `uv` in a GUI client when that client does not inherit
your shell `PATH`. For example, set `"command": "/absolute/path/to/uv"` in a
JSON configuration or set `command = "/absolute/path/to/uv"` in the Codex TOML
entry.

Run `uv sync --frozen` and install Chromium before you register the server.
The `--frozen --offline` launch then uses only the installed lockfile state.
Run `uv run --frozen --offline suno-local login` interactively before a tool
needs authenticated Suno access. The login command opens a browser and saves
the session profile.

Close the login browser before you start a server. Login and 2 active servers
cannot share one `SUNO_PROFILE_DIR` at the same time. To run concurrent
sessions, set a different `SUNO_PROFILE_DIR` for each server and log in to each
profile separately.

After registration, restart Codex or Claude Code. Run `codex mcp list` or
`claude mcp list` to check the registration. In Claude Code, run `/mcp` after
the restart to inspect the server. A listed server and discovered tools only
verify MCP transport. Run an authenticated Suno tool, such as
`suno_get_credits`, to verify the saved Suno login.

## Tools

| Tool | What it does |
|---|---|
| `suno_get_credits` | Credit balance and plan |
| `suno_get_recent` | Recent songs in your library |
| `suno_generate_song` | Custom mode: your lyrics plus a style. Spends credits |
| `suno_generate_from_description` | Simple mode: describe it, Suno writes the lyrics. Spends credits |
| `suno_check_status` | Status of up to 20 songs |
| `suno_wait_for_songs` | Wait up to 3 minutes for songs to finish |
| `suno_download_song` | Save a finished song as MP3 in your download folder (`subfolder`, `filename` optional) |
| `suno_network_audit` | Every host allowed or blocked this session |

Generation drives the visible Suno window: it fills the form through React, then sends a trusted
click, because hCaptcha rejects synthetic ones. Keep the window visible; if hCaptcha shows a
challenge, solve it there.

## Configuration

Environment variables only — put them in the `env` block of your MCP client config.

| Variable | Default | |
|---|---|---|
| `SUNO_PROFILE_DIR` | `~/.suno-local/profile` | Browser profile holding your Suno session |
| `SUNO_DOWNLOAD_DIR` | `~/Music/Suno` | The only place MP3s are written |
| `SUNO_HEADLESS` | `false` | Generation needs a visible window; reads work headless |
| `SUNO_BROWSER_CHANNEL` | Playwright Chromium | `chrome` or `msedge` to use an installed browser binary |
| `SUNO_EXTRA_ALLOWED_HOSTS` | — | Comma-separated hosts or `*.domain` patterns to add to the **browser** allowlist. Bare `*`, `*.com` and the like are refused |
| `SUNO_DEBUG` | `false` | Debug logging to stderr |

If Suno changes its site and something it needs is blocked, the stderr log names the host
(`[suno-local] blocked browser request to …`). Look at what it is before adding it to
`SUNO_EXTRA_ALLOWED_HOSTS`.

## Tests

```bash
just test       # or: uv run --frozen pytest
```

43 tests, none of which need a Suno account or network access. They cover host matching, the
audit hook (in a fresh interpreter: other hosts, hard-coded IPs, urllib, UDP, loopback and an
environment proxy are all refused), redirect hops, download confinement, that the bearer token
never reaches the CDN, a planted `.env` being ignored, the MCP server over real stdio, and a real
Chromium proving trackers, IP literals, WebSockets, beacons and keepalive fetches are blocked and
that no debugging port is opened. The browser tests skip if Chromium is not installed.

## Limitations

- Unofficial: it uses Suno's internal endpoints and page structure, and will break when they
  change. Use it within [Suno's terms](https://suno.com/terms).
- Generation needs a visible browser window and spends your credits like the website does.
- Only one process can use the profile at a time: close the `login` window before starting the
  server, and do not run two servers.

## Credits

The generation technique and tool set come from [`suno-mcp`](https://github.com/David-J-Shibley/suno-mcp)
by David Shibley, which adapted it from [unforced/suno-mcp](https://github.com/unforced/suno-mcp).
Both MIT; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
