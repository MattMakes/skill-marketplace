# Contract entry guide — field by field for `ddd-contracts`

One entry per message that crosses a party boundary. The test for every field: could a stranger
(or a coding agent) build a producer or a consumer from this entry, its schema and its example,
*without opening any other file*? The entry is an index over facts the chain already established —
connect knows the route, define knows the rules, organise knows the owners. Your judgement goes
into the shape and the promises: field types/required-ness — including every nested sub-shape, every
enum, every unit and a query's whole response — example values, `description`, `semantics`,
`termsOfUse`, and the one `pattern` connect cannot decide for you. Everything else is assembled,
not invented.

The worked example (from the mealkit fixture) that every section below refers to:

```json
{ "id": "week-charged", "kind": "event", "name": "Week Charged",
  "description": "Billing has collected the week's payment; the box may be packed.",
  "entityStatus": "Draft", "version": "1.0",
  "domain": "billing", "owners": ["solo"], "consumers": ["fulfilment"], "reviewers": ["solo"],
  "pattern": "published-language", "delivery": "at-least-once", "via": "message-bus",
  "schema": "ddd/09-contracts/schemas/week-charged.schema.json",
  "example": "ddd/09-contracts/examples/week-charged.json",
  "semantics": ["Emitted at most once per (subscriptionId, week); consumers must de-duplicate on that pair"],
  "termsOfUse": "Additive changes only within version 1.x; a removed or retyped field is 2.0.",
  "glossary": "ddd/glossary.md#billing-context",
  "provenance": { "connect": "week-charged", "relationship": "R2", "flows": ["F1"] } }
```

## The fields

**`id`** — the connect message id, verbatim. Never renamed on a re-run; downstream tests
(`contract: week-charged` in `code.json`) hang off it.

**`kind`** — `event` (something happened; consumers react), `command` (someone is asked to act;
the receiver may refuse), `query` (a question; the schema describes the *response* payload, the
parameters go in the description — see "Queries" below). `response` is not a kind here: a response
is never its own entry, it belongs to its request.

**`name` / `description`** — the discover name, and a description that earns its place: what
happened *and what it licenses downstream*. "Payment taken" (the discover seed) tells a consumer
nothing to act on; "Billing has collected the week's payment; **the box may be packed**" tells
fulfilment exactly why it subscribes. Business language; no transport, no class names.

**`entityStatus`** — the OpenMetadata lifecycle: `Draft` | `In Review` | `Approved` | `Archived` |
`Deprecated` | `Rejected` | `Unprocessed`. Auto mode always leaves `Draft` — approval is a human
act. `Deprecated` marks an entry whose message left connect (keep the schema file; consumers are
still migrating). `Unprocessed`/`Rejected`/`Archived` exist for catalogue round-trips; you will
rarely write them.

**`version`** — MAJOR.MINOR, starting `1.0`. See "Versioning" below.

**`domain`** — the producing bounded context; for inherited entries, the context on *our* side of
the ACL. Never an external system, never a team.

**`owners` / `reviewers` / `consumers`** — owners = the organise team owning the *handling* context
(the producer, or — when a human actor or an external system produces the message — the context that
receives it; inherited: the external system, see below). An actor id is never an owner: a person
cannot own a contract and organise has no team for them. Reviewers = the teams owning the contexts involved
(they must sign off a change); consumers = the party ids from connect. If a consumer here drifts
from connect's list, `check` warns: align it, or diverge deliberately and say why in an assumption.

