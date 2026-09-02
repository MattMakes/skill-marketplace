# Randomness, Rewards, Difficulty & Procedural Generation

## Randomness, Reward & Difficulty Systems

### Randomness Types & Distributions
- Choose the probability distribution curve deliberately: summing multiple random draws (3d6) clusters around the middle and is NOT linear like a single d20 — added dice give a bell curve and feel completely different from a flat roll, so pick the shape you actually want (AoGD3; AoGD2; IntroGameDesign).
- Pick the randomizer technology for its distribution: single die / single RAND = flat, multiple dice = bell, spinners, and shuffled decks = sampling without replacement; decks give controllable, non-repeating "deck-memory" randomness while dice give independent memoryless draws (IntroGameDesign).
- Blend chance and rule-based resolution to taste — pure random kills strategy, pure deterministic kills suspense; e.g. bound damage to a rule range then randomize within it (GDWorkshop; RPGDirectX).
- Use weighted/non-uniform distributions when you need designer-tunable rarity: map a uniform roll into buckets via a weight table (FLOOR/INDEX/COUNTIF) so odds stay editable rather than buried constants (IntroGameDesign; PCGUnity).
- Build nonuniform distributions by inverting the CDF (table lookup for discrete, inverse function for continuous); use rejection sampling only when no inverse exists, and prefer an approximation in games since rejection wastes many draws (GameMath).
- Match the sampling math to the desired shape — naive cube-normalize clusters at corners and naive spherical angles cluster at poles; use the right construction (`z=1−2ξ` for uniform sphere, `r=√ξ` for uniform disc) (GameMath).
- Resolve checks with a single roll-vs-threshold against an ability (`rand()%1000 <= toHit`, dodge `rand()%999 <= agility`) — one uniform, cheap pattern across all combat probability (RPGDirectX).
- Add randomness to damage via percentage ranges (attack ×90–110%, defense ×80–100%) so the same attack varies and combat avoids deterministic monotony (RPGDirectX).
- Validate that your *use* of an RNG actually matches the intended distribution with a chi-square test — catches biased custom distributions; aim for a mid-range p-value (too low = too regular, too high = biased) (GameMath).
- Make outcomes partially predictable — neither unknowable (random thrash) nor inevitable (no decision); prediction requires consistent and comprehensible systems so players can see and feel the future (DesigningGames).
- Prefer EMERGENCE over randomness for unpredictability where possible — a deterministic complex system can be unpredictable without dice, preserving skill expression (GameMechanics; AoGD3; AoGD2).
- Remember probability is "looked-for ÷ possible outcomes" (range 0–1): OR-adds only for mutually-exclusive outcomes, AND-multiplies only for non-mutually-exclusive, and "1 − does = doesn't"; enumerate or Monte-Carlo when the math is hard (AoGD3; AoGD2; IntroGameDesign).
- Use Monte-Carlo simulation (run millions of trials) for probability/balance questions too hard to solve analytically — e.g. most-landed Monopoly squares (AoGD3; AoGD2).
- Use expected value (Σ chance × value) as a primary balancing tool, but measure the *real* value — capped damage, hidden penalties, and unusable benefits must be captured (a 40-dmg hit on a 15-HP enemy is worth only 15) (AoGD3; AoGD2).
- Track *perceived* probability, not just actual — players misjudge odds, overweight rare/dramatic outcomes, and form false "perceived probabilities" from small samples that drive their behavior (AoGD3; AoGD2).
- Account for regret and risk asymmetry (Kahneman/Tversky) — players take sure gains but gamble to avoid sure losses; model the human element rather than assuming pure EV maximization (AoGD3; AoGD2).
- Master chance as a spice: too little is bland, too much overwhelms — tune it, and remember chance and skill are entangled (estimating odds is a skill, every skill action has a success probability, and players feel imagined skill in controlling pure chance) (AoGD3; AoGD2).
- Distinguish theoretical from practical probability — small samples deviate wildly from the ideal, so never tune off a handful of playtests; shuffle properly (riffle ~7 times) when order matters or you create exploitable patterns (IntroGameDesign).

