# Phase: agents-md (Phase 9)

## Goal

Generate `AGENTS.md` files for the pertinent folders of a repository — and **only where one is missing**.

`AGENTS.md` complements `README.md`. README is for humans; `AGENTS.md` is the project context a coding agent needs: exact build commands, how to run one test, the code style this repo actually uses, where things live, and what it must never touch. Agents look for it in the current directory and then walk up the tree, so nested files override the root.

`AGENTS.md` is **not** an agent persona file (`.github/agents/*.agent.md` and friends). Those describe who the agent is. This describes what the agent should know about this code.

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `repo_path` | Yes | - | Absolute repository path |
| `output_dir` | No | `docs/wiki` | Documentation output directory — referenced in the Documentation section |
| `folders` | No | auto-detected | Explicit list of folders to process; overrides detection |

## Outputs

| Path | Description |
|------|-------------|
| `{folder}/AGENTS.md` | Agent instructions for that folder — written only if absent |
| `{folder}/CLAUDE.md` | Companion pointer to `AGENTS.md` — written only if absent |

## Critical Guard: Only Generate If Missing

> **This is the single most important rule in this phase.**

**NEVER overwrite an existing `AGENTS.md`.** An existing one may have been carefully hand-written; silently replacing it destroys real work.

Before touching ANY folder:

```bash
ls "{folder}/AGENTS.md" 2>/dev/null
```

- Exists → **skip it**. Report: `AGENTS.md already exists at {folder} — skipping`.
- Does not exist → generate.

The check runs **independently for every folder**, and independently for the `CLAUDE.md` companion. This is non-negotiable.

## Workflow

### 1. Identify Pertinent Folders

**Always generate for**

- Repository root (`./`)
- `{output_dir}/` — the generated wiki, if it exists

**Generate if present**

- `src/`, `lib/`, `app/`, `api/`, `tests/`, `test/`
- Monorepo units: `packages/*/`, `apps/*/`, `services/*/`
- Any folder with its own build manifest: `package.json`, `pyproject.toml`, `Cargo.toml`, `*.csproj` / `*.fsproj`, `go.mod`, `pom.xml`, `build.gradle`, `Makefile`
- `.github/` — only if it holds workflows or actions

**Always skip**

- `node_modules/`, `.git/`, `dist/`, `build/`, `out/`, `target/`, `vendor/`, `.venv/`, `venv/`, `__pycache__/`
- Any generated-output or third-party-dependency directory
- Folders with fewer than 3 source files, unless they carry their own build manifest

### 2. Analyze Each Folder

For each folder that survives step 1, gather evidence — never guess:

1. **Language & framework**, with versions.
2. **Build commands** — read the folder's build manifest and take the *real* script/target names from it. Cross-check against CI (`.github/workflows/*.yml`, `Jenkinsfile`, `.gitlab-ci.yml`), which is where the commands that actually have to pass are written down.
3. **Test commands** — the framework, how to run everything, how to run a single file, how to run a single test by name, how to get coverage.
4. **Entry points** — main/index files, app bootstrap.
5. **Conventions** — read 3–5 real source files and note naming patterns, import ordering, error-handling style, module layout.
6. **Existing docs** — read the folder's `README.md` so the `AGENTS.md` complements it instead of duplicating it.

### 3. Compose the AGENTS.md

Every good `AGENTS.md` covers six core areas — but only the ones that genuinely apply. A 20-line file with real commands beats a 200-line file of filler.

#### a) Build & Run — put this FIRST

Agents reference these constantly. Exact commands with flags, not tool names.

```markdown
## Build & Run

make install        # Install dependencies
make dev            # Start dev server (port 3000)
make build          # Production build
make lint           # Run the linter
```

#### b) Testing

```markdown
## Testing

pytest tests/ -v                    # Run all tests
pytest tests/test_auth.py -v        # Run a single file
pytest -k "test_login" -v           # Run a single test by name
pytest --cov=src --cov-report=term  # With coverage
```

