---
name: release-and-store
description: >-
  Ship a Godot game: export release builds for desktop and Web from the command line, cut a
  demo or playtest edition from the same project and prove no full-game or dev file leaks into
  it, make the game fully playable on a gamepad or handheld PC with the right button glyphs,
  record repeatable gameplay trailers and store screenshots from scripts, and research the
  current store rules for a cited launch guide and store page draft. Use it whenever someone
  wants to export, package, zip or smoke-test a build, make a demo, add controller or Steam
  Deck support, remap buttons, show pad glyphs, cut a trailer with Movie Maker, make capsule
  art or screenshots, or asks "what do I need to launch on Steam?", even if nobody says
  "release". Use it again after gameplay changes, because trailers, screenshots, store text
  and the demo cut all go stale.
---

# Release and store

A game that plays well in the editor is not yet a product. The exported build can miss data
files, a demo can ship the full game inside its pack, a pad can fail to reach a menu, and the
store page can promise content the game does not have. This skill treats each release output
(builds, demo, input, trailer, store page) as a scripted artifact with a check that proves it.
Scripts make every output again in 1 command after the game changes, and the checks catch the
leaks and gaps that a person does not see by eye.

## When to use

- You export a Godot game for 2 or more platforms, or for the Web.
- You ship a demo, a playtest build or another edition from the same project.
- The game must play fully on a gamepad or a handheld PC.
- You need a gameplay trailer, share copies, store screenshots or store art.
- You need a current, cited guide to a store launch, or a store page draft.
- Gameplay or rules changed, and the release media must be made again.

## When not to use

- You harden save files against bad data. Use `feature-seams-and-saves`.
- You inject input in unit tests only. Use `godot-testing`.
- You need a window capture review of a UI screen. Use `visual-verification`.
- You make the music or sound for the trailer. Use `game-audio`.

## Method: export builds and editions

1. Read the engine version with `godot --version`.
   The export templates must match it exactly, including the status suffix (for example
   `4.3.stable`).
2. Download the export templates archive and the official checksum file for that version.
   If the download stalls, resume it with HTTP range requests (`curl -C -`), or fetch parts in
   parallel and join them.
   Check the SHA-512 sum before you unzip. It proves that a resumed download is whole.
3. Unzip the templates into the user template folder for that version.
   Check: an export with no template error.
4. Write the export presets in the editor or in `export_presets.cfg`.
   - Set the Web preset to the Compatibility renderer with thread support off. Most web hosts
     do not send the cross-origin isolation headers that threads need.
   - For a universal macOS build, turn on the ETC2/ASTC texture import setting in the project.
     This is a project setting, so ask its owner if you do not own the project file.
   - Use the platform name that your engine binary reports. Names change between versions.
   Check: `godot --headless --export-release "<preset>" <out>` passes for each preset.
5. Add every non-JSON data file type to the include filter of every preset.
   The default export takes resources and scripts only. A plain text, CSV or credits file stays
   out with no error.
   Check: search the exported pack for 1 path of each data type (step 11).
6. Write 1 export script that runs each preset into a staged folder.
   - Name each file by version and commit.
   - Print each file size.
   - Warn when the tree has uncommitted changes, because the commit in the name then lies.
   Check: the script exits 0 and prints 1 line per preset.
7. Stamp the build with the version and the commit in a small generated file.
   Show the stamp on the title screen. A tester can then report the exact build.
8. Mark each edition (demo, playtest, full) with a custom feature in its preset.
   Read it at run time with `OS.has_feature("demo")` inside 1 gate script.
   Every screen asks the gate. Do not test the feature in many places.
   Custom features exist only in exported builds. Give the gate an override (a command-line
   argument or a setting) so the editor and headless tests can act as each edition.
   Check: a headless test of the gate for each edition.
9. For a demo cut, follow the section "Demo cut by export plugin".
10. Gate store features behind a platform backend seam (an interface with a real backend and a
    fake backend for tests).
    In the demo, unlock no achievements and keep rich presence. Store guides commonly ask
    this.
    Check: a test that the demo flag blocks every unlock.
11. Audit each built pack.
    - Search it for forbidden paths, content ids and dev files (tests, tools, trailer scenes).
    - Search the UID cache file too. It lists paths of files that are not in the pack.
    - Search it for 1 required data path, to prove the data is inside.
    Check: the audit exits 0. See `scripts/pack_audit.py`.
