## Math, Graphics & Engine Internals


### Floating-Point & Numerical Stability

- Suffix every float constant with `f` (e.g. `1.0f`) — unsuffixed constants are `double` in C/C++ and silently promote whole expressions to slow double math.
- Prefer single-precision floats in game code — doubles double storage and load/process slower (or are software-emulated on consoles) for no gameplay benefit. **When it flips:** for time accumulated across long sessions → use `double` for the accumulator and `float` for per-frame deltas, since floats drift visibly over hours.
- Reformulate the math, don't just throw double-precision at a precision bug — doubles cost 2× memory, are slower on consoles, and still don't fix catastrophic cancelation.
- Never use bitwise equality on floats and never compare to exact 0.0 — +0 and -0 have distinct bit patterns and rounding makes exact equality meaningless; test against an epsilon or near-zero band.
- Never divide without first guaranteeing the divisor is nonzero (and not near-zero for reals) — division by zero crashes, often with a misleading "square root of negative number" message; clamp to a small epsilon.
- Avoid catastrophic cancelation — never compute a small value as the subtraction of two nearly-equal large values; refactor the formula (e.g. the alternate quadratic form) to replace subtraction with addition.
- Stop adding tiny deltas to a large accumulator — once exponents differ by more than the mantissa width the delta rounds to zero and the add is a no-op; rescale or reset accumulators.
- Keep physics objects near the world origin (0,0,0) and center the world origin in your play area, not at a corner — float precision is densest near 0 and absolute error grows proportionally with magnitude, so accuracy degrades far from zero, causing jitter and wrong gravity; re-center the player in large-space games.
- Size the world so coordinates keep 3–4 decimal places of float accuracy — avoid universes that approach the float/int range limits and lose precision.
- Clamp denormalized (tiny) values to zero in hot loops on x86 FPUs — denormals trigger slow assist microcode (10–100× cost); clamp when values are known to be normalized in a safe range.
- Treat IEEE special-value behavior (denormals, INF, NaN) as platform-variable — game and GPU FPUs (SSE flush-to-zero, 3DNow!, fp16) deviate from spec for speed; design pipelines to avoid exceptional values rather than rely on their handling.
- Don't count or accumulate integers in fp16 — fp16 loses consecutive-integer representability above 2048 and squares of values >255 overflow to infinity; reserve fp16 for color/HDR ranges.
- Exploit the IEEE float bit layout (sign:exp:mantissa) for fast conversions, comparisons, clamps, and abs — works on any standard-binary FPU even when not fully IEEE-compliant.
- Use integer comparison on float bit patterns for sign tests and same-sign compares — pipelines better than FP compares (breaks when both operands are negative).
- Clamp/abs floats via sign-bit masking, not branches — branchless integer-unit ops are several times faster and don't stall the branch predictor.
- Avoid the float→int cast in hot loops — the ANSI truncate-vs-round mismatch makes it a ~60-cycle call; use the add-magic-constant (1.5×2²³) bias trick instead.
- Treat floating-point as roughly as fast as integer on modern CPUs — fixed-point only still pays in tight integer-only inner loops or on constrained handheld targets.
- Wrap sqrt/inverse-sqrt behind your own indirection (e.g. `IvSqrt`/`IvInvSqrt`) — lets you swap in fast approximations or hardware rsqrt per platform without touching call sites.
- Use a typedef for the swappable precision choice (Real = float vs double) — change precision-vs-speed everywhere by editing one line.
- Recognize uninitialized-data signatures fast — wild floating-point exponents and regular-looking pointer values (0x0000000c, 0xcdcdcdcd) signal uninitialized memory; "chaos is health," a good pointer looks random.

### Vectors & Vector Math

