---
name: godot-perf
description: >-
  Measure and fix frame cost in a Godot game with numbers you can trust on a shared, noisy dev
  machine. Covers interleaved A/B pairs against a base build, per-part milliseconds instead of FPS,
  hitch maps and cost maps, stress scenarios and leak hunts, per-feature cost budget tests, shader
  warm-up lists with a guard test, MultiMesh batching, physics interpolation, pixel-art camera
  judder, view-edge fill and seeded chunk streaming. Use it whenever someone wants to know why a
  Godot game lags, stutters, hitches or gets slow over time, asks if a change makes frames faster
  or slower, wants a draw-call or frame budget, wants to batch many sprites, sees a stall the first
  time an effect draws, turns on physics interpolation, or wants to rank speedups from a public
  write-up, even if nobody says "profiling" or "A/B".
---

# Godot Perf

A frame-time number from one run on a busy machine is noise, not evidence. Vsync, the display cap,
cold shader caches, other processes and a background window all move frame time more than most
code changes do. The method measures milliseconds per part in a real window, against a base build
at the same merge base, in short interleaved A/B pairs with the machine load recorded. It works
because pairs taken back to back see the same machine state, so the gap between A and B survives
the noise even when the absolute numbers do not.

## When to use

- You must prove that a change makes frames faster, or does not make them slower.
- A new effect or system must stay under a per-frame cost or draw-call budget.
- Players report lag, a hitch at one event, or play that gets slow over time.
- The first draw of a material stalls the game.
- Many similar nodes cost too many draw calls.
- You turn on physics interpolation, or a low-resolution pixel-art camera judders.
- An endless or chunked world must stream content without hitches.
- Someone hands you a public perf write-up and asks which ideas apply.

## When not to use

- The question is about game balance or bot fight results. Use `bot-balance-loop`.
- You only need to prove a refactor keeps behaviour. Use `safe-refactor-and-review`.
- You need a visual check, not a time. Use `visual-verification`.
- The problem is a headless tool that hangs or writes files. Use `headless-godot-runs`.

## Method

The main procedure is an A/B measure. Every other section feeds it or ends in it.

1. **Measure milliseconds per part, not FPS.** Record process time, physics time, render CPU and
   GPU time, draw calls, primitives and static memory. FPS hides where the time goes and caps at
   the display rate. Check: your log has one column per part.
2. **Sum every viewport.** Turn on render-time measurement for the root viewport and for each
   SubViewport, and add them. A root-only number can miss most of the 3D cost. Check: the summed
   render time is larger than or equal to the root number.
3. **Uncap the frame.** Turn vsync off and run with `--max-fps 0` for timing runs. Write these into
   a scratch settings file for each run, because saved user settings can force vsync back on.
   Check: frame time is not stuck at the display period (for example 8.33 ms at 120 Hz).
4. **Use a driver with GPU timers.** Some drivers return 0 for every GPU timer (for example Metal on
   macOS). Switch the driver (for example `--rendering-driver vulkan` through MoltenVK). On a
   renderer with no GPU timer, compare wall time and render CPU time. Check: the GPU column is not
   all zeros, or you state why it is.
5. **Run in a real window, in the foreground.** Headless has no draw, uses a dummy renderer, and
   shows false memory and object growth. Some desktops throttle a background window. Check: the
   run log names the renderer and window mode.
6. **Keep a base build at the same merge base.** Use one of these:
   - a detached worktree of the base commit in a temp folder, imported once;
   - an exported base build;
   - a probe flag that switches the change on and off in the same binary.
   Move the base to the new merge base after each merge. Check: base and branch share the merge
   base commit.
7. **Take the machine.** On a shared machine, hold a perf lock (and a window lock if other agents
   run windowed captures). Keep each hold under about 3 minutes. Run no other batch job at the
   same time. Check: the lock owner file names you for the whole take.
8. **Warm up, then interleave.** Run one untimed warm-up run first, because the first run carries
   cold caches. Then run A and B in back-to-back pairs, 3 to 5 pairs, and alternate which goes
   first. When noise stays high, switch the variant window by window inside one process. Check:
   you have at least 3 valid pairs.
9. **Record the load with every take.** Log the load average and the count of engine processes.
   Mark a take invalid above a load limit you set before the run. Check: every row has a load
   value and a valid flag.
