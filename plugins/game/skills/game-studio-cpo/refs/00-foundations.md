# Foundations — First Principles & Cross-Cutting Tensions

_The always-apply core of the studio rulebook. The First Principles govern every domain; the Cross-Cutting Tensions are the recurring conflicts whose resolution depends on context (genre, audience, competitive vs casual, team size, platform, dev phase, scale, hot vs cold path). Domain-specific rules and their `When it flips:` caveats live in the numbered section refs._

## First Principles (the rules everything else serves)

### Design & experience
- Design the felt experience, not the artifact — name the target emotion first, then reverse-engineer mechanics/fiction/art/audio to produce it; build forward but always reason backward from how it feels.
- Fun is the brain's reward for learning — keep the player continuously mastering something new inside (or just above) the flow channel; when teaching stops, boredom and churn begin.
- A game is a machine for meaningful decisions — you design the possibility space (the rules), not the outcome (the play); craft conditions that tend to produce interesting, double-edged, consequential choices.
- Prove the toy is fun before anything else — the bare core mechanic, stripped of all dressing, must be fun (provable on paper) before art/story/content; dressing magnifies fun, it never creates it.
- Depth comes from interaction, not count — pursue elegance (few verbs interacting richly), and ruthlessly cut dominant strategies, redundant tools, and exception-laden rules; a solved or bloated game dies fast.
- Pick one unifying theme and filter everything through it — cut whatever doesn't reinforce the cynosure.
- Mechanics are the deepest layer of meaning — what the rules reward and punish is the message players actually learn; align rewards, feedback loops, fiction, and balance with the intended experience.
- Give the feeling of freedom — guide via indirect control (light, landmarks, goals, constrained space) so players feel free while you reliably deliver the experience; reserve overt direction for where indirect means fail.
- Make everything legible and the world consistent — players learn only from feedback they can perceive and read fiction straight through to the mechanics; one contradiction breaks the illusion permanently.
- Respond within ~0.1s with multi-channel feedback — an unacknowledged or laggy action reads as broken no matter how good the rest is.

### Process & production
- Obey the Rule of the Loop — every game improves with more test-and-improve cycles; structure everything to maximize cheap, fast loops and make each loop retire the biggest remaining risk.
- Prototype to answer one named question — if you can't state the hypothesis a prototype tests, it's a boondoggle; throw away the implementation, keep the validated design.
- In playtesting, observe — never lead — stay silent, watch faces, ask non-leading questions; harvest the player's experience, not their suggestions, because you are blind to your own game's friction.
- Scope is cut, not padded — overscoping is the default failure; prove the core cheaply, gate phases, and cut goals (not corners) when over budget.
- Match rigor to uncertainty and stakes — derivative/certified/networked/AAA work demands deep planning and exhaustive coverage; original/indie/prototype work demands shallow planning, minimum-viable coverage, and fast iteration.
- Build quality in, don't bolt it on — embed QA from day one, gate milestones on real definitions (feature lock, zero showstoppers), protect the polish tail, and lead people by intent and shared love of the game, not fear.
- Make everything reproducible and data-driven — seed RNG, stamp builds with commit hashes, route input through one recordable system, expose tunables without recompiling; reproducibility is what makes emergent/procedural systems debuggable at all.

### Engineering & performance
- Encapsulate what varies and minimize coupling — isolate volatile behavior behind interfaces/events/data; most engineering time is spent *changing* code, so depend on abstractions, never store data twice, and let patterns emerge from real smells (KISS/YAGNI).
- Decide cross-cutting architecture up front, optimize locally only after profiling — memory model, pooling, data layout, and batching can't be retrofitted; everything else waits for a measured hotspot on the real target device.
- The fastest work is work that never happens — cull, skip, defer, batch, pool, run-less-often; attack the algorithm and data layout before hand-tuning the code.
- In game math, stability beats exactness — squared distances, symplectic Euler, approximate-but-stable physics, bounding-volume hierarchies; decouple simulation rate from render rate (fixed-step physics, variable-step render), and escalate to precision only where genre feel demands it.
- Build the illusion of intelligence, not real intelligence — make AI not-stupid before smart, optimize for what the player perceives, keep it beatable, and cheat only in ways the player cannot detect.

---

## Major Cross-Cutting Tensions (and how to resolve them)

These conflicts recur across many domains. Each: the two poles, then when each wins.

