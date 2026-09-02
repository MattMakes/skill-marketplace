---
name: ddd-define
description: Step 7 of the 9-step DDD Starter Modelling Process chain (ddd-understand → ddd-discover → ddd-decompose → ddd-strategize → ddd-connect → ddd-organise → ddd-define → ddd-code → ddd-contracts; run ddd-workflow for the whole process). Use when the user wants a Bounded Context Canvas, asks to "define the contexts", "document each bounded context", "write the spec / contract for this service or context", wants a context's purpose, ubiquitous language per context, business rules and decisions, inbound/outbound messages per collaborator, a C4 system context diagram, quality attributes or Quality Storming, a per-context glossary, or is continuing after ddd-organise (ddd/06-organise/organise.json exists). Consumes ddd/03-decompose/decompose.json, ddd/05-connect/connect.json, ddd/04-strategize/strategize.json and ddd/06-organise/organise.json (plus discover, understand, glossary.md) and produces ddd/07-define/define.json, one ddd/07-define/<context>/bounded-context-canvas.md per bounded context, ddd/07-define/system-context.md and a refined per-context ddd/glossary.md — the contract ddd-code (and any coding agent) builds from. Pre-fills every canvas from the upstream JSON, then adds purpose, domain roles, decisions, verification metrics and quality attributes; interactive (≤4 questions per checkpoint) or fully auto with logged assumptions.
---

# ddd-define — Bounded Context Canvases, system context, quality attributes

DEFINE is where the design becomes a contract. The Starter Modelling Process says: "Define the
roles and responsibilities of each bounded context … before committing to a design, make explicit
decisions about the choices which can have a significant impact." For every bounded context in
`decompose.json` this step writes one **Bounded Context Canvas (v5)** — purpose, classification,
domain roles, inbound/outbound messages per collaborator, ubiquitous language, business
decisions, assumptions, verification metrics, open questions — plus the **C4 level-1 system
context** and the **quality attributes** that matter per context (light Quality Storming). Nearly
everything on a canvas already exists upstream; the work here is to *assemble it faithfully*,
add the judgement only this step can add, and make the gaps explicit so that `ddd-code` (step 8)
or any human/coding agent can build or integrate with a context without re-deriving the design.

Chain position: reads steps 1–6, writes `ddd/07-define/`, refines `ddd/glossary.md`, consumed by
`ddd-code`. Contract: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md` §4.7 (inputs
§4.2–4.6, glossary §5). Protocol: `…/references/modes.md`.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's:
  - `ddd define prefill` — writes the per-context briefs
    (`07-define/.prefill/`) and a draft `define.json` from the upstream JSON (deterministic; never invents).
  - `ddd define render` — lints `define.json` and renders the canvases,
    `system-context.md` and the glossary's per-context sections from it (one source of truth).
- Upstream artifacts: `decompose.json` and `connect.json` are required; `strategize.json`,
  `organise.json`, `discover.json`, `understand.json`, `glossary.md` are used when present.
- References (read the one you need, when you need it):
  `references/canvas-guide.md` (section-by-section rules, good/bad examples, context-mapping labels,
  C4/Mermaid, canvas-as-agent-spec guidance), `references/domain-roles.md` (role table + quick
  heuristic), `references/quality-storming.md` (light quality storming, attribute vocabulary),
  `references/bounded-context-canvas.template.md`, `references/system-context.template.md`.

## Inputs & outputs

Inputs (paths relative to the project root; `<ddd-dir>` defaults to `./ddd`):
`ddd/03-decompose/decompose.json`, `ddd/05-connect/connect.json`, `ddd/04-strategize/strategize.json`,
`ddd/06-organise/organise.json`, `ddd/02-discover/discover.json`, `ddd/glossary.md`,
`ddd/01-understand/understand.json` (constraints → quality attributes), `ddd/manifest.json`.

Outputs (exact):
- `ddd/07-define/<context-id>/bounded-context-canvas.md` — one per bounded context in `decompose.json`, v5 layout.
- `ddd/07-define/system-context.md` — Mermaid `C4Context` diagram + parties, contexts/deployables, quality attributes table.
- `ddd/07-define/define.json` — contract §4.7 + envelope §3; `canvas_path` per canvas.
- `ddd/glossary.md` — refined: `## Shared` kept, one `## <Context> context` section per context.
Then `ddd validate <ddd-dir> --step define` must pass and `ddd mark … define done` records it.

