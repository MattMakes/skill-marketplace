---
name: workflow
description: Displays available development workflow paths and their command sequences. Use when the user asks what commands are available, needs help choosing a workflow, or asks for help getting started.
---

# Dev Plugin Workflow Guide

Display the following workflow paths to help the user choose the right sequence of commands.

## Using Skills

Every step below is a skill in this plugin. Invoke it with the `Skill` tool as
`dev:<name>` (for example `software:brainstorm`); do not open the SKILL.md with
the Read tool. Process skills (brainstorm, debug) come before implementation
skills. A skill marked rigid (TDD, debugging) is followed exactly; the rest adapt
their principles to the situation.

**Glossary.** A **change** is the unit of work under review: a merge request on
GitLab, a pull request on GitHub. Skills that talk to the hosting platform detect
`glab` or `gh` and use whichever is installed.

## Present these workflows:

### 1. Development Flow (Feature Implementation)
`software:core` → `software:brainstorm` → `software:create-plan` → `software:execute-plan` → `software:check-implementation`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `software:core` | Load project context and understand the codebase |
| 2 | `software:brainstorm <idea>` | Refine idea into a validated design through dialogue |
| 3 | `software:create-plan @design.md` | Convert design into bite-sized implementation tasks |
| 4 | `software:execute-plan @plan.md` | Execute plan with batch checkpoints and sub-agent parallelism |
| 5 | `software:check-implementation @plan.md` | Verify implementation matches the plan |

### 2. Code Review Flow (Multi-Perspective)
`software:code-sweep` → `software:change-description`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `software:code-sweep` | 12-perspective parallel review (bug, security, structure, power-of-ten, interface, etc.) |
| 2 | `software:change-description [ticket]` | Generate the change description from findings |

**`software:code-sweep` options:** `--staged`, `--change <n>`, `--branch <name>`, `--only <codes>`

**Alternative:** Use `software:code-sweep --light` for a single-pass graded review (A-F) instead.

### 3. Research Flow (Codebase Understanding)
`software:core` → `software:research-codebase` → `software:whats-next`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `software:core` | Load project context |
| 2 | `software:research-codebase` | Deep-dive research documenting what exists |
| 3 | `software:whats-next` | Create handoff document capturing findings |

### 4. PRD Creation Flow (Architecture Documentation)
`software:core` → `software:deepwiki` → `software:analyze-design`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `software:core` | Load project context |
| 2 | `software:deepwiki` | Generate architecture documentation |
| 3 | `software:analyze-design @prd.md` | Analyze from 8 expert perspectives |

### 5. Design Analysis Flow
`software:core` → `software:brainstorm` → `software:analyze-design` → `software:breakdown`

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `software:core` | Load project context |
| 2 | `software:brainstorm <idea>` | Create a design document |
| 3 | `software:analyze-design @design.md` | Get 8-perspective expert analysis |
| 4 | `software:breakdown @design.md` | Atomize into SLC phases |


### 6. UI Flow (Screens and Components)
`software:core` → `software:grilling` (design-brief mode) → `software:brainstorm` → `design:design-screen` → `design:gate` → `design:critique` → `software:code-sweep`

Needs the `design` plugin from this marketplace. Use it when the feature is something a person looks at and clicks.

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `software:core` | Load project context, including its tokens, theme and components |
| 2 | `/software:grilling` (design-brief mode) | Close the open questions in the brief; every unasked decision becomes a stated assumption |
| 3 | `software:brainstorm <idea>` | Shape the behaviour; the design doc names screens, flows and their error, empty and loading states |
| 4 | `design:design-screen` | Build it against the house doctrine, tokens and a committed visual direction (`design:design-component` for a single component, `design:redesign` for existing UI) |
| 5 | `/design:gate <page or harness>` | Measure contrast, states, axe, keyboard, target size and responsive layout in light and dark; report the real `N/N` |
| 6 | `/design:critique <page>` | An adversarial critic renders it and argues for rejection, the half no gate can score |
| 7 | `software:code-sweep` | Review the change; the interface auditor (`u`) runs the design gates on the changed UI files |

For larger UI features, run steps 3 to 4 through the Development Flow (`software:create-plan` → `software:execute-plan`) and let `software:check-implementation` run the design gates as part of verification.

### 7. Debugging Flow
Use `software:debug` for systematic debugging of bugs and test failures.

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
| `software:codebase-locator` | Finds files and components relevant to a query |
| `software:codebase-analyzer` | Analyzes how specific code works |
| `software:codebase-pattern-finder` | Finds similar implementations and usage examples |

### Code Quality
| Agent | What it does |
|-------|-------------|
| `software:code-reviewer` | Reviews code for quality, security, and maintainability |



## Tips
- **Starting a new feature?** Use Development Flow
- **Reviewing a change before it merges?** Use `software:code-sweep`
- **Joining an unfamiliar codebase?** Start with Research Flow
- **Need architecture docs?** Use PRD Creation Flow
- **Building screens or components?** Use UI Flow (needs the `design` plugin)
- **Debugging a bug?** Use `software:debug` for systematic debugging
- **All output documents** are written to `./ai_docs/<subfolder>/` (designs, plans, reviews, reports, etc.)
