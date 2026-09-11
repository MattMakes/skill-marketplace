---
name: ddd-understand
description: Use when starting domain-driven design on a system — the user wants to "design this system properly", kick off domain modelling or a DDD workflow, asks why the system exists and for whom, wants a Business Model Canvas, Impact Map, product goals with metrics, business capabilities, constraints or a scale target (anything from 1–3 services up to 10–20 deployables) before modelling, or a ddd run is beginning. FIRST step of the 9-step ddd-* chain (understand → discover → decompose → strategize → connect → organise → define → code → contracts) — creates ddd/manifest.json plus ddd/01-understand/understand.md and understand.json, which ddd-discover consumes next. Runs interactively or in auto mode (no questions, assumptions logged). To run the whole process end to end use ddd instead.
---

# ddd-understand — why, for whom, what counts as success, how big

Step 1 of 9 in the DDD Starter Modelling Process chain (ddd-crew). Before anyone models events,
boundaries or aggregates, write down what the modelling is *for*: why the system exists, who it
serves, what success would measurably look like, what differentiates it and from what (feeds
`ddd-strategize`), what constrains it, and how big the result is meant to be. Output: a Markdown
artifact for humans (Business Model Canvas, Impact Map, capabilities with their Wardley evolution
stage, constraints, non-goals, existing systems, the alternatives people use today, scale target)
and `understand.json`, the machine contract the chain reads (`ddd-discover` takes actors, goals,
capabilities and existing systems; `ddd-strategize` the alternatives; every later step goals and
`scale_target`). Being first, this step also creates the `ddd/` workspace and its manifest. It
does no solution design — no services, schemas or technology choices.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's: `ddd understand lint`.
- The shared contract and scripts under `${CLAUDE_PLUGIN_ROOT}/shared/` (read-only — never edit
  them): `references/artifact-contract.md` (§1 layout, §3 envelope, §4.1 this step, §7 re-runs);
  `references/modes.md` §0–§4; `schemas/understand.schema.json` (the authoritative shape) and
  `examples/mealkit/ddd/01-understand/understand.json` (copy shapes from it).
- This skill's own files: `references/understand-template.md` (Markdown shape plus a filled example),
  `references/method-guide.md` (heuristics with sources — §1 once, then the section for the part you
  are drafting, see Workflow §2), `ddd understand lint` (Output rules → Lint rules, as code).

## Inputs & outputs

Inputs (no upstream artifact — this is the first step): project knowledge (`README*`, `CONTEXT.md`,
`docs/`, `brainstorm/`, ADRs, PRD or pitch docs; for brownfield, module/package names,
`docker-compose`/Kubernetes manifests, integrations, CODEOWNERS); what the user says or pastes (in a
`ddd` run: the workspace path, mode, depth and scale target it passes); on a re-run, the existing `ddd/01-understand/understand.json`.

Outputs (paths relative to the project root; `ddd/` can be overridden — resolve it first):

- `ddd/manifest.json` and `ddd/glossary.md` — created by `ddd init` (never hand-edit statuses)
- `ddd/01-understand/understand.md` — the human artifact (`references/understand-template.md`)
- `ddd/01-understand/understand.json` — contract §4.1 plus the envelope §3 (see Output rules)
- Gate: `ddd init --from-understand` (manifest sync) → `ddd understand lint` OK →
  `ddd validate <ddd-dir> --step understand` OK → `ddd mark --dir <ddd-dir> understand done …`

## Workflow

Announce at the start: "Using ddd-understand (1/9) — <mode> mode, depth <depth>, workspace <absolute path>."

### 0. Resolve workspace, mode, depth and scale (modes.md §0)

1. **Project root** is the folder being designed — the cwd unless the user points elsewhere. **DDD
   dir**: the user's instruction > `ddd_dir` in an existing `ddd/manifest.json` > `./ddd`. Print the absolute path.
2. **Mode** — first match wins: the user said "auto", "no questions", "just draft", "don't ask" →
   `auto`; you cannot ask (no `AskUserQuestion` tool, or you were invoked by another agent, a
   subagent run, or `ddd` saying "mode: auto") → `auto`; `manifest.mode` is set → use
   it; otherwise → `interactive`.
