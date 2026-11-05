---
name: ddd-discover
description: Step 2 of the DDD Starter Modelling Process chain (ddd-understand → ddd-discover →
  ddd-decompose → ddd-strategize → ddd-connect → ddd-organise → ddd-define → ddd-code → ddd-contracts). Use when
  the user wants to event-storm a domain, run an EventStorming (big-picture event storming) session,
  list or name domain events, "map the
  business process", asks "what happens in the domain", wants domain storytelling, a timeline of
  the domain, hotspots, to "discover the domain", or is continuing after ddd-understand. Consumes
  ddd/01-understand/understand.json (from ddd-understand) and produces ddd/02-discover/discover.json
  plus event-storm.md and seeds ddd/glossary.md, which ddd-decompose consumes next. Runs
  interactively (draft first, then at most 4 questions per timeline phase) or in auto mode (no
  questions, assumptions logged). Run ddd for the whole process.
---

# ddd-discover — big-picture EventStorming in Claude Code

Get the domain out of people's heads and documents onto one timeline: domain events in order, the
commands and actors that cause them, the external systems and policies that react, the read models
people decide from, the hotspots nobody agrees on, the pivotal events that split the flow into
phases, and the scenarios that walk it — plus the first cut of the ubiquitous language. This is
step 2 of the nine-step `ddd-*` chain (`ddd` runs all of them). `ddd-decompose` will cut
bounded contexts along your timeline, so the two most valuable things you can surface are pivotal
events and places where the language shifts. Everything else is scaffolding for those findings.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's: `ddd discover lint` (method review notes), `ddd discover render` (JSON → `event-storm.md`), `ddd discover glossary` (JSON → `glossary.md`).
- Contract: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md`
  (section 3 envelope incl. `notes_for_downstream`, 4.2 discover, 5 glossary); protocol: `${CLAUDE_PLUGIN_ROOT}/shared/references/modes.md`.
- References, read when named: `references/method-guide.md` sections 1–6 always, 7–12 for
  `standard`/`deep` or when something feels off (as its header says); `references/glossary-guide.md`
  before seeding terms; `references/event-storm-template.md` only if you cannot run the renderer.
- `AskUserQuestion` for interactive checkpoints. If you cannot ask (subagent, orchestrated run), you are in auto mode.

## Inputs and outputs

| | Path (relative to project root) | Notes |
|---|---|---|
| Input | `ddd/01-understand/understand.json` | actors, capabilities, existing systems, goals, constraints (contract 4.1) + `notes_for_downstream[]` addressed to `discover` (contract 3) |
| Input | `ddd/manifest.json`, `ddd/glossary.md` (if present) | mode, depth, scale target, sources; existing terms |
| Input | project docs + the user's domain knowledge | README, CONTEXT.md, docs/, brainstorm/, ADRs, schemas, API specs, module names |
| Output | `ddd/02-discover/discover.json` | contract 4.2 + envelope 3 incl. `notes_for_downstream[]` for decompose and later — the chain artifact |
| Output | `ddd/02-discover/event-storm.md` | the board for humans, rendered from the JSON |
| Output | `ddd/glossary.md` (`## Shared` section) | seeded terms, `context: null` |
| Gate | `ddd validate <ddd-dir> --step discover` — its `validated discover:` line must show 0 errors — then `ddd mark … discover done` | |

## Workflow

### 0. Resolve workspace, mode, depth, predecessor (modes.md section 0)

1. DDD folder: the user's instruction > `ddd_dir` in an existing `ddd/manifest.json` > `./ddd`.
   Print the absolute path. No manifest → `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir <ddd-dir> --project <slug> --mode <mode> --depth <depth>`
   (ask for name and scale in interactive mode; infer from the repo in auto mode).
2. Mode, in priority order: the user said "auto", "no questions", "just draft" → `auto`; you are a
   subagent or cannot ask → `auto`; `manifest.mode`; otherwise `interactive`.
3. Depth from the manifest (`light` | `standard` | `deep`; default `standard`). It sizes the storm
   (bands in the Method section).
4. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status` (it also prints the
   upstream notes addressed to `discover`). If
   `ddd/01-understand/understand.json` is missing: interactive → say so and offer (a) run
   `/ddd-understand` now, (b) bootstrap discover from the docs plus a description the user gives,
   (c) stop. Auto → invoke the `ddd-understand` skill if the `Skill` tool has it, otherwise follow
   `${CLAUDE_PLUGIN_ROOT}/skills/ddd-understand/SKILL.md` yourself, then continue. Bootstrapping without it →
   assumption "understand step skipped" and `inputs[]` lists what you used instead. If understand
   is `stale`, warn; interactive mode asks whether to proceed or re-run upstream first.
5. Re-run: if `ddd/02-discover/discover.json` already exists, load it and update in place — keep
   every id, add new ones, move removed items into a `deprecated[]` list (contract section 7). Ids
   that later artifacts (`03-decompose/` onwards) already reference are load-bearing: keep them
   even when the discover JSON itself is being recreated.

### 1. Gather inputs before drafting (both modes)

Read in this order and list what you actually read in `inputs[]` (paths relative to project root):

1. `understand.json` — its `notes_for_downstream[]` first: an entry whose `for` names `discover`
   steers the draft (`language` → a `conflict` hotspot plus glossary entry; `process` → event order;
   `risk` → a hotspot); entries addressed only to later steps reach them by themselves — do not
   re-emit; add a note only when the board sharpens or overrules one, citing its id. Then `glossary.md` (if present).
2. `manifest.sources`, then `README*`, `CONTEXT.md`, `docs/`, `brainstorm/`, ADRs, schemas and
   migrations, API specs, and for brownfield the code's module, table and enum names. The words the
   repo already uses are the ubiquitous language evidence — do not invent synonyms.
3. Anything the user pasted or pointed at.

A listed source that does not exist is not a blocker: record an assumption (`low` confidence) and go
on from `understand.json`. Do not ask the user for things the repo already says.

### 2. Draft the storm from the documents (both modes)

The draft is the conversation starter (interactive) or the deliverable (auto). Follow
`references/method-guide.md` sections 3–6; the seven moves are:

1. **Harvest events** — from `understand.json` mechanically first: `actors[]` → `actors[]` with
   `from_understand`; `existing_systems[will: integrate]` and key partners → `external_systems[]`;
   `capabilities[]`/`key_activities` → phase candidates and the spine of the timeline; `goals[]`,
   `impacts[]`, `deliverables[]` → scenario and pivotal-event candidates; `constraints[]` → policies
   or `risk` hotspots; `non_goals[]` → where the timeline stops. Then the docs: status enums are
   event sequences, "when X we do Y" sentences are policies, "the clerk checks the list" is a read
   model, endpoints and screens are commands (never events). One past-tense business fact per event.
2. **Enforce the timeline** — one global order; merge true duplicates; keep near-duplicates that hide
   a language conflict and add a `conflict` hotspot; number `sequence` 10, 20, 30 … so inserts are cheap.
3. **Pivotal events and phases** — mark the 3–7 events with a clear before/after (signed, paid,
   shipped, approved); cut phases after them; every event in exactly one phase.
4. **People and systems** — actor per command; policies (`Whenever <event>, <do>`) for automatic and
   manual reactions; read models where a human decides; time-triggered and external facts per the
   rules in method-guide section 5.
5. **Walk-through** — narrate each phase forward, then backwards ("what had to happen for this?");
   fill the gaps at phase edges; every command ends in an event; every event has a cause.
6. **Problems, stories, words** — hotspots with a `kind` and `near`; `S1` happy path plus
   alternatives that exercise a policy or failure; glossary terms from the nouns on the board
   (with `avoid` words); aggregate candidates by the noun that decides.
7. **Notes for downstream** — what decompose needs but no field carries: every vocabulary
   `conflict` hotspot, a disagreement about where an SLA is measured, a regulatory record nobody
   owns, a fixed process order, and understand's notes still relevant — as `notes_for_downstream[]`
   entries (Output rules), never only as prose.

Write `ddd/02-discover/discover.json` as soon as the draft exists — the full document, with the
Write tool or a short `node -e` script that writes `JSON.stringify(doc, null, 2)`, never a shell heredoc (35 KB of JSON in a
heredoc is fragile) — and run `ddd mark --dir <ddd-dir> discover draft --mode <mode>`: cheap
insurance against a session ending mid-checkpoint; every checkpoint below updates the same file.

### 3. Checkpoints

**Interactive** (modes.md section 2 — sections of 150–300 words, at most 4 questions each, never
about formatting):

1. **Inputs check** — one message: what you read, mode/depth/scale target, the first and last event
   of the flow, the phase spine you propose, and anything surprising or contradictory. Ask only if
   something contradicts (≤2 questions).
2. **One checkpoint per phase** (merge phases so there are at most 5 checkpoints; `light` reviews
   the whole timeline in one) — show the phase as its table (or as a numbered Domain-Storytelling
   story for stakeholders who dislike tables) with its policies, read models and hotspots, then ask
   ≤4 questions from the bank in the Method section: missing events at the edges, who reacts to what,
   what goes wrong, and whether two words mean the same thing.
3. **Cross-cutting checkpoint** — pivotal events, scenarios, glossary conflicts; ≤4 questions.
4. **Final confirmation** — the assumptions and open questions you will record and the paths you
   will write. Then write.

"Looks good"/"continue" → stop asking and finish. "Just finish it" → switch to auto for the rest and
log the unasked questions as `open_questions`. Update `discover.json` after each checkpoint.

**Auto** (modes.md section 3): no questions. Print the same three checkpoints as short status
lines (inputs check; draft summary — events per phase, pivotal events, hotspots; writing — paths)
and continue. Every inference a domain expert might overturn → `assumptions[]` with a confidence;
every question you would have asked → `open_questions[]` with `blocking` set honestly (blocking =
decompose cannot cut a sensible boundary without the answer). Prefer the conservative reading:
fewer phases, fewer pivotal events, the repo's words. Phases drafted from capabilities are a
hypothesis — record them as a `medium`-confidence assumption.

### 4. Write, validate, mark, summarise (both modes)

`produced_at` is set by `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp $D/02-discover/discover.json`
right after writing the JSON (it must be newer than understand's — never hand-type a time). Then, with
`D` the absolute ddd folder:

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs discover lint "$D/02-discover/discover.json"       # review notes; fix the real ones, re-write the JSON
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs discover render "$D/02-discover/discover.json"  # -> 02-discover/event-storm.md
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs discover glossary "$D/02-discover/discover.json"       # -> glossary.md, ## Shared only
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate "$D" --step discover                       # the "validated discover:" line must show 0 errors
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir "$D" discover done --mode <mode>    # artifacts and open-question count are derived from the JSON
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate "$D" --status                              # shows the notes decompose will receive
```

