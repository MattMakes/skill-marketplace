---
name: swarm
description: Orchestrate agent teams to swarm on tasks. Supports build, research, review, and debug modes with progressive complexity — from simple 2-agent teams to full plan-first orchestration with quality gates.
---

# Swarm Orchestration

Coordinate multiple Claude Code sessions as an agent team to parallelize work. You are the **team lead**. Your job is to decompose the objective, spawn teammates, assign tasks, coordinate to completion, and shut down cleanly.

## Arguments

`$ARGUMENTS` — The user's objective. May include flags:

- `--mode=<build|research|review|debug>` — Explicit mode selection
- `--full` — Force Tier 3 full orchestration (plan-first, wave execution, quality gates)
- Review mode also accepts: `--staged`, `--commit <sha>`, `--change <number>`, `--branch <n>`, `--all`, `--only <codes>`

## Model Policy

**All agents use `model: "opus"`.** Lead and every teammate. No exceptions.

## 🔀 [ROUTER] Session Health Monitor

*Context window exhaustion causes silent state loss in long-running swarms. Check session health before every wave.*

- [ ] **Condition: Session > 150 messages OR > 2 hours OR lead responses feel sluggish/repetitive** ➔ *Trigger [Context Handoff]*
- [ ] **Condition: Session is fresh** ➔ *Continue normally*

### [Context Handoff]

1. **PAUSE** orchestration. Do not spawn the next wave.
2. **Auto-Checkpoint:** Save current swarm state to `./ai_docs/checkpoints/YYYY-MM-DD-swarm-checkpoint-N.md` including:
   - Team composition and agent statuses
   - Completed tasks (with IDs and summaries)
   - In-progress tasks and their current state
   - Pending tasks and dependency graph
   - Key decisions made during execution
   - Runtime discoveries and issues encountered
3. **Shut down all active agents** cleanly.
4. **Handoff:** Run the `dev:whats-next` skill.
5. **Instruct User:** *"We are approaching context limits for this swarm session. I have saved our state and shut down active agents. Please start a fresh chat session and attach `whats-next.md` to resume the swarm."*

🛑 **PROGRESSIVE DISCLOSURE GATE:** STOP orchestration entirely until resumed in a new session.

---

## Phase 0: Parse and Classify

### 0a. Parse Flags

Extract flags from `$ARGUMENTS`:

```
mode      = --mode value, or auto-detect from prompt
full      = --full flag present (boolean)
remaining = prompt text after flags are removed
```

### 0b. Auto-Detect Mode

If no `--mode` flag, classify from prompt keywords:

| Signal | Mode |
|--------|------|
| "review", "change", "MR", "PR", "code review", "check", "audit" | `review` |
| "debug", "fix", "bug", "investigate", "error", "broken", "failing" | `debug` |
| "research", "explore", "find out", "understand", "how does", "compare" | `research` |
| Everything else | `build` |

### 0c. Assess Complexity Tier

| Tier | Trigger | Behavior |
|------|---------|----------|
| **1** | Single-sentence prompt, 1-2 clear tasks | 2-3 agents, simple coordination, no plan phase |
| **2** | Multi-faceted prompt, 3-5 clear tasks | Mode-specific team composition, task dependencies |
| **3** | `--full` flag OR 6+ tasks OR multi-layer prompt | Plan-first workflow, wave execution, delegate mode, quality gates |

---

## Phase 1: Analyze and Decompose

Before creating any agents:

1. **Identify independent workstreams** — What can run in parallel with no shared files or data dependencies?
2. **Identify dependencies** — What must complete before other work can start?
3. **Determine team size** — Minimum agents for meaningful parallelism. Don't create agents for work that takes fewer than ~20 lines or a single search query. Typical: 2-5 agents.
4. **Enforce file ownership** — No two teammates touch the same file. Split by module, layer, or domain.
5. **Name agents descriptively** — Role-based names like `api-builder`, `security-reviewer`, `hypothesis-timeout`. Not `agent-1`.
6. **Estimate session scope** — If the total work looks like it will exceed ~150 messages of lead coordination, proactively plan checkpoint boundaries between waves.

### Tier 3 Only: Plan-First Workflow

At Tier 3, before spawning any agents:

