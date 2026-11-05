# Phase: research-qa (Optional)

## Goal

Investigate a codebase and report findings that are grounded entirely in source you have actually read. Two modes:

| Mode | Trigger | Output |
|------|---------|--------|
| **Research a topic** | "how does X work", "analyze the auth system", deep architectural investigation | A multi-iteration research report written to disk |
| **Answer a question** | "where is Y defined", "what does Z do", a single scoped question | A cited answer, returned in chat |

Both modes obey the same evidence standard. The difference is depth and iteration count, not rigor.

This phase reads the repository and git metadata only. It writes no wiki pages and requires nothing beyond Python 3 stdlib.

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `mode` | Yes | - | `research` or `ask` |
| `topic` | Yes | - | The topic to research, or the question to answer |
| `repo_path` | Yes | - | Absolute repository root path |
| `output_dir` | No | `docs/wiki` | Documentation output directory |
| `iterations` | No | `5` | Research iterations (`research` mode only) |
| `repo_url` | No | - | Remote base URL for linked citations; resolved in Step 0 |
| `toc_file` | No | `{output_dir}/toc.json` | Existing TOC, used as a map of the repo if present |

## Outputs

| Path | Description |
|------|-------------|
| `{output_dir}/_research/{topic-slug}.md` | Research report (`research` mode) |
| — | Answer returned in chat; write to a file only if the user asks (`ask` mode) |

## Step 0: Resolve repository context (both modes, do this first)

```bash
git -C "{repo_path}" remote get-url origin       # remote URL, if any
git -C "{repo_path}" rev-parse --abbrev-ref HEAD  # branch
git -C "{repo_path}" rev-parse HEAD               # COMMIT for permanent links
```

- **Remote found** → `REPO_URL`. Cite as `[file.ts:42](REPO_URL/blob/COMMIT/file.ts#L42)`.
- **No remote** → ask whether a source repo URL exists. If local-only, cite as `(file.ts:42)`.

Pin citations to the **commit hash**, not the branch name, so links stay valid. Do not proceed until the format is settled.

If `{output_dir}/toc.json` exists, read it first — its `pages[].source_files` are a pre-built map of which files matter, and reusing it keeps research consistent with the wiki.

## The Evidence Standard (non-negotiable, both modes)

Read source with `python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/read_files.py --repo-path "{repo_path}" --files '[...]' --line-numbers` so every line number you cite is a real line number lifted from the file. **Never invent a line number.** Never cite a file you did not open.

### Depth before breadth

- **Trace actual code paths.** Do not infer behavior from a file name, a folder name, or a convention.
- **Read the real implementation.** Not what a function is probably doing — what it does.
- **Follow the chain.** If A calls B calls C, go all the way to C.
- **Separate fact from inference.** "I read this" and "I am inferring this because…" are different sentences and must look different on the page.

### Zero tolerance for shallow analysis

- **No vibes-based diagrams.** Every box and every arrow maps to code you have read.
- **No assumed patterns.** Do not write "this follows MVC" unless you have located the M, the V, and the C.
- **No skipped layers.** Asked how data flows from A to Z? Trace every hop.
- **No confident unknowns.** If you have not read it, write "I have not traced this yet." That sentence is a valid, valuable finding.

### Required evidence by claim type

| Claim | Required evidence |
|-------|-------------------|
| "X calls Y" | File path + function name at the call site |
| "Data flows through Z" | Full trace: entry point → transformations → destination |
| "This is the entry point" | Where it is invoked — main, route registration, config, manifest |
| "These modules are coupled" | The import or dependency chain |
| "This is dead code" | Evidence that no call sites exist (searched, found nothing) |
| "This is configurable" | The config key, its default, and where it is read |

### Confidence rating on every finding

| Rating | Meaning |
|--------|---------|
| **HIGH** | Read the code end to end |
| **MEDIUM** | Read part of it, inferred the rest — say which part |
| **LOW** | Inferred from structure, naming, or convention only |

## Mode A: Research a topic

Run `iterations` progressive passes (default 5). Each pass takes a **different analytical lens** and builds on every prior pass. Never repeat a finding. Never respond with "continuing the analysis" — every iteration produces substantive new material or it does not count.

Each iteration must include **at least one Mermaid diagram** and **at least one structured table**.

### Iteration 1 — Research plan and structural survey

State the topic precisely. Map the landscape: components, boundaries, entry points. Identify the files that matter and say why. Give initial findings with citations and confidence ratings. Include a `graph TD` architecture diagram. End with "Next steps for iteration 2".

### Iteration 2 — Data flow and state

Trace inputs → transformations → outputs → storage. Where does state live, who mutates it, what is the lifetime. Include a `sequenceDiagram` and/or `stateDiagram-v2`.

### Iteration 3 — Integration and dependencies

External connections, API contracts, coupling, dependency direction. Include a dependency graph and an integration table (system, protocol, contract, where it is defined).

