---
name: ddd-organise
description: Use when the user asks which team should own which bounded context, how many services or deployable units to build, whether something "should be its own service", modular monolith vs microservices, deployment topology, Team Topologies (stream-aligned / platform / enabling / complicated-subsystem teams and their interaction modes), Conway's law or the Inverse Conway manoeuvre, team cognitive load, or wants to continue the DDD process after ddd-connect. Step 6 of the 9-step ddd-* chain (understand → discover → decompose → strategize → connect → organise → define → code → contracts) — reads ddd/03-decompose/decompose.json, ddd/05-connect/connect.json, ddd/04-strategize/strategize.json and the manifest's scale_target, decides teams and deployable units (modular monolith by default, a split only for a stated reason, the count checked against the target with "why not fewer / why not more") and writes ddd/06-organise/organise.json + team-topology.md, which ddd-define (ownership per canvas) and ddd-code (module → deployable mapping) consume. Runs interactively or in auto mode (no questions, assumptions logged). To run the whole process end to end use ddd instead.
---

# ddd-organise — teams, interaction modes and deployable units

Step 6 of 9 in the DDD Starter Modelling Process chain (ddd-crew): *"Organise autonomous teams
that are optimised for fast flow and aligned with context boundaries."* Two decisions are made
here and nowhere else. **Teams**: which team owns which bounded context (Team Topologies — team
types, interaction modes, cognitive load), applying Conway's law on purpose (the Inverse Conway
Manoeuvre) so that deployment topology and team topology have the same shape. **Deployables**:
which contexts become which deployable units — where "1–3 services" versus "10–20 deployable
units" is actually decided and argued against the manifest's `scale_target`. For a solo developer or
one small team the team part takes two minutes (record it anyway); the deployable decision is the whole
value of the step. Outputs: `team-topology.md` for humans and `organise.json` for the chain — `ddd-define`
puts the owner on every canvas, `ddd-code` maps each context's module to its deployable.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's: `ddd organise brief`, `ddd organise check`, `ddd organise mermaid`.
- The shared contract and scripts (read-only — never edit `${CLAUDE_PLUGIN_ROOT}/shared/`):
  - `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md` — §1 layout, §3 envelope and `notes_for_downstream`, §4.3–4.5 the inputs, **§4.6 this step**, §7 re-runs
  - `${CLAUDE_PLUGIN_ROOT}/shared/references/modes.md` — the facilitation protocol (§0–§4)
  - `${CLAUDE_PLUGIN_ROOT}/shared/schemas/organise.schema.json` — the authoritative shape
  - `${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/06-organise/organise.json` — a valid JSON to copy *shapes* from (its content is a fixture, not an answer key)
- This skill's own files: `references/team-topologies-primer.md` (team types, interaction modes,
  cognitive-load rubric, Conway, PST, reteaming, ISH — with sources), `references/deployable-split-decisions.md`
  (the split decision table, non-reasons, blockers, data ownership, scale-check wording, evolution
  plan), `references/team-topology-template.md` (the Markdown shape plus a filled example),
  `ddd organise brief` | `ddd organise check` | `ddd organise mermaid` (deterministic gather, extra checks, diagram).
- `AskUserQuestion` in interactive mode.

## Inputs & outputs

Inputs (paths relative to the project root; `ddd/` may be overridden — resolve it first):

- Required: `ddd/03-decompose/decompose.json` (bounded contexts, relationships, ISH verdicts) and
  `ddd/05-connect/connect.json` (integration mechanisms, flows with `sync`/`via`, coupling concerns).
- Read when present: `ddd/04-strategize/strategize.json` (core/supporting/generic, sourcing,
  complexity), `ddd/01-understand/understand.json` (constraints such as regulatory isolation or
  on-prem, existing systems, channels), `ddd/manifest.json` (`scale_target.deployables_min/max`,
  `teams`, `notes`; mode; depth), `ddd/glossary.md`; on a re-run the existing `ddd/06-organise/organise.json`.
