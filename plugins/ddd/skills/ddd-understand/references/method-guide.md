# Method guide — ddd-understand

Distilled from the primary sources listed in §11 (all accessed 2026-08-29). Read §1 once; then
read the section for the part of the artifact you are drafting. §8 has the depth table, §9 the
good-vs-bad quick reference, §10 what recent practitioner writing changes.

## 1. What the Understand step is for

The ddd-crew process states the intent as: *"Align our focus with the organisation's business
model, the needs of its users, and its short, medium, and long-term goals"* — because
*"badly designed architecture and/or boundaries can have a negative impact or even make it
impossible to achieve these goals."* The tools it names are Impact Mapping, the Business Model
Canvas, the Product Strategy Canvas, Wardley Mapping and User Story Mapping; it wants domain
experts, product/strategy people and **real end users** in the room, not proxies.

Two caveats from the same README that this skill honours:

- The process *"is not a linear sequence of steps"*; teams *"jump back and forth."* Anything you
  cannot settle here goes in `open_questions` and the chain picks it up later.
- For brownfield work the README suggests assessing the IT landscape before the business vision.
  That is why `existing_systems`, `lifecycle` and module names are first-class inputs here.

Wardley's doctrine for this phase says the same in four lines: *know your users, focus on user
needs, use a common language, challenge assumptions.*

## 2. Business Model Canvas (Strategyzer)

Nine blocks; the canonical guiding question for each:

| Block | Question |
|---|---|
| Customer segments | Who are your most important customers? |
| Value propositions | What value do you deliver to customers? |
| Channels | How do you reach your customers? |
| Customer relationships | What type of relationship do you establish with customers? |
| Revenue streams | How does your business earn money? |
| Key resources | What assets are indispensable? |
| Key activities | What activities must you excel at? |
| Key partners | Who are your key partners and suppliers? |
| Cost structure | What are your most important costs? |

Practical rules from Strategyzer's own instruction manual:

