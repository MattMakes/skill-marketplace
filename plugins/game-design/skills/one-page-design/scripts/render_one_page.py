#!/usr/bin/env python3
"""Render a Librande-style one-page-design JSON spec to a dated SVG.

Usage:
    python3 render_one_page.py <spec.json> -o <out.svg> [--key-art <path-to-png>]

Python 3 stdlib only. Deterministic: the same spec (and the same --key-art file,
or none) always produces byte-identical output.

Layout: a header band (title, date, purpose), a footer line, a description band
above the footer, a right column (sidebar, then the detail box) and a content
area that holds the central illustration, centered, with callouts in a 3x3 grid
of cells around it. Every text block is measured with one_page_geometry; a block
that does not fit its region stops the render with "<block> does not fit:
redesign". Text is never dropped.
"""
import argparse
import base64
import json
import mimetypes
import os
import re
import sys
from xml.sax.saxutils import escape as xml_escape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from one_page_geometry import (  # noqa: E402
    ASCENT_EM,
    block_height,
    layout_problems,
    line_height,
    text_width,
    wrap_text,
)

WIDTH = 1587
HEIGHT = 1123
MIN_FONT_PX = 8
MARGIN = 48
GAP = 32
PAD = 12
FONT_FAMILY = "Helvetica, Arial, sans-serif"

TIER_FONT_PX = {1: 24, 2: 17, 3: 13}
TIER_LABEL_FONT_PX = {1: 18, 2: 15, 3: 13}
TITLE_FONT_PX = 32
PURPOSE_FONT_PX = 16
DATE_FONT_PX = 14
CAPTION_FONT_PX = 14
PLACEHOLDER_FONT_PX = 16
SIDEBAR_HEAD_FONT_PX = 16
SIDEBAR_FONT_PX = 16
DETAIL_CAPTION_FONT_PX = 14
DETAIL_NOTE_FONT_PX = 13
DESCRIPTION_FONT_PX = 16
FOOTER_FONT_PX = 10

PURPOSE_MAX_LINES = 3
CAPTION_MAX_LINES = 3
DESCRIPTION_MAX_LINES = 4

COLUMN_W = 330
CENTRAL_W = 400
CENTRAL_H = 260

# Anchor -> (column, row) of the callout grid around the central illustration.
ANCHOR_CELL = {
    "nw": (0, 0), "n": (1, 0), "ne": (2, 0),
    "w": (0, 1), "e": (2, 1),
    "sw": (0, 2), "s": (1, 2), "se": (2, 2),
}


class FitError(ValueError):
    """Raised when a text block does not fit its region. The design must be cut."""


class CalloutFitError(FitError):
    """Raised when a callout's text does not fit its cell."""


def fit_error(block):
    return FitError(f"{block} does not fit: redesign")


def esc(text):
    return xml_escape(str(text), {'"': "&quot;"})


def text_lines_svg(lines, x, y, font_px, anchor="start", weight="normal", fill="#1a1a1a"):
    """Draw lines with the first baseline at y. Returns (svg, block height)."""
    if font_px < MIN_FONT_PX:
        raise ValueError(f"font size {font_px}px is below the {MIN_FONT_PX}px floor")
    out = []
    for i, line in enumerate(lines):
        out.append(
            f'<text x="{x:.1f}" y="{y + i * line_height(font_px):.1f}" font-size="{font_px}" '
            f'font-family="{FONT_FAMILY}" font-weight="{weight}" '
            f'text-anchor="{anchor}" fill="{fill}">{esc(line)}</text>'
        )
    return "\n".join(out), block_height(len(lines), font_px)


def block_svg(lines, x, top, font_px, anchor="start", weight="normal", fill="#1a1a1a"):
    """Draw lines whose first line's box starts at `top`. Returns (svg, bottom)."""
    svg, h = text_lines_svg(lines, x, top + ASCENT_EM * font_px, font_px, anchor, weight, fill)
    return svg, top + h


def widest(lines, font_px, weight="normal"):
    return max((text_width(line, font_px, weight) for line in lines), default=0.0)


def bullet_lines(text, prefix, max_width, font_px):
    lines = wrap_text(text, max_width - text_width(prefix, font_px), font_px)
    return [prefix + lines[0]] + lines[1:] if lines else []


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


