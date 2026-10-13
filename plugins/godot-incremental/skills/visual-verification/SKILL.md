---
name: visual-verification
description: >-
  Prove that a Godot game looks right with real rendered frames, not headless test logs. The
  skill stages exact game states in a capture tool, takes before and after images in a real
  window and at native 1x size, reads every image, measures pixels against a noise floor, runs an
  automatic windowed visual gate on every renderer, and turns each visual fault into a headless
  layout test. Use it whenever someone changes a shader, material, sprite, palette, HUD, menu,
  tween, particle effect or camera, wants screenshots or a contact sheet, asks "does this look
  right", "capture the screen", "check the UI for overlap", "why is this window shot blank",
  "compare before and after", "add a visual regression gate", "check reduced motion" or "does
  this text fit", or works in a sandbox that cannot open a window. Use it even if nobody says
  "visual verification": headless Godot does not draw, so a passing test suite says nothing
  about the look.
---

# Visual verification

Headless Godot uses a dummy renderer. It draws nothing, a viewport texture is null, and a test
suite can pass while the screen shows a broken look. The method is to stage each exact state in
a small capture tool, take real frames in a window under a lock, and judge every image by eye and
by number against a base capture. It works because the evidence is the real pixels that a player
sees, and because a base-against-base control separates a real change from render noise.

## When to use

- A change touches a shader, material, renderer setting, palette, sprite, VFX, HUD or menu.
- A change has motion (a tween, flash, shake, particle) and the game has a reduced-motion setting.
- A refactor or a new render path must look the same as the old one.
- A reviewer reports overlap, clipping, off-screen focus or text that does not fit.
- The owner must pick between 2 or 3 looks before final assets.
- A worker runs in a sandbox or headless and still needs real frames.

## When not to use

- The change is pure logic with no visible output. Use the headless test loop instead.
- You need frame cost, not the look. Use the perf skill.
- You need art from scratch. Use the pixel-art skill, then come back here to check it in game.

## Method

The anchor procedure: one reviewed set of before and after captures for one change.

1. **Find or copy a capture tool.** Copy the closest earlier capture tool into the review folder
   of this change. Do not name it like a test file, so the test runner does not pick it up. As an
   alternative, add optional arguments to a demo scene (area, level, wallet, shot name). Check:
   with no arguments the demo behaves exactly as before, so the visual gate does not move.
2. **Stage the exact state.** Drive the real scene with the real input actions. Load a scratch
   save or a preset save, never the player's real save. Place the player or the camera beside the
   target. Drain queued toasts and popups. Focus the node under review. Set the time of day.
   Mirror every setup step that the real game scene does (for example a placeholder that the
   real scene hides). Check: the tool prints the state it built, and a first shot shows it.
3. **Fix the clock.** Run at a fixed fps, so game time is exact per frame. Turn vsync and the
   frame cap off, so the run is short. Stop the game director or wave clock during a shot. Hold
   each step for a few frames before a window shot, so the window shows the same state as the
   viewport. Give the tool its own quit timer, because some platforms have no `timeout` command.
4. **Take the window.** Take a window lock or send the job through the capture queue (see
   below). After start, set the window size explicitly, set it always on top, and set it to take
   no focus. Wait about 60 frames before the first shot. Force a draw when the window reports it
   cannot draw. Check: 2 shots a few frames apart differ when the scene moves, so the window is
   not frozen.
5. **Save 2 images per shot.** Save a true 1x image at the content size from your own viewport.
   When the root viewport follows the window size, downscale with nearest-neighbour filter. Save a
   window image at each target size. On macOS, grab your own window by its window id, crop the
   title bar and allow for the Retina scale. Use absolute output paths, because the working
   directory of Godot is the project folder. Check: the pixel size of each file is what you asked.
6. **Take "before" first.** Capture the base on a detached worktree, or set the changed files
   aside and restore them from the base commit. Use the same tool, shot names, frames and camera
   spots for "before" and "after". Check: a before and after pair differs only where you expect.
