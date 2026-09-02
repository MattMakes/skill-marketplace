## Prototyping, Iteration, Playtesting & Scope


### The Rule of the Loop (Iterate to Find the Game)

- Obey the Rule of the Loop — more test-and-improve cycles always yield a better game (and better feel); treat it as an absolute, not a perspective, and maximize loops with no exceptions (widely corroborated).
- Answer the loop's two questions every cycle — make each loop count (assess and mitigate risk) and loop as fast as possible (build many rough prototypes).
- Iterate relentlessly through the full cycle (set goals → conceive → formalize → build → test → evaluate → repeat) — design through play; a single pass never produces a good game and the cycle answers questions you didn't know you had; fun is discovered by refining, not by planning (widely corroborated).
- Reject the waterfall; use a spiral/agile loop — design, find biggest risks, prototype to mitigate, test, refine, repeat.
- Treat game design as knowledge creation, not implementation — like the Wright brothers, deploy whatever method (rumination, research, brainstorming, prototyping, written analysis, debate, testing, metrics) best answers the next unknown.
- Tighten the loop as production proceeds — testing cycles should make smaller changes as the design solidifies; broad cheap changes early, detail-only changes late (V-shaped stages).
- Seize windfall/slip time for more iteration loops — unplanned schedule slips (e.g. Halo's platform changes) are chances to cut what's broken and improve what works.
- Use rapid-iteration engines to embrace controlled chaos — when recompiles are cheap, change gameplay 100% between versions, play it, and let testers discover emergent fun.
- Use a fast-loop engine with live code-while-running — late-binding/scripting languages let you recode without rebuild, multiplying loops per day; split slow-static and fast-dynamic code if needed (widely corroborated).
- Embrace the paradox of quality — accepting rough early work and maximizing iteration count yields a better final game than perfecting every early stage.

### Plan vs. Iterate (Resolving the Planning Tension)

- Recognize game design as uniquely uncertain — "to be a game designer is to be wrong"; Halo, BioShock, and The Sims all transformed radically mid-development.
- Choose your planning horizon by uncertainty — plan deep for derivative/sequel work, shallow (a day or less) for original work where nothing is proven; the horizon lengthens as the project solidifies and as good tools make testing cheaper.
- Counter the biases that drive overplanning — optimism/overconfidence, therapeutic planning (planning to ease anxiety), group bias toward confident leaders, and hindsight bias that hides past chaos.
- Adopt Agile values — working software over documentation, responding to change over following a plan; games are discovered, so plans must flex.
- Do a passion check each sprint — fading passion signals a dying game; passion is your subconscious flagging excitement.
- Be willing to change your mind mid-project when evidence demands it — sunk-cost attachment kills good games.

### Risk Analysis & Risk-Mitigating Prototypes

- Run a risk analysis early — list everything that could kill the project, then mitigate the biggest risks first with targeted prototypes (widely corroborated).
- Build small prototypes to kill risks, biggest-risk-first — risk management forces you to confront the parts of your game in danger.
- Use risk management — list the scariest risks honestly, prototype to kill them biggest-first, and prepare a Plan B for each; don't leave high-risk tasks (file formats, key algorithms, networking, novel tech) to the last minute.
- Prove risky tech and differentiating features in preproduction — build one playable level with a small (cheap) team to verify feasibility before funding full production.
- When uncertainty is high, buy cheap knowledge before committing — float ideas noncommittally, ask the friendliest expert, let rumination run; a day spent gaining certainty usually pays for itself.
- Keep most ideas liquid in a design backlog — record inspiration but don't interlock it into a fixed plan; pull pieces onto the active stack only when the foundation beneath is solid and certain.

### One Hypothesis Per Prototype (Ask a Specific Question)

- Make each prototype answer one specific stated question with a hypothesis — focus it on a single axis of risk (game economy, interface/control, tech feasibility, or feel); a prototype is a question to answer, not a product to ship, and one that tries to prove everything proves nothing — if you can't state the question, the prototype is a time-wasting boondoggle (widely corroborated).
- Always ask a question and state a hypothesis per prototype — prototypes validate or refute ideas, they don't generate them; without a testable claim you're wasting time.
- Prototype the four areas separately — game mechanics, aesthetics, kinesthetics, and technology each spawn small focused prototypes answering different questions.
- Work economically and decompose the design problem into small weak pieces you can kill or solve independently — don't prototype everything at once (that's just building the game).
- Choose the prototype shape by your current biggest risk — vertical slice to prove the full experience deeply, horizontal slice to prove breadth.
- Stay falsifiable — validate results with real players as early as possible; don't explain away feedback or protect a prototype past the point you can still fix the design cheaply.

