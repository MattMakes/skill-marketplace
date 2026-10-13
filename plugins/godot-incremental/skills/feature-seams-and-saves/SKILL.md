---
name: feature-seams-and-saves
description: >-
  Add new content, variants and whole modes to a Godot game through data seams and
  off-by-default flags, and keep player saves and settings safe across versions. It covers a
  new playable variant (vehicle, class, character) or encounter batch on a shared base class,
  an optional row key whose default keeps old rows exact, a prototype branch plus
  a flagged landing for a big mode, mode fields on content rows, atomic signed saves with
  backups, save-version migration tested with a real old save, graphics presets with a
  first-launch Auto pick, and setup tools that give the same project file on a second run.
  Use it whenever someone wants to add a character, enemy, boss, level type, game mode or data
  field, bump the save format, rename a settings key, harden saves against corruption or
  edits, or asks "will old saves still load?" or "how do I add this without breaking the
  base game?", even if nobody says "seam" or "migration".
---

# Feature seams and saves

A game with persistent progress grows by adding content to shared code, and each addition
can change old behaviour or break old saves without a visible error. This skill adds every
new thing through a seam: a small, tested hook in shared code or data whose default keeps
today's behaviour exactly. Big changes go behind a data flag that is off until they are
ready, and every save format change ships with a migration that a real old save proves. It
works because each step has a check that can fail: the old rows, the flag-off suite and the
old save fixture all must give the same result as before.

## When to use

- You add a playable variant, an enemy, a boss or a batch of content of 1 kind on a shared base.
- New content needs a new field in a data row, and old rows must not change.
- Several people or agents want the same local edit in 1 shared script.
- A large mode or render path needs a try-out before it may touch the shipped game.
- 2 modes share content rows, and content of one mode shows up in the other.
- You change the save format or a settings key, or you harden saves against crashes and edits.
- You add quality presets, or a tool script writes into the project file.

## When not to use

- A pure number tweak in existing rows. Use the balance skills (see Related skills).
- A refactor that must keep behaviour. Use `safe-refactor-and-review` for the identity proof.
- An online game where the server owns the save. A client check cannot enforce values there.

## Method: add a variant behind a seam

This is the main procedure. The later sections are the same idea at other scales.

1. **Run the baseline suite before any edit.** Record the pass and fail counts. A later
   failure then shows as new, not as old noise.
2. **Read the base.** Read the design section, the base class, the test dummy and the base
   type's script, data row and notes. Look at the art before you design parts.
3. **List what each subclass uses.** Grep, or write a short script, that lists the base-class
   members each existing subclass reads or overrides. The list shows which hooks already
   exist and which you must add.
4. **Map every seam you need, then ask once.** A seam is a hook in a file you do not own: a
   virtual method, a signal, a row key. Send all of them to the file owner in 1 question,
   with the exact line and place of each. Continue other work while you wait. One question
   costs one round trip; five questions cost five.
5. **Commit the seam alone, with its tests.** Peers can then merge it early, and a review sees
   the shared change apart from the content.
6. **Add the variant as data plus script.** Give it its own data row through the data
   generator, not by hand. Register its behaviour script in a table (for example a table of
   drive scripts keyed by variant id). Write each encounter as an inherited scene of the base
   scene, with its own script.
7. **Keep shared helpers private.** Put helper scripts in a folder you own, with no
   `class_name`. A global class name can clash with a sibling unit that lands the same day.
8. **Ship a placeholder model with a frozen public API.** An art worker can then build the
   real model in parallel to the same API. Tell the lead before any signature changes.
9. **Build in steps with a rig test per step.** Use an isolated test rig: motion, special
   verbs, effects, stat reads, run wiring. Wait for the right state before each check (for
   example idle, not a recovery window). Check: each rig test fails when you break its step.
10. **Check budgets once.** Print the peak of each budget a single time (for example peak
    bullets on screen). Then remove the print. Capture each scene at its key states, such as
    idle, tell, open and window.
11. **Prove fairness against the base type.** Measure the per-frame cost against the base
    type (for example a limit of 0.3 ms). Run the encounter checks with both types at the same
    seeds and compare first-try rates. Run the base type on the same build too, so that a
    balance change merged by someone else does not look like the variant's effect.
12. **Make every upgrade felt.** Each upgrade node of the variant needs an effect the player
    can see or feel. A node with a number change only is not done.
