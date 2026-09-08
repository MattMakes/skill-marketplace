---
name: deepwiki
description: Generate, validate and maintain wiki-style documentation for any codebase, with line-level source citations and validated Mermaid diagrams. Use when documenting a new project, updating docs after code changes, designing or refining a wiki TOC, building an onboarding guide, generating AGENTS.md or llms.txt, producing a changelog, researching or answering a question about an unfamiliar codebase, or publishing docs as a VitePress site.
---

# DeepWiki

Generates DeepWiki-style documentation for a codebase: a designed table of contents,
evidence-based pages where every claim cites `file:line`, and Mermaid diagrams that
are actually checked for syntax errors before they ship.

**Your response MUST be written in the language given by the locale code (default: `en-US`).**

## Zero dependencies

Everything here runs on a stock Python 3 install. There is no `mermaid-cli`/`mmdc`,
no Node, no npm, no PyYAML, nothing to `pip install`.

Mermaid is rendered natively by GitHub, GitLab, VitePress and most Markdown viewers,
so no local tool is needed to *draw* a diagram — the consumer draws it. The only
thing worth doing locally is checking a diagram parses, and
`scripts/validate_mermaid.py` does that in pure Python.

The one exception is the optional VitePress site build, which is inherently an npm
tool. Core generation and validation never need it.

## Workflow phases

| Phase | Phase_id | Spec | Purpose |
|-------|----------|------|---------|
| 1 | `repo-scan` | `references/workflow/repo-scan.md` | Scan the repository to build context for TOC design |
| 2 | `toc-design` | `references/workflow/toc-design.md` | Design the TOC structure (`toc.json`) |
| 3 | `doc-write` | `references/workflow/doc-write.md` | Generate the documentation pages |
| 4 | `validate-docs` | `references/workflow/validate-docs.md` | Validate diagrams and structure |
| 5 | `doc-summary` | `references/workflow/doc-summary.md` | Generate the `SUMMARY.md` report |
| 6 | `incremental-sync` | `references/workflow/incremental-sync.md` | Detect TOC and source changes since last run |

### Execution modes

| Mode | Phases | When |
|------|--------|------|
| **Automatic** | 1 → 2 → 3 → 4 → 5 | Full pipeline for new documentation |
| **Structure-only** | 1 → 2 | Produce the TOC only, stop before writing pages |
| **TOC-based** | 3 → 4 → 5 | Generate pages from an existing `toc.json` |
| **Incremental** | 6 → 3 → 4 → 5 | Update pages after code changes (the CI path) |

Run the chosen mode to completion. Do not stop to ask for confirmation mid-pipeline.

## Optional phases

Run these only when the user asks for them. Each is self-contained and assumes the
core wiki already exists.

| Ask | Spec | Produces |
|-----|------|----------|
| Onboarding / getting-started guides | `references/workflow/onboarding.md` | `onboarding/` — four guides (Contributor, Staff Engineer, Executive, PM) |
| "Make the docs LLM-friendly" / llms.txt | `references/workflow/llms-txt.md` | `llms.txt` at repo root, `llms-full.txt` |
| AGENTS.md for coding agents | `references/workflow/agents-md.md` | `AGENTS.md` per folder — **only where missing** |
| "What changed?" / changelog | `references/workflow/changelog.md` | Categorised changelog from git history |
| Deep research, or a question about the repo | `references/workflow/research-qa.md` | Evidence-based answer or research report |
| Build/publish a browsable site | `references/workflow/vitepress-build.md` | VitePress dark-theme site (**needs npm**) |

## Policies

Read the relevant policy before writing anything — they are the rules the validator
enforces, so violating them means rework.

| Policy | Read before |
|--------|-------------|
| `references/evidence_citation_policy.md` | Writing any page. Every claim cites `file:line`; never invent a line number |
| `references/mermaid_policy.md` | Authoring any diagram. Quote node labels; dark-mode colours; 3–5 diagrams per page |
| `references/page_template.md` | Writing any page. AUTOGEN markers, TL;DR, table-driven structure |
| `references/toc_schema.md` | Designing or editing `toc.json` |
| `references/validation_policy.md` | Fixing anything the validators flag |
| `references/doc_update_policy.md` | Any incremental update |

## Scripts

All are pure stdlib. Run with `python3`. They live in `${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/`; `${CLAUDE_PLUGIN_ROOT}` is the code plugin's install directory, which Claude Code sets while a plugin skill runs (for a loose copy, use the directory containing this SKILL.md).

| Script | Purpose |
|--------|---------|
| `scripts/collect_context.py` | Scan the repo into a context pack |
| `scripts/read_files.py` | Load specific files on demand, with line numbers for citation |
| `scripts/validate_mermaid.py` | Lint Mermaid diagrams. Exit 1 if any are invalid |
| `scripts/validate_docs_structure.py` | Check pages/sections/markers against `toc.json` |
| `scripts/generate_summary.py` | Build the `SUMMARY.md` coverage report |
| `scripts/collect_git_diff.py` | Diff since the last documented commit |
| `scripts/collect_sync_context.py` | Context for an incremental sync |
| `scripts/collect_update_context.py` | Context for updating specific sections |
| `scripts/get_section_update_diff.py` | Narrow a diff to one section |
| `scripts/toc_io.py` | Load `toc.json`; convert a legacy `toc.yaml` |

The TOC is `toc.json`. To migrate an old one:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/toc_io.py --convert docs/wiki/toc.yaml   # -> toc.json
```

## Validation is a gate, not a suggestion

`validate_mermaid.py` exits `1` when a diagram will not parse, so phase 4 can gate a
build. A diagram that fails is **not** shipped — fix it and re-run. Use `--strict` to
also fail on policy warnings (unquoted labels, light-mode fills, missing
`autonumber`).

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_mermaid.py --input docs/wiki --invalid-only \
    --output docs/wiki/_reports/mermaid_invalid.json
```

Each invalid block reports `error_type`, `error_line` and a `fix_hint`. Apply the
hint, then re-run until clean.

## Parallel page generation

When subagents are available, phase 3 (`doc-write`) should generate pages in
parallel — one subagent per page from `toc.json`, run in the **foreground**. Wait for
all of them before starting phase 4. If one fails, re-dispatch just that page.

Every subagent must be given the page's `page_id`, the `repo_path`, the `output_dir`,
the `toc_file`, and the `language`, and must be told to read
`references/evidence_citation_policy.md` and `references/mermaid_policy.md` before
writing.