### Throwaway Prototypes vs. Building on a Foundation

- Plan to throw prototypes away; don't get attached — keep only the pieces that truly work and combine them later ("learn to cut up your babies") (widely corroborated). **When it flips:** for feel-heavy systems (player control, camera, juice) you must build the prototype digitally and iterate it toward the real thing, since the tuned values themselves become production assets — the algorithm/concept survives even if the scaffolding doesn't.
- Prototype in a throwaway language (Flash/Java/Processing/Excel) so you can't reuse the code, and keep prototype code disposable — the takeaway is the algorithm/concept, not the code; "steal it, fake it, or rehash it," then write clean real code later. **When it flips:** in rapid-iteration engines (e.g. Unity) the prototype and production project are often the same artifact, so build the playable prototype incrementally (graphics → controls → level → goals → polish) directly in that engine to multiply loops per day, splitting slow-static from fast-dynamic code — but still keep scaffolding disposable and rewrite messy logic cleanly once you know what to build.
- Keep prototype code disposable — don't engineer prototypes for reuse; "steal it, fake it, or rehash it," then write clean real code later once you've learned what to build.
- Don't engineer prototypes for reuse — over-engineering a prototype wastes the speed that justifies prototyping at all.
- Reframe "failed" prototypes as studies — like an artist's sketches, a hard drive full of failed prototypes is accumulated design experience; the real failure is an ambitious finished project built without proving the core first.
- Cap prototype time at two days to two weeks, using a throwaway language and making each prototype answer one stated question — minimize time-to-first-failure; the takeaway is the algorithm/concept, not the code; if you're weeks in with only an engine you've failed, so never build an engine to prove a gameplay idea, and resist turning prototype code into shipping code.
- Build the engine/foundation expecting to redo it once — treat the game as "a stream of bytes whose representation matters"; design data structures up front but accept you'll redo them after you learn more. **When it flips:** this is the build-on-a-solid-foundation regime for production engine code (renderers, frameworks, save systems), the opposite of throwaway prototype code — invest in clean architecture there because it lives for years, while keeping the gameplay-proving layer cheap and disposable.

### Paper vs. Digital Prototyping

