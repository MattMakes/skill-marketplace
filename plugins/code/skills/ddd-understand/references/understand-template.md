# `understand.md` — template and a filled example

> **Paths:** `${CLAUDE_PLUGIN_ROOT}` below means this plugin's install directory — the absolute
> path already resolved in the SKILL.md that sent you here. Supporting files like this one are
> read raw, so substitute that path yourself; never paste the literal token into a shell.


Copy the shape below into `ddd/01-understand/understand.md`. Keep the ten `##` headings with
exactly these titles (a leading number is fine; an optional `## 11. Run log` may follow in auto
mode) — `ddd understand lint` looks for them — and put every id from `understand.json`
(G/I/D/cap-/alt-/C/A/Q/N) in the tables so a reader can move between the two files (the lint warns
for each id it cannot find in the text). §2b renders `business_model.value_proposition_links[]`,
§8a renders `alternatives[]` and §10a renders `notes_for_downstream[]` — the Markdown mirrors the
JSON; a note that exists only as prose here never reaches `ddd-discover` (the lint warns).
Text in `<angle brackets>` is guidance to delete. Depth scaling (capability numbers are the aim
band; the lint tolerates 3–8 / 4–15 / 6–30):

| Depth | What to fill |
|---|---|
| `light` | One-line BMC cells; 1–2 goals; impact map for the primary actor only; aim 3–6 capabilities; the primary actor's alternatives; skip §2a/§5a |
| `standard` | Full BMC; 2–4 goals; impact map per goal with every actor that matters; aim 6–12 capabilities; every alternative that competes with a capability |
| `deep` | As standard, plus §2a value proposition per segment and §5a Wardley evolution narrative; aim 10–15 capabilities |

---

# Understand — <Title>

| | |
|---|---|
| Project | `<slug>` |
| Mode / depth | <interactive or auto> / <light, standard or deep> |
| Lifecycle | <greenfield, brownfield or rewrite — does code of *this* system run in production today? no → greenfield; yes, extending it → brownfield; yes, replacing it → rewrite> |
| Produced | <YYYY-MM-DDTHH:MM:SSZ> by ddd-understand |
| Inputs | <README.md, docs/…, conversation notes> |

## In plain words

<One or two short sentences: what this step did and why anyone should care. Common words, one idea
per sentence, any jargon glossed the first time.>

**Decided:** <the call this step made, with numbers where there are numbers>

**Assumed:** <the guess a human is most likely to overturn>

**Riskiest:** <what hurts most if that guess is wrong, and where it bites>

---

## 1. System

**One-liner.** <one sentence a stranger understands; no product jargon>
**Problem.** <who has what pain today, in their words — not "there is no system for X">
**Why now.** <what changed: market, regulation, growth, a contract, a legacy system dying>
**Success in one sentence.** <the headline goal, with its number>

## 2. Business Model Canvas

<Fill in any order; then check coherence: every revenue stream has a paying segment, every value
proposition has a segment that wants it, every key activity serves a value proposition. Mark
guesses with "(assumed)". Present model only — put future ideas in Assumptions.>

| Block | Content |
|---|---|
| Customer segments | <who pays / who uses; one line per segment> |
| Value propositions | <what problem is solved or job done, per segment> |
| Channels | <how customers find, buy, receive, get support> |
| Customer relationships | <self-service, assisted, community, dedicated> |
| Revenue streams | <how money comes in, and from which segment> |
| Key resources | <what the model cannot run without: data, people, assets, licences> |
| Key activities | <what the organisation must be good at — these seed the capabilities> |
| Key partners | <suppliers and partners the model depends on> |
| Cost structure | <the costs that dominate> |

### 2a. Value proposition per segment <deep only>

| Segment | Jobs to be done | Pains | Gains | Our pain relievers / gain creators |
|---|---|---|---|---|

### 2b. Value proposition → capability → beats