13. **Swap in the real model.** Delete the placeholder and its warm-up entry when nothing reads
    them. Run the tests again. Check: a grep for the placeholder name returns nothing.

## Optional row keys

Use this when content needs a new data field, or 2 or more units plan the same edit in 1
shared script.

1. Find every reader of the row. Include second render paths (for example a node renderer
   and a MultiMesh renderer) and tool scripts. A missed reader ignores the key silently.
2. Find duplicate plans. If 2 units plan the same local change, propose 1 shared seam
   instead, with its exact line and place.
3. Read the field as optional, with a default equal to today's behaviour. Every reader uses
   the same default.
4. Define the rule for short lists. For example, a short list repeats its last entry.
5. Make a lookup of an id with no row return an empty dictionary, then fall back to the
   default. It must not crash.
6. Make a repeated call safe. For example, the seam emits an end signal once per window. A
   leftover local copy then does no harm. Tell the units to remove their local copies.
7. Add the matching term to the balance model, if you keep one, so model and game agree.
8. List every shared key in 1 place, for example a comment block at the top of the base script.
9. Commit the seam alone, apart from the row commits.

Tests for a seam:

- A row with the key changes the result.
- At least 2 rows without the key keep today's exact result.
- Every known key maps to a value, and an unknown key gets a safe default.
- The new field is required only on the new rows. Old rows stay valid without it.

## Flagged mode rollout

Use this for a large change: a new game mode, a new render path, a design option. It must not
change the shipped game until it is ready. This skill owns the mode rollout: the flag, the
stages, the flag-on tests and the turn-on gate. `safe-refactor-and-review` owns only the
identity proof (hash or `cmp` compares, paired runs) that Stage 2 step 3 calls for.

**Stage 1: prototype.**

1. Grep the code for each assumption the change breaks: sizes, clamps, bounds, fixed ids.
   Write this assumption map before you design.
2. Make 2 branches from the same base: a proto branch that never lands, and a build branch
   that does. Mockups, A/B switches, debug hooks and merges of unlanded branches go only to
   the proto branch.
3. Build a quick prototype and a drive tool that plays it, logs cost and takes captures.
4. Run the full suite on the prototype. The failures list the old assumptions for you.
5. Put each debug cost in the prototype behind an environment flag. A debug hash every
   frame can add tens of ms and spoil the cost measure.
6. If upstream changes a file the proto edits, take the upstream file. Rebuild the proto
   variant with a generator script that applies the proto edits to any upstream copy.
7. Write the design doc: the assumption map, the measured cost, the stages and real captures.
   Send the options or measures to the decision maker and wait for the pick.

**Stage 2: build behind a flag.**

1. Add 1 top-level data flag, off by default. Every new code path checks the flag first.
2. Add the new data rows with the flag off.
3. With the flag off, run the full suite. It must give the same result as the baseline. The
   shipped data export must stay byte-equal. Use the identity proof of
   `safe-refactor-and-review` for this compare.
4. If a balance model exists, give the new mode its own profile. The old profile output must
   stay byte-equal.
5. Port only the chosen part from the proto branch, with tests. Keep proto files out.
6. Add tests for the mode with the flag on. Each test sets the flag in setup and resets it in
   teardown, because a leaked flag changes later tests.
7. Measure the perf cost with the flag on.
8. Keep an open-items file for the mode. Clear it before the flag turns on.
9. Turn the flag on only when the open-items file is empty, the flag-off suite still matches
   the baseline and the flag-on tests pass.

**Mode fields on content rows.** When 2 modes share data, give each content row a mode field
(for example `single`, `world`, `both`). Runtime systems, hint lists, index pages and tests
filter by that field, not by a pinned list of ids, so a new row works with no list edit.
Write 1 test per mode. The test sets the mode flag in setup and restores it in teardown.
Prove the filter: disable it, and see the mode test fail.

## Save integrity

Use this when a save must survive a crash, a failed write, a corrupt or edited file and bad
settings values.

1. **Write the threat model first.** A client-side check can detect an edit. It cannot enforce
   values, because the player owns the machine and the key.
2. **Build the store in a scratch project.** Write 1 test per failure case before you wire it
   into the game: a changed body, a flipped flag, a truncated file, an empty file, a failed
   write, out-of-range settings, a version newer than the build.
3. **Write atomically.** Write to a temp file, then rename it over the main file. Rotate 2 or
   more backups on each good save. Keep only verified files as backups.
