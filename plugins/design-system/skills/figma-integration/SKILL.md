---
name: figma-integration
description: Keep Figma and code in sync — map the 3-tier DTCG tokens to Figma Variables (collections + modes), sync in either direction, use the Figma MCP when connected, and verify component parity (variants/states). Use when the user wants to push tokens/components to Figma, pull a design into code, set up token↔Variable sync, or check design-code drift.
---

# Skill: Figma Integration

> **Step 0 — doctrine first.** Load `design-system:design-doctrine` if it is not already loaded
> this session; every step below assumes its verification protocol and house rules.
> The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

Bridge design (Figma) and code (this repo) in both directions. The token JSON stays the source of truth; Figma Variables mirror it.

## Steps
1. Read `${CLAUDE_PLUGIN_ROOT}/shared/workflows/figma-integration.md` (token↔Variable mapping, sync directions, MCP usage, parity).
2. Map the 3-tier hierarchy → three Figma collections (Primitives → Semantic → Component) with aliasing; dark/brand/density → Figma **Modes** (`${CLAUDE_PLUGIN_ROOT}/shared/tokens/theming.json`).
3. Choose ONE authoritative sync direction (code→Figma publish, or Figma→code extract via Tokens Studio / Variables REST API). The other side is generated — never hand-edit both.
4. **If a Figma MCP server is connected:** prefer its tools/skills (load its mandatory prerequisite skill first). Use it to read frames/variables/screenshots into code, build Variables/components from our tokens, or wire Code Connect to `${CLAUDE_PLUGIN_ROOT}/shared/components/*`.
5. Check component parity: Figma variants/properties must cover our variants + sizes + the 8 states; flag gaps.

## Verification (definition of done)
- Every Figma Variable resolves to a token in `${CLAUDE_PLUGIN_ROOT}/shared/tokens/*.json` (no orphan hex in designs).
- One authoritative direction; the generated side has zero hand edits.
- Variant sets cover all 8 states; Code Connect points to the right `${CLAUDE_PLUGIN_ROOT}/shared/components/*` file.
- After any token import: `python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_tokens.py` passes.
