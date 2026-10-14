---
name: ddd-contracts
description: "Use when the user wants data contracts or message contracts for a designed system: a payload schema for an event, an event/message schema, 'what exactly does this event carry', 'publish a schema for this event', API or event contracts between services, contract-testing inputs, OpenMetadata-style data contracts, a consumer that needs to know the payload, or is continuing after ddd-code. Step 9 (last) of the 9-step DDD Starter Modelling Process chain ddd-understand → ddd-discover → ddd-decompose → ddd-strategize → ddd-connect → ddd-organise → ddd-define → ddd-code → ddd-contracts (run ddd for the whole process). Gives every message that crosses a party boundary in ddd/05-connect/connect.json a JSON Schema 2020-12 payload schema, one validated example, an owner and the business rules that hold for it, so a producer or consumer (human or agent) can be built from the contract alone; messages to or from an external system (a Stripe charge) become inherited entries that make the ACL boundary visible. Consumes ddd/05-connect/connect.json and ddd/07-define/define.json (plus the organise/decompose/discover JSON and glossary.md); produces ddd/09-contracts/contracts.json, contracts.md, schemas/<message>.schema.json and examples/<message>.json. Interactive (≤4 questions per checkpoint) or fully auto with logged assumptions."
---

# ddd-contracts — message contracts: schema, example, owner, rules (step 9 of 9)

Every message that crosses a party boundary in `connect.json` gets a contract: a JSON Schema
2020-12 payload schema, one example that validates against it, an owner and reviewers, a delivery
guarantee, and the business rules that hold for it — so a producer or consumer (human or coding
agent) can be built from the contract alone, without opening any other file. Nothing else: no
meta-schemas, no OpenAPI, no codegen, no server push. Domains, data products, glossary and lineage
are covered *by reference* — `domain` is the bounded context, a context's published entries are its
data products, `glossary` points at `ddd/glossary.md` anchors, `owners`/`consumers` plus the connect
flows are the lineage. This is the last step of the chain (orchestrated by `ddd`); the
upstream design work is done, and this step turns its message catalogue into contracts.

Read once per session: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md` (§3 envelope,
§4.5 connect — your main input, §4.6–4.7 organise/define, §5 glossary rule, §7 re-runs) and
`…/modes.md` (facilitation protocol). Field-by-field method: `references/contract-entry-guide.md`.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's:
  - `ddd contracts prefill` — drafts `contracts.json`, schema skeletons and example stubs from the upstream JSON
    (deterministic; judgement fields are `TODO`). Re-runs merge: ids, filled fields and
    `entityStatus` kept, provenance refreshed, nothing filled is overwritten.
  - `ddd contracts check` — the deep gate: coverage, required fields, enums, id resolution, example-vs-schema
    validation, no `TODO`, `contracts.md` rendered from the current entries.
  - `ddd contracts render` — writes `contracts.md` from `contracts.json`. **Never hand-write `contracts.md`.**
- A `ddd/` workspace whose `05-connect/connect.json` and `07-define/define.json` exist — otherwise
  modes.md §0 applies. `organise.json` (owners), `decompose.json` (domains, relationships),
  `discover.json` (event `data[]` hints, descriptions) and `glossary.md` are used when present.

## Inputs & outputs

Inputs (paths relative to the project root; `ddd/` may be overridden by `manifest.ddd_dir`):
`ddd/05-connect/connect.json` (messages, flows, parties, integration patterns — required),
`ddd/07-define/define.json` (business decisions per producer canvas, quality attributes — required),
`ddd/06-organise/organise.json` (teams → owners/reviewers), `ddd/03-decompose/decompose.json`
(bounded contexts → `domain`, relationships → pattern), `ddd/02-discover/discover.json` (event
`data[]`, names, descriptions), `ddd/glossary.md` (anchors), upstream `notes_for_downstream`
addressed to `contracts`, `ddd/manifest.json`, and any schemas already in the repo.

Outputs (exact paths, all under the existing workspace):
- `ddd/09-contracts/contracts.json` — envelope §3 + one `entries[]` item per cross-party message.
- `ddd/09-contracts/schemas/<message-id>.schema.json` — JSON Schema 2020-12 for the payload.
- `ddd/09-contracts/examples/<message-id>.json` — one example that validates against the schema.
- `ddd/09-contracts/schemas/<message-id>.{request,response}.schema.json` + matching
  `examples/<message-id>.{request,response}.json` — the other half of a two-way contract
  (a query's parameters, a command's reply body), when there is one.
- `ddd/09-contracts/examples/<message-id>.invalid.json` — payloads the contract must **reject**,
  as `[{"why": "<the rule this breaks>", "payload": …}]`. Required in spirit for every conditional
  rule; `check` warns when a schema encodes one and no negative fixture proves it.
- `ddd/09-contracts/contracts.md` — rendered per context: what it publishes, calls out to,
  accepts from clients and receives from external systems, plus what it consumes.
Then `ddd contracts check` must pass with zero errors, `ddd validate <ddd-dir> --step contracts`
must pass, and `ddd mark … contracts done` records it.

## Workflow

Follow modes.md §0–§4. Print each checkpoint as a short status line even in auto mode.

### 0. Resolve workspace, mode, depth
1. Workspace: user instruction > `ddd_dir` in `./ddd/manifest.json` > `./ddd`. Print the absolute
   path, and pass it explicitly to every script call below.
2. Mode: "auto" / "no questions" / "just draft" → `auto`; you are a subagent or `ddd` runs
   you non-interactively → `auto`; else `manifest.mode`; else `interactive`.
3. Depth from the manifest (`light` | `standard` | `deep`) — see "Depth scaling".
4. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status` (read the
   `notes addressed to ddd-contracts` block once; `--no-notes` on later runs). `connect.json` or
   `define.json` missing: interactive → offer to run that skill now, bootstrap from project docs +
   a description the user gives (assumption that the predecessor was skipped), or stop; auto →
   invoke the skill (Skill tool) or follow its SKILL.md yourself, then continue. A predecessor
   `stale` → warn (interactive: ask whether to proceed or re-run upstream first).
