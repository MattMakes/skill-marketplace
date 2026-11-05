# Build it in Godot — area of the `game` plugin

Thirteen skills for building a Godot game step by step, with scripted bots,
headless tests, a scripted balance model and a worker fleet. They come from 527 agent sessions of
one long Godot build, an incremental game with bosses, upgrade trees, saves, art, audio and a
store release, but most of them apply to any Godot game. Each skill holds the habits that
survived that build, and most ship a small stdlib script or a template.

The skills here measure. The rules they measure against live in this plugin's review board
(see "How it works with the review board"). Start with the four foundation skills, then follow
the suggested order below. In 2.x this area was the `godot-incremental` plugin; the skills kept
their names and are now `game:<skill>`.

## Skills

### Foundation

| Skill | What it does |
|---|---|
| `balance-model-data` | Keeps the game's numbers in a scripted model that checks design targets and exports the JSON that Godot loads, with parity fixtures and FAIL-key baselines. |
| `feature-seams-and-saves` | Adds variants, content and modes behind data seams and off-by-default flags, and keeps saves and settings safe across versions. |
| `headless-godot-runs` | Runs `godot -s` tools, probes and bots headless so they compile, end by themselves, report errors and never touch the player's save. |
| `godot-testing` | A headless GDScript test loop: baseline, red-first test, focused filters, full suite, parse check and the finish gate of a unit. |

### Balance

| Skill | What it does |
|---|---|
| `bot-balance-loop` | Tunes bosses and rules with scripted bots on fixed seeds, then compares measured tables against written target bands. |
| `upgrade-tree-design` | Designs and prices an upgrade tree from bot policies, a diagnostic hub-and-spoke tree and human playtests. Writes `balance.json`. |

### Polish and proof

| Skill | What it does |
|---|---|
| `safe-refactor-and-review` | Proves that a change keeps behaviour, finds every site of a rule, runs review waves and isolates render or feel bugs. |
| `visual-verification` | Proves that the game looks right with real window captures, pixel measures against a noise floor and layout tests. |
| `godot-perf` | Measures frame cost with interleaved A/B pairs, hitch maps and stress scenarios, and fixes it with batching and warm-up lists. |
| `pixel-art-pipeline` | Makes palette-locked pixel art from image-model source art or from scripts, and checks size, palette, grid and outline. |
| `game-audio` | Makes seeded procedural sound, measures mix loudness from recordings and builds music sets that loop and hit targets. |

### Ship and fleet

| Skill | What it does |
|---|---|
| `release-and-store` | Exports release and demo builds, adds gamepad support, records trailers and screenshots, and researches store rules. |
| `fleet-game-dev` | Habits for many agent sessions on one repo: worktrees, slot runner, locks, handoffs, a steward who lands branches. |

## Suggested order

1. **Foundation.** Start with `balance-model-data`, `feature-seams-and-saves`, `headless-godot-runs`
   and `godot-testing`. They give the model, the seams, the safe tool runs and the test loop that
   every later skill relies on.
2. **Balance loop.** Use `bot-balance-loop` and `upgrade-tree-design` together. The bots measure,
   the model changes, and the tables show whether the change helped.
3. **Polish.** Use `visual-verification`, `godot-perf`, `pixel-art-pipeline` and `game-audio` as
   the game needs them. `safe-refactor-and-review` fits here and at any time that code moves.
4. **Ship.** Use `release-and-store` last. Run it again after gameplay changes, because trailers,
   screenshots and store text age.
5. **Fleet.** Use `fleet-game-dev` whenever many agent sessions share the repo. It applies from
   the first step.

## How it works with the review board

Each skill here gives the Godot method to measure something. The review board in this plugin holds
the rules that say whether the measurement is good. Take the tables these skills produce to the matching
auditor:

| Godot skill | Rules in |
|---|---|
| `godot-perf` | `game:game-performance-auditor` |
| `bot-balance-loop`, `upgrade-tree-design`, `balance-model-data` | `game:game-balance-auditor` |
| `feature-seams-and-saves` | `game:game-systems-reviewer` (save/load, data-driven systems) |
| `safe-refactor-and-review` | `game:game-code-reviewer` |
| `godot-testing`, `visual-verification`, `release-and-store` | `game:game-qa-reviewer` |
| `pixel-art-pipeline` | `game:art-direction` (the style sheet the art is checked against) |
| any of them, when unsure | `game:game-studio-cpo` |

Upstream of the build, the design studio (`game:fun-targeting` through
`game:prototype-plan`) decides what the game is.

`fleet-game-dev` is the Godot and game side of a fleet. The `agents` plugin's fleet skills give the
fleet CLI and the generic worker and orchestrator loops: `agents:herdr-worker`,
`agents:herdr-orchestrator`, and `agents:herdr-setup` when the fleet tool fails to install or
start.

