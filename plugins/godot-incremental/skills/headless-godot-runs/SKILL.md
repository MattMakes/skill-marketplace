---
name: headless-godot-runs
description: >-
  Run Godot 4 tools, probes, bots and checks headless so that they compile, end by themselves,
  report errors honestly and never touch the player's save. It covers `godot -s` SceneTree tool
  scripts (no class names, autoloads by node path, a quit watchdog), the import and parse check
  after a merge or a new worktree, a throwaway check project when the real one cannot load,
  save and settings isolation for tool runs, a dev task runner, time limits, log scans and
  process cleanup. Use it whenever someone writes or runs a `godot --headless` or `godot -s`
  script, or asks why a tool says "Identifier not found", "Could not find type", "Nonexistent
  function 'new'" or "no resource loaders", why a headless run hangs or gives silent wrong
  numbers, why tests fail after a merge, or how to keep bots and tests off the real save, even
  if nobody says "headless".
---

# Headless Godot runs

A headless Godot tool fails in quiet ways. A `godot -s` script compiles before the autoloads
exist, so 1 class name in it can stop a script from compiling, and the run still exits 0 with
wrong numbers. A stale import cache, a hang after a script error or a shared save file gives
the same kind of quiet fault. The method is a short set of rules for the tool script, plus a
run wrapper that adds a hard time limit, a log file and a scan for error lines. It works
because each rule closes 1 failure that the engine does not turn into an exit code.

## When to use

- You write a SceneTree tool: a bot, a measure probe, a capture, a bench, a fixture maker, a
  data export or a parse check.
- A headless tool or test fails with a compile error, a parse error, a hang or a value that
  looks wrong.
- A new worktree, a merge, a branch switch, a new `class_name` or new art reaches a checkout.
- Tests, bots or captures start the real game on a machine where a person also plays it.
- Several headless runs share 1 machine or 1 `user://` folder.

## When not to use

- Window-only work: captures, real frame timings, shader looks. `frame_post_draw` never fires
  headless and the headless renderer is a dummy. Use `visual-verification` or `godot-perf`.
- The test loop itself (filters, test quality, the finish gate). Use `godot-testing`.
- Locks, slot pools and worktree landing across many agents. Use `fleet-game-dev`.

## Method: write and run a SceneTree tool

1. Start from `scripts/tool_template.gd`. Write the entry as `extends SceneTree`. Name no
   `class_name` script and no autoload in it, and keep game objects in untyped variables.
   Check: the file has no game class name and no autoload name outside a string.
   Why: a `-s` script compiles before the autoloads exist, so a name that needs them fails.
2. Do no game work in `_initialize()`. Defer it to the first frame. If the game reads a save
   path at start-up, set the scratch save slot before the run (see "Tool save isolation").
   Check: the work starts from a `process_frame` callback or later.
3. Reach each autoload at run time with `root.get_node("<Name>")` and `call()`. Load game
   scripts with `load("res://...")` at run time, not with `preload()` or a class name. Use
   enum numbers, not `SomeClass.State.VALUE`.
   Check: grep the tool for `preload(` and for each autoload name followed by `.`.
   Why: a tool that names a game enum can stop the game script itself from compiling.
4. For a larger tool, split it. A thin `-s` loader instances a stage `Node` script after
   start-up, and the stage uses the game normally because it compiles after the autoloads.
   Check: the loader holds no game names; only the stage does.
5. Give the tool its own quit watchdog, and wrap the run in a hard alarm as well.
   Check: a run with a forced endless wait ends with `TOOL_TIMEOUT` and a nonzero code.
   Why: a script error stops the normal `quit()`, and the run hangs.
6. Keep tools in a tools or review folder, never as `test_*.gd` in the test folder. Run them
   with `-s <absolute path>`.
   Check: the test runner does not list the tool.
   Why: a test runner runs every `test_*.gd` file. A tool outside the project needs no `.uid`.
   If a tool must be under `res://`, copy it in for the run and remove it after.
7. Parse-check the tool before its first real run. Run it once on a tiny input, or run the
   project parse check (`scripts/parse_check.gd`) when the tool is under `res://`.
   Check: the log has no `SCRIPT ERROR` line.
   Why: `--check-only` has no autoloads, reports false "Identifier not found" errors, and can
   exit 0 on a real parse error.