- Project knowledge: `CODEOWNERS`, team names in docs/ADRs, `docker-compose`/Kubernetes/serverless files
  (brownfield: today's deployables), what the user says; in a `ddd` run, the path/mode/depth it passes.

Outputs: `ddd/06-organise/team-topology.md` (the human artifact, `references/team-topology-template.md`)
and `ddd/06-organise/organise.json` (contract §4.6 plus the envelope §3 — see Output rules). Gate:
`ddd organise check` OK → `ddd validate <ddd-dir> --step organise` 0 errors → `ddd mark … organise done`.

## Workflow

Announce at the start: "Using ddd-organise (6/9) — <mode> mode, depth <depth>, workspace <absolute path>."

### 0. Resolve workspace, mode, depth; check the inputs (modes.md §0)

1. **DDD dir**: the user's instruction > `ddd_dir` in an existing `ddd/manifest.json` > `./ddd`.
   Print the absolute path. No manifest at all means the chain was never started — create one from the
   project root (`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir ddd --project <slug> …`) and log the assumption that earlier steps were skipped.
2. **Mode** — first match wins: the user said "auto", "no questions", "just draft", "don't ask" →
   `auto`; you cannot ask (no `AskUserQuestion`, invoked by another agent or subagent, or
   `ddd` said "mode: auto") → `auto`; `manifest.mode` set → use it; otherwise `interactive`.
3. **Depth**: the user's or orchestrator's word > `manifest.depth` > `light` for one team and a
   target of ≤3 deployables, `deep` for ≥3 teams or a target ≥10, else `standard`. Inferred → assumption.
4. **Predecessors**: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status`;
   `decompose.json` and `connect.json` must both exist. Read the `notes addressed to ddd-organise`
   block it prints (`brief` prints the same block on every run): a `decision` note is evidence for
   this step (Method §B.2); never re-emit a note you merely agree with (contract §3). Missing +
   interactive → say which is missing and offer: run that step now (its skill), bootstrap this step
   from project docs plus the user's description, or stop. Missing + auto → invoke the predecessor
   with the `Skill` tool, or follow `${CLAUDE_PLUGIN_ROOT}/skills/ddd-<step>/SKILL.md` yourself, then continue.
   `strategize.json`/`understand.json` missing → proceed and log an assumption ("no core/generic
   classification — every context treated as supporting"; "no constraints known"). A predecessor
   marked `stale` → warn; interactive asks whether to proceed or re-run upstream; auto proceeds and logs it.
5. **Re-run?** If `organise.json` exists: load it, keep every team/deployable id, add new ids, list
   removed ones under `deprecated` with a reason. Never rename an id — `define` and `code` reference them.

### 1. Gather (both modes)

1. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs organise brief <ddd-dir>` — prints the
   scale target and team count, constraints and existing systems, upstream notes addressed to this
   step, a context table (type, sourcing, implementation pattern, complexity, ISH verdict),
   relationships with connect's mechanism, every cross-context message with `sync`/`via`, sync
   chains, coupling concerns, deployment evidence in the repo, previous ids, and hints (bought
   contexts, ISH candidates, async-only inbound, whether connect assumed in-process integration).
   Read all of it before drafting. It exits 1 if `decompose.json` is missing — go back to step 0.4.
2. Read `ddd/glossary.md` (name teams and deployables in the domain's words), `manifest.sources`, and
   the repo for team facts (`CODEOWNERS`, docs) and current deployables — never ask for what the repo already says.
3. **Checkpoint 1 — inputs check** (one message, both modes): what you read, mode/depth/scale/team
   count resolved and why, and anything surprising (e.g. connect marked an edge `message-bus` while
   the target is one deployable). Interactive: ask only if something contradicts.

### 2. Draft the teams (Method §A)

Assign every bounded context to exactly one team, set each team's type, size and cognitive load,
and derive interaction modes for every pair of different teams. Draft it completely before showing it.

### 3. Draft the deployables and the scale check (Method §B, §C)

Place every context in exactly one deployable, one rationale per deployable, data-store ownership
per deployable, `topology_style`, `deployable_count`, and the scale check with both halves of
"why not fewer / why not more".

Write `<ddd-dir>/06-organise/organise.json` now (§5 has the envelope; the checkpoints edit the same
file) and run

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> organise draft --mode <mode>
```

This draws `<ddd-dir>/diagrams/teams-deployables.png` (and rebuilds the review page). Read it before
checkpoint 2b: a context straddling two teams, or a deployable holding nothing but a generic context,
shows at a glance. `ddd review <ddd-dir>` redraws it on demand after later edits.

### 4. Review the draft (interactive) or log every guess (auto)

**Interactive** (modes.md §2) — two section reviews, ≤4 questions each, multiple-choice where a real
decision exists, never about formatting:

- **Checkpoint 2a — teams** (150–300 words: the team table and interaction modes). Ask about: who
  actually exists ("one team of N / these named teams / solo"); which team owns the core context;
  any context two teams change today (that is a boundary problem to record, not a shared ownership);
  shared infrastructure that ≥3 teams need (platform team or not).
- **Checkpoint 2b — deployables and scale** (the deployable list with rationales, the diagram, the
  scale check). Ask about: a concrete reason to split context X ("independent scaling / different
  runtime or uptime / regulatory isolation / different stack / own release cadence / none — keep it
  in the monolith"); whether the frontend is built and released separately; any context that needs
  its own data store and why; "target is N–M, we have K — accept, or argue for fewer/more?".
- "Looks good" / "continue" → stop asking. "Just finish it" → auto for the rest, unasked questions
  into `open_questions`.
- **Checkpoint 3 — final confirmation**: the assumptions and open questions you will record and
  the paths you will write. Then write.

**Auto** (modes.md §3): no questions. Print the same three checkpoints as one-line status
messages. Every inference a team lead or architect might overturn → `assumptions[]` with a
confidence; every question you would have asked → `open_questions[]` with `blocking`. Prefer the
conservative option: one stream-aligned team when the manifest says 1 or nothing; the modular
monolith unless a split reason is *in the inputs* (an upstream `decision` note counts — Method §B.2);
`data_store: own`; no invented frontends or jobs.

### 5. Write

1. `organise.json` first — it is the chain. Envelope: `schema_version: 1`, `step: "organise"`,
   `produced_by: "ddd-organise"`, `mode`, `depth`, `inputs` = the files you actually read,
   `assumptions`, `open_questions`, optional `notes_for_downstream` (contract §3: never re-emit;
   sharpen/overrule citing the id); then `teams`, `interactions`, `deployables`, `topology_style`,
   `deployable_count`, `scale_check` (Output rules); copy shapes from the mealkit fixture. Then
   `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp <ddd-dir>/06-organise/organise.json` sets `produced_at`.
2. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs organise mermaid <ddd-dir>` → paste into
   `team-topology.md`, built from `references/team-topology-template.md` with the sections for the
   depth (Method §D). Markdown says the same as the JSON; the diagram is generated so it cannot drift.
3. `ddd/glossary.md`: this step rarely coins terms; if a team or deployable name introduces one,
   add it and mark it as an assumption.

### 6. Validate

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs organise check <ddd-dir>      # Conway straddling, shared DBs, bought contexts as deployables, sync hops across deployables, style/scale arithmetic; prints each interaction's direction
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step organise   # the formal gate: its `validated organise:` line must show 0 errors
```

Fix every error and re-run both; warnings go into the closing summary. On a re-run `define`/`code` turn `stale` — expected; say so.

### 7. Mark the step and close

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> organise done --mode <mode>   # artifacts and the open-question count are derived from the step folder and the JSON
```

Use `draft` instead of `done` if the user stopped early or a blocking question remains in auto mode.
Closing summary (modes.md §4) — a reader who sees only this message can act on it:

```
ddd-organise — done (auto, light) · workspace /abs/path/ddd
Written: /abs/path/ddd/06-organise/team-topology.md, /abs/path/ddd/06-organise/organise.json
Teams: founder (stream-aligned, 1) owns subscriptions, billing, fulfilment — cognitive load ok
Deployables: 1 — app (modular-monolith: subscriptions, fulfilment, billing as Stripe adapter) — target 1–3 ✔
  why not fewer: one is the minimum · why not more: fulfilment is the first extraction candidate (async-only inbound) but no runtime/scaling driver in the inputs (Q1)
Data: one DB, one schema per module, no cross-schema joins
Open questions: Q1 does fulfilment need to run in the warehouse/offline? (non-blocking) · Q2 …
Checks: organise_tools check OK · ddd validate --step organise 0 errors · first run: define pending | re-run: define, code now stale — expected
Next: /ddd-define (bounded context canvases) — or run ddd to continue
```

Quote blocking questions verbatim; keep counts real (read them from the JSON).

## Method

The rules that force the decisions. Detail, tables and sources: the two references.

### A. Teams (`references/team-topologies-primer.md`)

1. **Start from the people who exist.** `manifest.scale_target.teams` and the repo are the
   evidence; never invent a team to make the diagram look right. `teams` absent → one team.
2. **One small team** → one `stream-aligned` team (id `core-team`; a solo developer may be
   `founder`) owning every context, size from the manifest notes, cognitive load from the rubric.
3. **Several teams** → each team owns *whole* contexts. Group by flow of change and shared
   language (contexts that change together and share terms go together), never by technical layer.
   The core context goes to the strongest stream-aligned team, alone if complex; generic or bought
   contexts ride along with the team that uses them.
4. **Other team types only with a concrete reason.** `platform` only when ≥3 stream-aligned teams
   need the same infrastructure (thinnest viable platform first; it owns no context); `enabling`
   only for a named capability gap with an end date (facilitating mode, owns no context);
   `complicated-subsystem` only when one context needs specialists most developers are not
   (`model_complexity ≥ 8` plus a real skill barrier).
5. **Interaction modes per pair of different teams**, derived from the context-map pattern
   (primer §3 table): default `x-as-a-service`; `collaboration` is time-boxed and allowed only
   while a cross-team boundary or contract is being discovered (a partnership or shared kernel, or
   e.g. the acknowledgement rule between two cores) — the `reason` says when it decays to
   x-as-a-service; `facilitating` only from enabling teams. `from` is the team that consumes/needs,
   `to` the team that provides (Output rules). One team → `interactions: []`.
6. **Cognitive load** from the primer's continuous rubric (deployables per person, contexts per
   team, drivers such as external integrations, regulated work, two runtimes): `low` / `ok` / `high`.
   Say `high` when it is true — the validator's warning is the signal; the mitigation goes in `notes`.
7. **Never split a context across teams.** Bad: team A owns `ordering`'s commands, team B its read
   models — two teams change one model. Good: A owns `ordering` whole; B owns a `reporting` context
   that consumes `order-placed` x-as-a-service (if none exists, that is a finding for `decompose`).

### B. Deployables (`references/deployable-split-decisions.md`)

1. **Default: one modular monolith** — one module per bounded context, in-process domain events
   between modules (an outbox where durability matters), one deployable. Fowler: *"don't even
   consider microservices unless you have a system that's too complex to manage as a monolith"*;
   Newman: the modular monolith gives parallel work and *"much simpler deployment concerns"*.
   Connect's `via` fields show what it assumed: all `in-process` → one deployable; `message-bus`/
   `http` edges → a boundary — confirm it if a §2 reason backs it, otherwise revise (keep the
   monolith, log an open question for connect). The edge alone is a hint, not a reason.
2. **Split a context out only for a reason in the table** (§2 of the reference): independent
   scaling, different runtime/uptime/SLO (on-prem, edge, offline), regulatory isolation, team
   autonomy with its own release cadence, different technology stack, batch work needing its own
   runtime — each with the evidence named (`understand` constraints, `manifest` notes, the team
   assignment, `strategize` sourcing, an upstream `decision` note addressed to organise, the user's
   words). ISH `candidate` is eligibility, not a reason. In auto mode the evidence must be *in the
   inputs*: a `decision` note (e.g. connect: "job-execution runs offline on the technician's phone")
   counts — confirm it unless another input contradicts it, record the confirmation as an assumption
   citing the note id, and add a note for `define`/`code` only if they need the consequence (never a
   re-emit). Otherwise keep the monolith, name the first extraction candidate and log an open question.
3. **Deployables never straddle team boundaries** (Inverse Conway): a deployable's `team` owns every
   context in it. Several teams may still share one modular monolith with module ownership; split
   along team lines when a team needs its own release train or on-call.
4. **A bought or generic context is an adapter inside a deployable, not a deployable.** The vendor
   is the external system; wrapping Stripe in its own process adds a pipeline and a failure mode.
5. **Each deployable owns its data** (`data_store: own`); inside a monolith each module owns its
   schema — no cross-module joins or transactions; other contexts get data through the module's
   contract or events. `shared` is a smell that must be explained (usually a legacy database being
   strangled). `none` is for stateless units only — an offline-first client that holds the source
   of truth until synced is `own`.
6. **Split-blockers** (§4 of the reference) beat split reasons: a synchronous chain across the
   proposed boundary, a partnership/shared-kernel relationship, a shared database, a team of ≤3
   running >2 units, no CI/CD or observability, boundaries still uncertain, customer-installed software.
7. **List only what the inputs evidence.** A `frontend` deployable only for a client with its own
   release lifecycle (app-store build, separately hosted bundle): `contexts: []` — the context it
   renders is listed once, in its server-side deployable; if the client runs that context's model
   offline, add `hosts_runtime_of: ["<ctx>"]` and name the pairing in both rationales. A `job` only
   if it needs a different runtime or schedule. Never invent either in auto mode — fold it in and log an assumption.
8. **Name in the domain's language**, ids kebab-case (`app`, `warehouse-service`, `ranking-service`),
   never after technology (`kafka-consumer-2`).

Bad: `fulfilment-service` — "microservices are best practice and fulfilment is its own bounded
context". Good: `warehouse-service` — "must keep packing when the office link is down (understand
C3); inbound is `week-charged` only, async, so no sync hop". Same context map; only one has a reason.

### C. Scale check

`scale_check.target_min/max` mirror `manifest.scale_target`; `within_target` is arithmetic on
`deployable_count`. Outside the target is allowed but must be argued in `scale_check.note` and in
the Markdown. Always write both halves: **why not fewer** (the reason for every unit beyond the
first, or why one is enough) and **why not more** (which contexts could be extracted — ISH
candidates with async-only inbound — and which reason is missing or which blocker applies).
Below the target: say the monolith meets the goals and ask whether the target reflected a plan
(a second team?) that should change the answer. Above it: every extra unit has a table row with
evidence, or fold it back and say which you folded.

### D. Depth

- `light`: the team table (one team is fine), deployables with rationale, the generated diagram,
  the scale check with both halves, assumptions and open questions. One screen.
- `standard`: plus interaction modes, the cognitive-load assessment per team, the data-store ownership table.
- `deep`: plus the evolution plan (what splits first, the observable trigger, prerequisites, the
  reteaming pattern) and a Team API stub per team.
- With ≥2 teams, interaction modes are required at every depth.

## Output rules

- Required keys (schema): the envelope (`schema_version`, `step`, `produced_by`, `produced_at`,
  `mode`, `depth`, `inputs`, `assumptions`, `open_questions`) plus `teams`, `interactions`,
  `deployables`, `topology_style`, `deployable_count`, `scale_check`. Every team has `id`, `name`,
  `type`, `owns_contexts`, `cognitive_load`, `notes` (`size` when known — otherwise omit it and log
  an assumption); every deployable has `id`, `name`, `kind`, `contexts`, `team`, `rationale`,
  `data_store`, `independent_deploy` (optional additive `hosts_runtime_of` on a frontend, Method §B.7).
- Ids are kebab-case slugs, unique, stable across re-runs; assumptions `A1…`, questions `Q1…`.
  On a re-run, removed teams or deployables go in `deprecated: [{ "id", "reason" }]` (contract §7).
  Enums exactly as the contract: team `type` stream-aligned | platform | enabling |
  complicated-subsystem; `mode` collaboration | x-as-a-service | facilitating; deployable `kind`
  modular-monolith | service | function | job | frontend | library | gateway; `data_store` own |
  shared | none (`none` = stateless only; an offline-first client is `own`); `cognitive_load` low | ok | high.
- **Coverage**: every bounded context in `decompose.json` appears in exactly one team's
  `owns_contexts` and exactly one deployable's `contexts`; a deployable's `team` owns all of its contexts.
- **Interaction direction** (contract §4.6): `from` is the team that consumes/needs, `to` the team
  that provides — `x-as-a-service`: consumer → provider; `facilitating`: the enabling team is
  `from`; `collaboration`: either order, say why in `reason`. Both are team ids and they differ.
- `deployable_count` = `len(deployables)`. `topology_style` from the number of deployables that
  carry ≥1 context: 1 → `modular-monolith`, 2–5 → `few-services`, 6+ → `many-services`.
- `scale_check`: `target_min`/`target_max` copied from the manifest, `within_target` computed, `note`
  = the one-line why-not-fewer / why-not-more.
- `rationale` names the reason from the split table (or why the contexts live together) in the
  domain's words — never "best practice", never a bare ISH verdict.
- `produced_at` is set by `ddd stamp` after writing (never by hand; it lands newer than `connect.json`'s).
  `inputs` lists what you read, in the order read. `assumptions[]` and `open_questions[]` are never empty after an auto run.
- Markdown and JSON agree; the mermaid block is the output of `ddd organise mermaid`.

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. The draft mark in Workflow §3 draws
`<ddd-dir>/diagrams/teams-deployables.png` as soon as the JSON exists; Read it before the checkpoint that settles the teams and the deployable count:
the Read tool renders PNG, not SVG, and it is the same picture the human reviewer sees. No PNG means
no Chrome was found; the SVG is still on the page and the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `organise.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. For a topology decision (one deployable or several, who owns what), draw the options first: write one diagram spec per option at
`<ddd-dir>/06-organise/decisions/<Did>-<opt>.json` (format `ddd-diagram-spec`; copy
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/06-organise/decisions/D1-B.json` (teams and deployables) and edit its nodes and edges, or
hand it a blueprint architecture or sequence JSON), point `options[].diagram` at it, run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>` (`<step>:<Did>` when
another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png` before choosing.

## Self-review checklist (before writing the files)

- [ ] `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
      `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
      If a reader cannot follow it, they cannot catch what this step got wrong
- [ ] Every context is owned by exactly one team and sits in exactly one deployable; no deployable straddles teams.
- [ ] Every split has a reason from the table with named evidence; no "best practice", no bare ISH verdict.
- [ ] Bought/generic contexts are adapter modules; every deployable owns its data or `shared` is explained.
- [ ] No synchronous chain crosses a deployable boundary without being called out.
- [ ] `deployable_count`, `topology_style` and `scale_check` follow the arithmetic; both halves of why-not-fewer/more are written.
- [ ] Teams are the people who exist; platform/enabling/complicated-subsystem teams have a concrete reason; collaboration is time-boxed; cognitive load is honest.
- [ ] Ids kebab-case and stable; envelope complete; `produced_at` stamped; `inputs` accurate; interactions run consumer → provider.
- [ ] Auto mode: assumptions and open questions logged; nothing invented (no phantom frontends, jobs, teams).
- [ ] Markdown matches JSON (generated diagram); sized to depth (`light` fits a screen).
- [ ] `ddd organise check` OK, `ddd validate --step organise` 0 errors, `ddd mark` run, summary names `/ddd-define`.
- [ ] The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Next step

`/ddd-define` reads `ddd/06-organise/organise.json` for the owning team of every bounded context
(it goes on each Bounded Context Canvas); `ddd-code` reads `deployables[]` to map each context's
module to its deployable and choose module paths. Tell the user that, or that running
`ddd` continues the chain from here. Do not start writing canvases or aggregates yourself.
