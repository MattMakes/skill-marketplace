## Performance & Optimization


### When to Optimize (Methodology & Discipline)

- Profile before optimizing — intuition about hot code is untrustworthy; most code is not performance-critical, so measure to find the real bottleneck (widely corroborated).
- Don't optimize while writing the game — finish a working block first, then profile; premature optimization wastes time on code you may delete. **When it flips:** (a) data layout / object pooling / culling architecture on a known-large-scale system (ECS, bullet-hell, open world) → design for performance from the start, because retrofitting a cache-hostile or allocation-heavy core is prohibitively expensive later; (b) one-off gameplay logic of uncertain scale → defer optimization until a measured bottleneck proves it matters.
- Ask "will the user notice it?" before fixing anything — if no, the optimization is wasted effort.
- Know when to stop optimizing/polishing — past "acceptable quality," further changes yield little tangible benefit; ask "will the user notice it?" before fixing anything.
- Treat performance work as science: set target metrics, load-test, instrument, root-cause, fix, repeat — art doesn't excuse a sloppy process.
- Follow the loop: suspect a pitfall, confirm it with the right profiler module, apply a targeted fix, re-measure — turns optimization into a repeatable method, not luck.
- Establish a baseline before any change — without before/after numbers you cannot prove an optimization helped or hurt.
- Profile/measure performance before AND after every change/optimization — programmers frequently check in "optimizations" that actually slow the code; re-profile after every fix to confirm the intended effect and catch new bottlenecks you introduced.
- Change one thing at a time, then re-measure — isolates which change actually moved the needle and which did nothing (widely corroborated).
- Rethink the problem before micro-optimizing — attacking from a new algorithm/perspective yields order-of-magnitude wins; tuning code yields only marginal ones.
- Beat death-by-a-thousand-cuts perf: avoid memory fragmentation and cache misses — marginally inefficient code adds up to prohibitive stutter even when each system is within budget.
- Pause and predict the outcome before checking a result — turns each experiment into understanding and sharpens your instinct for what costs what.
- Treat unexpected profiling results as learning, not failure — surprises are where your model of what costs what gets corrected.
- Treat performance as a development-phase concern, not a final-polish step — thinking about how a scene renders (not just how it looks) catches cost early.
- Weigh workflow cost against performance gain — obfuscating code or refactoring everything for marginal speed can hurt more than it helps; ask "will the user notice it?" before optimizing.
- Always verify trade-offs (memory, bake time, disk) against your actual target hardware — an optimization that frees frame time can blow a different budget on a constrained device; every art optimization is a trade-off (widely corroborated).
- Wear the project-manager hat to weigh trade-offs (programmer time vs artist time, memory vs CPU) — return on investment decides what gets polished/optimized.
- Spend an hour learning your profiler/tooling in a playground before crunch — you don't want to learn tooling with 100 defects two weeks from ship.
- Build small stress-test scenes (dense geometry + many lights) to rehearse the full profile-fix-measure loop without a tutorial holding your hand.

### Readability vs Micro-Optimization (Resolving the Tension)

- Write simple RISC-like statements over dense complex ones in hot code — they let the compiler parallelize across execution units and let debuggers set breakpoints.

### Profiling Practice & Tools

