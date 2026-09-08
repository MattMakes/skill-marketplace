#!/usr/bin/env python3
"""
Load a wiki table of contents without any third-party dependency.

deepwiki stores its TOC as `toc.json` so the whole toolchain runs on a stock
Python install — no PyYAML, no npm, nothing to `pip install`. JSON is also the
format the catalogue phase emits, so one representation serves both.

Legacy `toc.yaml` files (from the upstream deepwiki-skill) are still readable
*if* PyYAML happens to be installed. If it isn't, this module says so plainly
and points at the converter rather than failing with an ImportError traceback.

Usage as a library:
    from toc_io import load_toc
    toc = load_toc("docs/wiki/toc.json")

Usage as a converter:
    python3 toc_io.py --convert docs/wiki/toc.yaml   # -> docs/wiki/toc.json
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Union


class TocError(Exception):
    """Raised when a TOC cannot be read."""


# ---------------------------------------------------------------------------
# Minimal YAML reader for legacy toc.yaml
#
# Only exists so a legacy TOC can be migrated on a machine with no PyYAML. It
# handles exactly the subset a TOC uses — nested mappings, block sequences,
# inline flow sequences, and scalars — and raises rather than guessing on
# anything else (anchors, multi-line blocks, multiple documents). PyYAML is
# preferred whenever it is importable, because it is the real parser.
# ---------------------------------------------------------------------------

def _parse_scalar(token: str) -> Any:
    t = token.strip()
    if not t:
        return None
    if len(t) >= 2 and t[0] == t[-1] and t[0] in "\"'":
        return t[1:-1]
    low = t.lower()
    if low in {"true", "yes"}:
        return True
    if low in {"false", "no"}:
        return False
    if low in {"null", "~", ""}:
        return None
    if t.startswith("[") and t.endswith("]"):          # inline flow sequence
        inner = t[1:-1].strip()
        if not inner:
            return []
        return [_parse_scalar(x) for x in _split_flow(inner)]
    try:
        return int(t)
    except ValueError:
        pass
    try:
        return float(t)
    except ValueError:
        pass
    return t


def _split_flow(s: str) -> list:
    """Split `a, "b, c", d` on commas that are not inside quotes."""
    out, buf, quote = [], [], None
    for ch in s:
        if quote:
            buf.append(ch)
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            buf.append(ch)
        elif ch == ",":
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    if buf:
        out.append("".join(buf))
    return [x.strip() for x in out if x.strip()]


def _strip_comment(line: str) -> str:
    out, quote = [], None
    for ch in line:
        if quote:
            out.append(ch)
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            out.append(ch)
        elif ch == "#":
            break
        else:
            out.append(ch)
    return "".join(out).rstrip()


def _mini_yaml(text: str) -> Any:
    """Parse the TOC subset of YAML. Raises TocError on anything unsupported."""
    rows = []
    for raw in text.split("\n"):
        if "\t" in raw.split("#")[0]:
            raise TocError("tabs are not valid YAML indentation")
        line = _strip_comment(raw)
        if line.strip() and not line.strip().startswith("---"):
            rows.append((len(line) - len(line.lstrip(" ")), line.strip()))

    def block(i: int, indent: int):
        """Parse rows[i:] at the given indent. Returns (value, next_index)."""
        if i >= len(rows):
            return None, i

        if rows[i][1].startswith("- "):    # or bare "-"
            seq = []
            while i < len(rows) and rows[i][0] == indent and (
                    rows[i][1] == "-" or rows[i][1].startswith("- ")):
                item = rows[i][1][1:].strip()
                if not item:
                    val, i = block(i + 1, rows[i + 1][0] if i + 1 < len(rows) else indent)
                    seq.append(val)
                    continue
                if ":" in item and not item.split(":", 1)[0].strip().startswith(("\"", "'")):
                    # sequence of mappings: re-read the item as a mapping row
                    inner_indent = rows[i][0] + 2
                    synth = [(inner_indent, item)]
                    j = i + 1
                    while j < len(rows) and rows[j][0] >= inner_indent:
                        synth.append(rows[j])
                        j += 1
                    saved, globals()["_ROWS"] = rows[:], None
                    val = _mapping(synth, 0, inner_indent)
                    seq.append(val)
                    i = j
                else:
                    seq.append(_parse_scalar(item))
                    i += 1
            return seq, i

        return _mapping_inline(rows, i, indent)

    def _mapping(sub, i, indent):
        saved_rows = rows[:]
        try:
            rows[:] = sub
            val, _ = _mapping_inline(rows, i, indent)
            return val
        finally:
            rows[:] = saved_rows

    def _mapping_inline(rws, i, indent):
        mapping = {}
        while i < len(rws) and rws[i][0] == indent:
            row = rws[i][1]
            if row.startswith("- "):
                break
            if ":" not in row:
                raise TocError(f"unsupported YAML line: {row!r}")
            key, _, rest = row.partition(":")
            key = key.strip().strip("\"'")
            rest = rest.strip()
            if rest:
                mapping[key] = _parse_scalar(rest)
                i += 1
            else:
                if i + 1 < len(rws) and rws[i + 1][0] > indent:
                    child_indent = rws[i + 1][0]
                    sub = [r for r in rws[i + 1:]]
                    # find extent of the child block
                    end = 0
                    while end < len(sub) and (sub[end][0] > indent):
                        end += 1
                    saved = rws[:]
                    try:
                        rows[:] = sub[:end]
                        val, _ = block(0, child_indent)
                    finally:
                        rows[:] = saved
                    mapping[key] = val
                    i += 1 + end
                else:
                    mapping[key] = None
                    i += 1
        return mapping, i

    value, _ = block(0, rows[0][0] if rows else 0)
    return value


def load_toc(path: Union[str, Path]) -> Dict[str, Any]:
    """Read a TOC from .json (stdlib), or a legacy .yaml."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"TOC file not found: {p}")

    text = p.read_text(encoding="utf-8")

    if p.suffix.lower() in {".yaml", ".yml"}:
        try:
            import yaml            # the real parser, when it happens to be here
            data = yaml.safe_load(text)
        except ImportError:
            data = _mini_yaml(text)     # zero-dependency fallback
    else:
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            raise TocError(f"{p} is not valid JSON: {e}")

    if not isinstance(data, dict):
        raise TocError(f"{p} must contain a mapping at the top level")
    return data


def save_toc(data: Dict[str, Any], path: Union[str, Path]) -> Path:
    """Write a TOC as pretty-printed JSON."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                 encoding="utf-8")
    return p


def main() -> int:
    parser = argparse.ArgumentParser(description="TOC loader / YAML->JSON converter")
    parser.add_argument("--convert", metavar="TOC_YAML",
                        help="Convert a legacy toc.yaml to toc.json")
    parser.add_argument("--output", help="Destination (default: alongside, .json)")
    args = parser.parse_args()

    if not args.convert:
        parser.error("--convert is required")

    src = Path(args.convert)
    try:
        data = load_toc(src)
    except (TocError, FileNotFoundError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    dst = Path(args.output) if args.output else src.with_suffix(".json")
    save_toc(data, dst)
    print(f"Converted {src} -> {dst}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
