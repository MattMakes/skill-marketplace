## Mechanics, Systems & Meaningful Decisions


### What a Mechanic Is — Definitions & Vocabulary

- Define games by their rules, not their content — rules generate the game's state machine and bound everything the player can do; content is what you pour into that machine (widely corroborated).
- Separate mechanics (the operational rules a system enforces) from mechanisms (specific recurring constructs) — clean vocabulary lets you reason about and reuse structure.
- Keep core mechanics media-independent — the same mechanic works in a board game or video game, so design it abstractly before binding it to art or platform.
- Classify each mechanic as physics, internal economy, progression, tactical maneuvering, or social interaction — knowing which kind you are building tells you which design tools apply.
- Define every game object by properties, behaviors, and relationships — these four (objects, properties, behaviors, relationships) are the system primitives; change one and the whole dynamic shifts.
- Decompose any game into atoms (game state, views, space, players, avatars, bits, mechanics, dynamics, goals, theme) — design and analyze each part, then their interactions.
- Distinguish game state (all info), game view (what a player sees), and game space (the whole arena) — hidden state creates per-player uncertainty.
- Remember dynamics emerge from mechanics in motion and include the metagame (negotiation, alliances, trash talk) not enforced by rules — design for them, expect surprises.
- Start design from any atom — theme, a single mechanic, or a dynamic can each seed a good game; the thought process differs but each works.
- Apply the layer lens: Inscribed (what the designer authored), Dynamic (what emerges in play), Cultural (what the community creates) — most design power lives in shaping the Inscribed to produce good Dynamic.

### The Core Mechanic — Find It, Prove It, Protect It

- Ship a solid core mechanic — an intrinsically interesting, small rule set into which content can be poured (e.g. "move a piece"); without it there is no game (widely corroborated).
- Prototype the core mechanic physically before any code or art — pen, paper, index cards prove the fun cheaply; once programmers start coding, changing core gameplay becomes prohibitively hard.
- Pick a core dynamic deliberately (territory, prediction, spatial reasoning, survival, destruction, building, collection, chasing/evading, trading, race-to-end) — these map to deep human instincts players engage without being told, which is what makes a theme land; don't confuse a core with a lose condition.
- Don't confuse a core with a lose condition — dying can end the game without being what the game is about.
- Sum up the game in one or two sentences ("This game is about…") — if you can't, you don't have a game yet.
- Invest sustained time in core-mechanic craft — Pac-Man took ~18 months of focused work by one designer; signature feel is earned, not rushed.
- Define the "X" (razor and slogan) — the razor cuts features (decides what belongs and aligns the team) throughout the loop; the slogan sells and drives marketing.
- Define the core game loop (the actions players repeat) explicitly — the loop is the heartbeat of the experience and what you tune first.

### Choosing Verbs, Affordances & Actions

- Choose actions deliberately — verbs define the game; one new operative or resultant action can make a derivative game feel innovative (widely corroborated).
- Maximize the ratio of resultant (emergent/strategic) actions to operative (basic) actions — elegance is few base verbs yielding many meaningful strategies; one good verb beats a slew of mediocre ones (widely corroborated).
- Use games for what they do best — active verbs (controlling, projecting, surrounding, matching, remembering, counting) and quantification; lean on accompanying media (text, voice, film) for empathy and subtle internal states.
- Pick the control scheme last, after the character's action range is known — Space Bounce collapsed two buttons → one → whole-screen once "can't change mid-swing" was established.
- Exploit primality — touch and primal verbs/actions (gather fruit, fight, navigate, pursue mates) feel intuitive because animals could do them.

### Meaningful & Interesting Decisions

- Make every option meaningful by ensuring at least one other option also has meaning — choice without a viable alternative is no choice.
- Add conflicting objectives to force interesting tradeoffs — tension between goals creates decisions.
- Make outcomes (including AI outcomes) partially predictable — neither inevitable nor unknowable; a meaningful decision needs consistent, comprehensible systems the player can model.

