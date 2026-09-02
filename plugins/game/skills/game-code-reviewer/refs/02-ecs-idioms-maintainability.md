# Data-Oriented/ECS, Unity/C# Idioms & Maintainability

## Data-Oriented Design & ECS Structure

### Separate Data from Behavior
- Separate data from behavior — store state in data-only components/structs, put logic in systems; a script holding both a speed value and the code that moves the player mixes two responsibilities. (ECSFundamentals)
- Keep ECS component types dumb and data-only — components are structs with no methods, functions, or update behavior; a component describes what an entity *has*, not what it *does*. (ECSFundamentals)
- Reframe design around data flow, not object hierarchies — stop asking "what script should this object have?" and ask "what data does this entity need, and which systems process it?" (ECSFundamentals)
- Split a feature into a data component, an editor-facing authoring script, and a behavior system — three small single-purpose files beat one god-class. (ECSFundamentals)
- Hide implementation behind get/set accessors so callers need not know the stored data type — frees clients from format details (small speed cost when stored and exposed types differ). (GPGems2)
- Decouple a variable's internal name from its exposed name (store `m_colour`, expose "color") — editors and tools bind to stable external names, not internals. (GPGems2)

### Compose Entities from Components, Not Inheritance
- Build entities by composing components, not by subclassing — an entity is an identifier that groups related components; add/remove data to change what it is rather than extending a class tree. (ECSFundamentals)
- Build behavior by composing Components onto GameObjects rather than deep inheritance — Unity's model is composition-first; a GameObject is a bag of Components (Transform, Collider, Renderer, RigidBody, scripts). (IntroGameDesign)
- Treat gameplay scripts as just another Component attached to a GameObject — logic plugs in alongside engine components instead of subclassing into a monolith. (IntroGameDesign)
- Split distinct concerns into separate single-purpose Components (collision, rendering, physics, your script) — each does one job and can be added, removed, swapped, or reused independently. (IntroGameDesign; PatternsUnity6; ECSFundamentals)
- Model your own MonoBehaviours after Unity's built-in components (Rigidbody=physics, MeshRenderer=render, Collider=collision) — single-purpose components stay composable, addable, removable, swappable independently. (PatternsUnity6)
- Reach for the engine's built-in Components (Collider variants, RigidBody, Renderer, Transform) before writing your own — reuse solved problems (collision, physics, draw batching) instead of reinventing them. (IntroGameDesign)
- Keep components minimal — hold only the fields actually needed (e.g. `PlayerData` holds only `MoveSpeed`); do not pre-load structs with fields "just in case" (YAGNI). (ECSFundamentals)
- Right-size structure to the project — start minimal (one component, one system) and add components/systems only as behaviors appear; grow architecture incrementally rather than over-engineering up front. (ECSFundamentals)

### Systems Process Capabilities, Not Identities
- Make systems depend on capabilities, not identities — a movement system processes any entity that has the required components (player OR enemy), so logic is reusable instead of type-bound. (ECSFundamentals)
- Decouple logic from instances — one system processes thousands of matching entities; never attach a per-object update script to each instance when a single system can iterate them all. (ECSFundamentals)
- Let the query be defined by the work — `IJobEntity.Execute(ref BallData, ref LocalTransform)` auto-targets entities having both components; avoid hand-rolling an `EntityQuery` when the signature already expresses intent. (ECSFundamentals)
- Layer behavior additively in one pass — a single job can update movement, direction, and scale together without new systems or new update loops; add behavior without changing architecture. (ECSFundamentals)
- Keep systems out of the GameObject graph — systems are discovered and run automatically by ECS; never attach them to a GameObject like a MonoBehaviour. (ECSFundamentals)
- Extract a focused method to keep update loops readable — `OnUpdate` delegates to a `Movement(ref state)` method so the entry point stays a clear high-level outline and the body is easy to expand. (ECSFundamentals)

