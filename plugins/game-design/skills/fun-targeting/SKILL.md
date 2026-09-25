---
name: fun-targeting
description: >-
  Use when choosing what kind of fun a game concept should deliver — picks 2–3 of Marc LeBlanc's
  eight kinds of fun (Sensation, Fantasy, Narrative, Challenge, Fellowship, Discovery, Expression,
  Submission), writes a one-sentence experience goal for each, names the kinds deliberately
  deprioritized, derives dynamics and then mechanics backwards through MDA, and traces every
  mechanic to the fun it serves, cutting or flagging the ones that serve none. Trigger on: "what
  should this game feel like", "target aesthetics", "MDA", "8 kinds of fun", "which mechanics earn
  their place", or the first step of the game-design pipeline. Runs headless: never asks, infers
  and states assumptions.
---

# Fun Targeting

You choose the fun first and derive the rules from it. Designers build Mechanics → Dynamics →
Aesthetics; players feel them in reverse. So you start at the Aesthetics and work backwards.

Read `references/eight-kinds-of-fun.md` and `references/mda.md` before you start.
Use only the eight kind names in that file.

## Input

The caller gives some of: a concept or pitch, a constraint card, a list of mechanics, or target
aesthetics chosen upstream. Everything is optional except a concept or a constraint card.

## Rules

- Never ask the user a question. When something is missing, infer it and write it under
  **Assumptions**.
- Pick **exactly 2 or 3** target aesthetics. Never 1, never 4 or more.
- If the caller already chose the target aesthetics, keep them (still exactly 2–3; if they gave
  more than 3, keep the first 3 and say so under Assumptions).
- Every one of the other kinds is listed as deprioritized, each with a short reason.
- Every mechanic appears in the trace. If the caller listed mechanics, trace **every one of them**,
  including ones that serve nothing.
- Verdicts are exactly `KEEP`, `FLAG` or `CUT`:
  - `KEEP`: serves a target aesthetic.
  - `FLAG`: serves only a deprioritized aesthetic. Say what it costs to keep.
  - `CUT`: serves no aesthetic. The `Serves` cell is `none`.

## Steps

1. Read the input. Name the core verb (the thing the player does most).
2. Pick 2–3 target aesthetics that the core verb serves most directly and that reinforce each other.
3. Write one experience goal per target: `The player feels <X> when <situation>.` One sentence.
   Every goal starts with the exact words `The player feels`, including Narrative ("The player
   feels a pull to know what happens next when …").
4. List every remaining kind as deprioritized with a one-line reason.
5. For each target aesthetic, write 1–3 dynamics (player behavior over time) that produce it.
6. For each dynamic, write the mechanics (rules, controls, systems) that produce it. Add the
   caller's mechanics where they fit.
7. Build the aesthetic trace: every mechanic → the aesthetic it serves → via which dynamic → verdict.
8. Write the output in the exact format below. Then write the JSON block.

## Output format

Write exactly these sections, in this order, with these headings:

```markdown
## Assumptions
- <one line per inferred fact; "None" if nothing was inferred>

## Target aesthetics
| # | Aesthetic | Experience goal |
|---|---|---|
| 1 | <Kind> | The player feels <X> when <situation>. |
| 2 | <Kind> | ... |

## Deprioritized
- **<Kind>**: <why it is not a target>

## MDA table
| Aesthetic | Dynamic | Mechanics |
|---|---|---|
| <Kind> | <player behavior over time> | <mechanic>; <mechanic> |

## Aesthetic trace
| Mechanic | Serves | Via dynamic | Verdict |
|---|---|---|---|
| <mechanic> | <Kind or none> | <dynamic or —> | KEEP / FLAG / CUT |

## Cuts and flags
- <one line per CUT or FLAG mechanic: why, and what to do instead; "None" if there are none>
```

End with a fenced `json` block that repeats the result for machines:

```json
{
  "core_verb": "<verb>",
  "aesthetics": [{"kind": "<Kind>", "goal": "<experience goal>"}],
  "deprioritized": ["<Kind>"],
  "trace": [{"mechanic": "<mechanic>", "serves": "<Kind or none>", "verdict": "KEEP|FLAG|CUT"}]
}
```

`aesthetics` has 2 or 3 items. `aesthetics` and `deprioritized` together name all eight kinds once.

## Next step

Hand the result to `core-loop` (loops) and `game-brief` (the "Why it's fun" section). For
critique, send the finished design to `game:game-studio-cpo`.
