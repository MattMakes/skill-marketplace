# Profiling, CPU, Memory, GC & Pooling

## Profiling Methodology & CPU

### Profile First, Never Guess
- Profile before optimizing; let measured data drive every change — intuition about hot code is untrustworthy and the great majority of a program isn't performance-critical, so optimizing it is wasted effort (GPGems2; Unity5Opt; Unity6Opt).
- Never optimize without proof a bottleneck exists, and ask "will the user notice it?" before fixing — premature optimization wastes effort; stop when quality is acceptable, not infinite (Unity5Opt).
- Build the feature with the naive approach first, watch cost accumulate as load rises, then refactor only the proven hotspot — don't pre-optimize before the cost is real (BulletHell).
- Treat claimed "optimizations" as suspect until measured — programmers frequently check in changes that actually slow code, especially in C++ where one simple line generates a lot of machine code (GPGems2).
- Add caching/perf tricks (Bloom filters, lookup tables, pooling) during the optimization stage after core functionality works, not while building features (GPGems2).

### Measure Before and After Every Change
- Measure performance both before and after every change, and re-profile after each fix to confirm the intended effect — cache behavior, branch mispredicts, or compiler handling can negate paper wins, so verify the change actually helped before moving on (GPGems2; Unity5Opt; Unity6Opt).
- Establish a baseline (FPS, batches, triangles, memory) before any change — without it you cannot judge if an optimization helped or what trade-off it incurred (Unity6Opt).
- Change one thing at a time, then re-measure — so you know which change actually helped (Unity6Opt).
- Predict the outcome before checking results — turns each tweak into understanding of why it works and builds reusable instinct (Unity6Opt).
- Treat every optimization as cost-shifting, not cost-removal, and watch the full cost — static batching, baked lighting, and LOD trade memory/bake-time/disk for speed (Unity6Opt).
- Verify perf wins at scale, not in trivial scenes — Burst/jobs and many ECS optimizations show little difference with a few entities and only become measurable at thousands, so benchmark under realistic load (ECSFundamentals).

### Profile on the Real Target Device
- Profile on the target device in a standalone/remote build, never Editor Mode — Editor overhead, extra memory, and different audio/native sizes pollute data (e.g. MonoBehaviour native size 376B in Editor vs 156B standalone); never trust Editor memory figures as final (Unity5Opt; Unity6Opt).
- Profile-test on the worst target hardware, not the dev machine — Instantiate/Destroy churn that "feels acceptable" on desktop becomes a real problem on mobile/low-power devices, and what's harmless on a strong GPU may break older devices (BulletHell; Unity6Opt; Unity5Opt).
- Enable Development Build + Autoconnect Profiler to attach the in-Editor Profiler to a real device — the only way to capture a standalone/remote instance (Unity5Opt).
- Profile the release build, not debug, across 2-3 representative low-to-high-end configs — bottlenecks differ greatly between configurations and vary greatly across hardware (GPGems2).
- Always validate trade-offs and final memory figures against actual target hardware and a built player — Editor numbers are not player numbers (Unity6Opt).

### Profiler Setup, Tooling and Hygiene
- Verify Profiler Record is enabled and Play Mode is selected before pressing Play — otherwise you capture editor overhead or miss frames entirely (Unity6Opt).
- Build a low-overhead in-engine profiler (timestamp at start/end of a region, subtract) and organize counters into enable/disable groups (model/world render, AI, physics) — a real system that gathers solid data beats guesswork, and groups let each engineer ignore unrelated modules; plan it early (GPGems2).
- Keep profiler overhead under 5% enabled and under 1% disabled, profile the profiler itself, and compile it out entirely via #define/#ifdef for release — once sampling eats meaningful frame time it changes app behavior, hides GPU stalls, and makes the data lie (GPGems2).
- Remember measuring perturbs the result — Profiler, Deep Profile, and logging all add CPU/memory overhead, so replicate suspected bottlenecks under non-profiling conditions before chasing them (Unity5Opt; Unity6Opt).
- Use a high-resolution counter (read rdtsc directly; warm it and flush the i-cache via cpuid first), not the millisecond multimedia timer — QueryPerformanceCounter has high call overhead; divide cycles by CPU MHz for consistent results (GPGems2).
- For custom block timing use System.Diagnostics.Stopwatch (or Profiler.BeginSample/EndSample markers), run the block N times and divide — averaging gives precision the ms-accurate Stopwatch lacks, but it hides JIT first-call cost and inflates cache-hit rate; markers compile out of final builds so they're safe to leave in (Unity5Opt; Unity6Opt).
- Use the right tool per layer: VTune/Metrowerks for instruction-level CPU, GPT/Frame Debugger for draw traffic, GPU driver counters for GPU breakdown — but beware capture tools that slow the app, since heavily-instrumented measurements mislead (GPGems2; Unity5Opt; Unity6Opt).
- Avoid Deep Profile except in small test scenes — it recompiles to instrument every method, adds huge CPU/memory cost, and can OOM large projects before testing starts (Unity5Opt).
- Use ECS-specific tooling: the Systems window for per-system timing and entity counts, the plug icon to toggle a suspect system live, and the Components window to read struct byte size and trace which systems read/write a component (ECSFundamentals).

