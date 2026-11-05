#!/usr/bin/env python3
"""
Extract and validate Mermaid diagram syntax — pure stdlib, no external tools.

Mermaid is rendered natively by GitHub, GitLab, VitePress and most Markdown
viewers, so nothing needs to be installed locally to *draw* a diagram. The only
thing a local tool can usefully add is a syntax check, and that is all this
script does — with no mermaid-cli (mmdc), no Node.js, and no third-party Python
packages.

The linter encodes the failure modes that actually break LLM-authored diagrams:
unquoted node labels containing special characters, parenthesised subgraph
names, empty sequence messages, unbalanced brackets/quotes, missing `end`, and
smart quotes. It is deliberately conservative: a block is reported invalid only
when the construct would genuinely fail to parse. Everything else (style and
policy nits) is emitted as a warning, and only fails the block under --strict.

Rules are the executable form of references/mermaid_policy.md.

Usage:
    # Validate all diagrams in a directory
    python3 validate_mermaid.py --input ./docs/wiki/ --invalid-only

    # Validate a single Mermaid file
    python3 validate_mermaid.py --input diagram.mmd

    # Validate a code string directly
    python3 validate_mermaid.py --code "graph TD\\n    A-->B"

    # Validate from pre-extracted blocks JSON
    python3 validate_mermaid.py --blocks blocks.json

Options:
    --input PATH           Input file (.md/.mmd) or directory (scans .md files)
    --code CODE            Mermaid code string
    --blocks PATH          JSON file with extracted blocks
    --output PATH          Output JSON report (default: stdout)
    --patterns PATTERNS    Glob patterns for .md files (default: *.md)
    --invalid-only         Only output invalid blocks
    --extract-only         Only extract blocks, don't validate
    --strict               Treat policy warnings as errors

Exit codes: 0 = all valid, 1 = invalid diagrams found, 2 = bad invocation.
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# =============================================================================
# Data model  (JSON schema preserved from the mmdc-based implementation)
# =============================================================================

@dataclass
class MermaidBlock:
    """A mermaid code block extracted from Markdown."""
    code: str
    start_line: int
    end_line: int
    start_pos: int
    end_pos: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "start_pos": self.start_pos,
            "end_pos": self.end_pos,
        }


@dataclass
class ValidationResult:
    """Result of mermaid syntax validation."""
    is_valid: bool
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    error_line: Optional[int] = None
    fix_hint: Optional[str] = None
    diagram_type: Optional[str] = None
    warnings: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "error_message": self.error_message,
            "error_type": self.error_type,
            "error_line": self.error_line,
            "fix_hint": self.fix_hint,
            "diagram_type": self.diagram_type,
            "warnings": self.warnings,
        }


# =============================================================================
# Grammar tables
# =============================================================================

DIAGRAM_HEADERS: Dict[str, str] = {
    "graph": "flowchart",
    "flowchart": "flowchart",
    "flowchart-elk": "flowchart",
    "sequencediagram": "sequence",
    "classdiagram": "class",
    "classdiagram-v2": "class",
    "statediagram": "state",
    "statediagram-v2": "state",
    "erdiagram": "er",
    "journey": "journey",
    "gantt": "gantt",
    "pie": "pie",
    "gitgraph": "gitgraph",
    "mindmap": "mindmap",
    "timeline": "timeline",
    "quadrantchart": "quadrant",
    "requirementdiagram": "requirement",
    "sankey-beta": "sankey",
    "xychart-beta": "xychart",
    "block-beta": "block",
    "c4context": "c4",
    "c4container": "c4",
    "c4component": "c4",
    "c4dynamic": "c4",
    "c4deployment": "c4",
}

FLOWCHART_DIRECTIONS = {"td", "tb", "bt", "lr", "rl"}

# Node ids that genuinely break the flowchart parser. Kept deliberately short:
# `o` and `x` are special only as edge *endings* (`A --o B`), so a node called
# `O` is legal and must not be flagged. Statement keywords like `style` or
# `class` only conflict at the start of a line, which is rare enough that
# flagging them costs more in false positives than it saves.
RESERVED_NODE_IDS = {"end", "graph", "subgraph"}

SEQUENCE_BLOCK_OPENERS = {
    "loop", "alt", "opt", "par", "critical", "rect", "box", "break",
}

# Characters that genuinely break an *unquoted* flowchart label: they collide
# with shape delimiters (()[]{}), the edge-label delimiter (|), the statement
# separator (;), or string quoting (").
#
# Deliberately NOT included: < > / , : # & ' \ — all of which parse fine
# unquoted. `A[Captcha <br>ok?]` and `A[Save/Cancel]` are valid, widely-used
# Mermaid; flagging them as errors would be a false positive. Policy still wants
# every label quoted, so those surface as warnings instead.
HARD_BREAK_LABEL_CHARS = set('()[]{}"|;')

SMART_CHARS = {
    "“": 'left curly double quote',
    "”": 'right curly double quote',
    "‘": "left curly single quote",
    "’": "right curly single quote",
    " ": "non-breaking space",
}

# Fills unreadable on a dark background (MS deep-wiki dark-mode mandate).
LIGHT_FILL_RE = re.compile(
    r"fill\s*:\s*(#(?:fff|ffffff|eee|eeeeee|f9f9f9)\b|white|lightgrey|lightgray)",
    re.IGNORECASE,
)


# =============================================================================
# Lexical helpers
# =============================================================================

def strip_comment(line: str) -> str:
    """Drop a trailing `%%` Mermaid comment, ignoring `%%` inside quotes."""
    out: List[str] = []
    in_quote = False
    i = 0
    while i < len(line):
        ch = line[i]
        if ch == '"':
            in_quote = not in_quote
            out.append(ch)
        elif not in_quote and ch == "%" and i + 1 < len(line) and line[i + 1] == "%":
            break
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def blank_quoted(line: str) -> str:
    """Blank out the contents of double-quoted strings.

    Lets delimiter scanning ignore label text, so `A["f(x)"]` is not seen as
    unbalanced.
    """
    out: List[str] = []
    in_quote = False
    for ch in line:
        if ch == '"':
            in_quote = not in_quote
            out.append(ch)
        elif in_quote:
            out.append(" ")
        else:
            out.append(ch)
    return "".join(out)


def significant_lines(code: str) -> List[Tuple[int, str]]:
    """(1-indexed line no, decommented text) for non-blank, non-directive lines."""
    result: List[Tuple[int, str]] = []
    for idx, raw in enumerate(code.split("\n"), start=1):
        if raw.strip().startswith("%%{"):      # %%{init: ...}%% directive
            continue
        text = strip_comment(raw).rstrip()
        if text.strip():
            result.append((idx, text))
    return result


# =============================================================================
# Extraction
# =============================================================================

def extract_mermaid_blocks(content: str) -> List[MermaidBlock]:
    """Extract ```mermaid fenced blocks from Markdown content."""
    blocks: List[MermaidBlock] = []
    lines = content.split("\n")

    i = 0
    current_pos = 0
    while i < len(lines):
        line = lines[i]
        if line.strip() == "```mermaid":
            start_line = i + 1
            start_pos = current_pos
            mermaid_lines: List[str] = []
            current_pos += len(line) + 1
            i += 1

            closed = False
            while i < len(lines):
                current_line = lines[i]
                if current_line.strip() == "```":
                    blocks.append(MermaidBlock(
                        code="\n".join(mermaid_lines),
                        start_line=start_line,
                        end_line=i + 1,
                        start_pos=start_pos,
                        end_pos=current_pos + len(current_line),
                    ))
                    current_pos += len(current_line) + 1
                    i += 1
                    closed = True
                    break
                mermaid_lines.append(current_line)
                current_pos += len(current_line) + 1
                i += 1

            if not closed:
                # Unterminated fence — surface it rather than silently dropping.
                blocks.append(MermaidBlock(
                    code="\n".join(mermaid_lines),
                    start_line=start_line,
                    end_line=len(lines),
                    start_pos=start_pos,
                    end_pos=current_pos,
                ))
        else:
            current_pos += len(line) + 1
            i += 1

    return blocks


