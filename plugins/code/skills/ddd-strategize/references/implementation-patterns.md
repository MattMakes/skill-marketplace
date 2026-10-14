# Implementation-pattern decision table

Which business-logic pattern each subdomain gets, and why. The pattern is the single most
consequential output of this step for `ddd-code`: only `domain-model` and
`event-sourced-domain-model` contexts get aggregates designed at all (contract §4.8). Sources at
the end (accessed 2026-08-29).

## 1. The four patterns

| Pattern | What it is | Fits |
|---|---|---|
| `transaction-script` | one procedure per request; direct or thinly wrapped data access; each script succeeds or fails whole (Fowler; Khononov ch. 5) | glue around a vendor, webhooks, ETL-ish jobs, simple supporting logic |
| `active-record` | an object that wraps a row/document, encapsulates data access and adds CRUD-level logic (Fowler; Khononov ch. 5) | supporting subdomains with structured data and a simple lifecycle |
| `domain-model` | aggregates, entities, value objects, domain events; invariants enforced inside the aggregate; state persisted (Khononov ch. 6) | core subdomains with real rules |
| `event-sourced-domain-model` | the same building blocks, but the domain events *are* the source of truth; state is a projection; "the persisted domain events represent a strongly consistent audit log" (Khononov ch. 7) | core subdomains where the history itself is an asset |

Khononov's summary (vladikk.com, 2018): "For Core subdomains, use the heavy artillery. Implement
the Domain Model or Event-Sourced Domain Model pattern. … For Supporting subdomains, use simple
solutions. Transaction Script or Active Record patterns are enough. … Generic subdomains are cheaper
to buy or adopt than to implement yourself."

## 2. The decision tree — type first, then complexity, then history

**Gate on the subdomain type before asking about money, audit or analytics.** The history
question only applies to the core. A payments wrapper touches money every day and is still generic.

```
type == generic  ──────────────────────────────────────▶ integrate, don't implement
                                                          pattern: transaction-script
                                                          (adapter / webhook handler / ACL glue)

type == supporting ─ complexity ≤ 3, flat data ─────────▶ transaction-script
                   ├ complexity ≤ 5, structured data ───▶ active-record
                   └ complexity ≥ 6 ───────────────────▶ SUSPECT: simplify, or re-check the type
                                                          (core in disguise?). If it stays
                                                          supporting: active-record + open question

type == core ──────── complexity ≤ 3 ───────────────────▶ active-record  (hidden / short-term core:
                                                          do not over-engineer a CRUD core)
                   └ complexity ≥ 4 ─┬ history is an asset ─▶ event-sourced-domain-model
                                     └ otherwise ──────────▶ domain-model
```

"History is an asset" means at least one of (Khononov's LDDD ch. 10 heuristic, as summarised;
Nickolaisen: "analytics can be differentiating"):

- money or ledger-like transactions where every change must be reconstructible;
- a regulator, auditor or dispute process asks "who did what, when, and what did the state look
  like then" (`constraints[].kind = regulatory` is a strong hint);
- temporal queries are a business feature ("plan as of 3 March", retroactive corrections);
- analytics or ML on behaviour history is a stated goal (`goals[]` / `impacts[]` mention it).