3. **Depth** — the user's or orchestrator's word > manifest > inference: `light` for a quick or
   time-boxed pass, or a small system (≤3 deployables, one team) described in a paragraph or less;
   `deep` only when asked or at ≥10 deployables or ≥3 teams; else `standard`. Record an inferred
   depth as an assumption.
4. **Scale target** — the user's statement ("three services", "up to fifteen deployables", "two
   teams") > manifest > repo evidence (Method §7) > default `1–3` deployables, `1` team, recorded
   as a low-confidence assumption with an open question.
5. **Re-run?** If `understand.json` exists this is an update: load it, keep every id, number new ids
   after the highest existing one, and list removed items under `deprecated[] {id, collection,
   reason, since}` (contract §7). Never renumber or rename an id — later steps reference them.
6. **Interactive only:** if the project name, one-liner or scale target cannot be inferred from
   the repo, ask now — one `AskUserQuestion` with at most three questions, multiple-choice for
   scale ("1–3 / 4–9 / 10–20 deployables") and depth. Never ask for what the repo already says.
7. **Create or refresh the manifest** — from the project root, in one command. `ddd init` stores
   `ddd_dir` relative to the cwd, so running it elsewhere corrupts the manifest (`"ddd_dir": "../../ddd"`);
   agent threads reset the cwd between Bash calls, hence the `cd &&` — on every script call below too:

   ```bash
   cd <project-root> && node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir ddd \
     --project <kebab-slug> --title "<Title>" --mode <mode> --depth <depth> \
     --deployables-min N --deployables-max N --teams N --notes "<e.g. solo dev, modular monolith preferred>" \
     --source README.md --source <each other doc you read>
   ```

   `ddd init` is idempotent: re-running with new flags updates only those fields and keeps statuses.

### 1. Gather inputs (both modes)

Read, and list in `inputs[]` exactly what you read: the existing `understand.json` if any;
`manifest.sources` plus `README*`, `CONTEXT.md`, `docs/`, `brainstorm/`, ADRs, product docs; for
brownfield the module/package names, service lists and integrations (existing vocabulary is
evidence — do not invent synonyms); and what the user said. Decide the lifecycle from the system
being built — *does its code run in production today?* No → `greenfield` (even if it displaces the
customers' spreadsheets or a vendor tool: those go in `existing_systems` with `will: replace` and
in `alternatives`); yes, extending it → `brownfield`; yes, replacing it → `rewrite`.

**Checkpoint 1 — inputs check:** what you read, the mode/depth/scale/lifecycle you resolved and
why, anything surprising or contradictory. Interactive: one message, ask only if something
contradicts. Auto: keep it for the closing summary (§3).

### 2. Draft everything before showing anything

Draft the complete artifact in this order — each part feeds the next: system → Business Model
Canvas (method-guide §2) → goals (§3) → actors → impacts → deliverables (§4) → capabilities with
evolution (§5) → constraints → non-goals → existing systems → alternatives, then the value
proposition → capability → beats links (§6, §2) → scale target (§7) → assumptions, open questions,
notes for downstream. Size everything to depth (§8 and Method → Depth).