- **Fill order does not matter** (*"Some people prefer to begin with listing their customer
  segments or value propositions … It doesn't matter. Just do it."*). Start wherever the inputs
  are richest — for a repo that is usually key activities (what the code already does).
- **Check completeness and coherence — no orphan elements.** Their example: "advertising" as a
  revenue stream with no "advertiser" segment willing to pay. Every revenue stream needs a paying
  segment; every value proposition needs a segment; every key activity serves a proposition.
- **Separate present from future.** *"Clearly distinguish between presently existing business
  models and future ideas."* Describe the model the system serves now; future ideas go in
  assumptions or non-goals.
- **One canvas per idea; avoid vague words** (writing "products" under revenue streams says
  nothing). Mark facts vs assumptions — in this skill, a trailing "(assumed)" in the cell plus an
  `A<n>` entry.
- **Value Proposition Canvas** is the zoom-in: per segment, the customer's *jobs*, *pains*,
  *gains* against your *pain relievers* and *gain creators*. Only at `deep` depth (§2a of the
  template); its named mistakes — mixing several segments into one canvas, describing the
  customer through the lens of your own proposition, only functional jobs, trying to address every
  pain — apply to the segment rows too.
- **Tie each value proposition to a capability and to what it beats.** A proposition is a claim
  ("no planning, no shopping"); `business_model.value_proposition_links[]` says which capability
  (§5) the claim rests on and which alternative (§6) it beats — one line per proposition, the
  canvas string verbatim. A proposition resting on no capability is marketing; a capability no
  proposition rests on is a supporting/generic candidate. Both are findings for Strategize, which
  scores differentiation from these links rather than from the canvas prose.

For internal or non-commercial systems the blocks still work: segments are the internal
user groups, revenue streams are the budget or cost the system avoids, partners are other
departments and vendors. Say so in a note rather than leaving cells blank.

## 3. Goals — outcomes before outputs

A goal is a measurable change in the world, not a thing you ship. Three sources say it three ways:

- Impact mapping: the WHY question is *"Why are we doing this?"*; the worked goals on
  impactmapping.org are *"increase the number of active players to 1 million"* — a number, not a
  feature. Adzic: *"if it delivers exactly the requested scope but misses the business goal, it
  is a failure."*
- Perri: teams locked into a feature plan *"stop focusing on the outcomes, and judge success of
  teams by outputs."* Her example — not the output "build driver onboarding features" but the
  outcome "onboard one driver per 50 residents." Her Product Strategy Canvas gives the goal its
  frame: **Vision** (qualitative, long term) → **Challenge** (the first strategic objective) →
  **Target condition** (measurable metrics) → **Current state** (the baseline). Record the
  baseline in `target` when you know it ("from 3 days to 1 hour").
- Patton: *"minimize output, maximize outcome and impact."*

Encoding: `statement` + `metric` (what is measured) + `target` (the number) + `horizon` (when).
When the inputs only give outputs ("launch the portal"), ask "so that what?" until you reach a
number. If no number is inferable, keep the goal, put your best proxy metric in, and add an
open question owned by the product owner. Two to four goals at standard depth; one headline goal
at light. More than that usually means several products.

## 4. Impact map — actors, impacts, deliverables (Adzic)

The four levels with Adzic's guiding questions (impactmapping.org/drawing.html):

| Level | Question | Encoded as |
|---|---|---|
| WHY | *Why are we doing this?* | `goals[]` |
| WHO | *Who can produce the desired effect? Who can obstruct it? Who are the consumers or users?* | `actors[]` |
| HOW | *How should our actors' behaviour change? How can they help us achieve the goal?* | `impacts[]` |
| WHAT | *What can we do, as an organisation or delivery team, to support the required impacts?* | `deliverables[]` |

Rules that matter for the artifact:

- **Actors are whoever must behave differently for the goal to be met** — users, but also the
  people who can obstruct (a regulator, a finance team, an incumbent supplier) and systems whose
  behaviour must change (a legacy ERP that must start emitting data). Adzic distinguishes
  *primary* actors (get value directly), *secondary* (serve the primary ones) and *off-stage*
  (do not use the product but can help or block). Encode that as `actors[].role`. List the
  primary actor first; the light-depth map covers only that one. Every primary/secondary person
  or organisation gets at least one impact (the lint warns otherwise); an off-stage actor may
  have none. A party that merely imposes rules — a tax authority whose format you must use, a
  partner's SLA — is a `regulatory`/`contractual` constraint (§6), not an actor.
- **Impacts are behaviour changes, never features.** "Pays within 7 days", "stops phoning
  support to check status", "approves in the app instead of by email". If the sentence starts
  with build/add/implement it is a deliverable in disguise.
- **Deliverables are options, not commitments.** *"Never aim to implement the whole map. Instead,
  find the shortest path through the map to the goal!"* Several alternative deliverables per
  impact is healthy; priority (`must`/`should`/`could`) follows the importance of the impact, not
  the size of the deliverable. Mapping lets teams *"throw out deliverables that do not really
  contribute to any impact"* — the antidote to *"everyone's pet features … bundled in."*
- **Deliverables are the smallest thing that could plausibly cause the impact**, phrased as
  something a user or partner would notice ("one-click reminder to late payers"), not as
  architecture ("notification microservice").

Downstream use: `ddd-discover` turns actors + impacts + deliverables into the scenarios and
commands of the big-picture EventStorm, so an impact without a deliverable is fine (a known gap)
but a deliverable without an impact is scope creep — drop it or find its impact.

## 5. Capabilities and their evolution stage

**Business capabilities** are *what the organisation can do* — organisationally neutral, decoupled
from structure, processes and initiatives, and stable: capability models survive reorgs because
*"most changes happening in organizations do not affect the fundamental structure of their
business capability models."* Enterprise-architecture practice uses noun-phrase names
("Product development", "Order management") and two to four nesting levels; this step records
**one level only** — the ddd-crew process places Business Capability Modelling in *Decompose*,
where the list is refined into subdomains. Here it is the candidate list.

Tests for a good capability:

1. **Noun phrase, no solution word.** "Invoicing", "Tax calculation", "Customer onboarding" —
   not "Invoice API", "Checkout page", "Billing service" (the lint's `SOLUTION_WORDS`: api, app,
   page, screen, module, ui, frontend, backend, database, db, endpoint, microservice, queue, and
   product names such as kafka, lambda, kubernetes, react, postgres, mongo).
2. **Still true after a rewrite.** If you threw the software away, the business would still need
   to do this.
3. **Ownable.** A team or department could own it end to end.
4. **Distinct language.** If two candidates use the same words for the same things, merge them;
   if one word means two things ("customer" to sales vs to support), that is a boundary — keep
   both and note it in an open question for Decompose.

Sources for the list: BMC key activities, impact-map deliverables grouped by what they need,
brownfield module/package names, and the capabilities you will *buy* (payments, email, identity)
— include those; the evolution stage says what to do with them.

**Evolution stage (Wardley).** Only the evolution axis is used here. The four stages, in
Wardley's characteristics:

| | Genesis | Custom-built | Product (+rental) | Commodity (+utility) |
|---|---|---|---|---|
| Ubiquity | rare | slowly increasing | rapidly increasing | widespread |
| Certainty | poorly understood | rapid learning | well defined, improving | commonly understood |
| Market | undefined | forming | growing, competing suppliers | mature |
| User perception | exciting / confusing | leading edge | common, expected | standard, invisible |
| Failure | expected | tolerated | low tolerance | surprising |
| How you build it | experimentation | artisanal craft | repeatable process | volume operations, remove deviation |

Decision questions, asked in this order:

1. *Could we consume this from several interchangeable suppliers and nobody would notice?*
   → `commodity` (card payments, e-mail delivery, object storage, authentication).
2. *Could we buy or rent a configurable package that does 80% of it?* → `product` (accounting,
   CRM, subscription billing, helpdesk).
3. *Do we have to build it to fit our way of working, and is it still changing as we learn?*
   → `custom`.
4. *Has nobody done this before; do we expect experiments to fail?* → `genesis`.

The climatic pattern *"everything evolves through supply and demand competition"* means stages
drift right over time: what was custom five years ago is a product now. Strategic implication for
the next step: genesis/custom capabilities are where differentiation (core domain) can live and
are **build** candidates; product/commodity capabilities are **buy / rent / consume** candidates
and should not absorb design effort. When unsure between two stages for anything that is not the
differentiator, choose the one further right — it is cheaper to discover you must build than to
have built what you could have bought. An alternative (§6) that wins outright on a capability is
evidence for `product`/`commodity`: somebody already sells or gives away the thing.

## 6. Constraints, non-goals, existing systems, lifecycle

- **Constraints** are what the design cannot change: regulatory (GDPR, PCI-DSS, e-invoicing
  mandates, food labelling), contractual (imposed by a customer or partner: an SLA, a mandated
  file format, data residency, a vendor contract until 2027 — these become conformist or
  anticorruption-layer relationships towards that party), technical (must keep the Postgres
  cluster, must integrate SAP), organisational (one team, no on-call, ownership politics),
  budget, timeline. Write them precisely — "PCI: card data never touches our systems" rather
  than "security" — because they become conformist / anticorruption-layer relationships in
  Decompose and quality attributes in Define. Every real system has at least one.
- **Non-goals** stop later steps modelling things nobody asked for. Name the plausible things
  the business will not do (restaurant delivery, multi-currency, a marketplace).
- **Existing systems** (always present, `[]` when none): for brownfield, every running system
  with `will`: `replace` (retire it), `integrate` (talk to it), `ignore` (out of scope but
  present). For greenfield, the external services already chosen and the customers' tools or
  vendor products this system displaces. Use the organisation's own names.
- **Alternatives** (`alternatives[]`, always present — `[]` when none, with an assumption saying
  so): differentiation is relative, so record what each actor uses *instead of us* today. `kind`:
  `competitor` (a rival product they could buy), `incumbent-product` (the vendor tool they already
  pay for), `spreadsheet`, `manual-process` (phone calls, e-mail, paper, walking over to a
  colleague), `in-house-tool` (something IT or a power user built), `do-nothing` (they live with
  the problem). For each: who uses it (`used_by`, actor ids), what it does well, what it does
  badly, and which capabilities it competes with. Strategize's differentiation question — the
  ddd-crew *how hard would it be for a new entrant or an existing competitor to match this?* — and
  its rationale template ("a comparison with the alternative the customer has today: competitor,
  spreadsheet, manual process") cannot be answered from `existing_systems`, which only lists what
  *we* integrate with or retire. The two overlap on purpose: the Access database being retired is
  `existing_systems` (`will: replace`) *and* `alt-access-database` (`in-house-tool`) — the first
  says we must migrate its data, the second says what we must beat. Auto mode: infer from the
  brief ("today they run on spreadsheets, phone calls and a legacy Access database" gives three)
  and log the confidence; when the brief is silent, `do-nothing` for the primary actor plus a
  low-confidence assumption is the honest default. **Dominance**: when an alternative wins
  outright on a capability (Google Maps for routing, Stripe for card capture) that capability
  cannot be core — say so in a `notes_for_downstream` entry `for: ["strategize"]`, kind `risk`
  when you inferred it, `decision` when the user said it ("routing: Google Maps is the alternative
  and it wins — do not build"), and expect its evolution stage to be `product`/`commodity`.
- **Lifecycle** (`system.lifecycle`) is judged from the system being built, not from the market:
  *does code of this system run in production today?* No → `greenfield`; yes, and this work
  extends or integrates it → `brownfield`; yes, and this work replaces it → `rewrite`. A rewrite
  lists the system being retired under `existing_systems` with `will: replace` and usually
  carries a parity or cut-over constraint. The converse does not hold: a greenfield SaaS that
  replaces its customers' spreadsheets or a vendor tool lists those with `will: replace` and
  stays greenfield.

## 7. Scale target — how to size

The scale target is what every later step is checked against (`organise` compares its deployable
count with it). Evidence, best first:

1. The user's or orchestrator's statement ("three services", "up to fifteen deployables", "two
   teams"). Never exceed a stated maximum.
2. Existing deployables: `docker-compose` services, Kubernetes Deployments, monorepo `apps/` or
   `services/` folders, serverless function lists, Procfiles.
3. Team evidence: CODEOWNERS, "we are three developers" in the README, org docs.
4. The goals' scale: 10k users and one team do not need ten services.

Defaults when evidence is thin (record as a low-confidence assumption plus an open question):

| Situation | deployables | teams |
|---|---|---|
| Solo developer or one team, ≤3 running services | 1–3 | 1 |
| Product company, 2–4 teams, several existing services | 4–9 | 2–4 |
| Platform or multi-product organisation, ≥5 teams | 10–20 | 5+ |

`users` is an order of magnitude ("~10k monthly", "internal, 200 staff"). `notes` carries the
preference the number implies ("solo dev, modular monolith preferred").

## 8. Depth scaling

| | `light` | `standard` | `deep` |
|---|---|---|---|
| BMC | one line per block | full cells | full, plus per-segment jobs/pains/gains |
| Goals | 1–2 | 2–4 | 2–5 |
| Impact map | primary actor only | every actor that matters, per goal | same, plus off-stage actors |
| Capabilities (aim; lint tolerates) | 3–6 (3–8) | 6–12 (4–15) | 10–15 (6–30), plus evolution narrative |
| Constraints / non-goals | the top 1–3 each | all known | all known, with sources |
| Time box (interactive) | 20–30 min | 1–2 h | half a day |

Over the capability aim band: merge the two candidates that share language and would be owned by
one team. Under it: look for a capability you will buy (payments, identity, e-mail) that you left
out. A light run should fit on one screen. A deep run should still not repeat itself.

## 9. Good vs bad — quick reference

| Part | Bad | Good |
|---|---|---|
| Goal | "Launch the new portal" | "Cut time-to-first-invoice from 3 days to 1 hour — metric: median hours from sign-up to first sent invoice; target: 1 h; horizon: Q2" |
| Actor | "Users", "The backend" | `freelancer` (person, primary) — sends invoices and chases payment; `tax-authority` (organisation, off-stage) — must accept e-invoices |
| Impact | "Build reminder emails" | "Freelancer sends the first reminder without leaving the app" |
| Deliverable | "Notification microservice with Kafka" | "One-click reminder with a pre-written message" (must) |
| Capability | "Invoice API", "Checkout page", "Billing service" | "Invoicing" (custom), "Card payments" (commodity), "Tax calculation" (product) |
| Constraint | "Must be secure" | "PCI-DSS: card data never touches our systems (use a hosted payment page)" (regulatory) |
| Non-goal | (none) | "No multi-currency in the first year" |
| Alternative | "Competitors", "Excel" | `alt-google-maps` (competitor) used by `dispatcher` — does well: live traffic, free, every driver knows it; badly: no multi-stop constraints, no time windows — competes with `cap-route-planning` |
| Value proposition link | a proposition with no capability behind it | "Every stop routed in the right order" → rests on `cap-route-planning`, beats `alt-google-maps` |

## 10. What 2025–2026 practitioner writing adds

- **Domains and contexts do not map 1:1** (Verraes, Aug 2025): *"Bounded Contexts exist primarily
  for the engineers."* Understanding the business is necessary, but do not let this step
  mechanically dictate boundaries — capabilities here are candidates, and Decompose may split or
  merge them for technical, team or legacy reasons. Keep this step descriptive.
- **Organisational dynamics are design material** (Xin Yao via InfoQ, Nov 2025): capture who
  owns what, where the politics and the team boundaries are, as `organisational` constraints and
  open questions, not as footnotes — sociotechnical facts shape Organise.
- **Business model before solutions** (Baas-Schwegler, van Kelle, Verschatse, *Collaborative
  Software Design*): running the canvas first *"prevents teams from prematurely locking into
  solutions"* — the reason this skill drafts the BMC before capabilities and forbids naming
  services.
- **Strategic DDD is cheap and almost always worth it; tactical DDD is selective** (Aleinikov,
  Aug 2026): for small or early teams, keep this step `light` rather than skipping it. Nothing in
  the 2025–2026 writing argues against the Understand step itself; the pushback is against heavy
  tactical machinery on CRUD-like or early products — a reason to record "supporting/generic" hints
  honestly via evolution stages so Strategize and Code can go light where it is warranted.
- **Impact mapping is unchanged** (Adzic, 2020–2026): no "2.0"; his *Lizard Optimization* work
  on long-tail user behaviour is complementary, not a revision of WHY/WHO/HOW/WHAT.

## 11. Sources

All accessed 2026-08-29.

- DDD Starter Modelling Process, ddd-crew — https://github.com/ddd-crew/ddd-starter-modelling-process
  (raw README: https://raw.githubusercontent.com/ddd-crew/ddd-starter-modelling-process/master/README.md)
- ddd-crew, Core Domain Charts (the "new entrant / existing competitor" differentiation questions
  that `alternatives[]` answers) — https://github.com/ddd-crew/core-domain-charts
- Strategyzer, Business Model Canvas — https://www.strategyzer.com/library/the-business-model-canvas ;
  book summary with the nine questions — https://www.strategyzer.com/library/business-model-generation-book-summary ;
  instruction manual (fill order, coherence, mistakes) — https://assets.strategyzer.com/assets/resources/the-business-model-canvas-instruction-manual.pdf ;
  crystal-clear canvas — https://www.strategyzer.com/library/how-to-design-a-crystal-clear-business-model-canvas ;
  BMC vs VPC — https://www.strategyzer.com/library/5-questions-business-mode-canvas ;
  Value Proposition Canvas — https://www.strategyzer.com/library/the-value-proposition-canvas ;
  VPC mistakes — https://www.strategyzer.com/library/5-common-mistakes-to-avoid-when-using-the-value-proposition-canvas
- Gojko Adzic, Impact Mapping — https://www.impactmapping.org/ , https://www.impactmapping.org/drawing.html ,
  https://www.impactmapping.org/about.html , https://www.impactmapping.org/example.html ;
  book quotes — https://www.goodreads.com/work/quotes/21884784-impact-mapping-making-a-big-impact-with-software-products-and-projects ;
  "Make impacts, not software" (2013) — https://gojko.net/2013/06/14/make-impacts-not-software/ ;
  Lizard Optimization — https://lizardoptimization.org/
- Wardley Mapping evolution axis — https://learnwardleymapping.com/ (main pages returned HTTP 403 to
  automated fetch on 2026-08-29; content taken from the site's archive https://archive.learnwardleymapping.com/
  and Simon Wardley's cheat-sheet post https://blog.gardeviance.org/2016/04/whats-in-wardley-map-and-need-for-cheat.html ;
  secondary glossary https://www.wardleymaps.com/glossary/evolution-stages)
- Melissa Perri, "What is good product strategy?" — https://melissaperri.com/blog/2016/07/14/what-is-good-product-strategy
- Jeff Patton, "The new backlog" — https://www.jpattonassociates.com/the-new-backlog/ ;
  "User story mapping" — https://www.jpattonassociates.com/user-story-mapping/ ("minimize output,
  maximize outcome and impact" is from the book *User Story Mapping*, O'Reilly 2014)
- Business capability model — https://en.wikipedia.org/wiki/Business_capability_model (Nick Tune's
  and EA-vendor primers returned 403/404 to automated fetch; only the fetched source is cited)
- Mathias Verraes, "No, your domains and bounded contexts don't map 1 on 1" (28 Aug 2025) —
  https://verraes.net/2025/08/domain-and-bounded-contexts-dont-map-one-on-one/
- Ben Linders / Xin Yao, "How to do sociotechnical design using DDD and change smuggling" (InfoQ, 13 Nov 2025) —
  https://www.infoq.com/news/2025/11/sociotechnical-design-DDD/
- Baas-Schwegler, van Kelle, Verschatse, *Collaborative Software Design* (Manning) —
  https://www.manning.com/books/collaborative-software-design
- Aleksei Aleinikov, "Domain-Driven Design in 2026: a practical guide for real teams" (1 Aug 2026) —
  https://www.alekseialeinikov.com/en/blog/topics/architecture/domain-driven-design-2026-a-practical-guide
