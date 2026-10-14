# Relay Orchard example

Relay Orchard is a fictional solo game used to exercise detailed design and revision. Its six systems connect daily action points, travel, energy, orchard resources, trade, and observatory repairs.

Start with [the design request](heavy-request.md), then read [the revision request](heavy-revision-request.md). The revision changes starting energy from 6 to 3 and charger yield from 2 to 3. Other confirmed rules stay the same.

- [Version 1 diagram](v1/relay-orchard.svg), [design record](v1/design-record.yaml), and [calculated walkthroughs](v1/verification.md).
- [Version 2 diagram](v2/relay-orchard.svg), [design record](v2/design-record.yaml), and [calculated walkthroughs](v2/verification.md).

Each diagram uses A2 landscape and shows normal play, an energy-shortage recovery, and unresolved design decisions. Artifact paths in the records are relative to this example directory.

The repository's browser-validation workflow exports both diagrams to one-page vector PDFs and uploads the PDFs with rendered previews. PDFs are generated outputs and are not committed here. To produce one locally, use the skill's `scripts/export_pdf.mjs` with the chosen SVG and an output PDF path; the same Playwright and Chromium prerequisites apply.
