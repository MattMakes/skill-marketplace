# Phase: brownfield-doc (Mode)

Adapted from BMAD-METHOD's `document-project` task (see the plugin `NOTICE.md`).

## Goal

Write **one** architecture document for an existing codebase, aimed at the AI agents who will
change it next. It records the system as it **is**, not as it should be: the patterns actually
used, where the business logic lives, the integration points, the technical debt, the
workarounds and the constraints an agent must respect.

Pick this mode over the wiki pipeline when the reader is an agent about to do a piece of work
and needs a single map, not a browsable multi-page site. When a PRD or feature description
exists, the document narrows to the areas that feature touches and adds an impact analysis.

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `repo_path` | Yes | - | Absolute repository root path |
| `name` | No | repo name | File name for the document |
| `output_dir` | No | `ai_docs/docs` | Where the document goes |
| `focus` | No | asked | A PRD, epic, feature description, or `everything` |

## Outputs

| Path | Description |
|------|-------------|
| `{output_dir}/{name}.md` | The brownfield architecture document |

## Step 1: Settle the scope (the one question this mode asks)

Look for a PRD or requirements document in context first.

- **PRD or feature description present** → note which modules, services or areas it affects,
  and document **only** those. Skip unrelated parts to keep the document lean.
- **Nothing present** → ask once, offering:
  1. Write a brownfield PRD first (then focus on it).
  2. Share an existing requirements doc, epic or feature description.
  3. Describe the planned work in a sentence ("adding payment processing to the user service",
     "refactoring the auth module", "integrating a new third-party API").
  4. Document everything (warn that on a large project this produces a document too long to
     be useful).

Options 1–3 set `focus`. Option 4, or no answer in a headless run, means `everything`.

In the same message you may ask what matters most to an agent here: the areas people find
hardest, the tasks agents will do (fixes, features, refactors, tests), the tribal knowledge
nobody wrote down, the known debt, and which parts change most often. Do not ask anything the
code or the manifests can answer.

After this step, run to completion without further confirmation.

## Step 2: Map the reality

Use the `repo-scan` tooling (`scripts/collect_context.py`, `scripts/read_files.py`) rather than
sweeping directories. If `code:core` has built `graphify-out/`, query it for hubs and paths
first.

1. **Structure** — top-level layout and what each main folder holds.
2. **Stack** — languages, frameworks and pinned versions from the manifests.
3. **Build and run** — build scripts, CI/CD config, dev and test commands that exist today.
4. **Existing docs** — READMEs, `docs/`, AGENTS.md; reference them instead of restating them.
5. **Entry points and key logic** — main files, app initialisers, where the business rules live.
6. **Integrations** — external services, queues, databases, third-party APIs and their adapters.
7. **Actual patterns** — the conventions the code really follows, including where parts of the
   codebase disagree with each other.
8. **Debt and gotchas** — workarounds, legacy code that cannot change, performance
   bottlenecks, surprising constraints.

With a `focus`, also work out what would have to change for that feature, file by file.

## Step 3: Write the document

Every claim follows `references/evidence_citation_policy.md`: cite `file:line`, never invent a
line number. Reference models and APIs by source file instead of copying them in. Diagrams
follow `references/mermaid_policy.md` and must pass `scripts/validate_mermaid.py`.

Suggested sections, dropping any with nothing real to say:

| Section | Holds |
|---------|-------|
| Overview and scope | What the system does; the `focus`, if any |
| Tech stack | Table of runtime, frameworks, versions, with the manifest cited |
| Source tree | Annotated layout of the folders that matter |
| Key modules | Where the logic lives, with citations |
| Data and integrations | Models, stores, external APIs |
| Build, test, deploy | The exact commands that work today |
| Technical debt and workarounds | Honest list, each cited |
| Constraints and gotchas | What an agent must not break or assume |
| Impact analysis | With a `focus` only: files and modules that change, and the risks |

## Step 4: Check before delivering

1. **Accuracy** — every path and command exists; spot-check citations against the source.
2. **Completeness** — every major component in scope appears.
3. **Focus** — with a `focus`, the affected areas carry the detail and the rest stays brief.
4. **Reality** — nothing aspirational; debt and inconsistency are stated, not smoothed over.
5. **Navigation** — clear section structure an agent can jump into.
6. **Diagrams** — `validate_mermaid.py --input {output_dir}/{name}.md` exits 0.

Report the path, the scope used, and anything deliberately left out.