**`pattern` / `delivery` / `via`** — copied facts (context-mapping pattern, delivery guarantee,
transport), mapped on ingest (see "Pattern mapping"). They are in the entry because they change what
a consumer must build: `published-language` + `at-least-once` + `message-bus` means "idempotent
subscriber"; `customer-supplier` + `sync` + `http` means "caller that handles refusal and timeout".
`via` is the **primary** transport (the flow steps'); when connect lists `messages[].channels[]` —
one message that travels two ways, a per-item API call *and* a nightly SFTP manifest — the others go
in the entry's `channels[]` as whole `{via, sync, delivery, note}` objects, never as bare names. A
second transport is a second promise: the nightly manifest is not at-least-once because the API is,
and the `note` is usually the only thing that says what the second channel actually is. So
`contracts.md` renders "sync via http, also via file (at-most-once, async): the depot picks the
manifest up overnight" — enough to build the second consumer from. A `sync` message never keeps
`file` as its primary channel: `sync via file` is a contradiction, not a contract.

**`schema` / `example`** — project-root-relative paths into `ddd/09-contracts/`. One example per
schema; it must validate. Make the example production-plausible — a reviewer spots a wrong model
faster in `"week": "2026-W36"` than in a type declaration, and it becomes the first test fixture.

**`semantics`** — see below. The single highest-value field.

**`termsOfUse`** — the change promise. See "Versioning".

**`glossary`** — an anchor into `ddd/glossary.md` (the producer context's section), so field names
resolve to defined terms instead of re-defining them here.

**`provenance`** — bookkeeping: the connect message id, the decompose relationship (or `null` for
an external edge), the flows the message appears in. Refreshed by every prefill; lineage lives
here plus in `owners`/`consumers`, not in a separate artifact.

**`inherited`** — only on external-system contracts. Absent otherwise (not `false`).

**Additive keys** (optional; `render` uses them, `check` validates them, the artifact schema allows
them): `client` — the human actor at the far end (see "A human on one end"); `direction` —
`outbound` (a call we make into their contract) or `inbound` (their message arriving at ours), on
inherited entries only; `channels` — the other transports the message also travels on, one
`{via, sync?, delivery?, note?}` object each, carried over whole from connect (never flattened to a
name: what the second transport guarantees is the whole reason it is recorded).

## Pattern mapping: what connect's `contract` becomes

`connect.messages[].contract` (contract §4.5) is not always a context-map pattern; `pattern` in an
entry always is. The mapping is mechanical — do not hand-pick a different one without saying why:

| connect `contract` / define canvas `relationship` | entry `pattern` | why |
|---|---|---|
| one of the eight context-map patterns | itself | both ends are bounded contexts (contract §4.3) |
| `ui` (connect) · `user-interaction` (define §4.7) | `open-host-service` | one end is a human actor: the context publishes an interface its clients are built against |
| `external-api` | the pattern that **wraps** that system: define's canvas `relationship` for that collaborator, else a decompose relationship between the two, else `conformist` | connect records only *that* it is an external API; who wraps it and how is a fact define/decompose already carry |
| `big-ball-of-mud` | decide per message (`TODO` until you do) | not something you can publish a contract for: say what *this* message is — usually `conformist`, or `anticorruption-layer` once someone wraps it |
| absent | the decompose relationship's pattern, else `TODO` | |

`inherited` does **not** follow the pattern string — it follows the **party kind**: an external
system on either end owns the wire contract, so the entry is inherited. One exception: a message
*we* produce under `published-language` or `open-host-service` towards an external party is ours
(they conform), so it is not inherited and it is not an outbound call — we publish it.

## A human on one end: the client contract

A message with a human actor on one end — a technician's app posting `complete-job`, a stock request
a depot administrator reads — **is** a contract. It is the UI/API contract that client is built
against, and its payload matters exactly as much as a context-to-context event; leaving it out means
the one contract a front-end developer needs is the one the catalogue lacks. Only an edge with a
human at *both* ends is out of scope (no system party is bound by it).

Such an entry: `pattern: open-host-service`; `owners` = the team owning the **handling context**
(never the actor id); `client: "<actor id>"` naming the human party (`check` resolves it against
discover's actors), so "who is this API for" is answerable without opening connect; `domain` = the
handling context. Everything else is unchanged — tight payload, testable semantics, plausible
example. One thing usually *is* stricter: a released mobile or browser client cannot be forced to
upgrade, so its `termsOfUse` should promise a deprecation window covering the oldest supported build.

## Queries: the response is yours to design

`messages[].payload` on a query is the **request parameters**; connect carries the answer's shape
only if someone filled `response_payload[]`. So for `kind: query` the main schema describes the
**response** — seeded from `response_payload[]` when it exists — and the parameters get their own
file, `schemas/<id>.request.schema.json`, with `examples/<id>.request.json` beside it. A command
that replies with something gets the mirror pair, `<id>.response.schema.json` + `.response.json`.

Two files rather than one section inside the main schema, because the team on the other end runs
these through their own validator: a standalone file needs no knowledge of our conventions, and
`check` validates it exactly like the main pair. What you must *not* do is park the other half under
a top-level `response` or `parameters` key. Neither is a JSON Schema keyword, so every validator
ignores it — the file looks like a specification, the gate reports that all examples validate, and
half of the contract was never checked by anything. `check` now treats a non-keyword at a schema
position as an error for exactly this reason.

Designing that response is expected work, not a gap to report upstream: name exactly the fields the
caller needs in order to act. Semantics then say whether the answer is authoritative or advisory,
how stale it may be, and whether the call is safe to retry.

## What you must invent — and log

Upstream gives you field *names*; shapes are yours. Expect to design, per contract:

- **nested sub-shapes** — `slaWindow{from, to}`, `completionEvidence{photoUris, meterReadings,
  partsUsed, signatureUri}`: connect writes one payload name with a hint in braces. The leading
  identifier is the property name (prefill keeps the hint in the field description); object vs array,
  which parts are required, what each part means — judgement. Log an assumption when the hint was
  ambiguous.
- **money** — no upstream step records a currency. Money is always two decisions: an ISO-4217
  currency (its own field, or one currency stated in the field description) and **integer minor
  units**, never a float. Record both in `assumptions[]` with a confidence, and never invent a
  `currency` field connect did not list — say the currency in the `amount` description and raise the
  missing field with `ddd-connect`. When the business plainly has more than one currency and nothing
  upstream says which applies here, stop guessing: `open_questions[]` with `blocking: true`, because
  a wrong currency corrupts money.
- **enums** — a closed `enum` promises no ninth value will ever appear. Close it only when a canvas
  decision, a glossary term or a discover policy actually lists the values, and cite that source in
  the field description; otherwise keep the field a plain `string`, say which values are known today,
  and log the open question. Widening a closed enum a consumer switches on is a 2.0.
- **types, formats and required-ness** for every field — that is the work, not a shortcut.

## Semantics: a rule, not a restatement

A semantics line is a producer guarantee a consumer can rely on **and test**. Source them from the
producer canvas's `business_decisions` and from the delivery guarantee — never from thin air.

- Bad — restates the field list: "Contains the subscription id, the week and the recipe ids."
  (The schema already says this; a consumer learns nothing.)
- Bad — someone else's rule: "Fulfilment packs the box within 12 hours." (That is the consumer's
  SLO, not a property of this message.)
- Good — uniqueness + idempotency: "Emitted at most once per (subscriptionId, week); consumers
  must de-duplicate on that pair." (Traceable to billing's decision "a week is charged exactly
  once … retries are idempotent on subscriptionId+week", combined with at-least-once delivery.)
- Good — finality: "recipeIds is the final choice — after the weekly cutoff default meals may
  already have been assigned; no revision event follows within the same week."
- Good — a non-guarantee (deep depth): "No ordering guarantee across subscriptions; order within
  one (subscriptionId, week) is irrelevant because the pair is unique."

Rule of thumb per delivery: `at-least-once` ⇒ name the de-duplication key; `sync` command ⇒ say
what a retry means (same idempotency key, no double effect); `at-most-once` ⇒ say what is lost on
a drop and which policy repairs it. If you cannot write one honest semantics line, the message is
probably an implementation detail leaking across a boundary — open question for `ddd-connect`.

## Payload design: tight vs kitchen-sink

- Kitchen-sink (bad): `week-charged` carrying the customer profile, delivery address, full recipe
  details, card fingerprint and invoice lines "in case someone needs it". Every extra field is a
  coupling: it drags subscriptions' language across billing's boundary, it must be sourced on every
  emit, and removing it later is a 2.0 for every consumer. It also quietly turns an event into a
  replicated database.
- Tight (good): exactly what lets each consumer act — `subscriptionId`, `week` — and nothing
  whose need is unproven. When a consumer's need *is* proven but unmet (fulfilment must pack
  recipes it cannot see — a connect `coupling_concern`), do not resolve it here: keep connect's
  payload and raise an open question owned by `ddd-connect` ("carry recipeIds, or give fulfilment a
  projection fed by meals-chosen?"). Payload membership is an integration decision; this step
  contracts it, it does not redesign it.

Field conventions worth enforcing: money = ISO-4217 currency + integer minor units (never a
float); identifiers = the aggregate's id (string), not an embedded object; times = `date-time`
UTC; a domain-specific shape gets its unit spelled out in the field description ("ISO-8601 week,
e.g. 2026-W36").

## Encode the rule, then prove it rejects

Schemas are declared JSON Schema 2020-12 (`$schema`), and `ddd contracts check` evaluates the
keywords a payload rule actually needs — including the applicators, so a conditional rule is
enforceable rather than decorative:

| Keyword | Notes |
|---|---|
| `type`, `required`, `properties`, `items`, `prefixItems`, `enum` | the shape |
| `additionalProperties`, `patternProperties`, `propertyNames`, `min/maxProperties` | what else may appear |
| `const` | pin a value: `"currency": {"const": "GBP"}` says 1.0 bills in one currency |
| `anyOf`, `oneOf`, `allOf`, `not` | "one of these must be present", "never this combination" |
| `if` / `then` / `else`, `dependentRequired`, `dependentSchemas` | a rule that depends on another field |
| `pattern`, `min/maxLength`, `min/maximum`, `exclusiveMin/Maximum`, `multipleOf` | value constraints |
| `min/maxItems`, `uniqueItems`, `contains`, `min/maxContains` | array constraints |
| `$ref` into `$defs` | local (`#/...`) only; an external `$ref` is an error, since nothing would apply it |
| `format` | annotation only, as in 2020-12 by default — document, don't rely on it for validity |
| anything else at a schema position | **an error**: a validator ignores it, so the rule under it is unenforced |

**A rule written as prose is not a rule.** "A request with neither `query` nor `seeds` fails
validation" inside a `description` reads like a guarantee and holds nothing back; the payload it
describes sails through, the gate goes green, and the first real caller finds out. Written as
`anyOf: [{"required": ["query"]}, {"required": ["seeds"]}]` it is the guarantee. This matters most
in the file a *consuming team* will run: a description that claims enforcement it does not have is
worse than no claim at all.

**Then write the payload it must reject.** `examples/<id>.invalid.json` is a list of cases:

```json
[ { "why": "a non-GBP week: 1.0 has no FX handling, so this must fail here, not at Stripe",
    "payload": { "subscriptionId": "…", "week": "2026-W36", "amount": 3450, "currency": "USD" } } ]
```

`check` errors if any case *passes* its schema. That is the only proof the rule is encoded rather
than described, it is what stops a later edit quietly loosening the constraint, and writing it is
usually how you discover the rule never bit in the first place. A schema that uses a conditional
keyword with no negative fixture gets a warning. Companions get their own: `<id>.request.invalid.json`.

Root shape: `type: "object"`, `$id` = the entry's `schema` path, `title` = the entry `name`,
`description` mirroring the entry's, `additionalProperties: false` unless deliberately open (an
open payload is a decision — log the assumption).

## Versioning and `termsOfUse`

- Within a MAJOR (`1.x`): **additive only** — a new *optional* field bumps MINOR (`1.0 → 1.1`).
- MAJOR (`2.0`): removing, renaming or retyping a field; making an optional field required (or a
  required field optional, if consumers relied on presence); changing a field's meaning or unit;
  changing the idempotency key or any `semantics` line consumers test against.
- Consumers tolerate additions (ignore unknown fields even though the published schema is closed —
  the closed schema binds the *producer*); producers never repurpose a field.
- `termsOfUse` states the promise in one or two sentences. Default: "Additive changes only within
  version 1.x; a removed or retyped field is 2.0." Stricter partners add process: "…; a 2.0 needs
  sign-off from every consumers[] team two weeks before rollout."
- Deprecation is a status plus an envelope record (`deprecated[]`, `collection: "entries"`), never
  a silent deletion; the old schema file stays while any consumer still reads it.

## Inherited entries: the external-system case

When an external system dictates the wire contract — we *send* under `anticorruption-layer` or
`conformist` (`charge-card` → Stripe), or the external *produces* toward us (a webhook) — the
entry gets `inherited: true` and `owners: [<external system id>]`. Everything else stays ours:
`domain` = our context at the boundary, `reviewers` = our team, and the schema is **our view of
the message at the ACL** — the shape our adapter speaks (currency + minor units), not a paste of
the vendor's API reference. `termsOfUse` then says who really owns change and where it lands:
"Stripe owns the wire contract; this schema is our view at the ACL boundary. Stripe API changes
land in the PaymentGateway adapter — nothing else calls Stripe directly." The point is to make the
ACL boundary visible in the catalogue: one look at `owners` tells you which contracts your
organisation can evolve and which it can only absorb. An event we publish *to* a partner under
`published-language` is not inherited — we own it, they conform.

**Outbound calls read backwards in connect, and that is fine.** `travel-times` has
`consumers: ["google-maps-platform"]` because that is what connect says, and the entry keeps it —
but nobody at Google consumes our schema; the real consumer of the payload is the calling context.
Do not "fix" the data: add `direction: "outbound"`, and `contracts.md` files it under *Calls out to
external systems* as "called by dispatch → google-maps-platform" instead of listing it as something
dispatch publishes. The mirror case is their webhook arriving: `direction: "inbound"`, rendered
under *Receives from external systems*, schema = what we accept and must tolerate.

## Sources (accessed 2026-08-29)

- OpenMetadata, Data Contracts guide (contract structure: schema, semantics, ownership, status) —
  https://docs.open-metadata.org/latest/how-to-guides/data-governance/data-contracts
- OpenMetadata spec, `EntityStatus` type (the `entityStatus` enum: Unprocessed, Draft, In Review,
  Approved, Deprecated, Rejected, Archived) — https://github.com/open-metadata/OpenMetadata/blob/main/openmetadata-spec/src/main/resources/json/schema/type/basic.json
- JSON Schema 2020-12 specification — https://json-schema.org/specification ; Validation spec §7
  ("format" is an annotation by default) — https://json-schema.org/draft/2020-12/json-schema-validation
- Ian Robinson, "Consumer-Driven Contracts: A Service Evolution Pattern" (martinfowler.com) —
  https://martinfowler.com/articles/consumerDrivenContracts.html
- Pact, contract-testing documentation (consumer-driven contract tests per consumer) —
  https://docs.pact.io/
- ddd-crew, Context Mapping (published-language, anticorruption-layer, conformist — the `pattern`
  vocabulary) — https://github.com/ddd-crew/context-mapping