- Profile the release build (with debug symbols) on several representative hardware configs, low to high end — debug builds and single configs hide the bottlenecks that ship (widely corroborated).
- Profile before optimizing on a standalone build on the target device, never in the editor/play mode — premature optimization wastes hours and editor overhead and debug hooks pollute CPU/memory data wildly (editor memory ≠ built-player memory); ask "will the user notice it?" before fixing anything.
- Disable VSync before hunting CPU spikes — WaitForTargetFPS / refresh-wait spikes mask the real issue.
- Reduce noise before reading data: hide unrelated profiler tracks, deactivate irrelevant objects — less data, faster diagnosis.
- Read timeline spikes against the 30/60 FPS benchmark bars, not raw height — the auto-scaled axis makes small spikes look fatal.
- Verify assumptions first: confirm the suspect script is present, enabled, and not duplicated — chasing ghosts wastes a day.
- Avoid live code changes for profiling — use breakpoints and source control to revert, so test scaffolding never ships.
- Remember you change the result by measuring it — reproduce a bottleneck under non-profiling conditions before committing to a fix; the profiler itself adds CPU/memory overhead.
- Reserve deep profiling for small test scenes — it recompiles everything and can OOM large projects.
- For custom timing, run a method thousands of times and average, but trigger tests via keypress after warm-up — startup init skews early frames.
- Cache log output and print once at the end of a test, not per-iteration — printing mid-loop pollutes the timing it measures.
- Make the profiler compile out via macros — profiling code is among the first things cut for peak performance, and the profiler must profile itself.
- Use rdtsc for fine-grained cycle counts; flush the instruction cache and discard spikes — for higher-level profiling use a dedicated profiler tool.
- Measure time AND memory before optimizing, with enough significant digits — instrument early; pick a time unit (microseconds) that resolves your target improvement.
- Wrap suspect script sections in custom profiler markers (BeginSample/EndSample) — surfaces your gameplay code beside engine internals and pinpoints which part of an Update is expensive.
- Use timeline view to spot expensive calls across main and render threads; use hierarchy view to rank which systems cost most — different views answer different questions.
- Track the memory module alongside frame time — some speedups (static batching, baked lighting, LOD) trade memory for frame time, so watch both.
- Use the statistics overlay for a quick smell, the profiler for the confirming breakdown — overlay flags it, profiler proves the cause before you commit.
- Reach for the frame debugger first on rendering bottlenecks — it steps through every render event so the pipeline is a glass box; use it to verify render order, measure effect cost, inspect batches, and debug custom shaders.
- Simulate your game's real cache behavior when benchmarking — a warm cache can lie about in-game performance.
- Beware memory bottlenecks above all — on modern hardware memory access, not compute, is usually the real ceiling.
- Always profile/compare Debug vs Release builds before optimizing — the Release build runs noticeably faster, which can resolve apparent perf problems before you optimize.

### Frame Budget, Frame Rate & Game Loop

- Treat sustained frame rate below target as a real bug — cap to 30 FPS only as a last-resort fix for screen tearing (tearing comes from the GPU not finishing frames in time).
- Choose frame rate as a graphics-vs-responsiveness trade-off — 60 FPS for high-skill rapid-input games (shooters, fighters, racers) for tight control, 30 FPS for art/narrative/turn-based; control latency is ~3-4 frames minimum from hardware. **When it flips:** (a) art/narrative/turn-based games where responsiveness is secondary → spend the frame budget on graphics fidelity at 30 FPS; (b) racing/sim → 30 FPS minimum, 60 ideal, and physics-heavy genres can't tolerate sub-30.
- Defer destructive changes (delete, spawn) via a service-request queue processed after the update loop — never add/remove from an array you're iterating, and don't let an object delete itself mid-update.

### CPU-Bound vs GPU-Bound Diagnosis

- Diagnose CPU-bound vs GPU-bound first — compare CPU rendering time against GPU time in the profiler; the fix differs entirely.
- Brute-force test CPU-bounding by toggling off batching and watching for worse FPS — confirms you're at/near the CPU limit.
- Brute-force test GPU back-end bounding by reducing resolution (fill rate) and texture quality (memory bandwidth) — whichever helps points to the bottleneck.
- Reduce texture resolution as a brute-force memory-bandwidth test — if FPS jumps, you were texture-bound.
- Remember multithreaded rendering changes "CPU-bound" — with a worker render thread, reducing main-thread (AI/script) work won't help graphics; without it, it will.
- Reduce vertex counts to fix front-end (vertex) bottlenecks — simplify meshes, cull objects, optimize vertex layout to cut cache misses.
- Check tessellation/geometry-shader budget if front-end bound — it contributes enormously to front-end work.
- Treat resolution as a fill-rate multiplier — dropping 2560×1440 to 800×600 is an ~8× fill-rate reduction.

### Draw Calls, Batching & Render State

