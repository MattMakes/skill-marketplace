# Design coverage questions

Use this as a relevance guide, not a form to complete. Select questions that can change the current model, resolve a contradiction, or expose a useful test. Mark irrelevant concerns as not applicable with a reason.

## Evidence boundaries

Historical documents support many coverage prompts, but they do not define a universal game-design template. *Leisure Suit Larry's Casino* demonstrates goals, modes, detailed states, UI, audiovisual direction, reuse, economy, and unresolved tasks. The *Grim Fandango* puzzle document demonstrates spatial maps, dependency chains, authored solutions, characters, and narrative progression. The attributed Chris Taylor template prompts broad world, interface, technology, audio, single-player, multiplayer, persistence, and editing concerns. Their omissions do not prove that a concern is unimportant.

Stone Librande's method adds a communication and reasoning practice: define the page's question and audience, choose a visual model that exposes relationships, date iterations, and use drawing difficulty or misleading geometry as design evidence. It does not require one topology or an entire game on one small sheet.

Items explicitly labeled **Contemporary guidance** below are current recommendations derived for this skill. Do not attribute them to those historical sources or to Librande's talk.

## Experience, action, and outcome

- What should the player feel, learn, or express, and which boundaries protect that experience?
- What verbs does the player use repeatedly? What meaningful choices distinguish one use from another?
- What is the immediate goal, longer objective, victory or completion condition, and stopping condition?
- What rules resolve each important action? Which rules are inherited, and which are new?
- What feedback makes cause, result, risk, and progress legible?
- What creates challenge: execution, planning, information, time, scarcity, opposition, or social judgment?
- What counts as failure or loss? What does it cost, teach, or change? How does recovery work?

## Resources, progression, space, and pacing

- What enters, leaves, stores, transforms, or gates the system?
- Can a resource loop grow without bound, deadlock, or create an unrecoverable loss spiral?
- What unlocks or changes over time: capability, content, mastery, difficulty, story, status, or strategy?
- Which dependencies are linear, parallel, optional, mutually exclusive, or convergent?
- Where can the player go? What does adjacency mean? Which transitions require a condition or cost?
- How do play rhythm, encounter density, session length, deadlines, and downtime support the intended experience?

## Narrative, actors, presentation, and control

- Which actors make decisions, own state, oppose, assist, or observe the player?
- Which story beats are caused by play, authored in sequence, optional, or only contextual?
- Which objects, facts, characters, or mechanics need setup and payoff?
- What must the UI communicate before, during, and after a choice? Which inputs must remain available?
- What must art, animation, and camera communicate about state, affordance, priority, and tone?
- What must music, speech, ambience, and effects communicate? What remains understandable without audio?

## Modes, persistence, feasibility, and scope

- Which modes exist, and which rules, resources, or progress cross their boundaries?
- What persists within an attempt, session, campaign, account, or shared world? What resets, saves, or migrates?
- Which platform, performance, tool, content, team, schedule, or dependency limits materially shape the design?
- What is explicitly included, excluded, deferred, reused, conditional, or delegated to another page?
- Which statement is experience intent, which is a design rule, and which is verified behavior in a build?

## Conditional concerns

Ask these only when the design contains the relevant system.

### Multiplayer and social play

- How many participants act, communicate, cooperate, compete, join, leave, or reconnect?
- Who owns authoritative state? How are latency, synchronization, hidden information, and disputes handled?
- What prevents griefing, collusion, harassment, or unwanted disclosure?

### Economy

- What creates and removes each currency or item?
- How do prices, scarcity, exchange, rewards, and sinks shape decisions?
- Can optimization erase interesting choices or create compounding advantage?

### Combat

- What can each actor perceive, target, avoid, interrupt, counter, or recover from?
- How do positioning, timing, resources, damage, defeat, and encounter reset interact?
- Which matchups or combinations need matrix coverage?

### Story-heavy design

- Which choices branch, rejoin, lock content, or change later interpretation?
- How do gameplay outcomes affect character, plot, world state, and pacing?
- Can the player understand why a branch occurred?

### Live operations

- Which content, rules, economy values, events, or seasons change after release?
- What happens to existing saves, rankings, purchases, and player expectations when they change?
- Who monitors results, rolls back failures, and ends or archives time-limited content?

## Contemporary guidance

- **Accessibility:** Identify barriers in input, perception, language, cognition, timing, and motion. Preserve equivalent information and viable control paths.
- **Onboarding:** Test when players form the intended mental model. Do not assume a tutorial proves comprehension.
- **Playtest evidence:** Turn important assumptions into falsifiable observations. Record the build, audience, method, and result.
- **Analytics and privacy:** When telemetry is relevant, define the decision it informs, collect only needed data, and respect consent and retention constraints.
- **Safety and inclusion:** Examine foreseeable player harm, representational risk, moderation needs, and age-appropriate boundaries.
- **Operational resilience:** For connected games, consider outages, degraded modes, data recovery, cheating, and support ownership.

These additions are not claims about the historical documents. Apply them according to the project's audience, platform, and risk.

## Keep deliverables distinct

- A **design document** explains intended player experience, rules, relationships, consequences, and unresolved design questions.
- An **implementation specification** defines technical contracts, data, architecture, assets, error handling, and acceptance details needed to build it.
- A **pitch** argues for value, audience, differentiation, feasibility, and investment.

One artifact can inform another, but do not disguise missing rules with pitch language or overload the one-page design with low-level implementation detail. Put implementation facts on the page only when they materially explain behavior or constrain the design.
