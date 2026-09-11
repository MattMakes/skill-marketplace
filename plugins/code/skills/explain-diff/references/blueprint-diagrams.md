# Blueprint diagrams in a diff explainer

Use Blueprint for architecture, sequences, workflows, data flow, lifecycle, and entity-relationship overviews when they make the change easier to understand. A prose-only or small UI change does not need a diagram quota.

## Find the installed skill

Invoke `code:blueprint`, or read `${CLAUDE_PLUGIN_ROOT}/skills/blueprint/SKILL.md`. Blueprint and explain-diff are both owned by the code plugin; in this marketplace the renderer lives at `plugins/code/skills/blueprint/`. Set `BLUEPRINT_SKILL_DIR` to that skill's actual absolute directory and use `"$BLUEPRINT_SKILL_DIR/bin/blueprint.mjs"`.

For a loose copy of explain-diff, discover an available Blueprint skill rather than assuming installed plugins share a cache directory. If Blueprint or Node is unavailable, use self-contained inline SVG/HTML figures with the same factual constraints and disclose that Blueprint validation was unavailable. Do not install a plugin automatically or copy the renderer into the consumer.

## Choose what to explain

| Evidence or teaching question | Figure |
|---|---|
| Service boundaries, dependencies, deployment structure | `architecture` |
| Request/response order, cache miss, async callback | `sequence` |
| Branches, approval gates, CI/CD, retry process | `workflow` |
| Payload transformations, event pipelines, lineage | `dataflow` |
| State changes, waits, cancellation, terminal outcomes | `lifecycle` |
| Tables, keys, schema migration, ORM relations | `architecture` relationship overview plus field tables; read Blueprint's `references/schema-diagrams.md` |

Read the diff and relevant surrounding code at both revisions. Pin a branch/PR explanation to its base and head commits; for a working-tree diff, identify the baseline and uncommitted state instead. Distinguish before, after, proposed, and illustrative facts. Include source paths and revision-aware citations near the figure; use verified source-link metadata only when Blueprint's evidence contract can actually be met.

Reuse stable IDs, labels, layout, scale, and preset for unchanged concepts. Put before and after in labeled figures. Blueprint also has `compare architecture <base.json> <head.json> <output.html> --json` for a real architecture delta; read its help/contract before using it and retain its receipt. Do not invent a `compare` command for other types or use story chapters to pretend topology changes. Added/removed facts do not establish runtime impact or migration safety.

Use Blueprint's visual-storytelling reference. Prefer `signal-flow` and finite trace motion for runtime walkthroughs; use still `blueprint`/`editorial` figures for schemas. Give complex walkthroughs a few named views tied to real node IDs. Keep toy data consistent between prose, diagrams, and quiz answers.

## Render, check, embed

1. Save typed JSON to `docs/diagrams/YYYY-MM-DD-<slug>/` (or the user's chosen artifact directory). Keep source JSON for future edits. Put temporary rendered HTML and visual-check sidecars in a scratch directory unless the user wants separate viewers.
2. Follow Blueprint's schema, showcase validation, `deliver`, and visual-review instructions. A failed delivery leaves the old HTML intact; never embed that stale file as the current change.
3. Write the article with an exact empty slot for each figure, using unique IDs:

   ```html
   <template data-blueprint="request-after"></template>
   ```

4. Embed each successfully delivered viewer using the bundled helper:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/explain-diff/scripts/embed-blueprint.mjs" \
     "docs/YYYY-MM-DD-explanation-example.html" request-after \
     "/absolute/scratch/request-after.html" "After: request through the cache"
   ```

   The helper replaces exactly one slot, atomically, with a `<figure>` containing an escaped `srcdoc` iframe. It includes the complete viewer, styles, scripts, and fonts; the final page needs no diagram sidecar or CDN. It preserves the delivered viewer bytes when `srcdoc` is decoded. A missing/duplicate slot or unreadable input leaves the article untouched. Rebuild the slot intentionally when replacing a figure; do not append duplicate viewers.

   The iframe isolates Blueprint's CSS, IDs, global runtime, and keyboard handlers from the article and other diagrams. Its sandbox allows scripts and downloads, without same-origin access to the article. Theme choice is local to each frame; browser-storage persistence, clipboard, external navigation, and some fullscreen/export actions may be restricted by the embedding browser. Do not promise the complete standalone viewer experience without checking those actions.

5. Add a takeaway in surrounding prose. Do not mark the figure, iframe, or its caption `data-tts`; mark a separate explanatory paragraph if it should be narrated. Run narration with `--inline` after all figures are embedded.
6. Inspect the assembled single HTML file in a browser. Verify all frames load offline, readable labels at actual frame width, theme and enabled playback controls, reduced motion, mobile containment, table of contents and quiz behavior. The article scrolls vertically; do not force it into Blueprint's standalone one-screen acceptance rule. Report any checks the environment prevented.

Use only trusted, freshly generated diagrams as helper input. Embedding is packaging, not diagram validation or a sanitizer for arbitrary third-party HTML.
