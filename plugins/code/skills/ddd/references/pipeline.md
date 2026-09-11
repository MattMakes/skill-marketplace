# The nine steps — inputs, outputs, and what "good" looks like

> **Paths:** `${CLAUDE_PLUGIN_ROOT}` below means this plugin's install directory — the absolute
> path already resolved in the SKILL.md that sent you here. Supporting files like this one are
> read raw, so substitute that path yourself; never paste the literal token into a shell.


All paths are relative to the project root; the workspace is `ddd/` unless the manifest says otherwise.
Full field-level contract: `${CLAUDE_PLUGIN_ROOT}/shared/references/artifact-contract.md`.

| # | Skill | Reads | Writes | Good looks like |
|---|---|---|---|---|
| 1 | `ddd-understand` | repo docs, user | `manifest.json`, `01-understand/understand.{md,json}` | Goals with metrics; actors whose behaviour must change; capabilities (not features) with an evolution stage; constraints, non-goals, existing systems; a stated `scale_target`. |
| 2 | `ddd-discover` | `understand.json`, docs | `02-discover/event-storm.{md,json}`, seeds `glossary.md` | Past-tense business events on a timeline by phase; commands with actors; policies "whenever X then Y"; hotspots recorded not resolved; pivotal events marked; 2–4 scenarios. |
| 3 | `ddd-decompose` | `discover.json`, `understand.json` | `03-decompose/subdomains.md`, `decompose.json` | Every event/command owned by exactly one context; boundaries justified by language/pivotal events/actors, not tables; Independent Service Heuristics verdicts; a context map with named relationship patterns. |
| 4 | `ddd-strategize` | `decompose.json`, `understand.json` | `04-strategize/core-domain-chart.{md,json}` | Core is the minority; each classification tied to a goal; build/buy per subdomain; implementation pattern per subdomain (transaction script … event-sourced). |
| 5 | `ddd-connect` | `decompose`, `strategize`, `discover` | `05-connect/message-flows.{md,json}` | 3–7 scenarios as numbered message flows; message catalogue reusing discover ids; one integration decision per relationship; coupling concerns named. |
| 6 | `ddd-organise` | `decompose`, `connect`, `strategize`, manifest | `06-organise/team-topology.{md,json}` | Every context owned by one team and in one deployable; modular monolith unless a stated reason; deployable count checked against `scale_target` with "why not fewer / more". |
| 7 | `ddd-define` | everything above, `glossary.md` | `07-define/<ctx>/bounded-context-canvas.md`, `system-context.md`, `define.json`, refines `glossary.md` | One faithful canvas per context assembled from upstream data; business decisions as decisions; verification metrics; C4 context; quality attributes for the core. |
| 8 | `ddd-code` | `define`, `strategize`, `connect`, `organise`, `discover` | `08-code/<ctx>/design.md`, aggregate canvases, `implementation-plan.md`, `code.json` | Aggregates only where the pattern is a domain model; true invariants only; ports/adapters per context; module paths aligned to deployables; core-first vertical-slice plan; no source scaffolding unless asked. |
| 9 | `ddd-contracts` | `connect`, `define` (+ organise, decompose, discover, glossary) | `09-contracts/contracts.{json,md}`, `schemas/*.schema.json`, `examples/*.json` | One entry per cross-party message: payload schema, an example that validates against it, owners/consumers, delivery + idempotency, and the producer's business rules as `semantics`; external-system messages marked `inherited`. |

## What travels between steps

Only JSON travels. Each step reads its predecessor's `<step>.json`, the glossary, and every
`notes_for_downstream[]` entry in earlier artifacts whose `for` names it (language conflicts, fixed
process order, ownerless records, decisions already taken). `ddd validate --status` prints the notes
addressed to the next step, so the orchestrator can pass them into the step's prompt verbatim.
Prose in the Markdown artifacts is for humans and does not reach the next step.

## Gate commands

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate ddd --status          # table + next step (+ upstream notes; --no-notes to skip)
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate ddd --step <step>     # gate one hop
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate ddd --strict          # warnings fail too
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir ddd <step> skipped --note "…"
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs review ddd                     # rebuild ddd/review.html and ddd/diagrams/ on demand
```

Node 18 or newer runs all of them; there is nothing to install.

## Re-running

Re-run a step → its `produced_at` moves forward → `ddd validate` marks every later step `stale`
(it compares each step against the newest of all earlier steps) → run them again in order. Ids are
stable across re-runs (contract §7), so downstream artifacts usually need only small edits. A hand
edit must be followed by `ddd stamp <file>` or nothing goes stale. Every `ddd mark` rebuilds the
review page and the diagrams, so the page always shows the run as it is.
