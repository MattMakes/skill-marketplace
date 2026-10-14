# Context map patterns — cheat sheet, direction rules, decision procedure

Read this when you reach SKILL.md workflow step 4 (relationships) or when a relationship's
pattern or direction is contested. `ddd decompose check --write-map` renders the mermaid
diagram from `relationships[]`; this file is about getting the relationships right.

## 1. How to read a map

- **Upstream (U) → downstream (D)** is a flow of *influence*, not of time or of calls: U's model, API
  and release schedule affect D; D's fate does not affect U ("the upstream team may succeed
  independently of the fate of the downstream team" — Evans, DDD Reference, quoted by ddd-crew).
- **Mutually dependent**: both fail if either fails → symmetric patterns (partnership, shared kernel).
- **Free**: no organisational or technical connection → separate ways.
- Each `relationships[]` entry names exactly one pattern (schema enum). Real maps combine patterns
  (OHS + published language, customer-supplier with an ACL on the downstream side): keep the dominant
  one in `pattern` (precedence in §4) and spell the combination out in `description`.

## 2. Deriving direction from `discover.json` (deterministic)

| Evidence on the storm | Upstream | Downstream | Why |
|---|---|---|---|
| Policy `when <event owned by A> then <command owned by B>` | A | B | B reacts to A's event; the event schema is A's to change |
| A's flow needs B to perform a command synchronously (A calls B's API) | B | A | A must speak B's contract |
| Read model in B built from A's events | A | B | B consumes A's published facts |
| Reference data owned (written) by A, read by B (catalog → ordering) | A | B | writer owns the model |
| Context W wraps or adapts an external system (Stripe, a courier) | — | — | The external system is not on the map and never an endpoint. W *is* the ACL/conformist boundary: say which in W's `rationale` (and `wraps: ["stripe"]`), not as a relationship. W's relationships to our other contexts follow the rows above |
| Two contexts that must release together | mutual | mutual | partnership / shared kernel |

If none of the rows applies to a pair of contexts, they are probably `separate-ways` — say so explicitly
so `ddd-connect` does not invent an integration.

## 3. The nine patterns

| Pattern | Shape | Meaning | Choose when | Avoid when |
|---|---|---|---|---|
| `partnership` | mutual | Two contexts (teams) plan and release together; failure in one is failure for both | Both are ours, both volatile, interfaces co-evolve, usually one team | One side is stable/generic (use customer-supplier); teams are far apart (coordination cost) |
| `shared-kernel` | mutual | A small, explicit shared model (types, maybe code/schema) changed only by agreement | A tiny model that must be identical on both sides (identity, money) and one team owns both | As a default in a new system; sharing whole entities "because DRY" — that is coupling, not a kernel |
| `customer-supplier` | U→D | U commits to serve D's needs; D's priorities factor into U's planning | Both ours; D can negotiate; sync or async | U is external (you cannot negotiate with Stripe) |
| `conformist` | U→D | D adopts U's model as-is, no translation | U is external or large, its model is good enough, translation is not worth it, U is stable | D is core and U is volatile — U's changes would corrupt D's language |
| `anticorruption-layer` | U→D | D translates U's model into its own at the boundary | U is a legacy/big-ball-of-mud context of ours still live on the map, or a wrapper whose model is really the vendor's, and D (usually core) must protect its language | Both sides are ours and well-modelled (use customer-supplier / published-language); to "link" a wrapper to the system it wraps — that is not a relationship (§2) |
| `open-host-service` | U→D | U exposes one well-defined protocol for any consumer | U serves several downstreams and its API is the product | Only one consumer exists (customer-supplier is more honest) |
| `published-language` | U→D | U and D communicate through a documented, shared language (event schemas, a standard) | Event-driven integration between our contexts; the default for domain events; usually OHS + PL | The "language" is really U's internal model leaking out |
| `separate-ways` | none | No integration; duplicate the small overlap | Integration cost exceeds benefit; different users and cadences | Facts must agree between the two (they need at least an event) |
| `big-ball-of-mud` | demarcation | A line drawn around a legacy mess so its model does not spread | An `existing_systems[].will = replace` legacy, or the monolith being carved | Anything new — this pattern is recognised, never designed |

