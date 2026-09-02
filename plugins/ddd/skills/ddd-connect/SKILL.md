---
name: ddd-connect
description: Use when the user asks how bounded contexts, modules or services should talk to each other — message flows, "how do the contexts/services communicate", integration between bounded contexts, sequence diagrams across services, sync vs async, events vs API calls, domain message flow modelling, published language / event contracts / API contracts, transactional outbox, saga or process manager, a coupling review — or is continuing the DDD process after ddd-strategize. STEP 5 of the 9-step ddd-* chain (understand → discover → decompose → strategize → connect → organise → define → code → contracts) - consumes ddd/03-decompose/decompose.json (contexts, relationships), ddd/04-strategize/strategize.json (investment) and ddd/02-discover/discover.json (scenarios, policies, commands, events) and produces ddd/05-connect/connect.json + message-flows.md (numbered message flow per scenario as a mermaid sequence diagram, message catalogue, one integration decision per context-map relationship, coupling concerns), consumed by ddd-organise, ddd-define and ddd-code. Runs interactively (two checkpoints, at most 4 questions each) or in auto mode (no questions, assumptions logged). To run the whole process end to end use ddd-workflow.
---

# ddd-connect — design how the bounded contexts collaborate

The context map from `ddd-decompose` says *that* two contexts relate and in which direction. This step
says *how*: for each key end-to-end scenario, which messages (commands, events, queries) flow between
which contexts, actors and external systems, in what order, synchronously or not, over what mechanism —
and it surfaces the coupling problems (sync chains, chatty flows, distributed transactions, shared data)
before anyone builds them. It is step 5 of the DDD Starter Modelling Process chain
(`ddd-understand → ddd-discover → ddd-decompose → ddd-strategize → **ddd-connect** → ddd-organise → ddd-define → ddd-code`),
orchestrated end to end by `ddd-workflow`. Tools: Domain Message Flow Modelling (ddd-crew), process-level
EventStorming policies, sequence diagrams. Method and sources: `references/message-flow-method.md`.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's: `ddd connect inputs` (lists what must be connected) and `ddd connect render` (renders mermaid + `message-flows.md` from `connect.json`, and lints coupling).
- The contract and protocol, read once per session: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md`
  (§3 envelope, §4.5 connect, §4.2–4.4 inputs) and `${CLAUDE_PLUGIN_ROOT}/shared/references/modes.md`.
- Use absolute paths in every command: the working directory does not persist between Bash calls.

## Inputs & Outputs

Inputs (paths relative to the project root; `ddd/` may be overridden by `manifest.ddd_dir`):

| Read | For |
|---|---|
| `ddd/03-decompose/decompose.json` (+ `subdomains.md`) | bounded contexts, event/command ownership, relationships with patterns |
| `ddd/02-discover/discover.json` (+ `event-storm.md`) | scenarios, policies (`when` → `then`), commands, events, actors, external systems, read models, hotspots |
| `ddd/04-strategize/strategize.json` | core/supporting/generic, sourcing, investment — core contexts get the most careful contracts |
| `ddd/manifest.json` | `mode`, `depth`, `scale_target` (1–3 deployables → in-process by default; 10–20 → real async integration) |
| `ddd/01-understand/understand.json`, `ddd/glossary.md` | existing systems, actor kinds, vocabulary (optional) |

Outputs (exact):

- `ddd/05-connect/connect.json` — contract §4.5 + envelope §3: `flows[]`, `messages[]`,
  `integration_patterns[]`, `coupling_concerns[]`, `assumptions[]`, `open_questions[]`.
- `ddd/05-connect/message-flows.md` — rendered from the JSON: one section per flow with a mermaid
  `sequenceDiagram` and step table, the message catalogue (producer, consumers, kind, payload,
  delivery, contract type), one integration decision per relationship, the coupling-concerns list.
- `ddd/manifest.json` updated through `ddd mark` (never by hand).

## Workflow

Follow `modes.md` §0–§4: draft first, then ask; at most 4 questions per checkpoint; if the user says
"just finish it" switch to auto for the rest and log the unasked questions as `open_questions[]`.
Print the checkpoint status lines in both modes.

### 0. Resolve workspace, mode, depth, predecessors (modes.md §0)

1. `DDD` = the user's stated folder > `ddd_dir` in `./ddd/manifest.json` > `./ddd`. Print the absolute path.
2. Mode: user said "auto" / "no questions" / "just draft", or you are a subagent or run by `ddd-workflow`
   without a human → `auto`; else `manifest.mode`; else `interactive`. Depth from the manifest.
3. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate "$DDD" --status`. No manifest →
   `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir "$DDD" --project <slug> --mode <mode> --depth <depth>`
   first (`ddd mark` needs it). Decompose and discover are required; strategize is strongly wanted. Missing → modes.md §0: interactive offers "run it now / bootstrap
   from docs / stop"; auto invokes the predecessor skill (or follows its SKILL.md) and continues. A `stale`
   predecessor → warn; interactive asks whether to proceed.
