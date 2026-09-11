# Design — {{Context name}} (`{{context-id}}`)

| | |
|---|---|
| Classification | {{core / supporting / generic}} · sourcing {{build / buy}} · pattern **{{implementation pattern from strategize}}** |
| Deployable | `{{deployable-id}}` ({{kind}}) · team `{{team-id}}` · data store {{own / shared}} |
| Module path | `{{module_path}}` |
| Structure | {{hexagonal (domain / application / adapters) | vertical slices | records + use cases}} |
| Purpose | {{from the bounded-context canvas}} — canvas: `{{ddd/07-define/<context>/bounded-context-canvas.md}}` |
| Domain roles | {{from define}} |

## 1. Module layout
```
{{module_path}}/
  {{tree — see references/architecture-and-modules.md §3 for the shape of this pattern}}
```
Dependency rule: `domain/` imports nothing outside itself; `application/` imports `domain/` only; `adapters/` may import both. Enforced by {{fitness-test tool from lang-*.md}} (test: `{{name}}`).
Composition root: `{{apps/<deployable>/main…}}` wires adapters to ports.

## 2. Domain model
{{Domain-model contexts: one row per aggregate linking its canvas; then value objects, entities, domain services.
Transaction-script / active-record contexts: "No aggregates by design (pattern = …)." then the records or the scripts' data.}}

| Aggregate | Root | Invariants | Commands → events | Canvas |
|---|---|---|---|---|
| `{{aggregate-id}}` | `{{Root}}` | {{n}} | {{`cmd` → `evt`}} | `{{aggregate-canvas-<id>.md}}` |

Value objects: {{…}} · Entities: {{…}} · Domain services: {{…}}

## 3. Application services (use cases)
| Use case | Command (`discover` id) | Trigger | Input | Loads | Decides / enforces | Emits | Returns |
|---|---|---|---|---|---|---|---|
| `{{ChooseMeals}}` | `{{choose-meals}}` | {{actor via http / policy P on event}} | {{fields}} | {{aggregate by id}} | {{invariants I1, I2}} | `{{meals-chosen}}` | {{id / rejection}} |

Transaction: one aggregate (or one store call set) per use case; publish after commit (outbox / in-process after-commit).

## 4. Ports
### Driving
| Port | Operations | Called by |
|---|---|---|
| `{{ContextCommands}}` | {{one per use case}} | {{HTTP adapter, tests}} |

### Driven
| Port | Operations | Why it exists |
|---|---|---|
| `{{AggregateRepository}}` | `get(id)`, `save(agg, expectedVersion)` | {{persistence of the aggregate}} |

## 5. Adapters
| Port | Implementation | Technology | Notes |
|---|---|---|---|
| `{{Port}}` | `{{Implementation}}` | {{Postgres / in-memory / HTTP client}} | {{outbox, idempotency key, timeouts, ACL translation}} |

## 6. Domain events
### Published
| Event (`discover` id) | Produced by | Consumers | Contract payload (`connect.json`) | Delivery | Contract test |
|---|---|---|---|---|---|
| `{{event-id}}` | {{use case / aggregate}} | {{contexts}} | {{fields}} | {{at-least-once}} | `contract: {{event-id}}` |

_A canvas may list an event as outbound **and** "no consumer known" when the consumer was added at define time — trust the outbound row (the pre-fill brief merges canvas collaborators into the consumers)._

### Consumed
| Event | From | Policy (`discover` id) | Handled by | Handler → command | Delivery | Idempotency |
|---|---|---|---|---|---|---|
| `{{event-id}}` | {{context}} | `{{policy-id}}` | {{policy / projection / process-manager}} | {{Handler}} → `{{command-id}}` | {{at-least-once}} | {{dedupe by message id / version}} — test `idempotent: {{event-id}}` |

## 7. Read models
| Read model | Source events | Readers | Storage | Rebuild |
|---|---|---|---|---|
| `{{WeeklyMenu}}` | {{event ids}} | {{actor / context}} | {{table / view / cache}} | {{how}} |

## 8. Persistence
{{Store and schema: tables / streams / collections; mapping root ↔ rows; version column for optimistic concurrency; transaction boundaries; outbox table; migrations location. Active record: which classes map to which tables. Transaction script: which statements each script issues.}}

## 9. Tests
| Kind | Name | Verifies |
|---|---|---|
| invariant | `{{rejects choosing the same week twice}}` | I1 |
| use case | `{{given subscription active, when choose-meals, then meals-chosen}}` | §3 |
| contract | `contract: {{event-id}}` | §6 payload |
| idempotency | `idempotent: {{event-id}}` | §6 consumed |
| fitness | `{{domain has no outward imports}}` | §1 |

## 10. Integration & anti-corruption
{{For bought / generic contexts this section plus §4–5 *is* the design: vendor API → our port; their model → our terms (table); failure modes (timeouts, retries, webhooks); what we never let leak. For others: upstream contexts we conform to or shield from.}}

## 11. Decisions, assumptions, open points
- {{decision and why}}
- Assumptions: {{ids from code.json}} · Open questions: {{ids}}
