# Aggregate Design Canvas — {{Aggregate name}}

Context `{{context-id}}` · aggregate id `{{aggregate-id}}` · pattern {{domain-model | event-sourced-domain-model}} · lives in `{{module_path}}/domain/{{aggregate-id}}`
Discover candidate: `{{aggregate-id}}` (handles {{command ids}}, emits {{event ids}}) · canvas format: https://github.com/ddd-crew/aggregate-design-canvas

## 1. Name
**{{Name}}** — {{why this name in this context's language; lifecycle scope if any, e.g. "one per subscription, lives while the subscription is active"}}

## 2. Description
{{Responsibilities in two or three sentences. Why this boundary: which rules must be transactionally consistent here.
Alternatives rejected: e.g. "one aggregate per week choice — rejected because the one-choice-per-week rule spans weeks".}}

## 3. State transitions
```
{{created}} → {{active}} → {{paused}} → {{active}}
{{active}} → {{cancelled}}
```
| From | Command | To | Rejected when |
|---|---|---|---|
| {{state}} | `{{command-id}}` | {{state}} | {{condition}} |

## 4. Enforced invariants
| # | Invariant (same wording as `code.json` and the test name) | Whose job is it — why transactional |
|---|---|---|
| I1 | {{A week is chosen at most once per subscription}} | {{the subscriber's, at the moment of choosing → transactional}} |

## 5. Corrective policies
| Situation found late | Then | Within | Owner |
|---|---|---|---|
| {{a charged week is cancelled}} | {{refund; emit week-refunded}} | {{24 h}} | {{billing}} |

## 6. Handled commands → created events
| Command (`discover` id) | Preconditions | Event(s) (`discover` id) | Payload (from `events[].data`) |
|---|---|---|---|
| `{{command-id}}` | {{state, invariants checked}} | `{{event-id}}` | {{fields}} |

## 7. Throughput
| Metric | Average | Maximum | Basis |
|---|---|---|---|
| Commands per instance per {{day/week}} | {{n}} | {{n}} | {{source of estimate}} |
| Concurrent clients per instance | {{n}} | {{n}} | {{}} |

Conflict risk: {{low | medium | high}} → {{optimistic concurrency with retry | split by …}}

## 8. Size
| Metric | Estimate | Basis |
|---|---|---|
| Events per instance per {{period}} | {{n}} | {{}} |
| Lifetime of an instance | {{}} | {{}} |

Size: {{small | medium | large}} → {{no snapshots needed | snapshot every N events | scope the aggregate to a period}}

## 9. Model sketch
- Root entity `{{Root}}`: {{fields, mostly value objects}}; version for optimistic concurrency
- Entities inside: {{Entity}} ({{why it needs identity inside the root}}) — or none
- Value objects: {{Week, RecipeId, Money …}} (immutable, self-validating)
- References to other aggregates by id: {{CustomerId …}}
- Internal domain events: {{event ids}} → translated to integration events by the publisher adapter

## 10. Notes & open questions
- {{question for the domain expert, with the `open_questions` id from code.json}}
