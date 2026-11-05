---
name: game-audio
description: >-
  Make, wire and measure a Godot game's audio by numbers: seeded procedural sound effects and
  ambient loops that render the same bytes each time, a file report (length, LUFS, peak, onset,
  leading silence, loop seam), a bounded audio autoload with tests, a played-mix loudness
  measure from Movie Maker recordings (integrated LUFS, true peak, momentary max, duck depth),
  and music sets made by script or by an AI music web service that must loop, hit loudness and
  tempo targets and render deterministically. Use it whenever someone wants to add or change
  sound effects, generate SFX in code, fix a click at a loop seam, tune buses, ducks or a
  limiter, check that the mix is too loud or too quiet, re-check audio review findings, or add
  a soundtrack or a second music set, even if nobody says "loudness" or "procedural audio".
---

# Game Audio

Game audio drifts when nobody measures it. A regenerated sound changes without notice, a loop
clicks at its seam, a reward cue is quieter than a footstep, and a mix change "sounds better"
on one pair of speakers only. This skill treats every sound as a build product with numbers.
A seeded script makes the files, and a report proves each file meets its rules. A recording of
the real played mix proves the buses meet their loudness targets. It works because the numbers
catch regressions that ears miss, and a human listen pass is still left for the things that
numbers cannot judge.

## When to use

- You add, change or remove a sound effect or an ambient loop that a script generates.
- You wire a new game event to a sound, or change the audio autoload.
- You tune buses, ducks (sidechain compression), a limiter, or bus volumes.
- An audio review found problems, and the fixes landed. You must re-check them.
- You add a music set, edit album tracks to fit the game, or generate music with a web service.
- A loop clicks, a cue starts late, or a file plays at the wrong length.

## When not to use

- The game uses only recorded or licensed sound files and you do not change them. Use the mix
  section only.
- You need audio design taste (what a cue should feel like). Numbers check a design; they do
  not make one.
- You need middleware such as FMOD or Wwise. The rules still apply, but the wiring differs.

## Method

This is the procedure for scripted sound effects and ambient loops. Each step names the check
that proves it.

1. **Write the sound list.** List each event, its cue name and the seam (the code site) that
   plays it. Agree the event contract with whoever owns the event bus: a one-shot carries a
   sound id and a position; a loop has an on event and an off event. Check: the sound names in
   the list match the names that the code uses. The names are the contract between builders,
   so do not rename them casually.
2. **Snapshot the current files.** Hash every existing sound file (md5 or sha256), or copy the
   folder to a "before" folder. Run the file report on them and keep the table. Check: you
   have a hash list and a before table.
3. **Prove the generator is deterministic before you edit it.** Run the generator once with no
   edits. Check: version control shows no change to any committed sound file. If files change,
   the generator is not seeded; fix that first, or every later diff lies.
4. **Write a failing file test.** The test expects the new files to exist and to pass the file
   rules. Check: the test fails for the right reason (the file is missing).
5. **Add the recipes.** Give every noise source a fixed seed (for example seed by the cue
   name). Add new recipes in a new file or at the end of the old one, so old seeds do not
   shift. Normalize each cue to its loudness target and clamp the peak under a ceiling.
   Render loops as circular buffers, so the end flows into the start.
6. **Render twice and compare.** Render into 2 empty folders and compare the bytes. Check: the
   2 hash lists are equal, and every old file keeps its old hash. Only new or intentionally
   changed cues may differ.
7. **Run the file report at the real sample rate.** Read the rate from the file header; never
   assume 44.1 kHz. Check each rule:
   - length within its budget;
   - loudness (LUFS) near its target, and the peak under the ceiling;
   - leading silence under 1 ms for a one-shot, so the sound lands on the event frame;
   - a sharp onset for impact cues;
   - a near-silent last sample for a one-shot, so it does not click when it stops;
   - for a loop, the seam rules in "Measure a loop seam" below.
   Fix each recipe that breaks a rule and run the report again.
