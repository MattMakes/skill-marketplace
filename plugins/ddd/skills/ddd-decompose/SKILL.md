---
name: ddd-decompose
description: Step 3 of the 9-step DDD Starter Modelling Process chain (ddd-understand → ddd-discover → ddd-decompose → ddd-strategize → ddd-connect → ddd-organise → ddd-define → ddd-code → ddd-contracts; run ddd-workflow for the whole process). Use when the user asks how to break a system up, where to draw the lines, how to split or decompose a monolith, what the bounded contexts, subdomains, service boundaries or module boundaries should be, wants a context map, or has just finished ddd-discover (an event storm exists in ddd/02-discover/discover.json) and wants to continue. Cuts the discovered domain into subdomains and bounded contexts using language-shift, pivotal-event, actor, data-ownership and rate-of-change heuristics, runs every context through the Independent Service Heuristics, draws the context map with named relationship patterns (customer-supplier, anticorruption layer, published language …) and writes ddd/03-decompose/decompose.json + subdomains.md, which ddd-strategize, ddd-connect, ddd-organise and ddd-define consume. Interactive (≤4 questions per checkpoint) or fully auto with logged assumptions.
---

# ddd-decompose — subdomains, bounded contexts and the context map

Cut the domain that `ddd-discover` storm-mapped into loosely coupled **subdomains** (problem space) and
**bounded contexts** (solution space: one model, one language each), run each context through the
Independent Service Heuristics, and draw the **context map** — every relationship with a direction and
a named pattern. This is step 3 of 9 in the DDD Starter Modelling Process chain and the most
consequential one for a new system: the lines drawn here become modules, services, teams, canvases and
deployables in every later step. When in doubt draw fewer, coarser lines — splitting later is cheap,
merging is not.

## Requirements

- Node.js 18 or newer, nothing to install. Every command is the one CLI `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`; `ddd <cmd>` in this file is that call, shortened (`--help` on any command lists its flags).
  Shared: `ddd init`, `ddd validate`, `ddd mark`, `ddd stamp`, `ddd review`, `ddd decision render`. This step's: `ddd decompose worksheet`, `ddd decompose check`.
- Read once per session: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md` (§3 envelope incl.
  `notes_for_downstream` and `deprecated`, §4.2 your input, §4.3 your output, §6 validator rules, §7 re-runs)
  and `${CLAUDE_PLUGIN_ROOT}/shared/references/modes.md`.
- The predecessor artifact `ddd/02-discover/discover.json`. Missing → workflow step 0.
- Interactive mode needs a human who can answer questions (`AskUserQuestion`); a subagent or an orchestrated run is auto mode.

## Inputs & outputs

Resolve `<ddd-dir>` to an **absolute path once** and pass it to every script; never rely on the
working directory (it resets between Bash calls, and `ddd init`/`ddd mark` default to `./ddd`).

| Input (relative to project root) | Take from it |
|---|---|
| `ddd/02-discover/discover.json` (primary) | events, commands, phases, actors, external systems, policies, read models, aggregate candidates, pivotal events, hotspots, glossary seed, `notes_for_downstream[]` addressed to `decompose` |
| `ddd/01-understand/understand.json` | capabilities (subdomain seeds), existing systems, constraints, scale target, `notes_for_downstream[]` addressed to `decompose` |
| `ddd/glossary.md` | existing shared/per-context meanings |
| `ddd/manifest.json` | `mode`, `depth`, `scale_target`, `ddd_dir` |
| `ddd/03-decompose/decompose.json` (if present — even a draft never marked done) | re-run: its ids are committed; update in place (step 0.5) |

| Output | Content |
|---|---|
| `ddd/03-decompose/subdomains.md` | human review doc — `references/subdomains-template.md` |
| `ddd/03-decompose/decompose.json` | the chain artifact — contract §4.3 + envelope §3 (incl. `notes_for_downstream[]`) |
| `ddd/glossary.md` | append `## <Context> context` meanings **only** for words that differ between contexts |
| `ddd/manifest.json` | via `ddd mark` only |

Consumers: `ddd-strategize` (classifies every subdomain), `ddd-connect` (an integration per relationship),
`ddd-organise` (contexts → teams/deployables), `ddd-define` (one canvas per context), `ddd-code`.

