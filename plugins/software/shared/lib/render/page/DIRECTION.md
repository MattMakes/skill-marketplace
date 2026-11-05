# Direction: the case file

Chosen with the `impeccable` skill (new-work flow, established world, surface concept seed
`b449a5a4`, mode `read`, assigned structure 3 of the grounded list below). PRODUCT.md beside
this file records the product truth the roll was grounded on; every fact in it is inferred from
the user's brief because no interview mechanism existed in the session.

Grounded structures, ordered by resonance: (1) annotated engineering report with a margin
column, (2) atlas of plates with tables as legends, (3) **case file / dossier**, (4)
architectural drawing sheet with a title block, (5) control-room status board, (6) ledger
triage sheet, (7) broadsheet. The roll assigned 3. The dealt challengers (obi-band sleeve,
Studio Dumbar bars, drawcord cape, iridescent cloud, cracktro queue, cutting bench) all
replace the visual identity, which is pinned by `core/palette.mjs`; none beat the dossier on
audience identification or product clarity for a design review, so none was fused.

## Thesis

A finished DDD run is a case: evidence (the JSON the steps wrote), exhibits (the things that
need a person), a verdict. The page is the file a reviewer opens, not a dashboard. It refuses
the category default (stat tiles, a card grid of coloured left borders, a table per section)
and reads top to bottom like a file: cover sheet, exhibit list, then the evidence chapters
with index tabs down the side.

## World (established, inherited from palette.mjs and explorersCss)

- Type: Iowan Old Style / Palatino for the cover headline, section titles, exhibit numbers and
  diagram captions; Avenir Next / Segoe UI for everything read at 14px; SF Mono / Menlo for
  ids, paths and file names only (never as a costume).
- Scale (fixed rem-ish px, ratio about 1.2): 12 / 13 / 14 / 16 / 19 / 24 / 32 / 44. Body is 14px
  at 1.5; ledes 14px muted, max 70ch; the verdict paragraph 19px in the serif.
- Colour strategy: restrained. Neutrals from THEME_VARS (`--bg --fg --muted --grid
  --node-stroke --tag-fill`), one working accent for links and focus (`--supporting` blue in
  light, the same var in dark), and the diagrams' semantic hues used only where they mean the
  same thing they mean in the diagrams: `--event` orange = stops the work / broken, `--core`
  amber = a guess or stale, `--store` green = passed, `--external` violet = a note for someone.
  Context colour only through `.ctx-<slot>` chips the explorers already draw.
- Spacing: 4px unit. Inside a group 4/8/12; between groups 16/24; between sections 64 with
  more space above a section title (48) than below it (12). One rhythm everywhere.
- Surfaces: no cards. A hairline (`1px var(--grid)`) between rows, a 1px rule under a section
  title, plates (diagrams) sit in a bordered frame on the page background. Depth only on the
  sticky header (an offset, blurred shadow when scrolled).

## Layout

- Wide (>= 1180px): a 176px index-tab column on the left (position sticky) listing the
  fourteen chapters with counts, the current one marked by an ink tab that sits flush against
  the content column; content column max 1180px. Narrow: the tabs become a horizontal strip
  under the header.
- Sticky header = the docket line: title in the serif, project / mode / made-on in the label
  face, the global finder, the theme toggle. Beneath it a one-line status strip in mono-sized
  label type: steps done / stale / pending, gates OK or FAIL, diagrams n, PNG yes or no with
  the Chrome note once when there is none.
- Cover sheet (`#verdict`): the headline count in 44px serif (the count of things in ink, the
  count that stops the work in the event hue), the verdict paragraph, then four facts as one
  running line between two hairlines (steps finished, checks, out of date, gate counts), the
  value in the serif and its label after it; never tiles.
- Exhibit list (`#worklist`): every item is a row: exhibit number in the serif (Exhibit 1, 2,
  ...), the kind as a small label inline after the title (never above it), the step, the
  detail, the "why this is on the list" line, the source path in mono and a link to the
  anchor. A thin coloured rule between the number and the text carries the kind hue (1px,
  vertical, so it reads as a file tab, not a card border); the exhibit numeral takes the
  same hue so the list can be scanned by colour from the margin. Filter buttons are segmented
  text buttons, the active one in ink.
- Chapters: every section, ours and the explorers', uses the explorers' `.x-head` (serif 24px
  title, lede, tools) so the page has one heading voice. Our own tables use `x-table`, our
  folds `x-fold`, our chips `x-chip`: the explorers' vocabulary is the page's vocabulary.
- Plates (`#diagrams`, and the inline plates in `#shape` and `#flows`): a figure whose
  caption is the drawing's own serif title (every diagram carries one), with a one-line
  mono caption above the frame (id, source step) and the links to the SVG and PNG files; the
  SVG at its natural size, never enlarged, up to the column; wide drawings (event storm,
  decision composites) in a horizontally scrollable frame with the runtime's pan/zoom and
  its Fit button; never squashed. A drawing already placed in `#shape` or `#flows` appears
  in `#diagrams` as a one-line reference, not a second copy.
- Decisions (`#decisions`, markup from the decisions explorer): restyled by the page CSS to
  the hairline system: a rule above each decision (2px in the event hue when it is open),
  options as hairline-separated columns without fill or radius, the chosen option marked by
  a 2px core-hued rule, the question first and its facts as a running line beneath it;
  option drawings at natural size in a scrollable frame. Recorded exception: decision ids
  are unique within a step, not across the run, and the explorer prints the bare id (two
  "D1" rows in the mealkit example); the step chip beside each id is the disambiguation,
  and the files and plate anchors qualify the later one as `<step>-<Did>`.

## Density and disclosure

Open by default: the cover, the exhibit list, the decisions, the shape tables, every plate,
the plain-words step summaries. Folded by default: the raw "everything else this step
recorded" JSON, every explorer's second level (the explorers already collapse to two levels),
canvases, flows' step tables (the plate above them is open). Search is global: every row that
matters carries `data-search-row` so the finder hides what does not match, in our sections and
the explorers' alike.

## Dark mode

Light by default (the page is read in daylight beside code; it is printed and screenshotted).
Dark is a toggle in the header and follows the OS scheme until the toggle is used; the choice
is kept in localStorage. Both themes come from the same variables the diagrams use, so a
context, a sticky and an arrow are the same colour in a plate and in a table row.

## What keeps it from looking generated

Index tabs instead of a top nav; exhibits numbered in the serif instead of numbered circles;
kind labels after the title, not above it; facts in a running line, not tiles; a serif
caption above every plate; one hairline system; no cards, no rounded coloured borders, no
icon set; the copy is review.py's plain, direct voice ("Do these first", "Check this was
heard"); the status strip reads like a docket, not a KPI bar.