8. **Wire the cues in one audio autoload.** Only that autoload creates players; check with a
   grep for player nodes elsewhere. Use a bounded pool of players, so a burst of events cannot
   grow the node count. Create 0 players when the game runs headless, so tests and bots stay
   quiet and cheap. Write runtime tests: each event reaches the right player, the pool stays at
   its bound, an unknown id plays nothing, and headless mode has 0 players.
9. **Import twice.** Run the editor import headless, then run it again. Judge only the second
   pass, because a new file can fail to load on the first pass. Check: each loop's `.import`
   file keeps its loop setting.
10. **Set loop ends from the stream.** Read the loop end from the stream length at run time,
    not from a constant. A compressed import (for example QOA) can change the frame count.
11. **Find loops by a name rule.** A loop is a file whose name matches one rule (for example a
    `loop_` prefix). Tests and tools use that rule, not a hand-kept table, so a new loop does
    not break 2 tests.
12. **Run the whole audio test folder, then the full suite.** A focused file test can pass while
    a rule in another audio test fails (for example onset or last-sample rules).
13. **Leave the listen pass open.** Write a listen checklist: each new cue, what to listen for,
    and where it plays. Report the human listen pass as open, not as done.

## Measure the played mix

File numbers do not prove the mix. Buses, ducks, a limiter and overlapping cues change what
the player hears. Measure the mix from a recording of the real game.

1. **Write an audio contract.** It holds file names, the bus list, a loudness target per bus,
   a size budget and the one loop rule. Ask the owner for each bus target; do not invent it.
2. **Validate the meter first.** A 997 Hz sine at 0 dBFS reads about -3.01 LUFS. Cross-check
   your meter against ffmpeg `ebur128` within 0.1 LU. A meter that fails this makes every
   later number useless.
3. **Record with Movie Maker mode.** Run the game with `--write-movie <path>` and a fixed frame
   rate at a small window resolution. Movie Maker mode mixes audio offline, so the recording
   holds the real mix at a steady rate. A record effect on the master bus can record silence on
   some multi-channel devices. Record several fights or scenes and normal play, with and
   without music. Record single buses (solo each bus) when you tune one bus.
4. **Vary the second run.** A deterministic autoplay gives identical runs. Use a second level
   or field for the second normal run.
5. **Meter only the play part.** Movie Maker time keeps running on menus and results screens.
   Cut the recording to the play part by the game's event log. Use a streaming meter or
   ffmpeg for long files.
6. **Print a rule table.** For each recording print integrated LUFS, true peak, momentary max,
   per-event levels, the level gap between 2 key sounds, and the duck depth. Mark each row
   PASS or FAIL against its rule.
7. **A/B one setting at a time.** Change 1 bus setting. Record and meter again. Save the chosen
   configuration before an A/B and restore it from the copy after.
8. **Check loops after encoding.** Follow "Measure a loop seam" below on the decoded file
   (for example the `.ogg`), not only on the source WAV. A codec can add error at the edges.
9. **Pin the result.** Add a test that pins the chosen bus values. Commit the bus layout file
   in the form the editor rewrites it, with its `.uid` file.
10. **Re-check after fixes.** When review fixes land, measure on the base branch with no local
    edits. Write a recheck file: each row that failed before gets a new result of pass, fail
    or not measured. Measure every value a fix note says it did not measure.

Reward cues need care. Use the maximum momentary loudness, not gated integrated loudness, to
rank short reward tiers. Normalize them by loudness, not by peak, so a bigger reward is
louder.

## Measure a loop seam

This skill owns loop-seam measurement. Other skills (for example `release-and-store` for a
trailer music bed) call this section instead of a second procedure. A seam is the join where
the last sample of a loop plays next to the first sample.

1. **Measure the file that ships.** If the game or the video plays an encoded file (`.ogg`,
   `.mp3`, a QOA import), decode it to integer PCM first, at its own rate:
   `ffmpeg -v error -i loop_wind.ogg -c:a pcm_s16le /tmp/seam/loop_wind.wav`.
   Measure the source WAV too, so you can tell a recipe fault from a codec fault.
