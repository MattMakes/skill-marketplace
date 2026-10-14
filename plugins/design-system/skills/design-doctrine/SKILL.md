---
name: design-doctrine
description: The house rules for ANY design or UI work - the verification protocol (run the gate, never claim a number), the absolute no-emoji rule, token by intent, one shared theme, the eight states, one thing leads, and output completeness. Load this FIRST whenever building, reviewing, or theming a screen, component, or token set. Installed as a plugin, this skill carries what CLAUDE.md carries in the repo.
---

# Skill: Design Doctrine

> **Step 0 — runtime.** The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

A plugin carries no always-on `CLAUDE.md`, so the always-on brief travels here
instead. Read this before the first line of any design work,
then load the rule file for the territory you are actually in.

## Verification protocol - run gates, never claim

1. **Never state a number you did not measure.** Any contrast ratio, "WCAG pass",
   or "100%" must come from running a gate and reporting its real output. If you
   have not run it, say "not verified yet."
2. **Verify every state, not just resting.** `node ${CLAUDE_PLUGIN_ROOT}/shared/scripts/verify_states.mjs <file> [--dark]`
   measures default, hover and focus - a button that passes at rest can fail on hover.
3. **One command before reporting done:** `node ${CLAUDE_PLUGIN_ROOT}/shared/scripts/accuracy_report.mjs <file|dir> [--tokens <file>] [--theme <css>]`.
   Report the real `N/N` line. It is all-or-nothing.
4. **Build with the gates, not after them.** Fix and re-run until green; never
   announce success between failures.
5. **Render and LOOK.** Gates pass while a UI is still visibly broken. Screenshot
   the harness in both themes, click every control, and confirm the state changed.
6. **Responsive is gated too:** `node ${CLAUDE_PLUGIN_ROOT}/shared/scripts/verify_responsive.mjs <file|dir>` -
   no horizontal overflow at 280/320/414px.
7. **Honest scope.** The gates prove objective correctness. They never prove taste.
   For that, run `/design-system:critique`, look at the work yourself, and start from the taste
   preflight below rather than from default components.
8. **SKIPPED is not a pass.** With no browser installed a render gate prints
   `SKIPPED` and exits 0, reporting nothing. Run single render gates behind
   `DS_REQUIRE_BROWSER=1` so that becomes `REQUIRED, FAILING`, and fix it with
   `npx playwright install chrome` rather than by removing the flag.

## Mobile is the base

Base styles ARE the phone layout. Wider screens are layered on with `min-width`.
`max-width` is not banned - it is right for a genuine narrow refinement, or for a
range between two breakpoints - but a desktop-first stylesheet, where the base
assumes a wide screen and mobile is patched in afterwards, is a bug.

Measured by `${CLAUDE_PLUGIN_ROOT}/shared/scripts/verify_mobile_first.mjs`, which
removes every `@media` and `@container` rule and renders what is left at 320px. A
mobile-first page passes because its base already is the phone layout. A
desktop-first page cannot fit.

## Two house rules on what never ships

**Never ship a native `<select>`.** It draws its own chevron, pressed against the
control's edge with no breathing room, and `appearance: none` plus a custom
chevron fights the platform instead of matching the system. Use the Listbox or
Combobox pattern in
`${CLAUDE_PLUGIN_ROOT}/shared/components/forms-advanced.md`: a button trigger
that announces the current value, the chevron placed with inner padding from
tokens, and full keyboard parity (typeahead, arrows, Home/End, Escape,
`aria-expanded` that really toggles something visible). Losing native select
means accessibility stops being free, so the replacement has to pass every state,
keyboard and axe gate before it counts. Measured by
`${CLAUDE_PLUGIN_ROOT}/shared/scripts/lint_native_select.py`.

**Never a colored border on one side only** of a card, alert, toast or callout -
`border-left`, `border-right`, `border-top`, `border-bottom`, or the logical
`border-inline-*` and `border-block-*` forms. The tinted 3-4px bar is a
generated-UI cliche in every direction, not only on the left: it is decoration
standing in for hierarchy the layout never established. Use a full hairline
border on all sides, or surface and elevation separation, and carry status with a
real icon plus text, never colour alone. Measured on the render by the one-sided
accent-border tell in
`${CLAUDE_PLUGIN_ROOT}/shared/scripts/slop_tells.mjs`.

## Taste preflight - before any markup

The gates cannot see this half, so it has to be decided rather than discovered.
Write the block into your reply, then build to it. Generating first is where
generated-looking work comes from.

```
Domain:          fintech | editorial | dev-tool | healthcare | consumer | ...
Audience & tone: expert vs first-time, calm vs energetic, premium vs utilitarian
Mood:            the one adjective the result must earn - "expensive", "precise", "warm"
Motion depth:    none | subtle feedback | expressive choreography
Layout family:   the section sequence you will use, named, varied per section
Reference anchor: an archetype or named system to aim at
```

Break each of these deliberately; they are defects, not starting points.

- Three or four identical equal-weight cards. **One thing leads.**
- Everything centered. Use asymmetry on a real grid.
- The same left-text / right-image row repeated.
- A heading that is only bold body text. Display type is at least 2.5x body,
  short, on an 18-24ch measure.
