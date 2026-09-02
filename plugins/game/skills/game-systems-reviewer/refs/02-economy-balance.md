# Internal Economies & Balance

## Internal Economies & Resource Flows

### Defining the Economy
- Model every game as an internal economy of resources produced, consumed, and exchanged in quantifiable amounts — health, XP, ammo, time, reputation, even "strategic advantage" are economic resources, not just money (GameMechanics; IntroGameDesign; GDEssentials).
- Define an economy as two looping meaningful decisions — how to earn "money" and how to spend it, where "money" is anything tradeable (skill points, energy, ammo); depth lives in those two choices (AoGD3; AoGD2).
- Make the earn→spend loop ratchet forward — players spend to earn more in an alternating pattern that propels progress like walking on two legs (AoGD2).
- Build an economy from items of exchange, agents of exchange, and methods of exchange — currency is optional; barter accomplishes the same trade goals (GDWorkshop).
- Own the economy yourself — it is the one design task that belongs solely to the designer (physics needs programmers, levels need writers), so design it deliberately (GameMechanics).
- Name the main resources FIRST, then describe the mechanisms that produce/consume/relate them — resources are the nouns, mechanics the verbs (GameMechanics).
- Engineer endogenous value: in-game items/scores matter only because the system makes them matter — strong systems generate high internal value, the proof being that imaginary items get traded for real money (AoGD3; AoGD2; TheoryOfFun).
- Tie every resource and reward to the player's actual motivation/objective — Sonic's rings buy lives and protection, Bubsy's yarn balls advance nothing and get ignored; an economy disconnected from winning is decoration (AoGD3; AoGD2; GDWorkshop; TheoryOfFun).
- Treat reward as a first-class system input — "if there isn't a quantifiable advantage to doing something, the brain will discard it"; every action needs a reason in the economy (TheoryOfFun).

### Resources: Classifying What Flows
- Treat anything measurable numerically as a resource; treat fixed/inactive level features (walls, platforms) as NOT resources — they don't flow (GameMechanics).
- Model everything tradeable/consumable as a uniform `<id, amount>` resource — abstract resources (people, crime, fire risk) and concrete ones (gold, bread) share one mechanic, maximizing composability (GameAIPro2).
- Classify resources tangible (has a location, must be moved) vs intangible (just a number, usable anywhere) — switching between the two (trees→lumber, medkits→HP) changes what logistics the player must manage (GameMechanics).
- Classify resources concrete (earned/spent, a real commodity like XP) vs abstract (computed from state, never shown — "strategic advantage," "altitude") — abstract resources let you reason about positional value as flows (GameMechanics).
- Require every resource to have both utility and scarcity — useless resources are noise, over-abundant resources lose value; control access to maintain challenge (GDWorkshop; IntroGameDesign).
- Make resource scarcity drive the core decisions — meaningful play often reduces to "spend this limited thing wisely" (IntroGameDesign).
- Make key resources versatile (Prince of Persia sand: rewind, freeze, combat aid) so players spend them where they personally need help most — one mechanic, more expressive choice (GameMechanics).
- Store resources in bins/entities attached to distinct owners (player inventory, each building, each map tile) — lets the same rule operate on self, ground, and global stock uniformly (GameAIPro2; GameMechanics).