2. **Run the report.** `python3 -I scripts/wav_report.py /tmp/seam/*.wav`. Read 2 fields:
   - `loop_seam_ratio`: the step from the last sample to the first sample, divided by the
     99th-percentile step inside the file;
   - `edge_step_ratio`: the largest step across the last N and the first N samples joined
     (N is 64 by default; set it with `--edge`), divided by the same 99th-percentile step.
3. **Apply the rules.**
   - `loop_seam_ratio` at most 1.0. The seam step is then no larger than a normal step inside
     the file, so the ear does not hear a click.
   - `edge_step_ratio` under a limit that you set and write in the audio contract (for example
     1.5, a sample value). This catches a codec ramp or a short glitch near the edges.
4. **Fix and measure again.** For a scripted loop, render it as a circular buffer so the end
   flows into the start. For an edited track, move the loop start or cut to a zero crossing.
   For an encoded file that fails while its source passes, encode again (for example at a
   higher quality) and decode again. Never mark a seam as passed from the source WAV only.
5. **Record the result.** Write 1 row per loop: file, decoded or source, both ratios, PASS or
   FAIL. Check the rows with a script, not from memory.

A video music bed that loops (a trailer or a store clip) uses the same steps. Measure the
seam on the audio that the final encode holds. Decode the audio track of the video to PCM.
Cut exactly 1 loop period that starts at the loop start, and run the report on that cut.

## Music sets

A music set is a group of tracks for areas, fights and menus. It can come from a procedural
generator, from edited album tracks, or from an AI music web service.

1. **Settle the scope.** Ask 1 question if the count is ambiguous (for example "3 albums" or
   "3 tracks").
2. **Read the game.** List areas, fights and menus from the game data. Read the music system to
   learn its layers, keys and how it switches cues.
3. **Measure references.** Measure reference tracks into a targets table: tempo, spectral
   centroid, band energy shares and onset rate.
4. **Write the config or brief.** Map each cue to its source, tempo scale and loop start. Give
   each area a shared tempo and key family, so cues inside an area can switch cleanly. For a
   generation service, add shared style text and an exclusion list.
5. **Pilot first.** Render or generate a small set at both ends of the energy range (the
   calmest and the most intense). Measure it against the targets and get approval.
6. **Tune in small steps.** Change one level or pattern at a time. Measure each stem alone
   before a mix change; a stem can be far too quiet inside the mix. An onset detector reacts
   strongly near its threshold, so add or remove single hits.
7. **Render all.** Use a time stretch that keeps pitch, normalize loudness, then encode. Check
   seams, clipping and DC offset on each file. Match loudness to the old set within a set
   tolerance (for example 1.5 LU).
8. **Render again and compare hashes.** Every file must match.
9. **Ship beside the old set.** Add a settings choice that picks the set. An empty slot falls
   back to the original track. This lets a designer A/B the sets in the game.
10. **Import and test.** Check each `.import` file for the loop setting and a uid. Run the
    audio tests with the real files.
11. **Verify the report.** Check every number in the notes with a script before you report.
    Check that edit scripts only read the source folder, and that no source audio is staged
    for commit.

**AI music web service rules.**

- Check the account and credits with a read-only call first.
- Submit 1 cue at a time. Record each take link in an index file as you go.
- Stop at each CAPTCHA and ask the user.
- Stop at any paid step (for example a paid WAV unlock) and ask the user. Use a format the
  plan allows, such as MP3, if the user agrees.
