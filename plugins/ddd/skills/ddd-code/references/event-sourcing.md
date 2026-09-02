# Event-sourced contexts — streams, projections, and what to add to the design

Only for contexts whose `strategize.json` pattern is `event-sourced-domain-model`. Everything in
`aggregate-design.md` still applies; this file adds what the design must say extra. At depth
`light` write §1–§3 briefly; at `standard`/`deep` write all sections in `design.md`.

## 1. Streams

- One stream per aggregate instance: `<aggregate>-<id>` (e.g. `subscription-7f3a`). The stream *is*
  the aggregate's state; `Repository.get(id)` = load events → fold; `save` = append with expected
  version (optimistic concurrency).
- Events in the stream are the aggregate's **domain events** (discover ids, past tense, one fact
  each). They are internal to the context; what other contexts see is the integration event with
  the `connect.json` payload, translated in the publisher adapter.
- Design the fold explicitly: for each event, which state fields change. The canvas's *state
  transitions* section is this table.

## 2. Command handling = decide, not mutate

`decide(state, command) → events | rejection`, then `evolve(state, event) → state`. Tests are
"Given [events] When command Then [events]" — no database, no mocks. Every invariant is a *Given/When/
Then* where Then is a rejection.

## 3. Projections (read models)

- Each read model in `code.json` `read_models[]` is a projector subscribed to named `source_events`.
  It is idempotent (checkpoint per projection, dedupe by event position) and **rebuildable from
  zero** — say where the checkpoint lives and how a rebuild is triggered.
- Cross-context read models subscribe to integration events, not to the other context's stream.

## 4. Size, snapshots, lifetimes (canvas §7–8)

- Use the Aggregate Design Canvas *size* estimate: events per instance × lifetime. Streams beyond
  a few hundred events slow command handling → snapshot every N events (snapshot = serialized
  fold + version; rebuildable, never authoritative).
- Prefer time-scoped aggregates (`BillingPeriod`, `Week`) over immortal ones; an unbounded stream
  is a design smell, not a storage problem.

## 5. Evolving events

- Events are immutable facts: never edit or delete. Add fields with defaults; rename by adding a
  new event type + an **upcaster** that maps old → new at load time. Record the version in the
  event type name or metadata from day one.
- Keep a `docs/events/<context>.md` (or the design.md "Domain events" table) as the catalogue:
  name, version, fields, producer, consumers.

## 6. Tests (Khononov's diamond)

- Few: end-to-end through HTTP.
- Many: aggregate decision tests (Given/When/Then), projection tests (given events → view),
  upcaster tests (old payload → new event), replay test (rebuild a projection from a recorded
  stream and compare).
- Some: event-store adapter tests (append with expected version conflicts, read by position).

## 7. When *not* to event-source

If nobody will ask "what happened in the past" and the model is stable, `domain-model` with an
outbox gives 80 % of the benefit at 30 % of the cost. Say so in `design.md` and raise an open
question to revisit the strategize decision rather than silently changing the pattern (the
validator warns when `code.json` disagrees with `strategize.json`).

Sources (accessed 2026-08-29): Khononov, *Learning DDD* ch. 7 and 10 —
https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/ ; ddd-crew Aggregate
Design Canvas (throughput/size) — https://github.com/ddd-crew/aggregate-design-canvas ; Event
Modeling — https://eventmodeling.org/ .
