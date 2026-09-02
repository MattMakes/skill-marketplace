## Game AI (continued)

### Memory, Last-Known-Position & Searching

- Build last-known-position search spots from cover hidden from the target's estimated position — fall back to random hidden navmesh points if too few cover spots exist, and stagger when group searchers give up so searching reads as motivated, not a hive mind.
- Add gap/corner detection with perpendicular raycasts and varied glance animations — invalidates hidden search spots and makes searching look motivated, not random.
- Limit how many agents simultaneously investigate one point — capping searchers (1 cautious, 2–3 aggressive) lets players peel enemies off a group and avoids clustering.
- Have agents share recently-searched info via a coordinator so they don't re-sweep — fast spot invalidation via timesliced raycasts keeps the group looking coordinated.
- Stop a group search/action at staggered times, not simultaneously — synchronized stops reveal a hive mind / coordination the player isn't meant to see.
- Model contextual events whose meaning depends on situation — "see dead body" alarms a searching NPC but is ignored in a war zone; "see player on rooftop again after massacre" triggers retreat.
- Solve the disappearing-NPC problem cheaply — if NPC A was in earshot of B for 10 s then 5 s of silence (B dead), spawn an investigation event with a long cooldown.
- Defer unobserved narrative/world state with possibility/probability maps (level-of-detail) and back-date virtual observations — track where an unseen NPC could be and only instantiate it consistently with what the player has observed, faking coordinated/opportunistic story events and attacks with zero ongoing simulation.

### Pathfinding & Navigation

