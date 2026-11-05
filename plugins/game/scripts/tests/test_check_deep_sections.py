import os
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, SCRIPTS)

import check_deep_sections as cds  # noqa: E402

FIXTURE = os.path.join(SCRIPTS, "tests", "fixtures", "valid_design.md")
CLI = os.path.join(SCRIPTS, "check_deep_sections.py")

with open(FIXTURE, encoding="utf-8") as fh:
    VALID = fh.read()


def mutate(old, new, text=VALID):
    assert old in text, old
    return text.replace(old, new, 1)


class ValidDesign(unittest.TestCase):
    def test_valid_fixture_passes_every_section(self):
        result = cds.check_text(VALID)
        self.assertEqual(list(result), list(cds.SECTIONS))
        for key, reasons in result.items():
            self.assertEqual(reasons, [], key)

    def test_kinds_flag_accepts_served_kinds(self):
        result = cds.check_text(VALID, kinds=["Narrative", "Expression"])
        self.assertTrue(all(r == [] for r in result.values()))


class Structure(unittest.TestCase):
    def test_missing_section_fails_only_that_section(self):
        start = VALID.index("## Levels and UX")
        end = VALID.index("## Prototype and playtest plan")
        result = cds.check_text(VALID[:start] + VALID[end:])
        self.assertTrue(result["level-ux"])
        self.assertEqual(result["systems-economy"], [])
        self.assertEqual(result["prototype-plan"], [])

    def test_sections_out_of_order_fail(self):
        a = VALID.index("## Systems and economy")
        b = VALID.index("## Progression and content")
        c = VALID.index("## Levels and UX")
        text = VALID[:a] + VALID[b:c] + VALID[a:b] + VALID[c:]
        result = cds.check_text(text)
        self.assertTrue(any("order" in r for r in result["progression-content"]))

    def test_subsection_missing_fails(self):
        text = mutate("### Balance levers", "### Knobs")
        self.assertTrue(any("Balance levers" in r for r in cds.check_text(text)["systems-economy"]))

    def test_table_header_mismatch_fails(self):
        text = mutate("| Resource | Sources | Sinks | Cap | Why it exists (kind) |",
                      "| Resource | Sources | Cap |")
        self.assertTrue(any("Resources" in r for r in cds.check_text(text)["systems-economy"]))

    def test_missing_json_block_fails(self):
        text = mutate('```json\n{"section": "level-ux", "levels": 3, "first10_rows": 3}\n```\n', "")
        self.assertTrue(any("json" in r.lower() for r in cds.check_text(text)["level-ux"]))

    def test_invalid_json_fails(self):
        text = mutate('"first10_rows": 3}', '"first10_rows": 3')
        self.assertTrue(any("json" in r.lower() for r in cds.check_text(text)["level-ux"]))

    def test_wrong_section_key_fails(self):
        text = mutate('"section": "level-ux"', '"section": "levels"')
        self.assertTrue(cds.check_text(text)["level-ux"])


class SystemsEconomy(unittest.TestCase):
    def test_unserved_not_empty_fails(self):
        text = mutate('"unserved": []', '"unserved": ["Hat shop"]')
        self.assertTrue(any("unserved" in r for r in cds.check_text(text)["systems-economy"]))

    def test_system_row_without_kind_fails(self):
        text = mutate("| Brewing | Combine a beam and a letter theme into a named story | Expression |",
                      "| Brewing | Combine a beam and a letter theme into a named story | none |")
        self.assertTrue(any("Brewing" in r for r in cds.check_text(text)["systems-economy"]))

    def test_resource_row_without_kind_fails(self):
        text = mutate("| 30 | Narrative: every reveal costs a choice |", "| 30 | it is shiny |")
        self.assertTrue(any("Light" in r for r in cds.check_text(text)["systems-economy"]))

    def test_system_count_mismatch_fails(self):
        text = mutate('"systems": 4', '"systems": 5')
        self.assertTrue(any("systems" in r for r in cds.check_text(text)["systems-economy"]))

    def test_more_than_8_systems_fails(self):
        row = "| Extra | x | Narrative | a | b |\n"
        anchor = "| City shelf |"
        text = mutate(anchor, row * 5 + anchor)
        text = mutate('"systems": 4', '"systems": 9', text)
        self.assertTrue(any("at most 8" in r for r in cds.check_text(text)["systems-economy"]))


