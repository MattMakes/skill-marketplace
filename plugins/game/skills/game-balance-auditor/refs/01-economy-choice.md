# Internal Economy, Feedback, Dominant Strategies & Choice

## Internal Economy & Feedback Loops

### What An Economy Is

- Treat the internal economy as a system of resources plus rules that produce, consume, and exchange them — every genre has one even if it looks nothing like a real economy (health, ammo, XP, army counts) (GameMechanics).
- Define a game economy by two meaningful, looped decisions: how players earn "money" and how they spend it — where "money" is anything tradeable (skill points, ammo, energy, reputation), and depth lives in the meaning of those two choices (AoGD3; AoGD2).
- Tie every economy directly to the player's objective — each action must advance or hinder progress, or the economy is mere decoration (GDWorkshop; Challenges).
- Require three pillars for any economy: items of exchange (resources/barterables), agents of exchange (players or system bank), and methods of exchange (markets/trading) — missing one means no functioning economy (GDWorkshop).
- Own the economy design yourself as the designer — it is the one task that belongs to no one else; physics needs programmers, levels need writers, but balance is yours (GameMechanics).
- Identify the main resources first, then describe the mechanics that relate them — start from resources before mechanisms when designing or analyzing an economy (GameMechanics; IntroGameDesign).
- Add an internal economy to inject strategy and reward long-term planning/investment — economic management runs on a longer timescale than tactical maneuvering; without forward investment a war game is mere tactics (GameMechanics).

### Resources: Definition, Scarcity & Utility