If none applies, `domain-model`. Event sourcing costs: eventually consistent read models, event
versioning, CQRS "almost a requirement" (Soueid's summary of ch. 8/10), a steeper learning curve.
Pay it only where the history pays back.

### 2.1 Complexity, not type, is the tie-breaker (Tune, Campusano)

Nick Tune: "If a simple forms over data (aka CRUD) solution will suffice, we shouldn't waste time
over-engineering." Kevin Campusano (2026): "Complexity, subdomain types and particular business
requirements are what drive how we implement business logic", with the progression transaction script
→ active record "when data structures become complex", active record → domain model "when
orchestration logic becomes duplicated/inconsistent", domain model → event-sourced "for long-term
data consistency needs" — and "only deploy an event sourced domain model when the situation really
calls for it". The synchronium architecture wiki states the failure mode plainly: "applying a domain
model to CRUD wastes effort."

### 2.2 Over-engineering red flags (2024–2026 practitioner writing)

Signals that a subdomain does **not** need aggregates, domain events or repositories — score its
complexity ≤ 3 and pick a simple pattern:

- a state machine with fewer than three states; rules that reduce to a database constraint; methods
  that are only getters/setters/CRUD; features that are really just forms (Anhaia 2024: "For a service
  that does `INSERT INTO orders`, why need seven types, five files, and a constructor for every primitive?");
- "Not every bounded context needs aggregates, domain events, and repositories … Simple CRUD is fine
  for generic subdomains" (Weber 2026); a domain event wrapping a preference toggle is "just a setter
  with extra steps";
- when event sourcing *is* justified, the cost is usually aggregate ceremony, not the events: a
  functional core (pure command → events functions) with a thin shell keeps it small (Fritzsche 2025).

Hexagonal ports and adapters are an architecture choice, not a DDD tactical pattern; a supporting
context may use them for testability without any aggregate (Anhaia).

## 3. Good versus bad

| Subdomain | Facts | Bad decision | Good decision |
|---|---|---|---|
| `billing` (meal-kit) | generic; Stripe integrated; differentiation 1; touches money daily | `event-sourced-domain-model` "because money needs an audit trail" | `transaction-script` — Stripe *is* the ledger; we handle a webhook and record a `week-charged` fact. Type gate first. |
| `subscriptions` (meal-kit) | core; weekly-choice rules, cut-offs, pauses; complexity 6 | `active-record` "it's just a table with a status" | `domain-model` — invariants (one choice per week, cut-off before packing) live in a `Subscription` aggregate |
| `subscriptions` + refund disputes | as above, plus support needs "what did the plan look like on 3 March" and finance reconciles weekly charges against choices | `domain-model` + ad-hoc audit table bolted on later | `event-sourced-domain-model` — the choice history is the audit log and the dispute evidence |
| `notifications` | generic; SaaS sends; message *content* rules belong to the core that decides what to say | `domain-model` for "notification aggregate" | `transaction-script` adapter; content rules modelled in the core subdomain, not the channel |
| `warehouse-slotting` | supporting on the chart, but complexity 8 (bin-packing, cold-chain windows) | `active-record` and hope | re-check the type: if slotting quality moves a goal (fewer spoiled boxes → G2), it is a core in disguise → `domain-model`; if not, simplify the rules and log the open question |

## 4. What the pattern implies downstream (for `ddd-code`)

| Pattern | Architecture (Khononov ch. 8/10 as summarised) | Tests | Aggregates in `code.json`? |
|---|---|---|---|
| `transaction-script` | layered (3 tiers) or a vertical slice; thin | integration / end-to-end heavy | no — `application_services` + `design.md` |
| `active-record` | layered; ORM-backed records | integration heavy, a few unit tests on validation | no |
| `domain-model` | ports & adapters (hexagonal/onion/clean); domain isolated from infrastructure | unit tests on aggregate invariants (testing pyramid) | yes — one Aggregate Design Canvas per aggregate |
| `event-sourced-domain-model` | ports & adapters + CQRS; event store as source of truth; projections for reads | unit tests on command → events; integration on projections | yes, plus event catalogue and versioning notes |

Mixed contexts: when a bounded context spans subdomains with different types or patterns, the
context takes its *most demanding* subdomain — core > supporting > generic; event-sourced >
domain-model > active-record > transaction-script (`ddd strategize render` derives the Hand-off this way).
A generic or bought subdomain hosted inside a built context is an *adapter* (an ACL inside that
context around the vendor), not a context relationship and not a reason to call the context generic.
Say so in the rationale, or ask `ddd-decompose` whether the context should split.

## 5. Sourcing × pattern sanity table

| Sourcing | Allowed patterns | Never |
|---|---|---|
| `buy` / `open-source` | `transaction-script` (the integration code) | `domain-model`, `event-sourced-domain-model` — you do not model a vendor's problem |
| `outsource` | `transaction-script`, `active-record` | anything that needs the core team's judgement daily |
| `build` | any | `transaction-script` on a core with complexity ≥ 4 (the rules will scatter across scripts — Khononov: "transaction scripts should never be used for core subdomains") |

## 6. Sources (accessed 2026-08-29)

- Vlad Khononov, *Revisiting the Basics of Domain-Driven Design* (2018): https://vladikk.com/2018/01/26/revisiting-the-basics-of-ddd/
- Vlad Khononov, *Learning Domain-Driven Design* (O'Reilly, 2021) ch. 5–8 and ch. 10 ("Design Heuristics"), https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/ — as summarised by guh.me https://guh.me/notes/learning-domain-driven-design/, Isidro Martínez https://medium.com/@Isidro/book-review-learning-domain-driven-design-2e2cdc746da8 ("transaction scripts should never be used for core subdomains"; event store as audit log) and Toni Soueid https://tonisoueid.medium.com/book-review-learning-domain-driven-design-by-vlad-khononov-c7473afa5ba (layered for TS/AR, ports & adapters / CQRS for domain models)
- Martin Fowler, *Patterns of Enterprise Application Architecture* catalog: https://martinfowler.com/eaaCatalog/transactionScript.html and https://martinfowler.com/eaaCatalog/activeRecord.html
- Nick Tune, *Core Domain Patterns* (2020): https://medium.com/nick-tune-tech-strategy-blog/core-domain-patterns-941f89446af5
- Kevin Campusano, End Point Dev, *Applying Domain-Driven Design in Practice* (2026-05-26): https://www.endpointdev.com/blog/2026/05/applying-it-in-practice-ddd-part-4/
- synchronium, *Software Architecture wiki — Domain Model pattern*: https://synchronium.github.io/software-architecture-wiki/patterns/domain-model.html
- Kent McDonald, *Purpose Based Alignment Model* ("analytics can be differentiating"; "treat exceptions like exceptions"): https://www.kbp.media/purpose-based-alignment-model/
- Kevin Campusano, End Point Dev series part 2 (business logic patterns, 2026-04-21) https://www.endpointdev.com/blog/2026/04/implementing-business-logic-ddd-part-2/ and part 3 (architecture per pattern, 2026-05-05) https://www.endpointdev.com/blog/2026/05/designing-software-architecture-ddd-part-3/
- Gabriel Anhaia, *Hexagonal for the Rest of Us: Ports and Adapters Without DDD* (2024-04-29): https://dev.to/gabrielanhaia/hexagonal-for-the-rest-of-us-ports-and-adapters-without-ddd-2ko8
- Michael Weber, *DDD Anti-Patterns: God Aggregates, Leaky Abstractions, and Over-Engineering* (updated 2026-02): https://kindatechnical.com/domain-driven-design/lesson-98-ddd-anti-patterns-god-aggregates-leaky-abstractions-and-over-engineering.html
- Rico Fritzsche, *Beyond Aggregates: Lean, Functional Event Sourcing* (2025-06-11): https://ricofritzsche.me/functional-event-sourcing/