- **Authored experience vs. player freedom** — guide/constrain for a designed interest curve vs. grant genuine agency. *Resolve:* default to the *feeling* of freedom via indirect control; switch to genuine open-endedness for sandbox/explorer/expressive games where the player's own story is the product.
- **Emergence vs. authored/scripted content** — simple systems interacting for replayable depth vs. lock-and-key progression delivering a fixed experience in order. *Resolve:* emergence for replayable systemic games, progression for story beats and tutorials; layer scripted set-pieces over emergent systems. In competitive/balance-critical games treat emergence as a liability and test past the complexity barrier.
- **Simplicity/elegance vs. depth/richness** — cut to few elegant verbs vs. add mechanics for richness. *Resolve:* depth comes from interaction not count, so cut redundant/single-purpose elements — but keep deliberate quirks that give the game character, since a perfectly elegant game can feel sterile.
- **Realism/simulation vs. fun/believability** — fidelity vs. responsive, exaggerated, believable-not-accurate. *Resolve:* default to fun/believable everywhere (faked locomotion, exaggerated feedback, illusion of intelligence); reserve fidelity for sims/racers/physics-puzzles whose appeal *is* accuracy, and even there model only what reinforces the theme.
- **Randomness vs. skill/determinism** — luck for variety/excitement/accessibility vs. determinism for fairness/mastery. *Resolve:* casual/single-player and reward systems favor variable randomness; competitive/skill games minimize it or confine it to a preparation phase (deal = chance, play = skill). Tune frequency and impact separately and foreshadow high-impact swings so loss never feels arbitrary.
- **Positive vs. negative feedback loops** — amplify the lead to end decisively vs. suppress the lead to keep it close. *Resolve:* negative feedback while the lead is still contestable (tension), positive feedback once it is uncontestable (close out a decided game). Feed loops the *relative* gap for closeness, the leader's *absolute* position for snowball.
- **Adaptive difficulty vs. earned mastery** — rubber-band to keep everyone engaged vs. honest static challenge that rewards skill. *Resolve:* avoid/limit *visible* DDA in single-player mastery games (once seen, novices feel cheated and experts game it); hide it and clamp it inside explicit difficulty tiers; embrace precise matchmaking and subtle rubber-banding in multiplayer/racing, where a mismatched opponent makes losers quit.
- **Deep mastery vs. broad accessibility** — balance for the skill ceiling vs. effortless entry. *Resolve:* you cannot balance for all skill levels at once — competitive games balance at the top and accept low-level imbalance; story/social games balance low-mid and ignore high-level degeneracy. Serve both ends with layered optional difficulty, elastic challenges, and elder-games for masters.
- **Intrinsic vs. extrinsic reward** — variable-ratio points/loot to drive engagement vs. avoid corroding the intrinsic love of the activity. *Resolve:* align rewards with what players already want to do; where the valued behavior can't be detected (creative/social/exploratory), use no reward system rather than a misaligned one. Drive *wanting* without abandoning *liking* — refuse compulsion machines and player's remorse.
- **Detail/fidelity vs. imagination** — render rich detail to immerse vs. leave gaps for the player's mind to fill. *Resolve:* spend fidelity only where you can do it better than the player imagines; abstract/minimal representation invites projection (Dwarf Fortress, text), and over-detailed humans hit the uncanny valley — but keep anything mechanically load-bearing fully legible.
- **Polish early vs. polish last** — keep prototypes rough and reserve polish for the end vs. tune feel early. *Resolve:* polish last by default (prove fun first), but tune feel-critical core systems (control, jump, camera) to a reference target early because everything builds on them, and give atmospheric/story-led games their mood early. Spend the polish budget only where the player's attention lands.
- **Plan deep vs. iterate shallow** — full plan before building vs. short-horizon iterate-and-discover. *Resolve:* horizon scales with uncertainty — plan deep for derivative/sequel/port/engine work (knowable outcomes), plan shallow for original never-seen-before design (every assumption is wrong until tested); plan deeper only to make conceptual leaps that hill-climbing iteration can't reach.
- **Designer vision vs. playtest/telemetry** — trust instinct vs. let data drive. *Resolve:* tests and telemetry are authoritative for *where* and *how often* problems occur and for the felt experience you're blind to; instinct keeps authority over *how* to fix it and over fun/feel, which no data can specify. Gather experiences from testers, generate the solutions yourself.
- **Process discipline vs. late creative changes** — lock features, freeze scope, daily builds vs. add risky differentiating features late. *Resolve:* discipline is the default that protects ship quality; the exception is a well-encapsulated, decoupled, rippable feature that a modular architecture makes cheap to add late and fully re-test.
- **Finish-it vs. ship-and-patch** — hold quality above the deadline vs. ship, instrument, and patch on a cadence. *Resolve:* finish for one-shot retail/console products (reviews set shelf life; day-one patches merely normalize broken launches); run the continuous loop for live-service/F2P/MMO whose economies and metas need perpetual rebalancing.
- **Broad market vs. niche vision** — exclude no one for mass-market appeal vs. spike one or two unique values for an underserved niche. *Resolve:* small teams and barrier-protected segments win by going narrow and unique (a flat value curve is the predictable failure); mass-market design is more targeted, not less — but never collapses to lowest-common-denominator. Pick by team size, resources, and where your defensible value lies.
- **Composition vs. inheritance / OOP vs. ECS** — HAS-A swappable behavior vs. IS-A hierarchies; behavior-on-entities vs. data-only systems. *Resolve:* composition is the default (native to component engines); inheritance only for true, stable, shallow is-a relationships with real shared behavior. ECS pays off at huge counts of simple uniform entities; OOP components are simpler for normal counts and heavy/branchy per-entity logic.
- **Abstraction/flexibility vs. directness/performance** — program to interfaces and apply patterns vs. KISS/YAGNI and keep hot paths concrete. *Resolve:* add abstraction only on a real present need and let patterns emerge from smells; keep interfaces/virtual calls out of inner loops (rasterizer fill, vector math, per-fragment shading). Cold/architectural boundaries get abstraction; hot per-frame/per-pixel paths stay direct, and micro-optimization is reserved for the proven innermost loop.
- **Procedural vs. handcrafted content** — generate for size/variety/replayability vs. author for control/pacing/peaks. *Resolve:* procedural for huge/infinite/replayable worlds, handcrafted for authored peaks and themed pacing; mix them — a guaranteed-solvable hand-shaped spine with procedural variety, plus hand-made surprises seeded into the generator. Bound randomness to designed ranges and reproducible seeds for anything affecting solvability or balance.

