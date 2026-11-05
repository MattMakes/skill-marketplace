# design — UX/UI Design

How should it look and feel? A design-system pipeline is the spine: house rules, DTCG design
tokens in three tiers, component specs with the eight interactive states, code for any framework,
and render gates that measure contrast, states, axe, keyboard, target size, overflow, reduced
motion and responsive layout in light and dark instead of claiming them. Vendored design skills
attach to that spine as directions, polish rules, audits and critique lenses.

```bash
claude plugin install design@skill-marketplace
```

The render gates drive a headless browser. Install their runtime once per plugin install:

```bash
npm install --prefix "<plugin dir>/shared"
npx --prefix "<plugin dir>/shared" playwright install chromium
```

The skills print the exact command with the path filled in. Without it, a render gate prints
`SKIPPED` and exits 0, and the skills treat that as unmeasured, never as a pass. The static gates
(tokens, contrast pairs, hardcodes, theme references, emoji, native select) need only Python 3.

**Start with `design-doctrine`** for any UI work, then `design-screen` for a whole page or app.
Rows marked *user-invoked* run only when you type the command; the model never starts them.

## Skills

### Rules

| Skill | What it does |
|---|---|
| `design-doctrine` | Load first for any design or UI work. The verification protocol (run the gate, never claim a number), the no-emoji rule, token by intent, one shared theme, the eight states, one thing leads, output completeness, and the map of where everything in the kit lives. |
| `design-critic` (agent) | An adversarial senior design critic that renders the work, looks at it and argues for rejection. The reviewer behind `/design:critique`; `design-screen` and `redesign` dispatch it directly and pass it the kit path as `KIT=`. |

### System