10. **Report the gap, not the absolute.** Report the median gap and its share of the frame. Under
    load, report the best median too, because load inflates the best value least. Mark a result
    weak when the per-pair gaps straddle 0 or the A time drifts across the take. Repeat a run with
    one big spike before you report it. Check: `scripts/ab_report.py` prints the gap, the share and
    the weak flag.
11. **Measure through the real setting.** For a graphics setting, switch it through the settings
    API the player uses, not through a direct engine call. Only then does the measure prove the
    setting. Check: the probe sets the setting key.
12. **Prove behaviour and gain for a speedup.** Write value tests that pass on the old code and a
    speed test that fails on it. Then:
    - prove equal behaviour: the same game result in every A/B run, and, for a draw change,
      identical pixels by the `visual-verification` method (fixed state, 1x, noise floor);
    - prove the gain with the pairs above;
    - break one key call in the new code and check that a test fails, then restore it;
    - run the A/B again on the final code before you report.
    Check: every number in the notes comes from a measure, not an estimate. Record negative
    results too.
13. **State the proxy.** A low-end renderer and a render scale stand in for weak hardware. Label
    those numbers "estimate". Check: the report says which numbers are proxies.

## Per-feature cost budgets

Use this when a new effect, cue or system must stay under a budget per frame (for example 0.1 ms).

1. Agree on the budget in milliseconds per frame before you write the feature.
2. Write a headless test that drives the worst case (for example the most instances that can
   appear in one frame).
3. Time only your part of the frame, not the whole frame.
4. Take the best of 3 to 5 runs inside the test. One run on a loaded machine is noise.
5. Over budget, time each part apart. Then remove, cap, cache or slice the costly part over
   frames. Redraw only on a state change.
6. Wait on timers, not on frame counts, in headless tests. Headless frames run faster than real
   time.
7. Record the final cost in the notes.

For a draw-call budget on new models, record the draw-call and CPU delta per model against the
base scene. Merge static meshes into one batch when a model goes over, then take a second
measure. Write a before-and-after table.

## Hitch maps and cost maps

Use this when players report lag or a hitch at one event, or a scene has a high steady cost. Get
numbers before you change code.

1. Read the player's own perf overlay or log first. Do not change it. Compare code time per frame
   with total frame time. When code time is small, look at the GPU, data transfer and the vsync
   wait. Count the other processes on the machine.
2. Write a **hitch map**: drive the real flow with real input along a scripted path. Log each frame
   over a threshold (for example 20 ms) with its context (scene, event, position).
3. Write a **cost map**: a headless run at a fixed fps that times each system's process call per
   frame. Add a plain mode with no timers. Check that both modes give the same run outcome, so the
   timers do not change the game.
4. For an event hitch, list every listener of the event signal. Write a probe that triggers the
   event and logs one row per frame around it. Smoke it headless for a parse check. Then take
   windowed takes, one per lock hold, on each renderer. Split each slow frame into process time,
   render time and draw calls.