### Read Frames Individually, Not Averages
- Do frame-by-frame analysis, not accumulated-interval averages — coherency breaks in seconds (corridor vs firefight) and the per-frame view isolates one bottleneck and the exact moment a spike occurs (GPGems2; Unity6Opt).
- Record average, worst-case, and frame-rate consistency, not a single number — single-frame or single-number timing tells you nothing (GPGems2).
- Budget per frame and compare spikes against the benchmark bars: 30 FPS = ~33ms, 60 FPS = ~16ms total — use the Profiler's 60/30 FPS lines, not raw spike height, since the Timeline auto-rescales its Y axis and makes small spikes look huge (Unity5Opt).
- Project frame cost forward by scenario, not just current state — reason about "more enemies," "hundreds of projectiles/sec," or "multiplayer" and size systems for the worst expected load (BulletHell).
- Display counters as auto-scaled bar graphs with current + max-since-last-update and color cues, refreshing every ~30 frames not every frame — fast to read without itself becoming intrusive (GPGems2).

### Benchmark Repeatably; Remove Noise
- Use deterministic input record/playback to benchmark optimizations repeatably, and verify critical game state on playback — frame rate varies with polygon count, overdraw, path complexity, and object count, so timing a quick run-through is meaningless and an "improvement" may just mean the player walked into a closet (GPGems2).
- Begin runtime testing only after the app reaches steady state — Awake/Start/Physics/Render init has a ~1s startup cost that skews early samples; gate tests behind a keypress (Unity5Opt).
- When micro-benchmarking, verify the loop body isn't optimized out, that cache behavior matches the real game, and take many samples discarding spikes — a warm synthetic cache mis-emulates in-game behavior, so benchmarking inside the game is best (GPGems2).
- Cache log data and print once at the end of a test (never per-iteration), and prefer breakpoints over debug-log edits — Debug.Log is prohibitively expensive in CPU and heap, per-iteration logging pollutes results, and leftover logs risk shipping overhead (Unity5Opt).
- Eliminate exception/error spam, kill background processes, ensure free RAM, and deactivate irrelevant GameObjects before testing — thrown errors add CPU+heap noise, low memory causes cache misses and page swaps, and a sudden FPS jump when one object is disabled fingers the culprit (Unity5Opt).
- Verify the suspect script is actually present the expected number of times — duplicated MonoBehaviours invoking the same expensive method look like one bottleneck (Unity5Opt).
- Toggle domain reload back on as a quick diagnostic when a test behaves differently on the second Play — lingering static state is the likely cause and reload isolates it (ECSFundamentals).

### Diagnose CPU-Bound vs GPU-Bound
- Diagnose CPU- vs GPU-bound from the CPU and GPU Usage modules — CPU-bound = high CPU rendering time with an idle GPU (e.g. ~15k draw calls); GPU-bound = GPU time far exceeds CPU; start in the CPU Usage module since it shows time on scripts, rendering prep, physics, and GC (Unity5Opt; Unity6Opt).
- Pick the optimization that fits your actual bottleneck and target hardware — the right technique depends on whether you're CPU-draw-call bound, GPU-fill/shadow bound, or memory bound, and the best fix is invisible to the player. **When it flips:** the CPU/scheduling rules in this section assume CPU- or allocation-bound frames → when profiling shows the frame is GPU-fill/shadow or memory-bandwidth bound, freeing CPU cycles won't raise FPS, so re-diagnose and apply the matching GPU/memory fix (Unity6Opt; Unity5Opt).
- Brute-force confirm CPU-bounding by disabling batching/Atlasing and watching FPS worsen — if disabling draw-call savers tanks performance, you're near CPU-bound (Unity5Opt).
- Keep CPU and GPU concurrently busy by preparing scene N+1 (physics/AI/network) while the GPU drains scene N, and insert independent CPU work between scene submit and any GPU-dependent step — keeps the CPU busy while the GPU drains (GPGems2).
- Never read back the frame/Z buffer mid-frame for game logic — it forces a full pipeline flush, idles the CPU in the driver, is PCI-speed-limited, and a 256x256 32-bit readback ≈ 1ms; replace readback with GPU-resident computation (render-to-texture, alpha accumulation) (GPGems2).
- Note multithreaded rendering changes the equation — when graphics-API calls run on a worker thread, cutting main-thread work won't speed rendering; only when single-threaded does freeing main-thread cycles help (CPU-bound ≈ ≥50% frame time on API calls) (Unity5Opt).
- Expect rendering, not ECS logic, to dominate once all entities are on-screen — at 20,000 entities spawn/movement stays cheap while rendering becomes the cost, so budget GPU/draw separately from CPU sim (ECSFundamentals).