- Represent the search space explicitly (grid, NavMesh, graph) before pathfinding — A* and friends need a traversable data structure to operate on.
- Prefer NavMesh over hand-placed waypoints for environment knowledge — waypoints carry no info about safe terrain, force tedious re-placement on edits, and snag agents on walls (widely corroborated).
- Reuse one NavMesh across agent types instead of per-type waypoint sets — a mesh adapts to different sizes/speeds; waypoint sets don't.
- Represent terrain for AI reasoning with a dense waypoint graph, not raw polygons, when a navmesh is unavailable — express location relationships cheaply and host gameplay data and A* costs.
- Implement A* cost as F = G + H — accumulated cost-so-far plus heuristic-to-goal drives the open-list ordering that makes A* fast and accurate.
- Use a heuristic that never overestimates (straight-line distance) — an admissible heuristic keeps A* results optimal.
- Use the octile (not Euclidean) heuristic on 8-neighbor uniform grids — admissible and more informed, so the search expands far fewer nodes.
- Keep the open list sorted by estimated cost via a priority queue — always expanding the lowest-cost node is the core of A*'s efficiency.
- Store each node's parent during the search, then backtrace and reverse for the path — parent links turn the search into an ordered route cheaply.
- Preprocess grids into subgoal graphs to ignore most cells during search — n-level subgoal graphs hit ~112× faster than grid A* with little memory overhead.
- Use any-angle pathfinding (Theta*) instead of grid-constrained A* + postprocessing — propagates along edges but isn't constrained to them, giving short realistic paths.
- Use any-angle pathfinding (Theta*) but optimize its line-of-sight bottleneck first (Lazy/Optimized Lazy Theta*) — LOS is the cost, not the search.
- Build higher-level AI on a "perfect" pathfinder (expanded geometry / Minkowski sum of obstacle and collision shape) — characters never get stuck, so movement AI needs far less corner-case code.
- Solve only the part of a problem you need now (lazy/hierarchical pathfinding: room-to-room first, micro-path on entry) — the rest may become irrelevant and never run.
- Use a path radius so followers register a waypoint as "reached" — hitting an exact point is impractical; a tolerance range keeps movement smooth.
- Slow velocity proportionally as a follower nears its final waypoint, and use a path radius for "reached" — gradual deceleration avoids overshoot and looks natural; hitting an exact point is impractical.
- Define routes as ordered waypoints and advance when within a threshold distance — looping patrols need only an array of points and a "close enough" check.
- Mark static environment as Navigation Static before baking and ensure geometry actually connects (slopes to walls) — only flagged, connected geometry produces a usable navmesh; gaps in the source mesh become gaps in the NavMesh and break pathing.
- Assign higher cost to dangerous/slow areas (water, mud) via NavMesh area layers — agents prefer cheaper paths, so cost steers them onto the bridge over the river.
- Tag A* waypoints visible from threats with extra cost — the pathfinder returns paths that take cover, for free.
- Tune agent radius/height/step/slope to the actual agent and level by trial and error — there are no universal values; bad settings graze walls or block traversal.
- Use Off Mesh Links to bridge intentional gaps (jumps, drops) — they reconnect a disconnected NavMesh; place a visible bridge if teleporting looks wrong.
- Carve moving obstacles dynamically and turn off "Carve Only Stationary" for them — otherwise agents try to walk through a moving wall.
- Account for terrain in influence/path propagation (passability multipliers or precomputed inter-cell paths) — or a fortress "influences" across an impassable mountain it can't cross.
- Use the navigation-mesh polygons as influence-map/spatial cells in 3D environments — a flat 2D grid won't reflect 3D topography.
- Generate a voxel navmesh per agent stance (stand/crouch/prone/swim/sidestep) by recycling discarded nonwalkable voxels — extends spatial coverage with stance metadata baked into triangles.
- Order voxel-navmesh generation passes deliberately — prone before crouch consumes most voxels for prone; pick the hierarchy that gives the mix you want.
- Penalize nonstanding navmesh triangles in the pathfinding heuristic — make the agent walk around the table rather than crawl under it unless the destination is there.
- Store rich spatial metadata in navmesh triangles (forested, cover-rich, stance) — the navmesh is under the agent's feet at all times; use it to inform behavior cheaply.
- Drive traversal/climbing from a procedural climb mesh + path query, independent of animation states — robust against locomotion-set changes and shareable with player traversal code.
- Start with the simplest chase AI (close the larger axis gap toward the target) then layer obstacle checks — incremental AI is cheaper to build and tune than full pathfinding upfront.
- Cap pathfinding effort deliberately (e.g. two redirect attempts) — "good enough" navigation challenges the player without the cost/complexity of full A*.
- Use an "impatient" seek force that occasionally turns off when frustrated — lets a stuck pursuer bounce free and find a better path instead of pushing a wall forever.
- For maze pursuit, escalate to waypoints and breadth-first or A* pathfinding, recomputing the path only every 10–20 updates — simple seek forces get enemies stuck; capped recompute stays fast.
- Use pathfinding concepts (Dijkstra, A*) as the backbone of level/AI movement — but a deliberately under-directed random walk yields more surprising layouts than a shortest-path solver.
- For pathfinding/AI bugs, eliminate invisible walls and map holes first before blaming the AI — symptoms overlap, so rule out level-data causes.

### Steering, Flocking & Crowds

