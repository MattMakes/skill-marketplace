# MDA: Mechanics, Dynamics, Aesthetics

Source: Robin Hunicke, Marc LeBlanc and Robert Zubek, "MDA: A Formal Approach to Game Design and
Game Research", Proceedings of the AAAI Workshop on Challenges in Game AI, 2004.

## The three layers

| Layer | What it is | Example (a stealth game) |
|---|---|---|
| **Mechanics** | The rules and components: data, algorithms, controls. What the designer builds directly. | guard vision cones, a noise meter, crouch-walk |
| **Dynamics** | The run-time behavior that emerges when players act on the mechanics over time. | players wait, watch patrol patterns, time their dash |
| **Aesthetics** | The emotional response the player has. The eight kinds of fun (see `eight-kinds-of-fun.md`). | Challenge (tension of the timed dash), Fantasy (being a thief) |

## Direction matters

- The **designer** builds Mechanics → Dynamics → Aesthetics.
- The **player** experiences Aesthetics → Dynamics → Mechanics.
- So design **backwards**: pick the target aesthetics first, then ask "what player behavior
  produces this feeling?" (dynamics), then "what rules produce that behavior?" (mechanics).

## The aesthetic trace

An aesthetic trace lists every mechanic and the target aesthetic it serves, through which dynamic.

- A mechanic that serves a target aesthetic: **KEEP**.
- A mechanic that serves only a deprioritized aesthetic: **FLAG** (keep only if cheap; say why).
- A mechanic that serves no aesthetic at all: **CUT**.

The trace is the tool that stops feature creep: a feature earns its place by the fun it produces.

## Common failures

- Starting from a mechanic you like and hoping it becomes fun. Start from the feeling.
- Listing more than 3 target aesthetics. A game that targets everything targets nothing.
- Naming a dynamic that the mechanics cannot produce ("players will cooperate" with no shared goal).