Write `<ddd-dir>/01-understand/understand.json` as soon as the draft exists (every checkpoint
below updates the same file; §4 finishes it) and run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> understand draft --mode <mode>`:
cheap insurance against a session ending mid-checkpoint. This step draws no diagram; the mark
still rebuilds `<ddd-dir>/review.html`, so the draft is already on the page.

### 3. Review the draft

**Interactive** (modes.md §2) — **checkpoint 2, section reviews**: present the draft in sections of 150–300 words, each ending in at
most four targeted questions, multiple-choice where a real decision exists. Sections: (1) system
and canvas, (2) goals and impact map, (3) capabilities and evolution stages, (4) constraints,
non-goals, existing systems, alternatives, scale target. At `light` depth merge to two sections.
Ask about goals and their numbers, missing or obstructing actors, capability boundaries, evolution
stages, what people use instead today, and constraints — never about formatting. "Looks good" or "continue" → stop asking. "Just finish
it" → switch to auto for the rest and log every unasked question in `open_questions`.
**Checkpoint 3 — final confirmation:** the assumptions, open questions and paths you are about to
write. Then write.

**Auto** (modes.md §3, with one override): no questions at all, and do **not** print the three
checkpoints as separate messages — in a subagent run nobody reads them. Fold them into the
closing summary as three lines (inputs read; mode/depth/scale/lifecycle and why; assumptions and
questions recorded), optionally also as a `## 11. Run log` at the end of `understand.md`. Every
inference a domain expert could overturn → `assumptions[]` with a confidence; every question you
would have asked → `open_questions[]`. Mark a question `blocking: true` only when the chain
literally cannot proceed without the answer (you cannot tell what the system is or who it is
for); a choice between two plausible readings is a non-blocking question plus a conservative
assumption. Conservative means: capabilities in the lower half of the depth's aim band (Method →
Depth); the smaller scale target; `product`/`commodity` over `custom` for anything that is not
the differentiator; `custom` over `genesis` when unsure.

### 4. Write, check, close

1. `produced_at`: write any placeholder, then after step 2 run
   `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs stamp ddd/01-understand/understand.json` (sets it to now, UTC).
2. Write `ddd/01-understand/understand.md` from the template, then `understand.json` per Output
   rules. Same content, same ids in both; the JSON is the chain, the Markdown is for people.
3. Sync the manifest — always, from the project root, whether or not anything changed while
   drafting (it copies `scale_target` and the title from the JSON; do not re-type flags):

   ```bash
   cd <project-root> && node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir <ddd-dir> --from-understand <ddd-dir>/01-understand/understand.json
   ```

4. Lint, then validate. Fix every error before continuing; warnings go into the summary (the status
   table `ddd validate` prints still says `understand pending` here — only `RESULT: FAIL` fails; step 5 flips it).

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs understand lint <ddd-dir>
   node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step understand
   ```

5. Mark the step — `done`, or `draft` if the user stopped early or a blocking question remains.
   Omit `--artifacts` and `--open-questions`; the script derives both from the step folder and JSON:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> understand done --mode <mode>
   ```

6. Closing summary (modes.md §4) — a reader who sees only this message can act on it: absolute
   paths written; in auto mode the three checkpoint lines from §3; 3–6 findings (headline goal
   with its number, primary actor and its impact, the capabilities and which are
   product/commodity, how many alternatives and which capability they contest hardest, lifecycle,
   scale target); the open questions (blocking ones quoted); the notes passed downstream (count,
   then one line each `N1 → discover, decompose (language): …`, or "none"); lint and validate
   result; and the next step: `/ddd-discover` (or "run `ddd` to continue").

## Method

The heuristics that force decisions. Details, tables and sources: `references/method-guide.md`.

