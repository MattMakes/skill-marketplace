---
name: ddd-strategize
description: Use when the user asks which parts of the system are core vs supporting vs generic, wants a core domain chart, asks "where should we invest", "what's our differentiator", "should we build or buy X", "which parts deserve a rich domain model / aggregates / event sourcing", wants an implementation pattern (transaction script, active record, domain model, event-sourced) per subdomain, or is continuing after ddd-decompose. STEP 4 of the 9-step ddd-* chain (understand → discover → decompose → strategize → connect → organise → define → code → contracts) - consumes ddd/03-decompose/decompose.json (subdomains, bounded contexts) plus ddd/01-understand/understand.json (goals, capabilities with Wardley evolution, existing systems) and produces ddd/04-strategize/strategize.json + core-domain-chart.md (mermaid quadrant chart, scores, sourcing, implementation pattern, investment, bets), consumed by ddd-connect, ddd-organise, ddd-define and ddd-code. Runs interactively (two checkpoints, at most 4 questions each) or in auto mode (no questions, assumptions logged). To run the whole process end to end use ddd.
---

# ddd-strategize — decide where to invest (step 4 of 9)

Classify every subdomain from `ddd-decompose` as **core** (differentiating: build it in-house with a
rich model and the best people), **supporting** (necessary, not differentiating: keep it simple) or
**generic** (a solved problem: buy or adopt), then choose for each the **sourcing** decision and the
**business-logic implementation pattern**. This is the step that makes DDD cheap: tactical patterns
(aggregates, event sourcing, hexagonal ports) are spent only where they pay back. Upstream:
`ddd-decompose` (boundaries) and `ddd-understand` (goals, Wardley evolution). Downstream:
`ddd-connect` (investment shapes integration effort), `ddd-organise` (the core gets the strongest
team), `ddd-define` (strategic classification on each canvas) and `ddd-code` (the pattern decides
whether aggregates get designed at all). `ddd` orchestrates the whole chain.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's: `ddd strategize worksheet` (one working sheet per subdomain.
  from the upstream JSON), `ddd strategize render` (Markdown + mermaid from the JSON; `--update-json` also
  stamps `produced_at`) and `ddd strategize lint` (semantic checks the validator does not make).
