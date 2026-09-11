# Bounded Context Canvas v5 — section-by-section guide for `ddd-define`

The canvas (Nick Tune with Eric Evans; maintained by ddd-crew) is "a tool for visualising the key
design choices of a Bounded Context". One page per context; every section is a *design decision*
made explicit. In this chain almost every section already exists upstream — the job of `define` is
to assemble it faithfully, add the judgement that only this step can add (purpose, roles,
decisions, metrics, quality attributes) and make gaps visible (assumptions, open questions).

v5 layout, left to right, top to bottom (labels verbatim from the v5 template):

```
Name | Purpose | Strategic Classification (Domain · Business model · Evolution) | Domain Roles
Inbound Communication (Collaborator → Messages) | Ubiquitous Language · Business Decisions | Outbound Communication (Messages → Collaborator)
Assumptions | Verification Metrics | Open Questions
```

Fill order: the README says "complete the canvas in the order the sections are presented", or go
outside-in (start with inbound) or inside-out (start with decisions and language). In this chain
the pre-fill gives you inbound/outbound/language first, so the natural order is: read the brief,
write the purpose, choose roles, write decisions, then metrics, assumptions and questions.

Nick Tune's iteration rule applies at every section: "Treat it as design feedback when you cannot
think of a clear name or write a cohesive, precise description, or your UL terms are ambiguous."
Do not fix the boundary here — record it as an open question for `ddd-decompose`.

---

## 1. Name

Canvas: "Naming is hard. Writing down the name of your context and gaining agreement as a team will
frame how you design the context." Source: `decompose.bounded_contexts[].name` / `id`. Keep the id
stable (it is referenced everywhere); if the name is wrong, that is an open question for decompose.

## 2. Purpose

Canvas v5 prompt: *"What benefits does this context provide, and how does it provide them? Describe
the purpose from a business perspective."* README: "A few sentences describing the why and what
of the context in business language. No technical details here."

Sources: `decompose.subdomains[].description` + `rationale`, `bounded_contexts[].rationale`,
`understand.capabilities[]` for those subdomains, `understand.goals[]`/`impacts[]` reached through
the actors that send this context commands, `strategize.classifications[].rationale`.

Write 2–4 sentences shaped like: **what it decides or provides** → **for whom** → **so that
(goal)** → **what it deliberately does not own** (the neighbour owns it). Name the beneficiary.
The "does not" sentence is the cheapest boundary guard a coding agent can get.

- Bad (a feature list, technology, no beneficiary): "Handles subscription CRUD, weekly menu
  selection, pause/cancel endpoints and publishes events to Kafka."
- Good (decisions + beneficiary + goal + non-goal): "Subscriptions owns a household's standing
  weekly order: whether it is active, paused or cancelled, and which recipes are locked in for
  a given week. It exists so that a subscriber can choose meals in under two minutes and keep
  subscribing (G1). It does not charge money (Billing) or pack boxes (Fulfilment); it only tells
  them a week's choice is final."

## 3. Strategic classification

Three dimensions (README, verbatim definitions):

- **Domain**: core — "a key strategic initiative"; supporting — "necessary but not a
  differentiator"; generic — "a common capability found in many domains".
  Source: `strategize.classifications[].type` for the context's subdomains. A context spanning
  several subdomains takes the highest (core > supporting > generic) and says so in an assumption.
  The validator warns if the canvas disagrees with strategize — do not re-classify here; raise an
  open question for `ddd-strategize`.
- **Business model** (v5 canvas: revenue · engagement · compliance · cost reduction):
  revenue-generator — "people pay directly for this"; engagement-creator — "users like it but they
  don't pay for it"; compliance-enforcer — "protects your business reputation and existence";
  cost-reducer — reduces the cost of doing business (the v5 template's fourth option; use it for
  generic/supporting contexts that automate or wrap something). Source: your judgement from
  `understand.business_model.revenue_streams` and the goals; the pre-fill suggests one.
- **Evolution** (Wardley): genesis — "new unexplored domain"; custom built — "companies are
  building their own versions"; product — "off-the-shelf versions exist with differentiation";
  commodity — "highly-standardised versions exist". Source: `strategize.classifications[].evolution`.

## 4. Domain roles

Canvas: "How can you characterise the behaviour of this bounded context?" Pick 1–2 roles from
`references/domain-roles.md` (contract enum) and justify them in `domain_roles_rationale` from the
upstream facts: aggregates owned, who sends commands, whether it wraps an external system, whether
its policies command other contexts. Three or more roles is design feedback.

## 5. Inbound communication