4. If `$DDD/05-connect/connect.json` already exists this is a re-run: keep every existing id, add new ones,
   and list removed flows/messages/concerns in the envelope's `deprecated[]`
   (`{ "id", "collection", "reason", "since" }`) instead of deleting them; if `message-flows.md` was
   hand-edited, reconcile first (interactive: ask which wins; auto: trust the Markdown, then regenerate).

### 1. Gather (both modes)

1. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs connect inputs "$DDD"` — prints the distance hint, the
   **upstream notes addressed to connect/organise**, contexts with classification and ISH verdict, ownership
   map, **cross-context policies** (integration points), scenarios with the contexts they touch, relationships
   with a proposed distance + mechanism (a note saying "own deployable" / "module inside" wins, then ISH
   verdicts, then the scale target), external systems, read models, boundary hotspots, the party ids you may use.
2. Read the JSON inputs above plus `subdomains.md` (context map), `event-storm.md` (timeline), `glossary.md`,
   and any `manifest.sources` / repo docs that describe integrations (API specs, queue names, ADRs).
   Existing integration vocabulary in the repo is evidence; do not invent synonyms.
3. Anything the user pasted (a sequence diagram, "billing must be synchronous").

**Checkpoint 1 — inputs check** (one message, no wait in auto): what you read; mode/depth/scale and the
distance hint; the cross-context policies found; the scenarios you will draw and why; anything
surprising (a policy crossing contexts that have no relationship in the map, orphan events).

### 2. Choose scenarios and draft the flows

1. Pick the flows for the depth budget: `light` 2–3, `standard` 4–7, `deep` 5–9 including failure paths.
   Order of pick: the discover happy path(s) → alternatives that cross a boundary → one flow per
   cross-context policy not yet covered → the failure path behind each boundary hotspot (all of them at
   deep; at light/standard only while the budget has room).
   A flow not backed by a discover scenario gets `"scenario": null` and `kind: policy|failure`.
2. For each flow write the numbered steps (ddd-crew's five-step loop: sender → message → recipient →
   place → repeat). Decide per step: `kind`, `sync`, `via` using `references/integration-decisions.md`
   §3. Keep 5–9 messages per flow: an oversized scenario becomes several flows that share its `scenario`
   id, split at pivotal events (or at the hand-off between contexts), each `summary` naming where the
   previous part ended; if it still will not fit, the boundary is wrong — record a concern.
3. Decide where each cross-context policy lives (method §3): downstream subscribes to the upstream event
   (default) or upstream sends a command (only when it needs the outcome to continue).
4. Draft `$DDD/05-connect/connect.json` (skeleton under Output rules) with steps, the catalogue,
   one `integration_patterns[]` entry per relationship with `assumed_distance`, and the concerns.
5. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs connect render "$DDD" --write-mermaid --check`.
   Fix every ERROR; fix or justify every WARN (a justified one becomes a concern or assumption); re-run
   until `RESULT: OK`. Never hand-write the `mermaid` strings.
6. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> connect draft --mode <mode>` — draws
   `<ddd-dir>/diagrams/flow-<flow id>.png`, one per flow (and rebuilds the review page). Read them before
   checkpoint 2: a three-hop synchronous chain, or an event reaching a context it should not, is easier
   to see than to read. `ddd review <ddd-dir>` redraws them on demand after later edits.

**Checkpoint 2 — flows review** (interactive): present each flow — diagram + step table — in sections of
150–300 words, then ask at most 4 questions across the batch, only where a real decision exists:
does the caller need the answer now (sync) or can it react later (async)? which context should host
policy P? is an alternative path missing (declined payment, out of stock)? is this data really needed here
(query vs replicated read model)? Use `AskUserQuestion` with concrete options. Auto: print the same
section headers as status lines and record every such question in `open_questions[]`.

### 3. Integration decisions and coupling review

1. For every relationship in `decompose.json` fill `mechanism`, `assumed_distance`, `rationale` from the
   pattern × distance table (`references/integration-decisions.md` §2). Core contexts (strategize) get
   contract coupling — published language or open-host service — and versioned messages.
2. Complete the catalogue: every message used in any step, including actor commands and external-system
   calls (they become ports/adapters in `ddd-code`); `payload` minimal; `delivery` honest; `idempotency`
   for at-least-once; `version` for published contracts; `response_payload` on queries; a message that
   travels two ways (per-item API call and a nightly batch file) keeps the primary channel in `delivery`
   and the steps' `via` and lists the other in `channels[]`. A query's `producer` is the context that
   *answers* (it owns the data) and its `consumers` are the askers — contract §4.5, "Query direction".
3. Walk `references/coupling-smells.md` over the flows; write `coupling_concerns[]` with `severity`,
   `smell`, `flows`, `mitigation`. Do not fix a boundary here — record it and let the human re-run decompose.
4. Deep: for each long-running or compensating flow add a `sagas[]` entry (choreography vs orchestration,
   owner, trigger, steps, compensations, timeouts) and draw its failure path as its own flow. Standard and
   light: do not design it — when a flow needs a branch, a timeout or a compensation, record a concern with
   `smell: event-should-be-command` (or `distributed-transaction`) and `saga_candidate: true`.

**Checkpoint 3 — decisions review** (interactive): the decisions table and the concerns, then at most
4 questions: assumed distances (will fulfilment really be separate?), can we tolerate losing message M
(delivery), which context owns external system X, accept concern CC-n or go back to decompose?
Auto: log the answers you assumed as `assumptions[]` with confidence.

### 4. Write, validate, mark, summarise

**Checkpoint 4 — final confirmation** (interactive; a status line in auto): the `assumptions[]` and
`open_questions[]` you are about to record and the two paths you will write. Then write.

1. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp "$DDD/05-connect/connect.json"` — sets
   `produced_at` once the JSON is written (never by hand; it must be newer than strategize; run it again
   after any later edit).
2. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs connect render "$DDD" --write-mermaid --write-md --check`
   → `message-flows.md` (keeps `produced_at`). If you coined a name (a query, a read model, a party), add
   it to `ddd/glossary.md` under the owning context and record an assumption.
3. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate "$DDD" --step connect` — the
   `validated connect:` line must show 0 errors; warnings for minted ids and `parties[]` are expected,
   carry them into the summary. Staleness warnings on *downstream* steps after a re-run are expected.
4. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir "$DDD" connect done --mode <mode>`
   (artifacts and the open-question count are derived from the step folder and JSON) — use `draft`
   instead of `done` if the user stopped early or a `blocking: true` question remains.
5. Closing summary a reader can act on: absolute paths written; flows drawn (ids + names); mechanism per
   relationship; the 3–6 most important findings ("R2 async via outbox; F1 has a 3-hop sync chain — CC1");
   open questions; validator result; and the next step: **`/ddd-organise`** (or "run `ddd-workflow` to continue").

## Method

The rules that decide most steps (full reasoning and sources in `references/message-flow-method.md`):

- **Policies are integrations.** A discover policy whose `when` event and `then` command live in different
  contexts must appear in a flow. The context that owns the business rule hosts the policy.
- **Distance decides the mechanism.** Same deployable → in-process call or in-memory domain event
  (`via: in-process`). Different deployables → events via an outbox by default (`message-bus`,
  `at-least-once`, idempotent consumers); a synchronous API only when the caller genuinely needs the
  answer to continue. Never a shared database. Record the distance you assumed; `ddd-organise` confirms it.
- **Prefer the weaker obligation.** Event over command when the sender does not need the outcome; query
  over replicated data when freshness matters and the volume is low; replicated read model when the
  downstream must work while the upstream is down. "Should this command be an event?" is the review question.
- **Contracts belong to the upstream.** A published language is a versioned event/API contract crafted
  for consumers, not the internal model. Evolve it additively; bump the version only on a breaking change.
  A downstream that must not be shaped by the upstream adds an anticorruption layer (stateless adapter, or
  stateful translation with its own storage).
- **Be honest about delivery.** In-memory events are at-most-once; outbox + broker is at-least-once and
  needs de-duplication; "exactly-once" is at-least-once plus idempotent consumers. In a monolith, one
  command = one transaction is a legitimate default — do not add eventual consistency unless it solves a problem.
- **Long-running flows** are sagas (linear event → command chains) or process managers (own state,
  branches, timeouts); every step is a local transaction with a compensation, never a distributed transaction.
- **Coupling review:** integration strength (contract < model < functional < intrusive) should fall as
  distance grows; a volatile core upstream always gets contract coupling. Flag sync chains ≥ 3 hops,
  chatty flows (> 9 messages, repeated round trips), distributed transactions, bidirectional dependencies,
  data-hungry payloads.

Good vs bad, in one glance (full versions in `references/integration-decisions.md`):

```
BAD  customer ->> ordering ->> billing ->> fulfilment   (three nested sync hops; nobody orders if fulfilment is down)
GOOD customer ->> ordering  (sync: orderId)   ordering -) billing: order-placed   billing -) fulfilment: order-paid

