# Coupling smells checklist — what to look for once the flows are drawn

Walk every flow and every relationship against this list. Each hit becomes a `coupling_concerns[]` entry:
`{ "id": "CC<n>", "text": "…", "contexts": [<bounded-context ids only>], "severity": "low|medium|high",
"smell": "<id below>", "flows": ["F<n>"], "mitigation": "…" }`. Name actors and external systems in
`text`, never in `contexts` (the validator rejects them there). Do not "fix" a smell silently by
redrawing the flow: if the fix changes a boundary, that is a decompose re-run — record the concern and an
open question and let the human decide.

`ddd connect render --check` detects the smells marked **lint**; the rest need eyes.

| id | Smell | Detect | Severity guide | Mitigation |
|---|---|---|---|---|
| `sync-chain` | three or more nested synchronous hops (A waits on B waits on C) | **lint** | high if the chain passes through the core or an external system; else medium | end the chain with an event; return early to the caller; move the decision to where the data is |
| `chatty` | more than 9 messages in one flow, or repeated sequential commands between the same two contexts | **lint** (count) / eyes (repeats) | medium | collapse into one coarser command; subscribe to one event instead of several round trips; question the boundary |
| `too-many-contexts` | one scenario touches more than 5 contexts | **lint** | medium | split the scenario; or the contexts are too small |
| `distributed-transaction` | two contexts must both commit or neither (reserve stock and charge card "atomically") | eyes: look for "must" + two owners | high | saga with compensations (deep: `sagas[]`); or merge the contexts if they always change together |
| `bidirectional` | A depends on B and B on A (commands/queries one way, events the other way count as the *same* direction — consumer depends on producer) | **lint** | medium (high if both are core) | make one direction events only; extract the shared concept; or declare a partnership deliberately |
| `data-hungry` | a message carries most of another context's aggregate, or a consumer needs ≥ 8 fields | **lint** (payload size) | medium | thin event + query; replicated read model with the fields the consumer actually uses; boundary check |
| `shared-db` | `via: db` between contexts or `mechanism: shared-db` | **lint** (error) | high | owning context exposes an API/event; reporting store for read-only analytics |
| `command-should-be-event` | upstream commands a downstream it does not need an answer from | eyes | low–medium | publish an event, let the downstream subscribe |
| `event-should-be-command` | a "notification" that actually requires the receiver to act and report failure back | eyes | medium | make it a command with a response, or a saga step |
| `external-in-transaction` | an external system called inside the same unit of work as a state change | eyes | high | call, then record the outcome; outbox for the notification |
| `wrong-policy-host` | the policy "whenever X then Y" is executed by a context that owns neither the rule nor the data | eyes | medium | host the policy in the context that owns the rule; see method §3 |
| `core-conforms-to-generic` | a core context conforms to (is shaped by) a generic or external model | eyes: strategize type + pattern | high | anticorruption layer on the core side |
| `volatile-upstream-model-coupling` | downstream uses the internal model of a volatile (core) upstream at a distance | eyes: Khononov strength × volatility | high across deployables, medium within one | published language / open-host service; ACL downstream |
| `missing-idempotency` | at-least-once delivery without a de-dup strategy | **lint** (note) | low | de-dup on event id or natural key; idempotent operation |
| `unversioned-contract` | published-language / open-host-service message with no `version` | eyes | low (medium if ≥ 3 consumers) | add `version`; additive-only evolution rule |
| `wide-fan-out` | one event with many consumers that each need different data | eyes | low–medium | split into purpose-specific events; or a read model |
| `temporal-coupling` | both sides must be up for the business step to succeed although the business does not need it | eyes: sync steps to non-critical contexts | medium | async event; queue |
| `hidden-integration` | a cross-context policy or read model with no flow and no relationship in the context map | **lint** (uncovered policy) / `ddd connect inputs` (no relationship) | medium | add the flow; re-run decompose to add the relationship |
| `bbom-upstream` | relationship pattern `big-ball-of-mud` | eyes | high | stateful ACL; batch import; plan the replacement |

A `distributed-transaction` or `event-should-be-command` hit that needs a branch, a timeout or a compensation is a
saga / process-manager candidate: at `standard` or `light` depth add `"saga_candidate": true` to the concern and stop
there (name the would-be owner in `mitigation`); `deep` designs it in `sagas[]` (method §6).

## Severity rules of thumb

- **high** — the design would need a distributed transaction, a shared database, or puts a synchronous
  chain / external call on the core's critical path; or a core context is shaped by something it does not own.
- **medium** — chatty, bidirectional, data-hungry, temporal coupling the business does not require, a policy
  in the wrong place.
- **low** — hygiene: missing idempotency or version notes, wide fan-out that is still manageable.

## Writing a good concern

Bad: `"Fulfilment and Subscriptions are coupled"`.
Good: `"Fulfilment needs recipe names and portion sizes for the picking list, which Subscriptions owns;
today F1 has Fulfilment querying Subscriptions synchronously while packing. If the warehouse service is
separate (organise), this puts Subscriptions on the packing critical path."` — contexts `[subscriptions,
fulfilment]`, severity medium, smell `data-hungry`, flows `[F1]`, mitigation `"replicate a picking read
model from meals-chosen (add recipeNames, portions to the payload) so packing works offline"`.

A reader of `ddd-organise` should be able to decide from the concern alone whether the two contexts must
share a deployable.
