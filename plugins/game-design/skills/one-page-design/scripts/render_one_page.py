#!/usr/bin/env python3
"""Render a Librande-style one-page-design JSON spec to a dated SVG.

Usage:
    python3 render_one_page.py <spec.json> -o <out.svg> [--key-art <path-to-png>]

Python 3 stdlib only. Deterministic: the same spec (and the same --key-art file,
or none) always produces byte-identical output.
"""
import argparse
import base64
import json
import mimetypes
import os
import re
import sys
from xml.sax.saxutils import escape as xml_escape

WIDTH = 1587
HEIGHT = 1123
MIN_FONT_PX = 8

TIER_FONT_PX = {1: 22, 2: 16, 3: 10}
TIER_LABEL_FONT_PX = {1: 16, 2: 13, 3: 10}
TIER_CHARS_PER_LINE = {1: 26, 2: 30, 3: 34}
# A callout box grows past these preferred sizes rather than truncate its text.
# TIER_REGION_MAX_LINES is the hard limit for that growth (double the preferred
# size): past it the text no longer fits its region and the render fails.
TIER_MAX_LINES = {1: 4, 2: 5, 3: 6}
TIER_REGION_MAX_LINES = {tier: n * 2 for tier, n in TIER_MAX_LINES.items()}


class CalloutFitError(ValueError):
    """Raised when a callout's text does not fit its region even after growing."""

ANCHOR_DIRECTION = {
    "n": (0.0, -1.0),
    "ne": (0.72, -0.72),
    "e": (1.0, 0.0),
    "se": (0.72, 0.72),
    "s": (0.0, 1.0),
    "sw": (-0.72, 0.72),
    "w": (-1.0, 0.0),
    "nw": (-0.72, -0.72),
}

CENTER_X = WIDTH * 0.5
CENTER_Y = HEIGHT * 0.46
CENTRAL_W = 420
CENTRAL_H = 300
CALLOUT_RADIUS_X = 470
CALLOUT_RADIUS_Y = 300
CALLOUT_BOX_W = 260


