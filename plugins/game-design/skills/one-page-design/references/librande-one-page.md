# Librande's one-page design method

Source: Stone Librande, "One-Page Designs", GDC 2010 (52-minute talk, slides and transcript).

## Why one page

Most people don't read past the first page or screen. Design bibles are thorough but don't scale
and go stale the moment they're printed. Wikis are easy to update but hide design relationships,
need constant maintenance, and force everything into a small viewport. The goal is a design people
want to hang on their wall — like the programmer who pinned up his own flowchart, unasked.

## Inspirations

- Architectural drawings: one sheet serves several audiences.
- LEGO instructions: no words at all.
- Exploded engine cutaways: the relationships are the content.
- Kids' placemats: dense, but pleasant to explore.
- Minard's chart of Napoleon's march: space, time and quantity together on one sheet.

## The template

- **Title** — states why the page exists. "If you can't fill in the title, stop."
- **Date** — on every version. Without it, nobody knows which is current.
- **Whitespace** — never blow the design-bible text up into a poster.
- **A main illustration** in the center.
- **Callouts** around it.
- **A detail illustration** plus **notes**.
- **A sidebar** of bullet points.
- **A description**.

## Diagram vocabulary (see `design-diagrams` for the full catalog)

- Flowchart first: every game has an engine loop (player action → system response → feedback →
  next decision).
- A storyboard of the whole game with timing marks — works for executives and marketing alike.
- Time plus space (the Minard/Spore technique): challenge rising across a continent, time and
  brain-level on the bottom axis. Decide the game's length up front, not after the fact.
- A level "musical score": every waypoint, monster, AI type and expected player level, in order.
- Relationships between units: put factions on the *sides* of a triangle, not the corners —
  rock-paper-scissors becomes tunable sliders and gains design space.
- Matrix design, top-down: pick the axes first, fill the grid like a crossword.
- Relationships between modules: the whole game on one map, connections drawn in.

## Failure is a signal

"If you can't make it into a one-page design, the design is too complex or you're thinking about
it wrong." In Spore's consequence system, a four-dimensional table (256 combinations) collapsed
into a vector sum with about 36 real outcomes once the right shape was found. The pretty
"dreamcatcher" circle was the wrong metaphor — it folded the fan and put opposites next to each
other. Keep redrawing until the true shape shows.

## Subtractive art

Decide tier 1, tier 2 and tier 3 information. If something only fits below roughly 4-point type,
cut it — this skill's renderer enforces an 8 px floor. Everything drawn needs a reason to be
there; nothing decorative for its own sake. "Doesn't fit" means redesign, not shrink.

## Working documents

Take rough black-and-white versions into meetings, hand out pencils, get people to write on them.
The scribbled copy is the win. Iterate until it's stable, then "put it on the wall".

## Vector, not raster

Librande used Illustrator rather than Photoshop so the design stays agile to edit and prints
sharp. For this skill that means SVG, produced from a JSON spec, never hand-drawn.

## Audience layering

- Tier 1 alone serves an executive skimming for 5 seconds.
- Tiers 1+2 serve a teammate reading for a minute.
- All tiers serve the person who has to build the feature.

## Benefits

For the team: designs are easy to share and actually get seen. For the designer: a one-pager
forces complete understanding and concise design, shows the relationships, and helps solve
problems. "The goal of design is to efficiently communicate ideas. People will read your
designs."