- Compare lengths with length-squared (squared distances), never the square root, for range/collision checks — both are monotonic from 0, so squaring avoids an expensive sqrt per test (widely corroborated).
- Use Vector3 as the universal spatial type — position, direction, movement, and scale are all vectors; mastering them makes player control, projectiles, spawning, and cameras click into place.
- Use named direction shortcuts (`Vector3.up/forward/...`) over raw components — reads clearer and avoids typos vs `new Vector3(0,1,0)`.
- Use the dot-product sign to answer "in front / behind / which side" cheaply — `v·w > 0` is <90°, `< 0` is >90°, `= 0` is perpendicular; a 5-op test for visibility/facing checks (e.g. is a target behind the AI) and back-face culling.
- Use the dot product to compute angles, facing, and projections (is the enemy in front of me?) — one cheap op answers many geometry questions.
- Don't test parallelism with the dot product near zero on unnormalized vectors — cos changes little near 0 so the "zero" band is too wide; use the cross-product magnitude test (faster and more robust).
- Use the scalar triple product (or 2D perp-dot) to decide turn direction — sign of `u·(v×d)` tells left vs right turn for steering/AI; for ground objects it collapses to the z of the cross product.
- Get a polygon's outward normal from the cross product of two edges under a fixed vertex winding — pick one winding (e.g. clockwise in a left-handed system) and never deviate.
- Normalize a movement vector built from multiple axes — otherwise diagonal input combines to length ~1.41 and the object moves faster diagonally (widely corroborated).
- Pass a normalized direction vector when you only need heading — `(target − self).normalized` strips magnitude so speed stays controllable.
- Use `math.normalizesafe` (or guard) whenever a vector can be zero-length — normalizing `(0,0)` yields NaN that propagates into transforms and makes objects vanish; the safe variant returns zero.
- Normalize length-squared and assert it is nonzero before dividing — guards against divide-by-zero when normalizing a degenerate vector.
- Use fast approximations (Taylor-series vector length, ~5% error) when exact precision isn't needed — ~10× faster than sqrt-based length.
- Find altitude to a plane via dot product of (surface point − position) with the unit normal — the shortest perpendicular distance, no extra geometry.
- For aircraft/ground altitude use distance along travel direction, not perpendicular plane distance — a near-parallel grazing path has small altitude but large travel distance.
- Treat colors as 3/4-vectors but use componentwise (not dot) operations for filtering/reflection — RGB filtering and surface reflectivity are per-channel multiplies, not a dot product.
- Compute luminance with the weighted sum (0.2125 R + 0.7154 G + 0.0721 B), never the Euclidean norm — the eye is most sensitive to green, least to blue; an equal-weight norm over-counts blue.
- Use the closest-points-between-segments solution for 3D line/segment intersection — true 3D line intersections almost never occur, so a robust algorithm returns nearest points.
- Use parametric line/segment form (`p = p0 + v·t`) over explicit form in 3D — cleaner, and a `t` outside [0,1] instantly proves "no intersection on segment."
- Store planes in point-normal form and test a point's half-space by the sign of plugging it into the plane equation — the workhorse test for clipping, collision, and culling.
- Reuse data your collision routine already computed (surface point, normal, distance) for follow-up vector math — recomputing from scratch is much slower.

### Matrices