Fix validator errors in the JSON and re-run the renderer so the Markdown matches. Warnings go into
the summary. Use `draft` instead of `done` if the user stopped early or a blocking question remains
in auto mode. On a re-run, downstream steps showing `stale` is correct behaviour, not something to fix.

Close with a summary a reader who sees only that message can act on: absolute paths written; the
3–6 most important findings (pivotal events, language conflicts, the riskiest hotspot, anything
that changes the scale target); the notes handed downstream; the open questions; the validator
result; and the next step —
`/ddd-decompose`, or "run `ddd` to continue".

## Method — the workshop, translated (long form in `references/method-guide.md`)

| Workshop phase | What you do here |
|---|---|
| Chaotic exploration | Harvest every candidate event from understand + docs *before* asking anyone (independent drafting first avoids priming — the remote "silent sorting" lesson) |
| Enforce the timeline | One global order, sequences with gaps, duplicates merged, language conflicts kept as hotspots |
| Pivotal events, swimlanes | 3–7 splitters; phases cut after them; alternative flows become scenarios (or their own phases in `deep`) |
| People and systems | Actors from understand ids, external systems separate from actors, a command per event, policies for reactions, read models for decisions |
| Explicit walk-through | Forward then reverse narration per phase; interactive: with the user; auto: as self-review |
| Problems and opportunities | Hotspots are findings, not failures; opportunities go in the summary |
| Closing | Glossary seed, notes for downstream, summary, next step |

Depth bands (sanity checks, not quotas — an honest 9-event domain beats 14 invented events; log a
shortfall as an assumption):

| Depth | Events | Phases | Scenarios | Also |
|---|---|---|---|---|
| `light` | 10–25 | 2–4 | 1–2 | glossary 5–10 terms |
| `standard` | 25–60 | 3–6 | 2–4 | read models for every human decision, aggregate candidates, glossary 10–20 |
| `deep` | 60–150 | 5–10 | 3–6 | swimlane phases for alternative flows, per-phase diagrams, glossary 20–40 |

