# godot-incremental

Build a Godot game step by step, with scripted bots, headless tests, a scripted balance model and a
worker fleet. The 13 skills come from 527 agent sessions of one long Godot build, an incremental
game with bosses, upgrade trees, saves, art, audio and a store release. Each skill holds the habits
that survived that build, and most ship a small stdlib script or a template.

```bash
claude plugin install godot-incremental@skill-marketplace
```

## Skills

| Skill | What it does |
|---|---|
| `balance-model-data` | Keeps the game's numbers in a scripted model that checks design targets and exports the JSON that Godot loads, with parity fixtures and FAIL-key baselines. |
| `feature-seams-and-saves` | Adds variants, content and modes behind data seams and off-by-default flags, and keeps saves and settings safe across versions. |
| `headless-godot-runs` | Runs `godot -s` tools, probes and bots headless so they compile, end by themselves, report errors and never touch the player's save. |
| `godot-testing` | A headless GDScript test loop: baseline, red-first test, focused filters, full suite, parse check and the finish gate of a unit. |
| `bot-balance-loop` | Tunes bosses and rules with scripted bots on fixed seeds, then compares measured tables against written target bands. |
| `upgrade-tree-design` | Designs and prices an upgrade tree from bot policies, a diagnostic hub-and-spoke tree and human playtests. Writes `balance.json`. |
| `safe-refactor-and-review` | Proves that a change keeps behaviour, finds every site of a rule, runs review waves and isolates render or feel bugs. |
| `visual-verification` | Proves that the game looks right with real window captures, pixel measures against a noise floor and layout tests. |
| `godot-perf` | Measures frame cost with interleaved A/B pairs, hitch maps and stress scenarios, and fixes it with batching and warm-up lists. |
| `pixel-art-pipeline` | Makes palette-locked pixel art from image-model source art or from scripts, and checks size, palette, grid and outline. |
| `game-audio` | Makes seeded procedural sound, measures mix loudness from recordings and builds music sets that loop and hit targets. |
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

## Invoke

Skills are addressed as `godot-incremental:<skill>`, for example `godot-incremental:godot-testing`
or `godot-incremental:bot-balance-loop`. Each skill triggers on its own description too.

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
- A Godot project to work in. The skills write nothing to the plugin folder.