<One row per value proposition in the canvas above — the string verbatim, the capability (§5) it
rests on and the alternative (§8a) it beats. Renders `business_model.value_proposition_links[]`,
which is how ddd-strategize sees what each differentiator depends on; keep it to one line per
proposition. "—" under Beats is fine when no alternative competes there (the lint only notes it);
a proposition resting on no capability is a warning — find the capability or drop the claim.>

| Value proposition | Rests on | Beats |
|---|---|---|
| <string from the canvas> | cap-<slug> | alt-<slug> / — |

## 3. Goals

<Outcomes, not outputs. Each goal has a metric you could read off a dashboard, a target and a
horizon. "Ship the mobile app" is a deliverable; "Cut time-to-first-invoice from 3 days to 1 hour
by Q2" is a goal.>

| Id | Goal | Metric | Target | Horizon |
|---|---|---|---|---|
| G1 | <statement> | <what is measured> | <number> | <when> |

## 4. Impact map

<One tree per goal (light: primary actor only). Actors are people, systems or organisations
whose behaviour must change for the goal to be met. Role: primary (gets the value; listed first),
secondary (serves or transacts with the primary), off-stage (does not use the system but can help
or block — regulator, incumbent supplier; the only role allowed to have no impact). An obstructor
that merely imposes rules is a constraint (§6), not an actor. Impacts are behaviour changes
("pays within 7 days"), never features — not "build/add/implement …". Deliverables are the
smallest thing that could plausibly cause the impact; priority must / should / could.>

- **G1 — <goal>**
  - **<actor-id>** (<kind>, <role>) — <why this actor matters to the goal>
    - **I1** <actor> <behaviour change>
      - **D1** (must) <smallest deliverable>
      - **D2** (could) <alternative deliverable>
  - **<actor-id>** (<kind>, <role>) — <…>
    - **I2** <…>
      - **D3** (should) <…>

| Id | Actor | Kind | Role | Description | Goals |
|---|---|---|---|---|---|
| <actor-id> | <Name> | person / system / organisation | primary / secondary / off-stage | <one line> | G1 |

## 5. Capabilities

<What the business does, as stable noun phrases ("Order management", not "Order service" or
"Checkout page" — the lint warns on solution words such as api, app, page, screen, module, ui,
backend, database, or a product name). Include capabilities the organisation needs even if it will buy them; the
evolution stage says which: genesis (novel, nobody has done this) · custom (built to fit, still
being learned) · product (buy or rent from competing vendors) · commodity (utility; consume it).
These become subdomain candidates in ddd-decompose; commodity/product ones become buy-not-build
candidates in ddd-strategize.>

| Id | Capability | What it means here | Evolution |
|---|---|---|---|
| cap-<slug> | <Noun phrase> | <one line, in the domain's words> | genesis / custom / product / commodity |

### 5a. Evolution narrative <deep only>

<Which capabilities are moving right (becoming products/commodities) over the horizon of the
goals, which are anchors of differentiation, and what that implies for where effort goes.>

## 6. Constraints

<Things the design cannot change: regulation (regulatory); what a customer or partner imposes —
SLAs, mandated file formats, data residency (contractual); tech the organisation must keep
(technical); team size or ownership politics (organisational); budget; dates (timeline). These
become conformist / anticorruption-layer relationships and quality attributes later — so state
them precisely.>

| Id | Kind | Constraint |
|---|---|---|
| C1 | regulatory / contractual / technical / organisational / budget / timeline / other | <text> |

## 7. Non-goals

<What this system will not do, so nobody models it by accident.>

- <non-goal>

## 8. Existing systems

<Always present — write "none" when the JSON has `[]`. Brownfield/rewrite: every system the new
one must live with. Greenfield: external services, partners' systems, and the customers' tools or
spreadsheets this product displaces (`will: replace` there does not make it a rewrite). `will`:
replace (we retire it), integrate (we talk to it), ignore (out of scope).>

| System | Role | Will |
|---|---|---|
| <name> | <what it does today> | replace / integrate / ignore |