## 4. Decision procedure (one relationship at a time)

1. Is the upstream a legacy context we are strangling (`existing_systems[].will = replace`, still live and
   integrated) → `big-ball-of-mud` (the ACL is implied — say so). Is the upstream a wrapper whose model is
   really the vendor's and the downstream must protect its language → `anticorruption-layer`; if the
   downstream deliberately adopts that model → `conformist`. A wrapper's link to the system it wraps is
   never a relationship (§2) — the wrapper *is* the ACL/conformist boundary.
2. Do the two succeed or fail together and evolve their interface jointly? → `partnership`.
3. Is there a small named model both must change in lockstep? → `shared-kernel` (name exactly what is shared).
4. Does the downstream need the upstream to accommodate its needs, and can it negotiate? → `customer-supplier`.
5. Does the upstream publish events/a schema that downstreams consume as-is? → `published-language`
   (mention OHS in the description if several consumers exist).
6. Nothing crosses? → `separate-ways`.

Precedence when several apply: `anticorruption-layer` > `big-ball-of-mud` > `partnership` > `shared-kernel` >
`customer-supplier` > `published-language` > `open-host-service` > `conformist` > `separate-ways`.

Sanity checks: no relationship is its own upstream; no endpoint is an external system id (the context that
wraps or adapts it stands for it); each ordered pair appears once; every context has at least one
relationship or an explicit separate-ways; an ACL's downstream is the side that *protects* itself; a core
context should rarely be a conformist.

## 5. Rationale — what a good `description` contains

Template: `<U> → <D>, <pattern>: <what crosses (event / command / data)>; <why this direction>;
<why this pattern rather than the nearest alternative>; <hint for connect (sync/async)>.`

- Good: "billing → fulfilment, published-language: Fulfilment only needs to know a week was paid
  (`week-charged`: subscriptionId, week). It must not learn Stripe's charge model, so Billing publishes a
  domain event and Fulfilment subscribes. Upstream is billing because the event schema is billing's to
  change. Async is fine — packing starts hours later."
- Bad: "billing and fulfilment talk to each other." (no direction, no pattern reason, nothing named.)
- Bad: "subscriptions → billing, conformist: billing uses the subscription id." (using an id is not
  adopting a model; the real question is who serves whom.)

## 6. Mermaid conventions (conservative syntax; renders everywhere)

```
flowchart LR
  subscriptions["Subscriptions"]
  billing["Billing"]
  fulfilment["Fulfilment"]
  subscriptions -->|"R1 customer-supplier"| billing
  billing -->|"R2 published-language"| fulfilment
```

- One node per bounded context; node id = context id with `-` replaced by `_`; label = context name.
- One edge per relationship, drawn upstream → downstream, label `<Rid> <pattern>`.
- Symmetric patterns: one edge, label suffixed `(mutual)`. `separate-ways`: dotted, no arrowhead
  (`a -.-|"R3 separate-ways"| b`). Do not use `<-->`, `x--x` or subgraphs — older renderers reject them.
- The diagram is regenerated by `ddd decompose check --write-map`; if you hand-edit it, keep it consistent
  with `relationships[]` — the JSON is the chain (contract §7).

## 7. Sources (accessed 2026-08-29)

- ddd-crew, *Context Mapping* (patterns, team relationships, cheat sheet) — https://github.com/ddd-crew/context-mapping
- Eric Evans, *Domain-Driven Design Reference* (pattern definitions quoted there) — https://www.domainlanguage.com/ddd/reference/
- Vlad Khononov, *Learning Domain-Driven Design* ch. 4 (cooperation / customer–supplier / separate ways grouping) — https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/
- Vlad Khononov, *Balancing Coupling in Software Design* (contract-level coupling is what a published language buys you) — https://coupling.dev/
- Martin Fowler, *BoundedContext* — https://martinfowler.com/bliki/BoundedContext.html
