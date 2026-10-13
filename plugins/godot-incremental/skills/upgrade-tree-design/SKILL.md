---
name: upgrade-tree-design
description: Design, price and judge an incremental game's upgrade tree, skill tree or meta-progression from bot playtests and human playtests, not from guesses. It swaps the shipped tree for a dev-only hub-and-spoke diagnostic tree over every real upgradeable stat, lets bots with different buy policies play the real game headless, calibrates one price curve per chapter, measures each upgrade's worth by leave-one-out, and writes balance.json, the data each real tree is built from. It also covers strategy advocates, fun-band sweeps, a measured buy order, audits for dead or unfelt nodes, spend gates, upgrade cues, human playtests and design research. Use it whenever someone wants to balance, tune, price or playtest a tech tree, upgrade path, shop or currency economy, or asks which upgrades matter, what the best buy order is, why players stall at a boss, why they have currency but nothing to buy, or whether an upgrade is felt, even if nobody says "diagnostic tree".
---

# Upgrade tree design: measure the tree with bots, judge it with people

An upgrade tree that is priced by hand drifts into walls, dead nodes and one dominant path, and nobody can say which
upgrade matters. This method replaces the shipped tree, in a dev-only mode, with the simplest tree that still touches
every real upgrade, and lets bots with different priorities play the real game. A report turns their traces into
`balance.json`, and the designer builds each real tree from it, then checks the result with human playtests. It works
because the diagnostic tree removes every choice except "which stat next", so the time a bot loses without a stat is
that stat's worth.

Terms: the **diag tree** (diagnostic tree) is the dev-only tree, and **diag mode** is the game running with it.
A **chapter** is a section of the game that ends with a major boss (a level, zone, biome or act). A **class** is
any character, vehicle or loadout with its own upgrades. A **policy** is a bot's buy rule.

The shape of the diagnostic tree is deliberate:

- **Hub and spokes, 1 layer.** Each spoke is 1 upgradeable stat. There are no gates, so the only choice is the stat.
- **Caps that grow.** Every spoke caps at a step (for example 5). When a share of the spokes (for example 80 %) is at
  the cap, every cap rises by the step. The cap forces breadth. The slack lets a bot skip 1 spoke and still progress,
  which makes leave-one-out measurement possible.
- **1 pooled currency, 1 price curve.** Every currency counts toward 1 price, and the Nth level costs the same on any
  spoke. So the data compares the value of stats, not their prices. A buy spends the rarest currency first, and the
  trace records every currency, so the report shows when each rare currency really arrives.

## When to use

- A new or reworked upgrade tree, tech tree or meta-progression needs prices and an order from data.
- Players stall at a boss, finish a chapter too fast, or report "currency but nothing to buy".
- You must pick global tuning (price base, caps, curves, spikes) against a stated fun target.
- You must learn which upgrades are dead, unfelt, or out of step with their text.
- Humans must play a build to answer design questions, and their play must be compared with the bots.

## When not to use

- The game has no bot that plays whole runs headless. Build that first (see `bot-balance-loop`).
- The question is one fight's tuning at a fixed upgrade state. Use `bot-balance-loop`.
- The numbers come from a scripted balance model and you only need the export and parity. Use `balance-model-data`.
- The change adds or removes a mechanic. That is the owner's decision (see the last section), not a tuning task.

## Prerequisites

Check each one first. Report a missing one as a blocker.

1. **A stat pipeline.** Upgrades are data rows that add `value x level` into named stats, and 1 function builds a
   run's stats from the owned levels. The diagnostic tree hooks in there.
2. **A bot that plays the real game.** It plays whole runs headless through the real scenes, reaches the shop, and
   takes flags (a policy, an out folder, a seed).
3. **Determinism.** The same save and seed give the same run. Prove it: replay 1 save 3 times. In Godot, add
   `--delta-smoothing disable` beside `--fixed-fps 60`; else the frame delta follows the wall clock.