- Build jointed objects as a hierarchy of relative frames (scene graph), not hardcoded per-part code — concatenate parent×child transforms so a turret rotates with its tank and a barrel elevates relative to the turret.
- Precompute matrix concatenations once (`M = M1·M2·…·Mn`) then transform all points by the single matrix — saves N−1 multiplies per vertex (widely corroborated). **When it flips:** when early pipeline stages reject most geometry → use staged transforms instead of one mega-matrix — concatenating wastes the matrix on polys that get culled anyway, and clipping needs the pre-divide clip-space coordinates.
- Mind matrix multiply order — it is non-commutative, so `M1·M2·M3 ≠ M3·M2·M1`; transform sequence is load-bearing.
- Apply transforms in scale-then-rotate-then-translate order (M = TRS) — gives expected axis-aligned scaling, rotation about the frame origin, then placement; any other order produces surprises.
- Keep matrix storage order (row/column-major) independent of pre/post-multiply convention — these are orthogonal choices; conflating them causes transpose bugs.
- Represent points in homogeneous (x,y,z,w) coords so translation, rotation, and perspective all become matrix multiplies — assume w=1 and use 4×3 matrices to skip wasted math.
- Solve linear systems directly instead of computing an inverse then multiplying — direct solve is cheaper and avoids the extra numerical error of forming the inverse.
- Exploit known matrix structure for cheap inverses — orthogonal inverse is its transpose, diagonal inverts elementwise, translation/shear negates the off-diagonal; decompose instead of full Gaussian elimination.
- Compute geometric-transform inverses geometrically, not via Gaussian elimination — negate translation factors, negate rotation angles.
- Use Cramer's rule for 3×3/4×4 inverses, Gaussian elimination only for larger — Cramer is actually faster at the small sizes games use.
- Transform normals by the inverse-transpose of the model matrix, not the matrix itself — otherwise non-uniform scale tilts normals off the surface; use the adjoint to skip the determinant divide since you renormalize anyway.
- Skip matrix math for pure translation (local→world): three adds beat 16 multiplies + 12 adds; reserve matrices for non-sparse transforms like the camera.
- Use SIMD (SSE) to process 4 floats in parallel for vector and matrix math — most game programmers leave this parallel throughput unused.
- Prefer the SIMD-friendly math library types (Unity.Mathematics `float3`, `math.sin`) over the general math class (`Mathf`) inside Burst jobs — they're Burst-compatible and exploit SIMD, while `Mathf` sits outside the optimizable subset.
- Keep constructors of small, frequently-instantiated types (Vector, Matrix) lightweight — don't auto-zero; provide explicit `SetZero()`/`SetIdentity()` so callers pay only when needed.
- Inline short, frequently-called math functions (dot product, matrix multiply, plot) — call setup can cost as much as the body; gains are large (~200%) on tiny functions.

### Orientation & Quaternions

- Choose the orientation representation per requirement — matrices for fast vector transform and SIMD, quaternions for compact storage + cheap concatenation + clean interpolation + cheap renormalization; Euler/axis-angle only as intuitive authoring inputs.
- Never store orientation as Euler/fixed angles for runtime math — they suffer gimbal lock (lost DOF), concatenate poorly (must round-trip through matrices), interpolate badly, and have no clean drift-correction.
- Renormalize quaternions after multiplication and before rotating vectors — products of unit quaternions drift off unit length under float error; normalization is far cheaper than matrix Gram-Schmidt.
- Convert quaternion (or axis-angle) to a matrix before rotating more than ~2–5 vectors by it — per-vector quaternion rotation costs more than matrix multiply, so the matrix conversion amortizes.
- Re-orthonormalize bases that drift — Gram-Schmidt for general sets, or the `w, v×w, w×(v×w)` triple-product trick in R3; repeated float ops degrade supposedly-orthonormal vectors.
- Exploit that rotation matrices are orthonormal — their transpose is their inverse, so skip the full inverse computation.
- Track each object's orientation basis (ux,uy,uz) and rotate it alongside the mesh — recover world-relative orientation after transforms corrupt local coords.
- Store rotation as a Quaternion, position/scale as a Vector3 — don't conflate the types; build rotation with `Quaternion.Euler(0,0,angle)` and pass real quaternions where rotation is expected.

### Transforms & Scene Hierarchy

