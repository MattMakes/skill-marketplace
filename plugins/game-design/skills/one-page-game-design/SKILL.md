---
name: one-page-game-design
description: Collaboratively develop or walk through a game or game system, then create a one-page visual design as interactive HTML or detailed standalone SVG with a printable PDF. Use for game-design discovery, system relationship diagrams, and one-page design documents; do not use for ordinary game implementation, generic PDF tasks, or summary-only requests.
---

# One-page Game Design

Turn the user's current idea into a design that another person can trace, question, and revise. Use light interactive HTML for a sparse or simple design and standalone SVG for a detailed design with interacting systems. Both modes produce exactly 1 printable PDF page and a living design record. A focused system page is valid when the audience or question needs it.

## Start from what exists

Inspect the user's brief, notes, prototypes, and earlier design record before asking questions. Establish:

- the intended player experience and concrete player actions;
- the page's audience, scope, and main question;
- output location, paper size, and any existing visual language.

Select the detail mode early. Reuse an explicit user preference for HTML or SVG. Otherwise infer the mode from the design's current needs without asking a redundant format question: sparse early ideas usually start in light HTML, while multiple interacting systems, substantial branches, cross-system dependencies, resource conversions, rule tables, or scenario callouts favor heavy SVG. Do not decide from a rigid element-count threshold. Read [detail-modes.md](references/detail-modes.md) for selection tradeoffs, examples, record fields, and format-switch revisions.

Reuse known answers. Never turn an inference, attractive diagram, or research claim into a user commitment. Mark information as confirmed, proposed, open, or not applicable.

Ask a few consequential questions at a time. Offer concrete options and explain their tradeoffs. Follow actual dependencies: explore goals and feedback before balancing numbers, but do not force every project through a fixed questionnaire. Read [design-coverage.md](references/design-coverage.md) when deciding what matters for this design.

## Keep a working model visible

Create a rough relationship model early. It can contain explicit unknowns. Walk through one concrete play sequence, including player input, system response, feedback, and consequence. Then test a relevant failure and recovery path. Use discoveries to revise both the model and the design record.

Keep a lightweight design record beside the outputs. Read [facilitation.md](references/facilitation.md) for its structure, question pacing, contradictions, resumption, and revision practice.

When core rules conflict or remain undecided, call the result a draft. Show the conflict or branches instead of silently choosing one.

## Choose the visual structure

Select a structure that tells the truth about the dominant relationship: loop, state machine, dependency graph, spatial or time map, storyboard, matrix, or a deliberate combination. Do not reduce the page to decorative text cards.

Read [visual-design.md](references/visual-design.md) before producing HTML, SVG, or PDF. It defines page anatomy, accessibility, mode-specific construction, print requirements, and validation. In light mode, `assets/diagram-shell.html` is an optional self-contained HTML/SVG starter for interaction and print mechanics. In heavy mode, `assets/detailed-diagram.svg` is an optional standalone SVG starter. Replace each starter's fictional content and topology rather than treating it as a template for every game.

## Produce and validate the artifacts

Keep these together under a user-chosen or sensible project output directory:

- the selected editable source: self-contained HTML with inline SVG in light mode, or self-contained standalone SVG in heavy mode;
- a printable PDF containing the complete design on exactly 1 named-size page;
- the living design record.

The HTML detail panel may add information, but the print view must stand alone. In light mode, give pointer and keyboard users equivalent selection and highlighting. Heavy SVG is static and supports ordinary viewer zoom; do not promise HTML interaction. In both modes, do not use color as the only state cue.

Validate before calling the design final:

1. Trace one representative play sequence from input through feedback and consequence.
2. Trace one relevant failure and recovery path.
3. Check resource flows, dependencies, conditions, and relationship labels for consistency.
4. State at least one useful, falsifiable playtest question.
5. In light mode, exercise HTML interaction with pointer and keyboard, including reset behavior.
6. In heavy mode, check stable IDs, grouped subsystems, editable text and vectors, and static accessibility.
7. Render and inspect the actual PDF for exactly 1 page, declared paper size, readable type, clipping, labels, and meaningful connectors.

Resolve `<SKILL_ROOT>` to the absolute directory containing this `SKILL.md`. Substitute that value before running executable examples. If the optional exporter dependencies are available, run:

```sh
node "<SKILL_ROOT>/scripts/export_pdf.mjs" <input.html> --output <output.pdf> --preview <output.png>
```

For standalone SVG, use its declared paper size or pass the same value explicitly:

```sh
node "<SKILL_ROOT>/scripts/export_pdf.mjs" input.svg --output output.pdf --paper-size A2
```

The exporter does not install Playwright or a browser. Use `--module-path` and `--browser-executable` when automatic discovery does not match the environment. If it is unavailable, use another local browser print path and record the method and limits. Simplify content or structure before shrinking text; use a larger named paper size or a separate scoped page only with a clear reason.

Consult [sources.md](references/sources.md) only when provenance or the historical basis matters. The workflow works without network access.