### Sources, Drains, Converters, Traders
- Build economies from four mechanic types: sources (create resources from nothing), drains (remove permanently), converters (turn one resource into another at a rate), traders (swap resources between entities per an exchange rule) — every economy is these four plus flows (GameMechanics; IntroGameDesign).
- Distinguish converters from traders: converters create/destroy (trees→lumber), traders only move/exchange (gold↔shield) — keep the two concepts separate in code and design (GameMechanics).
- Add deliberate drains (spoilage, ammo cost, resale loss, time limits) to keep resources scarce — un-drained economies inflate and lose tension (IntroGameDesign; GDWorkshop; RPGDirectX).
- Require resource outflow > inflow for any finite stockpile — an M/M/1 queue (and a merchant's inventory) stays bounded only when remove_rate > add_rate (GameAIPro2).
- Keep resource-source conventions in data, not code — "gold comes from the ground" should be a rewritable rule convention, not a hard-coded engine fact (GameAIPro2).
- Let upgrades/tech improve converter efficiency (more output per input) as a clean, data-tunable progression lever (GameMechanics).
- Make production-chain feedback loops the core fun: workers power buildings but demand escalating processed goods and leave if unsatisfied — the "spinning plates" tension comes from sources, converters, and drains interacting (GameAIPro2).
- Model a player's assets as a resource-allocation tree (Military/Economic/Intelligence → subroles → unit leaves); compute "desired" allocation top-down and "current" bottom-up, then compare per node to see where you are over/under budget (GPGems2).
- Handle multi-resource economies carefully — a single allocation value doesn't map to one resource when units cost differing amounts of gold/energy/etc (GPGems2).

### The Four Economy Parameters
- Decide four economy parameters explicitly — amount of product (fixed vs controlled growth), money supply, price-setting (fixed/market/capped), and trading opportunities (open vs restricted) — these classify and balance any economy (GDWorkshop).
- Control product inflow to prevent hoarding and stagnation (Catan's 7-roll discard; Ultima switching from self-recycling to designer-controlled flow) — players will hoard and break self-regulating economies (GDWorkshop).
- Decide universal vs specialized currency deliberately per game need — it affects depth and exploitability of earn/spend choices (AoGD3; AoGD2).
- Tune the rate and routes of money creation and the ways to earn/spend — economies are living systems that are hard to control (AoGD3).

### Currency, Pricing & Trade
- Cap or floor prices via a system agent (Catan bank trades 4:1; MMO shopkeepers always buy) — base prices keep low-level "employment" steady and prevent runaway market values (GDWorkshop).
- Use market value (player-set prices, supply/demand) when you want emergent game-to-game variation; use fixed values when you want a stable social trading frenzy (Pit) — choose per intended experience (GDWorkshop).
- Restrict trade opportunity (by turn, partner, amount, timing) as a balance lever independent of price — Catan keeps an open price market but gates it by turn (GDWorkshop).
- Model a merchant's inventory as one M/M/1 queue per item type (add_rate = buy rate, remove_rate = sell rate) — generates random-but-consistent stock respecting supply/demand without simulating the whole economy (GameAIPro2).
- Sample merchant stock from the stationary distribution on first encounter and the transient distribution thereafter, folding in "virtual observations" for offscreen events (restocks, new mines) — gives realizations consistent with the player's prior observations and elapsed time (GameAIPro2).
- Reserve a guaranteed minimum stock the player can always buy and model how it recovers over time — prevents the frustration of long journeys to find items out of stock (GameAIPro2).
- Model currency as a simple count with no denominations, give each item one buy Price, and derive sell price as a fraction (e.g. half) — one number drives the whole shop economy; resale loss is a natural drain (RPGDirectX).
- Encode shop stock scarcity via quantity (≥2 = unlimited restock, 1 = one-time sale) — control rarity with the same field that tracks counts (RPGDirectX).
- Manage persistent/secondary markets (MMO real-money trades, Magic card market) as part of design — players create markets you don't control; rarity is your main lever over them (GDWorkshop; AoGD2).
- Audit multiplayer/trade-enabled economies for collusion and exploit holes — players pooling/trading can break an economy that looks fine solo (AoGD3; AoGD2; GDWorkshop).

### Feedback Loops
- Define feedback as a real coupling between an interaction's output and a change to another system element — not just information shown to the player (GDWorkshop).
- Use negative (balancing) feedback to create equilibrium and stability, delaying premature resolution and keeping losers in contention (score → pass turn; football possession swap; Catan 7-roll discard) (GameMechanics; GDWorkshop).
- Use positive (reinforcing) feedback to drive games to a conclusion once a critical difference exists — reinvested output compounds (StarCraft SCVs buy more SCVs), and nobody wants to keep playing after the winner is clear (GameMechanics; GDWorkshop; IntroGameDesign).
- Beware positive feedback on destructive mechanics = a "downward spiral" (losing chess pieces makes you lose more) — it accelerates a losing player's collapse, often unfairly; counter it with negative feedback on the destructive side (Half-Life spawns more health packs when HP is low) (GameMechanics).
- Make equilibria DYNAMIC — feed a negative-feedback loop from the DIFFERENCE between players, not absolute values — produces a moving target that resists predictable, gameable balance and shifts the gap rather than absolute scores (GameMechanics).
- Implement rubberbanding as negative feedback on relative position, preferring subtle mechanics over crude speed clamps — Mario Kart gives trailing players better power-up odds and makes the leader the most-targeted, keeping trailers engaged and outcomes uncertain (GameMechanics; IntroGameDesign; AoGD2; GDWorkshop).
- Give comeback mechanics so a weaker side can recover (tickets, gang-up-on-leader, random external events) without letting them stagnate into perpetual stalemate (GDWorkshop; AoGD2). **When it flips:** use positive feedback sparingly to accelerate the end-game and avoid drawn-out stalemates (IntroGameDesign).
- Make player inputs influence the economy FREQUENTLY but with no single input too large — frequent small inputs create rich variation without destabilizing balance (GameMechanics).
- Use a small number of well-chosen feedback loops; distinguish major from minor loops and design their interaction deliberately rather than piling on loops (GameMechanics).
- Characterize each feedback loop by its profile — investment (cost to trigger), return, speed, range, durability, and type (constructive/destructive, positive/negative) — and tune along these axes rather than ad hoc (GameMechanics).
- Watch for deadlocks/mutual dependencies created by positive feedback (need minerals to make SCVs, need SCVs to get minerals) — a wiped-out resource can permanently stall production; design recovery or exploit it for level design (GameMechanics).
- When the climax passes, let the scales tip dramatically and end fast — a sweeping victory satisfies; a dragged-out ending bores both winner and loser (GDWorkshop).
- Diagnose stagnation as a trapped reinforcing/balancing loop (debt eats all profit; everyone smashes the leader) — break it with a windfall, disaster, debt relief, or a power-tipping condition (GDWorkshop).

### Economic Building-Block Patterns
- Treat recurring economic structures as named, composable design patterns documented with a fixed template (Name, Intent, Motivation, Applicability, Structure, Consequences, etc.) — a shared vocabulary for the deep structures that generate challenge and feedback (GameMechanics).
- Know the ENGINE patterns — Static Engine (steady fixed flow), Dynamic Engine (player tunes/invests to grow production), Converter Engine (chained converters drive production), Engine Building (build capacity that compounds) (GameMechanics).
- Know the FRICTION patterns — Static Friction (constant drain resisting growth), Dynamic Friction (drain scaling with player strength = a negative-feedback brake), Stopping Mechanism (drain that halts runaway growth), Attrition (mutual drains, last-standing wins), plus diminishing-returns brakes (GameMechanics).
- Know the ESCALATION patterns — Escalating Challenge (difficulty rises with progress), Escalating Complexity (more elements to juggle until failure, e.g. Tetris), Arms Race (mutual positive-feedback buildup), Playing-Style Reinforcement (system entrenches a chosen play style) (GameMechanics).
- Know the interaction/economy patterns — Trade (exchange between players/markets), Worker Placement (allocate limited action tokens), Slow Cycle (long-period oscillation), Multiple Feedback (layered loops) — use these for multiplayer and strategic texture (GameMechanics).
- Combine and NEST patterns (elaborate a node into a sub-pattern) to build complex systems from understood parts — compose, don't reinvent (GameMechanics).
- Use patterns as a brainstorming and analysis tool — scan a target game's mechanics for known patterns to diagnose its dynamics, or pick a pattern to seed a new design (GameMechanics).

### Reading the Economy as Fortune-Over-Time
- Chart player fortunes over time and read the SHAPE, not the instantaneous noise — at small scale lines are chaotic, at large scale patterns (rises, crashes, plateaus) become legible like a stock chart (GameMechanics).
- Accept there is NO single "good" shape — the desired shape depends on your goals (long grind to victory vs quick reversals); design the economy to PRODUCE the shape you want (GameMechanics).
- Recognize phase structure in shapes (chess: opening = slow material loss while building advantage; middle = sharp decline; endgame = stabilization) and map your economy's stages to intended pacing (GameMechanics).
- Use the direct relationship between mechanical structure and emergent shape — pick the mechanism (negative feedback, positive feedback, friction) that yields the target curve (GameMechanics).
- Remove randomness first to reveal the deterministic skeleton of an economy (deterministic Monopoly shows the underlying trend), THEN add it back and observe its effect on outcomes/variance (GameMechanics).

### Reward Schedules & Acclimation
- Use dopamine motivation (anticipation of reward) to push players through unpleasant-but-essential moments — without it they quit at first failure; virtual rewards work because the brain has no system distinguishing real from in-game payoffs (DesigningGames).
- Schedule rewards on a variable/random-ratio (unpredictable) basis rather than fixed-interval or fixed-ratio — the always-a-chance-of-the-big-drop-next-action keeps activity high; fixed-ratio creates "shelf" moments right after payoff (DesigningGames; GDWorkshop; AoGD3; AoGD2).
- Superimpose many desynchronized reward schedules so at least one is always near payoff ("one more turn") — prevent players from focusing on one schedule, or they sync them into a giant shelf moment (DesigningGames).
- Counter reward acclimation by escalating reward magnitude through the game (works even when players know the trick) and by making rewards variable instead of fixed (1/3 chance of 30 pts beats always 10 for the same average) (AoGD3; AoGD2; DesigningGames).
- Align rewards with intrinsic desires — extrinsic rewards displace/destroy intrinsic motivation, worst on creative/exploratory tasks; only reward what the player already wants to do (DesigningGames).
- Build crafted reward systems that detect and reward everything the player wants (Skate 3 scores every flip/grind/airtime ms) plus special modes for nonstandard goals (DesigningGames).
- If a game's valued activities can't be detected (creativity, friendship, exploration in Dwarf Fortress/SimCity), use no reward system — any system would destroy more motivation than it creates; avoid building pure compulsion machines (Cow Clicker) (DesigningGames).
- Most reinforcement schedules are emergent from lower-level systems, not authored (chess capture-pacing, deathmatch kill-count variance) — tune the systems to shape them (DesigningGames).
- Make rewards carry weight via in-game utility, romantic/thematic association, and story-line ties; ensure players understand a reward — an unintelligible reward is no reward (GDWorkshop; AoGD3).
- Use the full reward palette (praise, points, prolonged play, gateway/access, spectacle, expression, powers, resources, status, completion) and combine types — more reward types is generally better (AoGD3; AoGD2).
- Add peer recognition as a reward type that can't be delivered like a pellet — broadcast achievements, track scores, surface brilliant maneuvers so even non-winners feel acknowledged (GDWorkshop).
- Reward many distinct skilled actions with score, and don't be stingy — "the more aspects of the game that affect the score, the better"; couple score milestones to health/level-ups for long-horizon goals (SWEngGames).

### Earn-and-Spend Loops in Practice
- Bolt an internal economy onto action games for rewards/power-ups — even a score system makes players weigh "is this enemy worth the ammo/risk?" (GameMechanics).
- Place liberal collectibles (coins) when their economy is loose enough that adding/removing them in playtest doesn't unbalance the game — use them as "breadcrumbs" to guide and reward skillful routing (GameMechanics).
- Match risk to reward, especially near novice paths — luring players into deadly traps for a single coin feels cheating, and a visible-but-unreachable reward is worse (it baits unwinnable risk) (GameMechanics).
- Use power-ups/abilities as resources that produce the abstract resource "access" (double-jump → reach new platforms) to gate progression economically (GameMechanics).
- Treat experience points as the core progression currency (monsters grant XP, thresholds raise levels, levels grant stat/spell rewards) and tune XP thresholds against the average XP of the area's monsters, not arbitrary numbers (RPGDirectX).
- Use cumulative-outcome resources (XP/levels) for long-term progression and immediate-outcome resources (per-round score) for moment-to-moment feedback — combine timescales for pacing (IntroGameDesign).
- Build advance-and-setback rhythm into the economy — conflict requires both gains (kills, pickups) and losses (damage, penalties); convert defeated entities into time-pressured pickups so a drain becomes a reward sub-loop (SWEngGames).
- Tie reward magnitude to spawn rarity with a probability ladder (common/weak → rare/strong), randomizing values within a tier-bounded range — rarer drops carry bigger stat ranges so scarcity self-balances against power (PCGUnity).
- Clamp resource gains to caps (don't exceed max health) inside the grant function, and recompute derived stats by summing the full equipped set on each change — keeps the economy from overflowing or drifting when sources fire or items swap (PCGUnity).
- Drive win/loss as resource thresholds — count a source toward a goal and a drain (lives) toward zero, then trigger the matching state; economies decide exit conditions (Unity2DCookbook).
- Deduct a drain for every action: mana cost on cast, charge that refills over time gating attacks/spells/items — paces spending so players can't spam (RPGDirectX).

### Economy-Driven Progression & Strategy
- Use the economy to add STRATEGIC depth and reward long-term investment/planning — strategy needs forward planning and investment; without it you only have tactics (GameMechanics).
- Give strategy economies multiple resources and many interlinked feedback loops — but expect this to be hard to balance and to need re-tuning even post-launch as players find new strategies (GameMechanics).
- Treat PROGRESS itself as a resource for "emergent progression" — measure progress as distance-to-target, character/player growth, or journey, and produce it indirectly via the economy (Elite, Catan, Power Grid) so progression emerges from play rather than scripting (GameMechanics).
- Grow the probability space via economic complexity to add replay value and personalization — more options to explore than one playthrough can exhaust; size it so it can't be fully explored in one session (GameMechanics).
- Make customization choices MUTUALLY EXCLUSIVE (one class, invisibility OR armor) so choices carry real consequence, and balance them with negative feedback (RPGs escalate XP cost per level) or one dominant build collapses the space (GameMechanics).
- When XP/upgrade sources are non-renewable, account for every distribution of how players could have spent them when balancing each level (GameMechanics).
- Guard against progression deadlocks from consumable keys (run out of special-weapon ammo before the gated enemy) — provide renewable sources; Zelda scatters replenishing pots that yield any needed resource and double as hint delivery (GameMechanics).
- For builder/management sims, assemble a TOOLBOX of mechanics players combine many ways, introducing a few at a time to control the probability space (Civilization locks most blocks behind unlocks) — harder than one balanced economy because you must anticipate all combinations (GameMechanics).
- Anticipate "meta-economic structures" — dominant combinations players quickly find and copy (SimCity's ideal zone mix); design so early-dominant patterns stop working later (slow destructive positive feedback like pollution) and use maps/terrain/random disasters to deny the dominant build (GameMechanics).

### Balancing & Tuning the Economy
- Balance the economy across all the other balance types at once — fairness, challenge, choice, chance, cooperation, time-to-earn, reward, punishment, freedom — economies are living systems that are hard to control (AoGD3; AoGD2).
- Run automated simulated playtests — add artificial players with scripted strategies (rusher vs turtle) and run thousands of iterations in seconds to measure balance empirically, then tweak numeric values (costs, rates) and re-simulate until win-rates and game length match goals (GameMechanics).
- Use randomness with intent on two axes — frequency (how often) and impact (how much) — to force improvisation and counter dominant strategies; too much high-impact randomness erases skill, too little leaves a solvable game (GameMechanics).
- Prefer emergence over randomness for unpredictability where possible — a deterministic complex system can be unpredictable without dice, preserving skill expression (GameMechanics).
- Build balance in a spreadsheet first (probability distributions, damage tables, weapon stats) before touching code, and keep the model live so changing inputs recomputes derived columns instantly — math reveals imbalance faster and cheaper than playtesting alone (IntroGameDesign; GDWorkshop).
- Maintain spreadsheets whose structure mirrors the game's subsystem structure, with interconnecting tables per subsystem — they are both the design starting point and the tuning endpoint (GDWorkshop).
- Limit the power of a strong consumable (Molotov, area attack) by capping affected agents — a too-effective drain trivializes encounters; balance cost-to-craft against capped effect (GameAIPro2).
- Verify every economy item alone, then in combination — a new sword must add the damage it claims; in a deep upgrade economy the permutation count exceeds human capacity, so script exhaustive verification (QATesting).
- Hunt and kill dominant strategies/exploits — once found, the puzzle is solved and the game dies; rebalance to restore meaningful choice (AoGD3; AoGD2; GDWorkshop; DesigningGames).
- Expect to keep balancing the economy after launch — a million players surface imbalances and creative techniques no internal test predicted; build economies you can keep tuning post-ship (GDWorkshop; AoGD2; GameMechanics).
- Validate guessed model parameters (queue rates, influence constants) with a fast standalone test app over many timescales — don't trust hand-tuned stochastic parameters without observing their behavior (GameAIPro2).
- Expose economy parameters as serialized/named tunables (spawn probabilities, costs, rates, ranges) so designers tune without recompiling, and persist designer experiments through a data asset so found values survive exiting play mode (PCGUnity; EditorScripting; IntroGameDesign).

### Punishment, Loss & Risk in the Economy
- Use punishment to create endogenous value (losable resources are worth more), enable exciting risk-taking, and raise challenge — but apply it delicately; players are there voluntarily (AoGD3; AoGD2).
- Prefer turning punishments into rewards — Diablo replaced "hunger penalty" with "eating gives a temporary boost"; same activity, positive framing, stronger reinforcement (AoGD3; AoGD2).
- Make all punishment understandable and preventable, and rarely make loss-of-points punishment (it cheapens earned points) — random, unstoppable punishment reads as "unfair" and players quit (AoGD3; AoGD2).
- Use the threat of punishment more than punishment itself (Thief stealth tension) — looming consequence adds drama to trivial actions without driving players to quit (GDWorkshop).
- Use loss-of-granted-resource as a motivational lever (give an item/ally/property then remove it) — designed loss drives engagement harder than designed gain (LevelDesign).
- Give failure a cost — at minimum an opportunity cost, with no free do-overs; failure with no consequence removes the learning signal (TheoryOfFun). **When it flips:** never punish the player himself (loading screens, grinding, replays) — punish the character, deny success, or impose small setbacks while play keeps moving forward (DesigningGames).

### Economy as Meaning & Community
- Make the economic rules carry the designer's statement — power-from-controlled-people vs healing-from-friends (with friends falling away as you gain power) is expressible in math and is the authorial content; feedback loops are where meaning lives in a system (TheoryOfFun; GameMechanics).
- Use the victory condition to redirect economic incentives — change what the system rewards (tribe survival, colony success in M.U.L.E.) so dominant strategies become genuine choices rather than forced optima (TheoryOfFun).
- Use an underlying economy as community-building infrastructure — it turns socializing into a game and gets players to interact (GDWorkshop).
- Beware the Mastery Problem / "rich get richer" loop in iterative zero-sum games — the winner's compounding lead makes a novice's position unwinnable, and players will "bottom-feed" (farm weak opponents) to make outcomes predictable; add negative feedback or matchmaking so exploiting the loop is unprofitable or capped (TheoryOfFun).

## Balance & Tuning Systems

### Dominant & Degenerate Strategies
- Hunt and kill dominant/degenerate strategies — once one option is clearly best the puzzle is solved and meaningful choice dies; rebalance to dissolve it, and cherish the disorienting moment the dominant strategy disappears because the game just improved. (AoGD3; AoGD2; DesigningGames; GDWorkshop; IntroGameDesign; TheoryOfFun)
- Expect degenerate strategies to hide in emergent tool interactions, not in the obvious knobs — players will find the Morrowind intelligence-potion singularity even when you can't; design with the assumption they will. (DesigningGames; AoGD3)
- Forbid "super units" that make all other choices irrelevant, and keep similar objects proportional in power — a globally dominant object collapses the possibility space. (GDWorkshop; AoGD2)
- Treat a puzzle as a game with a dominant strategy (a fun problem with a right answer) — once solved it stops being fun, so reserve solvable cores for puzzles, never for the replayable system. (AoGD3; AoGD2)
- Distinguish a true dominant strategy (one best attack, optimal tic-tac-toe) from a player's favorite-but-not-always-effective strategy — only the former must be eliminated or obscured. (GDWorkshop)
- Recognize a strategy can be degenerate at one skill level and balanced at another (StarCraft rushes, tic-tac-toe) — choose which skill level you balance for and accept imbalance at the others. (DesigningGames)
- Prefer fixing the system over policing players — a design that lets players circumvent the intended challenge is the design's fault; rectify via better rules, not rule-lawyering, and don't resent legal-but-unintended loophole play. (TheoryOfFun)
- Use the victory condition to redirect incentives so dominant strategies become genuine choices — M.U.L.E.'s colony-wide win condition turned individual wealth-hoarding from a forced optimum into one option. (TheoryOfFun)
- Determine the optimal strategy yourself, then tune so no single line dominates — if one strategy always wins, the system is broken by definition. (IntroGameDesign; GDWorkshop)
- Reject the viable-strategy-counting fallacy — two viable strategies suffice; more add complexity not depth (RPS-lizard-Spock), so enrich the thought process rather than multiplying options. (DesigningGames)

### Symmetry vs Asymmetry & Fairness
- Decide symmetrical vs asymmetrical deliberately — symmetric games are auto-fair and cleanly measure who's best; asymmetric games simulate reality, expand the possibility space (10×10 pairings = 100 matchups), personalize, level the field, and create intrigue, but cost far more balancing work. (AoGD3; AoGD2; DesigningGames)
- For asymmetric balance, assign point values to each resource/power and equalize totals, then playtest to discover which factors are worth more (firepower 2×), revise the model, and rebalance. (AoGD3; AoGD2; DesigningGames)
- Make asymmetric powers fair by tuning to roughly equal win probability, not identical resources (Scotland Yard, NetRunner, C&C Generals) — asymmetry models real conflict and must still be fair across a whole game. (GDWorkshop; DesigningGames)
- Balance asymmetric powers via paired strength + weakness and rotational-symmetry / RPS payoff matrices so each option counters another and none is globally dominant. (GDWorkshop)
- Allow deliberate, purposeful unfairness when it's the point (historical scenarios, "fair isn't funny" Cosmic Encounter) — intentional asymmetry is valid as long as it's chosen, not accidental. (DesigningGames)
- Neutralize first-move advantage in symmetric games — low-impact opening moves (chess weak pieces, four-row separation), a compensation rule (Go komi, Hex pie/swap), a longer game, or injected chance (dice). (GDWorkshop)
- Resolve unavoidable small asymmetries (who goes first) by random selection, or hand the advantage to the weaker player (youngest first) to balance skill levels. (AoGD3)
- Balance multiplayer primarily around the start-of-game distribution of resources/powers; balance single-player around matching system challenge to target-audience skill. (GDWorkshop)
- Tune multiplayer for neutral symmetry — neutral maps, weapons equal in power (or compensated by the wielder's character), fair spawn points; any asymmetry must be intentional and compensated. (QATesting)
- Negative-feedback-balance team matchmaking by boosting/equalizing skill ratings before a match — players enjoy uncertain outcomes against similar-skill opponents. (GameAIPro2)

### Transitive vs Intransitive Balance (RPS & Counters)
- Use Rock-Paper-Scissors structure so every element has a counter and nothing is supreme — each option has strengths and weaknesses. (AoGD3; AoGD2; GDWorkshop)
- Use RPS (symmetric) and matching-pennies (asymmetric) as the only elegant no-equilibrium patterns — adding symbols (RPSLS) adds learning cost, not decision interest. (DesigningGames)
- Engineer strategy interactions to have many or no pure Nash equilibria — one pure equilibrium = solved/monotonous (no reason to read opponents); zero = a constant premium on anticipation and deception. (DesigningGames)
- Fold elemental/class matchups into resolution as rock-paper-scissors depth (fire ×2 vs weak class, heal-for-half if attacker shares the target's element). (RPGDirectX)

### Cost Proportional to Power & Triangularity
- Add triangularity (low-risk/low-reward vs high-risk/high-reward) — roughly 8 of 10 "not fun" prototypes are missing this, making it the single most common fix; balance it with expected value (Qix half-speed = 2× points). (AoGD3; AoGD2)
- Find each tool's identity-defining properties, push them to the extreme, and lock them — balance only by turning the OTHER knobs (a rocket pack must launch fast, so change price/weight/fragility instead). (DesigningGames)
- Cut as deep as needed — if a tool can't be balanced without changing its key properties, cut it; better no rocket pack than a pointless slow one. (DesigningGames)
- Keep peaks and valleys ("turn it to 11") — a flat balanced landscape is meaningless; reward high skill with high-effectiveness peaks gated by skill cost. (DesigningGames)
- Differentiate every option organically and verify each pulls its weight (Civilization nations have distinct strong suits) — if an agriculture-strong civ underperforms, the system is unbalanced; every distinct option must be viable. (QATesting)
- Tie reward magnitude to spawn rarity with a probability ladder (common/weak → rare/strong) so the economy self-balances scarcity against power. (PCGUnity)
- Match risk to reward, especially near novice paths — luring players into deadly traps for one coin feels like cheating, and a visible-but-unreachable reward is worse because it baits unwinnable risk. (GameMechanics)
- Make customization choices mutually exclusive (pick invisibility OR armor) so each carries real consequence, and damp divergence with negative feedback (escalating XP cost) so no single build collapses the space. (GameMechanics)

### Expected Value & Probability as a Balancing Tool
- Use expected value (Σ chance × value) as a primary balancing tool, but measure the REAL value — a 40-dmg attack vs a 15-HP enemy is worth only 15, and capped damage, hidden penalties, and unusable benefits must be captured. (AoGD3; AoGD2)
- Quantify intangibles (boots of speed, a warp gate) even by guessing — forcing concrete value estimates puts you in control of balance; refine across test iterations. (AoGD3)
- Choose your probability distribution curve deliberately — summing multiple random selections (3d6) clusters around the middle and feels nothing like a single d20; pick the curve for the feel you want. (AoGD3; AoGD2; IntroGameDesign)
- Track perceived probability, not just actual — players misjudge odds, overweight rare/dramatic outcomes, and form false "perceived probabilities" from small samples that drive their behavior. (AoGD3; AoGD2)
- Account for regret and risk asymmetry (Kahneman/Tversky) — players take sure gains but gamble to avoid sure losses, so don't assume pure EV maximization. (AoGD3; AoGD2)
- Prefer variable rewards over fixed ones — a 1/3 chance of 30 points stays exciting far longer than a flat 10 for the same average payout. (AoGD3; AoGD2)
- Use randomness with intent on two axes, frequency (how often) and impact (how much) — too much high-impact randomness erases skill, too little leaves a solvable game; prefer emergence over dice where you can keep unpredictability without sacrificing skill. (GameMechanics)
- Blend chance and rule-based resolution to taste (WarCraft II damage = rule-bounded range, then randomized within it) — pure random kills strategy, pure deterministic kills suspense. (GDWorkshop)
- Build balance in a spreadsheet first — compute per-shot percent-to-hit, average damage, and DPS on a common metric and chart options side by side; duplicate a weapon's formula row to evaluate variants, and keep the model live so tuning recomputes instantly. (IntroGameDesign; GDWorkshop)
- Avoid payoff structures with a clear optimal/minimax strategy (cake-cutting) and engineer non-zero-sum dilemmas instead (Prisoner's Dilemma) — true dilemmas have no optimal answer and resonate. (GDWorkshop)

### The Numerical Model Co-Evolving with the Game
- Let model and balancing co-evolve — balancing teaches you the real relationships, which improves the model, which guides further balancing in a virtuous circle (Biplane Battle weighting firepower). (AoGD3; AoGD2; DesigningGames)
- Document your model of how the tuned values relate and update it whenever an experiment defies it — written observations and relationships accelerate balancing. (AoGD3; AoGD2)
- Train your balancing intuition by guessing exact values (13.8, not "around 13") before testing — each precise guess plus result sharpens future estimates. (AoGD3; AoGD2)
- State the balance problem clearly before tuning — most balance messes come from jumping to solutions before defining the real problem. (AoGD3; AoGD2)
- Maintain spreadsheets whose structure mirrors the game's subsystem structure, with interconnecting tables per subsystem — they are both the design starting point and the tuning endpoint; lay them out jointly with programmers. (GDWorkshop)
- Test enough (10–20+ sessions) to build a systems model, not a few anecdotes — only then can you predict a change's full ripple; think in relationships, not in the threads you happened to see. (DesigningGames)
- Apply "purity of purpose" / modularity — give every component one clearly-defined mission so tweaking one element changes one aspect, making balancing methodical instead of guesswork. (GDWorkshop)
- Design new mechanics to enforce a desired play pattern when tuning numbers alone fails (WarCraft III "upkeep" to make heroes matter and discourage huge armies) — sometimes balance requires a new system, not a number. (GDWorkshop)

### Ripple Effects & Change One Variable at a Time
- Change only one variable at a time and retest the whole system — multiple simultaneous changes make cause and effect untraceable. (GDWorkshop; QATesting)
- Isolate the variable under test — test weapons on a neutral map, test maps with everyone on the same weapon class; confounded variables produce un-actionable tuning data. (QATesting; GDWorkshop)
- Always swap sides and re-run after a balance pass — match tester count and skill on each team, play ≥1 hour, log scores and per-option strengths/weaknesses, then switch teams/weapons and repeat; one-sided data lies. (QATesting)
- Expect every tuning change to ripple through all strategies a mechanic touches — a good game is a nonlinear emergent system ("chessmen linked by rubber bands"), and elegance makes this worse because tightly interacting mechanics mean every change cascades. (DesigningGames)
- Re-derive dependent variables whenever you resize the system — a bigger Connect Four grid forces more units, longer time, less contention, and less excitement; scope changes cascade through the whole experience. (GDWorkshop)
- Balance proportionally across coupled systems — a hero's power must scale to the typical number of units on the field; change one and you must re-derive the other. (GDWorkshop)
- Don't be reactive — single-problem fixes push bubbles around the wallpaper; slow down, consider implicit goals (problems you don't yet have), and make changes that solve more than they cause. (DesigningGames)

### Doubling & Halving
- Use doubling and halving when a value seems off, not ±10% — big swings make the variable's effect feel immediately and quickly locate the boundaries of good balance (Sid Meier's rule). (AoGD3; AoGD2)
- Tune against a reference point, then converge — CoD3 set all weapon values to Halo 2 levels, found it too arcade-ish, then pulled back toward CoD values; bracketing two extremes locates the fun midpoint faster than guessing. (QATesting)

### Exposed Runtime Parameters
- Plan to balance from the start: build in exposed, runtime-tunable parameters for the values you know you'll adjust — half of dev time goes to balancing and tiny values matter (Halo sniper 0.5→0.7s). (AoGD3; AoGD2; GameMechanics)
- Build a generic "tweaker" so designers adjust variables live with near-zero overhead — exposing a variable should take <10 lines, store only a pointer plus type info and optional min/max, range-check on set, and the variable's users shouldn't know the tweaker exists. (GPGems2)
- Hoist every tunable number into a named static/serialized field, never a raw magic number in logic — type-checked, namespace-safe, self-documenting, and editable without recompiling; prefer statics over #define so values can change at runtime (bump global MAXSPEED per level). (SWEngGames; IntroGameDesign)
- Move tunable parameters (gravity, music, difficulty knobs) out of behavior classes into standalone shared data assets — one settings asset referenced by many entities retunes every consumer at once, ideal for difficulty tiers and feel presets. (EditorScripting; IntroGameDesign)
- Persist designer experiments made during play — route runtime tweaks through a data asset so discovered values survive exiting play mode; the "I found the magic number but I was in Play mode" loss is a data-architecture failure. (EditorScripting)
- Save tweaked values back to headers/config that both debug and release builds include — tweak only in debug yet ship the tuned constants. (GPGems2)
- Expose generation/feel parameters (grid bounds, spawn probabilities, fire rate, speed, lerp rates) as serialized fields in the editor — every magic number that affects feel should be a tunable field so non-programmers iterate live without recompiling. (PCGUnity; IntroGameDesign)
- Validate and clamp every parameter a system consumes at the authoring boundary — a custom inspector is the cheapest place to make invalid system states unreachable. (EditorScripting)
- Group interdependent tunables in one file and store level-varying parameters in parallel arrays with a single setLevel() that plugs them all in — keeps comparison easy and flag/bit values from colliding. (SWEngGames)
- Make difficulty a data-tuned threshold, never a code branch on character type — keeps it configurable per character without code changes. (GameAIPro2)

### Monte-Carlo, Simulated Playthroughs & Artificial Players
- Use Monte-Carlo simulation (run/replay millions of trials in code) for probability/balance questions too hard to solve analytically — e.g. which Monopoly squares get hit most. (AoGD3; AoGD2)
- Run automated simulated playtests with artificial players running scripted strategies (rusher vs turtle) over thousands of iterations in seconds — measure balance empirically rather than guessing. (GameMechanics)
- Remove randomness first to reveal the deterministic skeleton of an economy (deterministic Monopoly shows the underlying trend), then add randomness back and observe its effect on outcomes and variance. (GameMechanics)
- Balance by tweaking numeric values (production/factory/unit costs, rates) and re-simulating until win-rates and average game length across strategies match goals — the SimWar method: adjust costs until rush wins ≈ turtle wins. (GameMechanics)
- Make computer-controlled opponents fallible within a tunable range (Asteroids saucer fires randomly within a window that narrows as score rises) — perfect AI is no fun; expose the range as a balance variable. (GDWorkshop)
- Build an autorun / plays-by-itself mode plus randomize-parameter hooks for automated black-box testing — let the game stress-test itself without a human at the controls. (SWEngGames)
- Validate guessed model parameters (queue rates, influence constants) with a fast standalone test app over many timescales — don't trust hand-tuned stochastic parameters without observing their behavior. (GameAIPro2)
- Use combinatorial/automated verification for deep upgrade economies (Forza) — check each upgrade's effect AND that no upgrade conflicts with any other, because the permutation count exceeds human capacity, so script it. (QATesting)

### Telemetry-Driven & Live Balance
- Instrument live games to collect play data (Blizzard Battle.net race-vs-race win rates by map) and use stats to distinguish real imbalances from perceived ones before patching. (GDWorkshop; AoGD2)
- Use metrics for fine-tuning beyond playtest resolution (Half-Life position/health/death graphs, fighting-game win-rate sampling) — they reveal sub-threshold imbalances and rare edge cases at scale. (DesigningGames)
- Engineer clever metrics for hard-to-observe data (Halo: Reach "I just saw lag" button + recorded match movies) — superior knowledge, not superior coders, makes superior tuning. (DesigningGames)
- Surface live telemetry (updates/sec, score, health, entity count) smoothed by a rolling average so designers and players can see runspeed and state. (SWEngGames)
- Don't be a slave to telemetry — pair data with designer intuition and direct feedback (replays) from top-level players. (GDWorkshop)
- Distinguish a true imbalance from natural metagame evolution — a temporarily dominant strategy may just need time for the community to develop counters (NFL 3-4 defense analogy); patch real flaws, let the metagame self-correct where it can. (GDWorkshop)
- Expect to keep balancing after launch (StarCraft patched two years post-release) — a million players surface imbalances and creative techniques that spread like a virus, so build economies you can keep tuning post-ship. (GDWorkshop; AoGD2; GameMechanics)
- Enter beta intentionally incomplete (~90% of units/spells), leaving designed holes to fill — pro players at higher skill and volume force changes no internal test predicted. (GDWorkshop)
- Public-beta large/multiplayer systems to surface loopholes a small team can't — a million players find what a thousand miss; expect post-launch patching. (GDWorkshop)
- Track playtest data and outcomes in tables (probability, progression, logged results) and feed them back into tuning — telemetry-informed tuning beats guessing. (IntroGameDesign)
- Render runtime system structures (grids, ranges, rays, bounds) as in-editor visual aids colored by state (in-bounds green / out red) so designers see and tweak the invisible and read correctness at a glance. (EditorScripting)

### Balance Definition, Scope & Acceptance
- Define balance as adjusting the relative power of tools/units/strategies toward two prime goals — fairness (no starting advantage) and depth (the best answer is non-obvious even to experts) — and remember it is not "everything equal" but tuning so intended strategies are viable and no choice is strictly dominant. (DesigningGames; IntroGameDesign; QATesting)
- Treat imbalance as a bug — no side (human or AI) and no option should dominate; anything skewed "not by design" is a defect. (QATesting)
- Balance strategies-in-situations, not tools in the abstract — a tool's value varies by context and combination, so "is sword better than fire?" is meaningless without a situation. (DesigningGames)
- Balance at the top of the skill range only for deep competitive games (StarCraft II, Counter-Strike) — it's expensive (veto ideas, long expert testing, post-release patching); balance low/mid for narrative and social games. (DesigningGames)
- When discrete difficulty levels don't fit, balance to the median skill of the target audience — set a high-water mark with hard-core testers and a low-water mark with novices, then aim between, and balance each progression level individually. (GDWorkshop)
- Treat "players describe it as fun and fair online" as the acceptance test for a balance system — perceived fairness is what makes players return, and that's the goal state of all tuning. (QATesting)
- Re-balance after every build — new values invalidate prior conclusions, so the whole swap-sides protocol repeats each iteration. (QATesting)
- Stabilize the code before balancing — crashes and freezes make balance measurement impossible; a system can't be tuned on top of an unstable base. (QATesting)
- Tune by playing daily — "evolve your game by playing it"; games are hypersensitive to tiny parameter tweaks, so test and adjust constantly and trust your gamer's instinct (a long process refined gut + math backed by spreadsheets and tests). (SWEngGames; GDWorkshop)
- Budget real time for balance — roughly 6 months after the game is fully working (more for more new gameplay elements), since balancing can only begin once the game is playable. (AoGD3)
- Watch NPC/AI strength as a balance lever — over-qualified AI allies make the game too easy and weak ones too hard, so tune AI behavior as part of balance. (QATesting)

### Comeback, Rubber-Banding & Feedback-Driven Balance
- Make equilibria dynamic by feeding a negative-feedback loop from the DIFFERENCE between players, not absolute values — it produces a moving target that resists predictable, gameable balance. (GameMechanics)
- Implement rubberbanding as negative feedback on relative race position, preferring subtle mechanics (Mario Kart gives trailing players better power-up odds and makes the leader the most-targeted) over crude speed clamps. (GameMechanics; IntroGameDesign; AoGD2)
- Give losers a comeback mechanism to keep everyone in the flow channel — leaders can't coast and trailers stay engaged (Battlefield tickets, gang-up-on-leader, random external events) without letting them stagnate into perpetual stalemate. (GDWorkshop; AoGD2; IntroGameDesign)
- Counter a destructive downward spiral (losing chess pieces makes you lose more) with negative feedback on the destructive side — Half-Life spawns more health packs when HP is low, giving the losing player a stabilizing source. (GameMechanics)
- Use positive feedback to drive a game to its conclusion once a critical difference exists — nobody wants to keep playing after the winner is clear; let amplification end the game and then tip the scales fast. (GameMechanics; GDWorkshop)
- Address the Mastery Problem / "rich get richer" loop explicitly — high-level players must gain no big benefit from easy encounters (or they bottom-feed) while novices must still progress; add negative feedback or matchmaking to keep entry viable. (TheoryOfFun)
- Trigger difficulty advances off a player-power signal (damage thresholds) staged in discrete tiers, and prefer changing HOW enemies behave (smarter/faster/more-numerous) over raising hit points — bigger numbers don't change how the game is played. (PCGUnity)

### Dynamic Difficulty Adjustment (Contested)
- Be cautious with dynamic difficulty adjustment — it spoils world reality, is exploitable (play badly to earn an easy stretch), and denies players the satisfaction of mastering a fixed challenge; design tolerant ramps rather than relying on perfect adjustment. **When it flips:** for non-competitive single-player where players self-attribute wins → use rubber-band/adaptive scaling invisibly (Tetris speed-up, racing AI that slows when the human crashes) so players credit their own skill. (AoGD3; AoGD2; TheoryOfFun; GDWorkshop)
- Use adaptive difficulty only when players won't reach high skill — experts decode and exploit it, so combine it with explicit bands (Resident Evil 5: internal 1–10 clamped by chosen tier) and limit how long an adaptive AI commits to one strategy via a sliding learning window. (DesigningGames; GameAIPro2)
- Don't let players balance core values — they have a conflict of interest (want challenge AND easy wins); player-set difficulty levels are the safe exception. (AoGD3; AoGD2)
- Offer discrete skill levels by re-balancing system variables (Civilization starting cash, enemy strength multipliers) when starting variables drive difficulty. (GDWorkshop)
- Make difficulty a monotonic curve — "easy" not too easy, "hard" not too hard, "medium" a gradual rise — and verify every difficulty setting, not just normal. (QATesting)
