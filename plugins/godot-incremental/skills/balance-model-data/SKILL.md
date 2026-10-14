---
name: balance-model-data
description: >-
  Keep a game's numbers in a scripted balance model (for example Python modules) that checks
  design targets and exports the JSON the Godot game loads, and change that data without drift.
  It covers the edit-export-diff loop, FAIL-key baselines, deterministic exports, parity
  fixtures between the model and GDScript, what-if and lever searches inside the model, and
  design docs whose tables must match the model. Use it whenever someone wants to change a
  price, a yield, a pacing curve, a content table or an upgrade row that a script exports; asks
  why the model and the game disagree, why a parity test fails, or why a chapter runs too long;
  wants to tune or fit levers before touching game data; or writes a design doc full of numbers,
  even if nobody says "balance model" or "source of truth".
---

# Balance model as the data source

An incremental game has hundreds of numbers: prices, yields, health, pacing, unlock gates.
When people edit them by hand in JSON or in game code, the numbers drift apart and nobody can
say whether a change broke a design target. The fix is one scripted model that owns every
number, prints numbered PASS or FAIL lines against the design targets, and exports the JSON
that the game loads. Every change then goes through a fixed loop: baseline, edit the source,
export, diff, compare FAIL keys, regenerate parity fixtures. It works because each step leaves
a byte-level record, so a reviewer sees exactly which rows moved and which targets broke.

## When to use

- A number, row or text that the game loads comes from a script that exports it.
- You add a content block, a new variant, or a new design target.
- You merge two branches that both changed the model or its exports.
- The model and real play disagree, or a parity test fails.
- Pacing or economy must move and you want to test levers before you edit data.
- A design doc or reference sheet states numbers that the model owns.

## When not to use

- The game has no exported data and no model yet, and the task is a one-off number. Start a
  model only when more than a handful of numbers depend on each other.
- You need measured numbers from real play. Make those with bot fights first (see
  `bot-balance-loop`), then bring them into the model.
- You design an upgrade tree shape or a buy policy. That is `upgrade-tree-design`.

## Method

The model is a set of modules, for example one per domain (content, bosses, variants, areas,
pacing). Each module prints numbered target lines, exits non-zero on any FAIL, and writes its
export. The game only reads the exports.

1. **Keep every gameplay number in its owner module.** Game code reads the export; it holds
   no balance constants. Never hand-edit an exported JSON, because the next export overwrites
   it. Check: grep the game code for the number you change. It appears only in the export.
2. **Save a baseline before any edit.** Run every module and the fast simulator. Save each
   output, each exit code, and a checksum of each export (for example
   `shasum exports/*.json > before.sha`). Check: the baseline files exist and are non-empty.
3. **Reduce FAIL lines to keys.** A key is the check name plus its subject, without the
   numbers, for example `cost wall: node_12`. Record the set of pre-existing FAIL keys. Why:
   old FAIL lines hide new ones, and a module can exit 1 on old rows, so the exit code alone
   proves nothing. Check: you can print the baseline key set
   (`scripts/fail_keys.py` does this).
4. **Make a base copy for later diffs.** Use `git archive HEAD <every dir the model reads> |
   tar -x -C /tmp/base`, or a detached base worktree. Copy every folder the model imports, not
   only the module you edit. Check: the base copy prints the same FAIL keys as your baseline.
5. **Edit the source row with an asserted replace.** Match by unique text and require exactly
   1 match. Add a new target as a report-only check first, and confirm the old output does not
   change. Check: the replace helper reports 1 match.
6. **Export and read the diff.** Run the exporter. Read `git diff --stat` and `git diff -U0`
   on the exports. Only your rows or keys may change. Some projects write each export to the
   model folder and copy it into the game folder; compare the 2 copies with `cmp`. Check: every changed line traces to your edit.
7. **Export a second time and compare hashes.** The two runs must be byte-equal. Why: an
   unordered source (a set, a dict built from a set, a file glob) makes the export change on
   each run and floods every later diff. Check: `shasum -c` passes on the second run.
8. **Run every dependent module and diff the FAIL keys.** Compare against the baseline and the
   base copy. Report only new FAIL keys and the keys you cleared. Check: the new-key list is
   empty, or each new key has a written cause and a question to the design owner.
9. **Regenerate the parity fixtures in the same change.** Run the parity tests (see
   "Model and game parity" below). When a value must differ on purpose, add a documented skip
   entry with its reason. Check: the parity tests pass and the fixture hash is stable.
