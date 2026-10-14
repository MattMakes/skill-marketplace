# Boundary heuristics — from an event storm to subdomains and bounded contexts

Read this when you are about to cut the timeline into candidates (SKILL.md workflow step 3), when
two candidates will not separate cleanly, or when the user challenges a boundary. It is the
"why" behind the rules in SKILL.md; the rules themselves are repeated here in full.

## 1. Vocabulary that must stay straight

| Term | Space | Found how | In this chain |
|---|---|---|---|
| **Subdomain** | Problem space — an area of the business that exists whether or not we build software | *Discovered*: a business capability from `understand.json` plus the cluster of events/commands on the storm that realise it | `decompose.json` `subdomains[]`; classified core/supporting/generic by `ddd-strategize` |
| **Bounded context** | Solution space — the boundary inside which one model and one ubiquitous language hold, every term meaning exactly one thing | *Designed*: we decide where the model boundary goes | `bounded_contexts[]`; becomes a module/service in `ddd-organise`, a canvas in `ddd-define` |

Rules of thumb (Khononov, *Learning DDD* ch. 3; Fowler, BoundedContext):

- A bounded context is the boundary of a **model and its language, not of data or tables**. "Customer" in
  Sales and "Customer" in Support being different concepts is the canonical reason to have two contexts.
- Subdomains and contexts are **not necessarily 1:1**. For a *new* system default to 1:1 (same id
  for both — the mealkit fixture does this); let one context host several small subdomains when they
  share language and change together. Splitting one subdomain across two contexts is a smell at this
  stage — if you must, log an assumption.
- A bounded context is "your biggest valid monolith" (Khononov): the *widest* boundary in which the
  language is still consistent. Start wide; split when knowledge (or pain) justifies it.
- A context is not a microservice. More contexts than deployables is normal (modules); more
  deployables than contexts is a distributed monolith.

## 2. The clustering procedure (what to actually do with the timeline)

Run `ddd decompose worksheet <ddd-dir>` first — it prints every signal below in one page.
Then, in this order:

1. **Cut at pivotal events.** Each segment of the timeline between two pivotal events (`discover.pivotal_events`)
   is a first candidate. Pivotal events are where the business changes what it is talking about
   (`Order Placed` ends "shopping" and starts "fulfilling").
2. **Overlay actors (swimlanes).** Where the actor changes across the cut (`subscriber` → `packer`), the
   cut is confirmed. Where one actor spans several segments, consider whether those segments are one context.
3. **Overlay aggregate candidates.** They are hints discover bundled by actor or phase, not proven
   invariants: they *yield* to language (step 5) and data ownership (§3.4). Keep one whole when nothing
   contradicts it; when you split one, log an assumption and a `kind: boundary` note for `code`
   (`ddd decompose check` reports candidates whose `handles`/`emits` straddle contexts).
4. **Overlay capabilities** from `understand.json`. A capability usually maps to one subdomain; if one
   capability spans two candidates, ask whether the language really differs across them.
5. **Check language.** Scan `discover.glossary` and hotspots of kind `conflict`. Any word with two
   meanings, or an `avoid` list that reveals two teams naming the same thing differently, is a boundary
   *between* the two places the word is used.
6. **Decide what each external/existing system is** (worksheet §6 prints the evidence). Default for a
   bought/generic system: an *adapter inside* the context that uses it — record it in that context's
   `wraps` and give the events/commands it acts on to that context. A wrapper context of its own only
   when the evidence says so: the system's part of the storm carries its own language (distinct terms) or
   a distinct actor drives it. The wrapper *is* the ACL/conformist boundary — say which in its `rationale`;
   the system itself is never on the map. A `will: replace` legacy is a `big-ball-of-mud` context only
   while it stays live and other contexts integrate with it; imported once and retired → not on the map.
7. **Isolate regulated data** if a constraint of kind `regulatory` names a data class (PII, PCI, medical).
8. **Merge pass.** For each pair of adjacent candidates ask the merge questions in §5. Prefer fewer,
   coarser contexts; splitting later is cheaper than merging.