### Cache-Friendly, Contiguous Data Layout
- Lay out same-typed data contiguously — ECS stores components of one type together in memory chunks, making iteration cache-friendly; scattered per-object instances force the CPU to jump around memory. (ECSFundamentals)
- Store homogeneous object lists in contiguous `vector` (of pointers) rather than `set`/`map` for typical game sizes — cache-friendly linear scan and `memcpy` deletes usually beat O(log n) tree ops whose constants thrash the cache and hit the allocator. (GPGems2)
- Know your STL container's hidden costs — `set`/`map` insert/erase usually allocate/free a tree node and iteration chases scattered pointers (cache misses); measure before assuming O(log n) wins. (GPGems2)
- Precompute and index data structures offline (LOS templates, BSPs, lookup tables) — store wisdom as data and process it linearly in memory order for cache coherence. (GPGems2)
- Preallocate and recycle frequently created/destroyed objects through a cache/pool instead of constant new/delete — mirrors the C "big array up front" approach and fights heap fragmentation. (GPGems2)
- Pay only for the data you use — `TransformUsageFlags.Dynamic` adds movement components only to entities that move; `None` for logic-only entities (spawners, singletons, controllers) avoids wasting memory on unused transforms. (ECSFundamentals)
- Treat ECS component fetches as copies, not references — `GetComponentData` returns a value; mutate the local copy then `SetComponentData` to write back, or the entity never changes; transform builders (`Translate`, `WithScale`) likewise return a new value you must assign back. (ECSFundamentals)
- Prefer value types in components/systems — unmanaged structs restrict you to value types (float, int, float3), which is rarely a problem for gameplay data and buys Burst + Jobs compatibility. (ECSFundamentals)