- Close any login window before an automation tool opens the browser profile.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| A 48 kHz file reports 9 % too long | The report tool assumed 44.1 kHz | Read the rate from the header, or pass it |
| A one-shot feels late | Leading silence (for example 36 ms) in the recipe | Trim the start under 1 ms |
| A loop clicks once per cycle | Seam step above the 99th-percentile step | Render as a circular buffer; match the end values |
| WAV seams pass but the game clicks | Codec error at the edges of the encoded file | Measure the decoded file; render again |
| An 8 s loop stops at about 3 s | A fixed loop end after a compressed import | Set the loop end from the stream length at run time |
| Each new loop file breaks tests | Hard-coded loop tables in tests | One name rule for loops |
| A focused file test passes, the suite fails | Rules in other audio tests | Run the whole audio folder |
| A new file fails to load | First import pass | Import twice; judge the second pass |
| An audio timer runs in pause | Audio nodes process in pause | Stop the timer on pause |
| A duck still fires with its source muted | A muted bus still feeds a sidechain | Bypass the compressor to switch a duck off |
| A cue sounds harsh | Too much high energy | Compare the energy share above 3 kHz with a known soft cue |
| The mix recording is all zeros | A real-time record effect on a multi-channel device | Use Movie Maker mode |
| A recording runs far too long | Movie Maker time keeps the results screen open | Meter only the play part |
| Session WAV too big to load | A whole-file meter | Use a streaming meter or ffmpeg |
| The meter is off by more than 0.1 LU | A filter shape that does not match BS.1770 | Use the bilinear K-weighting form; check with the sine |
| Reward tiers do not rise in loudness | Gated loudness on short cues; peak normalization | Use momentary max; normalize by loudness |
| A latency probe passes in CI | Headless gives a dummy 0 ms latency; some drivers read 0.0 | Make the probe fail in headless and on 0.0 |
| The cue log misses physics-step cues | Entries keyed by frame number | Key log entries by identity |
| A scripted fight never reaches later phases | The scripted player deals too little damage | Lower boss health at set times in the recorder |
| A capture writes no result once | A flaky capture run | Retry once and record the retry |
| A connect with `unbind(0)` prints an error | The signal has no arguments | Handle 0-argument signals in a separate path |
| A typed read fails on event data | The field holds a different type | Read it untyped; report the contract mismatch |
| The bus file shows a large diff | The editor rewrote it in its own format | Commit the rewritten file with its `.uid` |
| Reported folder size disagrees with `du` | `du` counts disk blocks | Report the apparent size |
| Notes state wrong seam results | Written from memory | Check each number with a script |
| A drum stem disappears in the mix | Stem never measured alone | Measure each stem alone first |
| An in-place `sed -i` edit fails on macOS | BSD `sed` needs a suffix argument | Use a Python edit or the editor tool |

## Artifacts to build

- **Sound generator script.** Seeded synthesis helpers (oscillators, noise, envelopes,
  filters), one recipe per cue, a loudness normalizer with a peak ceiling, and an output
  folder argument so you can render twice.
- **File report.** One JSON line per file with the fields in step 7. `scripts/wav_report.py` in
  this skill is a standard-library version; run `python3 -I scripts/wav_report.py --selftest`
  first.
- **Hash compare.** A short script or shell line that hashes 2 render folders and prints any
  file that differs.
- **Audio autoload.** The only owner of players: a bounded pool, one-shot and loop entry
  points, a silent path for an unknown id, and no players in headless mode.
- **Audio tests.** File tests (existence, rules, the loop name rule) and runtime tests (event
  routing, pool bound, unknown id, headless).
- **Mix capture scene or script.** It plays a fixed scene under Movie Maker mode and writes an
  event log with timestamps, so the meter can cut the play part.
- **Mix meter.** Integrated LUFS, true peak, momentary max, per-event levels, gaps and duck depth,
  printed as a PASS or FAIL table against the audio contract.
- **Audio contract.** File names, buses, targets per bus, size budget and the loop rule.
- **Music config or brief.** Cue to source, tempo scale, loop start, area tempo and key family.
- **Takes index.** For a web service: cue, prompt id, take links and the chosen take.
- **Listen checklist and recheck file.** One row per cue or review finding, with a result.

## Related skills

- `headless-godot-runs`: the safe flags and cleanup for headless imports and tool runs.
- `godot-testing`: the test loop, how to prove a test can fail, and the finish gate.
- `visual-verification`: windowed captures; a Movie Maker recording needs a real window too.
- `feature-seams-and-saves`: ship a new music set behind a settings choice and a data seam.
- `release-and-store`: the trailer and store audio use the same loudness numbers, and its
  music-bed seam check calls "Measure a loop seam" in this skill.
- `fleet-game-dev`: shared-file waits, shell pitfalls and when to ask before a paid step.
