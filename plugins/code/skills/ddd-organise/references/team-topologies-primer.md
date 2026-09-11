# Team Topologies primer for `ddd-organise`

What the ORGANISE step needs from Team Topologies, Conway's law, Wardley's PST, Dynamic Reteaming
and the Independent Service Heuristics — distilled to the rules the skill applies. Sources with
URLs and access dates are in §9; quotes are verbatim from those pages.

## 0. Why this step exists

The DDD Starter Modelling Process defines Organise as: *"Organise autonomous teams that are
optimised for fast flow and aligned with context boundaries."* And it warns: *"Organisation is not
something that is done to teams, rather teams should be involved in the process of defining their
boundaries, interactions, and responsibilities."* In interactive mode that means the team questions
go to the people on the teams; in auto mode every team decision is an assumption to review.

Conway's law is why teams and deployables are decided together: the system you get mirrors the
communication structure that built it. If a deployable needs two teams to change it, releases
wait for both — the boundary is fiction. So this skill never lets a context be owned by two teams
and never lets a deployable straddle two teams.

## 1. Team-first thinking and cognitive load

*"Teams can only handle so much complexity before breaking down."* The team (not the individual)
is the unit of delivery, and its responsibilities must fit in its collective working memory. Three
kinds of load: **intrinsic** (the domain and technology fundamentals), **extraneous** (deployment
mechanics, environments, tooling — reduce it, usually with a platform), **germane** (the domain
knowledge that creates value — leave room for it).

Second edition (September 2025): the four team types and three interaction modes are unchanged.
What changed: cognitive load is *"elevated ... as a fundamental design principle"*, backed by
*"a scientific model identifying over twenty cognitive load drivers across four clusters"*
(with Dr Laura Weis); platforms are described as *"groupings of teams rather than monolithic
structures"* (a "platform grouping"); and the framing moves *"from viewing organizations as
'efficient machines' to 'flourishing ecosystems'"*. Nothing in the second edition changes the rules
below; it strengthens the case for reporting load honestly.

Practical rubric for `teams[].cognitive_load` — continuous, so every team lands somewhere. Say
`high` when it is true (`ddd validate` warns on it, and that warning is the point; the mitigation
goes in `notes`). Score three measures, then read the verdict:

| Measure | fine | elevated | high |
|---|---|---|---|
| **Deployables per person** — units the team runs beyond the first (everyone has one), ÷ team size | ≤ 1 extra unit per 3 people (≤ 0.34) | ≤ 1 extra unit per person (≤ 1.0) | > 1 extra unit per person |
| **Contexts per team** — bought/generic adapter contexts count ½ | ≤ 3 | 4 | ≥ 5 (a team of 9+ is grow-and-split territory anyway, §7) |
| **Qualitative drivers** — a core context with ≥3 external integrations; regulated work (audit trail, PCI/PHI, data residency); two runtimes or stacks (server + offline client, a Python model next to a TypeScript core); the team also runs the platform/infrastructure; one team must be pioneer, settler and town planner at once (§6) | none | one | two or more — or ≥2 core contexts, which is `high` on its own |

Verdict: any measure `high`, or two measures `elevated` → **`high`**; one `elevated` → **`ok`** with
that measure named in `notes`; ≤1 context (or only adapters) in one unit → **`low`**; otherwise **`ok`**.
Worked cases: a solo developer with three modules in one deployable → `ok`; the same person with
five contexts and two deployables → `high` (contexts); three people running three services → 0.67
extra units per person, `ok` with a note (`ddd organise check` still asks "why not fewer?");
**five people running three units** → (3 − 1) ÷ 5 = 0.4 extra units per person → `elevated` →
`ok`, and `notes` names the per-unit cost (pipeline, monitoring, on-call). If one of those three
units is an offline mobile client — a second runtime — that is a second `elevated` measure →
`high`, with the mitigation in `notes` (a second team takes the client, or the server units share one release train).

Mitigations, in order of cheapness: move a context to another team; fold deployables together;
add an enabling team for a temporary skill gap; add a platform team when ≥3 stream-aligned teams
carry the same extraneous load; plan a grow-and-split (see §7).

## 2. The four team types

