# Visual and output design

Read this before producing or revising the interactive HTML, standalone SVG, or printable PDF. Read [detail-modes.md](detail-modes.md) first when the mode or paper size is not already settled.

## Match structure to the design question

Choose the smallest structure that makes the important relationships inspectable:

| Structure | Use it to show | Watch for |
| --- | --- | --- |
| Loop or directed flow | repeated actions, feedback, causes, and effects | unlabeled arrows and hidden exit conditions |
| State machine | allowed states, events, guards, and recovery | impossible transitions and state explosion |
| Dependency graph | prerequisites, parallel work, optional paths, convergence | cycles or lines that imply false dependencies |
| Spatial map | adjacency, travel, zones, encounters, and gates | proximity that has no rule meaning |
| Time or pacing map | phases, rhythm, duration, escalation, and reset | precise timing presented as confirmed without evidence |
| Storyboard | experiential or narrative sequence | missing choices and systemic consequences |
| Matrix | pairwise interactions or two-dimensional coverage | more dimensions than readers can compare |

Combine structures only when their shared alignment adds information, such as a route map over a pacing axis. If a model requires dense crossings, microscopic text, or misleading geometry, reconsider the scope or representation.

## Page anatomy

Include:

- title and a concise statement of the page's question or purpose;
- named scope and audience;
- date and revision;
- one dominant visual model with an obvious entry point;
- short callouts for rules and consequences that belong near the model;
- relationship labels that name actions, conditions, resources, or effects;
- a legend for shapes, line styles, abbreviations, and state cues;
- important assumptions, material open questions, and a playtest question.

Use whitespace and hierarchy to separate the main path from supporting detail. Encode only real meaning through position, distance, size, shape, color, and direction. Do not make an elegant arrangement imply rules that do not exist.

The PDF must be self-contained. Do not put necessary rules only in hover text, a selected-state panel, or script-generated content. An HTML detail panel can supplement the page on screen.

## HTML and interaction

Prefer a self-contained HTML file with inline CSS, JavaScript, and SVG. Avoid remote fonts, CDNs, trackers, network calls, or runtime services. Keep nodes, edges, labels, and values directly editable.

`../assets/diagram-shell.html` is an optional starter. It demonstrates inline SVG, related-node highlighting, a detail panel, keyboard activation, an accessible reset, and print-specific styles. Replace all fictional content. Change its topology to match the design.

For every interactive node:

- provide an accessible name and native control semantics or equivalent keyboard behavior;
- support pointer activation plus `Enter` and `Space` when the node acts like a button;
- show a visible focus indicator;
- expose selected state programmatically;
- make the same relationship available without relying on color alone.

Use text, line style, shape, weight, pattern, or explicit markers in addition to color. Ensure related highlighting does not hide the complete diagram from screen readers. Provide a clear reset, and consider `Escape` when it matches the interaction.

## Heavy standalone SVG

Use heavy SVG to make interacting systems, rules, and traces simultaneously inspectable on a static, directly editable canvas. Keep one dominant model rather than turning the page into an undifferentiated table of text. `../assets/detailed-diagram.svg` is an optional fictional starter; replace its semantics and topology.

Organize the source into meaningful `<g>` groups for the title and metadata, dominant model, each subsystem, edges, local rules, traces, legend, and open issues. Give important nodes, edges, resources, rules, and trace steps stable, descriptive IDs. Keep labels as SVG text and shapes as vectors. Use an accessible root `<title>` and `<desc>`, readable labels, and non-color cues such as line patterns, shapes, symbols, or explicit words.

The heavy page should make these elements easy to inspect:

- grouped subsystems with clear boundaries and named responsibilities;
- directional connectors labeled with actions, conditions, resources, or effects;
- local rule callouts with stable rule IDs, relevant quantities, guards, and outcomes;
- at least one normal trace and one failure/recovery trace tied to the same IDs used in the model;
- resource sources, sinks, conversions, storage, and gates that matter to the traces;
- material uncertainties and open decisions shown without presenting them as confirmed.

Use whitespace, routing lanes, connector bridges, or repeated local references to avoid ambiguous crossings. Place rule detail near the system it governs. Keep scenario callouts visually subordinate to the dominant model. A numeric trace should use concrete quantities when they are confirmed or clearly label proposed example values.