10. **Restore every generated file outside your scope.** A module run often rewrites exports
    that another change owns. Use `git checkout -- <file>`, or a row-level restore script that
    keeps unowned rows byte-equal. Check: `git status` lists only your files.
11. **Merge by source, not by export.** On a conflict in the source, keep both additive sides.
    On a conflict in an export, finish the source merge and re-run the exporter. Check: no
    conflict marker is left (`git grep -n '^<<<<<<<'`).
12. **Put a design-only variant behind a profile switch.** For example an environment variable
    selects the profile. Check: the default profile keeps every export byte-equal.
13. **Commit the source and every exported copy together.** Run a headless Godot import,
    the tests that grep for the changed keys, and one full test suite (see `godot-testing`).
    Why: a folder-only run misses stale parity fixtures, telemetry that does not subscribe to a
    new signal, and fixtures that pin old rows. Check: the full suite passes.

## Model and game parity

The model and the game both predict the same numbers. Treat the model as a tool and the game
as the truth. When they disagree, the measured game table decides.

1. Make the model read the same rows and rules as the game: the same price rule, the same
   parents in the tree, refund rows, per-variant stats. Remove model-only multipliers before
   any tuning. A model that reads its own copy of the tree passes while the game fails.
2. Measure the real game first. Use a bot ladder of real runs with a fixed buy policy, or
   headless measure tools over a matrix (variants x areas x tree states) on a fixed route,
   with 3 or more seeds per state.
3. Find the first gap: a dead end, a stall, a currency the bot never earns. Change the model so
   that it reproduces the gap before you tune any number.
4. Fit the missing model term to the measured ratios. Put the measured table into the model as
   a MEASURED table, with a check that the model stays within a set error of the game.
5. Add a new model term behind a flag. With the flag off, the output stays byte-equal to the
   baseline.
6. Keep a parity test in the game. A fixture generator runs the model on fixed inputs (for
   example every node at level 1 and at max) and writes a fixture file. A GDScript test runs
   the game's port on the same inputs and compares within a tolerance. Hash the fixture before
   and after a regenerate to prove it is stable.
7. When a parity test fails, regenerate the fixture first. If nothing changes, the fixture is
   not stale. Compare the model input rows with the exported rows and find the field that the
   exporter writes but the model does not see. Fix the model, not the export.
8. Put a game rule change into every copy: game code, any GDScript simulator, and the model.
   Grep for every fake and copy of the changed function.
9. Give each fit a guard rule, for example "every price stays between 0.5x and 4x of a
   reference price". A fit can pass every target with absurd values. Code an accepted miss as
   a named limit, so a worse value still fails.
10. Re-measure after a merge that changes game code. Verify a balance result in a temporary
    copy, because a model run rewrites generated files.

## What-if and lever search

Use the fast model to test pacing and economy changes before you touch game data.

1. Save a baseline output of every module and profile. Write 1 cause per failing target row.
2. Build a beat map: each run, its minute, and each new beat (a boss, an enemy type, a find,
   a new tree wing, a new rule). Set targets, for example the run of the first boss and the
   longest stretch with no beat.
3. Write what-if scripts outside the model folder. They import the model and take
   `row.field=value` overrides or a JSON override file. They print the target line and the rows
   that move. A what-if never writes the export files.
4. Run the base, then each override alone, then the candidate set. Report which single
   override causes each FAIL. Join the overrides that pass alone and run the joined set again.
5. Before a search, measure each approved lever alone against all targets. A lever that does
   not move the output is limited by something else, for example a time cap and not health.
   Find that limit first.
6. For a fit, write a runner that copies the whole model folder to a temp dir, applies a lever
   set, and saves the report. A score script adds a penalty per FAIL key plus the distance of
   each chapter length from its target. Build a fresh model state for each candidate.
7. Run a coordinate search, then a joint grid over the 2 or 3 coupled levers. Search coupled
   values together; one at a time lets an early value set the floor for a later one. Tune rows
   at run boundaries last, because a buy at a boundary makes the fit jump.
8. Round the best fit to plain numbers (2 or 3 significant digits). Write only the approved
   constants into the source, then run the main Method from step 5. Check that later chapters
   stay within their length band (for example plus or minus 15 %).
9. Re-measure the new states in the game over 2 or 3 seeds. Update the MEASURED table and the
   doc tables.
10. When no approved lever can pass, do not force numbers. Compute the exact range that each
    rule allows, show that the ranges do not overlap, and hold the edit. Report the levers you
    tried and the closest set. Print a value that needs unbuilt data as PENDING.
