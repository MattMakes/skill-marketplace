# verify — Verification and Testing

Twenty-two skills for proving a change works: harnesses that capture runtime evidence,
browser and desktop QA, test-suite authoring and auditing, load tests, and review lenses.
All of them are vendored from upstream repositories and maintained here.

```bash
claude plugin install verify@skill-marketplace
```

## Skills

### Prove a change works

| Skill | Use it when |
|---|---|
| `verify-feature` | You changed code and want to know it works, or are about to merge. Finds the diff, identifies the runtime surface (CLI, API, UI, library, agent), drives the changed code there, probes around it, and reports PASS, FAIL, BLOCKED or SKIP with captured evidence. A UI change is not a PASS without a screenshot or video (shot-scraper if installed, Playwright otherwise). Four reference playbooks: inert-feature probe, stale-evidence gate, false-FAIL triage, isolated component harness. |
| `verify-this` | "Verify this", "prove it works", "did this fix it". Restates the claim falsifiably, captures baseline and treatment under identical conditions, compares artifacts, and returns exactly one of VERIFIED, NOT VERIFIED or INCONCLUSIVE. |
| `santa-method` | Output that will be published, deployed or shipped without human review. Two independent reviewer subagents with the same rubric must both pass; a fresh-agent fix loop capped at three rounds; batch sampling for large runs. |
| `control-cli` | Driving an interactive CLI or TUI deterministically: tmux `send-keys`/`capture-pane` loop, a Python pty fallback, Node inspector hookup, profiling recipes for startup time, hangs and leaks. |
| `control-ui` | Driving a web, IDE or Electron UI locally: Playwright or CDP harness, page selection by stable marker, one-action-per-snapshot loop, CDP capabilities list, privacy and cleanup guardrails. |
| `full-page-screenshot` | You need one PNG of an entire page, including an authenticated tab you already have open. A single Node 22+ script over the Chrome DevTools Protocol that handles SPA scroll containers, lazy images and very tall pages. |

### Browser and desktop QA

| Skill | Use it when |
|---|---|
| `dogfood` | "Dogfood", "QA", "bug hunt" a web app. Structured exploration, repro-first documentation (video and step screenshots for interactive bugs, one annotated shot for static ones), issue taxonomy, backend 5xx triage, design critique, and a report template. Uses `agent-browser` if installed, Playwright otherwise. |
| `adversarial-ux-test` | Stress-test the UX by roleplaying the most tech-resistant user for the product, then run the mandatory pragmatism filter (RED, YELLOW, WHITE, GREEN) so only real problems become tickets. |
| `webapp-testing` | Testing a local web app with Python Playwright: `with_server.py` starts the servers you name and runs your script against them; reconnaissance-then-action pattern; three example scripts. |
| `ui-demo` | Recording a demo, walkthrough or tutorial video of a web app. Discover, rehearse, record; injected SVG cursor, slow typing, subtitle bar, full script template, twelve pitfalls. |
| `ios-simulator` | QA of an iOS app end to end on macOS: 21 Python scripts for boot, install, launch, tap by accessibility label, type, swipe, screenshot, visual diff, logs, push notifications, permissions and status bar. |
| `windows-desktop-e2e` | E2E tests for a Windows native app (WPF, WinForms, Win32/MFC, Qt) with pywinauto and UI Automation: AutomationId setup per framework, page objects, three isolation tiers, screenshot fallback, CI on `windows-latest`. |

### Test suites

| Skill | Use it when |
|---|---|
| `playwright-pro` | Writing or fixing Playwright tests. Four workflows in one skill: init a project, generate tests from a story, URL or component using 55 templates (auth, CRUD, checkout, search, forms, dashboard, settings, onboarding, notifications, API, accessibility), review against 20 anti-patterns, and fix flaky tests by category. |
| `react-testing` | Testing React components, hooks or pages with React Testing Library and Vitest or Jest: query priority, `userEvent`, MSW with `onUnhandledRequest: "error"`, provider wrapper, `renderHook`, axe, and when to leave JSDOM for Playwright. |
| `integration-e2e-testing` | Deciding which integration and E2E tests to write: lane definitions with enforced budgets, an ROI formula with thresholds per lane, the multi-step-journey rule, required skeleton annotations, EARS mapping and review criteria. |
| `bats-testing-patterns` | Unit-testing shell scripts with Bats: error conditions, dependency skips, shell-dialect checks, helpers, fixtures and CI wiring. |
| `test-audit` | The test suite has grown and you suspect tests that cost more than they protect. Four-question test value bar, a mechanical pre-filter (no assertions, source greps, export lists, near-duplicates), a complete retirement card per candidate, and retirement only in batches you approve. Report-only otherwise. |
| `k6-load-testing` | Load, stress, spike or soak testing an HTTP API, WebSocket or browser flow with k6: scenario configs, thresholds, checks, custom metrics, data parameterization, result analysis and CI integration. |

### Review lenses