12. Unzip each archive in a new temp folder and start the app once with an empty `HOME`.
    Use `--headless --quit-after 60` and expect exit 0.
    An empty `HOME` proves the build does not depend on your own save or settings.
    An exported app ignores `-s`, so you cannot start a tool script inside it.
13. Decide on purpose whether editions share the user folder.
    Godot names the user folder from the project name, so a demo and the full game share saves
    by default. For an edition that must not share, set a custom user folder name, for example
   with a feature-tag override of the custom user folder project setting.
    Check: copy a save in, start the other edition, and compare the save files before and after.
    A load can rewrite a save after a migration.
14. Wrap play, test, export and dist in task-runner recipes, with an optional edition
    argument.
    Move old archives to an old folder, so an upload never takes a stale zip.

## Demo cut by export plugin

A demo cut must leave full-game content out of the pack, not only lock it in the menu. A player
can open an unprotected pack with public tools.

1. Map how the game loads content: data rows, scenes, art, audio, and generated lists.
2. Write the demo set as data: the rows and the file globs to keep.
3. Write an `EditorExportPlugin`.
   - In `_export_file`, call `skip()` for each full-game file glob.
   - For a data file, filter the full-game rows out, then add the filtered copy with
     `add_file`.
   - Act only when the export features hold the demo feature.
   - Register the plugin from an editor plugin, and enable that addon in the project. A headless
     export runs only enabled plugins.
4. Change each `preload` of a full-game file in a kept script to a guarded load.
   `preload` fails at parse time when the file is gone. A guarded load checks
   `ResourceLoader.exists` first.
5. Export the full edition from the changed tree. Compare its file list with the old full
   export. The plugin must not change the full build.
6. Export the demo. Run the pack audit.
7. Read the audit for shared names. A filter by name prefix can cut a key that both editions
   use. Exempt shared names explicitly.
8. Add compiled script files (`.gdc`) and import caches under full-game folders to the skip
   globs.
9. Search the asset file names in the demo pack. A file name such as a preview image can
   reveal cut content. Rename or remove it.
10. Zip the demo. Unzip it in a temp folder and run it once (Method step 12).

## Gamepad and handheld support

1. Probe the engine input defaults headless before you design.
   Print each built-in UI action and its events. In some versions the UI accept and cancel
   actions have no pad events.
2. Use 1 input hub autoload, plus static helpers for defaults, event encoding, device family
   and glyphs. All screens ask the hub.
3. Add pad events to the UI accept and cancel actions.
   Set the device of each new pad event on purpose. A new joypad event defaults to device 0,
   so only the first pad works. Use device -1 (all devices) for shared actions. Use 1 device
   only for a deliberate single-player read.
4. Save remaps as plain dictionaries (action, event type, code), not as resource objects.
   Plain data survives version changes. Add a remap page to settings.
5. Pick the glyph family (for example Xbox, PlayStation, Nintendo, generic, keyboard) from the
   vendor id in `Input.get_joy_info` first, then from the joypad name.
   Make 1 glyph sheet per family. Swap the sheet when the last used device changes.
6. Put every screen prompt on 1 prompt control that asks the hub for the glyph.
   - Keep the text as the fallback when no glyph exists.
   - Put the icon on the left of the text, so a long label cannot cover it.
   - Change the words for pad families, for example "Press any button" for "Press any key".
7. Floor the dead-zone slider, and clamp the applied value too.
   A value of 0 makes stick drift move the cursor.
8. Check that pad focus reaches every focusable control.
   Test edge cases, for example 2 tab bars on 1 screen edge. Choose the tab of the focused
   group, else the nearest one.
9. In tests, send events with `Input.parse_input_event`. Send both the press and the release.
   `Input.action_press` does not reach `_unhandled_input`, and a button with only a press
   event can act on release. Reset all bindings after each test.
10. For a handheld PC checklist, write a check tool.
    - Run it at the handheld size (for example 1280x800) in a real window.
    - Override the pad info so the game sees the handheld pad.
    - Save 1 capture per screen and per input family, at 1x and 2x UI scale.
    - Look at each capture and mark each checklist item pass or fail.
11. Ask 1 question per failed item that you do not own, for example a project window-mode
    default. Do not edit a file outside your scope to pass a checklist.

## Trailers and store media

Script every clip, so a gameplay change costs 1 command and not a day of re-editing.

