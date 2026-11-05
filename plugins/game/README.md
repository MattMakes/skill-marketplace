# game — Game Design and Build

How do I make a game, and is it good? Three parts, from idea to release. The design studio
produces the work: target kinds of fun, concepts, core loops, a brief, a one-page design, diagrams,
an art-direction style sheet and a deep design. The review board judges it: each auditor scores
what you bring against a rubric and proposes concrete fixes, citing rules distilled from 38
game-development books rather than improvising taste. The studio and the board work for any
engine. The Godot build kit builds the game in Godot and measures it against the board's rules.
Thirty skills.

```bash
claude plugin install game@skill-marketplace
```

**Where to start.** To work through a design with someone, start at `one-page-game-design`. To
run the design pipeline without questions, start at `fun-targeting`. To judge existing work, start
at `game-studio-cpo`; it points you at the right auditor. To build in Godot, start with the four
foundation skills of the build kit.

## Skills

### Design studio

Every pipeline skill runs headless. It never asks a question, it infers and states its
assumptions, and it writes a fixed output format, so a scheduled agent on a local model can run it
as well as Claude Code. `one-page-game-design` is the one collaborative skill; it asks
consequential questions and records the answers, proposals and open decisions.

| Skill | What it does | Output |
|---|---|---|
| `fun-targeting` | Picks a proven **blend** of 2–3 of LeBlanc's eight kinds of fun from a curated deck (`references/blends.md`), each kind with a one-sentence experience goal, names the kinds it deprioritizes, and derives dynamics and mechanics backwards (MDA). Enforces the fold-in rule and traces every mechanic to the fun it serves and the loop it lives in; a mechanic that serves none is cut or flagged. | Blend, MDA table, fold-in check and aesthetic trace |
| `game-ideation` | Generates at least 6 concepts under a constraint card, each through a different frame. Rejects any concept that crosses the caller's content boundaries before scoring, then scores the rest on fun fit, novelty, one-sentence clarity and prototypability. Keeps the runners-up. | Shortlist, pick, and a JSON block |
| `core-loop` | Librande's "flowchart first": the moment-to-moment, session and long-term loops, each as player action → system response → feedback → next decision, with one feedback node per target kind (at most 3 per loop) and every feedback edge labeled by the fun it serves. | Three Mermaid flowcharts |
| `design-diagrams` | A catalog of which diagram to draw when: engine-loop flowchart, timed storyboard, time-and-space map, relationship triangle, top-down matrix, module map, plus the "wrong metaphor" check. | Diagrams for the brief |
| `game-brief` | The reader-facing brief: pitch, player fantasy, a 30-second play-by-play, why it's fun per target aesthetic, comparables, solo scope, risks, the smallest prototype that tests the fun, and open questions. | `<Title>.md` with frontmatter |
| `one-page-game-design` | Collaborative (default): works through design decisions with the user, walks through play and failure paths, and selects a visual mode for the design's complexity. Headless pipeline mode, from the former `one-page-design`: Librande's one-page method as rules, a JSON spec rendered to a dated SVG and validated by stdlib Python scripts, no questions asked. | Collaborative: light interactive HTML or detailed standalone SVG, a 1-page PDF and a saved design record. Headless: `One-Page.svg` and its spec |
| `art-direction` | A style sheet (palette, shape language, lighting, references in words, never living artists' names), a shot list tied to the target fun, and 3 image prompts with fixed negative prompts. Generated images are placeholders; the style sheet is the deliverable. | Style sheet, shot list, prompts |
| `systems-economy` | At most 8 systems and the resources between them as sources, sinks and converters (Adams and Dormans), balance levers with starting values, the first hour in numbers, failure and recovery. Every system and resource names the kind it serves. | `## Systems and economy` and a JSON block |
| `progression-content` | Decides the game length up front (Librande), plans at most 10 sessions and 12 unlocks, draws a timed whole-game storyboard of 6–10 panels, and counts the content with solo-dev hours. | `## Progression and content` and a JSON block |
| `level-ux` | The first 10 minutes beat by beat, exactly 3 sample levels with layout sketches, controls for keyboard/mouse, controller and touch, the HUD, and a Mermaid screen flow. | `## Levels and UX` and a JSON block |
| `prototype-plan` | Three milestones (paper prototype, grey-box, vertical slice) with exit criteria, playtest questions for every target kind, measurable success metrics, a solo-dev engine choice, and the milestone that retires each risk. | `## Prototype and playtest plan` and a JSON block |

### Review board

| Skill | Ask it | Backed by |
|---|---|---|
| `game-studio-cpo` | "Is this fun?" "Is this a good mechanic?" "Make this game better." The generalist entry point — routes across player experience, mechanics, balance, level design, narrative, game feel, production, AI, code and performance. | ~2,970 rules from 38 books |
| `game-systems-reviewer` | "Review this system." Economy, progression, combat, loot, crafting, inventory, quests, AI behavior, save/load, spawning — scored on 10 qualities. | ~1,814 rules |
| `game-balance-auditor` | "Is there a dominant strategy?" "Why does the leader always snowball?" Internal economies, feedback loops, difficulty curves, reward schedules, randomness vs skill. | ~330 rules |
| `game-code-reviewer` | "Is this architecture any good?" C#/Unity scripts, decoupling, state machines, event systems, ECS structure — scored on 9 qualities. | ~340 rules |
| `game-performance-auditor` | "Why is this slow?" "Will this hit 60fps?" CPU vs GPU bound, GC and allocations, pooling, draw calls, culling, LOD, memory layout, jobs. | ~390 rules |
| `game-qa-reviewer` | "Are we ready to ship?" Test plans, bug triage, severity bars, regression and soak testing, milestone gates, release and certification. | ~300 rules |

The board is engine-agnostic, with Unity-leaning specifics where it matters (the performance and
code skills assume C#/Unity idioms most readily).

### Build it in Godot

Thirteen skills from 527 agent sessions of one long Godot build, an incremental game with bosses,
upgrade trees, saves, art, audio and a store release; most apply to any Godot game. Each skill
gives the Godot method to measure something; the "Rules in" column names the review-board skill
that says whether the measurement is good. Take the tables these skills produce to that auditor,
and to `game-studio-cpo` when unsure. The detailed area document, with the suggested order and
every script, is [docs/areas/godot.md](docs/areas/godot.md).

| Skill | What it does | Rules in |
|---|---|---|
| `balance-model-data` | Keeps the game's numbers in a scripted model that checks design targets and exports the JSON Godot loads, with parity fixtures and FAIL-key baselines. | `game-balance-auditor` |
| `feature-seams-and-saves` | Adds variants, content and modes behind data seams and off-by-default flags, and keeps saves and settings safe across versions. | `game-systems-reviewer` (save/load, data-driven systems) |
| `headless-godot-runs` | Runs `godot -s` tools, probes and bots headless so they compile, end by themselves, report errors and never touch the player's save. | — (the method other skills run on) |
| `godot-testing` | A headless GDScript test loop: baseline, red-first test, focused filters, full suite, parse check and the finish gate of a unit. | `game-qa-reviewer` |
| `bot-balance-loop` | Tunes bosses and rules with scripted bots on fixed seeds, then compares measured tables against written target bands. | `game-balance-auditor` |
| `upgrade-tree-design` | Designs and prices an upgrade tree from bot policies, a diagnostic hub-and-spoke tree and human playtests; writes `balance.json`. | `game-balance-auditor` |
| `safe-refactor-and-review` | Proves a change keeps behaviour, finds every site of a rule, runs review waves and isolates render or feel bugs. | `game-code-reviewer` |
| `visual-verification` | Proves the game looks right with real window captures, pixel measures against a noise floor and layout tests. | `game-qa-reviewer` |
| `godot-perf` | Measures frame cost with interleaved A/B pairs, hitch maps and stress scenarios, and fixes it with batching and warm-up lists. | `game-performance-auditor` |
| `pixel-art-pipeline` | Makes palette-locked pixel art from image-model source art or from scripts, and checks size, palette, grid and outline. | `art-direction` (the style sheet the art is checked against) |
| `game-audio` | Makes seeded procedural sound, measures mix loudness from recordings and builds music sets that loop and hit targets. | `game-studio-cpo` (no specialist auditor) |
| `release-and-store` | Exports release and demo builds, adds gamepad support, records trailers and screenshots, and researches store rules. | `game-qa-reviewer` |
| `fleet-game-dev` | Habits for many agent sessions on one repo: worktrees, a slot runner, locks, handoffs, a steward who lands branches. The fleet protocol itself is in `agents:herdr-orchestrator` and `agents:herdr-worker`. | — (see "How it works with the other plugins") |

Upstream of the build, the design studio (`fun-targeting` through `prototype-plan`) decides what
the game is. The build kit needs Godot 4 (`godot-testing`'s runner needs 4.5 or newer for the
`Logger` class), Python 3 with the standard library only, and `ffmpeg` for `game-audio`'s
long-file loudness checks and `release-and-store`'s trailer contact sheets.

## Choose a workflow

Use `game:one-page-game-design` when you want to work through decisions with the user. It
selects light interactive HTML or a detailed standalone SVG according to design complexity. Both
modes include a 1-page PDF and a saved design record. A3 is the default for light mode. A2 or
larger is the default for heavy mode. These page sizes are defaults, not restrictions.

Use the headless pipeline when the inputs are ready and the work must run without questions. Its
one-page step is `game:one-page-game-design` in headless pipeline mode, which renders the
pipeline's JSON specification to a dated SVG. It does not replace the collaborative workflow.

## Pipeline

Run them in this order; each one reads the previous one's output:

```
fun-targeting → game-ideation → core-loop → design-diagrams → game-brief
  → one-page-game-design (headless) → art-direction
  → systems-economy → progression-content → level-ux → prototype-plan
```

The four deep-design skills each read the brief, the `fun-targeting` output and the `core-loop`
output, and write one section. Together they form a `Design.md`. Check one from this plugin's
directory with:

```bash
python3 scripts/check_deep_sections.py Design.md [--kinds Narrative,Expression]
```

It exits 0 when all four sections have their subsections, table columns and JSON keys (for example
`unserved` is empty, `levels` is 3, `milestones` is 3, every target kind has a playtest question),
and prints the reasons per section on stderr otherwise. Its tests run with
`python3 -m unittest discover -s scripts/tests`.

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
`fun-targeting`, `core-loop` and `game-brief` all check it, and the four deep-design skills tie every
system, session, level and playtest question to a target kind.

The deck is plain Markdown with a fixed format, so scripts can parse it. Run its format test with:

```bash
python3 -m unittest discover -s skills/fun-targeting/tests
```

## Content boundaries

`game-ideation` takes the caller's content boundaries as an input and rejects a concept that crosses
one before it scores anything. The plugin carries no personal rules. Its constraint-card decks
contain no violent, sexual or real-money-gambling entries.

## Critique

For an honest critique of a finished design, hand it to `game:game-studio-cpo`. The links go one
way: the studio and the Godot build kit call the review board, and the review board knows nothing
about either, so it works on designs and games made elsewhere and in any engine.

## What these write and where they reach

Installing this plugin wires no hooks, MCP servers or background processes. The review board and
the pipeline skills are markdown and write only the output named in their row, where you ask. The
Godot build kit writes nothing to the plugin folder; its scripts write only the paths you pass
them, in your Godot project.

- **`one-page-game-design`** — collaborative mode keeps the HTML or SVG, the PDF, a preview PNG
  and the living design record together in a project output directory. Its optional exporter,
  `scripts/export_pdf.mjs`, requires Node.js, Playwright or `playwright-core`, and Chromium or
  Chrome; it does not install them. Headless mode runs `render_one_page.py` and
  `validate_one_page.py` (Python 3, stdlib) and writes the dated SVG and `<slug>.json` spec.
- **`scripts/check_deep_sections.py`** reads a `Design.md` and prints findings; it writes nothing.
- **`scripts/run_evals.py`** runs `claude -p` once per eval, so it uses your Claude account, and
  writes transcripts to the output directory (default `eval-out`).
- **`headless-godot-runs`, `godot-testing`** run Godot headless with the tools and tests you give
  them; the method keeps every run away from the player's save. `godot-testing` has you copy
  `run_tests.gd` and `test_case.gd` into `res://tests/`.
- **`upgrade-tree-design`**'s `report.py` creates the `--out` directory and writes its report
  there.
- **`fleet-game-dev`**'s `slot-run.sh` keeps its slot pool in `/tmp/godot-slots` (set `SLOT_DIR`
  to move it); `with-lock.sh` takes `mkdir` locks in the lock directories you name.
- **`release-and-store`** downloads Godot export templates and their checksum file for your engine
  version and unzips them into the user template folder; it researches store rules on the web.
- **`pixel-art-pipeline`** uses an image model for source art when you have one in the loop; its
  scripts only read images.
- **`game-audio`** and **`release-and-store`** run `ffmpeg` where the skill says so.

## How it works with the other plugins

The marketplace has five plugins: `software`, `design`, `game`, `agents` and `work`. This one is
self-contained for design, review and the Godot build; it reaches out in one place.

- **`agents`** — `game:fleet-game-dev` is the Godot and game side of a worker fleet. The fleet CLI
  and the generic loops are `agents:herdr-orchestrator` and `agents:herdr-worker`, and
  `agents:herdr-setup` when the fleet tool fails to install or start.
- **`software`, `design`, `work`** — no skill here hands off to them, and none of theirs hands off
  here. For general code review, debugging or a game's web front end, those plugins apply as they
  would to any project.

## Moved in v3

The `game-design` and `godot-incremental` plugins were merged into this one on 2026-11-05. Every
skill kept its name except `one-page-design`, which became a mode. The plugin-level scripts of
`game-design` are now `plugins/game/scripts/`.

| Before | Now |
|---|---|
| `game-design:<skill>` (fun-targeting, game-ideation, core-loop, design-diagrams, game-brief, art-direction, systems-economy, progression-content, level-ux, prototype-plan, one-page-game-design) | `game:<skill>` |
| `game-design:one-page-design` | `game:one-page-game-design` (headless pipeline mode) |
| `godot-incremental:<skill>` (all thirteen build-kit skills) | `game:<skill>` |
| `plugins/game-design/scripts/` (`check_deep_sections.py`, `run_evals.py`, `tests/`) | `plugins/game/scripts/` |

The root [README](../../README.md#migrating-from-2x) has the full move table.

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

## Credits

The skills are first-party. The Godot build kit was mined from the marketplace owner's own agent
sessions; nothing in it is vendored. [NOTICE.md](NOTICE.md) records where the headless mode of
`one-page-game-design` came from. The review board's rules are distilled from 38
game-development books; each auditor's `refs/` traces a rule to its source book (`BOOK_CODES.md`
in the specialist auditors). The design studio draws on these
sources, cited, not copied:

- Stone Librande, "One-Page Designs", GDC 2010.
- Marc LeBlanc, "8 Kinds of Fun", 8kindsoffun.com.
- Robin Hunicke, Marc LeBlanc and Robert Zubek, "MDA: A Formal Approach to Game Design and Game
  Research", AAAI Workshop on Challenges in Game AI, 2004.
- Ernest Adams and Joris Dormans, *Game Mechanics: Advanced Game Design*, New Riders, 2012.
- Jesse Schell, *The Art of Game Design: A Book of Lenses*.
- Tracy Fullerton, *Game Design Workshop: A Playcentric Approach to Creating Innovative Games*.

## Invoking

Namespaced under the plugin: `game:game-studio-cpo`, `game:fun-targeting`, `game:game-brief`,
`game:one-page-game-design`, `game:godot-testing`, `game:bot-balance-loop`, and so on. When you are not sure which auditor you want, start at
`game-studio-cpo`.