- **Goals are outcomes, not outputs** (§3). A goal is a change you could read off a dashboard:
  `statement` + `metric` + `target` + `horizon`. When the inputs give only outputs ("launch the
  portal"), ask "so that what?" until you reach a number; if none is inferable, keep the goal with
  your best proxy metric and an open question owned by the product owner. Good: "Cut time-to-first-
  invoice from 3 days to 1 hour — metric: median hours from sign-up to first sent invoice; target 1 h; horizon Q2".
- **Actors are whoever must behave differently for a goal to be met** (§4): people, systems and
  organisations, each with a `role` — `primary` (gets the value; listed first), `secondary`
  (serves or transacts with the primary: a client, a finance team) or `off-stage` (does not use
  the system but can help or block: regulator, incumbent supplier). Not org-chart roles, not
  "users". Every primary/secondary person or organisation needs at least one impact; an off-stage
  actor may have none — and an obstructor that merely imposes rules is a constraint
  (`regulatory`/`contractual`), not an actor. The light-depth impact map covers only the primary.
- **Impacts are behaviour changes** (§4): "<actor> pays within 7 days", "stops phoning support to
  check status". If it starts with build/add/implement it is a deliverable. Every goal needs at least one impact.
- **Deliverables are the smallest thing that could plausibly cause the impact** (§4), phrased as
  something the actor would notice, several alternatives per impact welcome (options, not
  commitments), priority by the impact's importance. "Never aim to implement the whole map."
- **Capabilities are the stable what** (§5): noun phrases that would still be true after a rewrite
  and that a team could own — "Invoicing" (custom), "Card payments" (commodity); not "Invoice API",
  "Checkout page", "Billing service". Derive them from BMC key activities, deliverables grouped by
  what they need, and brownfield module names. One level only; they become subdomain candidates in
  `ddd-decompose`. Include the ones you will buy.
- **Mark each capability's evolution stage** (§5), asked in order: consumable from interchangeable
  suppliers → `commodity`; a configurable package does 80% → `product`; must be built to fit and
  still changing → `custom`; nobody has done it, experiments expected to fail → `genesis`.
  Product/commodity capabilities are buy-not-build candidates in `ddd-strategize`; genesis/custom
  are where the core domain can live. When unsure and it is not the differentiator, pick the
  stage further right.
- **Constraints and existing systems are explicit** (§6): precise constraints ("PCI: card data
  never touches our systems", not "security") with a `kind` — `regulatory` for the law,
  `contractual` for what a customer or partner imposes (SLAs, mandated file formats, data
  residency); every running system with `will` replace/integrate/ignore. They become
  conformist/ACL relationships and quality attributes later.
- **Differentiation is relative — record what people use instead** (§6): per actor, what it runs on
  today (competitor, incumbent product, spreadsheet, manual process, in-house tool, nothing) as
  `alternatives[]` — strengths, weaknesses, the capabilities it competes with — and tie each value
  proposition to the capability it rests on and the alternative it beats (`value_proposition_links`).
  Auto: infer from the brief, log the confidence. An alternative that wins outright on a capability
  → a note `for: ["strategize"]`: "routing: Google Maps is the alternative and it wins — do not build".
- **Non-goals** (§6): at least one — the plausible things the business will not do.
- **Scale target** (§7): the user's statement wins and its maximum is never exceeded; otherwise count
  existing deployables and teams in the repo; otherwise the defaults table (solo/one team → 1–3 and 1).
- **Depth** (§8): `light` = one-line BMC cells, 1–2 goals, primary actor's impact map; `standard`
  = full canvases, 2–4 goals, every actor that matters; `deep` = plus per-segment value
  propositions and an evolution narrative. Capabilities: **aim** light 3–6, standard 6–12, deep
  10–15; the lint **tolerates** 3–8 / 4–15 / 6–30 and warns outside. Over the aim → merge the two
  that share language and one team would own; under it → look for a capability you will buy.
- **Stay out of solution design.** If you find yourself naming services, tables, queues or endpoints,
  stop: capabilities are nouns, deliverables are the smallest user-visible thing, the rest is an open question for a later step.
- **Pass on what has no field of its own** (contract §3): a word different roles use with different
  meanings, a process fact fixing the order of events, a regulatory record with no owner, a boundary
  the user already stated ("finance must be separable"), a decision already taken — each becomes a
  `notes_for_downstream[]` entry with `kind` and `for` (usually `["discover", "decompose"]`; also
  `"strategize"` or `"organise"`). Example, kind `language`: "'Job' means a stop to dispatchers, the
  on-site work to technicians and a priced line to finance." Prose never reaches `ddd-discover`; JSON does.
- **Recent practice (§10)**: capabilities are candidates — Decompose may split or merge them
  (Verraes 2025); team and ownership politics are `organisational` constraints (Xin Yao 2025);
  for small or early products keep this step `light`, never skip it (Aleinikov 2026).

## Output rules

`understand.json` = the common envelope + the §4.1 keys. Validate against `understand.schema.json`; copy shapes from the mealkit example.

- **Envelope**: `schema_version: 1`, `step: "understand"`, `produced_by: "ddd-understand"`,
  `produced_at` (UTC, `YYYY-MM-DDTHH:MM:SSZ`), `mode`, `depth`, `inputs[]` (paths relative to the
  project root, or free text containing a space such as `"conversation notes (2026-08-29)"`),
  `assumptions[] {id, text, confidence: low|medium|high}`, `open_questions[] {id, text, blocking, owner}`;
  `notes_for_downstream[] {id, text, for: [bare step names — "discover", not "ddd-discover"], kind}`
  whenever Method → Pass on applies; on re-runs `deprecated[] {id, collection, reason, since}`.
- **Step keys** — all always present: `system {name, one_liner, problem, why_now, lifecycle}`;
  `business_model` with all nine arrays (`customer_segments`, `value_propositions`, `channels`,
  `customer_relationships`, `revenue_streams`, `key_resources`, `key_activities`, `key_partners`,
  `cost_structure`; suffix guesses with "(assumed)"); `goals[]`, `actors[]`, `impacts[]`,
  `deliverables[]`, `capabilities[]`, `constraints[]`, `non_goals[]`, `existing_systems[]`
  (write `[]` when there are none — never omit it), `scale_target {deployables_min,
  deployables_max, teams, users, notes}`.
- **This skill's additive keys** (not in the shared schema, which ignores unknown keys; the lint
  checks them): `system.lifecycle` greenfield|brownfield|rewrite (always set); `actors[].role`
  primary|secondary|off-stage (omitted = primary for the first actor, secondary for the rest);
  `alternatives[] {id: alt-<slug>, name, kind, used_by: [actor ids], strengths, weaknesses,
  capabilities: [cap ids]}` (always present — `[]` plus an assumption when people truly use nothing);
  `business_model.value_proposition_links[] {value_proposition: <canvas string, verbatim>,
  capabilities: [cap ids], beats: [alt ids]}`, one per proposition. Full shapes: template §2b/§8a.
- **Ids**: `G1…` goals, `I1…` impacts, `D1…` deliverables, `C1…` constraints, `A1…` assumptions,
  `Q1…` questions, `N1…` notes; `cap-<kebab-slug>` capabilities, `alt-<kebab-slug>` alternatives; actors
  are kebab-case slugs in the domain's words (`subscriber`, `accounts-payable-clerk`,
  `tax-authority`). Unique within their collection and never renamed on re-runs.
