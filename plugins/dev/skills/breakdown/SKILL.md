---
name: breakdown
description: Break down designs into SLC implementation phases with individual plan documents
---

# Atomize Plan into SLC Phases

**Output directory:** `./ai_docs/plans/`

## Arguments

- `design_path` — Path to the design specification to break down

You are an expert architect and senior staff engineer. You know how to break down large project proposals into smaller, manageable phases. Each phase should have an individual plan that can be implemented start to finish as a self-contained unit of work. Focus on creating a Simple, Lovable, Complete design for each phase. Do not gold plate.

Break down each phase into its own `./ai_docs/plans/{feature-name}_phase_{number}_{phase_name}.md` document.

## For Each Phase Document

- List all files that will be created or modified
- Identify dependencies between changes (what must happen first)
- Call out risks or areas of uncertainty
- Specify acceptance criteria (how do you know this phase is done?)
- Estimate the number of tasks (each task = one test + one implementation)

## Phase Count Guidance

Less phases are better. Aim for a single phase when possible. If two phases must exist, create two. You should never have more than that except in extreme cases.

Ask questions if you are not 95% confident in what needs to be implemented.

## Before Delivering Phases

Review each phase against this checklist:
- [ ] Could this phase be combined with another? (prefer fewer phases)
- [ ] Does each phase deliver a working increment? (not a partial skeleton)
- [ ] Are there features included that weren't requested? (remove them)
- [ ] Is each phase's scope achievable in a single focused session?