# =============================================================================
# Checks
# =============================================================================

def _err(msg: str, etype: str, line: Optional[int], hint: str,
         dtype: Optional[str] = None) -> ValidationResult:
    return ValidationResult(
        is_valid=False, error_message=msg, error_type=etype,
        error_line=line, fix_hint=hint, diagram_type=dtype,
    )


def check_smart_chars(lines: List[Tuple[int, str]]) -> Optional[ValidationResult]:
    for lineno, text in lines:
        for ch, name in SMART_CHARS.items():
            if ch in text:
                return _err(
                    f"Non-ASCII {name} found; Mermaid needs plain ASCII punctuation",
                    "smart_characters", lineno,
                    f"Replace the {name} with its plain ASCII equivalent.",
                )
    return None


def detect_diagram_type(
    lines: List[Tuple[int, str]],
) -> Tuple[Optional[str], Optional[ValidationResult]]:
    if not lines:
        return None, _err(
            "Empty Mermaid block", "empty_block", 1,
            "Add a diagram declaration, e.g. `graph TD`.",
        )

    lineno, header = lines[0]
    tokens = header.strip().split()
    keyword = tokens[0].lower().rstrip(";")

    dtype = DIAGRAM_HEADERS.get(keyword)
    if dtype is None:
        return None, _err(
            f"Unknown diagram type: {tokens[0]!r}",
            "unknown_diagram_type", lineno,
            "Start the block with a valid declaration: graph TD, sequenceDiagram, "
            "classDiagram, stateDiagram-v2, erDiagram, ...",
        )

    if dtype == "flowchart":
        if len(tokens) < 2:
            return dtype, _err(
                f"`{tokens[0]}` needs a direction",
                "missing_direction", lineno,
                "Use `graph TD`. A bare `graph` will not parse.", dtype,
            )
        direction = tokens[1].lower().rstrip(";")
        if direction not in FLOWCHART_DIRECTIONS:
            return dtype, _err(
                f"Invalid flowchart direction: {tokens[1]!r}",
                "invalid_direction", lineno,
                "Valid directions: TD, TB, BT, LR, RL. Prefer TD.", dtype,
            )

    return dtype, None