4. **Sign the save.** Use an HMAC (a keyed hash) or at least a checksum. Compare signatures with
   a constant-time function. The Godot encrypted file format alone does not detect an edit by
   someone who has the key.
5. **Parse without engine errors.** Use a `JSON` instance and check its error code. The static
   parse prints an engine error on bad input.
6. **Check every field.** Check the `typeof` of each payload key. Turn a wrong type or a
   missing field into the default (for example a number-or-zero helper). Clamp every
   settings value to its range.
7. **Recover.** On a bad main file, restore the newest good backup. Show a notice on the title
   screen, so the player knows.
8. **Save plain dictionaries only.** Do not use `var_to_str` and `str_to_var` on save data,
   because they encode and decode objects.
9. **Version the save.** Add a version field and a round-trip test for each version (see the
   next section).
10. **Keep test saves out of the real save.** Tests write to a git-ignored test output folder,
    never to the player's real save path.
11. If you keep stamped reset copies and prune old ones, test the prune with copies made in
    the same second. Give each new stamp a value above the newest kept stamp.

## Save version migration

Use this when a feature changes the save format or a settings key, and old saves must load.

1. Copy a real save of the old version into a test fixture folder. Do not hand-build a
   dictionary, because a hand-built one has the shape you expect, not the shape players have.
2. Write a failing test. It copies the fixture to a scratch path, loads it and checks the new
   version number and the new fields.
3. Bump the save version constant. Write 1 migration step from the old version to the new one.
   Chain steps, so a save that is 2 versions old runs both.
4. Check that every level, unlock and currency survives, and that new fields get defaults.
5. Check that the old key is no longer read or written after the migration.
6. For a settings key that changes type (for example a boolean to a 3-state value), make the
   new key the authority. Migrate the old value. Keep the old key as a synced alias for old
   callers until they move.
7. Keep old in-memory APIs that callers still use.
8. Add save, load and reset tests for each new persistent field (for example a "seen once"
   flag that returns true one time only).
9. Run the save test folders, then the full suite. If some runs cannot write to `user://`
   (for example in a sandbox), list those failures by name, apart from real ones.

## Graphics presets

Use this when the game needs quality presets, a first-launch Auto pick and a frame cap.

1. Add the settings keys, a preset table (for example Low, Medium, High, Custom) and 1
   effective-value function. It returns the preset value, or the Custom value when the
   player picks Custom. Every consumer reads through this function.
2. Add a migration from old settings files to the new keys (see Save version migration).
3. Add the Auto picker for the first launch. Save in the no-file branch, so the pick
   persists. Without that save, Auto runs again on every launch.
4. Build the settings rows. Dim the rows that the active preset controls until the player
   picks Custom.
5. Wire the values to the scene, for example light shadows and the post-process mode.
6. Measure the cost of each option with an A/B frame-time run (see `godot-perf`).
7. In UI tests, loop over the row count. Do not press "down" a fixed number of times.

## Idempotent project setup tools

Use this when a tool script writes input maps or other settings into `project.godot`.

1. Probe unknown engine facts in a minimal scratch project first, not in the real one.
2. Put the defaults in 1 table, for example an input-defaults script.
3. Write plain arrays, as the editor does, not typed arrays. A typed array saves in another
   text form, and the next editor save rewrites every line.
