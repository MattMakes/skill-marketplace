# Facilitation and the living design record

Use this guide when the design needs discovery, a deep walkthrough, revision, or resumption. The record preserves reasoning that cannot fit on the page without turning the page into a design bible.

## Conversation pattern

Begin with the user's idea and existing material. Reflect a small provisional model early, such as “choose route → spend fuel → face hazard → deliver → unlock,” and label every unsupported part as proposed or open. Ask two or three connected questions whose answers change that model. Useful choices include a default plus alternatives and their tradeoffs.

Prefer questions that expose consequences:

- If the player fails here, what changes and what lets play continue?
- Which resource does this action consume, create, or transform?
- What information makes the decision informed rather than random?
- Which later system observes this result?
- Which promise should the playtest prove or disprove?

Do not repeat discovery when notes already answer a question. Do not seek approval after every ordinary draft change. Pause for a decision when alternatives materially change the design and evidence cannot resolve them.

## Lightweight design record

Markdown, YAML, or another readable structured format is suitable. Keep it easy to edit and store it beside the HTML and PDF. Use stable IDs where they connect a decision to a diagram node, edge, state, resource, or test.

Record this information at the level the design needs:

```yaml
document:
  title: "Beaconfall Courier"
  scope: "One delivery loop"
  audience: ["design team", "playtesters"]
  revision: "0.3"
  date: "2026-09-27"
intent:
  experience: "Make tense, informed commitments during storm travel."
  player_promise: "Each delivery visibly reconnects the islands."
constraints:
  - id: C-01
    status: confirmed
    statement: "A failed crossing cannot end the campaign."
decisions:
  - id: D-01
    status: confirmed
    statement: "The player chooses a route before weather resolves."
    reason: "The route choice creates the intended risk commitment."
    affects: [N-02, E-03]
proposals:
  - id: P-01
    status: proposed
    option: "Show a three-band storm forecast."
    tradeoff: "It supports planning but can make safe routes dominant."
open_questions:
  - id: Q-01
    status: open
    question: "Does late delivery reduce trust or change the story?"
    blocks: [D-04]
not_applicable:
  - id: NA-01
    concern: "multiplayer"
    reason: "The confirmed scope is single-player."
relationships:
  - id: E-03
    from: N-02
    to: N-04
    label: "spends fuel to cross the storm"
playtest_hypotheses:
  - id: T-01
    hypothesis: "After one run, new players predict the safer route."
    observation: "Ask for a prediction before route selection on run two."
```

Use the four statuses consistently:

- `confirmed`: the user, source material, or observed build settles it.
- `proposed`: a candidate with a visible tradeoff, not a commitment.
- `open`: a question or conflict that still needs evidence or a decision.
- `not-applicable`: excluded with a reason, not merely omitted.

Keep sources of truth explicit. A prototype observation can contradict a written intention without erasing either one. Record the observation and raise the mismatch as a discussion topic.

## Required traces

Write at least one representative sequence in concrete terms:

1. State what the player perceives.
2. State the player's available action and choice.
3. State the rule or condition that resolves it.
4. State immediate feedback.
5. State changes to resources, world state, goals, or later choices.

Add one relevant failure and recovery sequence. “The player loses” is insufficient. Identify what caused failure, what it costs, what feedback explains it, and whether retry, adaptation, or a changed state follows.

Follow consequences across systems. For example, a damaged tool can change movement, consume repair stock, delay a timed goal, alter rewards, and teach a future routing choice. If one consequence has no owner or contradicts another rule, keep it open.

Concrete example: the courier sees a storm forecast, selects the short channel, and commits 2 fuel. A crosswind damages steering. The wheel response and hull alarm provide immediate feedback. The player spends 1 repair kit, arrives late, earns less trust, and cannot afford the planned sail upgrade. That consequence changes the next route choice.

Failure and recovery example: the courier enters the channel without enough repair stock and loses the cargo. The game returns the boat to the last lit beacon with damaged steering and an expired contract. A low-risk salvage job supplies a repair kit, so the campaign continues. If the economy cannot fund that job, record a potential loss spiral as an open contradiction.

## Walkthrough verification

Before adding scenarios, list the scenarios the user explicitly requests. Verify that each requested scenario appears in the delivered design. When numbers matter, use a step table that calculates each action's applicable costs, resources, location, and persistent state. Make a rejected action follow its confirmed action-guard rule. Do not invent resource consumption. Label assumptions and counterfactual branches in each scenario. Test available legal recovery choices before claiming that a setback forces a loss. Keep a complete supporting sequence when you make a precise claim about an alternative plan.

## Contradictions and branches

Do not normalize incompatible claims into vague prose. Give the conflict an ID and show its impact:

```yaml
- id: Q-07
  status: open
  question: "Does failure reset the day or advance the calendar?"
  evidence:
    - "The loop draft says retry immediately."
    - "The economy draft charges a daily upkeep cost."
  branches:
    - option: "Reset the encounter only"
      consequence: "Keeps practice fast but avoids the upkeep pressure."
    - option: "Advance one day"
      consequence: "Preserves upkeep pressure but can create a loss spiral."
```

Represent a material unresolved branch on the diagram or in its open-issues area. A draft can be useful with unknowns. A final design cannot contain contradictory core rules or undecided logic that prevents a representative trace.

## Resume and revise

On resumption, read the record and current artifacts before asking questions. Summarize the last confirmed model, material proposals, open blockers, and active playtest hypotheses. Ask only what the new request or changed evidence requires.

For a revision:

1. Record the new input and identify affected IDs.
2. Trace downstream rules, resources, states, and visuals.
3. Update status and reasons without rewriting history into false certainty.
4. Change the HTML source, then regenerate and inspect the PDF.
5. Increment the visible revision and date, and add a concise change note when physical copies may coexist.

The record is the memory of the conversation. The diagram is the inspectable model. Keep them consistent, but let each serve its own purpose.
