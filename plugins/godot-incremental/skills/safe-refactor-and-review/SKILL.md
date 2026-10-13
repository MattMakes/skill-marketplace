---
name: safe-refactor-and-review
description: >-
  Prove that a code change in a Godot project keeps behaviour unchanged, find every site that
  enforces a rule before you change it, scan the code base for measured fix candidates, run
  read-only reviews whose numbered findings small fix units close, and isolate render or feel
  bugs whose cause is unknown. Use it whenever someone refactors gameplay, draw, mesh, model or
  save code; makes hot code faster; switches a renderer or a render path; adds a mode behind a
  flag; moves, renames or deletes a function, constant or rule; asks "did this change anything",
  "is this dead code", "what should we clean up", "review this build" or "why does this draw
  nothing / feel wrong / judder"; or sees a measure that differs from a recorded table. Use it
  even if nobody says "refactor", "golden trace" or "code review".
---

# Safe Refactor and Review

A refactor in a game breaks things quietly. A renamed private function still has a caller that
uses a string. A speed fix changes a score at float precision. A view and the game logic decide
the same rule in two places and drift apart. The method is simple: record a deterministic
reference before any edit, change one item at a time, and compare the reference by hash after
each item. Find every caller and every copy of a rule first, so that the proof covers the whole
change. This works because a byte-equal trace from a seeded, fixed-step run is a proof that a
test suite alone cannot give: tests check what someone thought of, and the trace checks
everything the game did.

## When to use

- A refactor, a code move or a rename must leave game behaviour unchanged.
- A speed fix in hot code must give the same game results.
- A renderer switch, a draw-path change or a mesh-builder change must give the same pixels or
  vertices.
- A new mode goes in behind a flag, and the old mode must stay identical with the flag off.
- You delete, move or change a name, a rule or a mechanic that several code paths use.
- A measure today differs from a landed table, and you must find whether your tool or a later
  game change caused it.
- You want a ranked, measured list of safe code fixes before a cleanup.
- Someone wants a read-only expert review of a build, with findings that fix units close.
- Something draws wrong or nothing, or feels wrong, and the cause is unknown.

## When not to use

- The change is meant to alter behaviour (a balance change, a new mechanic). Use tests for the
  new behaviour instead, and a reference only for the parts that must stay.
- You only need frame timings. See `godot-perf`.
- You only need pixel comparisons of UI states. See `visual-verification`.
- The failure is a known flaky test or an exit leak with a known shape. See `godot-testing`.

## Method: behaviour identity proof

1. **Record the test baseline.** Run the full suite and the focused filters for the affected
   files. Save each pass, fail and skip count. Check: the counts are in a file, not only in your
   scroll-back.
2. **Pick the reference by code type.**

   | Code type | Reference |
   | --- | --- |
   | Gameplay logic | A per-tick trace or a path recording: seeded input, fixed ticks, fixed fps |
   | Hot gameplay code | An event log (1 line per spawn, hit, kill, drop) or a SHA-256 digest per state |
   | Draw code | Window captures of fixed states |
   | Mesh code | A digest of vertices, normals and UVs |
   | Model or table code | A dump of the computed tables or the simulator output |
   | Save code | A fixture save written with the old code, plus a test that loads it |

   Check: the reference covers the events that matter. If a scenario has no kill, add 1 fixed
   enemy, so kill events enter the proof.
3. **Remove drift.** Use the same seed, a fixed frame rate and no delta smoothing. Pin every
   timing setting that can vary, for example hit-stop. Make the baseline twice and diff the 2
   runs. Check: the 2 runs match byte for byte. If they cannot match, record the normal spread
   and say so in the report. A proof against a noisy reference proves nothing.
4. **Keep an exact base copy.** Extract the base without a git write:
   `git archive HEAD <project dir> | tar -x -C <temp dir>`. A detached worktree also works. For
   a single script, save the old file under a temp path and strip its `class_name` line, so the
   2 versions do not clash. Run the Godot import in the copy once. Check: the base copy gives the
   baseline reference.
5. **Find every caller.** Search the whole repository for each name you move or delete. Include
   string calls and tools outside the game folder. See "Find every enforcement site" below.
   Keep private forwarders or aliases for callers that you may not edit.
6. **Change 1 item per commit.** After each item, compare the reference by hash or `cmp`, and
   compare the test counts. Check: the hashes are equal, and the counts are equal plus only your
   new tests.
7. **For a speed change, run pairs.** Run the base probe and the changed probe back to back
   with the same seed. Equal hashes prove identity. The median and the worst case of each pair
   show the gain. Report only paired results, because machine load drifts between runs. Reject
   a change that alters any result, even at float precision.