4. **Events.** The game emits run start, run end with the haul, boss appear, kill and leave, and class unlock.
5. **A separate save.** The dev mode never writes the player's save.

## Method

Work in phases. Each phase ends with a check. The game side, the bot and the report can run in parallel once the
contract exists.

1. **Survey.** Read the stat pipeline, the tree data, the currencies, the unlock order and the bot. Record each
   stat's shipped per-level step, every game cap on a derived stat, the income per run of each currency per chapter,
   and the bot's wall seconds per run. Check: a design file holds these facts with their sources.
2. **Ask the owner the key decisions.** Offer a recommendation for each. The decisions set what the data means, so do
   not build before the answers.
   - The pool rule: 1:1 with the rarest spent first (default), per-chapter rates, or a rate table.
   - The hub scope: 1 hub shared by all classes, or 1 hub per class.
   - The price rule: 1 curve on the total level count, with a stage multiplier per unlocked class. Without it, the
     income jump at an unlock sells a hundred levels in 1 shop.
   - Specials: a 1-level unique verb is a special spoke outside the cap share; a boss reward is free at the kill.
3. **Write the contract.** Fill in `references/contract-template.md`: the data file, the runtime API, the versioned
   trace schema (`diag-trace/1`), the wall probe schema (`wall-probe/1`) and the policy file. Check: the game side,
   the bot and the report each name only fields the contract defines.
4. **Build the game side in a dev-only mode.** A deterministic generator writes the hub from the shipped tree data
   and keeps the `price` block. A runtime holds levels, the tier rule, closed spokes, the price, rarest-first spend,
   its own save and the trace writer. Add only 2 hooks to shared files: the stat pipeline reads diag levels in diag
   mode, and the shipped shop refuses buys in diag mode. Check: a test proves that diag mode off gives the shipped
   stats exactly, computed from live data, not from pinned numbers.
5. **Give the bot a policy flag and a sweep driver.** In the shop the bot buys by the policy until nothing is
   buyable. The driver plays N policies at once, each with its own save slot, out folder and trace. Only the shop
   changes; the bot keeps its own route and fight logic. Check: a smoke run of 2 policies for about 40 runs shows a
   boss rise and a boss die, and the logs have 0 script errors. A complete trace alone proves nothing.
6. **Calibrate the price per chapter.** Fit 1 value per chapter in chapter order: `base` from the first chapter, then
   each stage multiplier from the chapter where that class arrives. Each try resumes from the chapter-start snapshot
   and stops when the next chapter opens. Run 5 tries at once (for example the value x 1/9, 1/3, 1, 3, 9), then 4
   inside the bracket. Cut a try at a run or time cap, and mark it invalid on any script error line. Check: each
   chapter is OK (within about 15 % of its target minutes), FAST or WALL. WALL means a fight gates the pace, which is
   a finding for the designer, not a price to force. Sweep the growth factor 1 value at a time after that.
7. **Run the sweep.** Size it from the smoke run: playthroughs x wall hours / parallel slots. The default set is a
   balanced baseline (all weights 1) on 3 seeds, 4 or 5 themes from the game's verbs, 1 leave-one-out policy per
   shared stat spoke, and 5 seeded random policies. Generate the set with `scripts/make_policies.py`. Check: every
   trace exists, every log has 0 script errors, and the baseline seed spread is known.
8. **Probe each wall.** A wall is a boss with 3 or more failed tries. Replay that try from its snapshot once per spoke
   with +1 and +3 levels (a probe, not a buy). Check: the baseline replay equals the original try. The spokes with
   the biggest health drop are the spike candidates for that point of the real tree.
9. **Test a weaker player.** Run the top 3 policies with a seeded skill draw that misses fight verbs. A tree that
   works only for a perfect bot fails real players.
10. **Report.** Run `scripts/report.py` on the sweep root with `--json`, the wall files and the targets. It writes
    `report.md`, `report.html` and `balance.json` (schema in `references/balance-json.md`). If you rebuild the report
    for your own trace format, build it from small fixture traces with unit tests first, then run it on 1 real trace.
    Check: the report has no WARNING about traces with different stop rules, or you report 1 sweep at a time.