1. Explore the codebase to understand the current state
2. Draft a step-by-step plan with task breakdown, file assignments, and dependency graph
3. Present the plan to the user for approval
4. Only spawn the team after the plan is approved

---

## Phase 2: Mode-Specific Team Composition

### Mode: `build`

Parallel feature implementation across layers or modules.

**Pre-implementation gate:**

Before spawning any build teammates:
1. Create a `tools:pre-flight` task assigned to a dedicated `pre-flight-checker` teammate
2. The pre-flight teammate runs the `tools:pre-flight` skill against the plan
3. If the `tools:pre-flight` verdict is **HOLD**: report issues to user. Do not spawn build agents.
4. If the `tools:pre-flight` verdict is **CLEAR**: proceed to spawn build team

**Team structure:**
- Each teammate owns a distinct file set (frontend, backend, tests, config, etc.)
- Teammates that need outputs from other teammates have explicit `blockedBy` dependencies
- **Verifier teammate (mandatory)** — verifies implementation against the plan

**Build teammate prompts:**

Read the implementer template from the executing-plans skill (`skills/executing-plans/implementer-prompt.md`). Paste the **full template content** into the teammate's spawn prompt. Set `{plan_path}` and `{task_id}` to the appropriate values. Append these swarm-specific additions:

```
Files you own (ONLY modify these): {FILE_LIST}
If blocked, message team lead. Do not proceed without information you need.
```

Do NOT use a different template. Do NOT inline a shorter version. Use the executing-plans implementer template exactly.

**Verifier teammate (mandatory for build mode):**

Read the spec reviewer template from the executing-plans skill (`skills/executing-plans/spec-reviewer-prompt.md`). Paste the **full template content** into the verifier's spawn prompt. The verifier:
- Does NOT implement code
- Reads implemented code and verifies against the plan using the spec reviewer checklist pattern
- Reports PASS/FAIL per requirement with file:line references
- Can BLOCK the next wave if any requirement is FAIL

After each wave:
1. Wait for verifier to complete
2. If verifier reports FAIL: create fix tasks before next wave
3. Do not spawn Wave N+1 until verifier passes on Wave N
4. **Session Health Re-check:** Re-evaluate the Session Health Monitor conditions. If any trigger is met, execute Context Handoff before spawning the next wave.

### Mode: `research`

Parallel investigation from multiple angles.

**Team structure:**
- Each teammate investigates a different facet of the research question
- All teammates use `subagent_type: "general-purpose"` (they may need WebSearch/WebFetch)
- Teammates share findings via SendMessage
- Lead synthesizes into a unified research document

**Spawn prompt template for research teammates:**
```
You are a research agent on a swarm team investigating:

[RESEARCH QUESTION]

Your specific angle:
[FACET TO INVESTIGATE]

Instructions:
1. Use WebSearch, WebFetch, Grep, Glob, and Read to gather information
2. Search for multiple perspectives — don't stop at the first answer
3. When you have substantial findings, message the team lead with a structured summary
4. If another teammate's findings relate to yours, message them directly to cross-reference
5. Mark your task as completed when you've exhausted reasonable sources
```

### Mode: `review`

Multi-perspective code review using specialized reviewers. Each reviewer becomes a full teammate with its own context window.

**Review-specific flow:**

**Step 1 — Gather diff:** Determine scope from arguments:
```bash
# Default: branch diff
git diff --name-only main...HEAD 2>/dev/null || git diff --name-only master...HEAD
git diff main...HEAD 2>/dev/null || git diff master...HEAD
```
Adapt for `--staged`, `--commit`, `--change`, `--branch` flags (`--change <n>` uses `glab mr diff` or `gh pr diff`).

**Step 2 — Select reviewers:** If `--all` or `--only` specified, use that selection. Otherwise auto-triage:

Always include: `b` (bug-hunter), `c` (clarity-checker)

Add based on diff signals:
- Auth/crypto/input handling/secrets → `v` (vulnerability-scanner)
- New files, moved files, DI changes, interface changes → `s` (structure-inspector)
- Loops, queries, async, caching, hot paths → `e` (efficiency-auditor)
- Test files changed or new code without tests → `t` (coverage-analyst)
- Public API changes, schema changes, exports → `g` (contract-guardian)
- Large diffs, many deletions, refactoring patterns → `w` (waste-detector)
- Resource handling, concurrency, error boundaries → `r` (reliability-auditor)
- Package/dependency changes, framework imports → `d` (dependency-examiner)