BAD  order-placed payload: customer name, e-mail, marketing prefs, every recipe's ingredients …
GOOD order-placed payload: orderId, customerId, lines[recipeId, qty], total{amount, currency}, placedAt  (version 1)
```

## Output rules

`connect.json` — contract §4.5 + envelope §3 (full annotated skeleton: `references/message-flows-template.md`):

```json
{ "schema_version": 1, "step": "connect", "produced_by": "ddd-connect",
  "produced_at": "<set by ddd stamp after writing — must be newer than strategize>",
  "mode": "auto|interactive", "depth": "<manifest depth>",
  "inputs": ["ddd/03-decompose/decompose.json", "ddd/04-strategize/strategize.json", "ddd/02-discover/discover.json", "ddd/manifest.json"],
  "assumptions": [{ "id": "A1", "text": "…", "confidence": "low|medium|high" }],
  "open_questions": [{ "id": "Q1", "text": "…", "blocking": false, "owner": "…" }],
  "notes_for_downstream": [{ "id": "N1", "text": "new finding for a later step, or 'sharpens decompose N2: …'", "for": ["organise"], "kind": "decision" }],
  "parties": [{ "id": "depot", "name": "Courier depot", "kind": "actor|external-system", "description": "optional — a party discover never named (contract §4.5)" }],
  "flows": [{ "id": "F1", "name": "…", "scenario": "S1 | null", "kind": "happy-path|alternative|policy|failure",
              "summary": "…", "policies": ["<discover policy id>"],
              "steps": [{ "seq": 1, "from": "<party>", "to": "<party>", "message": "<id>", "kind": "command|event|query|response",
                          "sync": true, "via": "http|grpc|message-bus|in-process|file|db|other", "note": "optional", "when": "optional condition" }],
              "mermaid": "<filled by ddd connect render --write-mermaid>" }],
  "messages": [{ "id": "<discover command/event id, or new kebab-case query id>", "kind": "command|event|query",
                 "producer": "<party>", "consumers": ["<party>"], "contract": "published-language|customer-supplier|open-host-service|conformist|anticorruption-layer|shared-kernel|partnership|external-api|ui",
                 "payload": ["…"], "delivery": "sync|at-most-once|at-least-once|exactly-once",
                 "idempotency": "…", "version": "1", "response_payload": ["…"],
                 "channels": [{ "via": "file", "sync": false, "delivery": "at-least-once", "note": "optional secondary channel" }] }],
  "integration_patterns": [{ "relationship": "R1", "mechanism": "in-process-call|async-events|sync-api|batch", "assumed_distance": "same-deployable|separate-deployable", "rationale": "…" }],
  "coupling_concerns": [{ "id": "CC1", "text": "…", "contexts": ["<bounded-context ids only>"], "severity": "low|medium|high", "smell": "<coupling-smells id>", "flows": ["F1"], "mitigation": "…", "saga_candidate": false }],
  "sagas": [],
  "deprecated": [{ "id": "F3", "collection": "flows", "reason": "…", "since": "<produced_at of the re-run>" }] }
