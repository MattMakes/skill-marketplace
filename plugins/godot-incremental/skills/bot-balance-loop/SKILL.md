---
name: bot-balance-loop
description: Tune bosses, encounters and game rules with scripted bots that play the real Godot game headless, then compare the measured tables against written target bands. The loop writes the bands first, builds a fight tool with several bot steerings (coached, tight, wide, wait, ram), runs fixed seeds with repeatable flags, builds a table of first-try wins, mean tries, resource left and fight length, names each odd result BOT or GAME, and changes 1 lever at a time. It also covers model start states, rule probes, a shared pipeline, wall triage by snapshot replay, a full-playthrough bot, coach text from winning fights and telegraph-to-hit tests. Use it whenever someone wants to balance or retune a boss, check a kill rate or a difficulty band, find out why players or bots stall at an encounter, measure a rule change with numbers, or run a bot playthrough of the whole game, even if nobody says "bot table" or "target band".
---

# Bot balance loop: bot fights, measure tables and wall diagnosis

A designer can not feel 20 seeds of a boss fight, and a balance model can not see what the real game does.
This skill makes scripted bots play the real encounter headless, over fixed seeds and several player types, and
prints a table that you compare with target bands written before the first run. You change 1 lever at a time and
measure again on the same seeds. It works because the table comes from the real game code, the bands are fixed
before the numbers exist, and every odd number is traced to a cause in the bot or in the game before any data moves.

Terms used in this skill:

- **Encounter**: 1 boss, mini boss or set fight that can end in a kill or a loss.
- **Steering**: 1 scripted bot line that stands for a player type (for example coached, tight, wide, wait, ram).
- **Band**: a target range for 1 measure of 1 encounter class (for example a first-try win rate of 60 to 80 %).
- **Meeting state**: the upgrade levels, resources and unlocks that a real player has when the encounter first rises.
- **Resource**: the thing whose loss ends a try (health, fuel, time, lives). Use your game's word.
- **Rise**: the moment an encounter appears in a run and the fight starts.
- **The import**: a headless editor import (`godot --headless --import` in Godot 4.3 and later, or `--editor --quit` before) that refreshes the class
  cache and resources after a merge.
- **Slot runner**: a small wrapper that caps how many game processes run at once and kills a process at a time limit.

## When to use

- A boss or encounter must land in a target band for first-try wins, tries to the first kill, resource left or length.
- A rule, cap or effect change needs before-and-after numbers from real play.
- A bot or a playtester stalls at 1 encounter, and you must decide if the bot, the economy or the encounter is at fault.
- You need a bot that plays the whole game from a fresh save and reports runs, tries and walls per chapter.
- Players report hits that the warning shape did not show.
- Players stall at a boss, and an in-game hint must show the move that really wins.

## When not to use

- The question is which upgrade order or tree shape is best. Use `upgrade-tree-design`.
- The question is a number inside the offline balance model only. Use `balance-model-data`.
- You need rendered frames to judge a look. Use `visual-verification`; a headless run draws nothing.
- The game has no bot that can play the real scene, and nobody will build one. Build the bot first (see the
  full-playthrough section), or use human playtests.

## Method

1. **Write the bands first.** Write 1 band per encounter class and measure before any run. For example: a mini wins
   60 to 80 % of first tries; a major needs 2 to 5 mean tries with at most 35 % first-try wins; plus a resource-left
   band and a length band. Read the fight: phases, verbs, telegraphs, the base class and its data row. Write a short
   summary of what a player must do. Check: the bands are in a file before the first table exists. Bands written
   after the numbers bend to fit them.
2. **Build the fight tool.** Copy the closest existing fight tool into your own work folder, or write one as a
   `SceneTree` script. Give the copy its own role name, save tag and log folder, so parallel copies never share a
   save. Add options for the start state, seed, steering, try count, variant and output folder. Load the meeting
   state (see "Start states from the model"). Print 1 JSON line per try. Check: the tool parses, and a dry call prints
   1 valid line.
3. **Add steerings for player types.** Add a coached line that follows what the game draws or tells the player, a
   tight line, a wide line, a passive wait line, and a ram line that tries the cheap or off-verb play. Make the bot
   call the game's own helpers (the coach target, a ring size, the run's real speed). Never copy a game constant into
   the tool, because the copy goes stale at the next data change. Check: grep the tool for numbers that also live in
   game data.
4. **Smoke each tool and steering.** Run 1 fight per steering with a trace flag. Check that the encounter rises, that
   every verb fires, and that each log line has every field. Grep the log for `SCRIPT ERROR` and parse errors. When a
   reference table exists, reproduce it exactly first. Check: 0 script errors, and the reference row matches.