- Prefer a separated {scale, rotation, translation} representation over a packed 4×4 when you mutate scale or use quaternions — components stay editable and serial-CPU concatenation is cheaper. **When it flips:** on vector/SIMD hardware → the packed 4×4 wins.
- Avoid non-uniform scale if you want clean matrix decomposition — concatenated non-uniform-scale-plus-rotation introduces shear that can't be re-split into R·S; uniform scale decomposes cleanly.
- Place an object's local origin where the game needs it — center for rotation, feet for ground placement — so transforms map cleanly to gameplay.
- Instance one master mesh with per-copy transforms instead of duplicating geometry — saves the memory of N baked copies of props (desks/chairs/etc.).
- Separate mesh data from world object (one cMesh, many cObjects) — many objects share one mesh, so a horde of identical monsters costs one mesh in memory.
- Keep separate storage for local (source) coordinates and transformed coordinates — never destroy source model data; it is the origin of every later pipeline stage.
- Choose destructive transforms (overwrite local) only for permanent changes like load-time scaling; use non-destructive (local→trans) for per-frame pipeline work.
- Store static environments (terrain, levels) directly in world coordinates — they never move, so skip the local-to-world transform entirely.
- Match scale conventions across tools before exporting (e.g. Maya/DCC 1cm vs engine 1m = 1 unit) and verify model scale (~1 unit = 1 meter) before adding a rigidbody/physics — mismatched scale makes physics and rigs behave strangely and harms float accuracy.
- Understand local vs world space when nesting objects — child transforms are parent-relative; `position` reads world, `localPosition` reads parent-relative; the distinction matters once objects nest.
- Remember transform inheritance flows one way (parent to child) — move/rotate/scale the parent and children follow; editing a child never moves the parent.
- Exploit the parent's origin as the pivot — position children relative to an empty parent to set where a composite rotates/scales from, non-destructively.
- Use `localPosition/localRotation/localScale` (local-space transform reads/writes) when possible — world-space Transform access triggers matrix math up the hierarchy and notifies colliders/rigidbodies/lights/cameras.
- Cache Transform changes and commit once per physics/fixed step — avoids redundant mid-frame Transform writes that cross the native-managed bridge repeatedly.
- Distinguish setting position (teleport) from adding to position (relative move) — `position = v` jumps instantly; `position += v` offsets from current; choose by intent.
- Don't write to individual components of `transform.position` — it returns a value-type copy; build a new Vector3 and assign the whole property.

### Interpolation, Easing & Animation Blending

- Use linear interpolation (lerp) as the workhorse for smooth transitions of position, color, or any scalar value — the basic tool of polish and motion (widely corroborated).
- Use time-based interpolation (`u = elapsed/duration`), not fixed per-frame increments — guarantees a consistent transition duration regardless of frame rate.
- Apply easing curves to interpolation so motion accelerates/decelerates naturally — linear motion feels robotic; eased motion feels alive (widely corroborated).
- Use ease-in/ease-out distance-time functions for camera and object motion — constant speed feels mechanical; accelerate/cruise/decelerate mimics real physical movement.
- Watch for Zeno's-paradox asymptotic lerps that never quite arrive — "approach 90% each frame" never reaches the target; snap or clamp at the end so it actually arrives.
- Know the distinction: `MoveTowards`/`Vector3.MoveTowards` = constant speed that stops exactly on arrival; `Lerp` fed its own output = ease-out that approaches but never reaches — pick by the feel you need (use MoveTowards for patrols/chase to avoid jitter and overshoot).
- Use `LerpAngle`, not plain `Lerp`, for angles — it handles the 359°→0° wraparound correctly.
- Use slerp (spherical linear interpolation) for orientation, lerp for position — quaternion lerp cuts across the rotation arc, shrinking length and giving non-constant angular speed; slerp interpolates evenly along the arc. **When it flips:** for blends under ~90° or speed-critical paths → default to lerp+normalize — it's ~3 SIMD ops vs slerp's transcendentals + divide, and the angular-speed error is invisible at typical animation angles; reserve slerp for large arcs.
- Use Blow's t-remapping cubic to get slerp-quality at near-lerp cost — adjust the interpolation parameter to counteract lerp's variable rotation speed, avoiding transcendentals and divides.
- Before any quaternion blend, check the dot product and negate one quaternion if it's negative — opposing quaternions interpolate the long way around (or to a zero vector); cull these cases from data beforehand.
- Selectively negate quaternions in preprocessing (negate q_i if dot with predecessor < 0) — guarantees the spline/blend takes the shortest rotation between key orientations.
- Guard slerp against tiny angles: if cos θ ≈ 1, fall back to lerp — `sin θ` in the denominator approaches zero and divides explode; equality tests aren't enough under float precision.
- Blend animations by pose/phase, not by elapsed time — prevents feet scissoring/windmilling when interrupting between walk and run.
- Use pose-only blending for instant stops — blend the pose for visual deceleration but drop root translation so the character stops on a dime.
- Drive speed by game logic and scale animation playback rate to match, using overlapping speed ranges — preserves stride/weight nuance that persistent walk/run blends destroy.
- Drive continuous blends (idle→walk→run) with one float parameter via a blend tree — a single value smoothly controls multiple clips with minimal setup.
- Decouple extracted root-motion from the animation pose update — lets you correct displacement, orientation, and speed independently while preserving authored weight/energy.