### The Moment of Decision & Flow of Decisions

- Maintain flow as the foundation — keep the player's mind fed with a stream of decisions; never let the cup run dry (a flow gap) or overflow.
- Vary decision scope, flavor, and density over time — a single sustained scope is monotonous; use the rising-action-to-climax curve but accept emergent systems won't follow it exactly.
- Fill flow gaps caused by cooldowns, animations, and menus — make other actions available; design stuns that degrade control without freezing the victim (slowed aim, scrambled controls/input, whited-out screen) so they keep deciding.
- Use tradeoff mechanics deliberately: auctions (open/sequential/silent/fixed/Dutch/reverse), purchases, limited-use and dynamic special abilities, explicit choices, limited actions, trading/negotiation — each shapes the decision space.

### Information Balance, Hidden Information & Predictability

- Hunt information starvation actively despite the emotional pain — designers can't see it because they already know everything, and finding it threatens their sense of accomplishment.
- Choose the information structure to shape strategy — open (chess) rewards calculation; hidden (stud poker) rewards bluffing/reading; mixed and dynamic (fog of war) shift the balance over time.
- Control who knows what (public/private/game-only/random) and model objects→attributes→states deciding who knows each — changing information visibility radically changes a game; revealing private info suddenly creates drama (widely corroborated).
- Account for metagame information — players know the game is "fair" and gamelike, which can cause information glut; design around it or break convention deliberately (System Shock 2's real scarcity).
- Treat hidden information as a source of randomness — concealed (even non-random) info plays as chance from the player's view, creating per-player uncertainty and drama without true RNG.

### Depth vs. Complexity

- Smell elegance via interaction: prefer mechanics that interact with many others, are simple, serve multiple roles with non-overlapping roles, reuse known conventions, match existing scale, get reused millions of times, and impose no content restrictions.
- Chase emergence: craft mechanics that multiply into a possibility space, not gimmicks that merely add — look→shoot→move generates millions of experiences from three controls.
- Prefer few elegantly chosen mechanics over many bolted-on ones — depth should come from interaction of mechanics, not from sheer mechanic count (widely corroborated).
- Favor simple rules that beget complex play — chess and Go derive vast depth from few rules and changing relationships; aim for emergent richness over rule bloat (widely corroborated).
- Price every mechanic in player attention and dev effort — good design maximizes emotional output while minimizing comprehension burden.
- Distinguish geometry/timing of an attack as a depth source — a line-AoE that must line up shots (Hellion) generates far more play than a circle-AoE that just fires (Predator), at identical complexity.
- Watch for the genre-king / complexity-creep trap — genres accrue complexity until newcomers can't enter and a priesthood forms; aim for the accessibility/depth balance or expect declining sales and a dying genre, and reset complexity with a populist take or a new formal principle before jargon and intricacy lock out new players.
- Respect short-term memory limits (7±2 chunks) — piling on simultaneous numbers to track quickly makes a game too hard; reduce trackable units or let players chunk them.

### Elegance & Cutting

- Cut redundant tools whose role another tool already fills — paying two mechanics' cost for one mechanic's value is dead weight.
- Distill the design until maximum gameplay comes from the fewest rules — perfection is when there's nothing left to take away; ship five features properly done over 100 features 95% broken.
- Kill every rule that doesn't directly serve the core — excess rules usually come from distrust of players, not real need.
- Don't write the rules down until you have to — if you can't hold them in your head, neither can your players.
- Remove inner contradictions — anything that defeats the game's (or a subsystem's) purpose, like a "fun" thing that's boring or an "easy" tool that's hard, must be fixed (widely corroborated).

### Emergence — Cultivating It

