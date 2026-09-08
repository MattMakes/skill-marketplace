---
name: harvest
description: Clone and install Claude Code skills from GitHub repositories. Use when the user provides a GitHub URL containing skills, wants to import skills from a repository, or asks to "harvest" or "install" skills from GitHub. Automatically detects skills, handles name collisions, and copies them to ~/.claude/skills directory.
---

# Harvest

## Overview

The harvest skill enables Claude to automatically discover, clone, and install skills from GitHub repositories into the local Claude Code skills directory. It streamlines the process of sharing and distributing skills across teams and communities.

## When to Use This Skill

Use this skill when the user:
- Provides a GitHub repository URL and wants to install skills from it
- Asks to "harvest", "import", "install", or "pull" skills from GitHub
- Wants to clone skills from a specific repository
- Mentions installing multiple skills at once from a shared repository

## Core Workflow

### Step 1: Receive GitHub Repository URL

When the user provides a GitHub URL, validate and normalize it. The skill supports multiple URL formats:
- Full HTTPS: `https://github.com/owner/repo`
- SSH: `git@github.com:owner/repo.git`
- Short format: `owner/repo`

### Step 2: Initial Harvest (Detect Collisions)

Run the harvest script without collision resolutions to discover skills and detect any name collisions:

```bash
npx ts-node "${CLAUDE_PLUGIN_ROOT}/scripts/harvest.ts" <github-url>
```

The script will:
1. Clone the repository to a temporary directory using `gh` CLI (falls back to `git clone`)
2. Recursively scan for all directories containing `SKILL.md` files
3. Report found skills and any name collisions with existing skills
4. Output collision information if any exist

**Example output when collisions exist:**

```
🌾 Starting harvest from: https://github.com/user/skills-repo

📥 Cloning repository to temporary directory...
✅ Repository cloned successfully

✅ Found 3 skill(s):
   - pdf-editor
   - smart-commit
   - code-reviewer

⚠️  Name collisions detected:
   - code-reviewer

📝 To resolve collisions, provide JSON mapping:
   Example: {"originalName": "new-name"}
```

### Step 3: Resolve Collisions (If Needed)

If name collisions are detected, use the AskUserQuestion tool to gather rename preferences from the user with structured options:

**For a single collision:**

Use AskUserQuestion with multiple choice options:

```json
{
  "questions": [{
    "question": "The skill 'skill-creator' already exists locally. How would you like to handle this collision?",
    "header": "Collision",
    "multiSelect": false,
    "options": [
      {
        "label": "Skip it (keep my local version)",
        "description": "Don't install the skill-creator from the repository, keep your existing one"
      },
      {
        "label": "Rename to '[skillname]-official'",
        "description": "Install the new one with a renamed version (e.g., 'skill-creator-official')"
      },
      {
        "label": "Replace my local version",
        "description": "Overwrite your existing skill with the one from the repository"
      }
    ]
  }]
}
```

**For multiple collisions:**

For each colliding skill, ask individually using the same structured approach, or present a combined question listing all collisions and asking the user to choose a strategy (skip all, rename all with suffix, replace all, or handle individually).

### Step 4: Complete Harvest with Resolutions

Once collision resolutions are obtained (or if there are no collisions), run the harvest script with the resolution mapping:

```bash
npx ts-node "${CLAUDE_PLUGIN_ROOT}/scripts/harvest.ts" <github-url> '{"old-name": "new-name"}'
```

**Example with collision resolution:**

```bash
npx ts-node "${CLAUDE_PLUGIN_ROOT}/scripts/harvest.ts" user/skills-repo '{"code-reviewer": "code-reviewer-pro"}'
```

**Example output:**

```
🌾 Starting harvest from: https://github.com/user/skills-repo

📥 Cloning repository to temporary directory...
✅ Repository cloned successfully

✅ Found 3 skill(s):
   - pdf-editor
   - smart-commit
   - code-reviewer

📝 Renaming: code-reviewer → code-reviewer-pro
📦 Installing: pdf-editor
📦 Installing: smart-commit
📦 Installing: code-reviewer → code-reviewer-pro

✅ Successfully harvested 3 skill(s) to /Users/username/.claude/skills

🧹 Cleaning up temporary files...
```

