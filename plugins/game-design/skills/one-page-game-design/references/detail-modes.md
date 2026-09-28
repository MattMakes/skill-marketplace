# Detail modes

Use this guide when selecting a source format, recording that choice, or revising a design whose detail needs changed. Choose from the design's needs and the user's explicit preference. The formats do not determine depth by themselves: HTML already embeds SVG, while standalone SVG provides a larger, directly editable static canvas for the heavy workflow.

## Select a mode

An explicit user request for HTML or SVG takes precedence. Otherwise select the mode early from the current material and state the reason. Do not ask a format question when the brief already makes the answer clear, and do not use a node-count threshold as the decision.

Choose **light HTML** when the design is sparse, early, or centered on one modest loop, path, or state model. It is also the better choice when selectable nodes, related-node highlighting, keyboard operation, or an on-screen detail panel improves the walkthrough. Light mode produces:

- an editable, self-contained HTML file with inline SVG and no network dependencies;
- exactly 1 self-contained PDF page, normally A3 landscape;
- the living design record.

Choose **heavy SVG** when the page must expose several interacting systems or substantial detail at once. Signals include cross-system dependencies, branching state or progression, multiple resource conversions, local rule tables, normal and failure scenarios, or quantities and conditions that must remain visible together. Heavy mode produces:

- an editable, self-contained standalone SVG with text as text and geometry as vectors;
- exactly 1 vector PDF page, normally A2 landscape;
- the living design record.

A1 or A0 landscape is available for heavy mode when the information is in scope but A2 cannot keep it readable. Enlarge the paper before reducing ordinary body text below 11 points. Use 10-point text only sparingly in dense tables. Split the scope into a separate page only when the design question genuinely requires another page, and state why.

Heavy mode is static. Ordinary SVG viewer zoom is available, but the HTML selection panel and keyboard interaction are not. Prefer light mode when those interactions matter more than simultaneous printed detail.

## Examples

- A first conversation about choosing a route, spending fuel, and reaching a destination starts in light HTML. One loop, one failure path, and a few open questions fit the A3 page and benefit from selectable explanations.
- A settled delivery design connects weather, vehicle damage, cargo contracts, island trust, upgrades, and recovery jobs. Its resource conversions, conditional routes, rule callouts, and two traces favor heavy SVG on A2.
- A user explicitly requests editable SVG for a simple combat loop. Use heavy SVG because the format preference is explicit, but keep the content proportional to the simple design.
- A user explicitly requests interactive HTML for a complex economy. Use light HTML, preserve printable completeness, and propose a narrower page scope or larger paper if readability requires it.

These are diagnostic examples, not fixed templates. A design can move between modes as its scope and purpose change.

## Record the choice

Add a format block to the living design record. Preserve the same status boundaries used for rules and decisions; a selected format does not confirm unresolved game design.

```yaml
format:
  mode: heavy-svg
  status: confirmed
  reason: "The page must show weather, damage, contracts, trust, and recovery dependencies together."
  scope: "One delivery loop and its cross-system consequences"
  paper_size: A2
  source_artifact: "beaconfall-delivery.svg"
  pdf_artifact: "beaconfall-delivery.pdf"
  selected_at_revision: "0.3"
  revisions:
    - revision: "0.3"
      date: "2026-09-27"
      from: light-html
      to: heavy-svg
      reason: "The confirmed economy and recovery rules no longer fit legibly on A3."
      preserved_ids: [D-01, E-03, T-01]
```

Use `light-html` or `heavy-svg` for `mode`. Record the actual reason, named scope, paper size, source artifact, PDF artifact, and selection revision. Use `status: proposed` when the mode still needs the user's decision, and do not invent a confirmed preference. Append a revision entry only when the mode or paper size changes; do not rewrite earlier choices as if they never existed.

For standalone SVG, declare the selected paper on the root element:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5940 4200" data-paper-size="A2">
```

The paper selection order is explicit `--paper-size`, then root `data-paper-size`, then A2. If the command and root metadata both specify a size, they must agree. A3, A2, A1, and A0 are valid SVG sizes, and SVG export is always landscape.

## Revise or switch formats

Revisit the mode after a scope change, a major rule revision, or evidence that the current page cannot remain both complete and readable. When switching:

1. Read the existing record and source before changing the format.
2. Preserve confirmed rules, stable node, edge, rule, resource, decision, and test IDs.
3. Preserve proposed, open, and not-applicable statuses without promoting them.
4. Record the old mode, new mode, reason, paper, revision, date, and preserved IDs.
5. Rebuild the visual structure for the selected mode instead of mechanically wrapping or unwrapping the old source.
6. Re-run the normal and failure/recovery traces against the revised source.
7. Export and inspect the new PDF at its actual declared print size.

Keep prior artifacts when they provide useful revision history, or clearly mark which files the new revision supersedes. Attribute historical claims to their sources. A format change must not erase provenance, convert a proposal into a decision, or make a research claim appear to be the user's choice.
