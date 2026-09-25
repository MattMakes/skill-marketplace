"""Shared text-measurement and overlap geometry for the one-page renderer and validator.

Both scripts use this one model, so a layout the renderer accepts is a layout the
validator accepts. Python 3 stdlib only.

Text model: Helvetica/Arial, average glyph width CHAR_WIDTH_EM[weight] * font size.
A line's box runs from ASCENT_EM above the baseline to DESCENT_EM below it; lines in a
block are LINE_HEIGHT_EM apart, so stacked lines never overlap.
"""
import math
import re
import xml.etree.ElementTree as ET

CHAR_WIDTH_EM = {"normal": 0.55, "bold": 0.6}
ASCENT_EM = 0.8
DESCENT_EM = 0.25
LINE_HEIGHT_EM = 1.25
DEFAULT_FONT_PX = 16
CENTER_TOLERANCE = 0.05


def text_width(text, font_px, weight="normal"):
    return len(text) * font_px * CHAR_WIDTH_EM.get(weight, CHAR_WIDTH_EM["normal"])


def line_height(font_px):
    return font_px * LINE_HEIGHT_EM


def block_height(n_lines, font_px):
    """Height from the first line's top to the last line's bottom."""
    if n_lines <= 0:
        return 0.0
    return (n_lines - 1) * line_height(font_px) + (ASCENT_EM + DESCENT_EM) * font_px