# `||--o{`, `}o..o|` — ER cardinality markers. The braces and pipes are part of
# the relationship token, not delimiters, so they must not be balance-counted.
ER_CARDINALITY_RE = re.compile(r"[|}o{]{1,2}(?:--|\.\.)[|}o{]{1,2}")

# Diagram types whose bracket usage is regular enough to balance-check. The rest
# (gantt, pie, journey, gitgraph, mindmap, C4, ...) have bespoke syntax where a
# generic balancer produces false positives.
BALANCE_TYPES = {"flowchart", "sequence", "class", "state", "er"}


def check_balanced(
    lines: List[Tuple[int, str]], dtype: Optional[str],
) -> Tuple[Optional[ValidationResult], List[Dict[str, Any]]]:
    """Balanced quotes and delimiters, ignoring text inside double quotes.

    Quote state is carried *across* lines: Mermaid permits a quoted label to
    span several source lines, so per-line quote parity would false-positive on
    valid diagrams. An unterminated quote is only an error at end of block.
    """
    closers = {")": "(", "]": "[", "}": "{"}
    openers = {"(": ")", "[": "]", "{": "}"}
    stack: List[Tuple[str, int]] = []
    warnings: List[Dict[str, Any]] = []

    in_quote = False
    quote_line: Optional[int] = None

    for lineno, text in lines:
        # Walk the line, tracking quote state, blanking out quoted content.
        scan_chars: List[str] = []
        for ch in text:
            if ch == '"':
                if in_quote:
                    if quote_line != lineno:
                        warnings.append({
                            "line": quote_line, "type": "multiline_label",
                            "message": "Quoted label spans multiple lines",
                            "hint": "Prefer a single-line label using `<br>` for breaks.",
                        })
                    in_quote = False
                    quote_line = None
                else:
                    in_quote = True
                    quote_line = lineno
                scan_chars.append('"')
            elif in_quote:
                scan_chars.append(" ")
            else:
                scan_chars.append(ch)

        if dtype not in BALANCE_TYPES:
            continue

        scan = "".join(scan_chars)
        if dtype == "er":
            scan = ER_CARDINALITY_RE.sub(" ", scan)

        for ch in scan:
            if ch in openers:
                stack.append((ch, lineno))
            elif ch in closers:
                if not stack:
                    return _err(
                        f"Unmatched closing `{ch}`", "unbalanced_delimiter", lineno,
                        f"Remove the stray `{ch}` or add its opening `{closers[ch]}`.",
                    ), warnings
                opener, _ = stack.pop()
                if opener != closers[ch]:
                    return _err(
                        f"Mismatched delimiter: `{opener}` closed by `{ch}`",
                        "unbalanced_delimiter", lineno,
                        f"`{opener}` must be closed by `{openers[opener]}`.",
                    ), warnings

    if in_quote:
        return _err(
            "Unterminated double quote", "unbalanced_quote", quote_line,
            'A `"` is opened but never closed.',
        ), warnings

    if stack:
        opener, lineno = stack[-1]
        return _err(
            f"Unclosed `{opener}`", "unbalanced_delimiter", lineno,
            f"Add the matching `{openers[opener]}`.",
        ), warnings

    return None, warnings