## Workflow

### 0. Resolve workspace, mode, depth, predecessors (modes.md §0)

1. `<ddd-dir>` = the user's instruction > `ddd_dir` in `./ddd/manifest.json` > `./ddd`. Print the
   absolute path. No manifest → this step cannot start; run `ddd-understand` (or `ddd init`) first.
2. Mode: user said "auto"/"no questions"/"just draft" → `auto`; you are a subagent or cannot ask →
   `auto`; else `manifest.mode`; else `interactive`. Depth from the manifest (`light|standard|deep`).
3. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status`. Read its
   `notes addressed to ddd-define from upstream:` block (contract §3) and apply those notes; never
   re-emit one you merely pass through — only a sharpened or overruled note, citing its id.
   - `decompose.json` or `connect.json` missing → interactive: offer (a) run that step now via the
     `Skill` tool, (b) bootstrap from project docs + a description the user gives (record an
     assumption that the predecessor was skipped), (c) stop. Auto: invoke `ddd-decompose` /
     `ddd-connect` with the `Skill` tool, or follow `${CLAUDE_PLUGIN_ROOT}/skills/ddd-<step>/SKILL.md` yourself,
     then continue.
   - A predecessor is `stale` → warn; interactive: ask whether to proceed or re-run upstream first.
   - `07-define/define.json` already exists → this is a re-run: the pre-fill merges (see Method).

### 1. Gather (both modes)

1. Pre-fill:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs define prefill <ddd-dir> --write --mode <mode> --depth <depth>
   ```
   It writes `07-define/define.json` as a draft — deterministic fields filled (classification,
   team/deployable, inbound/outbound grouped by collaborator with the relationship pattern, `via`
   from the flow step or else from the relationship's integration decision, responses folded into
   their request row, terms, policy drafts, the upstream assumptions/questions that *name* the
   context, a `C4Context` block), judgement fields marked `TODO`/`[draft …]` — and the **briefs**
   to `07-define/.prefill/`: `system.md` (system facts, C4 block, the pre-fill's own envelope
   entries) plus one `<context>.md` per context. That folder is scaffolding (the full render
   removes it); nothing is written outside `<ddd-dir>`; stdout is a one-screen index. Read
   `system.md`, then one context brief at a time — core first — while you draft that canvas
   (`--print --context <id>` echoes one to stdout). The pre-fill's own guesses are already
   envelope assumptions cited on the canvases they apply to (`[define A1] …`); its findings for
   step 8 are `notes_for_downstream` addressed to `code`, not questions.
   Then `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> define draft --mode <mode>`:
   it draws `<ddd-dir>/diagrams/c4-context.png` from the pre-filled draft (and rebuilds the review
   page). Read it before the checkpoint that settles a context's collaborators — a collaborator the
   C4 block lacks, or an arrow the wrong way round, shows at a glance. `ddd review <ddd-dir>`
   redraws it on demand after later edits.
2. Project knowledge (modes.md §1): `manifest.sources`, `README*`, `CONTEXT.md`, `docs/`, ADRs,
   schemas, and for brownfield the code's module names — evidence for vocabulary and rules. Do not
   ask the user for what the repo already says.
3. **Checkpoint 1 — inputs check** (one message, both modes): what you read, N contexts (which
   are core), deployables/teams, prefill warnings (missing relationships, guessed labels), anything
   contradictory. No question unless something is contradictory. A prefill note that a query's
   "message direction is the other way" means decompose lists the asker upstream of the answerer; the
   answering context is the supplier (contract §4.5, "Query direction") — fix decompose or record
   the question, never flip the message.