- Define "resource" as anything measurable numerically the player can produce, gather, collect, or destroy — money, time, units, enemies, power-ups all qualify; walls/platforms/fixed features do not (GameMechanics).
- Treat non-obvious things as resources: lives, units, health, currency, actions/turns, power-ups, inventory, special terrain, and time — each behaves differently and can be borrowed across genres (GDWorkshop; Challenges).
- Don't mistake seemingly-abstract resources for fake ones — XP, happiness, reputation are intangible but concrete commodities earned and spent like money; balance them as real economy nodes (GameMechanics).
- Distinguish tangible (located, must be moved) from intangible (just a number) resources, and exploit switching between them (Warcraft trees→lumber) to gate where production matters spatially (GameMechanics).
- Distinguish abstract resources (computed from state, e.g. "strategic advantage," altitude) from concrete ones — abstract resources let you reason about positional value without storing them (GameMechanics).
- Store resource quantities in entities (variables); group related simple entities into compound entities (a unit's health/damage/speed) so balance changes propagate coherently (GameMechanics).
- List every resource (with its source, use, and limit) so the economy is explicit, not accidental — and tag each limited or unlimited, since limited resources force management strategy while unlimited ones change dynamics (Monopoly cash vs. property) (IntroGameDesign; Challenges).
- Give every resource both utility and scarcity — useless items are clutter, overly abundant items lose all value (GDWorkshop).
- Make resources scarce via price, opportunity cost, or guarded location — scarcity is what forces meaningful, zero-sum choices (12 of 20 med packs taken leaves 8 for the opponent) (GDWorkshop; Challenges).
- Recognize that resources govern conflict pacing — denying players the resources they need to meet goals is how the system stays challenging rather than trivially winnable (GDWorkshop).
- Flip one resource limited↔unlimited at a time and replay — isolates how scarcity reshapes play (FPS bullets, Monopoly property) (Challenges).

### Sources, Drains, Converters & Traders

- Build economies from four functions: sources (create from nothing), drains (remove permanently), converters (turn one resource into another at a rate), and traders (exchange resources by rule) — every flow is one of these (GameMechanics).
- Keep converters and traders straight — converters create/destroy at a ratio (trees→lumber), traders only move existing resources both ways at an exchange rule; nothing is created or destroyed in a trade (GameMechanics).
- Build converters into the economy across many directions — Magic lets players convert/sacrifice in nearly all directions, multiplying interactions from a handful of systems (DesigningGames).
- Tie source/drain rates to game state to make balance dynamic — sim money proportional to population, health regen over time, food drained proportional to population (GameMechanics).
- Use converter-efficiency upgrades as a clean tuning lever — tech upgrades that yield more output per input scale player power over time (GameMechanics).
- Add a hoarding drain when total product grows — Catan's "roll a 7, holders of >7 cards discard half" forces players to spend as they earn and caps how powerful any one player gets (GDWorkshop).
- Use a "food/upkeep"-style drain to enforce an intended play scale — WarCraft III's upkeep siphons gold from oversized armies so players can't stockpile surplus and re-max instantly; tune supporting units' power proportional to expected army size (GDWorkshop).
- Gate powerful effects behind currency drains — purchases force players to spend a limited resource, creating the opportunity cost that makes power meaningful (Challenges).
- Use auctions as a converter that prices items by willingness-to-pay, and vary the auction form (open, sequential, silent, fixed-price, Dutch, reverse, second-price) to tune economic pressure, risk, and information (Challenges).
- Add second-price-wins or high-bid-penalty rules to punish overbidding — makes aggressive bids dangerous and self-correcting (Challenges).

### Currency, Markets & Trade

- Control money supply: regulate how much currency the game creates and the number of ways to earn and to spend it, keeping it neither too easy nor too hard to get (AoGD3; AoGD2).
- Decide consciously between a universal currency and specialized currencies — the choice changes how fungible advantage is across the game and what depth/control you get (AoGD3; AoGD2).
- Decide four economy knobs up front: does total product grow, how is currency supply controlled, how are prices set (free/fixed/mixed), and what restricts trade (turn/time/cost/partner/amount) (GDWorkshop).
- Choose deliberately between fixed-product, controlled-growth, or self-regulating product flow — uncontrolled recycling lets players hoard and starve circulation (Ultima Online switched to designer-controlled flow after this failed) (GDWorkshop).
- Cap price inflation with a fixed system trader — Catan's bank trading 4:1 for any resource effectively ceilings every resource's value (GDWorkshop).
- Use system-vs-player trade to stabilize the low end while pushing scarce goods to player-vs-player trade — shopkeepers buy anything (keeps newbies employed) but lowball high-tier items, driving players to each other (GDWorkshop).
- Let supply-and-demand swing resource values for emergent variety — a glut crashes a resource, a scarcity inflates it, changing the experience every play (GDWorkshop).
- Use currency to grease trade, but know it is optional — barter systems achieve the same goals without a banknote system (GDWorkshop; Challenges).
- Build an in-game economy on relative commodity values and anchor tradeable goods to a trading dynamic when players each hold distinct goods — multi-resource ownership naturally produces negotiation (Catan, Pit) (Challenges).
- Audit earning channels and sinks for collusion and "holes" — in multiplayer economies players pool funds or launder money through any gap; markets where players trade each other are especially exposed (AoGD3; AoGD2).
- Expect a metaeconomy to form around tradable persistent assets whether you plan it or not (eBay character sales) — design for it deliberately rather than be surprised (GDWorkshop).
- For collectible/trading economies, control rarity to shape the market but accept you cannot control post-purchase prices or where trade happens — rarity is your only lever (GDWorkshop).
- Frame purchases so spending feels heroic, not like cheating — selling "the adventure" (DDO) instead of "the magic axe" yields the same item but pride instead of shame (AoGD2).

### Earn/Spend Loop & Tradeoffs

- Make the earn→spend loop deep so spending enables more earning — the alternating ratchet (earn, spend, earn) walks the player forward like two legs, and depth in both choices makes the economy meaningful (AoGD3; AoGD2).
- Check that earning and spending are themselves rewarding acts — and that money is neither too easy nor too hard to get (AoGD3).
- Treat tradeoffs as the economy's engine — a tradeoff exists whenever a player lacks resources to do everything (gold for weapon OR armor OR spell), making the choice real; enumerate broadly (pieces, turns, board position, currency, cards, abilities all count as spendable) (Challenges).
- When balancing an economy, simultaneously balance fairness (no buyable unfair edge), challenge (no purchase trivializes it; earning isn't a slog), choice, chance-vs-skill of earning, cooperation (pooling/collusion), time/earn-pace, reward, punishment, and freedom — economies inherit every balance problem at once (AoGD3; AoGD2).
- Use fixed-price purchases when the interesting choice is what-and-when, not how-much — limited-stock items add timing pressure ("buy now or it's gone") (Challenges).

### Reading The Economy: Fortune Over Time

- Chart each player's fortunes over time and read the macro shape, not the micro noise — small-scale lines are chaotic, but up/down trends and good/bad periods are visible at scale (GameMechanics).
- Accept there is no single "good" shape — quality depends on goals: long grinding struggle vs. quick reversals are both valid; design the shape you want (GameMechanics).
- Trace which mechanical structures produce which shapes — there is a direct, learnable mapping from mechanics to economic curves; design backward from the target shape (GameMechanics).
- Read attrition economies as battles of endurance — when the long-term trend of the key resource is downward (chess material), whoever makes resources last longest tends to win (GameMechanics).
- Expect distinct game stages (opening / middle / endgame) to show up as distinct economic regions — slow decline, sharp decline, restabilization — and tune each stage's pacing separately (GameMechanics).

### Positive vs. Negative Feedback Loops

- Know that feedback means a real coupling: the output of an interaction changes another system element — not just information shown to the player (GDWorkshop).
- Identify whether each loop is positive or negative — positive amplifies a lead/difference, negative shrinks it toward equilibrium; misclassifying a loop guarantees mis-tuned pacing (IntroGameDesign; GDWorkshop).
- Use negative (balancing) feedback to create equilibrium and resist change — it damps deviations and pulls the system toward a set point, keeping the game from resolving too fast (GameMechanics; GDWorkshop).
- Make equilibria dynamic, not fixed — drive the equilibrium off a changing factor (relative player fortunes, seasons) to escape predictable, static balance (GameMechanics).
- Use positive (reinforcing) feedback to create exponential growth and arms races, to amplify small differences, and to end games decisively — reinvesting output into more production (StarCraft SCVs→minerals→more SCVs) spirals like compound interest; once a critical lead exists, let it drive to a conclusion since nobody enjoys playing on after the winner is obvious (GameMechanics; GDWorkshop).
- Watch reinforcing loops for runaway leaders — "score a point → get a free turn" snowballs the strong player and ends the game prematurely with rote play; convert it to a balancing loop ("score a point → pass the turn") to balance the advantage instead of compounding it (GDWorkshop).
- Beware positive feedback widening the gap — reward-the-leader loops demoralize trailing players and end matches early; add brakes or cap the advantage (IntroGameDesign).
- Know positive feedback can also make a player lose — on a destructive mechanism it becomes a downward spiral (losing chess pieces makes losing more pieces easier); never confuse this destructive-positive spiral with negative feedback, which damps toward equilibrium (GameMechanics).
- Attach negative feedback to a destructive mechanism to rescue losers — Half-Life spawns more health packs when the player's HP is low; design relief loops deliberately (GameMechanics).
- Watch positive-feedback mutual dependencies for deadlocks — when resource A needs B and B needs A (minerals↔SCVs), a player stripped of both can never restart; prevent it or use it intentionally for level design (GameMechanics).
- Cap single-success gains — grant the leader only a small temporary bonus, never enough to throw the game out of balance, and make winners pay a price for strategically important positions to ratchet tension and give the loser a comeback path (GDWorkshop).
- Recognize escalating-reward mechanics as positive feedback — progressive Risk set bonuses reward those already ahead and accelerate the leader, even though they rise for opponents too with delay (Challenges).
- Profile feedback loops along their characteristics when tuning — durability, effect, investment, range, return, speed, type; adjusting these knobs is how you reshape a loop's balance impact (GameMechanics).
- Limit the number of feedback loops to a designable handful — distinguish major from minor loops; too many interacting loops makes balance unpredictable and untunable (GameMechanics).
- Diagram your core game actions to spot positive/negative loops that throw play out of balance before they ruin the game (GDWorkshop).

### Difference-Fed Loops & Rubber-Banding

- Prefer difference-fed feedback for competitive balance — feed the loop off the gap between players, not absolute values, so effects act on the lead itself; negative-difference feedback settles the lead at a stable distance (handicapping the leader parks the better team at a fixed margin) while positive-difference feedback aggravates skill gaps (GameMechanics).
- Apply rubber-banding (catch-up) as negative feedback on relative position so trailing players stay in contention — slow leaders / speed trailers, deplete victory conditions (Battlefield 1942 tickets), or aid the laggard; keep games tense to the finish (GDWorkshop; GameMechanics; IntroGameDesign).
- Use the Mario Kart rubber-banding template — trailing racers draw better power-ups, leaders draw worse ones and get targeted more often (the blue-shell threat), pressuring both ends of the pack toward the flow center (IntroGameDesign; GameMechanics; AoGD2).
- Prefer subtle rubber-banding over blunt speed clamps — indirect mechanisms (weighted power-up odds, targeting bias, racing AI that slows when the human crashes and speeds up when the human closes) feel fairer and create last-minute surges without players sensing an artificial tether (GameMechanics; GDWorkshop).
- Tune feedback strength deliberately — too much negative feedback erases skill ("why bother leading?"), too little lets leaders run away; players must still believe skill decides the winner (IntroGameDesign; AoGD2).
- Let weaker players gang up on the dominant one, or have a third party intervene, and inject randomness (shifting alliances, disasters, bad luck) to disrupt an entrenched leader without freezing the game (GDWorkshop).
- Let trailing players take bigger risks while leaders play safe — risk/reward asymmetry is a natural rubber-banding pressure (Backgammon exposure, Spades nil, Jeopardy wagers) (Challenges).
- Build comeback potential so the result is never certain until the end — keep all players in contention (Chutes & Ladders' exact-landing rule lets the leader overshoot) (Challenges).
- Use dynamic limited-use bonuses that grow with delay to create escalating loops — Risk cards give a bigger bonus the longer the wait, but rise for opponents too (Challenges).
- Add a negative feedback loop when one player wins by a wide margin — read "one player wins by a wide margin" as too much skill for the audience, and add randomness or catch-up mechanics (Challenges).
- Let the scales tip dramatically only at the end — after the climax, wrap up fast; a sweeping victory satisfies the winner and mercifully ends it for the loser, but never drag out the ending. **When it flips:** for closely-matched competitive games mid-play → keep human values able to shift and avoid locking victory/defeat early, since tension lives on the knife-edge (GDWorkshop; DesigningGames).

### Economic Patterns: Engine, Friction & Escalation

- Tune the long-term-investment vs. short-term-gain tradeoff explicitly — reinvesting all income (SCVs) delays accumulation but eventually overtakes; there is an ideal switch point set by goals, constraints, and opponents (GameMechanics).
- Don't reward a single dominant economic line — pure-accumulation strategies must be punishable (you get attacked) so players balance growth against defense; the optimal play should depend on context, not be fixed (GameMechanics).
- Allow risky early-rush alternatives to long-build strategies — viable gambits (tank rush) that trade long-term economy for early aggression keep the strategy space open and counterable (GameMechanics).
- Apply the law of diminishing returns to keep growth in check — escalating cost per additional unit of power is a standard friction lever that prevents runaway accumulation (GameMechanics).
- Make power cost-proportional — stronger units/abilities must cost more, with offense balanced against defense so neither rush nor turtle dominates; a stronger unit can pay with longer build time so it can't be mass-produced (GameMechanics; GDWorkshop; AoGD2; Challenges; IntroGameDesign).
- Counter customization imbalance with negative feedback — if one item/skill combo dominates, players converge and flatten the probability space; RPG escalating XP-per-level requirements deliberately compress level/ability gaps (GameMechanics).
- Make player input frequent but low-impact per action — inputs must influence the economy, but no single input should swing it too far; many small influences beat few large ones for tunable balance (GameMechanics).
- Harvest input variation from player skill and terrain — resource-node placement and micro-management should feed economic variance so identical rules yield different fortunes (GameMechanics).
- Use maps/terrain, random disasters, and disaster scenarios to constrain the possibility space and defeat the single best build — imperfect land forces improvisation, rewards flexible players, and tests adaptability (GameMechanics).

### Resource Flow Tuning & Risk/Reward

- Tune resource flow like water draining through a holed cup — keep feeding the mind decisions (water in) at a rate that never empties (boredom) nor overflows (overwhelm) (DesigningGames).
- Diagnose an imbalanced economy from playtester complaints — "ran out of ammo too often" signals economy tuning, not just a weapon problem (DesigningGames).
- Tune ammo/power-up scarcity to genre intent — survival shooters want scarce, tense economies; action shooters want plentiful ammo with extra-enemy kills properly rewarded; either way don't strand the player before a boss (GameMechanics).
- Don't penalize effort with resource starvation — if killing enemies costs more ammo than they drop and that strands the player at the boss, the economy punishes engagement; verify the net resource flow over a level (GameMechanics).
- Match risk to reward, especially on novice paths — never lure a player into a deadly trap for a single coin; mismatched risk/reward feels like cheating (GameMechanics).
- Never show a reward the player can see but never reach — it provokes wasted, dangerous attempts for an impossible payoff, worse than no reward (GameMechanics).
- Use abundant low-stakes collectibles as breadcrumbs and tuning slack — coins you can add/remove freely during playtest without breaking the economy let you guide players and reward skill; assume any visible coin is reachable (GameMechanics).
- Balance cost-per-unit of renewable units against the whole resource structure — only playtesting reveals if the cost is right (GDWorkshop).
- Treat resource scarcity as a balance lever, but watch metagame information — players know a fair game won't truly starve them indefinitely, which deflates fiction-promised scarcity; either design for that (give explicitly fair, attainable goals) OR genuinely break convention (System Shock 2 actually starves you), but never half-measure (DesigningGames).

### Access, Deadlocks & Renewable Supply

- Model power-ups/abilities as producers of the abstract resource "access" — double-jump and unique weapons unlock locations; treat unlock-power economically and guard against access deadlocks (GameMechanics).
- Prevent consumable-key deadlocks with renewable sources — Zelda restocks arrows/bombs from respawning pots so players can never be locked out of required-resource gates; budget renewable supply against required consumption (GameMechanics).
- Use renewable resource sources as a hint channel — seeding a needed resource (lots of arrows) foreshadows the tool the player will need (a bow) (GameMechanics).
- Beware non-renewable upgrade currencies under build diversity — if XP can't be farmed back (Deus Ex), every level must be beatable across all plausible upgrade spreads; one mandatory-build boss breaks the promise of customization (GameMechanics).

### Economy-Construction Games

- Assemble a toolbox of combinable economic building blocks for construction sims — and recognize balancing all their combinations is harder than balancing one fixed economy you design yourself (GameMechanics).
- Introduce building blocks gradually, not all at once — staging elements controls the probability space, enables scenario design, and keeps early balance tractable; lock advanced blocks behind accumulated resources (Civilization) (GameMechanics).
- Identify and police dominant meta-economic structures — players quickly find the best block-combination (SimCity zone mix) and follow it; left unchecked it collapses variety (GameMechanics).
- Break dominant patterns by making early-effective structures fail later — a layout that grows population fast but pollutes long-term; slow-working destructive positive feedback is the ideal tool to retire stale dominant strategies (GameMechanics).

### Simulating & Validating The Economy

- Simulate the economy with many automated runs before trusting balance — Machinations runs 1,000 simulated playthroughs in seconds to reveal whether an internal economy is balanced and to collect statistics (GameMechanics; AoGD2).
- Use artificial players to remove human variance and isolate the economy under test — script AP strategies (turtle vs. rush) so you measure the system, not the playtester (GameMechanics).
- Replace randomness first when analyzing balance — strip random rent/dice (deterministic Monopoly) to see the underlying economic trend, then reintroduce luck to measure its true contribution (GameMechanics).
- Read win distributions and game lengths, not just who wins — track rush-wins vs turtle-wins vs draws/timeouts and average durations to detect dominant strategies and degenerate stalemates (GameMechanics).
- Build spreadsheets that mirror the game's structure — one interconnected table set per subsystem, used as both the starting design tool and the final tuning tool, laid out with your programmers so everyone tracks how a change propagates (GDWorkshop; IntroGameDesign).
- Build the game's model first, then co-evolve model and game — derive playable rules from a validated economic model (SimWar→game) and keep refining the model as the design changes (GameMechanics).
- Expect strategy-game economies to need many resources and interlocking feedback loops, and expect them to be the hardest thing to balance — even shipped games (StarCraft) need repeated economy tweaks as players find new strategies (GameMechanics).

## Dominant Strategies, Symmetry & Meaningful Choice

### Eliminating Dominant & Degenerate Strategies
- Hunt for and eliminate dominant strategies — once one option is clearly best, the puzzle is "solved," choice dies, and the game stops being fun. (AoGD3; AoGD2; DesigningGames; GDWorkshop; GameMechanics)
- Treat even minor "one attack is far superior" imbalances as serious — small dominance has large playability effects and makes games dull. (GDWorkshop)
- Hunt degenerate strategies in emergent tool/card interactions, not surfaces — real ones hide (Morrowind Intelligence-potion loop, Hack-a-Shaq, Magic combo decks), so a chunk of playtesting must route out degenerate engines that "innocent" objects form by combining. (DesigningGames; GDWorkshop)
- Assume players will relentlessly seek degenerate strategies yet resent finding one — they want to hunt and want to NOT find, because a found exploit destroys the game. (DesigningGames)
- Treat hidden dominant strategies players discover as "exploits" — shortcuts to success you never intended; make playtesters explicitly hunt "dominant strategies or loopholes" and rebalance to kill them before players turn them into shortcuts. (AoGD3; AoGD2; IntroGameDesign)
- Use playtesting/telemetry to expose convergence — when testers all latch onto one tactic, that flags a degenerate strategy needing a balance pass; read win distributions and game lengths (rush vs turtle vs stalemate), not just who wins. (IntroGameDesign; GameMechanics)
- Ban or fix degenerate picks even in finished competitive games (Tekken's Mokujin, AvP Predator, the "Chuck Norris unit") — tournament "laws" exist precisely to remove a near-guaranteed-win option. (AoGD2; DesigningGames)
- Expect dominant strategies to abound early in development and recede as you tune — losing your sense of "the right way to play" signals progress, not regression. (AoGD3; AoGD2)
- Welcome the disorienting moment when no single best strategy remains — it means meaningful choices now exist; investigate why the current values balance. (AoGD3)
- Counter dominant strategies structurally with randomness, terrain, escalating costs, or negative feedback rather than hard bans — make single-axis builds incomplete (Magic forcing multicolor) and force improvisation; tune the randomness frequency/impact since rare-large vs frequent-small factors feel very different. (GameMechanics; GDWorkshop)
- Identify and retire dominant meta-economic build patterns (SimCity zone mix) by making early-effective structures fail later via slow destructive positive feedback — left unchecked, the single best build collapses variety. (GameMechanics)
- Police multi-path goal designs for a dominant solution — letting a goal be reached many ways is great until one route is always easiest, then everyone funnels to it. (AoGD3; AoGD2)
- Distinguish a dominant strategy from a beloved favorite — a not-always-effective playstyle is fine if balanced counters exist; only the always-best line is the problem. **When it flips:** narrative/social or low-skill-targeted games → tolerable degenerate strategies (BioShock Big Daddy cheese, Morrowind potions) don't break the experience and aren't worth the high cost of fixing. (GDWorkshop; DesigningGames)

### Super-Units & Overpowered Objects
- Avoid "super units" / dominant objects — an object so valuable that all others stop mattering ruins the game; keep similar objects proportional in strength. (GDWorkshop)
- Treat overpowered objects and dominant strategies as the two ways availability reduces meaningful choice — both make "one option better than the rest" and shrink real decisions. (GDWorkshop)
- Watch for the dominant option that crowds out all others — if a new profession/spell/weapon is so good no one picks anything else, its cost is too low. (Challenges)
- Cap single-success gains so no leader gets a runaway super-advantage — grant only a small temporary bonus, and use upkeep/diminishing-returns drains so no unit can be mass-produced to dominate. (GDWorkshop; GameMechanics)

### Symmetry vs. Asymmetry
- Use symmetry (identical start, resources, information, rules) when you want clean, automatic fairness and a reliable measure of skill — it isolates skill/strategy as the only variables and needs no balancing work (chess, Go, Connect Four, hockey). (AoGD3; AoGD2; DesigningGames; GDWorkshop; Challenges)
- Resolve unavoidable first-move/start advantages by random selection (coin toss) — over many games the edge distributes evenly. (AoGD3; AoGD2; DesigningGames)
- Recognize first-move advantage scales inversely with game length — trivial in long chess, decisive in short tic-tac-toe; mitigate via low-value opening moves, komi-style compensation for player two, a pie/swap rule (Hex), longer games, or a chance element. (GDWorkshop)
- Hand the natural first-move/edge advantage to the weaker player ("youngest goes first") — use built-in imbalance to offset skill gaps. (AoGD3; AoGD2)
- Choose asymmetry deliberately to simulate real-world conflicts, expand the gamespace, personalize to player skill, level uneven opponents, or create thought-provoking situations. (AoGD3; AoGD2; DesigningGames; GDWorkshop; GameMechanics)
- Multiply replay value via asymmetric loadouts — 10 fighters × 10 fighters = 100 distinct matchup-games each demanding different strategies. (AoGD3; AoGD2)
- Accept that asymmetry is NOT auto-fair and imposes a large balancing burden — uneven forces, abilities, resources, or objectives (SoulCalibur characters, C&C armies, NetRunner corp vs runner, Scotland Yard hider vs seekers, Bhag-Chal tigers vs goats) are hard to prove evenly matched and need deliberate work. (AoGD3; AoGD2; DesigningGames; GDWorkshop; Challenges)
- Balance asymmetric forces by assigning a numeric value to each resource/power and equalizing the per-side totals — make the sums of advantages match. (AoGD3; AoGD2)
- Discover each attribute's true weight by playtesting, not assumption — Low=1/Med=2/High=3 is only a starting guess; re-weight when results contradict equal-point totals (Firepower proved 2× as valuable in Biplane Battle). Let observed win rates correct your model. (AoGD3; AoGD2)
- Balance asymmetric matchups by relative fortune and win-rate data, not mirrored numbers — feed negative feedback off the gap between sides (Space Hulk attrition, tower-defense arms races) so unequal forces still produce close, fair games. (GameMechanics)
- Balance asymmetric power discrepancies by requiring skill to unlock the weaker side's edge — WarCraft II orc bloodlust is raw-stronger, so humans got healing/magic that only pay off via hit-and-run and clever maneuvering. (GDWorkshop)
- Choose explicitly among three options: symmetry, balanced asymmetry, or deliberate unfairness — pick per design intent; in multiplayer the core balance is usually the start-of-game distribution of resources and powers across parties. (DesigningGames; GDWorkshop)
- Tolerate deliberate fairness imbalance only when story-justified and knowingly accepted by players (Predators stronger than Aliens; Battle of the Bulge; Cosmic Encounter "fair isn't funny") — use it only when competition isn't the point; perceived fairness can survive numeric inequality. (AoGD3; AoGD2; DesigningGames)
- Don't punish weak players with added difficulty meant to "balance" — extra difficulty (sway, instant-kill headshots) widens the skill gap because experts adapt and novices stay handicapped. (Challenges)

### Transitive & Intransitive (RPS) Balance
- Ensure that whenever one element beats another, a third element beats the first — intransitive (rock-paper-scissors / knight-barbarian-archer) cycles guarantee every choice has strengths and weaknesses and no element is supreme; verify with a payoff matrix. (AoGD3; AoGD2; GDWorkshop; DesigningGames)
- Use orthogonal/non-overlapping unit roles to build intransitive balance — give each unit a distinct identity so each beats some and loses to others, avoiding a single strictly-best unit. (GameMechanics; DesigningGames)
- Use transitive cost-vs-power (value-sum) balancing when units differ in raw strength — pay for more power with proportional weakness elsewhere. (AoGD2)
- Don't pile on extra symbols (RPS-lizard-Spock) hoping for depth — "no Nash equilibrium means no Nash equilibrium"; once you have 2+ viable strategies, extra moves add learning burden and complexity, not depth (poker is great with only fold/call). (DesigningGames)
- Engineer strategy interactions to have NO pure Nash equilibrium — use RPS for symmetric interactions and matching pennies for asymmetric ones (the only two elegant no-equilibrium patterns); a single pure equilibrium is a broken design because play settles there and the decision vanishes. (DesigningGames)

### Cost Proportional to Power & Triangularity
- Make cost proportional to power — stronger units/abilities/weapons must carry higher cost, longer build time, lower hit chance, rarity, ammo limits, or greater risk, or the strong option dominates (WarCraft III unit tuning, SimWar costs, CCG cards). (AoGD2; GDWorkshop; GameMechanics; IntroGameDesign; Challenges)
- Spread weapon/unit power across a spectrum with niches (range, spread, reliability), not one strictly-best option — and expect any new spell/weapon/ability to land too strong or weak; only play reveals the true cost-to-power ratio, so tune after testing. (IntroGameDesign; Challenges)
- Balance every powerful element with a corresponding drawback — give each unit a special advantage plus a matching weakness so a range of choices stays viable; treat "for every reward a risk, for every attack a defense" as a design reflex. (GDWorkshop)
- Make cost proportional to payoff so expensive units anchor counter trade-offs and drive yomi — in StarCraft, killing pricey Mutalisks with cheap Marines pays better than the reverse; let payoffs also vary with context, positioning, and proportions. (DesigningGames)
- Apply the law of diminishing returns / escalating cost per added unit of power — a standard friction lever that prevents runaway accumulation and keeps no single line dominant. (GameMechanics)
- Build in triangularity: a constant safe-low-reward choice plus an occasional risky-high-reward choice — reach for it first when a prototype "isn't fun," since ~8 of 10 unfun prototypes simply lack this risk/reward choice. (AoGD3; AoGD2)
- Make rewards commensurate with risks and balance triangularity with expected value — keep the EV of safe and risky options comparable (Qix: half the success chance must pay double the points), and use a rare high-value target (Space Invaders saucer) to inject it into monotony. (AoGD3; AoGD2)
- Seed many small triangular choices throughout play (Mario Kart manual-vs-auto, grab-vs-ignore power-up) — a "symphony of triangularity" sustains interest, and its uncertainty links to variable reward. (AoGD2)
- Build triangularity / cost-proportional-to-power into units so a stronger unit pays with longer build time — no unit can be mass-produced to dominate. (GDWorkshop)

### Keeping Every Choice Meaningful & Counterable
- Reject meaningless choices — 50 cars that drive identically or 10 guns where one is strictly best are equivalent to no choice at all; give choices that materially change the game state. (AoGD3; AoGD2; Challenges)
- Eliminate obvious decisions (always capture the free queen) — remove the choice or automate it to spotlight real decisions; likewise cut meaningless decisions with no consequence (the "But thou must!" fake choice). (Challenges)
- Balance the STRATEGIES players choose between in a situation, not tools in the abstract — every tool's power is situational, so make the best answer non-obvious even to experts; a decision is meaningful only when outcomes are partially predictable, neither inevitable nor unknowable. (DesigningGames)
- Keep ample choice in all areas and never let progression narrow player options — when players fixate on a limited option set, games become dull; keep the meaningful-decision cadence high. (GDWorkshop; Challenges)
- Match the NUMBER of choices to player desires (Mateas) — choices > desires overwhelms, choices < desires frustrates, choices ≈ desires gives freedom and fulfillment; calibrate to context (a fork is interesting, thirty side roads overwhelm). (AoGD3; AoGD2)
- Make customization choices mutually exclusive to give them weight (one class, Deus Ex invisibility-vs-armor) — choices that exclude each other carry real consequences; unordered free upgrades don't. (GameMechanics)
- Add new powers without unbalancing by giving opponents a defense or counter — keep every option counterable so the new power isn't a free win (Strong Arm Scrabble stealing must be defensible). (Challenges)
- Allow risky alternatives (early rush vs long build) and provide multiple viable level solutions so the strategy space stays open and counterable — never reward a single dominant economic line; punish pure accumulation so optimal play depends on context, not a fixed answer. (GameMechanics)
- Define "balanced" as no single strategy always winning and no exploit bypassing the challenge — competitive multiplayer balance demands multiple viable paths; close every loophole so players can't circumvent the intended conflict. (Challenges; GDWorkshop)
- Aim to enrich the player's internal thought process, not maximize option count — pursuing nuance keeps designs smaller, simpler, and more elegant than strategy-counting, and a flat landscape where every strategy is equally valuable is as meaningless as coin-tossing. **When it flips:** for skill ceiling, vary the price of entry so the best outcomes demand the highest skill (peaks and valleys, "turn it up to 11"), rather than sanding everything smooth. (DesigningGames)
- Guard against solvability in pure-skill / zero-luck games — they can be solved, turning once-interesting decisions into obvious ones; add depth (or measured randomness) so humans and computers can't solve them. (Challenges)

### Skill-Relative Balance Targeting
- Recognize a strategy's degeneracy is skill-relative — what's degenerate for an expert is a fascinating mystery for a novice (tic-tac-toe), and what's balanced for experts (StarCraft rushes) can feel degenerate to novices who lack the counter. (DesigningGames)
- Accept you can't balance for all skill levels at once — target a skill band and let other bands carry degenerate strategies; for deep competitive games balance at the TOP of the range (veto unbalanceable ideas, pay for exhaustive testing), and for narrative/social games balance at low-to-medium skill. (DesigningGames)
- Distinguish a true imbalance from an evolving metagame — a strategy may "dominate" for weeks only because counters haven't been developed yet (cf. NFL 3-4 defense); give the community time before patching, and expect to keep balancing post-launch as exploits spread like a virus. (GDWorkshop)