11. When the design owner accepts a target miss, add a named, bounded constant for that row,
    so the model prints the decision on every run.

Prefer slow gains plus spike moments to a smooth slow curve. A smooth curve can turn one
chapter into dozens of farm runs (see `upgrade-tree-design`).

## Design docs that match the data

Design docs repeat ids, names, counts and number tables. Make a check script own that
agreement.

1. List the facts that more than 1 file states: ids, names, counts, order, gates.
2. Write a check script with 1 check per fact. It imports the model modules, parses the doc
   tables, and prints PASS or FAIL per rule.
3. Prove the check with a negative test. Copy the docs to a temp folder, change 3 facts, and
   confirm that the check finds all 3 (see `godot-testing`).
4. Save the "before" output. Fix 1 doc at a time and re-run the check after each doc until it
   prints 0 FAIL. Take numbers from the modules through the check's own functions; never type
   them by hand.
5. Generate doc tables from the model with a generator that replaces only its own marked block.
   Diff the doc and confirm that only table lines changed. Run it twice to prove it is
   idempotent.
6. Optional, for game text: first name the 1 source of truth for player-facing text, for
   example a localization resource (`.po` or `.csv` translation files) or a text table in the
   design docs. The other files must agree with it. If the source is a design-doc table,
   parse its rows into JSON with a count per section, and add a test that loads the JSON. If
   the source is a localization resource, check the docs against its keys instead.
7. For new content, write a model script that imports the current models, adds the new
   content, and prints its checks with ALL PASS. Check that the other models' outputs do not
   change. Generate the doc tables from it.
8. For a reference sheet, give each number its source: a model run in a temp copy, or a
   measured table read with `git show <branch>:<path>`. Remove every statement you cannot
   source.
9. Add lint rules to the check (style words, line length). Check new player-facing lines
   against the old maximum length. Add the check to the set every change runs.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| A report-only model run left tracked exports changed, or re-exported another change's rows. | Modules write exports as a side effect. | Run on a scratch copy, or `git checkout` the files after each run. Check first whether a script writes files. |
