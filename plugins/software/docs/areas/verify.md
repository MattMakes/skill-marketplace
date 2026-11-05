# Verify — review and runtime verification (former `verify` plugin)

Is it right, and does it work? Thirty-two skills and one agent in two kinds, kept in separate
groups. **Review** skills read the code: a multi-reviewer sweep of a change, focused lenses, and
both sides of a human review. **Run** skills run the code: prove a claim with captured evidence,
drive a CLI, browser, simulator or desktop app, write and prune test suites, and explore an app
like a hostile user.

Start with `code-sweep` to review a change by reading it, and `verify-feature` to prove it works by
running it.

This area is part of the `software` plugin; see the [plugin README](../../README.md).

## Review: read the code

### Review a change

| Skill | What it does |
|---|---|
| `code-sweep` | Reviews a branch, commit, staged set or change (`--staged`, `--commit`, `--branch <name>`, `--change <n>`, `--only <codes>`). Full mode dispatches twelve specialized reviewers in parallel, one concern each (bugs, security, structure, power-of-ten, interface and more), and synthesizes a severity-ranked report with PASS/WARN/FAIL verdicts; the interface auditor runs the `design` plugin's gates on changed UI files when that plugin is installed. Light mode (`--light`), from the former `review-git-changes` of the `dev` plugin: a single pass over the commit history and diff, consistency and duplication checks, and an A-F grade on six aspects. |
| `code-reviewer` (agent) | Reviews recently changed code for quality, security and maintainability. Runs `git diff`, focuses on the modified files, and reports by priority. Used by `software:execute-plan` as its reviewer subagent. |

### Review lenses

| Skill | What it does |
|---|---|
| `ai-debt-detector` | After an AI-generated change: failure modes, orphaned resources, edge cases, hallucinated dependencies and architectural drift, with red flags to stop on. |
| `complexity-sweep` | Runs a bundled static-analysis CLI over TypeScript, JavaScript, Python, Rust and GDScript (Godot 4), measuring 14 metrics in five families (control flow such as McCabe cyclomatic and essential complexity, data flow, cognitive load, information density such as Halstead, and composites such as the maintainability index), then reviews each function that breaks a threshold and either refactors it directly, re-running the analysis to confirm, or emits one structured refactoring prompt per function. It can also generate the repo's config file. |
| `blast-radius` | "What could this break", or a small diff you do not trust. Finds the one fact the change is safe because of and proves it by running real code, on a five-rung evidence ladder, looking where grep stops. |
| `api-design-reviewer` | Reviewing a REST API or an OpenAPI spec. Three Python scripts: a convention linter, a breaking-change detector that can gate CI with `--exit-on-breaking`, and a weighted design scorecard with `--min-grade`, plus REST design rules and anti-pattern references. |
| `python-anti-patterns` | A checklist of concrete Python anti-patterns with fixes, for review before merge or when debugging. |

### Give and take review

| Skill | What it does |
|---|---|
| `code-review-excellence` | Reviewing a change or setting review standards. Constructive, catches bugs early, keeps morale. |
| `receiving-code-review` | Review feedback arrives, especially when it is unclear or technically questionable. Verify before implementing; no performative agreement. |

## Run: prove it works

### Prove a claim

| Skill | What it does |
|---|---|
| `verify-feature` | You changed code and want to know it works, or are about to merge. Finds the diff, identifies the runtime surface (CLI, API, UI, library, agent), drives the changed code there, probes around it, and reports PASS, FAIL, BLOCKED or SKIP with captured evidence. A UI change is not a PASS without a screenshot or video (shot-scraper if installed, Playwright otherwise). Four reference playbooks: inert-feature probe, stale-evidence gate, false-FAIL triage, isolated component harness. |
| `verify-this` | "Verify this", "prove it works", "did this fix it". Restates the claim falsifiably, captures baseline and treatment under identical conditions, compares artifacts, and returns exactly one of VERIFIED, NOT VERIFIED or INCONCLUSIVE. |
| `santa-method` | Output that will be published, deployed or shipped without human review. Two independent reviewer subagents with the same rubric must both pass; a fresh-agent fix loop capped at three rounds; batch sampling for large runs. |
| `human-gate` | A plan, spec, RFC, report, migration or any irreversible action needs a named person's sign-off before it ships. Builds a single-file HTML review page, collects severity-graded feedback as a parseable `batch.v1` sidecar anyone can write by hand, and runs a gate that refuses to close with an open BLOCKER, an unnamed reviewer, or no review at all. Python 3, stdlib only. |
| `benchmark-checklist` | You ran a benchmark or are about to report a speedup or regression. Seven questions (limiter, tuning, physical limits, errors, alternating repeats, end-to-end relevance, did the work happen) and a report format. |