8. **Turn a path recording into a regression test.** Record the fixture on the old commit.
   Replay it in a test. Check: change 1 constant and watch the test fail. A replay test that
   cannot fail is decoration.
9. **Put a new mode behind a flag that is off.** Run the full suite with the flag off. Add tests
   for the mode with the flag on. Reset the flag at the end of each test that sets it, because a
   leaked flag changes later tests.
10. **Check warnings.** Run the warning check on the base and on your branch. Check: your files
    add 0 warnings.
11. **When an outcome differs, find the first difference.** Diff the event logs or the telemetry
    to the first line that differs. The first difference names the cause. Later differences are
    only its echo.

## Find every enforcement site

Use this before you delete, move or rename a name, or before you change a rule or a mechanic.
A rule that lives in several places drifts when you fix only 1 copy.

1. List every name you delete or move. List every key and gate field of the rule you change.
2. Search the whole repository, not only the game folder. Use whole-word matching:
   `git grep -w <name>` or `grep -rw <name> .`. Do not use `\b` with `git grep -E`, because
   some platform builds give no hits for it.
3. Also search for string calls: `"<name>"` near `.call(`, `get(`, `set(`, `has_method(`,
   `connect(`. Also search for built names, for example `"_on_" + kind`.
4. Test the search pattern on a name that you know exists. An empty result from a broken
   pattern looks like proof that the name is unused.
5. Write each enforcing path in your notes with the file and the function. Note how each copy
   differs from the others.
6. Keep every name that a tool calls. For a moved constant, keep an alias in the old script.
7. For a rule that a view and the logic both decide (open, locked, buyable), move the rule to 1
   helper on the logic side. Make the view, any demo copy and the tools call that helper.
8. Write a parity test. It walks every item over real save snapshots (fresh, mid-game, full) and
   asserts that the view state equals the logic answer. Check: the test fails on the old view.
9. For a removed or changed mechanic, write failing tests for the new behaviour first. Then
   change or remove each listed path.
10. Run a parse check over every script. It finds stale references that the search missed. Ask
    the owner before you edit a stale test outside your scope.

Set test fixtures so that only the rule under test is shut. A fixture that shuts 2 rules at
once passes for the wrong reason.

## Find the cause of a changed measure

Use this when a measure today differs from a table that someone landed earlier.

1. Run your tool and the old tool on today's game, with the same state and the same seeds.
2. If the old tool also differs from the table, the game changed, not your tool. Extract the
   game at the landed commit: `git archive <hash> <project dir> | tar -x -C <temp dir>`.
3. Import that copy once. Run your tool on it. Check: it gives the landed table.
4. List the commits between the landed commit and today that touch the game.
5. Bisect: extract a middle commit and measure. Repeat until you find each change that moves
   the result.
6. Write each cause with its commit and its effect.

If a check uses a relative path, the scratch copy fails. Link the missing folder into the copy.

## Code health scan

Use this for a measured, ranked list of safe fixes before a cleanup: warnings, dead code, unused
signals, large functions, module coupling.

1. Run the headless import and a parse check over every script.
2. Copy the project to a scratch folder without test output.
3. Turn on every GDScript warning kind in the copy's `project.godot`. Headless runs print no
   parser warnings, and the editor ignores `override.cfg` for warnings.
4. Start the Godot language server on the copy. Open each script and save each warning
   diagnostic as 1 JSON line. Group the warnings by kind and by scope (game, tests, tools).
   Separate the default-on warnings in game code from the rest.
5. Run a metrics script: lines and branch count per function, duplicate blocks, magic numbers.
   Sort functions by branches, then by lines.
6. For each dead-code candidate, search the whole repository for string calls and built names.
   A name that a string calls is live.
7. Run a signal audit: signals that code emits but nothing connects, and the reverse.
8. Write a layout evidence script: folder sizes, autoload references, calls between modules.
   Check each apparent cycle in the code. Drop matches in comments; most apparent cycles are
   comment matches.
9. Review each module: purpose, size, callers. Propose extractions (pure logic out, deeper
   interfaces) with size and risk. Add a deletion test (what breaks if the module goes) and a
   do-not-fix list.
10. Map each fix candidate to the tests that cover it. Rank fixes by size and risk. Size each
    fix for 1 worker. Mark extractions that must wait until busy branches merge.
11. Verify each claim before you send the report: API signatures, the cause of each warning
    kind, each line number.

## Review units and fix waves

Use this when a lead wants a read-only expert review of a build (code, UI, performance, QA,
systems, balance, product), and small fix units then close the findings.

1. Name the rubric and its references in the review plan. The reviewer works read-only at a
   named commit. A review of a moving tree cites files that are not there.