### Burst, Jobs & Hot-Path Discipline
- Prefer ISystem (unmanaged struct) for every new system — it lives off the managed heap and is Burst-compilable; only fall back to SystemBase (managed class) when you truly need managed references like `Camera.main`. (ECSFundamentals)
- Mark hot code `[BurstCompile]` and keep it allocation-free — Burst only compiles a value-type, GC-free, reflection-free subset (HPC#); managed types or allocations silently exclude code from the win. (ECSFundamentals)
- Use `Unity.Mathematics` (float3, math.sin) inside jobs, not `UnityEngine.Mathf`/Vector3 — Mathf sits outside the Burst-compatible subset and mixing it in breaks Burst optimization. (ECSFundamentals)
- Use a DOTS-compatible RNG inside jobs — `Unity.Mathematics.Random` is Burst-safe; `UnityEngine.Random` is not and must stay outside jobs (only used to seed). (ECSFundamentals)
- Schedule per-entity work as parallel jobs — `ScheduleParallel()` slices matching entities across worker threads instead of running a single-threaded `Update` loop that bottlenecks at scale. (ECSFundamentals)
- Declare the tightest access modifier on job parameters — `ref` = read/write, `in` = read-only, none = read-only-by-value; looser-than-necessary access creates false scheduler conflicts and serializes jobs. (ECSFundamentals)
- Pass frame context into jobs as fields, not via global API — jobs cannot read `Time.deltaTime`; capture it in the system and inject it (`DeltaTime`, `Time`, `Rand`) so the job stays pure and Burst-safe. (ECSFundamentals)
- Avoid virtual calls on functions called in inner loops (`DrawPolygon`, `SetScreenPoint`) — one indirection per call is fine occasionally, deadly in hot paths. (GPGems2)

### Communicate Through Shared Data and Stable Handles
- Communicate through shared data components, not direct references — `InputSystem` writes a singleton `InputData`; `PlayerSystem` reads it; neither knows about the other, so either can be swapped independently. (ECSFundamentals)
- Reference data by stable handles, not heavyweight objects — store `Entity` references (not GameObject references) in runtime components; convert GameObject→Entity once at bake time. (ECSFundamentals)
- Use smart/"tracking" pointers (or ID handles) for cross-frame references to entities that can die — raw pointers to deleted objects crash; a tracking pointer registers with its target and nulls itself on death. (GPGems2)
- Pass identifiers (ints/strings/handles) across an API boundary instead of class pointers/references — fully decouples the abstraction from its implementation, hiding how things are loaded and done. (GPGems2)
- Refresh shared/singleton data each frame, not once in setup — resolve singletons in `OnUpdate` (not `OnCreate`) so re-baking the sub-scene or runtime changes are picked up; caching stale references is a bug source. (ECSFundamentals)

### Authoring vs Runtime Separation (Bake-Time Conversion)
- Separate edit-time representation from runtime representation — authoring GameObjects exist for editor convenience; baked entities drive gameplay; do not let convenience types leak into the runtime hot path. (ECSFundamentals)
- Use the Baker/authoring pattern as an explicit conversion seam — editable Inspector data (MonoBehaviour) is transformed into runtime data (IComponentData) at a single well-defined step, keeping the two worlds from contaminating each other. (ECSFundamentals)
- Isolate the platform/API boundary in one place — input lives only in `InputSystem`; porting from legacy Input Manager to the new Input System changes that one file while the rest of the pipeline is untouched. (ECSFundamentals)
- Keep authoring surfaces honest — expose only fields a designer should actually set; runtime-only data (random timing, computed direction) does not belong in the Inspector and clutters editing. (ECSFundamentals)
- Comment out (and later delete) fields that move from author-time to runtime — when a value becomes runtime-assigned, remove it from the authoring script and Baker so the Inspector only exposes values worth configuring. (ECSFundamentals)

### Data-Driven Config & Serialized Tuning Values
- Make data-driven scripting work by giving the engine flexible entity assembly (factories + behavior library) — new entity classes then take ~15 minutes and minimal code, freeing designers from the code-compile-execute loop. (GPGems2)
- Use human-readable text formats during development, compile to binary tokens for shipping — best of both: easy editing plus 5-10x faster loads. (GPGems2)
- Share constants between code and data via a preprocessed text format (`#include`/`#define` in scripts) — keeps scripts and code from drifting out of sync versus duplicated magic numbers. (GPGems2)
- Keep gameplay numbers (counts, forces, increments, limits) as serialized fields, not literals in method bodies — values live in one declared place and persist across editor sessions. (CSharpForUnity)
- Replace hardcoded constants with serialized fields (e.g. loop count `10` → `spawnCount`) — lets designers and future-you tweak without editing or recompiling code. (CSharpForUnity)
- Expose tuning knobs (spawn count, spawn offset, force, movement increment, barriers) as serialized parameters — parameterization is the standard pattern for tools and gameplay systems. (CSharpForUnity)
- Use intention-revealing field names for tuning values (`clicksToPop`, `scaleIncreasePerClick`, `strafeForce`) — self-documenting fields reduce the need for comments. (CSharpForUnity)
- Never put raw "magic numbers" in code — replace with a named `static` (preferred) or `#define`. (SWEngGames)
- Prefer named statics over `#define` for tunable parameters — statics get type checking, only force a `.cpp` recompile (not a header cascade), self-document via `Class::NAME`, avoid namespace collisions, and can be changed at runtime. (SWEngGames)
- Centralize tunable game parameters as well-commented statics at the top of the relevant `.cpp` — so you can iterate values quickly across builds without hunting through code. (SWEngGames)
- Use `[SerializeField] private` for designer-tweakable/Inspector-assigned values — keeps the field hidden from other scripts while still serializing and showing in the Inspector. (AdvancedCSharp; CSharpForUnity)
- Do not make a field `public` just to expose it in the Inspector — public access lets any script read/write it, weakening encapsulation. (AdvancedCSharp; CSharpForUnity)
- Prefer passing dependencies via serialized references wired in the Inspector over runtime `Find`/`GetComponent` searches — wiring is explicit, visible, and avoids fragile lookups. **When it flips:** many-to-one access or runtime-spawned objects → prefer events/abstractions over manual serialized links, which are easy to forget and repetitive as dependents multiply. (CSharpForUnity; PatternsUnity6)

### Right-Size the Component/Data Model
- Don't assume one component type fits all data — beyond IComponentData there are tag (empty filter), shared (group-by-value), and buffer (growable list) components; forcing everything into IComponentData is a modeling smell. (ECSFundamentals)
- Use a singleton component only for genuinely one-of-a-kind resources (game state, match settings, input, level config) — `GetSingleton<T>` throws if zero or more than one exists, so it self-documents intent. **When it flips:** plural/collection data → go back to the normal query/job pattern; singleton access on many entities is a code smell. (ECSFundamentals)
- Match time types to their source — use `double` for elapsed-time fields because `SystemAPI.Time.ElapsedTime` is a double and stays accurate over long sessions; a `float` would lose precision. (ECSFundamentals)
- Nest helper types inside their only consumer — put `BallJob` inside `BallSystem` since the job exists solely to support that system; keeps the relationship explicit and scope tight. (ECSFundamentals)
- Skip the abstraction when there is nothing to configure — `InputData` needs no authoring script because it has no Inspector-facing values; create the entity directly from the system, avoiding ceremony for ceremony's sake. (ECSFundamentals)

### When ECS Data-Orientation vs OOP Composition
- Choose composition over inheritance when classes share a behavior, not an "is-a" relationship — composed objects delegate to behavior objects, gaining far more flexibility than a frozen hierarchy, and avoiding combinatorial class explosion. (HeadFirstPatterns; SWEngGames; IntroGameDesign)
- Use class inheritance only where a true "is-a" relationship holds, prefer composition for "has-a" — share common behavior across related types via a superclass, but don't force unrelated types into a base. (IntroGameDesign; AdvancedCSharp)
- Profile cost per-behavior, not per-engine-claim — simple per-entity movement scales to tens of thousands of entities, but expensive per-entity AI/physics raises cost (and rendering, not logic, often dominates). (ECSFundamentals)
- Don't put virtual functions in small, frequently instantiated data types — the first virtual adds a vtable pointer per object; avoid any hierarchy for tiny heavily-used types (Vector, Matrix). (GPGems2)
- Store pointers in containers, not objects by value — avoids constructor/copy storms during insert/delete and shrinks memory. (GPGems2)

## Unity/C# Idioms, Maintainability & Refactoring

### GetComponent & Reference Caching
- Cache component references in `Awake` and reuse them; never re-`GetComponent` per event/frame — `GetComponent` is not free and repeats redundant lookups (e.g. cache `Rigidbody`/`Renderer` once). (AdvancedCSharp)
- When probing-then-invoking, cache the `GetComponent<T>()` result in a local and call once rather than looking it up twice (once to null-check, once to use). (AdvancedCSharp)
- Probe for a capability via `GetComponent<T>()` plus a null-check before acting — duck-typing by component keeps a dispatcher decoupled from concrete types. (CSharpForUnity)
- Prefer dependencies wired as serialized Inspector references over runtime `Find`/`GetComponent` searches — explicit wiring is visible and avoids fragile lookups. (CSharpForUnity)

### Update Loop & Lifecycle
- Put physics calls (`AddForce`, `MovePosition`) and physics-state reads in `FixedUpdate`; put input polling, animation triggers, and camera updates in `Update` — mixing them causes jitter or lost input. (CSharpForUnity)
- Know the MonoBehaviour lifecycle: `Awake` runs first (even when the component starts disabled) for self-init others rely on; `Start` runs on the first active frame after all `Awake`s for cross-object setup; `Update` runs per-frame for input/movement. (PatternsUnity6)
- Never rely on default MonoBehaviour execution order — all scripts get order 0, so `Awake` calls run in arbitrary sequence and an observer's `OnEnable` can hit a still-null singleton `Instance`; force early init with `[DefaultExecutionOrder(-1)]` or Script Execution Order settings. (PatternsUnity6)
- Subscribe to events in `OnEnable` and unsubscribe in `OnDisable` — ties subscription lifecycle to active state and prevents events firing on disabled/destroyed targets (stale-listener errors and leaks). (PatternsUnity6)
- Add a `Start()` initializer to sync runtime state with editor placeholder values (e.g. `UpdateScoreText()` so UI reads "Score: 0") — never trust editor placeholders to be correct at play start. (CSharpForUnity)
- Run AI/expensive logic event-driven rather than polling every frame, and stagger periodic work via timer callbacks with randomized per-agent intervals — react to triggers instead of re-checking, and prevent synchronized callbacks from spiking the frame. (GPGems2)
- Apply level-of-detail to logic, not just graphics: vary AI update frequency, algorithm complexity, and aggregation by relevance — do less where the player won't notice, scaling back if "popping" shows. (GPGems2)

### Instantiate/Destroy & Object Pooling
- Treat `Instantiate`/`Destroy` as expensive at high frequency — `Instantiate` registers the object with physics, rendering, and tracking; `Destroy` reverses that plus GC overhead; dozens/second cause measurable frame spikes, worst on mobile. (PatternsUnity6)
- Pool objects created/destroyed in large numbers (bullets, enemies, particles): pre-create reusable instances and toggle `SetActive(false/true)` instead of constant `Instantiate`/`Destroy`, removing them from per-frame processing without allocation churn. (PatternsUnity6; GPGems2)
- Reposition and re-initialize a pooled object after retrieval — pooled objects retain the transform from their last active life; keep the pool's sole job managing reusable instances and let the requesting script decide position/initialization. (PatternsUnity6)
- Have pooled objects deactivate themselves at end-of-life (`SetActive(false)`) instead of `Destroy` — pooling only works if objects return to the pool; schedule delayed deactivation with `Invoke(nameof(Despawn), lifetime)`. (PatternsUnity6)
- Let pools start at a minimum size, pre-spawned in `Start` (shifting allocation to load time), and grow on demand when all instances are active — self-tunes to actual demand instead of a fixed cap. (PatternsUnity6)
- Override global `new`/`delete` (or use a free-list/cache) to route common small, short-lived allocations into preallocated blocks — games do many tiny allocations; pooling them fights heap fragmentation. (GPGems2)
- Force containers to actually release memory (`vector<T>().swap(v)` or `reserve` up front) — `clear()` may keep capacity, fragmenting the heap across level restarts. (GPGems2)

### Allocations & Burst/Jobs Hot Path
- Mark hot code `[BurstCompile]` and keep it allocation-free, value-type, and reflection-free — Burst only compiles that HPC# subset; managed types or allocations silently exclude code from the win. (ECSFundamentals)
- Use `Unity.Mathematics` (`float3`, `math.sin`) inside jobs, not `UnityEngine.Mathf`/`Vector3` — Mathf sits outside the Burst-compatible subset and breaks the optimization. (ECSFundamentals)
- Use a DOTS-compatible RNG (`Unity.Mathematics.Random`) inside jobs; `UnityEngine.Random` is not Burst-safe and must stay outside (only used to seed). (ECSFundamentals)
- Pass frame context into jobs as fields, not via global API — jobs cannot read `Time.deltaTime`; capture it in the system and inject it so the job stays pure and Burst-safe. (ECSFundamentals)
- Declare the tightest access modifier on job parameters (`ref`=read/write, `in`=read-only, none=read-only-by-value) — looser-than-necessary access creates false scheduler conflicts and serializes jobs. (ECSFundamentals)
- Avoid `std::string` (or implicit string) parameters in hot paths — implicit construction can `malloc`+`strlen`+`memcpy` per call; take `const char*` instead. (GPGems2)
- Use `CompareTag("X")` instead of `gameObject.tag == "X"` — avoids a string allocation and throws on a nonexistent tag, catching typos at edit time instead of failing silently. (CSharpForUnity)
- Avoid virtual/interface calls on functions invoked in inner loops (`DrawPolygon`, `SetScreenPoint`) — one indirection per call is fine occasionally, deadly in hot paths. (GPGems2)
- Profile before optimizing and re-measure — intuition about hot code is untrustworthy; a "deceptively simple line" can emit lots of machine code, and naive optimizations sometimes slow things down. Profile per-behavior, not per-engine-claim. (GPGems2; ECSFundamentals)

### Magic Numbers & Tunable Parameters
- Never put raw magic numbers in code — replace with a named constant; prefer named `static`s over `#define` for tunables (type checking, self-documenting `Class::NAME`, runtime-changeable, no header recompile cascade). (SWEngGames)
- Keep gameplay numbers (counts, forces, increments, limits) as `[SerializeField]` serialized fields, not literals in method bodies — values live in one declared place, survive editor sessions, and let designers tweak without recompiling. (CSharpForUnity)
- Centralize and group interdependent tunable parameters (well-commented statics at the top of the relevant file; related bit-flag constants together) — iterate values fast and guarantee they don't conflict. (SWEngGames)
- Share constants between code and data via a preprocessed text format (`#include`/`#define` in scripts) — keeps scripts and code from drifting versus duplicated magic numbers. (GPGems2)
- Use `nameof(Method)` over string literals for reflection-style calls (`Invoke(nameof(Despawn), ...)`) — gives compile-time safety and breaks loudly when the method is renamed. (PatternsUnity6)

### Naming & Readability
- Adopt one consistent naming convention and apply it project-wide (camelCase for locals/methods, distinct capitalization for statics) — consistency, not the specific scheme, is what makes unfamiliar code readable at a glance. (IntroGameDesign; SWEngGames)
- Treat capitalization as semantically load-bearing in C#: `variable`, `Variable`, `variAble` are three different identifiers — exact spelling and case are correctness, not style. (IntroGameDesign)
- Name to communicate intent — the next reader reconstructs the design from identifiers, not comments; name scripts/objects after their role (`Balloon`, `ScoreManager`, `Spawner`) and use intention-revealing field names (`clicksToPop`, `strafeForce`). (IntroGameDesign; CSharpForUnity)
- Rename auto-generated/placeholder objects to meaningful names (empty GameObject → `GameManager`, duplicated text → `ScoreText`) — descriptive names prevent confusion as the scene grows. (CSharpForUnity)
- Name interfaces with a leading capital `I` (e.g. `IInteractable`) — convention makes contracts recognizable at a glance even though the language doesn't require it. (AdvancedCSharp)
- Give private/protected members "ugly" leading-underscore names and encode type/role in the name (prefix `p` pointer, `b`/`f` bool, etc.); reserve namespaces by convention (framework classes `C`, your classes `c`) — frees the bare name for an accessor and signals scope/origin; never use `foo`/single letters except loop `i,j,k`. (SWEngGames)
- Decouple a variable's internal name from its exposed name (store `m_colour`, expose "color") — editors/tools bind to stable external names, not internals. (GPGems2)
- Comment the "intense" parts and explain *why*, not *what*, at non-obvious lines — note why a guard or a write-back matters; those are the spots future readers trip on. (SWEngGames; ECSFundamentals)

### Encapsulation & Access Control
- Don't make a field `public` just to expose it in the Inspector — public access lets any script read/write it and weakens encapsulation; use `[SerializeField] private` for Inspector-assigned references. (AdvancedCSharp; CSharpForUnity)
- Default to private fields and the narrowest scope that works; widen access only when a real collaborator needs it — broad scope is the seed of hidden coupling and order-of-execution bugs. (CSharpForUnity; IntroGameDesign)
- Make only genuine external entry points public (e.g. UI-button targets); keep helpers private, and demote handler methods to private once they're only called via events — limits the callable API surface and signals intent. (CSharpForUnity; PatternsUnity6)
- Hide implementation behind a minimal public interface and accessors/mutators — even trivial inline accessors cost nothing at runtime but let you change the backing field later without touching callers, and let mutators enforce invariants across coupled fields. (SWEngGames)
- Prefer `{ get; private set; }` auto-properties for state others read but only the owner writes (Score, Instance) — exposes read access while protecting invariants from outside mutation. (PatternsUnity6)

### Defensive Boundaries & Null/Guard Conditions
- Always null-check optional component references before invoking on them — raycasts and lookups can return nothing; act only when present. (CSharpForUnity)
- Use guard clauses that log and early-return for invalid/empty states — keeps the happy path unindented and prevents exceptions. (AdvancedCSharp)
- Guard collection operations that throw: check `queue.Count == 0` before `Dequeue()`, `ContainsKey` before `Add`, and stack count before `Pop` — these throw at runtime on empty/duplicate. (AdvancedCSharp; PatternsUnity6)
- Invoke C# events with the null-conditional `OnX?.Invoke()` and restrict them with the `event` keyword — `?.` avoids a NullReferenceException with zero subscribers in one thread-safe step, and `event` lets outside code only subscribe/unsubscribe, not overwrite or fire the delegate. (PatternsUnity6)
- Guard movement/state changes with boundary checks before applying them, and set logical limits slightly inside physical ones (script barriers at ±1.9 for visible barriers at ±2) — prevents clipping through walls and leaves margin against colliders. (CSharpForUnity)
- Use `math.normalizesafe`, never `math.normalize`, when input can be zero — normalizing (0,0) yields NaN that propagates into the transform and makes the entity vanish; default to the safe variant for user input. (ECSFundamentals)
- Remap raw oscillators into safe ranges before applying — a raw sine of −1..1 used as scale gives negative (inverted) or zero (invisible) results; `math.remap` into a usable band fixes it. (ECSFundamentals)
- In ECS, guard systems with `RequireForUpdate<T>()` instead of null-checking inside the loop — the system simply doesn't run until the data exists, eliminating defensive branches. (ECSFundamentals)

### Dangling References & Object Lifetime
- Use smart/tracking pointers or ID handles for cross-frame references to entities that can die — raw pointers to deleted objects crash; a tracking pointer nulls itself on the target's death. (GPGems2)
- When two objects hold pointers to each other and either can die, each destructor must notify the other and null the back-reference, then null-check every use — centralize "drop all references to me" in a destructor helper that walks the world. (SWEngGames)
- Guard against deleting a shared subobject twice — never let two owners point at the same instance; create a fresh one per owner or crash on double-delete at shutdown. (SWEngGames)
- Reference data by stable handles, not heavyweight objects — store `Entity` references (not GameObject references) in runtime components and convert GameObject→Entity once at bake time. (ECSFundamentals)

### Serialization, ForceMode & Unity API Gotchas
- Know that Unity dictionaries are not serialized and won't show in the Inspector — render their contents yourself (e.g. into a `TMP_Text`) to inspect state during play. (AdvancedCSharp)
- Iterate dictionaries with `foreach` over `KeyValuePair`, not a numeric `for` loop — dictionaries have no sequential integer index. (AdvancedCSharp)
- Import the namespace a type actually lives in (`Button` needs `UnityEngine.UI`, `TMP_Text` needs `TMPro`); resolve namespace collisions with a `using` alias rather than commenting out a whole `using`. (AdvancedCSharp; ECSFundamentals)
- Match `ForceMode` to intent: `Impulse` for one-frame events (jump/bounce/launch), `Force` for sustained pushes, `Acceleration`/`VelocityChange` when reaction should ignore mass — wrong mode produces wrong feel. (AdvancedCSharp; CSharpForUnity)
- Key all timing on real elapsed time (`dt`), never on cycle/frame counts, and store an absolute "next event time" rather than counting down — `_position += dt*_velocity` is processor-independent, and absolute-time scheduling avoids accumulated drift over long sessions. (SWEngGames; ECSFundamentals)
- Match time types to their source — use `double` for elapsed-time fields (since `SystemAPI.Time.ElapsedTime` is a double); a `float` loses precision over long sessions. (ECSFundamentals)
- Identify objects by Tag (or component), not by name — duplicated objects get names like `Tree (1)`, so name comparison is unreliable. (CSharpForUnity)
- Reload the level by active build index (`SceneManager.GetActiveScene().buildIndex`), not a hardcoded scene name/index — robust restart that survives renames. (CSharpForUnity)
- Treat ECS component fetches as value copies, not references — `GetComponentData`/transform builders (`Translate`, `WithScale`) return new values; mutate the local copy and write it back with `SetComponentData` or the entity never changes. (ECSFundamentals)
- Beware persistent static state when domain reload is disabled — fast iteration keeps static fields and event subscriptions alive between Play sessions; if a test passes only on the first Play, toggle domain reload on as a diagnostic. (ECSFundamentals)

### Refactoring Smells
- Treat a growing chain of type checks (`if (is TypeA) … else if (is TypeB) …`, `switch` on a class type, or special-case branches per subclass) as a refactoring smell — it doesn't scale and couples callers to the concrete type set; replace with a polymorphic/interface call. (AdvancedCSharp; SWEngGames; PatternsUnity6; GPGems2)
- Treat sprawling conditional/state branching on a mode field as a signal to refactor toward an explicit State pattern — encapsulating each state makes modes explicit and easier to maintain. (HeadFirstPatterns)
- Treat a script accumulating unrelated responsibilities over time (player gains scoring, then animation, then UI, then input) as a refactor trigger — one change otherwise touches several systems at once. (PatternsUnity6)
- Treat "stacking identical results" / repeated identical calls as a smell of a missing varying parameter or loop — duplication without variation signals a missing abstraction. (CSharpForUnity)
- Don't write the same code twice — if 3-4+ lines repeat, extract a method; duplicate code drifts apart over bug-fixes and features. (SWEngGames)
- Recognize "even small changes feel bigger than they should" as the core fragility symptom — features depending on features make a codebase hard to reason about; refactor toward modularity proactively before friction compounds. (PatternsUnity6)
- Refactor messy code immediately after it works, while it's still small — refactoring time is also the time to re-examine whether a pattern now fits (conditionals → State, concrete deps → Factory). (SWEngGames; HeadFirstPatterns)
- Separate essential complexity (the real problem) from accidental complexity (artifacts of your implementation) — e.g. callback-based AI that hoists state into members is accidental and removable. (GPGems2)
- The most common beginner mistake is block-copying an existing class for a new one when it should be a child/composition — inherit or compose instead of duplicating. (SWEngGames)
- Don't store the same data in two places — derive counts/state on demand instead of a separate field you must keep in sync (no forgery). (SWEngGames)

### DRY & Refactoring Workflow
- Extract repeated or standalone logic into its own named function before extending it, and refactor for structure before adding features — a clean function boundary is the foundation the next step builds on. (CSharpForUnity)
- Express a repeated pattern once (a loop, a parameterized expression driven by index) instead of copy-pasting per-instance code — one parameterized expression scales to any count. (CSharpForUnity)
- Parameterize what varies even when current callers all pass the same value (`AddGold(int amount)` over `AddTenGold()`, `IncreaseScore(int amount)` though every balloon awards 1) — future-proofs at zero cost and avoids per-value method duplication. (AdvancedCSharp; CSharpForUnity)
- Extract a focused method to keep update loops readable — delegate `OnUpdate`/`step` to a named method (`Movement(ref state)`) so the entry point stays a clear high-level outline; optionally write the method outline as comments first so intent is reviewable before implementation. (ECSFundamentals)
- Use a shared init-helper method when a class has several constructors so both parent and child paths reuse the same initialization — avoids duplication. (SWEngGames)
- Rebuild derived display state from the source of truth in one place at the end of every mutating method — a single `UpdateInventoryText`/`UpdateScoreText` that clears and regenerates means the view can never drift from the model. (AdvancedCSharp)
- Remove zero/empty entries from collections after mutation so stale rows never leak into the UI (delete the dictionary entry at quantity 0 so it never shows "x0"). (AdvancedCSharp)

### Testability & Iterative Build Discipline
- Give each method/class one clear job so responsibilities stay separable and testable — `AddItem`, `RemoveItem`, `UpdateInventoryText` each do exactly one thing. (AdvancedCSharp)
- Keep each mini-system small and single-purpose so each concept has a clean place to live — isolated, focused systems are easier to read, test, and reason about than one tangled monolith. (AdvancedCSharp; CSharpForUnity)
- Depend on interfaces/abstractions rather than concrete types where a caller needs a capability — also eases swapping and testing behind the contract. (PatternsUnity6)
- Build behavior in small verifiable increments (detect click → raycast → check component → call method) and run the full make-test-fix loop on every change — each step is independently testable so failures localize fast. (CSharpForUnity)
- Compile and test continuously, not at the end — catch and fix bugs incrementally so failures stay small and locatable. (IntroGameDesign)
- Assume ~90% of bugs are typos (misspellings, capitalization, missing semicolons) — check the cheap causes first before suspecting deep logic faults. (IntroGameDesign)
- Use logging/console output (`Debug.Log()`) to make the program's inner workings observable, and verify UI-to-script wiring with a stub before implementing real behavior — instrument to understand, don't guess. (IntroGameDesign; CSharpForUnity)
- Use ECS debugging windows and live system toggling to verify architecture, not just behavior — the Components/Systems windows show which systems read/write a type and update order; disabling a system at runtime proves which one owns which behavior. (ECSFundamentals)
- Build subsystems behind a clean interface with opt-in status/logging/disable hooks (`GetAudioStatus`, `EnableLogging`, `AudioSystemDisable`) — lets you isolate, instrument, and rule out a system during debugging with near-zero overhead when off. (GPGems2)

### Anti-Patterns (Wiring & Setup Order)
- Audit setup order so teardown doesn't undo wiring — registering a listener and then calling `RemoveAllListeners()` in the same `Start()` leaves the control dead; clear listeners only when deliberately rebuilding the set. (AdvancedCSharp)
- Pass a method as a reference (no parentheses) to a listener, not a call — `AddListener(AddTenGold)` registers it; `AddListener(AddTenGold())` invokes it immediately and is wrong; match the listener signature to the event's signature. (AdvancedCSharp)
- Disable a run-once/spawn system at the TOP of `OnUpdate`, before the work — placing `state.Enabled = false` at the bottom lets it run one extra frame and double-spawn; the ordering of the disable is load-bearing. (ECSFundamentals)
- Always include the duplicate-destroy check in a singleton `Awake` (`if Instance != null && Instance != this Destroy(gameObject) else Instance = this`) — without it a second instance silently overwrites the first based on execution order and survives scene reloads under `DontDestroyOnLoad`. (PatternsUnity6)
- Resist gold-plating and feature creep — cut flaky features rather than ship instability; disable or comment out flaky code when you ship. **When it flips:** ECS/incremental design → layer behavior additively and grow architecture only as behaviors appear, since a single job can add movement/scale in one pass without new systems (YAGNI, not pre-building). (SWEngGames; ECSFundamentals)

### Macros, Inlining & Construction Cost
- Use inline functions, not function-like macros — macros double-evaluate args, break on precedence and multi-statement bodies, and can't be type-checked or debugged; reserve macros only for what functions can't do (stringizing enums, debug toggles). (GPGems2; SWEngGames)
- Inline only small (~3 line), hot, or accessor functions and keep constructors lightweight — indiscriminate inlining and heavy ctors explode code size and raise cache-miss/page-fault risk. (GPGems2)
- Use initializer lists, not assignment in the constructor body, and prefer preincrement/`+=` to postfix/`operator+` for user types — member-then-assign double-constructs and value-returning operators build temporaries, too costly for hot vector math. (GPGems2)
- Declare single-argument constructors `explicit` unless implicit conversion is intended — stops hidden temporaries and accidental conversions. (GPGems2)
- Don't put virtual functions in small, frequently instantiated types (Vector, Matrix), and give such temporaries empty default constructors — the first virtual adds a per-object vtable pointer, and forced zero-init makes every temporary pay a cost it may not need. (GPGems2)
- Use `typedef` (not `#define`) to alias types — `typedef float Real;` flips float↔double in one line and stays type-checkable. (SWEngGames)