### Scripting Hotspots: Update, GetComponent, Find, SendMessage
- Cache Component references in Awake/Start; never re-GetComponent each call — repeated GetComponent (especially in Update or per-event paths) wastes CPU for a few saved bytes (Unity5Opt; BulletHell).
- Use GetComponent<T>()/GetComponent(typeof(T)), never GetComponent(string) — the string variant is ~30x slower; the type-based versions are equivalent (Unity5Opt).
- Delete empty Update/Start/callback stubs and strip them from shared base MonoBehaviour classes — Unity hooks and invokes them every frame, so thousands of empty Update()s spike CPU; one empty stub in a base class permeates every derived component (beware OnGUI firing multiple times per event) (Unity5Opt; BulletHell).
- Omit Update entirely on components that only react to events — a Health component changes only when damaged, so an empty/unused Update is pure per-frame overhead (BulletHell).
- Never use SendMessage() at runtime — it's ~2000x slower than a direct call; replace with a cached GetComponent + direct method call (Unity5Opt).
- Never use GameObject.Find() families at runtime, and hoist invariant Find/lookup calls out of loops — cost scales with scene complexity (iterates every GameObject); do one-time lookups once in Awake/Start and cache the result (Unity5Opt; BulletHell).
- Prefer direct references (SerializeField, static manager) or a throttled global messaging system over Find/SendMessage, capping per-frame message processing time so one frame doesn't choke on a queue — keeps coupling and overhead low (Unity5Opt).
- Replace N Update() callbacks with one god-class Update() iterating a custom interface list — every Unity callback crosses the costly native-managed bridge, so keep update logic in managed code (Unity5Opt).
- Prefer System.Object.ReferenceEquals(obj, null) over `obj != null` for Unity objects en masse — `!= null` invokes a method across the native-managed bridge (~2x slower) (Unity5Opt).
- Don't poll input every frame when events suffice, and guard event handlers against the wrong phase — Action callbacks remove redundant Update polling, but check `context.performed` so a fire action doesn't run on both press and release (BulletHell).
- Avoid runtime reflection (restrict to init/load) and use Script Execution Order sparingly — reflection causes CPU spikes/freezes (useful only to force-JIT a proven-spiky method), and needing execution order signals fragile tight coupling (Unity5Opt).

### Scripting Hotspots: Boxing, LINQ, Strings, Allocation
- Avoid LINQ and Regex in real-time game code — heavy overhead, LINQ uses closures and won't run on no-JIT platforms like iOS; replace with hand-written logic (Unity5Opt).
- Avoid closures in hot paths — lambdas/anon methods that capture outside data heap-allocate an environment object per call, defeating stack allocation (Unity5Opt).
- Avoid boxing value types into System.Object — implicit boxing (passing ints to String.Format, ArrayList) heap-allocates a wrapper per value (Unity5Opt).
- Avoid string concatenation with +/+= in hot paths; use StringBuilder (presized) or string.Format/Join/Concat — each + allocates a new immutable string (a 9-part concat allocates 9), though constant literals are merged at compile time (Unity5Opt).
- Avoid std::string parameters in hot C++ APIs; take const char* — constructing a string from a literal can malloc+strlen+memcpy then free, duplicating data already in the data segment for nothing (GPGems2).
- Never read GameObject.tag or .name at runtime; use CompareTag() — each .tag/.name access duplicates the string on the heap (10M tag reads ≈ 363MB allocated, 488ms in GC), while CompareTag compares with zero allocation (Unity5Opt).
- Avoid foreach over Mono collections (List, Dictionary) and `foreach (Transform child in transform)` in hot paths — they heap-allocate an Enumerator; use a for loop (foreach over plain arrays is safe, as the compiler converts it) (Unity5Opt).
- Cache or avoid Unity API calls that return arrays (GetComponents<T>, Mesh.vertices, Camera.allCameras) and reuse large temp work buffers — each call allocates on the heap, raising GC memory pressure (Unity5Opt).

