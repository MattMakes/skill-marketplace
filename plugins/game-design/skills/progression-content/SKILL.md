---
name: progression-content
description: >-
  Use when pacing a game from first minute to last — decides the game length up front
  (Librande), plans at most 10 sessions each with a goal, a new element and a target kind of
  fun, sets an unlock curve, draws a timed whole-game storyboard of 6–10 panels, and counts the
  content a solo developer must build with hour estimates. Trigger on: "progression", "game
  length", "session plan", "unlock curve", "timed storyboard", "content inventory", "how long is
  the game", or the progression step of the game-design deep design. Runs headless: never asks,
  infers and states assumptions.
---

# Progression and Content

You decide how long the game is before you design what fills it. Then you pace new elements so
each session teaches one thing, and you count what one developer must build.

Read `references/pacing.md` before you start.

## Input

The caller passes text: the brief (`game-brief` output), the `fun-targeting` output (blend,
primary kind, target kinds), the `core-loop` output, and ideally the `systems-economy` output.
Optional: content boundaries, a scope, a target length.

## Rules

- Never ask the user a question. Infer what is missing and write it under **Assumptions**.
- Use only the eight kind names: Sensation, Fantasy, Narrative, Challenge, Fellowship, Discovery,
  Expression, Submission.
- **Decide one game length** in hours, with a reason. For an endless or ambient game, the length
  is the time to see all authored content. Never write a range.
- **Fold-in.** Every session names the target kind it serves. The first session serves the
  primary kind through the core verb, not through a menu or a meta system.
- One new element per session. Do not unlock a system before the player has used what it needs.
- Keep content boundaries. Scope: one solo developer, unless the caller says otherwise.
- Row limits: at most 10 sessions, 12 unlocks, 8 content rows; the storyboard has 6–10 panels.
- `content_hours` is the sum of the Solo-dev cost column.
- Write one `##` heading only. Put nothing else at `##` level.

## Steps

1. Decide the game length and write the reason in one sentence.
2. Split the length into sessions (at most 10). Give each a goal, one new element and a kind.
3. List the unlocks and when each arrives (session number or minute), with the reason.
4. Draw the timed storyboard: 6–10 panels from the first minute to the end, each with a time mark.
   Put the interest peaks where the new elements land, and end on the biggest one.
5. Count the content: asset types, counts, and hours for one developer.
6. Sum the hours. Write the output and the JSON block.

## Output format

````markdown
## Progression and content

**Assumptions**
- <one line per inferred fact; "None" if nothing was inferred>

### Game length
- <N> hours. <reason in one sentence>

### Session plan
| Session | Goal | New element | Target kind |
|---|---|---|---|
| 1 | <goal> | <element> | <Primary kind> |

### Unlock curve
| Unlock | When (session or minute) | Why then |
|---|---|---|
| <unlock> | <Session N or Minute N> | <reason> |

### Timed storyboard
| Time | Panel |
|---|---|
| 0:00 | <what the player sees and does> |

### Content inventory
| Asset type | Count | Solo-dev cost (hours) |
|---|---|---|
| <type> | <count> | <hours> |

```json
{"section": "progression-content", "length_hours": <N>, "sessions": <rows in Session plan>, "content_hours": <sum of hours>}
```
````

## Next step

Hand the section to `level-ux`, which designs the first 10 minutes and sample levels.