**Step 3 — Spawn reviewers as teammates:** Each selected reviewer becomes a teammate. Read the reviewer's prompt from the `reviewers/` directory next to the `code-review` skill (`plugins/essentials/skills/code-review/reviewers/{name}.md`) and paste the **full prompt content** into the teammate's spawn prompt. Do NOT make them read the file themselves.

Each reviewer teammate also receives:
- The full diff content
- The changed file list
- Instruction to read surrounding code context for changed files

**Reviewer reference:**

| Code | Name | Prompt file |
|------|------|-------------|
| `b` | bug-hunter | `reviewers/bug-hunter.md` |
| `v` | vulnerability-scanner | `reviewers/vulnerability-scanner.md` |
| `s` | structure-inspector | `reviewers/structure-inspector.md` |
| `e` | efficiency-auditor | `reviewers/efficiency-auditor.md` |
| `c` | clarity-checker | `reviewers/clarity-checker.md` |
| `t` | coverage-analyst | `reviewers/coverage-analyst.md` |
| `g` | contract-guardian | `reviewers/contract-guardian.md` |
| `w` | waste-detector | `reviewers/waste-detector.md` |
| `r` | reliability-auditor | `reviewers/reliability-auditor.md` |
| `d` | dependency-examiner | `reviewers/dependency-examiner.md` |

**Step 4 — Synthesize report:** After all reviewers complete, combine findings:

```
## Critical
[Must fix before merge — exploitable vulnerabilities, data loss, crashes]

## Important
[Should fix — performance bottlenecks, architecture violations, missing tests]

## Minor
[Consider — style, conventions, small improvements]
```

Each finding includes: reviewer source, file:line, issue, current/recommended code.

Verdict table:
```
| Reviewer | Verdict | Critical | Important | Minor |
|----------|---------|----------|-----------|-------|
| ... | PASS/WARN/FAIL | N | N | N |
```

Verdict rules: Any Critical = FAIL. Only Important = WARN. Only Minor or none = PASS.

Top 5 priority fixes ranked by severity and effort.

### Mode: `debug`

Competing hypothesis testing with adversarial challenge.

**Team structure:**
- Lead analyzes the bug description and identifies 3-5 plausible hypotheses
- One teammate per hypothesis, each investigating their theory
- Teammates explicitly try to disprove each other's theories via SendMessage
- Lead monitors the debate and identifies which hypotheses survive challenge

**Spawn prompt template for debug teammates:**
```
You are a debug agent on a swarm team. Your hypothesis:

[HYPOTHESIS DESCRIPTION]

Bug description:
[ORIGINAL BUG REPORT]

Instructions:
1. Investigate whether this hypothesis explains the observed behavior
2. Gather evidence: read code, check logs, trace execution paths
3. Actively challenge other teammates' hypotheses — message them with counter-evidence
4. When another teammate challenges your hypothesis, respond with evidence or concede
5. Report your findings to the team lead with:
   - Evidence supporting your hypothesis
   - Evidence against your hypothesis
   - Your confidence level (high/medium/low)
   - Suggested fix if your hypothesis holds
6. Mark your task completed when investigation is exhausted
```

---

## Phase 3: Create Team and Tasks

1. **Create the team** using `TeamCreate` with a descriptive name derived from the objective (e.g., `auth-refactor`, `qa-review`, `perf-debug`).

2. **Create all tasks** using `TaskCreate` with:
   - Clear `subject` in imperative form (e.g., "Implement user authentication endpoints")
   - Detailed `description` with: what to do, acceptance criteria, file paths, constraints
   - `activeForm` in present continuous (e.g., "Implementing auth endpoints")

3. **Set dependencies** using `TaskUpdate` with `addBlockedBy` for tasks that depend on other tasks.

4. **Create verification tasks** — For each implementation wave, create a verification task:
   - Subject: "Verify Wave N implementation"
   - Blocked by: all implementation tasks in Wave N
   - Owner: verifier agent
   - Description: Run verification checks against plan and original codebase

