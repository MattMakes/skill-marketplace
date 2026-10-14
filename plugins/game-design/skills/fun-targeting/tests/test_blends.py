"""Checks references/blends.md against the blend-deck contract (format and coverage rule).

Run: python3 -m unittest discover -s plugins/game-design/skills/fun-targeting/tests
"""
import json
import os
import re
import unittest

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(SKILL_DIR, "references", "blends.md")
EVALS = os.path.join(SKILL_DIR, "evals", "evals.json")
VERBS = os.path.join(os.path.dirname(SKILL_DIR), "game-ideation", "references", "decks", "verbs.md")

KINDS = ["Sensation", "Fantasy", "Narrative", "Challenge", "Fellowship", "Discovery", "Expression", "Submission"]
KEYS = ["kinds", "signature dynamic", "loop pattern", "reference games", "source", "pitfall", "boundary-safe verbs"]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def parse_deck(text):
    """Return (frontmatter dict, intro text, list of blends). Each blend: {id, name, <key>: value}."""
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        raise ValueError("no frontmatter")
    front = dict(line.split(": ", 1) for line in m.group(1).splitlines() if line.strip())
    body = text[m.end():]
    parts = re.split(r"^## ", body, flags=re.M)
    intro, blends = parts[0], []
    for part in parts[1:]:
        heading, _, rest = part.partition("\n")
        bid, _, name = heading.partition(": ")
        bullets = [l for l in rest.splitlines() if l.startswith("- ")]
        keys = [b[2:].split(": ", 1)[0] for b in bullets]
        blend = {"id": bid.strip(), "name": name.strip(), "_keys": keys}
        for b in bullets:
            k, _, v = b[2:].partition(": ")
            blend[k] = v.strip()
        blends.append(blend)
    return front, intro, blends


def split_list(value):
    return [x.strip() for x in value.split(",") if x.strip()]


class BlendDeckFormat(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.front, cls.intro, cls.blends = parse_deck(read(DECK))
        cls.verbs = set(re.findall(r"^\d+\. (\S+)\s*$", read(VERBS), re.M))

    def test_frontmatter(self):
        self.assertEqual(self.front.get("type"), "blend-deck")
        self.assertEqual(self.front.get("version"), "1")

    def test_draft_marker_after_intro(self):
        self.assertIn("<!-- DRAFT: tune me -->", self.intro)

    def test_ids_are_unique_kebab_case(self):
        ids = [b["id"] for b in self.blends]
        self.assertEqual(len(ids), len(set(ids)))
        for bid in ids:
            self.assertRegex(bid, r"^[a-z0-9]+(-[a-z0-9]+)*$")

    def test_every_blend_has_a_name(self):
        for b in self.blends:
            self.assertTrue(b["name"], b["id"])

    def test_bullet_keys_exact_and_in_order(self):
        for b in self.blends:
            self.assertEqual(b["_keys"], KEYS, b["id"])

    def test_kinds(self):
        for b in self.blends:
            kinds = split_list(b["kinds"])
            self.assertTrue(2 <= len(kinds) <= 3, b["id"])
            self.assertEqual(len(kinds), len(set(kinds)), b["id"])
            for k in kinds:
                self.assertIn(k, KINDS, b["id"])

    def test_no_submission_with_challenge(self):
        for b in self.blends:
            kinds = split_list(b["kinds"])
            self.assertFalse("Submission" in kinds and "Challenge" in kinds, b["id"])

    def test_reference_games_count(self):
        for b in self.blends:
            self.assertTrue(3 <= len(split_list(b["reference games"])) <= 5, b["id"])

    def test_one_line_fields_filled(self):
        for b in self.blends:
            for k in ("signature dynamic", "loop pattern", "source", "pitfall"):
                self.assertTrue(b[k], f"{b['id']}: {k}")

    def test_boundary_safe_verbs_come_from_verbs_deck(self):
        for b in self.blends:
            verbs = split_list(b["boundary-safe verbs"])
            self.assertTrue(3 <= len(verbs) <= 6, b["id"])
            for v in verbs:
                self.assertIn(v, self.verbs, b["id"])


class BlendDeckCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _, _, cls.blends = parse_deck(read(DECK))

    def test_at_least_12_blends(self):
        self.assertGreaterEqual(len(self.blends), 12)

    def test_every_kind_is_primary_once_and_in_three_blends(self):
        primaries = [split_list(b["kinds"])[0] for b in self.blends]
        for k in KINDS:
            self.assertIn(k, primaries, f"{k} is never primary")
            total = sum(k in split_list(b["kinds"]) for b in self.blends)
            self.assertGreaterEqual(total, 3, f"{k} is in only {total} blends")


class EvalsMatchDeck(unittest.TestCase):
    def test_deck_id_list_in_evals_matches_deck(self):
        """The 'picks a deck blend' eval hard-codes the deck ids; keep it in sync."""
        _, _, blends = parse_deck(read(DECK))
        ids = sorted(b["id"] for b in blends)
        exprs = [c["expr"] for e in json.loads(read(EVALS))["evals"] for c in e.get("checks", [])
                 if c["type"] == "json_expr" and "d['blend'] in" in c["expr"]]
        self.assertTrue(exprs, "no eval checks that the blend id comes from the deck")
        for expr in exprs:
            listed = sorted(re.findall(r"'([a-z0-9-]+)'", expr.split(" in ", 1)[1]))
            self.assertEqual(listed, ids)


if __name__ == "__main__":
    unittest.main()