### Curves & Splines

- Pick the curve type by control needs — Catmull-Rom for auto-smooth-through-points, Hermite/Bezier when artists need tangent control, Kochanek-Bartels (TCB) for tension/continuity/bias knobs; Bezier's convex-hull control points give the most intuitive shape preview.
- Use Bézier curves (including recursive de Casteljau evaluation) for smooth paths and trajectories — curves give natural-looking movement and camera paths.
- Reparameterize curves by arc length (Newton-Raphson with bisection fallback) to move at constant speed — equal parameter steps give unequal distances; precompute total arc length and switch to bisection when speed→0 to avoid NaN.
- Use Horner's rule or forward differencing to evaluate curves cheaply — forward differencing reduces a cubic to 3 adds per axis (only valid at equal time steps); Horner saves multiplies otherwise and improves float accuracy.
- Use adaptive midpoint subdivision (de Casteljau) to tessellate curves — more segments in high-curvature regions, fewer in flat ones; for Bezier, test the convex hull's flatness with no midpoint computation.
- Smooth raw climb/traversal paths into a Bézier spline and project a fixed look-ahead target — adds plausible curvature and feeds virtual-controller input that reuses player transition logic.
- Pad open splines with phantom points and replicate ends of closed splines — eliminates discontinuities at path ends and loop points without modulus arithmetic.
- Interpolate quaternion flythrough paths via an invertible S3↔R4 rational mapping plus a C2 spline (natural cubic) — gives C2 orientation continuity without per-sample transcendentals.
- Cache temporal coherence when searching sorted animation/time tables — values change little frame-to-frame, so start the search at last frame's interval; binary search large tables.
- Use a sine wave for smooth looping motion (bobbing, hover, pulse) — record a base value and oscillate around it so motion stays centered; remember sin/cos return −1..1 and must be scaled/offset to a real range.
- Remap a raw −1..1 sine output into a safe target range (e.g. 0.2..1.5 for scale) — raw negative/zero values invert or hide objects.

### Delta-Time & Frame-Rate Independence

- Drive all motion from real elapsed time per frame (`position += dt · velocity`), scaling with delta time and never a fixed per-frame constant/step — ties simulated speed to wall-clock time so the game feels identical on any processor (widely corroborated).
- Multiply per-frame rates by delta time — keeps motion and rotation frame-rate independent (same feel at 30 and 144 FPS).
- Clamp dt (delta time) to a max (~0.1s) on slow machines — oversized steps make motion jerky and lose the illusion of continuous movement.
- Clamp dt (delta time) to a min (the refresh interval) on fast machines — sub-refresh updates pile up in the queue and cause visible glitches.
- Never animate or update on raw cycle/frame counts; always use elapsed time — sprite flip rates, lifetimes, everything must be time-based to stay processor-independent.
- Reset the timer after any pause (dialog, help, focus loss) — otherwise the next dt/delta is huge and the world lurches forward.
- Avoid dividing by delta time without guarding — the first frame can have a tiny delta that blows up the division; check before using it as a divisor.
- Use unscaled delta time for UI/pause menus — a zeroed timescale (used to pause) zeroes normal delta time; unscaled keeps menus animating while the game is frozen.
- Never skip the update loop when delta time is zero — child objects still need updates to animate when paused, and skipping breaks deterministic random-driven logic.
- Thread one time-elapsed value through the whole update hierarchy — makes time-based events trivial since the data is always present.

