## Production, Team, QA, Version Control & Shipping


### Production Stages, Phases & Milestones

- Move through distinct phases, each with its own goals — preproduction → production → alpha → beta → gold → post-release; phase discipline prevents endless tinkering.
- Treat preproduction as exploration until two fully finished, shippable/publishable levels exist — only then (Cerny's "Method," ~30% of budget) can you reliably schedule the rest.
- Develop in V-shaped stages — broad cheap changes early (concept/preproduction), narrowing to detail-only by QA; preproduction is the most critical stage, so kill a bad-looking game after ~6 months while losses are negligible.
- At alpha, lock features (feature-complete with temp/placeholder assets) — alpha is about freezing scope, not being bug-free.
- At alpha, cut ambitious incomplete features to hit feature-complete — a game with half-built systems can't be stabilized, and nearly every game ships with minor deferred bugs.
- At beta, require all assets final and all high-priority bugs addressed — beta is your last real window for major fixes plus polish.
- Reserve late beta for polish — the gap between a 75% and a 95% review score is almost entirely polish time, so protect it.
- Gate gold on zero showstoppers, all levels loading, and only minor low-priority bugs left or deferred — that is the real definition of shippable.
- Split work into a changing-features (alpha) phase and a feature-frozen (beta) testing/debugging phase — schedule real QA time and re-test fully after every beta build.
- Apply the 50% rules — build so a 50% budget cut still ships something, and have all core gameplay playable at the schedule's halfway mark.
- Reach "preproduction done" before committing a schedule — that's the earliest point at which estimates become reliable.
- Maintain a tailored set of small subsystem design documents (overview, detailed design, story bible, technical design, pipeline, limitations, art bible, budget, schedule, script, tutorial/manual) over one giant doc — write only the docs your game and team actually need, and expect them to go stale past mid-project since they are theories, not blueprints.
- Don't wait to start; ship small finished prototypes early — completed tiny games teach more than unfinished ambitious ones.
- Scope aggressively and treat overscoping as the default failure mode — most projects die from doing too much, not too little.

### Planning vs Iteration (and when each wins)

- Iterate instead of over- or under-planning — make short-range plans, build, test, repeat; deep up-front plans collapse on contact with reality, while no plan yields an incoherent Frankenstein (widely corroborated). **When it flips:** (a) derivative/sequel/port work with low uncertainty → plan deep, since the design space is known and detailed scheduling pays off; (b) original, never-before-seen work → plan to a horizon of a day or less, because deep plans about uncertain mechanics rarely survive first contact with play.
- Plan to a shorter horizon when testing is cheap — treat good tools and fast-loop engines as a lever on the build-vs-plan trade-off, shifting it so you can take design risks that surface designs you'd never plan.
- Plan deeper only to make conceptual leaps — iteration is hill-climbing (it optimizes but won't reach a distant mountain); occasionally make untested big changes to escape local optima.
- Never code without a written plan; spend (and triple) your planning estimate up front — one well-spent planning hour saves hundreds of coding hours; "code and fix" is the most inefficient lifecycle. **When it flips:** for an original game's uncertain core whose fun is unknown, a heavy written spec is premature — a playable graybox prototype is the real plan/"screenplay"; build and test instead of over-planning, and reserve deep written planning for the parts that are actually known.
- Plan from goals down (goals → deliverables → schedule → budget) and revise — when over budget, cut goals first and cascade; never just fiddle the numbers or you'll overpromise and underbudget.
- Run Scrum: small cross-functional teams, a prioritized product backlog, short timeboxed sprints, short releases, and regular team meetings — short turnaround forces communication, keeps momentum and visibility, and suits the fluid nature of solving hard game-design problems.
- Track sprints with burndown charts and compute velocity from real vs. estimated hours, then use the gap between estimated and actual hours to recalibrate future estimates — velocity turns guesswork into forecastable scheduling, and your past estimation inaccuracy is your best forecasting tool.
- Prioritize and assign backlog tasks explicitly each sprint — unprioritized work drifts to the easy, not the important.
- Accept that software design is chaotic and iterative (round-trip gestalt) — work top-down and bottom-up at once; revisit the design after every alpha, starting with the ugliest code.

### Knowledge Creation, Dependencies & Work Order

- Map dependencies before deciding work order — a change in a foundational element forces changes in everything above it; build the stack upward from elements that depend on nothing.
- Account for cascading uncertainty — uncertainty multiplies through dependency layers, so elements high in the stack almost always need major redesign; don't fully spec them yet.
- Run debate only under the right conditions — skilled, diverse, respectful debaters with no power imbalance; bosses must prove evenhandedness or subordinates go soft on bad ideas.
- Weigh the full effects of a decision beyond the game before committing — implementation cost, immaturity burden, critical-failure risk, process burden, political effects, cultural effects, and the cost of deciding itself; make small decisions off the cuff, reserve heavy analysis for important ones.

### Team Leadership & Authority

- Reject Taylorism for game development — the work carries too much knowledge, much of it tacit, for one controlling mind; concentrating decisions overwhelms the center and degrades quality.
- Distribute authority to where natural authority lies — let each developer decide the work they understand best; this uses everyone's brainpower and local knowledge like a distributed mind.
- Don't arrogate / micromanage ("swoop and poop") — leaders lack the hundreds of hours of iteration that the people in the trenches have; arrogation discards their knowledge and ruins climate.
- Lead by communicating intent, not task lists — give the purpose and goals of the work, let subordinates decide execution, and require condensed summaries flowing back up so leaders can iterate on macro structure.
- Trust your team as a literal necessity — you can't possibly understand everyone's work, so you can't cover their mistakes; hire people you can trust, then trust them.
- Foster level/feature designers' creativity rather than dictating — a strong gameplay system inspires combinations you didn't imagine; micromanaging yields worse results and less-invested designers.
- Let creative leadership and clear ownership drive the work — talent leaves to retain creative leadership (Activision, the first third-party publisher); autonomy fuels the best output.
- Treat the designer as a conduit for the team's ideas, not just an idea-fighter — the vision-holder is not the sole idea generator; packaging others' good ideas into the framework earns trust and makes the design cohere and everything flow.
- Separate the designer role from producer/programmer/artist where possible — combining them creates conflicts of interest (a coder won't kill a feature they spent months on); someone must focus purely on gameplay and the player.

### Team Motivation, Climate & the Progress Principle

- Get the whole team to love the game/project (or the audience) — shared love is the single biggest predictor of a great game; a strong unifying theme is what lets everyone fall in love with and contribute to the same vision, so fix love deficits (wrong game, wrong vision, can't-love-any-game members) deliberately.
- Help team members fall in love with the actual game — reframe constraints into exciting opportunities (animators reframed "no characters" into spectacular ship-destruction).
- Cultivate good climate — people who expect support take risks and ask questions; people who expect blame stay silent, and bad climate silently kills games by causing good things not to happen.
- Lead with love, not fear — fear is quick and seductive but a feeble fuel for creativity; love is slow but unlocks self-identified commitment (Jim Henson vs. Gordon Ramsay's standards-driven kitchen).
- Offer meaningful work — creative people are driven by challenge, autonomy, ownership, recognition, belonging, and making a difference; the holy grail is self-identified commitment where the work becomes part of who they are.
- Avoid extrinsic rewards in game dev — performance is unmeasurable, money displaces intrinsic love, incentives create perverse politics and distract; punishment/fear neurologically kills creativity.
- Apply the progress principle — frequent, visible, small daily wins are the strongest driver of inner work life; structure and track work (small tasks crossed off) so momentum is felt, especially on tiny teams.
- Use playtests as natural, unlimited, trustworthy motivation and feedback — unmediated real consequences beat a boss's carrots and sticks and have no ceiling on achievable quality.
- Treat people as capable and elite — expectations become self-fulfilling; foster a sense of specialness (Imagineers) that gives developers a precedent to live up to.
- Use light "chicken motivators" — non-serious, non-confrontational social symbols (a rubber chicken for breaking the build) send a message without poisoning climate.
- Make the team feel authorship — all contribute to design; use "we" not "I", run open brainstorms, hold lead meetings, solicit input so everyone can point to part of the game and say "I worked on that."
- Hold designer values in tension — openness (entertain ideas you disagree with), candor (voice contrary opinions despite social cost), humility (accept how little you can understand of an unfathomable system), and hunger (always improve regardless of external standards).
- Give creative contributors visible credit — the Easter-egg tradition began as a protest for recognition; crediting talent retains it and prevents defections that spawn rivals.
- Rotate "builder," "documenter," and "presenter" roles so everyone gains experience — but for the final push, assign each role to whoever does it best; everyone owns something, nobody does everything.
- Provide physical and emotional comfort — uncomfortable, hungry, or disrespected people communicate poorly.

### Team Communication

- Communicate objectively — discuss "the spaceship idea," not "my idea"; phrase alternatives as questions ("what if we did B?") to depersonalize and surface shy voices.
- Be clear and concrete — specify deliverables ("3-5 page combat interface doc by Thursday 5pm"), illustrate ideas, and never fake understanding.
- Make communication persistent — write things down; use notebooks, email, wikis; include everyone so no one is left out.
- Build trust through quantity of face-to-face contact — co-locate teams and eat together; siloed lunch tables signal pipeline/porting problems.
- Drive toward unity — no decision is final until everyone buys in; ask a holdout "what would it take to bring you in?"; one disengaged member halves the team. "Disagree and commit" when consensus stalls.
- Communicate with each discipline in their language and with visual references — bring reference material to artists, learn enough programming for engineers, respect the hierarchy (go through the lead, not around them).
- Develop procedural literacy even as a designer — learn basic programming to write feasible specs; "designing without knowing how to program is like painting without a brush."
- Commit to a daily build that runs every day — lets the whole team see the game and catch problems early (Blizzard adopted this on WarCraft III and never went back). **When it flips:** the build discipline serves the creative work, not vice versa — keep the cadence but don't let "must run daily" pressure freeze risky experiments out of the build; branch or stub so iteration stays free.

### Design Documentation

- Write documents only for memory and communication — there is no magic Game Design Document template; create only the docs your game and team actually need.
- Grow the design doc organically from a bullet list of ideas, questions, and recorded decisions-with-reasons — capture the questions (the real design work) and the rationale for each answer.
- Treat the design document/wiki as a living communication tool, not a deliverable — write it after prototyping, write many small subsystem documents over one giant one tailored to the team, and keep them modular and succinct (~50–100 pages); never let it substitute for talking to the team.
- Make every game explainable in one diagram/poster — a one-page design overview clarifies how the whole fits together.
- Flowchart the whole game and wireframe every key screen before writing the doc — forces you through the entire player experience, surfaces inconsistencies before any art/code, and gives a visual reference (usability-test wireframes early).
- Answer your design's ten hardest, most jaded questions up front — if you can't answer the toughest challenges to your design, that's a sign to reconsider making the game.
- Treat the design document/wiki/GDD as a living communication tool, not a deliverable — keep it current and use it (plus supplied materials) to author test cases; neglected design docs are a root cause of missed features and blown street dates.
- Write a one-page specification sketch (concept, appearance, controls, behavior) early and defer the full spec — demanding a full spec up front just makes people skip planning; always draw a rough picture of the screen.
- Always draw a picture of the screen, however rough — pictures are all-important in early game conceptualizing.
- Do extensive requirements gathering with real stakeholders before writing a line of code — iterate requirement↔specification until they match, so you don't build the wrong thing.
- Write the User's Guide alongside the code, updating it whenever a feature changes — documentation work both prevents forgetting controls/ranges and surfaces UI improvements; make it specific (what changes, valid range, why, example), never tautological.

### QA Process & Lifecycle

- Test at every stage, not just at the end — bugs caught in alpha cost far less than ones found near gold or shipped.
- Embed QA inside the dev process (Scrum teams, content reviewed as built) — near-immediate feedback enables faster iteration and tighter polish than throwing a finished unit over the wall.
- Treat the QA schedule as fixed, never as a buffer to squeeze when you slip — squeezing it is exactly how showstoppers reach players.
- Make a feature "done" only when its owner AND a QA lead have signed off — verbal "it works" without verification is how regressions ship.
- Make production testing stabilize builds for QA — a broken build is money down the drain with testers idle.
- Polish in the last 10% — roughly 70% of a game's perceived quality comes during the final QA/polish stage; budget enough schedule to truly tune timing, controls, and levels rather than rushing (widely corroborated).
- Expect the last 10% to take a second 90% of the time — programs are fractal coastlines; budget heavily for the polish-and-debug tail.
- Recognize that QA can't fix a bad core design — protect good design from bugs, but fun is the designer's responsibility to get right up front.
- Refuse "ship now, patch later" as a substitute for finishing — day-one patches don't produce better games, they just normalize shipping broken.
- Hold quality above the deadline when you can afford it (id/Blizzard model: slip months to ship polished) — word-of-mouth and reviews drive shelf life, not the street date. **When it flips:** under hard certification deadlines or fixed launch windows, slip the date to clean up the submission rather than shipping broken — a single cert miss bounces the whole game, so a clean pass beats hitting an arbitrary date; for live/F2P/competitive titles the post-launch tuning loop is continuous (expect to re-balance after launch as players invent new strategies), so shipping then iterating is the model — but never ship showstoppers regardless.
- Resist feature creep in beta — adding mechanics late reliably causes delays and budget blowouts; resist late feature creep unless you can fully retest the new feature through the whole alpha→beta gauntlet, since risky additions break shipped quality.
- Get a dispassionate tester (or QA group) to find bugs — developers subconsciously avoid the tests that would break their code.

### Test Plans, Types & Techniques

- Build a test plan covering features-to-test, features-not-to-test, techniques, severity definitions, pass/fail criteria, deliverables, schedule, risks, and approvals — it's the master of all checklists.
- Run functionality testing as the baseline — every feature must produce expected results, nothing can crash the game, all assets must render correctly; if expected ≠ actual, write it up.
- Establish "expected behavior" first by just playing the game for a day or two — you can't spot a defect until you know what correct looks like.
- Use ad-hoc (free-form) testing deliberately as a complement to structured checklists, not a replacement — checklists catch surface bugs but the worst bugs surface during relaxed, instinctive play; ad-hoc won't give you methodical coverage.
- Run progression testing (linear play hunting for progression breaks) separately from crash testing — a non-crashing game can still wall off the player (usually a script break).
- Run regression testing after every fix — re-hunt old bugs in current builds because fixes routinely spawn new bugs or resurrect old ones; re-test fully after each fix.
- Automate the repetitive, deterministic work (stress/load tests, install procedures, permutation checks like every upgrade combo) — free humans for judgment, fun, and feel that machines can't assess. **When it flips:** keep humans for anything involving fun, feel, subtle trends, or creative judgment — a computer can flag that something is wrong but not how to make it better.
- Build an "autorun"/self-playing ("monkey on a typewriter") mode for hands-off soak testing — let the program run and randomize its own parameters to surface hidden bugs.
- Run compatibility testing across real hardware permutations (Nvidia + ATI, supported OSes, controllers, USB/Bluetooth) — only test supported configs and verify peripherals on a second machine before filing.
- Test on minimum-spec machines — running acceptably on min spec is a contractual obligation and your widest slice of buyers.
- Localization-test in-region — trigger every translated string in context (e.g. die repeatedly to check death quotes); bad translation kills a game's dramatic impact.
- Test audio on every target output (TV speakers, surround, tiny phone/arcade speakers) — what sounds great on studio monitors can be distorted garbage on the actual device.
- Test every asset inside the actual game world, not in isolation — an asset that's fine standalone can crash or clip in-context.
- Test flexibly: do everything differently than the developer demoed it (keyboard if they used mouse, the other path) — devs show happy paths, so bugs hide on the roads not taken.
- Pursue negative/edge test cases, not just the obvious positive ones — anyone can run the happy path; results come from thinking like an adversarial player.
- Match test emphasis to genre weak spots — techniques and "pet bugs" differ sharply by genre, so deploy testers familiar with the type.

### Genre-Specific Test Focus

- In 3D platformers, hammer player control, camera, and visual bugs — a bad camera alone can sink an otherwise perfect game.
- In single-player FPS, protect weapon feel and keep level design non-labyrinthine — if a tester gets lost, players will too.
- In multiplayer FPS, prioritize connectivity (lag, dropped connections) plus weapon/map balance — balance is the secret of replayable blockbusters.
- In racing/sim, guard physics fidelity, save-game integrity, and frame rate (30 fps minimum, 60 ideal) — losing a 30-car garage or running at 20 fps makes players quit.
- In fighting/reaction games, prioritize reaction time (immediate on-screen feedback) and character balance, and re-test reaction time online where lag bites.
- In adventure/action-adventure, play through every puzzle multiple times — one broken puzzle is a progression break that halts the whole game.
- In RPGs/open-world, test every item alone and in combination across all branching paths — interlocking quests and customizable stats breed insidious bugs; consider automated permutation testing.
- In strategy/sim, focus on balance and AI plus real-world relevance — faulty AI or an underperforming faction guts the fun.
- In MMOs, divide testers by subsystem (items, quests, progression) and dedicate a networking strike team, plus large closed AND open betas — it's the hardest testing there is.
- Reward players for being first to report a bug in live MMOs — players outnumber testers thousands-to-one and find leaks you never could; rewards beat punitive "report-or-be-banned" policies.

### Balance & Game-Feel Testing

- Use matched team sizes and matched skill levels per side when balance-testing multiplayer — skewed teams produce skewed data.
- Play at least an hour, log scores and per-weapon strengths, then swap teams and repeat — only switching sides removes player-skill bias.

### Bug Reporting

- Write the bug title like a newspaper headline using the five Ws (who/what/when/where/why) — devs must grasp it without opening the report.
- Replace opinions with measurements ("Allied shotgun: 2-3 hits to kill vs Axis 1 hit at 4 ft") — "shotgun sucks" is unactionable.
- Give exact location, game mode, player count, and conditions — specificity is the only way a dev across time zones can reproduce it.
- Always include precise, ordered repro steps — one missing detail makes the bug non-reproducible and it bounces back as "can't reproduce."
- Always record repeatability (e.g. 3-out-of-10) — a 5/5 bug is far more urgent than a 1/5, and devs need that snapshot.
- Always log the exact build/version a bug was found in, and re-test fixes against the right version — testing a fix against the wrong version wastes hours and burns reputation.
- Attach diagnostics — dxdiag on PC, memory dump on console crashes — many bugs trace to driver/version mismatches the log reveals instantly.
- Attach annotated screenshots (multiple angles, close + far, red-marked, JPEG not BMP) — visual proof removes doubt and compressed files don't clog the network.
- Attach a slowed-down video capture for hard-to-describe bugs — one good clip replaces a dozen screenshots and the whole step list.
- Search for duplicates before submitting — duplicates irritate devs or get the same thing fixed twice; diligent searching is the only cure.
- Take detailed notes the moment you spot a bug, before touching the database — lab PCs are scarce, so enter bugs fast from notes rather than thinking at the keyboard.
- Aim to get every bug closed in a single round-trip — back-and-forth from vague reports is industry-despised wasted developer time; be a "fire and forget" tester.
- Treat clear written communication as a core tester skill, weighted as heavily as gaming ability — bad writers make bad testers; proofread reports obsessively (read bottom-to-top to catch typos).
- Keep a bug-tracking document recording each bug, how to reproduce it, and the fix — and accept that fixing one bug often breaks another, so re-test fully.

### Bug Triage & Severity

- Classify every bug by both severity (low/medium/high/critical) and category — miscategorizing sends developers on wild goose chases and wrecks planning.
- Treat critical bugs (crashes, freezes, data corruption) as drop-everything — they destroy player trust instantly and fail certification outright.
- Treat high bugs (blocked progression, can't switch weapons, frame rate far below target) as must-fix — a game shipping with them looks rushed or bad.
- Escalate severity by frequency and visibility, not just the symptom — the same glitch is "low" buried in a menu but "medium/high" on the title screen.
- Flag a temp/placeholder texture found in late beta as high priority — placeholders surviving that late mean an asset was forgotten.
- Never ignore a low-priority subsystem (scoring, invites) just because it's low — nasty bugs hide where nobody looks because it "doesn't matter."
- Verify your own fixed bugs with fresh alternate steps before signing off — a falsely-verified bug snowballs and can cost millions in the wild.
- Sign verifications for accountability — testers who verify bugs as fixed that aren't get fired, because one miss can ruin a launch.
- Look for valuable "happy accidents" in feel, not just defects — some famous bugs (Minus World, Asteroids invincibility) became beloved features; document promising ones so a producer can decide to keep and polish them.

### Bug Categories & Diagnosis

- Hunt visual bugs by moving the camera forward/back with the target in sight — motion exposes z-fighting and stray artifacts invisible when static.
- Distinguish asset bugs from performance bugs in audio — skipping/distortion that follows a frame hiccup is performance, not a damaged file; fixing the wrong layer wastes time.
- Treat missing geometry vs invisible walls as opposite failures — art-without-collision lets players escape; collision-without-art blocks them invisibly; investigate invisible walls closely to avoid being NAB'd ("not a bug").
- Distinguish freeze (frozen image, lost input) from crash (black screen, lost input) from crash-to-desktop (OS survives) — each needs different diagnostics, all are critical.
- For networking bugs (invisible players, dropped connections, scoring errors), document everything unusual and compare notes across testers — the hardest to repeat and often shipped unfixed.
- Develop scripting/programming literacy — ~99% of progression breaks are scripting issues; understanding how scripts break targets root causes instead of symptoms.

### Reproducing Hard & Intermittent Bugs

- For a tough/intermittent bug, capture the full state immediately (screenshot, dump, conditions) before attempting repro — early data is what eventually yields steps.
- Scale your effort to bug difficulty — solo for detail work, full team for networking, task force (sub-teams trying varied steps) for the truly intractable; parallel varied steps converge faster than one person guessing.
- When chasing intermittent bugs across many machines, run the whole team on the same task — sheer parallelism turns the team into one powerful repro engine.
- Question even "trusted" core/system functions when a bug defies all assumptions — the defect can live in the platform's own code (e.g. a printf not allocating its buffer).
- Keep an unsolved bug on a personal "short list" for months rather than abandoning it — determination, not improv, cracks the hardest bugs.
- Route ALL game input (keyboard, mouse, pad, network, time) through one input system that can record/playback — enables bug repro, demos, optimization measurement, netcode, AI bug repro/divergence detection on the rare input sequences that cause failures; save input on crash via a structured exception handler.
- Make the game deterministic for record/playback — never change game state in render functions, use separate RNG streams for render vs update, and watch float-optimization drift; store state snapshots alongside recorded input so playback auto-detects divergence — enables bug repro, demos, and netcode.
- Always record input and save it on crash via a structured exception handler — the rare bug is usually a rare input sequence you can only fix if you captured it.
- Store snapshots of game state alongside recorded input — playback can auto-detect divergence (race conditions, accidental code changes) before it becomes visible.
- On a crash, open the Call Stack and walk down to your first own function to find the offending line — the highlighted "crash line" is often deep in library code.
- Test BOTH Debug and Release builds after every version — divergent behavior almost always means uninitialized variables landing in different memory footprints; save a release-only misbehaving state to a parameter file and reload it in Debug to diagnose.
- Always run the debug build under the debugger during development; use trace/log statements for intermittent bugs you don't want to breakpoint — and they auto-disable in release.
- Read runtime error messages and stack locations carefully — an error often surfaces one line after its true cause; trace upstream from the report.
- Remember most bugs are typos — misspellings, wrong capitalization, missing semicolons; check the cheap causes first.
- Use the debugger: set breakpoints and step through code inspecting variables, rather than guessing — stepping shows actual state, not assumed state.
- Deliberately introduce a few bugs while learning so you recognize their error signatures later — familiarity speeds future debugging.

### QA Culture & Tester Craft

- Treat QA as an ally and integral part of the team, not an adversary — combative dev/QA relationships produce worse products; make QA testers part of design early.
- Make QA testers part of design early — let them review wireframes and learn the game; they're your last line of defense and treat bug-reported design features as help, not insult.
- Rotate testers across areas so nobody goes numb to a level's bugs — familiarity breeds blindness to defects.
- Give testers an opinionated-but-malleable mindset — value strong feedback, avoid know-it-alls whose views won't bend.
- Keep one or two high-dexterity testers for reaction-sensitive titles — fast input reveals subtle rendering and interaction issues slow play never triggers.
- Specialize — become the expert at one area (scripting, visual bugs, audio, balance) — a master of one is more valuable and more promotable than a jack-of-all-trades.
- Mandate breaks roughly every three hours during long sessions — fatigued testers lose effectiveness and miss bugs.
- Maintain a living "game bible" (map names, abbreviations, severity rules) on a wiki for new-hire onboarding — shared knowledge prevents inconsistent classification.
- Actually play your own game for an hour to find bugs and bad UI — interactive software needs interactive testing.

### Playtesting (vs QA) & Fun Validation

- Playtest continuously, from the first prototype onward — waiting for a beta is too late to fix core gameplay; the testing cycle should tighten (smaller changes) as production proceeds.
- Wean off friends and family fast and recruit objective strangers from your target market — friends are too harsh or too forgiving due to their relationship with you, while target-market testers give relevant feedback plus useful market comparison.
- Playtest with varied skill levels (novices AND experts) — testing only one group yields a game too hard or too boring; decide what % of players you want to finish.
- Take notes chronologically and combine qualitative with quantitative — feelings reveal what's wrong; data (time-to-complete, click counts, unit-usage stats) reveals where and prioritizes severity.
- In interviews, set ego aside, give permission to be brutally honest, avoid memory tests, don't expect players to be designers, and ask for ranked lists ("your three least favorite parts").
- Run good surveys — labeled 5-point scales (not 1–10), pictures, few questions, given immediately after play, with age/gender noted; don't treat the data as gospel.
- Use focus groups to generate ideas, surveys to evaluate them — group dynamics seed creativity but cause group polarization; for ranking/validation, poll individuals with concrete trade-offs.
- Discount flukes; look for patterns across sessions before redesigning — one weird playtest result may be noise, so don't redesign around an outlier.
- Treat a useful FAQ/walkthrough as a warning sign and study player-written walkthroughs — if a text file makes your game noticeably better, it's information-starved; walkthroughs reveal in detail what's too hard, too easy, liked, and disliked.

### Usability Testing

- Test critical tasks (start a game, understand objective, key choices) with a script — focus on access points; the participant is never wrong, so revise and retest until most target players can get in and play.
- Distinguish playtesting (is it fun/balanced?) from QA (is it broken?), usability testing (is it learnable?), and focus testing (do they like it?) — each answers a different question.

### Telemetry, Metrics & Analytics

- Collect automatic event logs / data-mine play sessions ("digital listening") — reveals problems and gameplay patterns at scale that won't surface in surveys (widely corroborated).
- Use metrics to fine-tune levels and find edge cases invisible to playtests — Half-Life graphed player health/position to find boring and too-hard spots; instrument cleverly (Halo: Reach's "I saw lag" button).
- Use playtesting and metrics to decode emotional cause, not introspection — you can't watch the inside of any mind, even your own.
- Instrument builds with automated data logging to capture what thousands of players actually do — telemetry beats anecdote at scale, but don't let quantitative design kill instinct or yield dull games.
- Collect time-stamped telemetry, derive genre-appropriate metrics, then model players individually and communally — to adapt content, recommend games, and match teams from real behavior.
- Don't let quantitative design kill instinct or yield dull games — collect analytics to inform, but keep design intuition in command; treating data as gospel yields dull games.

### Version Control & Build Hygiene

- Version, timestamp, and multitrack audio assets in named folders, and print all tracks to digital files — plug-in updates silently break old settings, so keep recoverable iterations.
- Back up your work constantly — game code locks the machine frequently; re-deriving AI/collision logic hurts far more than re-running a sort.
- Recover from editor crashes by renaming Temp/_EditModeScene to `.unity` in Assets (Unity) — salvages unsaved scene work.

### Build & Release Pipeline

- For distribution, statically bind libraries into the .exe rather than relying on host .dll files — users may lack or mismatch dynamic libraries; test on a range of machines to catch this.

### Certification & Platform Compliance

- Build to the platform's certification checklist from the start (Sony TRC, Microsoft TCR, Nintendo Lot Check) — these can be hundreds of pages and a single miss bounces the whole submission.
- Bake in standard compliance behaviors — pause on controller disconnect, warn before formatting storage, warn on data corruption, attach trademark/copyright marks, no prohibited imagery; first-party rejects on any of them.
- Treat critical-class bugs as automatic cert failures — crashes, freezes, and data corruption fail certification outright, so they are non-negotiable showstoppers.
- Slip the date if needed to clean up the submission — high-profile clean cert passes (e.g. GTA IV) came from extra in-house time, budget, and headcount, not luck.
- Treat compliance testing as a specialized, rare skill worth cultivating — few testers can comb the full first-party requirements, and it's sought after in hires.
- Anticipate and respect content-rating/regulatory expectations early (ESRB and similar) — backlash over Death Race and Senate hearings birthed the ESRB; bake content suitability into design decisions.

### Performance as a Shipping Concern

- Treat sustained frame rate below target as a real bug and hold the target frame rate throughout production rather than deferring performance to the end — serious perf problems found in the last two months may be unfixable; cap to 30fps only as a last resort for screen tearing.
- Test and report load times by timing every level load repeatedly — long loads are an issue regardless of platform and are notoriously random and hard to crack.
- Treat lag as a symptom (dropped packets, bandwidth) and document context heavily — note whether it's constant, when it started, firewall presence.

### Tooling for Production Efficiency

- Justify every tool by its ROI — estimate build cost vs. time saved before committing; a tool that doesn't return more than it costs is wasted effort.
- Want three things in one tool — issue tracking, a wiki (test plans / shared memory), and a forum (open team discussion) — integrated transparency beats scattered tools.
- Pick a bug tracker the team actually likes to use — if it's painful it won't get used, and tracking by email has grisly consequences.

### Business, Market Strategy & Ethics

- Learn enough business to talk to the money people — "form follows funding"; understanding the model gives you creative control when defending features.
- Follow the money to understand any business model — know where each dollar goes (platform holder, retailer, publisher, developer) and learn the jargon (SKU, COGS, breakeven, NPV, burn rate, churn, DAU/MAU, ARPU, LTV, k-factor, whale).
- Know your breakeven and realistic units sold based on comparable titles — ensure your minimum projection still makes the game profitable.
- Study the top sellers in your market — the industry is hit-driven; publishers analyze hits, so understanding why games succeeded builds common ground and credibility.
- Let purpose drive design — arcade, MMO, retail, art, and microtransaction models each impose different constraints; a good game isn't automatically a successful one.
- Treat the games market as a winner-take-all tournament of nonrival goods — the single best game in a segment can take everyone; most games lose, and the losers are invisible.
- Target underserved / "blue ocean" market segments with barriers (technical, hardware, expertise, distribution, imagination, relationship, uncertainty) for outsized profit — but accept the risk; there's no reliable way to measure an untapped segment (The Sims tested terribly and sold 100M+). **When it flips:** account for the Matthew effect (popular games get more popular, games improve with more players) and the innovator's dilemma (incumbents go static defending cash cows) — sometimes riding the network effect of a proven category beats a blue ocean.
- Compare games on a value curve — only values you deliver better than everyone (or uniquely) matter; values others do better are not selling points.
- Focus values to your resources — small teams should spike one or two unique values into the stratosphere (Garry's Mod, Dwarf Fortress), not produce a mediocre clone with a flat value curve. **When it flips:** for a broad mainstream audience, replacing a niche/violent theme with universal appeal (Pac-Man's eating over combat) widens the market — choose niche-vision vs broad-appeal by the segment and budget you're targeting.
- Match ambition to resources — copying a successful game and bolting on baubles without a unique superior value is the most predictable failure.
- Remember "nobody knows anything" — cultural snowballs (StarCraft in Korea) are unpredictable nonlinear phenomena outside any market model.
- Manage expectations because confirmation bias warps perception — title, marketing, and word of mouth pre-load how players interpret the game; treat marketers as part of the experience-crafting team.
- Don't ship low-quality, derivative titles to flood a market — oversupply of cheap unoriginal games caused the 1983 crash; quality gates protect the whole platform.
- Treat lack of polish/innovation as an existential risk — stagnation kills demand, oversupply of cheap, unoriginal titles can crash a whole market, and business/marketing focus must not eclipse design and development.
- Price to the value the audience will actually pay — 3DO's positively reviewed console flopped at $699; correct pricing matters as much as quality.
- Don't fragment your platform into incompatible variants — Sega's seven incompatible systems split its audience and developers; avoid surprise launches that strand developers.
- Anchor each new platform with a flagship showcase title — Nintendo paired every new system with a new Mario to demonstrate the hardware and drive adoption.
- Frame F2P payments so players feel like heroes, not cheats — sell adventures, not power; watch motivation drifting from pleasure-seeking into shame-avoiding obligation.
- Never clone a commercial game's name, characters, or art — borrowed glamour makes your game look second-rate and risks copyright; one fresh concept can carry even an easy project.
- Fix non-package mistakes (typos, wrong screenshots) in-place without bumping the version, but release a new version number for any actual code/package change — keeps store submissions reviewable and correct.

### Pitching & Crowdfunding

- Design the pitch like a story/game — hook, build, climax, accessibility, surprises, images over words; lead with platform/audience/genre and what's unique and why it fits this client.
- Pitch only good ideas in the right place at the right time — "cool ideas" are cheap; the right good idea at the right moment, sold convincingly, is worth millions.
- Show you're serious with a working prototype and proof you've done the work — believing it's fun isn't enough; demonstrate it will be fun and will sell.
- Be passionate, confident, organized, flexible, and follow up persistently — assume the client's POV, give "handles" and easy-to-forward materials, anticipate questions, stay objective when rejected (RoboRally → Magic: The Gathering).
- Make it easy for them to re-pitch internally — give the idea handles and show, don't tell, so the listener can sell it up the chain.
- Know all design/schedule/financial/risk details and follow up persistently after a pitch — a "cool idea" is worth little; the convincingly-sold right idea is worth millions.
- Cope with a client's bad suggestion by finding the real problem behind it ("Why more chrome?" meant "cars feel too slow") — most bad suggestions are solutions to an unstated problem.
- Play "Bring Me a Rock" correctly by helping the client discover what they want — a big part of the job is understanding the client better than they understand themselves.
- Address all three layers of client desire (words, mind, heart) and give creative ownership (Michelangelo's nose) — fulfilling the heart's desire wins a partner for life.
- Treat crowdfunding as a preorder-driven pitch — it's a lot of work; ask for as little as possible, keep it short, show gameplay, add stretch goals, and hustle for virality.

### Ethics & Responsibility

- Take personal ethical responsibility for what you create — corporations have no soul, only individuals do; for online/social games, communication-safety design decisions can literally save or cost lives.
- Take personal ethical responsibility for what you create — games transform players, so design so only the best changes happen; weigh how the game can change players for better and worse (Toontown's polite chat reshaped a player's habits), and embed transformation into broadly-played games since reach is the only way games serve people.
- Build games that help people (often quietly) — the only way games serve humanity is if many people play them, so embed transformation into best-selling games; people love being cared for.
- Take responsibility for the dressing, not just the mechanics — ethical complaints land on the fiction/experience; bare vectors of force/bare mechanics have no agenda, but the whole work carries one.
- Work only on what is worth your time (the Raven) and know your own secret purpose — uniting conscious and subconscious motivation gives your work unmatched passion and focus.

### Constraint Triangle & Scope Control

- Internalize the Constraint Triangle (cost, time, quality) — you cannot fix all three; reject "faster, cheaper, better" demands, pick two of three, and compensate any change to one corner in another or the project fails; protest and draw the triangle when a manager arbitrarily tightens all corners.
- As a fixed-time, fixed-team dev, economize on quality by ruthlessly limiting features, not by writing buggy code — cut scope, don't cut craft.
- Avoid gold-plating (over-strong requirements) and feature creep (adding features late) — both bloat the quality corner without compensating cost or time.
- Use the Eight Filters / Lenses as gates — run every design through all eight (artistic, demographics, experience, innovation, business, engineering, social/community, playtest); a design is "done" only when it passes all without change.
- "Concentrate the coolness" — brainstorm far more than you can build, then cut, modify, or elevate ideas so each unit/feature is meaningful rather than bloating the game.