def wrap_text(text, max_width, font_px, weight="normal"):
    """Word-wrap to max_width px. Never drops a word; a word wider than max_width
    gets a line of its own (the caller sees it as too wide)."""
    chars = max(1, int(max_width // (font_px * CHAR_WIDTH_EM.get(weight, CHAR_WIDTH_EM["normal"]))))
    lines = []
    current = ""
    for word in str(text).split():
        candidate = (current + " " + word).strip()
        if len(candidate) <= chars or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text_bbox(x, y, text, font_px, anchor="start", weight="normal"):
    """(x0, y0, x1, y1) for one line of text drawn with its baseline at y."""
    w = text_width(text, font_px, weight)
    if anchor == "middle":
        x0 = x - w / 2
    elif anchor == "end":
        x0 = x - w
    else:
        x0 = x
    return (x0, y - ASCENT_EM * font_px, x0 + w, y + DESCENT_EM * font_px)


def intersects(a, b):
    """True when two boxes share a region of positive area."""
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def contains(outer, inner):
    return outer[0] <= inner[0] and outer[1] <= inner[1] and inner[2] <= outer[2] and inner[3] <= outer[3]


def segment_hits_box(p1, p2, box):
    """Liang-Barsky clip: True when the segment p1-p2 passes through the box interior."""
    x1, y1 = p1
    dx, dy = p2[0] - x1, p2[1] - y1
    t0, t1 = 0.0, 1.0
    for p, q in ((-dx, x1 - box[0]), (dx, box[2] - x1), (-dy, y1 - box[1]), (dy, box[3] - y1)):
        if p == 0:
            if q <= 0:
                return False
            continue
        t = q / p
        if p < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
        if t0 >= t1:
            return False
    return True


def _num(value, default=0.0):
    if value is None:
        return default
    m = re.match(r"\s*(-?[\d.]+)", str(value))
    return float(m.group(1)) if m else default


def _local(tag):
    return tag.split("}")[-1]


def parse_elements(svg_text):
    """Read the drawn primitives from an SVG string.

    Returns (view_box, texts, boxes, lines, central) where texts are (label, bbox),
    boxes are (name, bbox), lines are ((x1, y1), (x2, y2)) and central is
    (content_area, illustration_bbox) or None. Raises ET.ParseError on bad XML.
    """
    root = ET.fromstring(svg_text)
    vb = [_num(v) for v in (root.get("viewBox") or "").replace(",", " ").split()]
    view_box = (vb[0], vb[1], vb[0] + vb[2], vb[1] + vb[3]) if len(vb) == 4 else None

    texts, boxes, lines = [], [], []
    central_area = None
    central_box = None

    def add_text(content, x, y, size, anchor, weight):
        content = (content or "").strip()
        if content:
            texts.append((content, text_bbox(x, y, content, size, anchor, weight)))

    for el in root.iter():
        tag = _local(el.tag)
        if tag == "text":
            x, y = _num(el.get("x")), _num(el.get("y"))
            size = _num(el.get("font-size"), DEFAULT_FONT_PX)
            anchor = el.get("text-anchor", "start")
            weight = "bold" if el.get("font-weight") in ("bold", "700", "800", "900") else "normal"
            add_text(el.text, x, y, size, anchor, weight)
            for span in el:
                if _local(span.tag) != "tspan":
                    continue
                sx, sy = _num(span.get("x"), x), _num(span.get("y"), y)
                s_size = _num(span.get("font-size"), size)
                s_anchor = span.get("text-anchor", anchor)
                s_weight = weight
                if span.get("font-weight"):
                    s_weight = "bold" if span.get("font-weight") in ("bold", "700", "800", "900") else "normal"
                add_text(span.text, sx, sy, s_size, s_anchor, s_weight)
        elif tag in ("rect", "image"):
            x, y = _num(el.get("x")), _num(el.get("y"))
            box = (x, y, x + _num(el.get("width")), y + _num(el.get("height")))
            name = el.get("id") or f"{tag} at ({x:.0f}, {y:.0f})"
            boxes.append((name, box))
            if el.get("id") == "central-illustration":
                central_box = box
        elif tag == "line":
            lines.append(((_num(el.get("x1")), _num(el.get("y1"))), (_num(el.get("x2")), _num(el.get("y2")))))
        elif tag == "g" and el.get("id") == "central" and el.get("data-content-area"):
            a = [_num(v) for v in el.get("data-content-area").replace(",", " ").split()]
            if len(a) == 4:
                central_area = (a[0], a[1], a[0] + a[2], a[1] + a[3])

    central = (central_area, central_box) if central_box is not None else None
    return view_box, texts, boxes, lines, central


def _short(label):
    return label if len(label) <= 32 else label[:31] + "…"


def layout_problems(svg_text):
    """Every geometry problem in the SVG, one sentence each. Empty list = clean."""
    view_box, texts, boxes, lines, central = parse_elements(svg_text)
    problems = []

    if view_box:
        for label, bb in texts:
            if not contains(view_box, bb):
                problems.append(f"text {_short(label)!r} is outside the canvas")
        for name, bb in boxes:
            if not contains(view_box, bb):
                problems.append(f"box {name} is outside the canvas")
        for p1, p2 in lines:
            if not (contains(view_box, (p1[0], p1[1], p1[0], p1[1])) and contains(view_box, (p2[0], p2[1], p2[0], p2[1]))):
                problems.append(f"line from ({p1[0]:.0f}, {p1[1]:.0f}) is outside the canvas")

    for i, (label_a, a) in enumerate(texts):
        for label_b, b in texts[i + 1:]:
            if intersects(a, b):
                problems.append(f"text {_short(label_a)!r} overlaps text {_short(label_b)!r}")
        for name, bb in boxes:
            if intersects(a, bb) and not contains(bb, a):
                problems.append(f"text {_short(label_a)!r} overlaps box {name}")
        for p1, p2 in lines:
            if segment_hits_box(p1, p2, a):
                problems.append(f"text {_short(label_a)!r} crosses a leader line")

    for i, (name_a, a) in enumerate(boxes):
        for name_b, b in boxes[i + 1:]:
            if intersects(a, b) and not contains(a, b) and not contains(b, a):
                problems.append(f"box {name_a} overlaps box {name_b}")

    if central is not None:
        area, box = central
        if area is None:
            problems.append("central illustration has no data-content-area to center in")
        else:
            cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
            ax, ay = (area[0] + area[2]) / 2, (area[1] + area[3]) / 2
            if (math.fabs(cx - ax) > CENTER_TOLERANCE * (area[2] - area[0])
                    or math.fabs(cy - ay) > CENTER_TOLERANCE * (area[3] - area[1])):
                problems.append(
                    f"central illustration center ({cx:.0f}, {cy:.0f}) is more than "
                    f"{CENTER_TOLERANCE:.0%} from the content-area center ({ax:.0f}, {ay:.0f})"
                )

    return problems
