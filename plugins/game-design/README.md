# game-design

A design studio for game ideas. Where the `game` plugin reviews work, this plugin produces it: target
kinds of fun, concepts, core loops, a brief, a one-page design, diagrams and an art-direction style
sheet. Every skill runs headless: it never asks a question, it infers and states its assumptions, and
it writes a fixed output format, so a scheduled agent on a local model can run it as well as Claude Code.

```bash
claude plugin install game-design@skill-marketplace
```

## Skills

| Skill | What it does | Output |
|---|---|---|
| `fun-targeting` | Picks 2–3 of LeBlanc's eight kinds of fun, each with a one-sentence experience goal, names the kinds it deprioritizes, and derives dynamics and mechanics backwards (MDA). Traces every mechanic to the fun it serves; a mechanic that serves none is cut or flagged. | MDA table and aesthetic trace |
| `game-ideation` | Generates at least 6 concepts under a constraint card, each through a different frame. Rejects any concept that crosses the caller's content boundaries before scoring, then scores the rest on fun fit, novelty, one-sentence clarity and prototypability. Keeps the runners-up. | Shortlist, pick, and a JSON block |
| `core-loop` | Librande's "flowchart first": the moment-to-moment, session and long-term loops, each as player action → system response → feedback → next decision, with every feedback edge labeled by the fun it serves. | Three Mermaid flowcharts |
| `design-diagrams` | A catalog of which diagram to draw when: engine-loop flowchart, timed storyboard, time-and-space map, relationship triangle, top-down matrix, module map, plus the "wrong metaphor" check. | Diagrams for the brief |
| `game-brief` | The reader-facing brief: pitch, player fantasy, a 30-second play-by-play, why it's fun per target aesthetic, comparables, solo scope, risks, the smallest prototype that tests the fun, and open questions. | `<Title>.md` with frontmatter |
| `one-page-design` | Librande's one-page method as rules. Writes a JSON spec; a stdlib Python script renders it to a dated SVG and validates it. | `One-Page.svg` and its spec |
| `art-direction` | A style sheet (palette, shape language, lighting, references in words, never living artists' names), a shot list tied to the target fun, and 3 image prompts with fixed negative prompts. Generated images are placeholders; the style sheet is the deliverable. | Style sheet, shot list, prompts |

## Pipeline

Run them in this order; each one reads the previous one's output:

```
fun-targeting → game-ideation → core-loop → design-diagrams → game-brief → one-page-design → art-direction
```

Invoke them namespaced: `game-design:fun-targeting`, `game-design:game-brief`, and so on.

## Content boundaries

`game-ideation` takes the caller's content boundaries as an input and rejects a concept that crosses
one before it scores anything. The plugin carries no personal rules. Its constraint-card decks
contain no violent, sexual or real-money-gambling entries.

## Critique

For an honest critique of a finished design, hand it to `game:game-studio-cpo` from the `game`
plugin. The link goes one way: this plugin calls the review board, and the review board knows
nothing about this plugin.

## Sources

- Stone Librande, "One-Page Designs", GDC 2010.
- Marc LeBlanc, "8 Kinds of Fun", 8kindsoffun.com.
- Robin Hunicke, Marc LeBlanc and Robert Zubek, "MDA: A Formal Approach to Game Design and Game
  Research", AAAI Workshop on Challenges in Game AI, 2004.
