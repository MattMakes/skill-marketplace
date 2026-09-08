---
name: check-implementation
description: Verify implementation matches the plan by checking components, tests, and build
---

# Check for Consistency of Implementation

## Arguments

- `plan_path` — Path to the plan document (same file passed to `/execute`)

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
6. **Report findings** using the output format below

## Verification Standards

| Check | Verified (sufficient) | Assumed (NOT sufficient) |
|-------|----------------------|------------------------|
| Component exists | Found the file, read the code | "The file should be there" |
| Matches plan | Line-by-line comparison done | "Looks roughly right" |
| Tests pass | Ran test command, saw 0 failures | "Tests were written, so they probably pass" |
| Build succeeds | Ran build command, exit code 0 | "No syntax errors visible" |
| Edge cases handled | Found handling code or tests | "The plan mentions them" |

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

### Recommendation
[Fix issues / Ready to proceed / Needs discussion]