7. **Start with 1 shot.** Run 1 shot, look at it, fix the tool, then run the full set. Capture
   each renderer the game ships. Add a reduced-motion set when the change has motion. Capture
   each target window size. Check: the log shows the renderer you asked for.
8. **Look at every image.** Open each image at native size. Write 1 line per image: what reads
   and what does not. Zoom 4x crops for small details. Build a labelled contact sheet when there
   are many shots. Judge pixel art at 1x, because a scaled view blends dither into grey.
9. **Measure where you can.** Count changed pixels, mean luminance in a box, a hue share, a
   palette colour count or a width in pixels. Take a base-against-base control first to find the
   noise floor (see below).
10. **Fix and capture again.** Fix what does not read: low alpha, a misleading shape, a colour
    that matches the ground or reads as a hazard. Capture again with the same names. Turn each
    visual fault into a headless test where you can (see UI layout tests).
11. **Prune and record.** Delete stale, duplicate and frozen shots. Compare files with `cmp` or
    a checksum and drop byte-identical copies. Check the folder size. Commit the tool, the chosen
    shots or contact sheets, and 1 line per image. Remove any claim in the notes that no image
    confirms.
12. **No window at all.** When no window is possible, build a reference image from the shipped
    sprites and write "visual check not verified" in the report. Do not report a look as checked
    from headless output.

## Windowed visual gate

A gate is the automatic pass or fail check. It does not replace step 8 of the method.

1. Build a gate mode in a demo scene. It draws a known pattern on a fixed path, plus untouched
   areas, with every real-time effect (wind, clouds, gusts) turned off.
2. Write a gate script. It runs each gate scene windowed on each renderer (for example Forward+
   and Compatibility), captures fixed frames and measures values in fixed regions.
3. Compare each value with a band. Print 1 `PASS` or `FAIL` line per renderer and scene, with
   the measured values.
4. Give each Godot run a time limit. On timeout, print a `HANG` line that names the step.
5. In the capture tool, add a readiness check that waits for a real render value, not only a
   frame count. Force a draw. Stop after a limit, for example 120 s.
6. Take the window lock around the whole gate, not around each run. Never run the gate headless.
7. Run the gate before you report done, and after each merge that touches shaders, materials,
   the palette or the main renderer. Keep every `PASS` and `FAIL` line, not only the tail.
8. If a value moves, run the gate on a detached base worktree. The base can show the same value,
   so the change is not the cause. Compare bytes between captures to rule out a stale frame.
9. If a check fails once, run the gate again and compare with known flake values.
10. When a change moves a region range on purpose, edit only the range lines. Add a new region
    only with the owner's approval.
11. For pixel fonts, check that each font is set only at its native size or a whole multiple,
    on whole pixels. A font made for 8 px at 7 px is blurry.

**Deflake a gate.** Count the flake rate with N runs in a loop. Write a probe that creates the
suspected condition (for example a window that covers the capture window) and compare it with a
control run. Apply the fix (window flags, readiness check, hang limit). Add a headless test that
fails without the fix, for example with an override of the Godot binary that forces a hang.
Prove the fix with 20 runs under the bad condition. Time the Godot run alone, not the lock wait.

## Pixel diff with a noise floor

Use this when a change must look the same (a refactor, a new render path) or change 1 area only.

1. Find each shader input that uses time. Set its strength to 0 for the capture. Hold every
   time-driven effect still. Use a fixed fps.
2. Capture the base 2 times at the same frame. The changed-pixel count between the 2 base
   captures is the noise floor.
3. Render the change, or path A and path B, with the same camera, scene and seed.
4. Write A, B and a diff image. Print the changed-pixel count against each base capture. Judge
   only pixels that differ from both base captures.
5. Trust a diff of 0 only after you check that the frames show the subject. 2 empty frames match.
6. Zoom on each changed pixel cluster and explain it. Write a failing test for each real
   difference, then fix it on both paths.