# Node definition: an id followed by a bracketed label.
# The quoted alternative must come first: a non-greedy unquoted match would stop
# at the first `)` inside a label like A["Process (input)"].
NODE_DEF_RE = re.compile(
    r"""(?<![\w"])
    (?P<id>[A-Za-z_][\w.-]*)
    (?P<open>\(\(|\[\[|\[\(|\{\{|\[/|\[\\|\[|\(|\{|>)
    \s*
    (?P<label>"[^"]*"|[^\n]*?)
    \s*
    (?P<close>\)\)|\]\]|\)\]|\}\}|/\]|\\\]|\]|\)|\})
    """,
    re.VERBOSE,
)

SUBGRAPH_RE = re.compile(r"^\s*subgraph\s+(?P<name>.+?)\s*$", re.IGNORECASE)


def check_flowchart(
    lines: List[Tuple[int, str]], strict: bool,
) -> Tuple[Optional[ValidationResult], List[Dict[str, Any]]]:
    warnings: List[Dict[str, Any]] = []
    depth = 0

    _, header = lines[0]
    if len(header.split()) > 1 and header.split()[1].lower().rstrip(";") == "lr":
        warnings.append({
            "line": lines[0][0], "type": "horizontal_orientation",
            "message": "`graph LR` is wide and scrolls badly on narrow pages",
            "hint": "Prefer `graph TD` (top-down).",
        })

    for lineno, text in lines[1:]:
        stripped = text.strip()
        low = stripped.lower()

        # --- subgraph / end balance ---------------------------------------
        m = SUBGRAPH_RE.match(text)
        if m:
            depth += 1
            name = m.group("name").strip()
            # `subgraph id ["Title"]` and `subgraph "Title"` are both fine.
            if not (name.startswith('"') or "[" in name):
                if any(c in name for c in "()<>{}#&,;:/\\|"):
                    return _err(
                        f"Subgraph name has special characters: {name!r}",
                        "invalid_subgraph_name", lineno,
                        'Use alphanumerics/underscores, or give it a quoted title: '
                        'subgraph id ["My Title (v2)"]',
                        "flowchart",
                    ), warnings
            continue

        if low == "end" or low.startswith("end "):
            depth -= 1
            if depth < 0:
                return _err(
                    "`end` without a matching `subgraph`", "unbalanced_end", lineno,
                    "Remove the stray `end`.", "flowchart",
                ), warnings
            continue

        # --- node ids and labels -------------------------------------------
        for nm in NODE_DEF_RE.finditer(text):
            node_id = nm.group("id")
            label = nm.group("label").strip()

            if node_id.lower() in RESERVED_NODE_IDS:
                return _err(
                    f"`{node_id}` is a reserved Mermaid keyword, not usable as a node id",
                    "reserved_node_id", lineno,
                    f"Rename the node, e.g. `{node_id}Node[...]`.", "flowchart",
                ), warnings

            if not label:
                continue

            quoted = len(label) >= 2 and label.startswith('"') and label.endswith('"')
            if quoted:
                continue

            opener, closer = nm.group("open"), nm.group("close")
            risky = sorted(HARD_BREAK_LABEL_CHARS.intersection(label))
            if risky:
                return _err(
                    f"Unquoted node label contains {''.join(risky)!r}: {nm.group(0)}",
                    "unquoted_node_label", lineno,
                    f'Wrap the label in double quotes: '
                    f'{node_id}{opener}"{label}"{closer}',
                    "flowchart",
                ), warnings

            warnings.append({
                "line": lineno, "type": "unquoted_node_label",
                "message": f"Node label {label!r} is not quoted",
                "hint": "Policy requires quoting all labels: "
                        f'{node_id}{opener}"{label}"{closer}',
            })

        if "<br/>" in stripped or "<br />" in stripped:
            warnings.append({
                "line": lineno, "type": "br_self_closing",
                "message": "`<br/>` can break Mermaid parsing",
                "hint": "Use `<br>` instead.",
            })

        if LIGHT_FILL_RE.search(stripped):
            warnings.append({
                "line": lineno, "type": "light_mode_fill",
                "message": "Light fill is unreadable on a dark background",
                "hint": "Use fill:#2d333b,stroke:#6d5dfc,color:#e6edf3",
            })

    if depth > 0:
        return _err(
            f"{depth} unclosed `subgraph` block(s)", "unbalanced_end",
            lines[-1][0], "Every `subgraph` needs a matching `end`.", "flowchart",
        ), warnings

    return None, warnings


