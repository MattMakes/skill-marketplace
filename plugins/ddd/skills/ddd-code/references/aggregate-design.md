# Aggregate design — the rules, the canvas, and what goes wrong

Read this before drafting any aggregate. It condenses the ddd-crew Aggregate Design Canvas, Vaughn
Vernon's "Effective Aggregate Design" (parts I–III) and Khononov's implementation-pattern chapters
into the decisions `ddd-code` has to make. Sources with URLs are at the end.

## 1. What an aggregate is (and is not)

An aggregate is a **transactional consistency boundary**: a cluster of entities and value objects
that is loaded, checked and saved as one unit, through one entry point (the root). Its job is to
make a small set of business rules impossible to violate. It is *not* an object graph, a database
table, a "manager", or a place to put every rule that mentions the same noun.

Consequences that follow directly:

- **One aggregate instance per transaction.** A command changes one instance and commits. If a use
  case seems to need two, either you found a missing concept (fold it into one aggregate) or the
  second change belongs to *someone else's job* and can be eventually consistent (see §3).
- **The root enforces the invariants.** Nothing outside the aggregate mutates its internals; the root
  exposes commands as methods (`subscription.chooseMeals(week, recipes, clock)`), not setters.
- **Other aggregates are referenced by identity**, never by object reference. `Order` holds a
  `CustomerId`, not a `Customer`.
- **Only contexts whose implementation pattern is `domain-model` or `event-sourced-domain-model`
  get aggregates.** Transaction-script and active-record contexts get use cases and persistence.
  If a supporting context "feels like it needs an aggregate", the pattern in `strategize.json` is
  wrong — raise it as an open question, do not smuggle one in.

## 2. The Aggregate Design Canvas (ddd-crew) — how to fill each section

The canvas has nine sections. Fill them in this order; the later ones test the earlier ones.

| # | Section | What to write | Heuristic from the canvas authors |
|---|---|---|---|
| 1 | **Name** | The domain noun, in the context's ubiquitous language. Include the lifecycle when it matters (`WeeklyBox`, `BillingPeriodInvoice`). | A time-scoped name is a hint that the aggregate is scoped to a period — usually a good thing. |
| 2 | **Description** | Responsibilities, *why this boundary*, and the alternatives you rejected. | If you cannot say what you rejected, you have not designed the boundary. |
| 3 | **State transitions** | The explicit lifecycle: `draft→placed→paid→shipped`, plus the transitions that are *rejected*. | Too many transitions → a process boundary was missed, split. Trivial transitions → anaemic, logic leaked into services. |
| 4 | **Enforced invariants** | Rules that must be true after *every* transaction on this instance. | Many invariants → high local complexity; consider whether some are validation rules (§4) or belong to another aggregate. |
| 5 | **Corrective policies** | What happens when a rule was relaxed to reduce contention and is later found violated (compensate, flag, notify, auto-fix). | Many corrective policies → logic was pushed out of the aggregate; maybe the boundary is too small. Listing 4 and 5 side by side makes the trade-off explicit. |
| 6 | **Handled commands → created events** | Every command the root accepts and the event(s) each produces. Use the ids from `discover.json`. | Every command must produce at least one event; every event must come from a command (or a policy). Gaps mean the timeline in discover is incomplete. |
| 7 | **Throughput** | Command handling rate (avg / max) and number of concurrent clients per instance. | High rate × many clients = concurrency conflicts → split, or accept optimistic-lock retries. |
| 8 | **Size** | Event growth rate per instance and lifetime of an instance. | Long-lived, ever-growing instances → scope to a period (billing period, week, season). Medium/large sizes are manageable with snapshots. |
| 9 | **Notes / questions** | Open points for the domain expert. | — |

At depth `light`, write sections 1–6 fully and give 7–8 as one-line estimates or "unknown — measure".
At `standard`/`deep`, estimate 7–8 with numbers (Vernon's back-of-the-envelope method: instances ×
events per instance × bytes; commands per second per instance).

## 3. Vernon's four rules, and the question that decides consistency

1. **Model true invariants in consistency boundaries.** An invariant is "a business rule that must
   always be consistent". Only rules the *business* would call broken if violated for a millisecond
   belong inside the aggregate.
2. **Design small aggregates.** Large aggregates load thousands of objects for trivial operations,
   fail transactions more often (optimistic concurrency) and are slow. In one real project ~70 % of
   aggregates ended up as a single root entity with value-typed properties. Start there.
3. **Reference other aggregates by identity.** Keeps aggregates small, allows independent persistence
   and partitioning, and makes cross-context messaging natural. If a view needs the joined data, that
   is a read model's job, not the aggregate's.