8. Run the tool through `scripts/godot-run.sh <seconds> <log> godot --headless ...`. It writes
   the log, stops the run at the alarm, and fails on error lines.
   Check: the exit code is 0 and the log holds the summary line you set in
   `GODOT_RUN_REQUIRE`. A sweep or calibration marks a run invalid on any `SCRIPT ERROR`.
   Why: a tool that failed to compile still exits 0 and prints plausible but empty results.
9. Run the import after a new `class_name`, a merge, a branch switch or new art (see the next
   section). Then rerun the tool.
10. Send fake input with `Input.parse_input_event()` and a real event, not a direct method
    call. Await 1 or 2 frames after you move an object before a staged call reads its
    position. In a SceneTree script, connect `node_added` on `self`. Guard calls that need a
    real display server with a feature check.
    Check: the game reacts to the event in the log, the same as for a player.
11. Apply the GDScript type rules that bite tools most:
    - A typed constant like `Array[PackedStringArray]` does not convert inner literals. Use
      plain nested Arrays and an `Array` loop variable.
    - A `const` cannot hold a function call. Use a `var` or a static function.
    - A packed array inside a dictionary is a value copy. Write it back or return it.
    - Write an explicit type where `:=` cannot infer one, for example a value from an untyped
      dictionary.
    - `PackedStringArray` has no `map()`. Use a loop.
    Check: the parse check passes and the tool prints non-empty values.

## Import and parse hygiene

The `.godot` folder holds the import cache and the global class list. A new worktree has none,
and a merge can leave it stale. Then scripts fail with "Identifier not declared", "Could not
find type" or "Nonexistent function 'new' in base 'GDScript'", and some runs hang at low CPU.

1. Check that the project `.godot` folder exists. In a new worktree, run
   `godot --headless --path <project> --import` under a time limit before any test. Check its
   exit code.
2. Run the import again after each merge, branch switch, new `class_name`, and new image or
   audio file.
3. Run the import a second time when the first pass reports "no resource loaders". Scripts load
   before the new files import on the first pass.
4. Run tests, tools or the parse check only after the import ends.
5. Run the project parse check after every merge, including merges that touch only docs. It
   loads every `.gd`, `.tscn` and `.tres` under `res://` and prints `checked=N failed=M`.
6. To see the error of 1 failing script, run it alone with `godot --headless -s <script>` or
   with `--check-only`. Remember that check-only lacks autoloads, so read its autoload errors
   as noise.
7. When a test fails with "Nonexistent function 'new'", look for an undeclared class name in
   that script. Import and rerun before you debug.
8. When a test says an autoload is null, read the first `SCRIPT ERROR` line. The autoload
   itself failed to parse.
9. List untracked `.uid` and `.import` files after the import. Commit those of your own
   scripts and assets with the change that caused them. Leave the files of other work alone,
   because each branch makes different uids.
10. Run `git status` after an import. Restore tracked files that the import changed and that
    your change does not own, for example an audio bus layout. Commit or save your own edits
    in that file first, because `git checkout <file>` reverts them too.
11. If an untracked `.uid` blocks a merge, compare it with the incoming copy. Remove the local
    one and merge again. If 2 branches added the same `.uid` with different content, keep the
    side that owns the script.
12. If a run hangs at about 1 % CPU, check for a missing `.godot` folder first. Then stop only
    your own process.

## Isolated check project

Use this fallback when you must check your own scripts or resources, but the real project
cannot load because a file that other work owns is missing or broken. Do not edit that file.

1. Make a temp folder with `mktemp -d`.
2. Write a minimal `project.godot` there, or `rsync` the project folder into it.
3. Symlink your own asset folder into it, or copy the missing data file from the other
   branch.
4. Run a headless import in the temp project.
5. Run a `-s` check script that loads each of your resources and scenes. The parse check
   script works here.
6. Report the result as an isolated check. Run the check again in the real project after the
   other work merges.

## Tool save isolation

Autoloads that read a save or settings file do it at start-up, before any `-s` script runs. A
tool, test or capture that starts the real game can therefore write the player's save, or read
another run's settings.

1. Find each autoload that reads or writes a save or settings file.
2. Add a run-mode check at its start. Script mode (`-s` before a lone `--`), test mode, and a
   start from a worktree path all count as tool runs. Tool runs use tool save and settings
   paths.
