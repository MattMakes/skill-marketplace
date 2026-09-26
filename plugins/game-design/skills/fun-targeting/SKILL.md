---
name: fun-targeting
description: >-
  Use when choosing what kind of fun a game concept should deliver — picks a proven blend of 2–3 of
  Marc LeBlanc's eight kinds of fun (Sensation, Fantasy, Narrative, Challenge, Fellowship,
  Discovery, Expression, Submission) from a curated blend deck, writes a one-sentence experience
  goal for each, names the kinds deliberately deprioritized, derives dynamics and then mechanics
  backwards through MDA, checks that the core loop (not a meta system) produces every target kind,
  and traces every mechanic to the fun it serves, cutting or flagging the ones that serve none.
  Trigger on: "what
  should this game feel like", "target aesthetics", "MDA", "8 kinds of fun", "which mechanics earn
  their place", or the first step of the game-design pipeline. Runs headless: never asks, infers
  and states assumptions.
---

# Fun Targeting

You choose the fun first and derive the rules from it. Designers build Mechanics → Dynamics →
Aesthetics; players feel them in reverse. So you start at the Aesthetics and work backwards.

Read `references/eight-kinds-of-fun.md`, `references/mda.md` and `references/blends.md` before
you start. Use only the eight kind names in those files.

## Input

The caller gives some of: a concept or pitch, a constraint card, a list of mechanics, target
aesthetics chosen upstream, or a **blend** from `references/blends.md` (id, kinds, signature
dynamic, loop pattern). Everything is optional except a concept or a constraint card.

## Rules

- Never ask the user a question. When something is missing, infer it and write it under
  **Assumptions**.
- The target aesthetics are always the kinds of **one blend** from `references/blends.md`: 2 or 3
  kinds, in the blend's order. The first kind is the **primary** aesthetic. Never invent a
  combination that is not in the deck.
- If the caller gives a blend, the targets are exactly its kinds, in its order. The MDA table
  includes the blend's signature dynamic, word for word, as a dynamic of the primary kind.
- If the caller gives target aesthetics but no blend, pick the deck blend that shares the most
  kinds with them; prefer a blend whose kinds are all in the caller's list. Under Assumptions,
  name every supplied kind you dropped (for example because more than 3 were given) or added.
- If the caller gives neither, pick the deck blend that the core verb produces most directly.
  Under Assumptions, say why this blend fits the core verb better than the next-best one.
- **Fold-in rule**: the moment-to-moment or session loop must produce every target kind. A kind
  that only a long-term (meta) system or a side system produces is bolted on. Then redesign the
  core loop until a moment-to-moment or session mechanic produces it. Never drop the kind to pass,
  and never pass it with a side system.
- Every one of the other kinds is listed as deprioritized, each with a short reason.
- Every mechanic appears in the trace. If the caller listed mechanics, trace **every one of them**,
  including ones that serve nothing.
- Each trace row names the loop the mechanic lives in: exactly `moment` (every few seconds),
  `session` (one sitting), `long-term` (across sessions) or `side` (outside the core loops, such as
  a shop or a menu). A mechanic that produces several target kinds names them all in `Serves`,
  joined by `, `.
- Verdicts are exactly `KEEP`, `FLAG` or `CUT`:
  - `KEEP`: serves a target aesthetic.
  - `FLAG`: serves only a deprioritized aesthetic. Say what it costs to keep.
  - `CUT`: serves no aesthetic. The `Serves` cell is `none`.

## Steps

1. Read the input. Name the core verb (the thing the player does most).
2. Take the blend (given, matched to the given aesthetics, or picked from the deck by the core
   verb, as the rules say). Its kinds are the targets; its first kind is the primary.
3. Write one experience goal per target: `The player feels <X> when <situation>.` One sentence.
   Every goal starts with the exact words `The player feels`, including Narrative ("The player
   feels a pull to know what happens next when …"). The primary's goal names a moment of the
   core verb.
4. List every remaining kind as deprioritized with a one-line reason.
5. For each target aesthetic, write 1–3 dynamics (player behavior over time) that produce it.
   One dynamic of the primary kind is the blend's signature dynamic.
6. For each dynamic, write the mechanics (rules, controls, systems) that produce it. Add the
   caller's mechanics where they fit. Use the blend's loop pattern as the shape of the
   moment-to-moment loop.
7. Fold-in check: for each target kind, name the `moment` or `session` mechanic that produces it.
   If only a `long-term` or `side` mechanic produces a kind, redesign the core loop: change or add
   a `moment` or `session` mechanic that produces it, and write what you changed in the Result
   cell. Repeat until every target kind passes.
8. Build the aesthetic trace: every mechanic → the aesthetic it serves → via which dynamic →
   verdict → loop. Every target kind has at least 1 `KEEP` row in `moment` or `session`.
9. Write the output in the exact format below. Then write the JSON block.

## Output format

Write exactly these sections, in this order, with these headings:

```markdown
## Assumptions
- <one line per inferred fact; "None" if nothing was inferred>

**Blend:** <id> (<Name>) — primary: <Kind>

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

## Fold-in check
| Kind | Loop | Mechanic that produces it | Result |
|---|---|---|---|
| <Kind> | moment / session | <mechanic> | folded in / redesigned: <what changed in the core loop> |

## Aesthetic trace
| Mechanic | Serves | Via dynamic | Verdict | Loop |
|---|---|---|---|---|
| <mechanic> | <Kind, several Kinds, or none> | <dynamic or —> | KEEP / FLAG / CUT | moment / session / long-term / side |

## Cuts and flags
- <one line per CUT or FLAG mechanic: why, and what to do instead; "None" if there are none>
```

End with a fenced `json` block that repeats the result for machines:

```json
{
  "core_verb": "<verb>",
  "blend": "<blend id from references/blends.md>",
  "primary": "<Kind>",
  "aesthetics": [{"kind": "<Kind>", "goal": "<experience goal>"}],
  "deprioritized": ["<Kind>"],
  "trace": [{"mechanic": "<mechanic>", "serves": "<Kind, Kinds joined by ', ', or none>", "verdict": "KEEP|FLAG|CUT", "loop": "moment|session|long-term|side"}]
}
```

`aesthetics` has 2 or 3 items, in the blend's order; `primary` is the first one. `aesthetics` and
`deprioritized` together name all eight kinds once.

## Next step

Hand the result, with the blend and the primary kind, to `core-loop` (loops) and `game-brief`
(the "Why it's fun" section). For
critique, send the finished design to `game:game-studio-cpo`.