- Set a texture/material once and draw all polygons that use it before switching — texture setup (format conversion, upload) is costly; batch by texture/material.
- Share materials across visually similar objects instead of making unique ones — fewer material states give more chances to batch; treat material count as tightly coupled to draw-call count.
- Atlas small textures sharing a shader to cut draw calls — exploits dynamic batching; near-identical memory, but no bandwidth savings.
- Don't atlas textures for animated/skinned characters — skinned meshes can't batch, so it saves nothing but space.
- Watch atlas size against device texture-cache limits — an oversized atlas split across cache fetches causes misses and bandwidth thrash; split into smaller atlases.
- Use static batching for large/unique static meshes — combines them into one draw call per material at init time.
- Never mark moving objects (player, enemies, dynamic props) as static — a baked-in combined buffer assumes the object never moves and breaks if it does.
- Never static-batch many identical duplicates — each clone is copied with hard-coded transform, costing N× the mesh memory (1000 trees = 1000× memory).
- Never move, rotate, scale, or instantiate static-batched meshes at runtime — it forces a full data-structure regeneration spike; keep them in the original scene.
- Beware static batching's all-or-nothing visibility — if one vertex is visible the whole combined mesh renders; use occlusion culling for connected rooms instead.
- Always check the memory module after enabling static batching — it builds a combined vertex buffer storing each instance's geometry separately in world space, so memory can balloon even for shared meshes.
- Duplicate materials to split large outdoor scenes into separate static batches — trades draw calls for finer culling control and texture/shader reuse.
- Start static-batching optimization early in scene building — nothing batches in edit mode, so late tuning means endless relaunch cycles.
- Combine many small never-moving meshes into one mesh when batching can't reach them — fewer separate objects means fewer draw calls.
- Share material references and keep meshes simple to trigger dynamic batching — but verify it actually fires; assuming it works while violating a requirement silently costs performance.
- Keep dynamically-batched meshes under the vertex-attribute budget (~900 used attributes) — more attributes per vertex shrinks the vertex budget.
- Don't expect dynamic batching for skinned/animated meshes — only static mesh renderers and particle systems batch.
- Aim for shader compatibility, not material identity, for SRP batching — the batcher groups by shader variant; many separate batches where you expected few usually mean incompatible variants.
- Reach for GPU instancing when many objects share one mesh+material — another path to collapse repeated geometry into fewer commands.
- Concatenate transform matrices once per object per frame, then apply to all its vertices — one combined matrix replaces repeated scale/rotate/translate work.
- Batch render-target switches to end-of-scene and pack many updates into subregions of one large target — switching render targets flushes caches and sometimes the whole pipeline.
- Inspect a batch's details (vertex count, mesh names, shader values) when a batch is unexpectedly large — tells you which meshes and shader variants inflate it.
- Tint via the renderer's vertex color (`SpriteRenderer.color`), not a per-instance material (`material.SetColor`) — vertex-color tinting creates no material instance, is batching-safe, and is cheap even across many sprites.
- Reach for a material property block (not per-instance material) only for richer shader effects — material access clones a per-instance material, breaks SRP batching, and can leak.
- Replace runtime-modifiable shader variables with constants late in the project — exposed material variables block compile-time optimization and re-push from CPU every pass.
- Optimize mobile for draw calls first — mobile is more often draw-call-bound than fill-rate-bound; implement mesh combining, batching, atlasing from day one.
- Minimize material count on mobile — fewer materials means fewer draw calls and less VRAM/bandwidth pressure.

### Culling, Visibility & LOD

