# Quick Playwright mode

<!-- Adapted from anthropics/skills skills/webapp-testing at dbd4588 (Apache-2.0, see
../LICENSE-webapp-testing.txt). Changed here on 2026-11-05: folded into control-ui as a mode,
paths rewritten to this skill, decision tree and pattern text condensed. -->

Native Python Playwright scripts against a local web app, with `scripts/with_server.py`
starting and stopping the servers.

## The helper is a black box

Run `python3 "${CLAUDE_PLUGIN_ROOT}/skills/control-ui/scripts/with_server.py" --help` first. Do
not read its source unless running it shows you need a custom solution; it exists to be called,
not loaded into context.

## Decision tree

```
Task → Is it static HTML?
    ├─ Yes → Read the HTML file for selectors
    │         ├─ Found them → Playwright script on a file:// URL (examples/static_html_automation.py)
    │         └─ Incomplete → treat as dynamic
    │
    └─ No (dynamic app) → Is the server already running?
        ├─ No  → with_server.py --help, then wrap a short Playwright script with it
        └─ Yes → Reconnaissance-then-action (below)
```

## with_server.py

One server:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/control-ui/scripts/with_server.py" \
  --server "npm run dev" --port 5173 -- python3 your_automation.py
```

Several (backend and frontend):

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/control-ui/scripts/with_server.py" \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python3 your_automation.py
```

It waits for each port to accept connections, runs the command after `--`, then kills the
servers. The automation script holds only Playwright logic:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)  # always headless
    page = browser.new_page()
    page.goto('http://localhost:5173')          # server is already up
    page.wait_for_load_state('networkidle')     # CRITICAL: let the JS run first
    # ... automation
    browser.close()
```

## Reconnaissance-then-action

1. Inspect the rendered DOM: `page.screenshot(path='/tmp/inspect.png', full_page=True)`,
   `page.content()`, `page.locator('button').all()`.
2. Pick selectors from what you saw.
3. Act with those selectors.

Common pitfall: inspecting the DOM of a dynamic app before `networkidle`. Wait first.

## Practice

- `sync_playwright()` for synchronous scripts; always close the browser.
- Descriptive selectors: `text=`, `role=`, CSS, IDs.
- Explicit waits: `page.wait_for_selector()`, or `page.wait_for_timeout()` as a last resort.

## Examples

In `${CLAUDE_PLUGIN_ROOT}/skills/control-ui/examples/`:

- `element_discovery.py` — list the buttons, links and inputs on a page
- `static_html_automation.py` — drive a local HTML file through a `file://` URL
- `console_logging.py` — capture console messages during a run (change its output path from
  upstream's `/mnt/user-data/outputs/` to somewhere local)