### Iteration 4 — Patterns and anti-patterns

Design patterns actually present (with their locations), trade-offs taken, technical debt, risks. Tabulate the patterns found. Rank risks by impact.

### Iteration 5 — Synthesis

- Synthesize findings from all prior iterations.
- Give a mental model in 2–3 sentences: "Here is how to think about this."
- Then puncture it: "Here is what that mental model hides" — the nuances, edge cases, and gotchas the simple picture loses.
- Call out the surprising stuff. Weird findings are the most valuable output of research.
- List key findings as numbered items, each with a citation and a confidence rating.
- Give actionable recommendations.

### Running knowledge map

Carry this forward and update it at the end of every iteration. It is how the reader — and you — know where the boundary of your knowledge sits.

```
## Explored ✅
- {component}: {1-line summary} — confidence: HIGH/MED/LOW

## Partially Explored 🔶
- {component}: {what we know} / {what is still unknown}

## Unexplored ❓
- {component}: {why it might matter}

## Key Findings 🔍
- {finding}: {1-line summary} — {risk/importance}

## Open Questions ❔
- {question}: {what we would need to trace to answer it}
```

### Report structure

Write to `{output_dir}/_research/{topic-slug}.md`:

```markdown
# Research: {Topic}

Repository: {name} · Commit: `{COMMIT}` · Generated: {YYYY-MM-DD}

## Summary

{The mental model, and what it hides. 3–5 sentences.}

## Iteration 1 — Structural Survey
...
## Iteration 5 — Synthesis
...

## Knowledge Map

{The final running knowledge map}

## Key Findings

| # | Finding | Evidence | Confidence | Impact |
|---|---------|----------|------------|--------|
| 1 | ... | ([file.ts:42](...)) | HIGH | ... |
```

## Mode B: Answer a question

1. **Detect the language** of the question and answer in that same language.
2. **Search** the repo for files relevant to the question. Use `toc.json` `source_files` as a starting map if it exists.
3. **Read** those files with `read_files.py` and line numbers. Read enough to be sure — a question answered from one grep hit is a guess wearing a citation.
4. **Synthesize** the answer from what the source actually says.

Only source in this repository counts as evidence. Do not fill gaps with general knowledge of the framework, the library, or "how this is usually done". If the code is insufficient to answer, say so explicitly and name the files worth examining next — an honest "not determinable from the source" is a correct answer.

### Response format

```markdown
## {Concise Answer Title}

{1–2 paragraph direct answer — lead with the answer, not the journey.}

### How It Works

{Detailed explanation with inline citations. Include at least one Mermaid diagram
whenever the answer involves architecture, flow, or relationships between parts.}

### Key Files

| File | Purpose | Source |
|------|---------|--------|
| `src/auth/session.ts` | Issues and validates session tokens | ([session.ts:18-64](REPO_URL/blob/COMMIT/src/auth/session.ts#L18-L64)) |

### Code Example

<!-- Source: src/auth/session.ts:18-30 -->
{Real snippet, copied exactly from the file. Never a hypothetical.}

### Related

- {Adjacent concepts or files worth exploring}
```

## Citations (both modes)

| Repo type | Format |
|-----------|--------|
| Remote | `[file.ts:42](REPO_URL/blob/COMMIT/file.ts#L42)` — line range: `#L42-L58` |
| Local | `(file.ts:42)` |

Every non-trivial claim carries a citation, placed immediately after the claim and inside the sentence's closing period. Line numbers come from `read_files.py` output — never estimate, never round, never guess.

Do not cite general programming concepts, standard library behavior, or your own summaries.

## Diagrams (both modes)

Follow `../references/mermaid_policy.md`: `graph TD` (not `LR`), all node text double-quoted, no parentheses in subgraph names, no source citations inside the diagram.

Place a `<!-- Sources: file.ts:42, other.ts:10 -->` comment immediately after every diagram — that is how a reader checks that the boxes are real.

Use the wiki's dark-mode palette so diagrams match the rest of the docs:

| Element | Value |
|---------|-------|
| Node fill | `#2d333b` |
| Node border | `#6d5dfc` |
| Text | `#e6edf3` |
| Subgraph background | `#161b22` |
| Subgraph border | `#30363d` |
| Lines and arrows | `#8b949e` |

Lint every diagram before you finish:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_mermaid.py \
    --input "{output_dir}/_research" \
    --invalid-only
```

Fix anything reported using the `fix_hint`, and re-run until `total_invalid` is `0`.

## Validation

- [ ] Repository context resolved; citation format matches the repo type
- [ ] Every claim has a citation; every line number came from a file that was actually read
- [ ] Every finding carries a HIGH/MEDIUM/LOW confidence rating (`research` mode)
- [ ] No iteration repeats a prior iteration's findings (`research` mode)
- [ ] Unexplored territory is named, not silently omitted
- [ ] `validate_mermaid.py` reports `total_invalid: 0`