### 8a. Alternatives today

<Differentiation is relative: what does each actor use *instead of us* today — a competitor, the
incumbent product, a spreadsheet, a manual process (phone calls, e-mail, paper), an in-house tool,
or nothing (`do-nothing` is an alternative too)? Existing systems are what we live with; these are
what we compete with — the same thing may appear in both (`will: replace` there, `alt-` here).
Always present: write "none" when the JSON has `[]` and record an assumption saying people truly
use nothing. Renders `alternatives[]`; ddd-strategize scores business differentiation against
these rows, so say what each does well *and* badly, and which capability (§5) it competes with.
When an alternative wins outright on a capability, add a note for strategize in §10a (e.g.
"routing: Google Maps is the alternative and it wins — do not build").>

| Id | Alternative | Kind | Used by | Does well | Does badly | Competes with |
|---|---|---|---|---|---|---|
| alt-<slug> | <name> | competitor / incumbent-product / spreadsheet / manual-process / in-house-tool / do-nothing | <actor id> | <strengths> | <weaknesses> | cap-<slug> |

## 9. Scale target

<How big the result is meant to be — the number every later step is checked against.>

- Deployable units: <min>–<max> · Teams: <n> · Users: <order of magnitude, if known>
- Notes: <e.g. "solo developer, modular monolith preferred", "platform team exists">

## 10. Assumptions and open questions

| Id | Assumption | Confidence |
|---|---|---|
| A1 | <inference a domain expert could overturn> | low / medium / high |

| Id | Question | Blocking | Owner |
|---|---|---|---|
| Q1 | <what you would have asked> | no / yes | <who can answer> |

<If this is a re-run, add a "Deprecated" table here — | Id | Collection | Reason | Since | — one
row per id removed since the last version (mirrors `deprecated[]` in the JSON).>

### 10a. Notes for downstream steps

<One row per `notes_for_downstream[]` entry in the JSON — same id, same text; write "none" when
the JSON has no entries. This is where anything a later step depends on but no field holds goes:
a word different roles use with different meanings (kind `language`), a process fact that fixes
the order of events (`process`), a boundary the user already stated (`boundary`), a decision
already taken (`decision`), a risk (`risk`). `For` lists bare step names — discover, decompose,
strategize, connect, organise, define, code. Never add a note here that is not in the JSON: prose
does not travel down the chain.>

| Id | For | Kind | Note |
|---|---|---|---|
| N1 | discover, decompose | language / boundary / process / risk / decision / other | <text, verbatim from the JSON> |

## 11. Run log <auto mode only — optional>

- Inputs: <what was read>
- Resolved: <mode / depth / scale target / lifecycle, and why>
- Recorded: <n assumptions, n open questions (n blocking)>

---

## Filled example (depth `light`, auto mode)

