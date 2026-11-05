# Visual storytelling

Blueprint is derived from Archify and preserves the visual system and finite motion of [Archify](https://github.com/tt-a1i/archify). Prefer its renderer over hand-built lookalikes: the grid, semantic colors, typography, routed SVG edges, focus states, dark/light themes, and export cleanup already work together.

## Pick a treatment

| Purpose | Preset | Motion |
|---|---|---|
| Explain a request, pipeline, or runtime change | `signal-flow` | `trace`, with a short guided story when useful |
| Show architecture boundaries or entity relationships | `blueprint` | Still for structure; trace only for an actual runtime path |
| Support a prose-heavy article | `editorial` | Still unless playback teaches order |
| General-purpose map or existing neutral series | `classic` | Follow the task |

A useful animated explanation starts with metadata like this (the IDs must exist in the chosen schema's nodes/participants):

```json
{
  "title": "Request through the cache",
  "quality_profile": "showcase",
  "visual_preset": "signal-flow",
  "animation": "trace",
  "views": [
    { "id": "request", "label": "Read the request", "focus": ["browser", "api", "cache"], "note": "Follow the authored request path." }
  ]
}
```

See [cache-read.sequence.json](../examples/cache-read.sequence.json) for a compact, animated request walkthrough.

Use two or three chapters only if each teaches a distinct point. Chapter order is a reading order, not proof of a call, transaction, timing, or causality. A foreign-key relationship never becomes a message just because the viewer can trace it. For one small diagram, Live/Still alone may be enough.

Motion must be finite and reader-controlled, with complete meaning in Still, reduced-motion, print, and exported images. Do not add looping CSS pulses, autoplay, or a second animation engine. Retain the bundled fonts in generated HTML and exports so offline readers see the same typography.

## Compose around the explanation

- State one question per figure. Use a clear reading direction, a dominant path, and roughly 4–9 primary elements; split crowded maps before approaching the 12-node showcase ceiling.
- Keep example payloads small and factual: an order ID, a cache key, or one event. Put long fields and consequences in cards or nearby prose rather than on arrows.
- Use consistent IDs, positions, labels, viewBox, and preset for unchanged elements across before/after figures. Label revisions explicitly. Use separate validated snapshots when topology changes; guided views do not add or remove nodes.
- Use `variant: "emphasis"` only for a meaningful focal relationship. Semantic colors and dashed/security variants retain their actual meaning; do not turn them into an invented added/removed legend.
- Leave room around edges and label masks. Start with automatic routing, then use diagnostics to repair local geometry. Preserve significant labels and never hide overlap by shrinking text.
- Each figure needs a takeaway that says what the reader should notice. Avoid decorative nodes, invented services, redundant subtitles, or repeated conclusion cards.

## Review the real result

Run the skill's showcase validation, atomic delivery, and browser checks. Inspect the light and dark screenshots: label fit, route clearance, readable text at normal zoom, visual hierarchy, and balanced use of the canvas. For motion, also exercise Live/Still and any authored story, then check reduced motion. Screenshots of Still alone do not prove playback.

If embedded in an explainer, check that final frame at its actual width too. Give it enough height; don't flatten a desktop diagram into a narrow banner. The surrounding article may scroll. Use fewer nodes or separate focused diagrams if mobile text becomes unreadable; pan/zoom remains available for detail.

Derived from Archify; upstream comparison: `tt-a1i/archify` at `c1443b31b496eebf4a68bf83151816c955ddb796`. This update carries its embedded JetBrains Mono font block and export font handling, retaining the included SIL Open Font License. It is a focused visual update, not a claim of full upstream feature parity.
