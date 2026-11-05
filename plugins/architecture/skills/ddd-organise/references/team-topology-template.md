# Template — `ddd/06-organise/team-topology.md`

> **Paths:** `${CLAUDE_PLUGIN_ROOT}` below means this plugin's install directory — the absolute
> path already resolved in the SKILL.md that sent you here. Supporting files like this one are
> read raw, so substitute that path yourself; never paste the literal token into a shell.


Fill every section marked **[all]**. Add **[standard+]** sections at depth `standard` and `deep`,
**[deep]** sections at depth `deep`. With two or more teams, "Interaction modes" is required at
every depth. Keep a `light` run to about one screen. The mermaid block is generated:
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs organise mermaid <ddd-dir>` — paste its
output verbatim so the diagram always matches `organise.json`.

````markdown
# Team topology — <project title>

_Step 6 of 9 (organise) · mode <interactive|auto> · depth <light|standard|deep> · produced <YYYY-MM-DD>_
_Inputs: ddd/03-decompose/decompose.json, ddd/05-connect/connect.json, ddd/04-strategize/strategize.json, ddd/01-understand/understand.json, ddd/manifest.json_

## In plain words

<One or two short sentences: what this step did and why anyone should care. Common words, one idea
per sentence, any jargon glossed the first time.>

**Decided:** <the call this step made, with numbers where there are numbers>

**Assumed:** <the guess a human is most likely to overturn>

**Riskiest:** <what hurts most if that guess is wrong, and where it bites>

---

## Summary  [all]

- <N> team(s), <M> deployable(s), topology style `<modular-monolith|few-services|many-services>`; target <min>–<max> → <within / outside, one clause why>.
- Core context <id> owned by <team>; bought/generic contexts (<ids>) are adapter modules, not deployables.
- First extraction candidate: <context> — trigger: <observable condition>.  (omit if none)

## Teams  [all]

| Team | Type | Size | Owns contexts | Cognitive load | Notes (minimal team API) |
|---|---|---|---|---|---|
| `<team-id>` <name> | stream-aligned | <n> | `<ctx>`, `<ctx>` | ok | <what it runs, how to reach it, service expectation> |

### Cognitive-load assessment  [standard+]

Per team: intrinsic load (core contexts, model complexity from strategize), extraneous load
(deployables operated, external systems, platform work), verdict from the primer rubric, and the
mitigation if `high`.

## Interaction modes  [all when ≥2 teams; otherwise write "One team — no cross-team interactions."]

_From = the team that consumes/needs, To = the team that provides (x-as-a-service: consumer → provider; facilitating: the enabling team is From; collaboration: either order — say why in Reason)._

| From (needs) | To (provides) | Mode | Reason (from the context-map relationship) | Until / review |
|---|---|---|---|---|
| `<team>` | `<team>` | x-as-a-service | `<ctx>` → `<ctx>` is customer-supplier (R2); consumes `<event>` | — |
| `<team>` | `<team>` | collaboration | discovering the `<ctx>`/`<ctx>` contract (partnership R4) | until the published language is agreed (~2 sprints), then x-as-a-service |

## Deployment topology  [all]

```mermaid
<output of ddd organise mermaid>
```

### Deployables

#### <Name> (`<deployable-id>`, <kind>)  — one block per deployable
- **Contexts:** `<ctx>` (module), `<ctx>` (adapter for <vendor>) …
- **Team:** `<team-id>`
- **Data store:** own — <what: e.g. one Postgres, one schema per module; no cross-schema joins or transactions; for an offline-first client: the local store it syncs from>
- **Independent deploy:** yes
- **Hosts runtime of:** `<ctx>` — frontends only, when the client runs a context's model offline; the context itself is listed under its server-side deployable. Omit otherwise.
- **Why these contexts live together / why this is a separate unit:** <the §2 row from deployable-split-decisions.md and the evidence, in the domain's words>

## Data-store ownership  [standard+]

| Context | Store / schema | Owned by deployable | How others get at it |
|---|---|---|---|
| `<ctx>` | `<db>.<schema>` | `<deployable>` | `<event>` events; `<query>` through the module contract |

## Scale check  [all]

- **Target:** <min>–<max> deployables (manifest notes: "<notes>"). **Actual:** <M>. **Within target:** yes / no.
- **Why not fewer:** <for each unit beyond the first, the reason and the evidence; with one unit, why one is enough>
- **Why not more:** <which contexts could be extracted (ISH candidates, async-only inbound) and which driver is missing or which blocker applies>

## Evolution plan  [deep]

| Order | Change | Trigger (observable) | Prerequisites | Reteaming pattern |
|---|---|---|---|---|
| 1 | extract `<ctx>` → `<new-deployable>` | <e.g. a second team takes fulfilment; warehouse link must work offline> | outbox for `<event>`; contract tests; no cross-schema joins | grow and split |

### Team API stubs  [deep]
One short block per team: focus, owned software, channels, service expectation, current interactions.

## Assumptions  [all]
- **A1** (<confidence>) <text>

## Open questions  [all]
- **Q1** (<blocking|non-blocking>, owner: <who>) <text>
````

## Worked example (standard depth, two teams, two deployables)

```markdown
# Team topology — Kitchen orders

_Step 6 of 9 (organise) · mode interactive · depth standard · produced 2026-08-29_

## Summary
- 2 teams, 2 deployables, topology style `few-services`; target 1–3 → within.
- Core context `ordering` owned by `product-team`; `payments` (Stripe) is an adapter module inside `orders-app`.
- First extraction candidate: none pending — `menu` stays in `orders-app` until a second product team forms.

## Teams
| Team | Type | Size | Owns contexts | Cognitive load | Notes |
|---|---|---|---|---|---|
| `product-team` Product | stream-aligned | 5 | `ordering`, `menu`, `payments` | ok | runs orders-app; #product-eng; 1 business day response on contract changes |
| `kitchen-team` Kitchen ops | stream-aligned | 3 | `kitchen-display` | ok | runs kitchen-service on site; #kitchen-eng |

## Interaction modes
| From | To | Mode | Reason | Until / review |
|---|---|---|---|---|
| `kitchen-team` | `product-team` | x-as-a-service | `ordering` → `kitchen-display` is published-language (R3); consumes `order-paid` | — |

## Deployment topology
(mermaid from ddd organise)

#### Orders app (`orders-app`, modular-monolith)
- Contexts: `ordering` (module), `menu` (module), `payments` (Stripe adapter)
- Team: `product-team` · Data store: own (Postgres, one schema per module) · Independent deploy: yes
- Why together: one team, in-process events, no scaling or runtime driver for any of the three.

#### Kitchen service (`kitchen-service`, service)
- Contexts: `kitchen-display` · Team: `kitchen-team` · Data store: own (SQLite on the kitchen box) · Independent deploy: yes
- Why separate: runs on the kitchen's own hardware and must keep showing tickets when the internet drops (understand C2, technical); owned by a different team with its own release cadence (row 4). Inbound is `order-paid` only, async — no sync hop.

## Scale check
- Target 1–3; actual 2; within target: yes.
- Why not fewer: folding `kitchen-display` into `orders-app` would make the kitchen depend on the office link (C2) and tie two teams to one release train.
- Why not more: `menu` is an ISH candidate but its inbound is a sync `get-menu` query from `ordering` (F1#1); extracting it adds a network hop for no driver.
```