This matches `${CLAUDE_PLUGIN_ROOT}/shared/examples/mealkit/ddd/01-understand/understand.json`,
so you can read the two side by side — except §2b and §8a: the shared fixture predates
`alternatives[]` and `value_proposition_links[]` (this skill's additive keys), so their JSON shape
is given right after the example.

```markdown
# Understand — Meal-kit subscription

| | |
|---|---|
| Project | `mealkit` |
| Mode / depth | auto / light |
| Lifecycle | greenfield |
| Produced | 2026-08-29T10:00:00Z by ddd-understand |
| Inputs | README.md |

## 1. System
**One-liner.** Weekly meal kits delivered to subscribers.
**Problem.** Busy households want to cook at home without planning meals or shopping.
**Why now.** Demand for home cooking is up; the founders have a recipe library and a courier deal.
**Success in one sentence.** 10k active subscriptions within 12 months (G1).

## 2. Business Model Canvas
| Block | Content |
|---|---|
| Customer segments | Busy households |
| Value propositions | Pre-portioned weekly meals, no planning |
| Channels | Web app |
| Customer relationships | Self-service |
| Revenue streams | Weekly subscription fee |
| Key resources | Recipe library; cold chain |
| Key activities | Menu planning; packing; delivery |
| Key partners | Courier |
| Cost structure | Ingredients; logistics |

### 2b. Value proposition → capability → beats
| Value proposition | Rests on | Beats |
|---|---|---|
| Pre-portioned weekly meals | cap-menu-planning, cap-fulfilment | alt-supermarket-shop |

## 3. Goals
| Id | Goal | Metric | Target | Horizon |
|---|---|---|---|---|
| G1 | Grow active subscribers | active subscriptions | 10k | 12 months |

## 4. Impact map
- **G1 — Grow active subscribers**
  - **subscriber** (person) — the only actor whose behaviour directly moves G1
    - **I1** Chooses meals in under two minutes a week
      - **D1** (must) Weekly menu selection

| Id | Actor | Kind | Description | Goals |
|---|---|---|---|---|
| subscriber | Subscriber | person | Household receiving boxes | G1 |
| packer | Packer | person | Warehouse staff | — |

## 5. Capabilities
| Id | Capability | What it means here | Evolution |
|---|---|---|---|
| cap-subscription-management | Subscription management | Sign up, pause, cancel | product |
| cap-menu-planning | Menu planning | Weekly menu and choices | custom |
| cap-fulfilment | Fulfilment | Pack and ship boxes | custom |

## 6. Constraints
| Id | Kind | Constraint |
|---|---|---|
| C1 | regulatory | Food safety labelling on every box |

## 7. Non-goals
- Restaurant delivery

## 8. Existing systems
| System | Role | Will |
|---|---|---|
| Stripe | payments | integrate |

### 8a. Alternatives today
| Id | Alternative | Kind | Used by | Does well | Does badly | Competes with |
|---|---|---|---|---|---|---|
| alt-supermarket-shop | Weekly supermarket shop | manual-process | subscriber | Cheap; any recipe; no commitment | Planning and shopping cost an evening a week | cap-menu-planning, cap-fulfilment |

## 9. Scale target
- Deployable units: 1–3 · Teams: 1 · Users: 10k
- Notes: solo dev

## 10. Assumptions and open questions
| Id | Assumption | Confidence |
|---|---|---|
| A1 | Example fixture; assumptions are illustrative | high |

| Id | Question | Blocking | Owner |
|---|---|---|---|
| Q1 | Illustrative open question | no | domain expert |

### 10a. Notes for downstream steps
| Id | For | Kind | Note |
|---|---|---|---|
| N1 | discover, decompose | language | 'Box' means the week's menu choice to subscribers but the packed parcel to packers — treat as a boundary, not a synonym |
```

The two additive keys behind §2b and §8a, as they go into `understand.json` (every field shown;
`alternatives` is always present — `[]` plus an assumption when people truly use nothing):

```json
"alternatives": [
  { "id": "alt-supermarket-shop", "name": "Weekly supermarket shop", "kind": "manual-process",
    "used_by": ["subscriber"], "strengths": "Cheap; any recipe; no commitment",
    "weaknesses": "Planning and shopping cost an evening a week",
    "capabilities": ["cap-menu-planning", "cap-fulfilment"] }
],
"business_model": {
  "value_propositions": ["Pre-portioned weekly meals"],
  "value_proposition_links": [
    { "value_proposition": "Pre-portioned weekly meals",
      "capabilities": ["cap-menu-planning", "cap-fulfilment"], "beats": ["alt-supermarket-shop"] }
  ]
}
```

`kind`: `competitor` (a rival product) · `incumbent-product` (the vendor tool they already pay
for) · `spreadsheet` · `manual-process` (phone, e-mail, paper, walking over) · `in-house-tool`
(something IT or a power user built) · `do-nothing` (they live with the problem). `used_by` holds
actor ids, `capabilities` the `cap-` ids it competes with, `beats` the `alt-` ids the proposition
wins against.
