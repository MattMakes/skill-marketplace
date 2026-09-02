## Performance & Optimization (continued)

### Multithreading, Jobs & Data-Oriented Layout

- Move per-entity work into jobs and schedule across cores instead of a single-threaded Update loop — parallelism removes the main-thread bottleneck when processing many objects.
- Make systems entity-agnostic so the same system processes any entity with the required components — one movement system drives players, enemies, and projectiles.
- Use the tightest data access you need: read-write ref for mutation, read-only in / by-value for reads — narrower access lets the scheduler run more jobs in parallel without conflicts.
- Opt jobs and hot systems into the native (Burst-style) compiler — LLVM-compiled native code delivers large speedups for numeric, branch-light work over many entities.
- Keep native-compiled code allocation-free and free of managed types/reflection — staying in the high-performance subset is what lets the compiler optimize aggressively.
- Guard systems so they skip update until relevant entities exist — avoids wasted per-frame work and order-of-initialization bugs.
- Don't attach transform components an entity never uses (none for logic-only spawners/singletons, dynamic only for movers) — saves per-entity memory.
- Expect the first run of a native-compiled job to pause briefly while it compiles, then run at native speed — don't mistake the warm-up for a real runtime cost.
- Profit from data-oriented design most when per-entity logic is simple and uniform — simple movement scales to 20k+ entities cheaply, while heavy per-entity AI/physics raises cost proportionally; budget accordingly.
- Layer multiple behaviors (move + direction-change + scale) in one job pass per entity — combining updates avoids redundant iteration and keeps architecture flat.
- Default new systems to unmanaged and only fall back to managed when you genuinely need managed references — keeps the majority of code optimizable.
- Disable a one-shot system at the very top of its update before doing its work — disabling at the bottom can let it run one extra frame and double its output.
- Prefer cooperative micro-threads (a dozen instructions to switch) over OS threads/fibers for game objects — OS threads cost thousands of cycles and ≥8KB each.
- Note micro-thread limits: stacks hold self-pointers and code addresses, so save/load and recompiled saves are problematic — restrict to games that don't save, or fixed-layout consoles.
- Keep code inside a critical section short — locking the system too long while threads wait risks a crash; protect shared data, then get out fast.

### Physics Performance

- Tune physics for game feel, not just performance — missed collisions (player through floor) or freezes wreck gameplay quality, not only frame rate.
- Don't assume doubling rigidbody count doubles cost — collision/active-time scaling is closer to exponential.
- Never instantiate, move, rotate, or scale a static collider at runtime — it regenerates the whole static data structure with a CPU spike; use a kinematic rigidbody for movable non-reactive objects.
- Choose the rigidbody body type deliberately — dynamic for forces, kinematic for scripted movers, static for immovable walls (cheapest).
- Use a non-convex mesh collider only for static environment geometry; convex only for moving custom-shape bodies — non-convex on a dynamic body is illegal/unstable.
- Use tight bounding spheres (shrunk to 50-70%) or cylinders for 99% of action-game collision cases — as good as complex algorithms.
- Avoid terrain, cloth, and wheel colliders unless essential — they dwarf even mesh colliders in cost; fake extra wheels, animate cloth on low settings.
- Lower the fixed timestep to catch fast-object collisions before resorting to continuous detection — but it adds CPU; test heavily and change it early.
- Pass a layer mask to raycasts — restricts which layers are tested, easing engine workload.
- Minimize raycasts and overlap/sphere/capsule casts in Update/coroutines — they're expensive; reserve for key events.
- Replace persistent raycast/overlap checks with trigger colliders — cheaper than continuous casting for lasers, fire, etc.
- Conversely, replace heavy script-side proximity loops with a single overlap-sphere — sometimes physics is the cheaper tool.
- Ask whether physics is even needed — a y-position check can replace a kill-zone collider; tweening a transform can replace a falling rigidbody.
- Keep physics object scales near 1:1:1 and gravity matched to implied world scale — mismatched scale makes gravity look wrong and harms float accuracy.
- Keep mass values relative (around 0.1, never over 10) with ratios under ~1000:1 between colliding pairs — improper mass ratios are the top cause of physics instability.
- Only change rigidbody properties on the physics step (fixed update / physics callbacks), never in render-frame update or time-based coroutines — otherwise changes stack before the engine processes them, causing erratic bugs.
- Optimize ragdolls: fewer joints/colliders, disable inter-ragdoll collisions via the matrix, and despawn/disable once they sleep — joint solving is exponentially costly.
- Increase solver iteration count to suppress exploding joint/ragdoll behavior; decrease it where accuracy isn't needed — balance accuracy vs per-collision time.
- Use semi-implicit (symplectic) Euler as the default integrator — it conserves energy and stays stable at explicit-Euler cost; reach for RK4 only when accuracy truly matters.
- Prefer stability over correctness in game physics — a stable approximate simulation beats a 100%-accurate one that can explode.
- Resolve multiple simultaneous contacts iteratively (sequential impulses / projected Gauss-Seidel), not one giant linear system — Gaussian elimination is too expensive for many contacts.
- Simplify the physics problem to gain performance — a tank/FPS game is effectively 2D; ignore force sets that net to zero and use a simple drag coefficient instead of full friction.
- Treat collisions as sphere-vs-sphere first, then switch to detailed shape tests only where needed — cheap broad-phase, expensive narrow-phase (widely corroborated).
- Use outcodes (bitflag regions relative to the world box) to catch fast objects that tunnel through thin walls — compare current vs previous outcode.