# `A->>B: message` — participants either side of an arrow, then a colon.
SEQ_ARROW_RE = re.compile(
    r"^(?P<from>[\w\"'. -]+?)\s*"
    r"(?P<arrow><<-{1,2}>>|-{1,2}>>|-{1,2}>|-{1,2}[)x]|--)\s*"
    r"[+-]?\s*(?P<to>[\w\"'. -]+?)\s*:(?P<msg>.*)$"
)
VALID_SEQ_ARROWS = {
    "->", "-->", "->>", "-->>", "-x", "--x", "-)", "--)", "<<->>", "<<-->>",
}


def check_sequence(
    lines: List[Tuple[int, str]], strict: bool,
) -> Tuple[Optional[ValidationResult], List[Dict[str, Any]]]:
    warnings: List[Dict[str, Any]] = []
    depth = 0
    has_autonumber = False

    for lineno, text in lines[1:]:
        stripped = text.strip()
        low = stripped.lower()
        first = low.split()[0].rstrip(":") if low.split() else ""

        if first == "autonumber":
            has_autonumber = True
            continue
        if first in SEQUENCE_BLOCK_OPENERS:
            depth += 1
            continue
        if first in {"else", "and", "option"}:
            continue
        if low == "end":
            depth -= 1
            if depth < 0:
                return _err(
                    "`end` without a matching loop/alt/opt/par/critical/rect/box",
                    "unbalanced_end", lineno, "Remove the stray `end`.", "sequence",
                ), warnings
            continue

        m = SEQ_ARROW_RE.match(stripped)
        if not m:
            continue

        arrow = m.group("arrow")
        if arrow not in VALID_SEQ_ARROWS:
            return _err(
                f"Invalid sequence arrow: {arrow!r}", "invalid_arrow", lineno,
                "Valid arrows: ->, -->, ->>, -->>, -x, --x, -), --)", "sequence",
            ), warnings

        if not m.group("msg").strip():
            return _err(
                "Sequence message is empty after `:`", "empty_message", lineno,
                "Every `:` needs message text. Use `: ;` if it is intentionally blank.",
                "sequence",
            ), warnings

    if depth > 0:
        return _err(
            f"{depth} unclosed sequence block(s)", "unbalanced_end", lines[-1][0],
            "Every loop/alt/opt/par/critical/rect/box needs a matching `end`.",
            "sequence",
        ), warnings

    if not has_autonumber:
        warnings.append({
            "line": lines[0][0], "type": "missing_autonumber",
            "message": "sequenceDiagram has no `autonumber`",
            "hint": "Add `autonumber` on the line after `sequenceDiagram`.",
        })

    return None, warnings