5. `09-contracts/contracts.json` already exists → this is a re-run: the prefill merges (see Method).

### 1. Gather + prefill (both modes)
1. Pre-fill:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs contracts prefill <ddd-dir> --mode <mode> --depth <depth>
   ```
   Deterministic fields are filled from upstream: entry ids (= connect message ids), kind,
   producer → consumers, `pattern` (message `contract` **mapped**: `ui`/`user-interaction` →
   `open-host-service`, `external-api` → the pattern that wraps that system; else the decompose
   relationship — guide, "Pattern mapping"), `delivery`, `via` + `channels` (primary transport from
   the flow step, the rest from `messages[].channels[]` as whole objects), `domain` and `owners`/`reviewers` (the
   organise teams owning the **handling** context — never an actor id), `client` (the human actor at
   the far end), `direction` on inherited entries, the glossary anchor, `provenance`, `name`/
   `description` seeds (connect's `description`, else discover's), a `semantics` seed from
   `messages[].idempotency`, schema skeletons whose property names are the payload entries' leading
   identifiers (`slaWindow{from, to}` → `slaWindow`, the hint kept in the field description), and
   example stubs. A query's main schema is seeded from `response_payload[]` (it describes the
   **answer**); its `payload[]` is the *request* and gets its own `<id>.request.schema.json` +
   example, exactly as a command's reply gets `<id>.response.schema.json`. Never a `parameters` or
   `response` key inside the main schema: neither is a JSON Schema keyword, so a validator ignores
   it and that half of the contract is checked by nothing. An external system on either end ⇒
   `inherited: true` owned by that system (unless we publish to them under published-language /
   open-host-service — then it is ours). Cross-party = every `connect.messages[]` entry whose
   consumers differ from its producer, plus any flow step between two different parties whose
   message has no catalogue entry. **A human actor on one end is in scope** — that entry is the
   UI/API contract a client is built against and its payload matters as much as any other; only a
   human-on-both-ends edge and `kind: response` are out.
   **Deployment decides the shape of the promise.** A boundary in connect is a boundary in the
   *model*; whether it is a boundary in the *build* is organise's answer. When
   `organise.deployables[].contexts` puts the producer and every consumer in one deployable, the
   call is a function call the compiler already checks, and a versioned wire schema invents a seam
   the build does not have — so prefill lists those messages and deliberately drafts nothing for
   them. Everything uncertain stays in scope (organise not run, a party unplaced or hosted by two
   deployables, an external system or human on either end): a contract too many is a review
   comment, a contract too few is an outage. If one of the listed calls really is a seam, that is a
   finding for ddd-organise, not something to paper over with a schema here.
   Then `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> contracts draft --mode <mode>`:
   this step draws no diagram of its own, but the mark rebuilds `<ddd-dir>/review.html` with the
   drafted entries in its worklist and saves the state should the session end mid-checkpoint.
2. Read the printed index and its **judgement hints** (what connect already carries —
   `idempotency`, `description` — and the handling context's business decisions from define);
   then look for existing schemas in the repo (`*.schema.json`, `schemas/`, `avro/`, `proto/`,
   OpenAPI files) — existing field names and types are evidence; do not invent synonyms (modes.md §1).
3. Checkpoint 1 (inputs check): one status line — N cross-party messages (which inherited, which
   are client contracts), owners found, payload hints present/missing, which messages are flow-only
   (payload to be designed here + an open question for `ddd-connect`), anything contradictory. Ask
   only if something is contradictory.

### 2. Judgement — fill what prefill cannot (both modes)
Edit `contracts.json`, the schemas and the examples in place (keep ids; a `node -e` snippet that
loads, sets and writes back with `JSON.stringify(doc, null, 2)` beats hand-editing). Per contract,
producer context first, core contexts first, with `references/contract-entry-guide.md` open:
1. **description** — one or two sentences: what happened (or is requested) and what it licenses
   downstream ("Billing has collected the week's payment; the box may be packed."), business
   language, no transport talk.
2. **schema** — a type for every property, `format` where one fits (`uuid`, `date-time`, `email` —
   annotation-only, the checker enforces types not formats), `required` decided field by field,
   a one-line description per field with units/shape ("ISO-8601 week, e.g. 2026-W36"; "minor
   units; never a float"), `additionalProperties: false` unless deliberately open. Ids = the
   aggregate's id, not a nested blob. Upstream names fields; **you design shapes** — every nested
   sub-shape (`completionEvidence{photoUris, …}`), every enum member and every unit. Money always
   needs an explicit ISO-4217 currency + integer minor units decision logged in `assumptions[]` with
   its confidence (several possible currencies and nothing upstream to choose between them = a
   `blocking` open question owned by `ddd-connect`, never a guess); a closed `enum` needs a canvas
   decision / glossary term / discover policy to cite in the field description, otherwise keep the
   field an open `string` and say which values are known today.
   For a `query` the schema is the **response**: inventing it is expected work, not a gap to report.
3. **example** — realistic values in the domain's language that validate; no placeholders.
4. **semantics** — the business rules a consumer may rely on, drawn from connect's `idempotency`
   (prefill seeds it), the *handling* context's canvas `business_decisions` and the delivery
   guarantee: uniqueness/idempotency key, ordering or its absence, what a decline/failure implies.
   Only decisions that constrain *this* message.
5. **termsOfUse** — the versioning promise (default: "Additive changes only within version 1.x; a
   removed or retyped field is 2.0."); for `inherited` entries, who owns the wire contract and
   where their changes land (the ACL adapter).
6. **entityStatus** — auto mode leaves `Draft`; interactive may set `In Review`/`Approved` only if
   the user says so.
7. A consumer that needs a field the payload lacks (a coupling concern usually says so) → never
   silently add it: keep connect's payload, log an `open_questions[]` entry owned by `ddd-connect`
   citing the concern. New assumptions/questions get envelope entries (`A<n>`/`Q<n>`), like every step.

### 3. Checkpoints (interactive) — ≤4 questions each
- **One checkpoint per core context's contracts** (batch supporting/generic contexts together, ≤3
  contracts per checkpoint): show each contract's field table, example, semantics and terms in
  150–300 words, then ask up to 4 targeted questions with `AskUserQuestion`: a field's
  type/format ("week: ISO week string or start date?"), required-ness ("may recipeIds be empty?"),
  which producer decision is a contract rule consumers may rely on, the terms/status. Never ask
  about formatting.
- **Final confirmation**: the assumptions and open questions you will record, the files you will
  write. Then write.
- "Looks good"/"continue" → stop asking. "Just finish it" → auto for the rest, unasked →
  `open_questions`.
Auto mode: no questions — print the same checkpoint lines as status. Conservative defaults:
payload exactly as connect lists it; `required` = every field the producer always has (an optional
field needs a reason); `entityStatus` stays `Draft`; the default termsOfUse sentence; every guessed
type/format/unit → `assumptions[]` with confidence; every unasked question → `open_questions[]`
with `blocking: true|false` (blocking = a wrong guess would corrupt money, identity or legality).

### 4. Render, check, stamp, validate, mark (both modes)
```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs contracts render <ddd-dir>   # contracts.md from contracts.json
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs contracts check <ddd-dir>    # deep gate: fix errors, re-render, re-check
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp <ddd-dir>/09-contracts/contracts.json
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step contracts   # gate = its `validated contracts:` line
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> contracts done --mode <mode>
```
- `check` errors until: every cross-party message has an entry, every entry has every field, every
  example validates against its schema, every id resolves (domain → decompose, owners/reviewers →
  organise teams or external systems, consumers → parties, provenance → connect), no `TODO`
  anywhere, and `contracts.md` carries the hash of the current `entries[]`. After any fix to
  `contracts.json`, re-run `render` before `check`. Warnings (consumer drift vs connect, empty
  `required`, untyped properties, orphan files) go into the summary.
- `ddd validate --step contracts` checks envelope, artifact schema and staleness centrally — do not
  implement your own staleness logic; on a re-run of an upstream step it marks this step `stale`.
- `ddd mark … contracts draft` instead of `done` when a blocking question remains in auto mode
  or the user stopped early. Never pass `--artifacts`/`--open-questions` — both are derived.
- **Closing summary** (a reader who sees only this message can act): absolute paths written; the
  contract list (id, producer → consumers, delivery, inherited flags); the 2–4 semantics a consumer
  most depends on; assumptions and open questions (blocking first); `check` and `validate` results;
  then the hand-off (below).

## Method

Fill each entry **from upstream data, not from imagination** — the entry is an index over facts the
chain already established; `references/contract-entry-guide.md` has the full rules and examples.

| Entry field | Source | Rule |
|---|---|---|
| `id`, `kind`, `provenance` | connect messages/flows | id = the connect message id; never renamed |
| `name`, `description` | connect's `description`, else discover's, then judgement | description says what it licenses downstream |
| `domain` | the handling bounded context (decompose) | the producer, or the receiving context when a human or an external system produces it |
| `owners`, `reviewers` | organise teams owning the handling context / all contexts involved | inherited: owner = the external system; never an actor id |
| `consumers` | connect `consumers[]` | drift from connect is a warning — align or diverge deliberately |
| `pattern`, `delivery`, `via` | message `contract` (mapped), `delivery`, flow step `via` + `channels[]` | at-least-once ⇒ semantics must name the de-duplication key; never `sync via file` |
| schema, example | payload names from connect/discover; types/required = judgement | closed payloads; formats are annotations |
| `semantics` | connect `idempotency` + handling canvas `business_decisions` + delivery | only rules that constrain this message |
| `termsOfUse`, `version`, `entityStatus` | judgement | additive-only within a major; auto stays `Draft` |
| `glossary` | `ddd/glossary.md` heading anchors | point at the producer context's section |

Good vs bad, the two that matter most:

- Semantics — bad (restates the field list): "Contains subscriptionId, week and the recipe ids."
  Good (a rule a consumer can rely on and test): "Emitted at most once per (subscriptionId, week);
  consumers must de-duplicate on that pair."
- Payload — bad (kitchen sink): the whole subscription — customer profile, address, past weeks,
  card token — "in case someone needs it"; every added field is a coupling a 2.0 must undo. Good
  (tight): exactly what the consumer needs to act — `subscriptionId`, `week` — plus an open
  question when a consumer's need is unproven (a coupling concern), owned by `ddd-connect`.

Inherited entries (`charge-card` → Stripe): the external party owns the wire contract, so
`inherited: true`, `owners: ["stripe"]`, and the schema is **our view of what we send (or
receive)** at the ACL boundary — model it the way our adapter speaks (currency + minor units),
not by pasting the vendor's full API. `reviewers` stays our team; `domain` stays our context.
`consumers` keeps connect's list even when it reads backwards (`travel-times` "consumed by" Google):
`direction: "outbound"` records that it is a call we make, and render says "called by dispatch →
google-maps-platform". A message with a human on one end is the mirror case: `open-host-service`,
`client: <actor>`, owned by the handling context's team (guide, "A human on one end").

Delivery drives semantics: `at-least-once` ⇒ name the idempotency key; `sync` command ⇒ say what a
retry means (same idempotency key, no double effect); `at-most-once` ⇒ say what is lost when it is
dropped and who repairs it. An event with no consumers is not a contract (connect's problem);
a query contract's main schema describes the **response** (from `response_payload[]` when connect has
it, else designed here) and its parameters get their own `<id>.request.schema.json`, exactly as a
command's reply gets `<id>.response.schema.json`.

**Never park half a contract under a key JSON Schema does not evaluate.** A top-level `response` or
`parameters` object reads like a specification and is ignored by every validator, including the one
the consuming team runs — so the gate reports "all examples validate" while half of each contract is
unchecked. Anything that must hold goes in a keyword; anything else goes in `description`, where
nobody mistakes it for a guarantee. `check` treats a non-keyword at a schema position as an error.

**A rule stated only in prose is not a rule.** "A request with neither `query` nor `seeds` fails" is
a sentence; `anyOf: [{required: [query]}, {required: [seeds]}]` is the rule. Use `anyOf` / `oneOf` /
`if`-`then` / `const` / `not` / `dependentRequired`, and pair each one with a case in
`examples/<id>.invalid.json` saying which rule it breaks. The negative fixture is what stops a later
edit quietly loosening the constraint — and writing it is how you find out whether you encoded the
rule at all.

Depth scaling: **light** — 1–2 semantics per contract, the default termsOfUse sentence, formats
only where money/identity is involved. **standard** — per-field descriptions with units, a
per-contract termsOfUse, formats throughout. **deep** — plus explicit non-guarantees (ordering,
latency, replay) in semantics and a field-level note for every enum.

Re-runs (contract §7): `prefill` merges — filled fields and `entityStatus` survive, `TODO`s are
re-drafted, provenance refreshed, ids never renamed. Two merge rules earn their keep: a value that
is no longer valid for its enum (a `pattern: "external-api"` drafted before the ingest mapping) is
re-mapped rather than preserved, and a payload name already present in a schema at any depth is
never re-added (`--no-schema-refresh` turns the top-up off entirely). A message gone from connect leaves its entry
behind: set `entityStatus: "Deprecated"`, record it in the envelope's `deprecated[]`
(`collection: "entries"`), and keep the schema file for consumers still migrating. A payload
change that breaks consumers is a new major `version` — say so in `termsOfUse`, don't slip it in.

## Output rules

`contracts.json` — envelope (§3): `schema_version: 1`, `step: "contracts"`, `produced_by:
"ddd-contracts"`, `produced_at` (ddd stamp — newer than `code.json`), `mode`, `depth`, `inputs`
(files actually read), `assumptions[] {id, text, confidence}`, `open_questions[] {id, text,
blocking, owner}`, optional `deprecated[]`; `notes_for_downstream[]` is normally empty (there is
no step 10) — a finding for an upstream re-run is an open question owned by that skill. Step key:
- `entries[]` — one per cross-party message, required keys `id, kind, name, description,
  entityStatus, version, domain, owners[], consumers[], reviewers[], pattern, delivery, via,
  schema, example, semantics[], termsOfUse, glossary, provenance {connect, relationship, flows[]}`;
  `inherited: true` only on external-system contracts; optional additive `client` (the actor id at
  the far end), `direction` (`inbound`|`outbound`, inherited entries only) and `channels[]` (the
  other transports, one `{via, sync?, delivery?, note?}` object each, copied whole from connect —
  a second transport is a second promise, so it keeps its own guarantee and its `note`).
  OpenMetadata field names are used only
  where the concept matches (`entityStatus`, `owners`, `reviewers`, `domain`, `termsOfUse`,
  `glossary`, `version`, `consumers`) — invent nothing beyond this shape.
- Enums (exactly `${CLAUDE_PLUGIN_ROOT}/shared/schemas/contracts.schema.json`): `kind` event|command|query (never
  `response`); `entityStatus` Draft|In Review|Approved|Archived|Deprecated|Rejected|Unprocessed
  (OpenMetadata); `pattern` = the eight context-mapping patterns (contract §4.3 minus
  `big-ball-of-mud`, which is never a publishable contract — decide what the message really is);
  `delivery` at-most-once|at-least-once|exactly-once|sync; `via` http|grpc|message-bus|in-process|
  file|db|other; `version` MAJOR.MINOR.
- Ids: entry id = connect message id (kebab-case); `schema`/`example` are project-root-relative,
  exactly `ddd/09-contracts/schemas/<id>.schema.json` and `ddd/09-contracts/examples/<id>.json`.
- Schemas: JSON Schema 2020-12, root `type: "object"`, `$id` = the path above, `title` = the entry
  name; only the checked subset carries guarantees (type/required/properties/items/enum/
  additionalProperties — `format` is annotation-only); one example file per schema, validating.
- `contracts.md` is written by `ddd contracts render` only (generated marker + entries hash).
- A domain noun you coined goes under `## Coined by ddd-contracts` in `ddd/glossary.md` and into
  `coined_terms[]` (§5) — field names and technical terms do not.