2. Run the import and the full suite first. Record the counts.
3. Judge the build at its stage, for example a prototype. Keep component quality apart from
   integration readiness. Passing component tests with a placeholder main scene is its own
   finding.
4. Read the core systems, the UI and the tests against the contracts. For a product review,
   play the build with an autoplay harness as a fresh player and as a mid-game player. Capture
   each UI screen.
5. Confirm each suspected bug with a probe outside the repository. Trace each surprising number
   to its code.
6. Send a cause that a running unit needs to the lead at once. Do not hold it for the report.
7. Write the report: a 5-line summary, a score table, then findings ranked blocker, major,
   minor. Each finding has an id (for example `RS-07`), the file and line, why it matters at
   this stage, and a fix small enough for 1 worker. Quote the rubric rule text.
8. Check every line citation and the id count. Report the count per severity. Do not rank a
   style nit as major.
9. The lead gives each fix unit a short list of ids and a file list. A finding that shows a
   plan step is wrong overrides the plan, and the lead says so.
10. The fix worker writes 1 failing regression test per finding, fixes it and runs the focused
    tests. See `godot-testing` for proof that a test can fail.
11. When a fix makes a test outside the worker's scope stale, the worker reports it as blocked,
    with the line, and waits for a grant.
12. The worker runs the full suite and checks that only its files changed. It writes a notes
    file that maps each id to the change, the test and the result. Its report lists each id as
    closed.

## Render and feel bug isolation

Use this when something draws wrong or draws nothing (a shader effect, a trail, an overlay),
or feels wrong (uneven steering, judder), and the cause is unknown.

1. List the candidate causes from the report.
2. Write a small probe outside the repository that sets up the case in the real project. Print
   the effect state, so you know the effect is on.
3. For a shader, back up the file. Route the suspect value into a strong visible output for 1
   run. If nothing shows, set that output to a constant. This splits "the data does not arrive"
   from "the output path is broken". Test each slot of an array uniform alone.
4. For a material that draws nothing, build 2 or 3 variants that each drop 1 feature (stencil,
   depth test, blend). Capture each. Keep the variant that draws.
5. Hide nodes or set a parameter to 0, 1 at a time. Count the changed pixels in a crop. Use a
   diff map between frames to find an effect that moves, because a small lift on bright pixels
   is hard to see by eye.
6. Repeat the captures on the second renderer if the game ships two.
7. For a feel bug, write a table tool that measures the isolated system per direction or case.
   Then write a tool that drives the real scene with the real input actions. Compare world
   values with screen values. Dump the internal state that each suspicion depends on, for
   example a mask image.
8. For a leak line at exit, check that the base commit has none. Bisect commits, then single
   changes. Run the leaking test with `--verbose` to list the leaked objects. See
   `godot-testing` for the full leak hunt.
9. Test the fix hint in the probe before you send it. Send the cause, the numbers and the
   tested hint to the owner, or ask for the decision, before you change shared code.
10. Take a reference before the fix (see the Method). Fix with regression tests. Run the table
    tool again. Restore every debug edit.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Two identical runs of a fight check give different results | The check is not deterministic | Use a deterministic trace as the proof, not the fight check |