4. **Use eventual consistency outside the boundary.** Evans: "Any rule that spans AGGREGATES will not
   be expected to be up-to-date at all times." Publish a domain event; a subscriber changes exactly
   one other instance in its own transaction, retrying on conflict, compensating if retries run out.

**Whose job is it?** (Vernon, crediting Evans): if it is the job of the *user executing this command*
to make the data consistent, make it transactional — inside one aggregate. If it is another user's
job, or the system's, make it eventually consistent. Ask this for every rule that seems to span
two aggregates; it exposes the real invariants better than technical arguments.

**When breaking the rules is legitimate** (Vernon part II): UI convenience for batch creation where
every instance still enforces its own invariants; lack of messaging/timers in the platform (decide
slowly); mandated global transactions you cannot push back on yet; query performance. None of these
is an excuse to skip the design — write the deviation into the canvas's description.

## 4. True invariant vs validation rule

| | True invariant (belongs in the aggregate) | Validation / policy (does not) |
|---|---|---|
| Example | "A week is chosen at most once per subscription." | "Recipe ids must be non-empty strings." |
| Example | "An order's total equals the sum of its lines." | "A customer may have at most 5 open orders." (spans instances → policy or read model) |
| Example | "Choices lock at the weekly cutoff." (needs `Clock` port passed in) | "Email addresses must be RFC-5322 valid." (value-object construction) |
| Who cares if it is briefly wrong | The business — it is money, fairness, safety, law | The UI / the type system |
| Where it is enforced | Root method, before the event is produced | Value-object constructor, request validation, or an eventually-consistent policy |
| Test | Named domain test: `rejects choosing the same week twice` | Unit test of the value object / request schema |

A rule that mentions *another* aggregate ("cannot ship until paid") is almost never an invariant of
this aggregate: it is a policy reacting to the other aggregate's event (`week-charged → pack-box`).

## 5. Small aggregate vs bloated aggregate

**Bloated** (do not do this):

```
Subscription
  ├─ Customer (full profile, addresses, marketing preferences)
  ├─ WeekChoice[] (every week since 2019, each with Recipe objects incl. ingredients)
  ├─ Invoice[] (every invoice, with payment attempts)
  └─ Box[] (every physical delivery with tracking history)
```
One `chooseMeals` loads years of history, every concurrent action on any invoice or box conflicts
with choosing meals, and four teams edit one class.

**Small** (do this):

```
Subscription (root)                      references: CustomerId
  ├─ status: active | paused | cancelled
  ├─ currentChoice: WeekChoice? (week, recipeIds, lockedAt)
  └─ invariants: one choice per week; locked after cutoff; ≤ N recipes
WeekChoice history → read model (projection of meals-chosen)
Invoice → Billing context (its own aggregate or a transaction script)
Box → Fulfilment context (active record)
```

Heuristics: if two commands never touch the same data, they may be different aggregates; if an
instance would live forever, scope it by period; if you need a list of *all* children to decide,
ask whether the rule is really about the aggregate or about a report.

## 6. Corrective policies — write them, they are design

Every time you choose eventual consistency you owe a corrective policy. Format:
"**When** *(violation is detected)* **then** *(compensation)* **within** *(time bound)* **owner** *(who)*".
Example: "When a week is charged but the choice was later cancelled, then refund and emit
`week-refunded` within 24 h; owner: billing." If no corrective policy exists, either the rule is
not important (drop it) or it must be transactional (move it inside).

## 7. Entities, value objects, domain services, factories

- **Value object** when identity does not matter and equality is by value: `Money`, `Week`,
  `RecipeId`, `Address`. Immutable; validates itself on construction; carries behaviour
  (`money.add`, `week.cutoff()`). Most attributes of a root should be value objects.
- **Entity inside the aggregate** only when the thing has its own lifecycle *within* the root and
  must be addressed by id inside the aggregate (`OrderLine`). Never exposed for mutation outside.
- **Domain service** when a rule needs more than one aggregate's data or a port (e.g. a pricing
  policy). Stateless; takes aggregates/values in, returns values or calls one root. Do not inject
  ports into aggregates; pass what they need as arguments (a `Clock` value, a pre-computed price).
- **Factory** (or static constructor) when creation has its own rules; it produces the first event
  (`subscription-started`).

## 8. Implementation patterns — what each looks like in code (Khononov, ch. 5–7, 10)