### 2. Draft the judgement fields — core contexts first (both modes)

Edit `define.json` in place (keep every pre-filled field unless it is wrong; keep ids). For more
than a handful of edits, a short `node -e` snippet that loads the file, sets the fields and writes
it back with `JSON.stringify(doc, null, 2) + "\n"` is less error-prone than hand-editing JSON. Per
canvas, with `references/canvas-guide.md` open:

1. **purpose** — 2–4 sentences, business language: what it decides/provides → for whom → so that
   (goal id) → what it does *not* own (which neighbour does). No technology.
2. **strategic_classification.business_model** — confirm or change the suggestion
   (revenue-generator / engagement-creator / compliance-enforcer / cost-reducer). `domain` and
   `evolution` come from strategize — do not re-decide; disagree via an open question.
3. **domain_roles** (1–2 from `references/domain-roles.md`) + **domain_roles_rationale** from the
   facts (aggregates, who commands it, external systems, policies).
4. **business_decisions** — rewrite every `[draft from policy …]` as a decision; add the invariants
   hiding in hotspots, aggregate candidates, read models and regulatory constraints. Condition →
   outcome, testable, numbers where a threshold exists (assumption if guessed).
5. **ubiquitous_language** — define every `TODO` term; add the nouns of its events/commands if
   missing; keep `avoid` lists; conflicting meanings across contexts stay separate (a boundary).
6. **verification_metrics** — 2–4: at least one business metric tied to a goal and one structural
   metric ("does the boundary hold?").
7. **assumptions** / **open_questions** — carried ones stay (they are prefixed `[step id]`). Each
   new one gets an envelope entry (`assumptions[] {id, text, confidence}` /
   `open_questions[] {id, text, blocking, owner}`, ids continuing `A<n>`/`Q<n>`) and a canvas-level
   string that cites it: `"[define A3] one system-wide weekly cut-off"`. A finding step 8 must act
   on that nobody has to answer (an integration style to pick, a provisional relationship) is a
   `notes_for_downstream[]` entry `{id N<n>, text, for: ["code"], kind}` instead of a question.
8. **quality_attributes** (top-level) — `references/quality-storming.md`: core contexts get 2–4
   rows with a concrete scenario; others per depth. Priority tied to goals/constraints.
9. Missing collaboration? (an event whose actor is an external system, an `existing_systems`
   entry with `will: integrate` and no message, a query a flow obviously needs) → add it to
   inbound/outbound using an **existing** message id, add an assumption, add an open question for
   `ddd-connect`, and add the party + `Rel` line to `system_context_c4_mermaid`.