### Tuning Frequency vs Impact Separately
- Use randomness with intent on two independent axes — frequency (how often) and impact (how much) — to force improvisation and counter dominant strategies; too much high-impact randomness erases skill, too little leaves a solvable game (GameMechanics).
- Make player inputs influence the economy FREQUENTLY but with no single input too large — frequent small inputs create rich variation without destabilizing balance (GameMechanics).
- Separate "harder" from "more content" as two distinct knobs — difficulty and novelty are different dials; ramp parameters on fixed content for cheap difficulty, vary layout for novelty, and tune each deliberately (GDEssentials).
- Characterize each feedback/reward loop by its profile — investment, return, speed, range, durability, and type (constructive/destructive, positive/negative) — and tune along these axes rather than ad hoc (GameMechanics).
- When tuning a value, double or halve it (not ±10%) so you can actually feel the effect and quickly find the boundaries of good balance (Sid Meier's rule) (AoGD3; AoGD2).
- Plan to balance: expose runtime-tunable parameters for the values you'll need to adjust, ideally via a content/data system so you keep tuning post-ship — half of dev time goes to balancing and tiny values matter (Halo sniper 0.5→0.7s) (AoGD3; AoGD2; EditorScripting; GPGems2; SWEngGames).

### Seeds & Determinism
- Drive all generation through a PRNG seeded from a stored value — the same seed reproduces the same content, so you can discard generated content and regenerate it on demand (PCGUnity; GameMath).
- Store the seed as a first-class variable (not just system time) so you can recreate a level/dungeon/planet later — e.g. a quest sends the player back — without persisting the full generated artifact (PCGUnity).
- Treat seeded regeneration as a memory-vs-recompute tradeoff: keep the seed + generator equation instead of saving trillions of results, shrinking save data and ship size dramatically (PCGUnity).
- Seed deterministically for debugging (same seed → reproducible sequence) and randomize the seed (clock, input timing) for shipped builds — one algorithm serves both repeatable QA and live variety (GameMath; PCGUnity; SWEngGames; GPGems2).
- Don't use `rand()`: create portable, restartable random-number objects with intent-named generators (random(n), randomReal, randomBOOL weight) — `rand()` is non-portable, single-stream, and can't be reseeded to a saved state (GPGems2; SWEngGames).
- Default to the Mersenne Twister (MT19937) for game randomness (huge period, good spectral quality, fast); scale down to multiply-with-carry or a vetted LCG only when memory/speed is at a premium — and distrust LCG low-order bits, shifting right before taking modulo for small ranges (GameMath).
- Pick the engine-optimized RNG over the general one (Unity.Random vs System.Random) and alias it explicitly per file — avoids accidentally mixing two random sources with different behavior (PCGUnity).
- Give the render loop and the update loop separate RNGs — sharing one with a variable render-per-update ratio makes generator state indeterminate and breaks replay/multiplayer (GPGems2).
- Know PRN sequences are cyclic and will repeat — if repetition shows in content, widen the value/seed range or use a longer-period generator before adding complexity elsewhere (PCGUnity).
- Use randomness as a "decision driver," not a content author — let PRNs choose among designed modules/branches so you offload minor detail decisions (which tree, which tile) while keeping authored quality (PCGUnity).

### Reward & Reinforcement Schedules
- Schedule rewards on a variable-ratio (random, unpredictable) basis rather than fixed-interval or fixed-ratio — operant-conditioning research (slot machines, EverQuest) shows variable reward drives the most consistent engagement; fixed-ratio creates a "shelf moment" right after each payoff and predictable streams stop mattering (DesigningGames; GDWorkshop).
- Counter reward acclimation by making rewards variable instead of fixed AND by escalating reward magnitude through the game — a 1/3 chance of 30 points stays exciting far longer than a flat 10 for the same average, and escalation works even when players know the trick (AoGD3; AoGD2).
- Superimpose many desynchronized reward schedules so at least one is always near payoff ("one more turn") — and prevent players from focusing on one schedule, or they sync them into one giant shelf moment (DesigningGames).
- Recognize most reinforcement schedules are emergent from lower-level systems, not authored (chess capture-pacing, deathmatch kill-count variance) — tune the underlying systems to shape them; random kill outcomes naturally produce a compelling variable ratio (DesigningGames).
- Use the full reward palette — praise, points, prolonged play, gateway/access, spectacle, expression, powers, resources, status, completion — and combine types; more reward types is generally better (AoGD3; AoGD2).
- Tie reward magnitude to spawn rarity with a probability ladder (common/weak → rare/strong) and randomize the value within each tier-bounded range — each drop feels distinct while the economy self-balances scarcity against power (PCGUnity).
- Use dopamine (anticipation of reward) to push players through unpleasant-but-essential moments — without it they quit at first failure; virtual rewards work because the brain has no system distinguishing real from in-game rewards (DesigningGames).
- Align rewards with intrinsic desires — extrinsic rewards displace or destroy intrinsic motivation (worst on creative/exploratory tasks); reward only what the player already wants to do, and tie every reward to in-game utility, thematic association, and story (DesigningGames; GDWorkshop; AoGD3; TheoryOfFun).
- Engineer endogenous value: in-game items/score matter only because the system makes them matter — route every resource toward the player's actual goal (Sonic rings buy lives), or it gets ignored like Bubsy's yarn balls (AoGD3; AoGD2).
- Build crafted reward systems that detect and reward everything the player wants (Skate 3 scores every flip/grind/airtime) — but if the valued activity can't be detected (creativity, friendship, exploration in Dwarf Fortress/SimCity), use NO reward system, since any system would destroy more motivation than it creates (DesigningGames).
- Ensure players understand a reward — an unintelligible reward is no reward (AoGD3).
- Treat reward as a first-class system input — "if there isn't a quantifiable advantage to doing something, the brain will discard it"; every action needs a reason in the economy (TheoryOfFun).
- Reward many distinct skilled actions with score and don't be stingy — "the more aspects of the game that affect the score, the better"; score is the player's primary feedback on overall performance, and milestone rewards (e.g. +1 health per 100 points) couple progression to performance (SWEngGames).
- Add peer recognition / status as a reward type that can't be delivered like a pellet — broadcast achievements, track scores, surface brilliant maneuvers so even non-winners feel acknowledged (GDWorkshop).
- Use surprise judiciously to re-invest players (unexpected reward, low-probability upset) while keeping choice dominant — if every outcome is random, choices feel meaningless (GDWorkshop; AoGD3).
- Avoid building pure compulsion machines (Cow Clicker) — remorse follows motivation without fulfillment; aligned rewards on a meaningful core are the sustainable path (DesigningGames).
- Prefer turning punishments into rewards — Diablo replaced a hunger penalty with "eating gives a temporary boost"; same activity, positive framing, and reward reinforces better than punishment (AoGD3; AoGD2).
- Use the threat of punishment more than punishment itself (Thief stealth tension) — looming consequence adds drama to trivial actions without driving players to quit (GDWorkshop; AoGD3).
- Make all punishment understandable and preventable — random, unstoppable punishment reads as "unfair" and ends play; calibrate harshness (too light = no risk/boredom, too heavy = over-caution or dodging) and balance strong punishments against commensurately strong rewards (AoGD3; AoGD2; GameAIPro2).
- Give failure a cost — at minimum an opportunity cost with no free do-overs; failure with no consequence removes the learning signal (TheoryOfFun).
- Never punish the player himself for failure (loading screens, replays, grinding) — punish the character, deny success, or impose small setbacks while play keeps moving forward (StarCraft retry, Super Meat Boy 1-second respawn) (DesigningGames).

### Progression & Unlock Systems
- Build authored progression with lock-and-key mechanisms — a key (item, ability, skill, or even player skill) grants access past a lock — but catalog every lock/key pairing to avoid dead ends (GameMechanics).
- Use ABILITIES as keys (double-jump, gale boomerang) so progression gates also expand the mechanical possibility space — richer than collectible keys, and power-ups produce the abstract resource "access" (double-jump → reach new platforms) (GameMechanics; AoGD3).
- Guard against consumable-key deadlocks — guarantee a renewable source for any consumable a player can be gated behind (Zelda scatters replenishing pots that yield any needed resource and double as hint delivery) (GameMechanics).
- Treat PROGRESS itself as a resource for "emergent progression" — measure it as distance-to-target, character growth, or journey, and produce it indirectly via the economy so progression emerges from play rather than scripting (Elite, Catan, Power Grid) (GameMechanics).
- Decide consciously between games of EMERGENCE (simple rules → large possibility space, process-intensive, high replay) and games of PROGRESSION (authored challenge sequence, data-intensive); integrate both by layering authored progression on an emergent core (StarCraft missions over an RTS economy) (GameMechanics).
- Design objectives at multiple time horizons — short, medium, and long-term, tied to spaces/landmarks — so the player always has a next goal while feeling they build toward something magnificent (AoGD3; IntroGameDesign; GDWorkshop; SWEngGames).
- Structure progress with advertised milestones and visible advancement, measured several ways at once — humans derive joy from advancing toward a goal, and small payoffs sustain long campaigns (GDWorkshop; GDEssentials).
- Make goals concrete, achievable, and rewarding, and chain them — players who can't visualize the goal can't commit; the brain loves long chains of clear concrete goals (also the engine of game-based learning) (AoGD3; AoGD2).
- Treat experience points as the core progression currency (monsters grant XP, thresholds raise levels, levels grant stat/spell rewards) and tune XP thresholds against the area's average monster XP, not arbitrary numbers (RPGDirectX).
- Grant a predictable, authorable power bundle on level-up (e.g. +max HP/MP, +attack, occasional new spell) for a clean, designer-readable power curve (RPGDirectX).
- Reuse identical content at higher difficulty as a cheap progression axis (Pac-Man same maze, rising speed/aggression) — ramping parameters on fixed content extends play without new assets (GDEssentials; SWEngGames).
- Persist player identity and progress as a first-class system — recording initials made a score belong to someone, turning a transient session into a social/competitive ladder; protect saves as critical (losing an 80-hour RPG makes players abandon) (GDEssentials; QATesting).
- Make customization choices MUTUALLY EXCLUSIVE (pick invisibility OR armor) so choices carry real consequence, and balance them with negative feedback (escalating XP cost per level) or one dominant build collapses the space (GameMechanics).
- Size the probability/upgrade space so it can't be fully explored in one session and don't require maxing all attributes to finish — leftover unexplored space is what creates replay and identity (GameMechanics).
- When XP/upgrade sources are non-renewable, account for every distribution of how players could have spent them when balancing each gated encounter (GameMechanics).
- Sequence challenges as skill atoms (action → simulation → feedback → modeling) chained into a skill tree, and pace teaching with the martial-arts model: drill in isolation, combine, set-piece, then free application under pressure (GameMechanics).
- Solve the Mastery Problem explicitly — high-level players must get no big benefit from grinding easy encounters (or they "bottom-feed"), while novices must still be able to progress; use the victory condition to redirect incentives away from dominant strategies (TheoryOfFun; DesigningGames).

### Difficulty Curves & Flow
- Keep players in the flow channel — clear goals, immediate feedback, and challenge continuously matched to rising skill (between boredom and anxiety) — and prefer a "tense and release" oscillating ascent (challenge → reward/power → easier stretch → harder again) over a straight climb (AoGD3; AoGD2; TheoryOfFun; GameAIPro2).
- Increase difficulty with each success but let skilled players blow through easy parts fast (tie level length to skill) so everyone quickly reaches their own challenge level (AoGD3; AoGD2; GameMechanics).
- Make a difficulty curve monotonic — start slow/easy and escalate each beat with no unearned spikes; treat every encounter as a staircase that never jumps from step 1 to step 10 (LevelDesign; QATesting; GDEssentials).
- Make early levels nearly trivial — learning the controls/goals is itself a challenge, and early wins build the confidence that keeps players from quitting; flood the skill-barrier period with no-skill "emotional life support" (art, characters, music, spectacle) so players reach the real game (AoGD3; DesigningGames).
- Decide explicitly "what % of players should finish?" and design difficulty for that, rather than cranking late-game difficulty to pad playtime and lose 90% of players (AoGD3).
- Provide layers of challenge (grades, optional A+ targets, star ratings) so the same content challenges novices and experts (AoGD3; AoGD2).
- Build deep systems with a skill ceiling beyond human reach so the game is never "solved" — players want to *try* to solve a game but hate succeeding; minimize animation/control delays that let normal players catch up to perfect play (DesigningGames).
- Design for a wide skill range — easy to learn (low barrier) AND hard to master (high ceiling) — and use elastic, graded-success challenges (dart rings, Hitman ratings, ledge-grab, downed-not-dead) instead of pass/fail so one design serves a wide skill band (DesigningGames).
- Match challenge to skill at the top edge of flow, aiming at the zone of proximal development (what the player can do *with* the system's help), not at comfortable mastery — and don't reward exercising mastery over learning, or the system betrays its own purpose (TheoryOfFun).
- Pace variation reveal as the primary difficulty knob — too slow reads as trivial and is abandoned early; too fast loses the player and reads as noise; diagnose the five boredom failure modes (grokked too fast, depth dismissed, pure noise, ramps too slowly, ramps too fast) and tune against each (TheoryOfFun).
- Use scaffolding to teach the system — build later challenges on earlier-learned skills (Super Mario's unfolding jump) so abilities unfold over time toward a high-level stratagem space (TheoryOfFun; GameMechanics).
- Calibrate to empirical "feel constants" where they exist — surveyed good action games cluster around ~0.7s jump airtime, ~1m10s level length, ~2s for three combat moves; treat measured human-response constants as tuning targets (TheoryOfFun).
- Keep short-term-tracked state under ~7 chunks — overloading working memory makes a system feel like noise, and adding numbers to track makes games hard fast (TheoryOfFun; AoGD3).
- Aim difficulty at the "interesting border between too easy and too hard" — tune sizes, speeds, frictions, force strengths, and spawn counts so targets are neither trivial nor impossible (SWEngGames).
- Drip difficulty in via the economy: raise enemy MAXSPEED, count, or force strength when score crosses a threshold — inevitable escalation gives the game a clear, rising arc (SWEngGames; GameMechanics).
- Prefer changing *how* enemies behave (smarter/faster/more-numerous, swapped behavior sets) over raising hit points — behavior shifts how the game is played and challenges the player mentally; bigger numbers don't (PCGUnity).
- Verify every difficulty setting, not just normal — "easy" not too easy, "hard" not too hard, "medium" a gradual rise; watch AI ally/enemy strength as a balance lever that directly shifts difficulty (QATesting).
- Make difficulty a data-tuned threshold, never a code branch on character type — keeps it configurable per character without code changes (GameAIPro2; EditorScripting).
- Always make opponents beatable and worthy — vary enemy competence randomly (even add "dumb" enemies) so outcomes are unpredictable; "if there's no game" the moment they're impossible, the player should be the hero (SWEngGames).
- Frame "hard"-labeled challenges that are actually biased toward a win — players attribute wins to their own mastery and losses to the game, so framing shapes perceived skill (GameAIPro2).
- Build comeback/catch-up (negative-feedback) mechanics so a weaker side can recover (Mario Kart power-up weighting, Battlefield tickets) without letting them stagnate into perpetual stalemate, and counter rich-get-richer downward spirals with a stabilizing source (Half-Life spawns more health packs when HP is low) (GDWorkshop; AoGD2; GameMechanics; IntroGameDesign; TheoryOfFun).
- Implement rubberbanding as negative feedback on *relative* race position with subtle mechanics (trailing players get better power-up odds, the leader becomes the common target) rather than crude speed clamps — feed the loop from the difference between players, not absolute values, for a moving target that resists gameable balance (GameMechanics).
- Use positive feedback deliberately to DRIVE a game to conclusion once a decisive lead exists, but sparingly — nobody wants to play after the winner is clear, yet rich-get-richer loops make a novice's position unwinnable, so add negative feedback or matchmaking to keep entry viable (GameMechanics; GDWorkshop; TheoryOfFun; IntroGameDesign).

### Adaptive & Dynamic Difficulty
- Be cautious with dynamic difficulty adjustment — it spoils world reality, is exploitable (play badly to get an easy stretch), and denies players the satisfaction of mastering a fixed challenge; it's not a dead end but needs counter-intuitive cleverness. **When it flips:** when applied invisibly and the genre tolerates it (Tetris speed-up, racing AI that slows when the human crashes and speeds up when the human leads), scale difficulty to player performance in real time so players credit their own skill (AoGD3; AoGD2; GDWorkshop; IntroGameDesign).
- Provide difficulty modification in one of three modes — explicit player selection, adaptive (silent/hidden), or implicit (strategy/class choice sets challenge, e.g. TF2 Sniper vs Engineer) — and use implicit selection in competitive/multiplayer where explicit screens don't fit (DesigningGames).
- Use adaptive difficulty only when players won't reach high skill — experts decode and exploit it; combine it with explicit bands (Resident Evil 5 clamps an internal 1–10 by the chosen tier) (DesigningGames).
- Accept that perfect dynamic difficulty is near-impossible — a conceptual breakthrough can trivialize remaining challenge instantly and automated systems read shifting skill poorly; design tolerant ramps rather than relying on perfect adjustment (TheoryOfFun).
- Drive difficulty adaptation off a player model (skill, emotion, or style), not just more enemies — when memory/perf caps headcount, tune per-character response thresholds instead (GameAIPro2).
- Trigger difficulty advances off a player-power signal (damage thresholds) in discrete, legible tiers (at dmg 10 smarter, 15 faster, 20 spawn-more) read as flags by the AI/spawn systems — coupling challenge to actual progression as a deliberate balancing feedback loop (PCGUnity).
- Design the early state to be intentionally exploitable (dumb enemies get stuck on walls so weak players can flee) — asymmetric difficulty by progression is a feature; let the feedback loop close it as the player strengthens (PCGUnity).
- Limit how long an adaptive AI commits to one strategy via a sliding learning window or recency weighting — prevents players from coercing then exploiting the AI at a key moment (GameAIPro2).
- Negative-feedback-balance matchmaking by boosting/equalizing skill ratings before a match — players enjoy uncertain outcomes against similar-skill opponents (GameAIPro2).
- Don't let players balance core values — they have a conflict of interest (want challenge AND easy wins); player-set difficulty levels are the safe exception (AoGD3; AoGD2).
- Make computer-controlled characters fallible within a tunable range (Asteroids saucer fires randomly within a window that narrows as score rises) — perfect AI is no fun, so expose the range as a balance variable (GDWorkshop).

### Pacing & Rate-of-Reveal
- Shape the experience as an interest curve — a strong hook, gradually rising interest punctuated by rest dips, building to a grand finale that exceeds expectations, then leave them wanting more; chart it to find dead/flat spots and cut, shortcut, or restructure them (AoGD3; AoGD2).
- Make interest curves fractal — overall game, each level, and each challenge all follow the same hook-rise-climax shape, which is how the pattern scales to 5-hour and 500-hour games (AoGD3; AoGD2).
- Model pacing as an explicit tempo system controlling rate-of-reveal — show one element at a time, never reveal the whole possibility space at once, so anticipation stays a tunable resource (LevelDesign; TheoryOfFun).
- Vary decision pacing as the only hard rule — neither bore with long slow stretches nor exhaust with long fast ones; treat flow as a cup with a draining hole, feeding decisions at the right rate, and fill flow gaps from balance delays/animations/menus/stuns with other available decisions (DesigningGames).
- Build encounters as a dramatic arc with rising conflict to a climax and a "point of no return" — a content schedule, not random emission, keeps the engagement curve intentional (LevelDesign; GDWorkshop).
- Use a "calm before the storm" gate (a quiet, threat-free window before a trigger fires the spike) and insert recovery/breather windows between spikes — contrast amplifies perceived intensity at zero extra content cost, and pacing needs negative space to avoid fatigue (LevelDesign).
- Make each successive spike harder and more novel than the last — repeating the same intensity reads as flat; novelty plus escalation sustains interest (LevelDesign).
- Pace by an emotional arc, not raw difficulty — track an intensity metric, build it up, sustain the peak, fade, then relax (cyclic FSM, Left 4 Dead AI Director) — keeps players engaged rather than merely challenged (GameAIPro2).
- Treat information reveals as equivalent to state changes — you can manufacture emotion by rationing and revealing information, not only by changing world state; design for anticipation by letting threats/opportunities be sensed before they occur (DesigningGames).
- Use information balancing as cheap design — add/subtract info to make a decision comprehensible-but-not-obvious without touching mechanics; fix information starvation (a useful FAQ is a warning sign) and information glut (too much info erases decisions) by adjusting what's revealed (DesigningGames).
- Plan ~1-hour "mini-arcs" each ending in a memorable moment, matched to a typical single sitting, so players return; design a hierarchy of goals across time scales (10s / 1min / 1hr) for an "infectious" long arc (GDWorkshop; SWEngGames).
- Use mechanics-generated pacing curves where possible (CTF naturally arcs hook→rising→climax→denouement) instead of only scripted ones, and prefer steady-with-spikes pacing for player-interruptible content so it survives being sliced up (DesigningGames).
- Use death-rate per map as a measurable difficulty-pacing proxy — it follows the interest-curve shape even in acclaimed long games (Half-Life 2) (AoGD3).
- When the climax passes, let the scales tip dramatically and end fast — a sweeping victory satisfies; a dragged-out ending bores both winner and loser, so control game length through win/lose conditions (GDWorkshop; AoGD2).
- Foreshadow future locations as visible-but-unreachable (windows, fences, distant landmarks) to seed anticipation, and reuse prior locations with altered state (time-of-day, destruction, flooding) as a cheap, high-impact reveal of elapsed time and world change (LevelDesign).
- Tune procedural pacing/audio by parameter ranges (measure length, plays-per-measure, pitch range) — a "tension" flag that narrows the measure range raises tempo, so one parameter swap shifts mood (PCGUnity).

## Procedural Generation Systems

### Decide Whether & Where to Generate
- Decide whether the experience actually needs PCG before building it — generation costs processing, memory, and design time, so reserve it for where uniqueness, scale, or replayability genuinely pay off (PCGUnity).
- Decide PCG's mechanical role (frame vs. core mechanic) and player-interaction mode (parameterized, preference, direct manipulation) up front — these design decisions drive whether design guarantees and variety actually matter (GameAIPro2).
- Remember PCG ≠ random — giving players authoring tools (sandbox) or fleshing out modules/states is also procedural generation, and often yields a better, more immersive experience than pure randomization (PCGUnity).
- Use physics as a PCG mechanism, not just simulation — applying physics to modular structures (Angry Birds) restructures content and changes how the game plays, at a processing cost (PCGUnity).
- Build new procedural subjects (music, animation, story) by abstracting domain theory into a formula, then exposing its variables — anything formulaic (tempo as a timer, story as a state graph) can be generated and tuned once parameterized (PCGUnity).

### Technique Selection
- Choose the PCG approach by required control — simulation (bottom-up, controls only initial state + operators), constructionist/selection, grammars (emergent rules + generate-and-test for soft constraints), optimization (evaluation function, often slow), constraint-driven (hard declarative constraints, NP-hard but fast on small domains) — each trades authoring effort against control (GameAIPro2).
- Choose knowledge representation by the control-vs-pattern-risk tradeoff — experiential chunks (max authoring, high repeat-recognition risk), templates (Mad-Libs blanks), components (need a strong algorithm), subcomponents (smallest, need semantic info) move along that axis (GameAIPro2).
- Match the algorithm to game stage — online frequent generation prioritizes performance (may compromise quality); offline generation can be slow but must store/load efficiently and support variety it can't react to (GameAIPro2).
- Choose between player-triggered generation (reveal only what the player approaches) and system-driven generation (build the whole level at once) per content type — endless worlds suit the former, bounded levels with a fixed start/end suit the latter (PCGUnity).

### Generate-and-Test & Grammars
- Deliberately overgenerate with loose grammar rules, then cull with simple acceptance tests — fixing overgeneration inside the rules tends to cause undergeneration (predictable sameness); test-and-discard keeps surprise plus top-down constraints (GameAIPro2).
- Keep the grammar's interpreter separate from its rules — the power of grammars is fast rule add/change; fusing rules into branching control flow loses that (GameAIPro2).
- Design minimal/consistent command grammars when I/O or comprehension is the bottleneck — Colossal Cave's "go west / get inventory" two-word grammar made a deep game playable over a 300-baud terminal; a tiny consistent vocabulary is a robust system under severe constraints (GDEssentials).

### Constraint-Based / Solver Generation
- Use a finite-domain constraint solver for configuration/PCG tasks (room contents, character builds) with forward checking, backtracking, and undo — declarative constraints are faster to author and re-author than ad-hoc algorithms and are already correct (GameAIPro2).
- Represent finite domains as fixed-size bit sets and queue narrowing operations as deduplicated constraint arcs — bitwise intersection is trivial and the queued-arc flag avoids re-narrowing the same pair (GameAIPro2).
- Visit most-constrained variables first and shuffle value order — most-constrained-first surfaces dead ends early, and shuffling yields different valid solutions each run without breaking enumeration (GameAIPro2).
- Reuse the one search/solver system everywhere — drive valid-operator GUI enable/disable, build dynamic tutorials and hint systems from a solver, and expose bugs via depth-first state exploration (GameAIPro2).

### Layering Generators
- Layer generation in passes: essential structure → random branches → set-piece chambers → fill/enclose — each pass adds variety while preserving the invariants of the previous pass (PCGUnity).
- Mix techniques across abstraction layers (constructionist templates for room layout + constraint solver for item placement) — but expect layers to communicate poorly: if a lower layer (the solver) fails, regenerate the upper layer and retry (GameAIPro2).
- Separate the generator (produces abstract data) from the builder (instantiates visuals) — one class computes a dictionary of coordinates/types, another reads it and spawns prefabs, decoupling the algorithm from rendering so either side can change independently (PCGUnity).
- Generate to an intermediate data structure first, then realize it — building "data, then board" makes the system testable, seedable, and swappable without touching spawn code (PCGUnity).

### Seeds & Reproducibility
- Drive all generation through a PRNG seeded from a stored value — same seed reproduces the same content, so you can discard generated content and regenerate it on demand (PCGUnity).
- Store the seed as a first-class variable, not just system time — recording it lets you recreate a level/dungeon/planet later (e.g. a quest sends the player back) without persisting the full generated artifact (PCGUnity).
- Treat seeded regeneration as a memory-vs-recompute tradeoff — keep the seed + generator equation instead of saving trillions of results, shrinking save data and ship size dramatically (PCGUnity).
- Seed deterministically for debugging (same seed → reproducible sequence) and randomize the seed (clock, input timing) for shipped builds — the same algorithm serves both repeatable QA and live variety. **When it flips:** when reproducibility isn't needed, default to system-time seeding and inject a fixed seed only where you need determinism (GameMath; PCGUnity; SWEngGames; PolishedGameDev).
- Know PRN sequences are cyclic and will repeat — if repetition shows up in content, widen the value/seed range or use a longer-period generator before adding complexity elsewhere (PCGUnity).
- Don't use rand() — create portable, restartable random-number objects; rand() is non-portable, single-stream, and can't be reseeded to a saved state (GPGems2).
- Don't trust the language's built-in RNG (most are low-quality); understand the generator you use or supply a well-vetted one, defaulting to Mersenne Twister (MT19937) for its huge period and spectral quality, and scaling down to multiply-with-carry or a vetted LCG only when memory/speed is at a premium (GameMath).
- Pick the engine-optimized RNG over the general one (Unity.Random vs System.Random) and alias it explicitly per file — avoids accidentally mixing two random sources with different behavior; in parallel/ECS jobs use a deterministic value-type RNG seeded each frame from an outside source (PCGUnity; BulletHell; ECSFundamentals).
- Build procedural noise from a pregenerated random table hashed by lattice coordinates — randomness must be repeatable per location or textures flicker/swim across surfaces (GameMath).

### Determinism & Replay
- Make generation and simulation deterministic for replay/optimization/bug-repro — never change game state in rendering functions, avoid uninitialized data, and approximate async events (compute a sound's end time instead of waiting on hardware); any unpredictable input breaks determinism (GPGems2; PolishedGameDev).
- Give the render loop and the update/generation loop separate RNGs — sharing one with a variable render-per-update ratio makes the generator's state indeterminate and breaks replay/multiplayer (GPGems2).
- Keep the number of RNG calls identical between runs — calling random a different count (twice at 0.1s vs once at 0.2s) desyncs deterministic playback; gate randomness behind a fixed time-step accumulator (PolishedGameDev).
- Treat all software RNGs as deterministic PRNGs you control, not true randomness — exploit that determinism for attract-mode demos, instructional replays, and regression tests (PolishedGameDev).
- Reserve genuine (non-pseudo) randomness for one-time seeds/session keys only — sample many uncorrelated entropy sources mixed with a strong hash (MD5/SHA-1); it's slow, so use pseudo-RNG for everything else (GPGems2).

### Guaranteeing Solvability & Legibility
- Guarantee solvability with an "essential path" before adding variety — connect required entrance to exit first, then branch optional content off it so randomness can never produce an uncompletable level (PCGUnity).
- Guarantee solvability locally when generating endlessly — spawn the next platform relative to character position/direction so a reachable target always exists; never generate an impossible gap (Unity2DCookbook).
- If you can't reason mathematically about a generated puzzle's solvability, write a small AI to brute-force ~1000 randomly generated instances — validates the possibility space before committing, and prototype this riskiest system first (PolishedGameDev).
- Constrain spontaneous/unbounded generators with hard bounds (grid dimensions, direction rules) — random events add fun but unbounded they build off-map or overwhelm the player; bound the possibility space, not the outcome (PCGUnity).
- Enclose finite generated spaces with an explicit impassable border pass — otherwise paths that reach the edge open into invalid blank space; wrap the whole grid one tile thick (PCGUnity).
- Constrain randomness to keep output legible — uniform spacing (sounds on tempo divisions, props on tagged slots) reads as intentional; fully random placement is dissonant and disorienting (PCGUnity).
- Cache and reuse some generated results so players get recognizable patterns — fully unique-everything is costly and disorienting; "all fire swords glow red" gives readable structure because people look for patterns (PCGUnity).
- Use repetition deliberately to control attention — looping a simple generated verse makes music atmospheric/background; not every generated system should maximize novelty (PCGUnity).
- Use the membership "already contains key?" check as the core idempotency guard — before placing a generated tile, test membership so you never overwrite previously placed content (PCGUnity).

### Designer Control over Randomness
- Use randomness as a "decision driver," not a content author — let PRNs choose among designed modules/branches so you offload minor detail decisions (which tree, which tile) while keeping authored quality (PCGUnity).
- Bias directional generation with probability instead of hard rules where you want organic shape — push a path "mostly right" but let PRNs veer it up/down for winding, non-linear results (PCGUnity).
- Expose generation parameters as serialized/public fields (grid bounds, spawn probabilities, module arrays, radius/detail, pitch ranges) — surfacing the knobs in the editor lets designers tune without recompiling, and call probabilities out as named tunables to "experiment with" rather than burying them as constants (PCGUnity).
- Provide an authored base for parametric variation (gray-scale sprite, untextured model) and add color/texture/values programmatically — hand-authored bases keep on-theme quality while code multiplies them (PCGUnity).
- Use chance deliberately for specific dynamics (delay solvability, level the field across skill gaps, increase variety/replay, create dramatic moments, enrich decisions) — never add randomness by reflex; tune it on two axes, frequency and impact, since too much high-impact randomness erases skill and too little leaves a solvable game (Challenges; GameMechanics).
- Prefer emergence over randomness for unpredictability where possible — a deterministic complex system can be unpredictable without dice, preserving skill expression; don't overplan a simulation model, build it by iteration and enjoy what emerges (Dwarf Fortress) (GameMechanics; GameAIPro2).
- Validate that your use of an RNG matches the intended distribution with a chi-square test, and build nonuniform distributions by inverting the CDF — catches biased custom distributions before they skew generated content (GameMath).

### Simulation-Based Generation
- Break a simulated system into independent interacting fields (temperature, rainfall, elevation, drainage) rather than directly defining the end result — their interplay yields natural, internally consistent output and solves some problems automatically (GameAIPro2).
- Base simulation models on real-world analogs — known-good reality (rain shadows, drainage) lets you correct defects from fundamentals given adequate memory/CPU (GameAIPro2).
- Don't overcomplicate the model — operate at the level the player sees or one layer below, and use complexity only where it has meaningful impact; useless variables hinder tuning and paralyze development (GameAIPro2).

### Modular & Combinatorial Generation
- Build large assets from small interchangeable modules (blade + hilt + handle) combined at runtime — a few authored parts yield exponentially many wholes (N parts per slot across S slots = N^S results), so output scales exponentially while ship size grows linearly (PCGUnity).
- Add per-module differentiation parameters (color tint, value mods, vertex offsets) on top of swapping — multiplies uniqueness without new art, and reuse one prefab + script to morph into many data-defined variants (PCGUnity).
- Align modular sprites with shared bounding boxes / common pivot points so arbitrary combinations overlay, render, and animate coherently without per-combo math (PCGUnity).
- Parameterize counts and spacing instead of hardcoding (spawnCount, spawnOffset) and drive variation from the loop index — the same system makes a dense row or a sparse line by data alone, the seed of procedural layout (CSharpForUnity).

### Tooling & Expressive-Range Analysis
- Build expressive-range analysis for any generator — define measurable content metrics, generate a large sample, and visualize the distribution (histogram/heatmap) to reveal generator bias and compare versions after small changes (GameAIPro2).
- For surprising/searchable content, prioritize perceived variety over raw count — a million pieces are worthless if they feel the same; inject hand-authored pieces or careful grammar weights (GameAIPro2).
- Spend tuning effort on the propagation/generation choices and weights, not on adding raw structure — most of the intelligence in influence maps and content generators lives in those weights (GameAIPro2).

### Generation Performance & Robustness
- Default to a dictionary keyed by coordinate (Vector2 → tile data) for runtime grids — it grows itself, looks up in near-constant time, and lets you cheaply ask "is this cell already placed?"; pick array vs linked-list vs dictionary by whether generation is dynamic and how you query (PCGUnity).
- Track worst-case iteration of a generator (a 100×100 grid loop = 10,000 cells) and cap input size accordingly — understand worst-case to set practical limits, since dungeons over ~200×200 load too slowly (PCGUnity).
- Mind time and space complexity explicitly, especially for 3D meshes — an extra inner loop over all vertices turns generation from instant to minute-long, and too many vertices can exceed hard limits and break outright; pick the cheaper-to-realize variant of a shape when one exists (PCGUnity).
- Object-pool / dedupe generated tiles via the membership check so you never recreate existing content, and bake combined modules into a single sprite/GameObject for production — many GameObjects per asset hurts performance, especially on mobile (PCGUnity).
- Clean up generated content on context switch (destroy a dungeon board and its enemies on exit; clear lists; reparent spawns under a holder transform) — bounded, non-revisitable content should be freed to keep tracked-object counts and memory low (PCGUnity).
- Generate set pieces procedurally at runtime rather than storing them as prefab art when they must fit anywhere — saves memory and guarantees they fit the grid, at the cost of more code (PCGUnity).