### Run Less Often: Scheduling, Staggering, LOD of Logic
- Run AI/expensive logic less often than every frame — agents have plausible reaction times, so run decision code every few frames/seconds via timer callbacks, Coroutines, or InvokeRepeating instead of a per-frame body + bool check (GPGems2; Unity5Opt).
- Stagger and randomize each agent's re-run interval within a window — prevents agents synchronizing into a processing peak where all fire the same frame; use two-layer coroutine timing (cooldown between bursts, cadence within) to shape load over time (GPGems2; Unity5Opt; BulletHell).
- Distribute long algorithms (A* pathfinding) across several frames by saving state and resuming — situations rarely change much over 2-4 frames, lowering per-frame load (GPGems2).
- Solve only the part of a problem you need now and defer the rest (lazy evaluation) — hierarchical pathfinding computes the room-to-room path then the micro-path room-by-room; a redirect throws away uncomputed work (GPGems2).
- Apply level-of-detail to logic, not just graphics — vary AI processing frequency by distance to camera/player/action, simplify or drop precise pathfinding for offscreen agents, and collapse many distant agents into one aggregate simulation (GPGems2).
- Disable non-visible Component logic via OnBecameVisible/OnBecameInvisible or cull far objects by distance via a periodic Coroutine — skip AI/scripts on offscreen or too-distant objects (Unity5Opt).
- Guard ECS systems with RequireForUpdate<T>() and disable one-shot systems (state.Enabled = false) at the TOP of OnUpdate before their work — skipping empty updates avoids wasted frames, and disabling a spawner first guarantees exactly-once execution instead of an extra frame of double output (ECSFundamentals).
- Prefer coroutines over manual per-frame timer polling for time-spaced actions, but know they run on the main thread — `WaitForSeconds` paces timed spawns/attacks without every-frame checks, yet does not offload CPU work off the main thread (BulletHell).
- Prefer event-driven notification over per-frame polling — polling promotes enormous redundant computation; have the ball/arrow notify fielders/targets instead of each agent scanning every frame (GPGems2).

### Algorithmic Cost and Do-Less Wins
- Rethink the problem with an alternate algorithm for order-of-magnitude wins — optimizing specific code yields marginal gains; the real leaps come from a different approach (e.g. Combs method sidesteps fuzzy-logic combinatorial explosion) (GPGems2).
- Do hard work offline and bake it into data — precomputed BSPs, preanalyzed terrain, trained nets, and lookup tables cram thousands of hours of analysis into a few KB and trivial runtime cost (GPGems2).
- Amortize expensive queries with continuous incremental bookkeeping — keep an influence map / LOS list updated as data changes so the query is cheap, spreading cost over many frames instead of one spike (GPGems2).
- Eliminate redundant calculation by computing once and sharing — pairwise collision is O(n²/2) not O(n²); let one unit pathfind and others roughly follow instead of N identical path requests (GPGems2).
- Maintain a small running list of relevant candidates instead of scanning a large spatial area — a per-player in-LOS list (one DWORD check/unit) beats scanning ~350 tiles, an order-of-magnitude win (GPGems2).
- Run an early-out: if a cheap test proves the work unnecessary, skip it — e.g. if any occluder fully covers the sun, skip the entire lens-flare computation (GPGems2).
- Cache results of repeatedly-called expensive functions (e.g. a Bloom filter answering "definitely not computed" cheaply) — trade memory for time (GPGems2).
- Compare sqrMagnitude vs distance² instead of magnitude/Distance() — CPUs multiply fast but compute square roots slowly; applies to any sqrt comparison (Unity5Opt).
- Centralize cooperative/decision work in a manager rather than every agent communicating to coordinate — cheaper and simpler, and the manager needn't be on-screen (GPGems2).
- Choose containers for memory/cache behavior, not just big-O, and prefer a contiguous vector over a tree-based set/map for the small n a game actually uses — O(log n) ops hide a large constant plus a malloc/free per node, and tree nodes scatter across memory and thrash the cache; measure (GPGems2).
- Match per-entity logic complexity to entity count — simple movement scales to tens of thousands cheaply, but expensive AI/physics per entity raises cost sharply, so the same count isn't equally affordable for all logic (ECSFundamentals).