Question bank (pick ≤4 per checkpoint, multiple-choice when a real decision exists):
"What happens next / what had to happen first?" · "Who needs to know when X happens, and what do
they do?" · "What does *actor* look at before deciding to *command*?" · "What goes wrong here, and
who decides then?" · "Do *A* and *B* mean the same thing to everyone?" · "Is X the moment this phase
is really over?"

Naming, good vs bad:

| Element | Good | Bad — why |
|---|---|---|
| Event | *Order Placed*, *Payment Failed* | *Order Created Event*, *Record Inserted* — technical; *Order Processing* — not a fact |
| Command | *Place Order* (actor: customer) | *Order Placed* — that is the event; *POST /orders* — transport |
| Policy | *Whenever meals chosen, charge the week* | *Charging logic* — no trigger, no reaction |
| Read model | *Weekly menu* (informs *choose-meals*) | *Orders table* — storage, not a decision |
| Hotspot | *Nobody agrees what happens when payment fails after meals are chosen* (`unclear`, near `week-charged`) | *Fix payment retries* — a solution; *TODO* — says nothing |

## Output rules

### `discover.json` (contract 4.2, schema `${CLAUDE_PLUGIN_ROOT}/shared/schemas/discover.schema.json`)

- Envelope: `schema_version: 1`, `step: "discover"`, `produced_by: "ddd-discover"`, `produced_at`
  (UTC ISO-8601 `Z`), `mode`, `depth`, `inputs[]`, `assumptions[]` (`A1…`, `confidence`
  low|medium|high), `open_questions[]` (`Q1…`, `blocking`, `owner`).
- `notes_for_downstream[]` (envelope, contract 3): `{id: "N1…", text, for: [bare later step names —
  "decompose", not "ddd-decompose"], kind: language|boundary|process|risk|decision|other}`. Every
  vocabulary `conflict` hotspot has one with `kind: language` and `for: ["decompose", "define"]`
  whose text names the hotspot id (`H2: …`) so the lint can pair them; `ddd discover lint` notes a
  conflict hotspot without a note and a malformed note (non-`N` id, empty `for`, unknown `kind`) — it
  does not gate. Prose in `event-storm.md` never reaches decompose; these entries do.
- Collections, all present even when empty: `actors`, `external_systems`, `phases`, `events`,
  `commands`, `policies`, `read_models`, `aggregate_candidates`, `pivotal_events`, `hotspots`,
  `scenarios`, `glossary`. (`aggregate_candidates` is in the contract's example but not
  schema-required; emit it anyway — decompose and code read it.)
- Ids are kebab-case slugs, unique per collection, never renamed on re-run: events
  `<noun>-<past-participle>` (`order-placed`), commands `<verb>-<noun>` (`place-order`), policies
  `<verb>-on-<trigger>` (`charge-on-choice`), read models nouns, phases gerunds/nouns; codes for
  `H1`, `S1`, `A1`, `Q1`. Every later step references these verbatim.