### Fixed Timestep, the Game Loop & Frame Architecture

- Structure every game as one main loop: process all input → run all game logic → draw — the same input/calculate/output pattern repeated up to 60×/sec; keep the phases unmixed (handle ALL events, then ALL calculations, then clear, then draw), because interleaving makes code unreadable and hides bugs.
- Run the simulation in two passes per step: update ALL objects, then move ALL objects — updating-then-moving each object in turn makes behavior depend on array order and breaks the parallel illusion.
- Fix the per-frame step order (adjust, listen, move, update, collide, clean up, animate, draw) and don't override it — correct ordering is delicate; respond to input right before moving, remove dead objects before drawing.
- Run exactly one event-processing loop per frame, with all branches inside it — a second event drain consumes nothing because the first already emptied the queue, silently dropping inputs; code outside the loop only sees the last event, breaking multi-key frames.
- Cap frame rate with a clock tick (e.g. 60) — uncapped loops burn 100% CPU; too-low caps feel sluggish; and don't chase FPS past the display refresh (~60), since extra frames the screen can't show are wasted work.
- Lock the simulation to a fixed update rate (e.g. 33ms = 30fps) for deterministic timing — the game runs the same speed on fast and slow machines.
- Run physics-driving code on a fixed-timestep pass (FixedUpdate) and input/visual/camera code on the per-frame render pass (Update) — fixed timestep keeps physics consistent and stable across machines; render timing suits visuals, and mixing them causes jitter or dropped input (widely corroborated). **When it flips:** for high-skill rapid-input genres (shooters, fighters, racers) → target 60fps and minimize control latency above all; for art/narrative/turn-based games → 30fps is acceptable to spend the budget on visuals.
- Use a time-elapsed compensator with an accumulator-and-fixed-step loop for discrete moves — otherwise two 0.1s updates differ from one 0.2s update (random called a different number of times).
- Only change rigidbody properties inside physics callbacks/the fixed step, never in the render-frame update or time-based coroutines — otherwise changes stack before the engine processes them, causing erratic bugs.
- Keep the maximum-allowed-timestep cap (default ~0.333s) to prevent the physics "spiral of death" lockup, and adjust it only as a last resort — hitting it regularly means physics is overloaded elsewhere.
- Standardize the per-frame loop into pre-frame, per-frame, post-frame stages — separates timing/setup from rendering from sync so each concern is isolated.
- Drive screen flow with a state stack (push/pop states), not a giant switch on current-state — adding an inventory or message screen becomes a push, not a tangle of conditionals; give each state init/frame/shutdown hooks.
- Exit the loop via a `done` boolean, then explicitly tear down (quit/close window) — leaving the window open hangs the process.
- Run the endless animation loop inside the idle handler (not a raw while-loop) and pause it on focus loss — keeps user messages flowing so a quit actually exits instead of hanging, and a minimized loop doesn't eat every CPU cycle and starve other apps; reset the timer after any pause or the world lurches forward.
- Drive the GPU and CPU in parallel — submit the next frame's CPU work (AI/physics) while the GPU drains its staging buffer; inserting stalls destroys this concurrency.
- Build an input logger that records all inputs with inter-event time deltas plus system marks — replays sessions to reproduce bugs and powers attract/demo modes.
- Make the game resolution-independent and processor-speed-independent — it must look and play the same on any window size and any machine; store positions as real-valued vectors and convert to pixels at draw time.
- Use coroutines for time-spread or sequenced logic instead of cramming it into one frame — coroutines express "do this over time" cleanly; spread long algorithms (A*) across frames by saving/resuming state.
- Watch for and resolve race conditions when objects initialize or interact across frames (e.g. the SHMUP power-up bug) — undefined ordering causes intermittent, hard-to-find bugs; know each engine lifecycle function's call order (Awake/Start/Update equivalents).
- Control script/system execution order only when one init/Awake depends on another's Instance/readiness — Unity gives no default ordering; use [DefaultExecutionOrder(-1)] to force a manager earlier. **When it flips:** needing Script Execution Order usually signals fragile tight coupling — redesign with events or lazy init instead of relying on ordering.