11. **Read the numbers as a designer.** Pace: a SLOW chapter with a WALL mark needs a fight answer; a SLOW chapter
    without one needs cheaper early levels or more income. Spoke worth: the top leave-one-out spokes go in the first
    ring; a spoke with lost progress is required and must be obvious; a spoke worth about 0 is a cut or merge
    candidate. Order per class: use it for the ring order. Freedom: many near-optimal policies mean real choice; 1
    dominant policy is a dominant strategy to guide or break. Spikes: put a big power jump where a wall breaks.
    Rare currencies: put rare-currency gates where the bank can pay them. Check: each reading is a `notes` line.
12. **Cull and re-fit.** Cull the hub to the unique upgrade types, so the real tree has no near-duplicates. Re-fit
    the price for the culled tree, because a smaller tree at the old price is far too easy. Check: the culled tree
    passes the chapter targets again.
13. **Propose the real trees.** Write 1 short proposal per class with options. Any change to the shipped tree or to
    gameplay is the owner's decision; do not apply it yourself.

## Strategy advocates and policy sweeps

Use this when you must learn which play style or buy order is best, with each style pushed to its best. A fixed
balanced bot buys in data order, so its order is an input, not a result; advocates make the order a result.

1. Run a plain baseline policy first. Every strategy is compared with it.
2. Write 1 shared advocate plan and 1 shared measure tool (a playstyle report: chapter minutes, failed boss tries,
   tries at the hardest boss, stall runs). Then every advocate uses the same definitions.
3. Make the full-run bot read a policy file (weights per spoke, order kind, special buy timing). Prove that the bot
   without the policy flag gives the same output as before.
4. Define each strategy as weights or rules (for example damage first, economy first, generalist, survivor,
   measured value). Give each strategy 1 advocate (a person or an agent session) in its own working copy.
5. Each advocate writes variants with a small maker script and plays each on the same 3 seeds. Change 1 idea per
   variant. A gain inside the seed spread is no gain. Stop after 2 variants in a row that do not beat the best.
6. Play the best variant once at a weaker skill setting.
7. Each advocate writes a case file: the variants table, the best policy, the weaker-skill result, a proposed
   first-N-buys order, risks and dead ends. Verify each headline from the traces. Play each proposed order as an
   order file on 3 seeds.
8. Round 2: each advocate reads every other case and answers or concedes. A neutral writer then compares the cases,
   votes on the first nodes of each path, and lists the open questions for the owner.
9. Copy each best policy into a panel folder. The panel feeds the fun-band config sweep below.

## Fun-band config sweep

Use this when global tuning (price base, caps, curves, capstone spikes, stage multipliers) must be chosen by a stated
fun target with a panel of bot player types.

1. Move the tuning knobs into a small config file that the dev mode reads. Add a new knob to the tree code with tests
   first. Update pinned tests in the same change as the generator.
2. Write the fun band with the owner: tries per encounter kind and minutes per chapter, for example "not won on the
   first try, not lost 10 times". The score is the share of (player type, encounter) pairs in band. Add worst-case
   measures: the worst pair, pairs over 10 tries, first-try wins.
3. Write 1 config file per candidate. Round A plays all configs x all panel types x 3 seeds, in the background at low
   priority.
4. Watch progress by the count of finished result files, not by log lines. Grep every log for script errors; a run
   with an error is invalid.
5. Rank configs by the score. Leave out an encounter that every config passes on try 1, with the owner's approval.
6. Run more rounds that move 1 knob at a time. When a target changes, rescore the saved results; do not replay.
7. Play the 2 or 3 finalists and their base on 6 seeds. Show each pair as mean (min to max).
8. Recompute each claim in your notes from the result data before you report. Write a recommendation; the owner
   picks. Set the chosen values and run the full test suite.

