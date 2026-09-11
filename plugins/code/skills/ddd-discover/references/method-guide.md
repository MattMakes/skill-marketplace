# Discover method guide — big-picture EventStorming, translated to Claude Code

Read this before drafting a storm (sections 1–6 always; 7–12 for `standard`/`deep` runs or when
something feels off). It distils Brandolini's EventStorming, the ddd-crew cheat sheet, Domain
Storytelling and Example Mapping into rules a Claude Code session can actually follow, plus what
2025–2026 practitioners learned about remote/async storms and LLM-drafted boards. Sources with
access dates are at the end.

## 0. What decompose needs from you

`ddd-decompose` cuts bounded contexts along your timeline. It uses, in order of value:

1. **Pivotal events** — the 3–7 moments where the flow changes phase (*Order Placed*, *Payment
   Received*, *Box Shipped*). Boundaries almost always sit on or next to them.
2. **Language shifts** — the same word meaning two things (*Box* = menu choice vs packed parcel), or
   two words for one thing. Record them in `glossary[].avoid`, as `conflict` hotspots and as
   `notes_for_downstream[]` entries (`kind: language`) — only the JSON reaches decompose; never
   smooth them over.
3. **Actor changes** — where a different person/team/system takes over.
4. **Events, commands, policies, read models** with stable ids — every later step references them.
5. **Hotspots and scenarios** — connect turns scenarios into message flows; define reads hotspots.

If you only have time to get three things right: pivotal events, language conflicts (as notes), and stable ids.

## 1. The sticky-note grammar

| Element | Board colour | Wording rule | JSON | Good | Bad (and why) |
|---|---|---|---|---|---|
| Domain event | orange | Past tense, a business fact a domain expert cares about | `events[]` | *Order Placed*, *Payment Failed*, *Box Shipped* | *Order Created Event* (technical), *Record Inserted* (storage, not business), *Order Processing* (not a fact) |
| Command | blue | Imperative, one actor or a policy issues it | `commands[]` | *Place Order*, *Pack Box* | *Order Placed* (that is the event), *Handle Order* (vague), *POST /orders* (transport) |
| Actor | small yellow | A role, person, team or department | `actors[]` | *Subscriber*, *Packer*, *Finance* | *User* (which one?), *System* (that is an external system or a policy) |
| External system | pink | Something outside our control we call or that calls us | `external_systems[]` | *Stripe*, *Courier*, *Tax authority* | Our own future service (that is a context, decided later) |
| Policy | lilac | "Whenever *event* then *command*"; automatic or manual | `policies[]` | *Whenever meals chosen, charge the week* | *Charging logic* (no trigger), *Send email* (no event, no rule) |
| Read model | green | What the actor needs to see to decide on the command | `read_models[]` | *Weekly menu*, *Picking list* | *Orders table* (storage), *Dashboard* (which decision?) |
| Aggregate candidate | big yellow | Receives commands, decides, emits events (outside-in) | `aggregate_candidates[]` | *Subscription* handles *choose-meals*, emits *meals-chosen* | *OrderService*, *Database* |
| Hotspot | magenta, rotated | A question, disagreement, risk or gap — a finding, not a failure | `hotspots[]` | *Nobody agrees what happens when payment fails after meals are chosen* | *Fix payment retries* (a solution), *TODO* (says nothing) |
| Pivotal event | orange + bar | The few events that split the flow into phases | `pivotal_events[]`, `events[].pivotal` | *Subscription Started*, *Box Shipped* | Marking a third of all events pivotal |

Naming rules that keep the chain stable:

- Event ids are `<noun>-<past-participle>`: `order-placed`, `payment-failed`. Command ids are
  `<verb>-<noun>`: `place-order`. Policy ids say the reaction: `charge-on-choice`, `reserve-on-order`.
  Read model ids are nouns: `weekly-menu`. Phases are gerunds or nouns: `ordering`, `fulfilling`.
- One fact per event. *Order Placed And Paid* is two events.
- Use the repo's words. If the README says "subscription", do not write "plan" — put "plan" in
  `glossary[].avoid` instead. The corpus you were given *is* the ubiquitous language evidence.
- Names are Title Case; ids are kebab-case slugs; codes are `H1`, `S1`, `A1`, `Q1`.

## 2. The picture that explains everything

The process-modelling grammar reads left to right:

```
[Actor] looks at [Read model] → issues [Command] → [Aggregate/System] decides → [Event] happened
                                                        ↓
                          [Policy: whenever Event then Command] → next [Command] → next [Event] …
[External system] ──────────────────────────────────────────────→ [Event] (a fact reported from outside)
```