- Pick obstacle-avoidance steering for crowd-style "just don't collide" movement, and true pathfinding when the shortest/efficient route matters — they solve different problems.
- Implement steering as forces, and prioritize/arbitrate them instead of naively summing — blindly adding avoid-obstacle and evade-bullet forces can cancel and hit both.
- Make collision avoidance anticipatory (time-to-collision based), not reactive bouncy-ball — humans plan around collisions well before contact; use a time horizon (~3–4 s) to ignore far-future collisions.
- Tune the avoidance time horizon carefully — too small (0.1 s) lets agents overlap; too large (20 s) makes them separate unnaturally and stall.
- Cap maximum avoidance force and shrink radii for already-colliding agents — prevents near-infinite forces from dominating and stops collisions getting worse.
- Prune neighbor search with a spatial structure (k-d tree, uniform grid) before computing forces — neighbor-finding, not force math, is the bottleneck; keeps runtime near-linear.
- Use ORCA/RVO when you need GUARANTEED collision-freeness under chaotic input — linearizing each velocity obstacle gives an order-of-magnitude speedup and provable safety; drop far-agent constraints if over-constrained.
- Use reciprocity (split avoidance 50/50) — both agents fully avoiding causes inefficient motion and oscillation.
- Build group movement from three local rules — separation, alignment, cohesion — emergent flock behavior comes free without scripting each member.
- Simulate large groups via local neighbor awareness, not global choreography — each boid only needs its neighbors and a shared goal, which is cheap and scales.
- Cap each boid's velocity to min/max bounds — clamping speed keeps the flock coherent and prevents runaway or frozen agents.
- Add small random force/noise per boid — randomness breaks lockstep uniformity and makes motion look organic.
- Weight each flocking rule with a tunable coefficient — exposing center/velocity/separation/follow weights lets you dial the flock's character without code changes.
- Use a leader/controller object the flock follows — a moving origin gives the group purpose and direction.
- Constrain axes for the medium (freeze Y for ground/2D herds) — reuse the same flock code for birds, fish, or land animals by limiting movement dimensions.
- Randomize per-agent speed in crowds — slight variation makes each run play out differently and avoids robotic synchronization.
- Aim moving shooters at where the target will be, not where it is — leading the target (estimate of travel time) makes AI shots actually connect.
- Desynchronize repeated AI actions by randomizing timers (e.g., shoot-wait offsets) — synchronized firing produces an unnatural "firing-squad" effect; staggered stops hide a hive mind.
- Don't let an AI blindly charge the objective — a robot that just rushes the puck scores own-goals; layer in conditional positioning logic.
- Make behaviors stateless so they parallelize cleanly — for context-driven steering ask behaviors for context maps (danger + interest), not decisions; merge maps externally so collision avoidance is guaranteed and behaviors stay small, stateless, decoupled.
- Mask danger then pick highest remaining interest — context steering yields emergent "chase a reachable target while avoiding obstacles" with no coupling between behaviors.
- Scale context-map resolution for LOD and use SIMD/threads — context maps are 1-D images; halving resolution doubles speed while keeping collision avoidance intact.

### Group, Squad & Tactical Coordination

- Centralize multi-agent cooperation in (possibly invisible) "manager"/coordinator entities — coordinate target selection so all monsters don't mob one enemy.
- Use a combat coordinator to assign exclusive roles (opportunistic shooter, flanker, approacher) — guarantees at least one agent always threatens the player while others reposition.
- Use action ranking + rank-specific micro-behaviors to put the most interesting behavior on the agents nearest the player — and let high-rank NPCs taunt or stand-and-shoot first.
- Filter behavior selection by whether the action is on-screen — give on-screen agents higher action rank and keep them from running offscreen, which annoys players.
- Use action tokens to cap and distribute group actions (grenades, move-and-shoot) — designers tune count, cooldown, and scaling so behavior never synchronizes across NPCs.
- Add contextual one-off animations and micro-behaviors to desynchronize looping behaviors — break synchronization cheaply without huge animation libraries.
- Model a group with a virtual (invisible) group entity, not a physical leader — cleaner hierarchy, identical members, and supports groups-of-groups.
- Compute group movement limits from members — max group speed below the slowest member, rotation rate accounting for group width.
- Run group navigation as a single high-level path query for the whole group — factorizes the costliest part; tune cost so falling to a narrower formation rivals taking a longer path.
- Make group bulk a soft constraint that can reconfigure — let formations compress/stagger/lane to fit corridors and cross opposing flows.
- Use canned squad/multi-character dialogue exchanges instead of solo barks — they sell coordination and intelligence the player never sees in code.
- Use dialogue to fake behavior you never coded — FEAR's "I need reinforcements!" line made reviewers credit reinforcement AI that didn't exist.
- Deliver tactical AI info as discussion between NPCs, not flat callouts — "Do you think he's still up there?" reads as intelligence; a barked location reads as a UI announcement.
- Use a three-tier bark system (specific → generic → grunt) cycling over repetition — specific lines teach the player the first few times; generic lines avoid hearing memorable lines twice.
- Solve player-in-unreachable-area exploits with group behaviors (suppress + grenade + fall back) — preserve NPC lives, look aware, and give the player readable feedback via discussion.
- Model environment connectivity (areas + choke nodes), not just walkability — lets NPCs who can't get LOS still cover the exit (door/window) the player must use.
- Have NPCs without line-of-sight do something intelligent — covering chokes/doors/windows the player must exit beats staring at geometry; there's nothing worse than outflanking an NPC who's just staring at a wall.
- Use defenders' shared influence maps so allies coordinate emergently — counting 25% of allies' influence yields coordinated attacks and one-two punches with no explicit teamwork code.

