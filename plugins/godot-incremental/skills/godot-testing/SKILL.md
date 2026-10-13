---
name: godot-testing
description: >-
  Prove Godot changes with a headless GDScript test loop. Record a baseline before you edit,
  write a test that fails first, run focused filters, then the full suite, a parse check and a
  smoke scene. Separate new failures from old ones by name. Covers red-first and mutation
  proofs, flaky tests and shared state, "leaked at exit" lines, audits of tests that only copy
  data, input injection, per-route regression tests, and the finish gate before a unit reports
  done. Ships a small runner, a test base class and a repeat-run script. Use it whenever someone
  changes GDScript or scenes and must show that the change works, or asks why a test passes
  alone but fails in the suite, why the suite leaks at exit, whether a failure is pre-existing,
  how to test menus with input, or whether a test can fail at all. Use it even if nobody says
  "test runner" or "regression test".
---

# Godot Testing

A Godot project that many people or agents change every day needs one fast, honest proof that a
change works and breaks nothing. The method is a headless test loop: record a baseline, write a
test that fails for the right reason, make it pass, then widen the run from the file to the full
suite and compare by failure name. It works because every claim ("my change caused no new
failure", "this test catches the bug") rests on a run you can repeat, not on a reading of the code.

## When to use

- You change GDScript, scenes or data in a Godot project and must prove the change.
- A test fails and you must decide if your change caused it.
- A test passes alone but fails in the full suite, under load, or only sometimes.
- The suite prints "leaked at exit" or RID leak lines.
- A big suite breaks on every valid tuning change, or holds tests that assert nothing.
- A test must drive menus or the player with input.
- A unit of work is about to report done.

## When not to use

- The check needs real pixels, a real renderer or a frame-time number. Use `visual-verification`
  or `godot-perf`.
- The import, a tool script or a headless probe fails before any test starts. Use
  `headless-godot-runs`.
- You must prove that a refactor keeps behaviour byte for byte. Use `safe-refactor-and-review`.

## Method

1. **Have a runner that cannot lie.** Use one small runner script (see `scripts/run_tests.gd`).
   It runs every `test_*.gd` file and takes `--filter=<path text>`. It fails a test on a failed
   assert and on any engine error or `push_error`, through a registered `Logger`. It counts skips
   as skips, prints passed, failed and skipped, and exits 1 when 0 tests ran. Check: a run with a
   filter that matches nothing exits 1. Why: a green run with 0 tests looks like a pass.
2. **Import first.** Run `godot --headless --path <project> --import` after each checkout, merge
   or new `class_name` file. Check: exit code 0. Why: a stale class cache after a merge can fail
   hundreds of tests that your change never touched.
3. **Record a baseline before any edit.** Run the full suite, or at least the target folders.
   Write down passed, failed and skipped counts and each known failure with its cause. Check: the
   baseline is in your notes before the first edit.
4. **Separate old failures from new ones.** When a check fails after your change, run the same
   check on a clean copy of the base (`git archive <base> | tar -x -C <tmp>` or a temporary
   worktree, then import). Copy every folder the check reads. Check: if it fails there too,
   report it as pre-existing with the exact FAIL line, and do not fix it inside your unit.
5. **Read before you write.** Read the test base class and 1 existing test of the same kind. Use
   the real helper names. Why: a guessed helper such as `assert_equal` fails at parse time and can
   take the whole file down.
6. **Build in numbered steps, 1 test file per step.** Write the test first. Run it with the filter
   and check that it fails for the expected reason (see "Prove the test can fail"). Write the
   code, run the filter until it passes, and commit the step.
7. **Inject what is not there yet.** Use a test double for a dependency that has not landed.
   Inject test data. Production code reads the real data only when no data is injected. Replace
   the double with the real node when the dependency lands.
8. **Widen the run.** Run the system's folder, then the full suite, then a parse check that loads
   every script and scene, then a main or demo scene headless with `--quit-after <frames>` and a
   log file. Run `git diff --check`. Check: only the files you own changed. Why a parse check:
   the exit code of `--check-only` is not a reliable signal for a whole project.
9. **Compare by name, not by count.** Diff the FAIL lines with the baseline. Explain every new
   test in the passed count (for example "+21 = the 21 new tests"). Check: no new FAIL name, and
   no "leaked at exit" line (see "Leaked at exit").
10. **Split headless and window tests.** Mark a test that needs a draw or a real renderer to skip
    headless. Run those tests in a window run, on each renderer you ship.
11. **Do not call a timing test a regression from 1 run.** Run it alone 2 or 3 times and record
    the machine load each time. See "Flakes and test isolation".
12. **Write the counts down.** Put baseline counts, final counts and known failures in the notes
    file and the report.

## Prove the test can fail

A test that passes before the fix proves nothing about the fix. Prove each new regression test,
guard test or check in one of these ways, and write both results down.

1. **Red first.** Run the new test before the change with a name filter. Read each red message.
   It must be an assertion that fails for the expected reason. A parse error or a missing file is
   not proof.
2. **Patch out, patch in.** If the change exists already, save it as a patch:
   `git diff <files> > <tmp>/change.patch`. Revert it with `git apply -R <tmp>/change.patch`. Run
   the test and record the fail count. Apply the patch again and record the pass count. Use a
   patch, not a stash, so the worktree state stays visible.
3. **Guard tests.** Disable 1 key line of the fix, or plant 1 bad file, for 1 run. Check that the
   FAIL line names the fault. Restore, and run `git diff` to show nothing is left.
4. **Mutants.** Change 1 constant or 1 offset in the code under test. The test must fail. If the
   mutant also fails tests you did not expect, run the real code 3 times to rule out a flake.
5. **Passed on the first run?** Add a temporary print of the measured values to confirm the test
   measures real numbers. Check that the inputs reach the rule at all (a loop that hits the rule
   3 times in 400 proves little). Remove the print.
6. **Rewrites.** Keep a copy of the old code and compare outputs on many random inputs.
7. **Per-frame code over many entities.** Add a cost test with N entities and a budget in ms.

Tests that pass before the change describe current behaviour. Keep them, but do not count them as
proof. Sort each failure into a test fault or a code fault before you change anything. Report
both counts, for example "all 5 fail without the fix, all 5 pass with it".

## Flakes and test isolation

A test that passes alone and fails in the suite almost always reads shared state. Find the state;
do not add waits.

1. Run the file alone and in the full suite. Then run it 20 times with 1 log per run
   (`scripts/repeat_run.sh`) and count the failed runs.
2. List the shared state: fixed `user://` paths, static vars, autoloads, live signal handlers and
   lambdas, node meta, timing budgets, and global input state.
3. Give every file that a test writes its own path under a per-process folder (`scratch_path()` in
   `scripts/test_case.gd`). Give each tool run its own save. Turn telemetry and analytics off in
   test runs. Why: 2 suites from 2 worktrees share 1 user folder.
4. Give each stateful autoload a reset function. Call it from the runner before each test file
   (`reset_tests.gd`), and in the setup of any test that opens a screen that reads it. Save
   global state in `before_each` and restore it in `after_each`. Clear lambdas in `after_each`.
5. In signal handlers, check an `active` flag. Do not call a reset that fires signals with side
   effects. Load an empty save, then the target save, instead.
6. For a flake, form 1 hypothesis and add 1 diagnostic print of expected against actual. If the
   cause is a selection rule (for example "the first match in dictionary order"), fix the rule
   and add a test for that case.
7. For timing tests, wait on timers, not frame counts; headless frames run faster than real time.
   Wait for tweens to end before you assert. Scale a time budget by a measured load factor, and
   prove the test still fails with a deliberate busy loop.
8. To prove isolation, run 2 full suites at the same time from 2 copies of the project. A FAIL
   in only 1 run shows a shared file.
9. Keep a short, named list of allowed flaky tests. Allow no other failure. A flake that repeats
   gets its own fix, confirmed by 20 green runs in a row plus 3 green full suites.
10. A failure with a state cause is not a flake. Compare with the base commit first.

## Leaked at exit

A clean exit is part of a pass. A suite that prints "leaked at exit" or RID leak lines is not clean.

1. Note the leak count. Run the suite with `--verbose` to list the leaked objects by type.
2. Run the same suite on the parent commit in an isolated export (export, import, run) with the
   same engine build. If the parent is clean, the leak belongs to your branch.
3. Search for the leaked type. Check static caches and preloads that hold nodes. Check that every
   test frees its nodes, meshes and materials.
4. Bisect with the filter: by folder, then by file. The filter matches file paths, not test names.
5. Change 1 cause at a time. Restore every experiment that does not change the count.
6. Fix the owner: free the node, create it only when used, or break the cycle. Run the full suite
   until no leak line prints.

A known trap: a static function whose return type is its own class can form a reference cycle.
Return an untyped value and let callers cast. Another: a headless "leak" can come from the
placeholder renderer; confirm a render leak in a window run.

## Test audit: data echo

Tests should assert rules and relations, not copies of data tables or tuned numbers. A test that
recomputes the expected value from the same table proves nothing and breaks on every valid tuning
change. Audit a suite in 4 phases.

1. **Baseline.** Import, then run each folder with `--list-unchecked`. Record passed, failed,
   skipped and unchecked per folder. Count tests per file so the verdict table covers every
   test. An unchecked hit is a candidate, not a verdict; a test can check through `fail()`.
2. **Verdicts.** Ask 4 questions of each test. Can it fail when the game is wrong? Does it check a
   rule and not a copy? Does it survive a valid tuning change? Is it a duplicate? Write 1 verdict
   (keep, rewrite, remove, merge) and 1 reason per test before any edit.
3. **Second pass.** Grep for equality and near-equality asserts whose expected side reads a data
   table, a rules dictionary, or a literal next to a data key. Give each hit its own row. Keep a
   hit when it is test-owned fixture data, a behaviour end point, or a numbered design rule (cite
   the rule). The hit count must equal the row count.
4. **Rewrite.** Replace a pinned value with a relation, an order, a monotonic property, a bound
   read from data, or a player-visible effect. Loop over the data table, not a pinned id list.
   Assert "non-empty and unique" instead of an exact row count, so new content does not break it.
5. **Proof.** For each rewrite, copy the data or code file aside, make the smallest break (for
   example a duration of 0), run the focused test and record the FAIL line. Restore from the copy
   and check with `shasum` or `diff -q`. Never re-type the original by hand.
6. **Close.** Sample keep reasons at random and check them. Check that no rewrite dropped a check.
   Run the parse check and every folder again; counts match the baseline except removed tests.

When a planned change or a merge breaks old tests: reproduce each failure, write the test's intent
in 1 line, and probe real values with a temporary test. Decide "stale test" or "wrong code". For a
stale test, change only the expected values, keep the intent, and add 1 assert for the new rule.
Grep for fake classes that copy a changed signature. A pass with 0 edits is a valid result.

## Input injection

Drive menus and the player through the same input actions a real player uses.

1. Use only `ui_*` actions in menu code, so keys, pads and tests share 1 path.
2. In a test, press the action, step 1 or more frames, then release it (`tap()` in
   `scripts/test_case.gd`).
3. Step 1 more frame after a release before the next press. Why: without it the code sees no new
   press edge, and the second tap is lost.
4. For captures and bot runs, reuse the steer code that presses the real move actions.
5. Restore global input state (device family, glyph set, focus) in `after_each`, so a failed test
   does not change later tests.
6. The default `ui_accept` and `ui_cancel` have no joypad events. Let 1 owner change the input
   map; everyone else tests through action injection.

## Route trace regression test

Use this when a player reports that a screen shows the wrong state and several menu routes lead to
that screen.

1. List every route to the screen.
2. Write 1 test with 1 case per route. Each case prints 1 fixed-prefix log line with the route
   state and the shown state.
3. Run it and save the log lines as evidence.
4. Decide with the owner whether the result is a bug or the design.
5. Add cases for routes that change the state with no player choice: focus on open, hover from a
   resting pointer, restored selection. Fix each one test-first.
6. Keep the test as a regression test.

A known trap: a hover signal fires from a pointer that rests over a card when the screen opens.
Take focus from the mouse only on real mouse motion.

## Finish gate

Run this gate before a unit of work reports done or ready to land.

1. Merge the newest base branch. Resolve conflicts before any test; a suite on a file with
   conflict markers is not valid. When 2 units add rows at 1 place, keep both. Regenerate
   generated files.
2. Run the import.
3. Run each design model or data check. Compare its FAIL lines with the base; your change adds
   none. Confirm the data exporter writes no change, or restore its output.
4. Run the full suite. Record passed, failed, skipped and any leak line.
5. Run the window gate on each renderer, if the project has one. Grep all PASS and FAIL lines,
   not only the tail.
6. Run `git diff --stat <merged base commit>`. It lists only your files. Review your own diff once.
7. Check that `git status` is clean, that staged renames are committed, and that none of your
   Godot processes still runs. Match the real binary path, not the word "godot".
8. Report exact counts, the commits and open items. Name each base failure and show that your
   diff does not touch it.
9. If the base moves during the gate, merge again and repeat steps 2 to 5.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Hundreds of failures after a merge | Stale import or class cache | Import, then run again |
| Failures from conflict markers | Suite ran on an unresolved merge | Resolve the merge first; discard the result |
| Runner green with 0 tests | No skip state; no 0-test rule | Count skips; exit 1 on 0 tests |
| Filtered run ran the full suite, or 0 tests | Wrong flag or a comma list | Check the passed count before you report |
| 1 bad file fails dozens of tests | Typed var with an untyped value | Parse check names the file; add a type |
| Test file does not load | Class name not in scope | Add a `preload` const in the test |
| Whole test file fails to parse | Multi-line lambda, bad string escape | Plain helper function; plain string |
| Wrong helper name | Guessed API (`assert_equal`) or clash with base | Read the base class; unique helper names |
| Async helper did nothing | Called without `await` | `await` it |
| Node name compare fails | `name` is a `StringName` | Compare `String(name)` |
| Local var acts odd | It shadows a node property (`scale`) | Rename the local |
| Inner class cannot call outer statics | GDScript scope rule | Pass values in from the outer code |
| Packed array edit has no effect | You edited a copy | Assign the whole array back |
| `node.get("CONST")` returns null | `get` does not read script constants | Read the script's constant map |
| JSON number compare fails | JSON loads numbers as float | Compare as float or cast on load |
| Float compare fails | float32 loops, darkened colours | Tolerance about 1e-3, or 1/255 for colours |
| Angle test fails near a wrap | Angle wraps (for example -90 to 270) | Compare with `fposmod` |
| Recolour changed other sprites | `Texture.get_image()` shares the image | Recolour a copy |
| Message queue overflow | Thousands of steps with no idle frame | Let 1 frame pass per second of steps |
| HUD crash in a test | Huge test capacity built 1 tick per unit | Zero the drain instead |
| Scenario ends before the check | Test damage too large after a data change | Keep test inputs small |
| Test passes for the wrong reason | Wrong reference point | Step frame by frame; measure at the event |
| Rule never exercised | Inputs reach it rarely | Add inputs that hit the rule; prove with a mutant |
| Test stops before the event | Time cap on the loop | Cap the step count |
| Position wrong at frame 0 | Camera or spawn not settled | Wait for the event; add a 1-tick margin |
| 2 events in 1 frame | 1 replaced the other | Fire them in separate frames |
| Object always moving hides the effect | No control case | Compare a twin in and out of the effect |
| Capture hangs headless | Headless never draws | Skip headless; free the scene on wait |
| Dummy renderer returns no instance data | Logic lives in render code | Move it to a pure function; test that |
| Test reads stale log | File not flushed | `flush()` before the read |
| World vs local units mix | Test used world coordinates | A helper reads spots from world data |
| Test sends telemetry | Demo scene logs in tests | Turn telemetry off in test runs |
| Tool ran with the suite | Tool file had the `test_` prefix | Rename the tool |
| Base copy fails with missing file | Partial copy | Copy every folder the check reads |
| Test value looks like a code bug | Wrong expectation | Read the real rule; fix the test value |
| Suite prints nothing on macOS | `timeout` is not installed | `perl -e 'alarm N; exec @ARGV' ...` |
| Glob not expanded in grep | zsh glob in `--include=*.gd` | Quote the glob |
| Random test fails 1 in 5 | Unseeded random draw | Seed the draw |
| Check has a 1-frame margin | Timers run before tweens; fast headless frames | Wait on timers; wait for tween end |
| Next test sees old tuning | Static var leaked | Restore it in `after_each` |
| Save tests fail in every run | Another branch wrote a newer save version | Per-run scratch saves |
| Focus test flakes 11 of 20 | Selection by dictionary order | Pick by a stable rule; test the tie |
| Bugs reached the build | Lands ran only named folders | Full suite at verify |
| `/tmp` copy fails to start | No or stale imported cache | Import, then copy |
| Window gate fails once, passes next | Known gate flake | Log it; run twice; fix the gate later |
| Skips look like passes | Runner counts skips as passes | Count skips separately |
| Fail-safe path not checked | Runner ignores warnings | Count warnings in that test |
| Output folder ignored or unwritable | Ignore rule or sandbox | Write under the tests folder with `.gdignore` |
| Game loads a backup save | Test save missing | Write the test save in setup |
| Leak count did not change | Wrong suspect (free, type refs) | Self-typed static cycle; return untyped |
| Second tap lost | No frame between release and press | 1 frame after release |
| HUD tests fail in suite only | Pad test left device family set | Reset input state in `after_each` |
| Rewrite lost a real check | Audit dropped an assert | Add it back; prove it with a break |
| Data change breaks row tests | Exact row counts | Assert non-empty and unique |
| Rewrite fails on valid rows | Optional field empty by design | Read the data contract |
| Hidden changes after a mutant | Hand edit to restore | Restore from copy; compare a hash |
| Backup files left in tests | Save rotation in a test | Clean in `after_each`; check `git status` |
| Timing test fails under load only | Machine load | Record load; rerun alone |
| Test passes under 1 filter only | Order dependence | Run under 2 filters and on the base |
| Wrong screen state on open | Hover from a resting pointer | Take mouse focus only on real motion |
| Process check finds false hits | `pgrep -f godot` matched shells | Match the real binary and its folder |
| Base moved during the work | Long unit | Merge again; repeat the gate |
| Generator wrote outside scope | Model run side effect | `git checkout` that file |
| Merge blocked by a `.uid` file | Import made a local copy | Delete the local copy |
| Merge blocked by a rename | Staged rename not committed | Commit the rename first |
| Diff shows other work | Base tip moved after the merge | Diff against the commit you merged |
| New guard test fails on your files | Merge brought a new rule | Ask the owner before you edit outside scope |
| Test in another unit's file breaks | Change by design | Ask the owner before you edit it |
| Hung run at full CPU | 1 test never ends | Find it by process and last log line |
| Out-of-scope stale test found | Parse check reads everything | Report it; ask for ownership of that file |

## Artifacts to build

- **Test runner** (`scripts/run_tests.gd`): a `SceneTree` script; `--filter`, `--list-unchecked`;
  fails on engine errors; counts skips; exits 1 on 0 tests; calls an optional per-file reset hook.
- **Test base class** (`scripts/test_case.gd`): counted asserts, `skip()`, `skip_if_headless()`,
  `add_node()` with auto-free, `frames()`, `seconds()`, `tap()`, `scratch_path()`.
- **Reset hook** (`res://tests/reset_tests.gd`): a static `reset(tree)` that resets each stateful
  autoload and points saves and settings at scratch files. Do not prefix it with `test_`.
- **Parse check tool**: a headless script that loads every script and scene and prints checked and
  failed counts with file names.
- **Repeat-run loop** (`scripts/repeat_run.sh`): N runs of 1 filter, 1 log per run, a fail count.
- **Test spot helper**: reads test positions from level data, so tests survive layout changes.
- **Baseline report template**: date, base commit, passed/failed/skipped, known failures with
  cause, leak line, and the final counts beside them.
- **Audit notes template**: Baseline, Verdicts (1 row per test), Second-pass rows, Rewrite proofs,
  After.
- **Allowed-flake list**: test name, cause, owner, date added.

## Related skills

- `headless-godot-runs`: import and parse hygiene, tool save isolation, process cleanup. Run its
  checks before this loop.
- `visual-verification`: the window gate and real captures for tests that skip headless.
- `safe-refactor-and-review`: proof that a refactor keeps behaviour, and review fix waves.
- `fleet-game-dev`: the worktree unit flow, landing, and the orchestrator's check of done claims.
  The finish gate here is the last step of that flow.
- `release-and-store`: controller input support and the input map that tests inject into.
- `balance-model-data`: the same negative-test proof for checks of design docs against data.
- `godot-perf`: frame-cost budgets and stress harnesses beyond a single cost test.