- Contract and protocol, read once per session: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md`
  (§3 envelope and `notes_for_downstream`, §4.4 this step, §7 re-runs) and `${CLAUDE_PLUGIN_ROOT}/shared/references/modes.md`.
- Reading list by depth (`references/`): **light** — the Method below, `classification-guide.md` §3 when
  a type is contested; **standard** — guide §2–§3 (anchors, rules), §5 (sourcing), §8 (rationale bar),
  `implementation-patterns.md` §2 (decision tree); **deep** — the whole guide (§4 core patterns, §6
  investment, §7 purpose alignment), patterns §2–§5. `core-domain-chart-template.md` only to hand-write the Markdown.
- Shapes to copy: `${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/04-strategize/` shows the JSON
  *shape* only; its rationale prose is below this skill's bar — model rationales on guide §8 and patterns §3.
- Interactive mode needs `AskUserQuestion`; without it (subagent, orchestrator run) you are in auto mode.

## Inputs & outputs

| | Path (relative to the project root; `<ddd-dir>` defaults to `./ddd`) |
|---|---|
| **Input (chain)** | `ddd/03-decompose/decompose.json` — `subdomains[]`, `bounded_contexts[]`, `relationships[]` |
| **Input** | `ddd/01-understand/understand.json` — `goals[]`, `capabilities[].evolution`, `existing_systems[]`, `constraints[]`, `business_model`, `impacts[]`, `deliverables[]` |
| **Input** | `ddd/manifest.json` — `mode`, `depth`, `scale_target`, `sources`; `ddd/glossary.md`; `ddd/02-discover/discover.json` (policies, hotspots — complexity evidence) if present |
| **Output** | `ddd/04-strategize/strategize.json` — contract §4.4 + envelope §3 (the chain) |
| **Output** | `ddd/04-strategize/core-domain-chart.md` — mermaid `quadrantChart` (x = model complexity, y = business differentiation) + classification table + rationale/future direction + investment + bets + derived hand-off (rendered from the JSON) |
| **Gate** | `ddd strategize render --update-json` after the last JSON edit; `ddd validate <ddd-dir> --step strategize` prints `0 error(s)`; then `ddd mark … strategize done` |

## Workflow

Follow `modes.md` §0–§4. Print the three checkpoint status lines (formats in §3) in both modes.

### 0. Resolve workspace, mode, depth

```bash
DDD=<ddd-dir>   # user's instruction > manifest ddd_dir > ./ddd — print the absolute path
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate "$DDD" --status
```

- Mode: user said "auto" / "no questions" / "just draft" → `auto`; you are a subagent or cannot ask →
  `auto`; else `manifest.mode`; else `interactive`. Depth from the manifest (`light` | `standard` | `deep`).
- No manifest → `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir "$DDD" --project <slug> --mode <mode> --depth <depth>`.
- `decompose.json` missing → modes.md §0 step 4: interactive → offer *run `ddd-decompose` now* /
  *bootstrap from a subdomain list the user gives* / *stop*; auto → run `ddd-decompose` (Skill tool or
  its `SKILL.md`) first. Bootstrapped runs record assumption "A1: decompose skipped; subdomains taken from …".
- `decompose` shows `stale` → warn; interactive: ask whether to proceed or re-run upstream first.
- Re-run: read the existing `strategize.json` first; keep its ids (`B1`, `A1`, `Q1`), update in place,
  list removed classifications under `deprecated` (contract §7).

### 1. Gather (both modes)

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs strategize worksheet "$DDD"    # --json for the raw sheets
```

The sheet per subdomain: capabilities with their `evolution` (least evolved wins), event/command
counts with pivotal events, policies on its events, hotspots near them, aggregate candidates, the
goals/impacts/deliverables that name it (structural links first, then text mentions — "none" is an
honest answer), existing systems it touches (`will: replace` = the alternative the customer has
today), constraints, hosting context; the header: scale target (`teams` caps the decisive cores), core
cap, value propositions, goals, and every upstream `notes_for_downstream` addressed to `strategize`.
Then read only what the sheet cannot give — `glossary.md`, `manifest.sources`, obvious project docs
(`README*`, `CONTEXT.md`, `docs/`, ADRs), anything the user pasted — and list every file read in
`inputs` (decompose, understand and the manifest at least). Do not ask for what the repo already
says. Act on upstream notes; never re-emit one you merely agree with (contract §3).

### 2. Draft: score, classify, decide

For every subdomain, using the Method below and `references/classification-guide.md`: score
**business differentiation** and **model complexity** (0–10), derive **type**, **evolution**, **sourcing**,
**implementation pattern**, **investment**, a **rationale** that names a goal id and the rule that fired,
and a **future direction**. Then `core_domains`, `bets[]`, and at `deep` the purpose alignment quadrant
and chart pattern. Auto mode: every judgement a domain expert might overturn becomes an `assumptions[]`
entry with a confidence; every question you would have asked becomes an `open_questions[]` entry with
`blocking`. When in doubt: supporting, not core (modes.md §3).

Write `$DDD/04-strategize/strategize.json` as soon as the scores exist (Output rules; the checkpoints edit
the same file), run `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs strategize render "$DDD" --update-json`, then

```
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> strategize draft --mode <mode>
```

This draws `<ddd-dir>/diagrams/core-domain-chart.png` (and rebuilds the review page). Read it before
checkpoint A: a "core" subdomain sitting in the generic corner is obvious in the picture and easy to miss
in the table. `ddd review <ddd-dir>` redraws it on demand after later edits.

### 3. Checkpoints

**Inputs check** (one message, no question unless contradictory): what you read; mode, depth,
scale; the subdomain count; anything odd (a subdomain with no capability, a capability marked
`commodity` inside what looks like the core, an existing system that already covers a subdomain).

**Checkpoint A — scores and types** (interactive; ≤ 4 questions via `AskUserQuestion`, concrete
options). Show the draft table (subdomain, diff, cplx, type, one-line rationale). Ask only about real
decisions: "Is `pricing` where you beat competitors (core, 8) or table stakes (supporting, 4)?", "Is
`notifications` sending only (generic) or do message rules matter (core content)?", "`warehouse-slotting`
is complex but supporting — accidental complexity or a hidden core?", "Which core would you drop if you could fund only two?"

**Checkpoint B — sourcing and patterns** (≤ 4 questions). Show sourcing + evolution + pattern +
investment per subdomain. Ask about build-vs-buy where a product exists (name the constraint that could
block buying: data residency, budget, offline), whether any core needs the *history* (audit, disputes,
"state as of", analytics → event-sourced), whether a supporting subdomain can be outsourced. Then
**final confirmation**: the assumptions and open questions you will record and the two paths you will
write. "Looks good" / "continue" → stop asking. "Just finish it" → auto for the rest.

**Status lines** — one per checkpoint, both modes (auto prints them and continues, never waits):

```
Inputs: decompose 14 subdomains / 9 contexts; understand 5 goals, 12 capabilities, 3 existing systems; discover 48 events; manifest; mode auto, depth standard, scale 3–6 deployables / 2 teams; odd: <finding or none>
Checkpoint A: 14 scored — core 2 (`dispatch`, `pricing`; decisive 1), supporting 7, generic 5; 3 assumptions
Checkpoint B: build 9 / buy 5 / open-source 0 / outsource 0; patterns ES 1, DM 1, AR 5, TS 7; investment high 2 / medium 4 / low 8; 2 open questions (0 blocking)
```

### 4. Write, render, lint, validate, mark, summarise — in this order

```bash
# 1. write the JSON (Output rules below) to "$DDD/04-strategize/strategize.json"; any placeholder produced_at is fine
# 2. render the Markdown, store the mermaid in the JSON and stamp produced_at — re-run after ANY later JSON edit (--styled for coloured points)
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs strategize render "$DDD" --update-json
# 3. semantic lint: fix every ERROR; fix WARNs or add an assumption saying why the decision stands; then back to 2
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs strategize lint "$DDD"
# 4. the gate: must print "validated strategize: 0 error(s)" (stale warnings on downstream steps are expected after a re-run)
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate "$DDD" --step strategize
# 5. mark the step (draft instead of done if the user stopped early or a blocking question remains in auto mode); artifacts and open-question count are derived
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir "$DDD" strategize done --mode <mode>
```

Hand-edited the JSON after step 2? Re-render (the Markdown must match); `ddd stamp <json>` alone only
re-stamps `produced_at`. Close with the summary in *Next step hand-off*. If the user edited
`core-domain-chart.md` by hand on a re-run and it disagrees with the JSON: interactive → ask which
wins; auto → trust the Markdown, regenerate the JSON, re-render.

## Method

**Score business differentiation (0–10)** — *does doing this better than competitors win customers
or money?* 0–1 any vendor's version is fine (auth, card capture); 2–3 must work, nobody notices
excellence; 4–5 some advantage, quickly matched (parity); 6–7 directly moves a goal metric, a value
proposition depends on it; 8–9 the reason customers pick us, hard to copy; 10 the business *is* this.
Evidence: `value_propositions`, `key_activities`, `goals[].metric`, `impacts[]`, `must` deliverables
push up; `existing_systems` with `will: integrate`, `commodity` evolution, `non_goals` push down.

**Score model complexity (0–10)** — *how many rules, invariants, state transitions, edge cases?*
0–1 forms-over-data; 2–3 validation-heavy CRUD, a few statuses; 4–5 a lifecycle with invariants,
calculations, several actors; 6–7 many interacting rules, time-dependent behaviour, consistency
constraints; 8–9 algorithms, optimisation, scheduling, pricing, matching; 10 nobody has a proven
model (genesis). Proxies: events+commands count, policies triggered by its events, hotspots near
them, an aggregate candidate, words like *optimise/allocate/schedule/price/match*. Separate
essential from accidental (legacy) and operational (done by people) complexity.

**Classify, first rule wins.** (1) **generic**: diff ≤ 3 and solved elsewhere — evolution `product`/
`commodity`, an integrated existing system, or a commodity category (identity, payments, invoicing,
notifications, storage, search, BI, CRM, payroll, CMS, monitoring, maps, tax). (2) **core**: diff ≥ 7,
or diff 6 with cplx ≥ 6 and a goal that depends on it. (3) **supporting**: the rest. Core must be the
minority: if `cores > max(2, n // 2)`, demote by differentiation rank and log one assumption per
demotion; zero cores is allowed only with the explicit assumption "differentiation lies outside the
software". If everything looks core, the *scoring* is wrong — re-anchor against the value propositions.
**Cores vs teams**: *decisive* cores (both scores ≥ 8) should not exceed `scale_target.teams` — one
core per stream-aligned team is the healthy shape; more → demote one (by differentiation rank, logged)
or name the team that owns both in a `notes_for_downstream` entry `for: ["organise"]`, kind `decision`.

**Evolution and sourcing.** Subdomain evolution = stage of its *least evolved* capability; no
capability → infer from existing systems / description and log it. `genesis` → build as a bet;
`custom` → build; `product` → buy/adopt unless it cannot be configured to your rules;
`commodity` → buy the utility. Core → always `build` (vendor components allowed, the model is ours).
Generic → `buy`, or `open-source` when a constraint favours self-hosting, rarely `outsource`.
Supporting → `build` simple, `buy` and configure when a mature product covers most of it, or
`outsource` when capacity is the constraint (execution may be outsourced; understanding never is).
Name the constraint (`C*`) that moved a default. `product` evolution with nothing bought yet still
records `sourcing: buy` (the decision, not the purchase); the deferral — what runs until then, what
triggers the buy — goes in `future_direction` and an open question; never invent enum values. AI code
generation makes a subdomain cheaper to *write*, not to *own* — it does not move a generic towards `build`.

**Implementation pattern — gate on type before anything else** (`references/implementation-patterns.md`):
generic → `transaction-script` glue, never a model of the vendor's problem; supporting → cplx ≤ 3 flat
data `transaction-script`, cplx ≤ 5 structured data `active-record`, cplx ≥ 6 "suspect supporting" →
simplify or re-check the type; core → cplx ≤ 3 `active-record` (short-term / hidden core, do not
over-engineer), cplx ≥ 4 `domain-model`, upgraded to `event-sourced-domain-model` only when the
history is an asset (money/ledger reconstruction, audit or dispute evidence, "state as of" queries,
analytics on behaviour) — record that as `history_is_asset`. A payments wrapper touches money daily
and is still generic → transaction script. A bounded context takes the type and pattern of its *most
demanding* subdomain (patterns §4); a generic subdomain hosted inside a built context is an adapter (an
ACL inside that context), never a reason to call the context generic — the renderer derives the hand-off so.

**Investment**: core `high` (best people, domain experts in the room, aggregates + invariant tests,
quality attributes); supporting `medium` when cplx ≥ 5, it feeds the core directly, or a failure
there breaks a regulatory constraint or damages the brand, else `low`; generic `low` (integration,
an ACL if the vendor model leaks). Sanity check (Nick Tune): if planned
effort on supporting + generic exceeds the core, say why — usually accidental complexity to remove.

**Future direction** (Nick Tune's patterns): *decisive core* (both ≥ 8) — the big investment;
*short-term / first-to-market core* (high diff, low cplx) — competitors catch up, name the next core;
*hidden core* — the hard part is still done by people, ask what could be automated; *table-stakes
former core* and *commoditised core* — plan the move to supporting/buy; *suspect supporting* — set
a timeline to reduce accidental complexity; *big bet* — a `bets[]` entry with its risk and the signal
that validates it. Classification is not permanent: recommend a review every 6–12 months.

**Bets**: from `why_now`, long-horizon goals, `genesis` capabilities and `could` deliverables with
outsized impact. `{id, text, risk}` plus optional `subdomains`, `validate_by`. At least one at
`standard`/`deep`, or state that there is none.

**Depth scaling** (the chart itself is free — the renderer always draws it): `light` — scores, type,
pattern, plus the schema-required sourcing and investment, a one-sentence rationale, a one-line future
direction; `standard` — plus evolution reasoning (`evolution_rationale`, or one clause of `rationale`), a
fuller future direction naming the Nick Tune pattern, at least one bet, a `summary`; `deep` — plus
`purpose_alignment` (differentiating / parity / partner / who-cares), `chart_pattern` labels, an
`investment_summary` (who and how much), bets with `validate_by`, and a short `wardley_narrative` (what
commoditises next, where pioneers vs town planners belong). Every subdomain is fully classified at every depth; light just says less.

**Rationale — good vs bad.** A good rationale names the goal (or that none applies), the alternative
the customer has today (competitor, spreadsheet, manual process — from `existing_systems` with
`will: replace`, the value propositions or understand's `alternatives` when present; else "no
alternative known"), the rule that fired and where the complexity comes from: "core — G1 (10k active
subscribers) depends on weekly choice under two minutes (I1); today's alternative: competitors' generic
pickers; rule 2 (diff ≥ 7); cplx 6 from cut-off and substitution rules; nothing to buy". Bad: "core —
it's important and customers use it a lot". Wrongly marked core: `notifications`
scored 8 "because customers love our emails" — no goal metric names it, the capability is `commodity`,
three SaaS vendors do it → generic, buy, transaction script; the content *rules* belong to the core
subdomain that decides what to say, not to the channel.

## Output rules

`strategize.json` = envelope (§3) + step keys (§4.4). Required top-level keys: `schema_version` (1),
`step` ("strategize"), `produced_by` ("ddd-strategize"), `produced_at` (stamped by the renderer), `mode`,
`depth`, `inputs` (paths relative to the project root — decompose, understand and the manifest at least),
`assumptions[]` (`id`, `text`, `confidence` low|medium|high), `open_questions[]` (`id`, `text`, `blocking`,
`owner`), `classifications[]`, `core_domains[]`, `bets[]`, `chart_mermaid` (filled by `ddd strategize render
--update-json`). Optional, rendered when present: `summary`, `investment_summary`, `wardley_narrative`, `deprecated[]`, `notes_for_downstream[]`.

Each classification: `subdomain` (a `decompose.subdomains[].id`), `type` core|supporting|generic,
`business_differentiation` and `model_complexity` (numbers 0–10), `evolution`
genesis|custom|product|commodity, `sourcing` build|buy|open-source|outsource, `implementation_pattern`
transaction-script|active-record|domain-model|event-sourced-domain-model, `investment` high|medium|low,
`rationale` (names a goal id or says none applies, and the rule that fired), `future_direction`;
at `deep` also `purpose_alignment` and `chart_pattern`. Additive keys the lint prefers to prose:
`goal_ids` (understand `G*` ids; `[]` = no goal applies), `history_is_asset` (`true` is what justifies
`event-sourced-domain-model`; set it on every core), `evolution_rationale` (string, standard+).
Without them the lint reads the prose and accepts exactly these: a goal as `G<n>`; "none" as one of
`no goal`, `outside the software`, `not tied to a goal`; an event-sourcing need as one of `audit`,
`ledger`, `money`/`monetary`, `refund`, `dispute`, `regulat…`, `complian…`, `temporal`, `as of`,
`history`, `analytic…`, `replay`, `reconstruct`, `forensic`, `machine learning`/`ML`.

`notes_for_downstream[]` (`{id, text, for, kind}`): only findings later steps need and cannot derive
(the cores-vs-teams decision for `organise`) or an upstream note you sharpen or overrule (cite its id:
"sharpens decompose N2"). Never re-emit a pass-through note: `ddd validate --status` already shows every
upstream note to its step.

Rules: **every** subdomain in `decompose.json` classified exactly once, no unknown ids;
`core_domains` = exactly the subdomains typed `core`; ids never renamed on re-runs; timestamps move
forward on every write (downstream steps then show `stale`, which is correct). Skeleton:

```json
{ "schema_version": 1, "step": "strategize", "produced_by": "ddd-strategize", "produced_at": "stamped-by-render",
  "mode": "auto", "depth": "standard",
  "inputs": ["ddd/03-decompose/decompose.json", "ddd/01-understand/understand.json", "ddd/manifest.json"],
  "assumptions": [{ "id": "A1", "text": "…", "confidence": "medium" }],
  "open_questions": [{ "id": "Q1", "text": "…", "blocking": false, "owner": "product" }],
  "classifications": [{ "subdomain": "ordering", "type": "core", "business_differentiation": 8, "model_complexity": 7,
    "evolution": "custom", "sourcing": "build", "implementation_pattern": "domain-model", "investment": "high",
    "goal_ids": ["G1"], "history_is_asset": false, "evolution_rationale": "custom: …",
    "rationale": "core — G1 … ; today's alternative: … ; rule 2 (diff ≥ 7); cplx 7 from …", "future_direction": "stays core; …" }],
  "core_domains": ["ordering"], "bets": [{ "id": "B1", "text": "…", "risk": "…" }],
  "notes_for_downstream": [{ "id": "N1", "text": "…", "for": ["organise"], "kind": "decision" }], "chart_mermaid": "quadrantChart …" }
```

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. The draft mark in Workflow §2 draws
`<ddd-dir>/diagrams/core-domain-chart.png` as soon as the JSON exists; Read it before the checkpoint that settles the classification and the investment:
the Read tool renders PNG, not SVG, and it is the same picture the human reviewer sees. No PNG means
no Chrome was found; the SVG is still on the page and the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `strategize.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. For a decision whose options differ in shape, draw the options first: write one diagram spec per option at
`<ddd-dir>/04-strategize/decisions/<Did>-<opt>.json` (format `ddd-diagram-spec`; copy
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-A.json` (a context map, useful when a classification would move a boundary) and edit its nodes and edges, or
hand it a blueprint architecture or sequence JSON), point `options[].diagram` at it, run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>` (`<step>:<Did>` when
another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png` before choosing.

## Self-review checklist

Before `ddd mark`, confirm each line; anything you cannot confirm becomes an open question.

- [ ] `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
      `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
      If a reader cannot follow it, they cannot catch what this step got wrong
- [ ] Every subdomain in `decompose.json` appears exactly once; `core_domains` matches the `core` rows.
- [ ] Core is the minority (`≤ max(2, n // 2)`) and every core names a goal metric it moves; zero cores
      is stated as an explicit assumption; decisive cores ≤ `scale_target.teams`, or a note for `organise`.
- [ ] No rationale is "it's important": each names a goal (`goal_ids`, `[]` if none), the alternative
      the customer has today (or "no alternative known") and the rule that fired.
- [ ] No core is sourced `buy`/`outsource`; no `commodity` subdomain is `build` without a named constraint.
- [ ] Pattern follows the type gate: generic → transaction script; supporting → TS/AR; core → domain
      model; event sourcing only with `history_is_asset: true` and the need written in the rationale.
- [ ] Investment: core `high`; nothing generic is `high`; if supporting+generic effort exceeds core, the
      summary says why.
- [ ] Future direction names the Nick Tune pattern where it applies; at least one bet at standard/deep.
- [ ] Depth honoured (light fits on a screen; deep has purpose alignment and the Wardley narrative).
- [ ] `inputs` lists what was actually read; assumptions and open questions are complete for auto mode;
      no pass-through upstream note re-emitted.
- [ ] `ddd strategize render --update-json` run after the last JSON edit (it stamps `produced_at`); lint has no
      errors; validator `0 error(s)`; manifest marked via `ddd mark`, never by hand.
- [ ] The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Next step hand-off

Finish with a message a reader can act on without the transcript: the two absolute paths written;
the classification in one line ("core: `ordering`; supporting: `fulfilment`, `catalogue`; generic (buy):
`billing`, `identity`"); the 3–6 findings that matter (the decisive core and why, any hidden or
suspect subdomain, the build/buy calls and the constraint behind them, which contexts will get
aggregates and which will not, the bets); open questions (blocking ones quoted); the validator and
lint result; then the next step — **`/ddd-connect`** (message flows: integration effort follows the
investment recorded here; ACL where a bought context is upstream; a hosted generic is an adapter, not a
relationship) or "run `ddd` to continue". Also point at what `ddd-organise` (core team),
`ddd-define` (classification per canvas) and `ddd-code` (aggregates only for `domain-model` /
`event-sourced-domain-model` contexts) will read from this artifact.