5. **Run the "before" table.** Run each steering over a fixed seed list (5 to 20 seeds), up to K tries per seed. Run
   each fight as its own headless process with `--fixed-fps 60 --delta-smoothing disable`, through the slot runner,
   with a time alarm. Split long seed sets into chunks that end inside your tool time limit. Check: every log has the
   full row count; a cut run has fewer rows.
6. **Build the table with a script.** Read only the log lines, never memory. Show first-try wins, mean tries to the
   first kill, resource left at the kill, median length, end reasons and hits by source. Count a win after a refill
   or rescue item as a loss, because the band is about clean wins. `scripts/fight_table.py` does this for the log
   format it documents. Check: the seed and try counts in the table equal the counts you ran.
7. **Compare with the bands.** Pool the honest steerings (every steering except wait and ram) and compare the pool
   with the band. Run the coach check: the coached line wins at least as many first tries as the best other line,
   minus 1. Run the cheap check: the ram line wins fewer first tries than the coached line. Check: each band and
   check prints PASS or FAIL.
8. **Trace before you tune.** When a number looks wrong, trace 1 or 2 fights. Log the state every 0.25 s, the
   resource spent by source and the damage per window. Name the cause BOT or GAME. Fix a bot or tool fault before
   any data change. Check: the trace shows the cause in a log line, not in a guess.
9. **Tune 1 lever at a time.** Use a fixed order: local timing and geometry of the encounter, then per-phase caps,
   then a global health multiplier last. Local levers come first because they change 1 encounter only. Sweep on a
   scratch row first. Bracket the value: coarse on 5 seeds, then finer, then 20 seeds to confirm. Restore every probe
   edit after each run. Check: `git diff` on the data source is empty between sweeps.
10. **Confirm near a band edge.** When a result is within about 5 points of a band edge, run a second seed batch and
    pool both before you decide. Check: the decision cites both batches.
11. **Propose, then apply.** Send the before and after tables to the owner of the data. After approval, apply the
    row in the data source, add 1 test per behaviour change, and commit each row alone with its table. A row
    committed alone can be reviewed and reverted alone. Check: each commit has 1 row and 1 table.
12. **Re-measure after merges.** After each merge of the base branch, run the import, smoke each tool again, and
    re-measure the unchanged encounter as the new "before". After a global rule change, re-test only the encounters
    that take a large share (for example 25 % or more) of their damage from the changed source. Check: the new
    "before" table is dated after the merge.

## Start states from the model

A fight measured at a hand-set level map tells you nothing about a real player. Start every measure from a state a
real player can reach.

1. Read the pacing model's ladder and spend code. Reuse its functions; do not write a second copy of the price rule.
2. Run the model with a fixed buy rule, or replay the real buys of a full bot run. Record the run index of each
   first meeting.
3. Write a states script that prints 1 JSON state per case: variant, upgrade levels, passives, resources and meeting
   run. Import the model from a scratch copy, so the run writes no export.
4. Stop income to a variant when a newer variant unlocks. Spend left-over budget on nodes that are new in the tree.
   Order every set by a fixed list, so the output is the same on each run.
5. Check that every case gives the same meeting run as the landed model, and that derived stats match the game.
6. Point every fight tool at the states file. Make the states again after any change to the economy, the tree or a
   meeting time.
7. To find the first winning point, make 1 state per run index k after the meeting. Sweep k coarsely (2, 4, 8),
   then fill in between, with a threshold such as 6 of 10 wins.
8. When a later state wins less than an earlier one, bisect the middle states, then single buys. Find the 1 level
   that breaks the fight, and compare a win row with a loss row to explain it.
9. For a "what does this player need" question, load a copy of the player's save, never the real file. Spend the
   bank with a greedy cheapest-first buyer through the game's own buy API. Add +1, +2, +3 and +6 runs of model
   income, and report the first state that meets the stop rule.

Mark a state where the run ends before the encounter rises as "no fight", apart from a loss.

## Determinism for headless bots

A table is only as good as its repeat. Make 2 runs of 1 seed give 1 result before you trust any comparison.

1. Add `--fixed-fps 60` and `--delta-smoothing disable` to every headless Godot call of every bot tool. Godot smooths
   the frame delta from the wall clock even at a fixed frame rate. Without the second flag, 1 save can replay with
   about 10 points of spread.
2. Seed every random draw (weather, spawns, skill draws). Turn off wall-clock effects in the tool, for example a hit
   pause that restores the time scale on a real-time timer.