9. **Name** every result in the domain's language (`fulfilment`, not `shipping-service`), kebab-case id.

## 3. Heuristics in priority order

Apply them top-down; the first heuristic that gives a clear answer usually wins, and the `heuristics_applied`
list on each subdomain records which ones actually decided it. Slugs in brackets are the values to use.

### 3.1 Language shift `[language-boundary]`
*Signal:* the same word means different things in two places, or two groups use different words for the
same thing. *Test:* "If I say *Box* to the subscriber team and to the packers, do they picture the same
thing?" *Implies:* two contexts, and the term goes into `bounded_contexts[].terms` on both sides and into
`glossary.md` per context. This is the strongest heuristic because a single model cannot hold two meanings
without becoming ambiguous — every later design step depends on the words being stable.

- Good: "`Box` in Subscriptions is the weekly menu choice; in Fulfilment it is the packed physical parcel with a picking list → separate contexts."
- Bad: "There is a `boxes` table, so Box needs its own context." (A table is storage, not a model.)

### 3.2 Pivotal events `[pivotal-event]`
*Signal:* an event after which the vocabulary, the actors or the goals change. *Test:* "After this event,
does the business stop caring about the previous questions?" *Implies:* the event is owned by the context
before the cut and published to the context after it. If a pivotal event has no clear before/after
difference, it is probably a milestone inside one context, not a boundary.

### 3.3 Actor / persona change `[actor]`
*Signal:* a different person or role drives the commands (`packer` vs `subscriber`), or a different user
persona reads the read models. *Test:* "Would these people sit in the same meeting to decide a rule change?"
*Implies:* separate contexts and usually separate teams later (ISH question 6, Team Topologies persona fracture plane).

### 3.4 Data ownership and lifecycle `[data-ownership]`
*Signal:* a cluster creates, changes and retires its own data on its own schedule; another cluster only
reads a projection of it. *Test:* "Who is allowed to change this fact, and who merely needs to know it
changed?" *Implies:* the writer owns the data and the aggregate; readers get a published event or a
read model, never the writer's tables. Reading the same data is not a reason to merge.

### 3.5 Rate and reason of change `[rate-of-change]`
*Signal:* one cluster is expected to change weekly because it is where the product experiments; another
is stable. *Test:* "When the business changes its mind next quarter, which of these moves?" *Implies:*
separate the volatile from the stable so that changes do not cascade (Khononov's *volatility* dimension;
virtualddd "align with rate of change" / "align with source of change"). Core subdomains are usually the
volatile ones; generic ones rarely change.

### 3.6 Regulatory isolation `[regulatory]`
*Signal:* a constraint of kind `regulatory` (PCI, GDPR, medical records, audit). *Test:* "Would an auditor
want this in a room of its own?" *Implies:* a context whose whole purpose is to contain the regulated data
and rules, with a minimal, explicit interface.

### 3.7 Existing systems `[external-system]`
*Signal:* an `existing_systems[]` entry or an `external_systems[]` actor on the storm. *Test:* "Do we
control this model — and does its part of the storm have its own words or its own actor?" *Implies:* no
own words/actor → an adapter inside the context that uses it (`wraps`), not a context; own words or actor
→ a wrapper context that *is* the ACL (translate) or conformist (adopt) boundary, recorded in `rationale`;
`will: replace` and still live → a `big-ball-of-mud` context beside the clean replacement; imported once
and retired → not on the map. Never draw the external system itself as a relationship endpoint.

### 3.8 Secondary lenses (confirm, do not decide)
- `[capability]` — the boundary lines up with a business capability from `understand.json`. Capabilities
  are stable nouns ("Order management"), which is why they are a good sanity check, but two capabilities
  can share one language and then belong in one context.
- `[coupling]` — the coupling lens in §6: candidates that share *functional* or *model* knowledge belong
  together or in a partnership; those that share only a *contract* can be apart.
