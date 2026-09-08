---
name: create-plan
description: Use when design is complete and you need detailed implementation tasks for engineers with zero codebase context - creates comprehensive implementation plans with exact file paths, complete code examples, and verification steps
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for the codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about the toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Save plans to:** `./ai_docs/plans/YYYY-MM-DD-<feature-name>-plan.md`

## 🔀 [ROUTER] Dev Environment Gate

Evaluate the project context to enforce prerequisites.

- [ ] **Condition: Target is a backend service, API, or UI** ➔ *Require [Task 0]*
- [ ] **Condition: Target is a standalone script or utility** ➔ *Skip to Task 1*

### [Task 0: Local Dev & Auth Setup] (MANDATORY IF ROUTED)

*Before any business logic is planned, the developer must be able to run and test the service.*

**Spec (what to build):**
- Document exact CLI commands to start the service locally
- Document required environment variables, certs, and proxies
- Provide a working method for local authentication (e.g., dev bypass, token generation, test credentials)
- Create a minimal smoke test script (e.g., `test-local.sh`) that hits a health check endpoint
- Verify the service starts and responds before proceeding

🛑 **PROGRESSIVE DISCLOSURE GATE:** The plan MUST explicitly state that Task 0 must be completed and verified before starting Task 1. The developer cannot proceed until they can run the service locally.

---

## SLC Philosophy

Apply Simple, Lovable, Complete principles:
- No gold-plating — focus on essential functionality
- Each task should produce a complete, working increment
- Don't build for hypothetical future requirements

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** Use `dev:execute-plan` to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Wiring Manifest:** [Complete mapping of every interface → implementation → registration]

**Regression Hotspots:** [Critical behaviors from existing code that must be preserved, with file:line references]

---
```

## Task Structure: Plan-Implement-Verify Triad

Every task has three mandatory parts: what to build, how to build it, and how to verify it.

```markdown
### Task N: [Component Name]

**Spec (what to build):**
- Purpose: [what this component does]
- Inputs: [what it receives]
- Outputs: [what it produces]
- Error cases: [how it handles failures]
- Invariants: [what must be true before/after]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**
[Complete test code]

**Step 2: Verify it fails**
Run: `[test command]`
Expected: FAIL

**Step 3: Write minimal implementation**
[Complete implementation code]

**Step 4: Verify it passes**
Run: `[test command]`
Expected: PASS

**Step 5: Verify wiring (if new type created)**
- Verify interface has implementation: [file:line]
- Verify DI registration: [file:line]
- Run DI resolution test: `[command]`

**Step 6: Verify behavioral equivalence (if rewriting)**
- Old behavior: [description + file:line in old code]
- New behavior: [description + file:line in new code]
- Confirmed equivalent: [yes/no + evidence]

**Step 7: Commit**
```bash
git add [files]
git commit -m "feat: [description]"
```
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- Every interface needs implementation AND registration

## Mandatory Plan Footer

Every plan MUST end with:

```markdown
## Plan Verification Checklist

Before executing this plan, run `tools:pre-flight` to verify completeness.

After executing this plan, run `tools:post-flight` to verify correctness.

### Wiring Manifest
| Interface | Implementation | Registration | Plan Task |
|-----------|----------------|--------------|-----------|

### Regression Hotspots
| # | Behavior | Old Location | New Location | Plan Task | Verified |
|---|----------|-------------|-------------|-----------|----------|

### Contract Matrix
| Endpoint | Old Shape | New Shape | Breaking? | Plan Task |
|----------|-----------|-----------|-----------|-----------|

### External Dependencies (Runtime)
| Dependency | Type | Endpoint/Connection | Auth Method | Integration Test Script | Verified? |
|------------|------|---------------------|-------------|-------------------------|-----------|

*(Plan is marked INCOMPLETE if any external dependency lacks a dedicated integration test.)*

### Credential Source Inventory
| Credential | Runtime Source | Path/Key | Rotation? | Verified in New Code |
|------------|---------------|----------|-----------|----------------------|
```

## Execution Handoff

After saving the plan, offer execution:

**"Plan complete and saved to `./ai_docs/plans/<filename>.md`. Ready to verify and execute?"**

**To execute:**
1. Use `tools:pre-flight` to verify plan completeness
2. Use `dev:execute-plan @plan.md` or `dev:swarm` to implement
3. Use `tools:post-flight` to verify implementation

This will execute the plan with batch checkpoints, sub-agent parallelism, and verification gates.