def render_header(spec):
    """Title, date and purpose. Returns (svg, bottom y of the band)."""
    title = spec["title"]
    date_label = spec["date"] + (f"  v{spec['version']}" if spec.get("version") else "")
    parts = []
    title_top = MARGIN
    title_room = WIDTH - 2 * MARGIN - text_width(date_label, DATE_FONT_PX) - GAP
    if text_width(title, TITLE_FONT_PX, "bold") > title_room:
        raise fit_error("title")
    svg, bottom = block_svg([title], MARGIN, title_top, TITLE_FONT_PX, weight="bold")
    parts.append(svg)
    title_baseline = title_top + ASCENT_EM * TITLE_FONT_PX
    svg, _ = text_lines_svg([date_label], WIDTH - MARGIN, title_baseline, DATE_FONT_PX, anchor="end")
    parts.append(svg)

    purpose_lines = wrap_text(spec["purpose"], WIDTH - 2 * MARGIN, PURPOSE_FONT_PX)
    if len(purpose_lines) > PURPOSE_MAX_LINES:
        raise fit_error("purpose")
    svg, bottom = block_svg(purpose_lines, MARGIN, bottom + 10, PURPOSE_FONT_PX)
    parts.append(svg)
    return "\n".join(parts), bottom


def render_footer(spec):
    """Date bottom-left, footer bottom-right. Returns (svg, top y of the line)."""
    baseline = HEIGHT - 24
    parts = []
    svg, _ = text_lines_svg([spec["date"]], MARGIN, baseline, FOOTER_FONT_PX, fill="#666666")
    parts.append(svg)
    footer = spec.get("footer", "")
    if footer:
        room = WIDTH - 2 * MARGIN - text_width(spec["date"], FOOTER_FONT_PX) - GAP
        if text_width(footer, FOOTER_FONT_PX) > room:
            raise fit_error("footer")
        svg, _ = text_lines_svg([footer], WIDTH - MARGIN, baseline, FOOTER_FONT_PX, anchor="end", fill="#666666")
        parts.append(svg)
    return "\n".join(parts), baseline - ASCENT_EM * FOOTER_FONT_PX


def render_description(description, bottom):
    """Description band ending at `bottom`. Returns (svg, top y of the band)."""
    if not description:
        return "", bottom
    lines = wrap_text(description, WIDTH - 2 * MARGIN, DESCRIPTION_FONT_PX)
    if len(lines) > DESCRIPTION_MAX_LINES:
        raise fit_error("description")
    top = bottom - block_height(len(lines), DESCRIPTION_FONT_PX)
    svg, _ = block_svg(lines, MARGIN, top, DESCRIPTION_FONT_PX)
    return svg, top


def render_column(sidebar, detail, x, top, bottom):
    """Sidebar, then the detail box, in the right column between top and bottom."""
    parts = []
    cursor = top
    if sidebar:
        svg, cursor = block_svg(["SIDEBAR"], x, cursor, SIDEBAR_HEAD_FONT_PX, weight="bold")
        parts.append(svg)
        for bullet in sidebar:
            lines = bullet_lines(bullet, "• ", COLUMN_W, SIDEBAR_FONT_PX)
            if widest(lines, SIDEBAR_FONT_PX) > COLUMN_W:
                raise fit_error("sidebar")
            svg, cursor = block_svg(lines, x, cursor + 10, SIDEBAR_FONT_PX)
            parts.append(svg)
        if cursor > bottom:
            raise fit_error("sidebar")
        cursor += GAP
    if detail:
        inner = COLUMN_W - 2 * PAD
        texts = []
        y = cursor + PAD
        caption = detail.get("caption", "")
        if caption:
            lines = wrap_text(caption, inner, DETAIL_CAPTION_FONT_PX, "bold")
            if widest(lines, DETAIL_CAPTION_FONT_PX, "bold") > inner:
                raise fit_error("detail")
            svg, y = block_svg(lines, x + PAD, y, DETAIL_CAPTION_FONT_PX, weight="bold")
            texts.append(svg)
            y += 6
        for note in detail.get("notes", []):
            lines = bullet_lines(note, "- ", inner, DETAIL_NOTE_FONT_PX)
            if widest(lines, DETAIL_NOTE_FONT_PX) > inner:
                raise fit_error("detail")
            svg, y = block_svg(lines, x + PAD, y, DETAIL_NOTE_FONT_PX)
            texts.append(svg)
            y += 6
        box_bottom = y - 6 + PAD
        if box_bottom > bottom:
            raise fit_error("detail")
        parts.append(
            f'<rect id="detail" x="{x:.1f}" y="{cursor:.1f}" width="{COLUMN_W}" '
            f'height="{box_bottom - cursor:.1f}" fill="#fafafa" stroke="#666666" stroke-width="1"/>'
        )
        parts.extend(texts)
    return "\n".join(parts)