- Cull whole objects against the view frustum before submitting to the GPU using a bounding sphere/box test — skip everything off-screen instead of letting the pipeline clip it polygon by polygon (widely corroborated).
- Compute a custom (tighter) bounding sphere for objects with long extrusions like tails — the auto-fit sphere is too big and triggers false collisions/false visibility.
- Mark buildings/walls as both occluder static and occludee static — so a structure can hide others and also be hidden when blocked, maximizing what gets culled.
- Set the smallest-occluder size to roughly the smallest object you want to block view — too large and small walls won't occlude; too small and bakes get slow and bloated.
- Set the smallest-hole size to the minimum gap the camera should see through — smaller values cull tighter with fewer false positives but slower bakes.
- Fix aggressive occlusion pop-in by lowering smallest-occluder and smallest-hole, then re-baking — gives the system more occluders and sensitivity to narrow gaps.
- Use occlusion culling for dense cities, interiors, corridors, and rooms; skip it for wide-open scenes — open worlds have little hidden geometry, so LOD matters more there.
- Precompute a Potentially Visible Set (PVS) per cell/room — at runtime you only consider polys visible from the current location, dropping overdraw to ~50-150%.
- Traverse only visible nodes — scan a handful of nodes instead of thousands of polygons per frame; tag all objects in a culled node as culled in one test.
- Cull at BSP/partition nodes: if a node is outside the frustum, everything behind it is too — discard whole subtrees in one test.
- Configure an LOD group with each renderer at its level and confirm each level's triangle count drops — verifies cheaper meshes actually get cheaper down the chain.
- Add a culled state so objects that occupy too few pixels stop rendering entirely — there is no reason to draw geometry that contributes nothing to the image.
- Remember LOD bias in quality settings globally scales all transition distances — if transitions behave differently on a device, check that device's quality level/bias.
- Stream/demand-load detail so levels start with low-res data — players begin playing while high-res models load, shrinking loading pauses; lay static collapse-ordered mesh data linearly in memory for memory-mapped streaming.
- Make binned/collapsed triangles degenerate instead of removing them (skip-strips VIPM) — frees triangle order so you can strip-order for cache coherency.
- Use interlocking "body" + "link" index buffers and link only downward in detail — stitches different-LOD neighbor tiles without cracks or seams.
- Select terrain LOD by distance (or a roughness/view-angle heuristic) and avoid abrupt detail pops at tile boundaries.
- Disable off-screen non-renderable components/scripts (AI, etc.) yourself via OnBecameVisible/OnBecameInvisible — frustum/occlusion culling only skip rendering, not your scripts or per-frame logic.
- Reduce overdraw by rendering opaque near-to-far (early depth rejection) and minimizing blended layers.
- Use the occlusion visualization tab (camera volumes, visibility lines, portals) to confirm culling hides the right objects — catches errors before they ship as missing geometry.

### GC, Memory & Object Pooling