| Type | Definition (teamtopologies.com) | Use it in this chain when |
|---|---|---|
| **Stream-aligned** | *"aligned to a flow of work from (usually) a segment of the business domain"* | Always the default. Owns whole bounded contexts end to end (build **and** run). The core context goes to the strongest stream-aligned team. |
| **Platform** | *"a grouping of other team types that provide a compelling internal product to accelerate delivery by Stream-aligned teams"* | Only when ≥3 stream-aligned teams need the same infrastructure or internal service. Start with the *Thinnest Viable Platform* (often a wiki page and a few scripts). Usually owns no bounded context (`owns_contexts: []`). |
| **Enabling** | *"helps a Stream-aligned team to overcome obstacles. Also detects missing capabilities."* | Only for a named capability gap (e.g. "no one has done event-driven integration") with an end date. Interacts by facilitating. Owns no context. |
| **Complicated-subsystem** | *"where significant mathematics/calculation/technical expertise is needed."* | Only when one context genuinely needs specialists — pricing/optimisation engines, ML models, codecs — typically `strategize` `model_complexity ≥ 8` **and** a skill most developers lack. Owns exactly that context; serves it x-as-a-service. |

Rules of thumb: one small team → one stream-aligned team owning everything (record it; it takes
two minutes). Several teams → each team owns *whole* contexts; group contexts by flow of change and
shared language, never by technical layer. Never invent a team that does not exist to make the
diagram look right — the manifest's `scale_target.teams` and the repo are the evidence.

## 3. The three interaction modes

| Mode | Definition (teamtopologies.com) | Rule |
|---|---|---|
| **Collaboration** | *"working together for a defined period of time to discover new things (APIs, practices, technologies, etc.)"* | High bandwidth, high cost. Allowed only while a cross-team boundary or contract is being discovered — a partnership or shared kernel, or e.g. the acknowledgement rule between two core contexts. **Time-boxed**: the `reason` states when it ends and decays to x-as-a-service. |
| **X-as-a-Service** | *"one team provides and one team consumes something 'as a Service'"* | The default for every stable boundary. |
| **Facilitating** | *"one team helps and mentors another team"* | Enabling teams only. |

Derive the default mode for each pair of *different* teams from the context-map relationship in
`decompose.json` (same-team relationships are internal — do not record them):

| `relationships[].pattern` | ddd-crew team relationship | Default interaction mode |
|---|---|---|
| `partnership` | mutually dependent | `collaboration` (time-boxed; say when it turns into x-as-a-service) |
| `shared-kernel` | mutually dependent | `collaboration` — and a smell: should one team own both contexts? |
| `customer-supplier` | upstream/downstream | `x-as-a-service` (*"downstream priorities factor into upstream planning"*) |
| `open-host-service`, `published-language` | upstream/downstream | `x-as-a-service` |
| `conformist` | upstream/downstream | `x-as-a-service` — note that the downstream team has no leverage |
| `anticorruption-layer` | upstream/downstream | `x-as-a-service` — the downstream team owns the ACL |
| `separate-ways` | free | none |
| `big-ball-of-mud` | — | `x-as-a-service` through an ACL; never collaborate *inside* the mud |
| enabling team → any team | — | `facilitating` |
| stream-aligned → platform team | — | `x-as-a-service` (the stream-aligned team consumes the platform) |