7. For looks that must stay apart (modes, teams, states), measure mean luminance in fixed boxes
   and check a minimum gap. Use a box over the full block, not 1 row. Check palette membership.
8. When pixel counts cannot judge the goal (a blob shadow against a speckled shadow), say so and
   compare by eye with a zoom sheet.
9. Flip the default to the new path in its own commit. Put the counts and the noise floor in the
   notes.

`scripts/pixdiff.py` counts changed pixels between 2 PNG files, with a tolerance and an optional
box, and can write a diff mask. It uses the Python standard library only.

## Capture queue for windowless workers

Use this when a worker runs in a sandbox or headless, or every window lock is busy.

1. Run 1 runner outside the sandbox. It watches a queue folder, takes a free window lock, runs
   each request with a time limit and the requester's scratch save, and writes `<id>.log` and
   `<id>.done` with the exit code.
2. Write the capture script as a `SceneTree` script. It builds the exact state, waits some
   frames, saves 1 PNG per state and quits. Start a quit watchdog first, so a failed capture
   cannot hold the lock. Get autoloads from the tree root at run time, because their global
   names do not resolve in a `-s` script.
3. Parse-check the capture script headless before you queue it.
4. Write 1 request file per job: line 1 the requester name, line 2 the worktree path, line 3
   the Godot arguments with no shell characters. Put every script option after `--`. Use
   absolute script paths.
5. Use a new request id per round (`-2`, `-3`). The runner skips an id that has a `.done` file.
   Delete stale `.done` files before you queue an old id again.
6. Wait on the `.done` file with 1 bounded wait. Do not poll with long `sleep` loops.
7. Read the log for script errors. Fix and queue again.
8. Check each image as in method steps 5 and 8. Repeat for the second renderer.
9. Copy the chosen images to the review folder. Record each path and what it shows.

See `references/capture-queue.md` for the request format and a runner outline.

## UI state capture review

Use this to build, review or declutter many UI screens and states without a person who clicks
through them.

1. Read the critique, the rubric and the UI spec.
2. Write a harness that takes `--state=<name>` and builds each state from a fixture made from
   real data, for example an empty, a partial and a full save.
3. Capture every state in 1 batch at the base size (1x) and at the window size. Take "before"
   captures with fixed names before you edit.
4. Zoom the tight areas. Make side-by-side images against the mockups. Check text contrast and
   off-palette pixels with a script.
5. Prove each suspected cause with an extra test state before you write the fix. Fix an overlap
   by margin and size, not by guess.
6. Write a test that every label fits its frame in the full state. Prove that the test can fail.
7. For a declutter request, write a headless tool that counts the words on each screen state.
   Count before. Shorten strings in the data source with exact-match edits. Check that only text
   fields changed. Remove repeated labels. Count after and report the drop in percent.
8. Write findings with a severity: blocker, major or minor. Text contrast near 1:1 is a blocker.
9. Take "after" captures with the same names and look at each one.

## UI layout invariant tests

A capture finds a defect once. A layout test keeps it fixed. State each rule as a geometric or
count check on real nodes.

1. List each defect from the review captures with its cause in the code.
2. State each rule as a check: 2 rects do not intersect, a label stays inside its parent, text
   width fits its box, a focused node stays inside the view, a sprite stays out of a HUD band.
3. Build 2 or 3 test states, for example early, mid and late game.
4. Write 1 test per defect or rule. Open the real scene. Await a settle helper that waits for
   layout and tweens to finish. Then compare global rects of real nodes. Check a label box against
   the full node frame, not only its centre.
5. Run each test and confirm that it fails for the reported reason.
6. Apply the smallest layout fix. When a test finds a real overlap, change the layout code, not
   the test.
7. Compute a limit from the real content (for example the free width from the longest real
   header). Do not tune a cap by trial.
8. Allow a small margin where the camera snaps to whole pixels.
9. Run the focused tests, then the UI test folders. Capture each affected state and look at it.

## Text fit check

Use this when you write story or UI text that must fit fixed boxes.

