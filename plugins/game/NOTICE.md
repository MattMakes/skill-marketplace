# Third-party notices

Skills in this plugin are first-party unless a row below says otherwise. A row records where a
skill's content came from when it was written elsewhere in this repository or adapted from
upstream work; the Author column names the copyright holder.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `one-page-game-design` (headless pipeline mode, from `one-page-design`) | First-party: this repository's `game-design` plugin, `skills/one-page-design` | `0938179` (2026-11-05) | MIT (plugin license) | Matt Scott. The method distils Stone Librande, "One-Page Designs", GDC 2010 (cited, not copied). |

## Changes made here

- `one-page-design` folded into `one-page-game-design` as its headless pipeline mode on
  2026-11-05. Its method, rendering, validation and "doesn't fit" rules became
  `references/headless-pipeline.md`; `librande-one-page.md`, `one-page-spec.md`, the three
  renderer and validator scripts, the `tests/` folder and `evals/evals.json` moved in unchanged
  apart from wording that now says "headless mode" and eval prompts that name the merged skill and
  mode. Dropped: the standalone frontmatter and skill name; nothing from the method was dropped.