A difference of 2 pairs in 30 is inside seed noise. A chapter that every config finishes too fast is a design
finding, not a tuning fault. If price alone cannot set a chapter's pace, stop the price grid and report it.

## Measured-value buy order

Use this when you want the game itself, not a person or a weight list, to say which upgrade is worth most at each
shop.

1. Add an off-by-default bot flag that saves a snapshot at each shop, and an "order" buy mode.
2. Write a driver whose scoring is pure functions with unit tests.
3. Prove replay quality: replay 1 snapshot and compare it with the real next step. If replays are exact, use 1
   replay per candidate. Else use R replays and the mean.
4. At each shop, replay the next run (or the next boss try) once per candidate with +1 free level of it.
5. Score the gain (for example boss health removed plus a haul ratio). Buy by the scores through the game's own shop.
6. Record the position of each upgrade's levels in the buy order. Play 3 seeds and compare with the baseline.
7. Freeze the mean buy positions of 3 seeds as a fixed order policy. Play it on 3 seeds to compare.

Read saturated rows as ties: when 1 level kills the boss, every candidate scores the same. Buys can come in blocks as
a tool artifact; say so when you read the order. Plan the wall time for the real slot queue, not for 1 free core.

## Upgrade wing audit

Use this to judge a group (a wing) of nodes: what each node really changes, which are dead, where cost walls are, and
whether the player can feel each node.

1. List the nodes with their stat and value from the tree source.
2. Search the game code for each stat key, including keys built at run time from a prefix. Record each reader. A
   stat with no reader is a dead node. Test your search on a known hit before you trust an empty result.
3. Flag a node as dead when its stat is already at a game cap at the run where the node opens.
4. From the pacing model or traces, list the run where each node opens and compare it with the boss runs. Compute
   the cost of each level in runs of income. A level that costs more than about 3 runs is a wall.
5. Agree a lean (wing-first) build with the design lead. Run it and the plain build at the same encounter states,
   each with its own save slot. Compare tries to kill and resources left.
6. Take 2 windowed runs at the same seed, with the wing at level 0 and at the max, and compare captures at the same
   time stamp. A still image does not show motion; capture a spin or a pulse as a clip.
7. Write 1 finding per node with no visible or felt effect. Propose cues (an arrow, a meter, a results line) as
   feedback findings, not number changes.
8. When a player says an upgrade does not do what its text says, find the code path. Make the effect match the text,
   and add a test from an existing fixture. Then search the bot and the balance tools that read the same stat.

## Economy spend gates

Use this when players report currency with nothing to buy, or a new node that maxes out at once.

1. Copy the player's save to a temp folder. Read it only.
2. Emulate the game's own unlock and price functions for every node at that save state.
3. List the nodes the player cannot open and the gate that blocks each one.
4. Write testable targets, for example:
   - T1: every currency always has something to buy.
   - T2: no node is bought past 2 levels in the run it opens.
   - T3: the bank after the shop is at most 2 runs of income.
5. Add partial gates (a parent level, not the parent maximum) in code first. With no new data key, the game plays as
   before, so the code change is safe to land alone.
6. Fit the data to T1 to T3 in the balance model and export it.
7. Measure at the player's exact state that the blocked fight can be won after the fix.
8. Audit model rows against tree rows. A row that is in no tree still counts in the model and skews it.

Put gate nodes on the main currency. A gate in a rare currency can hold back a whole branch of another currency.

## Stat-keyed upgrade feedback

Use this when each upgrade must show on screen and in sound, and later classes must reuse the cues.

1. Map each tree node to the stat it feeds.
2. Write 1 table: stat key (or unique node id) to cue. Do not key cues by class; a class-keyed cue cannot be reused.
3. Give each class model 1 method that returns its anchor points.
4. Make each cue scale from level 1 to the max level.
5. Measure the cost of all cues at the max level in 1 frame against the frame budget. Add the cue materials to the
   shader warm-up, so the first cue does not hitch.
6. Capture each cue at level 1 and at the max level. Use a clip for a cue that needs motion to read.

## Human playtest loop

