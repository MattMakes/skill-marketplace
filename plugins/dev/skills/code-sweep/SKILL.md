---
name: code-sweep
description: Multi-perspective code review using an agent team. Dispatches 11 specialized reviewers in parallel, each focused on a single concern, then synthesizes findings into a unified report with severity-based verdicts.
---

# Code Sweep

Orchestrate a team of specialized reviewers to analyze code from 11 independent perspectives simultaneously, then synthesize findings into a single prioritized report.

## Arguments

- `$ARGUMENTS` — Optional: file, directory, or scope flag. Defaults to current branch diff vs main/master.

**Scope flags:**
- `--staged` — Review staged changes only
- `--commit <sha>` — Review a specific commit
- `--change <number>` — Review a change by number (a merge request via `glab`, a pull request via `gh`, whichever is installed)
- `--branch <name>` — Review branch diff against main
- `--all` — Force all 11 reviewers (skip auto-triage)
- `--only <codes>` — Run specific reviewers by code (e.g., `--only bvs` for bug-hunter, vulnerability-scanner, structure-inspector)

## Reviewers

| Code | Reviewer | Focus |
|------|----------|-------|
| `b` | bug-hunter | Correctness — logic bugs, edge cases, error handling |
| `v` | vulnerability-scanner | Security — OWASP, secrets, injection, auth |
| `s` | structure-inspector | Architecture — SOLID, coupling, boundaries, patterns |
| `e` | efficiency-auditor | Performance — algorithms, database, async, memory |
| `c` | clarity-checker | Maintainability — readability, naming, conventions |
| `t` | coverage-analyst | Testing — coverage gaps, test quality, mocks |
| `g` | contract-guardian | Contract safety — breaking changes, API surface |
| `w` | waste-detector | Simplification — dead code, duplication, over-engineering |
| `r` | reliability-auditor | Reliability — resource leaks, concurrency, safety |
| `d` | dependency-examiner | Dependencies — idiomatic usage, deprecated APIs |
| `j` | power-of-ten-reviewer | JPL Power of Ten — complexity, type safety, scope, language-specific pitfalls |

## Task

### Phase 1: Gather Diff

Determine scope from arguments and capture the diff:

```bash
# Default: branch diff
git diff --name-only main...HEAD 2>/dev/null || git diff --name-only master...HEAD
git diff main...HEAD 2>/dev/null || git diff master...HEAD
```

Adapt for `--staged`, `--commit`, `--change`, or `--branch` flags accordingly. For `--change <n>` fetch the diff with `glab mr diff <n>` or `gh pr diff <n>`.

### Phase 2: Select Reviewers

If `--all` or `--only` specified, use that selection. Otherwise, auto-triage:

**Always include:** `b` (bug-hunter), `c` (clarity-checker)

**Add based on diff signals:**
- Auth/crypto/input handling/secrets patterns → `v` (vulnerability-scanner)
- New files, moved files, DI changes, interface changes → `s` (structure-inspector)
- Loops, queries, async, caching, hot paths → `e` (efficiency-auditor)
- Test files changed or new code without test files → `t` (coverage-analyst)
- Public API changes, schema changes, exports → `g` (contract-guardian)
- Large diffs, many deletions, refactoring patterns → `w` (waste-detector)
- Resource handling, concurrency, error boundaries → `r` (reliability-auditor)
- Package/dependency changes, framework imports → `d` (dependency-examiner)
- Complex functions, type casts, broad scoping, linter suppressions → `j` (power-of-ten-reviewer)

### Phase 3: Create Agent Team and Dispatch

Create an agent team and dispatch each selected reviewer as a teammate. Each teammate receives:
1. The full diff
2. The changed file list
3. Their specific reviewer prompt (from the `reviewers/` folder next to this file)
4. Instruction to read surrounding code context for each changed file

**Spawn all selected reviewers as teammates simultaneously.** Each reviewer is a `general-purpose` agent type. Provide each their complete reviewer prompt from the `reviewers/` directory — do NOT make them read the file themselves, paste the full prompt content into their task description.

Assign one task per reviewer via the shared task list. Each reviewer marks their task complete when done and sends findings back.

### Phase 4: Synthesize Report

After all reviewers complete, combine findings into a unified report:

**1. Findings by Severity:**

```
## Critical
[Findings that must be fixed before merge — exploitable vulnerabilities, data loss, crashes]

## Important
[Findings that should be fixed — performance bottlenecks, architecture violations, missing tests]

## Minor
[Findings to consider — style, conventions, small improvements]
```

Each finding includes: reviewer source, file:line, issue, current/recommended code.

**2. Verdict Table:**

```
| Reviewer | Verdict | Critical | Important | Minor |
|----------|---------|----------|-----------|-------|
| ... | PASS/WARN/FAIL | N | N | N |
```

**Verdict rules:** Any Critical finding = FAIL. Only Important findings = WARN. Only Minor or none = PASS.

**3. Overall Verdict:** FAIL if any reviewer FAIL. WARN if any WARN. PASS otherwise.

**4. Top 5 Priority Fixes** — ranked by severity and effort.

### Phase 5: Shutdown Team

After the report is synthesized:
1. Send shutdown requests to all teammates
2. Clean up the team

## Handling Review Feedback

### Overview

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

### The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

### Forbidden Responses

**NEVER:**
- "You're absolutely right!" (explicit CLAUDE.md violation)
- "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before verification)

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

### Handling Unclear Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**
```
your human partner: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Implement 1,2,3,6 now, ask about 4,5 later
✅ RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

### Source-Specific Handling

#### From your human partner
- **Trusted** - implement after understanding
- **Still ask** if scope unclear
- **No performative agreement**
- **Skip to action** or technical acknowledgment

#### From External Reviewers
```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Say so: "I can't verify this without [X]. Should I [investigate/ask/proceed]?"

IF conflicts with your human partner's prior decisions:
  Stop and discuss with your human partner first
```

**your human partner's rule:** "External feedback - be skeptical, but check carefully"

### YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

**your human partner's rule:** "You and reviewer both report to me. If we don't need this feature, don't add it."

### Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

### When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with your human partner's architectural decisions

**How to push back:**
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve your human partner if architectural

**Signal if uncomfortable pushing back out loud:** "Strange things are afoot at the Circle K"

### Acknowledging Correct Feedback

When feedback IS correct:
```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
❌ "Thanks for [anything]"
❌ ANY gratitude expression
```

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard the feedback.

**If you catch yourself about to write "Thanks":** DELETE IT. State the fix instead.

### Gracefully Correcting Your Pushback

If you pushed back and were wrong:
```
✅ "You were right - I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

State the correction factually and move on.

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceed anyway | State limitation, ask for direction |

### Real Examples

**Performative Agreement (Bad):**
```
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**Technical Verification (Good):**
```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**YAGNI (Good):**
```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

**Unclear Item (Good):**
```
your human partner: "Fix items 1-6"
You understand 1,2,3,6. Unclear on 4,5.
✅ "Understand 1,2,3,6. Need clarification on 4 and 5 before implementing."
```

### Thread Replies

When replying to inline review comments, reply in the comment thread, not as a top-level comment on the change.

### The Bottom Line

**External feedback = suggestions to evaluate, not orders to follow.**

Verify. Question. Then implement.

No performative agreement. Technical rigor always.

## Output

Display the synthesized report directly to the user. If more than 20 findings total, also save to `./ai_docs/reviews/code-review-report.md`.
