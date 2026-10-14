import json
import os
import subprocess
import sys
import tempfile
import unittest

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(SKILL_DIR, "scripts")
sys.path.insert(0, SCRIPTS)
sys.path.insert(0, os.path.join(SKILL_DIR, "tests"))

import render_one_page  # noqa: E402
import validate_one_page  # noqa: E402

from test_render_and_validate import FULL_SPEC, MINIMAL_SPEC  # noqa: E402

FIXTURE = os.path.join(SKILL_DIR, "tests", "fixtures", "folded-light-brews.json")


def load_fixture():
    with open(FIXTURE, encoding="utf-8") as f:
        return json.load(f)


def svg(body, view_box="0 0 200 200"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}">'
        f"<title>t 2026-09-24</title>{body}</svg>"
    )


class LayoutRenderTests(unittest.TestCase):
    def test_folded_light_brews_renders_valid(self):
        out = render_one_page.build_svg(load_fixture(), None)
        self.assertEqual(validate_one_page.validate(out), [])

    def test_example_specs_render_valid(self):
        for spec in (MINIMAL_SPEC, FULL_SPEC):
            out = render_one_page.build_svg(spec, None)
            self.assertEqual(validate_one_page.validate(out), [], spec["title"])

    def test_tier_font_sizes_scale_to_canvas(self):
        self.assertTrue(22 <= render_one_page.TIER_FONT_PX[1] <= 26)
        self.assertTrue(16 <= render_one_page.TIER_FONT_PX[2] <= 18)
        self.assertTrue(12 <= render_one_page.TIER_FONT_PX[3] <= 13)

    def test_over_long_tier1_callout_fails_with_named_error(self):
        spec = load_fixture()
        spec["callouts"][0]["text"] = " ".join(["sunbeam"] * 80)
        with self.assertRaisesRegex(render_one_page.FitError, "Core verb.*does not fit: redesign"):
            render_one_page.build_svg(spec, None)

    def test_crowded_cell_fails_with_named_error(self):
        spec = dict(MINIMAL_SPEC)
        text = "A callout of medium length that takes a few lines at tier one size."
        spec["callouts"] = [
            {"label": f"C{i}", "text": text, "tier": 1, "anchor": "w"} for i in range(4)
        ]
        with self.assertRaisesRegex(render_one_page.FitError, "C\\d.*does not fit: redesign"):
            render_one_page.build_svg(spec, None)

    def test_over_long_blocks_fail_with_named_error(self):
        long_text = " ".join(["letter"] * 300)
        cases = {
            "sidebar": {"sidebar": [long_text]},
            "description": {"description": long_text},
            "detail": {"detail": {"caption": "Close up", "notes": [long_text]}},
            "central caption": {"central": {"caption": long_text, "image_slot": True}},
            "purpose": {"purpose": long_text},
            "title": {"title": long_text},
        }
        for block, extra in cases.items():
            spec = dict(MINIMAL_SPEC, **extra)
            with self.assertRaisesRegex(render_one_page.FitError, f"^{block}.*does not fit: redesign"):
                render_one_page.build_svg(spec, None)

    def test_cli_exits_nonzero_naming_the_block(self):
        spec = load_fixture()
        spec["callouts"][4]["text"] = " ".join(["fold"] * 200)
        with tempfile.TemporaryDirectory() as td:
            spec_path = os.path.join(td, "spec.json")
            out_path = os.path.join(td, "out.svg")
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec, f)
            r = subprocess.run(
                [sys.executable, os.path.join(SCRIPTS, "render_one_page.py"), spec_path, "-o", out_path],
                capture_output=True, text=True,
            )
            self.assertNotEqual(r.returncode, 0)
            self.assertIn("Risk", r.stderr)
            self.assertIn("does not fit: redesign", r.stderr)
            self.assertFalse(os.path.exists(out_path))

    def test_cli_renders_fixture_and_validator_accepts_it(self):
        with tempfile.TemporaryDirectory() as td:
            out_path = os.path.join(td, "out.svg")
            r = subprocess.run(
                [sys.executable, os.path.join(SCRIPTS, "render_one_page.py"), FIXTURE, "-o", out_path],
                capture_output=True, text=True,
            )
            self.assertEqual(r.returncode, 0, r.stderr)
            v = subprocess.run(
                [sys.executable, os.path.join(SCRIPTS, "validate_one_page.py"), out_path],
                capture_output=True, text=True,
            )
            self.assertEqual(v.returncode, 0, v.stderr)


class LayoutValidateTests(unittest.TestCase):
    def assertReason(self, svg_text, fragment):
        reasons = validate_one_page.validate(svg_text)
        self.assertTrue(any(fragment in r for r in reasons), reasons)

    def test_rejects_text_outside_viewbox(self):
        self.assertReason(svg('<text x="190" y="50" font-size="12">far too wide text</text>'), "outside the canvas")

    def test_rejects_tspan_outside_viewbox(self):
        body = '<text x="10" y="50" font-size="12">ok<tspan x="10" y="260">below</tspan></text>'
        self.assertReason(svg(body), "outside the canvas")

    def test_rejects_overlapping_text(self):
        body = (
            '<text x="10" y="50" font-size="12">first line</text>'
            '<text x="20" y="54" font-size="12">second line</text>'
        )
        self.assertReason(svg(body), "overlaps text")

    def test_accepts_stacked_lines_at_line_height(self):
        body = (
            '<text x="10" y="50" font-size="12">first line</text>'
            '<text x="10" y="65" font-size="12">second line</text>'
        )
        self.assertEqual(validate_one_page.validate(svg(body)), [])

    def test_rejects_text_across_box_edge(self):
        body = (
            '<rect x="10" y="10" width="100" height="100" fill="none" stroke="#000"/>'
            '<text x="10" y="112" font-size="12">under the box edge</text>'
        )
        self.assertReason(svg(body), "overlaps box")

    def test_accepts_text_inside_box(self):
        body = (
            '<rect x="10" y="10" width="150" height="100" fill="none" stroke="#000"/>'
            '<text x="20" y="40" font-size="12">inside</text>'
        )
        self.assertEqual(validate_one_page.validate(svg(body)), [])

    def test_rejects_text_across_leader_line(self):
        body = (
            '<line x1="40" y1="0" x2="40" y2="200" stroke="#999"/>'
            '<text x="10" y="50" font-size="12">crossed by a line</text>'
        )
        self.assertReason(svg(body), "leader line")

    def test_rejects_off_center_central_illustration(self):
        body = (
            '<g id="central" data-content-area="0 0 200 200">'
            '<rect id="central-illustration" x="100" y="80" width="60" height="40"/></g>'
        )
        self.assertReason(svg(body), "central illustration")

    def test_accepts_centered_central_illustration(self):
        body = (
            '<g id="central" data-content-area="0 0 200 200">'
            '<rect id="central-illustration" x="70" y="80" width="60" height="40"/></g>'
        )
        self.assertEqual(validate_one_page.validate(svg(body)), [])


if __name__ == "__main__":
    unittest.main()
