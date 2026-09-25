---
name: one-page-design
description: >-
  Use when a game concept, system or brief needs a Librande-style one-page design: a single
  dated sheet with a title, central illustration, callouts, sidebar and description that a team
  can read past the first screen. Trigger on: "make a one-pager", "one-page design", "design doc
  on one page", or when `game-brief` needs its companion sheet. Produces a JSON spec, then
  renders it to a dated SVG with `scripts/render_one_page.py` and checks it with
  `scripts/validate_one_page.py`.
---

# One-Page Design

Stone Librande's method (GDC 2010, "One-Page Designs"): a single sheet people want to hang on
their wall, not a wiki page or a design bible nobody reads past the first screen. See
`references/librande-one-page.md` for the distilled talk.

This skill never hand-writes SVG or ASCII art. It writes a **JSON spec** that matches
`references/one-page-spec.md`, then calls the renderer. Headless-safe: no AskUserQuestion, Task,
TodoWrite, Skill tool or WebFetch. If information is missing, infer a reasonable value and state
the assumption in your reply — never stop to ask.

## Method (follow in order)

1. **Title test.** Write the title first. It must state why the page exists. If you cannot fill
   it in, stop and rethink the design — do not proceed with a placeholder title.
2. **Date.** Every spec carries `date` in `YYYY-MM-DD` (today's date, or the date given). Without
   a date nobody knows which version is current.
3. **Pick tier 1 / 2 / 3 information.** Tier 1 is the title, purpose, central illustration and the
   2-4 most important callouts. Tier 2 is the sidebar and description. Tier 3 is the detail notes.
   Cut anything that would only fit below about 4-point type — the renderer enforces a hard floor
   of 8 px and refuses smaller. If content does not fit, that means "redesign", not "shrink the
   font".
4. **Whitespace.** Do not fill every callout slot just because a slot exists. A sparse page reads
   faster than a dense one. Prefer 3-6 callouts over 10.
5. **Central illustration.** One `central.caption` describing the single image that carries the
   design's core idea. Set `central.image_slot: true`; the renderer draws a placeholder box unless
   the caller passes `--key-art`.
6. **Callouts around the center.** Each callout is `{label, text, tier, anchor}`, anchor one of
   `n|ne|e|se|s|sw|w|nw`. Assign tier 1 to what a reader must see in 5 seconds, tier 2 to what
   they see on a second look, tier 3 to detail notes only.
7. **Detail illustration + notes.** One secondary image slot (`detail.caption`) with 1-4 short
   `detail.notes[]` — the specifics a producer or artist needs but a first-time reader does not.
8. **Sidebar.** 3-8 short bullet points: the facts that do not fit in a callout (platform, scope,
   session length, comparable games).
9. **Description.** 1-3 sentences of prose: the pitch, in the designer's own words.
10. **Audience layering.** Tier 1 must stand alone for an executive skimming for 5 seconds. Tiers
    1+2 must serve a teammate reading for a minute. All tiers serve the person building the
    feature. Check each tier answers its audience before rendering.
11. **The time element.** If the design has a session or run length, state it — in the
    description, a callout, or the sidebar. A one-pager with no sense of time is incomplete.
12. **Vector, not raster.** The deliverable is SVG, never a raster mockup. Key art is embedded as
    a `data:` URI inside the SVG, not drawn by hand.

## Producing the spec

Write the spec as JSON matching `references/one-page-spec.md`. Save it as `<slug>.json` next to
where the SVG will live (the caller decides the path; this skill does not fix one).

## Rendering

```
python3 <skill-dir>/scripts/render_one_page.py <spec.json> -o <out.svg> [--key-art <path-to-png>]
```

`<skill-dir>` is this skill's own directory — use a path relative to it, never a path outside the
plugin. The renderer is Python 3 stdlib only and deterministic: the same spec (and the same
`--key-art` file, or none) always produces byte-identical output.

## Validating

```
python3 <skill-dir>/scripts/validate_one_page.py <out.svg>
```

Exit 0 means valid. A non-zero exit prints one reason per line on stderr. Always validate before
calling the design done. If validation fails, fix the spec and re-render — never hand-edit the
SVG.

## "Doesn't fit" is a signal

If the renderer's placeholder or wrapping looks cramped, or validation flags a sub-8px font, the
design is too dense. Cut a tier-3 item or merge two callouts. Never ask the renderer to shrink
text below the floor.
