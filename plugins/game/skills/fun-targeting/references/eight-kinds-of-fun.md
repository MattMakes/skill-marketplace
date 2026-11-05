# The eight kinds of fun

Source: Marc LeBlanc, "8 Kinds of Fun", 8kindsoffun.com. The same taxonomy appears as the
"aesthetics" in Hunicke, LeBlanc and Zubek, "MDA: A Formal Approach to Game Design and Game
Research" (2004). See `mda.md`.

Use these exact eight names. Never invent a ninth kind.

| Kind | Game as… | The player feels | Typical dynamics | Typical mechanics |
|---|---|---|---|---|
| **Sensation** | sense-pleasure | delight in sight, sound, touch, rhythm | juicy feedback on every action, flow of motion | screen shake, particles, haptics, audio layering, tight input response |
| **Fantasy** | make-believe | "I am someone else, somewhere else" | role enactment, acting inside fiction | avatar, diegetic UI, role-specific verbs, costumes, world rules that fit the fiction |
| **Narrative** | unfolding story | curiosity about what happens next | dramatic arc, reveals, consequences that persist | scripted beats, branching choices, journals, character reactions |
| **Challenge** | obstacle course | mastery, tension, earned victory | skill growth, risk and reward, near misses | difficulty curve, timers, scoring, precise controls, fail states |
| **Fellowship** | social framework | belonging, cooperation, rivalry among friends | coordination, communication, shared goals | co-op roles, shared resources, emotes, trading, turn passing |
| **Discovery** | uncharted territory | wonder, "what is over there?" | exploration, experimentation, secrets found | hidden areas, fog of war, combinable systems, procedural content |
| **Expression** | self-discovery (the paper) / soap box (the site) | "this is mine; this says something about me" | creation, customization, personal style of play | builders, editors, cosmetics, many valid solutions, sharing |
| **Submission** | mindless pastime | calm, comfort, a pleasant way to pass time | low-stakes repetition, ambient progress | idle loops, gentle rhythm tasks, no fail states, short sessions |

Note: LeBlanc's MDA paper glosses Expression as "self-discovery"; 8kindsoffun.com glosses it as
"soap box". Both describe the player putting themselves into the game.

## Picking 2–3 kinds

1. Pick the kinds the concept's core verb serves most directly. The core verb is the strongest signal.
2. Pick them as a **blend** from `blends.md`, not one kind at a time (see below).
3. Deprioritize a kind that competes for the same moment. Submission and Challenge rarely share a
   moment; Narrative pacing and Expression freedom often conflict.
4. Every game touches several kinds. Deprioritized means "we will not spend design effort on it",
   not "it is absent".

## Blends, primary and supporting kinds, and the fold-in rule

A **blend** is a proven combination of 2–3 kinds that reinforce each other through **one shared
dynamic**. The MDA paper describes games this way: Charades is Fellowship, Expression, Challenge,
and "Charades emphasizes Fellowship over Challenge". Kinds picked at random compete for the same
moment; kinds from a blend come from the same player behavior. `blends.md` is the deck of blends.

- **Primary kind**: the first kind of the blend. The core verb must produce it every few seconds.
  It wins when two kinds compete for a design decision.
- **Supporting kinds**: the other 1–2 kinds. The same core loop produces them too, a little less
  often or a little less strongly.
- **Signature dynamic**: the one player behavior that produces every kind of the blend at once.
  If a design does not show this behavior, it does not deliver the blend.

**Folded in** means that the same moment-to-moment or session loop produces every target kind. A
kind that only a long-term system (unlocks, collections, a shop, a story between levels) or a side
system produces is **bolted on**, not folded in. The player spends most of their time in the core
loop, so a bolted-on kind is absent most of the time. Fix a bolted-on kind by changing the core
loop, never by dropping the kind.

Good (folded in):
- **Party performance** (Fellowship, Expression, Challenge): in Charades the one act of performing
  a clue is personal style (Expression), a race against the clock (Challenge) and a shared laugh
  (Fellowship).
- **Story in objects** (Narrative, Submission, Discovery): in Unpacking each calm placement of an
  object (Submission) reveals something new in the box (Discovery) and a piece of a life
  (Narrative).

Bad (bolted on):
- A brewing game targets Narrative and Expression, but brewing is a menu pick from fixed recipes
  and the story arrives in letters between days. Neither kind comes from the core verb. Fix: let
  the player's own ingredient choices change the brew and have customers react to it in the moment.
- A mirror puzzle game targets Challenge and Expression, but every puzzle has one solution and
  Expression lives only in a shop of lantern skins. Fix: allow many valid solutions and make the
  player's route the visible result.

## Writing an experience goal

An experience goal is one sentence that names what the player feels and when:
`<the player feels X> when <situation in the game>`.

- Good: "The player feels a jolt of pride when a chain of switches they built fires in one sweep."
- Bad: "The game is fun and satisfying." (No feeling, no moment.)
- Bad: "The game has a crafting system." (That is a mechanic, not an experience.)
