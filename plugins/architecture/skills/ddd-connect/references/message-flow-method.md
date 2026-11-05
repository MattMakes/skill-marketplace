# Message-flow method — how to design the collaboration between bounded contexts

This is the long-form method behind `ddd-connect`. SKILL.md tells you *what to do*; this file tells
you *why*, with the sources. All URLs were accessed 2026-08-29.

## 1. What "Connect" is for

The DDD Starter Modelling Process defines step 5 as: *"Connect the sub-domains into a loosely-coupled
architecture which fulfills end-to-end business use-cases."* Its rationale is the whole point of this
step: *"It is imperative to not only decompose a large domain into parts but to also carefully design
the interactions between those parts to minimise unwanted coupling and complexity. It is necessary to
challenge the initial design by applying concrete use-cases to uncover hidden complexity."*
([ddd-crew/ddd-starter-modelling-process](https://github.com/ddd-crew/ddd-starter-modelling-process))

So: the context map (decompose) says *that* two contexts relate and in which direction; this step
walks concrete scenarios through the contexts and says *how* — which messages, in what order, sync
or async, over what mechanism — and uses what it finds to challenge the boundaries. If a flow is
ugly, the boundary may be wrong; record that as a coupling concern or an open question rather than
smoothing it over (the process is explicitly *"not a linear sequence of steps"* — going back to
decompose is normal).

## 2. Domain Message Flow Modelling (the notation)

Source: [ddd-crew/domain-message-flow-modelling](https://github.com/ddd-crew/domain-message-flow-modelling)
(CC BY 4.0). A Domain Message Flow Diagram *"visualises the flow of messages (commands, events, queries)
between actors, bounded contexts, and systems for a single scenario."* One diagram per scenario.

**Parties**: actors (people, roles), bounded contexts, external systems. In this chain those are the
ids from `discover.actors`, `decompose.bounded_contexts` and `discover.external_systems`, plus any party
discover never named that you declare in `connect.json.parties[]` (contract §4.5) — the validator accepts
nothing else in `from`/`to`.

**Message types** (same definitions the Bounded Context Canvas uses,
[ddd-crew/bounded-context-canvas](https://github.com/ddd-crew/bounded-context-canvas)):

| Type | Meaning | Obligation on the receiver |
|---|---|---|
| **command** | a request to do something | may accept or reject; the sender usually cares about the outcome |
| **event** | a notification that something has happened | none — consumers decide what to do; producer does not know them |
| **query** | a request for information | answer it; *"for queries, represent both request and response as one unit"* |

The canvas's own review prompt is the cheapest coupling check there is: *"Is each message type optimal
(e.g. should a command be an event)?"* A command crossing a boundary means the sender knows the receiver
and wants something done; an event means the producer is indifferent to who reacts. Prefer the weaker
obligation whenever the business does not need the answer.

**Each message has three elements**: *"the name of the message, the significant data contained within
the message, the order in which the message occurs."* Hence `message`, `payload` and `seq` in
`connect.json`. The README's advice to *"defer the data section"* if it slows you down is why the skill
drafts steps first and fills payloads in the catalogue afterwards.

**The five-step process**: *"1. Start with an actor/context/system. 2. Create the message they want to
send. 3. Add the recipient of the message and a line connecting the sender and the receiver. 4. Place
the message close to the line. 5. Repeat steps 1–4 until your scenario is complete."*

**Size heuristic (Miller's law)**: *"The number one problem with Domain Message Flow Diagrams, and
diagrams in general, is too much information. Aim to have between 5 and 9 messages on your diagram."*
More than nine → split the scenario or collapse a chatty exchange. `ddd connect render --check` warns.

**Time-driven messages**: *"within or after or every 5 minutes are very different conditions"* — when a
policy is time-based, say which one in the step `note`.

## 3. Process-level EventStorming: policies and read models are the integration points

Grammar (ddd-crew [EventStorming glossary & cheat sheet](https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet)):
*Actor + Query model → Command → Constraint/Aggregate → Domain Event → Policy → Command*. A policy is
*"a reaction that says 'whenever X happens, we do Y' … A policy can be an automated process or manual."*
Read models: *"To make decisions an actor might need information, we capture these in a Query Model."*

Discover already recorded policies as `{when: <event>, then: [<command>]}` and decompose assigned every
event and command to exactly one context. Therefore:

- **A policy whose `when` event and `then` command are owned by different contexts is an integration
  by definition.** Somebody has to carry `when` from one context to the other. That is the first list
  the skill builds (`ddd connect inputs`), and every such policy must appear in at least one flow.
- **A read model that needs data owned by another context is a query or a replicated read model** —
  a second integration point that EventStorming makes visible and code reviews usually miss.
- **Manual policies** (`kind: manual`) become a human actor step, not an automatic subscription.

### Who hosts the policy? (the decision that shapes the flow)

For `whenever meals-chosen (Subscriptions) then charge-week (Billing)` there are two honest designs:

1. **Subscription (choreography)** — Subscriptions publishes `meals-chosen`; Billing subscribes and
   issues its own `charge-week`. Subscriptions does not know Billing exists. Loose; the upstream cannot
   fail because the downstream is down. Default for `published-language`, `open-host-service`,
   `customer-supplier` where the supplier publishes.
2. **Command** — Subscriptions sends `charge-week` to Billing. Subscriptions knows Billing and wants the
   outcome. Choose this only when the upstream needs the result to continue (e.g. it must show
   "payment declined" to the user right now) or when the rule is genuinely the upstream's
   responsibility. It costs temporal coupling.

Heuristic: the context that owns the business rule "whenever X then Y" hosts the policy. If the rule is
about Y's domain (Billing decides what is chargeable), Y subscribes. If X must guarantee Y happens
before it can proceed, X commands — and you probably have a long-running process (see §6).

## 4. Sync vs async — Newman's taxonomy and rules

Sam Newman, *Building Microservices* 2nd ed., ch. 4–5 (notes: [samnewman.io](https://samnewman.io/books/building_microservices_2nd_edition/),
[chapter notes](https://strikingloo.github.io/wiki/oreilly-microservices), [danlebrero summary](https://danlebrero.com/2023/01/24/building-microservices-second-edition-designing-fine-grained-systems-summary/)):

- Styles: **request-response** (sync or async — the caller expects an answer), **event-driven** (*"the event
  emitter is leaving it up to the recipients to decide what to do"*), **common data** (shared store; only
  for bulk/latency-tolerant transfer, never as the day-to-day integration of two contexts).
- *"Beware of long call chains"*: every synchronous hop adds temporal coupling — both sides must be up —
  and widens the blast radius of a failure. The lint flags chains of three or more sync hops.
- Default to async/event-driven **when an immediate answer is not required**; use sync request-response
  when the caller genuinely cannot continue without the answer (authorising a payment, checking a hard
  constraint) — and then keep the chain short.
- Databases are an implementation detail of the owning context; sharing them is *"especially
  problematic"* for independent change. The only sanctioned exception is a purpose-built reporting store.
- Technology: REST/HTTP is the *"sensible default"* for broad interop; gRPC when you control both ends and
  need performance; brokers for delivery guarantees — but *"expect duplicates"* and design idempotent consumers.
- Contracts: *"Add new things to a microservice interface; don't remove old things"* (expansion changes),
  tolerant readers, coexist versions only for real breaking changes.

## 5. Reliability: outbox, at-least-once, idempotency

Vlad Khononov, *Learning DDD* ch. 9 (notes: [vladikk.com EDA on AWS II](https://vladikk.com/2024/10/12/aws-eda-ii/),
[review](https://tonisoueid.medium.com/book-review-learning-domain-driven-design-by-vlad-khononov-c7473afa5ba)):
publishing a domain event from inside the aggregate or before the transaction commits leaves a gap —
*"if something goes wrong between writing to the database and publishing the message, the system will
end up in an inconsistent state."* The **transactional outbox** persists *"both the state changes and the
outgoing messages to the operational database in a single atomic transaction"*; a relay then publishes
them (pull = polling publisher; push = CDC/log tailing).

Chris Richardson, [Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) and
[Idempotent consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html):
delivery is at-least-once by construction, so consumers de-duplicate (processed-message-id table in the
same transaction as the business update). *Exactly-once in practice = at-least-once delivery + idempotent
consumer*, not a transport guarantee. Ordering is preserved per aggregate id (partition key), which is
also the Debezium outbox router's default ([Debezium outbox event router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)).
Milan Jovanović ([Implementing](https://milanjovanovic.tech/blog/implementing-the-outbox-pattern), [Scaling the outbox](https://milanjovanovic.tech/blog/scaling-the-outbox-pattern), 2024):
polling is the simple default; parallel relays break per-aggregate ordering — add a consumer-side inbox
if order matters.

EIP [Idempotent Receiver](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html):
*"Design a receiver to be an Idempotent Receiver — one that can safely receive the same message multiple
times"* — either by de-duplicating on a message id or by making the operation naturally idempotent
("set balance to X" rather than "add 10").

**Inside one deployable** (the 1–3 deployable case): in-memory event dispatch is at-most-once — a crash
between commit and handler loses the event. Kamil Grzybek's reference modular monolith pairs an in-memory
bus with per-module outbox/inbox tables for exactly this reason ([Integration styles](https://www.kamilgrzybek.com/blog/posts/modular-monolith-integration-styles)).
Richardson's counterweight: in a monolith, default to *one command = one ACID transaction* across modules
and *"avoid eventual consistency unless it solves a problem"*
([How modular can your monolith go, part 6](https://microservices.io/post/architecture/2023/11/13/how-modular-can-your-monolith-go-part-6-transactional-commands.html)).
So for co-located contexts: direct call in one transaction when the business step must be atomic and the
modules are stable; in-memory domain event when autonomy matters and eventual consistency is acceptable;
outbox table when the event must not be lost. Record which one in `delivery`.

## 6. Long-running flows: saga vs process manager, choreography vs orchestration

Khononov ch. 9: a **saga** handles *linear* flows — a direct mapping from events to commands, no state
of its own, instantiated implicitly by the first event. A **process manager** keeps its own persistent
state and *decides* the next step; the moment the flow needs a branch, a timeout or a decision based on
several earlier results, promote it to a process manager. Neither replaces a transaction: every step is
a local transaction, failures need **compensating actions**, and consumers must be idempotent.

EIP [Process Manager](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ProcessManager.html):
*"Use a central processing unit, a Process Manager, to maintain the state of the sequence and determine
the next processing step based on intermediate results"* — with the warning that *"using a Process Manager
for every situation may be overkill"* and that it can become a bottleneck.

Newman ch. 6: choreography (*"the event emitter doesn't need to know what any downstream microservices are
able to do"*) is loosest but needs correlation ids for visibility; orchestration gives visibility and a
single owner but risks absorbing logic *"that should otherwise be pushed into the services."* Rule of
thumb: one team owns the whole flow → orchestration is fine; steps span teams → choreography. And *"avoid
the use of distributed transactions like the two-phase commit."*

Depth `deep` records these as `sagas[]` in `connect.json` (style, owner context, trigger, steps,
compensations, timeouts) and draws the failure path as its own flow.

## 7. Model translation and anticorruption

Khononov ch. 9: **stateless translation** — a proxy/adapter that maps the upstream model to the downstream
one on the fly (sync ACL in front of an API, or an async message translator on the bus) — when the
mapping is a pure function of the incoming message. **Stateful translation** — when the downstream must
aggregate over time or unify several upstream sources — needs its own storage and often becomes a small
bounded context of its own. In this step: relationship pattern `anticorruption-layer` → say which kind
in the integration decision `rationale`; stateful translation usually means `async-events` feeding a
replicated read model in the downstream.

EIP [Message Translator](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageTranslator.html)
is the messaging form of the same idea.

## 8. Payload design: thin vs fat events

Martin Fowler, [What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html):
**event notification** (thin: id + what happened; consumers query back) vs **event-carried state transfer**
(fat: the changed data travels with the event; consumers keep a copy). Thin keeps coupling low but hides
flow; fat removes the round trip and survives upstream downtime at the cost of duplicated, drifting data.

Thoughtworks 2024, [Thin events](https://www.thoughtworks.com/insights/blog/architecture/thin-events-the-lean-muscle-of-event-driven-architecture):
default to thin; go fat only for point-in-time state that must not drift (the amount and currency at
charge time), low-shared-context integrations, or small co-located producer/consumer pairs.

Newman: *"I am OK putting information into an event if I'd be happy sharing the same data over a
request-response API"* — the same information-hiding discipline as any API.

EIP [Event Message](https://www.enterpriseintegrationpatterns.com/patterns/messaging/EventMessage.html):
*"the subject should issue an event as soon as a change occurs, and the observer should process it quickly
while it's still relevant."*

Rule for `payload`: the identifiers plus the facts the *named consumers* need to act without calling back,
and nothing that belongs to another context's model. Eight-plus fields is a smell (lint notes it).

## 9. Contracts and versioning (published language)

- The **upstream owns the published language** — a versioned event/API contract crafted for consumers, not
  its internal model exposed (Khononov's "contract coupling", §10). Consumers that must not be shaped by
  it add an ACL on their side.
- **Additive-only evolution**: add optional fields with defaults; never rename a field or change its meaning;
  readers ignore unknown fields and default missing ones (Greg Young, [Versioning in an Event Sourced System](https://leanpub.com/esversioning/read);
  Confluent, [Schema compatibility](https://developer.confluent.io/patterns/event-stream/schema-compatibility/)).
- **Bump the version only on a breaking change**, and then expand → dual-publish → migrate consumers →
  contract, never a hard cutover (CloudEvents [primer](https://github.com/cloudevents/spec/blob/main/cloudevents/primer.md):
  bump `type` on incompatible change; Oskar Dudycz, [How to (not) do event versioning](https://event-driven.io/en/how_to_do_event_versioning/)).
- Make the contract explicit: an AsyncAPI/OpenAPI document owned by the upstream, verified by consumer-driven
  tests (Pact message interactions) in CI ([Pact best practices 2025/26](https://www.sachith.co.uk/contract-testing-with-pact-best-practices-in-2025-practical-guide-feb-10-2026/)).
- Record `version` on catalogue entries whose contract is `published-language` or `open-host-service`.

## 10. Coupling review — strength, distance, volatility

Vlad Khononov, *Balancing Coupling in Software Design* (2024; [coupling.dev](https://coupling.dev/),
[essence in 500 words](https://vladikk.com/2024/10/09/coupling-and-cohesion/), [InfoQ podcast](https://www.infoq.com/podcasts/balancing-coupling-software-design/)):

- **Integration strength** — how much knowledge crosses the boundary, from **intrusive** (using
  non-public internals) through **functional** (must change together) and **model** (share a domain
  model) to **contract** (a *"model of a model"* crafted to encapsulate the internal one).
- **Distance** — coordination cost between the two sides: same module → same deployable → different
  team → different company.
- **Volatility** — how often the upstream changes. *"Coupling is only a problem if a component is volatile."*
  Core subdomains are volatile by definition; generic and supporting ones are not.
- **Balance**: strength and distance should be inverse. High strength at low distance is modularity
  (fine — a module boundary inside one deployable); high strength at high distance is complexity (pain);
  low strength at low distance is wasted effort (needless ceremony). Volatility amplifies imbalance.

In this step: for each relationship, note strength (does the downstream use the upstream's model or a
contract?), distance (`assumed_distance`) and volatility (strategize `type`/`investment` of the upstream).
A volatile core upstream at any distance → contract coupling (published language / OHS). A stable generic
upstream co-located → model coupling is fine; do not build a contract for the sake of it. Every
imbalance you leave in place becomes a `coupling_concerns[]` entry.

## 11. Drawing it: Mermaid `sequenceDiagram` rules the renderer follows

[Mermaid sequence diagram syntax](https://mermaid.js.org/syntax/sequenceDiagram.html): participants render in
order of first appearance unless declared (`participant id as Name`, `actor id as Name`); `->>` solid with
arrowhead (used for sync), `-)` solid with open arrowhead (async), `-->>` dotted (response); `autonumber`
numbers messages; `opt … end`, `alt … else … end`, `par … and … end`, `Note over A,B: text`. Pitfalls:
the word `end` breaks diagrams unless aliased, `;` and `#` inside a label need entity escapes, hyphenated
ids are safer aliased. `ddd connect render` handles all of it: write `note`, `when` and party names
as plain text (a literal `;` is fine — never pre-escape it as `#59;`, the renderer would escape it twice)
and do not hand-write `mermaid` strings.

## Sources (accessed 2026-08-29)

- ddd-crew, DDD Starter Modelling Process — https://github.com/ddd-crew/ddd-starter-modelling-process
- ddd-crew, Domain Message Flow Modelling — https://github.com/ddd-crew/domain-message-flow-modelling
- ddd-crew, Bounded Context Canvas — https://github.com/ddd-crew/bounded-context-canvas
- ddd-crew, EventStorming glossary & cheat sheet — https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet ; EventStorming.com — https://www.eventstorming.com/
- Hohpe & Woolf, Enterprise Integration Patterns — https://www.enterpriseintegrationpatterns.com/patterns/messaging/ (Event Message, Command Message, Request-Reply, Publish-Subscribe Channel, Idempotent Receiver, Process Manager, Message Translator, Correlation Identifier)
- Mermaid, Sequence diagrams — https://mermaid.js.org/syntax/sequenceDiagram.html
- Khononov, Learning Domain-Driven Design (2021), ch. 9 — https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/ ; notes https://vladikk.com/2024/10/12/aws-eda-ii/
- Khononov, Balancing Coupling in Software Design (2024) — https://coupling.dev/ ; https://vladikk.com/2024/10/09/coupling-and-cohesion/ ; https://www.infoq.com/podcasts/balancing-coupling-software-design/
- Newman, Building Microservices 2nd ed. (2021), ch. 4–6 — https://samnewman.io/books/building_microservices_2nd_edition/
- Richardson, Transactional outbox — https://microservices.io/patterns/data/transactional-outbox.html ; Idempotent consumer — https://microservices.io/patterns/communication-style/idempotent-consumer.html ; Modular monolith part 6 (2023) — https://microservices.io/post/architecture/2023/11/13/how-modular-can-your-monolith-go-part-6-transactional-commands.html
- Grzybek, Modular Monolith: Integration Styles — https://www.kamilgrzybek.com/blog/posts/modular-monolith-integration-styles
- Comartin, Stop joining tables in your "modular" monolith (2026) — https://codeopinion.com/stop-joining-tables-in-your-modular-monolith/
- Jovanović, Implementing / Scaling the Outbox Pattern (2024) — https://milanjovanovic.tech/blog/implementing-the-outbox-pattern ; https://milanjovanovic.tech/blog/scaling-the-outbox-pattern
- Debezium, Outbox Event Router — https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
- Fowler, What do you mean by "Event-Driven"? (2017) — https://martinfowler.com/articles/201701-event-driven.html
- Thoughtworks, Thin events (2024) — https://www.thoughtworks.com/insights/blog/architecture/thin-events-the-lean-muscle-of-event-driven-architecture
- Young, Versioning in an Event Sourced System — https://leanpub.com/esversioning/read ; Dudycz, How to (not) do event versioning — https://event-driven.io/en/how_to_do_event_versioning/
- Confluent, Schema compatibility — https://developer.confluent.io/patterns/event-stream/schema-compatibility/ ; CloudEvents primer — https://github.com/cloudevents/spec/blob/main/cloudevents/primer.md
- Pact message contracts, best practices 2025/26 — https://www.sachith.co.uk/contract-testing-with-pact-best-practices-in-2025-practical-guide-feb-10-2026/