3. Read the tool save slot from an environment variable, for example `<GAME>_TOOL_SAVE=<name>`.
   Why: the environment exists before any autoload starts. A safe name (lower-case letters,
   digits and `-`) gives `user://tool-save-<name>.json`. An unsafe name falls back to 1 shared
   tool path.
4. Start every tool run with its own slot name. Give each parallel experiment and each copied
   tool its own slot. Rename the slot when you copy a tool.
5. Give tests a helper that returns a per-process scratch path and deletes it at exit. Add 1
   guard test that builds a separate node, not the autoload, and proves the path switch.
6. Hash the player's save before and after a tool batch or a suite. Equal hashes prove that
   the run did not touch it. Read the player's save for analysis only from a temp copy.
7. Give a human playtest mode and a demo build their own save paths. For a fresh start, move
   the old save aside. Start an exported build with an empty `HOME` to keep it off the real
   save.
8. Pin every setting that changes timing or visuals in the tool's own settings file, for
   example reduced motion or hit-stop. Why: a shared settings file once shifted event ticks by
   18 frames, for example.
9. For a test that fails only on some machines or only in parallel, run it alone. Then make 2
   scratch slots that differ in 1 key and prove the cause.
10. Delete your scratch slot files after the run. Clean tool saves by name only, and change
    nothing near the player's save.

## Run hygiene: flags, limits, logs, cleanup

1. Give every run an end of its own: a frame limit, `quit()`, `--quit-after <frames>`, or a
   hard alarm. On macOS there is no `timeout` command (exit 127), so use
   `perl -e 'alarm N; exec @ARGV' godot ...` or `gtimeout`. `scripts/godot-run.sh` does this.
2. Pick the alarm from a timed smoke run, and keep it shorter than your shell's call limit.
   Split long batches, for example 2 or 3 seeds per call.
3. Put the alarm on the Godot command only. A wait for a free slot or a lock outside the alarm
   must not eat the run's time, and an alarm around a wrapper can kill the parent but leave
   the Godot child alive.
4. Write output to a log file with an absolute path. A relative path breaks in a loop that
   changes folders.
5. Read the exit code from the run, not from a pipe. `echo $?` after `godot ... | tail` gives
   the code of `tail`. Use a log file or `set -o pipefail`.
6. Grep each log for `SCRIPT ERROR`, `Parse Error`, `FAIL`, the summary line and "leaked at
   exit". Treat an empty result or a missing summary line as a failure.
7. Pass 1 test filter per call when the runner does not split lists. Check that the test count
   is not 0, because a filter that matches nothing looks like a pass.
8. For deterministic bot runs, pass `--fixed-fps 60` and `--delta-smoothing disable` as engine
   flags before `--`. The engine consumes `--fixed-fps`, so the tool cannot read it from its
   user arguments. Prove the rate from ticks per frame.
9. Lower the priority of batch runs with `nice -n 10`. Do not lower it for timing runs.
10. Run 1 Godot process per agent unless a plan gives more. Do not start a second run while
    one waits or runs in the background.
11. Do not start a run with a bare shell `&`. Use a tracked background task with an end
    marker, or run it in the foreground.
12. In zsh, a variable that holds several flags does not split. Use an array or a shell
    function.
13. Before you report done, list Godot processes with `scripts/godot-procs.sh <worktree path>`.
    Match the binary and the path, not the text of your own command. Stop only your own
    processes. Report the others. Never start or stop the player's game.

## A task runner for dev commands

A project with many headless commands needs 1 list of them, so that each one runs the same way
for every person and agent.

1. Collect the existing commands from the notes and the tools folder.
2. Write a preflight script that checks the Godot version and the export templates.
3. Write a `justfile` or a `Makefile` with 1 recipe per command: import, parse check, tests,
   each platform build, the dist package, the visual gate, bot runs and asset generators.
   Make the default recipe list the others.
4. Put the time limit and the log scan inside the recipes, so that a caller cannot forget them.
5. Run each recipe once and read its failure message. Run destructive recipes, such as
   `clean`, as a dry run.
