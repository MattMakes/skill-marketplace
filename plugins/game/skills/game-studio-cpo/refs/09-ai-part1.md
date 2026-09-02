## Game AI


### AI Design Philosophy & The Illusion of Intelligence

- Sell the illusion of intelligence, not replicate real cognition — players judge AI by believable reactions, not by accuracy of the underlying model.
- Treat believability, not realism, as the goal — players need agents to act plausibly, not to perfectly simulate cognition.
- Make AI not-stupid before making it smart — players attribute huge intelligence to agents that simply never run into walls, freeze, or twin animations; prefer plausible over smart.
- Prefer plausible over smart — "not dumb" means always plausible, not always optimal. **When it flips:** competitive/mastery games (fighting, strategy, RTS where a perfect player should beat the best human) → push AI toward genuinely strong or searched play, because depth and a real opponent are the product, not the comfortable illusion.
- Make AI just challenging enough to engage but beatable — fun lives between "trivial" and "impossible"; tune to that band, and keep the opponent beatable and slightly erratic (widely corroborated). **When it flips:** never let an AI be literally unbeatable (no game), but in skill-ceiling games make the AI limitlessly hard at the top while staying reachable at the bottom.
- Match AI complexity to the game's actual needs — "as simple as possible, but not simpler"; Pac-Man-grade AI fails in a shooter and shooter-grade AI is wasted on Pac-Man.
- Treat academic AI and game AI as different disciplines — game AI optimizes for fun within a fixed frame-time budget, not for solving real-world problems.
- Make the player the hero having the fun, not the programmer or the computer — never let the AI hog the spotlight.
- Give enemies cheap, readable behaviors (chase, dodge) rather than true intelligence — rudimentary info-gathering and reaction is enough to feel smart.
- Build a rich set of world-interaction behaviors and pick them even simply — believability comes from interacting with the world, not from complex high-level reasoning.
- Combine AI patterns rather than picking one — FSMs, sensors, steering, pathfinding, BTs, and fuzzy logic are meant to work in harmony, not isolation.
- Flesh out game rules (states, win conditions, abilities) before choosing AI tools — knowing them up front lets you pick FSM vs BT vs NavMesh per agent.

### Perceive, Don't Simulate / Graceful Cheating

