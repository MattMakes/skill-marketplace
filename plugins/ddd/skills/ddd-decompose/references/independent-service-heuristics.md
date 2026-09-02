# Independent Service Heuristics (ISH) — checklist, contract mapping, verdict rule

Read this when filling `bounded_contexts[].independent_service_check` (SKILL.md workflow step 3).
ISH (Team Topologies) asks one question ten ways: *could this thing be run as a separate
service/product with its own team?* The more "yes/probably" answers, the better the candidate
for an independent stream of change. Mixed answers mean "investigate", not "reject".

## 1. The ten questions (with the sub-prompts that make them answerable)

| # | Heuristic | Ask | Contract key |
|---|---|---|---|
| 1 | **Sense-check** | Could it make logical sense to offer this "as a service"? Is it independent enough? Would consumers understand and value it? | `sense_check` |
| 2 | **Brand** | Could you imagine it branded as a public cloud service? Would it be a viable, compelling offering? | `brand` |
| 3 | **Revenue / customers** | Could it be managed as a viable service in terms of revenue and customers? Is there a clearly defined customer base (internal counts)? | `revenue` |
| 4 | **Cost tracking** | Could the organisation track its costs and investment separately (infra, storage, licences)? Is it fairly separate from other functions? | `cost_tracking` |
| 5 | **Data** | Can you clearly define the input data it needs? Is it fairly independent from other data sources? Are those sources under our control and self-service? | `data` |
| 6 | **User personas** | Does it have a small, well-defined set of user types? Can their needs be articulated? | `user_personas` |
| 7 | **Teams / cognitive load** | Could one team build and operate it? Would the cognitive load (breadth of topics, context switching) stay bounded? | `cognitive_load` |
| 8 | **Dependencies** | Could its team act independently of other teams most of the time, self-serving dependencies without blocking? | `dependencies` (optional extra key) |
| 9 | **Impact / value** | Is the scope big enough to give a team an engaging, impactful challenge with recognised value? | `impact` (optional extra key) |
| 10 | **Product decisions** | Could its team own a product roadmap based on its own user discovery? | `product_decisions` (optional extra key) |

The contract requires only `verdict`; the seven named keys are the recommended record; the three
optional keys are for depth `deep` or when the user cares about team autonomy. The validator does not
reject extra keys.

## 2. Answer scale

`yes` | `probably` | `partial` | `no` | `unknown`. One word per key. Put the reasoning in the context's
`rationale` (one sentence for the decisive answers), never in the answer field.

## 3. Verdict rule (the auto-mode default; a human may override)

"Yes-ish" = `yes` or `probably`.

1. `sense_check` not yes-ish → **`merge`** (nobody would recognise it as a thing).
2. Otherwise, `data` not yes-ish *and* `user_personas` not yes-ish → **`merge`** (it has neither its own
   inputs nor its own users; it is a feature of a neighbour).
3. Otherwise, at least 4 of the 7 recorded keys yes-ish → **`candidate`**.
4. Otherwise → **`unsure`** and add an `open_questions[]` entry naming the two most doubtful heuristics
   (ISH: "mixed answers warrant deeper investigation").

What the verdict means downstream:

- `candidate` — could be its own deployable and/or team; `ddd-organise` decides whether it is, given the scale target.
- `merge` — **does not delete the context.** It says "this is a module inside a neighbour's deployable, not
  a service". Before writing, merge the *context* into its neighbour only if it also has no language of
  its own (no `terms[]` with a distinct `meaning_here`) — a thin wrapper around an external system with its
  own vocabulary stays a context (the mealkit fixture's `billing` is exactly this). Carry the module
  decision to `ddd-organise` as a `notes_for_downstream` entry (`for: ["organise"]`, `kind: decision`).
- `unsure` — the context exists (its language is distinct) but is a module, never its own deployable.
  This is *ISH*-unsure, not *boundary*-unsure (which merges — SKILL.md Method states the precedence
  once). Record the open question **and** the same `organise` note; `ddd decompose check` reminds you.

## 4. Depth scaling

- `light`: `verdict` plus the two decisive answers (`sense_check`, `data`) at minimum; the other five are
  one word each, so fill them when you can.
- `standard`: all seven keys.
- `deep`: all ten, and a line per "no" in `rationale` saying what would have to change for it to become a `yes`.

## 5. Worked example (mealkit fixture, depth light)

| Context | sense | brand | revenue | cost | data | personas | cog. load | verdict | why |
|---|---|---|---|---|---|---|---|---|---|
| subscriptions | yes | yes | yes | yes | yes | yes | yes | candidate | it *is* the product |
| billing | no | no | no | yes | probably | no | yes | merge | a wrapper around Stripe; its own words (charge, week) keep it a context, but it is a module |
| fulfilment | yes | probably | partial | yes | yes | yes | yes | candidate | packers, boxes, couriers — a warehouse product in its own right |

## 6. Sources (accessed 2026-08-29)

- Team Topologies, *Independent Service Heuristics* (the checklist) — https://github.com/TeamTopologies/Independent-Service-Heuristics
- Team Topologies, *Finding good stream boundaries with Independent Service Heuristics* — https://teamtopologies.com/key-concepts-content/finding-good-stream-boundaries-with-independent-service-heuristics
- INNOQ, *Identification of Team Boundaries* (2024) — answer individually, expect a tendency rather than agreement — https://www.innoq.com/en/blog/2024/07/identifikation-von-team-grenzen/