ER_REL_RE = re.compile(
    r"^\s*\w+\s+[|}o][|}o{.-]*(?:--|\.\.)[|}o{.-]*\s+\w+\s*(?P<colon>:)?(?P<label>.*)$"
)


def check_er(
    lines: List[Tuple[int, str]], strict: bool,
) -> Tuple[Optional[ValidationResult], List[Dict[str, Any]]]:
    for lineno, text in lines[1:]:
        m = ER_REL_RE.match(text)
        if m and m.group("colon") and not m.group("label").strip():
            return _err(
                "ER relationship label is empty after `:`", "empty_message", lineno,
                'Every ER relationship needs a label, e.g. `: "places"`.', "er",
            ), []
    return None, []


def check_state(
    lines: List[Tuple[int, str]], strict: bool,
) -> Tuple[Optional[ValidationResult], List[Dict[str, Any]]]:
    for lineno, text in lines[1:]:
        if "-->" in text and text.rstrip().endswith(":"):
            return _err(
                "State transition label is empty after `:`", "empty_message", lineno,
                "Add transition text after `:`, or drop the colon.", "state",
            ), []
    return None, []


CHECKERS = {
    "flowchart": check_flowchart,
    "sequence": check_sequence,
    "er": check_er,
    "state": check_state,
}


def validate_mermaid_code(code: str, strict: bool = False) -> ValidationResult:
    """Lint one Mermaid diagram. Pure Python — no renderer required."""
    lines = significant_lines(code)

    err = check_smart_chars(lines)
    if err:
        return err

    dtype, err = detect_diagram_type(lines)
    if err:
        return err

    err, warnings = check_balanced(lines, dtype)
    if err:
        err.diagram_type = dtype
        err.warnings = warnings
        return err

    checker = CHECKERS.get(dtype or "")
    if checker:
        err, more = checker(lines, strict)
        warnings = warnings + more
        if err:
            err.warnings = warnings
            return err

    if strict and warnings:
        first = warnings[0]
        return ValidationResult(
            is_valid=False, error_message=first["message"],
            error_type=first["type"], error_line=first["line"],
            fix_hint=first["hint"], diagram_type=dtype, warnings=warnings,
        )

    return ValidationResult(is_valid=True, diagram_type=dtype, warnings=warnings)


# =============================================================================
# File / directory drivers
# =============================================================================

def validate_file(path: Path, strict: bool = False) -> Dict[str, Any]:
    content = path.read_text(encoding="utf-8", errors="replace")
    blocks = extract_mermaid_blocks(content)

    block_results = []
    for idx, block in enumerate(blocks):
        entry = block.to_dict()
        entry["index"] = idx
        entry.update(validate_mermaid_code(block.code, strict=strict).to_dict())
        block_results.append(entry)

    return {"file": str(path), "total_blocks": len(blocks), "blocks": block_results}


def validate_directory(directory: Path, patterns: List[str],
                       strict: bool = False) -> Dict[str, Any]:
    md_files: List[Path] = []
    for pattern in patterns:
        md_files.extend(directory.rglob(pattern))
    md_files = sorted(set(md_files))

    files: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    type_counts: Dict[str, int] = {}
    total_blocks = 0
    files_with_mermaid = 0

    for path in md_files:
        result = validate_file(path, strict=strict)
        if result["total_blocks"] == 0:
            continue

        files_with_mermaid += 1
        total_blocks += result["total_blocks"]
        files.append(result)

        for block in result["blocks"]:
            dtype = block.get("diagram_type") or "unknown"
            type_counts[dtype] = type_counts.get(dtype, 0) + 1
            if not block["is_valid"]:
                errors.append({
                    "file": str(path),
                    "index": block["index"],
                    "start_line": block["start_line"],
                    "end_line": block["end_line"],
                    "error_type": block["error_type"],
                    "error_message": block["error_message"],
                    "error_line": block["error_line"],
                    "fix_hint": block["fix_hint"],
                    "code": block["code"],
                })

    return {
        "files": files,
        "errors": errors,
        "summary": {
            "total_files_scanned": len(md_files),
            "files_with_mermaid": files_with_mermaid,
            "total_blocks": total_blocks,
            "total_errors": len(errors),
            "type_counts": type_counts,
        },
    }


