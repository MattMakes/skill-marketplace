# Deployable-split decisions for `ddd-organise`

How to decide which bounded contexts become which deployable units, and how to justify it. The
default is one modular monolith; every departure from it needs a reason from §2 that the inputs
evidence, and must not be blocked by §4. Sources in §10; quotes are verbatim.

## 1. The default: one modular monolith, one module per context

- Fowler, *MonolithFirst*: successful microservice systems almost always grew out of a monolith,
  while greenfield microservice projects *"frequently encountered serious problems"*. Two reasons:
  YAGNI — *"It may be hard to scale a poorly designed but successful software system, but that's
  still a better place to be than its inverse."* — and boundaries: *"even experienced architects
  working in familiar domains have great difficulty getting boundaries right at the beginning"*,
  and moving a service boundary is far harder than moving a module boundary.
- Fowler, *MicroservicePremium*: *"don't even consider microservices unless you have a system
  that's too complex to manage as a monolith."* The premium is *"automated deployment,
  monitoring, dealing with failure, eventual consistency, and other factors that a distributed
  system introduces."* *"The majority of software systems should be built as a single monolithic
  application."*
- Grzybek, *Modular Monolith: A Primer*: a monolith is *"a system that has exactly one deployment
  unit"*; a modular monolith is *"a Monolith system designed in a modular way"*. A module is
  independent and interchangeable (*"minimum dependencies"*), provides a full set of features
  (a vertical slice, so a change *"affect[s] only one module"*), and has a contract: *"We can't
  talk about modular architecture if our modules don't have a Contract."*
- Newman, *Monolith to Microservices*: the modular monolith — *"a single process consisting of
  separate modules, each of which can be worked on independently, but which still need to be
  combined for deployment"* — gives parallel working and *"much simpler deployment concerns"*;
  teams can own modules. His top reasons to split are independent deployability, data
  partitioning and organisational autonomy — none of which a small team lacks in a monolith.
- 2025–26 practice (ZeonEdge, Nov 2025; Enqcode, Dec 2025/Jan 2026): start with a modular
  monolith; extract a module *"based on actual requirements, not speculation about future
  needs"*; microservices when *"you have many autonomous teams"*, *"domains are stable and
  well-understood"*, *"independent scaling is a hard requirement"* or *"organizational
  boundaries demand isolation"*. Team-size thresholds differ by author (ZeonEdge: monolith under
  ~20 engineers, microservices from ~50) — treat them as rough, not as rules.

What a module is in this chain: one module per bounded context; its public contract is the
commands/queries it accepts and the events it publishes (`connect.json` `messages`); modules talk
through that contract only — in-process calls for queries, in-process domain events for
notifications (an outbox when they must survive a crash); each module owns its schema (§5). A
bought context (`sourcing: buy`) is an adapter module wrapping the vendor, not a deployable.

## 2. Reasons that justify a separate deployable

A split needs one row from this table **and** evidence in the named input. "ISH said candidate"
is not a row (see primer §8). Write the reason into `deployables[].rationale` in the domain's words.

| # | Reason | Evidence you need (where) | Action | Rationale should say |
|---|---|---|---|---|
| 1 | **Independent scaling** — load or compute differs by an order of magnitude, or is spiky/heavy (search, media, batch compute) | `understand.json` goals/metrics, `scale_target.users`/`notes`, technical constraints; the user's statement | split as `service`/`function`/`job` | "X sees N× the traffic / runs heavy Y; scaling the whole monolith for it wastes …" |
| 2 | **Different runtime, uptime or SLO** — must run on other hardware or location (on-prem, warehouse, edge, device), offline-capable, real-time, different availability target | `understand.json` constraints (`technical`/`other`), `existing_systems`, actors of kind `system`; the user's statement | split as `service` | "runs on-site at …; must keep working when …" |
| 3 | **Regulatory / security isolation** — PCI, PHI, data residency, audit boundary | `understand.json` constraints `kind: regulatory` | split only if the rule demands process/network separation; otherwise a module with its own schema and access control | "PCI scope limited to …" |
| 4 | **Team autonomy / release cadence** — another team owns it and needs its own release train and on-call | `manifest.scale_target.teams ≥ 2` plus the team assignment made in this step | split along team lines (Conway) — or keep one monolith with module ownership when the teams can share a release train | "owned by team Y; its releases must not wait for team Z" |
| 5 | **Different technology stack** — ML in Python, a legacy system being strangled, a vendor SDK, a language mismatch | `strategize.json` sourcing `open-source`/`outsource`; `understand.json` `existing_systems` (`integrate`/`replace`); the user's statement | split as `service` | "model serving in Python; the core is TypeScript" |
| 6 | **Very different rate of change** — volatile core next to a frozen utility | `strategize.json` `evolution` (genesis vs commodity); decompose `heuristics_applied` rate-of-change | rarely a reason alone: modules already isolate change; combine with #4 | — |
| 7 | **Bought / SaaS / generic** | `strategize.json` `sourcing: buy` | **never** its own deployable — an adapter module inside the deployable that uses it; the vendor is the external system | — |
| 8 | **Scheduled / batch work** | `discover.json` timer policies; `connect.json` steps `via: file`/`batch` | a `job` deployable only if it needs a different runtime, schedule or scale; otherwise an in-process scheduler | "nightly settlement needs 4 h of CPU the API must not share" |
| 9 | **Frontend** (SPA, mobile app) | `understand.json` channels/actors; repo evidence | a `frontend` deployable only for a client with its own release lifecycle (app-store build, separately hosted bundle); it carries no bounded context (`contexts: []`) — the context it renders is listed once, in its server-side deployable; a server-rendered UI stays inside the monolith. If the client runs a context's model offline (a mobile app that is the context's field runtime), add `hosts_runtime_of: ["<ctx>"]` on the frontend and name the pairing in both rationales; the server half is still the deployable that owns the context | "the technician app ships through the app store on its own cadence and runs `job-execution` offline; `field-api` owns the context and syncs it" |
| 10 | **Gateway / BFF** | many external consumers of a published language / open-host service | only in `many-services` topologies | — |