| Two base runs give, for example, 90 and 96 hits | Frame timing noise | Fix the frame rate, turn off delta smoothing, run the base twice to measure the spread |
| The seed differs after a change | A new start rule uses the random generator | Diff the telemetry to the first event that differs |
| A rewrite with cached trig changes scores slightly | Float precision | Reject it; keep only changes that are identical and win in paired timing |
| A later run is faster in unchanged code | Machine load drift | Report only back-to-back pairs |
| The identity proof has no kill events | The scenario kills nothing | Add a fixed enemy to each case |
| A golden compare fails on float rounding | The reference holds floats | Compare with a stated tolerance where the reference is float |
| A batching switch changes a few pixels in some pairs | Draw order or precision | Report the exact pixel count and decide; do not call it identical |
| Tests outside your file list fail after a rename | They call the old name through `call()` | Search string calls first; keep private forwarders |
| A rename breaks the parse | The new name already exists in that scope | Run the parse check; pick a new name |
| The suite fails after a move | A test calls a moved private function | Search the tests for every moved name before the full suite |
| A capture diff appears in a "pure cleanup" commit | The cleanup changed a draw argument | Capture again before that commit; keep cleanups in their own commits |
| `git grep -E '\bname\b'` finds nothing | `\b` is not portable | Use `git grep -w` |
| An image diff script fails to start | The imaging library is not in the default Python | Use another Python, or ImageMagick `compare` |
| Your new tool shows a gap against an old table | A later game change, not the tool | Run the old tool on today's game first |
| A probe run with `-s` fails to compile | It names class names before autoloads exist | Load game scripts at run time with `load()`; see `headless-godot-runs` |
| A dead-code search misses callers | It covers the game folder only | Search the whole repository, including tools |
| A rule fix leaves drift | The rule has several copies (logic, view, demo, tool) | Map all copies first; move the rule to 1 helper |
| A parity test passes for the wrong reason | The fixture shuts 2 rules at once | Shut only the rule under test |
| A test outside scope names a removed constant | The constant moved | Ask for a grant; make the test read values from data |
| Headless runs show no parser warnings | The runtime does not print them | Read them from the language server |
| `override.cfg` does not turn on warnings | The editor ignores it for warnings | Edit `project.godot` in a scratch copy |
| A "dead" function is live | A string-built call reaches it | Search string calls and built names first |
| The layout scan shows many cycles | Matches in comments | Verify each hit in code |
| The warning check prints every kind | No filter | Filter to the kinds the plan names |
| A review cites a file that is not in the tree | The tree moved during the review | Review at a named commit |
| A citation points at the wrong line | No check pass | Check every citation before you report |
| Component tests pass, but the game is not playable | The main scene is a placeholder | Rank the integration gap as its own finding |
| A fix for 1 finding counts a case twice | The test did not pin the exact count | Report to the owner at once; assert the exact count |
| A copy change breaks an assertion in another unit's file | Scope | Report blocked; wait for the grant |
| A shader push does not show | A helper (for example a distance function) returns 0 | Test the helper alone through a visible output |
| A light lift is invisible in bright areas | Most pixels are already bright | Judge with a diff map |
| A palette snap maps a tint to an unexpected colour | Nearest-colour search | Compute where each colour lands |
| A hash gives negative angles | `%` keeps the sign | Use `posmod` |
| Steering drifts off the diagonal | A short key-release gap between ticks | Add a short release grace with a test |
| The first suspect is wrong | A guess, not a measure | Dump the internal state the suspicion depends on |
| A fix hint uses an API that does not exist | The hint was not tested | Test each hint in the probe first |
| A stencil pass draws nothing | Renderer limits | Try a variant, for example an inverted depth-test silhouette |
| A leak line at exit after a refactor | A static function casts to its own class and makes a script cycle | Use untyped access |

## Artifacts to build

- **A trace tool:** a headless script that drives the real systems with a fixed seed and fixed
  ticks and writes 1 line per tick or per event. Write a SHA-256 file next to the output.
- **An event logger:** connects to the game signals that matter and writes 1 JSON line per event.
- **A first-difference tool:** compares 2 event logs and prints the first line that differs.
  `scripts/first_diff.py` in this skill does this, with an optional float tolerance.
- **A base-copy command:** the `git archive ... | tar -x -C <temp dir>` line plus the import
  step, written once in the project's dev notes.
- **A replay test:** loads a path or input recording made on the old commit and asserts the
  same result.
- **A mesh digest tool:** hashes the vertex, normal and UV arrays of each built mesh.
- **A save fixture test:** a save file written by the old code and a test that loads it.
- **A warning collector:** a standard-library client that talks to the Godot language server
  and writes 1 JSON line per diagnostic.
- **A metrics script:** function lines, branch counts, duplicates and magic numbers per script.
- **A signal audit script:** emitted versus connected signals.
- **A layout evidence script:** folder sizes, autoload references and calls between modules.
- **A search checklist:** 3 lines: whole-word search, string-call search, a pattern test on a
  known name.
- **A view-logic parity test shape:** every item, every profile, several save snapshots, view
  state equals logic answer.
- **A review report template:** summary, score table, findings with id, severity, file and
  line, stage reason, fix.
- **A fix notes format:** 1 row per finding id: change, test, result.
- **A probe template:** a script outside the repository that sets up 1 case, prints the
  effect state and captures or measures it.

## Related skills

- `godot-testing`: the test loop, proof that a regression test can fail, flaky tests and the
  full exit-leak hunt. This skill uses its tests as one half of the proof.
- `headless-godot-runs`: the flags and tool-script rules that a trace or probe run needs.
- `bot-balance-loop`: deterministic bot fights. Its determinism flags are the same ones this
  skill uses for a trace.
- `godot-perf`: timing A/B runs and frame-cost maps. This skill proves identity; that skill
  measures the gain.
- `visual-verification`: real window captures and the pixel-diff noise floor for draw-code
  proofs.
- `balance-model-data`: parity between a balance model and the game, when the reference is a
  model output.
- `fleet-game-dev`: scope grants, blocked reports and the land protocol around fix units.