5. Take a warm-cache run. When the spike goes away, it is a shader compile. Go to
   [Shader warm-up](#shader-warm-up).
6. For a steady cost on one renderer, bench each scene on each renderer with vsync off. Skip the
   first frames, sample a fixed count, and print average, p50 and p99. Hide one node or one set of
   nodes per run to find the cost. Sweep a constant in a temp copy of the project.
7. For "slow over time", run a long windowed bot run (for example 10 minutes). Log frame time, draw
   calls, primitives, node count and stored history once per second. Make a table at fixed minutes
   and find what grows. A bounded pool grows and flattens; a leak keeps its slope.
8. Run each scenario 3 times and take the median per bucket, with the load recorded.
9. Time the parts of the largest spike with a probe or a micro-benchmark. Measure the dispatch cost
   before you move work to threads; a small loop gains nothing.
10. Build each fix on a prototype branch, one commit per idea, with the full test suite after each.
    Give each fix one owner. Prove each fix with the [Method](#method) pairs.
11. When the vsync wait is the cause, offer a vsync mode setting. Godot reports the requested vsync
    mode, not the mode the driver uses, so let the player test it.
12. Write a research doc with the numbers, the fixes and the open risks. When the bot does not
    reproduce a player's spikes, say so, and fix the spikes you measured.

## Stress harness and leak hunt

Use this when you need a repeatable worst case and a baseline per scene and renderer, or a memory
leak across many runs.

1. Build a harness that drives named scenarios through existing seams, with no edit to shipping
   code. Good scenarios: the heaviest levels on a fixed path, the worst fights at 1x, 2x and 4x
   spawn counts (a multiplier knob), a late-game save, a resolution matrix on each renderer, and
   a long endurance run (for example 30 minutes).
2. Add a frame sampler (process, physics, render CPU and GPU per frame, summed over every
   SubViewport), a per-script split timer, a summary CSV and a report script.
3. Build scenario 1 first. Prove that 3 back-to-back runs give medians within about 10 %. Share the
   harness command as soon as it works, so other work can use it.
4. Run the baseline matrix per renderer under the perf lock. Record the load per row.
5. Run the endurance scenario. Log object, node and orphan counts and memory per run. A count that
   grows run after run is a leak.
6. For a leak, run a churn loop that loads, plays and frees the run scene and prints counts per
   cycle. Run a control churn with only idle frames. Bisect by behaviour (idle against active,
   menus against no menus). Report each cause with its call count and its growth per call.
7. Rank the top 10 hotspots by milliseconds and frame share with the split timer. List every error,
   log flood, crash and hang with steps to reproduce.
8. Scale scripted routes to the bot's speed. A fast bot that circles a waypoint it cannot reach
   never triggers a late event.

## Research to plans

Use this when a team must find frame-rate wins before any change to shipping code, or someone
gives you a public write-up of perf techniques and asks which ones apply.

1. Measure where the time goes first. Write the cost map.
2. For an outside write-up, get the source text. List each technique with its claimed gain.
3. Map the matching systems in the project (storage, movement, collision, rendering). Classify each
   technique as done, not applicable, or candidate.
4. For each candidate, list the measured or estimated gain, the build cost, the risk, the look
   change, the files, and conflicts with work in progress.
5. Prototype the best ideas on a branch in a second worktree that never merges. For any look
   change, get before-and-after evidence with `visual-verification`. Keep prototype-only commits
   (for example step timers) off the main branch.
6. Build only the safest change for real, with a test. Prove identity and gain with a paired A/B.
7. Rank the top 5 to 8. Write a plan skeleton per top idea: goal, files, steps with checks.
8. Cite each web source with its URL. Never send project code or unreleased names to a web service.

## External source research

Use this when you must learn a technique or an exact engine behaviour from an outside source
(engine source, a public demo, a repository, a post, a video) before you change your own code.

1. Read the open questions and the project files that the answer touches.
2. Check the licence first. Record the source revision, date and licence. Read the source; do not
   run its scripts.
3. Fetch only the files you need: engine source at your exact engine version tag, or a depth-1
   clone in a temp folder. Generate class docs with the engine `--doctool` if you need API detail.
4. When a page blocks the fetch, try its RSS feed or a cached copy. When nothing works, ask a human
   to save the text into a file. For a video, read frames every 2 to 3 s and the captions.
5. Read the reference files next to the project files. Map conventions (for example axis order and
   handedness) before you copy any math.
6. Check each claim and code sketch in a scratch project in a temp folder. Parse-check every sketch.
   Check each API you propose against the docs of your engine version.
7. Tell the people who need it early when a fact affects work in progress.
8. Write the report: source, licence, a technique table, ranked recommendations with the change each
   needs, and the tested code. Put any project defect you found first.
9. For a port, record baseline frame times first. Port with a source comment and a third-party
   notice. Then run an interleaved A/B. For the look of the port, use `visual-verification`: it
   owns the fixed-state before-and-after captures and the pixel-diff noise floor.

## Shader warm-up

Use this when the game stalls the first time a material draws, or the first frames of a run hitch.
The warm-up must stay complete as the game grows, so it needs a guard test.

1. Scan the code for every `.gdshader`, every script that builds a material in code, and every
   MultiMesh or instanced draw (each is a separate shader variant). List the materials of each scene:
   meshes, ground, lights, masks, post-process, transitions.
2. Write the warm-up as one list of material sources in named groups, one group per shader variant.
   Draw one heavy group per frame, at load only, never at a key moment.
3. Hold a reference to each warmed material. The engine frees an unheld shader and the compile
   comes back.
4. Write a guard test. It fails when a file that builds a material or a MultiMesh is not drawn by a
   group and not listed as skipped.
5. Prove the guard. Plant a new shader file and check that the test fails. Run it against the old
   warm-up list and check that it fails.
6. Pause title-screen animations until the warm-up ends.
7. Measure the boot frame and the run start in A/B pairs on each driver. Count frames over 60 ms
   and the worst frame. Use a control run that skips the warm-up, because the engine prints no line
   per compile.
8. When you add a material, add one row to its group. Remove rows for deleted placeholders.
9. Measure the first render frame on its own. Part of its cost is not shader compile.

Newer engine versions (for example Godot 4.4 and later) reduce compile stalls with ubershaders.
Measure before you build a warm-up on those versions.

## MultiMesh batching

Use this when many similar billboards or sprites cost too many draw calls, or a spatial shader works
on single meshes but fails on MultiMesh instances.

1. Map every material parameter of the old per-node path.
2. Write the design before code: the group key (for example texture, size, frame count) and the use
   of each per-instance colour and custom-data channel. Reserve channels for states you know are
   coming.
3. Add the grouped renderer behind a switch that is off by default.
4. Write tests that compare the packed per-instance data with the old material values.
5. Pass per-instance values (for example the instance position) through `INSTANCE_CUSTOM`. In a
   MultiMesh, `MODEL_MATRIX` gives the node transform, not the instance transform. Read the value
   behind a shader flag, so single meshes keep the old path. Check which built-ins exist in each
   shader stage in the engine docs.
6. Run a headless probe that counts nodes and draw calls for both modes.
7. Check near, far and behind cases with `visual-verification`. It gives the captures and the
   pixel counts. Check the visible pixels per instance against the plan, and write the numbers into
   the notes. Acceptance needs numbers, not only images.
8. Prove the gain with the [Method](#method) pairs.

## Physics interpolation

Use this when a project turns on physics interpolation and the scene tree holds SubViewports and a
moving player node.

1. List every node that moves the player or follows it (cameras, markers, trails).
2. Write the tests first: the player subtree interpolates, and no other code moves the player
   outside a physics tick.
3. Set the interpolation mode on each SubViewport that holds no player node to off, before
   `add_child`. Do not trust the root setting to reach SubViewports.
4. Add a test that walks every SubViewport of a run and checks its mode.
5. Call `reset_physics_interpolation()` on the moved node after each teleport. Prove the reset test:
   remove the line and check that the test fails.
6. Place screen marks and effects from the interpolated transform (for example
   `get_global_transform_interpolated()`), not from the physics position.
7. When older camera tests fail with interpolation on, decide with the owner whether the test runner
   turns it off. Do not weaken the tests in silence.
8. Measure frame pacing in a quiet window: 3 takes, medians.

## Pixel-art camera and view edge

Use this when a 3D game renders pixel art at a low internal resolution and the camera scroll
judders, or the camera can show past the edge of a finite play field.

1. Write a windowed drive tool that records the scroll per frame in window pixels, in 8 directions.
   Clear camera shake in the tool, because shake hides the follow cadence. Save a "before" frame
   series per direction and window size.
2. Snap the camera to the texel grid. Shift the upscaled image by the remainder in window pixels.
3. Prove even steps from the pixels with a still scene. Check that HUD pixels are identical at 2x,
   that 1x keeps the old path, and that every world pixel stays on the palette.
4. For the view edge, compute the view extent past each edge for every field, aspect ratio and
   camera pitch. Make it a failing headless test first.
5. Pick a margin above the largest extent. Fill it with cheap chunks built from a few shared
   templates.
6. Make every mask read outside the field return the untouched state. A clamp in the read streaks
   the edge state across the margin.
7. Capture all fields on each renderer. Check for seams and visible template repeats.
8. Measure frame cost and memory A/B against a base build under the perf lock.

## Seeded chunk content

Use this when an endless or procedural world places content or solid obstacles per chunk from a
seed, the same every run, without blocked paths or load hitches.

1. Write the placement rules as data. Give one source the ownership of the data and its checks.
2. Write a generator that maps (seed, chunk coordinates) to sites. Oversample candidates a little.
   Drop candidates in passages, clearings and spawn areas. Cap the live colliders.
3. Test determinism: the same seed gives the same sites.
4. Test the rate or density over many chunks (for example 10,000) against the target range.
5. Test each exclusion rule over all loaded sites, not one chosen chunk.
6. Key any noise on world position, not on the chunk seed. Chunk-keyed noise shows seams at chunk
   borders.
7. Load sites only when chunks enter the active window. Load assets on a worker thread ahead of the
   view; a synchronous load costs a full frame or more. Reuse existing collision for simple shapes.
8. Run a perf probe with 3 trials, before and after.
9. Find a site near the start with a scratch script. Capture it and one scene per biome or region.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Frame time sits at 8.33 ms (or 16.67 ms) with vsync "off". | Saved user settings force vsync on, or the fps cap is on. | Vsync off and `--max-fps 0` in a scratch settings file for each run. |
| Every GPU timer reads 0. | The driver gives no GPU timestamps (for example Metal). | Use another driver, or compare wall time and render CPU time. |
| Render time is tiny next to the frame (for example 0.15 ms against 1.65 ms). | The measure reads only the root viewport. | Sum every SubViewport. |
| Numbers jump when you switch apps. | The OS throttles a background window. | Run in the foreground. |
| Memory and object counts grow in headless runs only. | Headless uses a dummy renderer. | Measure memory and render cost in a window. |
| Frame times fall by half between two runs of the same code. | Machine load changed. | Interleaved pairs, load per take, invalid flag above a limit. |
| A cost test fails at 0.1 ms under load and passes at 0.025 ms when idle. | One noisy run. | Best of 3 to 5 runs inside the test. |
| The first take is slow. | Cold caches. | One untimed warm-up run. |
| A and B differ by more than the change. | Another window run used the GPU, or a variant did less work. | Hold the window locks; give every variant equal work. |
| A probe slows its own early frames. | The probe does debug work (for example a hash) at run start. | Discard those frames; put the debug work behind a flag. |
| A player's spikes do not show in your tool. | Different settings, renderer, build type or machine load. | Match settings and renderer, add background CPU load, run the release export. |
| A long run does not fit in one tool call or session limit. | The command times out. | Single-run sessions; a sped-up run (for example `--time-scale 2`) for memory, a normal-speed run for timing. |
| Both batches ran on one renderer. | The shell did not split a flag string. | Use `sh` or a shell array for flag lists. |
| A script run breaks halfway. | You edited the shell script while it ran; `sh` reads it as it goes. | Do not edit a script during a run. |
| Headless frame counts do not match time. | Headless frames run faster than real time. | Wait on timers, not frame counts. |
| A hitch map logs no frames headless. | Headless does not draw. | Take frame logs in a window. |
| Draw calls grow over time. | One draw per item is created and never freed. | Batch and free. |
| Node count grows over a long run (for example 500 to 1,400). | Far objects never despawn. | Despawn far objects; check each pool has a cap. |
| A load stalls 16 to 24 ms per new view. | A synchronous resource load on the main thread. | Load on a worker thread ahead of the view. |
| A chunk restore costs hundreds of microseconds. | Array concatenation per chunk. | Write into a preallocated slot (for example `put_data`). |
| An effect reads data every frame. | A constant is recomputed per frame. | Compute it once, or on change. |
| A vertex shader runs twice on one renderer. | A depth prepass on that renderer. | Read the engine source to confirm the rule. |
| A 60 to 110 ms spike on the first use of an effect. | A shader compiles on first draw. | Add the material to the warm-up; prove with cold runs. |
| Warmed shaders compile again later. | The engine freed unheld shaders. | Keep a reference to each warmed material. |
| A new feature file stalls on first draw. | It builds a material and is not in the warm-up. | The guard test; one row per file. |
| A filter on `autostart` finds no timers. | The engine clears `autostart` after the first start. | Filter by type. |
| A first render frame still costs hundreds of ms after warm-up. | Not all of it is shader compile. | Measure it on its own before you decide. |
| A probe trail is corrupt around an event. | The player emits the same signal each tick. | Disconnect it in the probe. |
| A summary blames the wrong frame. | An off-by-one in the frame index around the event. | Test the index logic on a known trail. |
| `has_method` returns false for a real method. | The call checked the `Script` object, not the node. | Call `node.has_method`. |
| A high-refresh comparison covers too little play. | The frame count was fixed, not the play time. | Set the frame count from the play time you need. |
| Threads give no gain. | The dispatch costs as much as the loop. | Measure dispatch cost first. |
| Two people fix the same hitch. | No owner per fix. | One owner per fix, announced. |
| The split timer itself makes orphans. | The instrumentation leaks. | Take clean numbers without the split timer. |
| Single worst frames do not repeat. | Heavy machine load. | Use medians, not worst frames, under load. |
| A late event never fires in a stress run. | The bot circles a waypoint it cannot reach. | Scale the route to the bot speed. |
| A MultiMesh effect shows every instance at the node origin. | `MODEL_MATRIX` gives the node transform. | Pass instance values in `INSTANCE_CUSTOM`. |
| A shader fails to compile after a batching change. | A built-in that the stage does not have. | Check the stage in the engine docs. |
| A packed data layout breaks when a peer adds a state. | No spare channels. | Reserve channels for known future states. |
| A reviewer cannot accept a visual change. | Images with no numbers. | Record pixel counts and ratios. |
| Interpolation is on in a SubViewport you set off at the root. | The root setting does not reach the SubViewport. | Set the mode on each SubViewport before `add_child`. |
| A marker drifts from the drawn player. | It uses the physics position. | Use the interpolated transform. |
| Camera judder is hard to see. | Impact shake hides the follow cadence. | Clear shake in the drive tool. |
| A deferred camera update errors. | It runs after the node left the tree. | Guard with `is_inside_tree()`. |
| The view edge shows the clear colour after a camera change. | The change added a margin the test did not know. | Add it to the test and to the fill margin. |
| Seams at chunk borders. | Noise keyed on the chunk seed. | Key it on world position. |
| A placement test passes but the rule fails in play. | The test checked one chosen chunk. | Assert the rule over all loaded sites. |
| A tool script fails to compile on a global class. | Some tool runs do not load global class names. | Load classes at run time with `load()`. |
| A sketch from research does not parse. | A non-constant expression in a `const`, or a wrong API. | Parse-check every sketch in a scratch project. |
| Rounding differs between GPUs. | `round(-0.5)` is not portable; low-precision custom data. | Avoid the tie case; encode values in 0 to 1. |
| A blocked web page gives no text. | A login wall. | Try the RSS feed; else ask a human for a saved file. |
| A hung timing script blocks the machine. | No bounded wait. | Use a bounded poll; kill only your own process. |
| In-place `sed` fails on macOS. | BSD `sed` needs a suffix argument. | Use `perl -pi` or a Python edit, then grep the value. |
| GDScript cannot infer a type. | An untyped dictionary value. | Declare the type. |
| A prototype commit lands by accident. | Prototype-only code shares a branch. | Keep prototype branches separate and unmerged. |
| An untracked file blocks the base worktree checkout. | A generated file (for example a `.uid`) exists in the folder. | Delete the untracked copy, then check out. |

## Artifacts to build

- **Frame sampler:** a script that logs per-frame process, physics, render CPU and GPU (summed over
  every viewport), draw calls, primitives, node count and static memory to CSV.
- **A/B pair runner:** a shell script that takes the lock, runs the warm-up, runs A and B
  interleaved for N pairs, and writes one CSV with variant, pair, load and process count per row.
- **A/B report:** `scripts/ab_report.py` in this skill. It reads frame CSVs and prints per-take
  stats, medians, the gap, its frame share and a weak flag.
- **Base build helper:** a script that makes, imports and moves the base worktree or export.
- **Hitch map tool:** a windowed drive along a scripted path that logs frames over a threshold with
  context.
- **Cost map tool:** a headless fixed-fps run that times each system per frame, with a plain mode.
- **Event probe:** a scene script that fires one event and logs one row per frame around it.
- **Stress harness:** named scenarios, a sampler, a split timer, a summary CSV and a report.
- **Churn loop:** a script that loads, plays and frees a scene N times and prints object, node and
  orphan counts per cycle.
- **Cost budget tests:** headless tests that drive a worst case and fail above a budget, best of N.
- **Warm-up list and guard test:** one data list of material sources in groups, plus a test that
  scans the project for unlisted materials.
- **Long-run drive:** a bot or camera drive for 10 minutes or more, with a per-minute summary table.
- **Standalone bench project:** a minimal project for architecture choices, with equal work per
  variant.
- **Perf notes table:** a checklist row per number: what, scenario, renderer, lock state, load,
  median, range, valid.

## Related skills

- `bot-balance-loop`: plays the game with bots for balance numbers; this skill reuses its drives
  for perf scenarios only.
- `safe-refactor-and-review`: proves that a change keeps behaviour; this skill adds the speed proof.
- `visual-verification`: owns the visual proof. It gives fixed-state window captures, 1x
  comparison, before-and-after pairs and the pixel-diff noise floor that prove "same pixels". This
  skill gives only the paired timing evidence.
- `headless-godot-runs`: tool-script hygiene, flags and process cleanup for the headless probes
  here.
- `godot-testing`: the test loop, proof that a test can fail, and the exit leak hunt at suite end.
- `feature-seams-and-saves`: data seams and flags that let a probe switch a variant in one binary.
- `upgrade-tree-design`: design research for questions that are about fun, not frame time.
- `fleet-game-dev`: the mkdir perf and window locks, the owner check, and wave plans from the
  ranked perf ideas.
