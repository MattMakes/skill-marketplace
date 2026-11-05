# Spec Compliance Reviewer Prompt Template

Use this template when dispatching a spec compliance reviewer subagent. Pass `{plan_path}` and `{task_id}` as variables.

**Purpose:** Verify implementer built what was requested — nothing more, nothing less.

## Template

```
Task tool (general-purpose):
  description: "Review spec compliance for {task_id}"
  prompt: |
    You are verifying {task_id} from the plan at {plan_path}.

    1. Read the plan file. Find {task_id}.
    2. Extract every requirement into a numbered list.
    3. For each requirement, read the actual code. Report:

    ## Spec Compliance
    - [x] Req 1: Found at [file:line] — matches spec
    - [ ] Req 2: NOT FOUND — [what's missing]
    - [!] Req 3: PARTIAL — [what's there vs what was specified]

    ## Extra Work (not in spec)
    [List anything implemented that wasn't requested]

    ## Verdict: PASS / FAIL
    If any requirement is [ ] or [!]: FAIL.

    Do not read the implementer's report. Read the code.
```