## What these write and where they reach

Installing the plugin wires no hooks, MCP servers or background processes. The skills write
nothing to the plugin folder; scripts write only the paths you pass them, in your Godot project.

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

## Scripts

Each script sits in `skills/<skill>/scripts/`. Run a script from its skill folder, or give its full
path under `${CLAUDE_PLUGIN_ROOT}`. The Python scripts use the standard library only.

| Skill | Script | Usage |
|---|---|---|
| `balance-model-data` | `fail_keys.py` | `python3 fail_keys.py BEFORE.txt AFTER.txt [--pattern REGEX]` |
| `bot-balance-loop` | `fight_table.py` | `python3 -I fight_table.py LOG_OR_DIR [LOG_OR_DIR ...] [--targets targets.json]` |
| `upgrade-tree-design` | `make_policies.py` | `python3 make_policies.py --data <diag_tree.json> --out <dir> [--themes <themes.json>] [--random 5] [--specials early]` |
| `upgrade-tree-design` | `report.py` | `python3 report.py <trace file or folder>... --out <dir> [--json [<path>]] [--walls <wall.json>...]` |
| `feature-seams-and-saves` | `check_idempotent.py` | `python3 check_idempotent.py --file project.godot -- <tool command...>` |
| `headless-godot-runs` | `godot-run.sh` | `godot-run.sh <seconds> <log file> <command> [args...]` |
| `headless-godot-runs` | `godot-procs.sh` | `godot-procs.sh [path fragment]` |
| `headless-godot-runs` | `parse_check.gd` | `godot --headless --path <project> -s <absolute path>/parse_check.gd [-- --skip=captures,exports]` |
| `headless-godot-runs` | `tool_template.gd` | A template to copy: `godot --headless --path <project> -s <path to the copy> -- --limit=60` |
| `godot-testing` | `run_tests.gd`, `test_case.gd` | Copy both to `res://tests/`, then `godot --headless --path <project> -s res://tests/run_tests.gd [-- --filter=<text>]` |
| `godot-testing` | `repeat_run.sh` | `sh repeat_run.sh <project dir> <filter> [runs=20] [timeout seconds=300]` |
| `safe-refactor-and-review` | `first_diff.py` | `python3 -I first_diff.py BASE.log NEW.log [--tol 1e-6]` |
| `visual-verification` | `pixdiff.py` | `python3 -I pixdiff.py A.png B.png [--tol N] [--box X,Y,W,H] [--mask OUT.png]` |
| `visual-verification` | `text_fit.py` | `python3 -I text_fit.py LINES.json` |
| `godot-perf` | `ab_report.py` | `python3 ab_report.py FRAMES.csv [--a A] [--b B] [--skip N] [--threshold MS] [--max-load L]` |
| `pixel-art-pipeline` | `check_art.py` | `python3 -I check_art.py --palette palette.hex IMAGE.png [IMAGE.png ...]` |
| `pixel-art-pipeline` | `contrast_table.py` | `python3 -I contrast_table.py --fill HEX [--fill HEX ...] [--outline HEX]` |
| `game-audio` | `wav_report.py` | `python3 -I wav_report.py [--rate HZ] [--edge N] FILE.wav [FILE.wav ...]` |
| `release-and-store` | `pack_audit.py` | `python3 pack_audit.py --forbid forbid.txt [--require require.txt] FILE [FILE ...]` |
| `release-and-store` | `loop_seam.py` | `python3 loop_seam.py MUSIC.wav [--max-jump 0.1]` |
| `release-and-store` | `html_to_text.py` | `python3 html_to_text.py PAGE.html [PAGE.html ...] [--out DIR]` |
| `fleet-game-dev` | `slot-run.sh` | `slot-run.sh <role> <command> [args...]` |
| `fleet-game-dev` | `with-lock.sh` | `with-lock.sh <role> <lockdir>[,<lockdir>...] <command> [args...]` |
| `fleet-game-dev` | `rep.py` | `python3 -I rep.py <file> <pairs.json>` |

## Requirements

- Godot 4. `godot-testing`'s runner needs Godot 4.5 or newer, because it uses the `Logger` class.
- Python 3, standard library only.
- `ffmpeg`, where a skill says so: `game-audio` for long-file loudness checks and
  `release-and-store` for trailer contact sheets.
- A Godot project to work in.

## Credits

First-party. The skills were mined from the marketplace owner's own agent sessions; nothing is
vendored.

## Invoking

Skills are addressed as `game:<skill>`, for example `game:godot-testing` or
`game:bot-balance-loop`. Each skill triggers on its own description too.