- Transactions — facts that must be consistent in the same instant belong in one aggregate, so in one context
  (a discover aggregate *candidate* is not proof of such an invariant — see §2 step 3).
- Policies — a policy whose `when` event and `then` command sit in different candidates is a **relationship**
  (publisher upstream), not evidence for a merge.

## 4. Anti-heuristics (things that look like boundaries and are not)

| Looks like a boundary | Why it is not | What to do instead |
|---|---|---|
| A database table / entity (`Customer`, `Product`) | One entity means different things in different contexts; an "entity service" becomes a hub every context depends on (Dahan, Comartin) | Ask which *behaviour* owns which facts about it; split the entity across contexts by meaning |
| The org chart | Org structures change more often than the business does; GitLab rejected org alignment for exactly this reason | Align with product/business structure; relabel ownership when teams change |
| Technical layers (UI / API / DB / "integration") | Layers cut across every business concept and give a context that changes for every reason | Vertical slices: each context owns its UI-facing commands, its rules and its data |
| CRUD verbs ("Order Management" = create/read/update/delete orders) | Says nothing about rules or language | Name the capability by outcome (`ordering`, `fulfilment`) and list the events it owns |
| One context per aggregate | Aggregates are tactical; a context usually holds several | Keep aggregates inside a context; revisit in `ddd-code` |
| "Microservices-shaped" splits ("Order validation service") | A seam in deployment, not in the model; produces distributed monoliths | Only split where language/actor/data say so; deployment is `ddd-organise`'s decision |

## 5. Sizing, merging and the scale target

Bands the check script applies (`ddd decompose check`), derived from `manifest.scale_target`:

| `deployables_max` | Aim for | Hard floor |
|---|---|---|
| 1–3 | 2–6 contexts | ≥ `deployables_min` |
| 4–9 | 4–10 contexts | ≥ `deployables_min` |
| 10–20 | 6–15 contexts | ≥ `deployables_min` |

More contexts than deployables is fine (they become modules in one deployable). Fewer contexts than the
minimum number of deployables is not — a deployable cannot be half a context.

**Merge two candidates when** all of: the same people change them for the same reasons; no term changes
meaning across them; one would have fewer than ~2 events and ~2 commands; the ISH verdict for one is
`merge` *and* it has no language of its own. **Keep them apart when** any of: a word shifts meaning; a
pivotal event sits between them with different actors on each side; one is regulated, or wraps an external
system with its own language or actor; they have different rates of change. When you are unsure about the
*boundary*, merge and record an open question — the seam is still visible in the events, so splitting
later is cheap (an ISH `unsure` verdict is a different question and does not merge — SKILL.md Method) (Jovanović 2025: extract one context at a time,
decouple with domain events). Common 2025–2026 mistakes to avoid: modelling from the database up,
sharing entities across contexts "because DRY", slicing too thin (`OrderValidation` as a context),
and drawing lines that cut across who is responsible.

## 6. The coupling lens (Khononov, *Balancing Coupling in Software Design*, 2024)

Use this to sanity-check a proposed split or a relationship when the other heuristics disagree.

- **Integration strength** — how much knowledge crosses the boundary: *intrusive* (touches internals) >
  *functional* (shares business rules; the two must change together) > *model* (shares a domain model) >
  *contract* (shares only an integration-specific message/API).
- **Distance** — how far apart the two sides are: same module < same deployable < different deployables <
  different teams < different organisations.