def render_central(spec, key_art_path, area):
    """Central illustration centered in `area`, caption below it.
    Returns (svg, image box, target box that leader lines end on)."""
    central = spec.get("central") or {}
    caption = central.get("caption", "")
    ax0, ay0, ax1, ay1 = area
    x = (ax0 + ax1) / 2 - CENTRAL_W / 2
    y = (ay0 + ay1) / 2 - CENTRAL_H / 2
    image = (x, y, x + CENTRAL_W, y + CENTRAL_H)
    caption_lines = wrap_text(caption, CENTRAL_W, CAPTION_FONT_PX) if caption else []
    if len(caption_lines) > CAPTION_MAX_LINES or widest(caption_lines, CAPTION_FONT_PX) > CENTRAL_W:
        raise fit_error("central caption")
    target_bottom = image[3] + (10 + block_height(len(caption_lines), CAPTION_FONT_PX) + 6 if caption_lines else 0)
    if image[1] < ay0 or target_bottom > ay1 or image[0] < ax0:
        raise fit_error("central illustration")

    area_attr = f"{ax0:.1f} {ay0:.1f} {ax1 - ax0:.1f} {ay1 - ay0:.1f}"
    parts = [f'<g id="central" data-content-area="{area_attr}">']
    parts.append(
        f'<rect id="central-illustration" x="{x:.1f}" y="{y:.1f}" width="{CENTRAL_W}" height="{CENTRAL_H}" '
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
        svg, _ = text_lines_svg([label], x + CENTRAL_W / 2, y + CENTRAL_H / 2, PLACEHOLDER_FONT_PX, anchor="middle")
        parts.append(svg)
    if caption_lines:
        svg, _ = block_svg(caption_lines, x + CENTRAL_W / 2, image[3] + 10, CAPTION_FONT_PX, anchor="middle")
        parts.append(svg)
    parts.append("</g>")
    return "\n".join(parts), image, (image[0], image[1], image[2], target_bottom)


def measure_callout(callout, index, max_width):
    """Wrap a callout for a box at most max_width wide. Returns a dict with its lines and size."""
    tier = int(callout.get("tier", 3))
    tier = tier if tier in (1, 2, 3) else 3
    label = callout.get("label", "")
    text = callout.get("text", "")
    name = label or text[:40] or f"callout #{index + 1}"
    inner = max_width - 2 * PAD
    font_px = TIER_FONT_PX[tier]
    label_px = TIER_LABEL_FONT_PX[tier]
    label_lines = wrap_text(label, inner, label_px, "bold") if label and inner > 0 else ([label] if label else [])
    body_lines = wrap_text(text, inner, font_px) if inner > 0 else [text]
    w = max(widest(label_lines, label_px, "bold"), widest(body_lines, font_px)) + 2 * PAD
    if inner <= 0 or w > max_width:
        raise CalloutFitError(f"callout {name!r} does not fit: redesign")
    h = 2 * PAD + block_height(len(label_lines), label_px) + block_height(len(body_lines), font_px)
    if label_lines and body_lines:
        h += 6
    return {"name": name, "w": w, "h": h, "label_lines": label_lines, "label_px": label_px,
            "body_lines": body_lines, "font_px": font_px}


def facing(a0, a1, b0, b1):
    """Leader-line coordinates on one axis between ranges [a0, a1] and [b0, b1]."""
    lo, hi = max(a0, b0), min(a1, b1)
    if lo <= hi:
        mid = (lo + hi) / 2
        return mid, mid
    return (a1, b0) if a1 < b0 else (a0, b1)


def draw_callout(index, m, box, target):
    x0, y0, x1, y1 = box
    lx1, lx2 = facing(x0, x1, target[0], target[2])
    ly1, ly2 = facing(y0, y1, target[1], target[3])
    parts = [
        f'<line x1="{lx1:.1f}" y1="{ly1:.1f}" x2="{lx2:.1f}" y2="{ly2:.1f}" stroke="#999999" stroke-width="1"/>',
        f'<rect id="callout-{index + 1}" x="{x0:.1f}" y="{y0:.1f}" width="{x1 - x0:.1f}" height="{y1 - y0:.1f}" '
        f'fill="#ffffff" stroke="#cccccc" stroke-width="1"/>',
    ]
    cursor = y0 + PAD
    if m["label_lines"]:
        svg, cursor = block_svg(m["label_lines"], x0 + PAD, cursor, m["label_px"], weight="bold")
        parts.append(svg)
        cursor += 6
    if m["body_lines"]:
        svg, _ = block_svg(m["body_lines"], x0 + PAD, cursor, m["font_px"])
        parts.append(svg)
    return "\n".join(parts)


def align(start, end, size, where):
    """Start coordinate of a run of `size` inside [start, end]: 'start', 'end' or 'center'."""
    if where == "start":
        return start
    if where == "end":
        return end - size
    return (start + end - size) / 2


def render_callouts(callouts, image, target, area):
    ax0, ay0, ax1, ay1 = area
    cols = [(ax0, image[0] - GAP), (image[0], image[2]), (image[2] + GAP, ax1)]
    rows = [(ay0, image[1] - GAP), (image[1], target[3]), (target[3] + GAP, ay1)]
    col_align = ["end", "center", "start"]
    row_align = ["end", "center", "start"]

    cells = {}
    for i, callout in enumerate(callouts):
        cell = ANCHOR_CELL.get(callout.get("anchor", "n"), ANCHOR_CELL["n"])
        cells.setdefault(cell, []).append((i, callout))

    parts = []
    for (c, r), items in sorted(cells.items(), key=lambda kv: kv[1][0][0]):
        cx0, cx1 = cols[c]
        cy0, cy1 = rows[r]
        cell_w, cell_h = cx1 - cx0, cy1 - cy0
        if c == 1:
            # Above or below the illustration: boxes side by side.
            k = len(items)
            each = (cell_w - GAP * (k - 1)) / k
            measured = [(i, measure_callout(cb, i, each)) for i, cb in items]
            for i, m in measured:
                if m["h"] > cell_h:
                    raise CalloutFitError(f"callout {m['name']!r} does not fit: redesign")
            total_w = sum(m["w"] for _, m in measured) + GAP * (k - 1)
            x = align(cx0, cx1, total_w, "center")
            for i, m in measured:
                y = align(cy0, cy1, m["h"], row_align[r])
                parts.append(draw_callout(i, m, (x, y, x + m["w"], y + m["h"]), target))
                x += m["w"] + GAP
        else:
            # Left or right of the illustration: boxes stacked.
            measured = [(i, measure_callout(cb, i, cell_w)) for i, cb in items]
            used = 0.0
            for n, (i, m) in enumerate(measured):
                used += m["h"] + (GAP / 2 if n else 0)
                if used > cell_h:
                    raise CalloutFitError(f"callout {m['name']!r} does not fit: redesign")
            y = align(cy0, cy1, used, row_align[r])
            for i, m in measured:
                x = align(cx0, cx1, m["w"], col_align[c])
                parts.append(draw_callout(i, m, (x, y, x + m["w"], y + m["h"]), target))
                y += m["h"] + GAP / 2
    return "\n".join(parts)


def build_svg(spec, key_art_path):
    title = spec["title"]

    header_svg, header_bottom = render_header(spec)
    footer_svg, footer_top = render_footer(spec)
    description_svg, description_top = render_description(spec.get("description", ""), footer_top - 16)

    content_top = header_bottom + GAP
    content_bottom = description_top - GAP
    sidebar = spec.get("sidebar") or []
    detail = spec.get("detail")
    content_right = WIDTH - MARGIN
    column_svg = ""
    if sidebar or detail:
        column_x = WIDTH - MARGIN - COLUMN_W
        column_svg = render_column(sidebar, detail, column_x, content_top, content_bottom)
        content_right = column_x - GAP
    area = (MARGIN, content_top, content_right, content_bottom)

    central_svg, image, target = render_central(spec, key_art_path, area)
    callouts_svg = render_callouts(spec.get("callouts") or [], image, target, area)

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" \
viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}">
<title>{esc(title)}</title>
<rect x="0" y="0" width="{WIDTH}" height="{HEIGHT}" fill="#ffffff"/>
{header_svg}
{callouts_svg}
{central_svg}
{column_svg}
{description_svg}
{footer_svg}
</svg>
'''
    problems = layout_problems(svg)
    if problems:
        raise FitError(f"layout does not fit: {problems[0]}: redesign")
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
    except FitError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    with open(args.out, "w", encoding="utf-8") as f:
        f.write(svg)


if __name__ == "__main__":
    main()