class ProgressionContent(unittest.TestCase):
    def test_short_storyboard_fails(self):
        text = mutate("| 2:30 | A letter branches |\n", "")
        self.assertTrue(any("storyboard" in r.lower() for r in cds.check_text(text)["progression-content"]))

    def test_mermaid_timeline_storyboard_passes(self):
        start = VALID.index("| Time | Panel |")
        end = VALID.index("### Content inventory")
        timeline = ("```mermaid\ntimeline\n  0:00 : Beam\n  0:20 : Unfold\n  0:40 : Brew\n"
                    "  1:30 : Street\n  2:30 : Branch\n  4:00 : End\n```\n\n")
        text = VALID[:start] + timeline + VALID[end:]
        self.assertEqual(cds.check_text(text)["progression-content"], [])

    def test_content_hours_mismatch_fails(self):
        text = mutate('"content_hours": 44', '"content_hours": 80')
        self.assertTrue(any("content_hours" in r for r in cds.check_text(text)["progression-content"]))

    def test_sessions_mismatch_fails(self):
        text = mutate('"sessions": 4', '"sessions": 6')
        self.assertTrue(any("sessions" in r for r in cds.check_text(text)["progression-content"]))

    def test_length_not_a_number_fails(self):
        text = mutate('"length_hours": 4', '"length_hours": "about 4"')
        self.assertTrue(any("length_hours" in r for r in cds.check_text(text)["progression-content"]))


class LevelUx(unittest.TestCase):
    def test_two_sample_levels_fail(self):
        start = VALID.index("#### Level 3")
        end = VALID.index("### Controls")
        result = cds.check_text(VALID[:start] + VALID[end:])
        self.assertTrue(any("3 sample levels" in r for r in result["level-ux"]))

    def test_levels_json_not_3_fails(self):
        text = mutate('"levels": 3', '"levels": 4')
        self.assertTrue(any("levels" in r for r in cds.check_text(text)["level-ux"]))

    def test_screen_flow_without_mermaid_fails(self):
        text = mutate("```mermaid\nflowchart LR\n  Title --> City", "```text\nTitle --> City")
        self.assertTrue(any("Screen flow" in r for r in cds.check_text(text)["level-ux"]))

    def test_first10_rows_mismatch_fails(self):
        text = mutate('"first10_rows": 3', '"first10_rows": 5')
        self.assertTrue(any("first10_rows" in r for r in cds.check_text(text)["level-ux"]))


class PrototypePlan(unittest.TestCase):
    def test_two_milestones_fail(self):
        text = mutate("| Vertical slice | Brews feel personal | One street | 3 weeks | Testers describe their shelf as theirs |\n", "")
        self.assertTrue(any("milestone" in r.lower() for r in cds.check_text(text)["prototype-plan"]))

    def test_kind_with_zero_questions_fails(self):
        text = mutate('"Expression": 1}', '"Expression": 0}')
        self.assertTrue(any("Expression" in r for r in cds.check_text(text)["prototype-plan"]))

    def test_json_count_not_backed_by_bullets_fails(self):
        text = mutate("- **Expression**: Would you show someone your shelf?\n", "")
        self.assertTrue(any("Expression" in r for r in cds.check_text(text)["prototype-plan"]))

    def test_required_kind_without_question_fails(self):
        result = cds.check_text(VALID, kinds=["Narrative", "Expression", "Discovery"])
        self.assertTrue(any("Discovery" in r for r in result["prototype-plan"]))

    def test_unknown_kind_name_fails(self):
        text = mutate('"Narrative": 1,', '"Story": 1, "Narrative": 1,')
        self.assertTrue(any("Story" in r for r in cds.check_text(text)["prototype-plan"]))


class Cli(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, CLI, *args], capture_output=True, text=True)

    def test_valid_file_exits_0(self):
        r = self.run_cli(FIXTURE)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_invalid_file_exits_1_with_per_section_reasons(self):
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as fh:
            fh.write(mutate('"unserved": []', '"unserved": ["Hat shop"]'))
        try:
            r = self.run_cli(fh.name)
        finally:
            os.unlink(fh.name)
        self.assertEqual(r.returncode, 1)
        self.assertIn("systems-economy: FAIL", r.stderr)
        self.assertIn("level-ux: OK", r.stderr)

    def test_kinds_flag(self):
        r = self.run_cli(FIXTURE, "--kinds", "Narrative,Fellowship")
        self.assertEqual(r.returncode, 1)
        self.assertIn("Fellowship", r.stderr)

    def test_missing_file_exits_2(self):
        r = self.run_cli("/nonexistent/design.md")
        self.assertEqual(r.returncode, 2)


if __name__ == "__main__":
    unittest.main()
