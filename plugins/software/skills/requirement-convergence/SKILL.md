---
name: requirement-convergence
description: "Separates the outcome a change must produce from the requirements proposed to reach it, records what the user excluded, bands cost from structure, then turns the converged scope into verifiable AC-NNN acceptance criteria (scenario, action, expected result, must-not, verification method, priority), as a Quick Capture, a Full Acceptance Brief or a review of an existing spec. Use when a requirement enters a workflow, before design begins; when a user asks to clarify a feature, define acceptance criteria, make a complex request testable, de-risk a security, data, migration or integration change, or prepare implementation requirements for another agent. Do not trigger for trivial edits, straightforward fixes, active debugging, code review, or implementation requests whose acceptance conditions are already clear unless the user asks for this skill."
---

# Requirement Convergence

## Purpose

Requirements arrive bloated, ambiguous, or aimed at the wrong outcome. A capable model reconciles all three into a coherent plan and builds it faithfully — delivering exactly what was asked for when what was asked for was wrong.

This skill converges **what to build**. How to build it, and which documents the change requires, are settled after the what is.

## Convergence Fields

| Field | Pass condition |
|-------|----------------|
| `outcome` | One observable result. A requirement that does not serve it is excess. |
| `requirements[]` | Every build-relevant item labeled `current-state` or `desired-future`. |
| `nonGoals[]` | Authored by the user, or the user stated there are none. |
| `cost` | A band with the structural evidence that places it, plus the unknowns that remain. |

`cost` is a rough band, not the effort estimate a work plan schedules against; requirements cannot support person-days. Its unknowns carry more decision weight than its size.

Classify from the user's own retained wording, not from an analyzer's restatement of it: wording that asks for an evaluation, describes a speculative idea, or suggests a mechanism stays in active convergence context as a judgment-only candidate. `requirements[]` and durable documents receive a candidate only after explicit user confirmation.

Each field carries a readiness label: `ready`, `weak`, or `weak-but-explicit` (weak, and the user agreed to leave it unresolved). Only the user sets `weak-but-explicit`. Requirements are converged when every applicable field is `ready` or `weak-but-explicit`.

Judgment rules per field: [references/criteria.md](references/criteria.md).

## Hearing Protocol

Run the hearing after scope analysis has produced the facts needed to judge the convergence fields. The workflow using this skill owns the interaction method and routing; this skill defines the hearing content and pass conditions.

Register these steps before starting and record each step's evidence as it completes:

| Step | Action | Completion evidence |
|------|--------|---------------------|
| 1 | Render the Scope Confirmation below, asking only about the fields below `ready` | Each fact cites the analysis output it came from, and **User decisions** holds one question per field below `ready` |
| 2 | Record each answer as that field's value | The value uses wording the user supplied, not wording the hearing offered |
| 3 | Re-ask once when a recorded value still fails its pass condition, then mark the field `weak-but-explicit` when the user agrees to leave the second answer as it stands | Two recorded answers, or the user's agreement to stop |
| 4 | Hand the record to the step that judges the fields | An updated record returned from that step |

Step 2's evidence is what keeps the hearing reviewable: a value restating the hearing's own candidates fails it, so the user's judgment survives however the question was put.

## Scope Confirmation

Render this shape at every requirements confirmation stop, whether or not the hearing ran, using only what can change the user's requirement decision or the workflow route.

| Section | Contents |
|---------|----------|
| **Confirmed scope** | The requirements and exclusions the user has already selected, in the user's wording |
| **Decision evidence** | Each material observed fact with its source, followed by what that fact can change about scope, outcome, or cost |
| **User decisions** | Each unresolved product, UX, or operational question, followed by the scope, outcome, or cost effects of its materially different answers |
| **Workflow** | Rough cost band with the unknowns that remain, Structural Scale, and the selected document and workflow route |

Keeping the first three sections separate is what makes the decision informable: merged, the reader cannot tell which line is the user's own settled boundary, which is a repository observation, and which is still open.

