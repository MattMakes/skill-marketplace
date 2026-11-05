---
name: systems-economy
description: >-
  Use when designing a game's systems and internal economy — lists at most 8 systems and the
  resources that flow between them as sources, sinks and converters (Adams and Dormans), ties
  every system and resource to the target kind of fun it serves, sets balance levers with
  starting values, walks the first hour in numbers, and plans failure and recovery. Flags or
  redesigns any system that serves no target kind (the fold-in rule). Trigger on: "game
  economy", "systems design", "resources and sinks", "balance levers", "first hour in numbers",
  or the systems step of the game-design deep design. Runs headless: never asks, infers and
  states assumptions.
---

# Systems and Economy

You turn the core loop into systems that trade resources. Every system and every resource earns
its place by serving a target kind of fun.

Read `references/internal-economy.md` before you start.

## Input

The caller passes text: the brief (`game-brief` output), the `fun-targeting` output (blend,
primary kind, target kinds, MDA trace), and the `core-loop` output. Optional: content
boundaries, a scope, systems the caller wants included.

## Rules

- Never ask the user a question. Infer what is missing and write it under **Assumptions**.
- Use only the eight kind names: Sensation, Fantasy, Narrative, Challenge, Fellowship, Discovery,
  Expression, Submission.
- **Fold-in.** Every system and every resource names the target kind(s) it serves. The primary
  kind must be served by the system that runs the moment-to-moment loop (the core verb).
- A system or resource that serves no target kind, or that lives only beside the loop (for
  example a cosmetic-only shop, a login bonus), is not allowed in the tables. Either redesign it
  so the core loop produces a target kind through it, or cut it. List it under
  **Cut or redesigned** with what you did. This applies to systems the caller asked for too.
- Keep content boundaries. A system that crosses one is cut.
- Scope: one solo developer, unless the caller says otherwise.
- Row limits: at most 8 systems, 6 resources, 5 balance levers, 8 first-hour rows.
- Write one `##` heading only. Put nothing else at `##` level.

## Steps

1. Name the core verb, the primary kind and the other target kinds.
2. List the systems: the core-verb system first, then the ones the loops need. For each: purpose,
   the kinds it serves, its inputs and outputs.
3. Check each caller-supplied system. Redesign or cut any that serve no target kind.
4. List the resources. For each: its sources, its sinks, a cap (or "none" with a reason), and the
   kind it exists for. Every resource needs at least 1 source and 1 sink.
5. Pick the balance levers: the numbers a designer turns first, each with a starting value.
6. Walk the first hour in numbers: at 4–8 minute marks, the player's state and resource amounts.
7. Write failure and recovery: how the player can fail, what they lose, how they get back.
8. Count the rows. Write the output and the JSON block. `unserved` must be `[]`.

## Output format

````markdown
## Systems and economy

**Assumptions**
- <one line per inferred fact; "None" if nothing was inferred>

### Systems
| System | Purpose | Serves (kinds) | Inputs | Outputs |
|---|---|---|---|---|
| <core-verb system> | <purpose> | <Primary kind>[, <Kind>] | <inputs> | <outputs> |

Cut or redesigned:
- <system>: <cut, or redesigned as ... so it serves <Kind>>; "None" if nothing

### Resources
| Resource | Sources | Sinks | Cap | Why it exists (kind) |
|---|---|---|---|---|
| <resource> | <system(s)> | <system(s)> | <number or none> | <Kind>: <reason> |

### Balance levers
- <lever> → <what it changes> → <starting value>

### First hour in numbers
| Minute | Player state | Key resources | What changes |
|---|---|---|---|
| 0 | <state> | <resource amounts> | <change> |

### Failure and recovery
- <how the player fails, what it costs, how they recover>

```json
{"section": "systems-economy", "systems": <rows in Systems>, "resources": <rows in Resources>, "unserved": []}
```
````

## Next step

Hand the section to `progression-content`, which paces these systems over the game's length.