| Skill | Use it when |
|---|---|
| `click-path-audit` | A button "does nothing" but no function is broken. Maps every store action's sets and resets, traces each handler call in order, and names six patterns (sequential undo, async race, stale closure, missing transition, dead path, `useEffect` interference). |
| `api-design-reviewer` | Reviewing a REST API or an OpenAPI spec. Three Python scripts: a convention linter, a breaking-change detector that can gate CI with `--exit-on-breaking`, and a weighted design scorecard with `--min-grade`, plus REST design rules and anti-pattern references. |
| `python-anti-patterns` | A checklist of concrete Python anti-patterns with fixes, for review before merge or when debugging. |
| `ai-debt-detector` | After an AI-generated change: failure modes, orphaned resources, edge cases, hallucinated dependencies and architectural drift, with red flags to stop on. |

## What these write and where they reach

Installing this plugin wires no hooks, MCP servers or background processes. Skills that
run things:

- **`api-design-reviewer`** — three stdlib-only Python scripts under its `scripts/`
  (`api_linter.py`, `breaking_change_detector.py`, `api_scorecard.py`). They read the
  JSON spec files you pass and write only the `-o` output you ask for. No network.
- **`full-page-screenshot`** — `scripts/full-page-screenshot.mjs` (Node 22+) connects to
  your local Chrome's remote-debugging port: it reads Chrome's `DevToolsActivePort` file
  from the profile directory, probes `localhost` ports 9222, 9229 and 9333, and falls
  back to a local CDP proxy on `localhost:3456` if one is running. `--url` mode opens
  that URL in your Chrome, which is network use by purpose. Very tall pages are
  stitched with Python Pillow when it is installed; otherwise the tiles are saved
  separately. Writes the PNG path you give it (default `/tmp/screenshot.png`).
- **`webapp-testing`** — `scripts/with_server.py` spawns the server commands you name,
  waits on their ports, runs your command and kills them afterwards. The Playwright
  scripts you write with it need `pip install playwright` and a Chromium install.
- **`ios-simulator`** — macOS only. Its 21 scripts drive `xcrun simctl`, `xcodebuild` and
  optionally IDB. They cache xcresult bundles and device lists under
  `~/.ios-simulator-skill/`, write temporary screenshots to `/tmp`, and
  `build_and_test.py` remembers your simulator choice at
  `<project>/.claude/skills/ios-simulator/config.json`. `sim_health_check.sh` prints
  an install URL for IDB but downloads nothing. This is a 400 KB payload of scripts;
  the scripts are the point.
- **`test-audit`** — writes its report and JSON sidecar to `.claude/test-audit/` inside
  the repository (untracked scratch; do not commit it). It edits tests only in a batch
  you approve and never commits or pushes.
- **`dogfood`** — writes screenshots, videos and `report.md` to `./dogfood-output/`
  (overridable). Uses the `agent-browser` CLI if present, Playwright or your browser
  tool otherwise. Publishing a report to Surge happens only when you ask for it and is
  a network deploy.
- **`verify-feature`** — captures to `/tmp`. Prefers `shot-scraper` for UI captures and
  may offer to install it (`uv tool install shot-scraper` or `pip`, then
  `shot-scraper install` fetches a bundled Chromium); Playwright is the fallback. Its
  isolated-component recipe starts a throwaway Vite dev server on `127.0.0.1:9123`.
- **`control-cli`, `control-ui`, `verify-this`** — temporary harnesses under `/tmp`:
  tmux sessions, pty probes, Playwright or CDP connections to a dev server or debug
  port you start. They are told to clean up after themselves.
- **`ui-demo`** — a Node Playwright script you write from its template; records WebM
  into a `screenshots/` directory next to the script.
- **`k6-load-testing`** — the k6 CLI; load tests you write hit whatever target you name.
  The GitHub Actions and GitLab examples are templates, not installed workflows.
- **`santa-method`** — spawns reviewer subagents with the Agent tool; nothing on disk.
- **`playwright-pro`** is 540 KB of Markdown templates and references; it runs only the
  `npx playwright` commands it tells you to run in your project.

`windows-desktop-e2e`, `react-testing`, `integration-e2e-testing`,
`bats-testing-patterns`, `click-path-audit`, `adversarial-ux-test`,
`python-anti-patterns` and `ai-debt-detector` are prose and code samples only.

## Credits

Every skill here is a vendored, supply-chain-controlled copy of a third-party skill:
reviewed on the way in, kept as this marketplace's own copy, and re-pulled from upstream
deliberately rather than tracked live. Upstream repository, path, commit, date, license
and author for each skill, and the list of changes made here, are in
[NOTICE.md](NOTICE.md). Sources: affaan-m/ECC, alirezarezvani/claude-skills,
cursor/plugins (cursor-team-kit), garrytan/gstack, shinpr/claude-code-workflows,
anthropics/skills, davila7/claude-code-templates, exiao/skills and wshobson/agents.

## Invoking

Namespaced under the plugin: `verify:verify-feature`, `verify:verify-this`,
`verify:dogfood`, `verify:playwright-pro`, `verify:test-audit`, and so on.
