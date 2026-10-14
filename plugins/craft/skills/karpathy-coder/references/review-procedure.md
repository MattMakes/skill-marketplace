# Karpathy review procedure

Review code changes against Karpathy's 4 principles. Be opinionated and specific — don't just say "looks fine", point to exact lines and explain which principle they violate.

Run this inline before committing, or dispatch it as a Task-tool subagent with this file as its brief so the reviewer starts with fresh context. The reviewer needs only read access plus `git diff`, `git log`, `git status` and `python3`; it must not delete files, push, reset, or fetch anything from the network.

## Workflow

### 1. Get the diff

```bash
git diff --staged
```

If nothing staged, use `git diff HEAD~1..HEAD` (last commit).

### 2. Run the automated tools

```bash
# Principle #2 — Simplicity check, once per changed file (or on a directory)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/karpathy-coder/scripts/complexity_checker.py <changed-file> --json

# Principle #3 — Surgical changes check (staged diff by default; --diff HEAD~1..HEAD for the last commit)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/karpathy-coder/scripts/diff_surgeon.py --json
```

### 3. Manual review against each principle

**Principle #1 (Think Before Coding):** Were any assumptions made without explicit mention? Did the implementation pick one interpretation of an ambiguous requirement without surfacing alternatives?

**Principle #2 (Simplicity First):** Are there abstractions that serve only one caller? Classes that could be functions? Error handling for impossible scenarios? Features nobody asked for?

**Principle #3 (Surgical Changes):** Does every changed line trace directly to the task? Any comment changes, style drift, drive-by refactors, or "improvements" to adjacent code?

**Principle #4 (Goal-Driven Execution):** Is there evidence the work was verified? Test additions/modifications? Clear success criteria? Or did the implementation just "look right" without testing?

### 4. Produce a report

```markdown
## Karpathy Review — <date>

### Tool Results
- Complexity: <score>/100 (<N> findings)
- Diff Noise: <ratio>% (<verdict>)

### Principle-by-Principle

#### #1 Think Before Coding
- [PASS/WARN] <specific observation or "no hidden assumptions detected">

#### #2 Simplicity First
- [PASS/WARN] <specific observation>

#### #3 Surgical Changes
- [PASS/WARN] <specific lines cited>

#### #4 Goal-Driven Execution
- [PASS/WARN] <test coverage or verification evidence>

### Verdict: <PASS / PASS WITH WARNINGS / NEEDS WORK>

### Specific fixes (if any)
1. <file:line — what to change and why>
```

## Rules

- **Cite specific lines.** "The diff has noise" is useless. "Line 42: comment changed in untouched function" is actionable.
- **Don't re-run the user's task.** You review, not implement.
- **Be proportional.** A typo fix doesn't need the same rigor as a 200-line feature.
- **Run the tools.** Don't skip automated checks — your manual review supplements them.