10. A read model a decision or command relies on that discover lacks → canvas `read_models:
    [{name, informs, note}]` (additive; the renderer lists it next to discover's).

Lint as you go: `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs define render <ddd-dir> --check-only`.

### 3. Interactive checkpoints (interactive mode only; modes.md §2)

- **Section reviews**: up to 6 contexts → one checkpoint per context, core first; more → batch
  related contexts, at most 3 canvases per checkpoint. Present the four judgement parts —
  purpose, roles, decisions, metrics — in 150–300 words, then ask **≤4 questions** with
  `AskUserQuestion`, multiple-choice where a real decision exists: the rule hiding in a hotspot
  ("if the charge fails: retry 3 days / skip the week / block the subscription?"), the business
  model, the relationship label for an external system (conform vs anticorruption layer), a metric
  target. Ask about boundaries and rules, never about formatting.
- Quality attributes: one checkpoint for all contexts (core first): "top attributes and the
  scenario — right priority? competing criteria between contexts?".
- **Final confirmation**: list the assumptions and open questions you will record and the files
  you will write. Then write.
- "Looks good"/"continue" → stop asking. "Just finish it" → switch to auto for the rest and log
  the unasked questions as `open_questions`.

### Auto mode (modes.md §3) — no questions

Print the three checkpoints as short status lines and proceed. Every heuristic goes into
`assumptions[]` with a confidence (business model, roles, external-system relationship label,
guessed thresholds, any collaboration you added); every question you would have asked goes into
`open_questions[]` with `blocking: true|false` (blocking = you could not pick a defensible
default: the answer would move a boundary, change a message contract, or set a legal/financial
rule that has no safe fallback). Conservative defaults: keep the
strategize classification; `conformist` toward external systems unless the context is core (then
`anticorruption-layer`); one role per context unless two are obvious; a manual policy stays a
decision made by a person; a hotspot becomes a decision **and** an open question.

### 4. Write, validate, mark (both modes; modes.md §4)

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs define render <ddd-dir>          # lint + canvases + system-context.md + glossary sections; removes .prefill/
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp <ddd-dir>/07-define/define.json   # produced_at = now (render never touches define.json)
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step define        # gate = its `validated define: N error(s), M warning(s)` line
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> define done --mode <mode>   # artifacts + open-question count derived
```

- `ddd define render` refuses to render while a judgement field is still `TODO`/`[draft …]`, a core context
  has no quality attribute, a role is outside the enum, a message id is unknown, a message row has
  kind `response` (fold it into its request), two terms are the same word, a term is only "aggregate
  candidate …", or the C4 block does not round-trip — fix `define.json` and re-run. It skips a
  Markdown file whose generated marker was removed (hand edits) unless `--force`.
- `ddd validate`: the gate is its `validated define:` line; the status table and the `notes addressed
  to ddd-code` block after it are for step 8. Errors → fix; warnings go into the summary. On a
  re-run, the `code` step showing `stale` is expected (it must be re-run after this).
- Read the rendered glossary once: `## Shared` is kept (a term two contexts define differently
  gets "_(meaning differs by context — see below)_" appended, the definition stays); per-context
  sections are regenerated from `canvases[].ubiquitous_language`, with terms that differ from
  Shared marked as boundaries. Never delete a Shared term here — narrow it in its context section.
- `ddd mark … define draft` instead of `done` when a blocking question remains in auto mode or
  the user stopped early.
