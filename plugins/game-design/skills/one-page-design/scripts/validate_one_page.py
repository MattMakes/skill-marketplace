#!/usr/bin/env python3
"""Validate a one-page-design SVG.

Usage:
    python3 validate_one_page.py <out.svg>

Exit 0 = valid. Non-zero = invalid, with one reason per line on stderr.

Besides the title, date, font floor and viewBox checks, it measures every text
line with the renderer's model (one_page_geometry) and rejects text outside the
canvas, text overlapping text, text across a box edge, text crossed by a leader
line, and a central illustration more than 5% off its content-area center.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from one_page_geometry import layout_problems  # noqa: E402

DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
FONT_SIZE_RE = re.compile(r'font-size="([\d.]+)"')
TRUNCATED_TEXT_RE = re.compile(r"<text[^>]*>[^<]*…\s*</text>")
MIN_FONT_PX = 8


def validate(svg_text):
    reasons = []

    try:
        root = ET.fromstring(svg_text)
    except ET.ParseError as e:
        return [f"not well-formed XML: {e}"]

    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"

    title_el = root.find(f"{ns}title")
    has_title_element = title_el is not None and (title_el.text or "").strip()
    has_title_text_node = bool(re.search(r"<text[^>]*>[^<]*\S[^<]*</text>", svg_text))
    if not has_title_element and not has_title_text_node:
        reasons.append("no <title> element and no text node found")

    if not DATE_RE.search(svg_text):
        reasons.append("no date string matching YYYY-MM-DD found")

    for match in FONT_SIZE_RE.finditer(svg_text):
        size = float(match.group(1))
        if size < MIN_FONT_PX:
            reasons.append(f"font-size {size}px is below the {MIN_FONT_PX}px floor")

    view_box = root.get("viewBox")
    if not view_box:
        reasons.append("svg root has no viewBox attribute")

    if TRUNCATED_TEXT_RE.search(svg_text):
        reasons.append("a text node ends in an ellipsis (…), text was truncated")

    reasons.extend(layout_problems(svg_text))

    return reasons


def main():
    if len(sys.argv) != 2:
        print("usage: validate_one_page.py <out.svg>", file=sys.stderr)
        sys.exit(2)

    path = sys.argv[1]
    with open(path, "r", encoding="utf-8") as f:
        svg_text = f.read()

    reasons = validate(svg_text)
    if reasons:
        for reason in reasons:
            print(reason, file=sys.stderr)
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