### Tier 3: Wave Execution

At Tier 3, organize tasks into dependency-aware waves:

- **Wave 1**: All tasks with no dependencies — spawn and execute in parallel
- **Wave 2**: Tasks that depend on Wave 1 completions — spawn after Wave 1 finishes
- **Wave N**: Continue until all tasks complete

The lead tracks wave boundaries and only spawns the next wave's agents after the current wave completes.

**Post-Wave Checkpointing:** After every wave completion, save progress to `./ai_docs/checkpoints/YYYY-MM-DD-swarm-state.md` with: completed tasks, pending tasks, key decisions, runtime discoveries. This serves as both an audit trail and a recovery point if a Context Handoff is needed.

---

## Phase 4: Spawn and Assign

Spawn teammates using the `Task` tool with `team_name` parameter.

**All teammates:**
- `model: "opus"` — mandatory, no exceptions
- `subagent_type: "general-purpose"` — for all modes (build, research, review, debug)
- `run_in_background: true` — so multiple teammates can run concurrently

**Build mode spawn prompts include:**
```
Begin by reading the project's CLAUDE.md for context and coding standards.
Then work on your assigned task.
```

After spawning, assign tasks using `TaskUpdate` with `owner` set to the agent's name.

---

## Phase 5: Coordinate

As team lead:

- **Route information**: When a teammate completes work that another depends on, use `SendMessage` to notify the dependent teammate with specific details (file paths, API signatures, data structures).
- **Unblock tasks**: When a task completes, mark it `completed` via `TaskUpdate`, then check if downstream tasks are now unblocked. Assign newly unblocked tasks to idle agents.
- **Handle issues**: If a teammate reports a problem, decide whether to reassign, adjust the task, or provide guidance via `SendMessage`.
- **Prefer direct messages**: Use `SendMessage` with `type: "message"` to specific agents. Only use `"broadcast"` for critical issues affecting every agent.
- **Don't implement**: As team lead, your job is coordination. Do not start implementing tasks yourself — assign them to teammates.

**Verification-driven coordination:**
- After each wave completes, wait for verifier to finish before spawning next wave
- If verifier reports CRITICAL issues:
  1. Create fix tasks for each critical issue
  2. Assign to appropriate implementation agents
  3. After fixes, have verifier re-check
  4. Only proceed to next wave when verifier passes

### Tier 3: Delegate Mode

At Tier 3, the lead operates in pure coordination mode:
- Only uses: TeamCreate, TaskCreate/Update/List, Task (spawning), SendMessage
- Does NOT use: Edit, Write, Bash (for implementation), or other code-modification tools
- If tempted to implement, spawn another teammate instead

---

## Phase 6: Verify and Shutdown

Before declaring the swarm complete:

1. **Verify all tasks completed** — `TaskList` shows every task in `completed` status
2. **Post-flight verification** — Dispatch a `post-flight-checker` teammate to run `tools:post-flight` against the plan and implementation. Do not declare success until post-flight passes. If post-flight finds issues, create fix tasks and re-verify.
3. **Shut down teammates** — `SendMessage` with `type: "shutdown_request"` to each agent
4. **Clean up team** — `TeamDelete` after all teammates have shut down
5. **Report results** — Summary of what was accomplished, key files modified, and any remaining follow-up items

---

## Rules

- **Honest completion**: Never mark a task completed unless it genuinely meets acceptance criteria. Partial work stays `in_progress`.
- **Persistence**: Agents exhaust reasonable approaches before reporting failure. Stuck agents message the lead for help rather than giving up silently.
- **Minimal scope**: Each agent does exactly what their task requires — no gold-plating, no unrequested refactoring, no unnecessary abstractions.
- **Communication over assumption**: When an agent needs information from another agent's work, message them explicitly. Don't guess at interfaces or file structures.
- **File ownership**: Two teammates never edit the same file. Split work to prevent overwrites.
- **Clean shutdown**: Always shut down teammates and clean up the team. Never leave orphaned agents or team resources.
- **Session awareness**: Monitor session health between waves. A checkpoint is cheap; losing context is expensive.