- Prototype on paper/cardboard/index cards (or a spreadsheet/non-visual prototype for number-crunching systems) whenever possible — board-game versions of digital games, even an FPS paced with a metronome, surface gameplay/economy/rules problems in minutes for almost no cost (widely corroborated). **When it flips:** kinesthetic/game-feel/timing/juice/reflex/real-time questions cannot be tested on paper → prototype them digitally (a visual prototype for feel/timing/kinesthetics), because paper can't simulate moment-to-moment responsiveness.
- Use paper prototypes first for systems, economy, balance, and rule exploration — paper iterates in minutes where code iterates in hours, is trivial to re-rule mid-session, and is great for testing internal economies cheaply. (widely corroborated)
- Build a digital prototype to prove the things paper can't — feel, timing, juice, and real-time interaction are the whole point of going digital.
- Prototype the core control mechanic digitally before progressing — kinesthetics and controller feel (Katamari's sticky ball, a gesture system) can only be judged in motion, not on paper; build and tune the core control mechanic first.
- Use a spreadsheet/non-visual prototype when the math (resource accounting) is the problem — code the accounting and keep paper for visuals instead of building a full visual prototype.
- Test interfaces early and often with paper/cardboard prototypes — no one gets a new interface right the first time (widely corroborated).

### Prototyping Process Tactics

- Make prototypes fast, cheap, public, and physical — public so the team experiences it together, cheap so no one fears building or discarding it, physical so it gets the team arguing and sharing ideas.
- Parallelize independent prototypes — engineers test tech, artists test art, scripters test gameplay simultaneously to answer more questions per day (widely corroborated).
- Commit to ideas fast, then reverse fast when wrong — ideas are paper cups, not fine china; snap decisions surface flaws and benefits faster than deliberation (widely corroborated).
- State the problem before brainstorming solutions — broad creative space, clear quality measure, better team communication; don't over-constrain by jumping to a solution.
- Build accessible tuning into every prototype (ideally live-editable) before you need to balance — expose every value as an editable variable/text file surfaced in the interface so you can tune live during play and playtesting; never bury numbers as literals in code (widely corroborated).
- Avoid literal constants in prototype/gameplay code — write `rate * count`, not `15*2`, and surface the variables in the interface (inspector or text file) so you never recompile mid-playtest to change a number (widely corroborated).
- Get artists involved early; treat concept art as a prototype — sketches change designs, secure funding, and excite the team; let abstract prototype and concept art seesaw.
- Use concept art and illustrations to ground abstract prototypes and drive new gameplay ideas — the abstract-prototype ↔ concept-art exchange surfaces ideas neither produces alone.
- Choose music at the very start of the project — picking music that feels how the game should play locks in subconscious design decisions; if gameplay fights the music, change the gameplay.
- Graybox aggressively and resist premature production — build low-fidelity placeholders for levels, creatures, cutscenes, dialogue, and audio; they test like the real thing at a fraction of the cost, protect artists' work from being trashed, and keep the mechanical core changeable. A working graybox prototype, not a doc, is the true equivalent of a screenplay (widely corroborated).

### Build the Toy First

- Build the toy first — make the core interaction fun to play with, with no goal, before designing any game/goals around it (Lemmings, GTA-from-Pac-Man, SimCity, Will Wright's bulldozer); a boring toy can't be saved by good levels (widely corroborated).
- Build the toy then the playground in that order — prove the core interaction fun on its own first, then build levels around it; a boring toy cannot be saved by good levels.
- Build a good toy first, then a puzzle/game — the player should enjoy manipulating it before reaching any solution; weave puzzles into the fabric so they advance the goal, never act as a mere distraction.
- Test fun (and your prototype) with all dressing stripped away — if the bare mechanics aren't fun with no graphics/sound/story, no amount of polish or fiction will fix it; dressing only focuses and magnifies existing fun.
- Question whether it even has to be a "game" — if a toy or activity meets the real goal, don't over-constrain into a game.

### Identify & Build the Core First

- Identify and build core gameplay first — the irreducible mechanics that still make a worthwhile game (StarCraft's workers + Marines); it's the shortest path to a testable platform for iteration.
- Don't begin production without a proven core mechanic and clear player-experience goals — software cost rises sharply after production starts; settle the design questions while changes are cheap.
- Prototype the core mechanic physically before any code or art — once programmers start coding, changing core gameplay becomes prohibitively hard.
- Design and validate mechanics during concept and elaboration, before tuning — settle the core systems early; tuning a broken core is wasted effort.
- Find the fastest path to a playable test, not the most complete build — you learn nothing until something is playable (widely corroborated).
- Prove the core loop before investing in detail — build a playable prototype incrementally (graphics → controls → level → goals → polish) and refine feel afterward (widely corroborated).
- Pick a small, complete loop (menu → play → progress → return) over a big feature pile — even a compact loop teaches start/play/progress/restart and feels like a real game.
- Find a polished reference to model and study every nuance before coding a feel-heavy system — copy a stable target (e.g., tabulate Mario 64's animation/transition states), then improve on it; deconstruct great games by observation.
- Deconstruct great games by observation to learn their core feel — you can reverse-engineer control/animation techniques without source.

### Finding the Fun

- Playtest specifically for fun and feel, separate from bug-hunting — "works as intended" is not enough; games must be enjoyable and QA can't inject quality into a fundamentally bad design; treat finding the fun as empirical and iterate playtest → change → playtest until fun survives repeated trials.
- Tune any new mechanic until it's both functional AND fun, in that order — make it work first, then make it fun (CoD3 bikes: first drivable, then fast + drift-capable); a mechanic that isn't fun drags the whole experience.
- Prototype the core game by playing it daily and tuning by instinct (Bruce Shelley) — evolve the game through play, adjusting parameters every day during development.
- Reject the fallacy of vision — a mental movie of a great experience is not a design for the system that generates it; antidote: deliberately envision the game's worst experiences, not its best.
- Stay observant and adaptable to capture serendipity — most revolutionary designs (Rogue, The Sims, SimCity, Portal's GLaDOS, Braid's finale) were stumbled upon, not authored; iteration keeps the future open to seize them.
- Define the experience (aesthetic goal) first, then choose mechanics that produce it — Snakes & Ladders becomes strategic only when you change mechanics toward a chosen feel.
- Use playtest feedback to gather player experiences, not suggestions — you can generate ideas yourself; what you can't get is another person's experience.

### Playtesting Methodology — Setup

- Define every playtest by why/who/where/what/how — enter with a specific question ("is level 3 too long?") not "is it fun?"; the question determines everything else (widely corroborated).
- Distinguish playtesting from focus groups, QA (bug-finding), and usability testing — only playtesting checks whether the game creates the intended experience; don't conflate it with bug-hunting, market validation, or interface evaluation (widely corroborated).
- Use a rigorous test protocol — a bad protocol is worse than none because it gives false confidence (the in-room-with-friends shooter test hid the online-stranger failures that killed the game).
- Use a test script and stay an observer — write intro, warm-up, 15–20 min play, then discussion; the script curbs your impulse to talk and keeps you neutral.
- Write down your tester/playtest intro speech and refine it gradually across sessions — the tuned version becomes a clear, welcoming in-game tutorial.
- Use formal individual tests (lab, scripted protocol) when you need clean, comparable observations — structure controls confounds.
- Embrace playtesting despite the fear of rejection — its whole point is to reveal which comfortable decisions are wrong while there's still time to fix them.
- Run beta tests in stages (closed → limited → open) to widen exposure safely — phased rollout catches issues before scale.

### Playtesting Methodology — Choosing Testers

- Match testers to your question — developers (close, caveated), friends (biased), expert gamers (jaded, niche tastes), and fresh "tissue/Kleenex" testers (one-time fresh eyes); use the right mix at the right time (widely corroborated).
- Map your playtester circles (yourself → friends → acquaintances → tissue testers → the internet) and use each for the right stage — fresh "tissue" testers reveal first-time confusion you can never see again.
- Recruit playtesters from your target market and screen for articulateness — testers who'd actually buy your kind of game give relevant feedback and useful market comparison.
- Match testers to questions and use varied skill levels — playtest with both novices and experts, since testing only experts bores novices and only novices bores experts; mix to ensure fun first, later, and much later, and decide what percentage of players you want to finish.
- Choose playtesters to match your question — fresh Kleenex testers for first-minutes data, dedicated experts for high-skill balance; sample enough that experiences start repeating.
- Remember developers aren't typical gamers — you know far more about games than your audience; what's fun or obvious to the team may be too hard or invisible to players, so test with real, typical gamers throughout.
- Usability-test with fresh, target-market, never-played-it "tissue" testers (3–8 per market segment, ideally one-on-one), refining a tester intro speech across sessions — the better you know your game, the blinder you are to first-encounter problems and first-impression friction.
- Get other people, ideally other designers, to playtest your levels — outside testers see the map for what it is and know what to look for; this is the most underrated factor in a great map.

### Playtesting Methodology — Don't Lead, Observe

- Don't explain the game; observe — once you've told a tester how it works, you've lost their natural first impression forever; let them make mistakes, you learn more from those (widely corroborated).
- Stay completely silent and neutral during over-the-shoulder playtests — never give players info real players won't have, no matter how painful watching them get stuck (widely corroborated).
- Watch someone else play your level/game silently and don't rescue them when they're stuck — their struggle is the finding and reveals whether controls, camera, difficulty curve, and objectives actually read; stay neutral and never give players info real players wouldn't have.
- Watch players' faces, not just the screen — facial expressions reveal how players feel and how feel and friction land, data that won't surface in surveys or interviews.
- Ask testers to think out loud — a running monologue of choices and uncertainties reveals expectations far better than silent play; gently prompt when they forget.
- Take criticism without responding — don't answer or excuse; write it down; you can't fix problems you refuse to hear, and leading testers makes them tell you what you want.
- Set your ego aside in interviews and give permission to be brutally honest — players soften feedback unless explicitly freed to be harsh.
- During the design phase, listen more than you talk — the best ideas surface when you absorb playtest reactions instead of defending your vision.

### Playtesting Methodology — The Right Questions

- Probe memory with neutral questions ("tell me the story of what happened," "why did you choose that path"), never leading ones — verbal reports are unreliable and easily contaminated; never trust off-the-cuff explanations of why players liked/disliked something (widely corroborated).
- Probe memory, not opinions about design — don't expect testers to be designers; capture their experience, not their proposed solutions.
- Ask for ranked lists ("your three least favorite parts") — concrete rankings beat vague approval and surface what to fix first.
- Avoid memory tests in interviews — don't quiz players on trivia; ask about experience and feeling.
- Be a great playtester yourself — observe, take notes, and report experience, not solutions; your job is data, not redesign.

### Reading Results — Data, Metrics & Avoiding Misattribution

- Hunt for surprises you weren't testing for — the sweetest insights come from understanding the unexpected.

### Failing Fast & Continuous Testing

- Playtest as early and as often as possible — start the moment a few sections are blocked in to feel scale, space, and layout (widely corroborated).
- Playtest early, often, and with people who are not you — designers are blind to their own game's friction.
- Minimize time-to-first-failure — cap prototype time, decompose the problem, and kill bad ideas fast rather than nursing them.
- Compile and test continuously while building, fixing bugs as you go — never defer all debugging to the end where causes are tangled.
- Build features in small verified steps, testing after each — small isolated tests catch setup mistakes early before they compound.
- Test each AI, scripting, and gameplay feature in-game as you add it — catch problems while they're still cheap to fix.

### Scoping & Cutting

- Strip extraneous elements by removal-and-retest — remove the least important element and retest; keep removing until the game breaks, to find what actually has no purpose ("start with a fun game, put stuff in, take stuff out").
- Focus values to your resources — small teams should spike one or two unique values into the stratosphere (Garry's Mod, Dwarf Fortress), not produce a mediocre clone with a flat value curve.
- Be willing to abandon sunk work — drop attachment to prototypes, features, and code that the evidence says aren't working.

### Phase Discipline & Production Gates

- Budget heavily for the polish-and-debug tail — expect the last 10% to take a second 90% of the time; ~70% of a game's quality comes during the final QA/polish stage.

### Brainstorming & Ideation Into the Loop

- Generate ideas by the dozens and write down even the stupid ones — "the best way to have good ideas is to have a lot of ideas"; stupid ones unblock genius ones (widely corroborated).
- Separate generation from judgment — brainstorm freely (ban criticism, chase quantity, ~100 ideas/hour), then evaluate days later against feasibility, market, artistic interest, and cost (widely corroborated).
- Run brainstorming in phases — expansion (generate), collection, collision (combine), then rating — separating generation from judgment yields more and better ideas.
- Record every idea immediately — written ideas free mental space and prevent re-solving the same problems; a clean mind brainstorms better.
- Post ideas on walls and number lists — spatial memory ("the space remembers") helps reconnect dozens of ideas across multi-session brainstorms.
- Have individuals brainstorm alone first, then converge in small groups (≤4) on narrow problems — cold group brainstorming wastes time.
- Mix-and-match across category lists (tech/mechanics/story/aesthetics) — combinatorial recombination yields game concepts you'd never reach directly.
- Brainstorm new designs by recombining and nesting proven mechanic patterns (engines, friction, escalation, feedback) — patterns elaborate into detail and nest inside each other; mixing them is a fast idea generator.
- Mine inspiration from outside games — sociology, agriculture, biology, urban planning, gardening; the best ideas come from non-game domains and break you out of derivative design (widely corroborated).
- Use constraints to drive creativity — deliberately limiting yourself ("one-button game," "pennies and a deck of cards," "a game about exact cover") is one of the most fruitful ways to prod design innovation.
- Destroy your assumptions as an exercise — list everything you assume true, then break each; blowing up "one game doesn't affect the next" yielded Risk: Legacy.
- Keep a game journal analyzing why mechanics exist — record emotional responses and underlying mechanics, not just features; builds game literacy and a future-idea bank.
- Research prior art in your genre before building — reuse solved problems and differentiate deliberately (study Halo/Marathon before another shooter).

### Designer Vision vs. Playtest/Data-Driven Design

- Design for the player, not for yourself or the team — your taste is not the audience's taste; "design the game for the millions who'll play it." **When it flips:** for personal/auteur and transformational works, design with explicit authorial intent — decide what learning pattern the system itself should invoke and shape the player, since meaning comes from your vision, not from a popularity vote.
- Design with the team, not in isolation — including everyone yields more options, weeds out flaws fast, gains perspectives, and creates shared ownership (widely corroborated).
- Leave some design ambiguity for implementers — under-fleshed details let the developers closest to a feature own and improve them.
- Anticipate house rules as a signal — if players keep modifying your rules, the base rules are signaling a flaw; listen to what their changes reveal.

### Emergence, Discovery & Testing Past the Complexity Barrier

- Expect and embrace unexpected emergence — players will find strategies you never intended; identify the optimal strategy yourself and make sure it isn't boring or dominant.

### Level Design Iteration & Scope

- Release your work, then take inventory of what went well and what to improve — you learn more from one released map than ten unfinished ones.

### Documentation as a Living Tool (Not a Blueprint)

- Reject the myth of the magic design-document template — documents exist only for memory and communication; they are theories, not blueprints, and go stale past mid-project (widely corroborated).
