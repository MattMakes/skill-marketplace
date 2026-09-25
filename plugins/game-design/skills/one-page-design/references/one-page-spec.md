# One-page design JSON spec

Input to `scripts/render_one_page.py`. All fields are plain JSON — strings, arrays, objects.

## Fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | string | Why the page exists. The title test: if you can't fill this in, stop. |
| `purpose` | yes | string | One sentence: why the page exists, in prose. |
| `date` | yes | string | `YYYY-MM-DD`. |
| `version` | no | string | Free text, e.g. `"0.1"`. |
| `central` | no | object | `{caption, image_slot}`. `image_slot: true` reserves the center image area. |
| `callouts` | no | array | Each `{label, text, tier, anchor}`. `tier` is `1`, `2` or `3`. `anchor` is one of `n, ne, e, se, s, sw, w, nw`. |
| `detail` | no | object | `{caption, notes: [string, ...]}`. |
| `sidebar` | no | array of string | Short bullet points. |
| `description` | no | string | 1-3 sentences of prose. |
| `footer` | no | string | Free text, e.g. attribution or a short URL. |

## Rendering rules the spec must satisfy

- Tier 1 callouts render at the largest font size; tier 3 at the smallest, never below 8 px.
- Text wraps to its box width using a simple character-width estimate — keep callout `text` and
  sidebar bullets short (under ~120 characters) so wrapping stays legible.
- `&`, `<`, `>` and other XML-significant characters in any string are escaped automatically by
  the renderer; write them plain in the spec.
- Missing `central.image_slot` art (no `--key-art`, or a `--key-art` path that does not exist)
  renders as a labeled placeholder box, never an error.

## Minimal example

```json
{
  "title": "Ember Garden — one-page design",
  "purpose": "Show how a player tends a fire that slowly spreads light across a dark garden.",
  "date": "2026-09-24",
  "central": { "caption": "The garden at midpoint, half lit", "image_slot": true },
  "callouts": [
    { "label": "Core verb", "text": "Feed the fire to push back the dark.", "tier": 1, "anchor": "n" },
    { "label": "Fun target", "text": "Sensation: the fire's crackle and glow.", "tier": 1, "anchor": "e" }
  ],
  "sidebar": ["Solo dev, 4-week prototype", "Mobile, portrait", "Session: 5-10 minutes"],
  "description": "A short, cozy game about tending a single fire that reveals a garden."
}
```

## Full example

```json
{
  "title": "Ember Garden — one-page design",
  "purpose": "Show how a player tends a fire that slowly spreads light across a dark garden.",
  "date": "2026-09-24",
  "version": "0.2",
  "central": { "caption": "The garden at midpoint, half lit by the fire", "image_slot": true },
  "callouts": [
    { "label": "Core verb", "text": "Feed the fire to push back the dark.", "tier": 1, "anchor": "n" },
    { "label": "Fun target", "text": "Sensation: the fire's crackle and glow.", "tier": 1, "anchor": "e" },
    { "label": "Loop", "text": "Gather fuel, feed fire, light reveals new fuel.", "tier": 2, "anchor": "se" },
    { "label": "Risk", "text": "Fuel-gathering could feel like a chore if paced wrong.", "tier": 2, "anchor": "sw" },
    { "label": "Scope note", "text": "One garden, one fire, no combat.", "tier": 3, "anchor": "w" }
  ],
  "detail": {
    "caption": "Fire-feeding interaction, close up",
    "notes": ["Tap fuel to carry it.", "Drop fuel near the fire to feed it.", "Fire dims over time without fuel."]
  },
  "sidebar": [
    "Solo dev, 4-week prototype",
    "Mobile, portrait",
    "Session: 5-10 minutes",
    "Comparable: Journey, Alto's Odyssey (mood, not mechanics)"
  ],
  "description": "A short, cozy game about tending a single fire that reveals a garden, one patch of light at a time.",
  "footer": "Ember Garden v0.2 — 2026-09-24"
}
```