### C++/Compiler Hot-Path Cost
- Examine the compiler's disassembly for hot code — a deceptively simple C++ line (or a heavy overloaded-operator expression like m1 = m2 * m3) can emit significant machine code: temporaries, copies, hidden allocations (GPGems2).
- The fastest code is the code that never runs — delay object construction until proven needed, and don't declare nontrivial objects inside loops; declare before the loop and reuse, or pass by reference, to pay construction once (GPGems2).
- Use constructor initializer lists over body assignment, prefer copy-construction over construct-then-assign, and prefer preincrement to postincrement for non-trivial types — body assignment and postincrement each construct an extra temporary (GPGems2).
- Avoid operators that return by value (operator+) in hot paths; use in-place forms (operator+=) or a named Add(out,a,b) — return-by-value forces temporary construction + copy on something called per-frame (GPGems2).
- Avoid virtual functions and abstract-interface calls in small, frequently-used classes and inner loops — vtable indirection plus i-cache misses cost, and the first virtual adds a per-object vtable pointer; cache a virtual accessor's result in a base-class member returned by an inline getter when hot (GPGems2).
- Avoid RTTI/dynamic_cast — enabling RTTI bloats nearly every class and dynamic_cast is expensive; add a virtual that behaves by type instead (static_cast is free) (GPGems2).
- Prefer inline functions over function-like macros, but inline only small/hot functions — macros double-evaluate args and break on precedence, while over-inlining grows code size, hurts i-cache, and raises page faults (GPGems2).
- Keep the working set and executable small — a hard page fault is catastrophic (~10ms / ~4M cycles on a P-II); strip debug info, fold duplicate strings, and drop debug print strings to improve i-cache coherency, and try "optimize for size" which can run faster (GPGems2).
- Suspect cache misses and branch mispredicts when tight, fat-free code still profiles hot — pointer-chasing nonadjacent data and unpredictable branches stall modern CPUs far more than the visible instruction count suggests; prefer branchless/bit-trick idioms and direct array indexing in hot loops (GPGems2).

### ECS/Jobs/Burst CPU Scaling
- Move per-entity work off the main thread into jobs and use ScheduleParallel() to split matching entities across worker threads — a single-threaded Update over thousands of objects becomes the bottleneck, and parallel slices are where the scaling comes from (ECSFundamentals).
- Declare job data access as tightly as possible (`in` read-only, `ref` read+write, no modifier read-by-value) and capture frame-global values (DeltaTime) once as job fields — looser access creates scheduler conflicts that block parallel execution, and jobs can't touch Time.deltaTime directly (ECSFundamentals).
- Prefer unmanaged systems (ISystem partial struct) over managed SystemBase by default, keeping the Burst-compilable subset intact — avoid managed types, GC allocations, and reflection in jobs, since Burst is built for numeric branch-light work and silently can't optimize code outside that subset (ECSFundamentals).
- Use Unity.Mathematics (math.sin, float3) and Unity.Mathematics.Random inside jobs, not UnityEngine.Mathf/Random — only the Mathematics types are Burst-compatible and vectorize to SIMD; the engine equivalents break Burst compilation (ECSFundamentals).
- Enable Burst globally AND mark each system OnUpdate and job struct with [BurstCompile] — global enable alone does nothing and leaving either un-attributed leaves that path running unoptimized managed (ECSFundamentals).
- Combine multiple per-entity behaviors into a single job pass and process many entities with one system — avoids multiple iterations over the same entities and multiple scheduling overheads, scaling far better than per-object MonoBehaviours (ECSFundamentals).
- Expect a one-time JIT pause the first time a Bursted job runs in the Editor — standalone builds compile ahead of time so the hitch disappears in shipping (ECSFundamentals).

### Pooling to Kill Per-Frame Allocation Spikes
- Object-pool spawn/despawn instead of Instantiate/Destroy for anything created/destroyed many times per second (projectiles, particles, enemies) — Instantiate clones the prefab and all children, allocates and registers them, and fires Awake/OnEnable, while Destroy queues GC at frame end, producing allocation and GC stutter that scales with spawn rate (Unity5Opt; BulletHell; GPGems2).
- Pay allocation cost once at startup (prespawn, deactivate on despawn, reactivate on respawn) then toggle active state — pushes the bulk of instantiation cost to load time, eliminating runtime spikes and GC; prefer Unity's built-in ObjectPool<T> with sensible defaultCapacity/maxCapacity (Unity5Opt; BulletHell).
- Re-initialize and fully reset pooled objects on every Get, not in Start — reused instances don't get a fresh Start and carry over stale state (hit flags, lifetime timers, and Rigidbody2D velocity that Unity zeroes on disable), so per-launch setup must run explicitly on activation (BulletHell; Unity5Opt).
- Size pools per source and bound the lifetime of free-traveling spawned objects — give busier sources larger pools, and give projectiles a release timer so shots that never hit return instead of accumulating off-screen (BulletHell).

## Memory, GC & Object Pooling

