# shared — contract, schemas, CLI and tests for the `ddd-*` skill chain

Not a skill itself. Every `ddd-*` skill reads from here so that the nine steps of the chain fit
together.

```
references/artifact-contract.md   the contract: workspace layout, manifest, every step's JSON shape, decisions[], cross-step rules
references/modes.md               facilitation protocol: interactive (draft → ask ≤4 questions → revise) vs auto (no questions, log assumptions)
                                  section 3b: dispatch `ddd-decision-strategist` (${CLAUDE_PLUGIN_ROOT}/agents/), record decisions[], draw the options
schemas/*.schema.json             JSON Schema (draft-07) for manifest + the 9 step artifacts; the blueprint skill's schemas for the export
bin/ddd.mjs                       the one CLI (below)
lib/                              workspace.mjs (index), jsonschema.mjs, manifest.mjs, validate.mjs, review.mjs,
                                  render/diagrams (generators + decision render), render/explorers, render/page, render/export (blueprint)
vendor/                           elkjs for layout
tests/                            node --test suites, the golden harness (tests/README.md) and the gate checks under tests/checks/
examples/mealkit/ddd/             a tiny but complete, valid chain (3 contexts, 2 deployables) with its review page, diagrams and decisions
```

Pipeline: `ddd-understand → ddd-discover → ddd-decompose → ddd-strategize → ddd-connect → ddd-organise → ddd-define → ddd-code → ddd-contracts`,
driven end-to-end by `ddd`.

## The CLI

Node.js 18 or newer, nothing to install. `ddd <cmd>` anywhere in this plugin means
`node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs <cmd>`.

```bash
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs --help                        # the command list; <cmd> --help for its flags
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate ddd --status         # where am I, what's next, upstream notes
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate ddd --step decompose # gate one step
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs validate ddd --strict         # CI-style
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs mark --dir ddd decompose done # record a status; rebuilds review.html and diagrams/
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs review ddd                    # rebuild ddd/review.html and ddd/diagrams/ on demand (--relayout for a fresh layout)
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs decision render ddd D1        # one decision's options side by side (ddd/diagrams/decisions/D1.svg + .png)
node ${CLAUDE_PLUGIN_ROOT}/shared/bin/ddd.mjs export blueprint ddd --deliver  # blueprint specs, and ddd/diagrams/final.html through the bundled blueprint skill
```

| Command | What it does |
|---|---|
| `init`, `mark`, `stamp` | create or update `manifest.json`; record a step's status (then refresh the page); set `produced_at` |
| `validate [dir] [--step] [--status] [--strict] [--json] [--no-notes]` | schemas, cross-step references, `decisions[]`, staleness; the gate between steps |
| `review [dir] [-o FILE] [--title] [--no-diagrams] [--relayout]` | the self-contained review page plus `diagrams/*.svg` (and `.png` when Chrome is found) |
| `<step> <verb>` | the step helpers: `understand lint`; `discover lint\|render\|glossary`; `decompose worksheet\|check`; `strategize worksheet\|lint\|render`; `connect inputs\|render`; `organise brief\|check\|mermaid`; `define prefill\|render`; `code prefill\|check`; `contracts prefill\|check\|render` |
| `decision render <dir> <Did\|step:Did> [--out] [--no-png]` | draw one decision's option diagrams side by side |
| `export blueprint <dir> [--out DIR] [--deliver] [--quality]` | write blueprint architecture and sequence specs; `--deliver` renders `final.html` through the bundled blueprint skill |

`DDD_NO_RENDER=1` makes `mark` skip the page rebuild (the golden harness uses it); `CHROME_PATH`
points at a Chrome or Chromium for PNG; `BLUEPRINT_HOME` points at a blueprint checkout.

## Exit codes