### GPU, Shaders, Fill Rate & Bandwidth

- Do work in the vertex shader when the visual result is identical to per-fragment — vertex shaders run far less often; only push to per-fragment what genuinely needs it.
- Use per-fragment (Phong) lighting only where specular needs it; per-vertex (Gouraud) suffices for ambient/diffuse — specular is highly nonlinear, ambient/diffuse interpolate fine.
- Flat-shade faceted objects, Gouraud-shade objects meant to look smooth — Gouraud on a cube looks wrong; flat on a sphere looks faceted.
- Gate specular with an n·l > 0 test and skip spotlight math entirely when outside the cone — back-facing surfaces and out-of-cone points get no highlight, saving the expensive power computation.
- Approximate the view vector as constant (infinite viewer) and use the halfway vector with directional lights — computable once as a uniform instead of per-fragment.
- Choose light type by need: directional (no position, no falloff, cheapest), point (distance attenuation), spotlight (cones, most expensive — fake it when possible).
- Keep point-light attenuation simple — a small linear term usually beats the full constant+linear+quadratic model.
- Optimize shaders aggressively — small shader gains compound across millions of fragments; poorly optimized shader code chews fill rate.
- Use the smallest precision data types in shaders (half/fixed over float) — GPUs compute smaller types faster, especially on mobile; color tolerates reduced precision.
- Avoid changing precision while swizzling — precision conversion is costly and worst combined with swizzling; pick one precision across the board (especially on mobile).
- Prefer built-in shader helper functions (abs, lerp, mul, step, luminance) over custom math — the compiler optimizes them better than your code.
- Minimize and sequentialize texture lookups in shaders — random-order sampling causes GPU cache misses; reorder textures for sequential access.
- Use surface-shader hints (approxview, halfasview, noforwardadd, noambient) to trade accuracy for fewer ops/passes.
- Try mobile shaders even on desktop — they're optimized for minimal resource use; test if the quality loss is acceptable.
- Budget memory bandwidth — fetching an uncached texture costs its full size in bandwidth; reduce texture quality/size if bandwidth-bound.
- Use mipmaps in 3D scenes to cut VRAM↔cache traffic and avoid shimmer/flicker on minified textures — often a net performance win (smaller distant textures fit cache); use the scene-view mipmaps mode to find over-resolution textures.
- Disable mipmaps for textures always rendered at constant camera distance (UI, 2D, near-player FX) — mips add ~33% size for levels never used; enable them for varying-distance 3D textures.
- Disable anisotropic filtering on textures never seen at oblique angles — it's a needless runtime cost there.
- Test per-platform GPU compression formats (DXT/PVRTC/ETC/ASTC) only after exhausting other bandwidth fixes — unsupported formats force costly CPU recompression.
- Batch/atlas the biggest textures to reduce per-frame texture swaps — avoid re-fetching the same texture repeatedly within a frame.
- Use a depth buffer and submit geometry roughly near-to-far — far fragments fail the early depth test, skipping their expensive color computation; clear it every frame.
- Keep the near/far clip range as tight as the game allows — z-buffer precision is hyperbolic (1/z); a tight range is the cheapest fix for distant z-fighting (widely corroborated).
- Push the near plane out as far as the game tolerates — wasted precision near a too-close near plane is the dominant cause of distant z-fighting.
- Turn the z-buffer off when drawing UI/menus where you control draw order — saves time when depth testing isn't needed.
- Interpolate 1/z (not z) and perspective-correct UVs across polygons in screen space — z is non-linear after projection; affine interpolation bends textures (acceptable only for small, near-screen-parallel polys).
- Use the painter's algorithm (sort small convex polys back-to-front) as a cheap first visibility solution; escalate to z-buffer/BSP when it fails on long/overlapping/interpenetrating polys.
- A complex rasterizer (z-buffer/texture) can be net faster than a simple one in a real scene — early pixel rejection saves more than the extra inner-loop math costs.
- Treat the GPU as a general parallel math engine — use blending modes and texture filtering to add, scale, and average samples without CPU involvement.
- Concatenate model→clip into one matrix when possible — one matrix-multiply + homogeneous divide per vertex is fastest, but stop at clip space if you must clip.
- Prefer staged transforms over one mega-matrix when early stages reject most geometry — concatenating wastes the matrix on polys that get culled.
- Skip matrix math for pure translation (three adds beat 16 multiplies + 12 adds) — reserve matrices for non-sparse transforms.
- Clip only to the near plane in 3D (full split); trivially reject against the far plane; defer left/right/top/bottom to 2D image-space clipping — exploit the hardware guard band to skip x/y clipping when within it.
- Clip in homogeneous (clip) space against the simple ±w planes — projection-independent, cheap, and hardware-friendly versus general world-space clipping.
- Maximize vertex-cache coherency — reorder triangles so transformed vertices hit the GPU cache; a higher-triangle method can beat a lower one via cache hits.
- Enable optimize-meshes in import settings in nearly all cases — reorders vertices to minimize cache misses for free.
- Render distant scenery with a skybox (camera-centered cube, depth/lighting/fog disabled, drawn first); size texels ~1:1 with screen pixels and clamp wrapping to avoid seams.
- Render impostors (cached textures of complex objects, updated every 5-50 frames) for static clutter — slashes bus bandwidth, lighting, texture changes, and per-object overhead.
- Use premultiplied alpha when rendering into and out of an impostor — normal alpha gives wrong results through the two-stage composite.
- Map impostors onto a bounding box (front face) not a screen quad — box depth is camera-independent and gives parallax, avoiding z-buffer clashes.
- Give impostor vertices a hand-tuned per-vertex parallax factor instead of full image warping — far simpler and avoids ray-trace warp artifacts.
- Use billboards (camera-facing textured quads) for cheap pseudo-3D objects like trees and particles — full meshes are overkill for distant/simple objects.
- Use word/quad-wide memory fills instead of byte-wide memset — multiplies frame rate in fill-bound code.
- Use array indexing over manual pointer increment-and-deref — the compiler generates faster access.
- Structure conditionals so the common branch is the taken path — deep pipelines flush on mispredicts.
- Profile branch-heavy intersection code per platform — on consoles without branch prediction, computing unnecessary data can beat if-then-else early-outs.
- Treat floating-point as fast as integer on modern CPUs — fixed-point only still pays in tight integer-only inner loops or on constrained handheld targets.
- Avoid alpha testing on mobile in favor of alpha blending — alpha testing is disproportionately costly on mobile GPUs.
- Audit post-processing cost in the frame debugger before committing — a single effect (bloom downsample/upsample chain) can add many render passes.
- Bake reflection probes instead of updating per frame — real-time reflection updates are too expensive (critical for VR's tight budget).
- Cut costly screen-space effects (SSAO) where the budget is tightest — SSAO is a common first cut for hitting frame rate in VR.
- Assemble each frame in an offscreen buffer then block-copy/flip once per frame (double buffering) — eliminates flicker; never draw directly to the live screen.
- Avoid drawing coplanar faces in 3D — they z-fight and flicker; offset overlapping decorations slightly in z.
- Size source bitmaps close to their on-screen size and use power-of-two edges — oversized bitmaps waste memory and flicker when auto-squashed.
- Convert images to the display's format on load — unconverted surfaces blit slower every frame.

### Lighting Performance & Baking

- Bake static lighting (lightmapping) whenever the scene's lighting doesn't change during gameplay — precomputing light/shadow into lightmaps removes most lighting work from runtime, often the highest-impact win for static environments (widely corroborated).
- Use baked lighting to gain free indirect light (bounce, color bleed, soft fill) — it captures effects real-time lighting can't reproduce efficiently, at zero runtime lighting cost.
- Don't bake lighting that must change dynamically or onto moving objects — baked lightmaps are fixed; a moving object baked as static drags its lightmap and looks wrong (widely corroborated).
- Set lights to baked when only static surfaces need them, mixed for key lights (the sun) that must also light dynamic objects, realtime only for lights that genuinely move/change — baked is cheapest, realtime most expensive.
- Bake static lighting into vertex colors or light maps when geometry and lights don't move — turn per-frame work into a load-time precompute.
- Disable cast-shadows on additional lights globally when shadow detail isn't essential — often the largest single FPS win; top-down/isometric cameras hide the loss.
- Reserve real-time shadows for lights that matter to the player (near the character or key spaces) and drop them on decorative/facade/rooftop/distant lights — concentrate the shadow budget where it's noticed; disabling shadows on additional lights is often the single largest perf win.
- Set per-light shadow resolution individually; use high resolution only on lights close to the player — high-res shadows eat the shadow atlas and can trigger degradation if too many lights compete.
- Disable shadows entirely on a decorative light rather than giving it low-res shadows — preserves atlas budget for lights that need it.
- Tune shadow quality deliberately: No Shadows is free, Hard cheap, Soft only costs a more complex shader (no extra memory/CPU) — Soft is affordable if fill rate allows; set per-light shadow resolution individually and use high res only on lights close to the player.
- Enable SSAO after stripping real-time shadows to restore depth cheaply — it darkens creases/contact points so objects feel grounded without expensive shadow maps. (Reverse the priority in VR, where SSAO itself is the cut.)
- Choose the rendering path to match light count and target hardware — Forward+ (tiled per-tile light culling, one pass) as default for most projects needing many dynamic lights; plain Forward only for simple low-light scenes (cost scales as lights × objects); Deferred only when the scene genuinely needs huge numbers of simultaneous lights (constant per-light cost but G-buffer overhead, no transparents, may lose to Forward+ in small scenes). Prefer Forward/Forward+ on mobile.
- Prefer Forward/Forward+ on mobile and reserve Deferred for stronger PC/console — Deferred's baseline overhead suits high-end hardware.
- Use light culling masks to limit which layers a light affects — but reconcile with physics layer usage (physics overhead usually trumps lighting).
- Prefer the Progressive GPU lightmapper when hardware supports it — usually much faster bakes than Progressive CPU.
- Tune indirect samples as the main lever for smooth bounced light, keep direct samples near 32, lower environment samples when the sky contributes little — match sample budget to the scene to avoid wasted bake time.
- Set max bounces to 2 (3 for small enclosed scenes) — enough for believable indirect light without runaway bake times.
- Set lightmap resolution by camera distance (~30 texels/unit distant, ~40 close-up) — higher sharpens shadows but inflates bake time and file size; use the checkerboard texel-density preview to find space hogs, and override per-object with scale-in-lightmap.
- Keep lightmap padding around 2 to stop adjacent UV regions bleeding — prevents light leaking across atlas islands.
- Choose high-quality lightmap compression by default — controls file size without major artifacts.
- Bake ambient occlusion into the lightmap even when using SSAO — it becomes part of static lighting and adds depth to corners and contact areas.
- Treat the first bake as a baseline, not a final result — early bakes are blotchy; raise samples/resolution/bounces and re-bake; enable generate-lightmap-UVs when baked shadows streak from impossible directions.
- Budget for baked lighting's hidden costs: bake time, disk space, and runtime texture memory (tens to hundreds of MB) — baking shifts cost out of frame time into storage, so confirm the trade fits the target hardware.
- Add some ambient light so specific lights can be used artistically, but not so much the scene goes flat — ambient fakes indirect bounce cheaply but kills contrast if overused; enable SSAO to restore depth cheaply after stripping shadows. **When it flips:** in VR → disable SSAO; it's too costly in a stereo headset.
- Author textures fully-lit and modulate with lighting; do per-fragment lighting math in view (not model) space — keeps distance attenuation on a consistent scale across objects.
- Use emissive/self-illumination for glowing objects that shouldn't actually cast light — it's just a constant color add, the cheapest model (bulbs, screens, windows), not for lit objects like car bodies or trees.

### Asset, Audio & Build Optimization

- Use the Editor Log's post-build asset-size breakdown to find your footprint hogs — it's almost always texture files; download size strongly affects install conversion.
- Keep textures power-of-two and square where possible (≤256×256 with equal sides for old hardware; cap at 4096, 1024 plenty for indie/mobile) — required/optimal for GPU sampling and compression; non-conforming sizes get padded, wasting memory bandwidth.
- Cap texture size to the target hardware (1024 is plenty for indie/mobile, 4096 max) — higher resolutions waste memory with no perceptible payoff; oversized textures get CPU-downscaled at load.
- Downscale textures in the external tool, not by importing huge sources, and avoid PSD/TIFF (layered/proprietary source formats) directly in the project — the engine's auto-import aliasing forces you to over-resolution to compensate.
- For non-square textures you must keep, raise the compression bitrate (quality) for free — packing leaves room at the same imported size.
- Pre-size/resize art assets to their on-screen dimensions before loading — don't load a 5000px image into an 800px window.
- Reduce polygon count — the main lever for animated meshes (which can't batch); modern texturing/shading hides the loss.
- Try mesh compression as a quick polycount reducer, but prefer hand-reduction or DCC-tool optimization — automated mesh simplification leaves artifacts.
- Disable read-write on meshes used at only one scale — lets the engine discard the original mesh data; enable only for meshes rescaled at runtime.
- Strip unused mesh data (extra normals/tangents/UVs) and don't auto-generate what shaders won't use — fluff costs file size and fetch time.
- Consider baked animations for low-poly meshes — keyframed vertex positions can beat skinned animation in size/overhead.
- Disable mipmaps on 2D sprite imports — reduces texture/sprite file size.
- Use normal mapping (bake high-poly detail onto low-poly) plus mipmapping — get detailed-model look while saving memory and improving render performance.
- Author key frames at low rates and resample at runtime to the actual display rate — storing 60fps animation locks the frame rate and burns memory; interpolation decouples the data rate from the display rate and saves memory.
- Lower the animation sample/frame rate to fit the motion (e.g., 24fps for a walk, not 60) — avoids spending frames where the eye won't notice and keeps clips lighter.
- Prefer keyframe/skeletal animation over pre-drawn spritesheets to save memory — interpolated joints need far less stored data than many full frames.
- Save animation memory with bone masking, mirroring, and layering — recombine shared masks at runtime so data is never duplicated; export rarely-moving face/finger bones as poses.
- Reuse one animation set across similar skeletons via retargeting/avatars — offer alternate characters without re-authoring.
- Don't neglect audio — it can become a major CPU/memory bottleneck, and bad audio is the one thing every player notices.
- Match audio load type to use: decompress-on-load for most, compressed-in-memory for large frequent clips, streaming only for single-instance music/ambience.
- Never stream more than one file at a time and never stream multi-instance clips — each stream allocates its own buffer and hits the disk (slowest access).
- Use large compressed files for background music and small native/uncompressed files for SFX — short effects shouldn't be re-decoded; background music tolerates compression (widely corroborated).
- Don't recompress already-compressed formats — only compress lossless sources; re-compression degrades quality for no size benefit.
- Cap simultaneous audio sources via a pool/throttle manager — each active source costs CPU; limit instances of the same effect with a sound-priority system.
- Share one audio clip reference across multiple sources — duplicate references cost extra memory only when pointing to different clips.
- Load/unload one-shot audio with explicit load/unload — audio is unmanaged; nulling references won't free it; keep it resident only while playing.
- Enable force-to-mono for 3D sounds and resample to lower frequencies (e.g. 22050 Hz for speech) — halves disk/memory and shrinks file size with little perceptible loss.
- Mark sounds as 2D when listener-to-source distance never changes — skips needless 3D spatialization math.
- Apply audio filter effects via shared mixer groups, not per-source duplicates — each filter costs CPU and memory.
- Use tracker module files for background music — huge size savings at high quality vs decoded PCM streams.
- Stream large sounds in chunks via notification markers instead of loading them whole — keeps memory low.
- Keep the number of simultaneous sound buffers low — each buffer adds processing and memory overhead.
- Use the right sampling rate (44.1kHz/16-bit) for important audio, accepting larger size; trade memory and CPU against authenticity per situation.
- Pick audio resampling/pitch cost-appropriately: sample-doubling < averaging < linear < cubic — sample averaging suffices for ratios .75-1.5.
- Use cheap FIR/IIR filters (multiply-accumulate chains, great on SIMD) for occlusion/3D modeling; reserve convolution for short impulses (use FFT-domain convolution if expensive).
- Reuse few sounds via pitch and length variation — like art, get maximum output from minimal audio assets.
- Free spell/effect meshes when their reference count hits zero — load on demand, release when the last instance finishes, to save memory during effect-heavy combat.
- Pack assets into a versioned resource-file format with per-lump compression/encryption flags — keep a file signature and version field so you can evolve the format and stay backward compatible.
- Break game code into small pieces (even a separate pre-loader) and load only what the current level needs — fastest possible startup.
- Use procedural materials/sparse textures to shrink download/footprint at the cost of init CPU — download size strongly affects install conversion.
- Merge tilemap colliders with a composite collider (merge operation) — collapses many per-tile collider shapes into one outline the physics engine manages cheaply (widely corroborated).
- Build large 2D worlds from tiles + a map array of tile indices — stores a 16k×16k scene in ~1MB instead of ~300MB.
- Prefer async scene loading (`LoadSceneAsync`) over synchronous for larger projects — synchronous loads freeze the game/main thread; async spreads work across frames and allows a loading screen.
- Use additive scene load to keep persistent UI or stream level chunks — single mode unloads everything first.
- Load images/sounds once before the loop, never inside it — loading from disk 20-60×/sec is pure waste.
- Strip the binary: disable embedded debug info, minimize exception code, strip unused symbols, optimize for size (better i-cache), dedupe constant strings.
- Strip unused scenes before building — don't ship leftover content that bloats and confuses the build.
- Force text serialization for source control and human-readable diffs — and use the right data structure (smallest int, fixed array) to keep files small.

### UI & Misc Runtime Cost

- Split UI across multiple canvases by update frequency (HUD vs menus vs inventory) — any change rebuilds its whole canvas, so isolating sections stops a small update from rebuilding everything.
- Disable raycast-target on non-interactive UI (decorative images, static text) — only clickable controls need raycasting; leaving it on everywhere adds avoidable per-frame overhead.
- Keep per-frame UI code (OnGUI) free of game logic/input — it can run multiple times per frame, so logic there is unreliable and wasteful; initialize custom GUI styles once in OnEnable, not per-frame/per-repaint in OnGUI, to avoid needless allocation.
- Use world-space UI in VR, never screen-space overlay, and leave 3D-occlusion checks on UI raycasters off unless needed — overlay breaks stereo rendering; occlusion checks cost performance for a rarely-needed behavior.
- Reuse a single default material across many sprites with different textures — avoids creating a material per sprite and helps batching.
- Use quads (two-triangle flat surfaces) for flat textures, text, or video — the lightest object for showing 2D content in a 3D scene.
- Use display lists / cached geometry so a per-object type switch runs only once — avoids paying the dispatch cost every draw call.
- Render distinct animated elements (moon, score) separately from baked backgrounds — lets you reposition/animate them for free.

### Networking Performance (Bandwidth & Latency)

- Use UDP/unreliable delivery for frequent game updates and reserve guaranteed delivery for critical messages — games send updates so often that occasional loss is acceptable, and guaranteed delivery is too slow for real-time.
- Send messages asynchronously so the game doesn't stall waiting on the network — fire-and-forget keeps the action moving.
- Use dead reckoning / client-side prediction between server updates — keep characters moving on last-known velocity to mask latency.
- Timestamp received messages and compensate for elapsed time when applying them — fairly resolve actions across players with different latencies.
- Keep the network message/receive callback fast and just enqueue — buffer incoming messages in a queue and process oldest-first on the main thread, decoupling network I/O from game logic and smoothing bursts; let the main loop do the heavy processing.
- Throttle/drop low-priority messages when the send queue overloads — keep critical traffic flowing under congestion.
- Pick the network model to fit scale: client/server for many players, peer-to-peer only for small sessions — peer-to-peer connection count explodes (n×(n-1)).
- Monitor the bandwidth a multiplayer game consumes and design to a minimum broadband standard — excess usage manifests as lag; treat lag as a symptom (dropped packets, bandwidth).
- Build/decide the networking model and sync strategy at project start, never bolt it on at the end — 3D data volume makes late networking impossible; keep animation, physics, AI, and collision as separate systems that feed each other via data, routing moves through physics/collision so the world rejects impossible moves.