Only an explicit user answer moves an item from **User decisions** into **Confirmed scope**. Because Step 2 records the user's own wording, pose each open decision as a question and let the user supply its answer. The orchestrator owns **Workflow** and presents it as a selected route.

## Storage Protocol

| Carrier | Holds | Written by |
|---------|-------|------------|
| The convergence record in the judging step's output | Every field with its readiness label | The judging step |
| PRD `Success Criteria` and `Future / Out of Scope` | `outcome`; user-authored `nonGoals` | The PRD production step |
| Design Doc `Requirement Convergence` | The same when no PRD exists, and the fields left `weak-but-explicit` in every case | The Design Doc production step |

A flow that produces neither document carries the record in its own context to the next step.

## Reference Protocol (For Downstream Consumers)

1. Read the convergence record from the prompt.
2. Treat `nonGoals` as excluded from the current change and `desired-future` requirements as buildable scope. Evaluation requests, speculative ideas, prescribed mechanisms, and agent-proposed capabilities that were not promoted create no downstream obligation; an accepted ADR may retain evaluated options as decision history.
3. Treat a `weak-but-explicit` field as a recorded open question rather than a settled decision. When work depends on it, return the missing decision and its effect to the owning workflow.

## Modes

| Mode | Pick when | Steps |
|------|-----------|-------|
| **Convergence** (default) | A requirement enters a workflow and design has not begun | The Convergence Fields, Hearing Protocol and Scope Confirmation above. |
| **Acceptance criteria** | The user wants the change made testable, or a handoff an implementer can verify against | Converge first, then the steps below. Rules, boundary table, template and rubric: [references/acceptance-criteria.md](references/acceptance-criteria.md). |

Acceptance-criteria steps:

1. **Converge, lightly when the request is clear.** `outcome` becomes the Goal,
   `desired-future` requirements the in-scope behavior, user-authored `nonGoals` the out of
   scope. The `cost` band decides whether to stop for approval.
2. **Inspect context before asking.** Technical facts come from the repository, docs, schemas
   and test harness. Product and business constraints (business rules, compliance, SLAs,
   pricing, retention, priority, target users) never come from code: take them from the user
   or a product artifact, or list them as assumptions to confirm.
3. **Choose the depth.** Quick Capture (goal, scope, assumptions, 3-7 criteria, blockers) for a
   clear low or moderate risk change. Full Acceptance Brief for security, data, migration,
   cross-system, compliance or high-cost work, or a handoff. Existing Specification Review when
   a PRD, issue or plan is supplied: review it, do not restart discovery.
4. **Write `AC-001`, `AC-002`, ...** Each names a scenario, a single action, an observable
   expected result, a prohibited side effect where meaningful, a verification method, an
   environment or safety constraint where verification could touch data, services, cost or
   secrets, and a priority. "Correctly", "securely", "fast" and "robust" are banned unless
   defined as observable evidence or marked as human judgment.
5. **Cover only the boundaries that apply** (happy path, validation, authorization, persistence,
   compatibility, failure recovery, idempotency, performance, UX and accessibility).
6. **Present and continue.** Block only on a decision that could cause security exposure, data
   loss, an irreversible migration, a broken contract, meaningful cost or a destructive
   external action; the `high-irreversible` band always blocks. Otherwise record the criteria
   and proceed. Write the brief to a file only when asked.
7. **Revise in the open.** When a criterion cannot be met for an architectural or external
   reason found during implementation, mark it `[revised]`, state the constraint, increment
   the revision and re-present only the changed criteria.

## Quality Checklist

- [ ] Scope facts were presented before questions were asked
- [ ] `nonGoals` came from the user, or the user stated there are none
- [ ] Every applicable field is `ready`, or `weak-but-explicit` by the user's agreement
- [ ] In acceptance-criteria mode, the brief passes the rubric in [references/acceptance-criteria.md](references/acceptance-criteria.md)

## References

- [references/criteria.md](references/criteria.md) — judgment rules per field, cost inputs, challenge intensity, solution-in-disguise test
- [references/acceptance-criteria.md](references/acceptance-criteria.md) — operating rules, depth choice, boundary table, Acceptance Brief template, pass/fail examples and rubric