6. Add a commands section to the project README.
7. Test a `play` recipe with a stop signal: start it, wait a few seconds, and stop it.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Bots play the whole game but a scripted event never happens; every result is wrong for a day | 1 class name in the tool script stopped a script from compiling; the run still exited 0 | Load scripts with `load()` at run time; mark a run invalid on any `SCRIPT ERROR` line |
| "Identifier not found: <Autoload>" in a `-s` script | Autoloads are not compile-time names in a SceneTree script | `root.get_node("<Name>")` and `call()` |
| A game script stops compiling after a tool change | The tool named a game enum (`SomeClass.State.X`) | Use the enum numbers in the tool |
| A tool hangs until the alarm | A script error stopped `quit()` | A watchdog timer inside the tool, and a hard alarm outside it |
| A run hangs 25 minutes at about 1 % CPU | No `.godot` import cache in a new worktree | Stop your own process, import, rerun with narrow filters |
| About 50 to 70 tests fail on unknown classes after a merge | Stale class cache | Run the import, then the tests |
| "Could not find type" after a branch switch or a new `class_name` | The class is not registered yet | Run the import |
| "no resource loaders" for new audio or images | Scripts loaded before the new files imported | Run the import a second time |
| A batch gives empty logs after a merge | The import did not run before the batch | Import inside the batch script |
| Textures load at the old size after an art change | Stale import cache | Run the import |
| `--check-only` says "Identifier not found" on a correct script | Check-only has no autoloads | Use the project parse check or the related tests |
| `--check-only` exits 0 on a broken script | Check-only does not set the exit code | Use the parse check, which exits 1 |
| A test script's tests silently do not run | The script failed to compile: `:=` could not infer a type | Run the script alone; add an explicit type |
| The parse check misses a tool | The tool lives outside `res://` | Run the moved tool once on its own |
| An autoload is null in a test | The autoload failed to parse | Read the first `SCRIPT ERROR` line |
| A headless capture hangs | `frame_post_draw` never fires headless | Run captures in a real window |
| Headless frame timings look odd | The headless renderer is a dummy | Measure performance in a window |
| A display-server call fails headless | The headless server lacks it | Guard it with a feature check |
| A fake input does nothing | The tool called a handler directly | `Input.parse_input_event()` with a real event |
| A staged call reads an old position | The object moved in the same frame | Await 1 or 2 frames |
| `set_process(false)` has no effect | It ran before `add_child()` | Call it after `add_child()` |
| A parse error on a correct-looking line | A local name shadows a parameter or a signal (`finished`), or an override does not match the parent signature | Rename the local or the helper |
| A typed loop over a const of arrays gives empty values | A typed constant does not convert inner literals | Plain nested Arrays and an `Array` loop variable |
| "not a constant expression" | A function call in a `const` | Use a `var` or a static function |
| A change to a packed array is lost | A packed array in a dictionary is a value copy | Write it back or return it |
| A shader reads null | A uniform is not set in every build | Set every uniform |
| A tween test misses the first callback | The first step runs 1 frame late | Expect it 1 frame late, or set the first step in code |
| An animated child jumps back | Its container resets the offset | Put it inside a plain holder node |
| A colour test fails on a texture pixel | The atlas reads in linear space | Test a pixel that works in linear and sRGB |
| The project file loses lines after a generator tool | `ProjectSettings.save()` drops default-valued lines | Diff the project file and restore lost lines |
| An import changed a file you do not own | The import rewrites some resources | Restore that file; save your own edits in it first |
| A merge stops on an untracked `.uid` | 2 branches made different uids for 1 script | Compare, keep the owner's copy, merge again |
| A commit holds other work's `.uid` files | `git add` of a whole folder | Add only your own `.uid` files |
| New test files fail on `get_tree()` | The test base class exposes another helper | Use the test base's helpers |
| A capture wrote the player's save | It started the game without `-s` | Treat script mode, test mode and worktree paths as tool runs |
| A tool run read the player's settings | Autoloads read settings before the `-s` script ran | Set the slot from an environment variable |
| A saved setting leaked into a test | The helper set the path after `_ready` loaded settings | Set the path first, or reload defaults |
| Tests pass alone and fail in parallel | 2 runs shared 1 tool save or fixed file names | A slot per run; per-process scratch folders |
| A shared tool save from a newer version set a read-only flag | Runs shared 1 tool save | A scratch save per runner and per test |
| A capture used another run's reduced-motion setting | The capture queue started Godot without a slot | Pass the requester's slot to the queue |
| Event ticks shifted by many frames in a tool | Shared settings turned on reduced motion and hit-stop | Pin timing settings in the tool's own settings file |
| The user data folder grows by tens of GB | Thousands of tool saves | Clean tool saves by name; never near the player's save |
| Save tests fail in a sandbox | The sandbox blocks `user://` writes and `nice` | Run them where writes work; list it as a known failure class |
| A guard test runs its setup twice | `before_each()` called by hand | Put setup in 1 helper |
| Exit 127 on macOS | No `timeout` command | The perl alarm, `gtimeout`, or `--quit-after` |
| A call waits for hours | The slot wait sat inside or around the alarm | Put the alarm on the Godot command only |
| The parent stopped but Godot still runs | The alarm wrapped the wrapper, not Godot | Find and stop the child |
| The exit code says pass but the run failed | `$?` came from `tail` in a pipe | A log file or `pipefail` |
| No log after a loop | A relative log path inside `cd` | Absolute log paths |
| A test filter ran 0 tests and looked green | A comma list in 1 filter | 1 filter per call; check the count |
| A run header says the fixed rate is off | The engine consumes `--fixed-fps` | Prove the rate from ticks per frame |
| A process list shows your own command | `pgrep -f` matched the shell line or the grep | Match the binary name and the worktree path |
| A run started with `&` held a slot after the call ended | The run was not tracked | A tracked background task or the foreground |
| A batch still ran after the shell stopped it | The child survived the stop | Check for leftover processes before a new run |
| A zsh loop passed 1 word instead of several flags | zsh does not split variables | An array, `$=VAR`, or a shell function |
| The `play` recipe never ends in a test | A play run has no end | Start it, wait, stop it |
| Hung windows from old runs load the machine | Runs did not end by themselves | A frame limit or an alarm on every run; a process check before done |

