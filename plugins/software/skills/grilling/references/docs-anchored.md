<!--
Docs-anchored mode, from grill-with-docs:
https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/grill-with-docs/skills/grill-with-docs
Interview rules derived from Matt Pocock's grill-with-docs
(https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs),
MIT License © 2026 Matt Pocock, reproduced under MIT. Validators, workflow and the
three citation references are Alireza Rezvani's wrapper, MIT.
-->

# Docs-anchored grilling

Grill the plan against the project's existing language (`CONTEXT.md`) and recorded
decisions (`docs/adr/`), and update both inline as terms and trade-offs crystallise.

## Domain awareness

During codebase exploration, also look for existing documentation:

### File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](ADR-FORMAT.md).

## Validators (stdlib-only)

The scripts live in `${CLAUDE_PLUGIN_ROOT}/skills/grilling/scripts/`; run them with `python3`
from the project root. Each also takes `--output json` and `--sample`.

| Tool | One-line role |
|---|---|
| `context_md_linter.py CONTEXT.md` | Validate `CONTEXT.md` against the CONTEXT-FORMAT.md structure. PASS/WARN/FAIL per rule. |
| `adr_scanner.py docs/adr/` | Walk `docs/adr/`, check `NNNN-slug.md` pattern, numbering integrity, body completeness. |
| `glossary_code_consistency.py --context CONTEXT.md --code src/` | Cross-reference bold terms in `CONTEXT.md` against codebase usage. Flag dead glossary + code-only common nouns. |

1. **Pre-flight (before the first round):** lint `CONTEXT.md` if it exists, scan `docs/adr/`
   if it exists, and run the glossary-vs-code check. Its dead-glossary terms and undefined
   code-only nouns become opening questions.
2. **During the session:** when a term is sharpened, edit `CONTEXT.md` at once and re-run the
   linter if the edit is structural. When an ADR is warranted, write it under `docs/adr/` and
   re-run the scanner to confirm numbering.
3. **Closing:** a final glossary-vs-code run confirms no new orphan terms; summarise terms
   added or refined, ADRs written, scenarios discussed and open items.

## Citations behind each rule

- [ubiquitous_language.md](ubiquitous_language.md) — why a glossary belongs in source control (Evans, Vernon, Khononov, Wlaschin, Brandolini, Avram & Marinescu, Fowler)
- [adr_practice.md](adr_practice.md) — when an ADR earns its keep (Nygard, Tyree & Akerman, Zimmermann Y-statements, MADR, ThoughtWorks Radar, adr-tools, Backstage)
- [context_md_as_artifact.md](context_md_as_artifact.md) — CONTEXT.md as living artifact (Khononov on language drift, Kernighan on naming, BoundedContext bliki, Confluent on data contracts, Brandolini on EventStorming glossary)
