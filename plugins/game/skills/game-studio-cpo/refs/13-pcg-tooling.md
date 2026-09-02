## Procedural Generation, Tooling & Workflow


### When To Use PCG (and When Not To)

- Choose PCG only when the experience truly needs it — random generation costs dev time, CPU, and memory; a hand-built linear level often serves better. **When it flips:** (a) you need uniqueness, robustness, adaptability, or sheer size beyond hand-authoring → use PCG, picking which of those four payoffs justifies the feature before building; (b) you need a specific authored experience in a specific order (story beats, scripted pacing, tutorials) → handcraft it, because emergent systems won't reliably produce a fixed arc.
- Treat PCG as a tool for the designer, not a replacement — it offloads tedious detail decisions (placing every tree) so humans focus on intent.
- Add small hand-authored content into a generator for players to discover — quantity is meaningless if a million procedurally-identical pieces all feel the same; surprise drives search/exploration dynamics. **When it flips:** pure-procedural roguelikes deliberately want everything generated → seed rare handcrafted set-pieces sparingly so they read as special.
- Remember PCG ≠ randomness — letting players build (sandbox tools, modding) is also content generation, often with more immersion than random output.
- Use head-to-head multiplayer and player-generated content (maps, mods, characters) as an endless content engine — other players and creators supply ever-new challenges cheaply, extending the possibility space far past hand-authoring.
- Exploit PCG's size advantage: generate content at runtime from a seed + algorithm instead of shipping it — a seed + algorithm replaces gigabytes of baked assets.
- Don't try to generate complex art/full models from scratch at runtime — generate layouts and swap in premade modules or manipulate existing meshes; from-scratch sprites/models rarely match the game's theme and full-model runtime generation is too slow and over-engineered.
- Compound generation through layered systems (models built of parts, parts built of parts, items modifying models) — small generators multiply into vast variety.

### Choosing & Combining PCG Techniques

