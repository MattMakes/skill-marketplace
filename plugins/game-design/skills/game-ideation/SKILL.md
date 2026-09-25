---
name: game-ideation
description: >-
  Use when generating game ideas or concepts — diverges into at least 6 concepts under a
  constraint card (target fun, core verb, setting, twist, session length, scope), each written
  through a different ideation frame, rejects any concept that crosses the caller's content
  boundaries before scoring, scores the rest on fun fit, novelty against a history list,
  one-sentence clarity and prototypability, and returns a ranked shortlist with the pick, the
  runners-up and a machine-readable JSON block. Trigger on: "give me game ideas", "brainstorm a
  game", "constraint card", "pick a concept", or the ideation step of the game-design pipeline.
  Runs headless: never asks, infers and states assumptions.
---

# Game Ideation

You diverge first, then converge. You write many different concepts, remove the ones that break
the caller's content boundaries, score the rest, and pick one.

Read these files before you start:
- `references/frames.md` (the ideation frames)
- `references/rubric.md` (scores, weights, picking)
- the decks in `references/decks/` only when you must draw a constraint card yourself

## Input

The caller gives some of:
- a **constraint card**: target fun (2–3 kinds), core verb, setting, twist, session length, scope;
- **boundaries**: content rules a concept must not cross;
- a **history** list of past concepts, for novelty;
- **seed concepts** the caller wants judged alongside yours.

## Rules

- Never ask the user a question. Infer what is missing and write it under **Assumptions**.
- If the card is missing or incomplete, draw each missing field from its deck in
  `references/decks/` and say so under Assumptions. If the target fun is missing, pick 2 kinds
  that suit the verb.
- Write **at least 6** new concepts. Each uses a different frame from `references/frames.md`.
- Include every seed concept too, with the frame `supplied`. Seeds do not count toward the 6.
- **Boundaries first.** Check every concept against every boundary **before** you score anything.
  - A concept that crosses a boundary is rejected. Do not soften or rewrite it to pass.
  - When it is unclear whether a concept crosses a boundary, reject it.
  - A rejected concept gets `scores: {}`, `total: null` and a `rejected_reason` that names the
    boundary it crossed.
  - If the caller supplies no boundaries, write "No boundaries supplied" under Assumptions and
    reject nothing on boundary grounds.
- Score only concepts that passed the gate, with the rubric in `references/rubric.md`.
- Never pick a rejected concept.

## Steps

1. Write the constraint card (given or drawn).
2. Diverge: write at least 6 concepts, one frame each. Each concept has a title (2–4 words) and a
   one-liner (one sentence, at most 30 words). Add the seed concepts.
3. Gate: check every concept against the boundaries. Record each rejection and its reason.
4. Score: give each remaining concept 1–5 on `fun_fit`, `novelty`, `clarity`, `prototypability`.
   Compute the total with the weights in the rubric.
5. Converge: pick the highest total. Name the next 2 as runners-up.
6. Write the output in the exact format below.

## Output format

Write exactly these sections, in this order, with these headings:

```markdown
## Assumptions
- <one line per inferred fact; "None" if nothing was inferred>

## Constraint card
| Field | Value |
|---|---|
| Target fun | <Kind>, <Kind> |
| Core verb | <verb> |
| Setting | <setting> |
| Twist | <twist> |
| Session length | <length> |
| Scope | <scope> |

## Concepts
1. **<Title>** (<frame>): <one-liner>
2. ...

## Boundary gate
- <N> concepts rejected by the content gate.
- **<Title>**: rejected, <the boundary it crossed and why>

## Scores
| Concept | Fun fit | Novelty | Clarity | Prototypability | Total |
|---|---|---|---|---|---|
| <Title> | 4 | 3 | 5 | 4 | 3.95 |

## Pick
**<Title>**: <why it won, in one or two sentences>

## Runners-up
1. **<Title>**: <one line>
2. **<Title>**: <one line>
```

End with a fenced `json` block. It is the contract for scripts that call this skill:

```json
{
  "constraint_card": {"target_fun": ["<Kind>"], "core_verb": "", "setting": "", "twist": "", "session_length": "", "scope": ""},
  "concepts": [
    {"title": "", "one_liner": "", "frame": "", "scores": {"fun_fit": 4, "novelty": 3, "clarity": 5, "prototypability": 4}, "total": 3.95, "rejected_reason": null},
    {"title": "", "one_liner": "", "frame": "", "scores": {}, "total": null, "rejected_reason": "<boundary and why>"}
  ],
  "pick": "<title of the pick>",
  "runners_up": ["<title>", "<title>"]
}
```

`concepts` lists every concept, rejected ones included, in the order of the Concepts section.

## Next step

Hand the pick to `fun-targeting`, then `core-loop` and `game-brief`.