| A scripted replace changed 2 rows, or silently matched 0. | Replace by value or by line number. | Replace by unique text and assert exactly 1 match. |
| A plain re-run on a new base changed many rows you did not touch. | The checked-in JSON already differed from the model inputs. | Stop and report the drift. Ship only your rows. |
| A base run in a temp folder showed 0 FAIL lines. | The copy missed sibling files that the model imports. | Archive every folder the model opens. |
| New FAIL lines were invisible; a module exited 1 anyway. | Pre-existing FAIL lines. | Compare FAIL key sets. The rule is "the same FAIL keys before and after". |
| A derived value moved when its source moved (for example health from appear time). | A hidden derivation. | Read the derivation and move both values on purpose. |
| Folder-only tests passed; other tests broke later. | A stale parity fixture, a new signal with no subscriber, fixtures that pin old rows. | Run 1 full suite after any data, price or signal change. Plan "regenerate the parity fixture" as a step. |
| Keys added to a shared stats dictionary broke the parity key count. | The stats function changed shape. | Add a separate apply step. Keep the stats function unchanged. |
| The game read old values for one row or one price family. | The exporter kept a frozen copy, or skipped a family. | Copy every field from the source row. Test that the 2 copies agree. Read the JSON diff. |
| Every existing row gained a new default field. | The exporter writes defaults. | Write the field only on rows that need it. |
| A placeholder row broke row-wide tests or added an unwanted trait. | It was copied from a real row. | Give placeholders neutral values and a `placeholder: true` flag that row-wide tests skip. |
| Removing a retired row broke many tests. | Tests use it as a fixture. | Keep the row. Remove it in a separate cleanup. |
| Fixture or export rows were missing. | An imported module filtered a shared table on import. | Deep-copy the table before the import and restore it after. |
| A second model gave different results from the same seed. | It replays a fixed draw order and a new factor took a draw. | Use the expected value of the new factor, not a new draw. |
| A doc table tool cut sections, or changed the doc on each run. | The tool is not block-scoped or not idempotent. | Replace only a marked block. Restore with `git show HEAD:<file>`. |
| Sorting failed in Python 3. | Mixed key types in tuples. | Sort with `key=str`. |
| Moving nodes between lists moved other nodes. | Layout derived from list order. | Keep the old layout slots. |
| A slow generator looked stuck. | It runs a full simulation. | Send output to a file. Check the process list before you call it stuck. |
| The model passed and the game failed. | The model read its own copy of the rows. | Make the model read the game rows exactly. |
| Measured power was a fraction of the model value at the first meeting. | The model was never calibrated. | Measure the real game first, then calibrate. |
| A fit passed every target with absurd values. | No guard rule. | Add a band rule, for example 0.5x to 4x of a reference price. |
| One shared lever could not satisfy 2 opposite targets. | Over-shared lever. | Use 1 value per currency, with a fallback per variant and a written reason. |
| A regenerate made no change. | The fixture was not the cause. | Stop and find the real cause before you change anything else. |
| The parity test showed a double count. | Stats applied a legacy list and the new rows. | Count each node once. |
| A lever did not move the output. | Another limit binds (a time cap, a pay cap). | Test that each lever moves the output before a grid. |
| The bot earned none of a rare currency, so the tree dead-ended. | A gate needs a currency that real play does not give. | Change the gate so a tier needs only the earlier tier. |
| NumPy was not installed. | Standard library only. | Solve a small least-squares fit with Gauss elimination. |
| Parallel model runs crashed or mixed results. | They wrote the same output file. | Give each run its own output copy and its own model state. |
| A model tool assumed the wrong run end. | A hard-coded end. | Read the end from the data. |
| A search grew too large and printed nothing. | Too many levers. | Stop, narrow the lever set, restart from the best near-fit. |
| A background what-if changed tracked files during a commit. | It writes outputs. | Run in the foreground, or stop and restore first. |
| A per-entity random seed pushed values across a band edge. | Small margins. | Check margins before the change. Apply the seed in every module that compares the same numbers. |
| The model ladder hid a wall that real players meet. | Model states were a near-maxed player. | Build states from a full-run purchase log. |
| Pacing ran past the end of the ladder data. | Too few states. | Pad with the last state and spend nothing on padded runs. |
| The shell split a multi-edit override. | Quotes. | Quote each override as its own argument. |
| Logs grew to megabytes. | Per-second lines. | Keep only the summary lines the tools read. |
| A new rule arrived mid-task. | Changed requirements. | Record it first, replace every out-of-band value, then fit again. |
| A count check counted 1 item twice. | 2 docs list it. | Remove duplicates before a count. |
| New player-facing lines overflowed the UI. | No length check. | Check against the old maximum length. |
| `sed` stopped early or failed on macOS. | A loose range pattern; BSD `sed` syntax. | Use a tighter pattern, an edit tool, or `sed -i ''`. |

## Artifacts to build

- **Model modules**: one per domain; each prints `N. <check>: PASS|FAIL <subject> <numbers>`,
  exits non-zero on FAIL, and has an export function.
- **Export command**: one entry point that runs every exporter in a fixed order with sorted
  keys and a stable float format.
- **FAIL-key differ**: reads 2 outputs and prints new and cleared keys. This skill ships one:
  `python3 scripts/fail_keys.py before.txt after.txt`. It exits 1 when a new key appears. The
  default key is the text before the word FAIL, with each number replaced by `#`; `--pattern` with a `(?P<key>...)` group sets
  your own key.
- **Two-run hash check**: `shasum <exports> > a; export; shasum -c a`.
- **Asserted replace helper**: `rep(path, old, new)` that fails unless it finds exactly 1 match.
- **Row-level restore script**: puts unowned rows of an export back to the base version.
- **Parity fixture generator and GDScript parity test**: fixed inputs, a fixture JSON, a
  tolerance, and a skip table with a reason per entry.
- **Profile switch**: an environment variable that selects a design-only variant.
- **What-if runner and score script**: override parsing, a temp copy of the model, a penalty
  per FAIL key plus the distance to the target lengths.
- **MEASURED table**: game numbers with their seeds and source, plus an error-band check.
- **Doc consistency check and doc table generator**: one check per shared fact, and a
  marked-block writer.
- **Save-compatibility check**: every old row id still exists or maps to a new id.

## Related skills

- `bot-balance-loop`: makes the measured game tables that this model calibrates against.
- `upgrade-tree-design`: designs tree shapes and buy policies with real bot play; this skill
  holds the numbers that design produces.
- `godot-testing`: the full suite at the end of a data change and the negative-test idea.
- `feature-seams-and-saves`: optional row keys, flagged modes, and save migration when rows
  change.
- `safe-refactor-and-review`: proves that a model refactor keeps every output byte-equal.
- `fleet-game-dev`: asserted scripted edits, ownership of generated files, and how to report a
  block when no lever can pass.
