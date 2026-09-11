# Quality Storming — quality attributes per bounded context

The DDD Starter Modelling Process lists three tools for **Define**: the Bounded Context Canvas,
the C4 system context diagram and *Quality Storming* (Michael Plöd, INNOQ). The canvas says what a
context decides and says to whom; Quality Storming says how good it must be at it — and for which
scenario. `ddd-define` runs a *light* version per context and records the result in
`define.json → quality_attributes[]` (`context, attribute, requirement, priority, scenario`).

## The original method (Plöd, 2020) — what to keep

Plöd's framing: business requirements get collaborative modelling (EventStorming, Domain
Storytelling) but quality requirements are left to silos — "there are too rigid silos between
individual stakeholders (development, operations, departments, testing, …)". Quality Storming
brings a heterogeneous group together to collect and prioritise them. Five phases:

1. **Select a quality model.** Plöd uses ISO/IEC 25010 ("provides a total of eight main
   categories"; the 2011 edition: functional suitability, performance efficiency, compatibility,
   usability, reliability, security, maintainability, portability. The 2023 revision has nine:
   it renames usability to *interaction capability* and adds *flexibility* and *safety*). One
   pinboard per top-level category, sub-characteristics as prompts.
2. **Invite** domain experts, developers, architects, requirements engineers, management,
   operations, testers, UX, product owners — "number of top-categories × 2 or 3" people.
3. **Broad collection** — small mixed groups rotate through the category boards (~10 min each)
   writing requirements on stickies.
4. **Consolidation** — cluster, de-duplicate, and *surface competing criteria*. Plöd's example:
   three stakeholder groups wrote "300 mortgage lending value calculations per hour", "50 … per
   hour" and "2 … per minute between 09:00 and 18:00" about the same need. The conflict is the
   finding.
5. **Prioritisation** — dot voting (each participant gets dots worth ~15–25 % of the collected
   requirements), then an outlook on what happens to the results.

The principle that matters most for us, verbatim: *"It is not the claim to produce perfectly
formulated quality scenarios with the help of Quality Storming. Instead, the method aims to
create a well-founded, prioritized basis for later formalization, which is understood across
different stakeholder groups."* Formalisation into quality scenarios (arc42's quality-requirements
collection; the SEI scenario form: source, stimulus, environment, artifact, response, response
measure) comes afterwards. Plöd's DDD Europe 2021 workshop explicitly fed the results "into the
bounded context design canvas".

## The light, per-context adaptation used by `ddd-define`

This adaptation (ours, not Plöd's) keeps the category prompts, the conflict-surfacing and the
prioritisation, and drops the room. Do it per bounded context because the answers differ: the
core context that protects money or safety needs consistency and correctness; a gateway needs
availability and tolerance of a flaky partner; a reporting context can be minutes stale.

For each context, **core contexts first**:

1. Walk the ISO 25010 categories as prompts and ask, for *this* context: what would hurt the
   goals in `understand.goals` or violate a constraint in `understand.constraints`? Which message
   on the canvas is the risky one (at-least-once delivery, an external call, a manual step)?
2. Keep the **top 2–4** attributes. Write each as one row:
   - `attribute` — a word from the vocabulary below (not a paragraph);
   - `requirement` — measurable where possible ("charge exactly once per week per subscription");
   - `scenario` — one sentence in scenario form: *when* (stimulus + environment) → *then*
     (response + measure). Compress the SEI template into a sentence, do not skip the measure;
   - `priority` — `high` if tied to a goal metric, a regulatory constraint or a core invariant;
     `medium` if it protects a supporting flow; `low` otherwise.
3. Surface **competing criteria** between contexts (e.g. fulfilment wants recipe details early,
   subscriptions wants choices editable until cut-off) as an open question, not a silent choice.
4. Depth: `light` → attributes for the core context(s) only (at least one each — the lint
   enforces this); `standard` → 2–4 for each core context, 1–2 for supporting contexts with an
   external partner or a regulatory constraint, and one row for a *generic* context whose external
   partner sits on the critical path of a core flow (the payment provider behind the weekly charge:
   availability / idempotency / timeout — the lint warns when it is missing); `deep` → 2–4 for
   every context, plus model-trait notes on the canvas.

## Attribute vocabulary (pick from here; add only with a reason)

| ISO 25010 area | Attributes to use as `attribute` | Typical scenario shape |
|---|---|---|
| Functional suitability / correctness | `consistency`, `correctness`, `completeness` | duplicate command / concurrent edit → exactly one effect, invariant holds |
| Performance efficiency | `latency`, `throughput`, `capacity` | peak (e.g. Sunday 18:00 cut-off) → p95 under N ms, N ops/min |
| Reliability | `availability`, `fault-tolerance`, `recoverability`, `idempotency` | partner down / message redelivered → degrade gracefully, no double effect, recover in N min |
| Security | `confidentiality`, `integrity`, `auditability`, `non-repudiation` | PII in payload / regulator asks → encrypted, every decision traceable to an actor |
| Compatibility / interoperability | `contract-stability`, `interoperability` | consumer on old schema → published language versioned, no breaking change without notice |
| Usability / interaction capability | `usability`, `accessibility` | subscriber on mobile → task in < 2 min (impact I1 style) |
| Maintainability / flexibility | `modifiability`, `testability`, `deployability`, `observability` | rule change → shipped by one team without touching other contexts; deploy independently |
| Portability / safety | `portability`, `safety`, `compliance` | food-safety label rule changes → all boxes packed after date D carry it |

## Good vs bad

- Bad: `attribute: "performance", requirement: "must be fast", scenario: ""` — a wish.
- Good: `attribute: "latency", requirement: "Choosing meals commits in under 1 s at p95",
  scenario: "Sunday 17:00–18:00 cut-off peak, 2,000 subscribers choosing concurrently → each choose-meals
  command is acknowledged within 1 s at p95 and none is lost", priority: "high"` (tied to G1 and I1).
- Bad: one `consistency` row copied onto every context. Good: consistency for the execution
  context, idempotency for the gateway, staleness bound for the analysis context.

## How this differs from verification metrics

Verification metrics (a canvas section) tell you whether the *boundary and model* are right —
they are gathered from CI/CD, tickets and live systems over time ("how often does a change touch
two contexts?", "does the goal metric move?"). Quality attributes are *requirements* the design
must meet from day one. Both may cite the same number; they answer different questions.

## Sources (accessed 2026-08-29)

- Michael Plöd, "Identification of quality requirements with Quality Storming", INNOQ, 24 Feb 2020 — https://www.innoq.com/en/articles/2020/02/quality-storming-workshop/
- Michael Plöd, "Quality Storming" slides, Speaker Deck, 1 Apr 2020 — https://speakerdeck.com/mploed/quality-storming
- DDD Europe 2021, "QualityStorming: Collaborative Modelling for Quality Requirements" (abstract: results fed into the bounded context design canvas) — https://2021.dddeurope.com/speakers/michael-plod/
- software-architektur.tv episode 224, "Quality Storming mit Michael Plöd", 12 Jul 2024 — https://software-architektur.tv/2024/07/12/episode224.html
- arc42 quality requirements (scenario examples, ISO 25010:2023 characteristics) — https://quality.arc42.org/
- ddd-crew, DDD Starter Modelling Process, "Define" tools — https://github.com/ddd-crew/ddd-starter-modelling-process