### GC Fundamentals & Allocation Avoidance
- Avoid heap allocations to dodge garbage collection — GC mark-and-sweep can freeze gameplay and its cost scales with heap size (sweeping GBs is far slower than MBs). (Unity5Opt; Unity6Opt)
- Treat smooth frame pacing as a hard requirement and avoid any per-frame allocation — for projectile-heavy genres a single GC stutter directly breaks the core experience. (BulletHell)
- Watch GC and managed memory in the Profiler CPU module — garbage collection consumes frame time and is a tracked CPU cost. (Unity6Opt)
- Prefer standalone value types (stack) over reference types (heap) for short-lived scope data — stack dealloc is free; only heap allocations attract the GC. (Unity5Opt)
- Keep components/transient data data-only with no logic so the layout stays cache-friendly, and verify what each "simple" line actually emits — a deceptively plain C++/C# line can generate temporaries, copies, and hidden allocations. (GPGems2; ECSFundamentals)
- Hide unavoidable GC by manually invoking System.GC.Collect() at concealed moments (level load, pause, cutscene) — use GetMonoUsedSize/GetMonoHeapSize to decide when; don't rely on memory being instantly available after, since the Finalizer thread can delay actual free by seconds. (Unity5Opt)

### Eliminating Per-Frame Allocations
- Never read GameObject.tag or .name at runtime — each access duplicates the string on the heap and draws the GC (10M tag reads ≈ 363MB allocated, 488ms in GC); use CompareTag() instead of `== tag` for zero-allocation comparison. (Unity5Opt)
- Avoid string concatenation with +/+= in hot paths — each operator allocates a new immutable string (a 9-part concat allocates 9 strings); use StringBuilder (presize if final size known) or string.Format/Join/Concat for a single allocation. (Unity5Opt)
- Combine constant string literals freely with + — the compiler merges them at compile time, so only variable-containing concatenations allocate at runtime. (Unity5Opt)
- Avoid std::string parameters in hot APIs; take const char* — constructing a string from a literal can malloc+strlen+memcpy then free, duplicating data already in the data segment for nothing. (GPGems2)
- Avoid boxing value types into System.Object — implicit boxing (passing ints to String.Format, ArrayList, etc.) heap-allocates a wrapper per value. (Unity5Opt)
- Avoid closures/lambdas that capture outside data in hot paths — each call heap-allocates an environment object, defeating stack allocation. (Unity5Opt)
- Avoid LINQ and Regex in real-time game code — heavy overhead (LINQ uses closures and won't run on no-JIT platforms like iOS); replace with hand-written logic. (Unity5Opt)
- Cache or avoid Unity API calls that return arrays (GetComponents<T>, Mesh.vertices, Camera.allCameras) — each allocates on the heap; call once and reuse. (Unity5Opt)
- Minimize StartCoroutine calls and short-lived coroutines — starting one costs a small heap allocation (yields cost nothing further). (Unity5Opt)
- Reuse large temporary work buffers instead of reallocating — lowers allocation and GC memory pressure. (Unity5Opt)
- Avoid operators that return by value (operator+) in hot paths; use in-place forms (operator+=) or named Add(out, a, b) — return-by-value forces temporary construction plus a copy on something called per-frame. (GPGems2)
- Don't declare nontrivial objects inside loops — declare before the loop and reuse, or pass by reference into inner-loop functions, to pay construction once. (GPGems2)
- Delay object construction until proven needed — the fastest code never runs; an early-return path shouldn't pay for an unused object's ctor/dtor. (GPGems2)

### Object Pooling
- Object-pool spawn/despawn instead of Instantiate/Destroy for anything created/destroyed many times per second (projectiles, particles, enemies, weapons) — Instantiate/Destroy churn produces allocations, GC spikes, and frame-time stutters that scale with spawn rate; recycling is dramatically cheaper, especially on mobile. (Unity5Opt; BulletHell; GPGems2)
- Pay allocation cost once at startup, then toggle active state at runtime — prefab-pool GameObjects by prespawning at scene/Awake init, deactivating on despawn (SetActive(false)), and reactivating on respawn, pushing instantiation cost to load time and eliminating runtime spikes. (Unity5Opt; BulletHell)
- Know what Instantiate actually costs before deciding to pool — each call clones the prefab and all children, allocates GameObject + component instances, registers them in the scene, and fires Awake/OnEnable on every component; Destroy then queues unregister + GC at frame end. (BulletHell)
- Use the engine's built-in pool (Unity's ObjectPool<T> in UnityEngine.Pool) rather than rolling your own — stack-based reuse with create/get/release/destroy callbacks, default capacity, and max size handled for you. (BulletHell)
- Maintain stack discipline on a cache (free X only after everything allocated after X) so the pool lives in one contiguous block — improves locality and simplifies frees; templatize the cache. (GPGems2)
- Set defaultCapacity to the expected steady-state count and maxCapacity to the realistic ceiling — extras released beyond max are destroyed instead of stored, capping memory while still avoiding allocs in the common case. (BulletHell)
- Prespawn the right count per source, not globally — too few forces runtime Instantiate (allocation), too many wastes memory; size by measuring peak concurrent need and give heavier sources larger pools (e.g. enemies 20/40 vs player 10/20). (Unity5Opt; BulletHell)
- Release pooled objects instead of destroying them on expiry or impact — call pool.Release on both timeout and collision so the instance is disabled and reused, never GC'd. (BulletHell)
- Give each pooled object a back-reference to its owning pool so it can self-return — set the pool reference in the create callback so an object knows which of multiple pools to return to. (BulletHell)
- Bound the lifetime of any free-traveling spawned object — give projectiles a release timer so shots that never hit are returned/destroyed instead of accumulating off-screen and wasting memory; reset the timer on both spawn and collision. (BulletHell)
- Re-initialize pooled objects on every Get, not in Start — pooled objects don't get a fresh Start callback on reuse, so move per-launch setup (velocity, flags, timers) into an explicit method called after Get, or they retain stale state. (BulletHell)
- Reset all per-instance state when pulling from the pool — hit flags, lifetime timers, and physics state carry over from the last life; in particular re-apply Rigidbody/Rigidbody2D velocity on reuse (Unity zeroes it when the GameObject is disabled) and reset velocity/angularVelocity, or recycled objects sit motionless or fire expired logic instantly. (Unity5Opt; BulletHell)
- Stop coroutines on despawn (StopAllCoroutines) — coroutines run independent of GameObject active state and survive deactivation. (Unity5Opt)
- Reset/clear pool dictionaries before scene load — static pools outlive scenes and end up full of null refs after Unity destroys the old scene's objects. (Unity5Opt)
- Initialize the pool in Awake, before any consumer needs it — building it in Awake (not Start) guarantees it exists before other scripts' Start calls request objects. (BulletHell)
- Cache the unwrapped ObjectPool<T> once in Start rather than dereferencing the wrapper component every shot — so each shot doesn't traverse the wrapper. (BulletHell)
- Enable pool collection checks during development — the collection-check flag warns on double-release of the same instance, catching otherwise hard-to-trace pooling bugs. (BulletHell)
- Reuse a finite pool of expensive runtime resources on demand — e.g. instantaneous voice reuse in a sampler (halt old voice, fade its DC offset) lets a new sound start with no delay/artifacts despite a fixed budget. (GPGems2)

