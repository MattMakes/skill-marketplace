# Integration decisions — relationship pattern × deployment distance → mechanism

One decision per `decompose.json` relationship, recorded in `connect.json.integration_patterns[]`
(`relationship`, `mechanism`, `assumed_distance`, `rationale`). The mechanism enum is fixed by the
contract: `in-process-call` | `async-events` | `sync-api` | `batch` | `shared-db`. `shared-db` exists in
the enum so that a brownfield reality can be *recorded*; never choose it for a new design.

## Step 1 — Decide the assumed distance per relationship

`ddd-organise` (next step) decides deployables, so at this point distance is an assumption. Make it
explicit so organise can confirm or flip it, and so the flows stay honest.

Default from `manifest.scale_target` (`ddd connect inputs` prints the hint):

| `deployables_max` | Default distance | Meaning |
|---|---|---|
| ≤ 3 | `same-deployable` | modular monolith: in-process calls, in-memory domain events; a context is separate only for cause |
| 4–9 | `same-deployable` unless a cause below applies | a few separate deployables are expected — name them |
| ≥ 10 | `separate-deployable` | real async integration by default; co-locate only tightly-coupled pairs |

Causes to mark a relationship `separate-deployable` even in a small system (record the cause in `rationale`):

- one side wraps an **external system** with different uptime, latency or failure profile (payments, courier);
- strategize `sourcing` is `buy` / `outsource` for one side — the context is an adapter around a product;
- the Independent Service Heuristics verdict is `candidate` **and** the context has a different actor,
  scaling profile or runtime location (a warehouse on-site service, a device);
- `manifest.scale_target.teams` > 1 and the two contexts will clearly belong to different teams;
- strategize `future_direction` says the context will be replaced or moved out;
- `understand.existing_systems[].will == "integrate"` for a legacy system behind the relationship.

Prefer the conservative option when unsure (modes.md §3): `same-deployable`. It is cheaper to split a
well-bounded module later than to run two services that should have been one.

## Step 2 — Mechanism by pattern and distance

| Pattern (decompose) | Same deployable | Separate deployables | Contract type on messages | Translation |
|---|---|---|---|---|
| **partnership** | `in-process-call` both ways; flag bidirectional dependency (CC) | `async-events` both ways; consider merging the contexts (CC) | `partnership` | none — both sides evolve together |
| **shared-kernel** | `in-process-call` (shared module); note change coupling | `async-events` + a shared contract library; never a shared table | `shared-kernel` | none |
| **customer-supplier** | `in-process-call`: in-memory event from the supplier; direct call only when the customer needs an answer now | `async-events` (supplier publishes what the customer asked for); `sync-api` only when the answer is needed to continue | `customer-supplier` | none or stateless adapter |
| **conformist** | `in-process-call` using the upstream model as-is | `sync-api` or `async-events` consuming the upstream contract unchanged | `conformist` | none (by definition) |
| **anticorruption-layer** | `in-process-call` behind an adapter in the downstream module | `async-events` into a stateful translation (own read model) or `sync-api` behind a stateless adapter | `anticorruption-layer` | stateless (proxy) or stateful (own storage) — say which |
| **open-host-service** | `in-process-call` through the upstream's public facade | `sync-api` — a published, versioned API | `open-host-service` | none — upstream translates for everyone |
| **published-language** | `in-process-call` (in-memory events of a versioned type) | `async-events` via outbox, at-least-once, idempotent consumers | `published-language` | none — the language is the contract |
| **separate-ways** | `batch` with rationale "no runtime integration" (enum has no `none`; add `"integration": "none"`) | same | — | — |
| **big-ball-of-mud** | `in-process-call` behind an anticorruption layer; CC severity high | `sync-api` or `batch` behind an ACL; CC severity high | `anticorruption-layer` | stateful ACL almost always |

Read `in-process-call` as "same deployable, no network" — it covers both direct calls and in-memory
domain events; the step-level `kind`/`sync` says which. Read `async-events` as "events over a broker,
published through an outbox".

## Step 3 — Per message: kind → sync → via → delivery → contract → idempotency → payload

| Situation | `kind` | `sync` | `via` (same / separate) | `delivery` |
|---|---|---|---|---|
| actor tells a context to do something (UI, CLI, API) | command | true | `http` (or `in-process` for a CLI/job) | `sync` |
| context needs another context to do something **and** needs the result to continue | command | true | `in-process` / `http` or `grpc` | `sync` |
| context needs another context to do something eventually | command | false | `in-process` (job) / `message-bus` | `at-least-once` |
| something happened; others may react | event | false | `in-process` / `message-bus` | `at-most-once` (in-memory), `at-least-once` (outbox or broker) |
| context needs facts owned by another context, now | query | true | `in-process` / `http` or `grpc` | `sync` |
| context needs facts owned by another context, stale is fine | event (replicated read model) | false | `in-process` / `message-bus` | `at-least-once` |
| answer to a query or command | response | same as the request | same as the request | — (not catalogued separately; note `response_payload` on the query) |
| call into an external system | command / query | true | `http` (`other` for SDKs) | `sync` |
| external system calls back (webhook) | event | false | `http` | `at-least-once` — verify signature, de-duplicate on their event id |
| periodic bulk transfer | event or command | false | `file` / `batch` mechanism | `at-least-once` |
| the same message travels two ways (per-item API call **and** a nightly batch file) | command / event | per step | primary `via` on the steps; the other channel in `messages[].channels[]` | primary in `delivery`; the other channel's in `channels[]` |