3. Save the tool's own state (try count, seeds, coach level, skill-draw seed) in a state file next to every snapshot.
   Without it, a replay plays try 1 again.
4. In Python generators, iterate in a fixed order. Never iterate a set for output.
5. Run 1 case 2 to 4 times and compare the outputs by hash. Replay 1 snapshot 3 or 4 times and record a key measure.
6. If runs still differ, record the spread with more repeats. Boss fights can still vary with both flags (one
   observed suspect is worker-thread timing under load). Use medians of 3 replays and win counts over 10 or more
   fights, and make no claim smaller than the spread.
7. A bot that never misses gives only 0 % or 100 %. Count distinct outcomes (60 seeds once gave about 6 distinct
   fights). Add 1 shared seeded "skill draw" that adds misses, and use the same draw in every tool.

## Rule and effect probes

Use a probe when the question is about 1 rule or effect, not 1 encounter: event counts, live enemies, hits by
source, nodes or draw calls.

1. Write a small `SceneTree` probe, or a wrapper around the autoplay or stress driver. Load game scripts at run time
   with `load()`, so the probe does not depend on the global class cache.
2. Run with a fixed seed and `--headless --fixed-fps 60` under an alarm. Put engine flags before the lone `--` and
   your own flags after it. A `--seed=` after `--` reaches only the script.
3. Count only what the question asks.
4. Build the rule so that a value of 0 or a missing data key gives the old game, and add a switch for the old rule.
   The same probe then measures "before" and "after".
5. Run N states x M seeds x 2 or more steerings, 1 process per run, through the slot runner. Put the log name in each
   row key, so before and after logs never mix.
6. Build a table (median, p95, max, per-state factor). Explain each outlier and split counts by source.
7. For a rule choice, run a control batch on today's rule, then 1 batch per candidate. Edit a temp copy and apply it
   only between batches, because each run loads the script fresh.
8. For a bug report, add a verdict line that separates designed states from real faults. Write the regression test
   before the fix.

Headless frame time is not render time. Count nodes and draw calls headless; time rendering in a window run.

## One shared measure pipeline

When many workers measure many cases (encounter x mode x variant), or many per-unit tools must measure 1 joined
branch, give them 1 pipeline so the tables compare.

1. Work from the integration branch. List each unit's fight tool and states script.
2. Build the states file from the model on that branch.
3. Write a generator that copies each tool and applies the shared patch (the shared skill draw, case seams, a guard
   that the right encounter rises) by exact text replacement. Each replacement asserts exactly 1 match.
4. Write 1 entry script: 1 encounter, 1 mode, 1 steering, a log tag, a seed list, 1 headless call, through the slot
   runner with `nice` and an alarm.
5. Reproduce 1 landed table with the pipeline before any fan-out. If it differs, find the cause first.
6. Run 1 smoke case per tool. Check exit code 0 and no script error lines.
7. Write 1 table script with the shared rules as columns (rescued kills as losses, coached against tight).
8. Fan out by variant. Each worker smokes first, runs steerings in seed chunks under the tool time limit, writes
   tables and notes in its own folder, and leaves game and design files clean.
9. Run a parity check on a few seeds: headless, then in a window at the real frame rate. Keep the headless table as
   the measure; the window run is a capture.
10. Commit the tables and send the FAIL rows to the data owner.

Grep each tool for the fields it logs before the patch names them.

## Wall triage

A wall is an encounter where a bot fails try after try. Decide whether the bot, the economy or the encounter is at
fault before you change data. Many walls turn out to be bot faults.

1. Read the end state of every lost try: encounter health, time left, damage dealt and end reason. If every try ends
   at the same high health, suspect the bot first.
2. Run a control on the same seeds as the earlier table. Stop if it does not match within noise.
3. Copy the wall save, and trace 1 or 2 lost fights from the copy. Log the target, phase, open flags, hits by source,
   resource per second, damage windows and distance at the rise.
4. Read the game rule that deals damage and compare it with what the bot does. Make the bot call the game's helper.
5. Check the usual bot faults: an arrive radius smaller than the turning circle, the staging distance and lead time
   before the rise, no dodge of attack areas, and wait rules that lock a chapter.
6. Name each cause BOT or GAME. Fix a BOT cause in the tool only. Re-run into a new log folder; keep the old folder
   as the "before".
7. Isolate a cause with test-only switches that each remove 1 factor (a resource floor, a hazard hold, a perfect
   cut), or turn off 1 bot behaviour. Run the same seeds per switch, 1 switch at a time.