- Optimize for what the player perceives, never what the AI "should" sense — if it feels unfair from the player's view, it is wrong even when the simulation is correct.
- Let AI cheat via omniscience when it improves the experience — giving an agent hidden info (player health, position) is often simpler and better than faithful simulation. **When it flips:** if the player can detect the cheat (AI reacts to things it cannot see, snipes through walls), it reads as unfair and breaks trust — cheat only where the seam is invisible.
- Let AI cheat gracefully via omniscience/influence maps when it improves the experience — give it enough partial knowledge to brace for attacks and strike weak spots, compensating for missing human intuition, not perfect knowledge.
- Let the AI "know" a lost target's position for ~2–3 s — cheap intuition that beats brittle velocity-extrapolation into walls/props (Halo, Crysis, Crackdown).
- Subtly weight search-spot scoring toward the player's ACTUAL position — shapes the search in the right direction (illusion of intuition) without feeling rigged.
- Shorten the combat cycle by cheating perception — if the player moves >5 m from last-known, force a scout immediately to reach the search phase faster (~30 s instead of ~2 min).
- Hide buddy/companion damage when the player can't see the hit — preserves carefully tuned encounter balance without the buddy feeling broken.
- Make AI opponents miss like humans — give a tunable error window that narrows with score (Asteroids' small saucer aims within a randomized window that narrows as score rises); a perfect computer opponent is no fun.
- Feed concrete numeric values for abstract concepts (health 0–100) into decisions — agents reason on data, so model fuzzy ideas as measurable inputs.

### Readability, Telegraphing & Communicating Intent

- Communicate AI intent (vocalize, animation, tells) or it might as well not exist — if the player can't read why the AI acted, hidden models do more harm than good; cut features you can't communicate.
- If the AI didn't say it, it didn't happen — vocalize whiz-bang behavior (in dialogue) or players won't notice the effort you spent building it.
- Give AI/NPCs "tells" (graphical/animation foreshadowing) before actions — gives the player a fair window to read and respond.
- Cut features you can't communicate — the Clickers' echolocation was abandoned because seeing-yet-blind confused players.
- React to changed objects (open doors, off lights) with obvious animation plus a bark — cheap "noticed it" feedback gives huge perceived intelligence and a living world per dollar.
- Use gaze/look direction as a primary tool to steer how players read a character's intent — players infer awareness, knowledge, and importance from where a character looks.
- Match motion quality to intended reading: short/fast = aggressive, long/slow = calm — humans shape-fit movement to learned behavioral patterns (Johansson, Heider-Simmel).
- Present behaviors in temporally plausible order — a reversed creep-then-pounce reads as a different story than pounce-then-creep; sequence carries narrative meaning and reversed-order action loses its narrative.
- Give each enemy archetype a distinct, learnable, exploitable behavior — Pac-Man's four ghosts prove varied patterns add depth and replay value.
- Express AI through animation and audio — the AI is only ever as good as the animations it chooses and how well it uses them.

### Reaction Time, Fairness & "Not Cheap"

- Give the agent a reaction delay (~0.2s simple, ~0.4s recognition/go-no-go) — instant reactions feel inhuman and unfair; add time for weak stimuli, aiming, or attention lapses, and the same delay also prevents twinning.
- Require time-in-sight or a stealth meter before full detection — gives stealth players a readable window to break line of sight.
- Make an opponent beatable and slightly erratic — predictable-but-perfect AI gets outsmarted and stops being fun; randomized per-instance ability plus a few "dumb" enemies keep players from solving the pattern.
- Never make enemies impossible to beat — if the AI always wins there is no game; make opponents beatable and slightly erratic.
- Make enemies genuinely lethal so each one matters — a single threatening enemy beats many cannon-fodder enemies for tension and emotional weight.
- Force the most-aggressive/opportunistic shooter AI to interrupt mid-animation and blend straight to shooting — slow transitions let rushing players stay untouched and feel cheap.

### Finite State Machines

- Model game AI as a state machine / behavior graph — states and transitions scale from trivial to complex and are easy to reason about and extend.
- Use an FSM when an agent has a small, well-understood set of states — easy to implement, visualize, and debug; keep the agent in exactly one state at a time with explicit transitions, and abandon FSMs once state/transition counts explode.
- Keep an agent in exactly one state at a time with explicit transitions — the single-state invariant is what makes FSM behavior predictable.
- Map states and transitions on paper/diagram before coding — clarifying the logical flow first prevents tangled transition spaghetti.
- Use diagrammed state machines for complex object attributes and forbid illegal transitions in code — kills puzzling bugs and forces you to think through every event.
- Reach for substate machines when one state has internal phases — break Patrol into MovingToTarget/FindingNewTarget instead of bloating the top-level graph.
- Use an "Any State" transition for conditions that apply everywhere — avoids wiring the same transition from every node.
- Allow multiple transitions between the same two states for OR-conditions — conditions on one connector are AND-ed, so separate connectors model "out of range OR out of sight."
- Drive transitions by setting parameters from gameplay code, not by hard-coding logic in the state graph — the controller only sets values; the FSM decides transitions, keeping concerns separated.
- Abandon FSMs when state/transition counts explode — they don't scale; switch to behavior trees once manual wiring becomes unwieldy.
- Reuse FSMs beyond enemies — the same pattern drives animation (Mecanim), UI, and any system with discrete modes.
- State pattern: represent each state as a full class implementing a common State interface and delegate the context's behavior to the current state object — cleaner than sprawling if/switch chains for game/enemy/UI state machines.
- Let states (or strategies) drive their own transitions — a state object decides the next state, keeping transition logic localized rather than scattered across the context.
- Use fuzzy state machines for graded states (anger, health, throttle, braking) instead of crisp on/off — richer NPC responses, less predictability, more replayability; remember fuzzy values are degrees of set membership, not probabilities (need not sum to 1, may overlap).

### Behavior Trees

- Choose behavior trees over FSMs for complex, scalable AI — hierarchical Sequence (AND) / Selector (OR) / decorator nodes avoid the manual transition explosion that plagues large FSMs.
- Define node flow by tree structure and order, not transition rules — evaluation flows root-down, left-to-right, easier to reason about than a transition web.
- Have every behavior-tree node return one of Success / Failure / Running — this three-state contract is the foundation that lets nodes compose; make evaluation asynchronous via Running so long checks span frames.
- Make BT evaluation asynchronous via the Running state — long-running checks must not block the game; Running lets a tree span multiple frames.
- Use a Sequence node as logical AND — it fails the instant any child fails and only succeeds if all children do, in order.
- Use a Selector node as logical OR — it succeeds on the first child success and fails only if every child fails.
- Compose behavior-tree control cleanly: Sequence as logical AND, Selector as logical OR, and decorator nodes (single child — Inverter/NOT, Repeater, Limiter) to modify a child's result without new composite logic; keep leaf nodes to one concrete action.
- Add a Limiter to cap retries so agents don't loop forever — try kicking a door N times then give up and try something else.
- Add a Repeater to wait until a condition holds — loop until the agent has enough energy before attacking.
- Keep leaf nodes focused on a single concrete action (walk, shoot, kick) — leaves can hold any logic but must stay the last node and return a valid state.
- Pass leaf logic in via a delegate (generic ActionNode) — one reusable node type accepts any matching method, maximizing code reuse over one-off leaf classes.
- Don't overload a single decorator with too much logic — if it grows complex, a composite node is clearer and more efficient.
- Derive all node types from one abstract Node base with an Evaluate() method, and instantiate trees bottom-up (children before parents) — a shared blueprint keeps the framework consistent and extensible.
- Instantiate trees bottom-up (children before parents) — parents require their children at construction.
- Order the node-state enum so the default (unevaluated) is sensible — pick that default intentionally.
- Build a risk-free prototyping layer that rips out cleanly (e.g. a high-level "hint" layer over a proven base behavior tree) — a plug-and-play higher layer lets designers reorder priorities and test them without touching the proven base, then remove it leaving the base untouched; make experimental changes additive and revertible.
- Make experimental gameplay changes additive and revertible — a high-level "disguise" tree that only sends hints can be removed leaving the base behavior untouched.
- Buy a proven BT plugin (Behave, Behavior Designer) when you need visual editing, debugging, or serialization — rolling your own only pays off when budget/time/control demand it.

### Utility & Decision Architecture

- Compute utility/score per option at runtime, never assign fixed weights a priori — only in-situation evaluation gives responsive dynamic behavior.
- Use dual-utility (rank + weight): pick the highest rank category, then weight-based-random within it — combines absolute utility's appropriateness with relative utility's variety.
- Set an option's weight to ≤0 to mark it invalid — a clean per-decision kill switch regardless of rank.
- Reserve extreme ranks for must-win behaviors (e.g. dying = rank 1,000,000) — guarantees critical actions trump everything else.
- Separate high-level skills (what to do) from low-level behaviors (how to do it) — lets different character types reuse the same movement/cover behaviors; make the lowest-priority skill always valid as a fallback.
- Make the lowest-priority skill always valid — a fallback (wander/idle) prevents the agent from stalling into an unresponsive, wall-staring state.
- Normalize utility values to [0,1] before combining traits — different number systems become comparable, combinable, and easy to scale (including negative scaling for opposite traits).
- For mobile/constrained strategy games, focus AI on "how do I play" (personality), not "how do I win" — express personality via tunable per-trait utility functions, normalized and scaled.
- Add hysteresis / temporal smoothing to oscillating decisions — prevents agents flip-flopping between two near-equal choices (target selection, congestion paths).
- Build AI/entity behavior from reusable "behavior" modules (hunger, fight, flee) with priority + IsRunnable, swappable across entity types — far better granularity than per-state modules; let a higher-priority runnable behavior preempt the active one each tick.
- Let a higher-priority runnable behavior preempt the active one each tick — or a sleeping unit gets killed without reacting; cleanup must restore safe state.
- Keep AI predictable, not "smart" — treat AI as a mechanic; consistent, automaton-like behavior lets players strategize, whereas a chaotic mind steals decision-making from the player. **When it flips:** competitive head-to-head / PvP yomi-driven games → introduce fuzzy, deceptive, human-unpredictable behavior so the opponent can't be fully modeled and solved.
- Use coarse behavior granularity for non-engineers — coarser "take cover" blocks are far simpler to wield than atomic "find cover spot" actions.

### Rule-Based / Production Systems

- Test rule-based / production systems only when decisions don't break into clean discrete states and depend on many hard-to-quantify factors — otherwise a rules engine is overkill.
- Always handle the "no rule matched" / default case — define a default rule or back-chain; a silent failure leaves the AI standing still or a factory producing nothing.
- Keep production-rule right-hand-sides cheap, conflict-free, and re-entrant — minimize RHS interdependencies so most rules can fire without conflict resolution.
- Cap rule matching time and shuffle a greedy first-match rule database — bounds worst-case O(n) spikes and prevents always firing the same rule for the same state.
- Track per-rule metrics: execution count, RHS success rate, never-fired and too-frequent rules — essential to tune, prune, and catch rules starved by the selection algorithm.
- Support live editing and rerun of rules/scenarios — pause, tweak the LHS, and rerun to confirm a fix; iterating on constraints for all scenarios is otherwise brutal.
- Use the Combs Method to keep fuzzy rule count linear instead of exponential (10 vars × 5 sets = 50 rules, not ~10M) — author rules per variable→output and OR them.
- Remember fuzzy values are degrees of set membership, not probabilities — they need not sum to 1 and may overlap.

### Fuzzy Logic

- Use fuzzy logic to turn vague concepts (hurt, cold, close) into actionable degrees of truth — overlapping float membership sets (0..1) capture nuance binary yes/no can't, and give each agent unique personality via different thresholds.
- Define membership functions over sets (critical/hurt/healthy) — degree of membership, not raw value, makes a decision "fuzzy" rather than linear.
- Allow overlapping sets so multiple statements can be partly true at once — an agent can be 37% hurt and 12% healthy simultaneously.
- Feed many inputs into one fuzzy controller — health, mana, ally proximity, and enemy strength can all shape a single decision.
- Pre-process inputs before fuzzifying (defense minus enemy attack) — derived values often decide better than raw stats.
- Give each agent its own set thresholds for unique personalities — same system, different "critical" cutoffs, distinct behavior per agent for free.
- Defuzzify back to crisp decisions with simple boolean rules (IF health IS critical THEN heal) — the fuzzy step abstracts messy conditionals into a few meaningful chunks.
- Chain fuzzy controllers into trees or FSMs — fuzzy output is generic data you can pipe into any decision system.
- Apply fuzzy logic beyond combat — dynamic difficulty, matchmaking, sensory ambiguity, and pathfinding cost can all use fuzzified inputs.
- Edit fuzzy curves visually (AnimationCurve) and evaluate at runtime — lets designers tune membership without recompiling.
- Weigh fuzzy logic's CPU cost against the benefit — nuance isn't always worth it; keep binary where predictability and simplicity serve better.

### Search & Planning

- Prefer search over hand-authored static analysis when decisions are dynamic — even a 1-ply search captures dynamics that brittle static rules miss and survives rebalancing.
- Let search shoulder reasoning so the static evaluation can be weaker — stronger search = simpler eval; find the per-game sweet spot of intelligence vs cost.
- Evaluate at the END of the game/battle, not mid-game — terminal evaluation functions are far easier to write; play out to the end, then score.
- Reuse the game engine's simulation for search via a "don't apply, just return expected value" flag — keeps AI reasoning exactly consistent with real game outcomes.
- Abstract the world for search when the real simulation is too expensive — but expect strange behavior wherever the abstraction diverges from reality.
- Never store multiple copies of world state in search — store a sequence of operators (with undo); preallocate operator lists and avoid runtime allocation.
- Reduce copied state to (action, result) deltas plus score — turns thousands of copied actions per state into dozens in the late game; never store multiple copies of world state in search (store a sequence of operators with undo).
- Reuse the AI search/simulation engine for GUI enable/disable, undo/replay, tutorials, and debugging — its legal-operator set already encodes the knowledge custom code would duplicate.
- Use forward breadth-first search for practical planning — simple, no pre-search structures, returns shortest plans so NPCs get no redundant actions.
- Author planner/AI actions and scripts as text files, not C++/engine code — nonprogrammers iterate without recompiling; generate compiled code from them later if needed.
- Aggressively prune ("chop") useless/redundant moves before searching — move rejection runs even more than the evaluator, so keep it cheap.
- Dynamically penalize candidate moves similar to those already searched — stops the move list flooding with 40 near-identical drops before trying anything else.
- For minimax, terminate branches by accumulated "interest cost" instead of fixed depth — dubious moves consume their budget fast, concentrating search on plausible lines (5–14× speedup).
- Track interest cost separately per player parity — otherwise the opponent inserts a dull move to force an early cutoff and dodge bad outcomes.
- Use transposition tables to skip duplicate states in search — hash move-sets so "AB in Z" and "BA in Z" (equivalent orderings) aren't both explored; beware XOR hash collisions zeroing out.
- Use UCT/MCTS for discrete, strongly-strategic games that tend to terminate — disable backward moves/healing during simulations to keep playouts converging.
- Tune the UCT exploration constant by watching the first-ply simulation distribution — wrong constant either explores uniformly or under-explores alternatives.
- Select the final UCT action by most-sampled or highest-payoff, never by the UCB1 rule — the UCB1 rule risks sampling a bad move instead of taking the best.
- Preallocate UCT nodes and delay expansion until a node is visited N times — saves memory with little performance loss.
- Use UCB1 to balance between several well-designed strategies (bandit arms), not raw low-level actions — never make a strictly bad action a bandit arm; it gets played regularly.
- Use regret matching for simultaneous/unpredictable decisions (rock-paper-scissors-like standoffs) — it needs the ability to ask "what if I'd played differently."
- Use a constraint solver for config tasks (level item placement, character builds) when many solutions exist — declarative "what" beats brittle ad-hoc algorithms and survives new constraints.
- Use forward-checking with constraint propagation, backtracking, and undo — narrow each variable's candidate set and detect dead ends early instead of grinding inner loops.
- Visit the most-constrained variables first in a CSP — they're likeliest to empty out, so fail fast instead of deep in an inner loop.
- Reserve constraint solvers for "easy" online problems (many solutions, few constraints per variable); use offline answer-set solvers for hard, few-solution problems in tools/build pipeline — match solver class to problem hardness.
- Adding constraints can SPEED UP a constraint solver — it prunes unsatisfiable regions of the search space faster.
- Use a work queue with a "queued" flag to avoid re-narrowing the same constraint twice — pass the changed variable's old value so constraints can skip irrelevant changes.
- Represent narrative state and actions in a machine-readable format (e.g., PDDL) so an AI game master can revise the story when players break it — pregenerate narrative fragments for a planner to assemble on the fly; specify authorial goals as facts to satisfy, then let the planner generate consistent continuations (kill the wolf → plan a new predator so "grandmother is eaten" still holds).

### Adaptive & Learning AI

- Let the AI self-tune via genetic algorithms / partially-supervised training — removes hand-tuning and weeds out bad rules; modify (don't replace) float genes when mutating.
- Limit adaptive AI's learning window or weight recent encounters — so players can't coerce it one way then exploit a counter-strategy in a key moment.
- Use UCB1/UCT only where strategies are reasonable and there are many short encounters to learn from — and bias utility (extra reward for punches) to give an AI personality.
- Treat AI behavior as content PCG can manipulate — adaptive difficulty = generating/altering enemy behavior in response to play, distinct from raw stat scaling; scale challenge by changing how enemies play, not just their hit points.
- Scale challenge by changing how enemies play, not just their hit points — making them faster/smarter/more numerous shifts gameplay mentally; bigger numbers alone don't shift the felt experience.
- Refine waypoint tactical values with captured gameplay (damage dealt/received at a location) — adds reinforcement learning so the AI adapts its location choices.
- Use archetypal analysis / SIVM for the most human-interpretable, distinguishable player profiles — extreme archetypes read easily for designers and aid bot/cheat detection.
- Use machine-learned narrative/decision selection only when training data (e.g. human game-masters) is available — learn a ranking function from game/player state to choices.

### Dynamic Difficulty & Adaptation to the Player

- Tune AI difficulty by adjusting stimulus thresholds (data), not by adding more agents — keeps memory/perf flat and lets each character type scale independently.
- Trigger difficulty steps off player power milestones — gate "smarter AI," "no turn-skip," and "higher spawn rate" on the player's damage thresholds.
- Make early enemies deliberately exploitable (get stuck on walls) — gives weak players an escape route; tighten AI only as the player strengthens.

### Perception & Sensing

- Model perception as a Sense/Aspect pair behind a common interface — a base Sense class with custom senses (sight, touch, smell) keeps detection extensible.
- Treat the sensory system as input to the decision system, not the decision itself — feed sense results into an FSM/BT so detection and reaction stay decoupled.
- Starve agents of information and they glitch (idle, loop, bad cover) — give AI enough environmental data or it visibly misbehaves.
- Throttle sensing to a detection rate, not every frame — accumulate elapsed time and run the check only when the interval passes to save CPU.
- Replace binary vision with graded object-identification certainty (0–1 zones) — eliminates the exploitable "10.001 m vs 1 mm closer" detection cliff.
- Model vision as a "sweet spot" that widens then narrows with distance, not a plain cone — matches human acuity and avoids distant-peripheral false positives.
- Replace distant vision cones with coffin-shaped boxes that expand then contract — a cone makes the AI notice things laterally far away; the coffin shape fixes it.
- Prefer a cone of vision over a single raycast line for sight — a field-of-view angle check plus distance models real eyesight far better than one ray.
- Confirm line-of-sight with a raycast after the FOV angle test — checking the cone then raycasting stops agents from "seeing" through walls.
- Decay detection probability with distance from the sensor — edges of vision and far sounds should be less reliable than close, central ones.
- Don't interpret the vision scale as a probability die-roll — repeated rolls eventually detect everything and feel random/inexplicable.
- Raycast to a single representative point that moves by context (chest in stealth, head in combat) — favors the player while stealthy yet stays visible in combat; multi-joint weighted casts confused players.
- Model hearing, smell, and touch as spheres/triggers around the agent — proximity volumes are a cheap, effective abstraction for non-visual senses.
- Use a tunable per-character hearing multiplier and scale sound radius by player speed — lets Infected hear 6× better than Hunters and forces slow approach at melee range.
- Generate LOGICAL sound events separate from real audio, occluded by walls — gives designers control over what hears what and reinforces keeping obstacles between player and AI.
- Add a silent short-range "breathing" logical sound — lets AI sense nearby stationary targets without a real audio cue.
- Calculate audio distance through choke-point area paths, not Euclidean — prevents hearing through walls without an expensive sound engine.
- Halve hearing for offscreen agents far enough that not-hearing is plausible — fixes "detected for no reason" unfairness while staying plausible if the player rounds the corner.
- Require a Rigidbody on trigger-based sensors — many engines won't fire collision/trigger events on non-moving objects without one.
- Filter raycasts with layer masks to test only relevant colliders — avoids false hits on vegetation/decoration during obstacle detection.