- **Enums**: `actors[].kind` person|system|organisation; `deliverables[].priority`
  must|should|could; `capabilities[].evolution` genesis|custom|product|commodity (always set it);
  `constraints[].kind` regulatory|contractual|technical|organisational|budget|timeline|other;
  `existing_systems[].will` replace|integrate|ignore; `alternatives[].kind` competitor|
  incumbent-product|spreadsheet|manual-process|in-house-tool|do-nothing; `notes_for_downstream[].kind`
  language|boundary|process|risk|decision|other.
- **References**: every `impacts[].actor` and `alternatives[].used_by[]` entry is an `actors[].id`,
  every `impacts[].goal` and `actors[].goals[]` entry a `goals[].id`, every `deliverables[].impact`
  an `impacts[].id`, every `capabilities[]` entry of an alternative or a link a `capabilities[].id`.
  The first actor listed is the primary actor.
- **Markdown**: the ten `##` headings of the template, ids in the tables, links in §2b, alternatives
  in §8a, notes in §10a — same content as the JSON.
- Names in the domain's language, never technical jargon.

### Lint rules (`ddd understand lint` — errors block, warnings go into the summary)

- **Errors**: id patterns and uniqueness per collection (`N<n>` notes, `alt-` alternatives); a
  reference to an unknown actor, goal, impact or capability (incl. `used_by`, the `capabilities` of
  an alternative or a link, and a link string absent from the canvas — compared ignoring case and a
  trailing "(assumed)"); envelope `step`/`produced_by`/`produced_at` format; a `lifecycle`, `role`,
  alternative `kind` or note `kind` outside its enum; a nameless alternative; a note with empty `text`
  or `for`, or a `for` naming an unknown step; `deployables_min` > `deployables_max`; no manifest; no `understand.md`.