State the framework, how it's configured, and what's expected before a commit ("all tests must pass").

#### c) Project Structure

```markdown
## Project Structure

src/
├── api/          # FastAPI route handlers
├── models/       # Pydantic data models
├── services/     # Business logic
└── utils/        # Shared utilities

tests/            # Mirrors src/ structure
```

Name the key directories, the entry points, and where a new feature is supposed to go.

#### d) Code Style

One real code example beats three paragraphs of description. Pull the example from *this* project.

````markdown
## Code Style

- snake_case for functions and variables
- PascalCase for classes
- Type hints on every function signature
- async/await for I/O

### Example

```python
async def get_user_by_id(user_id: str) -> User:
    """Fetch a user by their unique identifier."""
    async with get_db_session() as session:
        return await session.get(User, user_id)
```
````

#### e) Git Workflow

```markdown
## Git Workflow

- Branch naming: `feature/`, `fix/`, `chore/`
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`)
- Run tests and the linter before committing
- PR titles follow conventional commit format
```

Include this **only** where the repo shows evidence of the convention — a commitlint config, a PR template, a contributing guide. Otherwise omit the section.

#### f) Boundaries

Three tiers, tailored to what this project can actually break:

```markdown
## Boundaries

- ✅ **Always do:** Run tests before committing. Write tests for new features. Use type hints.
- ⚠️ **Ask first:** Adding dependencies. Changing database schemas. Modifying CI configs. Changing public API signatures.
- 🚫 **Never do:** Commit secrets or credentials. Modify `vendor/`. Push directly to `main`. Delete migration files.
```

Backend: schema changes, API contracts. Frontend: breaking component APIs, design-system changes. Infrastructure: production configs, IAM permissions.

#### Template

```markdown
# [Folder Name] — Agent Instructions

## Overview
[1-2 sentences: what this folder does and its role in the larger system]

## Build & Run
[Exact commands — install, dev, build, clean]

## Testing
[Framework, run-all, run-one, coverage]

## Project Structure
[Key directories, entry points, where new features go]

## Code Style
[Naming conventions + one real code example from this project]

## Git Workflow
[Branch naming, PR format, pre-commit checks — only if the repo has conventions]

## Boundaries
- ✅ **Always do:** [safe operations]
- ⚠️ **Ask first:** [operations needing confirmation]
- 🚫 **Never do:** [hard rules]

## Documentation
[Only if the wiki, llms.txt, or docs/ exist]
- Wiki: `{output_dir}/` — architecture, API, onboarding guides
- LLM context: `llms.txt` — project summary for coding agents (full version: `{output_dir}/llms-full.txt`)
- Onboarding: `{output_dir}/onboarding/` — guides for contributors, staff engineers, executives, PMs
```

Omit any section that does not apply. If the folder has no tests, there is no Testing section.

### 4. Root vs Nested vs Wiki

**Root `AGENTS.md`** covers the whole project: tech stack and versions, global conventions, dev environment setup, repository-wide boundaries, CI overview, links to key docs.

**Nested `AGENTS.md`** (e.g. `tests/AGENTS.md`, `packages/foo/AGENTS.md`) covers only that folder: what it does, its own commands, its own conventions. It must NOT repeat root-level content — agents read the nearest file, and nested files take precedence, so they should carry folder-specific detail and nothing else.

**Wiki `AGENTS.md`** (`{output_dir}/AGENTS.md`) — same only-if-missing guard. Adapt this to the real project:

```markdown
# Wiki — Agent Instructions

## Overview
Generated documentation for this project: architecture pages, onboarding guides, and API reference, with line-level source citations and dark-mode Mermaid diagrams.

## Wiki Structure
- `toc.json` — the table of contents. Every page and section is defined here; pages are generated from it.
- `index.md` — landing page with project overview and navigation
- `{NN}_{section}.md` — numbered documentation pages
- `onboarding/` — audience-tailored guides (contributor, staff engineer, executive, product manager)
- `llms-full.txt` — LLM-friendly full content (inlined pages)
- `_reports/` — validation reports and SUMMARY.md
- `_context/` — collected repo context; regenerated, not hand-edited