8. Split a logged value into its causes, for example contact hits against bullet hits. Add small counters that turn
   a question into 1 number per fight.
9. To find which single upgrade passes a wall, replay the try from its snapshot as a baseline. The baseline must
   equal the original try. Then replay with +1 level on each upgrade, and rank the probes.
10. Rebuild the encounter states from the bot's own purchase log, and probe levers on those reachable states. Patch
    probe rows locally and restore them before any commit.
11. Report the cause with numbers and 1 fix per factor (F1, F2, ...), measured alone and as a set. If a new player
    can make the bot's mistake, also report what the game shows to teach the move.

## Full playthrough bot

A full-run bot answers "does the whole game play from a fresh save to the end, and where does a strong player
stall?" before a human sees it.

1. Read the existing autoplay and fight bot code and reuse their steering. Run the import in a new worktree first; a
   worktree with no class cache can hang the tool at the autoload stage.
2. Drive the real flow (title, run, results, shop, next run) with real input actions, not by setting positions. List
   each place where the tool must call an API in place of an input. Never force an encounter, a level or a resource.
3. Write an explicit strong-player policy: route, encounter line, shop rule, next-level pick and a farm rule (for
   example farm a beaten level after a bad boss try). Turn on helpers that script mode turns off, such as a coach.
4. Add options: fresh or mid-game start, a seed, captures, and a measure mode with no captures. Captures stall
   frames and distort frame times.
5. Log 1 JSON line per run: level, run time, end reason, pay per currency, buys, encounter result and errors. Log
   every wait and fight end with its cause.
6. Save a snapshot plus the tool state at each chapter start and before each encounter try. Add a resume option that
   only the first segment reads, and stop flags (stop at encounter X after N tries).
7. Split play into segments under about 9 minutes with a driver that switches by exit code. A segment restart acts
   as a game restart, so per-process statics reset.
8. Do a short windowed check (3 runs and 1 shop visit) and a fast headless dry run to the end before the official run.
9. Watch the official run with a filtered log monitor that reports only chapter ends, softlocks, script errors,
   refused buys and driver failures. Detect a stuck state and report it; do not hang.
10. At a wall (tries over the limit, power flat), stop and report the tries, the power and the unspent bank. Then use
    "Wall triage". Runs after a bot wall are over-levelled and are not balance evidence.
11. Write chapter-end tables (runs, minutes, tries per encounter, power at the meeting) and a findings file. Label
    each item GAMEPLAY, BALANCE, PERF, BUG or POLISH, with evidence, 2 or 3 options and a recommendation. Do not fix
    the items in the same unit.

## Coach text from a winning bot

When players stall at a boss, show the move that wins, taken from a winning fight and not from a guess.

1. Load a read-only copy of the stuck player's save, or build a state where the coached and tight lines both win.
   Prove with the real bot that the boss can be won at that state.
2. Run 1 verbose fight per winning line. Read when and where damage lands. Compare the traces before you name a line
   the winner; 2 lines can give the same rows for an unrelated reason.
3. Read the coach level rules first. A coach that a past kill turned off can not help this player.
4. Write the move per phase as a data row: at most 4 steps, at most 8 words each, each step a thing the winning bot
   did, with the cue that starts each step (path size, timing cue, dodge line).
5. Propose the row and wait for approval. No encounter numbers change.
6. Show the row after N losses (for example 2) to the same boss. Test that it shows at the right loss count, only for
   that boss, and that the text fits its card. Capture the card in a winning fight.
7. Run the bot with the hint on. It must win at least as often as without.

A coach can not teach a fight that the resource always ends. Measure first.

## Telegraph and hit parity

A telegraph is the warning shape an attack draws before it hits. A hit outside the telegraph feels unfair, and a bot
table can not see it.

1. Read the shared encounter contract and the base class API. Use only its protected functions.
2. List each attack and the telegraph call it makes before the hit.
3. Write 1 test per attack effect: it fires, applies the effect and ends, plus negative cases.
4. Write a test per attack that starts it, records the telegraph, then records the hit. Assert that the shape kind
   (ring, arc, lane), the centre and the size agree. See it fail for the reported attacks first.
5. Add a test that peak live bullets stay under the encounter budget. Count only the encounter's own bullets.
6. Add a fairness test: the expected player state can leave the telegraph area before the wind-up ends.
7. Fix the telegraph or the hit so that both read the same data value.
8. Run the encounter tests and every other test that uses those encounters. Search all enemy scripts for telegraph
   calls, and report mismatches outside your scope.
