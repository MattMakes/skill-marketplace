# Domain roles reference (Bounded Context Canvas "Domain Roles" / "Model Traits")

The canvas asks: *"How can you characterise the behaviour of this bounded context?"* A role names the
*shape* of a context's model so that people (and `ddd-code`) design it with the right expectations:
a draft/specification model tolerates inconsistency, an execution model protects invariants, an
audit model never mutates what it observes, a gateway translates and nothing else. Naming the role
also exposes contexts that carry two shapes at once — a common sign that a boundary is misplaced
(Nick Tune: "identify different roles to avoid coupling responsibilities").

Pick **1–2 roles** per context and write one or two sentences of justification
(`domain_roles_rationale` in `define.json`). Three or more roles is design feedback: the context
probably has several responsibilities.

## The reference table

Role ids are the contract enum (`artifact-contract.md` §4.7). "Worksheet name" and "Heuristic" are
verbatim from the ddd-crew *Model Traits worksheet*; the last two columns are how to recognise the
role in the upstream JSON and what it implies downstream.

| Role id (contract) | Worksheet name | Heuristic (ddd-crew, verbatim) | Example (ddd-crew) | Signals in upstream data | Implication for `ddd-code` |
|---|---|---|---|---|---|
| `specification-model` | Specification / Draft Model | "Produces a document describing a job/request that needs to be performed." | Advertising Campaign Builder | Events named *-drafted / -submitted / -requested*; many small edit commands; a downstream context "executes" what this one produces; Brandolini's *collaborative construction* | Accept incomplete/invalid drafts; validate only at the hand-over event; versioning matters more than invariants |
| `execution-context` | Execution Model | "Performs or tracks a job." | Advertising Campaign Engine | Owns aggregates; commands from people or policies change state; pivotal events; state transitions (placed→paid→shipped) | Aggregates with real invariants; the domain-model pattern; transactional consistency inside the aggregate |
| `audit-model` | Analysis / Audit Model | "Monitors the execution." | Advertising Campaign Analyser | Consumes events from an execution context; emits few or no commands; append-only; compliance/report language | Read-side projections; never the source of truth; immutability and traceability over consistency |
| `analysis-context` | (same worksheet row, split by the contract) | "Monitors the execution." — the reporting/insight half | Campaign Analyser, dashboards | Read models only; queries in, nothing out; "reporting", "analytics" in the subdomain description | CQRS read models, eventual consistency is fine, heavy queries |
| `approver` | Approver | "Receives requests and determines if they should progress to the next step." | Fraud Check | A request event in, an approved/rejected event out; manual policies (`kind: manual`); words like *approve, review, verify* | A decision service with an explicit outcome; often a human-in-the-loop UI; SLA on decision time |
| `enforcer` | Enforcer | "Ensures that other contexts carry out certain operations." | GDPR Context | Its policies trigger commands in *other* contexts; regulatory constraints in `understand.constraints` | Publishes obligations/commands to others; needs delivery guarantees and audit trail |
| `octopus` | Octopus Enforcer | "Ensures that multiple/all contexts in the system all comply with a standard rule." | GDPR Context | Enforcer whose reach is *every* context (consent, data retention, tenant isolation) | Cross-cutting policy; beware turning it into a "brain" — keep the rule set small |
| `interchange-context` | Interchanger | "Translates between multiple ubiquitous languages." | — | Sits between two contexts whose `terms[]` conflict; anticorruption-layer relationships on both sides | Pure translation, no business rules; explicit mapping tables; a good home for an ACL |
| `gateway` | Gateway | "Sits at the edge of a system and manages inbound and/or outbound communication." | IoT Message Gateway | Talks to an `external_systems[]` entry; `heuristics_applied` contains `external-system`; no aggregates; generic/commodity classification | Adapter-heavy; conformist or ACL toward the external party; retries, idempotency, timeouts are the design |
| `gateway` + `interchange-context` | Gateway Interchange | "The combination of a gateway and an interchange." | — | A gateway that also translates the external vocabulary into ours | Model both: the adapter *and* the translation layer |
| `bubble-context` | Bubble Context | "Sits in-front of legacy contexts providing a new, cleaner model while legacy contexts are being replaced." | — | `existing_systems[].will = replace`; brownfield; new model, legacy data | ACL toward legacy; synchronous reads through the ACL; no own store |
| `autonomous-bubble` | Autonomous Bubble | "Bubble context which has its own data store and synchronises data asynchronously with legacy contexts." | — | As above, but `deployables[].data_store = own` and async integration | Own store, event/batch sync to legacy, reconciliation jobs |
| `brain` | Brain Context | "(likely anti-pattern) Contains a large number of important rules and many other contexts depend on it." | rules engine | Many inbound collaborators, many policies, everyone waits on it | Flag it as an open question; consider splitting rules by the context that owns the decision |
| `funnel` | Funnel Context | "Receives documents from multiple upstream contexts and passes them to a single downstream context in a standard format." | — | Several inbound event sources, one outbound consumer, a published language on the way out | Normalisation + published language; schema versioning is the main job |
| `engagement-context` | Engagement Context | "Provides key features which attract users to keep using the product." | Free Financial Advice Context | Classified *engagement-creator*; user-facing; not on the revenue path | Optimise for change speed and UX experiments; weak consistency is fine |
| `other` | Dogfood Context (or any trait not above) | "Simulates the customer experience of using the core bounded contexts." | Whitelabel music store | Test/demo/sandbox contexts; anything that fits no row | Say what it is in the rationale |

