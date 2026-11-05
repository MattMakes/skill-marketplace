---
name: check-implementation
description: Use after executing an implementation plan (dev:execute-plan or dev:swarm) to verify the code matches the plan by checking components, tests, build and UI gates. Its full post-flight mode also verifies the code against the original codebase for wiring completeness (every dependency resolves), behavioral equivalence, contract preservation, dead interfaces, configuration and credential sources, then runs runtime smoke checks and a reflection. The post-execution pair of dev:pre-flight; use it before a merge request or deploy, and after a rewrite or migration.
---

# Check for Consistency of Implementation

## Arguments

- `plan_path` — Path to the plan document (same file passed to `dev:execute-plan`)
- `source_path` (optional) — Path to the original codebase when the plan was a rewrite or migration; selects the full post-flight mode

## Modes

| Mode | Pick it when | Steps |
|---|---|---|
| **Plan check** (default) | Any executed plan | The Process below, reported in the Output Format below |
| **Full post-flight** | The plan added services, DI wiring, config, credentials or external dependencies; it was a rewrite or migration (`source_path` given); it went through `dev:pre-flight`; or the work is heading to a merge request or deploy | The Process below, then [references/post-flight.md](references/post-flight.md) |

Full post-flight is the post-execution pair of `dev:pre-flight`: pre-flight checks the plan for wiring, behavior, contract, configuration and credential gaps before code is written; post-flight checks the built code for the same gaps. Its steps:

1. **Phase 1, static** — wiring resolution (every constructor dependency resolves from DI), behavioral equivalence against `source_path` (`code:trace` the old and new paths in parallel subagents), contract comparison, dead interfaces, configuration consistency, build, credential sources. **Stop** and present the static report; continue once every `FAIL` is resolved or accepted as a documented risk.
2. **Phase 2, runtime** — integration ping for each external dependency, a live smoke test of the primary endpoint, and for rewrites the same request sent to old and new with the responses diffed. Without real output from this phase the verdict is **WARN: Runtime Behavior Unverified**, never CLEAR.
3. **Phase 3, reflection** — categorize each miss, name the pipeline stage it came from (brainstorm, plan, execution, quality), and propose improvements; save to `./ai_docs/reflections/YYYY-MM-DD-<topic>-reflection.md` and review it with the user.
4. **Report** to `./ai_docs/reports/YYYY-MM-DD-post-flight-report.md` using [references/post-flight-report.md](references/post-flight-report.md), ending in a verdict: `CLEAR`, `ISSUES — N critical must-fix`, or `WARN: Runtime Behavior Unverified`.

## Process

1. **Read the plan document fully** — do not skim, read every section
2. **Inventory all specified components** — list every module, function, endpoint, or component the plan says should exist
3. **For each component:**
   - Find the corresponding implementation file
   - Read the implementation fully
   - Compare to the plan line-by-line
   - Note: matches, deviations, missing pieces
4. **Run the project's test suite** — capture full output, count passes/failures
5. **Run the project's build command** — capture exit code and any errors
6. **If the plan built UI, measure it** — when the change adds or alters screens or components and the `design` plugin is installed, run its gate suite against the rendered pages or component harnesses (a preview page, a Storybook static build, or the HTML the plan produced) and report the real `N/N` line:

   ```bash
   KIT=$(ls -d "${CLAUDE_PLUGIN_ROOT}"/../design/shared "${CLAUDE_PLUGIN_ROOT}"/../../design/*/shared 2>/dev/null | sort -V | tail -1)
   node "$KIT/scripts/accuracy_report.mjs" <rendered page or dir> [--tokens <design-tokens.json>] [--theme <theme.css>] [--src <ui source dir>]
   ```

   It checks contrast in every state, axe, keyboard, target size, responsive layout and theme consistency, light and dark. Render gates need Playwright once per install (`npm install --prefix "$KIT"`); a gate that cannot run counts as unmeasured, never as a pass. Without the `design` plugin, report the UI as unmeasured.
7. **Report findings** using the output format below

## Verification Standards

| Check | Verified (sufficient) | Assumed (NOT sufficient) |
|-------|----------------------|------------------------|
| Component exists | Found the file, read the code | "The file should be there" |
| Matches plan | Line-by-line comparison done | "Looks roughly right" |
| Tests pass | Ran test command, saw 0 failures | "Tests were written, so they probably pass" |
| Build succeeds | Ran build command, exit code 0 | "No syntax errors visible" |
| Edge cases handled | Found handling code or tests | "The plan mentions them" |
| UI is accessible and on-theme | Ran the design gate suite, saw its `N/N` line | "It looks fine in the screenshot" |

## Verification Gate

### Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

### The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

### The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

### Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

### Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit, push, or open a change without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

### Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

### Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

### Why This Matters

Verification failures lead to broken trust, shipped bugs, incomplete features, and wasted rework cycles. Every unverified claim is a risk — treat it that way.

### When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, opening a change, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

### The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.

## What NOT To Do

- Do NOT say "looks good" without reading the actual implementation files
- Do NOT skip running tests and builds — actually execute them
- Do NOT fix issues you find — report them and ask how to proceed
- Do NOT assume components exist because the plan says they should — verify

## Output Format

Report findings as:

### Matches Plan
- ✅ [Component]: [what matches]

### Deviates from Plan
- ⚠️ [Component]: Expected [X], found [Y], because [reason]

### Missing from Implementation
- ❌ [Component]: Specified in plan but not found

### Test Results
- 🧪 [X/Y tests pass] — [command used]

### Build Result
- 🏗️ [PASS/FAIL] — [command used, exit code]

### UI Gates (when the plan built UI)
- [N/N checks passed, or UNMEASURED and why] — [command used]

### Recommendation
[Fix issues / Ready to proceed / Needs discussion]

## Integration

- Called AFTER `dev:execute-plan` or `dev:swarm` completes; `dev:pre-flight` is its pair before execution
- If the report shows issues, create fix tasks, then re-run to verify the fixes
- Proceed to a merge request or deploy only on a clean report (full post-flight: verdict CLEAR, including Phase 2)
