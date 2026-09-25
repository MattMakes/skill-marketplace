import base64
import os
import sys
import tempfile
import unittest

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(SKILL_DIR, "scripts"))

import render_one_page  # noqa: E402
import validate_one_page  # noqa: E402


MINIMAL_SPEC = {
    "title": "Ember Garden",
    "purpose": "Show how a player tends a fire that spreads light.",
    "date": "2026-09-24",
}

FULL_SPEC = {
    "title": "Ember Garden — one-page design",
    "purpose": "Show how a player tends a fire that slowly spreads light across a dark garden.",
    "date": "2026-09-24",
    "version": "0.2",
    "central": {"caption": "The garden at midpoint, half lit by the fire", "image_slot": True},
    "callouts": [
        {"label": "Core verb", "text": "Feed the fire to push back the dark.", "tier": 1, "anchor": "n"},
        {"label": "Fun target", "text": "Sensation: the fire's crackle and glow.", "tier": 1, "anchor": "e"},
        {"label": "Loop", "text": "Gather fuel, feed fire, light reveals new fuel.", "tier": 2, "anchor": "se"},
        {"label": "Risk", "text": "Fuel-gathering could feel like a chore if paced wrong.", "tier": 2, "anchor": "sw"},
        {"label": "Scope note", "text": "One garden, one fire, no combat.", "tier": 3, "anchor": "w"},
    ],
    "detail": {
        "caption": "Fire-feeding interaction, close up",
        "notes": ["Tap fuel to carry it.", "Drop fuel near the fire to feed it.", "Fire dims without fuel."],
    },
    "sidebar": [
        "Solo dev, 4-week prototype",
        "Mobile, portrait",
        "Session: 5-10 minutes",
    ],
    "description": "A short, cozy game about tending a single fire that reveals a garden.",
    "footer": "Ember Garden v0.2 — 2026-09-24",
}


class RenderTests(unittest.TestCase):
    def test_minimal_spec_renders_valid_svg(self):
        svg = render_one_page.build_svg(MINIMAL_SPEC, None)
        reasons = validate_one_page.validate(svg)
        self.assertEqual(reasons, [])

    def test_full_spec_renders_valid_svg(self):
        svg = render_one_page.build_svg(FULL_SPEC, None)
        reasons = validate_one_page.validate(svg)
        self.assertEqual(reasons, [])
        self.assertIn("<title>Ember Garden", svg)

    def test_missing_key_art_draws_placeholder(self):
        svg = render_one_page.build_svg(FULL_SPEC, "/no/such/file.png")
        self.assertNotIn("<image", svg)
        self.assertIn("key art placeholder", svg)

    def test_present_key_art_embeds_data_uri(self):
        png_bytes = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        )
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(png_bytes)
            path = f.name
        try:
            svg = render_one_page.build_svg(FULL_SPEC, path)
            self.assertIn("<image", svg)
            self.assertIn("data:image/png;base64,", svg)
        finally:
            os.unlink(path)

    def test_xml_escaping_of_ampersand_and_lt(self):
        spec = dict(MINIMAL_SPEC)
        spec["title"] = "Salt & <Fire>"
        svg = render_one_page.build_svg(spec, None)
        self.assertIn("Salt &amp; &lt;Fire&gt;", svg)
        self.assertNotIn("Salt & <Fire>", svg)

    def test_deterministic_output(self):
        svg1 = render_one_page.build_svg(FULL_SPEC, None)
        svg2 = render_one_page.build_svg(FULL_SPEC, None)
        self.assertEqual(svg1, svg2)

    def test_font_floor_raises(self):
        with self.assertRaises(ValueError):
            render_one_page.text_lines_svg(["x"], 0, 0, 4)


class ValidateTests(unittest.TestCase):
    def test_rejects_svg_with_no_date(self):
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<title>No Date</title><text font-size="12">hi</text></svg>'
        )
        reasons = validate_one_page.validate(svg)
        self.assertTrue(any("date" in r for r in reasons))

    def test_rejects_svg_with_6px_font(self):
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<title>2026-09-24</title><text font-size="6">hi</text></svg>'
        )
        reasons = validate_one_page.validate(svg)
        self.assertTrue(any("font-size" in r for r in reasons))

    def test_rejects_svg_with_no_viewbox(self):
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg">'
            '<title>2026-09-24</title><text font-size="12">hi</text></svg>'
        )
        reasons = validate_one_page.validate(svg)
        self.assertTrue(any("viewBox" in r for r in reasons))

    def test_accepts_valid_svg(self):
        svg = render_one_page.build_svg(MINIMAL_SPEC, None)
        self.assertEqual(validate_one_page.validate(svg), [])


if __name__ == "__main__":
    unittest.main()