Never: invent a payload field, a message, a party or an owner id; resolve a coupling concern by
adding data in auto mode; hand-write `contracts.md`; set `entityStatus` past `Draft` in auto mode;
rename an entry id on a re-run; hand-edit manifest statuses; write outside `<ddd-dir>`.

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. This step draws no diagram of
its own: the pictures that bear on it are `<ddd-dir>/diagrams/flow-<flow id>.png` and `c4-context.png` from earlier steps, and
`<ddd-dir>/diagrams/decisions/<Did>.png` after a `ddd decision render`. If such a PNG exists, Read it
before deciding: the Read tool renders PNG, not SVG, and it is the same picture the human reviewer
sees. No PNG means no Chrome was found; the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `contracts.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. When the options differ in shape (a boundary, a topology, a flow), draw them first: write one
diagram spec per option at `<ddd-dir>/09-contracts/decisions/<Did>-<opt>.json` (format
`ddd-diagram-spec`; copy `${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-A.json`
and edit its nodes and edges, or hand it a blueprint architecture or sequence JSON), point
`options[].diagram` at it, run `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>`
(`<step>:<Did>` when another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png`
before choosing.

## Self-review checklist

Before `ddd mark`:
- [ ] `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
      `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
      If a reader cannot follow it, they cannot catch what this step got wrong
- [ ] Every cross-party message in `connect.json` has an entry, human-actor edges included (only a
      human-on-both-ends edge, `kind: response`, and calls organise keeps inside one deployable are
      out); each of those names its `client` and is owned by the handling context's team, never by
      an actor id
- [ ] The in-process list printed by prefill is right: every message on it really does ship inside
      one deployable, and each is covered by a code-level test in the implementation plan
- [ ] Every entry: all required keys, valid enums, `version`, `glossary` anchor that exists
- [ ] Every schema: a type per field, `required` decided deliberately, `additionalProperties`
      set, units/shape in field descriptions; money is never a float
- [ ] Every example validates and reads like production data (glossary language, no placeholders)
- [ ] Both halves exist where the exchange has two: a query's `.request`, a command's `.response`
- [ ] Every conditional rule is a keyword, and `examples/<id>.invalid.json` proves it rejects
- [ ] Every `semantics[]` is a rule a consumer can test — traceable to a producer decision or the
      delivery guarantee; at-least-once contracts name their de-duplication key
- [ ] External-system messages: `inherited: true`, external owner, `direction`, our-view schema,
      ACL named in `termsOfUse`; money fields carry a currency + minor-units assumption and every
      closed `enum` cites the decision that closes it
- [ ] Ids resolve: `domain` → decompose, `owners`/`reviewers` → organise/externals, `consumers` →
      parties, `provenance` → connect; consumer drift warnings resolved or deliberate
- [ ] No `TODO` in entries, schemas or examples; auto mode logged every guess and unasked question
- [ ] `contracts.md` re-rendered after the last edit; a consumer of any contract could be built
      from its section alone
- [ ] `check` 0 errors → `ddd stamp` → `ddd validate --step contracts` 0 errors → `ddd mark` run
- [ ] The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Hand-off

The chain is complete. Producers and consumers are implemented against `ddd/09-contracts/`
directly: the `contract: <event>` and `idempotent: <event>` tests named in `code.json` assert
these schemas and semantics (consumer-driven contract testing — e.g. Pact — plugs in here, one
pact per consumers[] entry), and `examples/*.json` are the first test fixtures. A needed payload
change goes through `ddd-connect` (re-run, then `ddd` marks this step stale and a
`prefill` merge picks it up) — never by editing a schema in place past its `termsOfUse`. If the
organisation runs OpenMetadata or a data catalogue, `entries[]` maps one-to-one onto its data
contracts; `entityStatus` advances (`In Review` → `Approved`) as humans sign off.
