# DDD skill-chain artifact contract

> **Paths:** `${CLAUDE_PLUGIN_ROOT}` below means this plugin's install directory — the absolute
> path already resolved in the SKILL.md that sent you here. Supporting files like this one are
> read raw, so substitute that path yourself; never paste the literal token into a shell.


This is the contract every `ddd-*` skill builds against. The nine skills follow the
[DDD Starter Modelling Process](https://github.com/ddd-crew/ddd-starter-modelling-process):

```
01 understand → 02 discover → 03 decompose → 04 strategize → 05 connect → 06 organise → 07 define → 08 code → 09 contracts
```

Each step **reads the JSON artifact(s) of the step(s) before it** and **writes one human-readable
Markdown artifact plus one machine-readable JSON artifact** that the next step consumes. The JSON
is the chain; the Markdown is what humans review. `ddd validate` checks the chain
(required fields, cross-step references, staleness) and is the pass/fail gate between steps.

Every command in this document is the one Node CLI, `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`
(Node 18 or newer, nothing to install); `ddd <cmd>` is that call, shortened.

Design goals of the contract, so you can make sensible calls where it is silent:

- **Stable ids, not prose, carry meaning between steps.** Later steps reference earlier things by
  id (`order-placed`, `ordering`, `G1`). Ids are kebab-case slugs (or `G1`/`Q3`-style short codes
  for goals/questions/assumptions/hotspots), unique within their collection, and never renamed on
  re-runs — add new ones, deprecate old ones.
- **Every step is honest about what it guessed.** `assumptions[]` and `open_questions[]` are in the
  envelope of every artifact so a human can review an auto-mode run later.
- **Small systems stay small.** The manifest carries `scale_target` and `depth`; skills scale their
  output to it (a one-team, two-service system does not need a ten-page team topology).

## 1. Workspace layout

All artifacts live under one folder in the project being designed. Default: `./ddd/` in the
project root (the user or manifest may override — always resolve the folder first and print it).

```
<project>/ddd/
  manifest.json                      # project, scale target, mode, depth, per-step status
  glossary.md                        # ubiquitous language (seeded in discover, refined in define)
  01-understand/understand.md        # business model canvas, impact map, strategy notes
  01-understand/understand.json
  02-discover/event-storm.md         # big-picture EventStorming timeline, hotspots, pivotal events
  02-discover/discover.json
  03-decompose/subdomains.md         # subdomains + bounded contexts + context map (mermaid)
  03-decompose/decompose.json
  04-strategize/core-domain-chart.md # core/supporting/generic + build/buy + implementation pattern
  04-strategize/strategize.json
  05-connect/message-flows.md        # domain message flows per scenario (mermaid sequence diagrams)
  05-connect/connect.json
  06-organise/team-topology.md       # teams, interaction modes, deployable units
  06-organise/organise.json
  07-define/system-context.md        # C4 L1 system context (mermaid) + quality attributes
  07-define/<context>/bounded-context-canvas.md   # one per bounded context
  07-define/define.json
  08-code/<context>/aggregate-canvas-<aggregate>.md
  08-code/<context>/design.md        # module structure, ports/adapters, use cases, tests
  08-code/implementation-plan.md     # ordered handoff to implementation
  09-contracts/contracts.json        # one entry per cross-party message: schema, example, owners, semantics
  09-contracts/contracts.md          # rendered per context: what it publishes and consumes
  09-contracts/schemas/<message>.schema.json
  09-contracts/examples/<message>.json
  08-code/code.json
  <NN-step>/decisions/<Did>-<opt>.<type>.json   # diagram spec for one option of one decision (see §3, decisions[])
  diagrams/                          # rendered SVG/PNG of the workspace; diagrams/decisions/<Did>.png compares a decision's options
```

Paths inside JSON artifacts are **relative to the project root** (e.g. `ddd/02-discover/discover.json`).

## 2. `manifest.json`

Created by `ddd init` (any step creates it if missing). Updated via `ddd mark`, which also rebuilds
`review.html` and `diagrams/`; never hand-edit statuses.

```json
{
  "schema_version": 1,
  "project": "knowledge-platform",
  "title": "Organisational knowledge platform",
  "ddd_dir": "ddd",
  "created": "2026-08-29T10:00:00Z",
  "updated": "2026-08-29T12:30:00Z",
  "mode": "interactive",
  "depth": "standard",
  "scale_target": { "deployables_min": 1, "deployables_max": 3, "teams": 1, "notes": "solo dev, modular monolith preferred" },
  "sources": ["CONTEXT.md", "brainstorm/2026-08-28-design.md"],
  "steps": {
    "understand": { "status": "done", "updated": "…", "artifacts": ["ddd/01-understand/understand.md", "ddd/01-understand/understand.json"], "open_questions": 2, "mode": "interactive" },
    "discover":   { "status": "pending" },
    "decompose":  { "status": "pending" },
    "strategize": { "status": "pending" },
    "connect":    { "status": "pending" },
    "organise":   { "status": "pending" },
    "define":     { "status": "pending" },
    "code":       { "status": "pending" },
    "contracts":  { "status": "pending" }
  }
}
```

- `mode`: `interactive` (default when a human is present) or `auto` (no questions; see `modes.md`).
- `depth`: `light` | `standard` | `deep`. Light = minimum viable artifact (small systems, time-boxed);
  deep = exhaustive (large systems, many contexts). Skills must honour it.
- `scale_target`: the user's stated size — anywhere from 1–3 services to 10–20 deployable units.
  `organise` checks its deployable count against this.
- `steps.<name>.status`: `pending` | `draft` | `done` | `skipped` | `stale`. `stale` is set by
  `ddd validate` when an upstream artifact is newer than a downstream one.

## 3. Common envelope (every step JSON)

```json
{
  "schema_version": 1,
  "step": "discover",
  "produced_by": "ddd-discover",
  "produced_at": "2026-08-29T11:00:00Z",
  "mode": "interactive",
  "depth": "standard",
  "inputs": ["ddd/01-understand/understand.json"],
  "assumptions": [ { "id": "A1", "text": "Payments are handled by an external PSP", "confidence": "medium" } ],
  "open_questions": [ { "id": "Q1", "text": "Can an order be split across warehouses?", "blocking": false, "owner": "domain expert" } ],
  "...step-specific keys..."
}
```

`inputs` lists the artifacts actually read (previous step JSON, project docs, user notes). If a step
was bootstrapped without its predecessor (user chose to skip), `inputs` holds whatever was used and
an assumption records that the predecessor was skipped.

Optional envelope keys carry things forward that have no natural home in the step's own shape:

- `notes_for_downstream[]` — findings meant for later steps, e.g. a language conflict spotted in
  Understand that Decompose must treat as a boundary: `{ "id": "N1", "text": "'Job' means a stop to
  dispatchers, the on-site work to technicians and a priced line to finance", "for": ["discover", "decompose"],
  "kind": "language" }` (`kind`: `language` | `boundary` | `process` | `risk` | `decision` | `other`).
  Every step reads its predecessors' notes addressed to it (`for` contains its step name) before drafting.
  `ddd validate --status` prints *all* upstream notes addressed to the next step, so do **not** re-emit a
  note you merely agree with — address it to every step that needs it in `for` when you first write it.
  Re-emit only when you sharpen or overrule an upstream note, and then cite its id in the text
  ("sharpens decompose N3"). Prose in the Markdown does not reach the next step; the JSON does — so
  anything a later step needs goes here.
- `deprecated[]` — see §7.
- `plain_words` — the step in language a non-specialist can check, rendered as an "In plain words"
  section at the top of the step's Markdown. Four short strings:
  `{ "what": "…", "decided": "…", "assumed": "…", "riskiest": "…" }` — what this step did, the call
  it made, the guess it made, and what would hurt most if that guess is wrong. It is a *translation*
  of the step's top items, not a second source of truth, so it needs no cross-check against
  `assumptions[]`. Write it last, in both modes. Optional in the schema so old workspaces still
  validate; `ddd validate` warns when it is missing, which `--strict` turns into a failure.
  Why it exists: a reviewer who cannot read the dense artifact cannot catch its mistakes, and the
  mistakes these artifacts make are the expensive kind. See modes.md §4.
- `decisions[]`: the design calls this step had to argue rather than read off an artifact, with every
  option that was weighed, not only the winner. A step writes one whenever it dispatches the
  `ddd-decision-strategist` (modes.md §3b), whenever the user picks between alternatives at a
  checkpoint, or whenever it commits to a call that two competent people could disagree on.
  Shape:
  `{ "id": "D1", "question": "Which context owns the subscription week?", "kind": "ownership",
  "options": [ { "id": "A", "summary": "…", "pros": [], "cons": [], "risks": [],
  "diagram": "ddd/03-decompose/decisions/D1-A.architecture.json" }, { "id": "B", "summary": "…" } ],
  "chosen": "B", "confidence": "medium", "rationale": "…", "would_flip_if": ["…"],
  "made_by": "strategist", "records": { "assumption": "A4" }, "supersedes": "decompose:D1" }`.
  `kind` is one of `boundary` | `ownership` | `classification` | `sourcing` | `topology` |
  `integration` | `foundation`; `made_by` is `strategist` | `user` | `step`; `confidence` uses the
  same scale as `assumptions[]`; `would_flip_if` lists the facts that would change the call, usually
  the strategist's three questions restated as conditions, so a reviewer knows what to go and check.
  Rules:
  - No `chosen` means the decision is still open. Open decisions lead the review page's worklist.
  - The decision itself does not travel downstream; the assumption or open question it produced
    does, and later steps keep keying off those. So a taken decision links its `assumptions[]` entry
    via `records.assumption`, and a blocking decision links its `blocking: true` `open_questions[]`
    entry via `records.open_question` instead of repeating the question text.
  - `supersedes` names an earlier decision this one overturns, as `<step>:<Did>`, so a reviewer can
    follow the chain of calls in order.
  - `options[].diagram` is a project-relative path to a diagram spec
    (`<NN-step>/decisions/<Did>-<opt>.<type>.json`, §1). The renderer draws all of a decision's
    option diagrams side by side on one shared grid, so a reviewer compares like with like.
  - `validate` checks that decision ids are unique within the step, that `chosen` is one of
    `options[].id`, that `records.assumption` / `records.open_question` resolve to ids in this
    step's envelope, that `supersedes` resolves to a decision in the named step, and that each
    `diagram` path exists (a warning, since specs are optional).
  Optional in the schema so old workspaces still validate.

## 4. Step artifacts

Field lists below are the **required** shape; skills may add keys. `schemas/<step>.schema.json`
is the authoritative machine-readable version.

### 4.1 `understand.json` — produced by `ddd-understand`, consumed by `ddd-discover` (and read by all later steps for goals/actors)

Tools: Business Model Canvas, Impact Mapping, Product Strategy Canvas, Wardley evolution stage.

```json
{
  "system": { "name": "…", "one_liner": "…", "problem": "…", "why_now": "…" },
  "business_model": {
    "customer_segments": [], "value_propositions": [], "channels": [], "customer_relationships": [],
    "revenue_streams": [], "key_resources": [], "key_activities": [], "key_partners": [], "cost_structure": []
  },
  "goals":        [ { "id": "G1", "statement": "…", "metric": "…", "target": "…", "horizon": "…" } ],
  "actors":       [ { "id": "customer", "name": "Customer", "kind": "person", "description": "…", "goals": ["G1"] } ],
  "impacts":      [ { "id": "I1", "actor": "customer", "change": "…", "goal": "G1" } ],
  "deliverables": [ { "id": "D1", "impact": "I1", "description": "…", "priority": "must" } ],
  "capabilities": [ { "id": "cap-order-management", "name": "Order management", "description": "…", "evolution": "custom" } ],
  "constraints":  [ { "id": "C1", "kind": "regulatory", "text": "…" } ],
  "non_goals":    ["…"],
  "existing_systems": [ { "name": "…", "role": "…", "will": "integrate" } ],
  "scale_target": { "deployables_min": 1, "deployables_max": 3, "teams": 1, "users": "…", "notes": "…" }
}
```

- `actors[].kind`: `person` | `system` | `organisation`. `deliverables[].priority`: `must` | `should` | `could`.
- `capabilities[].evolution` (Wardley): `genesis` | `custom` | `product` | `commodity`.
- `constraints[].kind`: `regulatory` | `contractual` (imposed by a customer/partner, e.g. SLAs, mandated formats — these become conformist/ACL relationships) | `technical` | `organisational` | `budget` | `timeline` | `other`.
- `existing_systems[].will`: `replace` | `integrate` | `ignore`.
- `scale_target` here is authoritative; after writing `understand.json`, sync it into the manifest with
  `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir <ddd-dir> --from-understand ddd/01-understand/understand.json`.

### 4.2 `discover.json` — produced by `ddd-discover`, consumed by `ddd-decompose` (events/commands/terms are referenced by every later step)

Tools: big-picture EventStorming (events, commands, actors, policies, read models, hotspots,
pivotal events), Domain Storytelling / Example Mapping for scenarios. Seeds `glossary.md`.

```json
{
  "actors":           [ { "id": "customer", "name": "Customer", "from_understand": "customer" } ],
  "external_systems": [ { "id": "psp", "name": "Payment provider", "description": "…" } ],
  "phases":           [ { "id": "ordering", "name": "Ordering", "order": 1 } ],
  "events":   [ { "id": "order-placed", "name": "Order Placed", "phase": "ordering", "sequence": 12, "actor": "customer",
                  "triggered_by": "place-order", "pivotal": true, "data": ["orderId", "lines"], "description": "…" } ],
  "commands": [ { "id": "place-order", "name": "Place Order", "actor": "customer", "produces": ["order-placed"], "description": "…" } ],
  "policies": [ { "id": "reserve-on-order", "name": "Whenever order placed, reserve stock", "when": "order-placed", "then": ["reserve-stock"], "kind": "automatic" } ],
  "read_models": [ { "id": "cart-summary", "name": "Cart summary", "informs": "place-order", "used_by": "customer" } ],
  "aggregate_candidates": [ { "id": "order", "name": "Order", "handles": ["place-order"], "emits": ["order-placed"] } ],
  "pivotal_events": ["order-placed"],
  "hotspots":  [ { "id": "H1", "text": "…", "near": "order-placed", "kind": "unclear" } ],
  "scenarios": [ { "id": "S1", "name": "Happy path: customer orders in-stock item", "actors": ["customer"], "events": ["order-placed", "stock-reserved"] } ],
  "glossary":  [ { "term": "Order", "definition": "…", "avoid": ["Basket"], "context": null } ]
}
```

- `events[].sequence` is the global timeline position (integers, gaps allowed). `phase` references `phases[].id`.
- `policies[].kind`: `automatic` | `manual`. `hotspots[].kind`: `unclear` | `conflict` | `risk` | `missing` | `external`.
- `actors[].from_understand` links back to `understand.json` `actors[].id` (may be null for newly found actors).
- `glossary[].context` is `null` at this stage (system-wide seed); `define` later assigns terms to contexts.

### 4.3 `decompose.json` — produced by `ddd-decompose`, consumed by `ddd-strategize`, `ddd-connect`, `ddd-organise`, `ddd-define`

Tools: boundary heuristics (language changes, pivotal events, actors, data ownership, rate of change),
Business Capability Modelling, Independent Service Heuristics, Context Mapping.

```json
{
  "subdomains": [ { "id": "ordering", "name": "Ordering", "description": "…", "capabilities": ["cap-order-management"],
                    "events": ["order-placed"], "commands": ["place-order"], "terms": ["Order"],
                    "heuristics_applied": ["language-boundary", "pivotal-event"], "rationale": "…" } ],
  "bounded_contexts": [ { "id": "ordering", "name": "Ordering", "subdomains": ["ordering"],
                          "owns_events": ["order-placed"], "owns_commands": ["place-order"], "owns_aggregates": ["order"],
                          "terms": [ { "term": "Customer", "meaning_here": "the party placing the order" } ],
                          "independent_service_check": { "sense_check": "yes", "brand": "yes", "revenue": "partial", "cost_tracking": "yes", "data": "yes", "user_personas": "yes", "cognitive_load": "yes", "verdict": "candidate" },
                          "rationale": "…" } ],
  "relationships": [ { "id": "R1", "upstream": "catalog", "downstream": "ordering", "pattern": "customer-supplier",
                       "description": "…" } ],
  "context_map_mermaid": "flowchart LR …"
}
```

- Every `events[]`/`commands[]`/`owns_*` id must exist in `discover.json`. Every event/command in
  discover should be owned by exactly one context (validate warns on orphans and duplicates).
- `relationships[].pattern`: `partnership` | `shared-kernel` | `customer-supplier` | `conformist` |
  `anticorruption-layer` | `open-host-service` | `published-language` | `separate-ways` | `big-ball-of-mud`.
- `independent_service_check` follows the Independent Service Heuristics; `verdict`: `candidate` | `merge` | `unsure`.

### 4.4 `strategize.json` — produced by `ddd-strategize`, consumed by `ddd-connect` (investment), `ddd-organise`, `ddd-define`, `ddd-code` (implementation pattern)

Tools: Core Domain Chart, Purpose Alignment Model, Wardley evolution, Khononov's implementation-pattern heuristic.

```json
{
  "classifications": [ { "subdomain": "ordering", "type": "core", "business_differentiation": 8, "model_complexity": 7,
                         "evolution": "custom", "sourcing": "build", "implementation_pattern": "domain-model",
                         "investment": "high", "rationale": "…", "future_direction": "…" } ],
  "core_domains": ["ordering"],
  "bets": [ { "id": "B1", "text": "…", "risk": "…" } ],
  "chart_mermaid": "quadrantChart …"
}
```

- `type`: `core` | `supporting` | `generic`. `sourcing`: `build` | `buy` | `open-source` | `outsource`.
- `implementation_pattern`: `transaction-script` | `active-record` | `domain-model` | `event-sourced-domain-model`.
- `business_differentiation` and `model_complexity` are 0–10 (chart axes). Every subdomain in
  `decompose.json` must be classified.

### 4.5 `connect.json` — produced by `ddd-connect`, consumed by `ddd-organise` (coupling), `ddd-define` (inbound/outbound), `ddd-code` (ports)

Tools: Domain Message Flow Modelling, process-level EventStorming, sequence diagrams.

```json
{
  "flows": [ { "id": "F1", "name": "Place order", "scenario": "S1",
               "steps": [ { "seq": 1, "from": "customer", "to": "ordering", "message": "place-order", "kind": "command", "sync": true, "via": "http" } ],
               "mermaid": "sequenceDiagram …" } ],
  "messages": [ { "id": "order-placed", "kind": "event", "producer": "ordering", "consumers": ["shipping"],
                  "contract": "published-language", "payload": ["orderId"], "delivery": "at-least-once" } ],
  "integration_patterns": [ { "relationship": "R1", "mechanism": "async-events", "rationale": "…" } ],
  "coupling_concerns": [ { "id": "CC1", "text": "…", "contexts": ["ordering", "shipping"], "severity": "medium" } ]
}
```

- `steps[].from`/`to` are bounded-context ids, actor ids, or external-system ids. `kind`: `command` | `event` | `query` | `response`.
- `via`: `http` | `grpc` | `message-bus` | `in-process` | `file` | `db` | `other`. `delivery`: `at-most-once` | `at-least-once` | `exactly-once` | `sync`.
- `messages[].contract` records what kind of agreement this is: the context-map pattern from
  `decompose.relationships` when both ends are bounded contexts, `ui` when one end is a human actor, and
  `external-api` when one end is an external system. `ddd-contracts` maps `ui` → `open-host-service` and
  `external-api` → the wrapper's pattern (`anticorruption-layer`, else `conformist`).
- `messages[].payload` for a **query** lists the *request parameters*; the response shape is not in connect
  (`ddd-contracts` designs it). Optional `messages[].idempotency` (a sentence: what the consumer de-duplicates on)
  and `messages[].description` are carried forward as contract `semantics` and `description`.
- **Query direction.** For `kind: query` the producer is the context that answers — `producer` names the
  context that owns the data — and `consumers` are the askers; the reply travels back implicitly. In
  `flows[].steps[]` the request goes `from` the asker `to` the answerer: the same direction read from the
  other end, not a contradiction. A `response` step or message is modelled only when its shape matters for a
  contract (`ddd-contracts` seeds a query's answer schema from `response_payload` when connect carries it).
  Because the answerer is the supplier, `ddd-define`'s prefill expects `decompose.relationships` to list the
  answering context **upstream** of the asker; its "message direction is the other way — check" note on a
  query means decompose has the asker upstream — fix decompose or record the question, never flip the message.
- `messages[].id` should match a discover command/event id when it is one; queries get new ids (a query may reuse a
  read-model id). When a flow needs a command/event discover lacks, mint a kebab-case id, log an assumption and an
  open question asking discover to adopt it — the validator's "not present in discover" warning is expected.
- `parties[]` (optional): `[{ "id": "depot", "name": "Parts depot", "kind": "actor" | "external-system", "description": "…" }]`
  for a party that discover never named; its id is then a valid `from`/`to`/producer/consumer. The validator warns
  so discover can adopt it on the next re-run.
- `integration_patterns[].relationship` references `decompose.json` `relationships[].id`; `mechanism`:
  `async-events` | `sync-api` | `shared-db` | `batch` | `in-process-call` | `none` (for `separate-ways`).

### 4.6 `organise.json` — produced by `ddd-organise`, consumed by `ddd-define` (ownership), `ddd-code` (module → deployable)

Tools: Team Topologies (team types, interaction modes, cognitive load), context maps, deployment
topology (modular monolith vs services) checked against `scale_target`.

```json
{
  "teams": [ { "id": "core-team", "name": "Core team", "type": "stream-aligned", "size": 3,
               "owns_contexts": ["ordering", "catalog"], "cognitive_load": "ok", "notes": "…" } ],
  "interactions": [ { "from": "core-team", "to": "platform-team", "mode": "x-as-a-service", "reason": "…" } ],
  "deployables": [ { "id": "core-api", "name": "Core API", "kind": "modular-monolith", "contexts": ["ordering", "catalog"],
                     "team": "core-team", "data_store": "own", "independent_deploy": true, "rationale": "…" } ],
  "topology_style": "modular-monolith",
  "deployable_count": 2,
  "scale_check": { "target_min": 1, "target_max": 3, "within_target": true, "note": "…" }
}
```

- `type`: `stream-aligned` | `platform` | `enabling` | `complicated-subsystem`. `mode`: `collaboration` | `x-as-a-service` | `facilitating`.
- `interactions[].from` is the team that consumes/needs, `to` the team that provides: `x-as-a-service` = consumer → provider;
  `facilitating` = the enabling team is `from`; `collaboration` = either order (say why in `reason`), time-boxed.
- `deployables[].kind`: `modular-monolith` | `service` | `function` | `job` | `frontend` | `library` | `gateway`.
- A client with its own release lifecycle (app-store / browser bundle) is a `frontend` deployable with `contexts: []`; the
  context it renders is owned by its server-side deployable. Optional additive `hosts_runtime_of: ["<context>"]` records
  that the client runs the context's model offline. `data_store`: `none` only for stateless units — an offline-first
  client that holds the source of truth until synced is `own`.
- Every bounded context must be owned by exactly one team and placed in exactly one deployable.
- `topology_style`: `modular-monolith` | `few-services` | `many-services`. A solo/one-team project still
  fills this in — it is where "how many deployable units" is decided.

### 4.7 `define.json` — produced by `ddd-define`, consumed by `ddd-code`

Tools: Bounded Context Canvas (v5) per context, C4 system context diagram, Quality Storming. Refines `glossary.md` per context.

```json
{
  "canvases": [ {
    "context": "ordering", "purpose": "…",
    "strategic_classification": { "domain": "core", "business_model": "revenue-generator", "evolution": "custom" },
    "domain_roles": ["execution-context"],
    "inbound":  [ { "collaborator": "customer", "relationship": "customer-supplier", "messages": [ { "id": "place-order", "kind": "command" } ] } ],
    "outbound": [ { "collaborator": "shipping", "relationship": "published-language", "messages": [ { "id": "order-placed", "kind": "event" } ] } ],
    "ubiquitous_language": [ { "term": "Order", "definition": "…" } ],
    "business_decisions": ["Orders above 10k require manual approval"],
    "assumptions": ["…"], "verification_metrics": ["…"], "open_questions": ["…"],
    "canvas_path": "ddd/07-define/ordering/bounded-context-canvas.md"
  } ],
  "system_context_c4_mermaid": "C4Context …",
  "quality_attributes": [ { "context": "ordering", "attribute": "consistency", "requirement": "…", "priority": "high", "scenario": "…" } ]
}
```

- `business_model`: `revenue-generator` | `engagement-creator` | `compliance-enforcer` | `cost-reducer`.
- `domain_roles` (from the BCC domain-roles reference): `specification-model` | `execution-context` |
  `audit-model` | `approver` | `enforcer` | `octopus` | `interchange-context` | `gateway` | `analysis-context` | `bubble-context` | `autonomous-bubble` | `brain` | `funnel` | `engagement-context` | `other`.
- One canvas per bounded context in `decompose.json`; messages reference `connect.json` ids.
- `inbound[]/outbound[].relationship`: for a bounded-context collaborator use the `decompose.json` relationship pattern; for a
  human actor use `user-interaction`; for an external system use the pattern that wraps it (`anticorruption-layer` or `conformist`).

### 4.8 `code.json` — produced by `ddd-code`, consumed by implementation (and by `ddd` for status)

Tools: Aggregate Design Canvas, hexagonal/onion architecture, design-level EventStorming / Event Modeling,
Vernon's aggregate rules, implementation pattern from `strategize.json`.

```json
{
  "language": "typescript", "framework": "…", "architecture_style": "hexagonal",
  "contexts": [ {
    "context": "ordering", "implementation_pattern": "domain-model", "deployable": "core-api", "module_path": "src/ordering",
    "aggregates": [ { "id": "order", "name": "Order", "root_entity": "Order", "entities": ["OrderLine"], "value_objects": ["Money", "Address"],
                      "invariants": ["Total equals sum of lines"], "commands": ["place-order"], "events": ["order-placed"],
                      "state_transitions": ["draft→placed→paid"], "canvas_path": "ddd/08-code/ordering/aggregate-canvas-order.md" } ],
    "domain_services": [], "application_services": [ { "name": "PlaceOrder", "command": "place-order" } ],
    "ports": [ { "name": "OrderRepository", "kind": "driven" } ], "adapters": [ { "port": "OrderRepository", "implementation": "PostgresOrderRepository" } ],
    "read_models": [], "tests": [ { "invariant": "Total equals sum of lines", "test": "…" } ]
  } ],
  "scaffold": { "generated": false, "root": "src/", "files": [] },
  "handoff": { "plan_path": "ddd/08-code/implementation-plan.md", "suggested_next": ["ddd-contracts", "superpowers:writing-plans"] }
}
```

- `architecture_style`: `hexagonal` | `onion` | `clean` | `vertical-slice` | `layered`. `ports[].kind`: `driving` | `driven`.
- Only contexts whose implementation pattern is `domain-model` or `event-sourced-domain-model` need aggregates;
  `transaction-script`/`active-record` contexts get `application_services` and a `design.md` only.
- A context whose runtime is also hosted by a `frontend` deployable (organise `hosts_runtime_of`) keeps `deployable` =
  its server-side owner and sets `module_path` to the shared domain package (e.g. `packages/job-execution/src`), with
  optional additive `also_compiled_into: ["technician-app"]`.
- A command an upstream `decision` note vetoes as aggregate material (e.g. "transaction-script glue") is recorded as an
  application service with additive `handled_by: "transaction-script"` — not an aggregate, not a lint warning.

### 4.9 `contracts.json` — produced by `ddd-contracts`, consumed by implementation

Tool: OpenMetadata-shaped data contracts (field names borrowed only where the concept matches). One entry per
message that crosses a party boundary in `connect.json`, each with a JSON Schema and a validated example, so a
producer or consumer can be built from the contract alone.

Scope is set by connect **and** organise. A boundary in connect is a boundary in the model; whether it is one in
the build is organise's answer. When `organise.deployables[].contexts` puts the producer and every consumer in a
single deployable the call never leaves the process, so it gets no entry — it is listed in `contracts.md` instead,
to be covered by a code-level test. Everything uncertain (organise not run, a party unplaced or hosted twice, an
external system or human on either end) keeps its contract.

```json
{
  "entries": [ {
    "id": "week-charged", "kind": "event", "name": "Week Charged",
    "description": "Billing has collected the week's payment; the box may be packed.",
    "entityStatus": "Draft", "version": "1.0",
    "domain": "billing", "owners": ["solo"], "consumers": ["fulfilment"], "reviewers": ["solo"],
    "pattern": "published-language", "delivery": "at-least-once", "via": "message-bus",
    "schema": "ddd/09-contracts/schemas/week-charged.schema.json",
    "example": "ddd/09-contracts/examples/week-charged.json",
    "semantics": ["Emitted at most once per (subscriptionId, week); consumers must de-duplicate on that pair"],
    "termsOfUse": "Additive changes only within version 1.x; a removed or retyped field is 2.0.",
    "glossary": "ddd/glossary.md#billing-context",
    "provenance": { "connect": "week-charged", "relationship": "R2", "flows": ["F1"] }
  } ]
}
```

- `entityStatus` (OpenMetadata): `Draft` | `In Review` | `Approved` | `Archived` | `Deprecated` | `Rejected` | `Unprocessed`.
  Auto mode leaves `Draft`.
- `domain` is the producing bounded context; `owners` is its team from `organise.json`; `consumers` are context,
  actor, external-system or `parties[]` ids from `connect.json`.
- A message to an external system gets `"inherited": true` with `owners: ["<system>"]` — the ACL boundary stays
  visible and the schema is *our* view of what we send.
- Additive keys the step may add: `client` (the human actor a UI/API contract is built for, when one end is a
  person), `channels[]` (a message carried on more than one transport: one `{via, sync?, delivery?, note?}` object
  per *extra* transport, carried over whole from `connect.json` `messages[].channels[]` — the primary stays in
  `via`/`delivery` and is never repeated here. A second transport is a second promise, so its guarantee and the
  reason it exists travel with it; flattened to a bare name it says "also via file", which no consumer can build
  against), `direction` (`outbound` for a call we make to an external system, `inbound` for one made to us).
- `semantics[]` are the producer canvas's business decisions that actually constrain this message (idempotency key,
  ordering, what a consumer may assume), not a restatement of the field list.
- Files beside `schemas/<id>.schema.json` + `examples/<id>.json`, by convention rather than by a field:
  `schemas/<id>.{request,response}.schema.json` + `examples/<id>.{request,response}.json` for the other half of a
  two-way exchange (a query's parameters, a command's reply), and `examples/<id>.invalid.json` —
  `[{"why": "<the rule this breaks>", "payload": …}]` — for payloads the contract must **reject**. Both halves are
  validated the same way; a negative case that passes is an error. Half a contract parked under a non-keyword such
  as `response` or `parameters` is silently unchecked by every validator, so a key that is not a JSON Schema
  keyword is an error at any schema position.
- `ddd validate` checks the chain (every cross-party message has an entry; schema/example files exist; ids resolve);
  `ddd contracts check` is the deep gate (examples validate against schemas, negative examples
  fail them, no `TODO`).

## 5. `glossary.md` — the ubiquitous language

Seeded by `discover`, refined by `define` (per-context meanings), read by every step. Format mirrors
a typical `CONTEXT.md`:

```markdown
# Ubiquitous language: <project>

## Shared
**Order** — a customer's confirmed request to buy. _Avoid_: basket, cart (those are pre-confirmation)

## Ordering context
**Customer** — the party placing the order (identity only; no marketing profile here).
```

Rules: one meaning per term per context; call out the words to avoid; when the same word means
different things in two contexts, that is a boundary — record it, don't unify it.

After `define` has run, the per-context sections are generated from `define.json` (the source of truth) and
are regenerated on every define render. Later steps (`code`, or any re-run) must not write inside them: add
newly coined terms under a `## Coined by <step>` section (preserved by the renderer) and record them in an
additive `coined_terms: [{term, definition, context}]` on the step's own artifact; fold them into
`define.json` on the next define re-run.

## 6. Cross-step reference rules (what `ddd validate` checks)

| Check | Severity |
|---|---|
| Common envelope present and well-formed on every step JSON | error |
| `discover.events[].triggered_by` / `commands[].produces` / `policies` reference existing ids | error |
| `decompose` events/commands/aggregates exist in `discover` | error |
| Each discover event/command owned by exactly one bounded context | warning |
| `strategize` classifies every subdomain in `decompose` | error |
| `connect` flows/messages reference known contexts, actors, external systems, relationships | error |
| `organise`: every context owned by one team and in one deployable; `deployable_count` matches; scale check | error / warning |
| `define`: one canvas per bounded context; message ids exist in `connect` | error |
| `code`: every core context has a design; aggregates reference known commands/events | error |
| `contracts`: every cross-party connect message has an entry; schema and example files exist; consumers resolve | error |
| Downstream `produced_at` older than upstream → step marked `stale` | warning |
| `decisions[]` (§3): ids unique; `chosen` is one of `options[].id`; `records.*` resolve; `supersedes` resolves | error |
| `decisions[].options[].diagram` path exists | warning |

Run: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate [<ddd-dir>] [--step <name>] [--status] [--strict] [--json] [--no-notes]`.

## 7. Re-runs and edits

- Re-running a step reads its own previous JSON and **updates in place**: keep existing ids, add new
  ones, mark removed things in the envelope's optional `deprecated` list
  (`[{"id": "…", "collection": "events", "reason": "…", "since": "<ISO date>"}]`) rather than deleting silently.
  `collection` names any list in the artifact — `events`, `relationships`, `open_questions` (answered),
  `assumptions` (retired) — so downstream steps can see what disappeared and why.
- A draft artifact that was written but never marked `done` (an interrupted run) still counts: its ids
  are committed and a later run updates it in place under the same rules.
- Stamp `produced_at` after writing: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp ddd/<NN-step>/<step>.json`
  (sets it to now, UTC, `YYYY-MM-DDTHH:MM:SSZ`; several files may be given at once).
- After any upstream change, run `ddd validate --status`; downstream steps show `stale` and should be
  re-run (or explicitly re-confirmed with `ddd mark --dir <ddd-dir> <step> done`).
- Users may hand-edit the Markdown. If Markdown and JSON disagree, the JSON is the chain — the skill
  should reconcile by asking (interactive) or by trusting the Markdown and regenerating JSON (auto).
