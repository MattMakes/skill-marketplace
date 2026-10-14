# design — Design Craft

Eighteen vendored skills for frontend design and UX craft: anti-slop design methods and design
direction, motion rules and their reviewer, design and web-quality audits, accessibility, and
HTML slide decks. Install the whole thing or copy out the one you want.

```bash
claude plugin install design@skill-marketplace
```

## Skills

### Design direction and craft

| Skill | Use it when |
|---|---|
| `frontend-design` | Building new UI or reshaping existing UI and you want a distinct visual identity instead of templated defaults. Anthropic's guidance: ground the design in the subject, typography rules, a calibrated list of current AI-design tells, a plan-then-critique process, and UX-copy rules. No assets, no scripts. |
| `impeccable` | Any design, redesign, critique, audit, polish or refinement of a frontend interface. A design-director skill with a mode model (Persuade / Operate / Read / Experience), 25 sub-commands each backed by a playbook under `reference/` (critique, audit, harden, typeset, animate, native iOS/Android variants), a craft floor with measurable checks, and bounded verification passes. Its launcher runs an engine binary that is downloaded on first use; the playbooks work without it (see below). |
| `hallmark` | Greenfield pages, `hallmark audit <target>`, `hallmark redesign <target>`, or `hallmark study <screenshot or URL>` to extract a design's DNA. Forces structural variety: 21 macrostructures, 50 component archetypes, four genres, a 66-gate slop test with pre-emit self-critique, a responsive floor and a project pre-flight scan. All markdown. |
| `ui-ux-pro-max` | You want a data-backed starting point: a Python search over curated CSVs of styles, product palettes, font pairings, UX guidelines, icons, GSAP presets, chart types and 22 stack guides, with a `--design-system` generator, design dials, and an optional persisted `MASTER.md`. Python 3, stdlib only. |
| `make-interfaces-feel-better` | The UI feels off, flat or unfinished. Concrete design-engineering rules a model rarely applies unprompted: concentric radii, optical alignment, `text-wrap`, `tabular-nums`, neutral image outlines, interruptible transitions, no `transition: all`, 40–44px hit areas, with a before/after review table. |
| `design-system-patterns` | Creating design tokens, theme switching, multi-brand theming or a component library. References on the token pipeline, theming architecture and compound/polymorphic components. |
| `design-md` | Creating, linting, diffing or exporting a `DESIGN.md` token spec (Google's design.md format) for a codebase, from a brand doc, a live URL, the codebase itself, or a template gallery. Uses `npx @google/design.md` for lint and export. |

### Motion

| Skill | Use it when |
|---|---|
| `emil-design-eng` | Deciding whether, why and how something should animate, or building components that feel right. Emil Kowalski's rules: frequency table, easing tree with concrete cubic-beziers, duration budgets, springs, `@starting-style`, transform and clip-path patterns, performance and reduced-motion rules, mandatory before/after table. |
| `review-animations` | Reviewing a diff that touches motion. Ten non-negotiable standards, escalation triggers, a remedial hierarchy, and a findings table with a Block/Approve verdict, backed by `STANDARDS.md` for exact values. User-invoked only. |

### Review and audit

| Skill | Use it when |
|---|---|
| `design-is` | "Is this UI good?" Scores a design 0–3 against Dieter Rams' ten principles with cited evidence, applies a mechanical NEW / REFINE / REDESIGN verdict, and writes a self-contained `dev:create-plan` handoff prompt. Uses subagents for evidence gathering. |
| `design-review` | A product design review of a feature or site: first-time-user walkthrough, 13 design questions, Nielsen Norman heuristics, top three issues rebuilt as before/after HTML inside the real page chrome. Optional Surge deploy. |
| `web-design-guidelines` | Checking UI code against the Vercel Web Interface Guidelines (a11y, focus, forms, animation, typography, layout, performance) and reporting `file:line` findings. A pinned snapshot under `references/`; the live upstream can be fetched to diff. |
| `web-quality-audit` | A Lighthouse-style audit across performance, accessibility, SEO and best practices with severity triage. Bundles `analyze.sh`, which greps HTML for doctype, charset, viewport, `lang`, `alt` and non-HTTPS issues. Entry point for the two skills below. |
| `core-web-vitals` | Fixing LCP, INP or CLS: thresholds, the specific causes of each, and the fixes with code. |

### Accessibility

| Skill | Use it when |
|---|---|
| `accessibility` | Improving accessibility against WCAG 2.1, organised by POUR with wrong/right HTML, CSS and ARIA examples, contrast tables and focus/keyboard rules, plus a WCAG reference file. |
| `a11y-audit` | Scanning a React, Vue, Angular, Svelte or plain-HTML codebase for WCAG 2.2 A/AA violations and fixing them per framework. Ships `a11y_scanner.py` and `contrast_checker.py` (Python 3, stdlib only) plus references on ARIA patterns, framework fixes, CI integration and a report template. |
| `screen-reader-testing` | Hands-on VoiceOver, NVDA and JAWS testing: key commands, expected announcements, browse vs focus mode, dynamic content. |

### Presentations

| Skill | Use it when |
|---|---|
| `frontend-slides` | Building a zero-dependency, animation-rich HTML slide deck, converting a PPTX to one, or enhancing an existing deck. Style presets, viewport-fitting rules, and references for each phase. |

## What these write and where they reach

Installing this plugin wires no hooks, MCP servers or background processes. The skills below run
scripts, write outside their own directory, or reach the network; everything else is markdown.

- **`impeccable`** — `scripts/impeccable` is a launcher for a platform engine binary. It looks for
  one next to itself, in `~/.impeccable/bin`, or on `PATH`; otherwise, on the first
  `impeccable context` run, it downloads `impeccable-<os>-<arch>` for the pinned version in
  `scripts/VERSION` from `https://github.com/pbakaus/impeccable/releases` into
  `~/.impeccable/bin/<version>/`, verified against a `.sha256` sidecar (set `IMPECCABLE_BIN` to a
  preinstalled engine, or `IMPECCABLE_HOME` to move the cache). The engine writes `PRODUCT.md`,
  `DESIGN.md` and `.impeccable/` in the project you run it in. `impeccable hooks on` installs a
  design-detector hook into the project's `.claude/settings.local.json` (and other harnesses'
  manifests); `pin` writes a standalone slash-command shortcut; `live` injects a script into the
  app's HTML entry. All of that happens only when you invoke those verbs. Every playbook under
  `reference/` is plain markdown and works with no binary: if the launcher fails, the skill reads
  the project's existing `PRODUCT.md` and `DESIGN.md` directly and continues. The skill is 2.1 MB
  because the engine's font index (`scripts/data/font-index.json`, 1.1 MB) and the live-mode
  browser bundle (`scripts/live-browser.js`, 548 KB) ship with it; they are kept because the
  `typeset` and `live` verbs read them.