Use this when people must play a build to answer design questions, and their play must be compared with the bots.

1. Map each playtest question to 1 observable and 1 pass mark. A question that telemetry cannot prove becomes an
   observer check with a Y/N column per tester on the same sheet.
2. Write a telemetry logger that writes 1 JSON line per game event and fails safe. It is off in the test runner.
   Write its tests first: disabled writes no file; each event writes 1 line.
3. Mark each trace as human or bot. Else the report shows bot fields (skill, seed) for a person.
4. Write a report script with tests. It answers each question per tester, not per session, and prints the observer
   checklist. Use the same field names in the protocol document.
5. Before the full loop exists, write an analytical 1-run model from the landed formulas, list its assumptions, and
   compare it with the design target. It answers in seconds where a full simulation runs for minutes.
6. Add a play command that starts the dev mode on its own save and trace path, with a "new" option that moves the old
   save aside. On quit it copies the trace to a dated folder and prints the player's numbers beside the bot baseline.
7. Add a build command that exports each desktop platform with a tester README that says where the trace is.
8. Write the protocol: no minimum play time, allowed and forbidden observer lines, interview questions about this
   build only, the report command, the pass marks, how to collect saves and logs per platform, a 1-page observer
   sheet. Record the run at which a tester stops and the last new find.
9. Before each session, measure the test machine's p99 frame time.
10. Before release to testers, run a readiness gate: import, full suite, report tests, the balance simulator, an
    export of every platform with sizes, and a headless launch of each export. Give a verdict with blocking items.
    Run it again if the branch moves.
11. For a recorded session, extract frames every few seconds, tile them into contact sheets, read them, run the
    report on the log, and compare with the model on the same inputs.

## Design research

Use this when a design question or a large redesign request needs evidence and options before the owner decides.

1. Frame the question. Read the current design, data and base stats; map the relevant code with read-only searches.
2. Check a redesign request against the stated fun targets and earlier owner decisions. Name each conflict or
   reversal with its date, and offer fixes.
3. Search about 10 or more shipped games, 1 search per game or concept, in parallel. Fetch each page that holds a
   claim and quote only what it says. A claim from a search snippet only is not verified.
4. Name each pattern and apply it to the game's own classes and levels. Mark sourced facts apart from inference, and
   mark forums and wikis as opinion.
5. For a fight that numbers cannot fix, read its measured tables and its script. Write 1 measured cause per fight,
   then 1 or more worked mechanic options per cause. "None" is not an option.
6. Write a research note with patterns, sources and fit. Add 1 numbered decision item with options and a
   recommendation (format in the next section). Keep the plan in the repo, not in a private agent folder.

## Gameplay changes are the owner's call

Number tuning, behaviour-neutral bug fixes and perf fixes can go ahead. A new or removed mechanic, verb, behaviour or
cue is a proposal, not a build. A help or coach text that changes how players fight counts as gameplay.

- Write each proposal as a numbered item in 1 decision file: the facts, the evidence (tables, traces, captures), 2 to
  4 options, and 1 recommendation.