### Custom Allocators & Heap Management
- Most C++ games need their own memory manager — C++ implicitly allocates via temporaries and member ctors, so heap fragmentation is a real threat under many small allocations. (GPGems2)
- Override global new/delete to redirect common small allocations into preallocated blocks with a linked free list — e.g. reserve 40000 bytes for up to 10000 4-byte allocations; pop on alloc, push on free. (GPGems2)
- Pass allocations above a size threshold to a separate large-block allocator or malloc — reserving many large blocks wastes memory on idle ones; reserve many small blocks for the common short-lived case. (GPGems2)
- Consider draconian options when justified: allocate nothing after startup, or free a big contiguous block periodically (between levels) — avoids fragmentation entirely. (GPGems2)

### Struct vs Class & Value Types
- Use structs instead of classes for transient data blobs that don't outlive scope — structs are value types allocated on the stack, sparing unnecessary GC. (Unity5Opt)
- Pass large structs by ref (with readonly fields) to avoid copy cost — value types copy all their data on every pass; ref copies only a pointer but allows mutation. (Unity5Opt)
- Keep ECS components as value-type structs (IComponentData with only value-type fields) and data-only with no logic — unmanaged structs live directly in ECS chunks giving cache-friendly access; managed/reference data breaks it. (ECSFundamentals)
- Use SIMD-friendly math types (float3/float2/float4 from Unity.Mathematics) rather than Vector3/Vector2 for entity data — they are the shader-like, Burst-compatible equivalents. (ECSFundamentals)
- Inspect a component's type size and keep structs small — knowing struct byte size tells you chunk density and cache behavior; use double only where time-accuracy demands it (ElapsedTime, timestamps) and float for per-frame deltas. (ECSFundamentals)
- Avoid double precision in general game code — doubles need twice the storage and may load/process slower; use single-precision floats. (GPGems2)
- Use lightweight (often empty) default constructors for tiny frequently-instantiated classes like Vector/Matrix — forcing every temporary to zero-init taxes all callers; provide explicit SetZero/SetIdentity instead. (GPGems2)
- Use constructor initializer lists, not assignment in the body — body assignment default-constructs members (may malloc) then copies; init lists construct once and let the compiler elide. (GPGems2)
- Prefer copy-construction over construct-then-assign and mark single-arg constructors explicit — Vehicle v(v2) beats Vehicle v; v=v2, and explicit prevents the compiler generating hidden temporary objects. (GPGems2)