4. Copy the project file. Run the tool. Diff against the copy. Only the intended lines change.
5. Run the tool again. The file must not change. `scripts/check_idempotent.py` does steps 4 and 5.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| The variant's special verb never fires in the encounter check. | No caller wires the verb. | Record the table as "before". Wire the verb. Run "after". |
| A test override fails after a seam change. | A new argument on a shared function; the override keeps the old signature. | Ask the owner. Update the override. |
| A rare result jump appears with the new variant. | A balance change merged by someone else. | Run the base type on the same build and the same seeds. |
| An upgrade node does nothing visible. | The node changes a number only. | Build a felt effect for every node. |
| `get()` returns null for a constant. | Constants are not properties. | Read the constant from the script, or expose a var. |
| A path follow drifts over time. | One large move per tick (for example 5 cm). | Use sub-steps. |
| A state check fails at random. | The check runs during a recovery window. | Wait for the idle state first. |
| 2 entities close the same window twice. | Each has its own local copy of the rule. | 1 shared seam that emits once per window. |
| A lookup crashes on a new id. | The id has no row. | Return an empty dictionary; fall back to the default. |
| A shared test breaks when a key is added. | The test copied a real row. | Remove the key from the test's copy only. |
| New art renders wrong in one view only. | A second render path ignores the new frame count or cell size. | Read frames and cell size from the row in every path. |
| Old rows fail validation. | A test requires the new field on all rows. | Require it only on the new rows. |
| A removed table still has references. | Old code names it in several places. | Run a parse check of all scripts; remove every reference. |
| A proto merge conflicts after upstream edits. | The proto edits the upstream file by hand. | A generator script applies the proto edits to any upstream copy. |
| The prototype costs tens of ms more than expected. | A debug hash runs every frame. | Put each debug cost behind an environment flag. |
| Mode tests break on each data change. | Tests use fixed distances or positions. | Read positions from the map API. |
| Positions are off by a constant. | 2 coordinate systems with their own origins. | Give the origin 1 owner. |
| Content of one mode shows in the other. | A hint or index list does not check the mode. | Filter by the row mode field. |
| A design doc names missing captures. | The report came before the captures. | Take the captures before the report. |
| An edited save loads without warning. | The encrypted file format has no integrity check against a key holder. | Sign with HMAC; compare in constant time. |
| A save decodes an object. | `str_to_var` decodes objects. | Save plain dictionaries only. |
| A load crashes on a missing number. | `float(null)` fails. | A number-or-zero helper. |
| A bad file prints an engine error. | The static JSON parse reports errors. | Use a `JSON` instance and check its error. |
| A test accepts a wrong type. | It compares with `== true`. | Check `typeof` first. |
| A tamper test does not change the file. | The test edits the wrong number form. | Match the exact serialized text, for example `2.0`. |
| A new reset copy becomes the oldest and is pruned. | It reused a deleted stamp in the same second. | Each new stamp is above the newest kept stamp. |
| Save tests fail in a sandbox. | The sandbox cannot write `user://`. | Use a disposable fixture under the test folder; list sandbox failures by name. |
| Old UI tests fail after a settings change. | They check the replaced boolean row. | Get approval, then update the tests of the replaced row. |
| Auto picks again on every launch. | The first-launch pick is not saved. | Save in the no-file branch. |
| UI tests break when a row is added. | They press "down" a fixed number of times. | Loop over the row count. |
| The editor rewrites the input map after the tool runs. | The tool saved typed arrays. | Convert events to plain arrays. |

## Artifacts to build

- **Seam test file**: per shared key, 1 test with the key, 2 without, and 1 unknown-key default test.
- **Shared-key list**: 1 comment block or table that names every optional row key and its default.
- **Subclass member lister**: a short script that greps each subclass for base members it uses.
- **Variant rig**: an isolated test scene that drives one variant through motion, verbs and effects.
- **Variant check script**: runs the encounter checks for base and variant at the same seeds; prints first-try rates and frame cost.
- **Proto generator**: a script that applies the proto edits to the current upstream file.
- **Open-items file**: 1 line per item that must close before a flag turns on, with an owner.
- **Save store**: atomic write, backup rotation, HMAC, typed load with defaults, restore notice.
- **Save fixtures folder**: 1 real save per old version, named by version.
- **Migration chain**: 1 function per version step, run in order from the file's version.
- **Preset table**: preset name to a dictionary of setting values, plus the effective-value function.
- **Project setup tool**: 1 defaults table and a writer that gives the same file on a second run; check it with `scripts/check_idempotent.py`.

## Related skills

- `safe-refactor-and-review`: the identity proof for the flag-off path, and the search for every reader of a key.
- `godot-testing`: the test loop, and how to prove that a seam test can fail.
- `headless-godot-runs`: scratch projects for engine probes, and tools that stay off the real save.
- `godot-perf`: the A/B frame-cost measure for a variant, a mode or a graphics option.
- `bot-balance-loop`: the encounter checks that compare a variant with the base type.
- `balance-model-data`: the model term for a new row key and the per-mode model profile.
- `upgrade-tree-design`: felt effects for each upgrade node of a new variant.
- `pixel-art-pipeline`: the real model that replaces the placeholder.
- `visual-verification`: captures of the variant and of proto options for a pick.
- `release-and-store`: save isolation per edition and input defaults for pads.
- `fleet-game-dev`: how to ask for seams, land seam commits and handle sandbox write limits.