- A drop shadow on every box. Most things are flat.
- `#000` on `#fff`. Off-black on warm-white, from the theme.
- More than one accent. Neutrals carry the weight.
- A colored border on one side only of a card, alert, toast or callout. Full
  hairline border or surface separation; status by icon plus text, never colour
  alone.
- Em-dashes in UI copy, marketing filler ("elevate", "seamless", "unlock"),
  hollow triads, fake labels ("SECTION 01", lorem ipsum).

Depth, and the full Variance Mandate:
`${CLAUDE_PLUGIN_ROOT}/shared/taste/design-taste.md`. For a whole page or app,
use `design-system:design-screen`, which runs this preflight as step 1 of the pipeline.

> ABSOLUTE: zero emoji in any output - UI, code, JSON, copy, comments, commit
> messages. Not as an icon, a bullet, a status dot, or "polish". Emoji are the
> number-one tell of machine-generated work. Use a lucide icon (inline SVG,
> `currentColor`) or plain words. Enforced by `${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_no_emoji.py`.

## The five non-negotiables

1. **Token by intent.** Pick the token whose meaning matches the action.
   Destructive actions (Delete, Remove, Revoke) wear `action.destructive` in every
   place they appear - the trigger and the confirm dialog both. A blue Delete is a
   bug. Measured by `${CLAUDE_PLUGIN_ROOT}/shared/scripts/lint_intent.mjs`.
2. **One theme, one source of truth.** Every page renders from the same
   `${CLAUDE_PLUGIN_ROOT}/shared/tokens/*.json` through one CSS-variable layer imported once at the app root.
   No per-page palette, no hardcoded hex, px, or timing.
3. **Every interactive element ships eight states:** default, hover, focus,
   active, disabled, loading (if async), error (if input), and selected (if
   selectable). The eighth is not optional when the thing can be selected.
4. **One thing leads.** Every screen has a first place for the eye, and display
   type is at least 2.5x the body size. Four equal cards means the eye lands
   nowhere and the screen reads as generated.
5. **Output completeness.** A partial output is a broken output. Deliver full
   files, never placeholders. Asked for N components, deliver all N.

## Decision framework

User needs, then accessibility, then consistency, then aesthetics, then developer
experience. Never sacrifice a higher tier for a lower one. Beautiful but
inaccessible is broken; consistent but confusing is the wrong pattern.

## Where the depth lives

| Read it when | File |
|---|---|
| Tokens, palettes, theming, dark mode, any colour decision | `${CLAUDE_PLUGIN_ROOT}/shared/rules/tokens-and-color.md` |
| Type scale, line length, the 4px spacing rhythm | `${CLAUDE_PLUGIN_ROOT}/shared/rules/typography-and-spacing.md` |
| Building any screen or component, composition, empty states | `${CLAUDE_PLUGIN_ROOT}/shared/rules/components.md` |
| Auditing, or finishing any interactive element | `${CLAUDE_PLUGIN_ROOT}/shared/rules/accessibility.md` |
| Generating code for React, Next.js, SwiftUI, or any adapter | `${CLAUDE_PLUGIN_ROOT}/shared/rules/frameworks.md` |
| Design review, prototyping, research, handoff | `${CLAUDE_PLUGIN_ROOT}/shared/rules/review-and-research.md` |
| Aesthetic direction, motion, voice and tone, governance, QA | `${CLAUDE_PLUGIN_ROOT}/shared/rules/brand-and-operations.md` |

Then pick the runnable skill for the job: `design-system:design-tokens`, `design-system:design-component`,
`design-system:design-code`, `design-system:design-review`, `design-system:a11y-audit`, `design-system:apply-aesthetic`,
`design-system:brandkit`, `design-system:image-to-code`, `design-system:redesign`, and the rest. Interrogate the brief first with
`/design-system:grill-me`; prove the result with `/design-system:gate`; judge it with `/design-system:critique`.

## Where the kit lives

Everything the skills read is under `${CLAUDE_PLUGIN_ROOT}/shared/`. The kit's
reference docs (component specs, workflows, taste, frameworks) name their
neighbours with short relative paths such as `scripts/contrast.py`,
`tokens/colors.json` or `components/atoms.md`: resolve each of those against
`${CLAUDE_PLUGIN_ROOT}/shared/`, never against the project you are working in.
The project's own files - its `design-tokens.json`, theme stylesheet and
components - are the targets the gates measure, and stay where they are.


## Works with the rest of the marketplace

These plugins come from the same marketplace. Use them when they are installed;
nothing here requires them.

| When | Reach for |
|---|---|
| Starting in an unfamiliar codebase, before touching its UI | `dev:prime`, or `code:core` for a repo you will work in for a while |
| The feature has behaviour as well as screens | `dev:brainstorm` for the design doc, then `dev:analyze-design`, which adds a UX and accessibility lens when the design has a UI |
| Many screens or components in one request (output completeness) | `tools:unlazy` writes the acceptance gates, one per screen, before the build starts |
| Reviewing a UI change | `dev:code-sweep`; its interface auditor (`u`) runs these gates on the changed files |
| Acting on a critique or review | `tools:receiving-code-review`: verify each finding against the render before you change anything |
| A redesign must not break behaviour | `tools:post-flight` against the pre-redesign baseline |
| Long interface prose (onboarding, help, release notes) | `tools:humanize`; short microcopy stays with `design-system:ux-writing` |
| Diagrams of the system behind the UI | `code:blueprint` |
