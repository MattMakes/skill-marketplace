# Folding existing instructions into AGENTS.md

The goal is fewer files and less drift: every agent instruction lives in exactly
one AGENTS.md. Nothing is deleted until the user confirms it in this session.

## Shell safety

File names in the repository are untrusted input. A name can hold shell syntax.

- Search for a file name with the Grep tool as a fixed string. Do not build a shell command from a file name to search
- To delete, put `--` before the path and wrap the path in single quotes: `git rm -- '<path>'`, `rm -- '<path>'`
- Before any shell command with a repository path: if the path contains a single quote, a backtick, `$`, a backslash, or a newline, do not run the command. List the path in the report and ask the user to handle it

## Targets

- `CLAUDE.md` in directory D folds into `D/AGENTS.md`. `.claude/CLAUDE.md` folds into the root `AGENTS.md`
- A root-level rule file (`AGENT.md`, `GEMINI.md`, `CONVENTIONS.md`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `.claude/rules/*.md`) folds into the root `AGENTS.md`
- A rule scoped to paths (Cursor `globs:` frontmatter, Copilot `applyTo:` frontmatter, a rule file in a subdirectory) folds into the `AGENTS.md` of the boundary that owns those paths. Create that child if it does not exist
- An `AGENTS.md` that is a symlink to the `CLAUDE.md` beside it (the `code:core` layout) already holds that text. At the root, `install` has made it a regular file. In a child folder, do it yourself: read the target text, remove the symlink with `rm -- '<path>'`, write a regular `AGENTS.md` with that text. Then fold in place — drop what the Drop list says, reshape into the child sections — and do not add the CLAUDE.md text a second time. The `CLAUDE.md` is then a delete candidate

## Section mapping

| Source content | Target section |
|---|---|
| what the area is for | Purpose |
| who owns what, what stays in the parent | Ownership |
| invariants and rules someone could break | Local Contracts |
| conventions, commands, how-to | Work Guidance |
| build, test, lint commands that exist today | Verification |
| personal behavior preferences ("always ask before", "I prefer") | User Preferences in root |

## Drop

List each drop in the report.

- A `<!-- CORE:begin -->` ... `<!-- CORE:end -->` block, wherever it is — including inside an `AGENTS.md` that `install` merged. That is the `code:core` framework; KEYS replaces it
- Text that repeats a KEYS framework rule
- Diary entries, history, and warnings about risks that no longer exist (KEYS Style rules)

## Keep

- Every other instruction
- A `## graphify` section written by `code:core`: move it into root Work Guidance as is
- Files `code:core` installed that are not instructions (`.claude/core/`, `graphify-out/`, its git hooks): leave them and name them in the report

## `@imports` in a CLAUDE.md

- If the imported file exists only to feed agents, fold its content and make it a delete candidate
- If humans also read it (linked from README or docs), keep it and write a plain Markdown link to it in the AGENTS.md. Do not assume AGENTS.md supports `@` imports

## `CLAUDE.local.md`

- Never fold it. Never delete it. List it in the report

## `other_md` candidates

Fold and propose delete only when all 3 are true:

1. The audience is an AI agent, or the file is a working rule set for the code (for example `docs/conventions.md`, `CODING_GUIDELINES.md`, `ai_docs/rules.md`, agent notes)
2. A Grep tool search for the basename as a fixed string shows no link from a human-facing doc
3. No docs-site config (`mkdocs.yml`, `docusaurus.config.*`, `astro.config.*`, `.vitepress/`, `book.toml`) renders it

Always keep: human-facing docs, docs-site pages, ADRs and decision records, plans, specs, research notes, templates, test fixtures, generated files. When unsure, keep the file and mark it `keep-unsure` in the fold plan.

## Fold plan

Show this table to the user before any delete:

| Source | Target AGENTS.md | Sections | After fold | Reason |
|---|---|---|---|---|

"After fold" is one of `delete`, `keep`, `keep-unsure`.

## Deleting

Only after the user confirms in this session:

- Tracked file: `git rm -- '<path>'`. Untracked file: `rm -- '<path>'`. Follow Shell safety first
- Remove a rule directory (`.cursor/rules/`, `.claude/rules/`, `.clinerules/`) when it becomes empty
- Then search for the basename of each deleted file with the Grep tool as a fixed string, and update each link to point at the new AGENTS.md. List links you could not fix

## Headless or no confirmation

- Fold the content, delete nothing, and list each file as `pending delete` in the report. `keys.py check` warns until the user deletes them