> Further domain-specific tensions — fixed vs. variable timestep, baked vs. dynamic lighting, exact vs. approximate collision, 30 vs. 60 fps, minimal vs. information-rich UI, open vs. hidden information, failure-momentum vs. real stakes, buy vs. build tooling, pool-everything vs. only-hot-paths, struct vs. class, and more — are resolved inline (look for **When it flips:**) in the sections below.

---


## Context dimensions that flip rules

Before judging any work, establish these axes — most contested rules resolve differently along them. This is *why* "it depends" has structure: name the context and the right pole usually becomes clear.

- **Genre** — action/shooter/fighter/racer reward responsiveness, 60fps, exact feel; strategy/sim reward depth, information density, fidelity; narrative/puzzle reward pacing and authored beats. The genre sets which rules are load-bearing.
- **Audience & player types** — achievers, explorers, socializers, killers; competitive, social, family, children. Drives the luck/skill mix, difficulty, reward style, and how much to teach vs trust.
- **Competitive vs casual / single vs multiplayer** — competitive demands top-level balance, minimal luck, no visible adaptive difficulty, symmetry or carefully-valued asymmetry; casual tolerates luck, rubber-banding, and low-mid balance. Multiplayer adds self-refreshing content, matchmaking, and perpetual meta-rebalancing.
- **Platform** — mobile (allocation/GC sensitive, pool by default, touch UX), console (cert, fixed budget, 30/60 target, controller), PC (broad specs, mod/tooling), VR (comfort, presence, hard frame budget). Platform sets hard constraints that override preference.
- **Team size & resources** — small teams win by going narrow and unique and by buying solved tools; large teams afford deep planning, custom tooling, exhaustive QA. Match process rigor to team capacity.
- **Development phase** — preproduction prototypes are throwaway probes (shallow planning, find the fun); production locks scope and builds quality in; the polish tail (~last 10–30%) is where perceived quality is made. Planning horizon lengthens as the project solidifies.
- **Scale & hot vs cold path** — entity counts and per-frame/per-pixel paths decide architecture (OOP vs ECS), data layout, pooling, and whether abstraction or directness wins. Cold/architectural code gets clarity and patterns; proven inner loops get optimization.

## How the CPO judges (universal checks, any work)

- Is there a clear target experience/emotion, and does this work serve it? If you can't name the feeling, that's the first problem.
- Is the core fun proven, stripped of dressing — or is dressing being asked to carry a weak core?
- Does every system, mechanic, and asset reinforce the one unifying theme, or is something diluting focus?
- Are the player's decisions meaningful (double-edged, consequential, partially predictable), or has a choice collapsed into a non-decision (dominant strategy, obvious answer, blind guess)?
- Does the player get instant, legible, multi-channel feedback for every action, and is the world consistent?
- Is challenge matched to (or just above) skill, with pacing that rises and rests rather than flatlines?
- Is the work being validated by real-player observation and iteration, or by the team's own taste?
- Is scope honest for the team and phase — and is the polish budget aimed where players will actually look?
- For code: is what-varies encapsulated, coupling minimized, cross-cutting architecture decided up front, and optimization deferred to a profiled hotspot?
- For AI: does it read as intelligent to the player (not-stupid before smart), stay beatable, and cheat only invisibly?
- For any contested call: has the controlling context (above) been named, and does the chosen pole follow from it?
- What is the single highest-leverage change to the final player experience right now?
