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
| `fun-targeting` | Picks a proven **blend** of 2–3 of LeBlanc's eight kinds of fun from a curated deck (`references/blends.md`), each kind with a one-sentence experience goal, names the kinds it deprioritizes, and derives dynamics and mechanics backwards (MDA). Enforces the fold-in rule: the core loop, not a meta system, produces every target kind. Traces every mechanic to the fun it serves and the loop it lives in; a mechanic that serves none is cut or flagged. | Blend, MDA table, fold-in check and aesthetic trace |
| `game-ideation` | Generates at least 6 concepts under a constraint card, each through a different frame. Rejects any concept that crosses the caller's content boundaries before scoring, then scores the rest on fun fit, novelty, one-sentence clarity and prototypability. Keeps the runners-up. | Shortlist, pick, and a JSON block |
| `core-loop` | Librande's "flowchart first": the moment-to-moment, session and long-term loops, each as player action → system response → feedback → next decision, with every feedback edge labeled by the fun it serves. The primary kind labels a moment-to-moment edge; every target kind labels a moment-to-moment or session edge. | Three Mermaid flowcharts |
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

## Blends and the fold-in rule

A **blend** is a proven combination of 2–3 kinds of fun that one shared dynamic produces together,
for example *Team under pressure* (Fellowship, Challenge, Sensation) or *Curious expedition*
(Discovery, Narrative). The deck in `skills/fun-targeting/references/blends.md` cites a source for
each blend (the MDA paper's examples, design talks, genre analysis). The first kind is the primary.
`fun-targeting` never invents a combination outside the deck, and `game-ideation` accepts a blend on
the constraint card and scores fun fit against its signature dynamic.

The **fold-in rule**: every target kind comes from the moment-to-moment or session loop, the thing
the player does all the time. A kind that only a shop, an unlock track or a story between levels
produces is bolted on, and the skills redesign the core loop instead of passing it.
`fun-targeting`, `core-loop` and `game-brief` all check it.

The deck is plain Markdown with a fixed format, so scripts can parse it. Run its format test with:

```bash
python3 -m unittest discover -s skills/fun-targeting/tests
```

## Content boundaries

`game-ideation` takes the caller's content boundaries as an input and rejects a concept that crosses
one before it scores anything. The plugin carries no personal rules. Its constraint-card decks
contain no violent, sexual or real-money-gambling entries.

## Critique

For an honest critique of a finished design, hand it to `game:game-studio-cpo` from the `game`
plugin. The link goes one way: this plugin calls the review board, and the review board knows
nothing about this plugin.

## Running evals

`scripts/run_evals.py` runs a skill's `evals/evals.json` under `claude -p` and grades the
deterministic checks (regex, ordered text, JSON expressions, and rendered-spec validation).

```bash
python3 scripts/run_evals.py <plugin_dir> <skill_name> [--ids 1,2] [--out DIR] [--regrade]
```

- `<plugin_dir>` is the path to this plugin directory (for example `.` when run from here).
- `--ids` limits the run to specific eval IDs.
- `--out` sets the output directory for transcripts (default `eval-out`).
- `--regrade` re-grades saved transcripts without calling `claude` again.

Exit code is 0 when every eval passes.

## Sources

- Stone Librande, "One-Page Designs", GDC 2010.
- Marc LeBlanc, "8 Kinds of Fun", 8kindsoffun.com.
- Robin Hunicke, Marc LeBlanc and Robert Zubek, "MDA: A Formal Approach to Game Design and Game
  Research", AAAI Workshop on Challenges in Game AI, 2004.