```

Ids and references (the validator enforces the first three as errors):

- `steps[].from` / `to`, `messages[].producer` / `consumers` — only bounded-context ids (decompose), actor ids
  (discover/understand), external-system ids (discover) or ids you declare in `parties[]`. A party discover never
  named (a depot, a scanner) goes in `parties[]` with kind, name and description — never a borrowed stand-in id;
  the validator's "ask ddd-discover to adopt" warning is expected. `coupling_concerns[].contexts` — bounded-context ids only.
- `integration_patterns[].relationship` — a decompose relationship id; every relationship gets exactly one entry.
  `separate-ways` → `mechanism: "batch"`, rationale "no runtime integration", extra key `"integration": "none"`.
- Flows `F1, F2 …`; concerns `CC1, CC2 …`; assumptions `A1 …`; questions `Q1 …`; sagas `SG1 …`.
- Commands and events **reuse discover ids** when discover has one. When an upstream note or a flow needs a
  command/event discover lacks (a second outbound call, a failure event), mint a kebab-case id in domain
  language, catalogue it, log an assumption and an open question asking discover to adopt it — the
  validator's "not present in discover" warning is expected. Never reuse another message's id as a stand-in.
- Queries get **new kebab-case ids** in domain language (`stock-availability`, not `get-stock-query`) that
  collide with no discover **event or command** id — those two collections only; a query may reuse a discover
  read-model id (*lint*).
- A response step reuses the id of the query/command it answers with `kind: "response"`; it is not a separate
  catalogue entry — the query's `response_payload` documents it.
- Every step message has a catalogue entry (actor commands and external-system calls included).
- `sync: true` never with `via: message-bus`; events are `sync: false`; `via: db` between two contexts is forbidden.
- `flows[].scenario` is a discover scenario id or `null`; `steps[].seq` runs 1..n without gaps.
- The Markdown is rendered from the JSON; the JSON is the chain (contract §7). Re-runs never rename ids; removals go to `deprecated[]`.
- Notes: follow every upstream `notes_for_downstream[]` addressed to connect and never re-emit one you merely
  comply with (its author already addressed the later steps). Write a note only for a new finding a later step
  needs, or to sharpen/overrule an upstream note — then cite its id ("sharpens decompose N2").

Depth: `light` = 2–3 flows, catalogue, decisions; `standard` = 4–7 flows + coupling review (saga candidates
flagged, not designed); `deep` = 5–9 flows plus `sagas[]` and failure-path flows for each boundary hotspot.

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. The draft mark in Workflow §2.6 draws
`<ddd-dir>/diagrams/flow-<flow id>.png` (one per flow) as soon as the JSON exists; Read it before the checkpoint that settles the message flows and integration mechanisms:
the Read tool renders PNG, not SVG, and it is the same picture the human reviewer sees. No PNG means
no Chrome was found; the SVG is still on the page and the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `connect.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. For an integration decision (sync vs async, which mechanism, who calls whom), draw the options first: write one diagram spec per option at
`<ddd-dir>/05-connect/decisions/<Did>-<opt>.json` (format `ddd-diagram-spec`; copy
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-C.sequence.json` (a flow) and edit its nodes and edges, or
hand it a blueprint architecture or sequence JSON), point `options[].diagram` at it, run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>` (`<step>:<Did>` when
another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png` before choosing.

## Self-review checklist

Before marking the step, confirm each line (the lint covers the ones marked *lint*):

- [ ] `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
      `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
      If a reader cannot follow it, they cannot catch what this step got wrong
- [ ] Every cross-context policy is realised in at least one flow (*lint*); every relationship has a decision
      with `assumed_distance` and a rationale (*lint*).
- [ ] Flows follow the depth budget; each has 5–9 messages (*lint*), a happy path exists, and every flow
      that has no discover scenario says why in `summary`.
- [ ] Commands/events reuse discover ids or are minted with an assumption + open question; queries collide with
      no event/command id; responses reuse the request id (*lint*); unknown parties are declared in `parties[]`.
- [ ] Every step message is catalogued with producer, consumers, kind, payload, delivery, contract (*lint*);
      published-language / open-host-service messages carry `version`; at-least-once carries `idempotency`.
- [ ] No sync chain ≥ 3 hops without a `coupling_concerns` entry (*lint*); no shared database (*lint*);
      external systems are called only by their owning context; no external call inside a transaction.
- [ ] Payloads are thin: ids plus what the named consumers need; no other context's whole aggregate.
- [ ] Core contexts (strategize) use contract coupling; concerns have severity, smell, flows, mitigation and
      name only bounded contexts in `contexts` (*lint*).
- [ ] Every guess is in `assumptions[]`; every unasked question in `open_questions[]`; `blocking: true`
      → status `draft`; no pass-through upstream note re-emitted.
- [ ] `ddd connect render --check` → `RESULT: OK`; `ddd stamp` run; `ddd validate --step connect` →
      `validated connect: 0 error(s)` (minted-id / `parties[]` warnings expected); `ddd mark` run;
      the summary names `/ddd-organise`.
- [ ] The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Next step hand-off

- **`/ddd-organise`** reads `integration_patterns[].assumed_distance`, the sync chains and
  `coupling_concerns[]` to group contexts into teams and deployables (contexts joined by sync chains or
  high-severity concerns usually share a deployable; async-only pairs can be split) and checks the count
  against `scale_target`. It may flip an assumed distance — then re-run this step (`stale`) and update
  `via`/`mechanism` accordingly.
- **`/ddd-define`** builds each Bounded Context Canvas's inbound/outbound sections from `messages[]`
  (producer/consumers + `contract`) — keep the catalogue complete.
- **`/ddd-code`** derives driving ports (inbound commands/queries), driven ports (outbound calls, external
  systems) and published events from the catalogue, and the outbox/idempotency needs from `delivery`.
- Run `ddd-workflow` to continue the chain or `ddd validate "$DDD" --status` to see where you are.
