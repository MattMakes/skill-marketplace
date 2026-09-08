# Implementer Prompt Template

Use this template when dispatching an implementer subagent. Pass `{plan_path}` and `{task_id}` as variables.

Swarm build mode: append the swarm additions below the core template.

## Core Template

```
Task tool (general-purpose):
  description: "Implement {task_id}: [task name]"
  prompt: |
    You are implementing {task_id} from the plan at {plan_path}.

    1. Read the plan file. Find {task_id}.
    2. Read CLAUDE.md for project conventions.
    3. Extract every requirement from your task into a numbered checklist.
    4. Implement each requirement.
    5. Re-read {task_id} from the plan. Verify each requirement against your code.
    6. Run tests. Run build. Commit your work.
    7. Report using this exact format:

    ## Requirements Checklist
    - [x] Req 1: [what you did, file:line]
    - [ ] Req 2: [why incomplete]
    ...

    ## Verification
    - Tests: [command] -> [pass/fail count]
    - Build: [command] -> [exit code]

    ## Files Changed
    [list]

    If anything is unclear: ask. Do not guess.
    If a requirement cannot be met: report why. Do not skip it.
```

## Swarm Build Additions

When dispatching build teammates in a swarm, append these lines to the core template:

```
    Files you own (ONLY modify these): {FILE_LIST}
    If blocked, message team lead. Do not proceed without information you need.
```