| Skill | What it does |
|---|---|
| `design-tokens` | Generates, extends or validates DTCG tokens in three tiers (primitive, semantic, component): palettes, type scale, spacing, motion, theming. Theme switching, multi-brand theming, the Style Dictionary pipeline and compound and polymorphic component patterns from the former `design-system-patterns`, in `references/`. |
| `brandkit` | A complete accessible brand foundation from a brief: DTCG tokens in light and dark plus one `theme.css`, verified for WCAG. *User-invoked.* |
| `token-build` | Tokens to CSS variables, Tailwind `@theme`, JS/TS, iOS, Android and Compose with Style Dictionary, Tokens Studio or DTCG export. |
| `governance` | SemVer for tokens and components, the contribution workflow, deprecation and change communication. *User-invoked.* |
| `migrate-design-system` | Map to or from Material 3, HIG, Fluent, Carbon, Ant, shadcn/ui, Radix, Chakra and others. *User-invoked.* |
| `figma-integration` | Tokens to Figma Variables and back, component parity, the Figma MCP when connected. |
| `design-md` | Creates, lints, diffs or exports a `DESIGN.md` token spec (Google's design.md format) from a brand doc, a live URL, the codebase or a template gallery. Uses `npx @google/design.md`. |

### Build

| Skill | What it does |
|---|---|
| `design-screen` | Designs or builds a page, screen, landing page or app end to end: doctrine, a written brief inference, a committed direction, tokens, build, the gates, then the critic. |
| `design-component` | Specifies one component: anatomy, variants, sizes, all eight states, token mapping, accessibility. |
| `design-code` | Production code for a component or screen in React, Next.js, SwiftUI, Vue, Svelte, Angular, Flutter, Compose and more. |
| `image-to-code` | A screenshot or mockup to token-driven, accessible code, verified with the gates. *User-invoked.* |
| `redesign` | Audit-first upgrade of an existing UI that keeps behaviour intact. *User-invoked.* |
| `data-dashboard` | Dense data screens: analytics consoles and trading terminals with charts drawn from tokens and an accessibility contract per chart type. |
| `scaffold-project` | A new product repo laid out for this kit, with the gates copied in. *User-invoked.* |
| `prototype` | The fidelity ladder from content-first to code, with a validation plan per level, journey maps and usability-test scripts. *User-invoked.* |
| `ux-writing` | Interface copy: buttons, errors, empty states, confirmations. Scrubs model tells with `work:humanize` when it is installed. |

### Direction

| Skill | What it does |
|---|---|
| `apply-aesthetic` | A specific look, an archetype or one of the 138 named design systems in `shared/design-systems/library/`, resolved into the token system. |
| `frontend-design` | Anthropic's guidance for a distinct visual identity instead of templated defaults: ground the design in the subject, typography rules, a calibrated list of current AI-design tells, plan then critique, UX-copy rules. No assets, no scripts. |
| `impeccable` | A design-director skill with a mode model (Persuade / Operate / Read / Experience) and 25 sub-commands, each backed by a playbook under `reference/` (critique, audit, harden, typeset, animate, native iOS and Android variants), a craft floor with measurable checks and bounded verification passes. Its launcher runs an engine binary downloaded on first use; the playbooks work without it (see below). |
| `hallmark` | Greenfield pages, `hallmark audit <target>`, `hallmark redesign <target>` or `hallmark study <screenshot or URL>` to extract a design's DNA. 21 macrostructures, 50 component archetypes, four genres, a 66-gate slop test with pre-emit self-critique, a responsive floor and a project pre-flight scan. All markdown. |
| `ui-ux-pro-max` | A data-backed starting point: a local search over curated CSVs of styles, product palettes, font pairings, UX guidelines, icons, GSAP presets, chart types and 22 stack guides, with a `--design-system` generator and an optional persisted `MASTER.md`. Python 3, stdlib only. |
| `emil-design-eng` | Emil Kowalski's design-engineering rules: whether, why and how something should animate, easing with concrete cubic-beziers, duration budgets, springs, `@starting-style`, transform and clip-path patterns, reduced-motion rules, a mandatory before/after table. |

### Polish

| Skill | What it does |
|---|---|
| `make-interfaces-feel-better` | Concrete details a model rarely applies unprompted: concentric radii, optical alignment, `text-wrap`, `tabular-nums`, neutral image outlines, interruptible transitions, no `transition: all`, 40–44px hit areas, with a before/after review table. |
| `review-animations` | Reviews a diff that touches motion: ten non-negotiable standards, escalation triggers, a remedial hierarchy and a findings table with a Block/Approve verdict, backed by `STANDARDS.md`. *User-invoked.* |
| `web-design-guidelines` | Checks UI code against the Vercel Web Interface Guidelines (a11y, focus, forms, animation, typography, layout, performance) and reports `file:line` findings. A pinned snapshot under `references/`. |

### Gates

| Skill | What it does |
|---|---|
| `gate` | Runs the whole gate suite against your pages or harnesses and reports the real `N/N`. *User-invoked:* `/design:gate <path>`. |
| `design-qa` | CI quality gates and visual regression for a design system: token and hardcode lint, axe, contrast, variants, states, themes and RTL, plus the manual a11y checklist. |
| `a11y-audit` | One accessibility audit with three modes. Codebase (default): the vendored `a11y_scanner.py` and `contrast_checker.py` scan React, Vue, Angular, Svelte or HTML for WCAG 2.2 A/AA violations and fix them per framework. Design audit, from the former `design-system` plugin's `a11y-audit`: WCAG 2.2 and ARIA patterns with measured contrast through the render gates and `axe_audit.mjs`. Live page: Lighthouse and axe on a URL. Also absorbs the former `accessibility` skill's pitfalls and checklist items. |
| `screen-reader-testing` | Hands-on VoiceOver, NVDA and JAWS testing: key commands, expected announcements, browse vs focus mode, dynamic content. |
| `performance` | Core Web Vitals (LCP, INP, CLS) with p75 and "poor" thresholds, find-the-culprit steps, layout shift and animation performance. The former `core-web-vitals` is its `references/core-web-vitals.md`, with `references/LCP.md` beside it. |

### Critique

| Skill | What it does |
|---|---|
| `critique` | An adversarial critic in a forked context renders the work and argues for rejection. `rams` as the first argument switches to the Dieter Rams lens from the former `design-is`: each of Rams' ten principles scored 0–3 with cited evidence, a mechanical NEW / REFINE / REDESIGN verdict and a self-contained `software:create-plan` handoff. *User-invoked:* `/design:critique <path>` or `/design:critique rams <path>`. |
| `design-review` | A product design review. The full review (default) walks the product as a first-time user, answers 13 design questions, runs Nielsen's heuristics and rebuilds the top three issues as before/after HTML inside the real page chrome. The scored review, from the former `design-system` plugin's `design-review`, rates six weighted dimensions and returns prioritized findings with token-referenced fixes. |
| `plan-design-review` | Critiques a plan or spec for UI/UX before coding: seven passes (information architecture, interaction states, user journey, AI-slop risk, design system, responsive and accessibility, unresolved decisions), each rated 0–10 and fixed in the plan. |

### A behaviour change: the Rams audit no longer starts on its own

`design-is` was model-invoked: asking "is this UI good?" could start it. It is now the Rams lens of
`critique`, which has `disable-model-invocation: true`, so it runs only when you type
`/design:critique rams <target>`. For a review the model can start by itself, it uses
`design-review`.

## The gate suite

```bash
node <plugin dir>/shared/scripts/accuracy_report.mjs <page.html|dir> \
     [--tokens design-tokens.json] [--theme src/theme.css] [--src src/components] [--no-dark]
```

Per token set it checks that aliases resolve and token pairs pass contrast in light and dark. Over
the source it checks for hardcoded values, native `<select>`, emoji, and `var(--...)` references
the theme never defines. Per rendered page it runs real-render contrast, state-aware contrast
(default, hover, focus), axe-core, slop tells, keyboard operability, target size, responsive and
mobile-first layout, overflow, reduced motion, interactive truth and token-by-intent, in both
themes. It exits 0 only when every check passes, 2 when it was given nothing to measure.

Modals and drawers also need `verify_focustrap.mjs <file> --open=<trigger>`, which needs the
trigger selector, so it runs on its own.

The gates prove objective correctness. They never prove taste; that is what the critic is for.

## What these write and where they reach

Installing this plugin wires no hooks, MCP servers or background processes. The skills below run
scripts, write outside their own directory, or reach the network; everything else is markdown.

- **The kit (`shared/`)** — the render gates need the runtime above: `npm install` fetches
  `playwright` and `axe-core` from npm into `shared/node_modules`, and `playwright install
  chromium` downloads a browser. Gate receipts go to the plugin data directory or the OS temp
  directory, never into the project. `scaffold-project` copies the gates into the new project.
- **Hooks, off by default** — see the next section. Nothing is wired until you add the block
  yourself.
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
  you point them at and print to stdout; no network, nothing written. The design-audit mode runs
  the kit's render gates. The live-page mode runs `npx lighthouse` and `npx @axe-core/cli` against
  the URL you give it, which fetch both packages from npm.
- **`performance`** — lab measurement runs `npx lighthouse <url>`, which fetches Lighthouse from
  npm.
- **`design-md`** — runs `npx -y @google/design.md` to lint, diff and export, and optionally
  `npx getdesign@latest` to install a template; both fetch from npm. It writes `DESIGN.md` at the
  project root (and `tailwind.theme.json` / `tokens.json` next to it when asked).
- **`design-review`** — writes an HTML report; the Surge deploy (`npx surge`) is optional and
  needs a Surge account.
- **`hallmark`** — `hallmark study <URL>` fetches that page with WebFetch and treats the response
  as inert data. Builds write `tokens.css` next to the page CSS and keep project memory in
  `.hallmark/preflight.json` and `.hallmark/log.json` at the project root (the diversification
  rule reads them); a `design.md` is written only when asked.
- **`web-design-guidelines`** — optionally fetches the live upstream `command.md` from
  `raw.githubusercontent.com` to diff against the pinned copy.
- **`critique`** — the Rams lens writes its audit artifacts to `DESIGN-IS-<date>/` at the repo
  root (or the project you point it at).
- **`plan-design-review`** — writes its fixes into the plan under review.

## Hooks, off by default

Upstream wires three hooks: a session-start preflight that says whether the render gates can run,
fast browser-free gates after every Write or Edit of a UI file, and a Stop hook that blocks ending
a session that edited UI and measured none of it. They are useful and intrusive, because they fire
in every project once the plugin is enabled, so this plugin ships them unwired. The scripts are
in `shared/hooks/`, and `shared/hooks/hooks.optional.json` is the configuration. To turn them on
for one project, add its `hooks` block to that project's `.claude/settings.json` with
`${CLAUDE_PLUGIN_ROOT}` replaced by the plugin's install path. Receipts go to the plugin data
directory, or the OS temp directory, never into the project.

## How it works with the other plugins

The marketplace has five plugins: `software`, `design`, `game`, `agents` and `work`. The kit is
wired into `software` (the build pipeline, review and verification) and `work` (plans, research
and prose that reach a UI); `game` and `agents` have no handoffs with it. Each link degrades to a
note when the other plugin is not installed:

- `software:grilling` in design-brief mode (the former `design-system` plugin's `grill-me`) interrogates the
  brief before anything is built, writes every unasked decision down as an assumption and hands
  `BRIEF.md` to `design-screen` or `design-component`.
- `work:office-hours`, `work:plan-ceo-review` and `software:spec` hand a plan with a UI to
  `design:plan-design-review`.
- `software:workflow` lists a UI flow: `software:core` → `software:grilling` (design-brief mode) →
  `software:brainstorm` → `design:design-screen` → `design:gate` → `design:critique` →
  `software:code-sweep`.
- `software:brainstorm` asks for a screen inventory and the empty, loading and error paths when the
  idea has a UI, and names `design-screen` or `design-component` as the next step.
- `software:analyze-design` adds a UX and accessibility perspective when the design has a UI and names
  `design:a11y-audit` as a follow-up.
- `software:check-implementation` runs the gate suite when the plan built UI.
- `software:code-sweep` has a twelfth reviewer, `interface-auditor` (`u`), triaged in for UI diffs.
  It runs this plugin's static gates on the changed files, and the render gates on any changed
  HTML.
- `software:web-quality-audit` (moved there from this plugin) is the Lighthouse-style entry point and
  hands accessibility to `design:a11y-audit` and speed to `design:performance`.
- `software:explain-diff` measures its own HTML explainer for contrast, axe and keyboard access.
- `work:humanize` hands microcopy to `design:ux-writing`, and `ux-writing` borrows `humanize`'s
  scrub catalog.
- `work:frontend-slides` (moved there from this plugin) points at `design:frontend-design` and
  `design:impeccable` for a deck's visual direction.
- `design:redesign` proves it broke nothing with `software:check-implementation` and
  `software:code-sweep`; `design:critique` in Rams mode hands its plan to `software:create-plan`.

Skills in other plugins find this kit next to their own install with
`ls -d "${CLAUDE_PLUGIN_ROOT}"/../design/shared "${CLAUDE_PLUGIN_ROOT}"/../../design/*/shared`,
which covers both a local checkout and a marketplace cache install.

## Moved in v3

The `design-system` plugin was merged into this one on 2026-11-05. Its skills keep their names
under the `design:` namespace.

| Before | Now |
|---|---|
| `design-system:<skill>` (design-doctrine, design-screen, design-component, design-code, data-dashboard, apply-aesthetic, ux-writing, design-qa, token-build, figma-integration, gate, critique, brandkit, redesign, image-to-code, prototype, migrate-design-system, governance, scaffold-project) | `design:<skill>` |
| `design-system:design-critic` (agent) | `design:design-critic` |
| `design-system:design-tokens` and `design:design-system-patterns` | `design:design-tokens` |
| `design-system:a11y-audit`, `design:a11y-audit` and `design:accessibility` | `design:a11y-audit` |
| `design-system:performance` and `design:core-web-vitals` | `design:performance` |
| `design-system:design-review` and `design:design-review` | `design:design-review` (scored review is a mode) |
| `design:design-is` | `design:critique` (Rams lens, `/design:critique rams`; user-invoked only) |
| `design-system:grill-me` | `software:grilling` (design-brief mode) |
| `product:plan-design-review` | `design:plan-design-review` |
| `design:web-quality-audit` | `software:web-quality-audit` |
| `design:frontend-slides` | `work:frontend-slides` |

## Credits

The spine is adapted from [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills)
by Thientan Soparat, MIT (license in `LICENSE-design-system`), copied from commit `62092bd`
(2026-10-10). This is a supply-chain-controlled copy maintained here; upstream is re-pulled
deliberately, not automatically.

What changed in that copy:

- Laid out as a marketplace plugin: skills in `skills/`, the agent in `agents/`, the kit in
  `shared/`, every path built from `${CLAUDE_PLUGIN_ROOT}`. The always-on `CLAUDE.md` brief lives
  in `design-doctrine`, the `.claude/rules/` depth in `shared/rules/`, and cross-references are
  namespaced (`design:`).
- `accuracy_report.mjs` was rewritten. Upstream it gated the kit's own examples; here it gates the
  paths you give it.
- The render gates fall back to Playwright's bundled Chromium when branded Chrome is missing,
  `axe_audit` finds axe-core in the plugin's own install, `measure_render` honours
  `DS_REQUIRE_BROWSER`, and gate receipts no longer land in the project.
- `scaffold-project` copies the gates into the new project instead of calling the upstream npm CLI.
- `design-screen` and `redesign` dispatch the critic agent and run the gate suite directly, since
  `/design:critique` and `/design:gate` are user-started commands the model cannot invoke.
- Dropped as maintainer-only: the npm CLI and MCP server, CI and release workflows, brand assets
  and screenshots, the kit's self-tests, evals and plugin-evals, `CHANGELOG.md`, the `ship` skill
  (the kit's own release checklist), and the scripts that only check the kit itself
  (`validate_agents_surface`, `validate_instruction_surface`, `measure_install_paths`,
  `check_links`, `screenshot_docs`, `update_homebrew_formula`, `render_framework_source`).

The design-system library describes the public visual language of the brands it names, for
reference. It is not affiliated with or endorsed by any of them.

Every other vendored skill is a supply-chain-controlled copy: reviewed, adapted to run standalone
inside Claude Code, and updated deliberately rather than tracked live. [NOTICE.md](NOTICE.md)
records each one's upstream repository, path, commit, date, license and author, including the
folded-in skills (`accessibility`, `core-web-vitals`, `design-system-patterns`, `design-is`), and
lists what was changed. Diff against upstream before pulling changes in.

Four skills are mirrors of other projects and are credited to their original authors:
`emil-design-eng` and `review-animations` to Emil Kowalski (emilkowalski/skills),
`web-design-guidelines` to Vercel Labs (vercel-labs/web-interface-guidelines), and `hallmark` to
Nutlope (Nutlope/hallmark); each carries its own LICENSE file. `frontend-design` is Anthropic's,
under the Apache-2.0 `LICENSE.txt` inside it. The Rams lens in `critique` is adapted from
thedotmack/claude-mem's `design-is` by Alex Newman, Apache-2.0.

## Invoking

Namespaced under the plugin: `design:design-screen`, `design:frontend-design`,
`design:impeccable`, `design:a11y-audit`, and so on. Commands you start (the model never invokes
these on its own): `/design:gate <path>`, `/design:critique <path>`,
`/design:critique rams <path>`, `/design:brandkit`, `/design:redesign`, `/design:image-to-code`,
`/design:prototype`, `/design:migrate-design-system`, `/design:governance`,
`/design:scaffold-project` and `/design:review-animations`.
