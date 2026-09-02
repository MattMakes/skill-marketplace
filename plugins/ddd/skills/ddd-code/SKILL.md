---
name: ddd-code
description: "Use when the user wants tactical DDD for a designed system: aggregates and an Aggregate Design Canvas, entities / value objects / invariants, repositories and ports, hexagonal (ports and adapters) architecture for a bounded context, a domain-model implementation, 'turn the design into code structure', an implementation plan from the DDD design, or is continuing after ddd-define. Step 8 of the DDD Starter Modelling Process chain ddd-understand → ddd-discover → ddd-decompose → ddd-strategize → ddd-connect → ddd-organise → ddd-define → ddd-code → ddd-contracts (run ddd-workflow for the whole process). Consumes ddd/07-define/define.json plus the bounded-context canvases and the strategize/connect/organise/discover JSON; produces ddd/08-code/code.json, a design.md per context, aggregate-canvas-<id>.md per aggregate (domain-model contexts only) and implementation-plan.md; hands off to ddd-contracts (step 9, message payload schemas) and then superpowers:writing-plans / dev-create-plan and TDD. Designs and plans — never scaffolds source files unless explicitly asked."
---

# ddd-code — tactical design and implementation plan (step 8 of 9)

Turn the defined bounded contexts into a tactical design that a developer or a coding agent can
implement without re-deriving anything: aggregates (only where `strategize` chose a domain model),
value objects, true invariants, one application service per command, ports and adapters, the
events each context publishes and consumes, read models, named tests, a module layout aligned to
the deployables, and an ordered core-first implementation plan. This is the last step of the chain
`ddd-understand → … → ddd-define → ddd-code` (orchestrated by `ddd-workflow`). The design and the
plan are the deliverable; scaffolding source files is opt-in and off by default. The plan hands
off to `superpowers:writing-plans` / `dev-create-plan`, then TDD.

