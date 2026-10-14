---
name: gate
description: Run the one-command quality gate and report the real N/N result. Use before claiming any build/review is done.
# A command the user runs.
# disable-model-invocation keeps the behaviour a command had: the user
# starts it, the model never does, and its description stays out of the
# listing budget the model's skill choice is drawn from.
disable-model-invocation: true
---
> **Step 0 — doctrine first.** Load `design-system:design-doctrine` if it is not already loaded
> this session; every step below assumes its verification protocol and house rules.
> The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

Run the full quality gate and report the ACTUAL output — never a remembered or
reasoned number.

1. Resolve the target from `$ARGUMENTS`: the rendered HTML (file or directory) the
   work produced, plus the project's token file and theme stylesheet if it has
   them. If nothing names an existing path, say what you were given and stop.
   For framework source (React, Vue, Svelte), gate the HTML it renders - a
   Storybook static build, a preview page, or a saved render - and lint the
   source with `--src`.
2. Run: `node ${CLAUDE_PLUGIN_ROOT}/shared/scripts/accuracy_report.mjs <file|dir> [--tokens <design-tokens.json|dir>] [--theme <theme.css>] [--src <dir>]`
   (tokens + token-pair contrast + no-hardcode + theme-refs + no-emoji + no
   native select, then per page: real-render WCAG, state-aware WCAG, axe, slop
   tells, keyboard, target size, responsive, mobile-first, overflow, reduced
   motion, interactive truth, token by intent - light and dark, all-or-nothing).
3. Report the exact `N/N` line it prints.
4. If it is not fully green:
   - List each failing check verbatim.
   - Fix the cause (do not suppress the check).
   - Re-run until green. Do not announce success between failures.
5. Modals, drawers and command palettes also need the focus-trap gate, which
   needs the trigger: `node ${CLAUDE_PLUGIN_ROOT}/shared/scripts/verify_focustrap.mjs <file> --open=<trigger selector> [--dark]`.
6. Then the pixel truth the gate cannot prove:
   - RENDER-AND-LOOK: screenshot the harness, park the pointer off it, inspect
     every state, click each control to confirm the state changed.

Honest scope: these gates prove objective correctness (tokens, a11y, no drift).
They do not prove taste. Pair with `node ${CLAUDE_PLUGIN_ROOT}/shared/scripts/taste_audit.mjs` + human review;
never claim auto-100% on aesthetics.