9. Capture each telegraph at the target resolution and judge it at 1x. Fix a telegraph that warns on the safe lane or
   hides the player.

## Pitfalls

These are the faults that cost the most. Read `references/pitfalls.md` for the full table (about 70 rows) before a
long batch or a wall triage.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Replays of 1 save differ by about 10 points | Frame delta smoothing from the wall clock | Add `--delta-smoothing disable` next to `--fixed-fps 60`; restart the work from before the missing flag |
| No encounter rises in any run for a whole day | A tool script named a `class_name` at compile time | Load scripts by path at run time; grep logs for `SCRIPT ERROR`; a smoke must prove key events |
| A wall of hundreds of runs | A bot fault, for example straight lines where the encounter needs curves | Trace 1 fight before you call it balance |
| Rates are only 0 % or 100 % | A bot that never misses | Count distinct outcomes; add 1 shared seeded skill draw |
| The coached line loses | The bot overshot the guide, or followed another shape than the game drew | Read the coach from game code; add a "follow exactly" steering |
| Parallel runs corrupt each other | Tool copies share 1 save role | 1 save tag per copy and per run |
| A batch mixes 2 rules | An edit to the tool, scene or data during the batch | Stop, edit, restart; merge the base only between batches |
| Runs use the wrong steering or an empty argument | zsh does not split an unquoted variable into words | Use explicit arguments, arrays or `bash`; print the knob values in each row |
| A lever does nothing | A derived value moves with it, or a per-window cap binds the result | Read how the data derives values and which rule caps the window first |
| The model and the game disagree | The model misses a game rule | The game table decides; report the gap to the model owner |
| Losses are not resource losses | The run timer or a fight cap ended the try | Log the end reason in each row; compute the run end before the batch |
| Old tables mislead | The economy or a rule changed after the measure | Make the meeting states again and re-measure |

## Artifacts to build

- **Fight tool**: a `SceneTree` script per encounter type with options for start state, seed, steering, tries,
  variant, output folder and trace; 1 JSON line per try.
- **Steering set**: coached, tight, wide, wait and ram lines in the tool, each calling game helpers, not copies.
- **Band file**: 1 row per encounter class with ranges for first-try rate, mean tries, resource left and length.
- **Run script**: 1 encounter, 1 steering, 1 seed list, 1 headless call with the determinism flags, through the slot
  runner with an alarm.
- **Slot runner**: a wrapper that caps parallel game processes and kills a process at a time limit.
- **Table script**: reads JSON-lines logs and prints the table, the pooled honest row and PASS or FAIL per band and
  check. `scripts/fight_table.py` is a start.
- **States script**: prints 1 JSON meeting state per case from the balance model, in a fixed order.
- **Shared skill draw**: 1 seeded module that adds misses, used by every tool.
- **Tool generator**: copies peer tools and applies shared patches by asserted exact-match replacement.
- **Row setter**: edits 1 data row by unique text, asserts 1 match, re-exports, and restores on exit with a `trap`.
- **Wall finder**: replays a snapshot as a baseline, then with +1 level per upgrade, and ranks the probes.
- **Full-run bot and segment driver**: real-input play with snapshots, a state file, resume and stop flags.
- **Findings format**: kind (GAMEPLAY, BALANCE, PERF, BUG, POLISH), evidence, 2 or 3 options, a recommendation.
- **Proposal file**: before and after tables per row, the lever, the seeds and the log tags.
- **Telegraph parity test**: per attack, record telegraph and hit, and assert kind, centre and size agree.

## Related skills

- `upgrade-tree-design`: chooses the tree, the buy policies and the fun bands; this skill measures fights at a state.
- `balance-model-data`: owns the model, the row edit, the export and model-to-game parity; this skill gives it game
  tables.
- `headless-godot-runs`: owns the `-s` tool rules, the flags, process traces and run cleanup.
- `godot-testing`: owns the test loop and the proof that a new test can fail.
- `safe-refactor-and-review`: proves that a refactor keeps behaviour with a deterministic trace.
- `visual-verification`: owns window captures of telegraphs, coach cards and phases.
- `fleet-game-dev`: owns the proposal and approval protocol, long waits, the slot runner policy and landing.

## Bundled files

- `scripts/fight_table.py`: the table and band checker for JSON-lines fight logs (standard library only). Run
  `python3 -I scripts/fight_table.py <logs> --targets bands.json`. The bands file maps each encounter id to
  the bands of its class. The docstring documents the log line and the bands format. It exits 1 when a band or check fails.
- `references/pitfalls.md`: the full pitfall table.