In **auto mode** a split needs the evidence to be *in the inputs*, not plausible. An upstream
`notes_for_downstream` entry of kind `decision` addressed to organise (contract §3) *is* in the
inputs: confirm it unless another input contradicts it, and record the confirmation as an
assumption citing the note id. A bare `via: message-bus`/`http` edge in connect is a hint, not
evidence. If a row would apply given a fact you cannot confirm (e.g. "fulfilment probably runs in
the warehouse"), keep the monolith, name the context as the first extraction candidate, and log an open question.

## 3. Non-reasons — reject these rationales

- "Microservices are best practice / industry standard." Newman: *"Simply following the trend
  without a solid purpose is unwise."*
- "The ISH check said `candidate`." Eligibility, not a driver.
- "It is a separate bounded context / subdomain." That is why it is a *module*, not a *process*.
- "We might need to scale it someday." YAGNI — record the trigger in the evolution plan instead.
- "For reuse." Newman: reuse should not drive the decision.
- "The diagram looks cleaner" / "each context should be a service" / "we want to learn Kubernetes".
- A number without a source ("ten services feels right for a system this size").

## 4. Split-blockers — each argues against a proposed split, or demands a fix first

| Blocker | Evidence | What to do |
|---|---|---|
| **Synchronous chain across the boundary** — consecutive `sync: true` cross-context steps in one flow | `connect.json` flows (`ddd organise brief` lists "Sync chains" and "SYNC" edges) | keep the contexts together, or first redesign the edge (async event, or a query against a locally replicated read model). A sync chain over 3+ services is a distributed monolith. |
| **Partnership / shared-kernel relationship** | `decompose.json` relationships | co-change → same deployable, ideally same team |
| **Shared database** | `connect.json` `integration_patterns[].mechanism: shared-db`; `data_store: shared` | one deployable until the data is split; a shared store couples releases and schemas |
| **Small team, many units** | team `size ≤ 3` running `> 2` deployables | each unit costs a pipeline, monitoring, on-call, versioned contracts — why not fewer? |
| **No CI/CD, observability or platform** | `manifest.scale_target.notes`, repo evidence | Fowler's premium applies in full; without automation a split costs more than it returns |
| **Boundaries still uncertain** | decompose open questions/hotspots, ISH `unsure` | stay in one process — moving a module boundary is cheap, moving a service boundary is not |
| **Customer-installed / on-prem product** | `understand.json` constraints | Newman: microservices shift *"significant complexity to the operational domain"* — the customer's operations |

## 5. Data ownership

- Every deployable owns its data (`data_store: own`). No other deployable reads or writes it
  except through the owner's contract (API, events).
- Inside a modular monolith the same rule holds per module: one schema (or table prefix) per
  context; Grzybek: *"Each module has its own data set. It can be the same database broken down
  by schemas or each module can have even a separate database"* and *"it is important to keep the
  data really in isolation. It means no constrains between tables from separate modules and no
  transactions between them."* Cross-module needs become queries through the contract or events
  with a local copy (that is what `coupling_concerns` like "fulfilment needs recipe details" become).
- Integration events carry *"only as much as needed"*; they are part of the contract.
- `data_store: shared` is a smell that must say which store, shared with whom, and why (a legacy
  database being strangled is the usual honest answer). `none` is for stateless units only
  (gateways, pure functions, a static bundle that keeps no local state); an offline-first client
  that holds the source of truth until synced is `own` (contract §4.6) — say so in its rationale.
- Record ownership in `team-topology.md` (§ "Data-store ownership"): context → store/schema →
  owning deployable → how others get at it.

## 6. What counts as a deployable, and `topology_style`

- A deployable is anything with its own build-and-deploy lifecycle: `modular-monolith`,
  `service`, `function`, `job`, `frontend`, `gateway`. A `library` is listed only if it is
  released and versioned on its own (rare; prefer not to list it).
- List only units the inputs evidence. In auto mode never invent a frontend, job or gateway to
  make the count look right — fold it in and log an assumption.
- `topology_style` follows the number of deployables that carry ≥1 bounded context:
  1 → `modular-monolith`; 2–5 → `few-services`; 6+ → `many-services`. Context-less auxiliaries
  (a separately released client, even one with `hosts_runtime_of`) do not change the style but do
  count in `deployable_count`.
- `deployable_count` is exactly `len(deployables)`, and is what `scale_check` compares.

## 7. The scale check — "why not fewer / why not more"

`scale_check.target_min/max` mirror `manifest.scale_target`; `within_target` is arithmetic; `note`
carries the one-line argument, the Markdown carries the full one. Always write both halves:

- **Why not fewer**: for each unit beyond the first, the §2 row that justifies it. With one unit:
  "one team, in-process integration everywhere, no scaling/runtime/regulatory driver in the inputs".
- **Why not more**: name the contexts that *could* be extracted (ISH candidates with async-only
  inbound traffic) and the §2 driver that is missing, or the §4 blocker that stops it.
- **Below the target** (e.g. target 2–4, you propose 1): allowed. Say that the monolith meets the
  goals, name the first extraction and its trigger, and ask whether the target reflected a plan
  (e.g. a second team) that should change the answer.
- **Above the target**: allowed only if every extra unit has a §2 row with evidence; otherwise fold
  units back until it fits and say which ones you folded.

## 8. Evolution plan (`deep` depth) — what splits first and what triggers it

- Pick the first extraction the way Newman advises: something *both* easy to extract *and*
  valuable to change often — not the module that never changes (*"Invoicing might seem like an
  easy initial step"*, but if it rarely changes it pays nothing). Fowler: peel services off the
  edges gradually while the core stays stable.
- The best first candidate has: ISH `candidate`; async-only inbound traffic; its own schema
  already; a §2 driver that is expected but not yet present.
- Triggers must be observable, not moods: "a second team forms and takes fulfilment", "the
  warehouse gets its own network and must work offline", "p95 latency of X exceeds Y at Z load",
  "the regulator requires PCI scope separation". Pair each with the reteaming pattern it implies.
- Prerequisites to write down: outbox for the events that cross the future boundary; contract
  tests on the module's public API; no cross-schema joins or transactions; a separate pipeline.

## 9. Good vs bad — worked examples

**A split justified by runtime, not by fashion**

> Good: `warehouse-service` — "Fulfilment runs on the warehouse's own hardware and must keep
> packing when the office link is down (understand C3, technical). Inbound is `week-charged` only,
> async, so the split adds no sync hop." (§2 row 2; no §4 blocker.)
>
> Bad: `fulfilment-service` — "Microservices are best practice and fulfilment is its own bounded
> context." (§3: non-reasons; the context boundary already gave it a module.)

**A team owning half a context**

> Bad: team A owns the `ordering` commands, team B owns the `ordering` read models "because B does
> the reporting". Two teams now change one model and one schema; every release is a negotiation.
>
> Good: team A owns `ordering` whole; team B owns a `reporting` context that consumes
> `order-placed` (x-as-a-service). If no such context exists, that is a finding for `decompose`,
> not a reason to split ownership.

**A bought context as a deployable**

> Bad: `billing-service` wrapping Stripe as its own process "so it can scale". Nothing to scale;
> one more pipeline, one more failure mode between the app and Stripe.
>
> Good: `billing` is an adapter module inside `app`; Stripe is the external system; `week-charged`
> is published in-process.

**Outside the target, argued**

> Good: target 1–3, four deployables — "the ML ranking service is Python (§2 row 5), the SPA is
> hosted on the CDN (row 9), the nightly settlement job needs 4 h of CPU (row 8); everything else
> is the monolith. Why not fewer: folding the ranker means a Python runtime in the Node monolith.
> Why not more: `catalog` is an ISH candidate but has sync inbound queries from `ordering`."
>
> Bad: "four contexts, so four services" — the count came from the context map, not from a reason.

## 10. Sources (all accessed 2026-08-29)

- Martin Fowler — MonolithFirst (2015): https://martinfowler.com/bliki/MonolithFirst.html
- Martin Fowler — MicroservicePremium (2015): https://martinfowler.com/bliki/MicroservicePremium.html
- Kamil Grzybek — Modular Monolith: A Primer: https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer
- Kamil Grzybek — Modular Monolith: Integration Styles: https://www.kamilgrzybek.com/blog/posts/modular-monolith-integration-styles
- Sam Newman — *Monolith to Microservices* (O'Reilly, 2019); reading notes: https://eddmann.com/posts/notes-monolith-to-microservices-by-sam-newman/
- ZeonEdge — Microservices vs Monolith in 2026: An Honest Architecture Decision Guide (28 Nov 2025): https://zeonedge.com/blog/microservices-vs-monolith-architecture-guide
- Enqcode — Rethinking Microservices in 2026: When Modular Monolith Architecture Actually Wins (18 Dec 2025, updated 29 Jan 2026): https://enqcode.com/blog/rethinking-microservices-in-2026-when-modular-monolith-architecture-actually-win
- Independent Service Heuristics: https://github.com/TeamTopologies/Independent-Service-Heuristics
- Thoughtworks Technology Radar — Inverse Conway Maneuver: https://www.thoughtworks.com/radar/techniques/inverse-conway-maneuver