README: "Inbound communication represents collaborations that are initiated by other
collaborators." Grouped by **collaborator** ("other systems or sub-systems that send messages to
this context": other bounded contexts, front-ends, or "direct user interaction if the context owns
the user interface") with the **relationship type** from context mapping, and the **messages**.

Message types (Nick Tune, canvas V3 notes, verbatim):
- *Command*: "the producer instructs the recipient to do something. A command can fail."
- *Domain Event*: "a significant event in the domain which happened inside a single bounded
  context which other bounded contexts may need to know about or respond to. Unlike a command,
  there is no obligation of when or how to respond to an event."
- *Query*: "one context requests information from another, or more abstractly asks a question."
"The word message is used in the general sense and not tied to any implementation."

Sources, in priority order: `connect.messages[]` (producer/consumers/kind/payload/delivery),
`connect.flows[].steps[]` (from/to/via/sync — this is where actor→context commands and
context→external calls live), `discover.commands[].actor` (commands nobody put in a flow),
`discover.policies[]` (an event owned elsewhere whose reaction is a command owned here).
Relationship: `decompose.relationships[]` between the two contexts (upstream → downstream);
persons get `user-interaction`; external systems get the message `contract` if it is a pattern,
else `anticorruption-layer` for a core context and `conformist` otherwise (say so in an assumption).

Rules: every message id must exist in `connect.json` or `discover.json` (validator error); never
invent a message — if a collaboration is obviously missing (an event whose `actor` is an external
system, an `existing_systems[].will = integrate` entry with no message), add it with an existing
id and record an assumption plus an open question for `ddd-connect`.

Responses and `via`: a `kind: response` flow step is not a message row — the pre-fill folds it
into the command/query it answers as `response: {id, name, payload}` on that row (the Payload
column shows "response: `id` (fields)"), and the lint refuses a `response` row. When no flow step
draws a context-to-context edge, `via`/`sync` come from the relationship's integration decision
(`connect.integration_patterns[].mechanism`: in-process-call → in-process, sync-api → http,
async-events → message-bus, shared-db → db, batch → file; in-process when both contexts share a
deployable). A flow step that draws a person's own command as context → person is recorded
inbound (producer → consumer) and the brief says so.

Context-mapping patterns (ddd-crew; Evans quotes) to use as `relationship`:

| Pattern | One line | Who it constrains |
|---|---|---|
| partnership | "Forge a partnership between the teams … cooperate on the evolution of their interfaces" | both (symmetric) |
| shared-kernel | "some subset of the domain model that the teams agree to share. Keep this kernel small" | both (symmetric) |
| customer-supplier | "downstream priorities factor into upstream planning" | upstream serves downstream |
| conformist | "slavishly adhering to the model of the upstream team" | downstream adopts upstream's model |
| anticorruption-layer | "create an isolating layer to provide your system with functionality of the upstream system in terms of your own domain model" | downstream translates |
| open-host-service | "a protocol that gives access to your subsystem as a set of services" | upstream publishes an interface |
| published-language | "a well-documented shared language … as a common medium of communication" | usually paired with OHS |
| separate-ways | "no connection to the others at all" | nobody |
| big-ball-of-mud | mixed models, inconsistent boundaries — "prevent propagation into other contexts" | quarantine |

Design tips from the README, use them as a self-check on both tables: are message names coherent
with the purpose? is each message type right (should a command be an event)? is the interface too
large? is the context exposing internals? does any message belong elsewhere?

## 6. Ubiquitous language

Canvas: "What are the key domain terms that exist within this context, and what do they mean?"
(v5: "Context-specific domain terminology").

Sources: `glossary.md` (Shared section) for the terms `decompose.subdomains[].terms` lists;
`decompose.bounded_contexts[].terms[] {term, meaning_here}` (the context-specific meanings — these
are boundaries found in decompose); `discover.glossary[]` entries with `context == this`;
aggregate names from `discover.aggregate_candidates`. Add the nouns in the context's events and
commands if they are not yet defined.

Rules (contract §5 + practitioner guidance for agent-readable glossaries):
- One meaning per term per context, one sentence, say what the thing *is* (not what it does).
- Keep the **avoid** list ("_Avoid_: basket, cart") — it is the cheapest way to stop synonyms.
- When the same word means different things in two contexts, that is a boundary: record both
  meanings under their contexts, never unify. `ddd define render` marks such terms in the glossary.