The rule: 0 ok, 1 a gate failed (or a `check`/lint found errors), 2 usage or IO problem; advisory
commands (worksheets, briefs, renders, lints) exit 0 with findings. The Node CLI was ported for
byte parity with the Python scripts it replaced and its behaviour is pinned by the recorded goldens
(`tests/goldens/`), so a few commands keep the exit code their Python twin had rather than the
rule. They are documented here instead of changed:

| Command | Exit 0 | Exit 1 | Exit 2 |
|---|---|---|---|
| `validate` | no errors | errors, or warnings with `--strict` | missing workspace, bad flag |
| `understand lint` | no rule errors (warnings allowed) | rule errors (the lint is a gate for its own rules) | missing workspace, bad flag |
| `discover lint` | always, even on an unreadable input (notes are advice) | never | bad flag |
| `strategize lint` | clean or warnings only | errors, or a missing / invalid `strategize.json` (pinned) | bad flag |
| `decompose check`, `organise check`, `connect render --check`, `code check`, `contracts check` | clean | findings (and `--strict` warnings); `contracts check` also when `contracts.json` is missing or corrupt: the gate ran and found the deliverable absent | missing workspace or upstream input, bad flag |
| `define prefill`, `define render` | ok | a render lint failure; also a missing workspace or missing `define.json` (the Python twin used `sys.exit("message")`; pinned) | bad flag |
| `organise brief`, `organise mermaid` | ok | a missing `organise.json` or a path that is not a directory (`sys.exit("message")`; pinned) | bad flag |
| `contracts prefill`, `contracts render` | ok | never | missing workspace, missing upstream input, `render` without `contracts.json` (compare `contracts check` above), bad flag |
| `strategize render`, worksheets, `connect inputs`, `code prefill` | ok | never | missing input, bad flag |
| `mark`, `init`, `stamp`, `review`, `decision render`, `export blueprint` | ok (a page or diagram render problem is reported on stderr with a `review:` prefix and does not change `mark`'s exit code) | `stamp` on an unreadable file | usage, missing workspace |

One more pinned surface detail: `contracts check --json` escapes non-ASCII characters (`—`),
as its Python twin did; every other writer keeps UTF-8.

## Known rough edges

Heuristics an end-to-end smoke run tripped over. None of them blocks a run; each has a cheap
workaround, and the step SKILL.md files point here where it matters.

- `ddd connect inputs` guesses each relationship's distance hint from words in upstream note text,
  so a note saying "not separate" reads as "separate". Override `integration_patterns[].assumed_distance`
  and record an assumption saying why.
- `ddd discover lint` decides past tense from an event name's last word: "Item Passed Inspection" is
  flagged as not reading as past tense. Keep the name; the note is advice, not a gate.
- `ddd define prefill` guesses `anticorruption-layer` for every external collaborator of a core
  context — a clock or an email gateway included, which are not models to protect against. Downgrade
  to `conformist` (or `customer-supplier`) by hand and keep the recorded assumption honest.
- `ddd code prefill --skeleton` may model a clock-triggered command as an inbound webhook (a
  `<Context>Callbacks` port with a `ClockWebhookHandler` adapter) and may leave a generic gateway port
  beside the purpose-named one you add. Fix both by hand, and check that `handoff.suggested_next`
  lists `ddd-contracts` — the skeleton has been seen to omit it.
- `ddd validate <ddd-dir> --step <step>` prints the full status table and every downstream notes block,
  not only the gated step. By design: the gate is the `validated <step>:` line; `--no-notes` drops the notes blocks (the table still prints).
- `ddd mark <step> done` does not run the step's deep check. Run `ddd contracts check`, `ddd code check`
  or `ddd define render --check-only` first — `ddd validate` alone will pass a `contracts.json` with a
  `TODO` still inside `semantics[]`.
- `ddd mark` rebuilds the review page and the diagrams on every call, so it is the slowest command in a
  step. That is also the cheap way to get pictures early: mark the step `draft` as soon as its JSON
  exists (every step SKILL.md says where), then `done` at the end.