- `events[]`: `name` past tense Title Case (*Job Marked Incomplete* counts); `phase` ∈ `phases[].id`;
  `sequence` unique integers, ascending along phase order, multiples of 10; `triggered_by` ∈
  `commands[].id`, or `null` only for a fact reported by an external system (then `actor` is that
  system's id); a time-triggered fact (*Selection Deadline Passed*, month end) is triggered by a
  command whose actor is the `clock` external system — the one rule, method-guide section 5;
  `actor` ∈ `actors ∪ external_systems`, or `null` for an event produced by a policy-issued command
  (the schema allows it, the lint does not flag it); `pivotal: true` exactly for the ids in
  `pivotal_events[]`; `data[]` names what the event carries (ids at least); `description` one line.
- `commands[]`: imperative `name`; `actor` ∈ `actors ∪ external_systems` (`clock` when time fires
  it), or `null` only when some policy lists the command in `then`; `produces[]` ≥ 1 existing event id.
- `policies[]`: `name` reads "Whenever <event>, <do>"; `when` ∈ events; `then[]` ⊆ commands;
  `kind` automatic|manual.
- `read_models[]`: `informs` ∈ commands; `used_by` ∈ actors. `aggregate_candidates[]`: `handles` ⊆
  commands, `emits` ⊆ events.
- `hotspots[]`: `kind` unclear|conflict|risk|missing|external; `near` ∈ events (or `null`); the text
  states the question or disagreement and why it matters, never the fix; a vocabulary `conflict`
  also gets a `language` note (above).
- `scenarios[]`: `S1` is the happy path first event → last event; each further scenario exercises
  one policy branch or failure; `events[]` ⊆ events in timeline order; `actors[]` lists who appears;
  `loops: true` marks a story that deliberately jumps back (no access → follow-up → rebook) — the
  lint stays quiet and the board shows *(loops)*.
- `glossary[]`: `context: null` for every entry; `avoid[]` lists the synonyms in use; terms are nouns
  that appear on the board (see `references/glossary-guide.md`).

### `event-storm.md`

Always rendered by `ddd discover render` (timeline table per phase, mermaid board, every
collection, assumptions, open questions, notes for downstream). If a human edited the Markdown before a re-run:
interactive → ask which wins; auto → trust the Markdown, fold the change into the JSON, re-render
(contract section 7).

### `glossary.md`

Seeded by `ddd discover glossary`: rewrites only `## Shared`, preserves every other section (define adds
per-context sections later), keeps and reports hand-added terms missing from the JSON. A word that
means two things in two phases is a `conflict` hotspot, a `language` note for decompose, plus one
shared entry that names both meanings — a boundary finding, not something to unify.

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. The draft mark in Workflow §2 draws
`<ddd-dir>/diagrams/event-storm.png` as soon as the JSON exists; Read it before the checkpoint that settles the phases and pivotal events:
the Read tool renders PNG, not SVG, and it is the same picture the human reviewer sees. No PNG means
no Chrome was found; the SVG is still on the page and the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `discover.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. For a decision that changes the shape of the board (where a phase is cut, which event is pivotal), draw the options first: write one diagram spec per option at
`<ddd-dir>/02-discover/decisions/<Did>-<opt>.json` (format `ddd-diagram-spec`; copy
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-C.sequence.json` (a flow) or one of the other example specs and edit its nodes and edges, or
hand it a blueprint architecture or sequence JSON), point `options[].diagram` at it, run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>` (`<step>:<Did>` when
another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png` before choosing.

## Self-review checklist (before validate)

- `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
  `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
  If a reader cannot follow it, they cannot catch what this step got wrong
- Every event is a past-tense business fact; nothing technical (*inserted*, *clicked*, *synced*); one fact per event.
- Every command is imperative, has an actor or is issued by a policy, and produces ≥1 event; every event has a cause (command, external system, or a `clock`-actored command).
- Every `actor`/`used_by` value is declared in `actors[]` or `external_systems[]`; every `from_understand` resolves to an understand actor id (`null` only for new actors).
- Phases ordered 1..n; sequences unique, ascending along phase order, with gaps; `pivotal` flags and `pivotal_events[]` agree; pivotal events sit in the middle of the flow, not at its very ends.
- Policies read "Whenever …, …" with `when`/`then` resolving; read models inform a command.
- At least one honest hotspot with `kind` and `near`; wording is a question or disagreement.
- Upstream notes addressed to `discover` are visibly consumed; every vocabulary `conflict` hotspot and every other finding a boundary depends on is a `notes_for_downstream` entry (`N<n>`, `for`, `kind`).
- `S1` happy path plus the alternatives the depth asks for; events in order and all existing.
- Glossary: nouns from the board, `context: null`, `avoid` words, no invented synonyms; language conflicts recorded, not smoothed.
- Envelope complete; `inputs[]` relative paths; every guess in `assumptions[]`; every unasked question in `open_questions[]` with `blocking` honest.
- Event count inside the depth band, or the shortfall explained in an assumption.
- `ddd discover lint` notes reviewed; `ddd discover render` and `ddd discover glossary` re-run after the last JSON edit; the `validated discover:` line shows 0 errors; `ddd mark` recorded `done` (or `draft`, and you said why).
- The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Next step

`/ddd-decompose` reads `ddd/02-discover/discover.json` (events, commands, pivotal events, hotspots,
glossary terms, your notes) and `ddd/glossary.md` to cut subdomains and bounded contexts along the timeline;
`ddd-connect` later turns your scenarios and policies into message flows, `ddd-define` refines the
glossary per context, and `ddd-code` keys aggregates by your command and event ids. Tell the user
the ids you minted are now load-bearing, then hand off — or say "run `ddd` to continue".