Every command ends in at least one event (or it is not a command). Every event has a cause: a
command, a policy chain that ends in a command, an external system, or time. Read models sit before
the decision they inform. Policies are where business rules hide — a policy with an exception
("…unless the subscriber is paused") is a hotspot or a second policy, never a silent assumption.

## 3. The workshop phases, translated

| Workshop step (Brandolini / ddd-crew) | In Claude Code | Output |
|---|---|---|
| Kick-off: goal, scope, legend | Print the inputs check: what you read, mode, depth, scale target, the process's first and last event | `inputs[]`, checkpoint 1 |
| Chaotic exploration: everyone writes events silently | **Harvest** candidate events from `understand.json`, docs, code names — draft before asking (the "silent sorting" principle: independent drafting first, discussion second, avoids priming) | raw event list |
| Enforce the timeline: order, dedupe, argue | Sort into one global order; merge true duplicates; keep near-duplicates that hide a language conflict and add a hotspot; assign `sequence` 10, 20, 30… | `events[].sequence` |
| Pivotal events & swimlanes | Mark 3–7 splitters; cut phases at them; alternative flows become scenarios rather than swimlanes unless `deep` | `phases[]`, `pivotal_events[]` |
| People & systems | Attach actors (from understand ids) and external systems; write the command for each event; add policies for automatic reactions; add read models where an actor decides | `actors[]`, `external_systems[]`, `commands[]`, `policies[]`, `read_models[]` |
| Explicit walk-through (forward, then reverse) | Narrate each phase as a story; then walk backwards asking "what had to happen for this?"; fill gaps; every command has an event | corrected events, scenarios |
| Problems & opportunities | Write hotspots with a `kind`; note opportunities in `assumptions`/summary; decide which hotspots block; pass boundary-relevant findings on as notes | `hotspots[]`, `open_questions[]`, `notes_for_downstream[]` |
| Closing: what we learned, next steps | Seed the glossary; write the summary naming `/ddd-decompose` | `glossary[]`, closing summary |

Interactive mode runs the walk-through *with* the user, one phase per checkpoint (≤4 questions).
Auto mode runs it as self-review and logs what it would have asked.

## 4. Harvesting from documents (draft first)

Map `understand.json` mechanically before reading anything else:

| understand.json | becomes |
|---|---|
| `actors[]` | `actors[]` with `from_understand` set; new actors found in docs get `from_understand: null` |
| `existing_systems[] (will: integrate)` and `business_model.key_partners` | `external_systems[]` candidates (`replace` systems are not external — their behaviour becomes events) |
| `capabilities[]`, `business_model.key_activities` | phase candidates and the spine of the timeline ("what happens when this capability is exercised, start to finish?") |
| `goals[]`, `impacts[]`, `deliverables[]` | scenario candidates (the happy path that delivers the must-have) and pivotal-event candidates (the moment the goal's metric moves) |
| `constraints[]` (regulatory/technical) | policies (*whenever … then verify …*) or `risk` hotspots |
| `non_goals[]` | the ends of the timeline — do not storm past them |
| `scale_target`, `depth` | how many events you are aiming for (section 10) |
| `notes_for_downstream[]` whose `for` names `discover` | `language` → a `conflict` hotspot near the event where the meaning flips plus a glossary entry naming both meanings; `process` → the fixed event order; `risk` → a `risk` hotspot. Notes addressed only to later steps are re-emitted, sharpened, in your own `notes_for_downstream[]` |

Then read the docs the manifest lists plus `README*`, `CONTEXT.md`, `docs/`, `brainstorm/`, ADRs,
schemas/migrations, API specs, and for brownfield the module/table/enum names. Turn what you find
into events:

- Status fields and enums (`draft → placed → paid → shipped`) are event sequences: *Order Placed*,
  *Order Paid*, *Order Shipped*.
- "When X, we do Y" sentences are policies. "The clerk checks the list before…" is a read model.
- Endpoints and screens are commands (*POST /orders* → *Place Order*), never events.
- Cron jobs and deadlines are time-triggered events (section 5).
- Words the docs use inconsistently are glossary `avoid` entries or `conflict` hotspots.

Missing sources (a README that is listed but absent, an empty docs folder) are not blockers: record
an assumption ("drafted from understand.json only; README.md listed in manifest.sources not found",
confidence low) and proceed.

## 5. Rules for the tricky cases

- **Time-triggered events** (*Selection Deadline Passed*, *Month Closed*) — one rule, whether or
  not a preceding event exists: declare the scheduler once as an external system,
  `{"id": "clock", "name": "Clock"}`, and make it the `actor` of the command that fires
  (*Close Selections*, `actor: "clock"`, `produces: ["selection-deadline-passed"]`); the schedule
  ("Sunday 23:59", "last day of the month") goes in the command's `description`. The lint and the
  validator accept `clock`; a calendar trigger with no preceding event needs nothing else.
- **External facts** (*Payment Failed* reported by Stripe): `triggered_by` the command we sent
  (*Charge Week*) if it is a response, otherwise `triggered_by: null` with `actor: <external-system-id>`.
  The validator accepts external-system ids in `events[].actor`.
- **One command, several events**: `produces: ["payment-succeeded", "payment-failed"]` when the
  outcome branches. Keep both events; scenarios show which path.
- **Commands with no actor**: only when a policy issues them (`actor: null`, and some policy lists
  the command in `then`); the event they produce has `actor: null` too. Otherwise name the role.
- **Manual policies** (*whenever a complaint is filed, a manager reviews it*): `kind: manual` — a
  person decides, but the trigger is still an event. Decompose treats these as human-in-the-loop.
- **Loops and retries**: do not model the loop, model the events (*Payment Retried*, *Payment Failed
  Again* is a smell — prefer *Payment Retry Scheduled* and one *Payment Failed*). Scenarios may
  repeat an event id; a scenario that deliberately jumps back in the timeline (*no access →
  follow-up → rebook*) says `"loops": true`, so the lint stays quiet and the board marks it *(loops)*.
- **Sub-processes** that dwarf the main flow (deep runs): give them their own phase; in `light`
  or `standard` collapse them to one or two events and a `missing` hotspot ("returns flow not stormed").
- **As-is vs to-be**: greenfield storms are to-be; brownfield storms are as-is, and the difference
  between the two is a list of hotspots (kind `risk` or `missing`). Say which you drew in an assumption.
- **Design-level detail** (validation errors, field names) is not big-picture: fold it into the
  event's `data[]` or drop it. The band in section 10 is a sanity check, not a quota.

## 6. Pivotal events and phases

Avanscoperta's guidance, compressed: pivotal events are "splitters between distinct phases of the
business flow" with "a clear distinction between before and after"; they sit in the middle, not at
the very first or last position; when several people independently write the same event it is
usually at a responsibility boundary; detection is fast and approximate ("trading precision for
plausibility") and gets refined. They become candidates for published-language events between
contexts.

How to pick them here:

1. List the moments something irreversible or contractual happens (signed, paid, shipped,
   approved, delivered, closed).
2. Check the actor changes and the vocabulary changes around each one.
3. Keep 3–7 (fewer for `light`). Mark `events[].pivotal: true` **and** list them in `pivotal_events[]`.
4. Cut phases *after* pivotal events: the event closes its phase. Name phases with the domain's word
   for that stage (`subscribing`, `choosing`, `fulfilling`), give them `order` 1..n, and put every
   event in exactly one phase.

## 7. Hotspots — the Example Mapping lens

Hotspots are the most valuable thing a workshop produces and the thing an LLM draft most
under-reports (a model cannot see rules that nobody wrote down — see section 12). Use Example
Mapping's three card types to find them:

- **Rule** (blue): a business rule you can state — becomes a policy or an aggregate invariant.
- **Example** (green): a concrete case that tests the rule — becomes a scenario step.
- **Question** (red): a case nobody can decide — becomes a hotspot. "Capture the question and move
  on" rather than debating; it turns an unknown unknown into a known unknown.

Kinds: `unclear` (nobody knows), `conflict` (people or documents disagree; language conflicts go
here), `risk` (known danger: regulation, money, data loss), `missing` (a part of the flow not
stormed), `external` (depends on a system or party we do not control). Always set `near` to the
event where the question bites. Wording: state the question or the disagreement and why it matters;
never the fix. A vocabulary `conflict` also travels as a `notes_for_downstream[]` entry
(`kind: language`, `for: ["decompose", "define"]`, text naming the hotspot id): hotspot prose stays in
this artifact, the note reaches decompose.

## 8. Scenarios — the Domain Storytelling lens

Domain Storytelling tells one concrete story at a time — "*who* does *what* with *what* with
*whom*", numbered sentences, no branches — and starts with "the '80% case' — the 'happy path'
first"; "only then discuss *what else* could happen". Use that discipline for `scenarios[]`:

- `S1` is the happy path from the first event to the last, for the main actor(s).
- Each further scenario exercises one policy branch or failure (*payment fails after meals are
  chosen*; *subscriber pauses before the deadline*). Alternatives are separate stories, not
  branches inside one.
- Every event in a scenario exists in `events[]`; list them in timeline order (a retry may repeat
  an id). `actors[]` lists who appears.
- Name the scenario after what makes it different, not after the phase.

Domain Storytelling is also the better format for stakeholders who dislike sticky-note chaos: in
interactive mode you can present a phase as a numbered story ("1. The subscriber chooses meals from
the weekly menu. 2. Stripe charges the week…") instead of a table.

## 9. Read models and aggregate candidates

A read model answers "what does the actor look at before deciding?" — one per real decision, not
one per screen. `informs` the command, `used_by` the actor.

Aggregate candidates follow Brandolini's outside-in definition: "the portion of the system that
receives commands and decides whether to execute them or not, thus producing a domain event". Group
commands by the noun that has to be consistent when the decision is made (*Subscription* decides
*choose-meals*; *Box* decides *pack-box*). Two or three candidates per phase is plenty; ddd-code
designs them for real. If a noun changes meaning across a pivotal event (*Box*), that is one
aggregate per meaning and a glossary conflict.

## 10. Depth scaling

| Depth | Events | Phases | Scenarios | Extras |
|---|---|---|---|---|
| `light` | 10–25 | 2–4 | 1–2 | glossary 5–10 terms; hotspots as found; no swimlanes |
| `standard` | 25–60 | 3–6 | 2–4 | read models for every human decision; aggregate candidates; glossary 10–20 |
| `deep` | 60–150 | 5–10 | 3–6 | alternative flows as their own phases or explicit swimlane phases (e.g. `returns`), per-phase diagrams, glossary 20–40 |

Bands are sanity checks. A tiny domain honestly stormed at 9 events beats 14 invented ones; log the
shortfall as an assumption and move on. Stop before design-level detail: if you are writing
*Validation Error Shown*, you have gone too deep.

## 11. Facilitating in interactive mode

Sections of 150–300 words, one phase per checkpoint, at most 4 questions each. Ask about the domain,
never about formatting. The facilitator's questions, in the order they usually pay off:

1. "What happens next / what had to happen first?" (gaps at phase edges — the most common miss)
2. "Who needs to know when *X* happens, and what do they do?" (policies)
3. "What does *actor* look at before deciding to *command*?" (read models)
4. "What goes wrong here, and who decides then?" (failure events, manual policies)
5. "Do *A* and *B* mean the same thing to everyone?" (language conflicts → boundaries)
6. "Is *X* the moment this phase is really over?" (pivotal events)

Prefer multiple-choice questions when a real decision exists ("Is payment taken (a) when meals are
chosen, (b) at the selection deadline, (c) when the box ships?"). If the user says "looks good"
or "just finish", stop asking and switch to auto for the rest, logging unasked questions as
`open_questions`. Remote-workshop practice that carries over: short sections beat marathons; keep
the board (the Markdown) self-explanatory so people can catch up alone; write a between-session
summary — that is the closing summary.

## 12. Auto mode — what LLM-drafted storms get wrong, and the counter-measures

Evidence from 2025–2026 practice:

- LLMs find the obvious events well and should draft them so the humans spend their time on the
  contested ones (k8mak *event-storm* skill; codecentric, Junker 2026). Counter-measure: draft the
  full board, then spend the self-review on failure paths, phase edges and language.
- They cannot infer rules nobody wrote down: in Junker's Larder example "the self-rating rule is
  completely absent … was never visible in any artifact". Counter-measure: every rule you *suspect*
  but cannot source becomes a hotspot or a `low`-confidence assumption, not a policy.
- Small errors propagate through later DDD steps and accumulate (Eisenreich, Jusic & Wagner 2026:
  steps 1–3 — language, event storming, contexts — worked; 4–5 degraded). Counter-measure: stable
  ids, `ddd validate` before closing, and never renaming an id on re-run.
- "Do not add any concept, field, or endpoint not visible in the artifacts" (Junker). Counter-measure:
  when the repo has no word for something, say so in an assumption and use the plainest business
  word, never a technical synonym.
- Brandolini on pre-seeding structure remotely: you may "start with some structure in mind … but
  keep in mind that no matter how smart you are, this structure can be badly wrong". Counter-measure:
  phases drafted from capabilities are a hypothesis — record them as an assumption with `medium`
  confidence so decompose treats them as such.

Auto-mode rules of thumb: choose the conservative reading (fewer phases, fewer pivotal events, the
repo's words); every guess a domain expert could overturn is an assumption; every question you
would have asked is an open question with `blocking` set honestly (blocking = decompose cannot cut a
sensible boundary without the answer).

## 13. Sources (accessed 2026-08-29)

- Brandolini, *Introducing EventStorming* (Leanpub, 2013–) — https://leanpub.com/introducing_eventstorming ; chapter list incl. Big Picture steps (kick-off, chaotic exploration, enforcing the timeline, problems and opportunities, problem selection) and a remote-EventStorming chapter.
- Brandolini, "Introducing Event Storming" (original 2013 post) — https://ziobrando.blogspot.com/2013/11/introducing-event-storming.html — domain events as "something meaningful happened in the domain"; aggregates outside-in.
- EventStorming.com resources page — https://www.eventstorming.com/resources/ — starter kits, Miro templates, links below.
- Avanscoperta, "Pivotal Events" — https://www.avanscoperta.it/en/eventstorming/pivotal-events/ — splitters between phases; middle positions; convergence of duplicates; published-language candidates.
- Brandolini, "Remote EventStorming" (2020) — https://blog.avanscoperta.it/2020/03/26/remote-eventstorming/ — shorter sessions, seeding structure and its risk.
- ddd-crew, *EventStorming Glossary & Cheat Sheet* — https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet — sticky definitions and colours; workshop steps; policies as "whenever X happens, we do Y".
- ddd-crew, *DDD Starter Modelling Process*, Discover section — https://github.com/ddd-crew/ddd-starter-modelling-process — "You cannot skip discovery"; tools: EventStorming, Domain Storytelling, Example Mapping, User Journey/Story Mapping.
- Domain Storytelling quick start guide — https://domainstorytelling.org/quick-start-guide — actors, work objects, numbered activities; one concrete story, happy path first; scope factors (granularity, as-is/to-be, purity).
- Domain Storytelling and DDD — https://domainstorytelling.org/domain-driven-design — finding boundaries and building the ubiquitous language.
- Schwentner & Hofer, "Why EventStorming practitioners should try Domain Storytelling" — https://kalele.io/why-eventstorming-practitioners-should-try-domain-storytelling/ — when to use which; stories for cooperative segments of a big-picture storm.
- Wynne, "Example Mapping introduction" (Cucumber) — https://cucumber.io/blog/bdd/example-mapping-introduction/ — rules/examples/questions; capture the question and move on; many rules = too big.
- Event Storming Journal, "Step by step guide to run your Big Picture Event Storming" (2022) — https://www.eventstormingjournal.com/big%20picture/step-by-step-guide-to-run-your-big-picture-event-storming/ — storytelling and reverse storytelling; "make everything that is implicit explicit".
- Event Storming Journal, "Remote Event Storming Simplified: 7 Essential Practices" (Feb 2025) — https://www.eventstormingjournal.com/remote%20facilitation/remote-event-storming-simplified-7-essential-practices/ — short sessions, silent sorting, self-explanatory board, co-facilitation.
- Event Storming Journal, "Leverage the time between sessions" (Jun 2025) — https://www.eventstormingjournal.com/remote%20facilitation/leverage-the-time-between-sessions-in-a-remote-event-storming/ — tidy the board, write and share a summary, reopen with the problem stickies.
- Event Storming Journal, "Remote Event Storming: step-by-step preparation guide" (Mar 2025) — https://www.eventstormingjournal.com/remote%20facilitation/remote-event-storming-your-step-by-step-preparation-guide/ — five 90-minute sessions; self-explanatory board; rehearsal.
- SoftwareMill, "Remote Event Storming challenges from a facilitator's perspective" (Apr 2024) — https://softwaremill.com/remote-event-storming-challenges-from-a-facilitators-perspective/ — independent work phases to avoid priming; prioritise core phases.
- Junker, "From stories to code: how Domain Storytelling and EventStorming give LLMs the context they need" (codecentric, Mar 2026) — https://www.codecentric.de/en/knowledge-hub/blog/from-stories-to-code-how-domain-storytelling-and-eventstorming-give-llms-the-context-they-need — artifacts as LLM context; unstated rules are absent; "do not add any concept … not visible in the artifacts".
- Eisenreich, Jusic & Wagner, "Automating Domain-Driven Design: Experience with a Prompting Framework" (arXiv 2603.26244, Mar 2026) — https://arxiv.org/abs/2603.26244 — LLM as sparring partner; errors accumulate downstream.
- k8mak, "Event Storm" agent skill — https://www.k8mak.com/skills/event-storm/ — AI-assisted event extraction from narratives, past-tense rule, "the AI finds the obvious events so the session spends its energy on the contested ones".