1. Test Movie Maker mode with a short clip first.
   Run `godot --write-movie <dir>/frame.png --fixed-fps 30 --quit-after <frames>` in a real
   window. It writes lossless PNG frames and a WAV file.
   Check the frame size, the frame count and the audio level.
   Movie Maker needs a real renderer. A headless run gives blank frames.
2. Write 1 shot script per clip from a scripted scene or a stress driver, with a fixed seed.
   - Each clip sets its own save state, so no clip depends on your save.
   - Each clip turns off tutorial hints. Some hints hide only after real input events, so send
     them.
   - Each clip turns its music off. The assembler adds 1 music bed over the whole cut.
3. Record each clip at the game view size. Upscale later.
   - Check that each clip took a normal time. A clip under 1 s or with too few game phases
     failed; record it again at a longer length.
   - Log per-frame stats (for example entity counts) and check them against caps.
4. Make contact sheets with time labels to pick cut points:
   `ffmpeg -i clip.mp4 -vf "fps=1/2,scale=320:-1,tile=6x4" -frames:v 1 sheet.png`.
   Add a `drawtext` time label per tile. The `tile` filter replaces ImageMagick `montage`.
5. Write 1 assembly script.
   - Read cut points from data.
   - Add title cards in the game font and palette, fades and the logo.
   - Upscale with nearest-neighbour (`scale=iw*3:ih*3:flags=neighbor`) for pixel art.
   - Give the script an output-folder flag, so a trial run does not overwrite the release.
6. Encode a master and a 2-pass share copy under the size limit of the target site.
   Compute the bitrate from the size limit and the length.
   Check each output with `ffprobe`: size, length, codec, resolution.
7. Check the music loop seam. Compare the sample values on both sides of the seam
   (`scripts/loop_seam.py`).
8. Extract stills at set times. Compare pairs of near stills for a seam or a frozen frame.
9. Pick store screenshots from the stills at the store size. Assert the size in the script.
   Choose varied gameplay scenes, not 8 views of 1 fight.
10. Fetch the current store asset list. Make each store asset (capsules, header, library art)
    with a script at the exact size. Remove every mockup tag in the script, not by hand.
    Look at every asset.
11. Wrap the chain in 1 command and a task-runner recipe.
    Run it in the background and watch for its step header lines, not for any word that
    ffmpeg prints.
12. Keep the raw frames until the assembly is final. A re-assembly without them needs a new
    recording. Delete temp frames on exit only.
    A single-trailer run must not delete the outputs of other trailers.
13. Keep large media out of git. Copy the deliverables to a release folder.
14. Update the store guide rows and the README times from the measured run.
    Disclose AI-made images where the store asks for it.

## Store launch research

Store rules, fees and waits change. Research them from primary sources at launch time and cite
each fact.

1. Read the game design docs and the build and export notes first. The guide must fit the game.
2. Download the store documentation pages to a scratch folder as raw HTML.
   Convert them to text (`scripts/html_to_text.py`), so you can quote exact numbers.
3. Read the rules for fees, waits, required assets, the content survey, demos, festivals, the
   handheld check and legal rules (for example trader rules in the EU).
4. Search the web for facts outside the store docs. Confirm each with a fetch of the source.
5. Record each fact and its source in a research log.
6. When 2 pages disagree, plan with the safe value and record the conflict.
   For example, 1 wait was given as 21 days on 1 page and 30 days on another; plan with 30.
7. Mark each point that no primary source confirms as "not confirmed".
8. Check the engine docs for save-path and build-name risks.
   A project rename moves every save, because the user folder follows the project name. Record
   it as a launch risk.
9. Write the guide with a source tag on each fact.
10. Write the store page draft. Check each game claim against the game data, and each text
    against its length limit. Do not name content that the game does not have.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| A text or CSV file is missing in the exported game | The preset include filter lists `*.json` only | Add each needed file type to every preset filter |