- Preallocate and pool frequently spawned/created/destroyed objects (bullets, particles, enemies, platforms, weapons, effects) instead of Instantiate/Destroy — recycle from a cache rather than constructing/destructing constantly; per-shot allocation causes GC spikes and frame stutter that wreck feel, worst on mobile (widely corroborated).
- Understand the real cost of instantiate/destroy — each create allocates, registers with physics/rendering/scene, and fires lifecycle callbacks; destroy queues unregistration and GC. Pooling pays allocation once at startup, then just toggles active state.
- Toggle active off/on instead of destroying/creating — hiding removes the object from per-frame processing without allocation, then reactivating restores it cheaply.
- Pre-spawn a minimum batch of inactive objects at load — shifts allocation cost to load time, away from gameplay; size pools to expected concurrency (too few forces runtime allocation, too many wastes memory) and profile per prefab to tune.
- Let the pool grow automatically when all objects are in use (create-on-demand) — starts small but adapts to real peak demand, then stabilizes.
- Keep the pool responsible only for object reuse, not placement — the requester sets position/rotation and initializes after retrieving, since pooled objects retain their last transform.
- Return/release pooled objects by deactivating, never destroying, on expiry or impact — destroying defeats the pool; only the over-capacity destroy callback should actually Destroy.
- Cache a pooled object's poolable-component list at instantiation — re-querying on every spawn/despawn is costly.
- Clear the pooling system's tracking structures/dictionaries before loading a new scene — a static pool outlives the scene and the engine destroys its objects, leaving null references.
- Leave object-pool collection checks ON during development — they warn when the same instance is released twice, catching hard-to-find pooling bugs.
- Implement object pooling on mobile especially — allocation/deallocation overhead is higher than desktop.
- Schedule despawn with a delayed invoke using nameof (not a string literal) — gives compile-time safety so a rename doesn't silently break the call.
- Optimize managed-heap memory to minimize GC — every heap allocation eventually triggers a mark-and-sweep that can freeze gameplay (widely corroborated).
- Understand GC cost scales with heap size and fragmentation — lazy allocation makes GC pauses grow almost exponentially.
- Avoid heap fragmentation: allocate up front, or free a big contiguous block between levels — many small short-lived allocations fragment the heap.
- Override global new/delete to serve common small allocations from preallocated blocks via a free list — avoids heap fragmentation and malloc overhead.
- Route large allocations to a separate big-block allocator or malloc — reserving many large fixed blocks wastes memory on idle ones.
- The fastest code is code that never runs — delay object construction until proven needed (move declarations past early-return guards).
- Hoist non-trivial object construction out of loops — declare once before the loop and pass by reference, or pay constructor/destructor cost every iteration.
- Use constructor initializer lists, not assignment in the body — body assignment default-constructs the member then copies, often double-allocating.
- Prefer copy-construction over construct-then-assign and preincrement over postincrement on non-trivial types — both skip a redundant temporary.
- Avoid operators that return by value (Vector operator+) in hot paths — use in-place forms (+=) to dodge temporaries and copies.
- Prefer value types (structs, primitives) for short-lived data that won't outlive its scope — they live on the stack (free deallocation), invisible to the GC; convert pure data-carrier classes into structs.
- Convert pure data-carrier classes into structs — a class used only to pass a blob between subsystems heap-allocates for no reason.
- Don't blindly replace all classes with structs — structs copy entirely when passed by value; pass large structs by ref (and make them readonly) to avoid copy cost.
- Separate large arrays of value types from reference types — one reference type inside a struct forces the GC to inspect every field; split into parallel arrays so it skips value-type arrays (structure-of-arrays thinking).
- Avoid API calls that return arrays (GetComponents, mesh.vertices, allCameras) in hot paths — they heap-allocate; call once and cache.
- Avoid foreach over managed/Mono collections (List, Dictionary, Transform children) in per-frame code — they allocate an enumerator on the heap; use indexed for loops (foreach over plain arrays is safe).
- Limit short-lived coroutines and frequent start-coroutine calls — starting one allocates memory.
- Beware closures that capture outer variables — the compiler heap-allocates an environment object per invocation, defeating stack allocation.
- Avoid LINQ and regex in real-time game code — high overhead from closures/parsing; LINQ may not work on AOT platforms. Replace with straightforward code.
- Reuse large temporary work buffers instead of reallocating — lowers allocation and GC memory pressure; consider a shared work-area object.
- Build strings with a string builder or format/join/concat, never chained +/+= — each + allocates a new immutable string.
- Pre-size the string builder when the final length is roughly known — avoids buffer reallocations.
- Combine constant string literals with + freely — the compiler merges them at compile time with no runtime cost.
- Avoid boxing value types — passing ints/floats/bools into object parameters silently heap-allocates a wrapper.
- Know string-by-value passing only copies the pointer, and strings are immutable — modifying a passed string allocates a new one.
- Read a tag with a compare-tag call, never the .tag/.name property — reading tag/name allocates a new string and triggers GC (huge allocation over many reads); restrict .tag/.name to editor scripts.
- Cache the type name once (e.g. in a base message constructor) — each query allocates a new string.
- Hide GC by calling collect manually at unnoticeable moments — level loads, pauses, cutscene transitions; predict need with mono-heap-size queries.
- Free unmanaged resources promptly: dispose web requests and unload assets — they hold large native buffers GC won't reclaim; targeted unload beats unload-unused-assets (no full iteration).
- Don't count on instant deallocation — the finalizer thread can lag seconds; always keep a memory buffer zone for new allocations.
- Force JIT compilation of a method via reflection only for targeted methods proven to spike on first call — reflection itself is costly; do it at load time.
- Minimize crossing the native-managed bridge — each engine object/component access has both representations; caching changes (e.g. transform) avoids repeated crossings.
- Track allocation type (new vs new[]) to catch alloc/dealloc mismatches — mismatched delete skips destructors and leaks.
- Use soak testing (leave the game running for days) to catch memory leaks and rounding-error drift — these stability killers are invisible in normal-length sessions.
- Shrink memory first, then time — time complexity can't beat space complexity; pick the smallest data structure that supports the feature.
- Share heavy, context-free entity data (models, textures, FSM defs) as flyweights; keep only per-instance state (position, health) per object — saves megabytes.
- Stack identical items with a quantity field instead of separate records — a pile of 500 coins is one object, not 500.
- Prefer contiguous arrays/vectors (std::vector) over node-per-element sets/maps (std::set/map) for small collections — contiguous memory is cache-friendly; node containers allocate a node per element and scatter cache misses.
- Match data structure complexity to the problem — choose the smallest data structure that fits a fixed bound (std::array over std::vector when size is fixed; don't use a linked list for a fixed 256-item array); static-allocate when counts are bounded and known.
- Pool plain objects, not just GameObjects (poolable-object pattern) — avoid repeated allocate/deallocate cycles for any frequently churned type.

### Per-Object Cost & Scripting CPU

- Cache component references in Awake/Start, never call GetComponent repeatedly per-frame — re-acquiring burns CPU for trivial memory savings and can introduce hitches that hurt feel (widely corroborated).
- Avoid calling GetComponent twice in the same branch — fetch the component once into a local and reuse it.
- Favor the typed GetComponent over the string overload — the string version is ~30× slower.
- Delete empty Update()/Start()/OnGUI() stubs and never put an empty callback in a shared base class — the engine still invokes them, wasting CPU across thousands of objects.
- Avoid find and send-message at runtime — send-message is ~2000× slower than a direct call; find scales with scene size. Acceptable only in init.
- Replace send-message with a cached component reference + direct method call — same result, far cheaper.
- Hoist invariant expensive calls (find, lookups) out of loops and cache the result — calling them per-iteration is a red flag.
- Convert per-frame timer-gated Update logic into coroutines or InvokeRepeating/repeating invokes — calling nothing on idle frames beats checking a bool every frame; stagger timed events so thousands don't fire the same frame.
- Stagger timed events (random update offsets, spread coroutine starts, or a master scheduler) — otherwise thousands fire the same frame and spike CPU, causing visible stutter.
- Spread long algorithms (A* pathfinding) across several frames by saving/resuming state — lowers per-frame load for any unbounded-time computation.
- Cache loop-invariant calculations — compute a polygon's surface normal once and reuse it across all lights, recomputing only per-light values.
- Cache the main camera reference rather than searching the scene — repeated main-camera lookups are not free.
- For hot null checks use reference-equals against null — ~2× faster than != by skipping the native-managed bridge.
- Don't put heavy work in Update if it doesn't need to run every frame — Update floods quickly; reserve it for genuine per-frame logic.
- Devirtualize inner-loop calls — return cached data via an inline accessor, or merge near-identical classes behind a runtime flag, to kill indirection.
- Avoid RTTI/dynamic_cast in shipping code — they bloat the binary and dynamic_cast is slow; prefer a virtual function that behaves differently per type, or carry your own runtime type info (name + parent pointer) for IsA/SafeCast.
- Use inline functions over function-like macros — type-safe, single arg evaluation, debuggable, enable interprocedural optimization; reserve macros for what inlines can't do (stringizing, enum-name printing, small DSLs).
- Watch inlining bloat — overloaded operators and heavy constructors silently expand into large functions; learn your compiler's inline controls.
- Prefer multiplication to division on hot paths and cache reciprocals — store 1/value (e.g. 1/moveTime) to multiply later.
- Use a Bloom filter to skip an expensive routinely-called function when the answer is usually negative — false=certain miss, true=maybe (then run the real test); add an exception list of known false positives.
- Profile before AND after any vectorization/threading — setup/teardown can dominate behaviors so simple the parallelism doesn't pay; make behaviors stateless so they parallelize cleanly.
- Run production rules only as often as needed (per game-day, not per frame) and pull frequency out as its own field — a simple scheduler keeps rule CPU near-invisible even on tablets.
- Recognize pairwise interactions (collisions, distance checks) cost O(N²) — guard against quadratic blowup as object counts rise.
- Halve collision work by handling each pair once with symmetric code — once A collides with B, don't also run B-vs-A.
- Use a collision-priority scheme to pick which object of a pair runs the collide method — and let either side veto the pair (don't-collide) to skip irrelevant checks.
- Don't compute collisions/updates for objects off-screen or that can't interact — make floor coins only collidable with the player, not each other.
- For many static decorative objects, set them fixed and restrict their collision pairs — hundreds of needless collision checks will tank the frame rate.
- Clean up destroyed objects out of any list you iterate — collect-then-remove after the loop to avoid mutating a collection mid-iteration.
- Know your algorithm's cost: n² sorts make a 10× bigger list ~100× slower — pick the algorithm to fit the data and size.
- Prefer a binary search over linear scan when data is sorted — ~7 checks vs ~50 for 100 items.
- Cache/avoid recomputing in naive recursion (recursive Fibonacci) — recomputing the same subresults explodes runtime; iterate or memoize.