Read once per session: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md` (§4.8 is
this step incl. `also_compiled_into` / `handled_by`; §4.2–4.7 its inputs; §5 the glossary rule) and
`…/modes.md` (facilitation protocol). Method detail lives in `references/` — `aggregate-design.md`,
`architecture-and-modules.md`, `event-sourcing.md`, `templates/*.md`, `lang-<language>.md`.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's: `ddd code prefill` (briefs. under `08-code/.prefill/`, repo detection, first-cut
  `code.json`) and `ddd code check` (deliverable lint; removes `.prefill/` once it passes).
- A `ddd/` workspace whose `07-define/define.json` exists — otherwise modes.md §0 applies.
- Read access to the repo to detect language, framework, ORM/bus and folder conventions. No network.

## Inputs & outputs

Inputs (paths relative to the project root; `ddd/` may be overridden by `manifest.ddd_dir`):
`ddd/07-define/define.json` + every `ddd/07-define/<context>/bounded-context-canvas.md`,
`ddd/04-strategize/strategize.json` (implementation pattern per subdomain — decides whether a
context gets aggregates), `ddd/05-connect/connect.json` (messages → ports, adapters, contracts),
`ddd/06-organise/organise.json` (deployables → module paths; `hosts_runtime_of`),
`ddd/02-discover/discover.json` (command/event/read-model/policy ids you must reuse, aggregate
candidates), `ddd/03-decompose/decompose.json` (context ownership), upstream `notes_for_downstream`
addressed to `code`, `ddd/glossary.md`, `ddd/manifest.json`, and the repo.

Outputs (exact paths):
- `ddd/08-code/<context-id>/design.md` — for **every** bounded context (bought/generic contexts get
  the ACL/adapter design only).
- `ddd/08-code/<context-id>/aggregate-canvas-<aggregate-id>.md` — one per aggregate, only in
  `domain-model` / `event-sourced-domain-model` contexts.
- `ddd/08-code/implementation-plan.md` — ordered vertical slices, core first, ending in the hand-off.
- `ddd/08-code/code.json` — contract §4.8 + envelope §3; `scaffold.generated` is `false` unless
  scaffolding was explicitly requested; `coined_terms[]` for any noun you coined (§5).
- `ddd/glossary.md` — touched only to add a `## Coined by ddd-code` section, and only if you coined a term.
Then `ddd validate <ddd-dir> --step code` must pass and `ddd mark … code done` records it.

## Workflow

Follow modes.md §0–§4. Print each checkpoint as a short status line even in auto mode.

### 0. Resolve workspace, mode, depth
1. Workspace: user instruction > `ddd_dir` in `./ddd/manifest.json` > `./ddd`. Print the absolute path.
2. Mode: "auto" / "no questions" / "just draft" → `auto`; you are a subagent or `ddd-workflow` runs
   you non-interactively → `auto`; else `manifest.mode`; else `interactive`.
3. Depth from the manifest (`light` | `standard` | `deep`) — see "Depth scaling".
4. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status` (read the upstream
   notes block once; `--no-notes` on every later run). `define.json` missing: interactive → offer to
   run `ddd-define`, bootstrap from the canvases the user has, or stop; auto → invoke `ddd-define`
   (Skill tool) or follow its SKILL.md yourself, then continue. `define` stale → warn (interactive: ask).
5. Scaffolding flag: only if the user's message, the manifest notes or the orchestrator's prompt
   explicitly asks for scaffolding/skeleton/stubs. Otherwise it is off — do not ask in auto mode.

### 1. Gather (both modes)
- `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs code prefill <ddd-dir> --detect` → language, framework,
  ORM, bus, test framework, existing `src/…` dirs, plus a `hint` when the README, the manifest notes
  or an understand `constraint` names a stack. Brownfield: also list the top-level folders and one
  existing module to mirror its naming.
  **Language, ranked, and never inferred.** Detected code wins. Failing that, a stack a human
  *stated* — in the README, the manifest notes or an understand `constraint` — counts as an
  instruction (medium-confidence assumption, no question). Failing that, in interactive mode ask at
  checkpoint B; in auto mode set `language: "undecided"`, keep every path and name in the artifact
  neutral (`<context>/domain/…`, no file extensions, no framework types), and raise **one blocking
  open question** owned by the user.
  What you must not do is *derive* the language from a document that does not state it. A real run
  reasoned "the trace contract uses raw OpenTelemetry keys, so there is no OpenInference SDK, so the
  platform must be C#", recorded it at `high` confidence, and then wrote C# into every module path,
  port name and test name — while the repo's own docs said C# was a language the system *parses*,
  never one it is built in. The plan had to be rewritten rather than edited. A chain of plausible
  inferences is not a statement, and a language is not the kind of thing to be quietly right about:
  it decides every path in the artifact, so being unable to name it is fine and naming the wrong one
  silently is not. The same rule holds for any other foundational cross-cutting choice you would
  have to invent — framework, datastore, cloud (modes.md §3).
- Read `define.json` and every canvas, then strategize, connect, organise, discover, decompose,
  `glossary.md`, `manifest.sources` and the upstream notes addressed to `code` (the pre-fill lists
  them). On a re-run read the existing `code.json` and keep its ids.
- Checkpoint 1 (inputs check): one message — what you read, language/framework detected, the
  implementation pattern per context, deployables, anything contradictory (e.g. a domain-model
  context with no aggregate candidate). Ask only if something is contradictory.

### 2. Pre-fill per context (deterministic)
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs code prefill <ddd-dir>` writes one brief per bounded
context to `<ddd-dir>/08-code/.prefill/<context>.md` (≤ ~15 KB, wrapped, nothing repeated) and
prints a one-screen index — read the briefs one at a time, core first (`--context <id>` regenerates
one, `--print` echoes it, `--format json` prints the same facts as JSON). A brief holds everything
the design needs from upstream: pattern/type (most demanding subdomain wins; mixed flagged),
deployable, team and any frontend hosting its runtime, owned commands/events, aggregate candidates
(names cleaned of parentheticals; root = discover id), policies, every message edge in/out with its
transport decided per (producer → consumer) edge (flow step > relationship's integration decision >
deployables), external systems (callers that *initiate* a command/event only — `response` steps
never count), local read models vs queries to other contexts (driven ports), vocabulary, decisions,
quality attributes, hotspots, coupling concerns and the upstream notes naming it. A **Warning**
appears only for an edge genuinely in-process across deployables.
Then `ddd code prefill <ddd-dir> --skeleton --out <ddd-dir>/08-code/code.json [--language L --framework F --db D]`
writes a first-cut `code.json`: envelope, module paths (shared package + `also_compiled_into` where
a frontend hosts the context), one application service per command, ports/adapters justified by the
edges (one consumer/publisher adapter per transport), contract tests (payload from connect, else the
canvas, else `payload: TBD — ask ddd-connect` + an open question) and idempotency tests. It leaves
`invariants`, `value_objects`, `entities`, `state_transitions`, `source_events` and invariant tests
empty — those are yours. A re-run merges with the existing `code.json` (ids, filled fields, extra ports/adapters/tests, assumptions and open questions survive).
Then `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> code draft --mode <mode>`: it draws
`<ddd-dir>/diagrams/aggregates-<context>.png` from the skeleton (and rebuilds the review page). Read them
before checkpoint A — a duplicated gateway port, or a clock modelled as a webhook, is easier to see than
to read, and the skeleton makes both mistakes (shared/README.md, Known rough edges). `ddd review <ddd-dir>`
redraws them on demand after later edits.

### 3. Draft (both modes)
Per context, in this order: (a) implementation pattern → which shape (see Method); (b) aggregates
for domain-model contexts: fill the canvas sections from `references/templates/aggregate-canvas.md`
using `references/aggregate-design.md`; a candidate an upstream `decision` note vetoes as aggregate
material is not one — the note wins: its commands become application services with `handled_by:
"transaction-script"` and the candidate goes to `deprecated[]` (`collection: "aggregate_candidates"`,
reason citing the note), yes even on a first run; (c) application services, ports, adapters from
the skeleton — rename gateways by purpose, add `Clock`/`IdGenerator` when an invariant depends on
time or identity, every port justified by a message row or such an infrastructure need; (d) read
models with their `source_events` — only those this context owns (a query to another context is a
driven gateway); (e) tests — one named test per invariant and per state transition, `contract:
<event>` per published event, `idempotent: <event>` per at-least-once consumption; `design.md` §6
names what handles each consumed event (policy | projection | process-manager) — a canvas may show
an event as outbound *and* "no consumer known" when the consumer was added at define time: trust
the outbound row; (f) `design.md` from `references/templates/design.md`. Then the plan from
`references/templates/implementation-plan.md`.

### 4. Checkpoints (interactive) — ≤4 questions each
- **A. Aggregates & invariants (core contexts first).** Show each canvas's name, boundary,
  invariants, transitions, commands → events in ~200 words. Ask about: which listed rules are true
  invariants vs validation/policies; a boundary you are unsure of (split/merge); a missing state
  or rejected transition; the corrective policy for the riskiest eventual-consistency gap.
- **B. Module layout & plan.** Show module paths per deployable, ports per context, slice order.
  Ask about: language/framework/persistence if not detected; the folder convention if brownfield;
  the first slice; whether to scaffold (only here, never in auto).
- **Final confirmation.** Assumptions and open questions you will record, the files you will write.
"Looks good"/"continue" → stop asking. "Just finish it" → auto for the rest, unasked → `open_questions`.
Auto mode: no questions. Print the same three lines as status; take the conservative option (fewer,
smaller aggregates; modular-monolith module paths; `domain-model` never upgraded to event-sourced);
every guess → `assumptions[]` with confidence; every unasked question → `open_questions[]`.

### 5. Write
`ddd/08-code/<context>/design.md` for every context, canvases for every aggregate, the plan, and
`code.json` (edit the skeleton in place; `ddd stamp` after the last edit keeps `produced_at` newer
than define's). A domain noun you coined (a value object or aggregate not in the glossary) goes
under a `## Coined by ddd-code` section at the end of `ddd/glossary.md` (`**Term** — definition
(context: <id>)`) — never inside the generated per-context sections, which define's renderer
regenerates — and into `code.json` `coined_terms: [{term, definition, context}]` plus an
assumption; technical names (ports, adapters) do not go there.
Scaffolding (only when explicitly requested): the folder skeleton from each `design.md` §1, interface/type
stubs for ports, value objects and the aggregate root signature, and the failing tests named in `design.md`
§9 — **never business logic**; list every file in `scaffold.files`, set `scaffold.generated: true` and `scaffold.root`.

### 6. Validate
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs code check <ddd-dir>` (fix errors, read warnings; `i` lines
are accepted exceptions such as `handled_by`; on success it removes `08-code/.prefill/`), then
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp <ddd-dir>/08-code/code.json`, then
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step code --no-notes` — the gate is its `validated code: N error(s), M warning(s)` line. Errors → fix, re-run; warnings → summary.

### 7. Mark
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> code done --mode <mode>` —
artifacts (every file under `08-code/`) and the open-question count are derived; never pass `--artifacts`
(glossary changes live in `coined_terms[]`, not as an artifact). `draft` instead of `done` if the user stopped early or a blocking question remains in auto mode.

### 8. Close
One message: absolute paths written; 3–6 findings (contexts designed, aggregates and invariant
counts, ports per context, first slice); open questions (blocking ones quoted); validation result; then
exactly: **"next: run superpowers:writing-plans / dev-create-plan on ddd/08-code/implementation-plan.md, then TDD (superpowers:test-driven-development / dev-tdd)"**.

## Method

### Per implementation pattern (from `strategize.json`, via the context's subdomains)
| Pattern | You produce | You do not produce |
|---|---|---|
| `transaction-script` | `design.md`: one use case per command as a vertical slice, a `<Context>Store` driven port, policies as handlers, tests through the store (reversed pyramid) | aggregates, domain layer |
| `active-record` | `design.md`: records with persistence + simple behaviour, use cases orchestrating them, tests | aggregates |
| `domain-model` | `design.md` + one aggregate canvas per aggregate; repositories per aggregate; domain tests per invariant (pyramid) | ORM/framework types in `domain/` |
| `event-sourced-domain-model` | as domain-model + event streams, fold, projections per read model, upcasting notes (`references/event-sourcing.md`); test diamond | mutable state persistence |

Bought/generic contexts (`sourcing: buy`): `design.md` is the ACL — the gateway port, the translation
table vendor model → our terms, failure modes, and the events we still publish. A context spanning
subdomains with different patterns takes the most demanding one (say so in an assumption). Never silently change a pattern: disagreeing with strategize is an open question.

### Aggregates (details and sources: `references/aggregate-design.md`)
- One aggregate instance per transaction; the root enforces the invariants; reference other
  aggregates by id; everything that spans aggregates is eventually consistent through a policy.
- Protect **true invariants only**. Ask "whose job is it?" — the user issuing this command →
  transactional; another user or the system → eventual, with a corrective policy. Good: "A week is
  chosen at most once per subscription" (money and fairness break if wrong for a moment). Bad:
  "recipe ids must be non-empty strings" (value-object construction); "a customer may have at most
  five open orders" (spans instances → policy/read model).
- Keep them small. Bad: `Subscription` holding the customer profile, every past week's choice with
  recipe details, every invoice and every box — one command loads years of history and every
  concurrent action conflicts. Good: `Subscription` = status + current choice + invariants; history
  is a read model; invoices belong to billing; boxes to fulfilment.
- State transitions explicit, including rejected ones. Commands and events use discover ids; every
  command produces at least one event. Throughput and size per the canvas: many clients per instance
  → conflicts (split or accept retries); ever-growing instances → scope to a period.
- Value objects for anything without identity; entities inside the root only when addressed by id
  within it; domain services for rules needing several aggregates or a port; no ports injected
  into aggregates — pass values (a `Clock` reading, a computed price).

### Application services, ports, adapters (`references/architecture-and-modules.md`)
- One application service per command: load one aggregate (or one store call set) → call the root
  → save with expected version → publish after commit. Queries go through read models, never
  through aggregates.
- Ports are purposes of conversation: 2–4 driving and 2–4 driven ports is typical; core contexts
  may need more — every port must be justified by a message row in the brief or an infrastructure
  need (`Clock`/`IdGenerator` count). Driving `<Context>Commands`, `<Context>Queries`,
  `<Context>EventHandlers`, `<Context>Callbacks` (only when an external system *initiates* a
  command/event toward us — a sync response to our own call is not a callback); driven
  `<Aggregate>Repository` (or `<Context>Store`), `EventPublisher`, `<Purpose>Gateway` (the ACL to
  an external system, to an upstream context you must not conform to, or to a context you query),
  `Clock`, `IdGenerator`. Every driven port has an in-memory/fake adapter for tests plus the real one.
- Transports are decided per (producer → consumer) edge (flow step > relationship's integration
  decision > deployables; reference §5): `http` → controller; `message-bus`/`at-least-once` →
  idempotent consumer + outbox publisher; `in-process` → after-commit dispatcher. A context may mix
  them (one adapter per transport). Only an edge in-process *across* deployables is impossible:
  design a bus/HTTP transport for it, log an assumption and an open question for `ddd-connect`
  (prefill flags exactly these). Published events carry exactly the connect payload; translate
  internal events at the publisher.
- The domain layer imports nothing outward. Bad: `domain/subscription.ts` with
  `import { Entity, Column } from "typeorm"` and `@Entity() class Subscription { @Column() status }`.
  Good: `domain/` imports only `domain/`; `adapters/driven/persistence/PostgresSubscriptionRepository.ts`
  maps `subscription.snapshot()` to rows. Name the fitness test enforcing this in every `design.md` §1 (tool per `lang-<language>.md`).
- Module path per context from `organise.json` deployables (table in the architecture reference);
  one context per module, composition root per deployable, names from the glossary. A context a
  `frontend` also hosts (`hosts_runtime_of`) keeps `deployable` = its server-side owner, takes the
  shared domain package as `module_path` (e.g. `packages/<context>/src`) and lists the frontend in
  `also_compiled_into` (contract §4.8).

### Tests
Every invariant → a named domain test with the invariant's wording; every state transition (allowed and
rejected) → a test; every application service → a Given/When/Then with in-memory adapters; every
published event → `contract: <event-id>`; every at-least-once consumption → `idempotent: <event-id>`;
every module → the fitness test. Shape: pyramid (domain model), reversed pyramid (script/record), diamond (event-sourced).

### Implementation plan
Slice 0 = walking skeleton (module folders, fitness test, composition roots, CI). Slice 1 = the core
context's thinnest path that emits its pivotal event through in-memory adapters. Then outward: real
adapters, the policies that connect contexts following the `connect.json` flows, supporting contexts,
bought contexts as ACLs, read models and UI last. Each slice names its goal, the canvas / flow / policy
ids it implements, files/modules, the tests to write first, and "done when". End with the hand-off section.

### Depth scaling
- `light`: `design.md` per context with every section present but short (a line or a small table
  each), canvases for core-context aggregates only (sections 1–6 full, 7–8 one line), plan with 3–6 slices.
- `standard`: plus ports/adapters/read models/tests for every context, canvases for all aggregates,
  throughput/size estimates.
- `deep`: plus event-sourcing/projection design, per-language skeleton listing (files and
  signatures) inside `design.md`, C4 component view per deployable, migration notes.

## Output rules (`code.json`)
- Envelope: `schema_version: 1`, `step: "code"`, `produced_by: "ddd-code"`, `produced_at` (UTC,
  newer than define — `ddd stamp`), `mode`, `depth`, `inputs` (files actually read), `assumptions[]`
  (`id`, `text`, `confidence`), `open_questions[]` (`id`, `text`, `blocking`, `owner`).
- Top level: `language`, `framework` (`"none"` if none), `architecture_style` (`hexagonal` default;
  `vertical-slice` when no context has aggregates; `onion`/`clean`/`layered` only if the repo already
  uses it), `contexts[]`, `coined_terms[]` (may be empty), `scaffold`, `handoff`.
- `contexts[]`: one per bounded context in `decompose.json`, with `context`, `implementation_pattern`
  (= strategize), `deployable` (an `organise` id, never a frontend), `module_path` (unique), optional
  `also_compiled_into[]`, `aggregates[]` (empty for script/record contexts; each with `id`, `name`,
  `root_entity`, `entities`, `value_objects`, `invariants` (≥1), `commands`/`events` (discover ids owned
  by this context), `state_transitions`, `canvas_path` = `ddd/08-code/<context>/aggregate-canvas-<id>.md`),
  `domain_services[]`, `application_services[]` (`name`, `command`, `description` — one per owned command;
  `handled_by: "transaction-script"` where an upstream decision vetoed an aggregate), `ports[]` (`name`,
  `kind`: `driving`|`driven`, `description`), `adapters[]` (`port`, `implementation`), `read_models[]`
  (`name`, `source_events`), `tests[]` (`invariant`, `test`), `design_path` = `ddd/08-code/<context>/design.md`.
- `scaffold`: `{ "generated": false, "root": "src/", "files": [] }` unless scaffolding was requested.
- `handoff`: `{ "plan_path": "ddd/08-code/implementation-plan.md", "suggested_next": ["ddd-contracts", "superpowers:writing-plans", "dev-create-plan", "superpowers:test-driven-development"] }`.
- `deprecated[]`: anything you drop — on a re-run a removed aggregate/service (ids and paths never
  renamed); on a first run a skeleton-proposed candidate you did not turn into an aggregate
  (`collection: "aggregate_candidates"`, `reason` citing the note or rule). Never delete silently.
- Markdown: canvases follow the nine canvas sections; `design.md` keeps the template's headings
  (`ddd code check` looks for them); no template markers (`{{…}}`), `TODO`, `TBD` or `(fixture)` left —
  the one allowed `TBD` is `payload: TBD — ask ddd-connect` in a contract test (reported as an open question).

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. The draft mark in Workflow §2 draws
`<ddd-dir>/diagrams/aggregates-<context>.png` as soon as the skeleton exists (`c4-context.png` is define's); Read it before the checkpoint that settles the aggregates, their invariants and the ports:
the Read tool renders PNG, not SVG, and it is the same picture the human reviewer sees. No PNG means
no Chrome was found; the SVG is still on the page and the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `code.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. For a boundary or ownership decision (which aggregate owns an invariant, where a port sits), draw the options first: write one diagram spec per option at
`<ddd-dir>/08-code/decisions/<Did>-<opt>.json` (format `ddd-diagram-spec`; copy
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-A.json` (a context map) and edit its nodes and edges, or
hand it a blueprint architecture or sequence JSON), point `options[].diagram` at it, run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>` (`<step>:<Did>` when
another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png` before choosing.

## Self-review checklist (before validate)
- [ ] `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
      `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
      If a reader cannot follow it, they cannot catch what this step got wrong
- [ ] Every bounded context in `decompose.json` has a `design.md`; every core context is designed
- [ ] Aggregates only in domain-model / event-sourced contexts; each has ≥1 true invariant, explicit
      transitions, commands → events with discover ids owned by that context, and a canvas on disk
- [ ] No invariant that is really a validation rule or a cross-aggregate policy; every eventual-consistency
      gap has a corrective policy
- [ ] One application service per owned command (`handled_by` where an upstream decision vetoed an
      aggregate); every port justified by a message row or `Clock`/`IdGenerator`; every driven port has a
      fake/in-memory adapter; gateways named by purpose; no callbacks port for a response step; ACL for
      every external system and conformist/ACL relationship
- [ ] `module_path` unique, inside the context's `organise` deployable — or the shared domain package with
      `also_compiled_into` when a frontend hosts its runtime; composition root per deployable; domain
      layer dependency-free with a named fitness test
- [ ] Tests: invariant wording == test wording; `contract:` per published event; `idempotent:` per
      at-least-once consumption; read models have `source_events`
- [ ] Coined terms only under `## Coined by ddd-code` and in `coined_terms[]`; dropped candidates in `deprecated[]`
- [ ] Plan: Slice 0 skeleton, Slice 1 core + pivotal event, each slice names artifacts, files, tests,
      done-when; ends with the hand-off
- [ ] `scaffold.generated` false unless asked; if true, only folders/stubs/failing tests were created and all are listed
- [ ] Auto mode: assumptions and open questions recorded; conservative choices; nothing scaffolded
- [ ] `ddd code check` no errors → `ddd stamp` → `ddd validate --step code` no errors → `ddd mark` run
- [ ] The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Hand-off
Next step in the chain: `/ddd-contracts` (step 9) turns every message that crosses a party boundary
into a payload schema, a validated example, owners and the rules consumers may rely on — the plan's
slices reference those contracts, so a consumer can be built without reading the canvases. Run it
before implementation when messages cross a deployable or team boundary; skip it only for a
single-deployable system with no external integrations (say so if you skip it).

Implementation starts from `ddd/08-code/implementation-plan.md`: run `superpowers:writing-plans`
(or `dev-create-plan`) on it to expand slices into tasks with exact paths and code, then implement
slice by slice with `superpowers:test-driven-development` / `dev-tdd` — invariant tests first,
watched failing. Names in code come from `ddd/glossary.md`; ids in events and tests from
`discover.json`. If implementation changes an aggregate boundary or a message contract, update the
canvas and `code.json` and re-run `ddd validate --step code`; an upstream change makes `ddd-workflow`
mark this step stale for a re-run (ids kept, `deprecated[]` for removals).