### Step 5: Verify Installation

After successful harvest, inform the user of the newly installed skills and their locations. The skills are immediately available for use.

## Implementation Details

### Script Location

The harvest script is located at:
```
${CLAUDE_PLUGIN_ROOT}/scripts/harvest.ts
```

### Script Capabilities

The TypeScript script (`harvest.ts`) provides:

1. **URL Validation**: Accepts and normalizes various GitHub URL formats
2. **Smart Cloning**: Uses `gh repo clone` with fallback to `git clone`
3. **Recursive Skill Discovery**: Finds all directories containing SKILL.md files
4. **Collision Detection**: Checks against existing skills in ~/.claude/skills
5. **Collision Resolution**: Applies user-provided rename mappings
6. **Safe Installation**: Skips skills if collision isn't resolved
7. **Automatic Cleanup**: Removes temporary clone directory after completion

### Execution Requirements

- Node.js with npx (for running TypeScript via ts-node)
- GitHub CLI (`gh`) installed and authenticated (optional, falls back to git)
- Git installed
- Write access to `~/.claude/skills` (set `CLAUDE_SKILLS_DIR` to install somewhere else)

### Error Handling

Common error scenarios:

**Invalid URL:**
```
❌ Error: Invalid GitHub URL format: not-a-url
Supported formats:
  - https://github.com/owner/repo
  - git@github.com:owner/repo.git
  - owner/repo
```

**No skills found:**
```
❌ No skills found in repository (no SKILL.md files detected)
```

**Clone failure:**
```
❌ Error: Failed to clone repository: [error details]
```

## Example Interactions

### Example 1: Simple Harvest (No Collisions)

**User:** "Can you harvest the skills from https://github.com/company/shared-skills?"

**Claude:**
1. Runs: `npx ts-node "${CLAUDE_PLUGIN_ROOT}/scripts/harvest.ts" https://github.com/company/shared-skills`
2. Reports: "✅ Successfully harvested 5 skill(s): data-analyzer, api-documenter, test-builder, workflow-optimizer, and brand-guidelines"

### Example 2: Harvest with Collisions

**User:** "Install skills from user/awesome-skills repo"

**Claude:**
1. Runs: `npx ts-node "${CLAUDE_PLUGIN_ROOT}/scripts/harvest.ts" user/awesome-skills`
2. Detects collisions with existing skills: pdf-editor, smart-commit
3. Uses AskUserQuestion tool to ask user for new names
4. User provides: "pdf-editor-v2" and "smart-commit-advanced"
5. Runs: `npx ts-node "${CLAUDE_PLUGIN_ROOT}/scripts/harvest.ts" user/awesome-skills '{"pdf-editor": "pdf-editor-v2", "smart-commit": "smart-commit-advanced"}'`
6. Reports successful installation

### Example 3: Short URL Format

**User:** "Harvest anthropic/example-skills"

**Claude:**
1. Validates and converts to: https://github.com/anthropic/example-skills.git
2. Proceeds with harvest workflow

## Best Practices

1. **Always run harvest twice when collisions exist**: First to detect, second to resolve
2. **Use AskUserQuestion for collision resolution**: Don't guess new names; let users decide
3. **Verify gh CLI availability**: The script works without it, but it provides better GitHub integration
4. **Inform users of installation results**: Always report which skills were installed and where
5. **Handle errors gracefully**: If harvest fails, explain the error and suggest solutions

## Notes

- The script automatically skips common non-skill directories (.git, node_modules, .github, dist, build)
- Skills are identified by the presence of a SKILL.md file in their root directory
- The temporary clone directory is automatically cleaned up after harvest completes
- Multiple skills can be harvested in a single operation
- Collision resolution is optional; skills with unresolved collisions are skipped