| The demo pack lists full-game or trailer paths | The UID cache keeps paths the plugin skipped | Audit the UID cache; complete the skip list |
| The audit finds a `.gdc` under a full-game folder | Compiled scripts escape a `.gd` glob | Skip the whole folder |
| The demo fails to start with a parse error | A kept script `preload`s a cut file | Load it only when `ResourceLoader.exists` |
| A shared item is gone in the demo | The row filter cut a shared key | Exempt shared names |
| The demo and the full game share saves | The user folder follows the project name | Decide on purpose; set a custom user folder; test carry-over |
| `-s tool.gd` does nothing on the exported app | Exported apps ignore `-s` | Run tools from the editor binary |
| The Linux preset fails | The platform name changed with the engine version | Use the name the binary reports |
| A template download stops near half | 1 long HTTP stream stalled | Ranged or parallel requests, then the checksum |
| The universal macOS export fails | ETC2/ASTC import is off in the project | Ask the project file owner to turn it on |
| Bad saves throw parse errors in release | No save hardening | See `feature-seams-and-saves` |
| Only the first pad works | New joypad events default to device 0 | Device -1 for shared actions |
| A test press never reaches `_unhandled_input` | `Input.action_press` skips the event path | `Input.parse_input_event` |
| A button acts on release in tests | Only the press event was sent | Send press and release |
| The second tab on 1 edge is unreachable by pad | Focus picks the first tab bar | Choose the tab of the focused group, else the nearest |
| A label covers its glyph | Icon placed after the text | Icon on the left when text is present |
| A checklist item fails in a file you do not own | Project default outside scope | Ask 1 question; do not edit |
| A re-assembly needs a new recording | Raw frames were deleted | Keep raw frames until the cut is final |
| A single-trailer run deleted screenshots | Cleanup took a shared folder | Clean only the run's own temp folder; regenerate |
| A clip ends early or takes under 1 s | The scene ended or crashed | Record again at a longer length; check the time |
| The assembler fails on a frame pattern | A clip was not recorded | Record the clip, then assemble again |
| Tutorial hints show in the trailer | Hints hide only on real input events | Send input events in the shot script |
| A mockup tag shows on store art | It was removed by hand once | Remove it in the art script |
| The watcher fires on every ffmpeg line | It matched a common word | Match step header lines only |
| Blank frames in a recording | Movie Maker ran headless | Record in a real window |
| A store claim names absent content | Text not checked against data | Check each claim against the game data |
| 2 docs give different waits | The docs disagree | Plan with the safe value; log the conflict |
| A rule has no source | Docs are silent | Mark it "not confirmed" |
| `sed -i` or `sed 1i` fails on macOS | BSD `sed` syntax | Use a heredoc or a Python edit |
| A script fails on a missing image or array library | Wrong Python, or the library is absent | Use the right interpreter, or the standard `array` and `wave` modules |

## Artifacts to build

- Export script: runs each preset into a staged folder, names files by version and commit,
  prints sizes, warns on a dirty tree.
- Build stamp: a generated file with version and commit that the title screen reads.
- Edition gate script: 1 function per rule, read from the custom export feature, with a
  headless test.
- Demo export plugin and demo set: an `EditorExportPlugin` plus a data file of kept rows and
  skip globs.
- Pack audit: forbidden and required strings checked against each pack and the UID cache
  (`scripts/pack_audit.py`).
- Smoke runner: unzips each archive in a temp folder and starts it with an empty `HOME`.
- Platform backend seam: an interface, a real backend, a fake backend, and an achievements
  data file generated from game data.
- Input hub: an autoload with defaults, event encoding, device family and glyph lookup; a
  prompt control; 1 glyph sheet per family.
- Handheld check tool: runs at the handheld size with a pad override and saves captures per
  screen and family.
- Trailer chain: shot scripts with seeds, a record-all script, an assembly script with an
  output-folder flag, a screenshot picker and a store art script.
- Store guide: a table of facts, each with a source tag and a "not confirmed" mark where
  needed; a research log; a store page draft.
- Task-runner recipes: play, test, export, dist, demo, trailers.

## Scripts

- `scripts/pack_audit.py`: checks a pack or any binary file for forbidden and required strings.
- `scripts/html_to_text.py`: converts saved HTML pages to plain text for exact quotes.
- `scripts/loop_seam.py`: measures the jump at the loop seam of a 16-bit WAV file.

Each script has a usage line at the top. They use the Python standard library only.

## Related skills

- `feature-seams-and-saves`: save hardening, save migration and flagged modes; this skill
  only decides whether editions share saves.
- `headless-godot-runs`: headless flags, tool scripts and the task runner that the export
  recipes use.
- `godot-testing`: the test loop and input injection in tests; this skill covers the pad
  design.
- `visual-verification`: the window lock, capture queue and capture review for handheld
  checks and trailer recordings.
- `game-audio`: the music bed and mix loudness for the trailer.
- `pixel-art-pipeline`: palette-locked art for title cards and store art.
- `fleet-game-dev`: sandboxed workers cannot record windows; give recordings to a worker
  that can.