- Choose the PCG approach by how much top-down control you need — ranked least-to-most control: simulation (has history, reacts to player) → constructionist → grammar → optimization → constraint-driven.
- Match PCG technique to required guarantees — use constraint solvers / generate-and-test when you need hard playability or balance guarantees (they guarantee solvability where grammars alone can't); use grammars/simulation when soft "close enough" suffices.
- Mix techniques across abstraction layers — e.g. constructionist room templates + a constraint solver for item placement balances authoring control with variety; note layers can't easily renegotiate with each other.
- Pick knowledge representation on the authoring-control vs. pattern-recognition tradeoff — experiential chunks give art control but players spot repeats; components/subcomponents hide patterns but demand a stronger algorithm.
- Avoid experiential chunks when pattern recognition isn't wanted — players are pattern-recognition machines and will notice repeated chunks.
- Reuse vetted community/engine algorithms for solved problems (spherical gravity, primitive meshes, spherical/disc sampling) — plug-and-play rather than reinventing.

### Generate-and-Test & Overgeneration

- Overgenerate then test against acceptance criteria — loose grammars/generators create surprising content; a test suite culls the unacceptable while keeping variety (undergeneration kills variety).
- Keep the grammar/rules separate from the interpreter — the power is fast rule iteration; merging rules into branching control flow blocks that.

### Analyzing & Debugging Generators

- Think about the SPACE of content your generator/system can produce, not one perfect piece — analyze its expressive range with metrics and heatmaps to spot bias and verify changes across that space.
- Debug emergent/PCG-driven systems with fixed random seeds and decision logging — emergent systems can't be spot-checked and a rare-branch bug needs reproducibility; default to a time seed for variety but expose a fixed seed for testing.
- Don't overplan a simulation/PCG model — get something running and iterate; you can't (and shouldn't) predict everything that emerges.
- Mind time AND space complexity as first-class concerns in generators — 3D especially explodes; analyze the worst case to gauge average runtime.
- Cap generation scale to a tested budget — e.g. a dungeon over ~200×200 mostly-wall tiles or a sphere over ~300 segments blows past load-time/vertex limits.

### Seeds & Reproducibility

- Always store the seed used to generate content and seed deterministically — replays the exact same world/dungeon/level on demand without saving the full result; lets you destroy a level to free memory, then rebuild it identically later from its seed when the player returns.
- Default-seed from system time/clock/keystroke/mouse entropy for variety in shipping builds, but expose/use a fixed seed while debugging/testing — fixed seeds make bugs reproducible and runs identical for replays/level seeds/tests; ensure the RNG is called the same number of times across runs. (widely corroborated)
- Know that PRN sequences eventually cycle and that card draws change later probabilities (unlike dice) — long-running generation can repeat; widen the seed range / equation complexity only if repetition becomes visible; never assume dice are "hot" or "cold."
- Seed the engine RNG (or keep a separate System.Random) when you need determinism — Random is shared global state; control it for replays, level seeds, and tests.

### Random Number Generators

- Don't trust the language's built-in RNG / don't use rand() — standard library generators are often weak (poor period, correlated low bits, planar clustering, a single global stream, can't be reseeded portably); know your generator's flaws (widely corroborated).
- Use the Mersenne Twister when you need quality, multiply-with-carry "Mother of All RNGs" when memory is tight — MT has a huge period at the cost of a 624-int buffer; multiply-with-carry gives large periods from ~6 seeds.
- Never invent your own RNG algorithm — they are subtle; copy a vetted one (Mersenne Twister for quality, multiply-with-carry "Mother of All RNGs" when memory is tight, Knuth/runtime source).
- Shift out or avoid the low bits of a linear congruential generator — LCG least-significant bits have a much shorter period, ruining small-range uses like dice rolls; shift right into the more-random middle bits before a modulus.
- Prefer the engine's game-optimized Random over the language's general-purpose one — they coexist; alias explicitly so you never grab the wrong one.
- Generate genuine high-entropy randomness only for one-time seeds/session keys (slow) — sample many high-entropy hardware/OS sources then mix with a crypto hash (MD5/SHA); never as a PRNG replacement.
- Verify your RNG use against the designer's intended distribution with a chi-square test — confirms your sampling produces the target probability distribution, not just that the RNG is good.
- Verify your RNG/shuffle is actually fair and treat shuffling as a real algorithm — a deck needs ~7 riffle shuffles to be statistically random; weak/biased shuffles silently favor certain outcomes.

### Sampling Distributions

- Build the correct sampling distribution explicitly — uniform spherical points need z = 1−2ξ latitude sampling (normalize-a-cube clusters at corners; naive spherical coords cluster at poles); uniform disc needs r = √ξ (raw r=ξ clusters at center — fine for bullet spread but wrong for even coverage).
- Choose between rejection sampling and direct (polar/spherical) formulas by profiling — rejection can need many RNG calls; direct formulas pay for sqrt/trig; the winner is platform-dependent.
- Use weighted distributions (RAND/FLOOR/INDEX/COUNTIF patterns) to tune drop and event rates precisely — not all randomness should be uniform.

### Noise & Procedural Textures

- Layer noise octaves (each ~2× frequency, divided by frequency) for natural turbulence — low octaves give broad strokes, high octaves add fine detail; use a non-integer frequency increment to break up grid artifacts.
- Pregenerate and hash into a fixed noise table rather than regenerating per frame — re-randomizing noise makes textures flicker and crawl; repeatability keeps procedural textures stable on their surfaces; bake multi-octave noise into a lookup texture when shader noise calls are too expensive.
- Bake multi-octave noise into a lookup texture when shader noise calls are too expensive — several per-fragment noise() calls can dominate GPU cost; store octaves in texture channels and sample once.
- Keep generated textures/levels close to familiar real-world patterns (stone, bark, stripes, corridors, rooms) via modular/noise patterns — fully random layouts/textures disorient players.
- Build planets/terrain by layering manipulated spheres or applying Perlin/noise height maps — multiple offset meshes (land/water/sky) is a scriptable alternative to a single height-mapped sphere; expect 3D PCG to demand real graphics math and reuse documented algorithms.

### Grammars & Simulation-Based Generation

- Base simulation on real-world analogs and break it into basic separate fields, letting their interplay produce results — operate at what the player sees or one layer below; Dwarf Fortress derived biomes from temperature/rainfall/elevation/drainage fields, giving natural, internally-consistent output where problems self-solve.
- Don't overcomplicate the simulation model — operate at what the player sees or one layer below; useless variables hinder tuning, paralyze development, and break the believable illusion.
- Base simulation on real-world analogs — falling back on reality (rain shadows, drainage) lets you fix defects with broader understanding of fundamentals.
- Simulate special events as "virtual observations" backdated to the event time — model a merchant restocking Monday, a mine opening, or an estate sale without continuous simulation.

### Level & World Generation

- Pick generation timing to match the level's needs — endless worlds generate on player movement (player-driven); bounded dungeons generate all at once (system-driven).
- Generate and reveal only what the player can discover (line-of-sight reveal) in large/endless worlds — player-triggered PCG spends memory/CPU only on visited areas, enabling effectively infinite worlds.
- Guarantee solvability first: lay an essential path connecting entrance to exit before adding anything else, then branch off the guaranteed path for variety — prevents unreachable exits in generated levels. (widely corroborated)
- Build variety by branching off the guaranteed path — add random side-paths and chambers onto the essential path so no two levels are alike yet all are completable.
- Generate filler structures (chambers/rooms) procedurally instead of as prefab art — saves memory and lets them fit any grid position.
- Enclose system-generated bounded levels with an impassable border — otherwise the player/AI walks into empty void.
- Reuse one art asset for dual roles where sensible (one "exit" sprite as both entrance and exit) — cuts asset count without confusing the player.
- Generate procedural level content relative to the player's position and direction so the next reachable element always exists — endless, fair traversal in either direction.
- Add controlled randomness (platform length, horizontal/vertical gaps) but clamp values to designed min/max — variety without unreachable or out-of-bounds layouts.
- Recycle far background panels ahead of the player as they move — a few panels create an infinite scrolling backdrop without unbounded object counts.

### Modular & Combinatorial Asset Generation

- Break assets into swappable modules (blade/hilt/handle) and combine at runtime — a handful of parts yields exponentially many whole assets.
- Do the combinatorics before committing: parts-per-slot ^ slots = total assets — 5×5×5 modules = 125 weapons; adding 3 modules can multiply output 8×.
- Author modules with identical bounding boxes for quick layering, but shrink boxes and offset mathematically in production — avoids wasted pixels.
- Set a shared pivot point across modules so they animate/rotate as one — pre-aligning pivots makes a single scripted swing work for every combination.
- Apply differentiation parameters (color tint, vertex jitter, minor add-ons) on top of modules — cheaply multiplies uniqueness beyond raw module count.
- Drive uniqueness with reuse-with-variation, e.g. recolor one sprite into many items — color/texture swaps turn 2 sprites into 8 distinct items.
- Treat every GameObject as a cost, especially on mobile — collapse multi-object constructs (e.g. 4 sprite-objects per weapon) into one rendered sprite where possible.

### Designer Control Over Randomness

- Guide PRNs toward design intent rather than pure chance — e.g. force an essential dungeon path to only move up/down/right so it reliably spans the grid.
- Bound randomness with designer guidelines — unconstrained spontaneity overwhelms the player or breaks the system (paths off-grid, broken levels); force essential paths and clamp values to designed min/max.
- Roll separate decisions for type vs. strength — pick the item kind with one PRN, then a second weighted PRN for its power tier.
- Weight rarity inversely to power — common tiers spawn often and weak, rare tiers spawn seldom and strong; tune the percentage bands per tier.
- Randomize values within a per-tier range, not a single fixed number — every item of a tier feels slightly different while staying balanced.
- Use a random number as a probability gate, not a scripted outcome (`if Random.Range(0,3)==1`) — leaves branching to chance and keeps generator code short.
- Don't let players balance the game themselves (beyond difficulty levels) — they over-power themselves then get bored; controlled, curated randomness beats player-tunable randomness. **When it flips:** sandbox/modding games hand creation tools to players deliberately → expose generation parameters as a feature, since authorship IS the play.

### Procedural Music

- Abstract a creative domain into a formula before coding it — music becomes generatable once reduced to tempo + melody + repetition.
- Anchor generated audio to a measure/timer so it can't drift — confining sounds to a fixed time frame keeps a procedural song from desync'ing on loop.
- Quantize procedural sound placement to tempo divisions (1/4, 1/8, 1/16) and anchor it to a measure/timer — equal-measure spacing keeps a random melody harmonious instead of dissonant and prevents desync on loop.
- Distribute leftover silence evenly: interval = (measure − totalPlayTime) / playCount — fills the measure uniformly.
- Add melody via directional pitch drift (rise then fall, flipping every N notes) — controlled pitch movement reads as musical rather than noisy.
- Loop a single short section intentionally for atmospheric background — repetition makes music recede so it doesn't distract from play.

### Tooling Strategy & ROI

- Build custom tools the moment a task turns repetitive or error-prone — manual content steps waste dev time and fail at the worst moment (Murphy's Law); justify each by ROI before committing.
- Justify every tool by its ROI: estimate build cost vs. time saved before committing — a tool that doesn't return more than it costs is wasted effort. **When it flips:** when the deadline is near and the tool wouldn't pay back before ship → ship the feature manually now; tooling investment only pays when amortized over enough future iterations.
- Treat tools programmers as force multipliers — AAA studios lean on tools to make content creation easier for designers/artists and to cut tedium; design tools around the actual user and involve them.
- Invest in design tools and notation (Machinations or equivalent) — a shared formal language lets a team see, simulate, and critique mechanics without reading code or spreadsheets.
- Buy proven marketplace / Asset Store / third-party solutions (pooling, audio management, atlasing, behavior-tree plugins) rather than reinventing them — usually cheaper than the dev hours to build equivalent quality. **When it flips:** when budget/time/control demands are high and the off-the-shelf tool can't meet them → roll your own.
- Build a tool just-enough for the present need, not maximally general — reserve abstract interfaces and generality for genuinely replaceable/pluggable modules; over-generalizing adds indirection, debugging pain, and complexity for no gain. **When it flips:** for reusable cross-project tooling and engine code likely to be extended → invest in generality and stable interfaces up front, since the cost is paid once but reused many times.
- Design tools around the actual user (designer/artist) and involve them in design — a tool that's hard to use or solves the wrong problem is worse than none; mock up the GUI before coding.
- Mock up custom tool GUIs before coding — cheap previews of the final result catch usability problems early.
- Encode team standards into tooling, not documentation — without an enforcement mechanism, contributors drift and the game breaks constantly; automate asset-config and build checks.
- Automate asset-config and build checks (e.g. AssetPostprocessor) rather than relying on a human to verify settings — manual verification of every asset/build steals dev time and lets errors ship.
- Invest in tool look-and-feel, internal tools included — a professional-looking tool earns trust and adoption, gives a good first impression, and improves usability.
- Stay in the engine community (Unite videos, forums, Answers) — most optimization/tooling knowledge is tribal and undocumented.
- Lean on official docs (engine Manual, Scripting API) over tutorials to become self-sufficient — tutorials get you moving, docs make you independent. (widely corroborated)

### Custom Editor Tooling Architecture

- Keep all editor-only code inside an `Editor` folder (separate Assembly-CSharp-Editor assembly excluded from the game build), or when editor API must live outside it wrap the API in `#if UNITY_EDITOR ... #endif` — strips editor code from the shipped build and avoids missing-namespace build failures.
- Give every custom tool a single root folder named after the tool, treated as an independent project — clean boundaries keep tooling organized, portable, and easy to share, update, extract, or distribute.
- Namespace all tool and game classes — avoids class-name collisions as the project and toolset grow.
- Always save and restore mutated static/global state (Gizmos.color, Gizmos.matrix, GUI.enabled) — these are global; leaking changes corrupts unrelated rendering/UI.
- Use immediate-destroy, not deferred-destroy, in editor context — deferred destroy won't work outside Play mode.
- Centralize all menu (MenuItem) entry points in one MenuItems class and mark menu-exposed methods static — one place to find and manage every tool's trigger, and static is required for invocation.
- Run polling/async editor work in a window's Update (~100×/sec on visible windows), not OnEnable — asset previews aren't ready right after a restart, so retry until available.
- Assign hotkeys to frequently used menu items — saves users time opening tools.
- Use C# events/delegates to decouple editor windows from inspectors — a palette fires a selection event; the inspector subscribes, with no hard reference between them; null-check before invoking and subscribe/unsubscribe in OnEnable/OnDisable to survive recompiles.

### Custom Inspectors & Property Drawers

- Build a custom inspector only when the default is unfriendly, needs validation/special interaction, or holds an unsupported data type — otherwise the default is fine; don't over-invest.
- Reach for built-in attributes (Range, Multiline, TextArea, Tooltip, Header, Space, ContextMenu, RequireComponent, FormerlySerializedAs) before writing any custom inspector — they restyle/validate/enforce with near-zero code.
- Prefer [SerializeField] on private fields over making fields public to expose them in the Inspector — keeps encapsulation while still serializing/exposing; never make a field public just to see it. (widely corroborated)
- Use [HideInInspector] for fields that must serialize but stay out of the inspector — separates persistence from presentation.
- Validate values at the inspector/edit layer (e.g. Mathf.Max(0,x) to block/clamp negatives) — the right place to guarantee valid component parameters; confirm destructive, irreversible actions with a dialog.
- Group and tame sprawling public variables — large default inspectors become "one giant scary monster"; organize logically or replace with a custom inspector.
- Disable irrelevant controls via GUI.enabled instead of hiding them — communicates state without layout churn.
- Confirm destructive, irreversible actions with a dialog — a resize that destroys data needs an explicit "are you sure?".
- Mark the object dirty when GUI changes (SetDirty / SerializedObject) — without it, edits silently fail to persist.
- Initialize inspector/window state in OnEnable, clean up in OnDisable, free resources in OnDestroy, and cache the cast target once — these are the lifecycle hooks (OnDisable→OnEnable also fire on script recompile).
- Prefer SerializedObject/SerializedProperty over direct target access for inspector fields — you get free undo support and property metadata so attribute drawers render correctly.
- Add `[CanEditMultipleObjects]` and use `targets` when batch editing matters — without it, multi-select editing is silently blocked.
- Write a custom PropertyDrawer for a serializable type/field that recurs project-wide — improves every occurrence's display without a full custom inspector and stays DRY; reach for built-in attributes (Range, Tooltip, Header) before any custom inspector.
- Name attribute classes ending in Attribute and put the PropertyAttribute subclass OUTSIDE any Editor folder while the PropertyDrawer goes INSIDE one — the attribute is runtime-facing, so the convention improves readability, keeps runtime-facing code separate, and mixing them up breaks the drawer.
- Override the property-height hook whenever a drawer needs more than one line — otherwise multi-row drawers clip.
- Validate the property type in a drawer's OnGUI and show a HelpBox on mismatch — fail loud and explain misuse instead of rendering garbage.
- Remember only one property drawer per field, but decorator drawers stack — design attribute use accordingly.
- Use PropertyDrawers/ContextMenuItem for editor tooling because they get undo/redo/multi-edit for free — and separate display from logic.

### Editor Windows, Look & Feel

- Use an EditorWindow for functionality not tied to one object instance; use an inspector when exposing a specific element's parameters — match the UI container to the interaction's scope.
- Wrap window creation (EditorWindow.GetWindow) in a static Show method and cache the instance (singleton) — one consistent entry point that reuses the live window.
- Generate asset previews on demand and cache them in a dictionary — auto-updates when the asset changes and avoids regenerating.
- Categorize/tab large item sets and put overflow in a scroll view — keep dense palettes navigable instead of dumping everything flat.
- Use built-in editor styles (e.g. boldLabel) before authoring custom styles — match native look with no effort.
- Set the correct style state per interaction (normal/hover/active/onNormal/onFocused) — drives feedback for selected/hovered/pressed controls.
- Define border offsets for 9-slice textures so only the center stretches — keeps button/tab art from distorting at arbitrary sizes; mark editor textures as the editor-GUI texture type.
- Prefer a skin asset over scattered style code for whole-GUI theming — like a CSS file: reusable across projects and tweakable without recompiling.

### Scene-View / In-Editor Manipulation Tools

- Drive interaction with explicit tool modes (View/Paint/Edit/Erase) and force the right transform tool per mode — prevents accidental rotate/scale while painting.
- Take passive control of click-heavy tools — stops the editor stealing focus/selection on every click.
- Read input from the current event and branch on event type (MouseDown/Drag/Up/Ignore) — gives a canvas/brush feel; handle Ignore to catch mouse-up outside the view.
- Convert mouse → world → grid coordinates and invert the Y axis — scene-view origin is top-left while screen-to-world assumes bottom-left; use the scene-view camera, not the gameplay camera, for coordinate math.
- Render a selected object's own inspector inline so users can edit it without hunting the hierarchy; use built-in move handles for drag-to-move with snapping.
- Validate moves before committing and revert on conflict/out-of-bounds — never leave content in an invalid state.
- Guard tool integrity with HideFlags — hide-in-hierarchy on tool-generated objects forces users through the tool's workflow; not-editable on transforms the tool depends on enforces invariants in code rather than trusting users; know the full HideFlags set.

### Data Containers & Persistence (ScriptableObjects)

- Use ScriptableObject assets as data containers that live independent of any GameObject — the engine handles serialization/parsing, often beating XML/JSON/text and removing custom parsers.
- Separate logic from data: keep parameters in a ScriptableObject the MonoBehaviour references — enables reusable "themes" (shared gravity/bgm/background) where editing one asset updates every level that uses it.
- Mark data classes [Serializable] and serialize public (or the appropriate) fields — required for ScriptableObject values to actually persist.
- Use EditorPrefs for per-developer environment state, ScriptableObjects for project-shared state — pick storage by whose state it is.
- Remember dictionaries are not engine-serializable — they won't appear in the Inspector like lists, so build your own custom runtime/debug view when you need to inspect them.

### Visual Debugging & Gizmos

- Use gizmos to expose code state visually to non-programmers — a good gizmo is worth more than a thousand lines of debug logging and lets artists/designers debug on the fly; color-code by state for instant validation, and draw debug overlays for sensors, paths, and grids.
- Draw waypoints, rays, bounds, grids, FOV cones, A* routes, and navmeshes as gizmos when tuning behavior — seeing structure makes tweaks far faster than reading numbers.
- Use always-visible gizmo hooks for pickable aids and selection-only hooks for selection aids — match visibility cost to need.
- Use a draw-gizmo attribute in a separate editor class when you can't edit the target component, or want game/editor code cleanly separated — decouples visualization from runtime code; prefer the in-component hooks for the common case.
- Color-code gizmos by state (valid/invalid, normal/selected, Success/Running/Failure) — instant visual validation of logic.
- Add debug-only decorator/inspector facilities (Fake-state and Breakpoint behavior-tree nodes, Inspector Debug mode for private fields/ObjectIDs in Play Mode) — force a child's result, log on reach, and resolve serialization conflicts.

### In-Engine Debug & Tweaking Tools

- Build a generic runtime "tweaker" so any variable is editable live in-game with min/max ranges in a couple of lines, transparently to the variable's users — tuning balance is constant work; let it dump tweaked values into headers/constants so debug-only tweakables ship as compiled-in release constants.
- Add a system-disable toggle to each subsystem (audio, etc.) — the fastest way to confirm or rule out a subsystem as a bug's cause; pair with navigation aids (status functions and leveled logging) to debug even messy code.
- Provide a command queue for an API — lets you detect duplicate calls, started-then-stopped-same-frame waste, and log requests for debugging.
- Build a debug memory manager (debug-only) overriding new/delete to log file/line, detect leaks, catch over/underflow via guard padding, and report % of allocated memory actually used; track alloc type (new vs new[]) to catch mismatches, and make the profiler itself compile out via macros.
- Give a "shield"/God-mode flag for testing invulnerability — lets you test scenarios without dying; many shipped games keep it as a cheat.
- Use trace/log statements for intermittent bugs you don't want to breakpoint — they auto-disable in release. **When it flips:** in runtime/feel-critical/profiling hot paths → never use Debug.Log/print/LogWarning/LogError; they are prohibitively expensive in CPU and heap and trigger GC pauses that read as stutter.
- Build a low-overhead in-engine profiler with grouped, named counters and make it compile out via macros — frame-by-frame analysis catches bottlenecks that whole-run averages miss, and the profiler must profile itself.

### Asset Import Pipeline Automation

- Automate import settings (via post-processors) so artists' drops are configured correctly without manual fixes — manual per-asset config is the top source of import errors.
- Derive import rules from filename/folder convention (e.g. `Assets/Art/Bg` → background sprite) — enforce a naming/structure convention so the pipeline can act automatically.
- Configure assets in preprocess hooks; do post-import work (prefab gen, relocation) in postprocess hooks — preprocess sets settings before import, postprocess receives the finished asset.
- When editing texture import settings, always read settings first and write them last — skipping the read/write bracket produces unexpected results.
- Ship pipeline import post-processors (AssetPostprocessors) as a prebuilt DLL inside the Editor folder — if any project script has a compile error, loose post-processors won't run and assets import wrong; a DLL keeps them always available, and pin the DLL to the matching engine version.
- Automate repetitive import/export work (post-processors on custom attributes, DCC batch scripts, XML-driven clip data) — eliminates manual data-entry errors in a multi-person pipeline.
- Find your optimal export settings once, then only vary what changes per asset — reduces per-asset reconfiguration and mistakes.
- Use the right tool for each asset (DCC for models, image editor for textures, audio editor for sound) and treat the engine as the synthesis layer — don't force one tool to do everything.
- Prefer interchange formats (FBX, PNG) over proprietary native files (Maya .mb/.ma, PSD) for shared/handoff assets — recipients don't need the (expensive) authoring tool to open them; match scale/axis conventions across tools at export time.
- Fix axis/orientation discrepancies between DCC tool and engine at export time, not by rotating the camera — a clean import keeps prefabs and scripted transforms predictable; use nested transform groups so the imported asset carries no hidden offsets.
- Define an orientation convention at modeling time (front=+z, up=+y) rather than auto-detecting from geometry — software can't know what "looks" forward.
- Model all assets at one consistent scale (1 unit = 1 cm/m/km) so 1:1 ratios stay correct; let the loader scale/rotate/position per instance so one mesh yields many varied instances cheaply.
- Add full error handling to file loaders (external data lies) but keep it out of inner game loops (your code you make correct) — pick where robustness pays.
- Prefer ASCII/text asset formats while learning a pipeline so you can hand-edit and inspect; write binary loaders later for speed.
- Share constants between scripts and code via #include/#define preprocessing in your text parser — scripts and code can never drift out of sync.
- Set sprite/texture import settings deliberately (Sprite mode + auto-Slice for sheets, Point filter + no compression + consistent Pixels-Per-Unit for pixel art, disable mips on 2D/UI) — the wrong defaults blur, mangle, or bloat assets.

### Build Pipeline Automation

- Script the build pipeline (e.g. BuildPipeline.BuildPlayer) and drive it from one click in an editor window — builds multiple platforms in sequence, far faster than the Build Settings UI, lets you hook extra steps, and lets you stamp build metadata.
- Set build metadata (company/product/version/bundle id) programmatically as part of the build — guarantees consistent metadata every time.
- Derive the scene list from the configured enabled-scene set — keeps scripted builds in sync with the build configuration; register every loadable scene before referencing it.
- Stamp builds with the Git commit hash and date and surface them in-game — testers' bug reports map straight to a commit/build, so you can reproduce exactly what they ran; regenerate the build-info source file before compiling.
- Shell out to external scripts (Process) via a process wrapper/helpers — integrates Git, cURL, uploaders, and any CLI tool into the pipeline.
- Automate distribution as a pipeline step (e.g. upload mobile builds to a test service via API) — get builds to testers automatically right after they're produced.

### Version Control & Project Organization

- Put builds under version control early with an engine-specific `.gitignore` (ignore Library/Temp/obj/Build, IDE files, generated meta) — version-control only meaningful files so you can backtrack and undo.
- Use revision control software (centralized repo, one-writer check-out, log entries) — it keeps history and prevents painful merges; informally, at minimum forbid two people editing one file.
- Be fanatically organized about versions — number and date every build, keep versions in separate dated directories, copy before big changes, never mix code from different versions.
- When merging, use a diff tool (e.g. Windiff) and merge into the file with the most new code — telling someone "which pieces I changed" reliably loses minor changes and introduces silent bugs.
- After a successful merged build, clean it, zip it, and have every team member replace all their files with it — avoids re-fixing the same bugs and re-merging the same code.
- Practice clean code hand-off — strip build artifacts, zip the full buildable source (including resources), and verify it rebuilds before sending; test the hand-off, don't assume it works.
- Fix the bad-file-date problem proactively — keep every team machine's clock correct, or future-dated source files force endless needless recompiles.
- Create one project folder per asset type (Models, Animations, Textures, Audio, Scripts, Scenes, Sprites, Prefabs) — you always know where to find an asset and the project stays navigable as it scales. (widely corroborated)
- Group related assets/scene objects into folders and under parent empties (StateMachines, Prefabs, "Level", "Bowling Lane") — organization reduces friction as systems grow.
- Name root nodes and assets with meaningful conventions (root, mat_*, tex_*, PF/PROP/prefab suffixes) and clear state/object/scene names — readable names make scripting, batch-exporting, cleanup, and state machines far less error-prone.
- Delete auto-generated duplicate assets you don't want — keep one canonical version per asset to avoid confusion and bloat.
- Standardize a project-setup procedure (folder structure, conventions, camera/script attachment, scene saving, editor layout) and reuse it every project — consistent setup removes friction and errors.
- Give each mini-project/feature its own dedicated folder and scene — self-contained structure keeps assets and scripts manageable.

### Engine Version & Workflow Hygiene

- Pin the team to a single LTS engine version, and never use a version newer than the project targets — LTS is stable and avoids menu/workflow/package drift that silently breaks steps mid-project.
- Save and reuse a deliberate editor window layout — a stable workspace speeds daily work.
- Lock duplicate Inspector/Project views to compare objects or drag-drop into serialized arrays without losing selection.
- Enter math into numeric Inspector fields (e.g. 4*128) — saves a calculator trip.
- Filter Hierarchy/Scene by component and Project by type/label — fast targeted searches; use Select Dependencies for asset cleanup and the Editor Log's post-build asset-size breakdown to find footprint hogs.
- Name the first string field of a serialized array element — the editor labels array entries by it instead of "Element N".
- Save Play-Mode tweaks via clipboard copy or by dragging objects to prefabs at runtime, and set a Play-mode tint so you never forget the mode — Play-mode changes are otherwise discarded. (widely corroborated)
- Set Enter Play Mode to Reload Scene Only for faster iteration — cuts reload overhead without disabling domain reload.
- Edit Script/Shader templates to remove empty Update stubs by default — stops the boilerplate-overhead problem at the source.
- Prefer the richer IDE (Visual Studio + debugging integration) over the lighter editor on Windows — accelerates development; recover from editor crashes by salvaging the Temp scene file.
- Beware assigning prefabs to serialized fields used as scene references — prefabs share memory with Play Mode and can be permanently corrupted by accidental edits.

### Distributing & Reusing Tools

- Use packages (e.g. Unity Packages) for simple one-off tool sharing — native export/import preserves folder structure and reimports only new/changed files. **When it flips:** when shared tools are workflow-critical and change often → prefer Git submodules, since packages must be regenerated and redistributed by hand on every change while submodules update per project and let the whole team contribute fixes.
- Initialize a submodule's repo to contain only the shareable tool files, excluding host-project settings — keeps the shared module clean and self-contained; run `git submodule init` + `update` after cloning.
- Label/keyword tools and provide complete metadata, key images, and screenshots when publishing to a store — discoverability and presentation drive adoption.
- Price marketplace/Asset Store packages accounting for the platform's revenue cut and competing solutions — research the market before setting a price; fix non-package mistakes in place but bump the version for any actual code change.

### Build-vs-Plan, Iteration & Throwaway Prototyping

- Treat a physical/playable prototype as the best communicator of a novel design — programmers can play your vision instead of decoding a spec; for never-before-seen gameplay it may be the only way.

### Simulation-Driven Balance Tooling

- Use enumeration or Monte Carlo simulation for hard probability questions — simulate millions of trials in code rather than trust flawed hand-math.
- Use visual diagrams (Machinations or equivalent) and relative-fortune charts to make abstract economies inspectable — watching resources flow and graphing player fortunes over time catches runaway leaders, dead phases, and unintended equilibria early.

### Data-Driven Systems & DSLs

- Implement scripting as numbered "actions with fillable entries" (Mad-Lib style) before building a full compiled language — covers ~90% of RPG needs and processes instantly because actions/choices are integers, not parsed text.
- Reference everything (items, spells, meshes, sounds, actions, characters) by number, not by name string — comparisons and lookups stay fast and files stay compact.
- Always support one-off/custom conditions and actions from day one in a DSL — even the cleanest system needs an escape hatch; retrofitting it later wastes engineering time.
- Tune via external editors (item/character/spell editors), not source — designers iterate balance without a programmer or a recompile.
- Store and load data-driven config (XML/ScriptableObject for levels/entities) instead of hardcoding — externalized data lets designers tune without recompiling.

### Performance of Generated Content & Pooling

- Pool/track placed objects (dictionary keyed by position) so you never recreate existing tiles — check before instantiating; this is core object pooling.
- Use the engine's built-in generic object pool with create/get/release/destroy callbacks — a stack-based pool is the standard solution; reuse it for projectiles, particles, enemies, anything.
- Destroy off-screen / out-of-bounds generated entities to reclaim turn-time and memory — but keep them alive in bounded levels where they can't respawn.

### Data Structures for Generators & Tools

- Use a FIFO queue to process branchable items while still adding new branches — lets a generator revisit/extend paths (including cycles) without losing track; buffer player inputs in a queue for deferred ordered processing.
- Use enums as state IDs for tile/item types — descriptive, self-documenting state tracking that scales to many states.
- Store fixed-size records sequentially so any record loads by seek(size × index) — access one item/character/spell without loading the whole catalog into RAM.

### Tooling-Adjacent Code Architecture for Maintainable Generators & Editors

- Centralize tile/object placement in one builder rather than duplicating instantiation per generator — the generator produces data, the builder renders it.
- Use a singleton/static manager as the single connection point between subsystems so generators stay decoupled. **When it flips:** in engines with static-class managers → prefer a static class over a hand-rolled singleton (less boilerplate); use a singleton-as-component only when you need MonoBehaviour features, and guard access during shutdown.
- Expose object internals generically via a Property/PropertySet layer — lets reusable tools (in-game editors, save, network messaging) work without per-game code, decoupling stored data from its exposed name/type via get/set.
- Build a generic data-package object that owns a buffer and can save/load itself — centralize all app data so persistence is one Save()/Load() call; serialize one top-level game-state object that knows how to serialize its contents.

### Telemetry & Analytics Tooling

- Generate player types from data via clustering (K-means/SVM on early play data) rather than by hand, then adjust difficulty to that cluster's average — archetypal analysis gives the most human-interpretable profiles.

### Offline Precomputation Tooling

- Do the hard work offline — precompute BSPs, terrain analysis, navmeshes, trained nets, and influence templates; cram thousands of hours of analysis into kilobytes and trivial runtime cost.
- Build BSP/partition/PVS trees offline — trade preprocessing time and memory for runtime speed; they assume mostly-static geometry.
- Precompute/bake static map analysis (JPS+ wall/jump-point distances, subgoal graphs) to slash runtime pathfinding cost — up to ~100×+ over A* on open uniform-cost grids; make the data cache-friendly by storing wall distances in the cell itself (avoids constantly checking neighbor rows/columns), and bake the analysis into the data the runtime reads.