- Look for an option that is a new number on an existing mechanic. Prefer the local lever (the entity's own data row)
  over a new global mechanic; a global mechanic for 1 boss is an over-reaction.
- Record the answer under the item in the owner's exact words. Only the owner's own words are direction.

The ask-and-wait protocol for a team of agents is in `fleet-game-dev`.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Every theme bought the same first spokes | A `level / weight` score ties at level 0 | Score `(level + 1) / weight`; break a tie by the higher weight |
| No buy for hundreds of runs | Weight 0 on more than about 20 % of spokes; the cap share can never be met | Keep weights above 0, or report the deadlock as a finding of the cap rule |
| A spoke takes levels with no effect | A game cap holds the derived stat | Close a spoke when 1 more level changes no derived stat; count it as at the cap; log the closing level |
| About 100 levels sold in 1 shop | 1 price curve plus an income jump at a class unlock | A stage multiplier per unlocked class, fitted per chapter |
| A clean trace, but no boss ever rose | A tool script failed to compile; the trace keys still filled | The smoke check proves key events; a `SCRIPT ERROR` line makes a try invalid |
| Every calibration try was invalid | A tool script did not compile | The same marker; fix the compile before more tries |
| A chapter ends too fast at every price | A metric is missing (for example shop spend) | Stop and add the metric before you go on |
| Replays of 1 snapshot drift | Frame delta smoothing, or bot state not in the snapshot | `--delta-smoothing disable`; save the bot's own state (try count, skill seed) with the snapshot |
| Boss fights still vary after both fixes | Cause not confirmed; threads timed by machine load are a suspect | 3 seeds per policy, 3 replays per probe with the median, no claim smaller than the seed spread |
| A finalist mean mixed 2 data versions | A peer change regenerated the data file between rounds | Store the data file each round played; compare it; score old and new seeds apart |
| A fast policy looked best | Its trace had a run cap, so a different stop rule | Rank only traces with the same stop rule; the report warns |
| A last-chapter rule counted an old kill | The kill was before the chapter start | Count only kills after the chapter begins |
| Run numbers became `12.0`, seeds printed `0.0` | Godot's JSON parser returns floats | Cast counts to integers at load, in the game and in the report |
| A new sweep wrote into an old trace folder | A saved path beat the explicit argument | An explicit argument or environment value always wins |
| Buys before the first run were lost | A restarted bot had no current run row | On load, make the last finished run row current again |
| Files kept changing after a test | Signal handlers outlived diag mode | Check `active` at the top of every handler |
| Once-only events fired every run | A beaten mini boss came back each run | Gate the event on the game's own first-kill flag |
| The report test could not import its module | The test dir was not on the import path | Add the test dir to `sys.path`; delete `__pycache__` before review |
| The contract and a test disagreed on valid stats | The rule was not written | Ask; write the rule into the contract |
| A "wall" in the diag tree | It came from the diag tree only | Check the encounter on the shipped tree before you report a game fact |
| 2 events always fell in the same run | One is the reward of the other | Check that before you claim a cause |
| A skill wall was really a resource wall | The bot always ran out of fuel or health first | Read the failure reasons before you exclude a boss or plan a coach |
| All panel playthroughs failed | zsh did not split a list variable | Use an array or an explicit list; delete the failed rows |
| A wait loop ended at once | Its process pattern matched nothing | Test the pattern with `pgrep -fl` first |
| A `pkill -f` killed your own monitor | The pattern matched the monitor command | A narrow pattern such as `tune[.]py --configs` |
| A task notice came, but the play still ran | The notice came from a short wrapper | Wait for the watcher of the real job |
| Progress showed 0 for a long time | The log printed in job order | Count finished result files |
| The notes held wrong claims | Claims written from memory | Recompute each claim from the result data before you report |
| A pinned test failed after a cap change | The test asserted the old value | Update pinned tests with the generator change |
| A sandboxed agent could not play | It could not write the save folder | Give bot runs to an agent that can write the save folder |
| Probes took close to 1 hour per seed | Shared slots, high load | Plan wall time for the slot queue |
| A lean build failed | The wing gave power and income but none of the run resource (for example fuel) | Report the cause; cost cuts alone do not fix it |
| 2 captures were the same | The upgrade changed only hidden numbers | Report a feedback finding |
| A capstone did nothing of its own | No own effect in code | Report it |
| 2 audit runs corrupted each other | They shared 1 save slot | A slot argument per run |
| Audit runs ended in seconds after a merge | A stale class cache | Import the project first |
| A cue layout cost too much in 1 frame | All cues were timed together | Time only the new part |
| A rare-currency gate blocked a whole branch | The gate node was in another currency | Move gate nodes to the main currency |
| A coach was planned for an unwinnable fight | The bot lost every try with an empty resource | Measure first; a coach cannot teach a fight the resource always ends |
| Nodes counted only in the model | They were in no tree | Audit model rows against tree rows |
| A search returned nothing | The search tool did not support the pattern | Test a search on a known hit before you trust an empty list |
| Tester traces showed "seed 0" and "skill strong" | No human flag in the trace | Add the flag |
| A tester build ran in script mode | It started from a secondary working copy | Run the play command from the main checkout |
| The telemetry held 1.7 s of test data | The log was not from real play | Check the log; use the video |
| The report grouped sessions, not testers | Logs were grouped by file | Group by tester folder |
| Pass marks had no telemetry event | The question was not observable | An observer check on the same sheet |
| Interview asked about missing systems | The questions were generic | Ask only about this build |
| The model paid strips, the game paid areas | The model and the game differed | Note the gap for the model owner |
| A redesign reversed an earlier decision | Nobody checked the decision history | Name the decision with its date; offer fixes |
| An answer box held a worker report | Pasted text looked like direction | Only the owner's own words are direction |

## Artifacts to build

- **Diag tree generator**: reads the shipped tree data and writes the hub data file; keeps the `price` block; the data
  export runs it; after a cull it writes the culled tree as active and the full tree beside it.
- **Diag runtime**: 1 global object with the API of `references/contract-template.md`; its own save and state file.
- **2 hooks**: 1 in the stat pipeline, 1 guard in the shipped shop; plus a test that diag off equals shipped stats.
- **Bot policy flag and snapshot flags**: `--diag-policy`, a snapshot per chapter start, per boss try, per shop.
- **Sweep driver**: plays N policies with own slots, out folders and traces; supports a tag, resume, run cap, seed.
- **Calibration driver**: tries per chapter, run and time caps, invalid on a script error, a table of OK, FAST, WALL.
- **Policy files and generator**: JSON per policy (contract section 5); `scripts/make_policies.py` writes the set.
- **Report**: `scripts/report.py` with fixtures and tests; writes `report.md`, `report.html`, `balance.json`.
- **Wall finder**: replays a boss try per spoke with +1 and +3; writes `wall.json`.
- **Value bot driver**: pure scoring functions with tests; replays per candidate; writes the buy positions.
- **Tuning script and fun band file**: configs x panel x seeds; resume; a score-only mode; JSON of target bands.
- **Playstyle report**: chapter minutes, failed boss tries, tries at the hardest boss, stall runs per trace.
- **Wing audit checklist**: node, stat, readers, opening run, cost in runs, dead or felt, capture pair.
- **Economy target checks**: T1 to T3 as tests in the balance model.
- **Cue table**: stat key to cue, plus 1 anchor-point method per class model.
- **Telemetry logger, report and protocol**: JSON lines; per-tester answers; observer sheet; readiness gate list.
- **Decision file**: numbered items with facts, evidence, options, recommendation, and the owner's answer verbatim.

## Bundled files

- `references/contract-template.md`: the contract to fill in (method step 3).
- `references/balance-json.md`: the `balance.json` and `wall.json` schemas and every definition (steps 10 and 11).
- `scripts/report.py`: the report and `balance.json` writer, standard library only. Tests: `scripts/test_report.py`
  with `scripts/fixtures/`. Run `python3 -I -m unittest discover -s scripts -p 'test_*.py'`.
- `scripts/make_policies.py`: the policy set generator (step 7).

## Related skills

- `bot-balance-loop`: builds the headless bot, its determinism and the wall diagnosis that this skill drives.
- `balance-model-data`: owns the scripted balance model, its export and its parity with the game.
- `headless-godot-runs`: tool script rules, save isolation and run cleanup for every bot run here.
- `visual-verification`: windowed captures for the felt-effect checks and cue captures.
- `godot-perf`: frame budgets, shader warm-up and hitch maps for upgrade cues.
- `release-and-store`: the exports that a human playtest build uses.
- `feature-seams-and-saves`: the data seams and dev-mode flags that keep diag mode out of the shipped game.
- `fleet-game-dev`: long background waits, parallel units, and the ask-and-wait protocol for owner decisions.