- Cultivate emergence: add interacting verbs, make verbs act on many objects, allow multiple solution paths, add many subjects, and let actions change constraints — emergence is gardened, not commanded (widely corroborated).
- Build emergence from many simple parts with rich interactions, then validate by testing — complexity of behavior should come from interaction, not from complicated individual rules.
- Maximize process intensity over data intensity — emergent depth comes from rules that compute interesting outcomes, not piles of hand-authored content.
- Expect and embrace unexpected emergence from your mechanics — players will find strategies (including narrative ones) you never intended; design rules robust to that.
- Watch for the complexity barrier and test past it — adding rules raises emergent complexity until the system becomes unpredictable to you too; test, don't just reason, beyond that point (widely corroborated).
- You only learn how mechanics behave and what dynamics emerge by playing — rulebooks and design docs never reveal emergent dynamics (widely corroborated).
- Be wary of emergence as a silver bullet — emergent behavior usually makes games easier by spawning loopholes and exploits; design and test for it rather than hoping it self-balances. **When it flips:** for replayability and procedural longevity, emergent systems are exactly right — they generate fresh gameplay across many plays where authored content is consumed once.

### Emergence vs. Progression — Choosing & Integrating

- Pursue emergence for replayability — emergent systems generate gameplay procedurally and stay fresh across many plays; progression content is consumed once.
- Use progression (lock-and-key, scripted sequences) for authored narrative and pacing — when you need a specific experience in a specific order, script it.
- Integrate emergence and progression rather than choosing one — modern games layer scripted missions over emergent economies (StarCraft campaign over its RTS economy) (widely corroborated). **When it flips:** if you need a precise authored emotional beat in a precise order, lean scripted; if you need infinite freshness and player-authored stories, lean emergent — the mix follows the experience goal.

### Possibility Space & Solvability

- Treat the game as a state machine with a probability space — the set of reachable states is your real design surface; a larger probability space means more replay value.
- Make completely skill-based games deep enough not to be solved by humans (or computers) — once solved, interesting choices collapse into obvious ones.
- Accept that every game's destiny is to become boring — players relentlessly solve and exhaust your possibility space, so plan for finite shelf life and budget depth accordingly. **When it flips:** for competitive/multiplayer and procedurally-emergent games → other players or generators supply ever-new challenges, so the shelf life can be effectively unbounded if matchmaking is precise.

### Dominant Strategies, Degenerate Strategies & Exploits

- Expect and design around cheating and exploiting — cheating is a sign the player groks the game and is thinking laterally; counter it with design, and don't prescribe single solutions you can't enforce.
- Eliminate cheatability and even the perception of it — if players think a game can be cheated, endogenous value evaporates and they stop playing.

### Skill, Mastery & Skill Range