## Validation
Diagrams are linted by a pure-stdlib Python script — no external dependencies:

python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_mermaid.py --input . --invalid-only

## Content Conventions
- All Mermaid diagrams use dark-mode colors (node fills `#2d333b`, borders `#6d5dfc`, text `#e6edf3`; subgraph backgrounds `#161b22`, borders `#30363d`, lines `#8b949e`)
- Every page carries its `PAGE_ID` marker; every generated section is wrapped in `AUTOGEN` markers
- Citations link to the source repository with real line numbers — never invented ones
- Tables include a "Source" column with linked citations
- Every Mermaid diagram is followed by a `<!-- Sources: ... -->` comment block

## Boundaries
- ✅ **Always do:** Add pages through `toc.json`, follow the existing section numbering, use dark-mode Mermaid colors, cite real line numbers
- ⚠️ **Ask first:** Restructure sections, change the TOC schema, rewrite generated pages by hand
- 🚫 **Never do:** Delete generated pages without checking what links to them, use light-mode diagram colors, remove citation links, invent line numbers

## Documentation
- Wiki: `./` — this folder is the wiki
- LLM context: `llms.txt` (repo root) — quick summary; `llms-full.txt` — full content
- Onboarding: `onboarding/` — four audience-tailored guides
```

### 5. Generate the CLAUDE.md Companion

Wherever you write an `AGENTS.md`, also write a `CLAUDE.md` in the same folder — **only if `CLAUDE.md` does not already exist**. This redirects Claude Code (and anything else that looks for `CLAUDE.md`) to the authoritative instructions.

The content is always exactly:

```markdown
# CLAUDE.md

<!-- Generated for repository development workflows. Do not edit directly. -->

Before beginning work in this repository, read `AGENTS.md` and follow all scoped AGENTS guidance.
```

### 6. Validate Before Writing

For each file, confirm:

- [ ] Every command names a real script, target, or tool found in a config file
- [ ] Every path references a directory or file that exists
- [ ] The code example is copied from this project, not invented
- [ ] No placeholder text — no `<your-project>`, no `TODO`
- [ ] No section invented for something the project doesn't have
- [ ] No secrets, credentials, API keys, or tokens anywhere in the file

### 7. Report

```markdown
## AGENTS.md Generation Report

### Created
- `./AGENTS.md` — Root project instructions
- `./CLAUDE.md` — Companion pointer to AGENTS.md
- `tests/AGENTS.md` — Test harness instructions
- `tests/CLAUDE.md` — Companion pointer to AGENTS.md

### Skipped (already exist)
- `src/AGENTS.md` — already exists
- `src/CLAUDE.md` — already exists

### Not applicable
- `dist/` — generated output
```

## Quality Bar

| Principle | Good | Bad |
|-----------|------|-----|
| **Specific** | "React 18 with TypeScript, Vite, Tailwind CSS" | "React project" |
| **Executable** | `pytest tests/ -v --tb=short` | "run the tests" |
| **Grounded** | A real code snippet from this repo | The style described in the abstract |
| **Real paths** | `src/api/routes/` | `path/to/your/code/` |
| **Honest** | No tests → no Testing section | An invented Testing section |
| **Concise** | 30–80 lines for most folders | 300+ lines of prose |

## Anti-Patterns

- ❌ **Overwriting an existing `AGENTS.md`** — the cardinal sin of this phase
- ❌ **"You are a helpful coding assistant"** — describes feelings, not actions
- ❌ **Generic boilerplate** — content that would fit any repo tells an agent nothing
- ❌ **Invented commands or paths** — every one must reference something real
- ❌ **Duplicating README.md** — `AGENTS.md` complements it
- ❌ **Including secrets** — never put credentials, keys, or tokens in these files
- ❌ **Padding empty sections** — no tests means no testing section
- ❌ **Describing what agents should "think" or "feel"** — describe what they should DO
