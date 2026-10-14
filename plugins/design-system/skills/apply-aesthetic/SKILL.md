---
name: apply-aesthetic
description: Apply a visual direction — an archetype (high-end agency, editorial minimal, brutalist, soft-SaaS, dark-tech) or one of 138 named design systems (apple, linear-app, stripe, vercel, notion, material, shadcn, spotify, tesla…) — by resolving it into the token system. Use when the user wants a specific look/vibe/brand feel, or asks to make a design feel premium/expensive/non-generic.
---

# Skill: Apply Aesthetic

> **Step 0 — doctrine first.** Load `design-system:design-doctrine` if it is not already loaded
> this session; every step below assumes its verification protocol and house rules.
> The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

Choose and apply a design direction without breaking accessibility.

## Steps
1. **Brief Inference first (mandatory)** — before any tokens, name it: industry/domain, audience & tone, the one mood adjective the result must earn, motion depth, and the layout-family sequence (`${CLAUDE_PLUGIN_ROOT}/shared/taste/design-taste.md` → Brief Inference + Variance Mandate). Generating before deciding = slop.
2. Pick a direction in `${CLAUDE_PLUGIN_ROOT}/shared/taste/aesthetic-systems.md`:
   - An **archetype** (recipe mapped to our tokens), or
   - A **named library system** — browse with `python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/design_systems.py list` (or `search <term>` / `show <name>`); specs live in `${CLAUDE_PLUGIN_ROOT}/shared/design-systems/library/<name>/DESIGN.md`.
3. Apply the **Library Contract** (in `aesthetic-systems.md`): re-point `semantic.*` tokens to the chosen system's color roles; map typography/spacing/radius/shadow/motion to `${CLAUDE_PLUGIN_ROOT}/shared/tokens/*.json`.
4. **Verify contrast** of every mapped color pair (`${CLAUDE_PLUGIN_ROOT}/shared/scripts/contrast.py` / `design-system:a11y-audit`). A brand value that fails must be adjusted — taste never overrides POUR.
5. Add motion per `${CLAUDE_PLUGIN_ROOT}/shared/taste/motion-choreography.md`; run the pre-flight aesthetic check in `design-taste.md`.

## Output
Updated/overridden semantic tokens + notes on type/space/motion, then render via `design-system:design-code`. Confirm the result passes both the aesthetic check and accessibility.
