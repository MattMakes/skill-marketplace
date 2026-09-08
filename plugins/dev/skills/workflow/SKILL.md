---
name: workflow
description: Displays available development workflow paths and their command sequences. Use when the user asks what commands are available, needs help choosing a workflow, or asks for help getting started.
---

# Dev Plugin Workflow Guide

Display the following workflow paths to help the user choose the right sequence of commands.

## Using Skills

Every step below is a skill in this plugin. Invoke it with the `Skill` tool as
`dev:<name>` (for example `dev:brainstorm`); do not open the SKILL.md with
the Read tool. Process skills (brainstorm, debug) come before implementation
skills. A skill marked rigid (TDD, debugging) is followed exactly; the rest adapt
their principles to the situation.

**Glossary.** A **change** is the unit of work under review: a merge request on
GitLab, a pull request on GitHub. Skills that talk to the hosting platform detect
`glab` or `gh` and use whichever is installed.

## Present these workflows:

### 1. Development Flow (Feature Implementation)
`dev:prime` → `dev:brainstorm` → `dev:create-plan` → `dev:execute-plan` → `dev:check-implementation`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `dev:prime` | Load project context and understand the codebase |
| 2 | `dev:brainstorm <idea>` | Refine idea into a validated design through dialogue |
| 3 | `dev:create-plan @design.md` | Convert design into bite-sized implementation tasks |
| 4 | `dev:execute-plan @plan.md` | Execute plan with batch checkpoints and sub-agent parallelism |
| 5 | `dev:check-implementation @plan.md` | Verify implementation matches the plan |

### 2. Code Review Flow (Multi-Perspective)
`dev:code-sweep` → `dev:change-description`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `dev:code-sweep` | 11-perspective parallel review (bug, security, structure, power-of-ten, etc.) |
| 2 | `dev:change-description [ticket]` | Generate the change description from findings |

**`dev:code-sweep` options:** `--staged`, `--change <n>`, `--branch <name>`, `--only <codes>`

**Alternative:** Use `dev:review-git-changes` for a single-pass graded review (A-F) instead.

### 3. Research Flow (Codebase Understanding)
`dev:prime` → `dev:research-codebase` → `dev:whats-next`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `dev:prime` | Load project context |
| 2 | `dev:research-codebase` | Deep-dive research documenting what exists |
| 3 | `dev:whats-next` | Create handoff document capturing findings |

### 4. PRD Creation Flow (Architecture Documentation)
`dev:prime` → `dev:document-project` → `dev:analyze-design`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `dev:prime` | Load project context |
| 2 | `dev:document-project` | Generate architecture documentation |
| 3 | `dev:analyze-design @prd.md` | Analyze from 8 expert perspectives |

### 5. Design Analysis Flow
`dev:prime` → `dev:brainstorm` → `dev:analyze-design` → `dev:breakdown`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `dev:prime` | Load project context |
| 2 | `dev:brainstorm <idea>` | Create a design document |
| 3 | `dev:analyze-design @design.md` | Get 8-perspective expert analysis |
| 4 | `dev:breakdown @design.md` | Atomize into SLC phases |


### 6. Debugging Flow
Use `dev:debug` for systematic debugging of bugs and test failures.

| Phase | Purpose |
|-------|---------|
| 1. Root Cause Investigation | Read errors, reproduce, check changes, gather evidence |
| 2. Pattern Analysis | Find working examples, compare differences |
| 3. Hypothesis and Testing | Form theory, test minimally, one variable at a time |
| 4. Implementation | Create failing test, implement fix, verify |

## Agents

These agents are available for Claude to use automatically, or you can ask Claude to use them by name:

### Codebase Analysis
| Agent | What it does |
|-------|-------------|
| `dev:codebase-locator` | Finds files and components relevant to a query |
| `dev:codebase-analyzer` | Analyzes how specific code works |
| `dev:codebase-pattern-finder` | Finds similar implementations and usage examples |

### Code Quality
| Agent | What it does |
|-------|-------------|
| `dev:code-reviewer` | Reviews code for quality, security, and maintainability |



## Tips
- **Starting a new feature?** Use Development Flow
- **Reviewing a change before it merges?** Use `dev:code-sweep`
- **Joining an unfamiliar codebase?** Start with Research Flow
- **Need architecture docs?** Use PRD Creation Flow
- **Debugging a bug?** Use `dev:debug` for systematic debugging
- **All output documents** are written to `./ai_docs/<subfolder>/` (designs, plans, reviews, reports, etc.)