## Workflow

### 0. Resolve workspace, mode, depth, predecessor (modes.md §0)

1. `<ddd-dir>` = user's instruction > `ddd_dir` in `./ddd/manifest.json` > `./ddd`. Make it absolute; print it.
   No manifest → `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs init --dir <ddd-dir> --project <slug>`
   (ask name/scale in interactive mode; infer from the repo in auto).
2. Mode: user said "auto" / "no questions" / "just draft" → `auto`; you are a subagent or cannot ask → `auto`;
   else `manifest.mode`; else `interactive`. Depth: `manifest.depth` (`light` | `standard` | `deep`).
3. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status`. When decompose is the next
   step it also prints the upstream `notes_for_downstream` addressed to you — read them; they are inputs, not
   decoration (a `language` note is a boundary candidate). `discover.json` missing + interactive → offer: run
   `ddd-discover` now (Skill tool), bootstrap from project docs + a description the user gives, or stop.
   Missing + auto → invoke `ddd-discover` via the Skill tool if you can, else follow
   `${CLAUDE_PLUGIN_ROOT}/skills/ddd-discover/SKILL.md` yourself, then continue. Discover `stale` → warn; interactive: ask
   whether to proceed or re-run upstream first; auto: proceed and log an assumption.
4. Say in one line what you inferred: workspace, mode, depth, scale target.
5. Re-run: if `03-decompose/decompose.json` exists — including a draft that was never marked done — its ids
   are committed (downstream artifacts may reference them). Load it and update in place: keep every id, add
   new ones; answered open questions, retired assumptions and dropped relationships or contexts go to
   `deprecated[]` as `{id, collection, reason, since}` (`collection` = the list they left: `open_questions`,
   `assumptions`, `relationships`, `bounded_contexts`, `subdomains`), never silently removed.

### 1. Gather inputs (modes.md §1)

Read `discover.json` and `understand.json` — their `notes_for_downstream[]` entries whose `for` names
`decompose` first — then `glossary.md`, `manifest.json`, `manifest.sources` and obvious repo knowledge
(`README*`, `CONTEXT.md`, `docs/`, ADRs, module names in a brownfield repo — existing module names are
evidence for boundaries). List everything you read in `inputs[]`. Do not ask for what the repo tells you.

### 2. Print the worksheet and cluster the timeline

```
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decompose worksheet <ddd-dir>
```

It prints the upstream notes addressed to you, then every deterministic signal: the timeline by phase with
pivotal events, swimlanes by actor, aggregate candidates, policies that cross phase/actor (each one is a
**relationship**, not a reason to merge), policy-driven commands (`actor: null`), external/existing systems
with the evidence for or against a wrapper context, capabilities, regulatory constraints, glossary seeds and
hotspots, and a coverage checklist of every id you must own.

Cluster in this order (details and the why: `references/boundary-heuristics.md` §2): cut at pivotal events →
confirm with actor changes → overlay aggregate candidates (hints — see Tie-breaks) → align with capabilities →
look for words that change meaning → decide adapter vs wrapper context per external/legacy system (Method 7)
→ isolate regulated data → **merge pass** (fewer, coarser). Name each cluster in the domain's words.

### 3. Draft subdomains + bounded contexts → checkpoint A

For each cluster write the subdomain (capabilities, events, commands, terms, `heuristics_applied`, rationale)
and its bounded context (1:1 by default: same id; owns_events/owns_commands/owns_aggregates, terms that
differ, `wraps`, ISH check, rationale). Fill the ISH answers and verdict with the rule in
`references/independent-service-heuristics.md` §3. Assign **every** event and command from the checklist to
exactly one context; a command with no actor belongs where its produced event lives (a `clock`-actored one
too — the scheduler is infrastructure); an event acted by an external system belongs to the context that
wraps or adapts that system.

**Interactive:** present the draft as one section (~150–300 words: the table from template §1 plus the
one-line rationale per context), then ask **≤4** questions, multiple-choice where a real decision exists:
which contested pair to merge/split; whether a suspected language clash is real ("Does *Box* mean the parcel
or the menu choice to the packers?"); whether an external system deserves a wrapper context; which
hotspot near a boundary decides it. Never ask about formatting. "Looks good"/"continue" → stop asking.

**Auto:** no questions. Take the conservative reading (boundary unsure → merge; see Tie-breaks), print the
same section as a status block, and record every judgement call as `assumptions[]` (with confidence) and
every question you would have asked as `open_questions[]` (`blocking: true` only if a later step cannot
proceed without it).

### 4. Relationships and the context map → checkpoint B

For every pair of contexts joined by a worksheet signal (policy crossing contexts, read model fed from
another context, a command another context's flow invokes, shared reference data) write one relationship:
`id` `R1..`, `upstream`, `downstream`, `pattern`, `description`. Direction and pattern come from
`references/context-map-patterns.md` §2–§4 (publisher/API-provider is upstream; a wrapper context *is* the
ACL — it has no relationship to the system it wraps; default between our own contexts is `customer-supplier`
for commands and `published-language` for events). Contexts with nothing crossing get an explicit
`separate-ways`. Words that changed meaning across a boundary go into `bounded_contexts[].terms` on both
sides at every depth (they are the evidence for the boundary and the glossary needs them); at `standard`+ add
the comparison table (template §5, one row per term × context) and a full rationale per relationship; at
`deep` write the alternatives considered and rejected (`references/boundary-heuristics.md` §7).

Write `<ddd-dir>/03-decompose/decompose.json` now — envelope, contexts and the relationships, provisional
ones included; §5 finishes it — and run

```
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> decompose draft --mode <mode>
```

This draws `<ddd-dir>/diagrams/context-map.png` (and rebuilds the review page). Read it before checkpoint B:
a hub every other context points at, or a context joined to nothing, is easier to see than to read.
`ddd review <ddd-dir>` redraws it on demand after later edits.

**Interactive:** present the relationship table (+ the rendered map), ask **≤4** questions only about contested
directions or patterns ("Does Billing need Subscriptions to adapt to it (customer-supplier) or does it just
consume the event (published language)?"). **Auto:** decide by the precedence list and log assumptions.

### 5. Final confirmation and write (modes.md §2.3 / §3)

Interactive: list the assumptions, open questions, notes for later steps and the paths you are about to write;
one question at most ("anything to change before I write?"). Auto: print the same list and proceed. Then:

1. Write `<ddd-dir>/03-decompose/decompose.json` (skeleton: `references/subdomains-template.md` §B) with
   `mode`, `depth`, `inputs` as resolved above and any `produced_at` placeholder — the next step stamps it.
2. `node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decompose check <ddd-dir> --stamp --write-map --sync-glossary`
   — sets `produced_at` to now (UTC, later than discover's), renders `context_map_mermaid` from
   `relationships[]` (both patched in place — the file's formatting is untouched), appends only the missing
   per-context glossary lines (idempotent), and reports orphans, duplicates, straddling aggregate candidates,
   unknown heuristic slugs, unknown `wraps`, malformed notes/`deprecated`, disconnected contexts, scale band.
   Fix errors and any warning you can; re-run (with `--stamp` after every edit) until `RESULT: OK`.
3. Write `<ddd-dir>/03-decompose/subdomains.md` from `references/subdomains-template.md` §A, pasting the
   rendered mermaid and the same ids as the JSON. The JSON is the chain; the Markdown must not disagree with it.

### 6. Validate, mark, summarise (modes.md §4)

```
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --step decompose   # the "validated decompose:" line must show 0 errors
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir <ddd-dir> decompose done --mode <mode>   # artifacts + open-question count derived from the JSON
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate <ddd-dir> --status            # shows the notes strategize will receive
```

Errors → fix, re-stamp, re-validate before marking. Use `draft` instead of `done` if the user stopped early or
a `blocking: true` question remains in auto mode. Expect (and report, do not fix) warnings that downstream
artifacts from an earlier run are now `stale`. Close with a summary a reader who sees only that message can
act on:

```
ddd-decompose done (<mode>, depth <depth>) — <absolute ddd-dir>
Wrote: <abs>/03-decompose/subdomains.md, <abs>/03-decompose/decompose.json (+ N glossary lines)
Boundaries: <M> contexts from <N> subdomains — <one line each: id, why, ISH verdict, wraps>
Context map: <K> relationships — <the 2–3 that matter, with pattern>
Assumptions: <count> (<the riskiest one>)   Open questions: <count> (<blocking ones quoted>)
Notes for downstream: <count> (<for whom: define / organise / strategize / code>)
Validation: validated decompose: 0 errors, <w> warnings (<what they are>)
Next: /ddd-strategize (classifies each subdomain core/supporting/generic, build vs buy) — or run ddd-workflow to continue.
```

## Method

**Subdomain vs bounded context.** A subdomain is a problem-space area — a capability from `understand`
plus the events that realise it; it is *discovered*. A bounded context is the solution-space boundary
inside which one model and one language hold; it is *designed*. New system → 1:1, same id. One context
may host several small subdomains that share language and change together; splitting one subdomain across
contexts is a smell (log an assumption if you must). A context is the *widest* boundary in which the language
stays consistent ("your biggest valid monolith"), not a microservice.

**Heuristics, in priority order** (slugs for `heuristics_applied`; full tests and examples in
`references/boundary-heuristics.md` §3):

1. `language-boundary` — same word, different meaning (or two words for one thing) → different contexts.
   Strongest, because a model cannot hold two meanings of one word.
2. `pivotal-event` — after it the vocabulary, actors or goals change; owned by the context before the cut,
   published to the one after.
3. `actor` — a different person/role drives the commands or reads the read models.
4. `data-ownership` — who may change a fact vs who only needs to know it changed; readers get events, not tables.
5. `rate-of-change` — separate what the business will change next quarter from what is stable.
6. `regulatory` — data an auditor wants in a room of its own.
7. `external-system` — a system we do not control. Default: an adapter *inside* the context that uses it
   (record it in that context's `wraps`). A wrapper context of its own only when the evidence says so — its
   part of the storm has its own language or a distinct actor drives it; the wrapper *is* the ACL/conformist
   boundary (say which in `rationale`). A `replace` legacy is a `big-ball-of-mud` context only while it stays
   live and integrated; imported once and retired → not on the map. The system itself is never an endpoint.
   Secondary lenses (`capability`, `coupling`) confirm a boundary; they do not decide one.

**Tie-breaks (stated once; the references defer here).** *Boundary* unsure — do these belong together? →
merge (fewer contexts) and log an open question. *ISH* unsure — could it stand alone? → the context exists
(its language is distinct) but is a module, never its own deployable; emit a `notes_for_downstream` for
`organise`. Aggregate *candidates* from discover are hints bundled by actor/phase: language and data
ownership win; when you split one, log an assumption and a `kind: boundary` note for `code`
(`ddd decompose check` reports straddlers).

- Good boundary: "`Box` means the weekly menu choice to subscribers and the packed parcel to packers →
  `subscriptions` and `fulfilment` are separate contexts; the pivotal event `Box Packed` sits between them
  and the actor changes from subscriber to packer."
- Bad boundary: "There is a `boxes` table and a `subscriptions` table, so two contexts." Tables are storage.
  Also bad: one context per aggregate, per org-chart box, per technical layer, per CRUD entity — or per
  external system without evidence.

**Independent Service Heuristics.** Ten questions, one idea: could this be run as a separate
service/product with its own team? Record the seven contract keys (`sense_check`, `brand`, `revenue`,
`cost_tracking`, `data`, `user_personas`, `cognitive_load`) as `yes|probably|partial|no|unknown` and the
`verdict`: `candidate` (could stand alone), `merge` (a module, not a service — the context still exists if
it has its own language), `unsure` (a module; open question + note for `organise` — see Tie-breaks). Rule
and worked example: `references/independent-service-heuristics.md`.

**Context map.** Upstream → downstream is influence: the upstream's model and release schedule affect the
downstream, not the reverse. Each relationship gets exactly one of `partnership | shared-kernel |
customer-supplier | conformist | anticorruption-layer | open-host-service | published-language |
separate-ways | big-ball-of-mud`, chosen by the decision procedure in `references/context-map-patterns.md`
§4, plus a description that names what crosses, why this direction, why this pattern rather than the nearest
alternative. Good: "billing → fulfilment, published-language: Fulfilment needs only `week-charged`
(subscriptionId, week), must not learn Stripe's charge model; the event schema is billing's to change."
Bad: "billing and fulfilment talk to each other."

**Scale guidance.** `scale_target` 1–3 deployables → aim for 2–6 contexts; 4–9 → 4–10; 10–20 → 6–15. More
contexts than deployables is fine (modules inside one deployable); fewer contexts than the minimum number of
deployables is not. Merge when the same people change two candidates for the same reasons and no word shifts
meaning; keep apart when a word shifts, a pivotal event with an actor change sits between them, one is
regulated or wraps an external system with its own language/actor, or their rates of change differ. Coupling
sanity check (Khononov): if two candidates need each other's *functional* or *model* knowledge and both are
volatile, they are one context or a partnership; if only a *contract* crosses, separate contexts are sound.

**Depth.** `light`: subdomains, contexts with `heuristics_applied`, the words that shifted meaning (`terms[]`
+ glossary) and an ISH verdict, relationships with a one-line description, the script-rendered map (free).
`standard`: + the language comparison table (template §5), all seven ISH answers, a full rationale per
relationship. `deep`: + alternatives considered and rejected (template §6), all ten ISH questions, coupling
notes (strength / distance / volatility) per relationship.

## Output rules

- Envelope (contract §3): `schema_version: 1`, `step: "decompose"`, `produced_by: "ddd-decompose"`,
  `produced_at` (stamped by `ddd decompose check --stamp`; later than discover's), `mode`, `depth`, `inputs[]`,
  `assumptions[]` (`id` `A1..`, `text`, `confidence` low|medium|high), `open_questions[]` (`id` `Q1..`,
  `text`, `blocking` boolean, `owner`).
- `notes_for_downstream[]` (contract §3): `{id: "N1..", text, for: [bare later step names], kind:
  language|boundary|process|risk|decision|other}`. Emit one for: every language conflict across contexts →
  `define` (upstream `language` notes already addressed to `define` need no re-emit — add one only for a
  conflict you found or sharpened, citing the upstream id); every ISH `merge`/`unsure` module decision →
  `organise`; every split aggregate candidate → `code`; every generic/bought subdomain or wrapper → `strategize`.
  Prose in `subdomains.md` never reaches later steps; these entries do.
- Required keys: `subdomains[]` (`id`, `name`, `description`, `events`, `commands`, `rationale`; plus
  `capabilities`, `terms` as **strings**, `heuristics_applied` from the slug list above), `bounded_contexts[]`
  (`id`, `name`, `subdomains`, `owns_events`, `owns_commands`, `rationale`; plus `owns_aggregates`, `terms` as
  **`{term, meaning_here}` objects**, optional additive `wraps: ["stripe"]` — external system ids this
  context stands for, `independent_service_check` with at least `verdict`), `relationships[]` (`id`,
  `upstream`, `downstream`, `pattern`; plus `description`), `context_map_mermaid` (string, generated).
- Ids: subdomains and contexts kebab-case in the domain's language (`fulfilment`, not `shipping-svc`);
  relationships `R1`, `R2`, …; never rename an id on a re-run — add new ones and move removed or answered
  ones to `deprecated: [{id, collection, reason, since}]` (contract §7; `collection` may be any list —
  `relationships`, `open_questions`, `assumptions`, `bounded_contexts`, `subdomains`).
- Every `events`/`commands`/`owns_*` id must exist in `discover.json` (validator error); every discover event
  and command owned by **exactly one** context (validator warning — treat as an error for yourself);
  every aggregate candidate in exactly one context unless deliberately split (assumption + `code` note);
  every subdomain covered by ≥1 context; capability ids from `understand.json`.
- Relationship endpoints are context ids only. External systems never appear as endpoints — the context
  that wraps or adapts them does. No self-loops; one entry per ordered pair.
- Glossary: append per-context sections only for words in `bounded_contexts[].terms`; never rewrite `## Shared`.
- Auto mode: conservative choices, every guess in `assumptions[]`, every unasked question in `open_questions[]`.
- Markdown paths inside JSON are relative to the project root (`ddd/03-decompose/subdomains.md`).