### Cameras, Viewing & Projection

- Set field of view to ~60–90° even though a monitor subtends only ~25–30° — a literal FOV feels claustrophobic; the wider compromise shows more world with tolerable distortion.
- Build the view-to-world matrix from camera basis vectors then invert (transpose the orthogonal rotation block) to get world-to-view — avoids re-deriving the inverse and is numerically exact for orthogonal bases.
- Recover gracefully when the look-at direction is parallel to world-up — Gram-Schmidt collapses to zero there; fall back to an alternate up axis to avoid a degenerate camera basis.
- Use ease-in/out and parallel-transport or look-at-point framing (not the raw Frenet frame) for cameras following a path — the Frenet frame flips upside-down at inflections/second-derivative discontinuities, breaks when the second derivative is zero, and tilts the up-vector on hills.
- Cache view/projection/screen matrices and recompute only when the camera moves — they rarely change; concatenate the per-object world matrix onto them each draw.
- Concatenate model→clip into one matrix when possible, but stop at clip space if you must clip — one matrix-multiply + homogeneous divide per vertex is fastest, but clipping needs the pre-divide clip-space coordinates.
- Always apply the aspect ratio somewhere in projection (view-plane y or focal distance) — otherwise the image is squished on non-square viewports; use the same focal distance d on both axes and let vertical FOV differ rather than distorting with separate d values.
- Offer multiple control schemes per camera (directional for top/side, rotational for third-person, mouse-look for first-person) and factor in camera angle so "up" is always away from camera regardless of view rotation — match input to viewpoint so "up" means what the player expects and players don't have to re-orient their thumbs.
- Let the camera lead the player slightly in the direction of travel rather than dead-centering, and add a small vertical offset so the player sits below center — gives the player sightline before they act and reveals more space ahead/above, aiding anticipation of upcoming terrain.
- Smooth the camera with Lerp toward the target instead of snapping each frame — abrupt snapping feels rigid; pin Z manually in 2D while easing X/Y, and pick smoothing as a tradeoff (too tight is jerky, too loose loses the player).
- For steady orientation along an unconstrained path (cameras, missiles, lofted tubes) use the parallel-transport frame — incremental minimal rotation avoids the Frenet frame's flips at inflections and the fixed-up method's twist when tangent ≈ up.
- Render everything through a viewport (a window on world coordinates) even at 1:1 mapping — move one object (the viewport) and the whole world scrolls in unison; let the player influence but not directly control it, and clamp at world edges.
- Build a screen-to-world pick ray from the inverse view matrix and mouse position; closest intersection wins — robust 3D selection of characters and tiles. Convert mouse input from screen to world space before aiming — screen pixels are resolution-dependent and meaningless against world positions.
- Pick the camera perspective (first/third person, top-down, isometric) as a deliberate design decision — it shapes player awareness, control feel, and genre fit.

### Near/Far Planes & Z-Buffer Precision

