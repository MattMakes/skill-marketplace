# Classification and scoring guide — core / supporting / generic

How `ddd-strategize` scores each subdomain, turns the scores into a type, and decides sourcing,
investment and future direction. Distilled from the primary sources listed at the end (all
accessed 2026-08-29). Read this when a score feels arbitrary or a classification is contested.

## 1. Why classify at all

"Time and resources are limited, so understanding which parts of the domain to focus on is
critical to delivering optimal business impact" (DDD Starter Modelling Process, *Strategize*).
Classification decides three things downstream:

| Decision | Core | Supporting | Generic |
|---|---|---|---|
| Who works on it | strongest, most stable team; domain experts closest | anyone; a training ground; outsourceable | integrators, not modellers |
| How much modelling | rich domain model, invariants, tests on rules | simplest thing that works | none — adopt the vendor's model behind an ACL |
| Sourcing | build, own the IP ("never buy the core") | build simple, or outsource | buy / adopt (SaaS, open source) |

Getting this wrong is expensive in both directions: a rich model on a supporting subdomain wastes
the best people ("if you're investing in sophisticated software development outside your core
subdomain, you're probably doing it wrong" — olano.dev, 2025); a bought product in the core hands
the differentiator to every competitor with a credit card (Khononov).

## 2. The two axes (Core Domain Chart)

The ddd-crew chart plots each subdomain on **business differentiation** and **model complexity**.

> Note on axis orientation: the ddd-crew template puts differentiation on the x-axis and
> complexity on the y-axis. This skill chain deliberately swaps them — **x = model complexity,
> y = business differentiation** — because the contract fixture and the mermaid `quadrantChart`
> read best that way (core ends up top-right). Do not "fix" the swap; every step downstream and
> `ddd strategize render` assume it.

The ddd-crew README is explicit that scoring "is hard and is usually quite subjective. Strategy is a
bet on the future". Scores are a conversation starter, not a measurement. Engineers gauge
complexity; product and business people supply differentiation. Ask both.

### 2.1 Business differentiation (0–10)

Question: *does doing this better than competitors win customers or money?*

| Score | Anchor | Evidence in `understand.json` |
|---|---|---|
| 0–1 | Nobody chooses us for this; any vendor's version is fine | capability evolution `commodity`; an `existing_systems` entry with `will: integrate` covers it |
| 2–3 | Must exist and work; customers notice failure, never excellence | not named in `value_propositions` / `key_activities`; no goal metric depends on it |
| 4–5 | Some advantage if done well, but competitors match it quickly (Purpose Alignment: *parity*) | indirectly serves a goal; a `should`/`could` deliverable |
| 6–7 | Directly moves a goal metric; a value proposition depends on it; competitors need real effort to match | an `impacts[]` entry or `must` deliverable points here; capability evolution `custom` |
| 8–9 | The reason customers pick us; named as a value proposition or key activity; hard to copy | goal `G*` metric is literally this subdomain's output |
| 10 | The business *is* this; losing it loses the market ("decisive core") | `system.one_liner` describes it |

ddd-crew clues for differentiation: how hard would it be for a **new entrant** or an **existing
competitor** to match the capability? How much advantage is derived **now**, and how much **could**
be? What brand damage follows a major failure here? Which Cynefin domain is it in (complex/chaotic
problems are where differentiation hides; obvious problems are generic)?

### 2.2 Model complexity (0–10)

Question: *how many rules, invariants, state transitions and edge cases must the software get right?*

| Score | Anchor | Evidence in `discover.json` / `decompose.json` |
|---|---|---|
| 0–1 | Forms-over-data CRUD; experts describe it in CRUD terms | ≤2 events+commands, no policies |
| 2–3 | Validation-heavy CRUD; a couple of statuses; a linear workflow | 3–4 events+commands; at most one policy |
| 4–5 | A lifecycle with invariants; several interacting rules; calculations; more than one actor | 5–7 events+commands; policies triggered by its events; an `aggregate_candidates` entry |
| 6–7 | Many interacting rules; time-dependent behaviour; concurrency or consistency constraints; specialists needed | ≥8 events+commands; hotspots of kind `conflict`/`unclear` near its events; pivotal events |
| 8–9 | Algorithms, optimisation, scheduling, pricing, matching; long ramp-up for newcomers; scale adds complexity | description uses *optimise, allocate, schedule, price, match, forecast* |
| 10 | Research-grade; no proven model exists anywhere (Wardley *genesis*) | capability evolution `genesis` |

Khononov's simple/complex heuristics (vladikk.com, 2018): CRUD-shaped and described in CRUD terms →
simple; logic revolves around input validation → simple; complex algorithms and calculations →
complex; business rules and invariants that must be enforced → complex; many distinct execution
scenarios (high cyclomatic complexity) → complex. Complexity is **relative to this company** — the
same "creatives catalogue" is trivial for an ad agency and core for a digital-asset-management vendor.

Separate the three kinds of complexity (ddd-crew): *essential* (the domain), *accidental*
(legacy code, migrations) and *operational* (work done by people outside the software). Only
essential complexity argues for a rich model; accidental complexity argues for a clean-up plan;
operational complexity may be a hidden core (see §4).

## 3. From scores to a type

Apply in this order; the first rule that matches wins. Record which rule fired in the rationale.

1. **Generic** — differentiation ≤ 3 **and** the problem is solved elsewhere: capability evolution is
   `product` or `commodity`, or an `existing_systems` entry with `will: integrate` covers it, or it is
   a known commodity category (identity/auth, payments, invoicing/accounting, email/SMS/push,
   document storage, search, analytics/BI, CRM, HR/payroll, CMS, logging/monitoring, maps, tax).
   Khononov's first question: *"Can you buy/adopt an off-the-shelf product without compromising the
   company's competitive advantage?"* — yes → generic.
2. **Core** — differentiation ≥ 7, or differentiation = 6 with complexity ≥ 6 and a goal whose
   metric this subdomain moves. Khononov: if you cannot buy it and the logic is complex, it is core.
   Vernon: the core is "where the business must excel"; you should not plan to become experts in
   billing and authentication.
3. **Supporting** — everything else: needed to make the core work, not differentiating, no
   off-the-shelf fit. Khononov: "*Is the business logic simple? — Supporting Subdomain.*"

**In doubt → supporting** (modes.md §3). It is cheaper to promote a subdomain to core after a
domain expert objects than to have spent a rich model on it.

### 3.1 Core must be the minority

`ddd validate` warns when `cores > max(2, n // 2)` and when there are no cores. Both are real signals:

- **Too many cores** → the scoring is wrong, not the business. Rank by differentiation; keep the top
  ones that are genuinely named in the value propositions; demote the rest to supporting and log
  one assumption per demotion ("A3: `notifications` demoted from core: no goal metric depends on
  it"). Khononov: a company may have several cores, but each must be something it does
  *differently* from competitors.
- **No core** is legal only when the differentiation lies outside the software (Khononov's
  side-business example: the edge was in partner relationships; all subdomains were supporting or
  generic). Record that explicitly as an assumption and do not over-engineer anything.

## 4. Core domain patterns (Nick Tune) — read the chart, not just the type

Where a subdomain sits *within* its zone changes the investment advice. Use these labels in
`future_direction` (and as the optional `chart_pattern` key in deep runs).

| Pattern | Position (x = complexity, y = differentiation) | What it means | What to do |
|---|---|---|---|
| **Decisive core** | top-right corner (both ≥ 8) | "whichever organisation gets this right is likely to become market leader" | the big investment; best people; rich model; event-sourced if the history is an asset |
| **Short-term / first-to-market core** | high y, low x | differentiating today, but "due to the low complexity, it's not a defensible advantage and the competition will catch up" | priority now, but keep the architecture light; already plan the *next* core (ddd-crew example: music catalogue → discovery) |
| **Hidden core** | high y, low x, but the hard part is done by people | CRUD software wrapping a manual process | ask "can we let computers do the hard work people currently do?" — the real core may be one step deeper |
| **Table-stakes former core** | y drifting down over time | an innovation that everyone now expects (contactless payment) | keep it working, stop investing in modelling; it is supporting now |
| **Commoditised core** | y collapsed, product/commodity available | Elasticsearch killed bespoke search as a differentiator | switch to buy; migrate; free the people |
| **Big bet / disruptive core** | y unknown, potentially very high | "until the product is delivered and feedback from the market is acquired, nobody knows for sure" | record as a `bets[]` entry with the risk and the signal that validates it |
| **Black swan core** | was commodity, became core | Slack's internal chat | you cannot plan for it; review classifications regularly |
| **Suspect supporting** | low y, high x | "how can something with relatively little business differentiation require such high levels of investment?" | usually accidental complexity (legacy, migration) — set a plan and timeline to reduce it, or it is a core in disguise (vladikk) |

Khononov's *Learning DDD* ch. 11 (as summarised by Soueid, 2022, and by Campusano's 2026 series):
"subdomain types are not static". Four documented triggers — **commoditisation** (core/supporting →
generic once off-the-shelf catches up), **opportunity emergence** (generic/supporting → core once it
starts to differentiate; Campusano's retail chain whose inventory management "started as a generic
subdomain … became a core subdomain" as scale outgrew the standard approach), **advantage loss**
(core → supporting) and **integration cost** (a generic becomes supporting-in-practice when buying
and integrating costs more than building). Record the trigger you expect in `future_direction`. The
Building Better Teams KB recommends reviewing classifications every 6–12 months; Wardley's doctrine
goes further: "there is no core — everything is transient". And keep Sodkiewicz's caution in mind:
these are heuristics that start the conversation, not a decision tree that ends it.

## 5. Sourcing: follow the evolution stage

Wardley's evolution stages (learnwardleymapping.com, *Landscape*) describe how a capability is
perceived and therefore how it should be sourced:

| Stage | Perception in industry | Failure | Sourcing default |
|---|---|---|---|
| **genesis** | "competitive advantage / unpredictable / unknown" | high, tolerated | build as an experiment — a *bet*; pioneers |
| **custom** | "competitive advantage / ROI / case examples" | moderate | build in-house; settlers turn it into a product |
| **product (+rental)** | "advantage through implementation / features" | not tolerated | buy or adopt a product; build only if the product cannot be configured to your rules |
| **commodity (+utility)** | "cost of doing business / accepted" | surprised by failure | buy the utility; never build; town planners |

Rules the skill applies:

- **Core → `build`.** Always. A vendor may still supply a *component* inside the core (a routing
  engine, an ML API) — record it as an assumption and keep the model and the rules in-house. Cory
  Foy: in the differentiating quadrant "we shouldn't just outsource it – we need to own the
  intellectual property so we can drive the evolution of the component".
- **Generic → `buy`** when a SaaS/utility exists (commodity), **`open-source`** when a mature OSS
  project exists and a constraint favours self-hosting (data residency, budget, offline), rarely
  **`outsource`**. Existing systems with `will: integrate` win: sourcing is whatever the business
  already uses. Rich Mironov's one-liner (via kbp.media): "only build things that support your
  differentiator, rent everything else".
- **Supporting → `build`** simple (junior-friendly, a good first project), or **`buy`** and configure
  when a mature product covers most of it (Kaiser 2025, Kesarkar 2026: supporting is where you "buy a
  mature product and customise" — but customising beyond the product's configuration surface is
  building in disguise), or **`outsource`** when team capacity is the constraint and the logic is well
  specified. SAP's DDD guide adds a useful rule: if you outsource a supporting subdomain, the core
  team still writes the acceptance tests; Kesarkar adds that outsourcing *execution* is fine,
  outsourcing *understanding* (product, architecture, IP, business knowledge) is not.
- **Constraints override defaults.** `constraints[].kind = regulatory` (data residency, audit) can
  turn `buy` into `open-source`; `budget` favours OSS; `timeline` favours `buy`. Say which
  constraint moved the decision.
- **Subdomain evolution** = the stage of its *least evolved* capability (you cannot buy the whole
  subdomain if one part is custom). No capabilities mapped → infer from `existing_systems`
  (integrating a vendor → `product`/`commodity`) or the description; log the inference. Evolution
  describes the *market*, not our decision: "just because a component is being built in-house, that
  does not mean it is automatically placed in the custom-built evolution stage" (Kaiser 2025). A
  cloud provider builds commodity-grade infrastructure in-house because it is *their* core.
- **Build-vs-buy checklist for generic and supporting** (Schloter 2025): strategic differentiation,
  capacity to maintain it (security patches, upgrades, on-call), compliance burden, time-to-value,
  key-person risk, lock-in tolerance (check open data access and switching cost *before* signing),
  and total cost of ownership beyond the licence. Build triggers worth naming in the rationale: data
  residency, latency, deep integration with proprietary systems, a vendor whose model fights your rules.
- **AI code generation changes the cost of writing, not of owning.** The 2026 Retool report finds 35 %
  of enterprises replaced at least one SaaS tool with custom software and 78 % plan to build more;
  it also finds only 8 % deploy AI-generated code unmodified and most builds happen outside IT
  oversight. Khononov (2026): faster generation does not cut total cost of ownership when human
  comprehension and review stay the bottleneck. So the classification does not move: a cheap-to-write
  generic is still generic — buy unless a named constraint forbids it; if you do build a supporting
  subdomain with AI help, budget for the ownership, not the typing.

## 6. Investment: where the best people and the most modelling time go

| Type | Investment | Concretely |
|---|---|---|
| core | `high` | strongest engineers, domain experts in the room, aggregate design in `ddd-code`, tests on every invariant, quality attributes in `ddd-define` |
| supporting | `medium` when complexity ≥ 5, it feeds the core directly, or a failure there breaks a regulatory constraint or damages the brand; else `low` | proven patterns, mainstream stack, CRUD; rotate juniors through it |
| generic | `low` | integration only: an anticorruption layer if the vendor model leaks into the core; no modelling |

Nick Tune's commitment check: add the intended effort (FTEs, budget) next to each subdomain and
compare with the chart — "why are we allocating double the number of FTEs to our supporting vs our
core domains?" is the question that exposes accidental complexity. The Building Better Teams KB
quotes 60–80% of engineering effort going to core domains in successful technology companies; treat
that as a sanity check, not a target.

## 7. Purpose Alignment Model (deep runs)

Niel Nickolaisen's model (Pixton, Nickolaisen, Little, McDonald, *Stand Back and Deliver*, 2009;
kbp.media summary) uses **market differentiating** × **mission critical**:

| Quadrant | Meaning | Treatment | Usual DDD type |
|---|---|---|---|
| **Differentiating** | differentiating and mission critical | "excel … you should be careful to not under-invest"; own the IP | core |
| **Parity** | mission critical, not differentiating | "design parity features to be good enough … simplify and standardize"; "complexity implies that you are likely over-investing" | supporting, generic |
| **Partner** | differentiating but not mission critical for us | "find a partner for whom those activities are differentiating" | generic (buy) or a partnership relationship |
| **Who cares** | neither | "perform them as little as possible" | generic, or drop |

Mapping rule: mission critical = a `must` deliverable, a revenue stream or a regulatory constraint
depends on it. Differentiating = score ≥ 6. Record the quadrant in the optional
`purpose_alignment` key. Two warnings from the source: "what is a differentiating activity changes
over time" (as soon as you ship it, competitors copy it), and people will "contort their processes
so they fall into the differentiating category" — which is why core must stay the minority.

## 8. Rationale quality — good versus bad

Every rationale must name the goal (or the absence of one), the alternative the customer has today
(a competitor, a spreadsheet, a manual process — from `existing_systems` with `will: replace`, the value
propositions, or understand's `alternatives` when present; otherwise write "no alternative known"), and
the rule that fired.

| | Example |
|---|---|
| **Good** | "core — G1 (grow active subscribers to 10k) depends on weekly meal choice taking under two minutes (I1); competitors' pickers are slow and generic; complexity 6 from choice rules, cut-offs and substitutions; nothing to buy" |
| **Bad** | "core — it's important and customers use it a lot" (no goal, no comparison with the alternative the customer has today, no rule) |
| **Good (generic)** | "generic — payments are commodity (Stripe already integrated, `existing_systems`); differentiation 1: no customer picks us for how we charge cards; buy; transaction script around the webhook" |
| **Bad** | "generic — Stripe does it" (true, but does not say why differentiation is low or what pattern follows) |

### Wrongly marked core (worked example)

`notifications` scored differentiation 8 because "customers love our emails". Check: no goal metric
mentions notifications; `cap-notifications` is `commodity`; three SaaS providers do it. The *content*
of the message might matter to G2 (retention), but the *sending* is generic. Correct classification:
**generic, buy, transaction-script**; if message content rules are rich, they belong to the core
subdomain that decides *what* to say, not to the channel that sends it. Log: "A4: notifications
demoted from core to generic — sending is commodity; content rules live in `retention`."

## 9. Sources (accessed 2026-08-29)

- ddd-crew, *Core Domain Charts* (README, clues for measuring complexity and differentiation, usage
  variations): https://github.com/ddd-crew/core-domain-charts — examples
  https://github.com/ddd-crew/core-domain-charts/blob/main/examples/first-to-market-core.md and
  https://github.com/ddd-crew/core-domain-charts/blob/main/examples/pioneers-run-experiments.md
- ddd-crew, *DDD Starter Modelling Process*, §Strategize: https://github.com/ddd-crew/ddd-starter-modelling-process#strategize
- Nick Tune, *Core Domain Patterns* (2020-01-19): https://medium.com/nick-tune-tech-strategy-blog/core-domain-patterns-941f89446af5
- Nick Tune, *Visualising Sociotechnical Architecture with DDD and Team Topologies*: https://medium.com/nick-tune-tech-strategy-blog/visualising-sociotechnical-architecture-with-ddd-and-team-topologies-48c6be036c40
- Vlad Khononov, *Revisiting the Basics of Domain-Driven Design* (2018-01-26; the categorisation flowchart, complexity heuristics, "core in disguise", the no-core case): https://vladikk.com/2018/01/26/revisiting-the-basics-of-ddd/
- Vlad Khononov, *Learning Domain-Driven Design* (O'Reilly, 2021), ch. 1 and ch. 11, as summarised by
  Toni Soueid (2022-03-11) https://tonisoueid.medium.com/book-review-learning-domain-driven-design-by-vlad-khononov-c7473afa5ba,
  guh.me notes https://guh.me/notes/learning-domain-driven-design/ and olano.dev, *Domain-Driven Design Revisited* (2025-06-06) https://olano.dev/blog/domain-driven-design-revisited/ (the advantage / complexity / volatility / sourcing table)
- Vaughn Vernon, *Domain-Driven Design Distilled* (2016), ch. 2–3, as summarised by Nick Hayden: https://nickhayden.com/blog/domain-driven-design-distilled-notes/
- Kent McDonald, *Purpose Based Alignment Model* (Niel Nickolaisen's model; quadrant guidance, "changes over time", build vs rent): https://www.kbp.media/purpose-based-alignment-model/ — also Xebia https://xebia.com/blog/the-purpose-alignment-model/ and Cory Foy (2018, combining it with a Wardley map) https://blog.coryfoy.com/2018/03/aligning-your-strategy-with-the-purpose-based-alignment-model/
- Learn Wardley Mapping, *Landscape* (evolution characteristics cheat sheet) https://learnwardleymapping.com/landscape/ and *Doctrine* https://learnwardleymapping.com/doctrine/
- Simon Wardley, *On Pioneers, Settlers, Town Planners and Theft* (2015): https://blog.gardeviance.org/2015/03/on-pioneers-settlers-town-planners-and.html
- Building Better Teams KB, *Core Domains in Strategic DDD* (drift over time, review cadence, effort split): https://kb.buildingbetterteams.de/docs/technology-product/strategic-ddd/ddd-core-domains/
- Kevin Campusano, End Point Dev, *Applying Domain-Driven Design in Practice* (2026-05-26; complexity decides the pattern, start with broad boundaries): https://www.endpointdev.com/blog/2026/05/applying-it-in-practice-ddd-part-4/
- SAP, *Curated resources for DDD — core concepts* (outsourced supporting subdomains still get acceptance tests from the core team): https://github.com/SAP/curated-resources-for-domain-driven-design/blob/main/blog/0002-core-concepts.md
- Susanne Kaiser, *Architecture for Flow* (Addison-Wesley, 2025), excerpt "Build-or-Buy Decisions with Subdomain Types and Evolution Stages" (InformIT, 2026-02-25): https://www.informit.com/articles/article.aspx?p=3222355&seqNum=3
- Kaustubh Kesarkar, *Build, Buy, or Outsource? A DDD Approach to Strategic Technology Decisions* (2026-07-05): https://blog.gyri.tech/making-build-vs-buy-decisions-for-technology-solutions/
- Philipp Schloter, *Build vs. Buy in the Age of AI: A Practical Decision Framework* (Forbes, 2025-11-17): https://www.forbes.com/councils/forbesbusinesscouncil/2025/11/17/build-vs-buy-in-the-age-of-ai-a-practical-decision-framework/
- Kelsey McKeon, *The Build vs. Buy Shift* (Retool 2026 Build vs. Buy report, 2026-02-17): https://retool.com/blog/ai-build-vs-buy-report-2026
- Vlad Khononov, *AI Doesn't Fix Your Real Bottleneck* (2026-02-23) and related 2026 posts: https://vladikk.com/
- Kevin Campusano, End Point Dev series part 1 (classification table, inventory example, 2026-04-06): https://www.endpointdev.com/blog/2026/04/high-level-system-analysis-and-design-ddd-part-1/
- Marcin Sodkiewicz, *Geek read: Learning Domain-Driven Design* (2024-01-27): https://sodkiewiczm.medium.com/geek-read-learning-domain-driven-design-28e258a7e7b7
- Simon Wardley, Pioneers / Settlers / Town Planners reference (Online Wardley Maps docs — "aptitude and attitude" staffing): https://docs.onlinewardleymaps.com/docs/map-elements/pst/
- "DevByJESUS", *Implementing Domain-Driven Design — Day 2* (2024-11-25; paraphrase of Vernon's "best developers on the core" — not a verified quote): https://dev.to/edgaremmanuel/implementing-domain-driven-design-day-2-o75
