---
name: scaffold-project
description: Scaffold a new design-product project that matches the recommended Claude Code layout (the reference structure). Use when starting a fresh product/app that will be built with this design system.
# A command the user runs.
# disable-model-invocation keeps the behaviour a command had: the user
# starts it, the model never does, and its description stays out of the
# listing budget the model's skill choice is drawn from.
disable-model-invocation: true
---
> **Step 0 — doctrine first.** Load `design:design-doctrine` if it is not already loaded
> this session; every step below assumes its verification protocol and house rules.
> The render gates need Playwright once per install: `npm install --prefix "${CLAUDE_PLUGIN_ROOT}/shared" && npx --prefix "${CLAUDE_PLUGIN_ROOT}/shared" playwright install chromium`. Without it they print SKIPPED, which is not a pass.

Generate a new design-project skeleton from `${CLAUDE_PLUGIN_ROOT}/shared/templates/product-design/` into a target directory the user names.

The layout to produce (exactly the reference structure):

```
<target>/
  # CONTEXT CLAUDE LOADS
  CLAUDE.md              the brief Claude reads every session
  CLAUDE.local.md        your personal prefs, gitignored
  .mcp.json              Figma, Notion, Drive connections

  # TEAM TOOLKIT
  .claude/
    rules/               conventions, loaded only when relevant
    skills/              repeatable workflows, off main context
    commands/            your custom slash commands
    settings.json        shared permissions, checked into git

  # YOUR PROJECT
  design-tokens.json     source of truth: color, type, spacing
  src/components/        the real UI Claude reads and edits
  public/images/         real images so prototypes don't break
  reference/             real screens Claude studies for context
```

Steps:
1. Ask for the target directory if not given. Create it if it does not exist.
2. Copy every file of `${CLAUDE_PLUGIN_ROOT}/shared/templates/product-design/` into it, preserving the tree.
   Two rules on the copy:
   - `CLAUDE.local.md.template` lands as `CLAUDE.local.md` (the suffix exists
     only so the kit's own gitignore cannot swallow the file).
   - `.gitkeep` stays in `.claude/skills/`, `.claude/commands/`,
     `src/components/`, `public/images/`, and `reference/` so the empty folders
     survive the first commit.
   The template already ships `.gitignore` (which ignores `CLAUDE.local.md`),
   `.mcp.json`, `.claude/settings.json`, and three rules files
   (`components.md`, `tokens.md`, `accessibility.md`).
3. Copy the gates next to it so the brief's `scripts/...` commands, and CI, run
   without the plugin installed:

   ```
   mkdir -p <target>/scripts
   cp "${CLAUDE_PLUGIN_ROOT}"/shared/scripts/*.mjs "${CLAUDE_PLUGIN_ROOT}"/shared/scripts/*.py <target>/scripts/
   ```

   The doctrine, specs, taste and design-system library stay in the plugin and
   load through the `design:` skills when a task needs them, so the project brief
   stays short by design.
4. Install the render gates' dependencies in the target: `npm i -D playwright axe-core`, then `npx playwright install chromium`.
   Skipping this is silent: every render gate prints `SKIPPED` and exits 0.
5. Fill in the placeholders in `CLAUDE.md` with the user: product, primary user,
   stack, icon set, vocabulary. Leave nothing in angle brackets behind.
6. Point `design-tokens.json` at the brand: replace the `primitive.brand` ramp,
   keep the semantic and component tiers, then prove it still passes:

   ```
   python3 <target>/scripts/validate_contrast.py <target>/design-tokens.json
   ```

7. Remind the user to fill `reference/` with real screens and `public/images/`
   with real imagery, and to set the MCP env vars (`FIGMA_API_KEY`, ...) in their
   own shell. Never write a secret into `.mcp.json`.

Verify before handing over: the target tree matches the layout above, and

```
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_template.py
```

passes against the source template.
