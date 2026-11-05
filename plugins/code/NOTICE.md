# Third-party notices

The skills below are vendored copies of upstream skills. Each keeps its upstream license;
the Author column names the copyright holder as the upstream LICENSE file states it.

`why` comes from the `pstack` plugin in [cursor/plugins](https://github.com/cursor/plugins) by Lauren Tan, at commit `9d76bca` (2026-10-11), under
its own MIT license, reproduced beside this file as `LICENSE-pstack.txt`.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `why` | [cursor/plugins pstack/skills/why](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/why) | `9d76bca` | MIT | Lauren Tan |
| `code-tour` | [affaan-m/ECC — skills/code-tour](https://github.com/affaan-m/ECC/tree/2d515e4/skills/code-tour) | `2d515e4` (2026-10-10) | MIT | Affaan Mustafa |
| `deepwiki` (Brownfield mode only: `references/workflow/brownfield-doc.md`) | [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) — the `document-project` task, via the `dev:document-project` skill | not recorded | MIT (repo LICENSE) | BMad Code, LLC |
| `codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder` (agents) | [humanlayer/humanlayer — .claude/agents/](https://github.com/humanlayer/humanlayer) (`codebase-locator.md`, `codebase-analyzer.md`, `codebase-pattern-finder.md`) | not recorded | Apache-2.0 | HumanLayer |

`explain-diff` is adapted from [Geoffrey Litt's explain-diff gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524):
the four-section structure, the Kleppmann-style writing brief and the interactive quiz are his; the
quiz-fairness rule comes from the gist's discussion thread. The graph layer of `core` is
[graphify](https://github.com/Graphify-Labs/graphify) (PyPI `graphifyy`), installed and run as-is,
not vendored.

## Changes made here
- `codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder`: moved here from the `dev`
  plugin in the v3 taxonomy (2026-11-05). Each file keeps its `<!-- Source: HumanLayer ... -->`
  comment; the HumanLayer credit previously lived only there and in the dev README's Credits line.
- `why`: model-rule paragraph and `generalPurpose`/`readonly: false` spawn mode rewritten for the
  Task tool (`sonnet` investigators, `opus` synthesizer, full tool set); MCP discovery now reads
  the session's `mcp__*` tools and `claude mcp list` instead of Cursor's `mcps/` directory; the
  `how` companion mention and the description's "Use how" became plain prose. References untouched.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `code-tour`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `deepwiki`: `dev:document-project` folded in as the Brownfield mode on 2026-11-05. Its scope
  question (PRD, feature description, or document everything), its "map the reality" analysis
  (actual patterns, debt, workarounds, constraints, impact analysis) and its QA checklist moved to
  `references/workflow/brownfield-doc.md`; deepwiki's `file:line` citation and Mermaid
  validation policies now apply to it. Dropped: the long verbatim prompt to the user, the
  separate elicitation round after deep analysis, and "apply the advanced elicitation task after
  major sections" (`product:advanced-elicitation` remains available on its own).
- `core`: `dev:prime` folded in as quick mode on 2026-11-05 (`references/quick-prime.md`): the
  per-project-type file lists, the 15–20 file cap and the 500-line rule. Dropped: the test-folder
  globs, which contradicted prime's own "skip tests" rule, and the Next.js `public/` and `styles/`
  globs. Added a Go row, which the dev README listed but the skill lacked.
- `core`: on 2026-11-05 the CORE layer (CLAUDE.md contracts with AGENTS.md symlinks) was removed
  in favour of `agentic:keys`. Removed `core.py link`, `block` and `index`, the symlink health
  check, the vendored `.claude/core/core.py` copy, `assets/CORE-root.md`, `assets/CORE-child.md`
  and `references/original.md` (keys carries the same framework text). Added
  `core.py graphify-block`, which moves graphify's `CLAUDE.md` section into a
  `<!-- GRAPHIFY:begin -->` block of the root AGENTS.md; `status.sh` now reports the AGENTS.md
  tree and a `GRAPH_ONLY` verdict when agentic is not installed.
- `contract-first`, `code-tour`: the `metadata.origin` key was dropped (credited here instead);
  related-skill lists repointed at `architecture:api-design-principles` and `dev:tdd`
  or reduced to plain prose (`api-design`, `ai-regression-testing`, `backend-patterns`,
  `frontend-patterns`, `tdd-workflow`, `documentation-lookup`, `codebase-onboarding`,
  `coding-standards`, `council`).
  v3 taxonomy (2026-11-05): this note covers several skills. In this plugin: `code-tour`. Moved: `contract-first` to `architecture`.
