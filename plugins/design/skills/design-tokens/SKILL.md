---
name: design-tokens
description: Generate, extend, or audit design tokens in DTCG format with the 3-tier architecture (primitive → semantic → component), and the theming and component architecture built on them. Use when the user wants a color palette, type scale, spacing/shadow/radius/motion tokens, multi-brand theming, light/dark theme switching, a Style Dictionary or multi-platform token pipeline, design system foundations or component-library patterns (compound, polymorphic, variants), or wants to validate token files. Covers colors, typography, spacing, shadows, borders, breakpoints, motion, gradients, opacity, blur, sizing, states, theming.
---

# Skill: Design Tokens

> **Step 0 — doctrine first.** Load `design:design-doctrine` if it is not already loaded this session; every step below assumes its verification protocol and house rules. The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

Produce and maintain DTCG (`$type`/`$value`) tokens following the project's 3-tier system.

## Steps
1. Read `${CLAUDE_PLUGIN_ROOT}/shared/rules/tokens-and-color.md` → "Token System" + "Color Guidelines" and `${CLAUDE_PLUGIN_ROOT}/shared/rules/typography-and-spacing.md` for the rules (4px base, Major Third scale, OKLCH palette generation, dark-mode-at-semantic-layer).
2. Read the relevant existing files in `tokens/` to match structure: `colors.json`, `typography.json`, `spacing.json`, `shadows.json`, `borders.json`, `breakpoints.json`, `motion.json`, `gradients.json`, `opacity.json`, `blur.json`, `sizing.json`, `states.json`, `theming.json`.
3. Generate/extend tokens:
   - Primitives = raw values (never used directly). Semantic = purpose aliases. Component = component-scoped.
   - New palettes: generate 11 OKLCH shades; verify 500 ≥ 4.5:1 on white (text), 600 ≥ 3:1 (UI) using the `design:a11y-audit` skill / `${CLAUDE_PLUGIN_ROOT}/shared/scripts/contrast.py`.
   - Multi-brand/density → `theming.json`.
   - Theme switching: semantic tokens as CSS custom properties, `prefers-color-scheme` as the default with a persisted user override, an inline script that sets the theme before first paint under SSR, and `forced-colors` / `prefers-contrast` handled. Implementation in `references/theming-architecture.md`.
   - Multi-platform output (CSS, iOS, Android) through Style Dictionary transforms: `references/design-tokens.md` and `references/details.md`. Building the outputs is `design:token-build`.
   - Components that consume tokens (compound, polymorphic `as`, slots, headless, CVA variants): `references/component-architecture.md`.
4. **Validate**: run `python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_tokens.py` (JSON validity + alias resolution).

## Output
DTCG JSON. Preserve `$description` on every token. Reference, never hardcode.

## Red flags
- Names describe the look (`dark-gray`) instead of the purpose (`text-primary`), or mix naming conventions.
- Token sprawl: many tokens with no primitive → semantic → component hierarchy.
- Raw values in components, tokens that ignore dark mode, circular aliases, a platform missing tokens.
- A renamed or removed token shipped without a semver bump and a deprecation path (`design:governance`).
