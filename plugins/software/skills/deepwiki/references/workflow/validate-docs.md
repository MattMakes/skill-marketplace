# Step: validate-docs (Phase 4)

## Goal

Validate the generated documentation and apply safe fixes:
- Mermaid diagrams parse (the linter is pure stdlib, so it always runs — there is no
  "tool unavailable" outcome to report)
- Document structure is consistent (PAGE_ID markers, AUTOGEN markers, no overlaps)

## Inputs

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `doc_dir` | No | `{output_dir}` | Directory containing generated `.md` docs |
| `output_dir` | No | `docs/wiki` | Base output dir (for `_reports/`) |
| `toc_file` | No | `{output_dir}/toc.json` | TOC file used to validate expected pages/sections |
| `repo_path` | No | `.` | Repository root path |

## Outputs

| Path | Description |
|------|-------------|
| `{output_dir}/_reports/mermaid_invalid.json` | Invalid Mermaid blocks report |
| `{output_dir}/_reports/structure_validation.json` | Document structure validation report |
| `{doc_dir}/*.md` | In-place fixes (Mermaid blocks and/or missing structural markers only) |

## Scripts

### `validate_docs_structure.py`

Validates document structure against TOC specification: PAGE_ID markers, AUTOGEN markers, internal links.

**Usage**:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_docs_structure.py \
    --doc-dir "{doc_dir}" \
    --toc-file "{toc_file}"
```

**Parameters**:

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--doc-dir` | Yes | - | Directory containing generated .md docs |
| `--toc-file` | Yes | - | Path to toc.json file |
| `--output` | No | stdout | Output JSON report to file |
| `--errors-only` | No | false | Only report errors, not warnings |
| `--fix` | No | false | Auto-fix issues where possible (not yet implemented) |

**Output Structure** (JSON):
```json
{
  "summary": {
    "pages_validated": 5,
    "pages_missing": 0,
    "sections_validated": 20,
    "sections_missing": 2,
    "total_errors": 3,
    "total_warnings": 1,
    "is_valid": false
  },
  "errors": [
    {
      "file": "01_overview.md",
      "line": 1,
      "severity": "error",
      "category": "page_id",
      "message": "Missing PAGE_ID marker",
      "fix_hint": "Add <!-- PAGE_ID: project_01_overview --> at the start"
    }
  ],
  "warnings": [...]
}
```

**Issue Categories**:

| Category | Description |
|----------|-------------|
| `page_id` | PAGE_ID marker missing or incorrect |
| `autogen` | AUTOGEN marker issues (missing, mismatched, orphaned) |
| `structure` | Basic structure issues (H1 headings, file size) |
| `link` | Internal link issues (broken or undefined targets) |
| `toc` | TOC alignment issues (missing pages, extra files) |

### `validate_mermaid.py`

Extracts and lints Mermaid diagrams in markdown files.

**Zero dependencies.** This is a pure-stdlib Python linter — no Node.js, no npm,
no `mermaid-cli`/`mmdc`, nothing to `pip install`. Mermaid is rendered natively by
GitHub, GitLab, VitePress and most Markdown viewers, so no local tool is needed to
*draw* a diagram; the only thing worth doing locally is checking that it parses,
which is what this does.

The rules are the executable form of `references/mermaid_policy.md`.

**Usage**:
```bash
# Validate all diagrams in a directory (invalid only)
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_mermaid.py \
    --input "{doc_dir}" \
    --invalid-only

# Validate a single Mermaid file
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_mermaid.py --input diagram.mmd

# Validate code string directly
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_mermaid.py --code "graph TD\n    A-->B"
```