1. Find the limit of each line kind (toast, page, title, button) in characters or pixels.
2. Keep the lines in 1 source file, grouped by line kind.
3. Run a check that measures every line against its limit before the commit.
4. Fix each line over its limit, and run the check again.
5. In the scene, a layout test (above) checks the real rendered width. The character check
   catches most overruns earlier and cheaper.

`scripts/text_fit.py` checks a JSON file of line kinds, limits and lines. Use it as the pre-commit
check, then keep the in-scene width test for proportional fonts.

## Reduced-motion coverage

Use this when you add or change a tween, flash, glow, shake, particle or growing effect, or a
colour cue, in a game with a reduced-motion setting.

1. List every tween and moving effect that the change adds or touches.
2. Define the reduced-motion form of each: the end state at once, a fade, or a few still steps.
   Remove flashes.
3. Write the reduced-motion form into each new effect plan before you build it.
4. A timer effect (a growing warning) still needs to read as a timer. Grow it in 3 still steps.
5. Check each cue at a contrast of 3:1 or more, with a fill plus an outline.
6. Write a test that sets reduced motion, triggers the effect and checks the still form. Count
   active tweens to prove that nothing moves. Check that a settled shape is still there some
   seconds later.
7. Restore the settings defaults at the end of the test, so later tests do not inherit them.
8. Capture the reduced-motion form in a window too (method step 7).

## Visual QA matrix

Use this when an effect must read in every area, shape, level and setting, or a plan assumes a
visual cause, and nobody can check every combination by eye.

1. Build a matrix of cells: 1 per area, pattern, renderer and setting. Write a route library that
   drives each pattern, and a cell tool that plays 1 cell.
2. Find pass, headless: play each cell and record the tick of each event in 1 JSON file per cell.
3. Shoot pass, windowed: replay to each tick and save frames on each renderer. Add a burst pass
   that saves every frame for 1 s after the event, for flicker checks.
4. Write an analyzer with 1 check per defect. Test each check on synthetic frames first.
5. Run the matrix. Look at a sample of failed cells by eye. Recalibrate each check that fails
   cells that look correct.
6. Make the run resumable and keep finished cells. Pin the game clock, so a run cannot end at
   dusk before the effect completes.
7. Hand the matrix to a separate QA worker on a named commit. The QA worker reports pass or fail
   per cell with evidence. The builder groups failed cells by cause, fixes each group with a test,
   and asks for a rerun of the failed cells, then the full matrix.
8. Before you build a fix for an assumed visual cause, capture every area at rest and in a short
   driven-play mode that measures the real play numbers. The data can reject the assumed cause.
9. Commit contact sheets, not raw shots.

## Owner visual pick

Use this when the owner must choose between looks or concept variants before final assets.

1. Read the brief, the game camera, the scale and the palette. Capture the current state as
   "before".
2. Build 2 or 3 looks behind 1 switch on a prototype branch, or make A and B concept variants per
   subject with the same prompt prefix.
3. Make each look a true option. Change or drop a look that equals another one in any area.
4. Pixelize concepts to game scale and check the palette.
5. Compose 1 labelled sheet per look, with all modes or areas side by side.
6. Measure each look against the gate rules and note which rules it fails. Compare each renderer,
   because one renderer can draw a look much darker.
7. Send the sheet paths, the measures and a recommendation per subject. Stop and wait for the
   pick. Do not build final assets for a look that nobody picked.
8. Apply the requested changes to the pick. Refine only the chosen look, then build the final
   assets.

## UI function first

Use this when UI work and a UI design spec run at the same time.

1. Write event-driven tests for each screen: emit an event, check a label or a state.
2. Build each screen with the theme, the shipped art and a plain clean layout.
3. Do not wait for the spec. Report that the function is done.
4. When the spec lands, read its sections and mockups. Place nodes at the mockup coordinates and
   use the spec copy.
5. Update the tests to the new copy and run them. A text-fit test catches new copy that is too
   wide.