Direction of `interactions[].from/to` (contract §4.6): `from` is the team that consumes/needs, `to`
the team that provides — `x-as-a-service`: consumer → provider (for upstream/downstream patterns the
downstream context's team is `from`); `facilitating`: the enabling team is `from`; `collaboration`:
either order, say why in `reason`. `ddd organise check` prints each interaction read that way.

Keep the interaction table short: n teams have n(n−1)/2 possible pairs; if most of them are
collaboration, the boundaries are wrong, not the table.

## 4. Team API

*"A Team API is a description and specification that a team can define that tells others how to
interact with that team."* Sections in the official template: team name, focus and type; the
software it owns and evolves; versioning; documentation; chat channels and daily sync times;
service-level expectations; current and expected interactions. In this chain the minimum team API
lives in `teams[].notes` (what it owns, how to reach it, what service level it promises); at
`deep` depth write a short Team API stub per team in `team-topology.md`.

## 5. Conway's law and the Inverse Conway Manoeuvre

Conway (1968), as the Thoughtworks Radar quotes it: *"organizations are constrained to produce
application designs which are copies of their communication structures."* The **Inverse Conway
Manoeuvre** is the deliberate reverse — *"evolving your team and organizational structure to
promote your desired architecture"*. Thoughtworks Technology Radar listed it as *Trial* in July
2014 and January 2015 (it is no longer on the current radar; Team Topologies made it mainstream).

Consequences this skill enforces:

1. Every bounded context is owned by exactly one team (schema + `ddd validate`).
2. A deployable never straddles team boundaries: its `team` is the owner of *every* context in it
   (`ddd organise check`). Two teams changing one deployable means coordinated releases —
   exactly what independent deployability was supposed to remove.
3. If the desired deployment topology would put two teams' contexts in one unit, change the plan:
   reassign the context, split the unit, or merge the teams. Do not paper over it.
4. Team count does not dictate deployable count. N teams can own N modules of one modular
   monolith with a shared release train (Newman: modular monoliths let teams own parts of the
   code). Split along team lines only when a team needs its own release cadence or on-call.
5. Communication paths are the real cost: fewer, clearer boundaries beat many thin ones.

## 6. Pioneers, Settlers, Town Planners (Wardley) — brief

Pioneers explore the new and fail often; Settlers turn half-baked ideas into products; Town
Planners industrialise proven things into cheap, reliable utilities. Each group *"steals"* from
the previous one, and *"Engineering in the pioneering group is not the same as engineering in
the town planners."* Map it to `strategize.json` `evolution`: `genesis`/`custom` → pioneer
/settler work (usually the core), `product` → settlers, `commodity` → town planners (usually
generic, often bought). ddd-crew calls the same model "Explorers, Villagers & Town Planners".

Practical use: when several teams exist, do not run the core (uncertain, fast-changing) under the
process and metrics that suit commodity work, and vice versa; note the attitude each team needs in
`notes`. When one small team must be all three, say so — it is a cognitive-load fact.

## 7. Dynamic Reteaming (Helfand) — brief

Teams change whether or not you plan it; plan it. Five patterns: **one by one** (add/remove a
person), **grow and split** (a team that outgrows ~8–10 people or whose load goes `high` splits
along a context boundary), **merging** (two teams, or two contexts that turned out to be one),
**isolation** (a separate team for a new bet — pioneer work), **switching** (people move to
learn or unblock). Use them in the `deep` evolution plan: "when <trigger>, apply <pattern>".

## 8. Independent Service Heuristics — how to read `decompose`'s verdicts

The ten ISH questions (TeamTopologies/Independent-Service-Heuristics): **Sense-check** (*"Could
it make any logical sense to offer this thing 'as a service'?"*), **Brand** (could it be branded
as a public cloud service), **Revenue/Customers**, **Cost tracking**, **Data** (clearly defined
input data), **User personas**, **Teams** (*"Could a team or set of teams effectively build and
operate a service based on this thing?"*), **Dependencies** (*"act independently of other teams
for the majority of the time"*), **Impact/Value**, **Product decisions** (own the roadmap).
Scoring: *"The more 'yes' or 'probably' answers, the greater the chance that you have found a
good candidate for being a separate stream of change."*

Note the wording: a separate *stream of change* — a team/ownership boundary — not a separate
process. In this step: `verdict: candidate` = eligible to be owned by its own team and, later, to
become its own deployable; it still needs a concrete driver (see
`deployable-split-decisions.md` §2) to split *now*. `merge` = never its own deployable. `unsure`
= keep it in the monolith and carry an open question.

## 9. Sources (all accessed 2026-08-29)

- Team Topologies — Key concepts: https://teamtopologies.com/key-concepts
- Team Topologies — second edition announcement (Sept 2025): https://teamtopologies.com/news-blogs-newsletters/the-second-edition-of-team-topologies-is-now-available
- Team API template: https://github.com/TeamTopologies/Team-API-template
- Independent Service Heuristics: https://github.com/TeamTopologies/Independent-Service-Heuristics
- DDD Starter Modelling Process (Organise step): https://github.com/ddd-crew/ddd-starter-modelling-process
- ddd-crew Context Mapping (team relationships): https://github.com/ddd-crew/context-mapping
- Thoughtworks Technology Radar — Inverse Conway Maneuver: https://www.thoughtworks.com/radar/techniques/inverse-conway-maneuver
- Simon Wardley — On Pioneers, Settlers, Town Planners and Theft (2015): https://blog.gardeviance.org/2015/03/on-pioneers-settlers-town-planners-and.html
- Heidi Helfand — Dynamic Reteaming (five patterns): https://www.pluralsight.com/blog/teams/heidi-helfand-s-five-patterns-for-responsible-reteaming and https://leanpub.com/dynamicreteaming
