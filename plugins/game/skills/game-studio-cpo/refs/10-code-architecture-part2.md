## Code Architecture, Patterns & Quality (continued)

### Null Object & Defensive Defaults

- Use a Null Object (a do-nothing object implementing the interface) instead of returning null — assign a NoCommand to empty slots so callers don't null-check; removes special-casing.
- Abstract engines to never return null (provide a null-object that mimics the interface) — a "null audio channel" whose fade-out just fires the callback keeps caller code clean.
- Return empty arrays/collections over null — callers needn't null-check; make it a review-checklist staple.
- Never use 0/false as a meaningful group or ID — broken/undefined data defaults to 0 and causes false positives (a car numbered 0 got phantom boosts when another car's field reset to false).

### State Machines & Behavior Trees

- Structure the game as a finite state machine of scenes/states, each a self-contained black box — editing one game function won't ripple into the rest of the project.
- Layer behaviors as a pipeline where each stage corrects the previous one's orders — gives modularity (path-following → wounded → collision-avoidance), each fully reusable.
- Use a FSM even for multi-state UI buttons (the 6 mouse-button states) — most states are transitional no-ops, so the FSM actually simplifies the code; change FSM state only at the end of the draw cycle so the new state gets an update before its first draw.

### Data-Driven Design & ScriptableObjects

- Make game data external and data-driven, never hard-coded — change a line of dialogue, a spell, or an item without recompiling a million-line project; reference everything by number/ID for fast, compact files. (widely corroborated)
- Expose game rules as a data-driven DSL loadable without recompiling — decouples config from code, increases iteration speed, and empowers designers (and lets you generate compiled/native C++ code later if needed). (widely corroborated)
- Drive all game balance/config from data, not magic numbers in code — and prefer data sets over computed formulas when management will request arbitrary per-item tweaks.
- Move all balancing numbers into config files tweakable by non-programmers — magic numbers in code make turnaround painfully slow; make config changeable mid-game if possible, else mid-level, else mid-restart (anything beats waiting for a recompile/redeploy).
- Provide defaults plus min/max clamps for every config option — guards against missing values and user error (a 0-second enemy respawn is rarely a feature); layer config priority explicitly (file < local storage < URL/command-line args) so each overrides the last for fine-grained testing.
- Store text data-driven in JSON name/value pairs loaded at runtime — supports translation, live tester edits, and whitespace/comments; use the display string itself as the text ID and return the ID on lookup failure so the game never shows a blank.
- Store tweakable gameplay/level settings in persistent data (e.g. ScriptableObjects) so changes made during Play mode survive exit — lets designers find the magic values fast instead of writing them down, restarting, or starting over.
- Prefer ScriptableObjects for game data that needn't be instantiated, and load via Resources.Load (on demand) to control runtime memory footprint.
- Define every game object by Form (appearance, weight, size, mesh, icon) and Function (category-driven behavior) — categorization means a sword carries damage data, armor carries defense data, never both.
- Categorize items so the engine infers behavior (weapon=equip, edible=consume, money=stack) — one category field replaces dozens of special cases; define every object by Form and Function.
- Use bit-flags for item/object properties (sellable, droppable, use-once, unknown) and class-usage restrictions — pack 32 booleans into one variable and gate who can wield what.
- Externalize tunable values via the Inspector with [SerializeField] (speeds, durations, radii, weights, drop chances) — designers iterate faster when balance knobs aren't buried in code.
- Use text formats during development for ease of editing, then compile to binary for shipping — best of both: editability plus 5–10× faster loads. (widely corroborated)
- Separate data definition from instance: a "master list" holds one definition per asset; instances store only a reference number — massive memory savings (a catalog vs. duplicated full records).
- Attach metadata to assets in the pipeline for a data-driven approach — texture regions (UV coords) avoid re-uploading textures; material tags pick ricochet sounds/bullet holes; anim metadata cues frame-synced events.

### ECS / Data-Oriented Design & Cache-Aware Layout

- Store shared data once and reference it by position/index — hash repeated identifiers and share their integer position; use the smallest int type that fits (unsigned char if <256).
- Beware memory bottlenecks above all and order data access for cache coherence — fully use a resource before loading another, never load A, use it, load B, then reload A; misaligned or scattered data wrecks memory addressing, so simulate your game's real cache behavior when benchmarking. (Align/pad to cache-line boundaries too.)
- Align and pad data structures to 16/32-byte cache-line boundaries; prefer 32-bit ints over 8/16-bit on desktop/Pentium-class CPUs — misaligned or sub-32-bit data wreaks havoc on memory addressing.
- Pack set-membership state as fixed-size bitsets — intersection/subtract/uniqueness become single bitwise ops, and copies (for undo stacks) stay cheap.
- Pack assets and lay out static, collapse-ordered mesh data linearly in memory — enables read-only memory-mapped files, streaming with graceful fallback, and VM-friendly access.

### Maintainability & DRY

- Bias designs toward maintainability and extensibility, not just initial reuse — most time is spent maintaining and changing software, not writing it the first time. **When it flips:** the few measured hottest inner-loop functions (vector/matrix math, rasterizer pixel loop, per-entity job) → sacrifice readability for raw speed (inline, branchless, SIMD, hand-tuned), because that code runs millions of times and dominates the frame.
- Don't write the same code twice — extract anything used in 3–4+ lines or two places into a method; duplicated code drifts apart over time as it's edited (widely corroborated).
- Extract repeated/long logic into well-named functions and call them — keeps the per-frame loop readable and the routines reusable (widely corroborated).
- Refactor repeated inline logic into a named function before extending it (move Instantiate into Spawn()) — isolates behavior so the next change has one clean place to live.
- Replace duplicated calls with a loop the moment a pattern repeats — a `for` is shorter, scalable, and the only maintainable way to do N identical actions; use the loop index to drive variation, not just repetition.
- No forgery: never store the same data in two places — derive counts on demand (array.size()) instead of a separate counter you must keep in sync.
- Centralize side-effect refresh logic in one method and call it after every mutation — call UpdateInventoryText() at the end of every add/remove so display and state never drift apart.
- Replace fixed-value methods with parameterized ones — AddGold(int amount) beats AddTenGold(); pass amounts as parameters even when the current value is always 1, future-proofing for variable rewards.
- Extract a helper class the moment per-instance variable sets repeat — wrapping per-sound state in one AudioCtrl class turns "add a sound" from dozens of vars into a few lines.
- Modularize code the same way you modularize assets — small reusable units (a shared MovingObject base) avoid duplicating logic.
- Build a reusable application framework/base class (window creation, message pump, Init/Frame/Shutdown hooks) — stop retyping boilerplate every project and only plug in game code.
- Build games on a reusable framework of linked classes, deriving a few child classes per new game — frameworks give huge leverage; most of a new game is just overrides.
- Use generics for reusable utilities (asset search, enum-to-list, asset creation, object pools) — one implementation serves every type and maximizes code reuse.
- Encapsulate multi-line computations into methods on the owning class — v.magnitude() beats inlining the sqrt every time.
- Design modularly with purity of purpose — break the game into discrete subsystems (combat, economy, social) with clear inputs/outputs, like OO code, so tweaking one element doesn't ripple unpredictably.
- Split the game into independent, single-purpose modules (graphics, input, sound, network, system) — each library can be included alone and changed without breaking the others.
- Stub feature hooks as empty functions early — predefining placeholders (turn-skip, weapon hooks) keeps systems wired and saves rework later.
- Refactor for consistency: if 90% of constructors use pattern A and 10% use B, convert them all — a developer's first question is "why is this one different?"; uniformity is faster than explaining.
- Adopt consistent code entry/exit points across all objects (constructor, startGame, startLevel, draw, postDraw, update with documented contracts) — common vocabulary lets any programmer read any module.
- Add deprecation facilities to long-lived engine code — flag old functions so callers get migration warnings instead of breaking the build on every interface change.
- Write code clean enough to re-skin or license as a separate engine — until you can answer "how much core code would I change to re-skin this?" honestly, there's polish left.

### Naming

- Name things for intent, not implementation — `hasPlayerExpired` not `isGameOver`; precise names make a high-quality, understandable codebase (widely corroborated).
- Follow consistent naming conventions (camelCase locals/variables, PascalCase classes, ALL_CAPS constants, clear private fields) — convention reduces cognitive load across a codebase (widely corroborated).
- Name things descriptively so a non-programmer can infer intent — `x` is a terrible name; names like moveSpeed, Body, Leg, Trunk make hierarchies and code navigable.
- Use meaningful, type-hinted names where the language is weakly typed (bJump for bool, fSpeed for float) — self-documents intent and reduces type-confusion bugs.
- Choose the most specific word possible for player-facing terms — the more specific, the better it describes the thing; a thesaurus plus genre context beat generic "player"/"score." Test a word by asking an outsider "what's the first thing you think of?" — if it conjures your intended image, it's right.
- Mark values that never change as named constants — a "variable that isn't variable" documents intent and prevents magic numbers.
- Replace magic numbers with named static variables, not #defines — statics get type-checking, namespace scoping, self-documenting names, runtime changeability, and force less recompilation.

### Defensive Coding & Robustness

- Code defensively and paranoidly: assume incoming parameters may hold bad values — validate before using them (widely corroborated).
- Use guard clauses to handle edge cases up front and return early — bail with a friendly log when a queue is empty, keeping the happy path flat and readable.
- Validate preconditions before calling operations that throw — check Count before Dequeue, ContainsKey before indexing, so you fail gracefully instead of with an uncaught exception.
- Guard component references before use (`if (balloon != null)`) — GetComponent returns null on a miss, and calling through null throws; use the null-conditional operator (`?.`) for optional component calls.
- Validate input range AND type — without it a player buys -1 bullets and gains money; use a white-list of acceptable formats, not a black-list of rejected ones.
- Validate on both client (UX) and server (integrity) for online games — the client can never be trusted; clients can hack scores, MITM can modify packets; make the server authoritative and never let clients decide serious outcomes.
- Catch the impossible-score problem with running integrity checks, not absolute caps — send incremental score updates so the server flags 10→20→30→100000; never reject merely "unreasonable" scores (talented players exist).
- Use ASSERT (debug-only) for invariant checks during development, but code a graceful, non-terminating fallback for release — an assertion failure that reaches the user is frightening and unhelpful.
- Fail loud and hard in development, quiet and defensive in production — dev crashes on missing assets/bad metadata force immediate fixes; production degrades gracefully via guards.
- Place defensive validation high in the call stack, not in low-level math/animation libraries — per-frame checks there are a performance killer.
- Always provide a default case with else and chain else if for mutually exclusive outcomes — separate if statements all fire and produce double results; else-if ensures only the first matching branch runs.
- Use inclusive boundary checks for state thresholds (`health <= 0`, not `health < 1`) — so defeat triggers on zero and negatives; off-by-one boundaries are a common gameplay bug.
- Clamp health at death (`if (currentHP <= 0)`) — otherwise health logs into negatives and the object never dies.
- Return a consistent success/fail value from engine functions and check it — uniform error handling makes failures visible and recoverable.
- Match every resource acquire with a release (COM AddRef/Release, allocations, handles, critical sections, LoadLibrary/FreeLibrary, WWW.Dispose) — unreleased resources leak and can crash the system.
- For any class A holding a pointer to a deletable object B that points back, fix both sides in both destructors — when either dies it must null/remove the dangling reference (the two-way association problem).
- Wrap fragile operations (file I/O, network, parsing) in try/except and handle each error type specifically, catch-all last — gracefully recover instead of crashing with a raw error; don't use exceptions for normal control flow an `if` can handle.
- Persist progress and tolerate a missing/corrupt file by defaulting — first run has no save; readers must degrade gracefully.
- Validate and re-prompt user input in a loop, converting safely — never assume typed text is a valid number.
- Detect lost graphics devices via return codes and reload all resources on reset — assume the device can vanish (alt-tab, sleep) and recover gracefully rather than crash.
- Fall back gracefully: if hardware lacks a feature, emulate or disable it so the mode still sets — maximize compatibility instead of failing on weaker machines.
- Initialize unloaded assets to garish placeholders (bright-green checkerboard textures, white-noise audio) — so omissions get noticed and fixed fast.
- Validate inputs/outputs, check return values, release all resources on error, and protect/lock all shared globals in threaded code — code-review checklist staples; mismatched lock/unlock and call-stack-leaked resources are silent killers.
- Initialize every essential field via a constructor that requires them (a name) — defaults that leave objects half-initialized create silent invalid state.
- Initialize every visible state in Start(), not just on change — prevents stale editor placeholder values showing at runtime.
- Round monetary/derived values with an actual round operation, not display formatting — formatting only changes what's shown; the stored number drifts.
- Have a flaky feature? Comment it out before shipping — the willpower to disable always-troublesome code keeps the program stable (avoid developer gold-plating).
- Guard input callbacks by phase (context.performed / context.canceled) — input actions fire on press, hold, and release; without a phase check one click can spawn multiple projectiles.

### Encapsulation & Access Control

- Never break encapsulation: keep data private/protected, avoid friend declarations, expose only needed public methods — inline accessors/mutators cost nothing yet let you change internals later (widely corroborated).
- Protect class data (private/protected) and expose behavior through functions — true modularity means a class needs no outside help and can't be corrupted from outside.
- Make a method public only when something external must call it (UI buttons, other scripts); keep everything else private — minimizes surface area and accidental coupling.
- Keep fields private and expose only what's needed via properties — guard internal state (isLockedOn behind a property) to prevent accidental external mutation.
- Keep purely-internal state private with no serialization (input buffers, cached target) — only expose what genuinely needs Inspector or external access.
- Prevent accidental copies: declare private unimplemented copy-ctor/operator=; mark single-arg constructors `explicit` — stops hidden temporaries and unwanted conversions.
- Prefer private fields with getters over public-static for shared state — public static is mutable from anywhere and breaks down on a multi-dev codebase (a known shortcut/debt).
- Wrap primitives in meaningful classes (vector, color, string) instead of raw floats/char arrays — code reads closer to how you think and centralizes invariants.

### Object Lifetime, Construction & Concurrency

- Separate permanent setup (constructor) from resettable setup (seed/reset) — put lifelong members in the constructor, transient reseedable members in the seed method, so restarts and levels work cleanly.
- Coordinate every C++ pointer member with construct-in-constructor / delete-in-destructor (cascading delete) — and have dying objects notify anyone referencing them.
- Know each engine "reserved" lifecycle function's call order — Awake (once, before everything, even if disabled) for self-init; Start (first active frame, after all Awakes) for cross-object setup; Update for per-frame; FixedUpdate for physics. Relying on the wrong one creates initialization races.
- Pick the right lifecycle method: Awake for same-object references, Start for setup depending on other objects, Update for visuals, FixedUpdate for physics — choosing correctly avoids ordering bugs.
- Cache the inspected target/component once in OnEnable/Awake/Start and reuse — cleaner access and avoids repeated lookups (widely corroborated).
- Use coroutines for time-spread, cooldown, and sequenced feel logic (fire rate, boost, shield) instead of cramming it into a single frame — coroutines express "do this over time" cleanly instead of per-frame flag soup.
- Use micro-threads to write AI/entity update code linearly (call WaitOneFrame) instead of hand-rolled state machines — eliminates accidental complexity of storing state in members; prefer cooperative micro-threads (12 asm instructions to switch) over OS threads/fibers for game objects. Note: micro-thread stacks make save/load and recompiled saves problematic — restrict to games that don't save.
- Run everything asynchronously from an event loop with completion callbacks — synchronous blocking functions make smooth/gradual multi-object changes impossible.
- Load all assets in constructors, never mid-game — if an object spawns mid-game, another loads its assets first, avoiding fragmentation and allocation/GC slowdown.
- For pooled objects, split per-launch init out of Start/Awake into an explicit public reset/Init method called on reuse — pooled objects don't get a fresh Start on reuse, so velocity/state reset must run on every Get().
- Reset a respawned pooled object's state (Rigidbody velocity, listeners, coroutines, timers, isHit flags) before reuse, and re-apply velocity — leftover state causes confusing bugs and recycled projectiles that sit still. Do cross-component resets on despawn, not spawn: Spawned() order is unguaranteed, so resetting then can clobber another component's intended init.

### Game Loop & Update Architecture

- Use a process manager for always-run subsystems (input, network, sound) — call one Process() instead of hand-calling each medial function every frame.
- Centralize updates: have one god-class/manager Update() call OnUpdate() on registered objects via an interface — replaces N native-managed bridge crossings with one plus N cheap virtual calls.
- Run AI/non-critical logic less often than every frame and randomize each agent's update window — creatures have reaction times; staggering prevents agents synchronizing into a single-frame processing spike.
- Keep OnGUI / per-frame UI free of game logic and input handling — it can run multiple times per frame, so logic there is unreliable and wasteful.

### Working with Patterns — Judgment, YAGNI & Over-Engineering

- Keep it simple (KISS): design the simplest thing that works; simplicity is the goal, not "where can I apply a pattern" — other developers admire simple designs (widely corroborated).
- Patterns are not a magic bullet — you can't plug one in and walk away; always reason about consequences on the rest of the design.
- Introduce a pattern only when there's a real, present need — if a simpler solution works, use it; don't add patterns for hypothetical future change that may never come (widely corroborated). **When it flips:** plan deeper and add abstraction proactively only to make a conceptual leap iteration can't reach, or in derivative/sequel work where the future is known — for original work, keep planning and abstraction shallow.
- Don't be afraid to remove a pattern — when planned flexibility isn't needed and a simpler solution would be better, take it out; over-engineering is a real cost.
- Let patterns emerge from the design rather than building the design from patterns — start from principles, write the simplest code, add patterns where the need surfaces.
- Patterns are tools, not rules — tweak and adapt each to your specific problem instead of applying it by the book.
- Shoot for practical extensibility, not hypothetical generality — be extensible in the ways that actually matter for your game; "make it work, make it right, make it fast" in that order.
- Refactoring time is patterns time — when restructuring, watch for smells: heaps of conditionals suggest State, concrete dependencies suggest a Factory.
- Recognize anti-patterns — a named bad-but-attractive solution (Golden Hammer: forcing one familiar tech everywhere); knowing them helps you spot and refactor before committing.
- Apply patterns from prototype to shipped game, but match the pattern to the actual problem — patterns reduce friction only when the problem they solve is present.
- Prefer the simplest workable wiring (a public field dragged in the Inspector) over more code when both achieve the goal — less indirection, easier to follow. **When it flips:** when many scripts need the same object or objects are runtime-spawned, manual Inspector wiring breaks down → use events/singleton access instead.

### Pattern Vocabulary & Communication

- Use a shared pattern vocabulary to communicate designs — naming a pattern conveys structure, constraints, and intent at once, keeping discussions above implementation minutiae and speeding up the team.
- Reveal patterns in code comments and class/method names — make the pattern obvious so others read your implementation faster.
- Know the pattern categories (Creational, Structural, Behavioral) — categories help you narrow the search; match a candidate by comparing your context/problem/constraints against the pattern's intent and applicability, then check you can live with its consequences.
- Document each design/mechanic pattern fully (name, intent, motivation, applicability, structure, participants, collaborations, consequences, examples, related patterns) — a complete description makes it actually reusable by others.
- Reuse proven mechanic patterns as a design language — engines (static/dynamic/converter/engine-building), friction (static/dynamic/stopping/attrition), escalation (escalating challenge/complexity/arms race), and feedback patterns are reusable building blocks; brainstorm new designs by recombining and nesting them.

### Comments & Self-Documentation

- Write self-documenting comments that explain intent, not syntax — "Remove empty entries so the UI never shows x0 rows" tells future readers why, which the code alone cannot.
- Comment the "intense" parts where you feel confusion, pride, or anxiety — those mark tricky logic, clever tricks, and fragile code others (or future-you) could break.
- Write comments and commit messages as an apology to your future self in six months — assume all context is lost.
- Note algorithms, source URLs, and licenses in code/comments next to where they're used, and keep an "externals" file for assets that can't hold metadata — proves originality/provenance in any dispute.
- Write a docstring for each function/class stating what it does and returns — comments document for humans and can auto-generate API docs.
- Maintain a dated log comment at the top of files you change, especially on a team — it tracks who changed what and when.
- Document method names, parameter types/units/ranges, complex-algorithm references, borrowed-code licenses, and TODOs — if code and docs disagree, both are wrong.
- Comment intent and use comments to temporarily disable lines while testing — comments are ignored at runtime but document why code exists and aid debugging.

### Collections & Data Structures

- Match the data structure to the access pattern — array for fixed-size/known/frequent iteration (fast lookup), list for dynamic collections with frequent mid-collection deletion (slower lookup), dictionary for dynamic data needing fast keyed lookup (a dictionary keyed by coordinate is ideal for an unbounded grid) — the wrong container costs performance or convenience (widely corroborated).
- Use a Dictionary<key,value> whenever data is looked up by name/ID rather than position — inventories, score tables, config lookups, ability cooldowns; model stackable items as one entry whose value is a count.
- Delete dictionary entries when their count hits zero, and ContainsKey-check before Add — keeps the collection clean and avoids duplicate-key throws.
- Choose the most specialized collection that fits the access pattern — a Queue (back-add, front-remove only) communicates intent better than a List when you only ever process FIFO; reach for it when you don't need random access or key lookup.
- Match the loop to the data structure — foreach with KeyValuePair for dictionaries, indexed for-loops over arrays in hot code.
- Use parallel/layered grids (2D arrays of numbers) for distinct concerns (terrain, collision, hazards, items, spawns) — one number-meaning per layer keeps logic clean; the number grid is the model, rendering reads from it.
- Pick the data structure deliberately: tuples/immutable types for values that must never change (colors, fixed sizes) — immutability lets the runtime optimize and prevents accidental edits.
- Store pointers in STL/containers, not objects by value, and know whether your container frees memory on clear() — value churn triggers extra constructor/copy operations on deletion/insertion; if clear() doesn't free, reserve() up front or swap with an empty container to avoid fragmentation.
- Choose List vs Array deliberately — Array for fixed-size known data, List for dynamic collections; wrong container costs performance or convenience.
- Pass whole objects to functions, not field-by-field — one parameter carries all current and future state; adding a field to a class touches one definition, adding a parameter touches every call.
- Understand reference vs value semantics — objects/lists pass by reference (mutating a passed object changes the caller's), scalars by value; string-by-value copies only the pointer and strings are immutable.

### Editor & Tooling Architecture

- Use [HideInInspector], [SerializeField], [Range], [RequireComponent], [FormerlySerializedAs], [ContextMenu] deliberately — expose safely, slider-clamp, enforce dependencies, rename serialized fields without data loss.
- Use ScriptableObject/AssetPostprocessor automation to configure assets correctly without manual fixes — derive import rules from filename/folder convention; ship postprocessors as a prebuilt DLL so a compile error elsewhere can't silently skip them.
- Functionally test systems in isolation with dummy layers — a dummy animation controller that completes/fails orders lets you debug AI with animation removed from the equation.

### Project Structure & Conventions

- Organize assets into dedicated folders (Scripts, Animations, Materials, Prefabs, Scenes, Sprites) before they pile up — a clean structure saves time every later step and keeps a growing project navigable (widely corroborated).
- Build the full directory structure (source, resources, build, config, thirdparty, tools, target) at project start — even one file per folder; pre-answers "where does this go?"
- Group related scene objects under a parent empty GameObject — makes them easy to move, select, and manage together; use empty GameObjects as neutral roots for composite objects, and exploit the parent's origin as the pivot.
- Quarantine third-party/external-team code in a do-not-touch directory tied to a specific revision — isolates upstream changes until tested (submodules/forks); never put API keys/secrets in source control.
- Turn any object you create more than once into a Prefab — duplicating bakes copies that must each be hand-edited; a Prefab centralizes the design as a single source of truth, and instance overrides give per-copy variation without breaking the link (widely corroborated).
- Edit the prefab asset, not scene instances, for changes meant to apply everywhere — instance edits affect only that copy; convert reusable system objects (spawner, pool, configured camera) into prefabs.
- Use a dedicated spawner to inject runtime dependencies into spawned objects — runtime-created enemies can't get Inspector references, so the spawner passes shared pools via an Init method after Instantiate.
- Separate the logic root (parent with Rigidbody/collider/script) from the visual model (child) — lets you offset, flip, or add VFX to visuals without disturbing physics/scripts; prefer an empty parent over promoting a visible part to root (decouples organization from geometry).
- Force visible .meta files and Force Text serialization for source control (Unity) — prevents metadata-regeneration conflicts and enables human-readable/diffable YAML data.
- Strongly type your language (C#) over a loosely typed one — strong typing catches errors at compile time and enables reliable autocomplete; let the compiler catch wrong-type assignments early rather than debugging at runtime.
- Wrap the entry point in a `main()` guarded by `if __name__ == "__main__"` and split large programs into modules (one class/concern per file) — eases navigation, parallel work, and reuse.