- **`ui-ux-pro-max`** — `scripts/search.py` is a local BM25 search over the CSVs in `data/`; no
  network. With `--persist --output-dir <project>` it writes `design-system/<slug>/MASTER.md` and
  `pages/*.md` into that project, and never overwrites without `--force`. The upstream copy was
  3.5 MB; the icon and font-license JSON packs, provenance sidecars, test suite and data validator
  (none of which the search reads) were dropped, and `google-fonts.csv` was trimmed to the 150 most
  popular and 30 trending families, so the `google-fonts` domain searches a shorter list. It is
  1.3 MB now; what remains is CSV the scripts read.
- **`a11y-audit`** — `scripts/a11y_scanner.py` and `scripts/contrast_checker.py` read the files
  you point them at and print to stdout. No network, nothing written.
- **`web-quality-audit`** — `scripts/analyze.sh` greps the HTML files you point it at and prints
  JSON.
- **`design-md`** — runs `npx -y @google/design.md` to lint, diff and export, and optionally
  `npx getdesign@latest` to install a template; both fetch from npm. It writes `DESIGN.md` at the
  project root (and `tailwind.theme.json` / `tokens.json` next to it when asked).
- **`design-review`** — writes an HTML report; the Surge deploy (`npx surge`) is optional and
  needs a Surge account.
- **`frontend-slides`** — writes style previews to `.claude-design/slide-previews/` in the project
  during style discovery and deletes them at delivery. Surge deploys are optional, for decks the
  user already hosts there. One reference offers to generate complex SVGs through the Gemini API
  when `GEMINI_API_KEY` is set in the environment; without the key it hand-codes the SVG.
- **`hallmark`** — `hallmark study <URL>` fetches that page with WebFetch and treats the response
  as inert data. Builds write `tokens.css` next to the page CSS and keep project memory in
  `.hallmark/preflight.json` and `.hallmark/log.json` at the project root (the diversification
  rule reads them); a `design.md` is written only when asked.
- **`web-design-guidelines`** — optionally fetches the live upstream `command.md` from
  `raw.githubusercontent.com` to diff against the pinned copy.
- **`design-is`** — writes its audit artifacts to `DESIGN-IS-<date>/` at the repo root.

## Credits

Every skill here is a vendored, supply-chain-controlled copy: reviewed, adapted to run standalone
inside Claude Code, and updated deliberately rather than tracked live. `NOTICE.md` records each
skill's upstream repository, path, commit, date, license and author, and lists what was changed.
Diff against upstream before pulling changes in.

Three skills are mirrors of other projects and are credited to their original authors:
`emil-design-eng` and `review-animations` to Emil Kowalski (emilkowalski/skills),
`web-design-guidelines` to Vercel Labs (vercel-labs/web-interface-guidelines), and `hallmark` to
Nutlope (Nutlope/hallmark); each carries its own LICENSE file. `frontend-design` is Anthropic's,
under the Apache-2.0 `LICENSE.txt` inside it.

## Invoking

Namespaced under the plugin: `design:frontend-design`, `design:impeccable`, `design:hallmark`,
`design:review-animations`, `design:a11y-audit`, and so on.