## Pictures and hard decisions

**Read the diagram before you decide.** Every `ddd mark` rebuilds `<ddd-dir>/review.html` and
`<ddd-dir>/diagrams/` (SVG always, PNG when a local Chrome is found); `ddd review <ddd-dir>`
rebuilds them on demand and `--relayout` drops the remembered layout. The draft mark in Workflow §4 draws
`<ddd-dir>/diagrams/context-map.png` as soon as the JSON exists; Read it before the checkpoint that settles the boundaries:
the Read tool renders PNG, not SVG, and it is the same picture the human reviewer sees. No PNG means
no Chrome was found; the SVG is still on the page and the JSON is still the truth.

**Record hard calls as `decisions[]`** (contract §3; full mechanics in modes.md §3b). Whenever you
dispatch `ddd-decision-strategist`, the user picks between alternatives at a checkpoint, or you commit
to a call two competent people could dispute, add a `decisions[]` entry to `decompose.json` with every
option weighed (`summary`, `pros`, `cons`, `risks`), then `chosen`, `confidence`, `rationale`,
`would_flip_if`, `made_by` (`strategist` | `user` | `step`) and `records` pointing at the assumption
or blocking open question it produced. No `chosen` means the call is still open, and open decisions
lead the review page's worklist. For a boundary decision (merge, split, which context owns what), draw the options first: write one diagram spec per option at
`<ddd-dir>/03-decompose/decisions/<Did>-<opt>.json` (format `ddd-diagram-spec`; copy
`${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/03-decompose/decisions/D1-A.json` (a context map) and edit its nodes and edges, or
hand it a blueprint architecture or sequence JSON), point `options[].diagram` at it, run
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render <ddd-dir> <Did>` (`<step>:<Did>` when
another step reuses the id) and Read `<ddd-dir>/diagrams/decisions/<Did>.png` before choosing.

## Self-review checklist (before `ddd mark`)

- [ ] `plain_words` written last, from the finished artifact: `what` / `decided` / `assumed` /
      `riskiest`, in words someone outside the domain can check and argue with (modes.md §4).
      If a reader cannot follow it, they cannot catch what this step got wrong
- [ ] `ddd decompose check … --stamp --write-map --sync-glossary` says `RESULT: OK`, no orphans, no duplicates,
      no disconnected context, no unknown heuristic slug, every straddling aggregate candidate logged, context
      count inside the band (or the deviation is explained in §1).
- [ ] `ddd validate <ddd-dir> --step decompose` — the `validated decompose:` line shows 0 errors; only
      stale-downstream warnings remain.
- [ ] Every boundary's rationale names a heuristic and a fact from the storm — none says "it's a table",
      "it's a team", "it's a layer".
- [ ] Every relationship has a direction you can defend in one sentence and a description naming what crosses.
- [ ] Every context that stands for an external/legacy system says so (`rationale` + `wraps`); no relationship
      endpoint is an external system; no wrapper context exists without evidence (own language or actor).
- [ ] ISH verdict on every context; every `merge` verdict either merged or justified by its own language.
- [ ] Words with two meanings appear in `terms[]` on both sides **and** in `glossary.md` per context.
- [ ] Upstream notes addressed to `decompose` visibly consumed; notes emitted for `define` / `organise` /
      `strategize` / `code` where the Output rules say so.
- [ ] `subdomains.md` and `decompose.json` agree on ids, counts and patterns; `produced_at` was stamped after
      the last edit.
- [ ] Auto mode: assumptions and open questions are written down, not just thought.
- [ ] The step's diagram PNG (when it existed) was Read before the deciding checkpoint; every hard call is a `decisions[]` entry with all its options, and the ones whose options differ in shape have option specs rendered with `ddd decision render`.

## Next step

Hand off with the closing summary from step 6. Next is **`/ddd-strategize`**, which reads
`ddd/03-decompose/decompose.json` and classifies every subdomain as core / supporting / generic with a
build-vs-buy and implementation-pattern decision; `ddd-connect`, `ddd-organise` and `ddd-define` then consume the same contexts and relationships. Or run `ddd-workflow` to continue the chain automatically.