Contract note: the worksheet's *Analysis/Audit Model* is split into `audit-model` (compliance,
immutability) and `analysis-context` (reporting, insight) in the contract enum; *Dogfood Context*
and *Gateway Interchange* have no enum value of their own — use `other` (say "dogfood" in the
rationale) or `gateway` + `interchange-context`.

## Where the roles come from (why they are worth choosing)

- **Plan / do / check.** Nick Tune (canvas V3 notes): "One common pattern in domains is to have
  separate models for plan, do, check. One type of context describes a job to be done, another
  performs the job, and another assesses the job once complete (Alberto Brandolini refers to them
  as Draft, Execute, and Audit)." Most systems have all three; a single context that does all three
  is usually three contexts.
- **Collaborative construction (Brandolini).** Same data, different behaviour: while a thing is
  being built it is a *draft* — "it's important to accept inconsistencies, warnings or even errors,
  incomplete data" — and once finalised it becomes "printed or signed": "complete, valid and
  consistent, and cannot be changed any more. Every change becomes a new revision". Examples given:
  shopping cart → order; request-for-quote/auction → trade; legal draft → signed contract; source
  code → executable. If your context's events include both "…-drafted" and "…-executed" style
  events, look for the split.
- **Roles are design feedback**, not labels. If you cannot justify a role in one sentence from the
  upstream data (aggregates, policies, collaborators), the context is fuzzy — record an open
  question rather than inventing a role.

## Choosing quickly (auto mode)

1. Talks mainly to an external system and owns no aggregate → `gateway` (add `interchange-context`
   if it translates vocabularies).
2. Owns aggregates and receives commands from people/policies → `execution-context`.
3. Only read models / reports → `analysis-context`; append-only compliance record → `audit-model`.
4. Its policies mostly command *other* contexts → `enforcer` (or `octopus` if it reaches all).
5. Produces a document another context executes → `specification-model`.
6. Still unsure → `other` + rationale + an open question. Never leave `domain_roles` empty.

Record the heuristic you used as a canvas assumption ("role chosen by the auto heuristic, not confirmed").

## Sources (accessed 2026-08-29)

- ddd-crew, Bounded Context Canvas README, "Domain Roles" section — https://github.com/ddd-crew/bounded-context-canvas
- ddd-crew, Model Traits worksheet (the table quoted above) — https://github.com/ddd-crew/bounded-context-canvas/blob/master/resources/model-traits-worksheet.md
- Nick Tune, "Bounded Context Canvas V3: Simplifications and Additions" (Model Traits section, plan/do/check) — https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-v2-simplifications-and-additions-229ed35f825f
- Cyrille Martraire, "Collaborative Construction by Alberto Brandolini — An archetype of Bounded Contexts" — https://medium.com/@cyrillemartraire/collaborative-construction-by-alberto-brandolini-an-archetype-of-bounded-contexts-bea640bbb5b
- Bounded Context Canvas v5 template labels (role types listed on the canvas: draft context, execution context, analysis context, gateway context, other) — https://github.com/ddd-crew/bounded-context-canvas/tree/master/tools/excalidraw-version
