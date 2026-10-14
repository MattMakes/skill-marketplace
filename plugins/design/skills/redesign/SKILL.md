---
name: redesign
description: Upgrade an existing website or app to premium quality without breaking functionality — audit the current design, identify generic/AI tells, then apply taste and system rules surgically. Use when the user wants to improve, modernize, polish, or "make better" an existing UI/codebase.
# `invocation:` was not a field Claude Code reads - unknown frontmatter keys are
# ignored without an error, so these six were auto-invocable the whole time they
# were marked user-only. This is the field that actually does it.
disable-model-invocation: true
---

# Skill: Redesign & Audit

> **Step 0 — doctrine first.** Load `design:design-doctrine` if it is not already loaded
> this session; every step below assumes its verification protocol and house rules.
> The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

Audit-first redesign that preserves behavior.

## Steps
1. Read `${CLAUDE_PLUGIN_ROOT}/shared/workflows/redesign-audit.md` (the full Scan → Diagnose → Direct → Apply → Verify sequence + Output Completeness).
2. **Scan** the codebase: framework, styling method (→ route to the matching `frameworks/` adapter), token reality, components, what must be preserved.
3. **Diagnose** with the Banned Defaults checklist (`${CLAUDE_PLUGIN_ROOT}/shared/taste/design-taste.md`) + the review rubric (`design:design-review` skill). Produce a prioritized findings table.
4. **Direct**: choose an archetype/system (`design:apply-aesthetic` skill) that fits the brand.
5. **Apply** in order — tokens first, then typography/spacing, then component states, then motion — without changing routes/data/markup semantics (except a11y fixes).
6. **Verify**: re-run `design:design-review` + `design:a11y-audit`; smoke-test every previously working flow; dark mode + responsive spot-check. Run `${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_contrast.py` on the token source and `${CLAUDE_PLUGIN_ROOT}/shared/scripts/lint_hardcodes.py` over the changed code. Then measure the rendered result with `node ${CLAUDE_PLUGIN_ROOT}/shared/scripts/accuracy_report.mjs <pages> --tokens <token file> --theme <theme.css> --src <changed code>` and report its real `N/N`.
7. **Prove nothing broke.** "Without breaking functionality" is a claim; check it. When the `tools` plugin is installed, run `tools:post-flight` with the redesign as the plan and the pre-redesign branch as the baseline: its wiring and behavioral-equivalence phases catch the handler that lost its binding and the route that stopped rendering. When the `dev` plugin is installed, `dev:code-sweep --only bu` reviews the diff for correctness and interface regressions together.

## Guardrails
Never sacrifice a working feature for aesthetics. Never ship a brand color that fails contrast. Never remove existing accessibility affordances. Deliver complete files — no placeholders.

## Single-theme consistency (critical for multi-page apps)
Consolidate to ONE shared token theme and make **every page** consume it — a redesign that leaves different pages on different palettes has failed. Replace per-page/ad-hoc colors with semantic tokens; verify with `${CLAUDE_PLUGIN_ROOT}/shared/scripts/lint_hardcodes.py` that no page reintroduces off-theme values. Theme switches must come from the single token source, not page edits (`${CLAUDE_PLUGIN_ROOT}/shared/rules/tokens-and-color.md` → Single-Theme Consistency).