### Influence Maps & Spatial Reasoning

- Use influence maps for tactical/spatial assessment — cell values propagated to neighbors via a falloff rule reveal frontiers, choke points, vulnerable areas (widely corroborated).
- Keep friendly and enemy influence as SEPARATE layers, never subtract into one — subtraction loses the distinction between a hotly contested tile and a quiet one and prevents recombination.
- Build modular influence maps (proximity, threat, per faction) combinable via add/multiply/inverse + interest template — yields AoE targeting, safe-spot finding, spacing, battlefront, and blocking-spell placement from one system.
- Precompute normalized influence templates ("stamps") to avoid repeated distance/sqrt math at runtime — adding template cells into the base map replaces per-agent per-cell propagation.
- Pull only the local area into a small working map for queries — never iterate the whole map when the decision only cares about nearby cells.
- Choose the influence propagation FORMULA to encode the intent — linear for borders, polynomial for threat plateaus, ring shape for catapult-range threats, inverted parabola for commander auras.
- Propagate influence over path/travel time, not straight-line distance, for combat strength — influence = ability to reach a fight fast enough to matter.
- Make influence-map cells large and spread influence a good distance — small under-propagated cells leave empty space and an unclear frontier; don't assume small cells = smarter AI.
- Terminate influence propagation at a minimum cutoff value — floating-point falloff never reaches zero, so every cell would otherwise influence every other.
- Track different unit types (flying/naval/ranged) separately per cell and propagate by terrain type — and spread ranged units' influence an extra N cells.
- Amortize expensive queries with continuous bookkeeping (influence maps, LOS maps) — keep a structure updated as data changes so queries are instant.
- Partition maps into homogeneous, not-too-big, not-too-small, roughly-convex regions — homogeneity lets the AI assume a region's characteristic applies everywhere within it.
- Attack REGIONS (sum of targets + 25% of adjacent) not individual targets — avoids sending overwhelming force to clustered targets and spreads attacks to two fronts.
- Use regions for hierarchical pathfinding with terrain-weighted high-level nodes — choose routes by more than shortest distance.
- Cache first-step region paths in an n×n array for fast distance estimates — store only lower→higher region to halve memory; compute lazily early game.
- Detect cul-de-sacs (one passable neighbor) and chokepoints (depth-limited BFS division) in the map — chokepoints are ambush/defense/observation (LP-OP) spots; cul-de-sacs hide rewards/economy or get excluded from AI reasoning.
- Track "scent of death" per region — avoid or reinforce regions where you've lost units; bump enemy influence when you lose a battle you expected to win.
- Compute avenues of approach via region path plus side trapezoids — place heaviest weapons there, ambushes off them.
- Implement flanking with a cost function shaped along the combat vector — high cost near the center line pushes the path wide and around behind, letting pathfinding handle obstacles.
- Transfer attack priority to intervening obstacles that block a path to a high-value target — stops players blocking AI attacks with cheap forts and stops units bogging down en route.
- Brace for counterattacks: boost defense priority in regions you just won, boost attack priority in regions just lost — produces realistic consolidation and counterattack tension.
- Maintain a resource-allocation tree (functional asset hierarchy) to compare desired vs current allocation — drives what to build and how to reassign units, and gives AIs personalities by tweaking node weights.
- Maintain a dependency graph (tech/building tree) for economic planning, vulnerability targeting, and probabilistic inference — seeing a unit implies its prerequisites exist.
- Keep a precomputed combat-balance table of relative unit strengths — pick production to counter the enemy's observed composition.
- Turn tactical guidelines into per-waypoint evaluation functions of local properties, group membership, directional relations, and "focus" — annotate offense/defense value per waypoint+direction.

### Separating Decision / Animation / Gameplay Layers

- Decouple gameplay decisions, animation state, and the animation driver into separate state machines — monolithic combined FSMs hide a third "driver" state machine and make late changes catastrophic.
- Merge/override queued animation behaviors instead of stopping-and-waiting — absorbs behavior oscillation/spam into clean cross-fades and hides gameplay bugs (but add spam detection).
- Reuse the same character/spell controllers for AI and player — one code path for "perform action" keeps PC and NPC behavior consistent.