- Keep the near and far planes as close together as the game allows — z-buffer precision is hyperbolic (1/z), concentrating ~90% of precision in the nearest 10% of view depth; a tight range is the cheapest fix for distant z-fighting (widely corroborated).
- Push the near plane out as far as the game tolerates — wasted precision near a too-close near plane is the dominant cause of distant z-fighting. **When it flips:** in VR → set the near plane very low (~0.01m) so hands and held objects near the face aren't clipped, breaking presence.
- Always set and clip to a near plane in front of the eye — prevents divide-by-zero for vertices at z=0 and stops geometry behind the camera projecting upside-down/wrapped.
- Interpolate 1/z (not z) and perspective-correct UVs across polygons in screen space — z is non-linear after projection while 1/z is linear; this fixes z-buffer and texture-mapping artifacts (affine interpolation bends textures, acceptable only for small, near-screen-parallel polys).
- Prefer a 16-bit Z-buffer for speed over 32-bit precision unless artifacts appear — correct occlusion is essentially free on the GPU — and clear it every frame. **When it flips:** to reclaim the ~24% of frame time spent clearing → use a 1/z buffer with a per-frame bias added to all writes instead of clearing.
- Turn the Z-buffer off when drawing UI/menus where you control draw order — saves time when depth testing isn't needed.
- Avoid drawing coplanar faces in 3D — they z-fight and flicker; offset overlapping decorations slightly in z.

### Culling, Clipping & Visibility

- Remember the golden rule of 3D graphics: it's about NOT drawing what you can't see — every cull/reject is the fastest possible "draw."
- Cull whole objects against bounding volumes (sphere first), not raw vertices — testing every vertex against six frustum planes costs more than the rendering it saves; a convex bound that's outside guarantees all contents are outside.
- Reject geometry as early and as coarsely as possible — cull whole objects via bounding spheres before back-face removal, and back-faces before the world-to-camera transform, so geometry is rejected before it costs anything downstream.
- A bounding sphere inside the frustum doesn't prove the object is — use tighter bounds (boxes) for long/thin objects where the sphere over-includes; expand the frustum planes by the sphere's radius and test the sphere center to kill false positives at corners where a sphere intersects two planes but is actually outside.
- Clip only to the near plane in 3D (full split, re-triangulate quads), trivially reject against the far plane, and defer left/right/top/bottom to image-space clipping during rasterization.
- Clip in homogeneous (clip) space against the simple ±w planes — these tests are projection-independent, cheap, and hardware-friendly versus general world-space plane clipping; the perspective transform warps the frustum into a cuboid, making post-perspective clipping a trivial rectangle clip.
- Clip polygon edges consistently inside-to-outside for both directions — clipping shared edges in opposite directions produces slightly different float results and visible cracks between neighboring polygons.
- Interpolate all vertex attributes (color, normal, UV) at the clip point using the same t as the position — otherwise clipped geometry gets wrong shading/texturing at the cut.
- Exploit the hardware guard band to skip x/y clipping when geometry lands within it — but still clip when coordinates can exceed the guard-band max, since they wrap into the visible area.
- Enable backface culling and order vertices consistently (one winding for front faces) — never draw the unseen back of a polygon.
- Know the engine already does frustum culling (skips objects outside the view cone) automatically — but it does NOT skip objects hidden behind other geometry inside the frustum.
- Bake occlusion culling / a Potentially Visible Set (PVS) per cell where solid geometry frequently blocks view — precompute per-cell visibility so fully-hidden objects are skipped at runtime; tune Smallest Occluder/Smallest Hole to balance pop-in vs bake cost. **When it flips:** for wide-open scenes → skip occlusion culling (little hidden geometry) and lean on LOD instead.
- Implement portals as a runtime PVS: render the current room, then recurse through each portal with the frustum narrowed to the portal opening — render only what's seen through doorways.
- Achieve zero overdraw by traversing front-to-back with a span/scanline occlusion buffer that discards covered spans — but only invest if overdraw is your measured bottleneck.
- Skip rendering nodes/sections the auto-map or frustum proves invisible — don't pay to draw what no one sees.