- Do not define generic programming words (repository, service, DTO).
- One entry per word: the lint refuses two terms that are the same word (case-insensitively, a
  trailing parenthetical ignored — `Job` and `Job (the work on site)` are one term) and a
  definition that only says "aggregate candidate …". The pre-fill marks aggregate names it had to
  add and duplicates as `TODO`: define the concept or merge the entries.

- Bad: "Box — a box." / "Box — the thing we ship (also used for the weekly choice)."
- Good (Fulfilment): "Box — the packed physical parcel with a picking list; not the menu choice
  (that is Subscriptions' Box). _Avoid_: order, shipment."

## 7. Business decisions

Canvas: "What are the key business rules and policies within this context?" (v5: "Key business
rules, policies, and decisions"). Nick Tune's recipe: look at the stickies for this context and
"select the top 3" most important rules first.

Sources: `discover.policies[]` whose `then` commands this context owns (the pre-fill drafts them
as "[draft from policy …]" — rewrite every one as a decision); `discover.hotspots[]` near its
events (each hides a rule nobody stated — write the rule *and* an open question if it is a guess);
`aggregate_candidates` (what must be true inside the aggregate); `read_models` (what a decision is
based on); `understand.constraints[]` (regulatory rules that land here).

Write each as a **decision with a condition and an outcome**, testable, in domain words. If it
needs a threshold, put a number (and an assumption if you guessed it). At depth `deep`, add a
Given/When/Then example under a decision when it is subtle (Xebia's BDD extension of the canvas:
"Given specific Domain Events happened, When I do Command X, Then I expect this Domain Event").

- Bad (vague, no outcome): "Handle payment failures." / "Validate the subscription."
- Bad (a process step, not a rule): "Whenever meals chosen → charge week (automatic)."
- Good: "A week's meals can be chosen once; a second choose-meals for the same week is rejected
  (not merged)." / "Choices lock at the Sunday 18:00 cut-off; after that only Fulfilment may
  change a box." / "If the weekly charge fails, the box is not released for packing and the
  subscriber is notified; the week is retried daily for 3 days, then skipped (assumption A3)."

Invariants that belong to a *single aggregate* are fine here as decisions; `ddd-code` will pull
them into the aggregate canvas. Rules that reach across contexts are policies — say which context
reacts.

## 8. Outbound communication

README: "collaborations that are initiated by this context to interact with other collaborators.
The same message types and notations apply." Mirror of inbound: messages → collaborator, with the
relationship this context has *as upstream*. Include commands it sends to external systems (from
`connect.flows`) and the events it publishes with their consumers. Events it owns that nobody
consumes yet are listed separately ("also emits" — computed from the canvas's own outbound rows,
so a consumer you add removes the event from that line) so `ddd-code` still implements them.

## 9. Assumptions

Canvas v5 prompt: *"Describe which currently unverified assumptions went into this bounded context
design. Make those assumptions explicit by documenting them here."* README: "You will never make
design decisions having a full knowledge about everything in your domain."

The pre-fill carries the upstream assumptions that *name* this context — its id, name, terms or
aggregates as whole words, not substrings; the rest become a count with a pointer to the step JSON
— prefixed `[step Ax]`. Then add this step's own: every heuristic you used (business model, roles, the
relationship label for an external system, a threshold in a decision). In auto mode this list is
never empty.

## 10. Verification metrics

Canvas v5 prompt: *"Describe metrics which can be used to (in)validate the current structure of this
bounded context."* README: metrics "gathered from CI/CD, JIRA, or live systems help determine
whether bounded context boundaries fit appropriately" — the build-measure-learn loop of DDD.

Write 2–4, at least one of each kind:
- **Business** — is the context doing its job? Take the goal metric reached through its actors
  (`understand.goals[].metric/target`) or a proxy: "weekly choice completed by ≥ 90 % of active
  subscribers before cut-off".
- **Structural** — is the boundary right? "≥ 80 % of changes touch only this module (CI)";
  "no more than one message-contract change per quarter needed by a consumer"; "zero cross-context
  hotfixes per release"; "pack-on-charge lag p95 < 5 min (the async boundary holds)".

- Bad: "Uptime." / "Number of subscriptions." (no threshold, no link to a decision)
- Good: "Active subscriptions (G1) — trend toward 10k in 12 months; drop after a rules change
  means the choice rules, not the boundary, are the problem."

## 11. Open questions

README: "If you have questions that no one in the room can answer while running a workshop you
can enter them into this section." Carry `discover.hotspots` near this context,
`connect.coupling_concerns` involving it, unanswered upstream `open_questions`, and everything you
would have asked in interactive mode. Mark blocking ones (`blocking: true` in the envelope) —
`ddd mark … draft` instead of `done` if any are blocking. A finding for step 8 that nobody has
to answer (an integration style to pick per module, a relationship define chose because decompose
had none) is a `notes_for_downstream` entry for `code`, not a question — the pre-fill already
files its own that way.

## 12. Header: owning team and deployable (not on the v5 canvas, required here)

From `organise.teams[].owns_contexts` and `organise.deployables[].contexts`; include the
deployable kind, data store, and which other contexts share the deployable (a shared modular
monolith means in-process integration is available — say so in the messages' `via`).

Read models: the line under the inbound table lists the `discover.read_models` that inform this
context's commands. For one discover lacks (an audit projection a decision is based on), add
`read_models: [{name, informs, note}]` to the canvas — additive, rendered on the same line;
`informs` should be a discover command id (the lint warns otherwise).

---

## The canvas as a spec for a coding agent (2025–26 practitioner guidance)

`ddd-code` and any coding agent will read these canvases. What the practitioner writing of the last
two years agrees on, and how this skill applies it:

1. **The glossary is the grounding.** Agents default to generic names (`DataProcessor`,
   `RequestHandler`) and conflate near-synonyms across contexts ("booking" in revenue vs risk;
   "Tool" vs a transliteration of it). One canonical term per concept, one-sentence definition,
   an explicit *avoid* list, and a per-context section — bounded contexts act as "semantic
   firewalls". (Schleicher 2026; Ibaraki 2025; Rahmani Khalili 2025; Miles 2025; Jaskólski 2025/26.)
2. **Rules as testable assertions.** State each business decision as a concrete accept/reject
   case so it can be pinned with a regression test ("a second choose-meals for the same week is
   rejected"). Propose → verify against the case → pin with a test. (Jaskólski; Thoughtworks 2025.)
3. **Say what the context does not own.** Explicit non-goals in the purpose stop an agent from
   crossing boundaries or "over-modifying" neighbouring modules. (Phoenix; Miles.)
4. **Contracts with payloads and relationship type**, per collaborator — the agent needs the
   message name, kind, payload fields, delivery guarantee and whether to conform or translate
   (ACL). (Phoenix's context-map table; Miles: typed domain objects, not ad-hoc JSON.)
5. **Assumptions and open questions are stop-and-ask points**, not decoration: an agent that
   hits one should ask, not guess. (codecentric 2026: "validate before you propagate".)
6. **Tables over prose, one file per context, near the code**, fenced blocks for term lists;
   leave out generic vocabulary and exhaustive case lists (token budget). (Terminal Skills 2026;
   Thoughtworks 2025; Böckeler 2026.)
7. **Keep it in sync by construction.** `define.json` is the source; canvases are rendered from
   it; re-render after edits. Treat the canvas as a *spec-anchored* living document (codecentric's
   tiers: spec-first / spec-anchored / spec-as-source), reviewed when the glossary changes.
8. **Where to spend human review.** An experience report (Eisenreich, Jusic, Wagner 2026) found
   LLM-drafted glossaries, event storms and bounded contexts "valuable and usable" while
   aggregate design and architecture mapping accumulated errors until "impractical". So: review
   business decisions and quality attributes hardest; the pre-filled facts least.

---

## C4 system context diagram + Mermaid `C4Context`

c4model.com, System Context diagram: scope — "a single software system"; primary element — "the
software system in scope"; supporting elements — "people (e.g. users, actors, roles, or personas)
and software systems (external dependencies) that are directly connected to the software system
in scope"; audience — "everybody, both technical and non-technical"; "detail isn't important
here … focus should be on people … and software systems rather than technologies, protocols and
other low-level details". A software system is "the highest level of abstraction and describes
something that delivers value to its users, whether they are human or not" — i.e. the whole
product is ONE box at this level; deployables and contexts are containers (level 2), which live in
the canvases and `organise`, not in this diagram.

Mermaid (mermaid.js.org/syntax/c4.html — "experimental … syntax and properties can change"):

```
C4Context
  title System context — <system>
  Person(alias, "Label", "description")          Person_Ext for people outside the organisation
  System(alias, "Label", "description")          the system in scope
  System_Ext(alias, "Label", "description")      external dependency; SystemDb/SystemQueue variants exist
  Rel(from, to, "label", "technology?")          Rel_U/D/L/R force direction; BiRel for both ways
  Boundary(alias, "Label") { ... }               Enterprise_Boundary / System_Boundary if you must group
  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

Practical rules: aliases are derived from ids, never from titles (`meal_kit` from `meal-kit`; the
system alias is the manifest project slug); double-quote every label. Inside a label the
pre-fill's sanitiser turns en/em dashes into `-`, `"` into `'`, drops `<>{}` and control
characters and keeps everything else — digits and ranges ("20-150 technicians"), parentheses,
semicolons. Keep one `Rel` per party and direction with the message names joined (`"Choose Meals,
Start Subscription"`), direction producer → consumer (a person's command is person → system, an
event the system tells a partner is system → partner); responses are never drawn. Internal people
are `Person`, partners and SaaS are `System_Ext`. The pre-fill generates the block from
`discover.actors/external_systems`, `connect.parties` and the canvases' non-context rows; add a
line when you add a collaborator. The lint checks the block round-trips — one `System`, unique
alphanumeric aliases, no empty label, balanced quotes, every `Rel` endpoint declared — and warns
when a canvas collaborator is missing from the diagram.

---

## Sources (accessed 2026-08-29)

- ddd-crew, Bounded Context Canvas (README: sections, message types, design tips; v5 template labels) — https://github.com/ddd-crew/bounded-context-canvas
- ddd-crew, Model Traits worksheet — https://github.com/ddd-crew/bounded-context-canvas/blob/master/resources/model-traits-worksheet.md
- ddd-crew, DDD Starter Modelling Process — Define: "Define the roles and responsibilities of each bounded context … Before committing to a design, make explicit decisions about the choices which can have a significant impact on the overall design" — https://github.com/ddd-crew/ddd-starter-modelling-process
- ddd-crew, Context Mapping (pattern definitions, Evans quotes, team relationships) — https://github.com/ddd-crew/context-mapping
- Nick Tune, "Modelling Bounded Contexts with the Bounded Context Canvas: A Workshop Recipe" — https://medium.com/nick-tune-tech-strategy-blog/modelling-bounded-contexts-with-the-bounded-context-design-canvas-a-workshop-recipe-1f123e592ab
- Nick Tune, "Bounded Context Canvas V3: Simplifications and Additions" (message type definitions, model traits) — https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-v2-simplifications-and-additions-229ed35f825f
- Xebia blog, "Extending the Bounded Context Canvas with BDD Examples" — https://xebia.com/blog/extending-the-bounded-context-canvas-with-bdd-examples/
- c4model.com, System Context diagram; Software system abstraction — https://c4model.com/diagrams/system-context ; https://c4model.com/abstractions/software-system
- Mermaid, C4 diagrams — https://mermaid.js.org/syntax/c4.html
- Daniel Schleicher, "How Creating a Ubiquitous Language Ensures AI Builds What You Actually Want" (4 Jan 2026) — https://www.danielschleicher.com/software/engineering,/ai,/spec-driven/development/2026/01/04/removing-ambiguity-with-spec-driven-development.html
- Michał Jaskólski, "Domain-Driven Design with AI Assistance" (2025, updated Aug 2026) — https://developertoolkit.ai/en/shared-workflows/development-workflows/domain-driven-design/
- Russ Miles, "Domain Driven Agent Design" (8 Oct 2025) — https://engineeringagents.substack.com/p/domain-driven-agent-design
- Alireza Rahmani Khalili, "Domain Driven Design in the AI Era" (25 Oct 2025) — https://nidly.substack.com/p/domain-driven-design-in-the-ai-era
- James Phoenix, "DDD Bounded Contexts: Clear Domain Boundaries for LLM Code Generation" — https://understandingdata.com/posts/ddd-bounded-contexts-for-llms/
- Ibaraki, "When Outsourcing Development to LLMs, Define a DDD Ubiquitous Language" (30 Jun 2025) — https://zenn.dev/ncdc/articles/9bb22405eb9332?locale=en
- Annegret Junker (codecentric), "Five Principles for AI-Assisted DDD" (1 Jun 2026) — https://www.codecentric.de/en/knowledge-hub/blog/five-principles-for-ai-assisted-ddd-keeping-the-human-at-the-center
- Liu Shangqi (Thoughtworks), "Spec-driven development" (4 Dec 2025) — https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices
- Birgitta Böckeler, "Harness engineering for coding agent users" (2 Apr 2026) — https://martinfowler.com/articles/harness-engineering.html
- Eisenreich, Jusic, Wagner, "Automating Domain-Driven Design: Experience with a Prompting Framework" (Mar 2026) — https://arxiv.org/abs/2603.26244
- Terminal Skills, "Ubiquitous-Language" skill listing (glossary format guidance) — https://terminalskills.io/skills/ubiquitous-language