### AI-Driven Animation & Motion

- Correct motion only within the bounds of the original extracted motion — small per-frame deltas spread across frames avoid sliding and stay true to the animator's intent.
- Get 360° of starts/turns from ~3 transition animations via motion correction — add per-frame rotation deltas instead of authoring every direction.
- Prevent animation twinning with a shared blackboard delay (~1s normal, ~300ms reaction) plus spatial separation — identical anims on identical skeletons read as fake; the delay (and separation) breaks it.
- Ensure the first half-second of reaction anims has real movement — otherwise a sub-half-second delay still shows twinning.
- Use additive pose offsets for vertical aiming, IK for horizontal aiming — additives keep authored key poses; IK covers the small in-range horizontal arc cheaply.
- Use additive aiming ANIMATIONS (sampled every ~10 frames) only when the base pose changes a lot — pose-only additives fail on squash/stretch landings.
- Drive every character action through an animation map keyed by action (idle/walk/attack/cast/hurt/die/talk) — adding an action is adding an entry; different meshes reuse the same action names.
- Drive complex/articulated animation with motion data (keyframes, skeletal) rather than hardcoded AI rotations — data is reusable across any motion.
- Drive character behavior with high-level scripts/opcodes that command low-level motion — separates "what to do" from "how to move."

### Data-Driven AI

- Vary character behavior through tunable data, never type checks in code — refer to "vision type," not "is this a Clicker," so new types need zero code hunting.
- Build NPC behavior from a tiny rule set (stand, wander an area, walk a route, follow, evade) plus attached scripts and a charge-level threshold (wander when not ready, home-in/follow when charged) — NPCs only need to *appear* intelligent; cheap rules + scripts scale to hundreds of NPCs, and emergent "stalk then strike" behavior comes from one threshold.
- Attach an optional script to items/characters/triggers — a potion, sword-special, or NPC gains custom behavior without engine changes.
- Generate AI routines at runtime from separately authored behaviors (work/travel/attack) — Radiant-AI-style emergent schedules from composable building blocks.
- Choose the cheapest contextual representation that fits — deictic/indexical variables (unit/map/player bound at query time) replace expensive free-variable unification with constant-time queries.

### AI Performance Budgeting

- Keep AI budget realistic: ~10% of CPU typical, ~20% even for AI-heavy games — and remember richer environments can make a single check costlier than Moore's-law gains (Halo 3 < Halo 2 LOS checks).
- Budget AI compute deliberately — it shares the frame with rendering, physics, audio, and animation, so optimizing AI calculations is non-negotiable.
- Run AI/non-critical logic less often than every frame — creatures have reaction times; cut decision routines to every few frames or seconds.
- Randomize each agent's update window (e.g. 0.3–0.5 s) — prevents agents synchronizing into a single-frame processing spike.
- Apply level-of-detail to AI: vary update frequency, algorithm complexity, and per-agent simulation fidelity by distance/relevance — and scale back if the player notices.
- Drive a level-of-detail system from swappable behaviors — replace expensive layered behaviors (footstep IK) with dummies as agents drop in LOD and offscreen.
- Disable distant objects with a periodic distance-squared coroutine check — stop processing creatures too far to matter.
- Use distance-squared (sqrMagnitude) instead of distance for AI range comparisons — skips the costly square root; square the threshold.
- When forced to choose, pick fast AI over smart AI (outside turn-based games) — players notice slowdowns more than imperfect decisions. **When it flips:** turn-based strategy → spend time for smarter decisions, since the player is waiting on a deliberate turn, not a live frame.
- Update AI direction only every few seconds, not every frame — frame-by-frame random movement looks like a seizure.

### Companion & Buddy AI