| Pattern | Shape in code | Persistence | Tests | Use for |
|---|---|---|---|---|
| **Transaction script** | One procedure per use case: validate → load → decide → write → publish. No persistent object model. | Direct SQL / query builder; explicit transaction; beware *implicit distributed transactions* (DB write + HTTP call in one script — make the call idempotent, or use an outbox). | Reversed pyramid: integration tests through the store dominate; few unit tests. | Generic/supporting subdomains with simple logic (billing wrappers, notifications, imports). |
| **Active record** | Record classes mapped to tables with CRUD + simple behaviour; use cases orchestrate records. | ORM entity = the record. | Reversed pyramid. | Supporting subdomains with complex *data*, simple *logic*. |
| **Domain model** | Aggregates, value objects, domain events, repositories (interfaces in the core), application services one per command. Optimistic concurrency via version. | Repository maps root ↔ storage; ORM allowed only in the adapter. | Pyramid: many fast domain tests (one per invariant), some use-case tests with in-memory adapters, few end-to-end. | Core subdomains with complex logic. |
| **Event-sourced domain model** | As domain model, but state = fold of the instance's event stream; commands produce new events; projections build read models. | Event store (stream per instance), snapshots when streams grow, versioned events with upcasters. | Diamond: aggregate decision tests (given events, when command, then events), projection tests, replay tests. | Core subdomains where history/audit/analysis matter and the model is still uncertain. |

Khononov's decision heuristic: core → domain model (event-sourced when the past will be queried);
supporting → active record (rich data) or transaction script (simple); generic → buy, else the
simplest pattern. Domain model pairs with ports & adapters; event-sourced with ports & adapters
+ CQRS; transaction script/active record are fine in a layered or vertical-slice layout.

## 9. Design-level EventStorming / Event Modeling — the chain you are encoding

`command → aggregate → event → read model → policy → command`. Every command in `discover.json`
must land on exactly one aggregate (domain-model contexts) or one use case (others); every event is
produced by exactly one of them; every read model is fed by named events; every policy is a handler
that turns an event into a command — in this context or another. Event Modeling's completeness
check applies: *every field has an origin and a destination*. Specify each slice as
Given (prior events) / When (command) / Then (events or rejection); those become the tests.

## 10. Checklist before you commit an aggregate

- [ ] Named in the context's language; the id matches `discover.aggregate_candidates` (or is new and justified)
- [ ] Every invariant is a *true* invariant of this instance (§4), stated so a test can be named after it
- [ ] State transitions listed, including the rejected ones
- [ ] Commands and events use discover ids; each command → ≥ 1 event
- [ ] References to other aggregates are ids
- [ ] Cross-aggregate rules have a policy and a corrective policy
- [ ] Throughput/size considered; long-lived instances scoped by period
- [ ] Root has no dependency on ports, ORM, framework, or transport types

## Sources (accessed 2026-08-29)

- ddd-crew, *Aggregate Design Canvas* — https://github.com/ddd-crew/aggregate-design-canvas
  (sections, throughput/size metrics, split heuristics)
- Vaughn Vernon, *Effective Aggregate Design* parts I–III (2011) —
  https://www.dddcommunity.org/library/vernon_2011/ ; PDFs
  https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf ,
  …/Vernon_2011_2.pdf , …/Vernon_2011_3.pdf (four rules, "whose job is it", when to break the
  rules, eventual consistency via domain events + domain service)
- Vaughn Vernon, *Implementing Domain-Driven Design* (2013), ch. 10 — Tell-Don't-Ask on roots,
  no dependency injection into aggregates, repositories return roots only (book, not online)
- ddd-crew, *DDD Starter Modelling Process*, "Code" —
  https://github.com/ddd-crew/ddd-starter-modelling-process (tools for this step: Aggregate Design
  Canvas, C4 component diagrams, design-level EventStorming, Event Modeling, hexagonal/onion
  architecture, model exploration whirlpool)
- Alberto Brandolini, *EventStorming* — https://www.eventstorming.com/ ; grammar summary
  https://ddd-crew.github.io/eventstorming-glossary-cheat-sheet/
- Adam Dymitruk, *Event Modeling* — https://eventmodeling.org/ ,
  https://eventmodeling.org/posts/what-is-event-modeling/ (seven steps, four patterns, GWT slices,
  completeness check)
- Vlad Khononov, *Learning Domain-Driven Design* (O'Reilly 2021), ch. 5–7 and 10 —
  https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/ (patterns,
  decision heuristics, test-shape heuristics; paraphrased from the book and the author's course
  outline https://www.oreilly.com/live-events/business-logic-design-patterns/0636920082720/0636920082719/)