## Artifacts to build

- A SceneTree tool template: root lookups, run-time `load()`, a quit watchdog, a done line.
  `scripts/tool_template.gd` is a start.
- A project parse check: loads every `.gd`, `.tscn` and `.tres`; prints
  `checked=N failed=M`; exits 1 on a failure. `scripts/parse_check.gd` is a start.
- A run wrapper: hard alarm, log file, error-line scan, a required summary line.
  `scripts/godot-run.sh` is a start.
- A process lister that marks your own Godot processes by path. `scripts/godot-procs.sh` is a
  start.

The bundled scripts are POSIX `sh` and GDScript, not Python, so do not check them with
`python3`. Check them as follows:

- `sh -n scripts/godot-run.sh` and `bash -n scripts/godot-run.sh`, then a trivial run:
  `sh scripts/godot-run.sh 5 /tmp/run-smoke.log true` exits 0.
- `sh -n scripts/godot-procs.sh`, then `sh scripts/godot-procs.sh /tmp` lists 0 or more lines.
- For each `.gd` file, make a tiny project in a temporary folder (a `project.godot` with
  `config_version=5`). Run `godot --headless --path <folder> -s <absolute path to the file>`.
  `parse_check.gd` prints `PARSE_CHECK checked=0 failed=0`. `tool_template.gd` prints
  `TOOL_DONE code=1`, because the tiny project has no `Config` autoload.
- A run-mode helper in the game: script mode, test mode, worktree path, and the tool save and
  settings paths from 1 environment variable.
- A test path helper: a per-process scratch folder and save, deleted at exit.
- A save-hash check: hash the player's save before and after a batch.
- A list of invalid-run markers that every sweep shares (`SCRIPT ERROR`, `Parse Error`,
  "Identifier not found").
- A task runner file (`justfile` or `Makefile`) plus a preflight script.
- A checklist for new worktrees: import, parse check, baseline tests, `.uid` files.

## Related skills

- `godot-testing`: the headless test loop, flake isolation and the finish gate. This skill
  makes the runs safe; that one makes the tests good.
- `fleet-game-dev`: the slot runner that caps parallel runs, the `mkdir` locks, and the rules
  for landing `.uid` files and merges.
- `bot-balance-loop`: bot fights and measure probes, the main users of SceneTree tools and the
  determinism flags.
- `visual-verification`: window captures and visual gates, which cannot run headless.
- `godot-perf`: frame timings in a real window, and the shader warm-up list that a parse check
  can guard.
- `feature-seams-and-saves`: save versions and save integrity in the shipped game.
- `release-and-store`: export and demo build recipes for the task runner.