- Keep buddy/companion characters close to the player — a buddy near the player can't look more stupid than the player and can trigger relevant dialogue.
- Hold companion/buddy AI to a HIGHER bar than human intelligence — a buddy that calls out an enemy the player can't see looks dumb, so suppress uncertain callouts.
- Never let the buddy break the player's stealth — one location-giveaway fractures trust; making buddies invisible to enemies during stealth is the lesser evil.
- Avoid teleporting companions to keep up — even a hint of teleport breaks immersion; reserve it only for camera-hidden moments (e.g., rescuing a grappled player).
- Let companions self-rescue from grapples and become untargetable for 15–30 s — repeatedly forcing the player to save them turns the game into a tedious escort quest.
- Put special companion actions (saving, gifting, special moves) behind long cooldown timers — rarity keeps them memorable; spamming devalues them.
- Polish friendly-AI pathing meticulously — babysitting broken allies turns a level into a frustrating escort chore.

### Failure Traps, Robustness & Self-Preservation

- Give monsters self-preservation: heal or dispel ailments below ~half health, buff themselves when no target is in range — minimal logic that reads as smart.
- Roll per-character attack% vs magic% to choose action type — weighted chances make different enemies feel distinct without a real planner.
- Restrict wandering to a defined min/max bounding area — keeps NPCs from getting lost across the whole level.
- When in doubt, just add more enemies — expecting some to fail at pathfinding is the cheapest workaround for imperfect AI.
- Give background/non-critical AI emergent behavior (flocking, simple rules) to avoid hand-scripting hundreds of entities — but it's unpredictable, so keep it off pivotal AI.
- Individualize agents with small randomized parameters (sight, speed, hunger) — adds realism and novel emergent group dynamics over armies of clones.
- Beware ecosystem collapse from emergent predator/prey loops — populations can wipe out and are hard to balance and test; constrain or reserve for ambience.
- Search "AI glitch" failure modes as a checklist — bad cover, idling, and action loops are the classic symptoms of insufficient sensing.

### Decisions, Information & Predictability (the player's-side contract)

- Deliver mechanical decision data (damage, rates) directly when the fiction can't express it cleanly — fictional ambiguity starves decisions.

### Encounter & Level Integration of AI

- Give every AI a story reason to be present (guarding, tasks) — never have AI guard empty crates or stare at walls; faulty placement breaks immersion and is as ruinous as bad visuals.
- Make AI a first-class part of the experience equal to visuals — bad AI placement and scripting ruin even great-looking levels.
- Test and re-test every AI path, navigation, and reaction (especially friendly-AI pathing) — perfected AI is what makes a map stand out, while babysitting broken allies turns a level into a frustrating escort chore.

### Faking Intelligence Cheaply (statistical & narrative shortcuts)

- Model collections with random add/remove as M/M/1 queues — sample the stationary distribution on first encounter, transient afterward, to fake merchant inventories consistently with zero ongoing computation; keep the add/remove rate ratio strictly < 1 so finite inventories don't grow unbounded.
- Keep rate_ratio (add/remove) strictly < 1 for finite queues — otherwise the modeled inventory grows without bound.
- Factorize game state into independent maps; fork only when shared resources create dependencies — joint maps grow exponentially, so some factorization is mandatory.
- Approximate normal probability maps with static probability map × possibility map — avoids never-stabilizing transition propagation while staying consistent with observations.

### Tooling & Debugging AI

- Draw debug gizmos for sensors, paths, and grids (OnDrawGizmos) — visualizing FOV cones, A* routes, and NavMesh in the editor makes AI behavior inspectable.
- Enable engine navigation debug overlays (Show Avoidance, Show Neighbours, heading-vs-destination) — the dynamic avoidance/heading display reveals crowd/agent decision-making in motion.
- Add debug-only decorator nodes (Fake state, Breakpoint) to BTs — forcing a child's result or logging on reach lets you assert and trace agent behavior.
- Use color-coded state visualization for tree/FSM nodes (green/yellow/red) — instant visual feedback on Success/Running/Failure speeds debugging.
- Use the heading-vs-destination debug visualization to diagnose agent behavior — seeing avoidance squares and heading arrows reveals why agents re-route.
- Test assumptions in-engine rather than trusting math on paper — verifying fuzzy outputs and pathfinding visually catches errors no proof will.
- Build small playable blueprints that integrate multiple systems — a tiny tank-defense scene proves FSM + sensing + NavMesh + steering cooperate before scaling up.