def build_invalid_only(result: Dict[str, Any]) -> Dict[str, Any]:
    """Compact report shape consumed by the validate-docs workflow."""
    errors = result["errors"]
    return {
        "invalid_blocks": errors,
        "total_invalid": len(errors),
        "total_scanned": result["summary"]["total_blocks"],
        "files_affected": len({e["file"] for e in errors}),
    }


# =============================================================================
# CLI
# =============================================================================

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Mermaid diagrams (pure stdlib, no mermaid-cli)."
    )
    parser.add_argument("--input", help="File (.md/.mmd) or directory to scan")
    parser.add_argument("--code", help="Mermaid code string to validate")
    parser.add_argument("--blocks", help="JSON file of pre-extracted blocks")
    parser.add_argument("--output", help="Write JSON report here (default: stdout)")
    parser.add_argument("--patterns", default="*.md",
                        help="Comma-separated globs for markdown files")
    parser.add_argument("--invalid-only", action="store_true",
                        help="Emit only the invalid-block report")
    parser.add_argument("--extract-only", action="store_true",
                        help="Extract blocks without validating")
    parser.add_argument("--strict", action="store_true",
                        help="Treat policy warnings as errors")
    args = parser.parse_args()

    if not any([args.input, args.code, args.blocks]):
        parser.error("one of --input, --code or --blocks is required")

    report: Dict[str, Any]
    failed = False

    if args.code:
        code = args.code.replace("\\n", "\n")
        result = validate_mermaid_code(code, strict=args.strict)
        failed = not result.is_valid
        report = {"code": code, **result.to_dict()}

    elif args.blocks:
        data = json.loads(Path(args.blocks).read_text(encoding="utf-8"))
        raw = data.get("blocks", data) if isinstance(data, dict) else data
        out = []
        for idx, block in enumerate(raw):
            code = block["code"] if isinstance(block, dict) else str(block)
            entry = dict(block) if isinstance(block, dict) else {"code": code}
            entry["index"] = idx
            entry.update(validate_mermaid_code(code, strict=args.strict).to_dict())
            out.append(entry)
        invalid = [b for b in out if not b["is_valid"]]
        failed = bool(invalid)
        report = {
            "blocks": out,
            "summary": {"total_blocks": len(out), "total_errors": len(invalid)},
        }

    else:
        path = Path(args.input)
        if not path.exists():
            print(f"Error: no such path: {path}", file=sys.stderr)
            return 2

        if path.is_dir():
            patterns = [p.strip() for p in args.patterns.split(",") if p.strip()]
            if args.extract_only:
                files = []
                for pattern in patterns:
                    for f in sorted(path.rglob(pattern)):
                        blocks = extract_mermaid_blocks(
                            f.read_text(encoding="utf-8", errors="replace"))
                        if blocks:
                            files.append({
                                "file": str(f),
                                "blocks": [b.to_dict() for b in blocks],
                            })
                report = {"files": files}
            else:
                full = validate_directory(path, patterns, strict=args.strict)
                failed = full["summary"]["total_errors"] > 0
                report = build_invalid_only(full) if args.invalid_only else full

        elif path.suffix == ".mmd":
            result = validate_mermaid_code(
                path.read_text(encoding="utf-8", errors="replace"), strict=args.strict)
            failed = not result.is_valid
            report = {"file": str(path), **result.to_dict()}

        else:
            file_report = validate_file(path, strict=args.strict)
            invalid = [b for b in file_report["blocks"] if not b["is_valid"]]
            failed = bool(invalid)
            if args.extract_only:
                report = {
                    "file": str(path),
                    "blocks": [
                        {k: b[k] for k in
                         ("code", "start_line", "end_line", "start_pos", "end_pos")}
                        for b in file_report["blocks"]
                    ],
                }
            elif args.invalid_only:
                report = {
                    "invalid_blocks": invalid,
                    "total_invalid": len(invalid),
                    "total_scanned": file_report["total_blocks"],
                    "files_affected": 1 if invalid else 0,
                }
            else:
                report = file_report

    text = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text, encoding="utf-8")
        print(f"Report written to {out_path}")
    else:
        print(text)

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
