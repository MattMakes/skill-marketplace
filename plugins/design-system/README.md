# design

A senior design architect as a skill set. DTCG design tokens in three tiers, component specs
with the eight interactive states, WCAG 2.2 AA to AAA plus i18n and RTL, a taste layer against
generated-looking UI, 138 design-system specs, code for any framework, and render gates that
measure contrast, states, axe, keyboard, target size, overflow, reduced motion and responsive
layout in light and dark instead of claiming them.

```bash
claude plugin install design-system@skill-marketplace
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

## Skills

| Skill | Use it when |
|---|---|
| `design-doctrine` | Before any design or UI work. The verification protocol, the house rules, and the map of where everything lives. |
| `design-screen` | Designing or building a page, screen, landing page or app, end to end: brief inference, direction, tokens, build, gates, critic. |
| `design-component` | Specifying one component: anatomy, variants, sizes, all eight states, token mapping, accessibility. |
| `design-code` | Production code for a component or screen in React, Next.js, SwiftUI, Vue, Svelte, Angular, Flutter, Compose and more. |
| `design-tokens` | Generating, extending or validating DTCG tokens: palettes, type scale, spacing, motion, theming. |
| `data-dashboard` | Dense data screens: analytics consoles, trading terminals, charts drawn from tokens. |
| `apply-aesthetic` | A specific look, an archetype or one of the 138 named design systems, resolved into the token system. |
| `a11y-audit` | A WCAG 2.2 AA/AAA and ARIA audit with criterion, severity and fix for each finding. |
| `design-review` | A scored review across six dimensions with Nielsen's heuristics. |
| `ux-writing` | Interface copy: buttons, errors, empty states, confirmations. Scrubs model tells with `tools:humanize` when it is installed. |
| `design-qa` | CI quality gates and visual regression for a design system. |
| `performance` | Core Web Vitals, layout shift, animation performance. |
| `token-build` | Tokens to CSS variables, Tailwind, iOS, Android and Compose. |
| `figma-integration` | Tokens to Figma Variables and back, component parity, the Figma MCP. |

Commands you start (the model never invokes these on its own):

| Command | What it does |
|---|---|
| `/design-system:grill-me` | Interrogates the brief before anything is built, and writes every unasked decision down as an assumption. |
| `/design-system:gate <path>` | Runs the whole gate suite against your pages or harnesses and reports the real `N/N`. |
| `/design-system:critique <path>` | An adversarial critic in a forked context renders the work and argues for rejection. |
| `/design-system:brandkit` | A complete accessible brand foundation from a brief. |
| `/design-system:redesign` | Audit-first upgrade of an existing UI that keeps behaviour intact. |
| `/design-system:image-to-code` | A screenshot or mockup to token-driven, accessible code. |
| `/design-system:prototype` | The fidelity ladder from content-first to code, with a validation plan per level. |
| `/design-system:migrate-design-system` | Map to or from Material, HIG, Fluent, Carbon, shadcn, Radix and others. |
| `/design-system:governance` | SemVer, contribution and deprecation for a design system. |
| `/design-system:scaffold-project` | A new product repo laid out for this kit, with the gates copied in. |

Agent: `design-critic`, the reviewer behind `/design-system:critique`. Other skills dispatch it directly
and pass it the kit path as `KIT=`.

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

## How it works with the other plugins

The kit is wired into the rest of the marketplace, and each link degrades to a note when the
other plugin is not installed:

- `dev:code-sweep` gained a twelfth reviewer, `interface-auditor` (`u`), triaged in for UI diffs.
  It runs this plugin's static gates on the changed files, and the render gates on any changed
  HTML.
- `dev:analyze-design` adds a UX and accessibility perspective when the design has a UI.
- `dev:brainstorm` asks for a screen inventory and the empty, loading and error paths when the
  idea has a UI.
- `dev:workflow` lists a UI flow: `grill-me` → `brainstorm` → `design-screen` → `gate` →
  `critique` → `code-sweep`.
- `dev:check-implementation` runs the gate suite when the plan built UI.
- `code:explain-diff` measures its own HTML explainer for contrast, axe and keyboard access.
- `tools:humanize` hands microcopy to `design-system:ux-writing`, and `ux-writing` borrows
  `humanize`'s scrub catalog.
- `design-system:redesign` proves it broke nothing with `tools:post-flight` and `dev:code-sweep`.

Skills in other plugins find this kit next to their own install with
`ls -d "${CLAUDE_PLUGIN_ROOT}"/../design-system/shared "${CLAUDE_PLUGIN_ROOT}"/../../design-system/*/shared`,
which covers both a marketplace cache install and a local checkout.

## Hooks, off by default

Upstream wires three hooks: a session-start preflight that says whether the render gates can run,
fast browser-free gates after every Write or Edit of a UI file, and a Stop hook that blocks ending
a session that edited UI and measured none of it. They are useful and intrusive, because they fire
in every project once the plugin is enabled, so this plugin ships them unwired. The scripts are
in `shared/hooks/`, and `shared/hooks/hooks.optional.json` is the configuration. To turn them on
for one project, add its `hooks` block to that project's `.claude/settings.json` with
`${CLAUDE_PLUGIN_ROOT}` replaced by the plugin's install path. Receipts go to the plugin data
directory, or the OS temp directory, never into the project.

## Credits

Adapted from [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) by
Thientan Soparat, MIT (license in `LICENSE`), copied from commit `62092bd` (2026-10-10). This is a
supply-chain-controlled copy maintained here; upstream is re-pulled deliberately, not
automatically.

What changed in the copy:

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
  `/design-system:critique` and `/design-system:gate` are user-started commands the model cannot invoke.
- Dropped as maintainer-only: the npm CLI and MCP server, CI and release workflows, brand assets
  and screenshots, the kit's self-tests, evals and plugin-evals, `CHANGELOG.md`, the `ship` skill
  (the kit's own release checklist), and the scripts that only check the kit itself
  (`validate_agents_surface`, `validate_instruction_surface`, `measure_install_paths`,
  `check_links`, `screenshot_docs`, `update_homebrew_formula`, `render_framework_source`).

The design-system library describes the public visual language of the brands it names, for
reference. It is not affiliated with or endorsed by any of them.