- **Warnings**: every `G`/`I`/`D`/`cap-`/`alt-`/`C`/`A`/`Q` id appears verbatim in `understand.md` (put
  them in the tables); the ten H2 titles match the template (a leading number is fine); each goal
  has metric + target and an impact; each primary/secondary person or organisation has an impact
  (light depth checks only the first actor); no impact starts with build/add/implement/create/
  develop/deploy/ship/integrate/migrate/write/design/set up/launch/introduce; capability names —
  and `must` deliverables over 120 characters — contain no solution word (api, app, page, screen,
  module, ui, frontend, backend, database, db, endpoint, microservice, queue, kafka, lambda,
  kubernetes, react, postgres, mongo — `SOLUTION_WORDS` in the script); capability count within
  the tolerated band, each with `description` and `evolution`; a constraint and a non-goal exist;
  `existing_systems` and `scale_target.teams` present; `alternatives` missing, `[]` with no
  assumption saying so, or one lacking `used_by`/strengths/weaknesses/capabilities;
  `value_proposition_links` missing, a proposition with no link or a link to no capability, a
  §2b/§8a table missing (`beats` is note-level only); manifest `scale_target`/`depth` in sync;
  each `inputs[]` path exists (free text containing a space is skipped); a "Notes for …" section
  in the Markdown with items but no `notes_for_downstream` in the JSON; a note without `kind`.

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. This step draws no diagram of
its own; the picture that bears on it is
`<ddd-dir>/diagrams/decisions/<Did>.png` after a `ddd decision render`. If such a PNG exists, Read it
before deciding: the Read tool renders PNG, not SVG, and it is the same picture the human reviewer
sees. No PNG means no Chrome was found; the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `understand.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. When the options differ in shape (a boundary, a topology, a flow), draw them first: write one
diagram spec per option at `<ddd-dir>/01-understand/decisions/<Did>-<opt>.json` (format
`ddd-diagram-spec`; copy `${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-A.json`
and edit its nodes and edges, or hand it a blueprint architecture or sequence JSON), point
`options[].diagram` at it, run `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>`
(`<step>:<Did>` when another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png`
before choosing.

## Self-review checklist (before writing the files)

- `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
  `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
  If a reader cannot follow it, they cannot catch what this step got wrong
- A stranger would understand the one-liner; the problem is someone's pain, not "there is no system for X".
- Every goal has a metric, a target and a horizon, and is an outcome, not an output.
- Every goal has at least one impact; every impact is a behaviour change of a listed actor;
  every deliverable is the smallest thing that could cause its impact; the first actor is the
  primary; obstructors are `off-stage` actors only when they can help or block, else constraints.
- The BMC has no orphans: every revenue stream has a paying segment, every value proposition a
  segment, every key activity a proposition.
- Capabilities are noun phrases within the depth's aim band, each with a description and an
  evolution stage; none is a feature, screen, API or service.
- At least one constraint and one non-goal; `existing_systems` and `alternatives` present (`[]`
  plus an assumption when none), each alternative tied to an actor and a capability, every value
  proposition linked to a capability; `lifecycle` set; `scale_target` matches what the user or
  manifest said and does not exceed a stated maximum.
- Every guess is in `assumptions`, every unasked question in `open_questions`, blocking only when
  the chain truly cannot continue.
- Ids follow the rules; Markdown and JSON carry the same ids and content; nothing in the artifact is a solution decision.
- Anything a later step depends on that has no field is in `notes_for_downstream` with `for` and
  `kind` — including an alternative that wins outright on a capability (for strategize).
- The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Next step

`/ddd-discover` reads `ddd/01-understand/understand.json`: your `actors[]` become its actors
(linked by `from_understand`), goals and deliverables seed its scenarios, capabilities and existing
systems seed its phases and external systems, and it gets every note whose `for` names it;
`ddd-strategize` later scores differentiation against `alternatives[]` and the proposition links.
Say so (or that `ddd` continues the chain from here). Do not start discovering events yourself.