- **Closing summary** (a reader who sees only this message can act): absolute paths written;
  contexts with their roles and business model; the 3–6 most important findings (e.g. "billing is a
  gateway with two guessed rules — H1 is blocking"; "Box means two things — kept separate");
  quality attributes recorded per context; open questions (blocking first); validator result;
  next: `/ddd-code` (or "run `ddd-workflow` to continue").

## Method

Fill each canvas **from upstream data, not from imagination** — the brief tells you where each
fact comes from; `references/canvas-guide.md` has the full rules and examples. The essentials:

| Canvas section | Source | Rule |
|---|---|---|
| Purpose | subdomain descriptions + rationale, capabilities, goals via actors | decides/provides → for whom → goal → not-owned |
| Strategic classification | strategize type/evolution; business model = judgement | never re-classify here; open question instead |
| Domain roles | aggregates, commanding actors, external systems, policies | 1–2 roles, justified; ≥3 = boundary smell |
| Inbound / outbound | connect messages + flows, decompose relationships, discover commands/policies | grouped by collaborator; ids must exist; persons = `user-interaction`; a response is `response:` on its request row, never a row |
| Ubiquitous language | glossary Shared + decompose `terms[]` + discover glossary + aggregate nouns | one meaning per term per context; keep `avoid`; conflicts stay separate |
| Business decisions | policies (then-commands owned here), hotspots, aggregates, read models, constraints | decision with condition → outcome; testable; top 3 first |
| Assumptions / open questions | upstream items that name the context (id, terms, aggregates) + this step's own | auto mode: never empty |
| Verification metrics | goals' metrics + structural boundary metrics | one business + one structural, with thresholds |
| Quality attributes | constraints, at-least-once messages, external calls, core invariants | 2–4 per core context, each with a scenario |
| Owning team / deployable | organise teams + deployables | header of the canvas; shared deployable ⇒ in-process is available |

Good vs bad, the two that matter most:

- Purpose — bad: "Handles subscription CRUD, menu selection and pause/cancel endpoints; publishes
  to Kafka." Good: "Subscriptions owns a household's standing weekly order — active, paused or
  cancelled — and which recipes are locked in for a week, so a subscriber can choose meals in
  under two minutes and keep subscribing (G1). It does not charge (Billing) or pack (Fulfilment);
  it only tells them a week's choice is final."
- Business decision — bad: "Handle payment failures." / "Whenever meals chosen → charge week."
  Good: "If the weekly charge fails, the box is not released for packing and the subscriber is
  notified; retry daily for 3 days, then skip the week (assumption A3, open question Q2)."

Depth scaling: **light** — all canvases with short sections (purpose 2 sentences, top-3
decisions, 2 metrics), C4, quality attributes for the core context(s) only. **standard** — full
canvases, 2–4 quality attributes per core context, 1–2 for supporting contexts with an external
partner or a regulatory constraint, and one row for a *generic* context whose external partner is
on the critical path of a core flow (the payment provider: availability/idempotency/timeout — the
lint reminds you). **deep** — quality attributes for every context plus
`model_traits` notes on each canvas (draft vs executed semantics, consistency needs, data ownership).

Re-runs (contract §7): `ddd define prefill --write` merges — judgement fields you wrote are kept, deterministic
fields refreshed, contexts that disappeared move to `deprecated`. Use `--context <id> …` to
re-do a subset (e.g. one team's contexts); `ddd define render --context` renders only those. Ids never change.

Where to spend judgement: the pre-filled facts are reliable; purpose, decisions and quality
attributes are where a wrong guess costs the most — and where a human reviewer should look first.

## Output rules

`define.json` — envelope (§3): `schema_version: 1`, `step: "define"`, `produced_by: "ddd-define"`,
`produced_at` (now, ISO UTC — it must be newer than `organise.json`), `mode`, `depth`, `inputs`
(the files actually read), `assumptions[] {id, text, confidence}`, `open_questions[] {id, text,
blocking, owner}`, optional `notes_for_downstream[] {id, text, for, kind}` (findings for `code`;
pass-through upstream notes are never re-emitted). Step keys (§4.7):
- `canvases[]` — one per bounded context id in `decompose.json`, required keys `context, purpose,
  strategic_classification {domain, business_model, evolution}, domain_roles[], inbound[],
  outbound[], ubiquitous_language[] {term, definition}, business_decisions[], assumptions[],
  verification_metrics[], open_questions[], canvas_path`.
  - `canvas_path` is exactly `<ddd_dir>/07-define/<context-id>/bounded-context-canvas.md`.
  - `inbound[]/outbound[]` = `{collaborator, relationship, messages[] {id, kind}}`; every `id` exists
    in `connect.messages[]` or `discover.events[]/commands[]`; `collaborator` is a bounded context,
    actor or external-system id; `relationship` is a context-mapping pattern, `user-interaction`
    for persons.
  - Enums: `domain` core|supporting|generic (must match strategize); `business_model`
    revenue-generator|engagement-creator|compliance-enforcer|cost-reducer; `evolution`
    genesis|custom|product|commodity; `domain_roles` from the contract list (see
    `references/domain-roles.md`); message `kind` command|event|query (a response is folded into
    its request message as `response {id, name, payload}`, never a row of its own).
  - Extra keys the renderer uses (allowed by the contract): `name`, `domain_roles_rationale`
    (required by the lint), `owning_team`, `deployable`, `subdomains`, `implementation_pattern`,
    `model_traits[]`, `read_models[] {name, informs, note}` (additive to discover's), and per
    message `name`, `via`, `sync`, `delivery`, `payload[]`, `response`.
- `system_context_c4_mermaid` — a Mermaid `C4Context` block: one `System` (alias = the manifest
  project slug), `Person`s/`System_Ext`s with aliases derived from ids, one `Rel` per party and
  direction (producer → consumer) listing message names; responses are not drawn; labels keep
  digits and punctuation, dashes become `-`, no `"` inside; the lint checks the block round-trips.
- `quality_attributes[]` — `{context, attribute, requirement, priority high|medium|low, scenario}`;
  at least one for every core context; `context` is a bounded context id (or `system`).

Markdown — canvases and `system-context.md` are rendered by `ddd define render` from `define.json`
(v5 layout, template in `references/`), each with a generated-marker comment; hand-write them only
if the renderer is unavailable, then keep the JSON identical. `glossary.md`: `## Shared` untouched, one
`## <Name> context` section per context, `**Term** — definition. _Avoid_: …` lines.

Never: invent message ids or collaborators; re-classify a subdomain; unify two meanings of a word;
leave a `TODO` in a shipped canvas; hand-edit manifest statuses; write outside `<ddd-dir>`.

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. The draft mark in Workflow §1 draws
`<ddd-dir>/diagrams/c4-context.png` as soon as the pre-filled JSON exists (`aggregates-<context>.png` arrives with step 8); Read it before the checkpoint that settles a context's purpose, collaborators and rules:
the Read tool renders PNG, not SVG, and it is the same picture the human reviewer sees. No PNG means
no Chrome was found; the SVG is still on the page and the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `define.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. For an ownership or boundary decision (which context owns a rule, a term or a message), draw the options first: write one diagram spec per option at
`<ddd-dir>/07-define/decisions/<Did>-<opt>.json` (format `ddd-diagram-spec`; copy
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-A.json` (a context map) and edit its nodes and edges, or
hand it a blueprint architecture or sequence JSON), point `options[].diagram` at it, run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>` (`<step>:<Did>` when
another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png` before choosing.

## Self-review checklist

Before `ddd mark`:
- [ ] `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
      `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
      If a reader cannot follow it, they cannot catch what this step got wrong
- [ ] One canvas per bounded context in `decompose.json`; `canvas_path` exact and the file exists.
- [ ] Every purpose names what the context decides, for whom, the goal, and what it does not own.
- [ ] `domain` matches strategize; business model chosen and justified in an assumption if guessed.
- [ ] 1–2 domain roles per context with a rationale grounded in the facts.
- [ ] Inbound/outbound: every message id from connect/discover; grouped by collaborator; relationship pattern named; responses on their request row; nothing invented.
- [ ] Every business decision is a decision (condition → outcome), not a process step or a vague rule; hotspots turned into a decision + question.
- [ ] Language: every term has one definition here; conflicting meanings recorded per context, not unified; `avoid` lists kept.
- [ ] 2–4 verification metrics per context, at least one business and one structural, with thresholds.
- [ ] Quality attributes per depth, each with a concrete scenario; competing criteria surfaced as questions.
- [ ] Assumptions/open questions: upstream ones carried; auto mode logged every heuristic; blocking ones flagged.
- [ ] `system-context.md`: one system box, every person/external system on a canvas appears in the diagram, C4 lint clean.
- [ ] `ddd define render` lint OK, `ddd stamp` run, `ddd validate --step define` gate line read (warnings noted), `ddd mark` run, summary names `/ddd-code`.
- [ ] The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Next step hand-off

`/ddd-code` (step 8) reads each `bounded-context-canvas.md` and `define.json` to design aggregates
(from business decisions and aggregate candidates, domain-model contexts only), ports and adapters
(from inbound/outbound per collaborator), modules per deployable, tests from the decisions and
quality attributes, and the implementation plan. Tell the user: "Next: `/ddd-code`, or run
`ddd-workflow` to continue; review the canvases' business decisions and quality attributes first —
that is where a wrong guess costs the most."
