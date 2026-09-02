# Coverage summary — template for the orchestrator's final message

```
DDD COVERAGE SUMMARY — <project title>  (workspace: <absolute ddd-dir>, mode: <mode>, depth: <depth>)

Steps
  01 understand   done   2 open Q   ddd/01-understand/understand.md
  02 discover     done   4 open Q   ddd/02-discover/event-storm.md          (31 events, 3 pivotal, 5 hotspots)
  03 decompose    done   1 open Q   ddd/03-decompose/subdomains.md          (5 contexts, 6 relationships)
  04 strategize   done   0 open Q   ddd/04-strategize/core-domain-chart.md  (core: ordering; generic: billing → buy)
  05 connect      done   2 open Q   ddd/05-connect/message-flows.md         (4 flows, 11 messages, 2 coupling concerns)
  06 organise     done   0 open Q   ddd/06-organise/team-topology.md        (1 team, 2 deployables — target 1–3 ✔)
  07 define       done   3 open Q   ddd/07-define/<ctx>/bounded-context-canvas.md ×5, system-context.md
  08 code         draft  1 open Q   ddd/08-code/implementation-plan.md      (2 aggregates in ordering)
  09 contracts    done   0 open Q   ddd/09-contracts/contracts.md           (11 contracts: 9 published, 2 inherited from external systems; 3 in-process calls need no contract)
  glossary                          ddd/glossary.md (18 terms, 3 with context-specific meanings)

Review page (opens in any browser, no server)
  ddd/review.html                   rebuilt by every ddd mark; verdict, worklist, decisions, diagrams, domain, stores, every artifact
  ddd/diagrams/                     9 SVG (context-map, core-domain-chart, flow-F1 …), 9 PNG   [or: PNG skipped, no Chrome found]
  ddd/diagrams/final.html           blueprint final render (present when the blueprint skill is installed; specs final.architecture.json, final-<flow>.sequence.json always)

Validation: OK — 0 errors, 3 warnings   (ddd validate)
  [decompose] event 'refund-issued' not owned by any bounded context
  …

Blocking open questions (answer these first)
  [discover Q2] Can an order be split across warehouses?
  …

Review order (highest cost of being wrong first)
  1. ddd/glossary.md — do the words match how the business talks?
  2. 03-decompose — are the boundaries right? (everything downstream depends on them)
  3. 04-strategize — is the core really the core? build/buy decisions
  4. 06-organise — deployable count and reasons for each split
  5. 07-define canvases — business decisions and verification metrics
  6. 08-code — invariants and aggregate sizes
  7. 09-contracts — payload fields, required-ness and the semantics rules consumers will rely on

Next
  Implement: hand ddd/08-code/implementation-plan.md (with ddd/09-contracts/contracts.md as the message spec) to superpowers:writing-plans (or dev-create-plan), then TDD per slice.
  Or continue the design: /ddd-<next step>   |   re-run a step: "run ddd from <step>"
```

Keep counts real (read them from the JSON), quote blocking questions verbatim, and give absolute
paths at least once so the message stands alone.

Where each count comes from:
- events / pivotal / hotspots / scenarios → `discover.json` (`events`, `pivotal_events`, `hotspots`, `scenarios`)
- contexts / relationships → `decompose.json` (`bounded_contexts`, `relationships`); core → `strategize.json` `core_domains`
- flows / messages / coupling concerns → `connect.json`; teams / deployables / target → `organise.json` + manifest `scale_target`
- canvases / quality attributes → `define.json`; aggregates → `code.json` `contexts[].aggregates`
- contracts → `contracts.json` `entries[]` (split published vs `inherited: true`). Also report the
  in-process count from `ddd contracts check` — messages organise keeps inside one deployable get no
  wire contract, and a reader who is not told will read the gap as missing work rather than a decision
- glossary: "N shared terms" = `discover.json` `glossary[]`; "M with context-specific meanings" = shared terms the
  define renderer flagged "meaning differs by context" in `glossary.md`; add "K coined later" from any
  `coined_terms[]` on later steps
- open questions → each step's `open_questions[]`; blocking = `blocking: true`
- review page and diagrams → `ddd review <ddd-dir>` prints what it wrote (`review: N svg, M png …`, with a note
  when no Chrome was found); list `review.html`, `diagrams/` and, when present, `diagrams/final.html` from
  `ddd export blueprint <ddd-dir> --deliver`. Decisions still open → each step's `decisions[]` without `chosen`;
  they lead the page's worklist, so say how many there are
- the review order ("what costs most if wrong") → each step's `plain_words.riskiest`. That line is
  the step's own answer to the question, already in plain language, so quote it rather than writing
  a new one; a step with no `plain_words` goes to the top of the list, because nobody has said what its risk is


When every step is `done` (no `next:` line), the "Next" block reads:
```
Next
  All 9 steps done. Implement: hand ddd/08-code/implementation-plan.md to superpowers:writing-plans (or dev-create-plan), then TDD per slice.
  Change a design decision: "run ddd from <step>" — every later step is re-run (they are stale by definition).
```
