# Finish review (gate G6)

Reviewer: `impeccable-finish-reviewer`, spawned fresh with the request, DIRECTION.md, PRODUCT.md,
the craft-floor reference and 1440-wide light and dark renders of
`plugins/ddd/shared/examples/mealkit/ddd/review.html` cut into 2400px tiles
(`/tmp/ddd-review-shots/{light,dark}-N.png`). Round 1 disposition: **fix**.

Mechanical detector (`impeccable/scripts/detect.mjs`) on the built page: two `side-tab`
warnings, both inside `explorersCss()` (`.x-ctx-node` 3px left border, `.x-flag` 3px left
border), i.e. lib/render/explorers, not the page's own CSS. Left as is: the explorers are
owned by leaf 1.2.3; the page's CSS carries no coloured border wider than 2px.

## Round 1: the reviewer's ordered fixes and what was done

1. Decisions section (rounded orange frame, filled option panels, chip row above the
   question, duplicate "D1"). The markup is the decisions explorer's (not owned here), so the
   page CSS, which loads last, restyles it: a hairline above each decision (2px event-hued
   when open), options as hairline-separated columns with no fill or radius, chosen marked by
   a 2px core-hued rule, the question moved first (`order:-1`) with its facts as a running
   line beneath. **Done** (css.mjs "decisions explorer" block; cited in DIRECTION.md). The
   duplicate "D1" is text the explorer prints; the step chip beside it disambiguates.
   **Left**: the id text cannot be changed from CSS and the explorer is not this leaf's.
2. Cover facts as label-over-value tiles. **Done**: one running line between two hairlines,
   value in the serif, label after it; DIRECTION.md now says four facts, matching the body
   contract.
3. Plate scaling (`width:100%` upscaled small drawings). **Done**: `width:auto;max-width:100%`.
4. Two caption treatments. **Done**: DIRECTION.md cites the drawing's own serif title as the
   caption; the page's caption line is the mono id plus file links everywhere; the reference
   rows in `#diagrams` use the label face, not the serif.
5. Both cover numerals in event orange. **Done**: the count of things is ink, only the count
   that stops the work takes the event hue (green when nothing stops it).
6. Generated-reading copy. **Done**: "1 word means", "1 guess · 1 open question"; glossary
   meanings that are only punctuation (the mealkit glossary literally contains "….") render
   as a muted "no definition recorded".
7. Decision composite plates: void under the drawing, dotted grid. **Left with reason**: the
   frame already fits the SVG's own height; the void and the dotted canvas are inside the
   composite SVG (lib/render/diagrams/decision.mjs, leaf 1.2.2), reported upstream.
8. Unicode arrows as icons ("see it ↗", "↑ drawn in"). **Done**: plain link text.

Unreviewed in round 1 (reviewer's note): the mobile capture was not a true 390px render
(headless Chrome enforces a minimum window width, so shot.mjs cropped a wider render). A
true 390px viewport was checked with Playwright (/tmp/ddd-review-shots/mobile-390-*.png): no
horizontal overflow (document scrollWidth = 390), the docket wraps, tabs become a strip, the
cover headline drops to 34px.

## Round 2: verdict pass

A fresh `impeccable-finish-reviewer` (no shared transcript) scored the recapture. Its table:

| # | Fix | Score | What was done after the verdict |
|---|-----|-------|---------------------------------|
| 1 | Decisions restyle | partial: restyle resolved; both decisions still print "D1" | Recorded exception in DIRECTION.md: ids are unique per step, the explorer prints the bare id, the step chip beside it disambiguates; files and plate anchors qualify the later one as `<step>-D1` (review.mjs `decisionFileName`). The explorer's text is leaf 1.2.3's. |
| 2 | Cover facts running line | resolved | Regression it found at 390px (a separator stranded at a line edge) fixed: the separator now lives inside its fact span, which is nowrap. |
| 3 | Plate scaling | partial: option plates inside the decision cards still stretched to the column | Fixed: `.x-opt-fig` is a scrollable frame, its SVG at natural size with the runtime's Fit button (css.mjs decisions block); rendered and looked at, option drawings are legible again. |
| 4 | Captions | resolved | |
| 5 | Cover numerals | resolved | |
| 6 | Copy | resolved | |
| 7 | Composite void / dotted canvas | unresolved | Left with reason: both are drawn inside the composite SVG by lib/render/diagrams/decision.mjs (leaf 1.2.2); the page frame already fits the SVG's height. Reported to the driver for 1.2.2. |
| 8 | Arrow glyphs | resolved | |

Reviewer disposition after round 2: **fix** (items 1, 3, 7 and the 390px regression open at scoring
time). Items 3 and the regression were then fixed and recaptured (light-1 tile, mobile-390-top);
item 1 is recorded as an exception; item 7 is upstream. Two rounds is the budget of an unattended
run, so the review stops here with those two dispositions on the table rather than a pass.

Final renders: /tmp/ddd-review-shots/light-1..7.png, /tmp/ddd-review-shots/dark-1..7.png (1440 wide),
/tmp/ddd-review-shots/mobile-390-top.png and mobile-390-decisions.png (true 390px viewport).
