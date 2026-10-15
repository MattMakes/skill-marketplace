import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import report

FIXTURES = HERE / "fixtures"

class ReportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.traces = report.load_paths([str(FIXTURES)])
    def test_fixtures(self):
        self.assertEqual(len(self.traces), 4)
    def test_policy_and_seed(self): self.assertEqual((report.policy_name(self.traces[0]), report.seed(self.traces[0])), ("balanced", 1))
    def test_chapter_sequence(self): self.assertEqual(report.chapter_sequence(self.traces[0]), ["ch1", "ch2"])
    def test_progress(self): self.assertEqual(report.progress(self.traces[0]), 2) # boss_a and boss_b are first major kills.
    def test_total_minutes(self): self.assertEqual(report.total_minutes(self.traces[0]), 4) # boss_b dies at 240 seconds.
    def test_major_clear_minutes(self): self.assertEqual(report.major_clear_minutes(self.traces[0])["boss_a"], 2) # 120 / 60.
    def test_stall(self): self.assertEqual(report.stall(self.traces[0]), 2) # runs 5 and 6 are quiet.
    def test_tries_per_kill(self): self.assertEqual(report.tries_per_kill(self.traces[0])["boss_b"], 1) # boss_b appears once.
    def test_buys_per_run(self): self.assertEqual(report.buys_per_run(self.traces[0])["zero_share"], 4 / 6) # four runs have no purchase.
    def test_rank_and_near(self):
        self.assertEqual(report.policy_name(report.rank(self.traces)[0]), "fight") # fight has 2 progress in 200 seconds.
        self.assertEqual([report.policy_name(t) for t in report.near_optimal(self.traces, .1)], ["fight"])
    def test_seed_groups(self): self.assertEqual(report.seed_groups(self.traces)[0][0:2], ("balanced", 2))
    def test_leave_one_out(self):
        row = report.leave_one_out(self.traces)[0]
        self.assertEqual((row[0], row[1], row[4]), ("no-speed", "speed", None)) # no-speed has less progress.
    def test_currency_availability(self): self.assertEqual(report.currency_availability(self.traces[0])["ch1"]["gems"]["haul_median"], 1.5) # median of 1 and 2.
    def test_spoke_milestones(self): self.assertEqual(report.spoke_milestones(self.traces[0])["speed"][20], (4, 4)) # run 4 at 240 seconds.
    def test_growth_curves(self): self.assertEqual(report.growth_curves(self.traces[0])[0], (1, 2, 3)) # run 1: 60 seconds, power 2, pool 3.
    def test_a_sweep_root_finds_nested_traces_and_skips_state_files(self):
        import shutil, tempfile
        root = Path(tempfile.mkdtemp())
        (root / "balanced").mkdir()
        shutil.copy(sorted(Path(__file__).with_name("fixtures").glob("*.json"))[0], root / "balanced" / "trace.json")
        (root / "balanced" / "state.json").write_text('{"next_mode": "headless"}')
        self.assertEqual(len(report.load_paths([str(root)])), 1)
    def test_output(self):
        out = Path(tempfile.mkdtemp()); self.addCleanup(shutil.rmtree, out)
        self.assertEqual(report.main([str(FIXTURES), "--out", str(out)]), 0)
        markdown = (out / "report.md").read_text(); page = (out / "report.html").read_text()
        for heading in ("Traces", "Rank and the near-optimal set", "Seed groups", "Leave-one-out worth", "Major clear minutes per trace", "Stalls, tries per kill, buys per run", "Currency availability per chapter", "Spoke milestones per trace", "Balance summary"): self.assertIn(heading, markdown)
        self.assertEqual(page.count("<svg"), 2); self.assertNotIn("http", page)
    def test_balance_json_policies(self):
        data = report.balance_json(self.traces, .1, "balanced", [], {}, [str(FIXTURES)])
        # fight has 2 kills in 200 seconds; balanced means 260 seconds across 2 seeds.
        rows = [(row["name"], row["progress"], row["rank"]) for row in data["policies"]]
        self.assertEqual(rows, [("fight", 2, 1), ("balanced", 2, 2), ("no-speed", 1, 3)])
        self.assertAlmostEqual(data["policies"][1]["total_min_mean"], 260 / 60) # (240 + 280) / 2 / 60.
        self.assertAlmostEqual(data["policies"][2]["total_min_mean"], 160 / 60) # Last first major kill is boss_a at 160 seconds.
    def test_balance_json_chapters(self):
        targets = json.loads((FIXTURES / "targets.json").read_text())
        data = report.balance_json(self.traces, .1, "balanced", [], targets, [str(FIXTURES)])
        # ch1 ends before ch2: balanced mean is (120 + 140) / 2 / 60; ch2 is target-marked WALL.
        self.assertEqual([(row["id"], row["mark"], row["best_policy"]) for row in data["chapters"]], [("ch1", "OK", "fight"), ("ch2", "WALL", "fight")])
        self.assertAlmostEqual(data["chapters"][0]["minutes"]["balanced"], 13 / 6)
        self.assertAlmostEqual(data["chapters"][1]["minutes"]["balanced"], 13 / 6)
    def test_balance_json_spokes(self):
        wall = report.load_json_files([str(FIXTURES / "wall-sample.json")], "wall-probe/1")
        data = report.balance_json(self.traces, .1, "balanced", wall, {}, [str(FIXTURES)])
        # speed reaches level 5 at 65 seconds mean; its two wall probes sort by delta.
        speed = next(row for row in data["spokes"] if row["id"] == "speed")
        self.assertAlmostEqual(speed["level5_min"]["balanced"], 65 / 60)
        self.assertEqual([row["health_delta"] for row in speed["wall_breaks"]], [-.20, -.10])
    def test_groups_order_spokes_by_the_near_optimal_level_gain(self):
        # Trace "a" is near-optimal and trace "b" is not, so only "a" counts. In "a", the class_a runs buy speed 2 and
        # tank 2 (both first in run 1: the tie keeps the purchase order) and the class_b run buys width 1.
        def trace(name, runs): return {"meta": {"policy": {"name": name}}, "runs": runs}
        def run(number, group, chapter, spokes): return {"run": number, "group": group, "chapter": chapter, "purchases": [{"spoke": s} for s in spokes]}
        a = trace("a", [run(1, "class_a", "ch1", ["speed", "speed", "tank"]), run(2, "class_b", "ch1", ["width"]), run(3, "class_a", "ch1", ["tank"])])
        b = trace("b", [run(1, "class_a", "ch1", ["dmg"] * 5)])
        rows = [{"name": "a", "near_optimal": True}, {"name": "b", "near_optimal": False}]
        data = report.groups([a, b], rows)
        self.assertEqual(data["class_a"], {"chapters": ["ch1"], "spoke_order": ["speed", "tank"], "level_gain": {"speed": 2.0, "tank": 2.0}})
        self.assertEqual(data["class_b"]["spoke_order"], ["width"])
    def test_a_length_mismatch_at_equal_progress_warns(self):
        # 2 traces with no major kill: 10 runs and 40 runs (more than 10 % apart), so their minutes do not compare.
        def trace(n): return {"meta": {"policy": {"name": "p"}}, "runs": [{"run": i, "game_s": 60.0 * i, "bosses": []} for i in range(1, n + 1)]}
        self.assertEqual(len(report.comparability_warnings([trace(10), trace(40)])), 1)
        self.assertEqual(report.comparability_warnings([trace(10), trace(10)]), [])
    def test_balance_json_groups(self):
        data = report.balance_json(self.traces, .1, "balanced", [], {}, [str(FIXTURES)])
        # Fixtures omit the group field and named purchases, so the only group has no bought spoke gain.
        self.assertEqual(data["groups"], {"": {"chapters": ["ch1", "ch2"], "spoke_order": [], "level_gain": {}}})
    def test_balance_json_currencies(self):
        data = report.balance_json(self.traces, .1, "balanced", [], {}, [str(FIXTURES)])
        # ch1 gem haul values are 1, 2, 1, 1, 1, 1, 1, 1, so the median is 1.
        self.assertEqual(data["currencies"]["ch1"]["gems"]["haul_median"], 1)
    def test_balance_json_walls(self):
        wall = report.load_json_files([str(FIXTURES / "wall-sample.json")], "wall-probe/1")
        data = report.balance_json(self.traces, .1, "balanced", wall, {}, [str(FIXTURES)])
        # Six probes reduce to five, ordered from -0.40 through -0.05.
        self.assertEqual([row["health_delta"] for row in data["walls"][0]["top"]], [-.40, -.20, -.15, -.10, -.05])
    def test_custom_chapter_and_group_keys(self):
        # A game whose traces name the chapter "zone" and the group "hero" passes the names as flags.
        root = Path(tempfile.mkdtemp()); self.addCleanup(shutil.rmtree, root)
        trace = json.loads((FIXTURES / "balanced-s1.json").read_text())
        for run in trace["runs"]: run["zone"] = run.pop("chapter"); run["hero"] = "class_a"
        (root / "trace.json").write_text(json.dumps(trace))
        self.addCleanup(setattr, report, "CHAPTER_KEY", report.CHAPTER_KEY); self.addCleanup(setattr, report, "GROUP_KEY", report.GROUP_KEY)
        self.assertEqual(report.main([str(root / "trace.json"), "--out", str(root), "--json", "--chapter-key", "zone", "--group-key", "hero"]), 0)
        data = json.loads((root / "balance.json").read_text())
        self.assertEqual([row["id"] for row in data["chapters"]], ["ch1", "ch2"])
        self.assertEqual(list(data["groups"]), ["class_a"])
    def test_json_output(self):
        out = Path(tempfile.mkdtemp()); self.addCleanup(shutil.rmtree, out)
        self.assertEqual(report.main([str(FIXTURES), "--out", str(out), "--json", "--walls", str(FIXTURES / "wall-sample.json"), "--targets", str(FIXTURES / "targets.json")]), 0)
        data = json.loads((out / "balance.json").read_text())
        self.assertEqual(set(data), {"schema", "generated_utc", "inputs", "near", "baseline", "policies", "chapters", "spokes", "groups", "currencies", "walls", "notes"})

if __name__ == "__main__": unittest.main()