### Project verification skill

| Skill | What it does |
|---|---|
| `create-verification-skill` | A project has no scripted way to prove UI, CLI or service behavior. Interviews the repo, writes `.claude/skills/verify-<app>/` (launch, doctor, drive, evidence, cleanup, helpers) and a per-feature map, and proves it end to end before handing over. |
| `maintain-verification-skill` | Keeping that generated skill honest as the app changes. Parallel source readers per feature, one mandatory live pass under three invariants, triage into doc drift, harness gap or product gap, at most one PR. |

### Harnesses

| Skill | What it does |
|---|---|
| `control-cli` | Driving an interactive CLI or TUI deterministically: tmux `send-keys`/`capture-pane` loop, a Python pty fallback, Node inspector hookup, profiling recipes for startup time, hangs and leaks. |
| `control-ui` | Driving a web, IDE or Electron UI locally: Playwright or CDP harness, page selection by stable marker, one-action-per-snapshot loop, CDP capabilities list, privacy and cleanup guardrails. Quick Playwright mode, from the former `webapp-testing`: `with_server.py` starts the servers you name and runs a Python Playwright script against them, with a reconnaissance-then-action pattern and three example scripts. |
| `ios-simulator` | QA of an iOS app end to end on macOS: 21 Python scripts for boot, install, launch, tap by accessibility label, type, swipe, screenshot, visual diff, logs, push notifications, permissions and status bar. |
| `windows-desktop-e2e` | E2E tests for a Windows native app (WPF, WinForms, Win32/MFC, Qt) with pywinauto and UI Automation: AutomationId setup per framework, page objects, three isolation tiers, screenshot fallback, CI on `windows-latest`. |
| `full-page-screenshot` | You need one PNG of an entire page, including an authenticated tab you already have open. A single Node 22+ script over the Chrome DevTools Protocol that handles SPA scroll containers, lazy images and very tall pages. |
| `ui-demo` | Recording a demo, walkthrough or tutorial video of a web app. Discover, rehearse, record; injected SVG cursor, slow typing, subtitle bar, full script template, twelve pitfalls. |

### Test suites

| Skill | What it does |
|---|---|
| `e2e-harness` | End-to-end tests across a whole polyglot system: services in Node, Python, Go, C# or Rust plus Kafka, Event Hubs, blob storage, S3, Postgres and cloud emulators, driven through Playwright. Five phases (setup, discover, journeys, build, run); four are deterministic and belong to the stdlib-only `e2e` CLI. Only `journeys.json` needs a model, because deciding which flows matter is the one judgment call. `discover` refuses to run without a docs folder, so journeys test what the system promises. |
| `integration-e2e-testing` | Deciding which integration and E2E tests to write: lane definitions with enforced budgets, an ROI formula with thresholds per lane, the multi-step-journey rule, required skeleton annotations, EARS mapping and review criteria. |
| `playwright-pro` | Writing or fixing Playwright tests. Four workflows in one skill: init a project, generate tests from a story, URL or component using 55 templates (auth, CRUD, checkout, search, forms, dashboard, settings, onboarding, notifications, API, accessibility), review against 20 anti-patterns, and fix flaky tests by category. |
| `react-testing` | Testing React components, hooks or pages with React Testing Library and Vitest or Jest: query priority, `userEvent`, MSW with `onUnhandledRequest: "error"`, provider wrapper, `renderHook`, axe, and when to leave JSDOM for Playwright. |
| `bats-testing-patterns` | Unit-testing shell scripts with Bats: error conditions, dependency skips, shell-dialect checks, helpers, fixtures and CI wiring. |
| `k6-load-testing` | Load, stress, spike or soak testing an HTTP API, WebSocket or browser flow with k6: scenario configs, thresholds, checks, custom metrics, data parameterization, result analysis and CI integration. |
| `test-audit` | The test suite has grown and you suspect tests that cost more than they protect. Four-question test value bar, a mechanical pre-filter (no assertions, source greps, export lists, near-duplicates), a complete retirement card per candidate, and retirement only in batches you approve. Report-only otherwise. |

