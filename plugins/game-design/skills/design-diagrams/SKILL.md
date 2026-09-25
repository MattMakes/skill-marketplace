---
name: design-diagrams
description: >-
  Use when a game design needs the right diagram, not more prose: an engine loop, a whole-game
  storyboard, a time-and-space map, a faction relationship chart, an axes-first matrix, or a
  module map. Trigger on: "what diagram should I use", "map out the loop", "chart the factions",
  "storyboard the game", or when `core-loop` or `game-brief` needs a diagram picked and drawn.
  Picks the diagram from Librande's vocabulary, applies the "wrong metaphor" check, and emits a
  Mermaid or JSON/SVG recipe.
---

# Design Diagrams

A catalog of the diagram types Stone Librande demonstrated (GDC 2010, "One-Page Designs"), each
with when to use it, when not to, and a recipe. Full catalog with citations:
`references/diagram-catalog.md`. Headless-safe: no AskUserQuestion, Task, TodoWrite, Skill tool
or WebFetch. If the shape of the problem is unclear, infer the closest fit from the catalog and
state the assumption — never stop to ask.

## Method (follow in order)

1. **Name the true shape of the problem** before picking a diagram. What varies, over what axis?
   Time, space, a hierarchy, a set of peer relationships, or a sequence of decisions? The shape,
   not the topic, picks the diagram.
2. **Pick one diagram type** from `references/diagram-catalog.md` that matches that shape. Do not
   default to a flowchart for everything — a matrix-shaped problem drawn as a flowchart hides the
   very relationships it should show.
3. **Run the "wrong metaphor" check.** Before finalizing, ask: does this diagram fold or hide any
   relationship it should show? (The Spore "dreamcatcher" was a pretty circle that folded the fan
   and put opposites next to each other — the wrong metaphor for a one-dimensional continuum.) If
   two categories that should be far apart end up adjacent, or a hierarchy is drawn as a loop, or
   an axis is implied but never labeled, redraw with a different diagram type before delivering.
4. **For a matrix-shaped problem**, pick the axes *first*, then fill the grid like a crossword —
   never build the grid bottom-up from whatever cells happen to exist. Collapse dimensions that
   don't carry independent information: a four-dimensional table with 256 combinations often
   reduces to a much smaller set of real outcomes (Spore's consequence system reduced to about 36)
   once the true shape is found.
5. **Emit the recipe** from `references/diagram-catalog.md`: a Mermaid template for
   flowcharts, storyboards and module maps (Obsidian renders Mermaid natively); a small JSON/SVG
   template for the time-and-space map, the relationship triangle and the matrix, where node
   position and axis meaning carry the content.
6. **Label every axis and edge.** An unlabeled axis or an arrow with no meaning is not a diagram,
   it's decoration — cut it or label it.

## Diagram types at a glance

| Shape of the problem | Diagram | Recipe |
|---|---|---|
| A repeating action → response → feedback cycle | Flowchart (engine loop) | Mermaid `flowchart` |
| The whole game's pacing, start to end | Timed whole-game storyboard | Mermaid `flowchart LR` with timing labels |
| Something that changes over both time and space | Time-and-space map (Minard / Spore) | JSON/SVG: x = time or space, y = the changing quantity |
| A small set of mutually-opposing forces | Relationship triangle (sides, not corners) | JSON/SVG: 3 sides, sliders between them |
| Two independent axes crossed | Top-down matrix | JSON/SVG: axes fixed first, grid filled like a crossword |
| How systems or content modules connect | Module map | Mermaid `flowchart` or `graph`, one node per module |

See `references/diagram-catalog.md` for the full write-up of each, with the "when not to" case and
a worked recipe.