- **Volatility** — how often the upstream side is expected to change (core = high, generic = low).
- **Balance:** strength and distance should point in opposite directions — high strength ⇒ keep them close
  (same context or a partnership); contract-only ⇒ they can be far apart. Low volatility makes any coupling
  tolerable (a stable generic context can be a conformist's upstream without pain).

Applied to decompose: if two candidates would need *functional* or *model* knowledge of each other and both
are volatile, they are one context (or an explicit `partnership`); if only a *contract* crosses, separate
contexts with `published-language`/`customer-supplier` are sound.

## 7. Deep depth: alternative decompositions

At depth `deep`, write at least two alternatives in `subdomains.md` §6 and say why they lost:

- **Coarser:** merge the two closest contexts. Rejected when: a term would carry two meanings, or the merged
  context would have two rates of change / two audiences.
- **Finer:** split the largest context along its second-strongest seam. Rejected when: the halves share
  functional knowledge, would need a distributed transaction, or the split is by entity/table.
- **Different lens:** by actor instead of by phase (or vice versa). Rejected when it separates an aggregate.

Record the losing alternatives as `assumptions[]` with `confidence` so a reviewer can reopen them.

## 8. Sources (accessed 2026-08-29)

- DDD Starter Modelling Process, "Decompose" — https://github.com/ddd-crew/ddd-starter-modelling-process
- EventStorming glossary cheat sheet (pivotal events, swimlanes, emerging bounded contexts) — https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet
- Martin Fowler, *BoundedContext* (2014) — https://martinfowler.com/bliki/BoundedContext.html
- Vlad Khononov, *Bounded Contexts are NOT Microservices* (2018) — https://vladikk.com/2018/01/21/bounded-contexts-vs-microservices/ ; *Learning Domain-Driven Design* (O'Reilly 2021) ch. 1–4 — https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/ ; interview — https://techleadjournal.dev/episodes/76/
- Vlad Khononov, *Balancing Coupling in Software Design* (Addison-Wesley 2024) — https://coupling.dev/ ; tl;dr by olano.dev (2025) — https://olano.dev/blog/balancing-coupling/
- Virtual DDD heuristics collection (align with rate/source of change, transactional boundaries, look at the humans / one-way flow during big-picture EventStorming, design contexts around policies) — https://virtualddd.com/heuristics/ (dddheuristics.com redirects here)
- Nick Tune, *Finding Service Boundaries: The One Rule That Matters* (2017) — https://medium.com/nick-tune-tech-strategy-blog/finding-service-boundaries-the-one-rule-that-matters-2bd00f4e0c78 and *EventStorming Modelling Tips to Facilitate Microservice Design* — https://medium.com/nick-tune-tech-strategy-blog/eventstorming-modelling-tips-to-facilitate-microservice-design-1b1b0b838efc (Medium blocked direct fetch; content corroborated through search excerpts: language first, then capabilities/departments; pivotal events mark state changes between parts of the business; the one rule is maximising frequent value delivery)
- Udi Dahan's healthcare illustration of service boundaries, InfoQ (2015) — https://www.infoq.com/news/2015/02/service-boundaries-healthcare
- Derek Comartin, *Context is King: Finding Service Boundaries through Language* (2019) — https://dev.to/codeopinion/context-is-king-finding-service-boundaries-through-language-4e8h
- INNOQ, *Identification of Team Boundaries* (2024; fracture planes + ISH + DDD) — https://www.innoq.com/en/blog/2024/07/identifikation-von-team-grenzen/
- GitLab, *Modular Monolith ADR 002: Define bounded contexts* (2024) — https://handbook.gitlab.com/handbook/engineering/architecture/design-documents/modular_monolith/decisions/002_bounded_contexts_definition
- Milan Jovanović, *Refactoring Overgrown Bounded Contexts in Modular Monoliths* (2025) — https://www.milanjovanovic.tech/blog/refactoring-overgrown-bounded-contexts-in-modular-monoliths
- Dev Leader, *DDD and Bounded Contexts in a Modular Monolith with C#* (2026) — https://www.devleader.ca/2026/07/18/ddd-and-bounded-contexts-in-a-modular-monolith-with-c-a-practical-guide
- Java Code Geeks, *DDD in the Age of Microservices: Where Bounded Contexts End and Services Begin* (2026; via search excerpt, direct fetch blocked) — https://www.javacodegeeks.com/2026/07/domain-driven-design-in-the-age-of-microservices-where-bounded-contexts-end-and-services-begin.html