def wrap_text(text, chars_per_line):
    """Estimate word wrap by character-count-per-line. Wraps onto as many
    lines as the text needs; never truncates."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if len(candidate) <= chars_per_line or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def esc(text):
    return xml_escape(str(text), {'"': "&quot;"})


def text_lines_svg(lines, x, y, font_px, anchor="start", weight="normal"):
    if font_px < MIN_FONT_PX:
        raise ValueError(f"font size {font_px}px is below the {MIN_FONT_PX}px floor")
    line_height = font_px * 1.25
    out = []
    for i, line in enumerate(lines):
        out.append(
            f'<text x="{x:.1f}" y="{y + i * line_height:.1f}" font-size="{font_px}" '
            f'font-family="Helvetica, Arial, sans-serif" font-weight="{weight}" '
            f'text-anchor="{anchor}" fill="#1a1a1a">{esc(line)}</text>'
        )
    return "\n".join(out), len(lines) * line_height


def load_key_art_data_uri(path):
    if not path or not os.path.isfile(path):
        return None
    mime, _ = mimetypes.guess_type(path)
    if not mime:
        mime = "image/png"
    with open(path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def render_central(spec, key_art_path):
    central = spec.get("central") or {}
    caption = central.get("caption", "")
    x = CENTER_X - CENTRAL_W / 2
    y = CENTER_Y - CENTRAL_H / 2
    parts = [f'<g id="central">']
    parts.append(
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{CENTRAL_W}" height="{CENTRAL_H}" '
        f'fill="#f2f2f2" stroke="#333333" stroke-width="2"/>'
    )
    data_uri = load_key_art_data_uri(key_art_path)
    if central.get("image_slot") and data_uri:
        parts.append(
            f'<image x="{x:.1f}" y="{y:.1f}" width="{CENTRAL_W}" height="{CENTRAL_H}" '
            f'href="{data_uri}" preserveAspectRatio="xMidYMid slice"/>'
        )
        parts.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{CENTRAL_W}" height="{CENTRAL_H}" '
            f'fill="none" stroke="#333333" stroke-width="2"/>'
        )
    else:
        label = "key art placeholder" if central.get("image_slot") else "central illustration"
        lines, _ = text_lines_svg(
            [label], CENTER_X, CENTER_Y, 16, anchor="middle"
        )
        parts.append(lines)
    if caption:
        lines, _ = text_lines_svg(
            wrap_text(caption, 60), CENTER_X, y + CENTRAL_H + 24, 14, anchor="middle"
        )
        parts.append(lines)
    parts.append("</g>")
    return "\n".join(parts)


def render_callouts(callouts):
    parts = []
    for i, callout in enumerate(callouts):
        tier = int(callout.get("tier", 3))
        tier = tier if tier in (1, 2, 3) else 3
        anchor = callout.get("anchor", "n")
        dx, dy = ANCHOR_DIRECTION.get(anchor, ANCHOR_DIRECTION["n"])
        box_cx = CENTER_X + dx * CALLOUT_RADIUS_X
        box_cy = CENTER_Y + dy * CALLOUT_RADIUS_Y
        text_anchor = "middle"
        if dx > 0.3:
            text_anchor = "start"
        elif dx < -0.3:
            text_anchor = "end"
        edge_x = CENTER_X + dx * (CENTRAL_W / 2)
        edge_y = CENTER_Y + dy * (CENTRAL_H / 2)
        parts.append(
            f'<line x1="{edge_x:.1f}" y1="{edge_y:.1f}" x2="{box_cx:.1f}" y2="{box_cy:.1f}" '
            f'stroke="#999999" stroke-width="1"/>'
        )
        label = callout.get("label", "")
        text = callout.get("text", "")
        font_px = TIER_FONT_PX[tier]
        label_font_px = TIER_LABEL_FONT_PX[tier]
        chars = TIER_CHARS_PER_LINE[tier]
        text_x = box_cx
        y_cursor = box_cy
        if label:
            label_svg, used = text_lines_svg([label], text_x, y_cursor, label_font_px, anchor=text_anchor, weight="bold")
            parts.append(label_svg)
            y_cursor += used + 4
        body_lines = wrap_text(text, chars)
        if len(body_lines) > TIER_REGION_MAX_LINES[tier]:
            name = label or text[:40] or f"callout #{i + 1}"
            raise CalloutFitError(f"callout {name!r} does not fit: redesign")
        body_svg, _ = text_lines_svg(body_lines, text_x, y_cursor, font_px, anchor=text_anchor)
        parts.append(body_svg)
    return "\n".join(parts)


def render_sidebar(sidebar):
    if not sidebar:
        return ""
    x = WIDTH - 330
    y = 140
    parts = [f'<text x="{x}" y="{y}" font-size="16" font-family="Helvetica, Arial, sans-serif" font-weight="bold" fill="#1a1a1a">SIDEBAR</text>']
    cursor_y = y + 28
    for bullet in sidebar:
        lines = wrap_text(bullet, 40)
        svg, used = text_lines_svg(
            [f"• {lines[0]}"] + lines[1:], x, cursor_y, 13
        )
        parts.append(svg)
        cursor_y += used + 8
    return "\n".join(parts)


def render_detail(detail):
    if not detail:
        return ""
    x = 60
    y = HEIGHT - 260
    w = 420
    h = 200
    parts = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fafafa" stroke="#666666" stroke-width="1"/>'
    ]
    caption = detail.get("caption", "")
    cursor_y = y + 24
    if caption:
        svg, used = text_lines_svg([caption], x + 12, cursor_y, 13, weight="bold")
        parts.append(svg)
        cursor_y += used + 6
    for note in detail.get("notes", []):
        lines = wrap_text(note, 55)
        svg, used = text_lines_svg([f"- {lines[0]}"] + lines[1:], x + 12, cursor_y, 11)
        parts.append(svg)
        cursor_y += used + 4
    return "\n".join(parts)


def render_description(description):
    if not description:
        return ""
    x = 60
    y = HEIGHT - 60
    lines = wrap_text(description, 140)
    svg, _ = text_lines_svg(lines, x, y, 13)
    return svg


def build_svg(spec, key_art_path):
    title = spec["title"]
    purpose = spec["purpose"]
    date = spec["date"]
    version = spec.get("version", "")
    footer = spec.get("footer", "")

    header = []
    header.append(
        f'<text x="60" y="56" font-size="30" font-family="Helvetica, Arial, sans-serif" '
        f'font-weight="bold" fill="#1a1a1a">{esc(title)}</text>'
    )
    purpose_lines = wrap_text(purpose, 140)
    svg, _ = text_lines_svg(purpose_lines, 60, 82, 14)
    header.append(svg)
    date_label = f"{date}" + (f"  v{version}" if version else "")
    header.append(
        f'<text x="{WIDTH - 60}" y="56" font-size="14" font-family="Helvetica, Arial, sans-serif" '
        f'text-anchor="end" fill="#1a1a1a">{esc(date_label)}</text>'
    )

    body = [
        render_central(spec, key_art_path),
        render_callouts(spec.get("callouts") or []),
        render_sidebar(spec.get("sidebar") or []),
        render_detail(spec.get("detail")),
        render_description(spec.get("description", "")),
    ]

    footer_svg = ""
    if footer:
        footer_svg = (
            f'<text x="{WIDTH - 60}" y="{HEIGHT - 20}" font-size="10" '
            f'font-family="Helvetica, Arial, sans-serif" text-anchor="end" fill="#666666">'
            f"{esc(footer)}</text>"
        )

    date_svg = (
        f'<text x="60" y="{HEIGHT - 20}" font-size="10" font-family="Helvetica, Arial, sans-serif" '
        f'fill="#666666">{esc(date)}</text>'
    )

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" \
viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}">
<title>{esc(title)}</title>
<rect x="0" y="0" width="{WIDTH}" height="{HEIGHT}" fill="#ffffff"/>
{chr(10).join(header)}
{chr(10).join(body)}
{date_svg}
{footer_svg}
</svg>
'''
    return svg


def validate_spec(spec):
    for field in ("title", "purpose", "date"):
        if not spec.get(field):
            raise ValueError(f"spec is missing required field '{field}'")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", spec["date"]):
        raise ValueError(f"spec date '{spec['date']}' is not YYYY-MM-DD")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec", help="path to the JSON spec")
    parser.add_argument("-o", "--out", required=True, help="path to write the SVG")
    parser.add_argument("--key-art", default=None, help="path to a PNG/JPEG for the central slot")
    args = parser.parse_args()

    with open(args.spec, "r", encoding="utf-8") as f:
        spec = json.load(f)

    validate_spec(spec)
    try:
        svg = build_svg(spec, args.key_art)
    except CalloutFitError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    with open(args.out, "w", encoding="utf-8") as f:
        f.write(svg)


if __name__ == "__main__":
    main()