Delivery semantics, honestly:

- `sync` — the caller gets the answer or an error in the same call. Only for `sync: true` steps.
- `at-most-once` — fire-and-forget; a crash or a full queue loses it. Correct label for in-memory domain
  events without an outbox, and for notifications where loss is acceptable (metrics, "nice to have" emails).
- `at-least-once` — outbox + broker or outbox/inbox tables; duplicates will happen, so every consumer
  needs an `idempotency` note (de-dup on event id / natural key, or an idempotent operation).
- `exactly-once` — only if you are claiming at-least-once delivery *plus* idempotent consumers as a system
  property. Prefer writing `at-least-once` and the idempotency note; the lint reminds you.

Contract type vocabulary for `messages[].contract`: the relationship pattern name for context-to-context
messages (`published-language`, `customer-supplier`, `open-host-service`, `conformist`,
`anticorruption-layer`, `shared-kernel`, `partnership`), `external-api` for calls to and webhooks from
external systems, `ui` for actor → context commands and queries.

Payload rules: identifiers first; then only the facts the named consumers need to act without calling
back; point-in-time values that must not drift (amount, currency, address at the time); never another
context's whole aggregate; never internal ids of a third context. Add `version` for
`published-language` / `open-host-service` contracts. Queries record what they return in `response_payload`.

## Step 4 — Queries and read models

Keep queries separate from commands (a command may return an id or a status, not a report). Decide
between a **synchronous query** and a **replicated read model**:

| Choose a sync query when | Choose a replicated read model (events) when |
|---|---|
| the answer must be current (availability before reserving, price at checkout with a strict rule) | staleness of seconds–minutes is acceptable (catalogue names on an order list) |
| same deployable, or low volume across the network | high volume, or the upstream must not be on the request path |
| the data is small and rarely reused | the downstream needs the data in many places or must survive upstream downtime |

A replicated read model is an `async-events` decision plus a catalogue entry for the event that feeds it
(often an existing upstream event with a slightly fatter payload — say so in `rationale`).

## Step 5 — External systems

- Exactly one context owns each external system (the one whose events name it as `actor` in discover is the
  usual owner). Other contexts never call it directly; they talk to the owning context.
- Outbound calls are `command`/`query`, `sync: true`, `via: http`, `delivery: sync`, `contract: external-api`.
  Do not call an external system inside a database transaction; call it, then record the outcome.
- Inbound callbacks are `event`, `sync: false`, `via: http`, `at-least-once`, with an idempotency note.
- Wrap it: the owning context translates the provider's model into its own (stateless ACL), so a provider
  swap changes one adapter.

## Good vs bad

**A synchronous chain (bad)** — the customer waits on three nested calls; if fulfilment is down nobody can
order; every hop is a place to time out:

```
customer ->> ordering: place-order (command via http)
ordering ->> billing: charge-order (command via http)
billing ->> fulfilment: reserve-slot (command via http)
fulfilment -->> billing: reserve-slot (response)
billing -->> ordering: charge-order (response)
ordering -->> customer: place-order (response)
```

**Event-driven (good)** — one sync hop for what the customer must know now; the rest reacts:

```
customer ->> ordering: place-order (command via http)
ordering -->> customer: place-order (response: orderId, status=placed)
ordering -) billing: order-placed (event via message-bus)
billing -) fulfilment: order-paid (event via message-bus)
```

**Payload with everything (bad)** — `order-placed` carrying `customer.name, customer.email,
customer.marketingPrefs, lines[].recipe.ingredients[]…` forces every consumer to depend on Ordering's whole
model and leaks Marketing's data through Ordering.

**Minimal published language (good)** — `order-placed: [orderId, customerId, lines[recipeId, qty],
total{amount, currency}, placedAt]`; Billing has what it needs to charge, Fulfilment has what it needs to
pick, nobody learns the customer's marketing preferences. Version it: `version: "1"`.

## What the 2024–2026 practitioner writing changes

- In a monolith, do not reach for eventual consistency by reflex: one command = one ACID transaction across
  modules is simpler, *"avoid eventual consistency unless it solves a problem"* (Richardson 2023).
- When you do use events across co-located modules and they must not be lost, in-memory dispatch alone is
  not enough — outbox/inbox tables even inside one process (Grzybek).
- "No shared tables" is applied proportionally: a one-off cross-schema query in a tiny system is tolerable
  and temporary; once the system is big enough that uncoordinated schema changes break others, it is
  mandatory (Comartin 2026). Record the exception as a coupling concern with an expiry.
- Thin events by default; fat only for point-in-time state, low shared context, or small co-located pairs
  (Thoughtworks 2024, Fowler).
- Exactly-once is an application-level outcome: at-least-once + idempotent consumers (Richardson).
- Preserve ordering by aggregate id; parallel relays break it (Jovanović 2024, Debezium).
- Contracts evolve additively; version identifiers bump only on breaking changes; verify with consumer-driven
  message contract tests against an AsyncAPI definition owned by the upstream (Confluent, CloudEvents, Pact 2026).

Sources with URLs and access dates: `message-flow-method.md` §Sources.