### Caching References
- Cache component references in Awake/Start, never re-GetComponent each call — repeated GetComponent (especially in Update or per-event paths) wastes CPU for a few bytes of saved memory; caching is cleaner too. (Unity5Opt; BulletHell)
- Do one-time lookups once, not every frame — find the player/invariant objects in Start (e.g. FindGameObjectWithTag) and store the result, and hoist invariant calls (like Find) out of loops. (Unity5Opt; BulletHell)
- Inline a virtual accessor by caching its result in a base-class data member returned by an inline getter — turns a per-call virtual dispatch into a load in performance-critical loops. (GPGems2)
- Cache results of repeatedly-called expensive functions — trade memory for time (e.g. a Bloom filter cheaply answers "definitely not computed" vs "probably computed"); add such caching during the optimization stage after core functionality works. (GPGems2)

### Collections, Containers & Resizing
- Choose containers for memory/cache behavior, not just big-O — O(log n) set/map ops hide a large constant and a malloc/free per node; a contiguous vector often beats a set/map for the n a game actually uses, so measure. (GPGems2)
- Prefer a contiguous vector over a tree-based set/map for small collections — vector scan is cache-friendly while set/map scatter red-black nodes and thrash the cache (a set can use 3-4x the memory of a pointer vector), and ++it is one pointer increment vs a tree traversal that likely misses cache. (GPGems2)
- Store pointers, not objects, in STL collections — avoids extra ctor calls during deletion and lets vector deletion shuffle via a single fast memcpy. (GPGems2)
- Verify STL containers actually free memory on clear() — a vector that retains capacity fragments the heap on restart; either reserve() max up front or force-free via vector<T>().swap(v). (GPGems2)
- Avoid foreach over Mono collections (List, Dictionary, etc.) in hot paths — they allocate an Enumerator class on the heap; foreach over plain arrays is safe (compiler converts to for), and replace `foreach (Transform child in transform)` with a for loop over GetChild(i)/childCount. (Unity5Opt)
- Iterate contiguous arrays sequentially to avoid cache misses — data layout governs both iteration speed and GC sweep time. (Unity5Opt)
- Keep large reference-type groups separate from value-type groups in memory (SoA over AoS) and store data in contiguous chunks grouped by type — one reference field inside a struct array forces the GC to scan every element, while parallel primitive arrays let it skip them and keep iteration cache-friendly across thousands of entities. (Unity5Opt; ECSFundamentals)

### Memory Budgets, Leaks & Unmanaged Resources
- Track the Memory module alongside frame time and never trust Editor memory figures as final — many optimizations (static batching, baked lighting, LOD) trade memory for speed, so validate against a built player on target hardware. (Unity6Opt)
- Budget the static-batching memory cost explicitly — Unity builds one combined vertex buffer storing every batched object's verts separately while keeping the original mesh, so graphics memory can rise sharply (e.g. 170MB→420MB; 1000 trees = 1000x mesh memory); re-check after enabling, especially on mobile/older GPUs with limited VRAM. (Unity6Opt; Unity5Opt)
- Account for all LOD levels staying resident in memory — only one renders at a time but Unity keeps every level loaded to switch; LOD trades GPU work for memory. (Unity6Opt)
- Budget lightmap memory and disk — baked lighting stores lighting in textures that occupy runtime memory and can reach hundreds of MB (e.g. 20 lightmaps at 2048² ≈ 213MB); control with compression (prefer High Quality) and a modest Max Lightmap Size. (Unity6Opt)
- Keep total simultaneous texture usage below VRAM to avoid thrashing — overflowing VRAM forces back-and-forth refetch (worsened by fragmentation), a common console→desktop port problem. (Unity5Opt)
- Deregister listeners/delegates on destroy (pair every AttachListener with DetachListener) — dangling delegate refs prevent GC of the object and leak memory. (Unity5Opt)
- Explicitly Dispose/unload unmanaged resources (WWW.Dispose, audio clips, Resources.UnloadAsset) — setting references null doesn't free native buffers; prefer Resources.UnloadAsset (one asset) over UnloadUnusedAssets (iterates all), and remember both are async so don't assume instant free. (Unity5Opt)
- Treat a hard page fault as catastrophic (~10ms / ~4M cycles on a P-II) — code/data bloat raises page-fault and cache-miss probability, so keep working sets tight. (GPGems2)
- Use a debug memory manager that logs every alloc/free with file+line and pads each block with guard values — finds leaks (entries left at exit) and detects bounds violations. (GPGems2)
- Remember pitfalls are about scale, not individual elements — a few heavy meshes or a little UI is fine; allocation and memory cost compounds across a whole scene. (Unity6Opt)
