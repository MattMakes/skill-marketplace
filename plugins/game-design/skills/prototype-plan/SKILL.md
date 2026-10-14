---
name: prototype-plan
description: >-
  Use when planning how to build and test a game design — sets exactly 3 milestones (paper
  prototype, grey-box, vertical slice), each with what it proves, scope, duration and exit
  criteria; writes playtest questions tied to every target kind of fun; sets measurable success
  metrics; picks an engine or framework a solo developer can ship with; and maps each risk to the
  milestone that retires it. Trigger on: "prototype plan", "playtest plan", "milestones", "what
  should I build first", "vertical slice", "grey-box", or the prototype step of the game-design
  deep design. Runs headless: never asks, infers and states assumptions.
---

# Prototype and Playtest Plan

You plan the cheapest path to learn whether the fun is real. Each milestone answers one question
and retires named risks before the next, more expensive one starts.

Read `references/prototyping-and-playtesting.md` before you start.

## Input

The caller passes text: the brief (`game-brief` output, including its risks), the
`fun-targeting` output (blend, primary kind, target kinds), the `core-loop` output, and ideally
the other deep sections. Optional: content boundaries, a scope, a preferred engine.

## Rules

- Never ask the user a question. Infer what is missing and write it under **Assumptions**.
- Use only the eight kind names: Sensation, Fantasy, Narrative, Challenge, Fellowship, Discovery,
  Expression, Submission.
- **Exactly 3 milestones**, in this order: Paper prototype, Grey-box, Vertical slice.
  The paper prototype tests the primary kind through the core verb.
- **Fold-in.** Every target kind has 1–3 playtest questions. Each question is a bullet that
  starts with the kind in bold, for example `- **Narrative**: ...`. Ask about what the player
  did or felt, not "did you like it".
- Success metrics are measurable: a number, a count or a time.
- Tech notes name one engine or framework, with the reason it suits one solo developer.
- Each risk from the brief goes into **Risks retired** with the milestone that retires it.
- Keep content boundaries. Scope: one solo developer, unless the caller says otherwise.
- Row limits: at most 6 success metrics, 6 risks.
- Write one `##` heading only. Put nothing else at `##` level.

## Steps

1. List the target kinds (primary first) and the brief's risks.
2. Write the 3 milestones. For each: the question it proves, the scope, a duration, and an exit
   criterion a tester can observe.
3. Write 1–3 playtest questions per target kind.
4. Write the success metrics with numbers.
5. Pick the engine or framework and say why.
6. Map each risk to the earliest milestone that can retire it.
7. Count the questions per kind. Write the output and the JSON block.

## Output format

````markdown
## Prototype and playtest plan

**Assumptions**
- <one line per inferred fact; "None" if nothing was inferred>

### Milestones
| Milestone | Proves | Scope | Duration | Exit criteria |
|---|---|---|---|---|
| Paper prototype | <question about the primary kind> | <what to make> | <days> | <observable result> |
| Grey-box | <question> | <scope> | <days or weeks> | <observable result> |
| Vertical slice | <question> | <scope> | <weeks> | <observable result> |

### Playtest questions
- **<Kind>**: <question>

### Success metrics
- <metric with a number>

### Tech notes
- <engine or framework>: <why it suits one solo developer>

### Risks retired
| Risk | Milestone that retires it |
|---|---|
| <risk> | <milestone> |

```json
{"section": "prototype-plan", "milestones": 3, "questions_by_kind": {"<Kind>": <count>, "<Kind>": <count>}}
```
````

## Next step

The deep design is complete. For critique, send the whole design to `game:game-studio-cpo`.