6. Capture a preview image of each screen and review it (method step 8).

## Pitfalls

The full table has about 60 rows. Read `references/pitfalls.md` when a capture is blank, frozen,
the wrong size, the wrong renderer, or noisy, or when a gate flakes or a layout test is unstable.
The rows below are the ones that cost the most time.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Tests pass, but the real window shows a broken look | Headless Godot does not draw | Capture in a real window; read every image |
| Window shot is 1 frozen frame, or the gate hangs | Another window covers the capture window; the OS stops its redraw | Always on top, no focus, force a draw, run limit, window lock |
| First shot after start or resize is blank | The window did not draw yet | Wait about 60 frames; add a readiness check on a real render value |
| `get_texture().get_image()` is null; a render wait hangs | Headless dummy renderer | Capture only windowed; sync tests on frame counts |
| `--resolution` has no effect; shot is fullscreen | Project settings apply a window scale or mode | Set a fixed windowed size after start |
| A "1x" file is the window size | The root viewport follows the window | Nearest-neighbour downscale; save your own viewport |
| 2 captures of 1 build differ by many pixels | Shaders and wind use wall-clock time | Zero the time inputs; take a base-against-base control |
| Captures loaded the player's real save | The tool used the default save path | Scratch or preset saves only |
| Output files land inside the project or nowhere | Relative paths resolve from the project folder | Absolute output paths |
| Layout test reads wrong rects | A tween or layout pass did not settle | Await a settle helper |

## Artifacts to build

- **Capture tool**: a `SceneTree` script with `--scene`, `--state`, `--frames`, `--out` (absolute)
  and a quit watchdog. It saves a 1x viewport image and a window image per named shot.
- **Demo arguments**: optional demo-scene arguments that stage a state. No arguments means no
  change.
- **Window id helper**: a tiny native helper that prints the window id of your own process for
  the OS screen grab (on macOS, for `screencapture -l <id>`).
- **Window lock**: an atomic directory lock (`mkdir`) with an owner file. Release it only inside
  the branch that took it, and only if you own it.
- **Visual gate script**: runs gate scenes windowed on each renderer, prints 1 `PASS`, `FAIL` or
  `HANG` line per case with values, and has a per-run time limit.
- **Capture queue**: a queue folder, a 3-line request file, and 1 runner outside the sandbox
  (see `references/capture-queue.md`).
- **Pixel diff**: `scripts/pixdiff.py`, changed-pixel counts with tolerance, box and diff mask.
- **Contact sheet maker**: tiles labelled images into 1 sheet (ImageMagick `montage` or a short
  script).
- **UI harness**: builds named UI states from real-data fixtures for capture and for tests.
- **Rect assert helpers and a settle helper**: test helpers for "no intersect", "inside parent",
  "fits width" and "inside view".
- **Word counter**: a headless tool that counts visible words per screen state.
- **Text fit check**: `scripts/text_fit.py` and a JSON file of line kinds, limits and lines.
- **Reduced-motion checklist**: 1 line per effect with its still form, kept in the effect plan.
- **QA matrix**: a route library, a cell tool, find and shoot passes, and an analyzer with 1 check
  per defect.
- **Review note**: 1 line per committed image: what it shows, what reads, what does not.

## Related skills

- `godot-testing`: the headless test loop. This skill hands each visual fault to it as a test.
- `headless-godot-runs`: rules for `-s` tool scripts and headless runs that capture tools follow.
- `godot-perf`: frame cost. Use it when the question is speed, not the look.
- `pixel-art-pipeline`: makes the art, contrast rules and mockups that this skill checks in game.
- `safe-refactor-and-review`: behaviour identity proofs; this skill gives the pixel identity proof.
- `feature-seams-and-saves`: flags and prototype branches for alternate looks; scratch saves.
- `upgrade-tree-design`: the owner consult rule for mechanics; owner visual pick is the same rule
  for looks.
- `fleet-game-dev`: locks, sandboxed workers and landing rules when many agents share 1 machine.