Heavy SVG is a static artifact. Do not add or promise the HTML selection panel, scripting, hover-only content, or keyboard selection. Ordinary viewer zoom is sufficient. Keep the file offline and self-contained: do not use scripts, `foreignObject`, external stylesheets, external resource references, CSS imports, or remote fonts.

## Print contract

In light HTML, declare one paper size in CSS and in the visible metadata. Default to A3 landscape:

```css
@page { size: A3 landscape; margin: 10mm; }
```

Produce exactly 1 PDF page per document. The printed page must retain the title, scope, audience, revision, date, complete main model, legend, core rules, assumptions, material open issues, and meaningful relationship labels. Hide controls that have no static meaning, and remove transient selection styling in print.

In heavy SVG, default to A2 landscape. Set `data-paper-size="A2"` on the root `<svg>` when declaring that choice, and show the same value in visible metadata. A1 or A0 landscape is available when justified by readable in-scope detail. A3 is also valid when a heavy design remains legible there. If neither CLI input nor root metadata declares a size, the exporter uses A2. If both declare a size, they must agree. Use a finite, positive-width and positive-height `viewBox`; the exporter fits the complete viewBox within the paper without cropping or changing its aspect ratio. The SVG canvas supplies its own safe margins because the export wrapper has zero margins.

Aim for 11-point or larger body text at the declared print size. Use 10-point text sparingly in dense tables. Judge type size from the actual PDF at 100% print scale rather than from SVG user units or browser zoom.

Simplify before shrinking type:

1. remove repeated prose;
2. shorten callouts and edge labels;
3. reduce the diagram to the named scope;
4. choose a clearer structure;
5. move supplementary detail to the design record;
6. use a larger named paper size or a separate scoped document only when justified.

Do not meet the one-page limit with unreadable type, clipped content, or flattened raster text.

## Export

Resolve `<SKILL_ROOT>` to the absolute directory containing this skill's `SKILL.md`. Substitute that value before running the optional exporter contract:

```sh
node "<SKILL_ROOT>/scripts/export_pdf.mjs" <input.html> \
  --output <output.pdf> \
  --preview <output.png>
```

For standalone SVG, pass the selected paper size when useful:

```sh
node "<SKILL_ROOT>/scripts/export_pdf.mjs" input.svg --output output.pdf --paper-size A2
```

SVG paper selection is explicit `--paper-size`, then root `data-paper-size`, then A2. When the first 2 are present, they must match. SVG export uses a zero-margin landscape wrapper and fits the complete viewBox on exactly 1 page. Keep the root namespace and a valid viewBox. The exporter rejects malformed XML, active content, external references, and inconsistent paper metadata rather than fetching or repairing them.

The script uses Playwright or `playwright-core` plus a compatible Chromium or Chrome browser. It does not install them. Use `--module-path <path>` or `PLAYWRIGHT_MODULE_PATH` for module discovery. Use `--browser-executable <path>` or `PLAYWRIGHT_BROWSER_EXECUTABLE` for the browser. It renders print media, honors CSS page size, prints backgrounds, and can save a PNG preview.

When that dependency is unavailable, use another local browser's print-to-PDF path. Keep CSS `@page` authoritative, disable headers and footers, use 100% scale, and record the alternate method.

## Review checklist

Inspect the live HTML and the rendered PDF, not only the source.

- A new reader can identify the purpose, entry point, main loop or path, and unresolved issues without narration.
- One normal sequence can be traced end to end.
- One relevant failure and recovery sequence can be traced end to end.
- Every important edge has a readable direction and relationship meaning.
- Resources and dependencies balance across the traced paths.
- Pointer and keyboard interactions select the same items and relationships.
- Focus and selected states remain visible without color.
- In heavy SVG, groups and stable IDs connect the model, local rules, resources, and traces.
- In heavy SVG, the root title and description are useful, and no meaning relies only on color.
- The printed document has exactly 1 page at the declared size.
- No title, node, label, connector, legend item, assumption, or open issue clips or overlaps.
- Text remains legible at 100% print size; SVG and line work remain sharp, vector-based, and directly editable.
- PDF text is extractable, geometry remains vector, and the page dimensions match the declared named paper in landscape orientation.
- A falsifiable playtest question is visible.

Apply interaction checks only to light HTML. Revise the selected editable source after a failed check, regenerate the PDF, and inspect again. A successful export alone does not prove readable or truthful design.