**Parameters**:

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--input` | Yes* | - | Input file (.mmd) or directory (scans .md files) |
| `--code` | Yes* | - | Mermaid code string to validate |
| `--blocks` | Yes* | - | JSON file with extracted blocks |
| `--output` | No | stdout | Output JSON report to file |
| `--patterns` | No | `*.md` | Comma-separated globs for .md files |
| `--invalid-only` | No | false | Only output invalid blocks |
| `--extract-only` | No | false | Only extract blocks, don't validate |
| `--strict` | No | false | Treat policy warnings as errors |

*One of `--input`, `--code`, or `--blocks` is required (mutually exclusive).

**Exit codes**: `0` = all diagrams valid, `1` = invalid diagrams found, `2` = bad
invocation. This makes the phase usable as a CI gate.

**Output Structure** (with `--invalid-only`):
```json
{
  "invalid_blocks": [
    {
      "file": "01_overview.md",
      "index": 0,
      "code": "graph TD\n    A[User (Admin)] --> B",
      "start_line": 45,
      "end_line": 55,
      "error_type": "unquoted_node_label",
      "error_message": "Unquoted node label contains '(': A[User (Admin)]",
      "error_line": 2,
      "fix_hint": "Wrap the label in double quotes: A[\"User (Admin)\"]"
    }
  ],
  "total_invalid": 2,
  "total_scanned": 10,
  "files_affected": 1
}
```

Every block also carries `diagram_type` and a `warnings` list.

**Error Types** (block is invalid — it would not parse):

| Type | Description | Common Fix |
|------|-------------|------------|
| `smart_characters` | Curly quotes or non-breaking space | Replace with plain ASCII |
| `empty_block` | No diagram declaration | Add e.g. `graph TD` |
| `unknown_diagram_type` | Unrecognised header | Use a valid declaration |
| `missing_direction` | `graph` with no direction | Use `graph TD` |
| `invalid_direction` | Direction is not TD/TB/BT/LR/RL | Use `TD` |
| `unbalanced_quote` | A `"` is opened but never closed | Close the quote |
| `unbalanced_delimiter` | Unmatched `(`, `[` or `{` | Balance the brackets |
| `unquoted_node_label` | Unquoted label contains `()[]{}"\|;` | Quote the label |
| `invalid_subgraph_name` | Subgraph name has special characters | Use a quoted title |
| `reserved_node_id` | Node id is `end`, `graph` or `subgraph` | Rename the node |
| `unbalanced_end` | `subgraph`/`loop`/`alt`… without `end` | Add the missing `end` |
| `empty_message` | Nothing after `:` in a sequence/state/ER edge | Add message text |
| `invalid_arrow` | Malformed sequence arrow | Use `->>`, `-->>`, `-x`, … |

**Warning Types** (renders fine, but violates policy — only fails under `--strict`):

| Type | Description |
|------|-------------|
| `unquoted_node_label` | Label is unquoted but contains no breaking characters |
| `br_self_closing` | Uses `<br/>` instead of `<br>` |
| `light_mode_fill` | Fill colour is unreadable on a dark background |
| `missing_autonumber` | `sequenceDiagram` without `autonumber` |
| `multiline_label` | Quoted label spans several lines |
| `horizontal_orientation` | `graph LR` instead of the preferred `graph TD` |

Characters such as `/`, `,`, `:`, `<`, `>` parse fine in an unquoted label and are
**not** errors — they only raise the `unquoted_node_label` warning. Only
`( ) [ ] { } " | ;` genuinely break the parser.

## Workflow

### 1. Mermaid Diagram Validation

1) Run `validate_mermaid.py` script:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_mermaid.py \
    --input "{doc_dir}" \
    --invalid-only \
    --output "{output_dir}/_reports/mermaid_invalid.json"
```

   The linter is pure stdlib, so it always runs — there is no "tool unavailable"
   path to handle. A non-zero exit means real invalid diagrams, not a broken
   toolchain.

2) If invalid blocks are found (`total_invalid > 0`):
   - Fix each invalid diagram (max 3 attempts per diagram) using `mermaid_policy.md` and the `fix_hint`.
   - Re-run the script until no invalid blocks remain.
   - If still invalid after 3 attempts, comment out the diagram block and add a TODO noting the error.

4) Report is saved to `{output_dir}/_reports/mermaid_invalid.json`

### 2. Document Structure Validation

1) Run `validate_docs_structure.py` script:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/deepwiki/scripts/validate_docs_structure.py \
    --doc-dir "{doc_dir}" \
    --toc-file "{toc_file}" \
    --output "{output_dir}/_reports/structure_validation.json"
```

2) If errors are found (`summary.is_valid == false`), fix each issue based on `fix_hint`:

**PAGE_ID fixes**:
   - If missing: Add `<!-- PAGE_ID: {expected_id} -->` at the start of file
   - If incorrect: Replace with correct PAGE_ID from TOC

**AUTOGEN marker fixes**:
   - Missing BEGIN: Add `<!-- BEGIN:AUTOGEN {section_id} -->` before section content
   - Missing END: Add `<!-- END:AUTOGEN {section_id} -->` after section content
   - Mismatched: Correct section_id to match TOC
   - Orphaned: Remove unpaired markers

3) Re-run the script to confirm all errors are fixed

4) Report is saved to `{output_dir}/_reports/structure_validation.json`

**Safe auto-fixes allowed**:
  - Add missing PAGE_ID/AUTOGEN markers
  - Fix mismatched section_id to match TOC
  - Do NOT rewrite page content