### Exploratory

| Skill | What it does |
|---|---|
| `dogfood` | "Dogfood", "QA", "bug hunt" a web app. Structured exploration, repro-first documentation (video and step screenshots for interactive bugs, one annotated shot for static ones), issue taxonomy, backend 5xx triage, design critique, and a report template. Uses `agent-browser` if installed, Playwright otherwise. |
| `adversarial-ux-test` | Stress-test the UX by roleplaying the most tech-resistant user for the product, then run the mandatory pragmatism filter (RED, YELLOW, WHITE, GREEN) so only real problems become tickets. |
| `click-path-audit` | A button "does nothing" but no function is broken. Maps every store action's sets and resets, traces each handler call in order, and names six patterns (sequential undo, async race, stale closure, missing transition, dead path, `useEffect` interference). |
| `web-quality-audit` | A Lighthouse-style audit across performance, accessibility, SEO and best practices with severity triage. Bundles `analyze.sh`, which greps HTML for doctype, charset, viewport, `lang`, `alt` and non-HTTPS issues. Hands deeper work to `design:a11y-audit` and `design:performance`. |

## What these write and where they reach

Installing the plugin wires no hooks, MCP servers or background processes. Skills that
run things:

- **`code-sweep`** — writes to `ai_docs/reviews/` in the repo: in light mode always
  (`final-feature-review.md`, `final-feature-grade.md`), in full mode
  `code-review-report.md` when there are more than 20 findings. `--change <n>` runs
  `glab mr diff` or `gh pr diff`. With the `design` plugin installed, its interface auditor
  runs that plugin's gates on changed UI files.
- **`complexity-sweep`** — the CLI ships as source plus a built `dist/` under `code/`; on
  first use the skill runs `npm install --omit=dev` in `code/core` and `code/cli` (ts-morph,
  web-tree-sitter with vendored Python, Rust and GDScript grammars, cosmiconfig, picomatch and
  tinyglobby), which downloads from npm. Read-only against the target repo apart from the
  refactorings you ask for and the config file it can generate.
- **`e2e-harness`** — `scripts/e2e` is stdlib-only Python, invoked by path with no install
  step. It writes `e2e/` in the target repo (`config.json`, `inventory.json`, `journeys.json`,
  generated specs under `e2e/tests/generated/`, `report.json`). `setup --install` installs
  Playwright into the project, which downloads from npm. `run` boots the system with the
  command `setup` detected (`docker compose up -d`, `aspire run`, an npm script) only after
  you confirm it (`"up_confirmed": true` or `--yes`), and takes it down afterwards unless you
  pass `--keep-up`. Hand-edits to generated specs are overwritten on the next `e2e build`.
- **`api-design-reviewer`** — three stdlib-only Python scripts under its `scripts/`
  (`api_linter.py`, `breaking_change_detector.py`, `api_scorecard.py`). They read the
  JSON spec files you pass and write only the `-o` output you ask for. No network.
- **`blast-radius`** and **`benchmark-checklist`** — ask the model to write and run small
  proof scripts and profilers (`top`, `pidstat`, `strace -c`, `py-spy`, `node --cpu-prof`)
  where available.
- **`human-gate`** — writes `<artifact>.review.html`, reads and writes
  `<artifact>.review.md`, and keeps gate state in a `.human-gate/` directory beside the
  artifact. `open --launch` opens the page in your default browser; the page itself makes no
  network request. It never fetches code; the optional `petergyang/human-review` editor it
  mentions is something you run yourself, pinned.
- **`create-verification-skill`** — writes a new skill into the current project at
  `.claude/skills/verify-<app>/` and launches the app to prove it.
  **`maintain-verification-skill`** edits only that directory and drives the app live; it
  never edits product code.