- Beware skill ceilings caused by long mandatory animations/control delays — they let novices catch up to perfect play and kill depth (Assassin's Creed combat).

### Skill Atoms & Onboarding

- Teach via skill atoms: action → simulation → feedback → modeling — the player acts, the game simulates, gives feedback, and the player updates their mental model; broken feedback breaks learning.
- Make game state changes clear and legible — players cannot learn from feedback they cannot perceive; surface the consequences of actions visibly.
- Teach new skills by sequencing then integration: introduce one concept safely, then combine it with prior skills under pressure (Uncharted 2's opening teaches every core move inside a thrilling scene).
- Apply Teach, Test, Twist when introducing a mechanic — show it safely in a consequence-free space, then test it with stakes, then twist it for deeper mastery; this is how players learn naturally.
- Introduce building blocks a few at a time — in construction games, withhold advanced options until earlier ones are mastered; staged unlocks control the early possibility/probability space.
- Constrain the space to limit early possibilities while players learn — fewer options lower the cognitive load of onboarding.
- Make training invisible — thread it into narrative, turn it into an elastic challenge, or skip it adaptively when unneeded. **When it flips:** experienced players or genres where players expect to be trusted → skip or shorten teaching and trust the player to discover, because over-onboarding bores experts and an FAQ-free, exploration-first design respects their intelligence (System Shock 2's real scarcity; leaving room for imagination).

### Systemic Interaction & Numeric Scale

- Match the numeric scale of interacting systems (life, mana, counts, damage) so they convert cleanly without fiddly math — see Magic: The Gathering.
- Avoid content-restriction mechanics — a 20-foot jump forces every level to contort; benefits are immediate and visible, costs are hidden and spread over years.
- After any nontrivial mechanic change, playtest the whole game, not just that system — interlocking systems mean one change ripples everywhere (widely corroborated).
- Trace ramifications of every change before making it — one tweak (8→16 turret positions) cascades into control, collision, destroyed-state art, and projectile work.

### Goals & Objectives

- Build a hierarchy of goals across timescales (ten-second, one-minute, one-hour, multi-day) — layered cycles of success/failure keep players hooked long enough to recruit others (widely corroborated).
- Layer short-, medium-, and long-term goals/objectives with the right immediacy and importance — players need both a next step and a reason to keep going.
- Pick the objective type to set tone — capture, chase, race, alignment, rescue/escape, forbidden act, construction, exploration, solution, outwit; mixing types (war + construction = RTS) opens fresh genres.
- Make goals achievable multiple ways for richness — but watch for any path being a dominant strategy that flattens the choice.
- Start with (or quickly establish) an inciting moment / clear problem — arriving with no goal or direction leaves players confused and bored.
- Build clear win/lose stakes into the core verb — immediate, understandable consequences make a simple mechanic gripping (the Wumpus eats you on a misfire).
- Add a second, collaborative victory condition for richer lessons — a goal beyond pure top-of-the-ladder (M.U.L.E.'s colony survival) makes lower status a valid strategic choice and teaches subtler truths.

### Frame Games as Problems & Spaces

- Frame every game as a problem-solving activity — ensure clear problems, hidden emergent ones, and a generator of new problems for replay (widely corroborated).
- Draw mechanics from the proven problem types — estimating curves, optimizing, matching, balancing, classifying; these hit cognitive sweet spots.

### Discrete vs. Continuous & Innovating at the Rules Layer

- Choose discrete vs. continuous mechanics deliberately — discrete (turns, grid, integer state) is easier to reason about and balance; continuous (real-time, physics) tests dexterity but explodes the state space.
- Innovate at the discrete-mechanics layer, not just the physics layer — most genres copy the same physics; novel discrete rules are where fresh gameplay comes from.
- Innovate by adding a new dimension to the play space — find a topological axis no one has explored (time-based instead of space-based puzzles) rather than just adding more weapons.
- Distrust "more of the same" as innovation — incremental piling-on (more weapons, more enemies) rarely changes the underlying lesson or adds a new "hole to the donut."
- Analyze games by their topology — most "new" games are continuous deformations of old ones; if your design is homeomorphic to an existing game, it teaches the same lesson and will stagnate.
- Aim feature sets at part convention, part improvement, part innovation — meet genre expectations, then add one new thing.

### Player Interaction Patterns & Roles

- Choose your player-interaction pattern intentionally — single-vs-game, multi-vs-game, PvP, unilateral, multilateral, cooperative, team; undervalued patterns (cooperative, unilateral like Scotland Yard) are open design space (widely corroborated).
- Define player roles explicitly (protagonist, collaborator, competitor, citizen) — clear roles shape behavior and expectations.
- Decide control type to fit the experience — direct vs indirect, real-time vs turn-based; restricting control is itself a source of challenge (turn-based strategy), not a limitation.
- Combine competition and cooperation via team competition; force communication and interdependence for cooperative depth (synergy 2+2=5).
- Force interdependence — take abilities away so players must communicate and help each other (Toontown's heal-only-others rule, Spaceteam).
- Mess with play order (interrupts, go-again, skip-a-turn) — breaks predictable turn structure and creates new tension.
- Keep player downtime minimal — let players act on others' turns or keep turns short; waiting kills engagement.

### Chance, Randomness & Probability

- Know your randomizers' math — one die is flat; summing dice makes a bell curve (middle common, extremes rare); more dice = less random, more faces = wider range.

### Balancing — Method & Process

- Flip a resource between limited and unlimited to discover new dynamics — scarcity forces gathering/management strategies; abundance removes them.
- Train balance intuition by guessing exact values, then checking — over time your guesses get surprisingly accurate (widely corroborated).

### Difficulty, Flow & Pacing of Challenge

- Don't rely on perfect flow as your design target — precisely matching challenge to skill is nearly impossible and a single insight can trivialize the rest; design for occasional jolts, not a steady drip.
- Scale difficulty via difficulty levels, dynamic difficulty adjustment, and progressive difficulty curves — different abilities need different challenge; vary difficulty based on demonstrated training-level performance.

### Puzzle Design

- Treat a puzzle as a game with a dominant strategy — any moment a player stops to think is a puzzle; weave puzzles into the environment rather than bolting on incongruous ones (well-woven puzzles like Wind Waker serve more purposes than incongruous ones like 7th Guest) (widely corroborated).
- Make the puzzle's goal instantly clear and easy to start — players abandon puzzles whose objective they can't read or whose first move they can't find (Nemesis Factor failed on this) (widely corroborated).
- Give a visible sense of progress and a sense of solvability — turn riddles into puzzles by letting players feel they're closing in (Twenty Questions, completing one Rubik's side) and convince them an answer exists (widely corroborated).
- Use pyramid structure — small sub-puzzles feeding one final challenge combine short/long goals and a clear payoff (widely corroborated).
- Use perceptual-shift "you get it or you don't" puzzles sparingly — they offer no gradual progress and frustrate like riddles when missed (widely corroborated).
- Separate intent from execution — decide whether the challenge is figuring out WHAT to do (puzzle) or DOING it (skill); Mark of the Ninja shows the distinction matters.
- Build puzzles from non-obvious uses of obvious mechanics — never from guessing which fictional affordances are actually implemented (classic adventure-game failure).
- Build object/class behavior consistency so players form a reliable lexicon — all crates smash, all panels short when wet, fire swords glow red — so novel uses become discoverable and players never feel cheated.
- Avoid riddles and lateral-thinking puzzles as hard gates — they're costly, single-use, no replay, and frustrate when players get stuck.
- If you must use single-solution puzzles, make them optional, offer alternate solutions, and give escalating clues — reduce the chance of a hard stop; always have an alternate path forward.
- Treat puzzle design like level design: arrange existing mechanics in new configurations — placement of crates/words/numbers creates the challenge.
- Work backward from the solution when designing mystery/quest puzzles — start with the answer, then place clues that lead to it.
- Sanity-check puzzles/levels for solvability and deadlocks — avoid two puzzles that each require the other first; ensure all needed clues are reachable; prefer multiple solutions so a missed detail doesn't permanently stick the player.
- Run a puzzle through a design process and verify it has a clear goal, a satisfying "aha," and a fair solution path — a puzzle without an aha is just busywork.
- Embed puzzles into action games via known patterns (traversal, stealth, physics, chain-reaction, sliding-block, boss fights) — proven structures save design time.
- Give puzzles affordances, identifiable patterns, good UI, and skill reward — players must be able to read rules, spot patterns, and improve; include puzzles only to support the core and fit the genre.

### Level Design as Mechanic Delivery

- Design customizable-build levels with multiple solutions — if players can spec combat/stealth/hacking (Deus Ex), every level must be beatable by each; don't allow custom builds then force one boss solution.

### Meaningful Mechanics — Procedural Rhetoric & Authorship

- Send your message through mechanics, not just art and text — what the rules reward and punish is the deepest, most credible layer of meaning a game carries (procedural rhetoric); align the procedural rhetoric with the intended message, because if mechanics reward behavior that contradicts your theme, players learn the mechanics' message, not yours.
- Design with explicit authorial intent — decide what learning pattern you want the system itself (not the dressing) to invoke; mastery of the medium means shaping the player, not just labeling outcomes "fun" or "boring."

### Theory of Fun — Learning as the Engine

- Run your game system through the fun checklist — must prepare, prepare multiple ways, environment matters, solid rules, core supports multiple challenge types, multiple abilities applicable (and required at high difficulty), skill in ability use, multiple success states, no benefit for experts on easy content, failure forces a retry. Any "no" means redesign.

### Multiplayer & Competitive Systems

- Add multiplayer only with clear reasons (competition, collaboration, meeting up, exploring friends, exploring self) — budget ~4x effort vs single-player; "because it's cool" isn't enough, and it's far harder to debug and balance (widely corroborated).
- Design against destructive behavior — divergent goals and griefing tear apart multiplayer because they harm everyone, not just the doer.
- Solve only the most severe griefing strategies — block game-destroying ones (door-blocking, monster-luring) and tolerate low-value ones (suicide, hiding); add policing only as a last line of defense.
- Design against griefing — avoid easily exploited systems (open PvP, stealing, unfair trades, blockable doorways, loopholes); make griefing boring, patch loopholes relentlessly, and use filter+report systems plus no-feedback obscenity handling.
- Never assume players will cooperate — build multiplayer robust to dropouts, griefers, and wrong play; truly coordinated teams are rare in the wild.
- Convert real-time games to turn-based via short simultaneous turns (declare-then-reveal) — gives the feel of uncertainty in a tabletop format.
- For social-network games, build core mechanics around the network so it becomes a play dynamic — network-integrated designs beat network-independent ports; favor turn-based, friend-affecting designs that are easy to understand and propagate.

### AI as a Mechanic

- Randomize enemy ability per-instance and sprinkle in "dumb" enemies that do the wrong thing — unpredictability keeps the player from solving the pattern; desynchronize repeated AI actions to avoid a "firing-squad" effect.

### Modularity & Reuse of Mechanics in Code

- Identify what varies and separate it from what stays the same — isolate volatile behavior (AI brains, weapon fire, movement, scoring) behind its own class so it changes without touching stable code (widely corroborated).
- Use the Command pattern to encapsulate actions as objects — turning actions into data makes them queueable, loggable, undoable, replayable; perfect for input remapping, action queues, turn-based moves, RTS orders.
- Model status ailments (poison, sleep, slow/fast, silence) as flag-driven multipliers on base stats — beneficial and harmful effects share one mechanism and stack predictably.

### IP, Sequels & Mechanic Translation

- Approach sequels with Exploit, Expand, Explore, Exterminate — keep what's good, improve features, innovate something new, cut what weakens the core.
- Ship a sequel/iteration that meaningfully changes roles or content, not just a reskin — Donkey Kong Jr. swapped hero/villain roles and Ms. Pac-Man added mazes; iteration must add genuine novelty.
- Old mechanics are ripe for reinvention — cloning a classic teaches you what polish is and the gameplay is already honed (Crush the Castle → Angry Birds, Bejeweled → Candy Crush); the older the source, the more you must add to differentiate.
- Learn an unfamiliar genre by playing many examples first as a player, then as a designer — separate genre conventions players expect from superficial similarities you can change.

### Iteration & Prototyping the Mechanic

- Prototype the riskiest/most-uncertain part first (the choke point), with no art/audio — if it's fun and technically feasible without polish, the design is sound; the prototype can be thrown away.

### Engagement, Empowerment & Player Motivation through Mechanics

- Give the game endogenous value — make in-game items/score genuinely matter to progress (Sonic's rings protect + grant lives; Bubsy's yarn balls did nothing and got ignored) (widely corroborated).
- Require strategy plus dexterity, not one alone — the best games mix quick reaction with real decisions; alternate skill and chance phases (deal cards = chance, play them = skill) for a pleasing tension/relaxation rhythm.
- Let the player occasionally be subversive — going against the "official" way is fun (Will Wright's bulldozer in SimCity).