- **`full-page-screenshot`** — `scripts/full-page-screenshot.mjs` (Node 22+) connects to
  your local Chrome's remote-debugging port: it reads Chrome's `DevToolsActivePort` file
  from the profile directory, probes `localhost` ports 9222, 9229 and 9333, and falls
  back to a local CDP proxy on `localhost:3456` if one is running. `--url` mode opens
  that URL in your Chrome, which is network use by purpose. Very tall pages are
  stitched with Python Pillow when it is installed; otherwise the tiles are saved
  separately. Writes the PNG path you give it (default `/tmp/screenshot.png`).
- **`control-ui`** (Quick Playwright mode) — `scripts/with_server.py` spawns the server
  commands you name, waits on their ports, runs your command and kills them afterwards.
  The Playwright scripts you write with it need `pip install playwright` and a Chromium
  install.
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
- **`web-quality-audit`** — `scripts/analyze.sh` greps the HTML files you point it at and
  prints JSON.
- **`ui-demo`** — a Node Playwright script you write from its template; records WebM
  into a `screenshots/` directory next to the script.
- **`k6-load-testing`** — the k6 CLI; load tests you write hit whatever target you name.
  The GitHub Actions and GitLab examples are templates, not installed workflows.
- **`santa-method`** — spawns reviewer subagents with the Agent tool; nothing on disk.
- **`playwright-pro`** is 540 KB of Markdown templates and references; it runs only the
  `npx playwright` commands it tells you to run in your project.

`windows-desktop-e2e`, `react-testing`, `integration-e2e-testing`,
`bats-testing-patterns`, `click-path-audit`, `adversarial-ux-test`,
`python-anti-patterns`, `ai-debt-detector`, `code-review-excellence`,
`receiving-code-review` and the `code-reviewer` agent are prose and code samples only.

## How it works with the rest of the plugin and the others

- **In from Build.** The development flow ends here: `software:execute-plan` dispatches the
  `code-reviewer` agent, and `software:workflow`'s code review flow is `code-sweep` →
  `software:change-description`. `santa-method` leaves deterministic checks (build, lint, test) to
  `verify-feature` or `software:check-implementation`'s post-flight mode.
- **Out to Build.** Findings that need a fix go to `software:debug` and `software:tdd` (`click-path-audit`
  and `react-testing` point there). `blast-radius` runs a big or wide change as a `software:arena`.
- **Design.** `code-sweep`'s interface auditor runs the `design` plugin's gates when it is
  installed and sends taste verdicts to `design:critique`; `web-quality-audit` hands Core Web
  Vitals to `design:performance` and accessibility to `design:a11y-audit`.
- **Code understanding.** `blast-radius` is the companion to `software:why`: why the code is shaped
  that way, then what a change to it breaks.
- **Agents and sign-off.** `human-gate` sits in a loop designed with `agents:loop-design-check`;
  `software:grilling` interrogates a plan before there is an artifact to sign off. For making AI
  text sound human, use `work:humanize`, not `human-gate`.
- **Security.** A full security audit is `software:security-sweep`; `code-sweep`'s security
  reviewer looks only at the change.

## Credits

`code-sweep`, `complexity-sweep` and `e2e-harness` are the marketplace owner's. `complexity-sweep`
bundles tree-sitter grammars whose notices are in
[`skills/complexity-sweep/code/core/grammars/NOTICE.md`](../../skills/complexity-sweep/code/core/grammars/NOTICE.md).

Every other skill, and the `code-reviewer` agent, is a vendored, supply-chain-controlled copy:
reviewed on the way in, kept as this marketplace's own copy, and re-pulled from upstream
deliberately rather than tracked live. Upstream repository, path, commit, date, license and author
for each, and the list of changes made here, are in the plugin's [NOTICE.md](../../NOTICE.md)
(section "From the former `verify` plugin"). Sources: affaan-m/ECC,
alirezarezvani/claude-skills, anthropics/skills, cursor/plugins (cursor-team-kit and Lauren Tan's
pstack, MIT, [`LICENSE-pstack.txt`](../../LICENSE-pstack.txt)), davila7/claude-code-templates, exiao/skills, garrytan/gstack,
obra/superpowers, shinpr/claude-code-workflows and wshobson/agents.

## Invoking

`software:code-sweep`, `software:verify-feature`, `software:verify-this`,
`software:dogfood`, `software:playwright-pro`, `software:test-audit`, and so on. Light review is
`/software:code-sweep --light`.
